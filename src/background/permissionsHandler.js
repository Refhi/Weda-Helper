// --------------- gestion des permissions optionnelles ---------------

// Système de gestion centralisée des messages pour les permissions et opérations
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Vérification du format attendu de la requête
    if (!request || typeof request !== 'object') {
        console.error("Format de requête invalide:", request);
        sendResponse({ success: false, error: "Format de requête invalide" });
        return true;
    }

    // Si ce n'est pas une commande pour notre gestionnaire, on ignore
    if (request.action !== 'optionalPermissionHandler') {
        return false;
    }

    // Vérification que command est présent et valide
    if (!request.command || typeof request.command !== 'string') {
        console.error("Format de commande invalide:", request.command);
        sendResponse({ success: false, error: "Format de commande invalide" });
        return true;
    }

    // Vérification que options est un objet (peut être vide)
    if (request.options !== undefined && typeof request.options !== 'object') {
        console.error("Format d'options invalide:", request.options);
        sendResponse({ success: false, error: "Format d'options invalide" });
        return true;
    }

    // Traitement asynchrone
    console.log("[Optionnal Permissions] Traitement de la commande:", request.command);
    (async () => {
        const result = await handlePermissionCommand(request.command, request.options, sender || {});
        sendResponse(result);
    })();

    // Retourner true pour indiquer que la réponse sera envoyée de manière asynchrone
    return true;
});

/**
 * Gère les commandes liées aux permissions et aux onglets
 * @param {string} command - Commande à exécuter:
 *   - 'checkPermission': Vérifie si une permission est accordée
 *   - 'requestPermission': Demande une permission à l'utilisateur
 *   - 'resetPermission': Retire une permission précédemment accordée
 *   - 'tabsFeature': Exécute une action sur les onglets (create, getActiveTab, getCurrentTab, reload, close)
 *   - 'closeCurrentTab': Ferme l'onglet actuel
 * @param {Object} options - Options pour la commande
 * @returns {Promise<Object>} - Résultat de la commande
 */
async function handlePermissionCommand(command, options, sender) {
    console.log("handlePermissionCommand", command, options);
    try {
        let result;

        switch (command) {
            case 'checkPermission':
                result = { hasPermission: await checkPermission(options.permission) };
                break;

            case 'requestPermission':
                result = { granted: await requestPermission(options.permission) };
                break;

            case 'resetPermission':
                result = { reset: await resetPermission(options.permission) };
                break;

            case 'checkOrigin':
                result = { hasPermission: await checkOriginPermission(options.origin) };
                break;

            case 'requestOrigin':
                result = { granted: await requestOriginPermission(options.origin) };
                break;

            case 'tabsFeature':
                result = { success: true, result: await handleTabsFeature(options, sender) };
                break;

            case 'closeCurrentTab':
                result = { success: true, result: await closeCurrentTab(options?.info) };
                break;

            default:
                result = { success: false, error: "Commande non reconnue" };
        }

        return result;
    } catch (error) {
        console.error("Erreur lors du traitement de la commande:", error);
        return { success: false, error: error.message };
    }
}



/**
 * Demande une permission optionnelle à l'utilisateur
 * @param {string|string[]} permission - La permission ou tableau de permissions à demander
 * @returns {Promise<boolean>} - Une promesse qui se résout avec true si accordée, false sinon
 */
function requestPermission(permission) {
    // Convertir une seule permission en tableau si nécessaire
    const permissions = Array.isArray(permission) ? permission : [permission];

    return new Promise((resolve) => {
        chrome.permissions.request({
            permissions: permissions
        }, function (granted) {
            if (granted) {
                console.log(`L'autorisation ${permissions.join(', ')} a été accordée`);
                resolve(true);
            } else {
                console.log(`L'autorisation ${permissions.join(', ')} a été refusée`);
                resolve(false);
            }
        });
    });
}

/**
 * Demande à l'utilisateur d'autoriser une origine (host permission optionnelle)
 * @param {string} origin - Motif d'origine à demander, ex: "http://192.168.1.50/*"
 * @returns {Promise<boolean>} - True si l'origine a été autorisée
 */
function requestOriginPermission(origin) {
    return new Promise((resolve) => {
        chrome.permissions.request({ origins: [origin] }, (granted) => {
            console.log(`L'origine ${origin} a ${granted ? '' : 'NON '}été accordée`);
            resolve(!!granted);
        });
    });
}

/**
 * Vérifie si une origine (host permission optionnelle) est déjà accordée
 * @param {string} origin - Motif d'origine à vérifier
 * @returns {Promise<boolean>}
 */
function checkOriginPermission(origin) {
    return new Promise((resolve) => {
        chrome.permissions.contains({ origins: [origin] }, (hasPermission) => {
            resolve(!!hasPermission);
        });
    });
}

/**
 * Réinitialise les permissions optionnelles
 * @param {string|string[]} permission - La permission ou tableau de permissions à réinitialiser
 * @returns {Promise<boolean>} - Une promesse qui se résout avec true si réinitialisée, false sinon
 */
function resetPermission(permission) {
    // Convertir une seule permission en tableau si nécessaire
    const permissions = Array.isArray(permission) ? permission : [permission];
    console.log("resetPermission", permissions);
    if (permissions.length === 0) {
        console.log("Aucune permission à réinitialiser");
        return Promise.resolve(false);
    }

    return new Promise((resolve) => {
        chrome.permissions.remove({
            permissions: permissions
        }, function (removed) {
            if (removed) {
                console.log(`L'autorisation ${permissions.join(', ')} a été réinitialisée`);
                resolve(true);
            } else {
                console.log(`L'autorisation ${permissions.join(', ')} n'a pas pu être réinitialisée`);
                resolve(false);
            }
        });
    });
}


/**
 * Vérifie si une permission optionnelle est déjà accordée
 * @param {string|string[]|null} permission - La permission ou tableau de permissions à vérifier
 *                                          - Si null, 'All' ou '*', vérifie toutes les permissions
 * @returns {Promise<boolean|Object>} - Une promesse qui se résout avec true/false si une permission spécifique,
 *                                      ou un objet avec toutes les permissions si demandé
 */
async function checkPermission(permission) {
    console.log("checkPermission", permission);

    // Si on demande toutes les permissions
    if (permission === null || permission === 'All' || permission === '*') {
        return new Promise((resolve) => {
            chrome.permissions.getAll((permissions) => {
                console.log("Toutes les permissions:", permissions);
                resolve(permissions);
            });
        });
    }

    // Convertir une seule permission en tableau si nécessaire
    const permissionsList = Array.isArray(permission) ? permission : [permission];

    console.log("permissionsList", permissionsList);

    return new Promise((resolve) => {
        chrome.permissions.contains({
            permissions: permissionsList
        }, function (hasPermission) {
            console.log("hasPermission", hasPermission);
            if (hasPermission) {
                console.log(`L'autorisation ${permissionsList.join(', ')} est déjà accordée`);
                resolve(true);
            } else {
                console.log(`L'autorisation ${permissionsList.join(', ')} n'est pas accordée`);
                resolve(false);
            }
        });
    });
}


