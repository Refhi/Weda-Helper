
// -------------------------------------------------------------------------
// Toute la partie ci-dessous doit être supprimée
// -------------------------------------------------------------------------









/**
 * Exécute une action sur un élément
 * @param {string|Function} action - Action à exécuter ("clic", "mouseover", "enter", ou fonction)
 * @param {HTMLElement} element - Élément cible
 */
function executeQuickAccessAction(action, element) {
    if (!element) {
        console.warn('[QuickAccess] Impossible d\'exécuter l\'action : élément manquant');
        return;
    }

    // Action personnalisée (fonction)
    if (typeof action === 'function') {
        action(element);
        return;
    }

    // Actions standardisées
    switch (action) {
        case 'clic':
            element.click();
            break;

        case 'pseudomouseover':
            // Déclencher l'événement mouseover
            element.dispatchEvent(new MouseEvent('mouseover', {
                bubbles: true,
                cancelable: true,
                view: window
            }));

            // Pour les menus de navigation, repositionner le sous-menu s'il sort du viewport
            const parentLi = element.closest('li');
            if (parentLi) {
                const submenu = parentLi.querySelector('.nav-menu__submenu');
                if (submenu) {
                    // Attendre que le CSS s'applique et que les animations se terminent
                    setTimeout(() => {
                        const submenuRect = submenu.getBoundingClientRect();
                        const parentRect = element.getBoundingClientRect();
                        const isOutside = submenuRect.top < 0 || submenuRect.bottom > window.innerHeight ||
                            submenuRect.left < 0 || submenuRect.right > window.innerWidth;

                        if (isOutside) {
                            console.log('[QuickAccess] Sous-menu hors viewport, repositionnement par rapport à l\'élément parent...');

                            // Calculer la position idéale par rapport à l'élément parent
                            let newLeft = parentRect.right + 5; // À droite du parent avec un petit espacement
                            let newTop = parentRect.top;

                            // Ajuster si ça sort à droite
                            if (newLeft + submenuRect.width > window.innerWidth) {
                                newLeft = parentRect.left - submenuRect.width - 5; // À gauche du parent
                            }

                            // Ajuster si ça sort à gauche
                            if (newLeft < 0) {
                                newLeft = 10; // Marge minimale à gauche
                            }

                            // Ajuster si ça sort en bas
                            if (newTop + submenuRect.height > window.innerHeight) {
                                newTop = window.innerHeight - submenuRect.height - 10;
                            }

                            // Ajuster si ça sort en haut
                            if (newTop < 0) {
                                newTop = 10; // Marge minimale en haut
                            }

                            // Appliquer la position
                            submenu.style.position = 'fixed';
                            submenu.style.left = newLeft + 'px';
                            submenu.style.top = newTop + 'px';
                            submenu.style.zIndex = '10000';

                            console.log(`[QuickAccess] Sous-menu repositionné à left=${newLeft}, top=${newTop}`);
                        }
                    }, 50); // Augmenté de 10ms à 50ms
                }
            }
            break;

        case 'enter':
            element.dispatchEvent(new KeyboardEvent('keypress', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                bubbles: true,
                cancelable: true
            }));
            break;

        default:
            console.warn(`[QuickAccess] Action non reconnue: ${action}`);
            element.click(); // Fallback sur clic
    }
}

/**
 * Gère les touches pressées en mode Quick Access
 * @param {KeyboardEvent} e - Événement clavier
 */
function handleQuickAccessKey(e) {
    if (!quickAccessState.active) return;

    // Ignorer les modificateurs seuls
    if (['Control', 'Alt', 'Shift', 'Meta', 'Escape'].includes(e.key)) return;

    const key = e.key.toLowerCase();
    console.log('[QuickAccess] Touche pressée:', key);

    // Chercher l'élément correspondant par la propriété 'key' (pas la clé d'objet)
    const itemEntry = Object.entries(quickAccessState.currentConfig).find(
        ([id, item]) => item.key === key
    );

    if (!itemEntry) {
        console.log('[QuickAccess] Aucune action pour cette touche');
        return;
    }

    const [itemId, item] = itemEntry;

    e.preventDefault();
    e.stopPropagation();

    // Détecter un double tap
    const now = Date.now();
    const isDoubleTap = (quickAccessState.lastClickedKey === key &&
        (now - quickAccessState.lastClickedTime) < DOUBLE_CLICK_DELAY);

    quickAccessState.lastClickedKey = key;
    quickAccessState.lastClickedTime = now;

    // Trouver l'élément cible
    let targetElement = item.element;
    if (!targetElement && item.selector) {
        const elements = document.querySelectorAll(item.selector);
        targetElement = elements[0];
    }

    if (!targetElement) {
        console.warn('[QuickAccess] Élément cible non trouvé pour:', itemId);
        resetInactivityTimer();
        return;
    }

    // Vérifier s'il y a des conflits de configuration
    checkForDuplicateKeys(quickAccessState.currentConfig);

    // Déterminer le type d'item
    const hasSubItems = item.subItems != null;
    const isTerminal = !hasSubItems // || item.onDoubleTap == null;

    // Cas 1 : Double-tap avec onDoubleTap défini (toujours terminal)
    if (isDoubleTap && item.onDoubleTap) {
        console.log(`[QuickAccess] Double-tap détecté sur ${itemId} - Exécution de onDoubleTap`);
        executeAction(item.onDoubleTap, targetElement);
        recordMetrics({ clicks: 1, drags: 1 });
        deactivateQuickAccess();
        return;
    }

    // Cas 1b : Double-tap détecté mais pas de onDoubleTap configuré - ignorer
    if (isDoubleTap && !item.onDoubleTap) {
        console.log(`[QuickAccess] Double-tap détecté sur ${itemId} mais pas de onDoubleTap - Action ignorée`);
        resetInactivityTimer();
        return;
    }

    // Cas 2 : Item terminal (onTap seul)
    if (isTerminal) {
        console.log(`[QuickAccess] Item terminal ${itemId} - Exécution de onTap`);
        const action = item.onTap || 'clic';
        executeAction(action, targetElement);
        recordMetrics({ clicks: 1, drags: 1 });
        deactivateQuickAccess();
        return;
    }

    // Cas 3 : Item non-terminal (onTap + subItems + optionnel onDoubleTap)
    console.log(`[QuickAccess] Simple tap sur item non-terminal ${itemId}`);

    // Exécuter onTap (ex: mouseover pour ouvrir le menu)
    const action = item.onTap || 'clic';
    executeAction(action, targetElement);

    // Générer ou récupérer les subItems
    let subConfig = null;
    if (typeof item.subItems === 'function') {
        // Génération dynamique - passer la touche du parent pour l'éviter
        const usedKeys = new Set([item.key]);
        subConfig = item.subItems(targetElement, usedKeys);
    } else {
        // SubItems statiques
        subConfig = item.subItems;
    }

    // Afficher les sous-éléments
    if (subConfig && Object.keys(subConfig).length > 0) {
        console.log(`[QuickAccess] ${Object.keys(subConfig).length} sous-éléments trouvés`);

        // Aplatir les subItems si nécessaire
        const flatSubConfig = flattenConfig(subConfig);

        // Remplacer la configuration par : parent + sous-éléments (pour garder le double-tap sur le parent)
        quickAccessState.currentConfig = {
            [itemId]: item,
            ...flatSubConfig
        };

        console.log(`[QuickAccess] Configuration mise à jour avec ${Object.keys(flatSubConfig).length} sous-éléments`);
        console.log(`[QuickAccess] Total d'items actifs: ${Object.keys(quickAccessState.currentConfig).length}`);

        // Attendre que le DOM se mette à jour et que le sous-menu soit repositionné
        setTimeout(() => {
            if (quickAccessState.active) {
                console.log(`[QuickAccess] Affichage différé des tooltips pour ${Object.keys(flatSubConfig).length} sous-éléments`);
                // Afficher les tooltips pour les sous-éléments (remplace les anciens)
                showTooltips(flatSubConfig);

                // Si aucun tooltip n'a été créé, réessayer après un délai supplémentaire
                if (quickAccessState.tooltipElements.length === 0 && Object.keys(flatSubConfig).length > 0) {
                    console.log('[QuickAccess] Aucun tooltip créé, nouvelle tentative dans 200ms...');
                    setTimeout(() => {
                        if (quickAccessState.active) {
                            showTooltips(flatSubConfig);
                        }
                    }, 200);
                }
            }
        }, 150); // Délai de 150ms pour laisser le DOM et le repositionnement se terminer

        resetInactivityTimer();
    } else {
        // Pas de sous-éléments : traiter comme terminal
        console.warn(`[QuickAccess] Aucun sous-élément trouvé pour ${itemId} - Sortie du mode`);
        recordMetrics({ clicks: 1, drags: 1 });
        deactivateQuickAccess();
    }
}

