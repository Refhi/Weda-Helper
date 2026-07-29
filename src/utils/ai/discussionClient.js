/**
 * Préfixe des clés sessionStorage utilisées pour persister l'historique de chat, une clé par
 * patient (voir getChatHistoryStorageKey). Un seul historique "default" est utilisé lorsqu'aucun
 * patient n'est détecté dans l'URL.
 *
 * Le stockage/la lecture sont volontairement isolés dans de petites fonctions dédiées
 * (getChatHistoryStorageKey / loadChatHistoryFromStorage / saveChatHistoryToStorage) afin de
 * pouvoir, ultérieurement, y greffer une synchronisation cross-onglets (ex: relais via le
 * background service worker + permission "tabs") sans toucher au reste de la logique du chat.
 */
const AI_CHAT_HISTORY_STORAGE_PREFIX = 'wedaHelperChatHistory_';

/**
 * Construit la clé sessionStorage pour l'historique de chat d'un patient donné.
 * @param {string|null} patientId - Identifiant du patient (PatDk), ou null/absent si aucun patient détecté.
 * @returns {string}
 */
function getChatHistoryStorageKey(patientId) {
    return `${AI_CHAT_HISTORY_STORAGE_PREFIX}${patientId || 'default'}`;
}

/**
 * Charge l'état de chat persisté pour un patient donné : l'historique "conversationnel"
 * (format OpenAI, envoyé au modèle) ainsi que le journal d'affichage complet (bulles user/
 * assistant, mais aussi raisonnement, appels de fonction et erreurs) permettant de restituer
 * fidèlement l'état visuel du chat au rechargement.
 * @param {string|null} patientId
 * @returns {{chatHistory: Array, displayLog: Array}|null} L'état persisté, ou null si absent/illisible.
 */
function loadChatHistoryFromStorage(patientId) {
    try {
        const raw = sessionStorage.getItem(getChatHistoryStorageKey(patientId));
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.warn('[discussionClient] Historique de chat illisible en sessionStorage, réinitialisation', error);
        return null;
    }
}

/**
 * Persiste l'état de chat (historique conversationnel + journal d'affichage) pour un patient donné.
 * @param {string|null} patientId
 * @param {Array} history - Historique conversationnel (format OpenAI)
 * @param {Array} displayLog - Journal complet des bulles affichées (user, assistant, raisonnement, appels de fonction, erreurs...)
 */
function saveChatHistoryToStorage(patientId, history, displayLog) {
    try {
        sessionStorage.setItem(getChatHistoryStorageKey(patientId), JSON.stringify({ chatHistory: history, displayLog }));
    } catch (error) {
        console.warn("[discussionClient] Impossible d'écrire l'historique de chat en sessionStorage", error);
    }
}

/**
 * Supprime l'historique de chat persisté d'un patient donné.
 * @param {string|null} patientId
 */
function clearChatHistoryStorage(patientId) {
    sessionStorage.removeItem(getChatHistoryStorageKey(patientId));
}

/**
 * Chat de test en bas à droite de la page.
 */
async function addAIChatClient() {
    // Éviter les doublons si déjà injecté
    if (document.getElementById('wedaHelper-chat-widget')) return;

    // S'assurer que les paramètres (dont le prompt système) sont chargés avant de construire le chat
    await aiParamsReady;

    // Identifiant du patient courant, déterminé une seule fois à l'initialisation du chat (le
    // patient affiché ne change pas une fois la page chargée). Sert de clé de persistance pour
    // que chaque patient conserve sa propre conversation dans sessionStorage.
    const chatPatientId = (typeof getCurrentPatientId === 'function' ? getCurrentPatientId() : null) || null;

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
        #wedaHelper-disable-connector {
            display: block;
            margin: 0 0 10px;
            background: #e05252;
            color: white;
            border: none;
            padding: 6px 10px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
        }
        #wedaHelper-disable-connector:hover { background: #c23f3f; }
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
        #wedaHelper-chat-messages .message.tool-call {
            background: #eef6ff;
            color: #2f6f9e;
            font-size: 12px;
            border: 1px solid #cfe4f7;
            align-self: flex-start;
            cursor: default;
        }
        #wedaHelper-chat-messages .message.tool-call.pending {
            color: #a8790c;
            background: #fff8e6;
            border-color: #f0dca0;
        }
        #wedaHelper-chat-messages .message.tool-call.error {
            color: #b3261e;
            background: #fdecea;
            border-color: #f5c2be;
        }
        #wedaHelper-chat-messages .message.tool-call.error a {
            color: #b3261e;
            font-weight: bold;
            text-decoration: underline;
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
    // Reprend l'état persisté du patient courant s'il existe, sinon démarre une nouvelle conversation.
    const storedChatState = loadChatHistoryFromStorage(chatPatientId);
    let chatHistory = storedChatState?.chatHistory || [
        { role: "system", content: aiParams.basicSystemPrompt }
    ];
    // Journal complet des bulles affichées (au-delà du simple historique conversationnel envoyé au
    // modèle) : inclut le raisonnement, les appels de fonction (début/succès/erreur) et les messages
    // d'erreur/avertissement, afin de restituer fidèlement l'affichage au rechargement du chat.
    let chatDisplayLog = storedChatState?.displayLog || [];

    /** Persiste l'historique conversationnel et le journal d'affichage courants pour le patient en cours. */
    function persistChatHistory() {
        saveChatHistoryToStorage(chatPatientId, chatHistory, chatDisplayLog);
    }

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
            <button id="wedaHelper-disable-connector" type="button">Désactiver l'Assistant Local</button>
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
        chatDisplayLog = [];
        clearChatHistoryStorage(chatPatientId);
        chatMessages.innerHTML = '';
        infoPopover.classList.remove('open');
    });

    // Rejoue intégralement le journal d'affichage précédemment persisté pour ce patient : messages
    // user/assistant, mais aussi raisonnement, appels de fonction et erreurs, avec leurs classes et
    // info-bulles (title) d'origine.
    chatDisplayLog.forEach(entry => {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', ...entry.classes);
        msgDiv.textContent = entry.text;
        if (entry.title) msgDiv.title = entry.title;
        chatMessages.appendChild(msgDiv);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;

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

        const disableConnectorButton = infoPopover.querySelector('#wedaHelper-disable-connector');
        if (disableConnectorButton) {
            disableConnectorButton.addEventListener('click', () => {
                const confirmed = window.confirm("Voulez-vous vraiment désactiver le connecteur IA ? Vous pourrez le réactiver depuis les options avancées de Weda-Helper.");
                if (!confirmed) return;

                chrome.storage.local.set({ enableIAassistant: false }, () => {
                    infoPopover.classList.remove('open');
                    widget.remove();
                });
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

    /**
     * Vérifie la disponibilité de l'API du modèle d'IA local à l'ouverture du chat. Si le
     * serveur n'est pas détecté, affiche un message d'avertissement avec un lien vers le wiki
     * expliquant comment installer une IA locale.
     */
    async function checkAiApiAvailability() {
        const isAvailable = await testAiApiConnection();
        if (isAvailable) return;

        const warningBubble = appendMessage('bot', '');
        warningBubble.classList.remove('bot');
        warningBubble.classList.add('tool-call', 'error');
        warningBubble.innerHTML = `⚠️ Aucune IA locale détectée sur le port ${aiParams.port}. Consultez le <a href="https://github.com/Refhi/Weda-Helper/wiki/Installation-d'une-IA-sur-votre-poste,-pour-que-Weda%E2%80%90Helper-s'en-saisisse" target="_blank" rel="noopener noreferrer">wiki d'installation d'une IA locale</a> pour configurer l'assistant. Cliquez sur le ? bleu pour le désactiver.`;
    }
    checkAiApiAvailability();

    /**
     * Ajoute une entrée au journal d'affichage à partir de l'état actuel d'une bulle (classes,
     * texte, info-bulle), pour qu'elle soit restituée telle quelle au rechargement du chat.
     * @param {HTMLElement} bubble
     * @returns {object} L'entrée ajoutée (réutilisable avec updateDisplayEntry pour les bulles évolutives, ex: appels de fonction).
     */
    function recordDisplayEntry(bubble) {
        const entry = {
            classes: Array.from(bubble.classList).filter(c => c !== 'message'),
            text: bubble.textContent,
            title: bubble.title || ''
        };
        chatDisplayLog.push(entry);
        return entry;
    }

    /**
     * Met à jour une entrée du journal d'affichage déjà enregistrée (ex: bulle d'appel de
     * fonction passant de "pending" à "succès"/"erreur") à partir de l'état actuel de la bulle.
     * @param {object} entry - Entrée précédemment obtenue via recordDisplayEntry
     * @param {HTMLElement} bubble
     */
    function updateDisplayEntry(entry, bubble) {
        entry.classes = Array.from(bubble.classList).filter(c => c !== 'message');
        entry.text = bubble.textContent;
        entry.title = bubble.title || '';
    }

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const userText = chatInput.value.trim();
        if (!userText) return;

        appendMessage('user', userText);
        recordDisplayEntry(chatMessages.lastElementChild);
        chatInput.value = '';

        chatHistory.push({ role: 'user', content: userText });
        persistChatHistory();

        const loadingMsg = appendMessage('bot', "L'IA réfléchit...");
        loadingMsg.classList.add('loading');

        let reasoningMsg = null; // créé au premier fragment de raisonnement reçu
        let contentStarted = false;
        let lastFinishReason = null; // dernière raison d'arrêt renvoyée par le serveur ('length', 'stop', 'content_filter'...)
        let contextWarningShown = false; // évite de spammer une bulle à chaque relance de function calling
        const toolCallBubbles = new Map(); // id -> élément DOM du feedback d'appel de fonction
        const toolCallEntries = new Map(); // id -> entrée du journal d'affichage correspondante (pour mise à jour lors du succès/échec)

        try {
            const botResponse = await openAiClient({
                messages: chatHistory,
                model: getCurrentModel(),
                maxTokens: 8000,
                temperature: 0.3,  // Plus basse température pour meilleure stabilité avec Mistral
                useTools: true,
                stream: true,
                onWarning: ({ type, estimatedTokens, limit, ratio }) => {
                    if (type !== 'context_limit' || contextWarningShown) return;
                    contextWarningShown = true;
                    const warningBubble = appendMessage('bot', `⚠️ Le contexte estimé de la conversation (~${estimatedTokens} tokens) approche ou dépasse la limite configurée (${limit} tokens, ${Math.round(ratio * 100)}%). Les échanges avec les outils peuvent être tronqués par le serveur : pensez à réinitialiser la conversation si les réponses deviennent incohérentes.`);
                    warningBubble.classList.remove('bot');
                    warningBubble.classList.add('tool-call', 'error');
                    chatMessages.insertBefore(warningBubble, loadingMsg);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                    recordDisplayEntry(warningBubble);
                    persistChatHistory();
                },
                onChunk: ({ contentDelta, reasoningDelta, finishReason }) => {
                    if (finishReason) {
                        lastFinishReason = finishReason;
                    }
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
                },
                onToolCall: ({ id, name, args, status, result, error }) => {
                    // Une nouvelle étape de raisonnement pourra suivre cet appel : on force une nouvelle bulle,
                    // en persistant d'abord celle en cours si elle existe.
                    if (reasoningMsg) {
                        recordDisplayEntry(reasoningMsg);
                        persistChatHistory();
                    }
                    reasoningMsg = null;

                    if (status === 'start') {
                        const bubble = appendMessage('bot', `🔧 Appel de la fonction "${name}"...`);
                        bubble.classList.remove('bot');
                        bubble.classList.add('tool-call', 'pending');
                        bubble.title = `Arguments :\n${JSON.stringify(args, null, 2)}`;
                        chatMessages.insertBefore(bubble, loadingMsg);
                        toolCallBubbles.set(id, bubble);
                        toolCallEntries.set(id, recordDisplayEntry(bubble));
                        persistChatHistory();
                        return;
                    }

                    const bubble = toolCallBubbles.get(id);
                    if (!bubble) return;

                    bubble.classList.remove('pending');
                    if (status === 'success') {
                        bubble.textContent = `✅ Résultat reçu de "${name}"`;
                        const resultText = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
                        bubble.title = `Résultat :\n${resultText}`;
                    } else if (status === 'error') {
                        bubble.classList.add('error');
                        bubble.textContent = `❌ Échec de l'appel à "${name}"`;
                        bubble.title = `Erreur :\n${error}`;
                    }
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                    const entry = toolCallEntries.get(id);
                    if (entry) {
                        updateDisplayEntry(entry, bubble);
                        persistChatHistory();
                    }
                }
            });

            if (!botResponse || !botResponse.trim()) {
                // Le modèle s'est arrêté (souvent après une phase de réflexion) sans produire de réponse finale
                let reason;
                if (lastFinishReason === 'length') {
                    reason = "la limite de tokens (maxTokens) a été atteinte avant la fin de sa réflexion — augmentez maxTokens ou raccourcissez le prompt système/l'historique.";
                } else if (lastFinishReason === 'content_filter') {
                    reason = "la réponse a été bloquée par un filtre de contenu côté serveur.";
                } else if (lastFinishReason) {
                    reason = `le serveur a renvoyé un arrêt inhabituel (finish_reason = "${lastFinishReason}"), consultez les logs du serveur hébergeant le LLM pour plus de détails.`;
                } else {
                    reason = "aucune raison d'arrêt n'a été transmise par le serveur (connexion interrompue ?), consultez les logs du serveur hébergeant le LLM pour plus de détails.";
                }
                loadingMsg.textContent = `⚠️ Le modèle n'a renvoyé aucune réponse : ${reason}`;
                loadingMsg.classList.remove('loading');
                loadingMsg.classList.add('tool-call', 'error');
                console.warn("[addAIChatClient] Réponse vide reçue du modèle.", { reasoning: reasoningMsg?.textContent, finishReason: lastFinishReason });

                if (reasoningMsg) {
                    reasoningMsg.title = "La réflexion s'est arrêtée sans aboutir à une réponse.";
                    reasoningMsg.classList.add('error');
                    recordDisplayEntry(reasoningMsg);
                    reasoningMsg = null;
                }

                chatHistory.pop(); // on retire le message utilisateur pour permettre de reformuler/réessayer proprement
                recordDisplayEntry(loadingMsg);
                persistChatHistory();
            } else {
                loadingMsg.textContent = botResponse;
                loadingMsg.classList.remove('loading');

                if (reasoningMsg) {
                    recordDisplayEntry(reasoningMsg);
                    reasoningMsg = null;
                }

                if (lastFinishReason === 'stop') {
                    loadingMsg.title = 'Réponse complète';
                } else if (lastFinishReason === 'length') {
                    loadingMsg.title = 'Réponse probablement tronquée (limite de tokens atteinte)';
                    const truncatedNotice = appendMessage('bot', '✂️ Cette réponse a été tronquée : la limite de tokens (maxTokens) a été atteinte avant que le modèle ait terminé.');
                    truncatedNotice.classList.remove('bot');
                    truncatedNotice.classList.add('tool-call', 'error');
                    console.warn("[addAIChatClient] Réponse tronquée : limite de tokens atteinte.", { reasoning: reasoningMsg?.textContent, finishReason: lastFinishReason });
                    recordDisplayEntry(truncatedNotice);
                }

                chatHistory.push({ role: 'assistant', content: botResponse });
                recordDisplayEntry(loadingMsg);
                persistChatHistory();
            }

        } catch (error) {
            loadingMsg.textContent = "❌ Erreur : " + error.message;
            loadingMsg.classList.remove('loading');
            loadingMsg.classList.add('tool-call', 'error');
            console.error("[addAIChatClient] Erreur lors de l'appel OpenAI :", error);

            if (reasoningMsg) {
                recordDisplayEntry(reasoningMsg);
                reasoningMsg = null;
            }

            chatHistory.pop();
            recordDisplayEntry(loadingMsg);
            persistChatHistory();
        }
    });
}

// Widget de test : à retirer/conditionner avant mise en production
addAIChatClient();