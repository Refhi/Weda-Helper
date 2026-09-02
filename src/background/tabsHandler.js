/**
 * Gère les fonctionnalités liées aux onglets, vérifie et demande les permissions nécessaires
 * @param {string} action - L'action à effectuer sur les onglets
 * @param {Object} [options={}] - Options pour l'action spécifiée : create, update, query, getCurrentTab, reload, close, capture, insertCSS
 * @returns {Promise<boolean|Object>} - Résultat de l'action ou statut de la permission
 */
async function handleTabsFeature({ action, options = {}, info = "" } = {}, sender = {}) {
    // Vérifier si la permission tabs est déjà accordée
    const hasPermission = await checkPermission('tabs');

    // Si la permission n'est pas accordée, la demander
    if (!hasPermission) {
        let granted = await requestPermissionWithConfirmation('tabs');
        if (!granted) {
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
                    chrome.tabs.get(sender.tab.id, tab => {
                        if (chrome.runtime.lastError) {
                            console.error("Erreur lors de l'obtention de l'onglet:", chrome.runtime.lastError.message);
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
                if (!options.tabId && !options.tabIds) {
                    throw new Error("Aucun ID d'onglet spécifié pour la fermeture");
                }
                return new Promise(resolve => {
                    const tabIds = Array.isArray(options.tabIds) ? options.tabIds : [options.tabId];
                    chrome.tabs.remove(tabIds, () => resolve(true));
                });

            case 'closeCurrentTab':
                // Fermer l'onglet courant (si ce n'est pas l'onglet actif)
                return closeCurrentTab(sender);

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
 * @param {string} info - Information sur la raison de la fermeture
 * @returns {Promise<boolean>} - Résultat de l'opération de fermeture
 */
async function closeCurrentTab(sender) {
    console.log("[closeCurrentTab] Tentative de fermeture de l'onglet courant");

    try {
        // Récupérer l'onglet où s'exécute le script
        const currentTab = sender.tab;
        if (!currentTab) {
            console.log("[closeCurrentTab] Impossible d'obtenir l'onglet courant");
            return false;
        }

        // Récupérer l'onglet actif
        const activeTab = await handleTabsFeature({ action: 'getActiveTab' });
        if (!activeTab) {
            console.log("[closeCurrentTab] Impossible d'obtenir l'onglet actif");
            return false;
        }

        // Comparer les IDs des onglets
        if (currentTab.id === activeTab.id) {
            console.log("[closeCurrentTab] Fermeture annulée : tentative de fermer l'onglet actif");
            return false;
        }

        // Si ce n'est pas l'onglet actif, on peut le fermer
        const result = await handleTabsFeature({
            action: 'close',
            options: { tabId: currentTab.id },
        });

        return result;
    } catch (error) {
        console.error("[closeCurrentTab] Erreur lors de la fermeture de l'onglet:", error);
        return false;
    }
}

