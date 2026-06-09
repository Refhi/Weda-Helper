/**
 * @file quickAccess.js
 * La configuration de Quick Access est définie dans quickAccessConfig.js
 * @description Système de navigation rapide par raccourcis clavier avec affichage d'infobulles.
 * Permet d'activer un mode "Quick Access" où tous les éléments configurés affichent
 * une lettre de raccourci pour y accéder rapidement.
 * 
 */

/**
 * Vérifie si l'URL actuelle correspond à au moins un des patterns fournis
 * @param {string} url - URL actuelle (généralement window.location.pathname)
 * @param {Array<string|RegExp>} patterns - Liste des patterns à tester (string pour inclusion, RegExp pour test)
 * @returns {boolean} True si l'URL correspond à au moins un pattern
 */
function matchesUrlPatterns(url, patterns) {
    if (!patterns || patterns.length === 0) {
        return false;
    }

    return patterns.some(pattern => {
        if (typeof pattern === 'string') {
            return url.includes(pattern);
        } else if (pattern instanceof RegExp) {
            return pattern.test(url);
        }
        return false;
    });
}

// ============================================================================
// POINT D'ENTRÉE ET INITIALISATION
// ============================================================================

/** 
 * Active le mode Quick Access.
 * Crée des listeners sur le document principal et tous les documents des iframes
 * pour capturer les événements clavier et affiche les tooltips de navigation.
 * 
 * @description Cette fonction initialise le système Quick Access en :
 * - Créant la configuration de navigation hiérarchique
 * - Ajoutant un message d'information à l'écran
 * - Installant des listeners keyboard sur tous les documents accessibles
 * - Affichant les tooltips du niveau racine
 */
function activateQuickAccess() {
    // La config est enveloppée dans un item racine virtuel '__root__' pour uniformiser
    // le comportement du niveau racine avec celui des sous-niveaux.
    // '__root__' est un item sans selector ni action : il est ignoré par showTooltips
    // exactement comme un item de regroupement ordinaire (onTap == null).
    const quickAccessConfig = {
        '__root__': {
            selector: null,
            onTap: null,
            onDoubleTap: null,
            subItems: returnQuickAccessConfig()
        }
    };

    /**
    * state.currentLevel correspond au niveau actuel du QuickAccess (QALevel)
    * C'est un tableau de clés représentant le chemin dans l'arborescence.
    * Exemples :
    * - ['__root__'] = niveau racine (items de la config principale)
    * - ['__root__', 'menu_vertical_gauche'] = premier niveau de profondeur
    * - ['__root__', 'menu_vertical_gauche', 'menu_w_sidebar'] = second niveau
    */
    const state = { // Objet pour la rémanence de l'état du Quick Access
        currentLevel: ['__root__'],  // Démarre au niveau racine virtuel
        listeners: []  // Stocke les références aux listeners pour pouvoir les retirer
    };

    // Afficher un message d'information
    createInfoMessage();

    // Récupérer tous les documents (principal + iframes)
    const documents = getAllDocuments();

    // On ajoute les listeners sur tous les documents
    addListenersToDocuments(documents, state, quickAccessConfig);

    // On peuple le niveau racine
    populateSubItems(quickAccessConfig, state.currentLevel);

    // Afficher les tooltips du niveau racine
    showTooltips(state, quickAccessConfig);

    // Le reste du flux est géré dans les listeners juste ci-dessous.
}

// ============================================================================
// GESTION DES ÉVÉNEMENTS CLAVIER
// ============================================================================

/**
 * Récupère tous les documents accessibles (document principal + tous les documents dans les iframes)
 * @returns {Document[]} Tableau de documents
 */
function getAllDocuments() {
    const docs = [document];
    
    // Parcourir toutes les iframes du document principal
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
        try {
            // Vérifier l'accès au contentDocument (same-origin)
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (iframeDoc) {
                docs.push(iframeDoc);
                // Récursivement, chercher les iframes dans les iframes
                const nestedIframes = iframeDoc.querySelectorAll('iframe');
                nestedIframes.forEach(nestedIframe => {
                    try {
                        const nestedDoc = nestedIframe.contentDocument || nestedIframe.contentWindow?.document;
                        if (nestedDoc) {
                            docs.push(nestedDoc);
                        }
                    } catch (e) {
                        // Iframe cross-origin, on ignore
                    }
                });
            }
        } catch (e) {
            // Iframe cross-origin, on ignore
        }
    });
    
    return docs;
}

/**
 * Ajoute les listeners de Quick Access à tous les documents fournis
 * @param {Document[]} documents - Tableaux de documents sur lesquels ajouter les listeners
 * @param {Object} state - État du Quick Access
 * @param {Object} config - Configuration du Quick Access
 */
function addListenersToDocuments(documents, state, config) {
    documents.forEach(doc => {
        const keydownHandler = (e) => {
            if (e.key === 'Alt' || e.key === 'Control') {
                // Touche d'échappement : fermer le Quick Access
                deactivateQuickAccess(state);
                return;
            }
            // Touche autorisée : empêcher le comportement par défaut ET la propagation aux autres listeners
            e.preventDefault();
            e.stopImmediatePropagation(); // également nécessaire pour intercepter avant les listeners en capture sur le même document
            if (e.key === 'Backspace') { // Permet de remonter d'un niveau dans l'arborescence du Quick Access
                if (state.currentLevel.length <= 1) {
                    // Déjà à la racine virtuelle (ou moins) : fermer le Quick Access
                    deactivateQuickAccess(state);
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
        };

        const keyupHandler = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                deactivateQuickAccess(state);
            }
        };

        // Ajouter les listeners avec capture: true pour intercepter avant les autres listeners
        doc.addEventListener('keydown', keydownHandler, { capture: true });
        doc.addEventListener('keyup', keyupHandler, { capture: true });

        // Stocker les références pour pouvoir les retirer plus tard
        state.listeners.push({
            doc: doc,
            keydown: keydownHandler,
            keyup: keyupHandler
        });
    });
}

function handleQuickAccessKey(e, state, config) {
    // Vérifier que la touche pressée est associée à un élément **du niveau actuel**
    const currentConfig = flattenedCurrentLevelConfig(state, config);
    // Ne logger que les touches réelles, pas les modificateurs
    if (!['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
        console.log(`[QuickAccess] Touche: "${e.key}", hotkeys disponibles:`, Object.fromEntries(Object.entries(currentConfig).map(([id, item]) => [id, item.hotkey])));
    }
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
    console.log(`[QuickAccess] Item sélectionné`, { matchedItemId, matchedItem, currentLevel: state.currentLevel });
    const currentConfig = flattenedCurrentLevelConfig(state, config);
    // Si le premier item du flattened a un onDoubleTap et qu'il est appelé
    // alors c'est un doubleTap. (logique navigationnelle, pas temporelle)
    const isDoubleTap = matchedItem.onDoubleTap && Object.values(currentConfig)[0] === matchedItem;

    // L'action est terminale si l’item n’a pas de subItems ou est un double-tap
    const isTerminal = !matchedItem.subItems || isDoubleTap;

    // On extrait l'action à effectuer et le selecteur à cibler
    const action = isDoubleTap ? matchedItem.onDoubleTap : matchedItem.onTap;
    const targetElementSelector = matchedItem.selector;

    console.log(`[QuickAccess] Action à exécuter :`, { action, targetElementSelector, isTerminal });



    if (isTerminal) { // On sort du Quick Access après l'action
        recordMetrics({ clicks: 1, drags: 1 }); // Définie dans metrics.js
        deactivateQuickAccess(state);
        // reQuickAction : relance QuickAccess après l'action.
        // false/null/undefined → rien. true ou 0 → relance immédiate. number → relance après ce délai (ms).
        const reQuickAction = matchedItem.reQuickAction;
        console.log(`[QuickAccess] reQuickAction:`, reQuickAction);
        if (reQuickAction !== null && reQuickAction !== false && reQuickAction !== undefined) {
            const reDelay = (reQuickAction === true || reQuickAction === 0) ? 0 : reQuickAction;
            setTimeout(() => activateQuickAccess(), 10 + reDelay);
        }
    } else { // Sinon, on descend dans les subItems
        const targetQALevel = [...state.currentLevel, matchedItemId];
        moveToTargetConfig(targetQALevel, state, config);
        // Annuler le timeout précédent pour éviter les tooltips fantômes en cas de frappe rapide
        if (state.pendingShowTooltips) {
            clearTimeout(state.pendingShowTooltips);
        }
        state.pendingShowTooltips = setTimeout(() => {
            state.pendingShowTooltips = null;
            // Vérifier que le Quick Access est encore actif avant d'afficher les tooltips
            if (document.getElementById('wh-quickaccess-info-message')) {
                showTooltips(state, config);
            }
        }, 100); // Petit délai pour laisser le temps au DOM de se mettre à jour si besoin
    }

    // Ne rien exécuter si l'action est null/undefined
    if (action) {
        setTimeout(() => {
            executeAction(action, targetElementSelector, state);
        }, 10); // Léger délais pour être sur que l'ensemble des tooltips ont bien été supprimés avant d'exécuter l'action
    }
}

/**
 * Fonction utilitaire pour exécuter une action qui peut être une string (clic, mouseover, enter) ou une fonction personnalisée
 */
function executeAction(action, selector, state) {
    let element = querySelectorWithIframe(selector);
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
            case 'mousedown':
                element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                break;
            case 'enter':
                element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                break;
            case 'mouseover':
                element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
                break;
            case 'focus':
                element.focus();
                break;
            case 'clic_centré': {
                // Dispatche un clic avec les coordonnées du centre de l'élément.
                // Utile pour les menus contextuels qui se positionnent via event.clientX/Y.
                const rect = element.getBoundingClientRect();
                element.dispatchEvent(new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: rect.left + rect.width / 2,
                    clientY: rect.top + rect.height / 2,
                }));
                break;
            }
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

    // Naviguer jusqu'à l'élément cible (fonctionne à tous les niveaux, y compris '__root__')
    const { item, subItems, itemId } = getItemAndSubItems(config, actualQALevel, 'flattenedCurrentLevelConfig');

    if (!item || !itemId) {
        console.warn('[QuickAccess] Impossible de construire la configuration aplatie', actualQALevel);
        return {};
    }

    // Aplatir : l'item actuel et ses subItems au même niveau
    // L'item en position [0] est l'item "parent actuel" (ex: '__root__', 'menu_vertical_gauche'...)
    Object.assign(flattenedConfig, { [itemId]: item[itemId] }, subItems);

    // Générer automatiquement les hotkeys manquants
    ensureHotkeysForItems(flattenedConfig);

    // Appliquer le filtre de priorité : si au moins un sub-item a priorityLvl: true,
    // inhiber tous les sub-items sans priorityLvl: true (l'item parent en position [0] est toujours conservé).
    const allFlatEntries = Object.entries(flattenedConfig);
    const subEntries = allFlatEntries.slice(1);
    const hasPriorityItems = subEntries.some(([, item]) => item.priorityLvl === true && (!item.selector || !!querySelectorWithIframe(item.selector)));
    if (hasPriorityItems) {
        for (const [subItemId, subItem] of subEntries) {
            if (subItem.priorityLvl !== true || (subItem.selector && !querySelectorWithIframe(subItem.selector))) {
                delete flattenedConfig[subItemId];
            }
        }
        console.log(`[QuickAccess] Filtre prioritaire actif au niveau`, state.currentLevel);
    }

    // Vérifier les conflits uniquement entre les sub-items (pas l'item parent,
    // dont la hotkey appartient au niveau supérieur)
    // en effet si les items inférieurs sont peuplés de façon anticipée (ex. inlineSubTooltips)
    // il peut y avoir des hotkeys en double sans qu'ils ne soient jamais affichés en même temps, donc pas de conflit réel.
    checkForKeyDuplication(subItems || {}, state.currentLevel);

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
    const foundPath = [];

    for (let i = 0; i < QALevel.length; i++) {
        const itemId = QALevel[i];

        if (!currentSubItems[itemId]) {
            console.warn(`[QuickAccess] Element "${itemId}" introuvable lors de ${context}, chemin parcouru: ${foundPath.join('/')}`, QALevel);
            return { item: null, subItems: null, itemId: null };
        }
        
        foundPath.push(itemId);

        // ✅ Sauvegarder le conteneur et l'item complet AVANT de descendre
        currentItemContainer = currentSubItems;
        currentItemId = itemId;
        const fullItem = currentSubItems[itemId];

        // Si ce n'est pas le dernier niveau, descendre dans subItems
        if (i < QALevel.length - 1) {
            if (!fullItem.subItems) {
                console.warn(`[QuickAccess] Pas de subItems pour "${itemId}" lors de ${context}, chemin parcouru: ${foundPath.join('/')}`, QALevel);
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
    // Log supprimé car redondant avec populateSubItems qui suit

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
    const logData = { level: targetQALevel, status: null, subItemsCount: 0 };

    // Naviguer jusqu'à l'élément cible et obtenir son conteneur
    const { subItems: subItemsContent, item: itemContainer, itemId } = getItemAndSubItems(config, targetQALevel, 'populateSubItems');

    if (!itemContainer || !itemId) {
        console.warn(`[QuickAccess] Impossible de trouver l'item cible pour le peuplement des subItems`, targetQALevel);
        return;
    }

    // Récupérer l'objet complet de l'item depuis son conteneur
    const targetItem = itemContainer[itemId];

    // Vérifier si subItems est une fonction à évaluer
    if (typeof targetItem.subItems === 'function') {
        // Trouver l'élément DOM si nécessaire
        let element = targetItem.element;
        if (!element && targetItem.selector) {
            element = querySelectorWithIframe(targetItem.selector);
        }

        if (element) {
            // ⚠️ REMPLACEMENT PERMANENT : la fonction est remplacée par son résultat
            // Modifier directement dans le conteneur pour que le cache fonctionne
            const currentItemHotkey = targetItem.hotkey || null;
            const generatedSubItems = targetItem.subItems(element, currentItemHotkey);

            // ✅ Modifier directement la référence dans quickAccessConfig via le conteneur
            itemContainer[itemId].subItems = generatedSubItems;
            logData.status = 'generated';
            logData.subItemsCount = Object.keys(generatedSubItems || {}).length;
        } else {
            console.warn(`[QuickAccess] Impossible de trouver l'élément pour peupler les subItems`, targetQALevel);
            return;
        }
    } else if (typeof targetItem.subItems === 'object') {
        // Les subItems ont déjà été générés (cache) ou sont statiques
        logData.status = 'cached';
        logData.subItemsCount = Object.keys(targetItem.subItems || {}).length;
    }

    // Assigner les hotkeys manquants des subItems dès le peuplement.
    // Cela couvre les items inlineSubTooltips (qui ne passent jamais par
    // flattenedCurrentLevelConfig) et pré-remplit les autres (idempotent).
    // Le hotkey du parent est réservé pour que les sub-items ne puissent pas le prendre.
    if (targetItem.subItems && typeof targetItem.subItems === 'object') {
        const parentReserved = targetItem.hotkey
            ? new Set([targetItem.hotkey.toLowerCase()])
            : new Set();
        ensureHotkeysForItems(targetItem.subItems, parentReserved);
    }

    console.log(`[QuickAccess] SubItems peuplés pour niveau ${targetQALevel.join('/')}:`, logData);

    // Après peuplement initial (frais ou en cache), peupler récursivement les subItems
    // des items marqués inlineSubTooltips — ceux-ci s'affichent sans navigation, donc
    // leurs subItems doivent être disponibles immédiatement.
    const currentSubItems = targetItem.subItems;
    if (currentSubItems && typeof currentSubItems === 'object') {
        for (const [subItemId, subItem] of Object.entries(currentSubItems)) {
            // Récurser pour tout item inlineSubTooltips ayant des subItems (fonction OU objet déjà résolu),
            // car populateSubItems gère les deux cas et appellera ensureHotkeysForItems dans tous les cas.
            if (subItem.inlineSubTooltips && subItem.subItems) {
                populateSubItems(config, [...targetQALevel, subItemId]);
            }
        }
    }
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
 * @param {Set<string>} [reservedHotkeys=new Set()] - Hotkeys à exclure dès le départ (ex : hotkey du parent)
 */
function ensureHotkeysForItems(config, reservedHotkeys = new Set()) {
    // usedHotkeys est initialisé avec les hotkeys réservées (ex : hotkey du parent)
    const usedHotkeys = new Set([...reservedHotkeys]);

    if (Object.keys(config).length === 0) {
        return;
    }

    const removedHotkeys = [];
    const duplicateHotkeys = [];
    const generatedHotkeys = [];

    // ⚠️ PASSE 0 : Nettoyer les hotkeys hardcodés pour les éléments absents du DOM
    for (const [itemId, item] of Object.entries(config)) {
        if (item.hotkey && item.selector) {
            const element = querySelectorWithIframe(item.selector);
            if (!element) {
                // L'élément n'existe pas dans le DOM, supprimer le hotkey hardcodé
                removedHotkeys.push({ itemId, hotkey: item.hotkey });
                delete item.hotkey;
            }
        }
    }

    // Première passe : collecter les hotkeys déjà définies.
    // En cas de doublon (ou conflit avec reservedHotkeys), le premier item gagne :
    // dans flattenedCurrentLevelConfig, l'item parent est toujours en tête → il conserve
    // son hotkey et les sub-items en doublon sont réinitialisés pour régénération.
    for (const [itemId, item] of Object.entries(config)) {
        if (item.hotkey) {
            const hotkey = item.hotkey.toLowerCase();
            if (usedHotkeys.has(hotkey)) {
                // Doublon détecté : vider le hotkey pour qu'il soit régénéré proprement
                duplicateHotkeys.push({ itemId, hotkey });
                delete item.hotkey;
            } else {
                usedHotkeys.add(hotkey);
            }
        }
    }

    // Deuxième passe : générer les hotkeys manquants
    // Les items prioritaires passent en premier pour garantir qu'ils obtiennent les meilleures lettres
    const allEntries = Object.entries(config);
    const sortedEntries = [
        ...allEntries.filter(([, item]) => item.priorityLvl === true),
        ...allEntries.filter(([, item]) => item.priorityLvl !== true)
    ];
    for (const [itemId, item] of sortedEntries) {
        if (!item.hotkey) {
            if (item.selector) {
                const element = querySelectorWithIframe(item.selector);
                if (!element) continue; // pas de hotkey généré si l'élément n'existe pas

                // Déterminer le texte source pour la génération de hotkey
                let sourceText = itemId;
                if (element && element.textContent) {
                    sourceText = element.textContent.trim();
                } else if (element) {
                    sourceText = element.getAttribute('title') || element.getAttribute('alt') || itemId;
                }

                const generatedHotkey = generateHotkeyFromText(sourceText, usedHotkeys);
                item.hotkey = generatedHotkey;
                usedHotkeys.add(generatedHotkey);
                generatedHotkeys.push({ itemId, hotkey: generatedHotkey });
            }
        }
    }
    
    // Ne logger que si des changements ont été effectués
    if (removedHotkeys.length > 0 || duplicateHotkeys.length > 0 || generatedHotkeys.length > 0) {
        console.log(`[QuickAccess] Hotkeys: ${removedHotkeys.length} supprimées, ${duplicateHotkeys.length} doublons réassignés, ${generatedHotkeys.length} générées`, {
            removed: removedHotkeys,
            duplicates: duplicateHotkeys,
            generated: generatedHotkeys,
            final: Object.fromEntries(Object.entries(config).map(([id, item]) => [id, item.hotkey]))
        });
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
// UTILITAIRES DE VISIBILITÉ
// ============================================================================

/**
 * Vérifie si un élément est visible (CSS et viewport)
 * @param {HTMLElement} element - L'élément à vérifier
 * @param {boolean} requirePartiallyInViewport - Si true, vérifie que l'élément est au moins partiellement visible dans le viewport
 * @returns {boolean} True si l'élément est visible
 */
function isElementVisible(element, requirePartiallyInViewport = true) {
    if (!element) return false;

    // 1. Vérification basique : offsetParent === null détecte display:none et visibility:hidden
    if (element.offsetParent === null) {
        return false;
    }

    // 2. Vérification des styles CSS calculés
    const style = getComputedStyle(element);

    // display: none
    if (style.display === 'none') {
        return false;
    }

    // visibility: hidden
    if (style.visibility === 'hidden') {
        return false;
    }

    // opacity: 0 ou proche de 0
    if (parseFloat(style.opacity) < 0.01) {
        return false;
    }

    // pointer-events: none (l'élément n'est pas interactif)
    if (style.pointerEvents === 'none') {
        return false;
    }

    // 3. Vérification de la visibilité dans le viewport (optionnel)
    if (requirePartiallyInViewport) {
        const rect = element.getBoundingClientRect();

        // Vérifier si l'élément est au moins partiellement visible dans le viewport
        const isInViewport = (
            rect.bottom > 0 &&
            rect.right > 0 &&
            rect.top < window.innerHeight &&
            rect.left < window.innerWidth
        );

        if (!isInViewport) {
            return false;
        }

        // Vérifier que l'élément a une taille non nulle
        if (rect.width === 0 || rect.height === 0) {
            return false;
        }
    }

    return true;
}

// ============================================================================
// UTILITAIRES POUR IFRAMES
// ============================================================================

/**
 * Sélectionne un élément qui peut être dans le document principal ou dans une iframe
 * Supporte la syntaxe : "iframe#id >> selector" ou "selector" classique
 * @param {string} selector - Sélecteur CSS, potentiellement avec notation iframe
 * @param {Document} doc - Document de départ (par défaut document)
 * @returns {HTMLElement|null}
 */
function querySelectorWithIframe(selector, doc = document) {
    // Détecter la syntaxe iframe >> selector
    if (selector.includes(' >> ')) {
        const [iframeSelector, innerSelector] = selector.split(' >> ').map(s => s.trim());
        const iframe = doc.querySelector(iframeSelector);

        if (!iframe || iframe.tagName !== 'IFRAME') {
            // console.warn(`[QuickAccess] Iframe non trouvée: ${iframeSelector}, il faut nécessairement que l'iframe existe et soit déclarée juste avant le '>>' pour accéder à son contenu.`);
            return null;
        }

        try {
            // Vérifier l'accès au contentDocument (same-origin)
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!iframeDoc) {
                console.warn(`[QuickAccess] Accès bloqué à l'iframe (cross-origin): ${iframeSelector}`);
                return null;
            }

            // Chercher dans l'iframe récursivement
            return querySelectorWithIframe(innerSelector, iframeDoc);
        } catch (e) {
            console.error(`[QuickAccess] Erreur d'accès à l'iframe:`, e);
            return null;
        }
    }

    // Sélecteur classique
    return doc.querySelector(selector);
}

// ============================================================================
// INTERFACE UTILISATEUR - TOOLTIPS ET MESSAGE D'INFORMATION
// ============================================================================

/**
 * Calcule la position absolue d'un élément dans la fenêtre principale,
 * en tenant compte des iframes (support des iframes imbriquées)
 * @param {HTMLElement} element - L'élément dont on veut la position
 * @returns {DOMRect} Position dans la fenêtre principale
 */
function getAbsoluteBoundingRect(element) {
    const rect = element.getBoundingClientRect();

    // Vérifier si l'élément est dans une iframe
    const ownerDoc = element.ownerDocument;

    // Si l'élément est dans le document principal, retourner rect tel quel
    if (ownerDoc === document) {
        return rect;
    }

    // Sinon, l'élément est dans une iframe
    // Trouver l'iframe contenant cet élément
    let iframe = null;

    // Chercher dans toutes les iframes du document principal
    const allIframes = document.querySelectorAll('iframe');
    for (const frame of allIframes) {
        try {
            if (frame.contentDocument === ownerDoc || frame.contentWindow?.document === ownerDoc) {
                iframe = frame;
                break;
            }
        } catch (e) {
            // Accès bloqué (cross-origin), ignorer
            continue;
        }
    }

    if (!iframe) {
        console.warn('[QuickAccess] Impossible de trouver l\'iframe parente pour le positionnement du tooltip');
        return rect;
    }

    // Obtenir la position de l'iframe (récursif si iframe imbriquée)
    const iframeRect = getAbsoluteBoundingRect(iframe);

    // Combiner les positions
    return {
        top: rect.top + iframeRect.top,
        left: rect.left + iframeRect.left,
        right: rect.right + iframeRect.left,
        bottom: rect.bottom + iframeRect.top,
        width: rect.width,
        height: rect.height,
        x: rect.x + iframeRect.left,
        y: rect.y + iframeRect.top
    };
}

/**
 * Crée et affiche un message d'information pour le Quick Access.
 * Ce message indique à l'utilisateur que le mode Quick Access est actif
 * et comment le quitter (touche Échap).
 */
function createInfoMessage() {
    // Message d'information
    const message = document.createElement('div');
    message.id = 'wh-quickaccess-info-message';
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
    document.body.appendChild(message);
}

/**
 * Crée et affiche un tooltip sur un élément
 * @param {string} selector - Sélecteur CSS de l'élément
 * @param {string} hotkey - Touche de raccourci
 * @param {boolean} hasDoubleTap - Indique si un double-tap est disponible
 * @param {boolean} isContainer - Indique si l'item sert uniquement de conteneur pour la navigation (pas d'action directe)
 * @returns {Object|null} Informations sur le tooltip créé, ou null si l'élément n'est pas trouvé
 */
function createTooltip(selector, hotkey, hasDoubleTap = false, isContainer = false) {
    const element = querySelectorWithIframe(selector);
    if (!element) {
        return null;
    }

    // Vérifier si l'élément a overflow qui couperait le tooltip
    let targetElement = element;
    const computedStyle = getComputedStyle(element);
    
    if (computedStyle.overflow === 'hidden' || computedStyle.overflow === 'clip') {
        // console.log(`[QuickAccess] Tooltip "${hotkey}" : overflow détecté (${computedStyle.overflow}), recherche d'un parent sans overflow`);
        
        // Remonter dans l'arbre DOM pour trouver un parent sans overflow problématique
        let current = element.parentElement;
        while (current && current !== document.body) {
            const parentStyle = getComputedStyle(current);
            if (parentStyle.overflow !== 'hidden' && parentStyle.overflow !== 'clip') {
                targetElement = current;
                break;
            }
            current = current.parentElement;
        }
    }
    
    // Sauvegarder la position originale de l'élément cible
    const originalPosition = targetElement.style.position;
    
    // S'assurer que l'élément a une position relative pour que le tooltip puisse se positionner par rapport à lui
    if (!originalPosition || originalPosition === 'static') {
        saveElementStyles(targetElement, {
            position: originalPosition || ''
        });
        targetElement.style.position = 'relative';
    }

    const tooltip = document.createElement('span');
    tooltip.className = 'wh-quickaccess-tooltip';

    // Style avec positionnement absolu par rapport à l'élément parent
    tooltip.style.cssText = `
        position: absolute;
        color: #000000;
        font-size: 0.75em;
        background-color: rgba(255, 255, 0, 1);
        padding: 2px 4px;
        border: 1px solid #000000;
        border-radius: 1px;
        pointer-events: none;
        white-space: nowrap;
        z-index: 99999;
        top: 15%;
        left: 0;
        height: auto;
        line-height: normal;
        display: inline-block;
    `;

    // Si double-tap disponible, utiliser une bordure bleue pour le distinguer
    if (hasDoubleTap) {
        tooltip.style.backgroundColor = 'rgba(0, 123, 255, 1)';
        tooltip.style.color = '#FFFFFF';
        tooltip.style.borderWidth = '1px';
    }
    
    // Si l'item est un conteneur pur (sert uniquement à la navigation vers subItems),
    // mettre en évidence l'élément DOM avec un outline pour le distinguer visuellement
    if (isContainer) {
        // Sauvegarder les styles originaux
        saveElementStyles(element, {
            outline: element.style.outline || '',
            outlineOffset: element.style.outlineOffset || '',
            border: element.style.border || '',
            boxShadow: element.style.boxShadow || ''
        });

        // Appliquer l'entourage
        element.style.outline = '2px solid rgba(0, 123, 255, 1)';
        element.style.outlineOffset = '2px';
        element.classList.add('wh-quickaccess-highlighted');
    }

    // Contenu : uniquement la touche
    tooltip.textContent = hotkey.toUpperCase();

    // Déterminer si l'élément peut avoir des enfants
    // Les éléments comme <select>, <input>, <textarea>, <img>, <br>, <hr> ne peuvent pas avoir d'enfants directs valides
    const cannotHaveChildren = ['SELECT', 'INPUT', 'TEXTAREA', 'IMG', 'BR', 'HR', 'VIDEO', 'AUDIO'].includes(element.tagName);
    
    let attachmentType;
    if (cannotHaveChildren) {
        // Pour ces éléments, insérer le tooltip comme sibling et ajuster le positionnement
        const rect = element.getBoundingClientRect();
        tooltip.style.position = 'absolute';
        tooltip.style.top = `${element.offsetTop}px`;
        tooltip.style.left = `${element.offsetLeft}px`;
        
        // Insérer après l'élément
        element.parentElement.insertBefore(tooltip, element.nextSibling);
        attachmentType = 'sibling';
    } else {
        // Rattacher le tooltip à l'élément cible (élément original ou parent sans overflow)
        targetElement.appendChild(tooltip);
        attachmentType = targetElement === element ? 'self' : 'parent';
    }
    
    return {
        hotkey,
        tagName: element.tagName,
        attachmentType,
        element
    };
}

/**
 * Affiche récursivement les tooltips des items inlineSubTooltips en accumulant le préfixe de hotkeys.
 * Supporte N niveaux de inlineSubTooltips (tooltips à 2, 3, 4+ lettres).
 * @param {Object} subItems - Les subItems à afficher
 * @param {string} hotkeyPrefix - Préfixe accumulé des hotkeys parentes (ex: 'C', 'CT')
 * @returns {Array} Tableau des tooltips créés
 */
function showInlineSubTooltips(subItems, hotkeyPrefix) {
    const results = [];
    for (const [, subItem] of Object.entries(subItems)) {
        if (!subItem.selector || !subItem.hotkey) continue;
        const combinedHotkey = hotkeyPrefix + subItem.hotkey;

        if (subItem.inlineSubTooltips && subItem.subItems && typeof subItem.subItems === 'object') {
            // Descente récursive : ce sous-item délègue aussi l'affichage à ses enfants
            results.push(...showInlineSubTooltips(subItem.subItems, combinedHotkey));
        } else {
            const hasDoubleTap = subItem.onDoubleTap != null;
            const isContainer = subItem.subItems != null && subItem.onTap == null && !hasDoubleTap;
            const result = createTooltip(subItem.selector, combinedHotkey, hasDoubleTap, isContainer);
            if (result) results.push(result);
        }
    }
    return results;
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

    // console.log('[QuickAccess] Affichage des tooltips pour le niveau', state.currentLevel, flattenedConfig);

    const entries = Object.entries(flattenedConfig);
    const createdTooltips = [];
    const ignoredContainers = [];

    for (let i = 0; i < entries.length; i++) {
        const [itemId, item] = entries[i];
        // L'item en position [0] est toujours le parent actuel (ex: '__root__', 'menu_vertical_gauche'...)
        const isCurrentItem = i === 0;

        // Si c'est l'item actuel et qu'il n'a ni onTap ni onDoubleTap (pur conteneur), ne pas afficher le tooltip
        if (isCurrentItem && item.onTap == null && item.onDoubleTap == null) { // Egalité intentionnelle (null ou undefined)
            ignoredContainers.push(itemId);
            continue;
        }

        // Si l'item a inlineSubTooltips : afficher directement ses sous-items avec la hotkey combinée (ex: "SI", "SL")
        // Les hotkeys des sous-items sont générées automatiquement dans populateSubItems si absentes.
        if (item.inlineSubTooltips && item.subItems && typeof item.subItems === 'object') {
            createdTooltips.push(...showInlineSubTooltips(item.subItems, item.hotkey || ''));
            continue; // L'item parent lui-même n'affiche pas de tooltip
        }

        const hasOnTap = item.onTap != null;
        const hasDoubleTap = item.onDoubleTap != null;
        // Un item sans onTap et avec subItems est un conteneur
        const isContainer = item.subItems != null && !hasOnTap && !hasDoubleTap;

        const result = createTooltip(item.selector, item.hotkey, hasDoubleTap, isContainer);
        if (result) createdTooltips.push(result);
    }

    console.log(`[QuickAccess] Tooltips pour niveau ${state.currentLevel.join('/')}: ${createdTooltips.length} créés${ignoredContainers.length > 0 ? `, ${ignoredContainers.length} conteneurs ignorés` : ''}`, {
        created: createdTooltips,
        ignored: ignoredContainers
    });
}

/**
 * Nettoie les tooltips et les éléments highlighted dans un document donné
 * @param {Document} doc - Le document à nettoyer (document principal ou iframe)
 */
function clearTooltipsInDocument(doc) {
    if (!doc) return;

    // Supprimer les tooltips
    const tooltips = doc.querySelectorAll('.wh-quickaccess-tooltip');
    tooltips.forEach(tooltip => tooltip.remove());

    // Supprimer les entourages des éléments mis en valeur
    const highlightedElements = doc.querySelectorAll('.wh-quickaccess-highlighted');
    highlightedElements.forEach(element => {
        restoreElementStyles(element);
        element.classList.remove('wh-quickaccess-highlighted');
    });
}

/**
 * Suppression de tous les tooltips affichés dans le document principal et les iframes
 */
function clearAllTooltips() {
    // Nettoyer le document principal
    clearTooltipsInDocument(document);

    // Trouver toutes les iframes et nettoyer chacune
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
        try {
            // Vérifier l'accès au contentDocument (same-origin)
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (iframeDoc) {
                clearTooltipsInDocument(iframeDoc);
            }
        } catch (e) {
            // Accès bloqué (cross-origin), ignorer silencieusement
        }
    });
}

/**
 * Désactive le mode Quick Access.
 * Retire tous les listeners installés sur les documents, supprime le message d'information
 * et nettoie les infobulles affichées.
 * 
 * @param {Object} state - État du Quick Access contenant les références aux listeners
 * @param {Array} state.listeners - Tableau des listeners à retirer
 */
function deactivateQuickAccess(state) {
    // Retirer tous les listeners
    if (state && state.listeners) {
        state.listeners.forEach(({ doc, keydown, keyup }) => {
            doc.removeEventListener('keydown', keydown, { capture: true });
            doc.removeEventListener('keyup', keyup, { capture: true });
        });
        state.listeners = [];
    }

    // Supprimer le message d'information
    const message = document.getElementById('wh-quickaccess-info-message');
    if (message) {
        message.remove();
    }

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
            onTap: nestedSubmenu ? function (element, state) { WMenuPseudoMouseover(element, state); } : 'clic',
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
 * Génère les sous-items du menu d'impression à partir de l'élément DOM du sous-menu
 * Structure spécifique : ul.level2.dynamic contenant des imprimantes (items terminaux)
 * ⚠️ NE GÉNÈRE PAS les hotkeys - cela sera fait par ensureHotkeysForItems()
 * @param {HTMLElement} submenuElement - Élément ul.level2.dynamic du menu d'impression
 * @param {string} parentId - ID du parent pour générer les clés
 * @returns {Object} Configuration des sous-items
 */
function generateImpressionSubItems(submenuElement, parentId) {
    const subItems = {};

    if (!submenuElement) {
        console.error('[QuickAccess][Impression] generateImpressionSubItems : submenuElement est null');
        return subItems;
    }

    console.log(`[QuickAccess][Impression] Génération des subItems pour "${parentId}"`);

    // Récupérer tous les items d'imprimante (niveau 2) : ul.level2.dynamic > li.has-popup.dynamic
    const printerItems = submenuElement.querySelectorAll(':scope > li.has-popup.dynamic');

    let itemIndex = 1;
    printerItems.forEach(li => {
        // Récupérer le lien de l'imprimante
        const printerLink = li.querySelector(':scope > a.level2.dynamic');

        if (!printerLink) {
            console.warn('[QuickAccess][Impression] Lien d\'imprimante non trouvé, ignoré');
            return;
        }

        // Extraire le texte du lien (nom de l'imprimante)
        const printerName = printerLink.textContent?.trim() || '';

        if (!printerName) {
            console.warn('[QuickAccess][Impression] Imprimante sans nom trouvée, ignorée');
            return;
        }

        // Générer un ID unique basé sur le texte nettoyé
        const cleanText = printerName
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');

        const itemId = `${parentId}_printer_${cleanText}_${itemIndex}`;
        itemIndex++;

        // Créer un sélecteur sûr : utiliser un ID
        let selector;
        if (!printerLink.id) {
            const uniqueId = `wh-qa-impression-${itemId}`;
            printerLink.id = uniqueId;
            selector = `#${uniqueId}`;
        } else {
            selector = `#${printerLink.id}`;
        }

        // Créer l'item de configuration (terminal, sans subItems)
        subItems[itemId] = {
            selector: selector,
            hotkey: null, // Sera généré automatiquement par ensureHotkeysForItems
            onTap: 'clic', // Clic direct pour imprimer
            element: printerLink // Sauvegarder la référence à l'élément
        };
    });

    console.log(`[QuickAccess][Impression] ${Object.keys(subItems).length} imprimantes générées pour "${parentId}"`);
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
            onTap: hasArrow ? function (element, state) { horizontalMenuPseudoMouseover(element, state); } : 'clic'
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
 * Génère les sous-items pour l'historique de consultations
 * Fonction partagée entre documents_joints_corps et l'iframe de consultation
 * @param {HTMLElement} element - Élément contenant l'historique (#HistoriqueUCForm1_UpdatePanelLiteralAfficheWeda)
 * @param {string} parentId - ID du parent pour générer les clés
 * @param {string} selectorPrefix - Préfixe pour les sélecteurs (vide ou 'iframe#id >> ' pour iframe)
 * @returns {Object} Configuration des sous-items
 */
function generateConsultationHistorySubItems(element, parentId, selectorPrefix = '') {
    const generatedSubItems = {};

    // 1. Directement les éléments qui permettent d'agir sur les éléments de consultation
    // (modifier, supprimer, etc.), qui ne sont pas accessibles via le DOM tant qu'on 
    // n'a pas fait de mouseover dessus
    const documentActions = element.querySelectorAll('.document-actions > div');
    documentActions.forEach((actionDiv, index) => {
        // Révéler les éléments
        actionDiv.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        if (!isElementVisible(actionDiv)) return;

        // Ils ont déjà chacun un element.id
        generatedSubItems[`${parentId}_action_${index + 1}`] = {
            selector: `${selectorPrefix}#${actionDiv.id}`,
            onTap: 'clic'
        };
    });

    // 2. Sous-niveaux : un par bloc de consultation
    const consultationBlocks = element.querySelectorAll('div.sc[name="divwc"]');
    consultationBlocks.forEach((block, index) => {
        if (!isElementVisible(block)) return;

        // Les blocs de cs n'ont pas d'id, on leur en crée un
        const blockId = `${parentId}_block_${index + 1}`;
        if (!block.id) {
            block.id = blockId;
        }

        generatedSubItems[blockId] = {
            selector: `${selectorPrefix}#${block.id}`,
            subItems: function () {
                return generateInternalSubItems(block, selectorPrefix);
            }
        };
    });

    return generatedSubItems;
}

/**
 * Génération des items génériques
 * Son usage est prévu pour être très large, mais est consommateur de ressources
 * donc doit être appelé au plus bas niveau possible
 * 
 * Depuis l'élément initial fournis, on va devoir descendre récursivement dans le DOM
 * pour trouver les élements/items de REGROUPEMENT (donc sans onTap ou onDoubleTap), puis
 * les éléments/items d'ACTION
 * 
 * Les items considérés comme de REGROUPEMENT sont :
 * - toutes les iframes
 * - tout les éléments avec un très grand nombre de subItems (> 26)
 * 
 * Les items d'ACTION sont les éléments suivants : 
 * 1. Champs de formulaire (action: focus) :
 *    - input:not([type="hidden"]):not([disabled])
 *    - textarea:not([disabled])
 *    - select:not([disabled])
 * 
 * 2. Éléments cliquables (action: clic) :
 *    - a[href]
 *    - button:not([disabled])
 *    - [role="button"]:not([aria-disabled="true"])
 *    - [onclick], [ondblclick], [onmousedown] (tout élément avec event listener inline)
 * 
 * 3. Éléments avec tabindex >= 0 (action: focus)
 * 
 * EXCLUSIONS automatiques : éléments non visibles ou désactivés
 * - display:none, visibility:hidden, opacity:0
 * - [disabled], [aria-disabled="true"]
 * - pointer-events:none
 *
 * @param {HTMLElement} element - Élément conteneur à explorer
 * @param {string} selectorPrefix - Préfixe pour les sélecteurs (vide ou 'iframe#id >> ' pour iframe)
 * @returns {Object|null} Configuration des sous-items ou null si aucun
 */
function generateInternalSubItems(element, selectorPrefix = '') {
    // Groupes de sélecteurs avec leurs actions associées
    const targetGroups = {
        formFields: {
            selector: `
                input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([disabled]),
                textarea:not([disabled]),
                select:not([disabled])
            `,
            action: 'focus'
        },
        clickableElements: {
            selector: `
                a[href],
                button:not([disabled]),
                [role="button"]:not([aria-disabled="true"]),
                [onclick], [ondblclick], [onmousedown], [tabindex]:not([tabindex="-1"])
            `,
            action: 'clic'
        }
    };

    // Collecter tous les éléments d'action avec leur action associée
    const allActionElements = [];

    for (const [groupName, groupConfig] of Object.entries(targetGroups)) {
        const elements = element.querySelectorAll(groupConfig.selector);

        elements.forEach(el => {
            // Éviter les doublons (un élément peut matcher plusieurs groupes)
            if (!allActionElements.some(item => item.element === el)) {
                allActionElements.push({
                    element: el,
                    action: groupConfig.action
                });
            }
        });
    }

    // Si aucun élément n'est trouvé, on renvoie null pour indiquer qu'aucun subItem n'est disponible à ce niveau
    if (allActionElements.length === 0) return null;

    // Filtrer pour ne garder que les éléments qui ne sont pas descendants d'une autre target
    const actionElements = allActionElements.filter(item => {
        const el = item.element;

        // Reconstruire le sélecteur complet pour tester
        const allSelectors = Object.values(targetGroups).map(g => g.selector).join(',');

        // Trouver le parent le plus proche qui est une target (en excluant l'élément lui-même)
        let parent = el.parentElement;
        while (parent && parent !== element) {
            if (parent.matches(allSelectors)) {
                // Ce parent est une target, donc on ignore l'enfant
                return false;
            }
            parent = parent.parentElement;
        }
        return true;
    });

    // Si trop d'éléments (> 36), créer des groupes de regroupement
    if (actionElements.length > 36) {
        console.log(`[QuickAccess] Création de groupes de regroupement pour ${actionElements.length} éléments`);
        return createGroupedSubItems(actionElements, selectorPrefix);
    }

    // Sinon, créer les items directement (cas normal)
    const subItems = {};
    let itemIndex = 0;

    for (let i = 0; i < actionElements.length; i++) {
        const { element: actionElement, action } = actionElements[i];
        const itemId = generateUniqueQAItemId(actionElement, itemIndex++);
        const baseSelector = QASelectorFinder(actionElement, itemId);

        subItems[itemId] = {
            selector: selectorPrefix + baseSelector,
            onTap: action,
            onDoubleTap: null,
            subItems: null,
        };
    }

    return subItems;
}

/**
 * Crée des groupes de regroupement pour un grand nombre d'éléments
 * Chaque groupe contient au maximum 20 éléments
 * @param {Array} actionElements - Liste des objets {element, action}
 * @param {string} selectorPrefix - Préfixe pour les sélecteurs (iframe)
 * @returns {Object} Configuration avec groupes de regroupement
 */
function createGroupedSubItems(actionElements, selectorPrefix = '') {
    const groupedSubItems = {};
    const itemsPerGroup = 20;
    const totalGroups = Math.ceil(actionElements.length / itemsPerGroup);

    console.log(`[QuickAccess] Création de ${totalGroups} groupes pour ${actionElements.length} éléments`);

    for (let groupIndex = 0; groupIndex < totalGroups; groupIndex++) {
        const startIdx = groupIndex * itemsPerGroup;
        const endIdx = Math.min(startIdx + itemsPerGroup, actionElements.length);
        const groupElements = actionElements.slice(startIdx, endIdx);

        // Créer un ID pour ce groupe
        const groupId = `group_${groupIndex + 1}_of_${totalGroups}`;
        // Le premier élément du groupe détermine le sélecteur du groupe
        const firstItem = groupElements[0];
        const firstElement = firstItem.element;
        const firstElementId = generateUniqueQAItemId(firstElement, startIdx);
        const groupSelector = QASelectorFinder(firstElement, firstElementId);

        // Créer le groupe de regroupement avec ses subItems
        groupedSubItems[groupId] = {
            selector: selectorPrefix + groupSelector,
            onTap: null, // Pas d'action sur le groupe lui-même (navigation seulement)
            onDoubleTap: null,
            subItems: function () {
                // Générer les subItems de ce groupe à la demande
                const groupSubItems = {};

                for (let i = 0; i < groupElements.length; i++) {
                    const { element: actionElement, action } = groupElements[i];
                    const itemId = generateUniqueQAItemId(actionElement, startIdx + i);
                    const baseSelector = QASelectorFinder(actionElement, itemId);

                    groupSubItems[itemId] = {
                        selector: selectorPrefix + baseSelector,
                        onTap: action,
                        onDoubleTap: null,
                        subItems: null,
                    };
                }

                console.log(`[QuickAccess] Groupe ${groupIndex + 1}/${totalGroups} généré avec ${Object.keys(groupSubItems).length} items`);
                return groupSubItems;
            }
        };
    }

    return groupedSubItems;
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


/**
 * Échappe les caractères spéciaux pour les utiliser dans un sélecteur CSS
 * Les caractères spéciaux incluent notamment $ utilisé par ASP.NET
 * @param {string} str - Chaîne à échapper
 * @returns {string} Chaîne échappée pour CSS
 */
function escapeCSSSelector(str) {
    // Échapper les caractères spéciaux CSS avec un backslash
    // Liste des caractères à échapper : !"#$%&'()*+,./:;<=>?@[\]^`{|}~
    return str.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
}

function QASelectorFinder(element, itemId) {
    if (element.id) {
        return `#${escapeCSSSelector(element.id)}`;
    } else {
        // Assigner un ID DOM unique à l'élément
        const uniqueDomId = `wh-qa-${itemId}`;
        element.id = uniqueDomId;
        return `#${escapeCSSSelector(uniqueDomId)}`;
    }
}


/**
 * Génère les sous-items pour un sélecteur multiple
 * Trouve tous les éléments correspondant au sélecteur et crée un subItem pour chacun
 * @param {Object} options - Options de configuration
 * @param {HTMLElement} options.parentElement - Élément parent contenant les éléments à cibler
 * @param {string} options.selector - Sélecteur CSS pour trouver tous les éléments
 * @param {string|Function} options.onTap - Action à exécuter sur chaque élément
 * @param {string|Function} [options.onDoubleTap=null] - Action à exécuter au double-tap sur chaque élément (si fourni, onTap et onDoubleTap sont utilisés tels quels)
 * @param {string} [options.selectorPrefix=''] - Préfixe pour les sélecteurs (pour iframes)
 * @param {string} [options.keyPrefix='item'] - Préfixe pour les clés des items générés (pour éviter les collisions)
 * @param {Function|Object} [options.subItems=null] - Fonction(element)=>subItems ou objet statique de sous-items partagé par tous les éléments
 * @param {boolean} [options.inlineSubTooltips=false] - Si true, propage inlineSubTooltips aux items générés (affichage combiné des tooltips)
 * @param {autres} [options.extraItemProps] - Tout autre propriété est propagée telle quelle à chaque item généré (ex: reQuickAction)
 * @returns {Object} Configuration des sous-items
 */
function generateMultipleSelectorSubItems({ parentElement, selector, onTap, onDoubleTap = null, selectorPrefix = '', keyPrefix = 'item', subItems: subItemsFn = null, inlineSubTooltips = false, ...extraItemProps }) {
    const generatedSubItems = {};
    const resolvedSubItemsGenerator = subItemsFn;

    const elements = parentElement.querySelectorAll(selector);

    if (!elements || elements.length === 0) {
        console.warn(`[QuickAccess] Aucun élément trouvé avec le sélecteur: "${selector}"`);
        return {};
    }

    // Créer un subItem pour chaque élément trouvé
    elements.forEach((element, index) => {
        // Générer un ID unique pour l'élément s'il n'en a pas
        if (!element.id) {
            let uniqueId = `qa_multiple_${index}`;
            let counter = 0;
            // Vérifier que l'ID n'existe pas déjà dans le DOM
            while (document.getElementById(uniqueId)) {
                uniqueId = `qa_multiple_${index}_${counter}`;
                counter++;
            }
            element.id = uniqueId;
        }

        // Créer le subItem
        const itemId = `${keyPrefix}_${index}`;
        const subItems = resolvedSubItemsGenerator
            ? (typeof resolvedSubItemsGenerator === 'function' ? resolvedSubItemsGenerator(element) : resolvedSubItemsGenerator)
            : undefined;
        const hasValidSubItems = subItems && Object.keys(subItems).length > 0;
        if (inlineSubTooltips && resolvedSubItemsGenerator && !hasValidSubItems) {
            console.warn(`[QuickAccess] inlineSubTooltips ignoré pour l'item "${itemId}" (#${element.id}) : subItems a retourné ${subItems ? 'un objet vide' : 'null/undefined'}`);
        } else {
            // console.log(`[QuickAccess] SubItems générés pour l'item "${itemId}" (#${element.id}):`, subItems);
        }

        // Si onDoubleTap est explicitement fourni, on utilise onTap et onDoubleTap tels quels.
        // Sinon (comportement historique) : si l'item a des subItems, onTap est promu en onDoubleTap.
        let resolvedOnTap, resolvedOnDoubleTap;
        if (onDoubleTap !== null) {
            resolvedOnTap = onTap ?? null;
            resolvedOnDoubleTap = onDoubleTap;
        } else {
            resolvedOnTap = hasValidSubItems ? null : onTap;
            resolvedOnDoubleTap = hasValidSubItems ? onTap : null;
        }

        generatedSubItems[itemId] = {
            selector: `${selectorPrefix}#${element.id}`,
            onTap: resolvedOnTap,
            onDoubleTap: resolvedOnDoubleTap,
            subItems: hasValidSubItems ? subItems : undefined,
            ...(inlineSubTooltips && hasValidSubItems ? { inlineSubTooltips: true } : {}),
            ...extraItemProps
        };
    });

    console.log(`[QuickAccess] Sélecteur "${selector}": ${Object.keys(generatedSubItems).length} subItems générés`);
    return generatedSubItems;
}