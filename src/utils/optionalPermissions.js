/**
 * @file optionalPermissions.js
 * @description Gestion des permissions optionnelles Chrome (tabs, etc.).
 * Fournit des fonctions pour vérifier, demander et révoquer des permissions,
 * ainsi que des utilitaires pour gérer les onglets (fermeture, création, etc.).
 * 
 * @exports checkPermission - Vérifie si une permission est accordée
 * @exports requestPermission - Demande une permission utilisateur
 * @exports resetPermission - Révoque une permission
 * @exports handleTabsFeature - Exécute des actions sur les onglets
 * @exports closeCurrentTab - Ferme l'onglet actuel
 * @exports getAllTabs - Récupère tous les onglets
 * @exports createTabsPermissionTestUI - Interface de test des permissions
 * 
 * @requires background.js (communication via chrome.runtime.sendMessage)
 */

/**
 * Vérifie une permission via le script background
 * @param {string} permission - Permission à vérifier
 * @returns {Promise<boolean>} - True si la permission est accordée
 */
function checkPermission(permission) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(
            {
                action: 'optionalPermissionHandler',
                command: 'checkPermission',
                options: { permission }
            },
            (response) => resolve(response?.hasPermission || false)
        );
    });
}

/**
 * Demande une permission via le script background
 * @param {string} permission - Permission à demander
 * @returns {Promise<boolean>} - True si la permission est accordée
 */
function requestPermission(permission) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(
            {
                action: 'optionalPermissionHandler',
                command: 'requestPermission',
                options: { permission }
            },
            (response) => resolve(response?.granted || false)
        );
    });
}

/**
 * Vérifie si une origine (host permission optionnelle, ex: "http://192.168.1.50/*") est déjà accordée
 * @param {string} origin - Motif d'origine à vérifier
 * @returns {Promise<boolean>} - True si l'origine est déjà autorisée
 */
function checkOriginPermission(origin) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(
            {
                action: 'optionalPermissionHandler',
                command: 'checkOrigin',
                options: { origin }
            },
            (response) => resolve(response?.hasPermission || false)
        );
    });
}

/**
 * Demande à l'utilisateur d'autoriser une origine (host permission optionnelle)
 * @param {string} origin - Motif d'origine à demander, ex: "http://192.168.1.50/*"
 * @returns {Promise<boolean>} - True si l'origine a été autorisée
 */
function requestOriginPermission(origin) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(
            {
                action: 'optionalPermissionHandler',
                command: 'requestOrigin',
                options: { origin }
            },
            (response) => resolve(response?.granted || false)
        );
    });
}

/** 
 * Annule une permission accordée via le script background
 * @param {string} permission - Permission à réinitialiser
 * @returns {Promise<boolean>} - True si la réinitialisation a réussi
 */
function resetPermission(permission) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(
            {
                action: 'optionalPermissionHandler',
                command: 'resetPermission',
                options: { permission }
            },
            (response) => resolve(response?.reset || false)
        );
    });
}

// Dans optionalPermissions.js (modification)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'showPermissionConfirmation') {
        const { permission, info } = request;
        const userAccepted = confirm(`Weda-Helper a besoin d'accéder à ${permission}. ${info || 'Autoriser ?'}`);
        sendResponse({ userAccepted });
        return true; // Important: indique que sendResponse sera appelé de façon asynchrone
    }
});

// -------- partie spécifique pour les onglets --------
/**
 * Gère les fonctionnalités d'onglets via le script background
 * @param {Object} params - Paramètres pour l'action
 * @param {string} params.action - Action à effectuer sur les onglets:
 *   - 'create': Crée un nouvel onglet
 *   - 'getActiveTab': Récupère l'onglet actif
 *   - 'getCurrentTab': Récupère l'onglet courant
 *   - 'reload': Recharge l'onglet actif
 *   - 'close': Ferme un onglet spécifique
 *   - 'update': Met à jour les propriétés d'un onglet
 *   - 'query': Recherche des onglets selon des critères
 *   - 'resetPermissions': Réinitialise les permissions d'onglets
 * @param {Object} [params.options] - Options spécifiques à l'action:
 *   - Pour 'create': {url: string, active?: boolean, pinned?: boolean, ...}
 *   - Pour 'close': {tabId: number}
 *   - Pour 'update': {tabId: number, url?: string, active?: boolean, ...}
 *   - Pour 'query': {active?: boolean, currentWindow?: boolean, ...}
 * @returns {Promise<any>} - Résultat de l'opération:
 *   - Pour 'create': Objet représentant l'onglet créé
 *   - Pour 'getActiveTab'/'getCurrentTab': Objet représentant l'onglet
 *   - Pour 'reload'/'close'/'update': Confirmation de l'opération
 *   - Pour 'query': Tableau d'objets d'onglets
 *   - Pour 'resetPermissions': État de la réinitialisation
 * 
 * @example
 * // Créer un nouvel onglet
 * handleTabsFeature({
 *   action: 'create',
 *   options: { url: 'https://example.com', active: true }
 * }).then(tab => console.log('Nouvel onglet créé:', tab.id));
 * 
 * @example
 * // Fermer un onglet spécifique
 * handleTabsFeature({
 *   action: 'close',
 *   options: { tabId: 123 },
 *   info: 'Fermeture après traitement'
 * }).then(() => console.log('Onglet fermé'));
 * 
 * @example
 * // Rechercher tous les onglets d'une fenêtre
 * handleTabsFeature({
 *   action: 'query',
 *   options: { currentWindow: true }
 * }).then(tabs => console.log('Nombre d\'onglets:', tabs.length));
 */

async function handleTabsFeature(params) {
    // Vérifier si la permission tabs est déjà accordée
    const hasPermission = await checkPermission('tabs');
    if (!hasPermission) {
        sendWedaNotifAllTabs({
            message: "L'accès aux onglets est nécessaire pour l'impression instantanée. Veuillez autoriser l'accès ou désactiver l'impresion instantanée dans les paramètres de l'extension.",
            icon: 'warning',
            duration: 10000,
            type: 'undefined',
            action: { 'requestPermission': 'tabs' },
        })
        throw new Error('Permission refusée pour les onglets');
    }


    if (params.info === undefined) {
        params.info = 'Gestion des Onglets';
    }
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
            {
                action: 'optionalPermissionHandler',
                command: 'tabsFeature',
                options: params
            },
            (response) => {
                if (response?.success) {
                    console.log(`[debug ${params.info}]`, response.result);
                    resolve(response.result);
                } else {
                    reject(new Error(response?.error || "Échec de l'opération"));
                }
            }
        );
    });
}

// ------------------ Fonctions simplifiées ------------------
async function getAllTabs() {
    console.log("[debug getAllTabs]");
    return handleTabsFeature({
        action: 'query',
        options: {},
        info: 'Récupération de tous les onglets'
    });
}

/**
 * Ferme l'onglet actuel en vérifiant d'abord les permissions.
 * Demande la permission tabs si nécessaire avant de fermer.
 * 
 * @param {string} [info='Fermeture d\'onglet'] - Message d'information pour l'utilisateur
 * @returns {Promise<void>}
 */
function closeCurrentTab(info = 'Fermeture d\'onglet') {
    document.title = "👋 Fermeture de l'onglet";
    return handleTabsFeature({
        action: 'closeCurrentTab',
        info
    });
}
async function closeTab(tabId) {
    const info = 'Fermeture d\'onglet spécifique' + tabId;
    await handleTabsFeature({
        action: 'close',
        options: { tabId: tabId },
        info
    });
}


// ---------------- interface de tests ----------------
// Permet de tester les fonctionnalités d'onglets et les permissions
// Désactivée (cf. tout en bas pour l'activer)
/**
 * Crée une interface de test complète pour les permissions d'onglets.
 * Génère des boutons pour tester toutes les opérations sur les onglets.
 * 
 * @param {HTMLElement} [container=document.body] - Conteneur où ajouter l'interface
 */
function createTabsPermissionTestUI(container = document.body) {
    // Créer un conteneur pour les tests
    const testContainer = document.createElement('div');
    testContainer.style.padding = '10px';
    testContainer.style.margin = '10px';
    testContainer.style.border = '1px solid #ccc';
    testContainer.style.borderRadius = '5px';
    testContainer.style.backgroundColor = '#f5f5f5';

    const title = document.createElement('h3');
    title.textContent = 'Test des permissions et fonctionnalités d\'onglets';
    testContainer.appendChild(title);

    // Fonction pour créer un bouton de test
    function createTestButton(label, action, options, info) {
        const button = document.createElement('button');
        button.textContent = label;
        button.style.margin = '5px';
        button.style.padding = '8px 12px';
        button.style.borderRadius = '4px';
        button.style.border = '1px solid #ddd';
        button.style.backgroundColor = '#ffffff';
        button.style.cursor = 'pointer';

        button.addEventListener('click', async () => {
            const resultDiv = document.getElementById('tab-test-result');
            resultDiv.textContent = `Exécution de: ${label}...`;

            try {
                const result = await handleTabsFeature({ action, options, info });
                resultDiv.textContent = `Résultat: ${JSON.stringify(result, null, 2)}`;
                resultDiv.style.color = result ? 'green' : 'red';
            } catch (error) {
                resultDiv.textContent = `Erreur: ${error.message}`;
                resultDiv.style.color = 'red';
            }
        });

        return button;
    }

    // Ajouter les boutons de test
    testContainer.appendChild(createTestButton(
        'Créer nouvel onglet',
        'create',
        { url: 'https://www.google.com' },
        'Création d\'onglet'
    ));

    testContainer.appendChild(createTestButton(
        'Obtenir onglet actif',
        'getActiveTab',
        {},
        'Récupération onglet actif'
    ));

    testContainer.appendChild(createTestButton(
        'Obtenir onglet courant',
        'getCurrentTab',
        {},
        'Récupération onglet courant'
    ));

    testContainer.appendChild(createTestButton(
        'Recharger onglet actif',
        'reload',
        {},
        'Rechargement d\'onglet'
    ));

    testContainer.appendChild(createTestButton(
        'Fermer cet onglet',
        'close',
        { tabId: null },
        'Fermeture d\'onglet'
    ));



    // Ajouter un bouton pour tester closeCurrentTab
    const closeCurrentTabButton = document.createElement('button');
    closeCurrentTabButton.textContent = 'Test closeCurrentTab';
    closeCurrentTabButton.style.margin = '5px';
    closeCurrentTabButton.style.padding = '8px 12px';
    closeCurrentTabButton.style.borderRadius = '4px';
    closeCurrentTabButton.style.border = '1px solid #ddd';
    closeCurrentTabButton.style.backgroundColor = '#ffffff';
    closeCurrentTabButton.style.cursor = 'pointer';
    closeCurrentTabButton.addEventListener('click', async () => {
        const resultDiv = document.getElementById('tab-test-result');
        resultDiv.textContent = `Exécution de: Test closeCurrentTab...`;

        try {
            const result = await closeCurrentTab('Test de fermeture');
            resultDiv.textContent = `Résultat: ${JSON.stringify(result, null, 2)}`;
            resultDiv.style.color = 'green';
        } catch (error) {
            resultDiv.textContent = `Erreur: ${error.message}`;
            resultDiv.style.color = 'red';
        }
    });
    testContainer.appendChild(closeCurrentTabButton);

    // Zone de résultat
    const resultDiv = document.createElement('div');
    resultDiv.id = 'tab-test-result';
    resultDiv.style.margin = '10px 5px';
    resultDiv.style.padding = '10px';
    resultDiv.style.border = '1px solid #eee';
    resultDiv.style.borderRadius = '4px';
    resultDiv.style.backgroundColor = '#fff';
    resultDiv.style.minHeight = '50px';
    resultDiv.style.whiteSpace = 'pre-wrap';
    resultDiv.textContent = 'Les résultats apparaîtront ici';
    testContainer.appendChild(resultDiv);

    // Ajout de boutons personnalisés pour vérifier et demander la permission
    const checkPermButton = document.createElement('button');
    checkPermButton.textContent = 'Vérifier Permission';
    checkPermButton.style.margin = '5px';
    checkPermButton.style.padding = '8px 12px';
    checkPermButton.addEventListener('click', async () => {
        const resultDiv = document.getElementById('tab-test-result');
        try {
            const hasPermission = await checkPermission('tabs');
            resultDiv.textContent = `Permission tabs: ${hasPermission ? 'Accordée' : 'Non accordée'}`;
            resultDiv.style.color = hasPermission ? 'green' : 'orange';
        } catch (error) {
            resultDiv.textContent = `Erreur: ${error.message}`;
            resultDiv.style.color = 'red';
        }
    });
    testContainer.appendChild(checkPermButton);

    const requestPermButton = document.createElement('button');
    requestPermButton.textContent = 'Demander Permission';
    requestPermButton.style.margin = '5px';
    requestPermButton.style.padding = '8px 12px';
    requestPermButton.addEventListener('click', async () => {
        const resultDiv = document.getElementById('tab-test-result');
        try {
            const granted = await requestPermission('tabs');
            resultDiv.textContent = `Permission tabs: ${granted ? 'Accordée' : 'Refusée'}`;
            resultDiv.style.color = granted ? 'green' : 'red';
        } catch (error) {
            resultDiv.textContent = `Erreur: ${error.message}`;
            resultDiv.style.color = 'red';
        }
    });
    testContainer.appendChild(requestPermButton);

    // Ajouter un bouton pour réinitialiser les permissions
    const resetPermissionsButton = document.createElement('button');
    resetPermissionsButton.textContent = 'Réinitialiser Permissions';
    resetPermissionsButton.style.margin = '5px';
    resetPermissionsButton.style.padding = '8px 12px';
    resetPermissionsButton.style.backgroundColor = 'red';
    resetPermissionsButton.style.color = 'white';
    resetPermissionsButton.addEventListener('click', async () => {
        const resultDiv = document.getElementById('tab-test-result');
        try {
            const result = await resetPermission('tabs');
            resultDiv.textContent = `Réinitialisation: ${result ? 'OK' : 'Échec'}`;
            resultDiv.style.color = result ? 'green' : 'red';
        } catch (error) {
            resultDiv.textContent = `Erreur: ${error.message}`;
            resultDiv.style.color = 'red';
        }
    });
    testContainer.appendChild(resetPermissionsButton);


    // Ajouter au container
    container.appendChild(testContainer);
}

/**
 * Initialise l'interface de test des permissions d'onglets.
 * Crée un bouton pour afficher/masquer l'interface de test.
 */
function initTabPermissionTests() {
    // Créer un bouton pour afficher/masquer l'interface de test
    const toggleButton = document.createElement('button');
    toggleButton.textContent = 'Afficher/Masquer Tests Permissions Onglets';
    toggleButton.style.position = 'fixed';
    toggleButton.style.top = '10px';
    toggleButton.style.right = '10px';
    toggleButton.style.zIndex = '10000';
    toggleButton.style.padding = '8px 12px';
    toggleButton.style.backgroundColor = '#4CAF50';
    toggleButton.style.color = 'white';
    toggleButton.style.border = 'none';
    toggleButton.style.borderRadius = '4px';
    toggleButton.style.cursor = 'pointer';

    const testPanel = document.createElement('div');
    testPanel.style.display = 'none';
    testPanel.style.position = 'fixed';
    testPanel.style.top = '50px';
    testPanel.style.right = '10px';
    testPanel.style.zIndex = '10000';
    testPanel.style.maxWidth = '400px';
    testPanel.style.maxHeight = '80vh';
    testPanel.style.overflowY = 'auto';

    toggleButton.addEventListener('click', () => {
        testPanel.style.display = testPanel.style.display === 'none' ? 'block' : 'none';
    });

    document.body.appendChild(toggleButton);
    document.body.appendChild(testPanel);

    createTabsPermissionTestUI(testPanel);
}

// Exécuter l'initialisation
addTweak('*', 'initTabPermissionTests', function () {
    initTabPermissionTests();
});

async function debugTabs() {
    let allTabs = await getAllTabs();
    console.log("[Debug]", allTabs);
    let tab = allTabs.find(tab => tab.url.includes('https://secure.weda.fr/FolderMedical/PrescriptionForm.aspx'));
    console.log("[Debug]", tab);
    closeTab(tab.id)
}
// debugTabs();