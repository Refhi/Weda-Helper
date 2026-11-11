/**
 * @file chatWidgetLayout.js
 * @description Position, déplacement et redimensionnement du widget de chat IA (bulle flottante
 * et fenêtre), avec persistance de la géométrie (@see discussionClient.js).
 */
/** Clé unique regroupant position du widget, position et taille de la fenêtre de chat (@see loadDiscussionClientData / saveDiscussionClientData). */
const DISCUSSION_CLIENT_DATA_STORAGE_KEY = 'discussionClientData';
/** Dimensions minimales autorisées pour la fenêtre de chat (drag/resize par les bords). */
const CHAT_WINDOW_MIN_WIDTH = 260;
const CHAT_WINDOW_MIN_HEIGHT = 200;

// Petit pont KISS exposant quelques actions du chat (envoyer un prompt "comme si l'utilisateur
// l'avait tapé", changer de patient...) aux autres scripts du content script (ex: pdfParserAIExtraction.js),
// sans qu'ils aient à connaître le DOM du widget. Résolu une fois par page, à la fin de addAIChatClient().

/**
 * Charge l'objet unique regroupant la position du widget (bulle flottante), ainsi que la
 * position et la taille de la fenêtre de chat. Les positions sont stockées en distance depuis
 * le bas/droite de l'écran (cohérent quand l'écran change de taille).
 * @returns {Promise<{widgetPosition: {right:number,bottom:number}|null, windowPosition: {right:number,bottom:number}|null, windowSize: {width:number,height:number}|null}>}
 */
async function loadDiscussionClientData() {
    const stored = await getOptionPromise(DISCUSSION_CLIENT_DATA_STORAGE_KEY);
    return {
        widgetPosition: null,
        windowPosition: null,
        windowSize: null,
        ...stored
    };
}

/**
 * Fusionne les champs fournis avec les données déjà persistées, puis sauvegarde le tout sous
 * une seule clé de stockage.
 * @param {object} partialData - Un sous-ensemble de {widgetPosition, windowPosition, windowSize}.
 * @returns {Promise<object>} L'objet complet une fois fusionné et persisté.
 */
async function saveDiscussionClientData(partialData) {
    const current = await loadDiscussionClientData();
    const merged = { ...current, ...partialData };
    await setStorageOption({ [DISCUSSION_CLIENT_DATA_STORAGE_KEY]: merged });
    return merged;
}

/**
 * Active le déplacement de la bulle et de la fenêtre de chat, le redimensionnement de la fenêtre
 * par ses bords et celui du champ de saisie, en restaurant la géométrie sauvegardée.
 */
function setupChatWidgetLayout({ widget, chatWindow, chatHeader, chatToggle, chatInput, inputResizeHandle, initialData }) {
    const widgetLayout = attachFloatingPanel(widget, {
        dragHandle: chatToggle,
        suppressClickOnDrag: true,
        onChange: ({ right, bottom }) => saveDiscussionClientData({ widgetPosition: { right, bottom } })
    });

    const chatWindowLayout = attachFloatingPanel(chatWindow, {
        dragHandle: chatHeader,
        resizable: true,
        minWidth: CHAT_WINDOW_MIN_WIDTH,
        minHeight: CHAT_WINDOW_MIN_HEIGHT,
        fallbackSize: { width: 380, height: 500 },
        canStartDrag: event => !event.target.closest('button'),
        onChange: ({ right, bottom, width, height }) => saveDiscussionClientData({
            windowPosition: { right, bottom },
            windowSize: { width, height }
        })
    });

    // Appliqué de façon synchrone (données préchargées) : le widget n'est jamais peint à la position par défaut.
    const { widgetPosition, windowPosition, windowSize } = initialData;
    if (widgetPosition) {
        const applied = widgetLayout.applyGeometry(widgetPosition);
        saveDiscussionClientData({ widgetPosition: { right: applied.right, bottom: applied.bottom } });
    }
    if (windowPosition || windowSize) {
        chatWindowLayout.applyGeometry({ ...chatWindowLayout.getGeometry(), ...windowSize, ...windowPosition });
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

    makeTopLeftResizable(inputResizeHandle, chatInput, { minHeight: 36, maxHeight: 160 });
}
