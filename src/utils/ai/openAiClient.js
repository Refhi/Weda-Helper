/**
 * @file openAiClient.js
 * @description Contiens le nécessaire pour interagir avec l'API OpenAI.
 */

// Récupération des paramètres de l'appel
let aiParams = {};

// Initialisation asynchrone des paramètres. On garde la promesse pour pouvoir
// l'attendre depuis openAiClient et éviter toute race condition au premier appel.
const aiParamsReady = (async () => {
    aiParams.port = await getOptionPromise('IAassistantPort')
    aiParams.apiUrl = `http://localhost:${aiParams.port}`
    aiParams.apiKey = await getOptionPromise('IAassistantApiKey') // Normalement non utilisé, mais bon, autant être propre.
    aiParams.defaultModel = await getOptionPromise('IAassistantModelName') // Modèle par défaut, ex: "qwen3.5:9b"
    aiParams.IAassistantModelNameSecondary = await getOptionPromise('IAassistantModelNameSecondary') // Modèle secondaire, ex: "mistral-nemo:12b-instruct-2407-q5_K_M"
    aiParams.toolCalling = await getOptionPromise('IAassistantToolCalling') // true/false pour activer le function calling
    aiParams.MAX_TOOL_CALL_DEPTH =  5 // Nombre maximum d'allers-retours de function calling avant d'abandonner (évite les boucles infinies)
    aiParams.basicSystemPrompt = await getOptionPromise('IAassistantMainSystemPrompt') // Prompt de base pour le modèle
    aiParams.contextTokenLimit = await getOptionPromise('IAassistantContextLimit')
    console.log("[openAiClient] Paramètres récupérés :", aiParams);
})();

/**
 * Teste la disponibilité de l'API du modèle d'IA local (utile pour avertir l'utilisateur si
 * aucun serveur n'est détecté sur le port configuré, ex: LM Studio/Ollama non démarré).
 * @returns {Promise<boolean>} true si l'API répond, false sinon.
 */
async function testAiApiConnection() {
    await aiParamsReady;
    try {
        const response = await fetch(`${aiParams.apiUrl}/v1/models`, {
            method: 'GET',
            headers: {
                ...(aiParams.apiKey && { 'Authorization': `Bearer ${aiParams.apiKey}` }),
            }
        });
        return response.ok;
    } catch (error) {
        console.warn("[openAiClient] Test de connexion à l'API échoué :", error.message || error);
        return false;
    }
}

async function openAiClient({
    // --- 1. Le Prompt ---
    messages = [],  // Liste des messages de la conversation (system, user, assistant, tool)
    
    // --- 2. Paramètres de base ---
    model = aiParams.defaultModel, // modèle à utiliser (ex: "gpt-4o", "mistral-nemo:12b-instruct-2407-q5_K_M", etc.)
    
    // --- 3. Paramètres de Sampling (Ce que vous aviez déjà) ---
    maxTokens = 1000,      // le nombre maximum de tokens à générer dans la réponse. A ajuster à terme, et discuter de mettre un appel de l'API en amont pour requêter le nombre de tokens restants pour ne pas dépasser la limite du modèle.
    temperature = 0.7,     // le degré de créativité (0.0 = très conservateur, 1.0 = très créatif)
    topP = 0.9,            // le pourcentage de probabilité cumulative pour le filtrage des tokens (0.0 à 1.0)
    frequencyPenalty = 0.0,// pénalité pour la fréquence des tokens (0.0 à 2.0, plus élevé = moins de répétition)
    presencePenalty = 0.0, // pénalité pour la présence des tokens (0.0 à 2.0, plus élevé = moins de répétition)
    stop = null,           // séquence(s) de tokens pour arrêter la génération (ex: ["\n", "END"])

    // --- 4. Paramètres "Modernes" et très utiles ---
    stream = false,        // Pour recevoir la réponse mot par mot (SSE)
    responseFormat = null, // Pour forcer le format JSON ({ type: "json_object" })
    seed = null,           // Pour la reproductibilité (same seed = même résultat)

    // --- 5. Function/Tool calling ---
    tools = null,          // Liste de définitions de fonctions (format OpenAI). Si non fourni et useTools=true, utilise availableFunctions.
    toolChoice = null,     // "auto", "none", ou un objet ciblant une fonction précise
    useTools = true,      // Active le function calling avec le registre availableFunctions // TODO : usage de effectiveUseTools ???

    // --- 6. Streaming temps réel ---
    onChunk = null,        // Callback appelé à chaque fragment reçu en streaming : ({ contentDelta, reasoningDelta }) => void

    // --- 7. Feedback sur les appels de fonctions ---
    onToolCall = null,     // Callback appelé lors du cycle de vie d'un appel de fonction :
                           // ({ id, name, args, status: 'start'|'success'|'error', result, error }) => void

    // --- 7bis. Avertissement de dépassement de contexte ---
    onWarning = null,      // Callback appelé si le contexte estimé approche/dépasse IAassistantContextLimit :
                           // ({ type: 'context_limit', estimatedTokens, limit, ratio }) => void

    // --- 8. Interne : suivi de la profondeur de récursion (ne pas fournir manuellement) ---
    _toolCallDepth = 0,
}) {
    // S'assurer que les paramètres (apiUrl, defaultModel, etc.) sont chargés avant le premier appel
    await aiParamsReady;
    if (model === undefined) model = aiParams.defaultModel;

    // Si l'utilisateur passe quand même un simple texte par habitude, on le convertit en messages
    if (typeof messages === 'string') {
        messages = [{ role: "user", content: messages }];
    }

    // Filtrer uniquement les messages réellement vides (sans contenu ET sans tool_calls),
    // pour ne jamais supprimer un message assistant qui ne contient que des tool_calls (content: null).
    const filteredMessages = messages.filter(msg =>
        msg && (
            (typeof msg.content === 'string' && msg.content.trim()) ||
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
    const resolvedTools = tools || (useTools ? Object.values(availableFunctions).map(f => f.definition) : null);

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

    try {
        const data = await fetchChatCompletion(requestBody);

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
        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            console.log(`[openAiClient] Function calls reçus:`, responseMessage.tool_calls.map(tc => ({ name: tc.function?.name, args: tc.function?.arguments })));

            if (_toolCallDepth >= aiParams.MAX_TOOL_CALL_DEPTH) {
                console.warn(`[openAiClient] Profondeur maximale de function calling atteinte (${aiParams.MAX_TOOL_CALL_DEPTH}), arrêt de la boucle.`);
                return responseMessage.content || "Désolé, je n'ai pas pu terminer cette action après plusieurs tentatives d'appel de fonctions.";
            }

            const updatedMessages = await handleToolCalls(responseMessage, filteredMessages, onToolCall);

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
                _toolCallDepth: _toolCallDepth + 1
            });
        }

        return responseMessage.content;

    } catch (error) {
        console.error("[openAiClient] Erreur lors de l'appel OpenAI :", error.message || error);
        console.error("[openAiClient] Stack :", error.stack);
        console.error("[openAiClient] Vérifiez que le serveur est accessible sur :", aiParams.apiUrl);
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
    for (const msg of messages) {
        if (typeof msg?.content === 'string') charCount += msg.content.length;
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
    const reader = stream.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let contentAcc = '';
    let reasoningAcc = '';
    let finishReason = null; // raison d'arrêt renvoyée par le serveur : 'stop', 'length' (tokens épuisés), 'tool_calls', 'content_filter', etc.
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

    if (finishReason === 'length') {
        console.warn('[consumeStream] Le modèle a été interrompu par la limite de tokens (max_tokens atteint) avant de terminer sa réponse.');
    } else if (finishReason && finishReason !== 'stop' && finishReason !== 'tool_calls') {
        console.warn(`[consumeStream] Arrêt inhabituel du flux, finish_reason = "${finishReason}"`);
    }

    return {
        role: 'assistant',
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
async function fetchChatCompletion(requestBody) {
    console.log("[openAiClient] Tentative de connexion à :", `${aiParams.apiUrl}/v1/chat/completions`);

    const fetchOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // Ajouter l'API key seulement si elle existe (certains serveurs locaux n'en ont pas besoin)
            ...(aiParams.apiKey && { 'Authorization': `Bearer ${aiParams.apiKey}` }),
        },
        body: JSON.stringify(requestBody)
    };

    const response = await fetch(`${aiParams.apiUrl}/v1/chat/completions`, fetchOptions);

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
 * @returns {Promise<Array>} La liste de messages mise à jour, prête à être renvoyée au modèle.
 */
async function handleToolCalls(responseMessage, messages, onToolCall) {
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
        if (availableFunctions[fnName]) {
            try {
                console.log(`[handleToolCalls] Exécution de ${fnName}...`);
                fnResult = await availableFunctions[fnName].execute(fnArgs);
                console.log(`[handleToolCalls] Résultat de ${fnName}:`, fnResult);
                onToolCall?.({ id: toolCall.id, name: fnName, args: fnArgs, status: 'success', result: fnResult });
            } catch (e) {
                fnResult = `Erreur lors de l'exécution de la fonction ${fnName} : ${e.message || e}`;
                console.error(`[handleToolCalls] Erreur:`, fnResult);
                onToolCall?.({ id: toolCall.id, name: fnName, args: fnArgs, status: 'error', error: fnResult });
            }
        } else {
            fnResult = `Erreur : fonction inconnue "${fnName}"`;
            console.error(`[handleToolCalls]`, fnResult);
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