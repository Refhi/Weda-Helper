// Ici on gère les permissions optionnelles



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
 * Vérifie si une permission optionnelle est déjà accordée
 * @param {string|string[]} permission - La permission ou tableau de permissions à vérifier
 * @returns {Promise<boolean>} - Une promesse qui se résout avec true si accordée, false sinon
 */
function checkPermission(permission) {
    // Convertir une seule permission en tableau si nécessaire
    const permissions = Array.isArray(permission) ? permission : [permission];

    return new Promise((resolve) => {
        chrome.permissions.contains({
            permissions: permissions
        }, function (hasPermission) {
            if (hasPermission) {
                console.log(`L'autorisation ${permissions.join(', ')} est déjà accordée`);
                resolve(true);
            } else {
                console.log(`L'autorisation ${permissions.join(', ')} n'est pas accordée`);
                resolve(false);
            }
        });
    });
}


/**
 * Gère les fonctionnalités liées aux onglets, vérifie et demande les permissions nécessaires
 * @param {string} action - L'action à effectuer sur les onglets
 * @param {Object} [options={}] - Options pour l'action spécifiée : create, update, query, getCurrentTab, reload, close, capture, insertCSS
 * @returns {Promise<boolean|Object>} - Résultat de l'action ou statut de la permission
 */
async function handleTabsFeature({ action, options = {}, info = null } = {}) {
    // Vérifier si la permission tabs est déjà accordée
    const hasPermission = await checkPermission('tabs');

    // Si la permission n'est pas accordée, la demander
    if (!hasPermission) {
        let granted = await requestPermission('tabs');
        if (!granted) {
            console.warn("La fonctionnalité tabs ne peut pas être utilisée sans la permission appropriée");
            const confirmationAutorisationTab = confirm("[Weda Helper] Pour utiliser l'option " + info + ", vous devez désormais autoriser l'accès aux onglets\nVoulez-vous accorder l'autorisation maintenant?");
            if (confirmationAutorisationTab) {
                granted = await requestPermission('tabs');
            } else {
                sendWedaNotifAllTabs({
                    message: "L'accès aux onglets est nécessaire pour utiliser cette fonctionnalité. Pour éviter ce message d'erreur vous devez soit désactiver l'option" + info + " ou accorder l'autorisation d'accès aux onglets la prochaine fois.",
                    type: 'error',
                    icon: 'error'
                })
            }
            return false;
        }
    }

    // Permission accordée, exécuter l'action demandée
    // Note : toutes les actions ont été préparées, mais Weda-Helper ne les utilise pas toutes
    try {
        switch (action) {
            case 'create':
                // Créer un nouvel onglet
                return new Promise(resolve => {
                    chrome.tabs.create(options, tab => resolve(tab));
                });

            case 'update':
                // Mettre à jour un onglet (options doit contenir tabId)
                return new Promise(resolve => {
                    const { tabId, ...updateOptions } = options;
                    chrome.tabs.update(tabId || null, updateOptions, tab => resolve(tab));
                });

            case 'query':
                // Rechercher des onglets selon des critères
                return new Promise(resolve => {
                    chrome.tabs.query(options, tabs => resolve(tabs));
                });

            case 'getCurrentTab':
                // Obtenir l'onglet où s'exécute le script (contexte actuel)
                return new Promise(resolve => {
                    chrome.tabs.getCurrent(tab => {
                        if (chrome.runtime.lastError) {
                            console.log("Impossible d'obtenir l'onglet courant:", chrome.runtime.lastError.message);
                            resolve(null);
                        } else {
                            resolve(tab);
                        }
                    });
                });

            case 'getActiveTab':
                // Obtenir l'onglet actif (celui qui a le focus)
                return new Promise(resolve => {
                    chrome.tabs.query({ active: true, currentWindow: true }, tabs => resolve(tabs[0]));
                });

            case 'reload':
                // Recharger un onglet
                return new Promise(resolve => {
                    chrome.tabs.reload(options.tabId, options.reloadOptions || {}, () => {
                        if (chrome.runtime.lastError) {
                            resolve(false);
                        } else {
                            resolve(true);
                        }
                    });
                });

            case 'close':
                // Fermer un ou plusieurs onglets
                return new Promise(resolve => {
                    const tabIds = Array.isArray(options.tabIds) ? options.tabIds : [options.tabId];
                    chrome.tabs.remove(tabIds, () => resolve(true));
                });

            case 'capture':
                // Capturer le contenu visuel d'un onglet
                return new Promise(resolve => {
                    chrome.tabs.captureVisibleTab(options.windowId || null, options.captureOptions || {}, dataUrl => {
                        resolve(dataUrl);
                    });
                });

            case 'insertCSS':
                // Injecter du CSS dans un onglet
                return new Promise(resolve => {
                    chrome.tabs.insertCSS(
                        options.tabId || null,
                        options.details || { code: options.code },
                        () => resolve(true)
                    );
                });

            default:
                throw new Error(`Action non reconnue: ${action}`);
        }
    } catch (error) {
        console.error(`Erreur lors de l'exécution de l'action ${action} sur les onglets:`, error);
        return false;
    }
}

/**
 * Ferme l'onglet courant si ce n'est pas l'onglet actif
 * @param {string} info - Information sur la fonctionnalité demandant la fermeture
 */
function closeCurrentTab(info) {
    // D'abord on récupère l'onglet où s'exécute le script
    handleTabsFeature({ action: 'getCurrentTab' }).then(currentTab => {
        if (!currentTab) {
            console.log("Impossible d'obtenir l'onglet courant");
            return;
        }
        
        // Ensuite on vérifie si c'est l'onglet actif
        handleTabsFeature({ action: 'getActiveTab' }).then(activeTab => {
            if (!activeTab) {
                console.log("Impossible d'obtenir l'onglet actif");
                return;
            }
            
            // On compare les IDs des onglets
            if (currentTab.id === activeTab.id) {
                console.log("Fermeture annulée : tentative de fermer l'onglet actif");
                return;
            }
            
            // Si ce n'est pas l'onglet actif, on peut le fermer
            handleTabsFeature({ 
                action: 'close', 
                options: { tabId: currentTab.id }, 
                info: info 
            });
        });
    });
}