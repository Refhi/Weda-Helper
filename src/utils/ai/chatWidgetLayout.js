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
 * Convertit un rect DOM en distances depuis le bas/droite du viewport.
 * @returns {{right: number, bottom: number}}
 */
function rectToBottomRightOffset(rect) {
    return {
        right: Math.round(window.innerWidth - rect.right),
        bottom: Math.round(window.innerHeight - rect.bottom)
    };
}

/**
 * Active le déplacement de la bulle et de la fenêtre de chat, le redimensionnement de la fenêtre
 * par ses bords et celui du champ de saisie, en restaurant la géométrie sauvegardée.
 */
function setupChatWidgetLayout({ widget, chatWindow, chatHeader, chatToggle, chatInput, inputResizeHandle }) {
    // Le positionnement (persistance, clamp, drag) se fait en distance depuis le bas/droite du
    // viewport plutôt qu'en left/top : ça évite que le widget "saute" quand la taille de l'écran
    // change régulièrement (l'ancrage visuel par défaut du widget est déjà bas/droite en CSS).
    function clampWidgetPosition(right, bottom) {
        const maxRight = Math.max(0, window.innerWidth - widget.offsetWidth);
        const maxBottom = Math.max(0, window.innerHeight - widget.offsetHeight);
        return {
            right: Math.min(Math.max(0, right), maxRight),
            bottom: Math.min(Math.max(0, bottom), maxBottom)
        };
    }

    function clampChatWindowPosition(right, bottom) {
        const windowRect = chatWindow.getBoundingClientRect();
        const windowWidth = windowRect.width || chatWindow.offsetWidth || 380;
        const windowHeight = windowRect.height || chatWindow.offsetHeight || 500;
        const maxRight = Math.max(0, window.innerWidth - windowWidth);
        const maxBottom = Math.max(0, window.innerHeight - windowHeight);
        return {
            right: Math.min(Math.max(0, right), maxRight),
            bottom: Math.min(Math.max(0, bottom), maxBottom)
        };
    }

    function applyWidgetPosition(right, bottom) {
        const clamped = clampWidgetPosition(right, bottom);
        widget.style.right = `${clamped.right}px`;
        widget.style.bottom = `${clamped.bottom}px`;
        widget.style.left = 'auto';
        widget.style.top = 'auto';
        return clamped;
    }

    function applyChatWindowPosition(right, bottom, { clamp = true } = {}) {
        const nextPosition = clamp ? clampChatWindowPosition(right, bottom) : { right, bottom };
        chatWindow.style.right = `${nextPosition.right}px`;
        chatWindow.style.bottom = `${nextPosition.bottom}px`;
        chatWindow.style.left = 'auto';
        chatWindow.style.top = 'auto';
        return nextPosition;
    }

    /**
     * Applique une taille à la fenêtre de chat, en la contraignant aux bornes min/écran.
     * @param {number} width
     * @param {number} height
     * @returns {{width: number, height: number}}
     */
    function applyChatWindowSize(width, height) {
        const clampedWidth = Math.min(Math.max(CHAT_WINDOW_MIN_WIDTH, width), window.innerWidth);
        const clampedHeight = Math.min(Math.max(CHAT_WINDOW_MIN_HEIGHT, height), window.innerHeight);
        chatWindow.style.width = `${clampedWidth}px`;
        chatWindow.style.height = `${clampedHeight}px`;
        return { width: clampedWidth, height: clampedHeight };
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
        let widgetStartRight = 0;
        let widgetStartBottom = 0;
        let suppressClick = false;

        function onPointerMove(event) {
            const deltaX = event.clientX - pointerStartX;
            const deltaY = event.clientY - pointerStartY;

            if (!isDragging && (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4)) {
                isDragging = true;
                if (suppressClickOnDrag) suppressClick = true;
            }
            if (!isDragging) return;

            // Déplacer le pointeur vers la droite/le bas réduit la distance au bord droit/bas.
            applyPosition(widgetStartRight - deltaX, widgetStartBottom - deltaY);
        }

        function onPointerUp() {
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);

            if (isDragging) {
                const currentOffset = getStartRect();
                const applied = applyPosition(currentOffset.right, currentOffset.bottom);
                savePosition(applied);
            }
            isDragging = false;
        }

        handleEl.addEventListener('pointerdown', (event) => {
            if (event.button !== 0 || !canStartDrag(event)) return;
            pointerStartX = event.clientX;
            pointerStartY = event.clientY;
            const offset = getStartRect();
            widgetStartRight = offset.right;
            widgetStartBottom = offset.bottom;
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

    async function initializeDraggableChatWidget() {
        const { widgetPosition: savedPosition } = await loadDiscussionClientData();
        if (savedPosition) {
            const applied = applyWidgetPosition(savedPosition.right, savedPosition.bottom);
            saveDiscussionClientData({ widgetPosition: applied });
        }

        bindDragHandle(chatToggle, {
            getStartRect: () => rectToBottomRightOffset(widget.getBoundingClientRect()),
            applyPosition: (right, bottom) => applyWidgetPosition(right, bottom),
            savePosition: (position) => saveDiscussionClientData({ widgetPosition: position }),
            suppressClickOnDrag: true
        });

        // L'ancrage bas/droite (CSS) suit déjà les changements de taille d'écran automatiquement ;
        // on ne fait que reclamper/persister au cas où le widget déborderait après un rétrécissement.
        window.addEventListener('resize', () => {
            if (widget.style.right && widget.style.bottom) {
                const currentRight = parseFloat(widget.style.right) || 0;
                const currentBottom = parseFloat(widget.style.bottom) || 0;
                const clamped = applyWidgetPosition(currentRight, currentBottom);
                saveDiscussionClientData({ widgetPosition: clamped });
            }
        });
    }

    async function initializeDraggableChatWindow() {
        const { windowPosition: savedPosition, windowSize: savedSize } = await loadDiscussionClientData();
        if (savedSize) {
            applyChatWindowSize(savedSize.width, savedSize.height);
        }
        if (savedPosition) {
            applyChatWindowPosition(savedPosition.right, savedPosition.bottom, { clamp: false });
        }

        bindDragHandle(chatHeader, {
            getStartRect: () => rectToBottomRightOffset(chatWindow.getBoundingClientRect()),
            applyPosition: (right, bottom) => applyChatWindowPosition(right, bottom),
            savePosition: (position) => saveDiscussionClientData({ windowPosition: position }),
            canStartDrag: (event) => !event.target.closest('button') && !getChatWindowResizeDirection(event)
        });

        window.addEventListener('resize', () => {
            if (chatWindow.style.right && chatWindow.style.bottom) {
                const currentRight = parseFloat(chatWindow.style.right) || 0;
                const currentBottom = parseFloat(chatWindow.style.bottom) || 0;
                const clamped = applyChatWindowPosition(currentRight, currentBottom);
                saveDiscussionClientData({ windowPosition: clamped });
            }
        });
    }

    initializeDraggableChatWidget();
    initializeDraggableChatWindow();

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
        const minWidth = CHAT_WINDOW_MIN_WIDTH;
        const minHeight = CHAT_WINDOW_MIN_HEIGHT;
        let activeResizeDirection = '';
        let isResizing = false;
        let startX = 0;
        let startY = 0;
        let startRect = null;
        let previousBodyUserSelect = '';

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

            // Clamp left/top ici en coordonnées écran classiques (calcul transitoire du resize) ;
            // la position persistée bas/droite n'est recalculée qu'au relâchement (onResizeUp).
            const clampedLeft = Math.min(Math.max(0, nextLeft), window.innerWidth - minWidth);
            const clampedTop = Math.min(Math.max(0, nextTop), window.innerHeight - minHeight);
            chatWindow.style.left = `${clampedLeft}px`;
            chatWindow.style.top = `${clampedTop}px`;
            chatWindow.style.right = 'auto';
            chatWindow.style.bottom = 'auto';
            chatWindow.style.width = `${Math.min(nextWidth, window.innerWidth - clampedLeft)}px`;
            chatWindow.style.height = `${Math.min(nextHeight, window.innerHeight - clampedTop)}px`;
        }

        function onResizeUp() {
            if (isResizing) {
                const finalRect = chatWindow.getBoundingClientRect();
                const offset = rectToBottomRightOffset(finalRect);
                const clampedPosition = applyChatWindowPosition(offset.right, offset.bottom, { clamp: false });
                saveDiscussionClientData({
                    windowPosition: clampedPosition,
                    windowSize: { width: finalRect.width, height: finalRect.height }
                });
            }
            isResizing = false;
            activeResizeDirection = '';
            startRect = null;
            chatWindow.classList.remove('wedaHelper-resizing');
            document.body.style.userSelect = previousBodyUserSelect;
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
            previousBodyUserSelect = document.body.style.userSelect;
            document.body.style.userSelect = 'none';
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
}
