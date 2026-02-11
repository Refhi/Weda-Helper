/**
 * @file quickAccess.js
 * @description Système de navigation rapide par raccourcis clavier avec affichage d'infobulles.
 * Permet d'activer un mode "Quick Access" où tous les éléments configurés affichent
 * une lettre de raccourci pour y accéder rapidement.
 * 
 */


// ============================================================================
// POINT D'ENTRÉE ET INITIALISATION
// ============================================================================

/** 
 * Fonction d'entrée de activation du Quick Access
*/
function activateQuickAccess() {
    // Les objets de conf sont définies ici pour être réinitialisées à chaque activation du Quick Access et éviter les problèmes de cache
    /**
     * Configuration du Quick Access
     * Un Item correspond à un élément présent dans le DOM :
     * 
     * 'ceci_est_un_item': {     // ID de l'item, utilisé pour la navigation dans les niveaux
     *   selector: 'a.mon-lien', // sélecteur CSS pour trouver l'élément dans le DOM
     *   hotkey: 'c',            // lettre de raccourci (de préférence null pour génération automatique)
     *   onTap: 'mouseover',     // action à exécuter au tap (cf. executeAction)
     *   onDouble: 'clic',       // action à exécuter au double-tap (optionnel, cf. executeAction)
     *   subItems: {             // sous-éléments (optionnel, pour les items non-terminaux). Générés une seule fois puis mis en cache.
     *     'sous_item_1': { ... },
     *     'sous_item_2': { ... }
     *     }
     *   }
     */
    const quickAccessConfig = {
        // ================= Page d'accueil =================
        'recherche_patient': {
            selector: 'a[href*="FindPatientForm.aspx"]',
            onTap: function () {
                openSearch(); // définie dans keyCommand.js
            }
        },

        // --------- Menu horizontal haut ---------------------
        'medical': {
            selector: '#nav-menu > li > a.nav-icon__link--doctor',
            hotkey: 'm',
            onTap: 'horizontal_menu_pseudomouseover',
            onDoubleTap: 'clic',
            subItems: function (element) {
                const submenu = element.parentElement.querySelector('.nav-menu__submenu--level1');
                return submenu ? generateHorizMenuSubItems(submenu, 'medical') : {};
            }
        },

        'applicatifs': {
            selector: '#nav-menu > li > a.nav-icon__link--tools',
            hotkey: 'p',
            onTap: 'horizontal_menu_pseudomouseover',
            onDoubleTap: 'clic',
            subItems: function (element) {
                const submenu = element.parentElement.querySelector('.nav-menu__submenu--level1');
                return submenu ? generateHorizMenuSubItems(submenu, 'applicatifs') : {};
            }
        },

        'gestion': {
            selector: '#nav-menu > li > a.nav-icon__link--safe-open',
            hotkey: 'g',
            onTap: 'horizontal_menu_pseudomouseover',
            onDoubleTap: 'clic',
            subItems: function (element) {
                const submenu = element.parentElement.querySelector('.nav-menu__submenu--level1');
                return submenu ? generateHorizMenuSubItems(submenu, 'gestion') : {};
            }
        },

        'parametres': {
            selector: '#nav-menu > li > a.nav-icon__link--mixing-desk',
            hotkey: 'e',
            onTap: 'horizontal_menu_pseudomouseover',
            onDoubleTap: 'clic',
            subItems: function (element) {
                const submenu = element.parentElement.querySelector('.nav-menu__submenu--level1');
                return submenu ? generateHorizMenuSubItems(submenu, 'parametres') : {};
            }
        },

        // === Menu vertical gauche (sidebar) ===
        'menu_vertical_gauche': {
            selector: ".menu-sidebar",
            onTap: null,
            onDoubleTap: null,
            subItems: {
                // Menu W - Navigation événements
                'menu_w_sidebar': {
                    selector: '#ContentPlaceHolder1_UpdatePanelMenuNavigate',
                    onTap: 'W_menu_pseudomouseover',
                    onDoubleTap: 'clic',
                    subItems: function (element) {
                        const submenu = element.querySelector('ul.level2.dynamic');
                        return submenu ? generateWMenuSubItems(submenu, 'menu_w_sidebar') : {};
                    }
                },

                // Fiche patient
                'modifier_patient': {
                    selector: '#ContentPlaceHolder1_ButtonModifierPatient',
                    onTap: 'clic'
                },

                // Carte Vitale
                'cv_sidebar': {
                    selector: '.cv',
                    onTap: 'clic'
                },

                // Menu périphériques (scanner, doctolib, DMP, omnidoc)
                'peripheriques': {
                    selector: '#ContentPlaceHolder1_DivMenuPeripherique',
                    onTap: 'W_menu_pseudomouseover',
                    onDoubleTap: 'clic',
                    subItems: function (element) {
                        const submenu = element.querySelector('ul.level2.dynamic');
                        return submenu ? generateWMenuSubItems(submenu, 'peripheriques') : {};
                    }
                },

                // Recherche patient (déjà défini au niveau racine)
                'recherche_sidebar': {
                    selector: '.imgChercher',
                    onTap: 'clic'
                },

                // Ajouter patient
                'ajouter_patient': {
                    selector: '.imgAddNewPatient',
                    onTap: 'clic'
                },

                // Documents - Organisation hiérarchique
                'consultations': {
                    selector: '#ContentPlaceHolder1_ButtonConsultation',
                    onTap: 'clic'
                },

                'resultats_examen': {
                    selector: '#ContentPlaceHolder1_ButtonResultatExamen',
                    onTap: 'clic'
                },

                'courriers': {
                    selector: '#ContentPlaceHolder1_ButtonCourrier',
                    onTap: 'clic'
                },

                'vaccins': {
                    selector: '#ContentPlaceHolder1_ButtonVaccins',
                    onTap: 'clic'
                },

                'traitements': {
                    selector: '#ContentPlaceHolder1_ButtonPanneauxSynthetique',
                    onTap: 'clic'
                },

                'graphiques': {
                    selector: '#ContentPlaceHolder1_ButtonChart',
                    onTap: 'clic'
                },

                'documents_joints': {
                    selector: '#ButtonDocumentJointAction',
                    onTap: 'clic'
                },

                'arrets_travail': {
                    selector: '#ContentPlaceHolder1_ButtonAT',
                    onTap: 'clic'
                },

                // Menu impression
                'impression': {
                    selector: '#ContentPlaceHolder1_MenuPrint > ul.level1.static',
                    onTap: 'W_menu_pseudomouseover',
                    onDoubleTap: 'clic',
                    subItems: function (element) {
                        const submenu = element.querySelector('ul.level2.dynamic');
                        return submenu ? generateWMenuSubItems(submenu, 'impression') : {};
                    }
                },

                // Recherche prescriptions
                'recherche_prescriptions': {
                    selector: '#ContentPlaceHolder1_ButtonHasStat',
                    onTap: 'clic'
                },

                // Séquenceur
                'sequenceur': {
                    selector: '#ContentPlaceHolder1_ButtonSequenceur',
                    onTap: 'clic'
                }
            }
        }
    };

    /**
    * state.currentLevel correspond au niveau actuel du QuickAccess (QALevel)
    * C'est un tableau de clés représentant le chemin dans l'arborescence.
    * Exemples :
    * - [] = niveau racine
    * - ["menu_vertical_gauche"] = premier niveau de profondeur
    * - ["menu_vertical_gauche", "menu_w_sidebar"] = second niveau de profondeur
    */

    const state = { // Objet pour la rémanence de l'état du Quick Access
        currentLevel: []  // Correspond au niveau racine
    };

    // Commencer par activer l'overlay
    let overlay = createOverlay();

    // Y mettre le focus pour faciliter les écoutes clavier et éviter les interractions malheureuses avec les champs inf. (comme les inputs)
    overlay.focus()

    // On ajoute sur l'overlay les évents Listeners chargés d'écouter les entrées clavier
    addListenersToOverlay(overlay, state, quickAccessConfig)

    // Afficher les tooltips du niveau racine
    showTooltips(state, quickAccessConfig);

    // Le reste du flux est géré dans les listeners juste ci-dessous.
}

// ============================================================================
// GESTION DES ÉVÉNEMENTS CLAVIER
// ============================================================================

function addListenersToOverlay(overlay, state, config) {
    overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace') { // Permet de remonter d'un niveau dans l'arborescence du Quick Access
            if (state.currentLevel.length === 0) {
                // Déjà à la racine : fermer le Quick Access
                deactivateQuickAccess();
            } else {
                // Remontée : récupérer l'élément qu'on quitte et revert son sous-menu
                console.log(`[QuickAccess] Item à quitter lors de la remontée`, state.currentLevel);
                if (state.currentLevel && state.currentLevel.length > 0) {
                    // Certains éléments sont déplacés lors de la navigation
                    // on les remet en place à la remontée.
                    revertMovedElement(JSON.stringify(state.currentLevel));
                }

                // Remontée d'un niveau
                const previousLevel = state.currentLevel.slice(0, -1); // On enlève le dernier élément du chemin
                moveToTargetConfig(previousLevel, state, config) // Change le state.currentLevel et vérifie la validité du changement
                // showToolTips contiens également un reset
                showTooltips(state, config);
            }
        } else {
            // Pour tout le reste des touches, c'est géré dans :
            handleQuickAccessKey(e, state, config);
        }
    });

    // L'action deactivateQuickAccess ferme le Quick Access
    // la touche Echap permet de l'appeler à tout moment
    overlay.addEventListener('keyup', (e) => {
        if (e.key === 'Escape') {
            deactivateQuickAccess()
        }
    })
}

function handleQuickAccessKey(e, state, config) {
    // Vérifier que la touche pressée est associée à un élément **du niveau actuel**
    const currentConfig = flattenedCurrentLevelConfig(state, config);
    const matchedEntry = Object.entries(currentConfig).find(([, item]) => item.hotkey === e.key);

    if (matchedEntry) {
        const [matchedItemId, matchedItem] = matchedEntry;
        // Exécuter l'action pertinente : onTap || onDoubleTap || Navigation
        executeQuickAccessAction(matchedItem, matchedItemId, state, config);
    }
}


/**
 * Exécute l'action associée à un Item transmis
 * Peut être une action onTap, onDoubleTap ou une navigation vers les subItems
 * +/- une sortie.
*/
function executeQuickAccessAction(matchedItem, matchedItemId, state, config) {
    const currentConfig = flattenedCurrentLevelConfig(state, config);
    // Si le premier item du flattened a un onDoubleTap et qu'il est appelé
    // alors c'est un doubleTap. (logique navigationnelle, pas temporelle)
    const isDoubleTap = matchedItem.onDoubleTap && Object.values(currentConfig)[0] === matchedItem;

    // L'action est terminale si l’item n’a pas de subItems ou est un double-tap
    const isTerminal = !matchedItem.subItems || isDoubleTap;

    // On extrait l'action à effectuer et le selecteur à cibler
    const action = isDoubleTap ? matchedItem.onDoubleTap : matchedItem.onTap;
    const targetElementSelector = matchedItem.selector;

    // Ne rien exécuter si l'action est null/undefined
    if (action) {
        executeAction(action, targetElementSelector, state);
    }

    if (isTerminal) { // On sort du Quick Access après l'action
        recordMetrics({ clicks: 1, drags: 1 }); // Définie dans metrics.js
        deactivateQuickAccess();
    } else { // Sinon, on descend dans les subItems
        const targetQALevel = [...state.currentLevel, matchedItemId];
        moveToTargetConfig(targetQALevel, state, config);
        setTimeout(() => {
            showTooltips(state, config);
        }, 100); // Petit délai pour laisser le temps au DOM de se mettre à jour si besoin
    }
}

/**
 * Fonction utilitaire pour exécuter une action qui peut être une string (clic, mouseover, enter) ou une fonction personnalisée
 */
function executeAction(action, selector, state) {
    const element = document.querySelector(selector);
    if (!element) {
        console.error(`[QuickAccess] Impossible d'exécuter l'action : élément non trouvé pour le sélecteur "${selector}"`);
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
                horizontalMenuPseudoMouseover(element, state);
                break;
            case 'W_menu_pseudomouseover':
                WMenuPseudoMouseover(element);
                break;
            default:
                console.error(`[QuickAccess] Action de type string non reconnue : "${action}"`);
        }
    } else if (typeof action === 'function') {
        action(element);
    } else {
        console.error(`[QuickAccess] Action de type inconnu :`, action);
    }
}

// ============================================================================
// NAVIGATION ET GESTION DE LA CONFIGURATION
// ============================================================================


/**
 * Génère la même configuration que getItemAndSubItems, mais applatie,
 * afin que l’Item et ses subItems soient au même niveau
 * (facilite les appels pour affichage des tooltips et gestion des raccourcis).
 * 
*/
function flattenedCurrentLevelConfig(state, config) {
    const flattenedConfig = {};
    const actualQALevel = state.currentLevel;

    // Cas 1 : Niveau racine - retourner tous les éléments racine
    if (actualQALevel.length === 0) {
        Object.assign(flattenedConfig, config);
    } else {
        // Cas 2 : Niveau subItem - naviguer jusqu'à l'élément cible
        const { item, subItems, itemId } = getItemAndSubItems(config, actualQALevel, 'flattenedCurrentLevelConfig');

        if (!item || !itemId) {
            console.warn('[QuickAccess] Impossible de construire la configuration aplatie', actualQALevel);
            return {};
        }

        // Aplatir : l'item et ses subItems au même niveau
        Object.assign(flattenedConfig, { [itemId]: item[itemId] }, subItems);
    }

    // Générer automatiquement les hotkeys manquants
    ensureHotkeysForItems(flattenedConfig);

    // Vérifier que les items de l'élément cible et ses subItems
    // n'ont pas de lettre de raccourci en double
    checkForKeyDuplication(flattenedConfig, state.currentLevel);

    return flattenedConfig;
}


/**
 * Fonction utilitaire pour naviguer dans l'arborescence de configuration
 * Retourne l'item ciblé par un QALevel, ses subItems et son conteneur parent
 * 
 * @param {Object} config - Configuration racine
 * @param {string[]} QALevel - Chemin vers l'élément
 * @param {string} [context='navigation'] - Contexte de l'appel pour les logs
 * @returns {{item: Object|null, subItems: Object|null, itemId: string|null}} Objet contenant l'item, ses subItems et son ID
 */
function getItemAndSubItems(config, QALevel, context = 'navigation') {
    if (QALevel.length === 0) {
        return { item: null, subItems: config, itemId: null };
    }

    let currentSubItems = config;
    let currentItemContainer = null;
    let currentItemId = null;

    for (let i = 0; i < QALevel.length; i++) {
        const itemId = QALevel[i];

        if (!currentSubItems[itemId]) {
            console.warn(`[QuickAccess] Élément "${itemId}" introuvable lors de ${context}`, QALevel);
            return { item: null, subItems: null, itemId: null };
        }

        // ✅ Sauvegarder le conteneur et l'item complet AVANT de descendre
        currentItemContainer = currentSubItems;
        currentItemId = itemId;
        const fullItem = currentSubItems[itemId];

        // Si ce n'est pas le dernier niveau, descendre dans subItems
        if (i < QALevel.length - 1) {
            if (!fullItem.subItems) {
                console.warn(`[QuickAccess] Pas de subItems pour "${itemId}" lors de ${context}`, QALevel);
                return { item: null, subItems: null, itemId: null };
            }
            currentSubItems = fullItem.subItems;
        } else {
            // Dernier niveau : retourner le contenu de subItems
            currentSubItems = fullItem.subItems || fullItem;
        }
    }

    return { item: currentItemContainer, subItems: currentSubItems, itemId: currentItemId };
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
 */
function moveToTargetConfig(targetQALevel, state, config) {
    const actualQALevel = state.currentLevel;

    // Vérifier que la demande de changement de niveau est d'un niveau exactement
    const levelDiff = Math.abs(targetQALevel.length - actualQALevel.length);
    if (levelDiff !== 1) {
        console.error(`[QuickAccess] Changement de niveau invalide : différence de ${levelDiff} niveaux`, {
            from: actualQALevel,
            to: targetQALevel
        });
        return;
    }

    // Vérifier que le chemin le plus court est un préfixe du chemin le plus long
    const [shorterPath, longerPath] = actualQALevel.length < targetQALevel.length 
        ? [actualQALevel, targetQALevel] 
        : [targetQALevel, actualQALevel];
    
    for (let i = 0; i < shorterPath.length; i++) {
        if (shorterPath[i] !== longerPath[i]) {
            console.error(`[QuickAccess] Chemin incohérent`, {
                from: actualQALevel,
                to: targetQALevel
            });
            return; // Le changement de niveau est invalide, les chemins ne sont pas alignés
        }
    }

    // Appliquer le changement de niveau en peuplant si besoin le nouveau niveau
    try {
        populateSubItems(config, targetQALevel);
        state.currentLevel = targetQALevel;
    } catch (error) {
        console.error(`[QuickAccess] Erreur lors du peuplement des subItems`, error);
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

    // Naviguer jusqu'à l'élément cible et obtenir son conteneur
    const { subItems: subItemsContent, item: itemContainer, itemId } = getItemAndSubItems(config, targetQALevel, 'populateSubItems');

    if (!itemContainer || !itemId) {
        return;
    }

    // Récupérer l'objet complet de l'item depuis son conteneur
    const targetItem = itemContainer[itemId];

    // Vérifier si subItems est une fonction à évaluer
    if (typeof targetItem.subItems === 'function') {
        console.log(`[QuickAccess] Peuplement des subItems pour le niveau`, targetQALevel);

        // Trouver l'élément DOM si nécessaire
        let element = targetItem.element;
        if (!element && targetItem.selector) {
            element = document.querySelector(targetItem.selector);
        }

        if (element) {
            // ⚠️ REMPLACEMENT PERMANENT : la fonction est remplacée par son résultat
            // Modifier directement dans le conteneur pour que le cache fonctionne
            const currentItemHotkey = targetItem.hotkey || null;
            const generatedSubItems = targetItem.subItems(element, currentItemHotkey);

            // ✅ Modifier directement la référence dans quickAccessConfig via le conteneur
            itemContainer[itemId].subItems = generatedSubItems;

            console.log(`[QuickAccess] SubItems peuplés avec succès pour`, targetQALevel);
        } else {
            console.warn(`[QuickAccess] Impossible de trouver l'élément pour peupler les subItems`, targetQALevel);
        }
    } else if (typeof targetItem.subItems === 'object') {
        // Les subItems ont déjà été générés (cache) ou sont statiques
        console.log(`[QuickAccess] Réutilisation du cache subItems pour`, targetQALevel);
    }

    console.log(`[QuickAccess] Configuration après peuplement pour le niveau`, targetQALevel, config);
}

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

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
 * S'assure que tous les items dans une configuration ont un hotkey
 * Génère automatiquement les hotkeys manquants en utilisant generateHotkeyFromText
 * @param {Object} config - Configuration à vérifier et compléter
 */
function ensureHotkeysForItems(config) {
    const usedHotkeys = new Set();

    // Première passe : collecter les hotkeys déjà définies
    for (const [itemId, item] of Object.entries(config)) {
        if (item.hotkey) {
            usedHotkeys.add(item.hotkey.toLowerCase());
        }
    }

    // Deuxième passe : générer les hotkeys manquants
    for (const [itemId, item] of Object.entries(config)) {
        if (!item.hotkey) {
            // Déterminer le texte source pour la génération de hotkey
            let sourceText = itemId; // Fallback : utiliser l'ID
            
            // Essayer d'obtenir un texte plus significatif
            if (item.description) {
                sourceText = item.description;
            } else if (item.selector) {
                // Essayer de récupérer le texte de l'élément
                const element = document.querySelector(item.selector);
                if (element && element.textContent) {
                    sourceText = element.textContent.trim();
                } else if (element) {
                    sourceText = element.getAttribute('title') || element.getAttribute('alt') || itemId;
                }
            }
            
            const generatedHotkey = generateHotkeyFromText(sourceText, usedHotkeys);
            item.hotkey = generatedHotkey;
            usedHotkeys.add(generatedHotkey);
            
            console.log(`[QuickAccess] Hotkey "${generatedHotkey}" générée automatiquement pour "${itemId}" basé sur "${sourceText}"`);
        }
    }
}

/**
 * Génère un hotkey basé sur la première lettre disponible du texte
 * @param {string} text - Texte à analyser
 * @param {Set} usedHotkeys - Ensemble des hotkeys déjà utilisées
 * @returns {string} Hotkey générée
 */
function generateHotkeyFromText(text, usedHotkeys) {
    // Nettoyer le texte et le convertir en minuscules
    const cleanText = text.toLowerCase().trim();
    
    // Essayer chaque lettre du texte dans l'ordre
    for (const char of cleanText) {
        // Ne considérer que les lettres et chiffres
        if (/[a-z0-9]/.test(char) && !usedHotkeys.has(char)) {
            return char;
        }
    }
    
    // Si aucune lettre du texte n'est disponible, parcourir tous les caractères disponibles
    const availableChars = 'abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
    for (const char of availableChars) {
        if (!usedHotkeys.has(char)) {
            return char;
        }
    }
    
    // Si vraiment tous les caractères sont pris, lever une erreur
    console.error('[QuickAccess] Plus aucune hotkey disponible ! Configuration trop large (plus de 65 items au même niveau).');
}

// ============================================================================
// INTERFACE UTILISATEUR - OVERLAY ET TOOLTIPS
// ============================================================================

/**
 * Crée et affiche l'overlay semi-transparent
 * @returns {HTMLElement} L'élément overlay créé
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
 * @param {string} selector - Sélecteur CSS de l'élément
 * @param {string} hotkey - Touche de raccourci
 * @param {boolean} hasDoubleTap - Indique si un double-tap est disponible
 * @param {boolean} isContainerOnly - Indique si l'item sert uniquement de conteneur pour la navigation (pas d'action directe)
 */
function createTooltip(selector, hotkey, hasDoubleTap = false, isContainerOnly = false) {
    const element = document.querySelector(selector);
    console.log(`[QuickAccess] Création du tooltip pour la touche "${hotkey}" sur l'élément:`, element, "Selector:", selector);
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
        color: #000000;
        font-size: 1em;
        background-color: rgba(240, 240, 240, 0.50);
        padding: 4px 8px;
        border-radius: 10px;
        pointer-events: none;
        white-space: nowrap;
        z-index: 99999;
        top: ${rect.top + rect.height * 0.55}px;
        left: ${rect.left}px;
        height: auto;
        line-height: normal;
        display: inline-block;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    `;

    // Si double-tap disponible, mettre le background en bleu
    if (hasDoubleTap) {
        tooltip.style.backgroundColor = 'rgba(0, 123, 255, 0.125)'; // Bleu clair avec transparence
    }
    // Si l'item est un conteneur pur (sert uniquement à la navigation vers subItems),
    // mettre en évidence l'élément DOM avec un outline pour le distinguer visuellement
    if (isContainerOnly) {
        // Sauvegarder les styles originaux
        saveElementStyles(element, {
            outline: element.style.outline || '',
            outlineOffset: element.style.outlineOffset || '',
            border: element.style.border || '',
            boxShadow: element.style.boxShadow || ''
        });
        
        // Appliquer l'entourage
        element.style.outline = '2px solid rgba(0, 123, 255, 0.8)';
        element.style.outlineOffset = '2px';
        element.classList.add('wh-quickaccess-highlighted');
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

    const entries = Object.entries(flattenedConfig);
    const isAtChildLevel = state.currentLevel.length > 0;
    const isAtRoot = state.currentLevel.length === 0;

    for (let i = 0; i < entries.length; i++) {
        const [itemId, item] = entries[i];
        const isCurrentItem = isAtChildLevel && i === 0;
        
        // Si c'est l'item actuel et que doubleTap est null, ne pas afficher le tooltip
        if (isCurrentItem && item.onDoubleTap === null) {
            console.log(`[QuickAccess] Item actuel "${itemId}" ignoré (onDoubleTap est null)`);
            continue;
        }
        
        const hasDoubleTap = item.onDoubleTap != null;
        // Un item sans doubleTap à la racine est un conteneur pur :
        // il ne peut pas être une cible finale, il sert uniquement à naviguer vers ses subItems
        const isContainerOnly = isAtRoot && !hasDoubleTap;
        
        console.log(`[QuickAccess] Traitement de l'item "${itemId}" pour affichage du tooltip:`, item, "Selector:", item.selector, "Hotkey:", item.hotkey, "HasDoubleTap:", hasDoubleTap, "IsContainerOnly:", isContainerOnly);
        createTooltip(item.selector, item.hotkey, hasDoubleTap, isContainerOnly);
    }
}

/**
 * Suppression de tous les tooltips affichés
 */
function clearAllTooltips() {
    const tooltips = document.querySelectorAll('.wh-quickaccess-tooltip');
    tooltips.forEach(tooltip => tooltip.remove());
    
    // Supprimer les entourages des éléments mis en valeur
    const highlightedElements = document.querySelectorAll('.wh-quickaccess-highlighted');
    highlightedElements.forEach(element => {
        restoreElementStyles(element);
        element.classList.remove('wh-quickaccess-highlighted');
    });
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

    // Remettre tout les éléments à leur place
    revertMovedElement();
}

// ============================================================================
// UTILITAIRES DE SAUVEGARDE/RESTAURATION DE STYLES
// ============================================================================

/**
 * Sauvegarde les styles d'un élément pour pouvoir les restaurer plus tard
 * @param {HTMLElement} element - L'élément dont on veut sauvegarder les styles
 * @param {Object} styles - Objet contenant les styles à sauvegarder {propName: value}
 */
function saveElementStyles(element, styles) {
    if (!element || !styles) return;
    
    element.dataset.originalStyles = JSON.stringify(styles);
}

/**
 * Restaure les styles originaux d'un élément sauvegardés précédemment
 * @param {HTMLElement} element - L'élément dont on veut restaurer les styles
 */
function restoreElementStyles(element) {
    if (!element || !element.dataset.originalStyles) return;
    
    const styles = JSON.parse(element.dataset.originalStyles);
    Object.entries(styles).forEach(([prop, value]) => {
        element.style[prop] = value;
    });
    
    delete element.dataset.originalStyles;
}

// ============================================================================
// FONCTIONS SPÉCIFIQUES AUX MENUS
// ============================================================================

/** 
 * Horizontal menu pseudo-mouseover : simule un mouseover en dispatchant un événement personnalisé
 * valable uniquement pour les éléments du menu horizontal haut dans la page d’accueil
 */
function horizontalMenuPseudoMouseover(element, state) {
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

                    // Sauvegarder les styles originaux pour pouvoir les restaurer
                    saveElementStyles(submenu, {
                        position: submenu.style.position,
                        left: submenu.style.left,
                        top: submenu.style.top,
                        zIndex: submenu.style.zIndex
                    });

                    // Marquer comme repositionné et associer au niveau de navigation actuel
                    submenu.classList.add('wh-qa-repositioned');
                    submenu.dataset.qaLevel = JSON.stringify(state.currentLevel);

                    // Appliquer la nouvelle position
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
 * Revert du repositionnement de tout ou partie des sous-menus horizontaux
 */
function revertMovedElement(QALevelTarget) {
    const repositionnedClass = 'wh-qa-repositioned';
    const movedElements = QALevelTarget 
        ? document.querySelectorAll(`[data-qa-level='${QALevelTarget}']`) 
        : document.querySelectorAll(`.${repositionnedClass}`);

    movedElements.forEach(submenu => {
        restoreElementStyles(submenu);
        submenu.classList.remove(repositionnedClass);
        delete submenu.dataset.qaLevel;
        console.log(`[QuickAccess] Sous-menu restauré à sa position originale:`, submenu);
    });
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
 * Génère récursivement les sous-items du menu W (sidebar) à partir de l'élément DOM du sous-menu
 * ⚠️ NE GÉNÈRE PAS les hotkeys - cela sera fait par ensureHotkeysForItems()
 * @param {HTMLElement} submenuElement - Élément ul du menu W
 * @param {string} parentId - ID du parent pour générer les clés
 * @returns {Object} Configuration des sous-items
 */
function generateWMenuSubItems(submenuElement, parentId) {
    console.error('[QuickAccess] generateWMenuSubItems déclenché mais pas encore implémenté');
    // TODO: Implémenter de façon similaire à generateHorizMenuSubItems
    // mais sans générer les hotkeys (elles seront générées par ensureHotkeysForItems)
    return {};
}


/**
 * Génère récursivement les sous-items du menu horizontal à partir de l'élément DOM du sous-menu
 * ⚠️ NE GÉNÈRE PAS les hotkeys - cela sera fait par ensureHotkeysForItems()
 * @param {HTMLElement} submenuElement - Élément ul.nav-menu__submenu
 * @param {string} parentId - ID du parent pour générer les clés
 * @returns {Object} Configuration des sous-items
 */
function generateHorizMenuSubItems(submenuElement, parentId) {
    const subItems = {};

    // Récupérer tous les liens directs de ce niveau
    const menuItems = submenuElement.querySelectorAll(':scope > li > a');

    let itemIndex = 1;
    menuItems.forEach(link => {
        const parentLi = link.parentElement;
        const linkText = link.textContent.trim();

        // Chercher un sous-menu de niveau suivant
        const hasArrow = link.classList.contains('nav-icon__link--arrow-right');
        const nextLevelSubmenu = parentLi.querySelector('.nav-menu__submenu--level2');

        const itemId = `${parentId}_item_${itemIndex}`;
        itemIndex++;

        // Générer un sélecteur valide : utiliser l'id existant ou en créer un
        let selector;
        if (link.id) {
            selector = `#${link.id}`;
        } else {
            // Créer un id unique pour cet élément
            const uniqueId = `wh-qa-${itemId}`;
            link.id = uniqueId;
            selector = `#${uniqueId}`;
        }

        const item = {
            selector: selector,
            description: linkText, // Stocker le texte pour la génération de hotkey ultérieure
            onTap: hasArrow ? 'horizontal_menu_pseudomouseover' : 'clic'
        };

        // Si a un sous-menu, configurer le double-tap pour ouvrir directement
        if (nextLevelSubmenu) {
            item.onDoubleTap = 'clic';
            item.subItems = function (el) {
                return generateHorizMenuSubItems(nextLevelSubmenu, itemId);
            };
        }

        subItems[itemId] = item;
    });

    return subItems;
}
