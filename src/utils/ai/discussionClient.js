/**
 * Chat de test en bas à droite de la page.
 */
async function addAIChatClient() {
    // Éviter les doublons si déjà injecté
    if (document.getElementById('wedaHelper-chat-widget')) return;

    // S'assurer que les paramètres (dont le prompt système) sont chargés avant de construire le chat
    await aiParamsReady;

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
        #wedaHelper-info-chat {
            background: #2f80ed;
            color: white;
            border: none;
            border-radius: 50%;
            width: 22px;
            height: 22px;
            min-width: 22px;
            cursor: pointer;
            font-size: 13px;
            font-weight: bold;
            line-height: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 8px;
        }
        #wedaHelper-info-chat:hover { background: #1c66c9; }
        #wedaHelper-reset-chat {
            background: #e05252;
            color: white;
            border: none;
            border-radius: 50%;
            width: 22px;
            height: 22px;
            min-width: 22px;
            cursor: pointer;
            font-size: 13px;
            font-weight: bold;
            line-height: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 8px;
        }
        #wedaHelper-reset-chat:hover { background: #c23f3f; }
        #wedaHelper-header-actions { display: flex; align-items: center; }
        #wedaHelper-info-popover {
            display: none;
            position: absolute;
            top: 55px;
            right: 15px;
            width: 320px;
            max-height: 380px;
            overflow-y: auto;
            background: #ffffff;
            color: #333;
            border: 1px solid #ccc;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            padding: 12px 15px;
            font-size: 13px;
            z-index: 10000;
        }
        #wedaHelper-info-popover.open { display: block; }
        #wedaHelper-info-popover h4 { margin: 8px 0 4px; font-size: 13px; color: #10a37f; }
        #wedaHelper-info-popover h4:first-child { margin-top: 0; }
        #wedaHelper-info-popover pre {
            white-space: pre-wrap;
            word-wrap: break-word;
            background: #f7f7f8;
            padding: 6px 8px;
            border-radius: 6px;
            margin: 0;
            font-family: inherit;
        }
        #wedaHelper-info-popover ul { margin: 4px 0; padding-left: 18px; }
        #wedaHelper-toggle-model {
            display: block;
            margin: 6px 0 10px;
            background: #10a37f;
            color: white;
            border: none;
            padding: 6px 10px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
        }
        #wedaHelper-toggle-model:hover { background: #0d8c6d; }
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
        #wedaHelper-chat-messages .message.reasoning {
            background: #f0f0f0;
            color: #666;
            font-size: 12px;
            font-style: italic;
            border: 1px dashed #ccc;
        }
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
                <div id="wedaHelper-header-actions">
                    <button id="wedaHelper-reset-chat" type="button" title="Réinitialiser la conversation">↺</button>
                    <button id="wedaHelper-info-chat" type="button" title="Informations">?</button>
                    <button id="wedaHelper-close-chat" type="button">&times;</button>
                </div>
            </div>
            <div id="wedaHelper-info-popover"></div>
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
        { role: "system", content: aiParams.basicSystemPrompt }
    ];

    // Modèle actuellement utilisé pour les appels (bascule possible entre principal et secondaire)
    let useSecondaryModel = false;
    function getCurrentModel() {
        return useSecondaryModel ? aiParams.IAassistantModelNameSecondary : aiParams.defaultModel;
    }

    const chatWindow = widget.querySelector('#wedaHelper-chat-window');
    const chatToggle = widget.querySelector('#wedaHelper-chat-toggle');
    const closeChat = widget.querySelector('#wedaHelper-close-chat');
    const chatForm = widget.querySelector('#wedaHelper-chat-form');
    const chatInput = widget.querySelector('#wedaHelper-chat-input');
    const chatMessages = widget.querySelector('#wedaHelper-chat-messages');
    const infoButton = widget.querySelector('#wedaHelper-info-chat');
    const infoPopover = widget.querySelector('#wedaHelper-info-popover');
    const resetButton = widget.querySelector('#wedaHelper-reset-chat');

    function buildInfoContent() {
        const systemMessage = chatHistory.find(m => m.role === 'system');
        const functionsList = Object.entries(availableFunctions).map(([name, fn]) => {
            const description = fn.definition?.function?.description || '';
            return `<li><strong>${name}</strong>${description ? ' — ' + description : ''}</li>`;
        }).join('');

        const hasSecondaryModel = !!aiParams.IAassistantModelNameSecondary;

        return `
            <h4>Modèle utilisé</h4>
            <pre>${getCurrentModel()}</pre>
            ${hasSecondaryModel ? `<button id="wedaHelper-toggle-model" type="button">Basculer vers ${useSecondaryModel ? aiParams.defaultModel : aiParams.IAassistantModelNameSecondary}</button>` : ''}
            <h4>Prompt système</h4>
            <pre>${systemMessage ? systemMessage.content : '(aucun)'}</pre>
            <h4>Fonctions appelables</h4>
            <ul>${functionsList || '<li>(aucune)</li>'}</ul>
        `;
    }

    resetButton.addEventListener('click', () => {
        chatHistory = [
            { role: "system", content: aiParams.basicSystemPrompt }
        ];
        chatMessages.innerHTML = '';
        infoPopover.classList.remove('open');
    });

    infoButton.addEventListener('click', () => {
        const isPopoverOpen = infoPopover.classList.contains('open');
        if (isPopoverOpen) {
            infoPopover.classList.remove('open');
        } else {
            infoPopover.innerHTML = buildInfoContent();
            infoPopover.classList.add('open');
            bindInfoPopoverActions();
        }
    });

    function bindInfoPopoverActions() {
        const toggleModelButton = infoPopover.querySelector('#wedaHelper-toggle-model');
        if (toggleModelButton) {
            toggleModelButton.addEventListener('click', () => {
                useSecondaryModel = !useSecondaryModel;
                infoPopover.innerHTML = buildInfoContent();
                bindInfoPopoverActions();
            });
        }
    }

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

        let reasoningMsg = null; // créé au premier fragment de raisonnement reçu
        let contentStarted = false;

        try {
            const botResponse = await openAiClient({
                messages: chatHistory,
                model: getCurrentModel(),
                maxTokens: 800,
                temperature: 0.3,  // Plus basse température pour meilleure stabilité avec Mistral
                useTools: true,
                stream: true,
                onChunk: ({ contentDelta, reasoningDelta }) => {
                    if (reasoningDelta) {
                        if (!reasoningMsg) {
                            reasoningMsg = appendMessage('bot', '');
                            reasoningMsg.classList.remove('bot');
                            reasoningMsg.classList.add('reasoning');
                            // Le message de "réflexion" doit apparaître avant la réponse en cours
                            chatMessages.insertBefore(reasoningMsg, loadingMsg);
                        }
                        reasoningMsg.textContent += reasoningDelta;
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }
                    if (contentDelta) {
                        if (!contentStarted) {
                            contentStarted = true;
                            loadingMsg.textContent = '';
                            loadingMsg.classList.remove('loading');
                        }
                        loadingMsg.textContent += contentDelta;
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }
                }
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