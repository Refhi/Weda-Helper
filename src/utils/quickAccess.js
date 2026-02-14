/**
 * @file quickAccess.js
 * @description Système de navigation rapide par raccourcis clavier avec affichage d'infobulles.
 * Permet d'activer un mode "Quick Access" où tous les éléments configurés affichent
 * une lettre de raccourci pour y accéder rapidement.
 * 
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

function returnQuickAccessConfig() {
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
     * 
     * Nomenclature : (à des fin de commentaire uniquement)
     * - un item de REGROUPEMENT est un item sans onTap ni onDoubleTap
     * - un item TERMINAL est un item sans subItems
     * - un item ACTION est un item avec une action onTap ou onDoubleTap, qu'il ait ou non des subItems
     */

    // ================= Configuration spécifique à la page d’accueil =================
    // ================= Bandeau supérieur de la page d’accueil =================
    const bandeauSuperieurConfig = {
        'large_top_menu': {
            selector: 'table.bandeau',
            subItems: {
                'recherche_patient_input': {
                    selector: '#TextBoxFindPatient',
                    onTap: function(element) {
                        element.focus();
                        element.select();
                    }
                },
                'coller_presse_papiers': {
                    selector: 'span[title="Coller le contenu du presse-papiers"]',
                    onTap: 'clic'
                },
                'aide': {
                    selector: '#ImageAide',
                    onTap: 'clic'
                },
                'vidal': {
                    selector: '#ImageVidal',
                    onTap: 'clic'
                },
                'vidal_recos': {
                    selector: '#ImageRoco',
                    onTap: 'clic'
                },
                'expert_weda': {
                    selector: '#ImageButtonExpertWeda',
                    onTap: 'clic'
                },
                'negatoscope': {
                    selector: '#ImageNegatoscope',
                    onTap: 'clic'
                },
                'messagerie': {
                    selector: '.messagerieWidget',
                    onTap: 'clic'
                },
                'postits': {
                    selector: '#postitWidget_divContainer',
                    onTap: 'clic'
                },
                'lecture_cps': {
                    selector: 'vz-lecture-cps-widget button[mat-raised-button]',
                    onTap: 'clic'
                },
                'idomed': {
                    selector: '#idomed_icon img[alt="idomed"]',
                    onTap: 'clic'
                },
                'resultats_icon': {
                    selector: 'resultats-icon div.icon',
                    onTap: 'clic'
                },
                'weda_connect': {
                    selector: 'weda-connect-update-invite div.icon',
                    onTap: 'clic'
                },
                'deconnexion': {
                    selector: '.imgDeconnexion',
                    onTap: 'clic'
                }
            }
        }
    };

    // ================= Eléments principaux du Bandeau supérieur =================
    const menuHorizontalConfig = {
        'medical': {
            selector: '#nav-menu > li > a.nav-icon__link--doctor',
            hotkey: 'm',
            onTap: function(element, state) { horizontalMenuPseudoMouseover(element, state); },
            onDoubleTap: 'clic',
            subItems: function (element) {
                const submenu = element.parentElement.querySelector('.nav-menu__submenu--level1');
                return submenu ? generateHorizMenuSubItems(submenu, 'medical') : {};
            }
        },

        'applicatifs': {
            selector: '#nav-menu > li > a.nav-icon__link--tools',
            hotkey: 'p',
            onTap: function(element, state) { horizontalMenuPseudoMouseover(element, state); },
            onDoubleTap: 'clic',
            subItems: function (element) {
                const submenu = element.parentElement.querySelector('.nav-menu__submenu--level1');
                return submenu ? generateHorizMenuSubItems(submenu, 'applicatifs') : {};
            }
        },

        'gestion': {
            selector: '#nav-menu > li > a.nav-icon__link--safe-open',
            hotkey: 'g',
            onTap: function(element, state) { horizontalMenuPseudoMouseover(element, state); },
            onDoubleTap: 'clic',
            subItems: function (element) {
                const submenu = element.parentElement.querySelector('.nav-menu__submenu--level1');
                return submenu ? generateHorizMenuSubItems(submenu, 'gestion') : {};
            }
        },

        'parametres': {
            selector: '#nav-menu > li > a.nav-icon__link--mixing-desk',
            hotkey: 'e',
            onTap: function(element, state) { horizontalMenuPseudoMouseover(element, state); },
            onDoubleTap: 'clic',
            subItems: function (element) {
                const submenu = element.parentElement.querySelector('.nav-menu__submenu--level1');
                return submenu ? generateHorizMenuSubItems(submenu, 'parametres') : {};
            }
        }
    };

    // ================= Menu vertical gauche (sidebar) de la page d’accueil =================
    const sidebarConfig = {
        'menu_vertical_gauche': {
            selector: ".menu-sidebar",
            onTap: null,
            onDoubleTap: null,
            subItems: {
                // Menu W - Navigation événements
                'menu_w_sidebar': {
                    selector: '#ContentPlaceHolder1_MenuNavigate > ul.level1 > li > a.level1',
                    onTap: function(element, state) { WMenuPseudoMouseover(element, state); },
                    onDoubleTap: 'clic',
                    subItems: function (element) {
                        const parentLi = element.parentElement;
                        const submenu = parentLi?.querySelector('ul.level2.dynamic');
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
                    onTap: function(element, state) { peripheriquesPseudoMouseover(element, state); },
                    onDoubleTap: 'clic',
                    subItems: function (element) {
                        const submenu = element.querySelector('#ContentPlaceHolder1_MenuPeripherique ul.level2.dynamic');
                        return submenu ? generateWMenuSubItems(submenu, 'peripheriques') : {};
                    }
                },

                // Recherche patient
                'recherche_sidebar': {
                    selector: '.imgChercher',
                    onTap: 'clic'
                },

                // Ajouter patient
                'ajouter_patient': {
                    selector: '.imgAddNewPatient',
                    onTap: 'clic'
                },

                // Documents
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
                    onTap: function(element, state) { documentsJointsPseudoMouseover(element, state); },
                    onDoubleTap: 'clic',
                    subItems: function (element) {
                        const submenu = document.querySelector('#DivMenuDocumentJoint table');
                        return submenu ? generateDocumentsJointsSubItems(submenu, 'documents_joints') : {};
                    }
                },

                'arrets_travail': {
                    selector: '#ContentPlaceHolder1_ButtonAT',
                    onTap: 'clic'
                },

                // Menu impression
                'impression': {
                    selector: '#ContentPlaceHolder1_MenuPrint > ul.level1.static',
                    onTap: function(element, state) { impressionPseudoMouseover(element, state); },
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

    // ================= éléments internes =====================
    /** Éléments internes - Items terminaux
     * Cette partie gère les éléments avec lesquels l'utilisateur peut interagir à la souris.
     * 
     * cf. @generateInternalSubItems pour la logique de génération des subItems de ces éléments internes
     * 
     */

    const internalElementsConfig = {
        'panel_patient': {
            selector: '#ContentPlaceHolder1_PanelPatient',
            subItems: function(element) {
                return generateInternalSubItems(element);
            }
        },
        'documents_joints_visu': {
            selector: '#ContentPlaceHolder1_PanelVisuDocument',
            subItems: function(element) {
                return generateInternalSubItems(element);
            }
        },
        'copilot_vidal': {
            selector: '.copilot-vidal-project',
            subItems: function(element) {
                return generateInternalSubItems(element);
            }
        },
        'iframes': {
            selector: 'iframe',
            subItems: function(element) {
                return generateInternalSubItems(element);
            }
        }
    };

    // ================= Configuration finale =================
    const quickAccessConfig = {
        ...bandeauSuperieurConfig,
        ...menuHorizontalConfig,
        ...sidebarConfig,
        ...internalElementsConfig
    };

    return quickAccessConfig;
}

// ============================================================================
// POINT D'ENTRÉE ET INITIALISATION
// ============================================================================

/** 
 * Fonction d'entrée de activation du Quick Access
*/
function activateQuickAccess() {
    // Les objets de conf sont définies ici pour être réinitialisées à chaque activation du Quick Access et éviter les problèmes de cache
    const quickAccessConfig = returnQuickAccessConfig();
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
                    revertMovedElement(state.currentLevel);
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

    // Ne rien exécuter si l'action est null/undefined
    if (action) {
        executeAction(action, targetElementSelector, state);
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
                // D'abord vérifier si l'élément possède un href
                // auquel cas on passera par clicCSPLockedElement pour éviter les problèmes de CSP
                if (element.tagName.toLowerCase() === 'a' && element.href) {
                    clicCSPLockedElement(selector);
                } else {
                    element.dispatchEvent(new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    }));
                }
                break;
            case 'mouseover':
                element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
                break;
            case 'enter':
                element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                break;
            default:
                console.error(`[QuickAccess] Action de type string non reconnue : "${action}"`);
        }
    } else if (typeof action === 'function') {
        action(element, state);
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
            if (item.selector) {
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

            // console.log(`[QuickAccess] Hotkey "${generatedHotkey}" générée automatiquement pour "${itemId}" basé sur "${sourceText}"`);
        }
    }
}

/**
 * Génère un hotkey basé sur la première lettre disponible du texte
 * Hiérarchie : lettres → chiffres → caractères spéciaux
 * @param {string} text - Texte à analyser
 * @param {Set} usedHotkeys - Ensemble des hotkeys déjà utilisées
 * @returns {string} Hotkey générée
 */
function generateHotkeyFromText(text, usedHotkeys) {
    // Nettoyer le texte et le convertir en minuscules
    const cleanText = text.toLowerCase().trim();

    // 1. Essayer les lettres du texte
    for (const char of cleanText) {
        if (/[a-z]/.test(char) && !usedHotkeys.has(char)) {
            return char;
        }
    }

    // 2. Si aucune lettre du texte n'est disponible, essayer toutes les lettres
    const allLetters = 'abcdefghijklmnopqrstuvwxyz';
    for (const char of allLetters) {
        if (!usedHotkeys.has(char)) {
            return char;
        }
    }

    // 3. Si toutes les lettres sont prises, essayer les chiffres du texte
    for (const char of cleanText) {
        if (/[0-9]/.test(char) && !usedHotkeys.has(char)) {
            return char;
        }
    }

    // 4. Si aucun chiffre du texte n'est disponible, essayer tous les chiffres
    const allDigits = '0123456789';
    for (const char of allDigits) {
        if (!usedHotkeys.has(char)) {
            return char;
        }
    }

    // 5. Si tous les chiffres sont pris, essayer les caractères spéciaux du texte
    for (const char of cleanText) {
        if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]/.test(char) && !usedHotkeys.has(char)) {
            return char;
        }
    }

    // 6. Si aucun caractère spécial du texte n'est disponible, essayer tous les caractères spéciaux
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
    for (const char of specialChars) {
        if (!usedHotkeys.has(char)) {
            return char;
        }
    }

    // Si vraiment tous les caractères sont pris, lever une erreur
    console.error('[QuickAccess] Plus aucune hotkey disponible ! Configuration trop large (plus de 75 items au même niveau).');
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
        pointer-events: auto;
        cursor: default;
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
/**
 * Crée et affiche un tooltip sur un élément
 * @param {string} selector - Sélecteur CSS de l'élément
 * @param {string} hotkey - Touche de raccourci
 * @param {boolean} hasDoubleTap - Indique si un double-tap est disponible
 * @param {boolean} isContainerOnly - Indique si l'item sert uniquement de conteneur pour la navigation (pas d'action directe)
 */
function createTooltip(selector, hotkey, hasDoubleTap = false, isContainerOnly = false) {
    const element = document.querySelector(selector);
    // console.log(`[QuickAccess] Création du tooltip pour la touche "${hotkey}" sur l'élément:`, element, "Selector:", selector);
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
        top: ${rect.top + rect.height * 0.15}px;
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

        // console.log(`[QuickAccess] Traitement de l'item "${itemId}" pour affichage du tooltip:`, item, "Selector:", item.selector, "Hotkey:", item.hotkey, "HasDoubleTap:", hasDoubleTap, "IsContainerOnly:", isContainerOnly);
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
 * Fonction support commune pour préparer un sous-menu à être affiché/repositionné
 * Gère les étapes communes : vérification, recherche du sous-menu, sauvegarde des styles, marquage
 * @param {HTMLElement} element - L'élément déclencheur
 * @param {string} submenuSelector - Le sélecteur CSS pour trouver le sous-menu
 * @param {Object} state - L'état actuel de QuickAccess
 * @param {string} contextName - Nom du contexte pour les logs (ex: 'HorizontalMenu', 'WMenu')
 * @returns {{submenu: HTMLElement|null, parentLi: HTMLElement|null}} Le sous-menu trouvé et son parent li
 */
function prepareSubmenuForDisplay(element, submenuSelector, state, contextName) {
    if (!element) {
        console.warn(`[QuickAccess][${contextName}] Impossible de préparer le sous-menu : élément manquant`);
        return { submenu: null, parentLi: null };
    }

    // Trouver le parent li
    const parentLi = element.closest('li');
    if (!parentLi) {
        console.error(`[QuickAccess][${contextName}] Élément li parent non trouvé`);
        return { submenu: null, parentLi: null };
    }

    // Trouver le sous-menu
    const submenu = parentLi.querySelector(submenuSelector);
    if (!submenu) {
        console.log(`[QuickAccess][${contextName}] Pas de sous-menu pour cet élément`);
        return { submenu: null, parentLi };
    }

    // Sauvegarder les styles originaux du sous-menu
    saveElementStyles(submenu, {
        display: submenu.style.display || '',
        position: submenu.style.position || '',
        top: submenu.style.top || '',
        left: submenu.style.left || '',
        right: submenu.style.right || '',
        zIndex: submenu.style.zIndex || ''
    });

    // Marquer comme repositionné et associer au niveau de navigation actuel
    submenu.classList.add('wh-qa-repositioned');
    submenu.dataset.qaLevel = JSON.stringify(state?.currentLevel || []);

    return { submenu, parentLi };
}

/** 
 * Horizontal menu pseudo-mouseover : simule un mouseover en dispatchant un événement personnalisé
 * valable uniquement pour les éléments du menu horizontal haut dans la page d'accueil
 */
function horizontalMenuPseudoMouseover(element, state) {
    // Utiliser la fonction support pour préparer le sous-menu
    const { submenu } = prepareSubmenuForDisplay(element, '.nav-menu__submenu', state, 'HorizontalMenu');
    
    if (!submenu) {
        return;
    }

    // Logique spécifique au menu horizontal : repositionner si hors viewport
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

        // Appliquer la nouvelle position
        submenu.style.position = 'fixed';
        submenu.style.left = newLeft + 'px';
        submenu.style.top = newTop + 'px';
        submenu.style.zIndex = '10000';

        console.log(`[QuickAccess] Sous-menu repositionné à left=${newLeft}, top=${newTop}`);
    }
}

/** 
 * Revert du repositionnement de tout ou partie des sous-menus (horizontaux et W menu)
 * Gestion unifiée via restoreElementStyles qui restaure tous les styles sauvegardés
 */
function revertMovedElement(QALevelTarget) {
    const repositionnedClass = 'wh-qa-repositioned';
    const movedElements = QALevelTarget
        ? document.querySelectorAll(`[data-qa-level='${JSON.stringify(QALevelTarget)}']`)
        : document.querySelectorAll(`.${repositionnedClass}`);

    console.log(`[QuickAccess] Revert des éléments déplacés pour le niveau ${QALevelTarget || 'tous les niveaux'}`, movedElements);

    movedElements.forEach(submenu => {
        // Restaurer TOUS les styles originaux (display, position, left, right, top, etc.)
        // via restoreElementStyles de façon unifiée
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
function WMenuPseudoMouseover(element, state) {
    // Utiliser la fonction support pour préparer le sous-menu
    const { submenu } = prepareSubmenuForDisplay(element, 'ul[class*="level"][class*="dynamic"]', state, 'WMenu');
    
    if (!submenu) {
        return;
    }

    // Logique spécifique au menu W : affichage et positionnement simple
    // Le menu W utilise une structure différente avec display:none/block
    submenu.style.display = 'block';

    // Pour le menu W, les sous-menus s'affichent à droite (left: 100%) et alignés en haut (top: 0)
    submenu.style.position = 'absolute';
    submenu.style.top = '0px';
    submenu.style.left = '100%';
}

/**
 * Menu Périphériques pseudo-mouseover
 * Gère l'affichage du sous-menu des périphériques (#ContentPlaceHolder1_MenuPeripherique)
 */
function peripheriquesPseudoMouseover(element, state) {
    // Le menu périphériques a une structure spéciale : le sous-menu est dans #ContentPlaceHolder1_MenuPeripherique
    const submenu = document.querySelector('#ContentPlaceHolder1_MenuPeripherique ul.level2.dynamic');
    
    if (!submenu) {
        console.warn('[QuickAccess][Peripheriques] Sous-menu non trouvé');
        return;
    }

    // Sauvegarder les styles originaux
    saveElementStyles(submenu, {
        display: submenu.style.display || '',
        position: submenu.style.position || '',
        top: submenu.style.top || '',
        left: submenu.style.left || '',
        zIndex: submenu.style.zIndex || ''
    });

    // Marquer comme repositionné
    submenu.classList.add('wh-qa-repositioned');
    submenu.dataset.qaLevel = JSON.stringify(state?.currentLevel || []);

    // Positionner le sous-menu à droite de l'élément déclencheur
    const rect = element.getBoundingClientRect();
    submenu.style.display = 'block';
    submenu.style.position = 'fixed';
    submenu.style.top = rect.top + 'px';
    submenu.style.left = (rect.right + 5) + 'px';
    submenu.style.zIndex = '10000';

    console.log('[QuickAccess][Peripheriques] Sous-menu affiché et repositionné');
}

/**
 * Menu Documents Joints pseudo-mouseover
 * Gère l'affichage du menu déroulant des documents joints (#DivMenuDocumentJoint)
 */
function documentsJointsPseudoMouseover(element, state) {
    const submenu = document.querySelector('#DivMenuDocumentJoint');
    
    if (!submenu) {
        console.warn('[QuickAccess][DocumentsJoints] Sous-menu non trouvé');
        return;
    }

    // Sauvegarder les styles originaux
    saveElementStyles(submenu, {
        display: submenu.style.display || '',
        position: submenu.style.position || '',
        top: submenu.style.top || '',
        left: submenu.style.left || '',
        zIndex: submenu.style.zIndex || ''
    });

    // Marquer comme repositionné
    submenu.classList.add('wh-qa-repositioned');
    submenu.dataset.qaLevel = JSON.stringify(state?.currentLevel || []);

    // Positionner le sous-menu à droite de l'élément déclencheur
    const rect = element.getBoundingClientRect();
    submenu.style.display = 'block';
    submenu.style.position = 'fixed';
    submenu.style.top = rect.top + 'px';
    submenu.style.left = (rect.right + 5) + 'px';
    submenu.style.zIndex = '10000';

    console.log('[QuickAccess][DocumentsJoints] Sous-menu affiché et repositionné');
}

/**
 * Menu Impression pseudo-mouseover
 * Gère l'affichage du sous-menu d'impression (#ContentPlaceHolder1_MenuPrint)
 */
function impressionPseudoMouseover(element, state) {
    // Le menu impression a une structure similaire au menu W standard
    const submenu = element.querySelector('ul.level2.dynamic');
    
    if (!submenu) {
        console.warn('[QuickAccess][Impression] Sous-menu non trouvé');
        return;
    }

    // Sauvegarder les styles originaux
    saveElementStyles(submenu, {
        display: submenu.style.display || '',
        position: submenu.style.position || '',
        top: submenu.style.top || '',
        left: submenu.style.left || '',
        zIndex: submenu.style.zIndex || ''
    });

    // Marquer comme repositionné
    submenu.classList.add('wh-qa-repositioned');
    submenu.dataset.qaLevel = JSON.stringify(state?.currentLevel || []);

    // Positionner le sous-menu à droite de l'élément déclencheur
    const rect = element.getBoundingClientRect();
    submenu.style.display = 'block';
    submenu.style.position = 'fixed';
    submenu.style.top = rect.top + 'px';
    submenu.style.left = (rect.right + 5) + 'px';
    submenu.style.zIndex = '10000';

    console.log('[QuickAccess][Impression] Sous-menu affiché et repositionné');
}


/**
 * Génère les sous-items du menu Documents Joints à partir de la table HTML
 * Structure spéciale : table avec des td contenant onclick
 * @param {HTMLElement} tableElement - Élément table du menu documents joints
 * @param {string} parentId - ID du parent pour générer les clés
 * @returns {Object} Configuration des sous-items
 */
function generateDocumentsJointsSubItems(tableElement, parentId) {
    const subItems = {};

    if (!tableElement) {
        console.error('[QuickAccess][DocumentsJoints] generateDocumentsJointsSubItems : tableElement est null');
        return subItems;
    }

    // Récupérer tous les td cliquables (ceux avec onclick)
    const menuItems = tableElement.querySelectorAll('td.menutddocjoint[onclick]');

    console.log(`[QuickAccess][DocumentsJoints] Génération des subItems pour "${parentId}" : ${menuItems.length} items trouvés`);

    let itemIndex = 1;
    menuItems.forEach(td => {
        // Extraire le texte du td (en cherchant dans les nested tables)
        const textElement = td.querySelector('td[valign="middle"]');
        let textContent = textElement ? textElement.textContent.trim() : td.textContent.trim();

        if (!textContent) {
            console.warn('[QuickAccess][DocumentsJoints] TD sans texte trouvé, ignoré');
            return;
        }

        // Générer un ID unique basé sur le texte nettoyé
        const cleanText = textContent
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');

        const itemId = `${parentId}_${cleanText}_${itemIndex}`;
        itemIndex++;

        // Créer un sélecteur sûr : toujours utiliser un ID
        // Les sélecteurs par attribut (onclick) peuvent contenir des caractères spéciaux invalides
        let selector;
        if (!td.id) {
            const uniqueId = `wh-qa-docjoint-${itemId}`;
            td.id = uniqueId;
            selector = `#${uniqueId}`;
        } else {
            selector = `#${td.id}`;
        }

        // Créer l'item de configuration
        const item = {
            selector: selector,
            hotkey: null, // Sera généré automatiquement
            onTap: 'clic', // Les items sont directement cliquables
            element: td
        };

        subItems[itemId] = item;
    });

    console.log(`[QuickAccess][DocumentsJoints] ${Object.keys(subItems).length} items générés pour "${parentId}"`);
    return subItems;
}


/**
 * Génère récursivement les sous-items du menu W (sidebar) à partir de l'élément DOM du sous-menu
 * ⚠️ NE GÉNÈRE PAS les hotkeys - cela sera fait par ensureHotkeysForItems()
 * @param {HTMLElement} submenuElement - Élément ul du menu W (ul.level2.dynamic, ul.level3.dynamic, etc.)
 * @param {string} parentId - ID du parent pour générer les clés
 * @returns {Object} Configuration des sous-items
 */
function generateWMenuSubItems(submenuElement, parentId) {
    const subItems = {};

    if (!submenuElement) {
        console.error('[QuickAccess][WMenu] generateWMenuSubItems : submenuElement est null');
        return subItems;
    }

    // Déterminer le niveau actuel depuis la classe (level2, level3, etc.)
    const currentLevelMatch = submenuElement.className.match(/level(\d+)/);
    const currentLevel = currentLevelMatch ? parseInt(currentLevelMatch[1]) : 2;
    const nextLevel = currentLevel + 1;

    console.log(`[QuickAccess][WMenu] Génération des subItems pour "${parentId}" (niveau ${currentLevel})`);

    // Récupérer tous les liens directs de ce niveau
    // Structure : ul.levelX.dynamic > li > a.levelX.dynamic
    const menuItems = submenuElement.querySelectorAll(':scope > li > a');

    let itemIndex = 1;
    menuItems.forEach(link => {
        // Extraire le texte du lien (sans l'image)
        const textContent = link.textContent?.trim() || '';

        if (!textContent) {
            console.warn(`[QuickAccess][WMenu] Lien sans texte trouvé au niveau ${currentLevel}, ignoré`);
            return;
        }

        // Générer un ID unique basé sur le texte nettoyé et le niveau
        const cleanText = textContent
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
            .replace(/[^a-z0-9]/g, '_') // Remplacer les caractères spéciaux par _
            .replace(/_+/g, '_') // Remplacer les _ multiples par un seul
            .replace(/^_|_$/g, ''); // Supprimer les _ en début et fin

        const itemId = `${parentId}_lv${currentLevel}_${cleanText}_${itemIndex}`;
        itemIndex++;

        // Créer un sélecteur sûr : toujours utiliser un ID
        // Les sélecteurs par attribut (onclick, href) peuvent contenir des caractères spéciaux invalides
        let selector;
        if (!link.id) {
            const uniqueId = `wh-qa-wmenu-${itemId}`;
            link.id = uniqueId;
            selector = `#${uniqueId}`;
        } else {
            selector = `#${link.id}`;
        }

        // Vérifier s'il y a un sous-menu
        const parentLi = link.parentElement;
        const hasPopup = parentLi?.classList.contains('has-popup');
        let nestedSubmenu = null;

        if (hasPopup) {
            // Chercher le sous-menu du niveau suivant : ul.level3.dynamic, ul.level4.dynamic, etc.
            nestedSubmenu = parentLi.querySelector(`:scope > ul.level${nextLevel}.dynamic`);

            if (!nestedSubmenu) {
                console.warn(`[QuickAccess][WMenu] has-popup détecté mais aucun sous-menu ul.level${nextLevel}.dynamic trouvé pour "${textContent}"`);
            }
        }

        // Créer l'item de configuration
        const item = {
            selector: selector,
            hotkey: null, // Sera généré automatiquement par ensureHotkeysForItems
            onTap: nestedSubmenu ? function(element, state) { WMenuPseudoMouseover(element, state); } : 'clic',
            onDoubleTap: nestedSubmenu ? 'clic' : null,
            element: link // Sauvegarder la référence à l'élément pour un accès ultérieur
        };

        // Si sous-menu, ajouter une fonction pour le générer
        if (nestedSubmenu) {
            item.subItems = function (element) {
                const parentLi = element.parentElement;
                // Chercher spécifiquement le sous-menu du niveau suivant
                const submenu = parentLi?.querySelector(`:scope > ul.level${nextLevel}.dynamic`);

                if (submenu) {
                    return generateWMenuSubItems(submenu, itemId);
                } else {
                    console.warn(`[QuickAccess][WMenu] Impossible de trouver le sous-menu level${nextLevel} pour "${itemId}"`);
                    return {};
                }
            };
        }

        subItems[itemId] = item;
    });

    console.log(`[QuickAccess][WMenu] generateWMenuSubItems pour "${parentId}" (niveau ${currentLevel}) : ${Object.keys(subItems).length} items générés`);
    return subItems;
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
            onTap: hasArrow ? function(element, state) { horizontalMenuPseudoMouseover(element, state); } : 'clic'
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

/**
 * Génération des items génériques
 * Son usage est prévu pour être très large
 * 
 * Depuis l'élément initial fournis, on va devoir descendre récursivement dans le DOM
 * pour trouver les élements/items de REGROUPEMENT (donc sans onTap ou onDoubleTap), puis
 * les éléments/items d'ACTION
 * 
 * Les items considérés comme de REGROUPEMENT sont :
 * - toutes les iframes
 * - tout les éléments avec un très grand nombre de subItems (> 20)
 * 
 * Les items d'ACTION sont les éléments suivants : 
 * 1. Champs de formulaire :
 *    - input:not([type="hidden"]):not([disabled])
 *    - textarea:not([disabled])
 *    - select:not([disabled])
 * 
 * 2. Éléments cliquables :
 *    - a[href]
 *    - button:not([disabled])
 *    - [role="button"]:not([aria-disabled="true"])
 *    - [onclick], [ondblclick], [onmousedown] (tout élément avec event listener inline)
 * 
 * 3. Éléments avec tabindex >= 0 (focus clavier)
 * 
 * EXCLUSIONS automatiques : éléments non visibles ou désactivés
 * - display:none, visibility:hidden, opacity:0
 * - [disabled], [aria-disabled="true"]
 * - pointer-events:none
 *
 */
function generateInternalSubItems(element) {
    const subItems = {};

    const quickAccessTargets = `
        input:not([type="hidden"]):not([disabled]),
        textarea:not([disabled]),
        select:not([disabled]),
        a[href],
        button:not([disabled]),
        [role="button"]:not([aria-disabled="true"]),
        [onclick], [ondblclick], [onmousedown],
        [tabindex]:not([tabindex="-1"]),
        svg,
        [name='divwc']
    `;

    // Lister tous les éléments d'action potentiels dans le conteneur
    const allActionElements = element.querySelectorAll(quickAccessTargets);

    // Si aucun élément n'est trouvé, on renvoie null pour indiquer qu'aucun subItem n'est disponible à ce niveau
    if (allActionElements.length === 0) return null;

    // Pré-filtrer rapidement les éléments visibles dans le viewport (optimisation)
    const potentiallyVisibleElements = Array.from(allActionElements).filter(el => {
        // Éliminer d'abord les éléments clairement invisibles (offsetParent null = display:none ou parent caché)
        if (!el.offsetParent && !exceptionsToHiddenElements(el)) return false;

        // Conserver les exceptions
        if (exceptionsToHiddenElements(el)) {
            return true;
        }
        
        // Vérification rapide du viewport
        const rect = el.getBoundingClientRect();
        const isInViewport = rect.top < window.innerHeight && 
               rect.bottom > 0 && 
               rect.left < window.innerWidth && 
               rect.right > 0;
        
        return isInViewport;
    });

    if (potentiallyVisibleElements.length === 0) return null;

    // Filtrer pour ne garder que les éléments qui ne sont pas descendants d'une autre target
    const actionElements = potentiallyVisibleElements.filter(el => {
        // Trouver le parent le plus proche qui est une target (en excluant l'élément lui-même)
        let parent = el.parentElement;
        while (parent && parent !== element) {
            if (parent.matches(quickAccessTargets)) {
                // Vérifier si ce parent est lui-même une action valide
                const isVisible = parent.offsetParent !== null && 
                                 getComputedStyle(parent).visibility !== 'hidden' && 
                                 parseFloat(getComputedStyle(parent).opacity) > 0 &&
                                 getComputedStyle(parent).display !== 'none' &&
                                 getComputedStyle(parent).pointerEvents !== 'none';
                
                if (isVisible) {
                    // Ce parent est une target valide, donc on ignore l'enfant
                    return false;
                }
            }
            parent = parent.parentElement;
        }
        return true;
    });

    let itemIndex = 0; // Index pour générer des IDs uniques
    for (let i = 0; i < actionElements.length; i++) {
        const actionElement = actionElements[i];

        // Initialiser la configuration de l'item
        let itemId = null;
        const itemConfig = {
            selector: null,
            onTap: null,
            onDoubleTap: null,
            subItems: null,
        };

        // Vérifier si l'élément est considéré comme une action, un conteneur de regroupement, ou les deux
        const isProperAction = testProperActionElement(actionElement, quickAccessTargets);        
        const isGroupingContainer = testGroupingContainer(actionElement, quickAccessTargets);

        if (isProperAction && isGroupingContainer) {
            // Dans ce cas on a besoin de peupler de subItems, ET de prévoir un doubleTap pour accéder directement à l'action
            itemConfig.onDoubleTap = 'clic';
            itemConfig.subItems = function (el) {
                return generateInternalSubItems(el);
            };

        } else if (isProperAction) {
            // Dans ce cas, c'est un élément d'action simple, il faut un onTap, et pas de subItems
            itemConfig.onTap = 'clic';

        } else if (isGroupingContainer) {
            // Dans ce cas, c'est un conteneur de regroupement, il faut des subItems, et pas d'onTap
            // on peuple donc le subItems de cet élément en appelant récursivement generateInternalSubItems sur cet élément
            itemConfig.subItems = function (el) {
                return generateInternalSubItems(el);
            };

        } else {
            // Dans ce cas, c'est un élément qui n'est pas considéré comme une action ni comme un conteneur de regroupement, on l'ignore
            continue;
        }

        // Si on arrive à cette étape, il s'agit d'un item pertinent, on lui génère un ID unique
        itemId = generateUniqueQAItemId(actionElement, itemIndex++);

        // On doit également lui trouver un selecteur unique pour pouvoir le cibler précisément (id existant ou généré)
        itemConfig.selector = QASelectorFinder(actionElement, itemId);
        subItems[itemId] = itemConfig;
    }

    // On retourne un objet de subItems
    return subItems;
}

function testProperActionElement(element, quickAccessTargets) {
    const isActionElement = element.matches(quickAccessTargets);

    if (exceptionsToHiddenElements(element)) {
        // On fait un mouseOver sur l'élément
        element.dispatchEvent(new MouseEvent('mouseover', {bubbles: true, cancelable: true, view: window}));
        return true;
    }
    
    // Vérification complète de la visibilité
    const style = getComputedStyle(element);
    const isStyleVisible = element.offsetParent !== null && 
                     style.visibility !== 'hidden' && 
                     parseFloat(style.opacity) > 0 &&
                     style.display !== 'none' &&
                     style.pointerEvents !== 'none';
    
    if (!isActionElement || !isStyleVisible) {
        return false;
    }

    return true;
}

function exceptionsToHiddenElements(element) {
    /** Certains éléments doivent être de-hidden s'ils sont parcourus
     * 
     */
    const toUnHideSelectors = ['.document-actions', '.soc'];
    return toUnHideSelectors.some(selector => element.matches(selector) || element.closest(selector));
}

function testGroupingContainer(element, quickAccessTargets) {
    // Exceptions d'abord
    // console.log(`[QuickAccess] Test de regroupement pour l'élément ${element.tagName} avec le sélecteur "${element.className}"`);
    const isExceptionSelector = ["[name='divwc']"]
    if (isExceptionSelector.some(selector => element.matches(selector))) {
        console.log(`[QuickAccess] Élément ${element.tagName} considéré comme conteneur de regroupement en raison d'une exception de sélecteur`);
        return true;
    }
    
    const isIframe = element.tagName.toLowerCase() === 'iframe';
    const hasManyActionElements = element.querySelectorAll(quickAccessTargets).length > 20;
    return isIframe || hasManyActionElements;
}

function generateUniqueQAItemId(element, index) {
    /**
     * Construire un identifiant basé sur les caractéristiques de l'élément :
     * elementType_index
    */ 

    let identifier = '';

    if (element.tagName) {
        identifier += element.tagName.toLowerCase();
    } else {
        identifier += 'element';
    }

    if (element.className) {
        // Gérer les éléments SVG dont className est un SVGAnimatedString
        const classValue = typeof element.className === 'string' 
            ? element.className 
            : element.className.baseVal || '';
        
        if (classValue) {
            const classPart = classValue.trim().split(/\s+/).join('-');
            identifier += `_${classPart}`;
        }
    }

    identifier += `_${index}`;

    // Nettoyer l'identifiant pour qu'il soit valide (remplacer les caractères spéciaux par des underscores)
    identifier = identifier.replace(/[^a-zA-Z0-9_-]/g, '_');

    return identifier;
}


function QASelectorFinder(element, itemId) {
    if (element.id) {
        return `#${element.id}`;
    } else {
        // Assigner un ID DOM unique à l'élément
        const uniqueDomId = `wh-qa-${itemId}`;
        element.id = uniqueDomId;
        return `#${uniqueDomId}`;
    }
}