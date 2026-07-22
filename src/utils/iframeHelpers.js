/**
 * @file iframeHelpers.js
 * @description Utilitaires partagés pour créer et interroger des iframes cachées, utilisées
 * par dataScrapper.js (lecture de données) et dataInserter.js (insertion de données) pour
 * naviguer dans les pages Weda sans quitter la page courante.
 *
 * @exports createHiddenIframe - Crée une iframe cachée (ou visible en mode debug) chargée sur une URL
 * @exports waitForElementInDocument - Attend qu'un élément apparaisse dans un document (utile pour les iframes)
 * @exports waitUntil - Attend qu'une condition devienne vraie, à intervalles réguliers
 */

/**
 * Crée une iframe cachée (ou visible en plein écran en mode debug) chargée sur l'URL donnée.
 * @param {string} url - URL à charger dans l'iframe
 * @param {boolean} [debug=false] - Si true, affiche l'iframe en plein écran pour faciliter le debug
 * @param {string} [iframeId='WedaHelperHiddenIframe'] - id à attribuer à l'iframe créée
 * @returns {Promise<HTMLIFrameElement>}
 */
function createHiddenIframe(url, debug = false, iframeId = 'WedaHelperHiddenIframe') {
    return new Promise((resolve, reject) => {
        const iframe = document.createElement('iframe');
        if (debug) {
            iframe.style.position = 'fixed';
            iframe.style.top = '2vh';
            iframe.style.left = '2vw';
            iframe.style.width = '96vw';
            iframe.style.height = '96vh';
            iframe.style.zIndex = '999999';
            iframe.style.border = '3px solid #d22';
            iframe.style.background = '#fff';
            iframe.style.display = 'block';
        } else {
            iframe.style.display = 'none';
        }
        iframe.src = url;
        iframe.id = iframeId;
        iframe.onload = () => resolve(iframe);
        iframe.onerror = err => reject(err);
        document.body.appendChild(iframe);
    });
}

/**
 * Attend qu'un élément apparaisse dans un document obtenu via docGetter (utile pour les
 * documents d'iframe, potentiellement remplacés après un postback ASP.NET).
 * @param {() => Document|null|undefined} docGetter - Fonction retournant le document courant à interroger
 * @param {string} selector - Sélecteur CSS de l'élément attendu
 * @param {number} [timeoutMs=12000] - Délai maximal d'attente
 * @param {number} [intervalMs=100] - Intervalle entre deux vérifications
 * @returns {Promise<Element>}
 */
async function waitForElementInDocument(docGetter, selector, timeoutMs = 12000, intervalMs = 100) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        const doc = docGetter();
        const element = doc?.querySelector(selector);
        if (element) {
            return element;
        }
        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    throw new Error(`Timeout: élément non trouvé (${selector})`);
}

/**
 * Attend qu'une condition devienne vraie, en la testant à intervalles réguliers.
 * @param {Function} conditionFn - Fonction sans argument retournant un booléen (ou une valeur "truthy")
 * @param {Object} [options]
 * @param {number} [options.interval=50] - Intervalle entre deux vérifications, en ms
 * @param {number} [options.maxRetry=200] - Nombre maximal de vérifications avant timeout
 * @param {string} [options.label=""] - Libellé utilisé dans le message de timeout
 * @returns {Promise<boolean>} true si la condition a été remplie, false en cas de timeout
 */
async function waitUntil(conditionFn, { interval = 50, maxRetry = 200, label = "" } = {}) {
    for (let i = 0; i < maxRetry; i++) {
        if (conditionFn()) return true;
        await sleep(interval);
    }
    console.warn(`[iframeHelpers] Timeout lors de l'attente : ${label}`);
    return false;
}
