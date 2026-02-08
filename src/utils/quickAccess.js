/**
 * @file quickAccess.js
 * @description Système de navigation rapide par raccourcis clavier avec affichage d'infobulles.
 * Permet d'activer un mode "Quick Access" où tous les éléments configurés affichent
 * une lettre de raccourci pour y accéder rapidement.
 * 
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
const quickAccessConfig = {
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
    * L'objet state contient l'état du Quick Access.
    * currentLevel correspond au chemin du niveau actuellement activé.
    * C'est un tableau de clés représentant le chemin dans l'arborescence.
    * Exemples :
    * - [] = niveau racine
    * - ["menu_vertical_gauche"] = premier niveau de profondeur
    * - ["menu_vertical_gauche", "menu_w_sidebar"] = second niveau de profondeur
    * 
    * Un élément activé est un élément qui affiche une infobulle et dont la lettre est écoutée par le système pour déclencher une action.
    * Si on est au niveau ["menu_vertical_gauche"], alors on affiche les lettres pour menu_vertical_gauche
    * et tous ses sous-éléments immédiats, mais on désactive les autres éléments du niveau racine.
    */
    const state = {
        currentLevel: []  // Correspond au niveau racine
        // d’autres caractéristiques sont envisageables
    };

    // Commencer par activer l'overlay
    let overlay = createOverlay();

    // Y mettre le focus pour faciliter les écoutes clavier et éviter les interractions malheureuses avec les champs inf. (comme les inputs)
    overlay.focus()

    // On ajoute sur l'overlay les évents Listeners chargés d'écouter les entrées clavier
    addListenersToOverlay(overlay, state, quickAccessConfig)

    // Le reste du flux est géré dans les listeners
}


function addListenersToOverlay(overlay, state, config) {
    overlay.addEventListener('keydown', (e) => {
        handleQuickAccessKey(e, state, config)
    })

    // On implémente aussi la touche terminale
    overlay.addEventListener('keyup', (e) => {
        if (e.key === 'Escape') {
            deactivateQuickAccess(overlay)
        }
    })
}

function handleQuickAccessKey(e, state, config) {
    // Vérifier que la touche pressée correspond à un élément du niveau actuel
    const currentConfig = flattenedCurrentLevelConfig(state, config);
    const matchedItem = Object.values(currentConfig).find(item => item.key === e.key);

    if (matchedItem) {

        // Exécuter l'action associée à onTap ou onDoubleTap selon le contexte
        // et gérer la navigation dans les niveaux si nécessaire
        executeQuickAccessAction(matchedItem, state, config);
    }
}



/**
 * Renvoie la configuration du niveau actuel sous forme d'objet
 * Contient uniquement l'élément parent avec ses subItems immédiats
 * 
 * @param {Object} state - Objet d'état contenant currentLevel
 * @param {Object} config - Configuration racine
 * @returns {Object} Configuration du niveau avec structure cohérente
 * 
 * Structure retournée :
 * - Si niveau racine [] : retourne config complet
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
function currentLevelConfig(state, config) {
    const actualQALevel = state.currentLevel;
    
    // Cas 1 : Niveau racine
    if (actualQALevel.length === 0) {
        return config;
    }

    // Cas 2 : Naviguer jusqu'à l'élément cible
    let currentItem = config;
    
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

    // Vérifier que les items de l’élément parent et ses subItems
    // n’ont pas de lettre de raccourci en double
    checkForKeyDuplication(currentItem, state);

    return {
        [parentKey]: currentItem
    };
}

/**
 * Génère la même configuration que currentLevelConfig, mais applatie,
 * afin que l’élément parent et ses subItems immédiats soient au même niveau pour faciliter l'affichage des tooltips et la gestion des raccourcis.
 * 
*/
function flattenedCurrentLevelConfig(state, config) {
    const currentConfig = currentLevelConfig(state, config);
    const flattenedConfig = {};

    for (const [key, item] of Object.entries(currentConfig)) {
        // Ajouter l'élément parent
        flattenedConfig[key] = item;

        // Ajouter les subItems immédiats au même niveau
        if (item.subItems && typeof item.subItems === 'object') {
            for (const [subKey, subItem] of Object.entries(item.subItems)) {
                flattenedConfig[subKey] = subItem;
            }
        }
    }

    return flattenedConfig;
}

/** 
 * Check for key duplication in the configuration
 * Vérifie uniquement les clés du niveau aplati (parent + enfants directs)
 * sans descendre récursivement dans les subItems
 * 
 * @param {Object} flattenedConfig - Configuration aplatie du niveau actuel
 * @param {string[]} path - Chemin actuel (pour les messages d'erreur)
 */
function checkForKeyDuplication(config, state) {
    const flattenedConfig = flattenedCurrentLevelConfig(state, config);
    const keysSeen = new Set();

    for (const [key, item] of Object.entries(flattenedConfig)) {
        if (keysSeen.has(item.key)) {
            console.error(`[QuickAccess] Duplication de la touche "${item.key}" détectée dans le chemin`, [...path, key]);
        } else {
            keysSeen.add(item.key);
        }
    }
}

/**
 * Cette fonction permet de changer de QALevel
 * Elle ne peut changer que d'un seul level à la fois
 * Il faut impérativement l'appeler pour changer de niveau pour être sûr que 
 * ce soit fait correctement avec le peuplement des niveaux inférieurs au besoin
 * 
 * @param {string[]} targetQALevel - Nouveau chemin cible
 * @param {Object} state - Objet d'état contenant currentLevel
 * @param {Object} config - Configuration racine
 * @returns {boolean} true si le changement est valide, false sinon
 */
function moveToTargetConfig(targetQALevel, state, config) {
    const actualQALevel = state.currentLevel;
    
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
        populateSubItems(config, targetQALevel);
        // ✅ Mettre à jour l'état si le changement est valide
        state.currentLevel = targetQALevel;
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
 * Désactive le mode Quick Access en supprimant l'overlay et les listeners associés
 * et en supprimant les infobulles affichées.
 */
function deactivateQuickAccess(overlay) {
    // supprimer l'overlay (les listeners y étant attachés, ils seront automatiquement supprimés)
    overlay.remove();

    // supprimer les infobulles affichées
    clearAllTooltips();
}


/**
 * Suppression de tout les tooltips affichés
 */
function clearAllTooltips() {
    const tooltips = document.querySelectorAll('.wh-quickaccess-tooltip');
    tooltips.forEach(tooltip => tooltip.remove());
}

/**
 * Crée et affiche l'overlay semi-transparent
 */
function createOverlay() {
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
    return overlay;
}


/**
 * Crée et affiche un tooltip sur un élément
 * @param {HTMLElement} element - Élément sur lequel afficher le tooltip
 * @param {string} key - Touche de raccourci
 * @param {boolean} hasDoubleTap - Indique si un double-tap est disponible
 */
function createTooltip(selector, key, hasDoubleTap = false) {
    const element = document.querySelector(selector);
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

    // Si double-tap disponible, mettre en bleu
    if (hasDoubleTap) {
        tooltip.style.color = 'blue';
    }

    // Contenu : uniquement la touche
    tooltip.textContent = key.toUpperCase();

    // Ajouter le tooltip au body plutôt qu'à l'élément
    document.body.appendChild(tooltip);

    // Stocker une référence à l'élément pour repositionner si nécessaire
    tooltip.dataset.targetElement = element;
}


/**
 * Affiche les tooltips pour le niveau actuel
 * @param {Object} state - Objet d'état contenant currentLevel
 * @param {Object} config - Configuration racine
 */
function showTooltips(state, config) {
    // Supprimer tous les tooltips existants
    clearAllTooltips();

    // Obtenir la configuration aplatie du niveau actuel
    const flattenedConfig = flattenedCurrentLevelConfig(state, config);

    console.log('[QuickAccess] Affichage des tooltips pour le niveau', state.currentLevel, flattenedConfig);

    for (const [key, item] of Object.entries(flattenedConfig)) {
        createTooltip(item.selector, item.key, item.onDoubleTap != null);
    }
}