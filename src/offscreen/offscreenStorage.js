/**
 * @file offscreenStorage.js
 * @description Lecture des options utilisateur depuis le document offpage. Contrairement à
 * storage.js (utilisé par les content scripts), il n'y a ici ni page Weda à attendre
 * (waitForWeda) ni surcharge WedaOverloadOptions à appliquer : le document offpage n'est jamais
 * chargé sur une page Weda, on lit donc directement chrome.storage.local.
 * Expose la même signature que getOptionPromise (storage.js) pour rester utilisable telle quelle
 * par openAiClient.js, sans le modifier.
 * @param {string|string[]} optionNames
 * @returns {Promise<*>}
 */
function getOptionPromise(optionNames) {
    const isInputArray = Array.isArray(optionNames);
    const names = isInputArray ? optionNames : [optionNames];
    return new Promise((resolve, reject) => {
        // chrome.storage peut devenir indisponible si le contexte d'extension est invalidé
        // (rechargement de l'extension pendant que cet ancien document offpage tourne encore).
        if (!chrome.storage?.local) {
            reject(new Error("chrome.storage indisponible (contexte d'extension invalidé)"));
            return;
        }
        chrome.storage.local.get([...names, 'defaultSettings'], (result) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            const values = names.map(name => result[name] !== undefined ? result[name] : result.defaultSettings?.[name]);
            resolve(isInputArray ? values : values[0]);
        });
    });
}
