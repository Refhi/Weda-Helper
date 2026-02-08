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
let quickAccessConfig = {
    // Recherche patient
    'recherche_patient': {
        selector: 'a[href*="FindPatientForm.aspx"]',
        key: 'r',
        onTap: function () {
            openSearch();
        }
    },

    // === Menu horizontal - Organisation hiérarchique ===
    'medical': {
        selector: '#nav-menu > li > a.nav-icon__link--doctor',
        key: 'm',
        onTap: 'pseudomouseover',
        onDoubleTap: 'clic',
        subItems: function (element) {
            const submenu = element.parentElement.querySelector('.nav-menu__submenu--level1');
            return submenu ? generateNavSubItems(submenu, 'medical') : {};
        }
    },

    'applicatifs': {
        selector: '#nav-menu > li > a.nav-icon__link--tools',
        key: 'p',
        onTap: 'pseudomouseover',
        onDoubleTap: 'clic',
        subItems: function (element) {
            const submenu = element.parentElement.querySelector('.nav-menu__submenu--level1');
            return submenu ? generateNavSubItems(submenu, 'applicatifs') : {};
        }
    },

    'gestion': {
        selector: '#nav-menu > li > a.nav-icon__link--safe-open',
        key: 'g',
        onTap: 'pseudomouseover',
        onDoubleTap: 'clic',
        subItems: function (element) {
            const submenu = element.parentElement.querySelector('.nav-menu__submenu--level1');
            return submenu ? generateNavSubItems(submenu, 'gestion') : {};
        }
    },

    'parametres': {
        selector: '#nav-menu > li > a.nav-icon__link--mixing-desk',
        key: 'e',
        onTap: 'pseudomouseover',
        onDoubleTap: 'clic',
        subItems: function (element) {
            const submenu = element.parentElement.querySelector('.nav-menu__submenu--level1');
            return submenu ? generateNavSubItems(submenu, 'parametres') : {};
        }
    },

    // === Menu vertical gauche (sidebar) ===
    'menu_vertical_gauche': {
        selector: ".menu-sidebar",
        key: 'l',
        onTap: null,
        onDoubleTap: null,
        subItems: {
            // Menu W - Navigation événements
            'menu_w_sidebar': {
                selector: '#ContentPlaceHolder1_UpdatePanelMenuNavigate',
                key: 'w',
                onTap: 'pseudomouseover',
                onDoubleTap: 'clic',
                subItems: function (element) {
                    const submenu = element.querySelector('ul.level2.dynamic');
                    return submenu ? generateNavSubItems(submenu, 'menu_w_sidebar') : {};
                }
            },

            // Fiche patient
            'modifier_patient': {
                selector: '#ContentPlaceHolder1_ButtonModifierPatient',
                key: 'f',
                onTap: 'clic'
            },

            // Carte Vitale
            'cv_sidebar': {
                selector: '.cv',
                key: 'c',
                onTap: 'clic'
            },

            // Menu périphériques (scanner, doctolib, DMP, omnidoc)
            'peripheriques': {
                selector: '#ContentPlaceHolder1_DivMenuPeripherique',
                key: 'p',
                onTap: 'mouseover',
                onDoubleTap: 'clic',
                subItems: function (element) {
                    const submenu = element.querySelector('ul.level2.dynamic');
                    return submenu ? generateNavSubItems(submenu, 'peripheriques') : {};
                }
            },

            // Recherche patient (déjà défini au niveau racine)
            'recherche_sidebar': {
                selector: '.imgChercher',
                key: 'r',
                onTap: 'clic'
            },

            // Ajouter patient
            'ajouter_patient': {
                selector: '.imgAddNewPatient',
                key: 'n',
                onTap: 'clic'
            },

            // Documents - Organisation hiérarchique
            'consultations': {
                selector: '#ContentPlaceHolder1_ButtonConsultation',
                key: 'o',
                onTap: 'clic'
            },

            'resultats_examen': {
                selector: '#ContentPlaceHolder1_ButtonResultatExamen',
                key: 'x',
                onTap: 'clic'
            },

            'courriers': {
                selector: '#ContentPlaceHolder1_ButtonCourrier',
                key: 'k',
                onTap: 'clic'
            },

            'vaccins': {
                selector: '#ContentPlaceHolder1_ButtonVaccins',
                key: 'v',
                onTap: 'clic'
            },

            'traitements': {
                selector: '#ContentPlaceHolder1_ButtonPanneauxSynthetique',
                key: 't',
                onTap: 'clic'
            },

            'graphiques': {
                selector: '#ContentPlaceHolder1_ButtonChart',
                key: 'h',
                onTap: 'clic'
            },

            'documents_joints': {
                selector: '#ButtonDocumentJointAction',
                key: 'd',
                onTap: 'clic'
            },

            'arrets_travail': {
                selector: '#ContentPlaceHolder1_ButtonAT',
                key: 'at',
                onTap: 'clic'
            },

            // Menu impression
            'impression': {
                selector: '#ContentPlaceHolder1_MenuPrint > ul.level1.static',
                key: 'i',
                onTap: 'pseudomouseover',
                onDoubleTap: 'clic',
                subItems: function (element) {
                    const submenu = element.querySelector('ul.level2.dynamic');
                    return submenu ? generateNavSubItems(submenu, 'impression') : {};
                }
            },

            // Recherche prescriptions
            'recherche_prescriptions': {
                selector: '#ContentPlaceHolder1_ButtonHasStat',
                key: 'q',
                onTap: 'clic'
            },

            // Séquenceur
            'sequenceur': {
                selector: '#ContentPlaceHolder1_ButtonSequenceur',
                key: 'z',
                onTap: 'clic'
            }
        }
    }
};


/** 
 * Fonction d'entrée
*/
function activateQuickAccess() {
    /**
    * Le actualQALevel correspond au chemin du niveau actuellement activé.
    * C'est un tableau de clés représentant le chemin dans l'arborescence.
    * Exemples :
    * - [] = niveau racine
    * - ["menu_vertical_gauche"] = premier niveau de profondeur
    * - ["menu_vertical_gauche", "menu_w_sidebar"] = second niveau de profondeur
    * 
    * Un élément activé est un élément qui affiche une infobulle et qui est écouté par le système pour déclencher une action.
    * Si on est au niveau ["menu_vertical_gauche"], alors on affiche les lettres pour menu_vertical_gauche
    * et tous ses sous-éléments immédiats, mais on désactive les autres éléments du niveau racine.
    */
    let actualQALevel = [] // Correspond au niveau racine

    // Commencer par activer l'overlay
    let overlay = activateOverlay()

    // Y mettre le focus pour faciliter les écoutes clavier et éviter les interractions malheureuses avec les champs inf. (comme les inputs)
    overlay.focus()

    // On ajoute sur l'overlay les évents Listeners chargés d'écouter les entrées clavier
    addListenersToOverlay(overlay, actualQALevel)

    // Le reste du flux est géré dans les listeners

}
function activateOverlay() {
    // Ajouter un overlay au document

    // TODO

    return overlayElement
}

function addListenersToOverlay(overlay) {
    overlay.addEventListener('keydown', (e) => {
        handleQuickAccessKey(e, actualQALevel)
    })

    // On implémente aussi la touche terminale
    overlay.addEventListener('keyup', (e) => {
        if (e.key = 'Escape') {
            deactivateQuickAccess()
        }
    })
}

function handleQuickAccessKey(e, actualQALevel) {
    // TODO
}

/**
 * Renvoie la configuration du niveau actuel sous forme d'objet
 * Contient uniquement l'élément parent avec ses subItems immédiats
 * 
 * @param {string[]} actualQALevel - Chemin vers le niveau actuel (ex: [], ["menu_vertical_gauche"], ["menu_vertical_gauche", "menu_w_sidebar"])
 * @returns {Object} Configuration du niveau avec structure cohérente
 * 
 * Structure retournée :
 * - Si niveau racine [] : retourne quickAccessConfig complet
 * - Si niveau enfant : retourne un objet contenant uniquement l'élément parent avec sa structure complète
 *   Exemple pour ["menu_vertical_gauche"] :
 *   {
 *     "menu_vertical_gauche": {
 *       selector: ".menu-sidebar",
 *       key: 'l',
 *       onTap: null,
 *       onDoubleTap: null,
 *       subItems: {
 *         "menu_w_sidebar": { ...config enfant... },
 *         "modifier_patient": { ...config enfant... },
 *         ...
 *       }
 *     }
 *   }
 */
function currentLevelConfig(actualQALevel) {
    // Cas 1 : Niveau racine
    if (actualQALevel.length === 0) {
        return quickAccessConfig;
    }

    // Cas 2 : Naviguer jusqu'à l'élément cible
    let currentItem = quickAccessConfig;
    
    // Parcourir le chemin pour trouver l'élément cible
    for (let i = 0; i < actualQALevel.length; i++) {
        const key = actualQALevel[i];
        
        if (!currentItem[key]) {
            console.warn(`[QuickAccess] Élément "${key}" introuvable dans le chemin`, actualQALevel);
            return {};
        }
        
        currentItem = currentItem[key];
        
        // Si ce n'est pas le dernier niveau, descendre dans subItems
        if (i < actualQALevel.length - 1) {
            if (!currentItem.subItems) {
                console.warn(`[QuickAccess] Pas de subItems pour "${key}"`, actualQALevel);
                return {};
            }
            
            // Descendre dans subItems (qui doit déjà être peuplé)
            currentItem = currentItem.subItems;
        }
    }

    // Retourner uniquement l'élément parent avec sa structure complète (incluant subItems)
    const parentKey = actualQALevel[actualQALevel.length - 1];
    return {
        [parentKey]: currentItem
    };
}


/**
 * Cette fonction permet de changer de QALevel
 * Elle ne peut changer que d'un seul level à la fois
 * Il faut impérativement l'appeler pour changer de niveau pour être sûr que 
 * ce soit fait correctement avec le peuplement des niveaux inférieurs au besoin
 * 
 * @param {string[]} targetQALevel - Nouveau chemin cible
 * @param {string[]} actualQALevel - Chemin actuel
 * @returns {boolean} true si le changement est valide, false sinon
 */
function moveToTargetConfig(targetQALevel, actualQALevel) {
    // Vérifier que la demande de changement de niveau est d'un niveau exactement
    const levelDiff = Math.abs(targetQALevel.length - actualQALevel.length);
    
    if (levelDiff !== 1) {
        console.warn(`[QuickAccess] Changement de niveau invalide : différence de ${levelDiff} niveaux`, {
            from: actualQALevel,
            to: targetQALevel
        });
        return false;
    }

    // Vérifier que le chemin parent est cohérent (en cas de descente)
    if (targetQALevel.length > actualQALevel.length) {
        // Descente : vérifier que targetQALevel commence par actualQALevel
        for (let i = 0; i < actualQALevel.length; i++) {
            if (actualQALevel[i] !== targetQALevel[i]) {
                console.warn(`[QuickAccess] Chemin incohérent lors de la descente`, {
                    from: actualQALevel,
                    to: targetQALevel
                });
                return false;
            }
        }
    } else {
        // Remontée : vérifier que actualQALevel commence par targetQALevel
        for (let i = 0; i < targetQALevel.length; i++) {
            if (actualQALevel[i] !== targetQALevel[i]) {
                console.warn(`[QuickAccess] Chemin incohérent lors de la remontée`, {
                    from: actualQALevel,
                    to: targetQALevel
                });
                return false;
            }
        }
    }

    // Appliquer le changement de niveau en peuplant si besoin le nouveau niveau
    try {
        populateSubItems(quickAccessConfig, targetQALevel);
        return true;
    } catch (error) {
        console.error(`[QuickAccess] Erreur lors du peuplement des subItems`, error);
        return false;
    }
}

/**
 * Celle-ci met à jour quickAccessConfig lors d'une avancée dans l'arborescence
 * de façon à peupler les subItems si ceux-ci sont générés par une fonction
 * 
 * @param {Object} config - Configuration racine (quickAccessConfig)
 * @param {string[]} targetQALevel - Chemin vers le niveau à peupler
 */
function populateSubItems(config, targetQALevel) {
    // Si niveau racine, rien à peupler
    if (targetQALevel.length === 0) {
        return;
    }
    
    // Naviguer jusqu'à l'élément cible
    let currentItem = config;
    
    for (let i = 0; i < targetQALevel.length; i++) {
        const key = targetQALevel[i];
        
        if (!currentItem[key]) {
            console.warn(`[QuickAccess] Élément "${key}" introuvable lors du peuplement`, targetQALevel);
            return;
        }
        
        currentItem = currentItem[key];
        
        // Si ce n'est pas le dernier niveau, descendre dans subItems
        if (i < targetQALevel.length - 1) {
            if (!currentItem.subItems) {
                console.warn(`[QuickAccess] Pas de subItems pour "${key}" lors du peuplement`, targetQALevel);
                return;
            }
            currentItem = currentItem.subItems;
        }
    }
    
    // Vérifier si subItems est une fonction à évaluer
    if (typeof currentItem.subItems === 'function') {
        console.log(`[QuickAccess] Peuplement des subItems pour le niveau`, targetQALevel);
        
        // Trouver l'élément DOM si nécessaire
        let element = currentItem.element;
        if (!element && currentItem.selector) {
            element = document.querySelector(currentItem.selector);
        }
        
        if (element) {
            // Stocker l'élément pour usage ultérieur
            currentItem.element = element;
            
            // Appeler la fonction pour générer les subItems et les remplacer
            currentItem.subItems = currentItem.subItems(element);
            console.log(`[QuickAccess] SubItems peuplés avec succès pour`, targetQALevel);
        } else {
            console.warn(`[QuickAccess] Impossible de trouver l'élément pour peupler les subItems`, targetQALevel);
        }
    }

    console.log(`[QuickAccess] Configuration après peuplement pour le niveau`, targetQALevel, config);
}



/**
 * -------------------------------------------------------------------------
 * FONCTIONS SUPPORT
 * ------------------------------------------------------------------------- 
 */


/** // TODO : à réévaluer, notamment préciser de quels sous-titres il s'agit.
 * Génère récursivement les sous-items d'un menu de navigation
 * @param {HTMLElement} submenuElement - Élément ul.nav-menu__submenu
 * @param {string} parentId - ID du parent pour générer les clés
 * @param {Set<string>} usedKeys - Ensemble des touches déjà utilisées à éviter
 * @returns {Object} Configuration des sous-items
 */
function generateNavSubItems(submenuElement, parentId, usedKeys = new Set()) {
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

        // Générer une clé numérique ou alphabétique en évitant les touches déjà utilisées
        let key;
        do {
            key = keyIndex <= 9 ? keyIndex.toString() : String.fromCharCode(96 + keyIndex); // a, b, c...
            keyIndex++;
        } while (usedKeys.has(key));

        const itemId = `${parentId}_item_${keyIndex - 1}`;

        const item = {
            selector: null,
            element: link,
            key: key,
            onTap: hasArrow ? 'pseudomouseover' : 'clic'
        };

        // Si a un sous-menu, configurer le double-tap pour ouvrir directement
        if (nextLevelSubmenu) {
            item.onDoubleTap = 'clic';
            item.subItems = function (el, currentUsedKeys) {
                // Utiliser les touches actuellement actives (passées lors de l'appel)
                const activeKeys = currentUsedKeys || new Set();
                return generateNavSubItems(nextLevelSubmenu, itemId, activeKeys);
            };
        }

        subItems[itemId] = item;
    });

    return subItems;
}



// -------------------------------------------------------------------------
// Toute la partie ci-dessous doit être supprimée
// -------------------------------------------------------------------------



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

const INACTIVITY_TIMEOUT = 10000; // 10 secondes
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
        background-color: rgba(0, 0, 0, 0.1);
        z-index: 99998;
        pointer-events: none;
    `;

    // Message d'information
    const message = document.createElement('div');
    message.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 8px 15px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: normal;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        z-index: 99999;
        pointer-events: none;
        font-family: Arial, sans-serif;
    `;
    message.textContent = 'Quick Access (Échap pour quitter)';

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
    // Supprimer tous les tooltips existants
    removeAllTooltips();

    console.log('[QuickAccess] Affichage des tooltips', config);

    for (const [key, item] of Object.entries(config)) {
        // Si l'élément a déjà été trouvé (cas dynamique)
        if (item.element) {
            createTooltip(item.element, item.key, item.onDoubleTap != null);
            continue;
        }

        // Sinon, chercher l'élément par sélecteur
        if (!item.selector) continue;

        const elements = document.querySelectorAll(item.selector);
        if (elements.length > 0) {
            // Prendre le premier élément trouvé
            const element = elements[0];
            createTooltip(element, item.key, item.onDoubleTap != null);
        } else {
            console.warn(`[QuickAccess] Élément non trouvé pour le sélecteur: ${item.selector}`);
        }
    }
}

/**
 * Crée et affiche un tooltip sur un élément
 * @param {HTMLElement} element - Élément sur lequel afficher le tooltip
 * @param {string} key - Touche de raccourci
 * @param {boolean} hasDoubleTap - Indique si un double-tap est disponible
 */
function createTooltip(element, key, hasDoubleTap = false) {
    console.log(`[QuickAccess] Création du tooltip pour la touche "${key}" sur l'élément:`, element);
    if (!element) return;

    // S'assurer que l'élément est visible
    if (element.offsetParent === null) {
        console.log(`[QuickAccess] Élément non visible, tooltip ignoré pour la clé ${key}`);
        return;
    }

    const tooltip = document.createElement('span');
    tooltip.className = 'wh-quickaccess-tooltip';

    // Calculer la position de l'élément
    const rect = element.getBoundingClientRect();

    // Style avec positionnement fixed pour garantir la visibilité
    tooltip.style.cssText = `
        position: fixed;
        color: #333;
        font-size: 1em;
        background-color: rgba(240, 240, 240, 0.95);
        padding: 4px 8px;
        border-radius: 10px;
        pointer-events: none;
        white-space: nowrap;
        z-index: 99999;
        top: ${rect.bottom + 2}px;
        left: ${rect.left}px;
        height: auto;
        line-height: normal;
        display: inline-block;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    `;

    // Si double-tap disponible, mettre en gras
    if (hasDoubleTap) {
        tooltip.style.fontWeight = 'bold';
    }

    // Contenu : uniquement la touche
    tooltip.textContent = key.toUpperCase();

    // Ajouter le tooltip au body plutôt qu'à l'élément
    document.body.appendChild(tooltip);

    // Stocker une référence à l'élément pour repositionner si nécessaire
    tooltip.dataset.targetElement = element;

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

