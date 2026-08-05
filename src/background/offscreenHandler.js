/**
 * @file offscreenHandler.js
 * @description Gère le document offpage (offscreen) qui assure la permanence du chat IA au sein
 * d'une session (le service worker de background, lui, est régulièrement tué et perd son état).
 * Étape 1 : squelette minimum de communication, via deux ports dédiés côté background :
 *   - 'wedaHelper-offscreen' : port ouvert par le document offpage lui-même à sa création.
 *   - 'wedaHelper-chat'      : port ouvert par un content script (un par onglet) pour discuter
 *                              avec le document offpage, relayé par ce fichier.
 * Aucune logique métier (historique, appels IA...) n'est encore présente : uniquement le relais.
 */

const OFFSCREEN_DOCUMENT_PATH = 'src/offscreen/offscreen.html';

// Port ouvert par le document offpage vers le background (un seul document offpage à la fois).
let offscreenPort = null;

// Ports ouverts par les content scripts (un par onglet), indexés par tabId.
const chatPortsByTabId = new Map();

/**
 * Vérifie si un document offpage est déjà ouvert.
 * @returns {Promise<boolean>}
 */
async function hasOffscreenDocument() {
    const contexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)]
    });
    return contexts.length > 0;
}

// Évite de lancer plusieurs créations concurrentes du document offpage.
let creatingOffscreenDocument = null;

/**
 * Crée le document offpage s'il n'existe pas déjà.
 * @returns {Promise<void>}
 */
async function ensureOffscreenDocument() {
    if (await hasOffscreenDocument()) return;
    if (creatingOffscreenDocument) {
        await creatingOffscreenDocument;
        return;
    }
    creatingOffscreenDocument = chrome.offscreen.createDocument({
        url: OFFSCREEN_DOCUMENT_PATH,
        reasons: ['LOCAL_STORAGE'],
        justification: "Permanence de l'historique du chat IA au sein de la session"
    });
    try {
        await creatingOffscreenDocument;
    } finally {
        creatingOffscreenDocument = null;
    }
}

const OFFSCREEN_PORT_NAME = 'wedaHelper-offscreen';
const CHAT_PORT_NAME = 'wedaHelper-chat';

chrome.runtime.onConnect.addListener((port) => {
    // Cette partie est lancée quand on est dans une page de l'extension (background ou offscreen) 
    if (port.name === OFFSCREEN_PORT_NAME) {
        offscreenPort = port;
        console.log('[offscreenHandler] Document offpage connecté');

        // Relais offpage -> onglet concerné (le message doit porter un champ tabId)
        port.onMessage.addListener((message) => {
            const chatPort = chatPortsByTabId.get(message?.tabId);
            if (chatPort) chatPort.postMessage(message);
        });

        port.onDisconnect.addListener(() => {
            console.warn('[offscreenHandler] Document offpage déconnecté');
            offscreenPort = null;
        });
        return;
    }

    // Cette partie est lancée quand on est dans un content script (un par onglet)
    if (port.name === CHAT_PORT_NAME) {
        const tabId = port.sender?.tab?.id;
        if (tabId === undefined) {
            console.error('[offscreenHandler] Port de chat sans tabId, refusé');
            port.disconnect();
            return;
        }
        chatPortsByTabId.set(tabId, port);
        console.log(`[offscreenHandler] Content script connecté (tabId ${tabId})`);

        // Relais onglet -> offpage (on tague le message avec le tabId d'origine pour le retour)
        port.onMessage.addListener(async (message) => {
            await ensureOffscreenDocument();
            offscreenPort?.postMessage({ ...message, tabId });
        });

        port.onDisconnect.addListener(() => {
            chatPortsByTabId.delete(tabId);
            console.log(`[offscreenHandler] Content script déconnecté (tabId ${tabId})`);
            offscreenPort?.postMessage({ type: 'tabDisconnected', tabId });
        });
    }
});

// Le document offpage doit persister dès le démarrage du service worker (et non uniquement à la
// première connexion d'un onglet), pour être prêt avant toute demande.
ensureOffscreenDocument();

/**
 * Relais de lecture des options pour le document offpage : celui-ci n'a accès qu'à chrome.runtime
 * (les documents hors écran n'ont pas accès à chrome.storage, voir doc chrome.offscreen), le
 * background lit donc chrome.storage.local à sa place (@see offscreen/offscreenStorage.js).
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== 'getStorageOption') return false;
    const isInputArray = Array.isArray(message.optionNames);
    const names = isInputArray ? message.optionNames : [message.optionNames];
    chrome.storage.local.get([...names, 'defaultSettings'], (result) => {
        if (chrome.runtime.lastError) {
            sendResponse({ error: chrome.runtime.lastError.message });
            return;
        }
        const values = names.map(name => result[name] !== undefined ? result[name] : result.defaultSettings?.[name]);
        sendResponse({ value: isInputArray ? values : values[0] });
    });
    return true; // réponse envoyée de façon asynchrone
});
