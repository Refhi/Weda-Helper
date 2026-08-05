/**
 * @file offscreenStorage.js
 * @description Lecture des options utilisateur depuis le document offpage. Un document hors écran
 * n'a accès à aucune API d'extension autre que chrome.runtime (chrome.storage y est inaccessible,
 * voir la doc chrome.offscreen) : la lecture est donc déléguée au background, seul à disposer de
 * chrome.storage (@see background/offscreenHandler.js).
 * Expose la même signature que getOptionPromise (storage.js) pour rester utilisable telle quelle
 * par openAiClient.js, sans le modifier.
 * @param {string|string[]} optionNames
 * @returns {Promise<*>}
 */
function getOptionPromise(optionNames) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'getStorageOption', optionNames }, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            if (response?.error) {
                reject(new Error(response.error));
                return;
            }
            resolve(response?.value);
        });
    });
}
