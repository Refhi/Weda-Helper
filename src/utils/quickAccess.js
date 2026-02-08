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
 * @property {string} hotkey - Touche de raccourci (une seule lettre/chiffre)
 * @property {string} [description] - Description optionnelle pour le tooltip
 * @property {string|Function} [onTap="clic"] - Action à exécuter au tap ("clic", "mouseover", "enter", ou fonction). Si seul, l'item est terminal
 * @property {string|Function} [onDoubleTap] - Action à exécuter au double-tap (toujours terminal). Implique la présence de subItems
 * @property {Object.<string, QuickAccessItem>|Function} [subItems=null] - Sous-éléments (objet ou fonction qui les génère)
 * @property {HTMLElement} [element] - Référence à l'élément DOM (pour items générés dynamiquement)
 * 
 * ⚠️ IMPORTANT - Comportement des subItems fonction :
 * Une fonction subItems est appelée UNE SEULE FOIS lors du premier accès au niveau.
 * Le résultat est ensuite mis en cache dans quickAccessConfig.
 * 
 * Logique :
 * - onTap seul = item terminal (exécute onTap et sort)
 * - onTap + onDoubleTap + subItems = item non-terminal (tap = onTap + affiche subItems, double-tap = onDoubleTap + sort)
 */
const quickAccessConfig = {
    // Recherche patient
    'recherche_patient': {
        selector: 'a[href*="FindPatientForm.aspx"]',
        hotkey: 'r',
        onTap: function () {
            openSearch(); // définie dans keyCommand.js
        }
    },

    // === Menu horizontal - Organisation hiérarchique ===
    'medical': {
        selector: '#nav-menu > li > a.nav-icon__link--doctor',
        hotkey: 'm',
        onTap: 'horizontal_menu_pseudomouseover',
        onDoubleTap: 'clic',
        subItems: function (element, currentItemHotkey) {
            const submenu = element.parentElement.querySelector('.nav-menu__submenu--level1');
            return submenu ? generateHorizMenuSubItems(submenu, 'medical', currentItemHotkey) : {};
        }
    },

    'applicatifs': {
        selector: '#nav-menu > li > a.nav-icon__link--tools',
        hotkey: 'p',
        onTap: 'horizontal_menu_pseudomouseover',
        onDoubleTap: 'clic',
        subItems: function (element, currentItemHotkey) {
            const submenu = element.parentElement.querySelector('.nav-menu__submenu--level1');
            return submenu ? generateHorizMenuSubItems(submenu, 'applicatifs', currentItemHotkey) : {};
        }
    },

    'gestion': {
        selector: '#nav-menu > li > a.nav-icon__link--safe-open',
        hotkey: 'g',
        onTap: 'horizontal_menu_pseudomouseover',
        onDoubleTap: 'clic',
        subItems: function (element, currentItemHotkey) {
            const submenu = element.parentElement.querySelector('.nav-menu__submenu--level1');
            return submenu ? generateHorizMenuSubItems(submenu, 'gestion', currentItemHotkey) : {};
        }
    },

    'parametres': {
        selector: '#nav-menu > li > a.nav-icon__link--mixing-desk',
        hotkey: 'e',
        onTap: 'horizontal_menu_pseudomouseover',
        onDoubleTap: 'clic',
        subItems: function (element, currentItemHotkey) {
            const submenu = element.parentElement.querySelector('.nav-menu__submenu--level1');
            return submenu ? generateHorizMenuSubItems(submenu, 'parametres', currentItemHotkey) : {};
        }
    },

    // === Menu vertical gauche (sidebar) ===
    'menu_vertical_gauche': {
        selector: ".menu-sidebar",
        hotkey: 'l',
        onTap: null,
        onDoubleTap: null,
        subItems: {
            // Menu W - Navigation événements
            'menu_w_sidebar': {
                selector: '#ContentPlaceHolder1_UpdatePanelMenuNavigate',
                hotkey: 'w',
                onTap: 'W_menu_pseudomouseover',
                onDoubleTap: 'clic',
                subItems: function (element, currentItemHotkey) {
                    const submenu = element.querySelector('ul.level2.dynamic');
                    return submenu ? generateWMenuSubItems(submenu, 'menu_w_sidebar', currentItemHotkey) : {};
                }
            },

            // Fiche patient
            'modifier_patient': {
                selector: '#ContentPlaceHolder1_ButtonModifierPatient',
                hotkey: 'f',
                onTap: 'clic'
            },

            // Carte Vitale
            'cv_sidebar': {
                selector: '.cv',
                hotkey: 'c',
                onTap: 'clic'
            },

            // Menu périphériques (scanner, doctolib, DMP, omnidoc)
            'peripheriques': {
                selector: '#ContentPlaceHolder1_DivMenuPeripherique',
                hotkey: 'p',
                onTap: 'W_menu_pseudomouseover',
                onDoubleTap: 'clic',
                subItems: function (element, currentItemHotkey) {
                    const submenu = element.querySelector('ul.level2.dynamic');
                    return submenu ? generateWMenuSubItems(submenu, 'peripheriques', currentItemHotkey) : {};
                }
            },

            // Recherche patient (déjà défini au niveau racine)
            'recherche_sidebar': {
                selector: '.imgChercher',
                hotkey: 'r',
                onTap: 'clic'
            },

            // Ajouter patient
            'ajouter_patient': {
                selector: '.imgAddNewPatient',
                hotkey: 'n',
                onTap: 'clic'
            },

            // Documents - Organisation hiérarchique
            'consultations': {
                selector: '#ContentPlaceHolder1_ButtonConsultation',
                hotkey: 'o',
                onTap: 'clic'
            },

            'resultats_examen': {
                selector: '#ContentPlaceHolder1_ButtonResultatExamen',
                hotkey: 'x',
                onTap: 'clic'
            },

            'courriers': {
                selector: '#ContentPlaceHolder1_ButtonCourrier',
                hotkey: 'k',
                onTap: 'clic'
            },

            'vaccins': {
                selector: '#ContentPlaceHolder1_ButtonVaccins',
                hotkey: 'v',
                onTap: 'clic'
            },

            'traitements': {
                selector: '#ContentPlaceHolder1_ButtonPanneauxSynthetique',
                hotkey: 't',
                onTap: 'clic'
            },

            'graphiques': {
                selector: '#ContentPlaceHolder1_ButtonChart',
                hotkey: 'h',
                onTap: 'clic'
            },

            'documents_joints': {
                selector: '#ButtonDocumentJointAction',
                hotkey: 'd',
                onTap: 'clic'
            },

            'arrets_travail': {
                selector: '#ContentPlaceHolder1_ButtonAT',
                hotkey: 'z',
                onTap: 'clic'
            },

            // Menu impression
            'impression': {
                selector: '#ContentPlaceHolder1_MenuPrint > ul.level1.static',
                hotkey: 'i',
                onTap: 'W_menu_pseudomouseover',
                onDoubleTap: 'clic',
                subItems: function (element, currentItemHotkey) {
                    const submenu = element.querySelector('ul.level2.dynamic');
                    return submenu ? generateWMenuSubItems(submenu, 'impression', currentItemHotkey) : {};
                }
            },

            // Recherche prescriptions
            'recherche_prescriptions': {
                selector: '#ContentPlaceHolder1_ButtonHasStat',
                hotkey: 'q',
                onTap: 'clic'
            },

            // Séquenceur
            'sequenceur': {
                selector: '#ContentPlaceHolder1_ButtonSequenceur',
                hotkey: 'z',
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

    // Afficher les tooltips du niveau racine
    showTooltips(state, quickAccessConfig);

    // Le reste du flux est géré dans les listeners
}


function addListenersToOverlay(overlay, state, config) {
    overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && state.currentLevel.length > 0) {
            // Remonter d'un niveau
            const parentLevel = state.currentLevel.slice(0, -1);
            if (moveToTargetConfig(parentLevel, state, config)) {
                showTooltips(state, config);
            }
        } else {
            handleQuickAccessKey(e, state, config);
        }
    });

    // On implémente aussi la touche terminale
    overlay.addEventListener('keyup', (e) => {
        if (e.key === 'Escape') {
            deactivateQuickAccess()
        }
    })
}

function handleQuickAccessKey(e, state, config) {
    // Vérifier que la touche pressée correspond à un élément du niveau actuel
    const currentConfig = flattenedCurrentLevelConfig(state, config);

    //
    const matchedItem = Object.values(currentConfig).find(item => item.hotkey === e.key);

    if (matchedItem) {
        // Exécuter l'action associée à onTap ou onDoubleTap selon le contexte
        // et gérer la navigation dans les niveaux si nécessaire
        executeQuickAccessAction(matchedItem, state, config);
    }
}

/**
 * Exécute l'action associée à un élément Quick Access
 * Gère la logique de navigation entre niveaux et l'exécution des actions
 * 
 */
function executeQuickAccessAction(matchedItem, state, config) {
    // Détection du double-tap : si la touche détectée correspond au premier élément
    // du flattenedCurrentLevelConfig, on doit éxécuter onDoubleTap au lieu de onTap
    const currentConfig = flattenedCurrentLevelConfig(state, config);
    // Ce n’est pas du vrai double-tap, mais si on appelle l’élément parent (qui est
    // forcément en premier dans le flattened) c’est forcément que c’est un double-tap
    const isDoubleTap = matchedItem.onDoubleTap && Object.values(currentConfig)[0] === matchedItem;
    
    // Ensuite on doit déterminer si l’action est de type terminal
    // ce qui est le cas si l’item n’a pas de subItems ou si on est en présence d’un double-tap
    const isTerminal = !matchedItem.subItems || isDoubleTap;

    const action = isDoubleTap ? matchedItem.onDoubleTap : matchedItem.onTap;
    const targetElementSelector = matchedItem.selector;
    
    // Ne rien exécuter si l'action est null/undefined
    if (action) {
        executeAction(action, targetElementSelector);
    }

    if (isTerminal) {
        // Cas terminal : exécuter l'action et sortir du Quick Access
        recordMetrics({ clicks: 1, drags: 1 }); // Définie dans metrics.js
        deactivateQuickAccess();
    } else {
        // Cas non-terminal avec subItems : exécuter onTap puis descendre dans les subItems
        const targetQALevel = [...state.currentLevel, getItemIdByValue(currentConfig, matchedItem)];
        if (moveToTargetConfig(targetQALevel, state, config)) {
            showTooltips(state, config);
        }
    }
}

/**
 * Fonction utilitaire pour exécuter une action qui peut être une string (clic, mouseover, enter) ou une fonction personnalisée
 */
function executeAction(action, selector) {
    const element = document.querySelector(selector);
    if (!element) {
        console.warn(`[QuickAccess] Impossible d'exécuter l'action : élément non trouvé pour le sélecteur "${selector}"`);
        return;
    }

    if (typeof action === 'string') {
        switch (action) {
            case 'clic':
                element.click();
                break;
            case 'mouseover':
                element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
                break;
            case 'enter':
                element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                break;
            case 'horizontal_menu_pseudomouseover':
                horizontalMenuPseudoMouseover(element);
                break;
            case 'W_menu_pseudomouseover':
                WMenuPseudoMouseover(element);
                break;
            default:
                console.warn(`[QuickAccess] Action de type string non reconnue : "${action}"`);
        }
    } else if (typeof action === 'function') {
        action(element);
    } else {
        console.warn(`[QuickAccess] Action de type inconnu :`, action);
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
    const { item: currentItem } = navigateToItem(config, actualQALevel, 'currentLevelConfig');
    
    if (!currentItem) {
        return {};
    }

    // Retourner uniquement l'élément parent avec sa structure complète (incluant subItems)
    const parentId = actualQALevel[actualQALevel.length - 1];

    return {
        [parentId]: currentItem
    };
}

/**
 * Vérifie qu'il n'y a pas de touches de raccourci en double dans une configuration
 * @param {Object} config - Configuration à vérifier (généralement la version aplatie d'un niveau)
 * @param {string[]} QALevel - Niveau actuel pour les messages d'erreur
 */
function checkForKeyDuplication(config, QALevel) {
    const usedHotkeys = {};
    let hasDuplicates = false;

    for (const [itemId, item] of Object.entries(config)) {
        if (!item.hotkey) continue;

        const hotkey = item.hotkey.toLowerCase();
        if (usedHotkeys[hotkey]) {
            console.error(`[QuickAccess] Duplication de touche "${hotkey}" détectée au niveau`, QALevel, 
                `entre "${usedHotkeys[hotkey]}" et "${itemId}"`);
            hasDuplicates = true;
        } else {
            usedHotkeys[hotkey] = itemId;
        }
    }

    if (hasDuplicates) {
        console.error('[QuickAccess] ⚠️ Des touches en double ont été détectées ! Cela causera des conflits.');
    }
}

/**
 * Fonction utilitaire pour trouver l'identifiant (clé d'objet) d'un item à partir de sa valeur
 */
function getItemIdByValue(obj, value) {
    return Object.keys(obj).find(itemId => obj[itemId] === value);
}


/**
 * Génère la même configuration que currentLevelConfig, mais applatie,
 * afin que l’élément parent et ses subItems immédiats soient au même niveau pour faciliter l'affichage des tooltips et la gestion des raccourcis.
 * 
*/
function flattenedCurrentLevelConfig(state, config) {
    const currentConfig = currentLevelConfig(state, config);
    const flattenedConfig = {};

    for (const [itemId, item] of Object.entries(currentConfig)) {

        // Ajouter l'élément parent
        flattenedConfig[itemId] = item;

        // Ajouter les subItems immédiats au même niveau
        if (item.subItems && typeof item.subItems === 'object') {
            for (const [subItemId, subItem] of Object.entries(item.subItems)) {
                flattenedConfig[subItemId] = subItem;
            }
        }
    }

    // Vérifier que les items de l'élément parent et ses subItems
    // n'ont pas de lettre de raccourci en double
    checkForKeyDuplication(flattenedConfig, state.currentLevel);

    return flattenedConfig;
}


/**
 * Fonction utilitaire pour naviguer dans l'arborescence de configuration
 * Retourne l'objet de configuration de l'élément ciblé par un QALevel
 * 
 * @param {Object} config - Configuration racine
 * @param {string[]} QALevel - Chemin vers l'élément
 * @param {string} [context='navigation'] - Contexte de l'appel pour les logs
 * @returns {{item: Object|null, parent: Object|null}} Objet contenant l'item trouvé et son parent
 */
function navigateToItem(config, QALevel, context = 'navigation') {
    if (QALevel.length === 0) {
        return { item: config, parent: null, parentId: null };
    }

    let currentItem = config;
    let parentItem = null;
    let parentId = null;
    
    for (let i = 0; i < QALevel.length; i++) {
        const itemId = QALevel[i];
        
        if (!currentItem[itemId]) {
            console.warn(`[QuickAccess] Élément "${itemId}" introuvable lors de ${context}`, QALevel);
            return { item: null, parent: null, parentId: null };
        }
        
        // ✅ Sauvegarder le parent AVANT de descendre dans l'item final
        if (i === QALevel.length - 1) {
            parentItem = currentItem;  // Le conteneur parent
            parentId = itemId;          // L'id de l'item dans ce conteneur
        }
        
        currentItem = currentItem[itemId];
        
        // Si ce n'est pas le dernier niveau, descendre dans subItems
        if (i < QALevel.length - 1) {
            if (!currentItem.subItems) {
                console.warn(`[QuickAccess] Pas de subItems pour "${itemId}" lors de ${context}`, QALevel);
                return { item: null, parent: null, parentId: null };
            }
            // ✅ Sauvegarder le parent pour le prochain niveau
            parentItem = currentItem.subItems;
            currentItem = currentItem.subItems;
        }
    }

    return { item: currentItem, parent: parentItem, parentId };
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
 * ⚠️ COMPORTEMENT IMPORTANT - Génération unique et mise en cache :
 * - Si subItems est une fonction, elle est appelée UNE SEULE FOIS
 * - Le résultat remplace la fonction dans la configuration
 * - Les appels suivants réutilisent le résultat mis en cache
 * - Les subItems générés ne sont JAMAIS régénérés, même si on remonte puis redescend dans l'arborescence
 * 
 * @param {Object} config - Configuration racine (quickAccessConfig)
 * @param {string[]} targetQALevel - Chemin vers le niveau à peupler
 */
function populateSubItems(config, targetQALevel) {
    // Si niveau racine, rien à peupler
    if (targetQALevel.length === 0) {
        return;
    }
    
    // Naviguer jusqu'à l'élément cible et obtenir son parent
    const { item: currentItem, parent: parentContainer, parentId } = navigateToItem(config, targetQALevel, 'populateSubItems');
    
    if (!currentItem || !parentContainer) {
        return;
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
            // ⚠️ REMPLACEMENT PERMANENT : la fonction est remplacée par son résultat
            // Modifier directement dans le parent pour que le cache fonctionne
            const currentItemHotkey = currentItem.hotkey || null;
            const generatedSubItems = currentItem.subItems(element, currentItemHotkey);
            
            // ✅ Modifier directement la référence dans quickAccessConfig via le parent
            parentContainer[parentId].subItems = generatedSubItems;
            
            console.log(`[QuickAccess] SubItems peuplés avec succès pour`, targetQALevel);
        } else {
            console.warn(`[QuickAccess] Impossible de trouver l'élément pour peupler les subItems`, targetQALevel);
        }
    } else if (typeof currentItem.subItems === 'object') {
        // Les subItems ont déjà été générés (cache) ou sont statiques
        console.log(`[QuickAccess] Réutilisation du cache subItems pour`, targetQALevel);
    }

    console.log(`[QuickAccess] Configuration après peuplement pour le niveau`, targetQALevel, config);
}


/**
 * Désactive le mode Quick Access en supprimant l'overlay et les listeners associés
 * et en supprimant les infobulles affichées.
 */
function deactivateQuickAccess() {
    // supprimer l'overlay (les listeners y étant attachés, ils seront automatiquement supprimés)
    const overlay = document.getElementById('wh-quickaccess-overlay');
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
    overlay.tabIndex = -1; // pour pouvoir y mettre le focus et écouter les événements clavier
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
    return overlay;
}


/**
 * Crée et affiche un tooltip sur un élément
 * @param {HTMLElement} element - Élément sur lequel afficher le tooltip
 * @param {string} hotkey - Touche de raccourci
 * @param {boolean} hasDoubleTap - Indique si un double-tap est disponible
 */
function createTooltip(selector, hotkey, hasDoubleTap = false) {
    const element = document.querySelector(selector);
    console.log(`[QuickAccess] Création du tooltip pour la touche "${hotkey}" sur l'élément:`, element);
    if (!element) return;

    // S'assurer que l'élément est visible
    if (element.offsetParent === null) {
        console.log(`[QuickAccess] Élément non visible, tooltip ignoré pour la clé ${hotkey}`);
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
    tooltip.textContent = hotkey.toUpperCase();

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

    for (const [itemId, item] of Object.entries(flattenedConfig)) {
        createTooltip(item.selector, item.hotkey, item.onDoubleTap != null);
    }
}


/** 
 * Horizontal menu pseudo-mouseover : simule un mouseover en dispatchant un événement personnalisé
 * valable uniquement pour les éléments du menu horizontal haut dans la page d’accueil
 */
function horizontalMenuPseudoMouseover(element) {
    if (!element) {
        console.warn('[QuickAccess] Impossible de déclencher horizontalMenuPseudoMouseover : élément manquant');
        return;
    }
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
                    console.log('[QuickAccess] Sous-menu horizontalMenuPseudoMouseover hors viewport, repositionnement par rapport à l\'élément parent...');

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
}


/**
 * Menu W pseudo-mouseover : simule un mouseover en dispatchant un événement personnalisé
 * valable uniquement pour les éléments du menu W dans la sidebar gauche
 */
function WMenuPseudoMouseover(element) {
    if (!element) {
        console.warn('[QuickAccess] Impossible de déclencher WMenuPseudoMouseover : élément manquant');
        return;
    }
    console.error('[QuickAccess] WMenuPseudoMouseover déclenché mais pas encore implémenté');
    // TODO : implémenter une logique spécifique pour le menu W si nécessaire, similaire à horizontalMenuPseudoMouseover
}


/**
 * 
 */
function generateWMenuSubItems(submenuElement, parentId, currentItemHotkey) {
    console.error('[QuickAccess] generateWMenuSubItems déclenché mais pas encore implémenté');
    // TODO
    return {};
}


/**
 * Génère récursivement les sous-items du menu horizontal à partir de l'élément DOM du sous-menu
 * @param {HTMLElement} submenuElement - Élément ul.nav-menu__submenu
 * @param {string} parentId - ID du parent pour générer les clés
 * @param {string} currentItemHotkey - Touche de raccourci du parent à éviter
 * @returns {Object} Configuration des sous-items
 */
function generateHorizMenuSubItems(submenuElement, parentId, currentItemHotkey) {
    const subItems = {};
    const usedHotkeys = new Set();
    
    // Ajouter la hotkey du parent aux hotkeys à éviter
    if (currentItemHotkey) {
        usedHotkeys.add(currentItemHotkey.toLowerCase());
    }

    // Récupérer tous les liens directs de ce niveau
    const menuItems = submenuElement.querySelectorAll(':scope > li > a');

    let keyIndex = 1;
    menuItems.forEach(link => {
        const parentLi = link.parentElement;

        // Chercher un sous-menu de niveau suivant
        const hasArrow = link.classList.contains('nav-icon__link--arrow-right');
        const nextLevelSubmenu = parentLi.querySelector('.nav-menu__submenu--level2');

        // Générer une clé numérique ou alphabétique en évitant les touches déjà utilisées
        let hotkey;
        do {
            hotkey = keyIndex <= 9 ? keyIndex.toString() : String.fromCharCode(96 + keyIndex); // a, b, c...
            keyIndex++;
        } while (usedHotkeys.has(hotkey));
        
        // Ajouter la hotkey générée à la liste des hotkeys utilisées
        usedHotkeys.add(hotkey);

        const itemId = `${parentId}_item_${keyIndex - 1}`;

        const item = {
            selector: null,
            element: link,
            hotkey: hotkey,
            onTap: hasArrow ? 'horizontal_menu_pseudomouseover' : 'clic'
        };

        // Si a un sous-menu, configurer le double-tap pour ouvrir directement
        if (nextLevelSubmenu) {
            item.onDoubleTap = 'clic';
            item.subItems = function (el, itemHotkey) {
                // Passer la touche de raccourci de l'item actuel comme touche à éviter au niveau suivant
                return generateHorizMenuSubItems(nextLevelSubmenu, itemId, hotkey);
            };
        }

        subItems[itemId] = item;
    });

    return subItems;
}
