/**
 * @file openAiClient.js
 * @description Contiens le nécessaire pour interagir avec l'API OpenAI.
 */

/** 
 * Variables temporaires (dev) 
 * Attention dans /etc/systemd/system/ollama.service.d/override.conf
 *     il faut que Environment="OLLAMA_ORIGINS=https://secure.weda.fr" soit bien défini pour que le serveur Ollama accepte les requêtes depuis Weda.
 */
const aiParams = {
    apiUrl: 'http://localhost:11434/v1', // URL de l'API Ollama (OpenAI compatible)
    apiKey: null, // Clé API si nécessaire (null pour local)
    defaultModel: "qwen3.5:9b" // Modèle par défaut
}

async function openAiClient({
    // --- 1. Le Prompt ---
    messages = [ // Nécessaire pour l'API. Faire toujours system => user  pour le premier message, puis ajouter des séquences de user => assistant pour le contexte.
        { role: "system", content: "" },   // Instructions pour le modèle (ex: "Tu es un assistant médical")
        { role: "user", content: "" },     // Prompt de l'utilisateur (ex: "Peux-tu m'aider à diagnostiquer ce patient ?")
        { role: "assistant", content: "" } // Maintient si nécessaire le contexte de la conversation (ex: "Bien sûr, je peux vous aider avec ça.")
    ],
    
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
}) {
    // Si l'utilisateur passe quand même un simple texte par habitude, on le convertit en messages
    if (typeof messages === 'string') {
        messages = [{ role: "user", content: messages }];
    }

    // Gestion des tools (function calling)
    const resolvedTools = tools || (useTools ? Object.values(availableFunctions).map(f => f.definition) : null);

    const requestBody = buildRequestBody({
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
    });

    try {
        const data = await fetchChatCompletion(requestBody);

        // Gestion du streaming (si stream: true) : fetchChatCompletion renvoie directement le ReadableStream
        if (stream) {
            return data;
        }

        const responseMessage = data.choices[0].message;

        // Gestion du function/tool calling : si le modèle demande à appeler une ou plusieurs fonctions
        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            const updatedMessages = await handleToolCalls(responseMessage, messages);

            // On relance un appel avec les résultats des fonctions pour obtenir la réponse finale du modèle
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
                useTools
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
    console.log("[openAiClient] Tentative de connexion à :", `${aiParams.apiUrl}/chat/completions`);

    const fetchOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // Ajouter l'API key seulement si elle existe (certains serveurs locaux n'en ont pas besoin)
            ...(aiParams.apiKey && { 'Authorization': `Bearer ${aiParams.apiKey}` }),
        },
        body: JSON.stringify(requestBody)
    };

    const response = await fetch(`${aiParams.apiUrl}/chat/completions`, fetchOptions);

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
        } catch (e) {
            console.error("[openAiClient] Impossible de parser les arguments de la fonction :", toolCall.function?.arguments, e);
        }

        let fnResult;
        if (availableFunctions[fnName]) {
            try {
                fnResult = await availableFunctions[fnName].execute(fnArgs);
            } catch (e) {
                fnResult = `Erreur lors de l'exécution de la fonction ${fnName} : ${e.message || e}`;
            }
        } else {
            fnResult = `Erreur : fonction inconnue "${fnName}"`;
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