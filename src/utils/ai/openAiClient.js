/**
 * @file openAiClient.js
 * @description Contiens le nécessaire pour interagir avec l'API OpenAI.
 */

/** 
 * Variables temporaires (dev) 
 * Attention dans /etc/systemd/system/ollama.service.d/override.conf
 *     il faut que Environment="OLLAMA_ORIGINS=https://secure.weda.fr" soit bien défini pour que le serveur Ollama accepte les requêtes depuis Weda.
 */
const apiUrl = 'http://localhost:11434/v1'; // Attention dans /etc/systemd/system/ollama.service.d/override.conf
const apiKey = null; // On est en local



async function openAiClient({
    // --- 1. Le Prompt ---
    messages = [ // Nécessaire pour l'API. Faire toujours system => user  pour le premier message, puis ajouter des séquences de user => assistant pour le contexte.
        { role: "system", content: "" },   // Instructions pour le modèle (ex: "Tu es un assistant médical")
        { role: "user", content: "" },     // Prompt de l'utilisateur (ex: "Peux-tu m'aider à diagnostiquer ce patient ?")
        { role: "assistant", content: "" } // Maintient si nécessaire le contexte de la conversation (ex: "Bien sûr, je peux vous aider avec ça.")
    ],
    
    // --- 2. Paramètres de base ---
    model = "llama3", // Valeur par défaut très utile
    
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
}) {
    // Si l'utilisateur passe quand même un simple texte par habitude, on le convertit en messages
    if (typeof messages === 'string') {
        messages = [{ role: "user", content: messages }];
    }

    // Préparer le corps de la requête en convertissant en snake_case
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

    try {
        console.log("[openAiClient] Tentative de connexion à :", `${apiUrl}/chat/completions`);
        
        const fetchOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Ajouter l'API key seulement si elle existe (certains serveurs locaux n'en ont pas besoin)
                ...(apiKey && { 'Authorization': `Bearer ${apiKey}` }),
            },
            body: JSON.stringify(requestBody)
        };
        
        const response = await fetch(`${apiUrl}/chat/completions`, fetchOptions);

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
        // Gestion du streaming (si stream: true)
        if (stream) {
            return response.body; // Retourne un ReadableStream à traiter par l'appelant
        }

        // Gestion classique
        const data = await response.json();
        return data.choices[0].message.content;

    } catch (error) {
        console.error("[openAiClient] Erreur lors de l'appel OpenAI :", error.message || error);
        console.error("[openAiClient] Stack :", error.stack);
        console.error("[openAiClient] Vérifiez que le serveur est accessible sur :", apiUrl);
        throw error;
    }
}


/**
 * Chat de test en bas à droite de la page.
 * Le widget est entièrement construit en JS (pas de fetch d'un fichier .html) :
 * cela évite les soucis de web_accessible_resources et garantit que le script
 * du widget s'exécute dans le même contexte (isolated world) que openAiClient,
 * qui doit rester directement accessible.
 */
function addAIChatClient() {
    // Éviter les doublons si déjà injecté
    if (document.getElementById('wedaHelper-chat-widget')) return;

    // --- Styles ---
    const style = document.createElement('style');
    style.textContent = `
        #wedaHelper-chat-widget {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
        }
        #wedaHelper-chat-toggle {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background-color: #10a37f;
            color: white;
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 10px rgba(0,0,0,0.2);
            font-size: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s;
        }
        #wedaHelper-chat-toggle:hover { transform: scale(1.05); }
        #wedaHelper-chat-window {
            width: 380px;
            height: 500px;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.15);
            margin-bottom: 10px;
            overflow: hidden;
            display: none;
            flex-direction: column;
            transform: scale(0);
            transform-origin: bottom right;
            transition: transform 0.3s cubic-bezier(0.176, 0.085, 0.432, 1.275);
        }
        #wedaHelper-chat-window.open {
            display: flex;
            transform: scale(1);
        }
        #wedaHelper-chat-header {
            background: #343541;
            color: white;
            padding: 15px;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        #wedaHelper-close-chat { background: none; border: none; color: white; cursor: pointer; font-size: 20px; }
        #wedaHelper-chat-messages {
            flex-grow: 1;
            padding: 15px;
            overflow-y: auto;
            background: #f7f7f8;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        #wedaHelper-chat-messages .message {
            max-width: 80%;
            padding: 10px 15px;
            border-radius: 15px;
            line-height: 1.4;
            font-size: 14px;
            word-wrap: break-word;
            white-space: pre-wrap;
        }
        #wedaHelper-chat-messages .message.user {
            background: #10a37f;
            color: white;
            align-self: flex-end;
            border-bottom-right-radius: 5px;
        }
        #wedaHelper-chat-messages .message.bot {
            background: #ffffff;
            color: #333;
            align-self: flex-start;
            border-bottom-left-radius: 5px;
            border: 1px solid #e5e5e5;
        }
        #wedaHelper-chat-messages .message.loading { color: #888; font-style: italic; }
        #wedaHelper-chat-form {
            display: flex;
            padding: 15px;
            background: #ffffff;
            border-top: 1px solid #e5e5e5;
        }
        #wedaHelper-chat-input {
            flex-grow: 1;
            padding: 10px 15px;
            border: 1px solid #ccc;
            border-radius: 20px;
            outline: none;
            font-size: 14px;
        }
        #wedaHelper-chat-input:focus { border-color: #10a37f; }
        #wedaHelper-chat-submit {
            background: #10a37f;
            color: white;
            border: none;
            padding: 0 15px;
            border-radius: 20px;
            margin-left: 10px;
            cursor: pointer;
            font-weight: bold;
        }
        #wedaHelper-chat-submit:hover { background: #0d8c6d; }
    `;
    document.head.appendChild(style);

    // --- Structure HTML ---
    const widget = document.createElement('div');
    widget.id = 'wedaHelper-chat-widget';
    widget.innerHTML = `
        <div id="wedaHelper-chat-window">
            <div id="wedaHelper-chat-header">
                <span>Assistant Local</span>
                <button id="wedaHelper-close-chat" type="button">&times;</button>
            </div>
            <div id="wedaHelper-chat-messages"></div>
            <form id="wedaHelper-chat-form">
                <input type="text" id="wedaHelper-chat-input" placeholder="Écrivez un message..." autocomplete="off" required>
                <button type="submit" id="wedaHelper-chat-submit">Envoyer</button>
            </form>
        </div>
        <button id="wedaHelper-chat-toggle" type="button">💬</button>
    `;
    document.body.appendChild(widget);

    // --- Logique du chat ---
    let chatHistory = [
        { role: "system", content: "Tu es un assistant utile, concis et poli." }
    ];

    const chatWindow = widget.querySelector('#wedaHelper-chat-window');
    const chatToggle = widget.querySelector('#wedaHelper-chat-toggle');
    const closeChat = widget.querySelector('#wedaHelper-close-chat');
    const chatForm = widget.querySelector('#wedaHelper-chat-form');
    const chatInput = widget.querySelector('#wedaHelper-chat-input');
    const chatMessages = widget.querySelector('#wedaHelper-chat-messages');

    let isOpen = false;
    function toggleChat() {
        isOpen = !isOpen;
        if (isOpen) {
            chatWindow.classList.add('open');
            chatToggle.style.display = 'none';
            chatInput.focus();
        } else {
            chatWindow.classList.remove('open');
            chatToggle.style.display = 'flex';
        }
    }

    chatToggle.addEventListener('click', toggleChat);
    closeChat.addEventListener('click', toggleChat);

    function appendMessage(role, text) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', role === 'user' ? 'user' : 'bot');
        msgDiv.textContent = text;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return msgDiv;
    }

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const userText = chatInput.value.trim();
        if (!userText) return;

        appendMessage('user', userText);
        chatInput.value = '';

        chatHistory.push({ role: 'user', content: userText });

        const loadingMsg = appendMessage('bot', "L'IA réfléchit...");
        loadingMsg.classList.add('loading');

        try {
            const botResponse = await openAiClient({
                messages: chatHistory,
                maxTokens: 500,
                temperature: 0.7
            });

            loadingMsg.textContent = botResponse;
            loadingMsg.classList.remove('loading');

            chatHistory.push({ role: 'assistant', content: botResponse });

        } catch (error) {
            loadingMsg.textContent = "Erreur : " + error.message;
            loadingMsg.classList.remove('loading');
            loadingMsg.style.color = "red";
            console.error("[addAIChatClient] Erreur lors de l'appel OpenAI :", error);

            chatHistory.pop();
        }
    });
}

// Widget de test : à retirer/conditionner avant mise en production
addAIChatClient();