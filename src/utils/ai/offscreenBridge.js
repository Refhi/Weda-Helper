/**
 * @file offscreenBridge.js
 * @description Squelette minimum de communication entre un content script et le document offpage
 * (offscreen), relayée par le background (@see background/offscreenHandler.js). Étape 1 : ouverture
 * du port et primitives d'envoi/réception basiques. Aucune logique métier (chat, historique...)
 * n'est encore branchée dessus.
 */

const CHAT_PORT_NAME = 'wedaHelper-chat';

let chatPort = null;

/**
 * Ouvre (ou réutilise) le port de communication avec le document offpage, via le background.
 * @returns {chrome.runtime.Port}
 */
function getOffscreenChatPort() {
    if (chatPort) return chatPort;
    chatPort = chrome.runtime.connect({ name: CHAT_PORT_NAME });
    chatPort.onDisconnect.addListener(() => {
        console.warn('[offscreenBridge] Port avec le document offpage déconnecté');
        chatPort = null;
    });
    return chatPort;
}
