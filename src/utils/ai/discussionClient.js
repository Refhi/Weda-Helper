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
const AI_CHAT_WIDGET_POSITION_STORAGE_KEY = 'wedaHelperChatWidgetPosition';
const AI_CHAT_WINDOW_POSITION_STORAGE_KEY = 'wedaHelperChatWindowPosition';

/**
 * Charge la position persistée du widget de chat si disponible.
 * @returns {{left: number, top: number}|null}
 */
function loadWidgetPositionFromStorage() {
    try {
        const raw = localStorage.getItem(AI_CHAT_WIDGET_POSITION_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (typeof parsed?.left === 'number' && typeof parsed?.top === 'number') {
            return parsed;
        }
    } catch (error) {
        console.warn('[discussionClient] Position du widget IA illisible, position par défaut conservée', error);
    }
    return null;
}

/**
 * Persiste la position du widget de chat.
 * @param {{left: number, top: number}} position
 */
function saveWidgetPositionToStorage(position) {
    try {
        localStorage.setItem(AI_CHAT_WIDGET_POSITION_STORAGE_KEY, JSON.stringify(position));
    } catch (error) {
        console.warn('[discussionClient] Impossible de sauvegarder la position du widget IA', error);
    }
}

/**
 * Charge la position persistée de la fenêtre de chat si disponible.
 * @returns {{left: number, top: number}|null}
 */
function loadChatWindowPositionFromStorage() {
    try {
        const raw = localStorage.getItem(AI_CHAT_WINDOW_POSITION_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (typeof parsed?.left === 'number' && typeof parsed?.top === 'number') {
            return parsed;
        }
    } catch (error) {
        console.warn('[discussionClient] Position de la fenetre de chat illisible, position par defaut conservee', error);
    }
    return null;
}

/**
 * Persiste la position de la fenêtre de chat.
 * @param {{left: number, top: number}} position
 */
function saveChatWindowPositionToStorage(position) {
    try {
        localStorage.setItem(AI_CHAT_WINDOW_POSITION_STORAGE_KEY, JSON.stringify(position));
    } catch (error) {
        console.warn('[discussionClient] Impossible de sauvegarder la position de la fenetre de chat', error);
    }
}

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
 * Sauvegarde l'état de chat (historique conversationnel + journal d'affichage) pour un patient donné.
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
 * Insertion du chat en bas à droite de la page.
 */
async function addAIChatClient() {
    // Éviter les doublons si déjà injecté
    if (document.getElementById('wedaHelper-chat-widget')) return;

    /** 
     *  Attente de la disponibilité des paramètres de l'IA
     * @see openAiClient.js
     */ 
    await aiParamsReady;

    /**
     * Identifiant du patient courant, déterminé une seule fois à l'initialisation du chat (le
     * patient affiché ne change pas une fois la page chargée). Sert de clé de persistance pour
     * que chaque patient conserve sa propre conversation dans sessionStorage.
     */
    const chatPatientId = getCurrentPatientId();

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
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s;
            position: relative;
            touch-action: none;
        }
        #wedaHelper-chat-toggle:hover { transform: scale(1.05); }
        #wedaHelper-chat-toggle .wedaHelper-chat-toggle-main {
            position: absolute;
            font-size: 28px;
            line-height: 1;
            transform: translate(-1px, 2px);
        }
        #wedaHelper-chat-toggle .wedaHelper-chat-toggle-badge {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(2px, -14px);
            font-size: 16px;
            line-height: 1;
            filter: drop-shadow(0 1px 1px rgba(0,0,0,0.25));
        }
        #wedaHelper-chat-toggle .wedaHelper-chat-toggle-main,
        #wedaHelper-chat-toggle .wedaHelper-chat-toggle-badge {
            pointer-events: none;
        }
        #wedaHelper-chat-toggle .wedaHelper-visually-hidden {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        }
        #wedaHelper-chat-window {
            position: fixed;
            width: 380px;
            height: 500px;
            min-width: 260px;
            min-height: 200px;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.15);
            bottom: 90px;
            right: 20px;
            overflow: hidden;
            display: none;
            flex-direction: column;
            transform: scale(0);
            transform-origin: bottom right;
            transition: transform 0.3s cubic-bezier(0.176, 0.085, 0.432, 1.275);
            user-select: none;
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
            user-select: none;
            touch-action: none;
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
        #wedaHelper-model-select {
            display: block;
            width: 100%;
            box-sizing: border-box;
            margin: 6px 0 10px;
            background: #ffffff;
            color: #333;
            border: 1px solid #ccc;
            padding: 5px 8px;
            border-radius: 6px;
            font-size: 12px;
        }
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
        #wedaHelper-chat-messages .message.bot.markdown-rendered {
            white-space: normal;
        }
        #wedaHelper-chat-messages .message.bot.markdown-rendered > :first-child { margin-top: 0; }
        #wedaHelper-chat-messages .message.bot.markdown-rendered > :last-child { margin-bottom: 0; }
        #wedaHelper-chat-messages .message.bot.markdown-rendered p,
        #wedaHelper-chat-messages .message.bot.markdown-rendered ul,
        #wedaHelper-chat-messages .message.bot.markdown-rendered ol,
        #wedaHelper-chat-messages .message.bot.markdown-rendered blockquote,
        #wedaHelper-chat-messages .message.bot.markdown-rendered pre,
        #wedaHelper-chat-messages .message.bot.markdown-rendered table {
            margin: 0.5em 0;
        }
        #wedaHelper-chat-messages .message.bot.markdown-rendered code {
            background: #f1f3f5;
            padding: 0.1em 0.35em;
            border-radius: 4px;
            font-size: 0.92em;
        }
        #wedaHelper-chat-messages .message.bot.markdown-rendered pre {
            background: #f7f7f8;
            padding: 8px 10px;
            border-radius: 8px;
            overflow-x: auto;
        }
        #wedaHelper-chat-messages .message.bot.markdown-rendered pre code {
            background: transparent;
            padding: 0;
            border-radius: 0;
            font-size: 0.9em;
        }
        #wedaHelper-chat-messages .message.bot.markdown-rendered a {
            color: #0d6abf;
            text-decoration: underline;
        }
        #wedaHelper-chat-messages .message.bot.markdown-rendered table {
            display: block;
            max-width: 100%;
            overflow-x: auto;
            border-collapse: collapse;
            border: 1px solid #d9d9d9;
            font-size: 13px;
        }
        #wedaHelper-chat-messages .message.bot.markdown-rendered th,
        #wedaHelper-chat-messages .message.bot.markdown-rendered td {
            border: 1px solid #d9d9d9;
            padding: 6px 8px;
            text-align: left;
            vertical-align: top;
        }
        #wedaHelper-chat-messages .message.bot.markdown-rendered th {
            background: #f3f5f7;
            font-weight: 600;
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
            flex-direction: column;
            padding: 15px;
            background: #ffffff;
            border-top: 1px solid #e5e5e5;
        }
        #wedaHelper-attachments-preview {
            display: none;
            flex-wrap: wrap;
            gap: 6px;
            margin-bottom: 8px;
        }
        #wedaHelper-attachments-preview.visible { display: flex; }
        .wedaHelper-attachment-chip {
            display: flex;
            align-items: center;
            gap: 4px;
            background: #eef6ff;
            color: #2f6f9e;
            border: 1px solid #cfe4f7;
            border-radius: 12px;
            padding: 3px 8px;
            font-size: 12px;
            max-width: 200px;
        }
        .wedaHelper-attachment-chip span {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .wedaHelper-attachment-chip button {
            background: none;
            border: none;
            color: #2f6f9e;
            cursor: pointer;
            font-weight: bold;
            font-size: 13px;
            line-height: 1;
            padding: 0;
        }
        .wedaHelper-attachment-chip button:hover { color: #b3261e; }
        #wedaHelper-chat-input-row {
            display: flex;
        }
        #wedaHelper-attach-file {
            background: #f0f0f0;
            color: #555;
            border: 1px solid #ccc;
            border-radius: 20px;
            width: 36px;
            min-width: 36px;
            margin-right: 8px;
            cursor: pointer;
            font-size: 16px;
        }
        #wedaHelper-attach-file:hover { background: #e5e5e5; }
        #wedaHelper-input-wrapper {
            position: relative;
            flex-grow: 1;
        }
        #wedaHelper-input-resize-handle {
            position: absolute;
            top: 0;
            left: 0;
            width: 14px;
            height: 14px;
            cursor: ns-resize;
            z-index: 1;
        }
        #wedaHelper-input-resize-handle::before {
            content: '';
            position: absolute;
            top: 3px;
            left: 3px;
            width: 7px;
            height: 7px;
            border-top: 2px solid #999;
            border-left: 2px solid #999;
        }
        #wedaHelper-chat-input {
            width: 100%;
            box-sizing: border-box;
            padding: 10px 15px;
            border: 1px solid #ccc;
            border-radius: 12px;
            outline: none;
            font-size: 14px;
            min-height: 36px;
            max-height: 160px;
            resize: none;
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
        #wedaHelper-chat-stop {
            display: none;
            background: #e05252;
            color: white;
            border: none;
            padding: 0 15px;
            border-radius: 20px;
            margin-left: 10px;
            cursor: pointer;
            font-weight: bold;
        }
        #wedaHelper-chat-stop:hover { background: #c23f3f; }
        #wedaHelper-chat-stop.visible { display: block; }
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
                <div id="wedaHelper-attachments-preview"></div>
                <div id="wedaHelper-chat-input-row">
                    <input type="file" id="wedaHelper-file-input" accept=".pdf,.txt,.md,.csv,.log,.json,image/*" multiple style="display:none;">
                    <button type="button" id="wedaHelper-attach-file" title="Joindre un ou plusieurs fichiers (PDF, texte, image)">📎</button>
                    <div id="wedaHelper-input-wrapper">
                        <div id="wedaHelper-input-resize-handle" title="Redimensionner"></div>
                        <textarea id="wedaHelper-chat-input" placeholder="Écrivez un message..." autocomplete="off" required rows="2"></textarea>
                    </div>
                    <button type="submit" id="wedaHelper-chat-submit">Envoyer</button>
                    <button type="button" id="wedaHelper-chat-stop" title="Arrêter la génération">Stop</button>
                </div>
            </form>
        </div>
        <button id="wedaHelper-chat-toggle" type="button" title="Assistant IA ✨" aria-label="Ouvrir l'assistant IA">
            <span class="wedaHelper-chat-toggle-main" aria-hidden="true">💬</span>
            <span class="wedaHelper-chat-toggle-badge" aria-hidden="true">✨</span>
            <span class="wedaHelper-visually-hidden">Assistant IA</span>
        </button>
    `;
    document.body.appendChild(widget);

    // --- Logique du chat ---
    // Reprend l'état persisté du patient courant s'il existe, sinon démarre une nouvelle conversation.
    const storedChatState = loadChatHistoryFromStorage(chatPatientId);
    let chatHistory = storedChatState?.chatHistory || [
        { role: "system", content: aiParams.basicSystemPrompt } // prompt système de base, défini dans openAiClient.js
    ];
    // Journal complet des bulles affichées (au-delà du simple historique conversationnel envoyé au
    // modèle) : inclut le raisonnement, les appels de fonction (début/succès/erreur) et les messages
    // d'erreur/avertissement, afin de restituer fidèlement l'affichage au rechargement du chat.
    let chatDisplayLog = storedChatState?.displayLog || [];

    /** Persiste l'historique conversationnel et le journal d'affichage courants pour le patient en cours. */
    function persistChatHistory() {
        saveChatHistoryToStorage(chatPatientId, chatHistory, chatDisplayLog);
    }

    // Modèle actuellement sélectionné pour les appels, parmi tous les modèles détectés (aiParams.availableModels,
    // tous ports actifs confondus). Initialisé au modèle résolu au démarrage (préféré si trouvé, sinon premier disponible).
    let selectedModel = aiParams.defaultModel;
    function getCurrentModel() {
        return selectedModel;
    }

    const chatWindow = widget.querySelector('#wedaHelper-chat-window');
    const chatHeader = widget.querySelector('#wedaHelper-chat-header');
    const chatToggle = widget.querySelector('#wedaHelper-chat-toggle');
    const closeChat = widget.querySelector('#wedaHelper-close-chat');
    const chatForm = widget.querySelector('#wedaHelper-chat-form');
    const chatInput = widget.querySelector('#wedaHelper-chat-input');
    const chatSubmitButton = widget.querySelector('#wedaHelper-chat-submit');
    const chatStopButton = widget.querySelector('#wedaHelper-chat-stop');
    const chatMessages = widget.querySelector('#wedaHelper-chat-messages');
    const infoButton = widget.querySelector('#wedaHelper-info-chat');
    const infoPopover = widget.querySelector('#wedaHelper-info-popover');
    const resetButton = widget.querySelector('#wedaHelper-reset-chat');
    const inputResizeHandle = widget.querySelector('#wedaHelper-input-resize-handle');
    const fileInput = widget.querySelector('#wedaHelper-file-input');
    const attachFileButton = widget.querySelector('#wedaHelper-attach-file');
    const attachmentsPreview = widget.querySelector('#wedaHelper-attachments-preview');
    const markdownRenderer = typeof markdownit === 'function'
        ? markdownit({ html: false, linkify: true, breaks: true })
        : null;
    const domPurifyApi = (typeof DOMPurify !== 'undefined' && typeof DOMPurify.sanitize === 'function')
        ? DOMPurify
        : null;

    function clampWidgetPosition(left, top) {
        const maxLeft = Math.max(0, window.innerWidth - widget.offsetWidth);
        const maxTop = Math.max(0, window.innerHeight - widget.offsetHeight);
        return {
            left: Math.min(Math.max(0, left), maxLeft),
            top: Math.min(Math.max(0, top), maxTop)
        };
    }

    function clampChatWindowPosition(left, top) {
        const windowRect = chatWindow.getBoundingClientRect();
        const windowWidth = windowRect.width || chatWindow.offsetWidth || 380;
        const windowHeight = windowRect.height || chatWindow.offsetHeight || 500;
        const maxLeft = Math.max(0, window.innerWidth - windowWidth);
        const maxTop = Math.max(0, window.innerHeight - windowHeight);
        return {
            left: Math.min(Math.max(0, left), maxLeft),
            top: Math.min(Math.max(0, top), maxTop)
        };
    }

    function applyWidgetPosition(left, top) {
        const clamped = clampWidgetPosition(left, top);
        widget.style.left = `${clamped.left}px`;
        widget.style.top = `${clamped.top}px`;
        widget.style.right = 'auto';
        widget.style.bottom = 'auto';
        return clamped;
    }

    function applyChatWindowPosition(left, top, { clamp = true } = {}) {
        const nextPosition = clamp ? clampChatWindowPosition(left, top) : { left, top };
        chatWindow.style.left = `${nextPosition.left}px`;
        chatWindow.style.top = `${nextPosition.top}px`;
        chatWindow.style.right = 'auto';
        chatWindow.style.bottom = 'auto';
        return nextPosition;
    }

    function bindDragHandle(handleEl, {
        getStartRect,
        applyPosition,
        savePosition,
        suppressClickOnDrag = false,
        canStartDrag = () => true
    } = {}) {
        if (!handleEl) return;

        let isDragging = false;
        let pointerStartX = 0;
        let pointerStartY = 0;
        let widgetStartLeft = 0;
        let widgetStartTop = 0;
        let suppressClick = false;

        function onPointerMove(event) {
            const deltaX = event.clientX - pointerStartX;
            const deltaY = event.clientY - pointerStartY;

            if (!isDragging && (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4)) {
                isDragging = true;
                if (suppressClickOnDrag) suppressClick = true;
            }
            if (!isDragging) return;

            applyPosition(widgetStartLeft + deltaX, widgetStartTop + deltaY);
        }

        function onPointerUp() {
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);

            if (isDragging) {
                const currentRect = getStartRect();
                const applied = applyPosition(currentRect.left, currentRect.top);
                savePosition(applied);
            }
            isDragging = false;
        }

        handleEl.addEventListener('pointerdown', (event) => {
            if (event.button !== 0 || !canStartDrag(event)) return;
            pointerStartX = event.clientX;
            pointerStartY = event.clientY;
            const rect = getStartRect();
            widgetStartLeft = rect.left;
            widgetStartTop = rect.top;
            suppressClick = false;

            document.addEventListener('pointermove', onPointerMove);
            document.addEventListener('pointerup', onPointerUp);
        });

        if (suppressClickOnDrag) {
            handleEl.addEventListener('click', (event) => {
                if (!suppressClick) return;
                event.preventDefault();
                event.stopImmediatePropagation();
                suppressClick = false;
            }, true);
        }
    }

    function initializeDraggableChatWidget() {
        const savedPosition = loadWidgetPositionFromStorage();
        if (savedPosition) {
            const applied = applyWidgetPosition(savedPosition.left, savedPosition.top);
            saveWidgetPositionToStorage(applied);
        }

        bindDragHandle(chatToggle, {
            getStartRect: () => widget.getBoundingClientRect(),
            applyPosition: (left, top) => applyWidgetPosition(left, top),
            savePosition: (position) => saveWidgetPositionToStorage(position),
            suppressClickOnDrag: true
        });

        window.addEventListener('resize', () => {
            if (widget.style.left && widget.style.top) {
                const currentLeft = parseFloat(widget.style.left) || 0;
                const currentTop = parseFloat(widget.style.top) || 0;
                const clamped = applyWidgetPosition(currentLeft, currentTop);
                saveWidgetPositionToStorage(clamped);
            }
        });
    }

    function initializeDraggableChatWindow() {
        const savedPosition = loadChatWindowPositionFromStorage();
        if (savedPosition) {
            applyChatWindowPosition(savedPosition.left, savedPosition.top, { clamp: false });
        }

        bindDragHandle(chatHeader, {
            getStartRect: () => chatWindow.getBoundingClientRect(),
            applyPosition: (left, top) => applyChatWindowPosition(left, top),
            savePosition: (position) => saveChatWindowPositionToStorage(position),
            canStartDrag: (event) => !event.target.closest('button') && !getChatWindowResizeDirection(event)
        });

        window.addEventListener('resize', () => {
            if (chatWindow.style.left && chatWindow.style.top) {
                const currentLeft = parseFloat(chatWindow.style.left) || 0;
                const currentTop = parseFloat(chatWindow.style.top) || 0;
                const clamped = applyChatWindowPosition(currentLeft, currentTop);
                saveChatWindowPositionToStorage(clamped);
            }
        });
    }

    initializeDraggableChatWidget();
    initializeDraggableChatWindow();
    console.info('[discussionClient] Markdown pipeline init', {
        markdownitAvailable: !!markdownRenderer,
        domPurifyAvailable: !!domPurifyApi
    });

    function getChatWindowResizeDirection(event, threshold = 8) {
        const rect = chatWindow.getBoundingClientRect();
        const nearLeft = event.clientX <= rect.left + threshold;
        const nearRight = event.clientX >= rect.right - threshold;
        const nearTop = event.clientY <= rect.top + threshold;
        const nearBottom = event.clientY >= rect.bottom - threshold;

        if (nearTop && nearLeft) return 'nw';
        if (nearTop && nearRight) return 'ne';
        if (nearBottom && nearLeft) return 'sw';
        if (nearBottom && nearRight) return 'se';
        if (nearLeft) return 'w';
        if (nearRight) return 'e';
        if (nearTop) return 'n';
        if (nearBottom) return 's';
        return '';
    }

    function updateChatWindowResizeCursor(direction) {
        const cursorMap = {
            n: 'ns-resize',
            s: 'ns-resize',
            e: 'ew-resize',
            w: 'ew-resize',
            ne: 'nesw-resize',
            sw: 'nesw-resize',
            nw: 'nwse-resize',
            se: 'nwse-resize'
        };
        chatWindow.style.cursor = cursorMap[direction] || '';
    }

    function makeChatWindowResizableByEdges() {
        const minWidth = 260;
        const minHeight = 200;
        let activeResizeDirection = '';
        let isResizing = false;
        let startX = 0;
        let startY = 0;
        let startRect = null;

        function onResizeMove(event) {
            if (!isResizing || !startRect) return;
            const deltaX = event.clientX - startX;
            const deltaY = event.clientY - startY;

            let nextLeft = startRect.left;
            let nextTop = startRect.top;
            let nextWidth = startRect.width;
            let nextHeight = startRect.height;

            if (activeResizeDirection.includes('e')) {
                nextWidth = Math.max(minWidth, startRect.width + deltaX);
                nextWidth = Math.min(nextWidth, window.innerWidth - startRect.left);
            }
            if (activeResizeDirection.includes('s')) {
                nextHeight = Math.max(minHeight, startRect.height + deltaY);
                nextHeight = Math.min(nextHeight, window.innerHeight - startRect.top);
            }
            if (activeResizeDirection.includes('w')) {
                const maxLeft = startRect.left + startRect.width - minWidth;
                nextLeft = Math.max(0, Math.min(startRect.left + deltaX, maxLeft));
                nextWidth = Math.max(minWidth, startRect.width - (nextLeft - startRect.left));
            }
            if (activeResizeDirection.includes('n')) {
                const maxTop = startRect.top + startRect.height - minHeight;
                nextTop = Math.max(0, Math.min(startRect.top + deltaY, maxTop));
                nextHeight = Math.max(minHeight, startRect.height - (nextTop - startRect.top));
            }

            const clamped = clampChatWindowPosition(nextLeft, nextTop);
            chatWindow.style.left = `${clamped.left}px`;
            chatWindow.style.top = `${clamped.top}px`;
            chatWindow.style.right = 'auto';
            chatWindow.style.bottom = 'auto';
            chatWindow.style.width = `${Math.min(nextWidth, window.innerWidth - clamped.left)}px`;
            chatWindow.style.height = `${Math.min(nextHeight, window.innerHeight - clamped.top)}px`;
        }

        function onResizeUp() {
            if (isResizing) {
                const clamped = applyChatWindowPosition(chatWindow.getBoundingClientRect().left, chatWindow.getBoundingClientRect().top);
                saveChatWindowPositionToStorage(clamped);
            }
            isResizing = false;
            activeResizeDirection = '';
            startRect = null;
            chatWindow.classList.remove('wedaHelper-resizing');
            document.removeEventListener('pointermove', onResizeMove);
            document.removeEventListener('pointerup', onResizeUp);
            updateChatWindowResizeCursor('');
        }

        chatWindow.addEventListener('pointermove', (event) => {
            if (isResizing) return;
            updateChatWindowResizeCursor(getChatWindowResizeDirection(event));
        });

        chatWindow.addEventListener('pointerleave', () => {
            if (!isResizing) updateChatWindowResizeCursor('');
        });

        chatWindow.addEventListener('pointerdown', (event) => {
            if (event.button !== 0) return;
            const direction = getChatWindowResizeDirection(event);
            if (!direction) return;

            event.preventDefault();
            event.stopPropagation();
            activeResizeDirection = direction;
            isResizing = true;
            startX = event.clientX;
            startY = event.clientY;
            startRect = chatWindow.getBoundingClientRect();
            chatWindow.classList.add('wedaHelper-resizing');
            document.addEventListener('pointermove', onResizeMove);
            document.addEventListener('pointerup', onResizeUp);
            updateChatWindowResizeCursor(direction);
        }, true);
    }

    function makeTopLeftResizable(handleEl, targetEl, { minHeight, maxHeight = Infinity }) {
        handleEl.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const startY = e.clientY;
            const startHeight = targetEl.offsetHeight;

            function onMouseMove(moveEvent) {
                const deltaY = startY - moveEvent.clientY;
                targetEl.style.height = `${Math.min(maxHeight, Math.max(minHeight, startHeight + deltaY))}px`;
            }
            function onMouseUp() {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    makeChatWindowResizableByEdges();
    makeTopLeftResizable(inputResizeHandle, chatInput, { minHeight: 36, maxHeight: 160 });

    // --- Gestion des pièces jointes (documents/images envoyés au modèle) ---
    // Extensions/types traités comme du texte brut (extrait puis injecté dans le message,
    // aucune conversion n'est nécessaire côté modèle).
    const ATTACHMENT_TEXT_EXTENSIONS = ['.txt', '.md', '.csv', '.log', '.json'];

    /** Pièces jointes en attente d'envoi avec le prochain message utilisateur. */
    let pendingAttachments = [];

    /** Nombre maximum de pages converties en images pour un PDF scanné (sans texte lisible), afin d'éviter d'envoyer un nombre excessif d'images au modèle. */
    const MAX_SCANNED_PDF_PAGES_AS_IMAGES = 50;

    /** Nombre minimum de caractères "normaux" (lettres/chiffres) requis pour considérer un texte extrait de PDF comme lisible. */
    const MIN_READABLE_PDF_CHAR_COUNT = 20;
    /** Proportion minimale de caractères "normaux" dans le texte extrait, en dessous de laquelle on considère le texte comme du charabia (police non standard/CID mal mappée, etc.). */
    const MIN_READABLE_PDF_CHAR_RATIO = 0.5;

    /**
     * Détermine si le texte extrait d'un PDF est réellement lisible : certains PDF scannés ou avec
     * un encodage de police non standard renvoient un texte non vide mais illisible (charabia,
     * caractères de contrôle/privés…), qu'il vaut mieux traiter comme si aucun texte n'avait été trouvé.
     * @param {string} text
     * @returns {boolean}
     */
    function isPdfTextReadable(text) {
        if (!text) return false;
        const trimmed = text.trim();
        if (!trimmed) return false;
        // Lettres (avec accents) et chiffres : un texte "normal" en est majoritairement composé.
        const normalChars = trimmed.match(/[a-zA-Z0-9À-ÿ]/g) || [];
        if (normalChars.length < MIN_READABLE_PDF_CHAR_COUNT) return false;
        return (normalChars.length / trimmed.length) >= MIN_READABLE_PDF_CHAR_RATIO;
    }

    /**
     * Convertit les pages d'un PDF (typiquement un document scanné, sans texte extractible) en
     * images PNG encodées en data URL, une par page (dans la limite de MAX_SCANNED_PDF_PAGES_AS_IMAGES).
     * Réutilise pdfjsLib et renderPagesToCanvases (@see pdfParser.js).
     * @param {string} pdfObjectUrl
     * @returns {Promise<string[]>}
     */
    async function renderPdfPagesAsImageDataUrls(pdfObjectUrl) {
        const pdf = await pdfjsLib.getDocument(pdfObjectUrl).promise;
        const pageCount = Math.min(pdf.numPages, MAX_SCANNED_PDF_PAGES_AS_IMAGES);
        const pages = [];
        for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
            pages.push(await pdf.getPage(pageNum));
        }
        const canvases = await renderPagesToCanvases(pages);
        return canvases.map(canvas => canvas.toDataURL('image/png'));
    }

    /**
     * Lit un fichier joint et renvoie la ou les pièces jointes utilisables dans le contenu du
     * message (un fichier peut produire plusieurs pièces jointes, ex: PDF scanné → une image par page) :
     * - image : encodée en data URL (format 'image_url' de l'API, nécessite un modèle vision côté serveur)
     * - PDF avec texte : texte extrait via extractTextFromPDF (@see pdfParser.js)
     * - PDF sans texte lisible (scan) : chaque page est rendue en image et envoyée telle quelle
     * - texte brut (.txt, .md, .csv, .log, .json) : lu tel quel
     * @param {File} file
     * @returns {Promise<Array<{kind: 'image'|'text', name: string, dataUrl?: string, extractedText?: string}>>}
     */
    async function readAttachmentFile(file) {
        const lowerName = file.name.toLowerCase();

        if (file.type.startsWith('image/')) {
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(reader.error || new Error('Lecture du fichier image échouée'));
                reader.readAsDataURL(file);
            });
            return [{ kind: 'image', name: file.name, dataUrl }];
        }

        if (lowerName.endsWith('.pdf') || file.type === 'application/pdf') {
            const objectUrl = URL.createObjectURL(file);
            try {
                const extractedText = await extractTextFromPDF(objectUrl);
                if (isPdfTextReadable(extractedText)) {
                    return [{ kind: 'text', name: file.name, extractedText }];
                }
                // Aucun texte lisible trouvé (PDF scanné/image, ou texte extrait illisible/charabia) : on
                // envoie les pages telles quelles, en images.
                console.warn(`[discussionClient] Texte extrait de "${file.name}" absent ou illisible, envoi des pages sous forme d'images.`);
                const pageImages = await renderPdfPagesAsImageDataUrls(objectUrl);
                return pageImages.map((dataUrl, index) => ({
                    kind: 'image',
                    name: pageImages.length > 1 ? `${file.name} (page ${index + 1}/${pageImages.length})` : file.name,
                    dataUrl
                }));
            } finally {
                URL.revokeObjectURL(objectUrl);
            }
        }

        if (ATTACHMENT_TEXT_EXTENSIONS.some(ext => lowerName.endsWith(ext)) || file.type.startsWith('text/')) {
            const extractedText = await file.text();
            return [{ kind: 'text', name: file.name, extractedText }];
        }

        throw new Error(`Type de fichier non supporté pour "${file.name}" (formats acceptés : PDF, image, texte).`);
    }

    /** Reconstruit l'affichage des puces de pièces jointes en attente d'envoi. */
    function renderAttachmentsPreview() {
        attachmentsPreview.innerHTML = '';
        pendingAttachments.forEach((att, index) => {
            const chip = document.createElement('div');
            chip.classList.add('wedaHelper-attachment-chip');
            const icon = att.kind === 'image' ? '🖼️' : '📄';
            chip.innerHTML = `<span title="${att.name}">${icon} ${att.name}</span>`;
            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.textContent = '×';
            removeButton.title = 'Retirer cette pièce jointe';
            removeButton.addEventListener('click', () => {
                pendingAttachments.splice(index, 1);
                renderAttachmentsPreview();
            });
            chip.appendChild(removeButton);
            attachmentsPreview.appendChild(chip);
        });
        attachmentsPreview.classList.toggle('visible', pendingAttachments.length > 0);
    }

    attachFileButton.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async () => {
        const files = Array.from(fileInput.files || []);
        fileInput.value = ''; // permet de resélectionner le même fichier ensuite
        for (const file of files) {
            try {
                const attachments = await readAttachmentFile(file);
                pendingAttachments.push(...attachments);
            } catch (error) {
                console.warn('[discussionClient] Échec de lecture de la pièce jointe', error);
                const errorBubble = appendMessage('bot', `⚠️ ${error.message}`);
                errorBubble.classList.remove('bot');
                errorBubble.classList.add('tool-call', 'error');
                recordDisplayEntry(errorBubble);
                persistChatHistory();
            }
        }
        renderAttachmentsPreview();
    });

    /**
     * Construit le contenu du message utilisateur à partir du texte saisi et des pièces jointes en
     * attente : renvoie une simple chaîne si aucune image n'est jointe (compatibilité maximale),
     * ou un tableau de parts au format "vision" OpenAI ({type: 'text'|'image_url'}) sinon.
     * @param {string} userText
     * @param {Array} attachments
     * @returns {string|Array}
     */
    function buildUserMessageContent(userText, attachments) {
        let textContent = userText;
        for (const att of attachments) {
            if (att.kind === 'text') {
                textContent += `\n\n--- Fichier joint : ${att.name} ---\n${att.extractedText}\n--- Fin du fichier ${att.name} ---`;
            }
        }

        const images = attachments.filter(att => att.kind === 'image');
        if (images.length === 0) return textContent;

        return [
            { type: 'text', text: textContent },
            ...images.map(att => ({ type: 'image_url', image_url: { url: att.dataUrl } }))
        ];
    }


    /**
     * Fonction utilitaire pour construire le contenu HTML de la popover d'informations sur l'état du chat
     * 
     */
    function buildInfoContent() {
        const systemMessage = chatHistory.find(m => m.role === 'system');
        const functionsList = Object.entries(availableFunctions).map(([name, fn]) => {
            const description = fn.definition?.function?.description || '';
            return `<li><strong>${name}</strong>${description ? ' — ' + description : ''}</li>`;
        }).join('');

        const hasMultipleModels = (aiParams.availableModels?.length || 0) > 1;
        // Si plusieurs ports sont actifs, on précise entre parenthèses le port de chaque modèle (utile pour
        // distinguer d'éventuels modèles de même nom exposés sur des ports différents).
        const showPort = (aiParams.activePorts?.length || 0) > 1;
        const modelOptions = (aiParams.availableModels || [])
            .filter((m, idx, arr) => arr.findIndex(other => other.model === m.model && other.port === m.port) === idx) // dédoublonnage
            .map(m => `<option value="${m.model}" ${m.model === selectedModel ? 'selected' : ''}>${m.model}${showPort ? ` (port ${m.port})` : ''}</option>`)
            .join('');

        return `
            <button id="wedaHelper-disable-connector" type="button">Désactiver l'Assistant Local</button>
            <h4>Modèle utilisé</h4>
            <pre>${getCurrentModel()}</pre>
            ${hasMultipleModels ? `<select id="wedaHelper-model-select">${modelOptions}</select>` : ''}
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
        pendingAttachments = [];
        renderAttachmentsPreview();
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
        if (entry.messageFormat === 'markdown' && typeof entry.markdownSource === 'string' && entry.markdownSource) {
            const markdownRendered = renderMarkdownInBubble(msgDiv, entry.markdownSource);
            if (!markdownRendered) {
                msgDiv.textContent = entry.text;
            }
        } else {
            msgDiv.textContent = entry.text;
        }
        if (entry.title) msgDiv.title = entry.title;
        chatMessages.appendChild(msgDiv);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Le textarea insère un saut de ligne par défaut sur Entrée : on force la soumission,
    // sauf si Shift est maintenu (pour permettre les messages multi-lignes).
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            chatForm.requestSubmit();
        }
    });

    // gestion de l'affichage de la popover d'informations sur l'état du chat
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
        const modelSelect = infoPopover.querySelector('#wedaHelper-model-select');
        if (modelSelect) {
            modelSelect.addEventListener('change', () => {
                selectedModel = modelSelect.value;
                chrome.storage.local.set({ IAassistantModelName: selectedModel }); // enregistre le choix comme modèle préféré
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
     * Rend du markdown en HTML sécurisé dans une bulle bot déjà existante.
     * Le markdown source est conservé dans des data-attributes pour la persistance/relecture.
     * @param {HTMLElement} bubble
     * @param {string} markdownText
     * @returns {boolean}
     */
    function renderMarkdownInBubble(bubble, markdownText) {
        if (!markdownRenderer || !domPurifyApi || typeof markdownText !== 'string') {
            console.warn('[discussionClient] Markdown pipeline indisponible, rendu texte brut conservé', {
                markdownitAvailable: !!markdownRenderer,
                domPurifyAvailable: !!domPurifyApi,
                isStringInput: typeof markdownText === 'string'
            });
            return false;
        }

        try {
            const rawHtml = markdownRenderer.render(markdownText);
            console.info('[discussionClient] Markdown converti en HTML', {
                markdownLength: markdownText.length,
                htmlLength: rawHtml.length,
                containsTable: /<table[\s>]/i.test(rawHtml)
            });
            const sanitizedHtml = domPurifyApi.sanitize(rawHtml, { USE_PROFILES: { html: true } });
            console.info('[discussionClient] HTML sanitise via DOMPurify', {
                htmlBeforeSanitizeLength: rawHtml.length,
                htmlAfterSanitizeLength: sanitizedHtml.length,
                removedCharacters: rawHtml.length - sanitizedHtml.length
            });
            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = sanitizedHtml;

            tempContainer.querySelectorAll('a').forEach(link => {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            });

            bubble.innerHTML = tempContainer.innerHTML;
            bubble.classList.add('markdown-rendered');
            bubble.dataset.messageFormat = 'markdown';
            bubble.dataset.markdownSource = markdownText;
            console.info('[discussionClient] Bulle assistant rendue en markdown sanitise', {
                linksCount: tempContainer.querySelectorAll('a').length,
                tablesCount: tempContainer.querySelectorAll('table').length
            });
            return true;
        } catch (error) {
            console.warn('[discussionClient] Échec du rendu markdown, retour en texte brut.', error);
            return false;
        }
    }

    /**
     * Vérifie la disponibilité de l'API du modèle d'IA local à l'ouverture du chat. Si le
     * serveur n'est pas détecté, affiche un message d'avertissement avec un lien vers le wiki
     * expliquant comment installer une IA locale.
     */
    async function checkAiApiAvailability() {
        const isAvailable = await testAiApiConnection();
        if (isAvailable) return;

        // Si le port était sur "auto", précise les ports testés (utile pour comprendre pourquoi
        // aucun serveur n'a été détecté : ports courants LM Studio/Ollama non concordants, etc.)
        const portInfo = aiParams.autoPortTestedPorts?.length
            ? `les ports testés automatiquement (${aiParams.autoPortTestedPorts.join(', ')})`
            : `le port ${aiParams.port}`;

        const warningBubble = appendMessage('bot', '');
        warningBubble.classList.remove('bot');
        warningBubble.classList.add('tool-call', 'error');
        warningBubble.innerHTML = `⚠️ Aucune IA locale détectée sur ${portInfo}. Consultez le <a href="https://github.com/Refhi/Weda-Helper/wiki/Installation-d'une-IA-sur-votre-poste,-pour-que-Weda%E2%80%90Helper-s'en-saisisse" target="_blank" rel="noopener noreferrer">wiki d'installation d'une IA locale</a> pour configurer l'assistant. Cliquez sur le ? bleu pour le désactiver.`;
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
        if (bubble.dataset.messageFormat === 'markdown') {
            entry.messageFormat = 'markdown';
            entry.markdownSource = bubble.dataset.markdownSource || bubble.textContent || '';
        }
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
        if (bubble.dataset.messageFormat === 'markdown') {
            entry.messageFormat = 'markdown';
            entry.markdownSource = bubble.dataset.markdownSource || bubble.textContent || '';
        } else {
            delete entry.messageFormat;
            delete entry.markdownSource;
        }
    }

    /**
     * Gestion de la soumission du formulaire de chat : envoie le message de l'utilisateur au modèle,
     * affiche la bulle correspondante, puis affiche la réponse de l'IA au fur et à mesure qu'elle est
     * reçue (avec éventuellement des bulles de raisonnement et d'appel de fonction).
     */
    let currentGenerationController = null; // AbortController de la génération en cours, pour le bouton Stop

    chatStopButton.addEventListener('click', () => {
        currentGenerationController?.abort();
    });

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const userText = chatInput.value.trim();
        if (!userText) return;

        // Les pièces jointes en attente (voir readAttachmentFile/buildUserMessageContent) sont
        // consommées ici : le texte affiché à l'utilisateur reste simple, mais le contenu envoyé
        // au modèle inclut le texte extrait des documents et/ou les images en data URL.
        const attachmentsForThisMessage = pendingAttachments;
        pendingAttachments = [];
        renderAttachmentsPreview();

        // Ajoute le message de l'utilisateur à l'affichage et à l'historique, puis enregistre l'état.
        const attachmentsLabel = attachmentsForThisMessage.length
            ? '\n\n' + attachmentsForThisMessage.map(att => `${att.kind === 'image' ? '🖼️' : '📄'} ${att.name}`).join('\n')
            : '';
        appendMessage('user', userText + attachmentsLabel);
        recordDisplayEntry(chatMessages.lastElementChild);
        chatInput.value = ''; // réinitialise le champ de saisie
        chatHistory.push({ role: 'user', content: buildUserMessageContent(userText, attachmentsForThisMessage) }); // met à jour la variable d'historique
        persistChatHistory(); // Enregistre l'état dans le sessionStorage pour le patient courant

        currentGenerationController = new AbortController();
        chatSubmitButton.style.display = 'none';
        chatStopButton.classList.add('visible');

        // Gestion du message d'attente
        const loadingMsg = appendMessage('bot', "L'IA réfléchit...");
        loadingMsg.classList.add('loading');

        let reasoningMsg = null; // créé au premier fragment de raisonnement reçu
        let contentStarted = false;
        let lastFinishReason = null; // dernière raison d'arrêt renvoyée par le serveur ('length', 'stop', 'content_filter'...)
        let contextWarningShown = false; // évite de spammer une bulle à chaque relance de function calling
        const toolCallBubbles = new Map(); // id -> élément DOM du feedback d'appel de fonction
        const toolCallEntries = new Map(); // id -> entrée du journal d'affichage correspondante (pour mise à jour lors du succès/échec)

        let accumulatedContent = ''; // texte markdown brut accumulé, rendu à chaque chunk

        try {
            const botResponse = await openAiClient({
                messages: chatHistory,
                model: getCurrentModel(),
                maxTokens: 8000,   // Limite large : un modèle trop limité n'est de toute façon pas souhaitable
                temperature: 0.3,  // Température assez basse pour des réponses plus cohérentes
                // useTools: true, // activé par défaut dans l'appel de fonction. Mais doit être à terme dépendant des options de l'utilisateur
                stream: true,
                signal: currentGenerationController.signal,
                // Gestion des événements de streaming
                // Ici pour gérer la limite théorique maximale de contexte
                onWarning: ({ type, estimatedTokens, limit, ratio }) => {
                    if (type !== 'context_limit' || contextWarningShown) return;
                    contextWarningShown = true;
                    const warningBubble = appendMessage('bot', `⚠️ Le contexte estimé de la conversation (~${estimatedTokens} tokens) approche ou dépasse la limite configurée (${limit} tokens, ${Math.round(ratio * 100)}%). Les échanges avec les outils peuvent être tronqués par le serveur : pensez à augmenter la taille du contexte dans votre fournisseur de modèle et/ou réinitialiser la conversation si les réponses deviennent incohérentes. Pensez à mettre à jour les options de Weda-Helper si vous changez la limite de contexte côté serveur.`);
                    warningBubble.classList.remove('bot');
                    warningBubble.classList.add('tool-call', 'error');
                    chatMessages.insertBefore(warningBubble, loadingMsg);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                    recordDisplayEntry(warningBubble);
                    persistChatHistory();
                },
                // Gestion des fragments de réponse reçus en streaming
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
                            accumulatedContent = '';
                            loadingMsg.textContent = '';
                            loadingMsg.classList.remove('loading');
                        }
                        accumulatedContent += contentDelta;

                        if (!renderMarkdownInBubble(loadingMsg, accumulatedContent)) {
                            loadingMsg.textContent = accumulatedContent;
                        }
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }
                },
                // Gestion des appels de fonction (start, success, error)
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
                // Réponse finale reçue : on l'affiche et on l'enregistre dans l'historique
                loadingMsg.textContent = botResponse;
                loadingMsg.classList.remove('loading');

                // En streaming, le texte est affiché brut pour éviter les artefacts; on applique
                // le rendu markdown sécurisé une fois la réponse complète reçue.
                renderMarkdownInBubble(loadingMsg, botResponse);

                if (reasoningMsg) {
                    recordDisplayEntry(reasoningMsg);
                    reasoningMsg = null;
                }

                if (lastFinishReason === 'stop') {
                    // Le modèle a terminé normalement sa réponse
                    loadingMsg.title = 'Réponse complète';
                } else if (lastFinishReason === 'length') {
                    // Le modèle a été interrompu avant d'avoir terminé sa réponse (limite de tokens atteinte)
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
            if (error.name === 'AbortError') {
                // Arrêt volontaire via le bouton Stop : on conserve le contenu partiel déjà reçu comme
                // réponse finale de l'assistant, plutôt que d'afficher une erreur.
                loadingMsg.classList.remove('loading');
                if (accumulatedContent.trim()) {
                    if (!renderMarkdownInBubble(loadingMsg, accumulatedContent)) {
                        loadingMsg.textContent = accumulatedContent;
                    }
                    loadingMsg.title = 'Génération interrompue par l’utilisateur';
                    chatHistory.push({ role: 'assistant', content: accumulatedContent });
                } else {
                    loadingMsg.textContent = '⏹️ Génération interrompue.';
                    loadingMsg.classList.add('tool-call');
                    chatHistory.pop();
                }

                if (reasoningMsg) {
                    recordDisplayEntry(reasoningMsg);
                    reasoningMsg = null;
                }

                recordDisplayEntry(loadingMsg);
                persistChatHistory();
                return;
            }

            // Gestion des erreurs lors de l'appel au modèle (ex: serveur inaccessible, timeout, erreur interne du modèle...)
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
        } finally {
            currentGenerationController = null;
            chatStopButton.classList.remove('visible');
            chatSubmitButton.style.display = '';
        }
    });
}


addTweak('*', 'enableIAassistant', function () {
    // On attend que Weda soit prêt avant d'injecter le chat, pour éviter les conflits avec le chargement de la page.
    waitForWeda({ logWait: 'enableIAassistant' }).then(() => {
        addAIChatClient();
    });
});