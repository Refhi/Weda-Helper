/**
 * @file offscreen.js
 * @description Point d'entrée du document offpage (offscreen) chargé par le background pour
 * assurer la permanence du chat IA au sein d'une session : contrairement au service worker, ce
 * document n'est pas tué entre deux messages ni entre deux rechargements d'onglet. Ce fichier se
 * contente d'ouvrir le port vers le background et de distribuer les messages reçus vers le moteur
 * de chat (@see offscreenChatEngine.js).
 */

const OFFSCREEN_PORT_NAME = 'wedaHelper-offscreen';

// Utiliser `let` pour permettre la reconnexion automatique lorsque le service worker
// s'arrête (ce qui arrive après une longue inactivité ou en cours de streaming).
let backgroundPort;

function connectToBackground() {
    backgroundPort = chrome.runtime.connect({ name: OFFSCREEN_PORT_NAME });

    backgroundPort.onMessage.addListener((message) => {
        switch (message.type) {
            case 'userMessage':
                processUserMessage(message);
                break;
            case 'toolCallResult':
                resolveToolCall(message);
                break;
            case 'resetChat':
                resetConversation(message.patientId);
                break;
            case 'stopGeneration':
                stopGeneration(message.patientId);
                break;
            case 'setModel':
                setModel(message.patientId, message.model);
                break;
            case 'requestState':
                sendStateSync(message.tabId, message.patientId);
                break;
            case 'tabDisconnected':
                rejectPendingToolCallsForTab(message.tabId);
                break;
            default:
                console.warn('[offscreen] Message de type inconnu ignoré :', message);
        }
    });

    backgroundPort.onDisconnect.addListener(() => {
        console.warn('[offscreen] Port avec le background déconnecté, reconnexion...');
        // Le service worker s'est arrêté ; on se reconnecte pour être prêt à recevoir
        // les prochains messages dès qu'il redémarre.
        connectToBackground();
    });
}

connectToBackground();
console.log('[offscreen] Document offpage prêt, port connecté au background');
