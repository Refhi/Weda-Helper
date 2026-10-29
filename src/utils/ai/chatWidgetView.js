/**
 * @file chatWidgetView.js
 * @description Structure HTML et styles du widget de chat IA (@see discussionClient.js, qui y
 * branche toute la logique). Aucun comportement ici : uniquement du markup et du CSS.
 */

/** Injecte la feuille de style du widget de chat dans la page. */
function injectChatWidgetStyles() {
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
            background: white;
            color: white;
            border: none;
            border-radius: 50%;
            width: 22px;
            height: 22px;
            min-width: 22px;
            cursor: pointer;
            font-size: 12px;
            line-height: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 8px;
        }
        #wedaHelper-info-chat:hover { background: #dcdcdc; }
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
        #wedaHelper-profile-toggle {
            position: relative;
            width: 44px;
            height: 22px;
            margin-left: 10px;
            border: none;
            border-radius: 11px;
            background: #5a8dee;
            cursor: pointer;
            padding: 0;
            color: white;
            font-size: 11px;
            font-weight: bold;
            transition: background 0.2s;
        }
        #wedaHelper-profile-toggle.second { background: #e0932f; }
        #wedaHelper-profile-toggle .knob {
            position: absolute;
            top: 2px;
            left: 2px;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: white;
            color: #343541;
            line-height: 18px;
            text-align: center;
            transition: transform 0.2s;
        }
        #wedaHelper-profile-toggle.second .knob { transform: translateX(22px); }
        #wedaHelper-header-title { white-space: nowrap; }
        #wedaHelper-header-model {
            margin-left: 8px;
            font-size: 11px;
            font-weight: normal;
            opacity: 0.85;
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        #wedaHelper-header-actions { display: flex; align-items: center; }
        #wedaHelper-external-warning {
            display: none;
            position: relative;
            background: #f5c518;
            color: #333;
            border-radius: 50%;
            width: 22px;
            height: 22px;
            min-width: 22px;
            font-size: 14px;
            font-weight: bold;
            line-height: 22px;
            text-align: center;
            cursor: help;
            margin-right: 8px;
            user-select: none;
        }
        #wedaHelper-external-warning.visible { display: block; }
        #wedaHelper-external-warning .wedaHelper-external-warning-text {
            display: none;
            position: absolute;
            top: 22px;
            right: -60px;
            width: 280px;
            background: #fff8e1;
            color: #333;
            border: 1px solid #f5c518;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            padding: 10px 12px;
            font-size: 12px;
            font-weight: normal;
            line-height: 1.4;
            text-align: left;
            z-index: 10001;
        }
        #wedaHelper-external-warning .wedaHelper-external-warning-text::before { content: ''; position: absolute; top: -10px; left: 0; right: 0; height: 10px; }
        #wedaHelper-external-warning:hover .wedaHelper-external-warning-text { display: block; }
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
        #wedaHelper-model-select, .wedaHelper-model-other {
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
        .wedaHelper-server-section { border-left: 3px solid #ccc; padding-left: 8px; margin: 6px 0; opacity: 0.75; }
        .wedaHelper-server-section.active { border-left-color: #10a37f; opacity: 1; }
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
        #wedaHelper-copy-message-btn,
        #wedaHelper-tool-result-btn {
            display: none;
            position: fixed;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #ffffff;
            border: 1px solid #ccc;
            box-shadow: 0 1px 4px rgba(0,0,0,0.2);
            cursor: pointer;
            font-size: 12px;
            line-height: 1;
            align-items: center;
            justify-content: center;
            padding: 0;
            z-index: 10001;
        }
        #wedaHelper-copy-message-btn:hover,
        #wedaHelper-tool-result-btn:hover { background: #f0f0f0; }
        #wedaHelper-tool-result-popover {
            display: none;
            position: fixed;
            width: 420px;
            max-width: calc(100vw - 16px);
            max-height: 300px;
            overflow: auto;
            box-sizing: border-box;
            padding: 8px 10px;
            background: #ffffff;
            color: #333;
            border: 1px solid #ccc;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.25);
            font: 11px/1.4 monospace;
            white-space: pre-wrap;
            word-break: break-word;
            z-index: 10002;
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
        #wedaHelper-chat-shortcuts {
            position: fixed;
            display: none;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            z-index: 9998;
            pointer-events: none;
        }
        #wedaHelper-chat-shortcuts.open { display: flex; }
        #wedaHelper-chat-shortcuts button {
            pointer-events: auto;
            width: 32px;
            height: 32px;
            min-width: 32px;
            border-radius: 50%;
            background: #10a37f;
            color: white;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            font-size: 13px;
            font-weight: bold;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
        }
        #wedaHelper-chat-shortcuts button:hover { background: #0d8c6d; }
        #wedaHelper-chat-shortcuts button:disabled { cursor: not-allowed; opacity: 0.6; background: #aaa; }
        #wedaHelper-shortcut-tooltip {
            display: none;
            position: fixed;
            max-width: 260px;
            background: #343541;
            color: white;
            padding: 8px 10px;
            border-radius: 8px;
            font-size: 12px;
            line-height: 1.4;
            box-shadow: 0 4px 15px rgba(0,0,0,0.25);
            z-index: 10002;
            cursor: pointer;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Construit (sans l'insérer dans la page) le conteneur du widget de chat.
 * @returns {HTMLDivElement}
 */
function createChatWidgetElement() {
    const widget = document.createElement('div');
    widget.id = 'wedaHelper-chat-widget';
    widget.innerHTML = `
        <div id="wedaHelper-chat-shortcuts"></div>
        <div id="wedaHelper-chat-window">
            <div id="wedaHelper-chat-header">
                <div style="display:flex;align-items:center;"><span id="wedaHelper-header-title">Assistant Local (Beta)</span>
                <button id="wedaHelper-profile-toggle" type="button" role="switch" title="Basculer entre le serveur/modèle 1 et 2"><span class="knob">1</span></button>
                <span id="wedaHelper-header-model"></span></div>
                <div id="wedaHelper-header-actions">
                    <span id="wedaHelper-external-warning">!<span class="wedaHelper-external-warning-text">⚠️ Les données échangées avec l'assistant (dont d'éventuelles données de patients) sont envoyées à un serveur externe. Il relève de votre responsabilité de vous assurer que ce serveur est agréé pour l'hébergement de données de santé (HDS). <a href="${chrome.runtime.getURL('src/ui/markdownViewer.html?file=docs/IA-distante-wiki.md')}" target="_blank" rel="noopener noreferrer">Obligations légales et mise en place (wiki)</a></span></span>
                    <button id="wedaHelper-reset-chat" type="button" title="Réinitialiser la conversation">↺</button>
                    <button id="wedaHelper-info-chat" type="button" title="Paramètres">⚙️</button>
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
        <button id="wedaHelper-copy-message-btn" type="button" title="Copier le message">📋</button>
        <button id="wedaHelper-tool-result-btn" type="button">?</button>
        <div id="wedaHelper-tool-result-popover"></div>
        <div id="wedaHelper-shortcut-tooltip"></div>
    `;
    return widget;
}
