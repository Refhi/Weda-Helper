/**
 * @file quickAccess.js
 * @description Système de navigation rapide par raccourcis clavier avec affichage d'infobulles.
 * Permet d'activer un mode "Quick Access" où tous les éléments configurés affichent
 * une lettre de raccourci pour y accéder rapidement.
 * 
 * @exports initQuickAccess - Initialise le système de quick access
 * @exports activateQuickAccess - Active le mode quick access
 * @exports deactivateQuickAccess - Désactive le mode quick access
 * 
 * @requires metrics.js (recordMetrics)
 */

/**
 * Configuration du Quick Access
 * Structure hiérarchique : chaque élément peut avoir des subItems
 * 
 * @typedef {Object} QuickAccessItem
 * @property {string} selector - Sélecteur CSS de l'élément
 * @property {string} key - Touche de raccourci (une seule lettre/chiffre)
 * @property {string} [description] - Description optionnelle pour le tooltip
 * @property {string|Function} [onTap="clic"] - Action à exécuter au tap ("clic", "mouseover", "enter", ou fonction). Si seul, l'item est terminal
 * @property {string|Function} [onDoubleTap] - Action à exécuter au double-tap (toujours terminal). Implique la présence de subItems
 * @property {Object.<string, QuickAccessItem>|Function} [subItems=null] - Sous-éléments (objet ou fonction qui les génère)
 * @property {HTMLElement} [element] - Référence à l'élément DOM (pour items générés dynamiquement)
 * 
 * Logique :
 * - onTap seul = item terminal (exécute onTap et sort)
 * - onTap + onDoubleTap + subItems = item non-terminal (tap = onTap + affiche subItems, double-tap = onDoubleTap + sort)
 */

/**
 * Configuration par défaut des éléments Quick Access
 * À personnaliser selon vos besoins
 * 
 * Note : Les clés d'objet sont descriptives et servent au débogage.
 * Les vraies touches de raccourci sont définies dans la propriété 'key'.
 */
const quickAccessConfig = {
    // Menu W - Navigation principale
    'menu_navigation': {
        selector: '.level1.static',
        key: 'w',
        description: 'Menu Navigation (W)',
        onTap: 'mouseover',
        onDoubleTap: 'clic',
        subItems: null // TODO
    },
    
    // Carte Vitale
    'carte_vitale': {
        selector: '.cv',
        key: 'c',
        description: 'Carte Vitale',
        onTap: 'clic'
    },
    
    // Recherche patient
    'recherche_patient': {
        selector: 'a[href*="FindPatientForm.aspx"]',
        key: 'r',
        description: 'Recherche patient',
        onTap: function() {
            openSearch();
        }
    },
    
    // Antécédents
    'antecedents': {
        selector: '#ContentPlaceHolder1_EvenementUcForm1_ImageButtonShowAntecedent',
        key: 'a',
        description: 'Antécédents',
        onTap: 'clic'
    },
    
    // Scanner
    'scanner': {
        selector: 'a.level2.dynamic[href^="javascript:void(window.weda.actions.startScan"]',
        key: 's',
        description: 'Scanner document',
        onTap: function(element) {
            clicCSPLockedElement('a.level2.dynamic[href^="javascript:void(window.weda.actions.startScan"]');
        }
    },
    
    // Upload
    'upload': {
        selector: 'a[href*="PopUpUploader.aspx"]',
        key: 'u',
        description: 'Upload document',
        onTap: 'clic'
    },
    
    // === Menu horizontal - Organisation hiérarchique ===
    'menu_horizontal': {
        // Ce groupe n'est pas un item actif, juste pour l'organisation
        
        'medical': {
            selector: '#nav-menu > li > a.nav-icon__link--doctor',
            key: 'm',
            description: 'Médical',
            onTap: 'mouseover',
            onDoubleTap: 'clic',
            subItems: function(element) {
                const submenu = element.parentElement.querySelector('.nav-menu__submenu--level1');
                return submenu ? generateNavSubItems(submenu, 'medical') : {};
            }
        },
        
        'applicatifs': {
            selector: '#nav-menu > li > a.nav-icon__link--tools',
            key: 'p',
            description: 'Applicatifs',
            onTap: 'mouseover',
            onDoubleTap: 'clic',
            subItems: function(element) {
                const submenu = element.parentElement.querySelector('.nav-menu__submenu--level1');
                return submenu ? generateNavSubItems(submenu, 'applicatifs') : {};
            }
        },
        
        'gestion': {
            selector: '#nav-menu > li > a.nav-icon__link--safe-open',
            key: 'g',
            description: 'Gestion',
            onTap: 'mouseover',
            onDoubleTap: 'clic',
            subItems: function(element) {
                const submenu = element.parentElement.querySelector('.nav-menu__submenu--level1');
                return submenu ? generateNavSubItems(submenu, 'gestion') : {};
            }
        },
        
        'parametres': {
            selector: '#nav-menu > li > a.nav-icon__link--mixing-desk',
            key: 'e',
            description: 'Paramètres',
            onTap: 'mouseover',
            onDoubleTap: 'clic',
            subItems: function(element) {
                const submenu = element.parentElement.querySelector('.nav-menu__submenu--level1');
                return submenu ? generateNavSubItems(submenu, 'parametres') : {};
            }
        }
    }
    
    // Vous pouvez ajouter d'autres éléments ici...
};


/** Fonctions support pour les items le configuration
 * 
 */


/**
 * Génère récursivement les sous-items d'un menu de navigation
 * @param {HTMLElement} submenuElement - Élément ul.nav-menu__submenu
 * @param {string} parentId - ID du parent pour générer les clés
 * @returns {Object} Configuration des sous-items
 */
function generateNavSubItems(submenuElement, parentId) {
    const subItems = {};
    
    // Récupérer tous les liens directs de ce niveau
    const menuItems = submenuElement.querySelectorAll(':scope > li > a');
    
    let keyIndex = 1;
    menuItems.forEach(link => {
        const text = link.textContent.trim();
        const parentLi = link.parentElement;
        
        // Chercher un sous-menu de niveau suivant
        const hasArrow = link.classList.contains('nav-icon__link--arrow-right');
        const nextLevelSubmenu = parentLi.querySelector('.nav-menu__submenu--level2');
        
        // Générer une clé numérique ou alphabétique
        const key = keyIndex <= 9 ? keyIndex.toString() : String.fromCharCode(96 + keyIndex); // a, b, c...
        const itemId = `${parentId}_item_${keyIndex}`;
        
        const item = {
            selector: null,
            element: link,
            key: key,
            description: text.substring(0, 60) + (text.length > 60 ? '...' : ''),
            onTap: hasArrow ? 'mouseover' : 'clic'
        };
        
        // Si a un sous-menu, le générer dynamiquement
        if (nextLevelSubmenu) {
            item.onDoubleTap = 'clic';
            item.subItems = function(el) {
                return generateNavSubItems(nextLevelSubmenu, itemId);
            };
        }
        
        subItems[itemId] = item;
        keyIndex++;
    });
    
    return subItems;
}




/**
 * Aplatit une configuration hiérarchique en extrayant tous les items actifs
 * Un item est considéré comme actif s'il a une propriété 'key'
 * @param {Object} config - Configuration potentiellement hiérarchique
 * @param {string} prefix - Préfixe pour les clés (utilisé en récursion)
 * @returns {Object} Configuration aplatie avec uniquement les items actifs
 */
function flattenConfig(config, prefix = '') {
    const flattened = {};
    
    for (const [id, item] of Object.entries(config)) {
        // Si l'item a une propriété 'key', c'est un item actif
        if (item.key !== undefined) {
            const flatId = prefix ? `${prefix}_${id}` : id;
            flattened[flatId] = item;
        } else {
            // Sinon, c'est un groupe organisationnel, on l'aplatit récursivement
            const subFlattened = flattenConfig(item, prefix ? `${prefix}_${id}` : id);
            Object.assign(flattened, subFlattened);
        }
    }
    
    return flattened;
}


// État du système Quick Access
let quickAccessState = {
    active: false,
    currentLevel: null,
    currentConfig: quickAccessConfig,
    overlayElement: null,
    tooltipElements: [],
    inactivityTimer: null,
    lastClickedKey: null,
    lastClickedTime: 0,
    // Références aux listeners pour pouvoir les supprimer
    keydownListener: null,
    escapeListener: null
};

const INACTIVITY_TIMEOUT = 3000; // 3 secondes
const DOUBLE_CLICK_DELAY = 500; // 500ms pour détecter un double appui

/**
 * Initialise le système de Quick Access
 * Ajoute les event listeners nécessaires
 * Appelée automatiquement par activateQuickAccess()
 */
function initQuickAccess() {
    if (quickAccessState.keydownListener) {
        console.log('[QuickAccess] Listeners déjà actifs');
        return;
    }
    
    console.log('[QuickAccess] Ajout des event listeners');
    
    // Créer et stocker le listener keydown
    quickAccessState.keydownListener = handleQuickAccessKey;
    document.addEventListener('keydown', quickAccessState.keydownListener);
    
    // Créer et stocker le listener escape
    quickAccessState.escapeListener = (e) => {
        if (e.key === 'Escape' && quickAccessState.active) {
            deactivateQuickAccess();
        }
    };
    document.addEventListener('keyup', quickAccessState.escapeListener);
}

/**
 * Active le mode Quick Access
 * Affiche l'overlay et les tooltips sur les éléments configurés
 */
function activateQuickAccess() {
    // Initialiser le système si nécessaire
    initQuickAccess();
    
    if (quickAccessState.active) {
        console.log('[QuickAccess] Déjà actif');
        return;
    }
    
    console.log('[QuickAccess] Activation du mode');
    quickAccessState.active = true;
    quickAccessState.currentLevel = null;
    
    // Aplatir la configuration pour extraire les items actifs
    const flatConfig = flattenConfig(quickAccessConfig);
    quickAccessState.currentConfig = flatConfig;
    
    // Créer l'overlay
    createOverlay();
    
    // Afficher les tooltips pour le niveau racine
    showTooltips(flatConfig);
    
    // Démarrer le timer d'inactivité
    resetInactivityTimer();
    
    recordMetrics({ drags: 1 });
}

/**
 * Désactive le mode Quick Access
 * Supprime l'overlay et tous les tooltips
 */
function deactivateQuickAccess() {
    if (!quickAccessState.active) {
        return;
    }
    
    console.log('[QuickAccess] Désactivation du mode');
    quickAccessState.active = false;
    quickAccessState.currentLevel = null;
    quickAccessState.currentConfig = {};
    quickAccessState.lastClickedKey = null;
    
    // Supprimer l'overlay
    removeOverlay();
    
    // Supprimer tous les tooltips
    removeAllTooltips();
    
    // Nettoyer les styles ajoutés aux sous-menus
    document.querySelectorAll('.nav-menu__submenu[style*="position"]').forEach(submenu => {
        submenu.style.position = '';
        submenu.style.left = '';
        submenu.style.top = '';
        submenu.style.zIndex = '';
    });
    
    // Supprimer les event listeners
    if (quickAccessState.keydownListener) {
        document.removeEventListener('keydown', quickAccessState.keydownListener);
        quickAccessState.keydownListener = null;
    }
    if (quickAccessState.escapeListener) {
        document.removeEventListener('keyup', quickAccessState.escapeListener);
        quickAccessState.escapeListener = null;
    }
    
    // Annuler le timer d'inactivité
    if (quickAccessState.inactivityTimer) {
        clearTimeout(quickAccessState.inactivityTimer);
        quickAccessState.inactivityTimer = null;
    }
}

/**
 * Crée et affiche l'overlay semi-transparent
 */
function createOverlay() {
    // Supprimer l'overlay existant si présent
    removeOverlay();
    
    const overlay = document.createElement('div');
    overlay.id = 'wh-quickaccess-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.3);
        z-index: 99998;
        pointer-events: none;
    `;
    
    // Message d'information
    const message = document.createElement('div');
    message.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 15px 30px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: bold;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        z-index: 99999;
        pointer-events: none;
        font-family: Arial, sans-serif;
    `;
    message.textContent = '🎯 Mode Quick Access actif - Appuyez sur Échap pour quitter';
    
    overlay.appendChild(message);
    document.body.appendChild(overlay);
    quickAccessState.overlayElement = overlay;
}

/**
 * Supprime l'overlay
 */
function removeOverlay() {
    if (quickAccessState.overlayElement) {
        quickAccessState.overlayElement.remove();
        quickAccessState.overlayElement = null;
    }
}

/**
 * Affiche les tooltips pour une configuration donnée
 * @param {Object} config - Configuration des éléments à afficher
 */
function showTooltips(config) {
    // Supprimer les tooltips existants
    removeAllTooltips();
    
    console.log('[QuickAccess] Affichage des tooltips', config);
    
    for (const [key, item] of Object.entries(config)) {
        // Si l'élément a déjà été trouvé (cas dynamique)
        if (item.element) {
            createTooltip(item.element, item.key, item.description || '');
            continue;
        }
        
        // Sinon, chercher l'élément par sélecteur
        if (!item.selector) continue;
        
        const elements = document.querySelectorAll(item.selector);
        if (elements.length > 0) {
            // Prendre le premier élément trouvé (ou tous si nécessaire)
            const element = elements[0];
            createTooltip(element, item.key, item.description || '');
        } else {
            console.warn(`[QuickAccess] Élément non trouvé pour le sélecteur: ${item.selector}`);
        }
    }
}

/**
 * Crée et affiche un tooltip sur un élément
 * @param {HTMLElement} element - Élément sur lequel afficher le tooltip
 * @param {string} key - Touche de raccourci
 * @param {string} description - Description
 */
function createTooltip(element, key, description) {
    if (!element) return;
    
    // S'assurer que l'élément est visible
    if (element.offsetParent === null) {
        console.log(`[QuickAccess] Élément non visible, tooltip ignoré pour la clé ${key}`);
        return;
    }
    
    const tooltip = document.createElement('div');
    tooltip.className = 'wh-quickaccess-tooltip';
    tooltip.style.cssText = `
        position: absolute;
        background-color: rgba(255, 200, 0, 0.95);
        color: black;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 13px;
        font-weight: bold;
        font-family: monospace;
        z-index: 99999;
        pointer-events: none;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        border: 2px solid #ff8800;
        white-space: nowrap;
    `;
    
    // Contenu : touche + description si présente
    if (description) {
        tooltip.innerHTML = `<span style="font-size: 16px;">${key.toUpperCase()}</span> <span style="font-size: 11px; opacity: 0.8;">- ${description}</span>`;
    } else {
        tooltip.textContent = key.toUpperCase();
    }
    
    document.body.appendChild(tooltip);
    
    // Positionner le tooltip en bas à gauche de l'élément
    const rect = element.getBoundingClientRect();
    tooltip.style.left = `${rect.left + window.scrollX}px`;
    tooltip.style.top = `${rect.bottom + window.scrollY + 2}px`;
    
    // Si le tooltip sort de l'écran en bas, le placer au-dessus
    const tooltipRect = tooltip.getBoundingClientRect();
    if (tooltipRect.bottom > window.innerHeight) {
        tooltip.style.top = `${rect.top + window.scrollY - tooltipRect.height - 2}px`;
    }
    
    quickAccessState.tooltipElements.push(tooltip);
}

/**
 * Supprime tous les tooltips affichés
 */
function removeAllTooltips() {
    quickAccessState.tooltipElements.forEach(tooltip => tooltip.remove());
    quickAccessState.tooltipElements = [];
}

/**
 * Exécute une action sur un élément
 * @param {string|Function} action - Action à exécuter ("clic", "mouseover", "enter", ou fonction)
 * @param {HTMLElement} element - Élément cible
 */
function executeAction(action, element) {
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
            
        case 'mouseover':
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
                    // Attendre un instant que le CSS s'applique
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
                    }, 10);
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
        // Génération dynamique
        subConfig = item.subItems(targetElement);
    } else {
        // SubItems statiques
        subConfig = item.subItems;
    }
    
    // Afficher les sous-éléments
    if (subConfig && Object.keys(subConfig).length > 0) {
        console.log(`[QuickAccess] ${Object.keys(subConfig).length} sous-éléments trouvés`);
        
        // Aplatir les subItems si nécessaire
        const flatSubConfig = flattenConfig(subConfig);
        
        // Ajouter les sous-éléments à la configuration actuelle au lieu de les remplacer
        quickAccessState.currentConfig = {
            ...quickAccessState.currentConfig,
            ...flatSubConfig
        };
        
        console.log(`[QuickAccess] Configuration mise à jour avec ${Object.keys(flatSubConfig).length} sous-éléments`);
        console.log(`[QuickAccess] Total d'items actifs: ${Object.keys(quickAccessState.currentConfig).length}`);
        
        // Afficher les tooltips uniquement pour les nouveaux sous-éléments
        showTooltips(flatSubConfig);
        resetInactivityTimer();
    } else {
        // Pas de sous-éléments : traiter comme terminal
        console.warn(`[QuickAccess] Aucun sous-élément trouvé pour ${itemId} - Sortie du mode`);
        recordMetrics({ clicks: 1, drags: 1 });
        deactivateQuickAccess();
    }
}

/**
 * Réinitialise le timer d'inactivité
 */
function resetInactivityTimer() {
    if (quickAccessState.inactivityTimer) {
        clearTimeout(quickAccessState.inactivityTimer);
    }
    
    quickAccessState.inactivityTimer = setTimeout(() => {
        console.log('[QuickAccess] Timeout d\'inactivité atteint');
        deactivateQuickAccess();
    }, INACTIVITY_TIMEOUT);
}

/**
 * Vérifie s'il y a des conflits de touches dans la configuration
 * @param {Object} config - Configuration à vérifier
 */
function checkForDuplicateKeys(config) {
    const keys = {};
    for (const [key, item] of Object.entries(config)) {
        if (keys[item.key]) {
            console.warn(`[QuickAccess] ⚠️ CONFLIT : La touche "${item.key}" est utilisée plusieurs fois :`, keys[item.key], item);
        } else {
            keys[item.key] = item;
        }
    }
}

