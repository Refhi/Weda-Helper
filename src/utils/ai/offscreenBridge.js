/**
 * @file offscreenBridge.js
 * @description Communication entre un content script et le document offpage (offscreen), relayée
 * par le background (@see background/offscreenHandler.js). Le "cerveau" du chat (historique,
 * appels au modèle) vit désormais dans l'offpage ; ce fichier fournit les primitives d'envoi/
 * réception de messages, ainsi que l'exécution locale des function calls demandés par l'offpage
 * (celles-ci nécessitent le DOM de la page Weda, @see callableFunctions.js).
 */

const CHAT_PORT_NAME = 'wedaHelper-chat';

let chatPort = null;

/**
 * Ouvre (ou réutilise) le port de communication avec le document offpage, via le background.
 * Répond automatiquement aux demandes d'exécution de fonction ('toolCallRequest') : c'est le
 * seul type de message géré ici de façon générique, indépendamment de toute logique de chat/UI.
 * @returns {chrome.runtime.Port}
 */
function getOffscreenChatPort() {
    if (chatPort) return chatPort;
    chatPort = chrome.runtime.connect({ name: CHAT_PORT_NAME });
    chatPort.onMessage.addListener((message) => {
        if (message?.type === 'toolCallRequest') executeRequestedToolCall(message);
    });
    chatPort.onDisconnect.addListener(() => {
        console.warn('[offscreenBridge] Port avec le document offpage déconnecté');
        chatPort = null;
    });
    return chatPort;
}

/**
 * Envoie un message à l'offpage (le tabId est ajouté automatiquement par le background relais).
 * @param {object} message
 */
function sendOffscreenMessage(message) {
    getOffscreenChatPort().postMessage(message);
}

/**
 * Enregistre un callback appelé à chaque message reçu de l'offpage (chunks de réponse, événements
 * d'appel de fonction, fin de génération, synchronisation d'état...).
 * @param {(message: object) => void} callback
 */
function onOffscreenMessage(callback) {
    getOffscreenChatPort().onMessage.addListener(callback);
}

/**
 * Exécute localement la fonction demandée par l'offpage (seul le content script a accès au DOM de
 * Weda nécessaire, ex: recoverPatientData) et renvoie le résultat.
 * @param {{callId: string, name: string, args: object}} request
 */
async function executeRequestedToolCall({ callId, name, args }) {
    try {
        if (!availableFunctions[name]) throw new Error(`fonction inconnue "${name}"`);
        const result = await availableFunctions[name].execute(args);
        sendOffscreenMessage({ type: 'toolCallResult', callId, result });
    } catch (error) {
        sendOffscreenMessage({ type: 'toolCallResult', callId, error: error.message || String(error) });
    }
}

