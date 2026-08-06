/**
 * @file offscreenChatEngine.js
 * @description Le "cerveau" du chat IA : orchestre les appels au modèle (openAiClient) et
 * l'historique de conversation, dans un contexte qui survit à la fermeture/au rechargement des
 * onglets et à la mort du service worker de background (mais pas à la fermeture du navigateur :
 * les conversations sont volontairement gardées en mémoire uniquement, pas de persistance disque).
 * L'exécution effective des function calls (ex: recoverPatientData) nécessite en revanche un accès
 * au DOM de la page Weda : elle est donc déléguée au content script de l'onglet concerné, via un
 * aller-retour relayé par le background (@see background/offscreenHandler.js). Aucune interface
 * graphique ici : ce fichier ne fait que de l'orchestration, l'affichage restant la responsabilité
 * du content script (discussionClient.js).
 */

// Délai avant d'abandonner un appel de fonction resté sans réponse de l'onglet (ex: page bloquée).
// Un onglet fermé/qui navigue déclenche un rejet immédiat via rejectPendingToolCallsForTab, ce
// timeout ne couvre donc que le cas d'un onglet resté ouvert mais qui ne répond jamais.
const TOOL_CALL_TIMEOUT_MS = 120000;

// Conversations actives, indexées par patientId (une seule conversation par patient, partagée
// entre tous les onglets ouverts sur ce patient), plus une conversation "default" en l'absence de
// patient identifié. Uniquement en mémoire : perdues à la fermeture du navigateur.
const conversations = new Map();

/** Appels de fonction en attente d'une réponse de l'onglet, indexés par callId. */
const pendingToolCalls = new Map();

function getConversationKey(patientId) {
    return patientId || 'default';
}

/**
 * Récupère la conversation d'un patient donné, en l'initialisant avec le prompt système de base
 * si elle n'existe pas encore.
 * @returns {Promise<object>} La conversation : { chatHistory, selectedModel, generationController }
 */
async function getOrCreateConversation(patientId) {
    const key = getConversationKey(patientId);
    if (conversations.has(key)) return conversations.get(key);

    await aiParamsReady;
    const conversation = {
        chatHistory: [{ role: 'system', content: aiParams.basicSystemPrompt }],
        selectedModel: aiParams.defaultModel,
        generationController: null, // AbortController de la génération en cours, pour permettre son arrêt (stopGeneration)
        // Instantané de la génération en cours (reasoning/contenu/appels de fonction), pour qu'un
        // onglet qui se connecte en cours de route (changement d'onglet, rechargement) puisse
        // immédiatement afficher l'état courant plutôt que d'attendre le prochain événement.
        liveGeneration: null
    };
    conversations.set(key, conversation);
    return conversation;
}

function resetConversation(patientId) {
    conversations.delete(getConversationKey(patientId));
}

function stopGeneration(patientId) {
    conversations.get(getConversationKey(patientId))?.generationController?.abort();
}

function setModel(patientId, model) {
    getOrCreateConversation(patientId).then(conversation => { conversation.selectedModel = model; });
}

/**
 * Renvoie l'état courant d'une conversation à l'onglet demandeur, pour reconstruire l'affichage
 * après un rechargement de page (le content script ne conserve lui-même aucun état).
 */
async function sendStateSync(tabId, patientId) {
    const conversation = await getOrCreateConversation(patientId);
    sendToTab(tabId, {
        type: 'stateSync',
        patientId,
        // Le message système (prompt de base) n'a pas sa place dans l'affichage, on ne renvoie que
        // les tours user/assistant.
        history: conversation.chatHistory.filter(m => m.role !== 'system'),
        selectedModel: conversation.selectedModel,
        // Permet à l'onglet qui se connecte de rattraper immédiatement une génération déjà en cours
        // (lancée depuis un autre onglet sur ce même patient).
        liveGeneration: conversation.liveGeneration
    });
}

/**
 * Envoie un message à un onglet donné, relayé par le background (@see background/offscreenHandler.js).
 */
function sendToTab(tabId, message) {
    try {
        backgroundPort.postMessage({ ...message, tabId });
    } catch (e) {
        console.warn('[offscreenChatEngine] Port déconnecté, message non transmis :', message.type, e.message);
    }
}

/**
 * Diffuse un message à tous les onglets abonnés à un patient donné (relayé par le background,
 * @see background/offscreenHandler.js), pour que tous les onglets ouverts sur ce patient restent
 * synchronisés en temps réel, quel que soit celui à l'origine de la génération.
 */
function broadcastToPatient(patientId, message) {
    try {
        backgroundPort.postMessage({ ...message, patientId, broadcast: true });
    } catch (e) {
        console.warn('[offscreenChatEngine] Port déconnecté, broadcast non transmis :', message.type, e.message);
    }
}

/**
 * Délègue l'exécution d'une fonction (function calling) au content script de l'onglet concerné,
 * seul à disposer du DOM de la page Weda nécessaire (ex: recoverPatientData). Utilisé comme
 * `executeToolCall` d'openAiClient.
 * @returns {Promise<*>} Le résultat renvoyé par le content script.
 */
function executeToolCallOnTab(tabId, name, args) {
    return new Promise((resolve, reject) => {
        const callId = crypto.randomUUID();
        const timeoutId = setTimeout(() => {
            pendingToolCalls.delete(callId);
            reject(new Error(`Délai dépassé en attendant la réponse de l'onglet pour la fonction "${name}"`));
        }, TOOL_CALL_TIMEOUT_MS);

        pendingToolCalls.set(callId, { tabId, resolve, reject, timeoutId });
        sendToTab(tabId, { type: 'toolCallRequest', callId, name, args });
    });
}

/**
 * Résout un appel de fonction en attente à partir de la réponse envoyée par le content script.
 * @param {{callId: string, result?: *, error?: string}} message
 */
function resolveToolCall({ callId, result, error }) {
    const pending = pendingToolCalls.get(callId);
    if (!pending) return; // Réponse tardive (timeout déjà déclenché) ou callId inconnu, on ignore
    clearTimeout(pending.timeoutId);
    pendingToolCalls.delete(callId);
    if (error) pending.reject(new Error(error));
    else pending.resolve(result);
}

/**
 * Rejette et nettoie tous les appels de fonction en attente pour un onglet fermé/déconnecté,
 * plutôt que de les laisser expirer via le timeout.
 */
function rejectPendingToolCallsForTab(tabId) {
    for (const [callId, pending] of pendingToolCalls) {
        if (pending.tabId !== tabId) continue;
        clearTimeout(pending.timeoutId);
        pending.reject(new Error("L'onglet a été fermé ou a changé de page pendant l'exécution de la fonction"));
        pendingToolCalls.delete(callId);
    }
}

/**
 * Traite un nouveau message utilisateur : l'ajoute à l'historique, interroge le modèle (avec
 * streaming et function calling délégué à l'onglet), et notifie l'onglet d'origine au fur et à
 * mesure via des messages relayés par le background.
 * @param {{tabId: number, patientId: string|null, content: string|Array, model?: string}} message
 */
async function processUserMessage({ tabId, patientId, content, model }) {
    const conversation = await getOrCreateConversation(patientId);
    if (model) conversation.selectedModel = model;

    if (conversation.generationController) {
        // Un autre onglet a déjà une génération en cours pour ce patient : on refuse plutôt que de
        // corrompre l'historique avec deux requêtes concurrentes.
        sendToTab(tabId, { type: 'generationBusy', patientId });
        return;
    }

    conversation.chatHistory.push({ role: 'user', content });
    conversation.generationController = new AbortController();
    conversation.liveGeneration = { reasoning: '', content: '', toolCalls: [] };

    let accumulatedContent = ''; // Permet, en cas d'arrêt volontaire (stopGeneration), de conserver le texte déjà généré
    let lastFinishReason = null;

    try {
        const finalContent = await openAiClient({
            messages: conversation.chatHistory,
            model: conversation.selectedModel,
            tools: Object.values(availableFunctions).map(f => f.definition),
            signal: conversation.generationController.signal,
            executeToolCall: (name, args) => executeToolCallOnTab(tabId, name, args),
            onChunk: (chunk) => {
                if (chunk.contentDelta) {
                    accumulatedContent += chunk.contentDelta;
                    conversation.liveGeneration.content += chunk.contentDelta;
                }
                if (chunk.reasoningDelta) conversation.liveGeneration.reasoning += chunk.reasoningDelta;
                if (chunk.finishReason) lastFinishReason = chunk.finishReason;
                broadcastToPatient(patientId, { type: 'assistantChunk', ...chunk });
            },
            onToolCall: (event) => {
                if (event.status === 'start') conversation.liveGeneration.reasoning = ''; // une nouvelle bulle de raisonnement pourra suivre
                const toolCalls = conversation.liveGeneration.toolCalls;
                const index = toolCalls.findIndex(t => t.id === event.id);
                if (index === -1) toolCalls.push({ ...event });
                else toolCalls[index] = { ...toolCalls[index], ...event };
                broadcastToPatient(patientId, { type: 'toolCallEvent', ...event });
            },
            onWarning: (warning) => broadcastToPatient(patientId, { type: 'assistantWarning', warning })
        });

        if (!finalContent || !finalContent.trim()) {
            // Le modèle s'est arrêté sans produire de réponse finale (limite de tokens, filtre de
            // contenu...) : on retire le message utilisateur pour permettre de reformuler proprement.
            conversation.chatHistory.pop();
            broadcastToPatient(patientId, { type: 'assistantEmpty', finishReason: lastFinishReason });
            return;
        }

        conversation.chatHistory.push({ role: 'assistant', content: finalContent });
        broadcastToPatient(patientId, { type: 'assistantDone', content: finalContent, finishReason: lastFinishReason });
    } catch (error) {
        if (error.name === 'AbortError' && accumulatedContent.trim()) {
            // Arrêt volontaire (bouton Stop) : le contenu partiel déjà généré est conservé comme réponse.
            conversation.chatHistory.push({ role: 'assistant', content: accumulatedContent });
            broadcastToPatient(patientId, { type: 'assistantAborted', content: accumulatedContent });
        } else {
            conversation.chatHistory.pop(); // retire le message utilisateur pour permettre de reformuler/réessayer
            console.error('[offscreenChatEngine] Erreur lors du traitement du message utilisateur :', error);
            broadcastToPatient(patientId, { type: 'assistantError', error: error.message || String(error) });
        }
    } finally {
        conversation.generationController = null;
        conversation.liveGeneration = null;
    }
}
