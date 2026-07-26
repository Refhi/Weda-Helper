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
    aiParams.toolCalling = await getOptionPromise('IAassistantToolCalling') // true/false pour activer le function calling
    aiParams.MAX_TOOL_CALL_DEPTH =  5 // Nombre maximum d'allers-retours de function calling avant d'abandonner (évite les boucles infinies)
    console.log("[openAiClient] Paramètres récupérés :", aiParams);
})();

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
    useTools = false,      // Active le function calling avec le registre availableFunctions

    // --- 6. Interne : suivi de la profondeur de récursion (ne pas fournir manuellement) ---
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

    // Gestion des tools (function calling)
    const resolvedTools = tools || (useTools ? Object.values(availableFunctions).map(f => f.definition) : null);

    const requestBody = buildRequestBody({
        messages: filteredMessages,
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
    });

    try {
        const data = await fetchChatCompletion(requestBody);

        // Gestion du streaming (si stream: true) : fetchChatCompletion renvoie directement le ReadableStream
        if (stream) {
            return data;
        }

        if (!data?.choices?.[0]?.message) {
            throw new Error("Réponse de l'API invalide : aucun message trouvé dans la réponse.");
        }

        const responseMessage = data.choices[0].message;

        // Gestion du function/tool calling : si le modèle demande à appeler une ou plusieurs fonctions
        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            console.log(`[openAiClient] Function calls reçus:`, responseMessage.tool_calls.map(tc => ({ name: tc.function?.name, args: tc.function?.arguments })));

            if (_toolCallDepth >= aiParams.MAX_TOOL_CALL_DEPTH) {
                console.warn(`[openAiClient] Profondeur maximale de function calling atteinte (${aiParams.MAX_TOOL_CALL_DEPTH}), arrêt de la boucle.`);
                return responseMessage.content || "Désolé, je n'ai pas pu terminer cette action après plusieurs tentatives d'appel de fonctions.";
            }

            const updatedMessages = await handleToolCalls(responseMessage, filteredMessages);

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
 * @returns {Promise<Array>} La liste de messages mise à jour, prête à être renvoyée au modèle.
 */
async function handleToolCalls(responseMessage, messages) {
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

        let fnResult;
        if (availableFunctions[fnName]) {
            try {
                console.log(`[handleToolCalls] Exécution de ${fnName}...`);
                fnResult = await availableFunctions[fnName].execute(fnArgs);
                console.log(`[handleToolCalls] Résultat de ${fnName}:`, fnResult);
            } catch (e) {
                fnResult = `Erreur lors de l'exécution de la fonction ${fnName} : ${e.message || e}`;
                console.error(`[handleToolCalls] Erreur:`, fnResult);
            }
        } else {
            fnResult = `Erreur : fonction inconnue "${fnName}"`;
            console.error(`[handleToolCalls]`, fnResult);
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