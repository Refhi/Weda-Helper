/**
 * Déplacement et redimensionnement de fenêtres flottantes positionnées dans le viewport.
 */
// clientWidth/clientHeight excluent la scrollbar, comme le viewport des éléments position: fixed (contrairement à innerWidth/innerHeight).
function getViewportWidth() {
    return document.documentElement.clientWidth;
}
function getViewportHeight() {
    return document.documentElement.clientHeight;
}

function bindFloatingDragHandle(handleEl, {
    getStartRect,
    applyPosition,
    savePosition,
    suppressClickOnDrag = false,
    canStartDrag = () => true
}) {
    let isDragging = false;
    let pointerStartX = 0;
    let pointerStartY = 0;
    let startRight = 0;
    let startBottom = 0;
    let suppressClick = false;
    let pointerId = null;

    function onPointerMove(event) {
        if (event.pointerId !== pointerId) return;
        const deltaX = event.clientX - pointerStartX;
        const deltaY = event.clientY - pointerStartY;
        if (!isDragging && (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4)) {
            isDragging = true;
            if (suppressClickOnDrag) suppressClick = true;
        }
        if (isDragging) applyPosition(startRight - deltaX, startBottom - deltaY);
    }

    function stopTracking() {
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        document.removeEventListener('pointercancel', onPointerUp);
        pointerId = null;
    }

    function onPointerUp(event) {
        if (event.pointerId !== pointerId) return;
        stopTracking();
        if (isDragging) {
            const currentOffset = getStartRect();
            savePosition(applyPosition(currentOffset.right, currentOffset.bottom));
        }
        isDragging = false;
    }

    function onPointerDown(event) {
        if (event.button !== 0 || pointerId !== null || !canStartDrag(event)) return;
        pointerStartX = event.clientX;
        pointerStartY = event.clientY;
        const offset = getStartRect();
        startRight = offset.right;
        startBottom = offset.bottom;
        suppressClick = false;
        pointerId = event.pointerId;
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
        document.addEventListener('pointercancel', onPointerUp);
    }

    function onClick(event) {
        if (!suppressClick) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        suppressClick = false;
    }

    handleEl.addEventListener('pointerdown', onPointerDown);
    if (suppressClickOnDrag) handleEl.addEventListener('click', onClick, true);
    return () => {
        stopTracking();
        handleEl.removeEventListener('pointerdown', onPointerDown);
        if (suppressClickOnDrag) handleEl.removeEventListener('click', onClick, true);
    };
}

function getFloatingPanelResizeDirection(element, event, threshold = 8) {
    const rect = element.getBoundingClientRect();
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

function makeFloatingPanelResizable(element, { minWidth, minHeight, onResizeEnd = () => {} }) {
    const cursors = {
        n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
        ne: 'nesw-resize', sw: 'nesw-resize', nw: 'nwse-resize', se: 'nwse-resize'
    };
    let direction = '';
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let startRect = null;
    let previousBodyUserSelect = '';

    function onResizeMove(event) {
        if (event.pointerId !== pointerId || !startRect) return;
        const deltaX = event.clientX - startX;
        const deltaY = event.clientY - startY;
        const effectiveMinWidth = Math.min(minWidth, getViewportWidth());
        const effectiveMinHeight = Math.min(minHeight, getViewportHeight());
        let left = startRect.left;
        let top = startRect.top;
        let width = startRect.width;
        let height = startRect.height;
        if (direction.includes('e')) width = Math.min(Math.max(effectiveMinWidth, width + deltaX), getViewportWidth() - left);
        if (direction.includes('s')) height = Math.min(Math.max(effectiveMinHeight, height + deltaY), getViewportHeight() - top);
        if (direction.includes('w')) {
            left = Math.max(0, Math.min(startRect.left + deltaX, startRect.right - effectiveMinWidth));
            width = startRect.right - left;
        }
        if (direction.includes('n')) {
            top = Math.max(0, Math.min(startRect.top + deltaY, startRect.bottom - effectiveMinHeight));
            height = startRect.bottom - top;
        }
        left = Math.min(Math.max(0, left), getViewportWidth() - effectiveMinWidth);
        top = Math.min(Math.max(0, top), getViewportHeight() - effectiveMinHeight);
        element.style.left = `${left}px`;
        element.style.top = `${top}px`;
        element.style.right = 'auto';
        element.style.bottom = 'auto';
        element.style.width = `${Math.min(width, getViewportWidth() - left)}px`;
        element.style.height = `${Math.min(height, getViewportHeight() - top)}px`;
    }

    function stopResize() {
        if (pointerId === null) return;
        pointerId = null;
        startRect = null;
        direction = '';
        element.classList.remove('wedaHelper-resizing');
        document.body.style.userSelect = previousBodyUserSelect;
        document.removeEventListener('pointermove', onResizeMove);
        document.removeEventListener('pointerup', onResizeUp);
        document.removeEventListener('pointercancel', onResizeUp);
        element.style.cursor = '';
    }

    function onResizeUp(event) {
        if (event.pointerId !== pointerId) return;
        const finalRect = element.getBoundingClientRect();
        stopResize();
        onResizeEnd(finalRect);
    }

    function onPointerMove(event) {
        if (pointerId === null) element.style.cursor = cursors[getFloatingPanelResizeDirection(element, event)] || '';
    }
    function onPointerLeave() {
        if (pointerId === null) element.style.cursor = '';
    }
    function onPointerDown(event) {
        if (event.button !== 0 || pointerId !== null) return;
        const nextDirection = getFloatingPanelResizeDirection(element, event);
        if (!nextDirection) return;
        event.preventDefault();
        event.stopPropagation();
        direction = nextDirection;
        pointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;
        startRect = element.getBoundingClientRect();
        element.classList.add('wedaHelper-resizing');
        previousBodyUserSelect = document.body.style.userSelect;
        document.body.style.userSelect = 'none';
        document.addEventListener('pointermove', onResizeMove);
        document.addEventListener('pointerup', onResizeUp);
        document.addEventListener('pointercancel', onResizeUp);
        element.style.cursor = cursors[direction];
    }

    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerleave', onPointerLeave);
    element.addEventListener('pointerdown', onPointerDown, true);
    return () => {
        stopResize();
        element.removeEventListener('pointermove', onPointerMove);
        element.removeEventListener('pointerleave', onPointerLeave);
        element.removeEventListener('pointerdown', onPointerDown, true);
    };
}

/**
 * Convertit un rect DOM en distances depuis le bas/droite du viewport.
 * @returns {{right: number, bottom: number}}
 */
function rectToBottomRightOffset(rect) {
    return {
        right: Math.round(getViewportWidth() - rect.right),
        bottom: Math.round(getViewportHeight() - rect.bottom)
    };
}

/**
 * Gère une fenêtre flottante ancrée en bas/droite : déplacement, redimensionnement optionnel et
 * recalage au redimensionnement du viewport. La position est en distance depuis bas/droite pour
 * ne pas "sauter" quand la taille de l'écran change.
 * @param {HTMLElement} element
 * @param {object} options
 * @param {HTMLElement|null} [options.dragHandle] - Élément qui déclenche le déplacement.
 * @param {boolean} [options.resizable=false] - Active le redimensionnement par les bords.
 * @param {number} [options.minWidth=0]
 * @param {number} [options.minHeight=0]
 * @param {{width:number,height:number}} [options.fallbackSize] - Taille utilisée pour clamper si l'élément est masqué.
 * @param {(event: PointerEvent) => boolean} [options.canStartDrag]
 * @param {boolean} [options.suppressClickOnDrag=false]
 * @param {(geometry: {right:number,bottom:number,width:number,height:number}) => void} [options.onChange] - Appelé après un déplacement, un redimensionnement ou un recalage.
 * @returns {{applyGeometry: Function, getGeometry: Function, destroy: Function}}
 */
function attachFloatingPanel(element, {
    dragHandle = null,
    resizable = false,
    minWidth = 0,
    minHeight = 0,
    fallbackSize = { width: 0, height: 0 },
    canStartDrag = () => true,
    suppressClickOnDrag = false,
    onChange = () => {}
} = {}) {
    const getGeometry = () => {
        const rect = element.getBoundingClientRect();
        return {
            ...rectToBottomRightOffset(rect),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
        };
    };

    const setPosition = (right, bottom) => {
        const rect = element.getBoundingClientRect();
        const width = rect.width || element.offsetWidth || fallbackSize.width;
        const height = rect.height || element.offsetHeight || fallbackSize.height;
        const clamped = {
            right: Math.min(Math.max(0, right), Math.max(0, getViewportWidth() - width)),
            bottom: Math.min(Math.max(0, bottom), Math.max(0, getViewportHeight() - height))
        };
        element.style.left = 'auto';
        element.style.top = 'auto';
        element.style.right = `${clamped.right}px`;
        element.style.bottom = `${clamped.bottom}px`;
        return clamped;
    };

    const applyGeometry = (geometry) => {
        if (resizable && geometry.width && geometry.height) {
            element.style.width = `${Math.min(getViewportWidth(), Math.max(minWidth, geometry.width))}px`;
            element.style.height = `${Math.min(getViewportHeight(), Math.max(minHeight, geometry.height))}px`;
        }
        setPosition(geometry.right, geometry.bottom);
        return getGeometry();
    };

    const dragCleanup = dragHandle ? bindFloatingDragHandle(dragHandle, {
        getStartRect: getGeometry,
        applyPosition: setPosition,
        savePosition: () => onChange(getGeometry()),
        suppressClickOnDrag,
        canStartDrag: event => (!resizable || !getFloatingPanelResizeDirection(element, event)) && canStartDrag(event)
    }) : () => {};

    const resizeCleanup = resizable ? makeFloatingPanelResizable(element, {
        minWidth,
        minHeight,
        onResizeEnd: () => {
            const geometry = applyGeometry(getGeometry());
            onChange(geometry);
        }
    }) : () => {};

    const onViewportResize = () => {
        if (!element.style.right || !element.style.bottom || !element.getClientRects().length) return;
        const geometry = applyGeometry(getGeometry());
        onChange(geometry);
    };
    window.addEventListener('resize', onViewportResize);

    return {
        applyGeometry,
        getGeometry,
        destroy: () => {
            dragCleanup();
            resizeCleanup();
            window.removeEventListener('resize', onViewportResize);
        }
    };
}
