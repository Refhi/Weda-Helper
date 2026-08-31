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

// Callbacks enregistrés via onOffscreenMessage : conservés ici (et pas seulement attachés au port
// courant) car un nouveau port est créé à chaque reconnexion (@see connectChatPort), notamment
// après la mort du service worker de background (~30s d'inactivité) qui déconnecte tous les ports
// existants. Sans ça, les écouteurs enregistrés avant la reconnexion seraient perdus silencieusement.
const messageListeners = [];

// Callbacks appelés après une (re)connexion réussie, pour permettre à l'appelant (discussionClient)
// de rejouer 'subscribe'/'requestState' : le service worker qui redémarre perd en mémoire
// l'abonnement de cet onglet (@see background/offscreenHandler.js), il faut donc le refaire.
const reconnectListeners = [];

function connectChatPort() {
    const port = chrome.runtime.connect({ name: CHAT_PORT_NAME });
    port.onMessage.addListener((message) => {
        if (message?.type === 'toolCallRequest') executeRequestedToolCall(message);
        for (const callback of messageListeners) callback(message);
    });
    port.onDisconnect.addListener(() => {
        console.warn('[offscreenBridge] Port avec le document offpage déconnecté, reconnexion...');
        chatPort = null;
        // Reconnexion immédiate (plutôt que d'attendre le prochain envoi utilisateur), pour que les
        // onglets restés inactifs se resynchronisent au plus vite après un redémarrage du service worker.
        getOffscreenChatPort();
    });
    return port;
}

/**
 * Ouvre (ou réutilise) le port de communication avec le document offpage, via le background.
 * Répond automatiquement aux demandes d'exécution de fonction ('toolCallRequest') : c'est le
 * seul type de message géré ici de façon générique, indépendamment de toute logique de chat/UI.
 * @returns {chrome.runtime.Port}
 */
function getOffscreenChatPort() {
    if (chatPort) return chatPort;
    chatPort = connectChatPort();
    for (const callback of reconnectListeners) callback();
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
    getOffscreenChatPort(); // s'assure que le port est ouvert
    messageListeners.push(callback);
}

/**
 * Enregistre un callback appelé juste après chaque (re)connexion du port offpage, y compris la
 * toute première. Utile pour rejouer 'subscribe'/'requestState' après une reconnexion suite à la
 * mort du service worker de background.
 * @param {() => void} callback
 */
function onOffscreenReconnect(callback) {
    reconnectListeners.push(callback);
    // Si le port existe déjà, sa création n'invoquera pas ce nouveau callback : on le fait nous-mêmes
    // pour l'appel initial. Sinon, connectChatPort() l'invoquera (une seule fois) via getOffscreenChatPort().
    if (chatPort) callback();
    else getOffscreenChatPort();
}

/**
 * Exécute localement la fonction demandée par l'offpage (seul le content script a accès au DOM de
 * Weda nécessaire, ex: recoverPatientData) et renvoie le résultat.
 * @param {{callId: string, name: string, args: object}} request
 */
// Intervalle d'envoi des keepalives pour les fonctions longues (doit être nettement inférieur à
// TOOL_CALL_TIMEOUT_MS côté offscreenChatEngine pour éviter tout risque d'expiration entre deux pings).
const KEEPALIVE_INTERVAL_MS = 10000;

async function executeRequestedToolCall({ callId, name, args }) {
    // Signale régulièrement à l'engine que l'exécution est toujours en cours, afin qu'il remette
    // son timer à zéro (@see offscreenChatEngine.js keepaliveToolCall). Permet aux fonctions
    // lentes (ex: data scrapping) de dépasser le timeout de base sans que celui-ci soit élevé.
    const keepaliveId = setInterval(
        () => sendOffscreenMessage({ type: 'toolCallKeepalive', callId }),
        KEEPALIVE_INTERVAL_MS
    );
    try {
        if (!availableFunctions[name]) throw new Error(`fonction inconnue "${name}"`);
        const result = await availableFunctions[name].execute(args);
        sendOffscreenMessage({ type: 'toolCallResult', callId, result });
    } catch (error) {
        sendOffscreenMessage({ type: 'toolCallResult', callId, error: error.message || String(error) });
    } finally {
        clearInterval(keepaliveId);
    }
}

