/**
 * @file openAiClient.js
 * @description Contiens le nécessaire pour interagir avec l'API OpenAI.
 */

// Récupération des paramètres de l'appel
let aiParams = {};

// Ports les plus courants pour un serveur d'IA local, testés dans cet ordre lorsque
// l'option IAassistantPort est laissée sur "auto" : 1234 (LM Studio, le plus simple à installer),
// 11434 (Ollama).
const COMMON_LOCAL_AI_PORTS = [1234, 11434];

// Délai (ms) au-delà duquel une tentative de connexion à un port local est considérée comme un
// échec : un serveur qui écoute répond quasi instantanément, inutile d'attendre le timeout TCP
// par défaut du navigateur (plusieurs secondes) lorsqu'aucun serveur n'écoute sur ce port.
const LOCAL_AI_PROBE_TIMEOUT_MS = 800;

/**
 * Construit un motif d'origine (host permission) à partir d'un hôte, ex: "http://192.168.1.50/*".
 * @param {string} host
 * @returns {string}
 */
function buildOriginPattern(host) {
    return `http://${host}/*`;
}

/**
 * Si l'hôte configuré n'est pas "localhost"/"127.0.0.1" (déclaré en dur dans le manifest), tente
 * d'obtenir la permission optionnelle correspondante (déclarée via optional_host_permissions).
 *
 * Remarque : cette tentative est "best effort" et non bloquante pour le fonctionnement de
 * l'assistant. D'une part, `chrome.permissions.request` ne peut afficher de prompt qu'à la suite
 * d'un geste utilisateur direct (clic...) : appelée ici au démarrage (sans geste utilisateur), elle
 * échoue silencieusement sans rien demander à l'utilisateur, ce qui est normal. D'autre part, les
 * requêtes fetch faites depuis une page d'extension (ex: le document offscreen) ne sont pas
 * bloquées par l'absence de host_permissions tant que le serveur cible répond avec des en-têtes
 * CORS permissifs (cas habituel de LM Studio/Ollama) : l'assistant peut donc fonctionner même sans
 * cette permission accordée.
 * @param {string} host
 * @returns {Promise<boolean>} true si l'hôte est localhost, ou si la permission est accordée
 */
async function ensureHostPermission(host) {
    if (!host || host === 'localhost' || host === '127.0.0.1') return true;
    const origin = buildOriginPattern(host);
    // chrome.permissions n'est disponible que dans certaines pages d'extension (ex: options), pas dans
    // les content scripts ni les documents offscreen : dans ces cas, on relaie via le script background
    // (message 'optionalPermissionHandler'), sans dépendre de optionalPermissions.js qui n'est pas
    // toujours chargé dans ces contextes (ex: offscreen.html).
    const hasDirectAccess = typeof chrome !== 'undefined' && !!chrome.permissions;
    const check = hasDirectAccess
        ? (o) => new Promise((resolve) => chrome.permissions.contains({ origins: [o] }, resolve))
        : (o) => new Promise((resolve) => chrome.runtime.sendMessage(
            { action: 'optionalPermissionHandler', command: 'checkOrigin', options: { origin: o } },
            (response) => resolve(response?.hasPermission || false)
        ));
    const request = hasDirectAccess
        ? (o) => new Promise((resolve) => chrome.permissions.request({ origins: [o] }, resolve))
        : (o) => new Promise((resolve) => chrome.runtime.sendMessage(
            { action: 'optionalPermissionHandler', command: 'requestOrigin', options: { origin: o } },
            (response) => resolve(response?.granted || false)
        ));

    try {
        if (await check(origin)) return true;
        const granted = await request(origin);
        if (!granted) {
            console.log(`[openAiClient] Permission optionnelle non accordée pour l'hôte "${host}" (normal en l'absence de geste utilisateur) : l'assistant tentera quand même de s'y connecter.`);
        }
        return granted;
    } catch (error) {
        console.log(`[openAiClient] Impossible de demander la permission pour l'hôte "${host}" :`, error.message || error);
        return false;
    }
}

/**
 * Interroge `/v1/models` sur un hôte/port donné et renvoie la liste des identifiants de modèles
 * disponibles, ou null si le serveur ne répond pas correctement (ou pas assez vite) sur ce port.
 * @param {string} host
 * @param {number|string} port
 * @param {string} [apiKey]
 * @returns {Promise<string[]|null>}
 */
async function fetchModelsListOnPort(host, port, apiKey) {
    try {
        const response = await fetch(`http://${host}:${port}/v1/models`, {
            method: 'GET',
            headers: {
                ...(apiKey && { 'Authorization': `Bearer ${apiKey}` }),
            },
            signal: AbortSignal.timeout(LOCAL_AI_PROBE_TIMEOUT_MS)
        });
        if (!response.ok) {
            console.warn(`[openAiClient] Port ${port} : réponse HTTP ${response.status} (${response.statusText}) sur /v1/models.`);
            return null;
        }
        const data = await response.json();
        const models = Array.isArray(data?.data) ? data.data.map(m => m.id).filter(Boolean) : [];
        return models;
    } catch (error) {
        console.warn(`[openAiClient] Port ${port} : échec de la requête /v1/models —`, error.name === 'TimeoutError' ? `délai de ${LOCAL_AI_PROBE_TIMEOUT_MS}ms dépassé` : (error.message || error));
        return null;
    }
}

/**
 * Teste une liste de ports en parallèle et agrège les modèles trouvés sur chacun des ports ayant
 * répondu. Ce test est refait à chaque démarrage : rien n'est enregistré dans les options.
 * @param {string} host - Hôte à contacter (par défaut "localhost").
 * @param {Array<number|string>} ports - Ports à tester (un seul port si l'option IAassistantPort n'est pas "auto", sinon COMMON_LOCAL_AI_PORTS).
 * @param {string} apiKey
 * @returns {Promise<{activePorts: Array<number|string>, availableModels: Array<{model: string, port: number|string}>, testedPorts: Array<number|string>}>}
 */
async function probePortsForModels(host, ports, apiKey) {
    const results = await Promise.all(ports.map(async (port) => ({ port, models: await fetchModelsListOnPort(host, port, apiKey) })));
    const activePorts = [];
    const availableModels = [];
    for (const { port, models } of results) {
        if (models !== null) {
            activePorts.push(port);
            for (const model of models) availableModels.push({ model, port });
            console.log(`[openAiClient] Serveur IA local détecté sur le port ${port} (${models.length} modèle(s) : ${models.join(', ') || 'aucun'}).`);
        }
    }
    if (activePorts.length === 0) {
        console.warn("[openAiClient] Aucun serveur IA local détecté sur les ports testés", ports);
    }
    return { activePorts, availableModels, testedPorts: ports };
}

/**
 * Retrouve le port sur lequel un modèle donné est disponible (cf. aiParams.availableModels). Si le
 * modèle n'est pas trouvé (ex: valeur non résolue), on retombe sur le premier port actif connu, ou
 * à défaut sur le port configuré.
 * @param {string} modelName
 * @returns {number|string}
 */
function getPortForModel(modelName) {
    const entry = aiParams.availableModels?.find(m => m.model === modelName);
    if (entry) return entry.port;
    return aiParams.activePorts?.[0] ?? aiParams.port;
}

// Initialisation asynchrone des paramètres. On garde la promesse pour pouvoir
// l'attendre depuis openAiClient et éviter toute race condition au premier appel.
const aiParamsReady = (async () => {
    aiParams.host = (await getOptionPromise('IAassistantHost'))?.trim() || 'localhost' // Hôte du serveur d'IA local (par défaut "localhost", peut être une IP/nom d'hôte distant)
    aiParams.port = await getOptionPromise('IAassistantPort') // "auto" ou numéro de port spécifique choisi par l'utilisateur
    aiParams.apiKey = await getOptionPromise('IAassistantApiKey') // Normalement non utilisé, mais bon, autant être propre.
    aiParams.preferredModel = await getOptionPromise('IAassistantModelName') // Nom du modèle préféré (juste le nom, indépendant du port), ex: "qwen3.5:9b", ou "auto"
    aiParams.toolCalling = await getOptionPromise('AIAssistantToolCalling') // true/false pour activer le function calling
    aiParams.MAX_TOOL_CALL_DEPTH =  5 // Nombre maximum d'allers-retours de function calling avant d'abandonner (évite les boucles infinies)
    aiParams.basicSystemPrompt = await getOptionPromise('IAassistantMainSystemPrompt') // Prompt de base pour le modèle
    aiParams.contextTokenLimit = await getOptionPromise('IAassistantContextLimit')
    aiParams.maxTokensOutput = await getOptionPromise('IAassistantMaxTokensOutput')

    // Ajout de la date du jour dans le prompt système de base, pour que le modèle sache quelle est la date actuelle.
    const currentDateTime = new Date().toISOString();
    aiParams.basicSystemPrompt += `\n\nDate du jour : ${currentDateTime}`;

    // Tentative (best effort, non bloquante) d'obtention de la permission optionnelle pour un hôte
    // distant : voir la documentation de ensureHostPermission pour le détail des limitations (pas de
    // prompt possible sans geste utilisateur, fetch fonctionnant déjà sans cette permission dans la
    // plupart des cas). Le sondage des ports est donc toujours effectué, que la permission soit
    // accordée ou non.
    await ensureHostPermission(aiParams.host);

    // Ports à tester : si un port spécifique est configuré, on ne teste que celui-ci ; sinon ("auto"),
    // on teste systématiquement tous les ports courants à chaque démarrage (pas de mise en cache du port trouvé).
    const portsToTest = (aiParams.port && aiParams.port !== 'auto') ? [aiParams.port] : COMMON_LOCAL_AI_PORTS;
    const { activePorts, availableModels, testedPorts } = await probePortsForModels(aiParams.host, portsToTest, aiParams.apiKey);

    aiParams.activePorts = activePorts; // Ports ayant effectivement répondu
    aiParams.availableModels = availableModels; // Liste [{model, port}] de tous les modèles disponibles, tous ports actifs confondus
    aiParams.autoPortTestedPorts = testedPorts; // Ports testés (utile pour informer l'utilisateur dans le chat si aucun serveur n'a été trouvé)

    // Résolution du modèle par défaut : le modèle préféré s'il est disponible parmi les modèles détectés,
    // sinon le premier modèle disponible (peu importe son port).
    const modelNames = availableModels.map(m => m.model);
    if (aiParams.preferredModel && aiParams.preferredModel !== 'auto' && modelNames.includes(aiParams.preferredModel)) {
        aiParams.defaultModel = aiParams.preferredModel;
    } else if (modelNames.length > 0) {
        if (aiParams.preferredModel && aiParams.preferredModel !== 'auto') {
            console.warn(`[openAiClient] Modèle préféré "${aiParams.preferredModel}" introuvable parmi les modèles disponibles, sélection du premier modèle disponible : ${modelNames[0]}.`);
        }
        aiParams.defaultModel = modelNames[0];
    } else {
        aiParams.defaultModel = aiParams.preferredModel; // Aucun serveur/modèle détecté : on garde la valeur configurée telle quelle
    }

    console.log("[openAiClient] Paramètres récupérés :", aiParams);
})();

/**
 * Teste la disponibilité de l'API du modèle d'IA local (utile pour avertir l'utilisateur si
 * aucun serveur n'est détecté sur le port configuré, ex: LM Studio/Ollama non démarré).
 * @returns {Promise<boolean>} true si l'API répond, false sinon.
 */
async function testAiApiConnection(modelName = aiParams.defaultModel) {
    await aiParamsReady;
    const port = getPortForModel(modelName);
    try {
        const response = await fetch(`http://${aiParams.host}:${port}/v1/models`, {
            method: 'GET',
            headers: {
                ...(aiParams.apiKey && { 'Authorization': `Bearer ${aiParams.apiKey}` }),
            },
            signal: AbortSignal.timeout(LOCAL_AI_PROBE_TIMEOUT_MS)
        });
        return response.ok;
    } catch (error) {
        console.warn("[openAiClient] Test de connexion à l'API échoué :", error.message || error);
        return false;
    }
}

async function openAiClient({
    // --- 1. Le Prompt ---
    messages = [],         // Liste des messages de la conversation (system, user, assistant, tool)
    
    // --- 2. Paramètres de base ---
    model = aiParams.defaultModel, // modèle à utiliser (ex: "gpt-4o", "mistral-nemo:12b-instruct-2407-q5_K_M", etc.)
    
    // --- 3. Paramètres de Sampling (Ce que vous aviez déjà) ---
    maxTokens = aiParams.maxTokensOutput,      // le nombre maximum de tokens à générer dans la réponse. A ajuster à terme, et discuter de mettre un appel de l'API en amont pour requêter le nombre de tokens restants pour ne pas dépasser la limite du modèle.
    temperature = 0.7,     // le degré de créativité (0.0 = très conservateur, 1.0 = très créatif)
    topP = 0.9,            // le pourcentage de probabilité cumulative pour le filtrage des tokens (0.0 à 1.0)
    frequencyPenalty = 0.0,// pénalité pour la fréquence des tokens (0.0 à 2.0, plus élevé = moins de répétition)
    presencePenalty = 0.0, // pénalité pour la présence des tokens (0.0 à 2.0, plus élevé = moins de répétition)
    stop = null,           // séquence(s) de tokens pour arrêter la génération (ex: ["\n", "END"])

    // --- 4. Paramètres "Modernes" et très utiles ---
    stream = false,        // Pour recevoir la réponse mot par mot (SSE)
    responseFormat = null, // Pour forcer le format JSON ({ type: "json_object" })
    seed = null,           // Pour la reproductibilité (same seed = même résultat)

    // --- 5. Function/Tool calling --- @see callableFunctions.js
    tools = null,          // Liste de définitions de fonctions (format OpenAI). Si non fourni et useTools=true, utilise availableFunctions.
    toolChoice = null,     // "auto", "none", ou un objet ciblant une fonction précise
    useTools = true,       // Active le function calling avec le registre availableFunctions (combiné avec l'option utilisateur IAassistantToolCalling)

    // --- 6. Streaming temps réel ---
    onChunk = null,        // Callback appelé à chaque fragment reçu en streaming : ({ contentDelta, reasoningDelta }) => void

    // --- 7. Feedback sur les appels de fonctions ---
    onToolCall = null,     // Callback appelé lors du cycle de vie d'un appel de fonction :
                           // ({ id, name, args, status: 'start'|'success'|'error', result, error }) => void

    // --- 7bis. Avertissement de dépassement de contexte ---
    onWarning = null,      // Callback appelé si le contexte estimé approche/dépasse IAassistantContextLimit :
                           // ({ type: 'context_limit', estimatedTokens, limit, ratio }) => void

    // --- 7ter. Exécution des fonctions ---
    executeToolCall = null, // (name, args) => résultat. Si non fourni, exécute localement via availableFunctions
                             // (cas du content script). Le document offpage fournit ici un exécuteur qui délègue
                             // l'appel au content script de l'onglet concerné (DOM de Weda requis, ex: recoverPatientData).

    // --- 8. Interne : suivi de la profondeur de récursion (ne pas fournir manuellement) ---
    _toolCallDepth = 0,

    // --- 9. Annulation ---
    signal = null,         // AbortSignal permettant d'interrompre la requête (et le streaming) en cours
}) {
    // S'assurer que les paramètres (defaultModel, availableModels, etc.) sont chargés avant le premier appel
    await aiParamsReady;
    if (model === undefined) model = aiParams.defaultModel;

    // Le port à utiliser dépend du modèle sélectionné (plusieurs ports peuvent être actifs simultanément)
    const apiUrl = `http://${aiParams.host}:${getPortForModel(model)}`;

    // Permet de faire un appel simple sans avoir à construire un tableau de messages
    if (typeof messages === 'string') {
        messages = [{ role: "user", content: messages }];
    }

    // Filtrer uniquement les messages réellement vides (sans contenu ET sans tool_calls),
    // pour ne jamais supprimer un message assistant qui ne contient que des tool_calls (content: null).
    // Le contenu peut aussi être un tableau de parts (format "vision" OpenAI, ex: pièces jointes
    // images) : { type: 'text'|'image_url', ... } — voir buildUserMessageContent dans discussionClient.js.
    const filteredMessages = messages.filter(msg =>
        msg && (
            (typeof msg.content === 'string' && msg.content.trim()) ||
            (Array.isArray(msg.content) && msg.content.length > 0) ||
            (msg.tool_calls && msg.tool_calls.length > 0) ||
            msg.role === 'tool'
        )
    );

    console.log(`[openAiClient] Envoi de ${filteredMessages.length} messages au modèle ${model} (profondeur tool-call: ${_toolCallDepth})`,
        filteredMessages.map(m => ({ role: m.role, contentLength: m.content?.length || 0 })));

    // Avertir si le contexte estimé approche/dépasse la limite configurée (IAassistantContextLimit).
    // Utile notamment quand le function calling s'enchaîne et gonfle l'historique (résultats d'outils volumineux).
    const contextLimit = Number(aiParams.contextTokenLimit) || 0;
    if (contextLimit > 0) {
        const estimatedTokens = estimateTokens(filteredMessages);
        const ratio = estimatedTokens / contextLimit;
        if (ratio >= 0.8) {
            console.warn(`[openAiClient] Contexte estimé à ${estimatedTokens} tokens (~${Math.round(ratio * 100)}% de la limite de ${contextLimit}).`);
            onWarning?.({ type: 'context_limit', estimatedTokens, limit: contextLimit, ratio, toolCallDepth: _toolCallDepth });
        }
    }

    // Gestion des tools (function calling)
    // seulement si option activée et useTools = true
    const effectiveUseTools = useTools && aiParams.toolCalling;
    const resolvedTools = tools || (effectiveUseTools ? Object.values(availableFunctions).map(f => f.definition) : null);

    // Si un callback de streaming est fourni, on force le mode stream côté requête
    const effectiveStream = stream || !!onChunk;

    const requestBody = buildRequestBody({
        messages: filteredMessages,
        model,
        maxTokens,
        temperature,
        topP,
        frequencyPenalty,
        presencePenalty,
        stop,
        stream: effectiveStream,
        responseFormat,
        seed,
        resolvedTools,
        toolChoice
    });

    console.log("[openAiClient] Requête construite :", requestBody);

    try { // Appel réseau vers l'API OpenAI/Ollama
        const data = await fetchChatCompletion(requestBody, apiUrl, signal);

        let responseMessage;

        if (effectiveStream) {
            // Si aucun callback n'est fourni, on renvoie le ReadableStream brut pour un traitement manuel par l'appelant
            if (!onChunk) {
                return data;
            }
            // On consomme le flux SSE en direct, en notifiant onChunk à chaque fragment reçu
            responseMessage = await consumeStream(data, onChunk);
            // On notifie l'appelant de la raison d'arrêt (utile pour diagnostiquer une réponse vide/tronquée)
            onChunk({ finishReason: responseMessage._finishReason });
        } else {
            if (!data?.choices?.[0]?.message) {
                throw new Error("Réponse de l'API invalide : aucun message trouvé dans la réponse.");
            }
            responseMessage = data.choices[0].message;
            const finishReason = data.choices[0].finish_reason;
            if (finishReason === 'length') {
                console.warn('[openAiClient] Le modèle a été interrompu par la limite de tokens (max_tokens atteint) avant de terminer sa réponse.');
            }
        }

        // Gestion du function/tool calling : si le modèle demande à appeler une ou plusieurs fonctions
        // le LLM peut en effet renvoyer un message assistant avec un ou plusieurs tool_calls, qu'il faut exécuter et renvoyer au modèle pour obtenir la réponse finale.
        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            console.log(`[openAiClient] Function calls reçus:`, responseMessage.tool_calls.map(tc => ({ name: tc.function?.name, args: tc.function?.arguments })));

            if (_toolCallDepth >= aiParams.MAX_TOOL_CALL_DEPTH) {
                console.warn(`[openAiClient] Profondeur maximale de function calling atteinte (${aiParams.MAX_TOOL_CALL_DEPTH}), arrêt de la boucle.`);
                return responseMessage.content || "Désolé, je n'ai pas pu terminer cette action après plusieurs tentatives d'appel de fonctions.";
            }

            const updatedMessages = await handleToolCalls(responseMessage, filteredMessages, onToolCall, executeToolCall);

            // On relance un appel avec les résultats des fonctions pour obtenir la réponse finale du modèle
            console.log(`[openAiClient] Re-envoi du contexte avec résultats des fonctions...`);
            return await openAiClient({
                messages: updatedMessages,
                model,
                maxTokens,
                temperature,
                topP,
                frequencyPenalty,
                presencePenalty,
                stop,
                stream,
                responseFormat,
                seed,
                tools: resolvedTools,
                toolChoice,
                useTools,
                onChunk,
                onToolCall,
                onWarning,
                executeToolCall,
                _toolCallDepth: _toolCallDepth + 1,
                signal
            });
        }

        return responseMessage.content;

    } catch (error) {
        console.error("[openAiClient] Erreur lors de l'appel OpenAI :", error.message || error);
        console.error("[openAiClient] Stack :", error.stack);
        console.error("[openAiClient] Vérifiez que le serveur est accessible sur :", apiUrl);
        throw error;
    }
}

/**
 * ---------------------------------------------------------------------------------------
 * Fonctions support
 */

/**
 * Estimation grossière (mais suffisante pour un avertissement) du nombre de tokens
 * représentés par une liste de messages : ~4 caractères par token, tous champs textuels
 * confondus (contenu, raisonnement, arguments/résultats des tool_calls).
 * @param {Array} messages
 * @returns {number} Nombre de tokens estimé.
 */
function estimateTokens(messages) {
    let charCount = 0;
    // Estimation grossière du coût en tokens d'une image jointe (format 'image_url'), la plupart
    // des modèles vision consommant plusieurs centaines de tokens par image selon sa résolution.
    const ESTIMATED_TOKENS_PER_IMAGE = 500;
    for (const msg of messages) {
        if (typeof msg?.content === 'string') {
            charCount += msg.content.length;
        } else if (Array.isArray(msg?.content)) {
            for (const part of msg.content) {
                if (part?.type === 'text' && typeof part.text === 'string') charCount += part.text.length;
                else if (part?.type === 'image_url') charCount += ESTIMATED_TOKENS_PER_IMAGE * 4; // *4 pour rester homogène avec la division /4 ci-dessous
            }
        }
        if (Array.isArray(msg?.tool_calls)) {
            for (const tc of msg.tool_calls) {
                charCount += tc.function?.name?.length || 0;
                charCount += tc.function?.arguments?.length || 0;
            }
        }
    }
    return Math.ceil(charCount / 4);
}

/**
 * Lit un ReadableStream SSE (Server-Sent Events) renvoyé par l'API en mode streaming,
 * accumule le contenu, le "raisonnement" (reasoning_content / reasoning, exposé par
 * certains modèles type "thinking") et les tool_calls fragmentés, tout en notifiant
 * `onChunk` en temps réel à chaque fragment de texte reçu.
 *
 * @param {ReadableStream} stream - Le corps de la réponse HTTP (response.body).
 * @param {(chunk: {contentDelta?: string, reasoningDelta?: string}) => void} onChunk - Callback appelé à chaque fragment.
 * @returns {Promise<object>} Le message assistant reconstitué : { role, content, reasoning_content, tool_calls }
 */
async function consumeStream(stream, onChunk) {
    const reader = stream.getReader(); // le getReader() permet de lire le flux en chunks (Uint8Array)
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let contentAcc = '';     // Accumulation du contenu complet de la réponse
    let reasoningAcc = '';   // Accumulation du "raisonnement" complet (reasoning_content / reasoning)
    let finishReason = null; // raison d'arrêt renvoyée par le serveur : 'stop', 'length' (tokens épuisés), 'tool_calls', 'content_filter', etc.
    let streamError = null; // erreur explicite envoyée par le serveur en cours de flux (ex: dépassement de la taille de contexte)
    const toolCallsAcc = []; // indexé par la position (index) fournie par l'API

    const processLine = (line) => {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) return;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') return;

        let json;
        try {
            json = JSON.parse(payload);
        } catch (e) {
            console.warn('[consumeStream] Impossible de parser un chunk SSE :', payload);
            return;
        }

        // Certains serveurs (llama.cpp, LM Studio...) renvoient une erreur (ex: dépassement de la taille de
        // contexte) sous forme d'un événement SSE dédié (`{"error": {...}}`) plutôt qu'un statut HTTP non-200,
        // notamment lorsque l'erreur survient après le début du streaming. Sans cette détection, l'événement
        // était silencieusement ignoré (pas de `choices`) et l'appelant ne recevait qu'un flux vide.
        if (json?.error) {
            streamError = json.error.message || JSON.stringify(json.error);
            console.error('[consumeStream] Erreur renvoyée par le serveur en cours de flux :', json.error);
            return;
        }

        if (json?.choices?.[0]?.finish_reason) {
            finishReason = json.choices[0].finish_reason;
        }

        const delta = json?.choices?.[0]?.delta;
        if (!delta) return;

        // Contenu "normal" de la réponse
        if (typeof delta.content === 'string' && delta.content.length > 0) {
            contentAcc += delta.content;
            onChunk({ contentDelta: delta.content });
        }

        // Raisonnement / "thinking" (nom de champ variable selon les serveurs : reasoning_content, reasoning)
        const reasoningDelta = delta.reasoning_content ?? delta.reasoning;
        if (typeof reasoningDelta === 'string' && reasoningDelta.length > 0) {
            reasoningAcc += reasoningDelta;
            onChunk({ reasoningDelta });
        }

        // Accumulation des tool_calls fragmentés (envoyés morceau par morceau)
        if (Array.isArray(delta.tool_calls)) {
            for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                if (!toolCallsAcc[idx]) {
                    toolCallsAcc[idx] = { id: tc.id, type: tc.type || 'function', function: { name: '', arguments: '' } };
                }
                if (tc.id) toolCallsAcc[idx].id = tc.id;
                if (tc.function?.name) toolCallsAcc[idx].function.name += tc.function.name;
                if (tc.function?.arguments) toolCallsAcc[idx].function.arguments += tc.function.arguments;
            }
        }
    };

    // Lecture du flux SSE en continu jusqu'à la fin
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // dernière ligne potentiellement incomplète, conservée pour le prochain chunk

        for (const line of lines) {
            processLine(line);
        }
    }
    // Traiter un éventuel reste dans le buffer
    if (buffer) processLine(buffer);

    // Si le serveur a signalé une erreur explicite en cours de flux (ex: contexte dépassé), on la remonte
    // sous forme d'exception : elle sera affichée telle quelle à l'utilisateur par l'appelant (cf. catch
    // dans discussionClient.js), au lieu d'un message générique "aucune réponse".
    if (streamError) {
        throw new Error(streamError);
    }

    if (finishReason === 'length') {
        console.warn('[consumeStream] Le modèle a été interrompu par la limite de tokens (max_tokens atteint) avant de terminer sa réponse.');
    } else if (finishReason && finishReason !== 'stop' && finishReason !== 'tool_calls') {
        console.warn(`[consumeStream] Arrêt inhabituel du flux, finish_reason = "${finishReason}"`);
    }

    return {
        role: 'assistant', // Le rôle du message final renvoyé au modèle est toujours "assistant"
        content: contentAcc || null,
        ...(reasoningAcc && { reasoning_content: reasoningAcc }),
        ...(toolCallsAcc.length > 0 && { tool_calls: toolCallsAcc.filter(Boolean) }),
        _finishReason: finishReason
    };
}


/**
 * Construit le corps de la requête (snake_case) attendu par l'API OpenAI/Ollama
 * à partir des paramètres "camelCase" de openAiClient.
 */
function buildRequestBody({
    messages,
    model,
    maxTokens,
    temperature,
    topP,
    frequencyPenalty,
    presencePenalty,
    stop,
    stream,
    responseFormat,
    seed,
    resolvedTools,
    toolChoice
}) {
    const requestBody = {
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty,
    };

    // Ajouter les paramètres optionnels seulement s'ils sont définis
    if (stop) requestBody.stop = stop;
    if (stream) requestBody.stream = stream;
    if (responseFormat) requestBody.response_format = responseFormat;
    if (seed !== null) requestBody.seed = seed;

    if (resolvedTools && resolvedTools.length > 0) {
        requestBody.tools = resolvedTools;
        requestBody.tool_choice = toolChoice || "auto";
    }

    return requestBody;
}

/**
 * Effectue l'appel réseau vers l'API de chat completions et gère les erreurs HTTP.
 * Renvoie soit le ReadableStream (si `requestBody.stream` est vrai), soit le JSON parsé de la réponse.
 */
async function fetchChatCompletion(requestBody, apiUrl, signal) {
    console.log("[openAiClient] Tentative de connexion à :", `${apiUrl}/v1/chat/completions`);

    const fetchOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // Ajouter l'API key seulement si elle existe (certains serveurs locaux n'en ont besoin)
            ...(aiParams.apiKey && { 'Authorization': `Bearer ${aiParams.apiKey}` }),
        },
        body: JSON.stringify(requestBody),
        ...(signal && { signal })
    };

    const response = await fetch(`${apiUrl}/v1/chat/completions`, fetchOptions);

    if (!response.ok) {
        let errorMessage = `Erreur API ${response.status}`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.error?.message || errorMessage;
        } catch (e) {
            // Si la réponse n'est pas du JSON (ex: erreur HTML du serveur), on garde le message par défaut
        }
        throw new Error(errorMessage);
    }

    if (requestBody.stream) {
        return response.body; // Retourne un ReadableStream à traiter par l'appelant
    }

    return await response.json();
}


/**
 * Exécute les function calls demandés par le modèle et construit la liste de messages
 * mise à jour (historique + message assistant contenant les tool_calls + résultats des fonctions).
 * @param {object} responseMessage - Le message renvoyé par le modèle, contenant `tool_calls`.
 * @param {Array} messages - L'historique des messages envoyé lors de l'appel initial.
 * @param {(event: object) => void} [onToolCall] - Callback de feedback appelé à chaque étape (start/success/error).
 * @param {(name: string, args: object) => Promise<*>} [executeToolCall] - Exécuteur des fonctions. Par
 * défaut, exécute localement via availableFunctions (voir callableFunctions.js).
 * @returns {Promise<Array>} La liste de messages mise à jour, prête à être renvoyée au modèle.
 */
async function handleToolCalls(responseMessage, messages, onToolCall, executeToolCall) {
    const runTool = executeToolCall || ((name, args) => {
        if (!availableFunctions[name]) throw new Error(`fonction inconnue "${name}"`);
        return availableFunctions[name].execute(args);
    });

    const updatedMessages = [...messages, responseMessage];

    for (const toolCall of responseMessage.tool_calls) {
        const fnName = toolCall.function?.name;
        let fnArgs = {};
        try {
            fnArgs = toolCall.function?.arguments ? JSON.parse(toolCall.function.arguments) : {};
            console.log(`[handleToolCalls] Parsing arguments pour ${fnName}:`, fnArgs);
        } catch (e) {
            console.error("[handleToolCalls] Impossible de parser les arguments de la fonction :", toolCall.function?.arguments, e);
        }

        onToolCall?.({ id: toolCall.id, name: fnName, args: fnArgs, status: 'start' });

        let fnResult;
        try {
            console.log(`[handleToolCalls] Exécution de ${fnName}...`);
            fnResult = await runTool(fnName, fnArgs);
            console.log(`[handleToolCalls] Résultat de ${fnName}:`, fnResult);
            onToolCall?.({ id: toolCall.id, name: fnName, args: fnArgs, status: 'success', result: fnResult });
        } catch (e) {
            fnResult = `Erreur lors de l'exécution de la fonction ${fnName} : ${e.message || e}`;
            console.error(`[handleToolCalls] Erreur:`, fnResult);
            onToolCall?.({ id: toolCall.id, name: fnName, args: fnArgs, status: 'error', error: fnResult });
        }

        updatedMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: fnName,
            content: typeof fnResult === 'string' ? fnResult : JSON.stringify(fnResult)
        });
    }

    return updatedMessages;
}