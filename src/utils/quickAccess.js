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
    addListenersToOverlay(overlay, actualQALevel, quickAccessConfig)

    // Le reste du flux est géré dans les listeners
}

function activateOverlay() {
    // Ajouter un overlay au document

    // TODO

    return overlayElement
}

function addListenersToOverlay(overlay, actualQALevel, config) {
    overlay.addEventListener('keydown', (e) => {
        handleQuickAccessKey(e, actualQALevel, config)
    })

    // On implémente aussi la touche terminale
    overlay.addEventListener('keyup', (e) => {
        if (e.key === 'Escape') {
            deactivateQuickAccess()
        }
    })
}

function handleQuickAccessKey(e, actualQALevel, config) {
    // TODO
}

/**
 * Renvoie la configuration du niveau actuel sous forme d'objet
 * Contient uniquement l'élément parent avec ses subItems immédiats
 * 
 * @param {string[]} actualQALevel - Chemin vers le niveau actuel (ex: [], ["menu_vertical_gauche"], ["menu_vertical_gauche", "menu_w_sidebar"])
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
function currentLevelConfig(actualQALevel, config) {
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
 * @param {Object} config - Configuration racine
 * @returns {boolean} true si le changement est valide, false sinon
 */
function moveToTargetConfig(targetQALevel, actualQALevel, config) {
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


