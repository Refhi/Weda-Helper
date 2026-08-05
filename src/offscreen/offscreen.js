/**
 * @file offscreen.js
 * @description Document offpage (offscreen) chargé par le background pour assurer la permanence
 * du chat IA au sein d'une session : contrairement au service worker, ce document n'est pas tué
 * entre deux messages et dispose d'un contexte DOM classique (localStorage, etc.).
 * Étape 1 : uniquement le squelette de communication (port dédié avec le background). Aucune
 * logique métier (historique, appels IA...) n'est encore présente ici.
 */

const OFFSCREEN_PORT_NAME = 'wedaHelper-offscreen';

const backgroundPort = chrome.runtime.connect({ name: OFFSCREEN_PORT_NAME });

backgroundPort.onMessage.addListener((message) => {
    console.log('[offscreen] Message reçu du background :', message);
});

backgroundPort.onDisconnect.addListener(() => {
    console.warn('[offscreen] Port avec le background déconnecté');
});

console.log('[offscreen] Document offpage prêt, port connecté au background');
