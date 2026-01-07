
/**
 * @file dom-oberver.js
 * @description Observateurs et utilitaires pour la manipulation et l'observation du DOM.
 * Fournit des fonctions pour attendre l'apparition d'éléments, observer les mutations du DOM,
 * et gérer les états de chargement des pages.
 * 
 * @exports waitForElement - Fonction principale pour observer l'apparition d'éléments
 * @exports afterMutations - Détecte la fin des mutations DOM
 * @exports observeDiseapearance - Observe la disparition d'un élément
 * @exports waitForWeda - Attend la réception des données de configuration Weda
 * 
 * @requires configs.js (gotDataFromWeda)
 */

/**
 * @deprecated Utilisez `waitForElement` à la place.
 * @see waitForElement
 * laissé en place pour une disparition progressive
 */
function waitLegacyForElement(selector, text = null, timeout, callback) {
    var checkInterval = setInterval(function () {
        var elements = document.querySelectorAll(selector);
        for (var i = 0; i < elements.length; i++) {
            if (!text || elements[i].textContent.includes(text)) {
                callback(elements[i]);
                clearInterval(checkInterval);
                clearTimeout(timeoutId);
                return;
            }
        }
    }, 100);

    var timeoutId = setTimeout(function () {
        clearInterval(checkInterval);
        console.log(`Element ${selector} ${text ? 'with text "' + text + '"' : ''} not found after ${timeout} ms`);
    }, timeout);
}


/**
 * Détecte la fin des mutations DOM et exécute un callback après un délai sans mutation.
 * Utile pour détecter quand une page a fini de se charger/modifier dynamiquement.
 * 
 * @param {Object} options - Options de configuration
 * @param {number} options.delay - Délai en ms sans mutation avant d'exécuter le callback
 * @param {Function} options.callback - Fonction à exécuter après le délai sans mutation
 * @param {string} [options.callBackId="callback id undefined"] - Identifiant pour le debug
 * @param {boolean} [options.preventMultiple=false] - Si vrai, déconnecte l'observateur après le premier appel
 * 
 * @example
 * afterMutations({
 *   delay: 500,
 *   callback: () => { console.log('Page chargée'); },
 *   callBackId: 'Page principale',
 *   preventMultiple: true
 * });
 */
function afterMutations({ delay, callback, callBackId = "callback id undefined", preventMultiple = false }) {
    let timeoutId = null;
    const action = () => {
        // console.debug(`Aucune mutation détectée pendant ${delay}ms, je considère la page comme chargée. Appel du Callback. (${callBackId})`);
        if (preventMultiple) {
            observer.disconnect();
            callback();
            afterMutations({ delay, callback, callBackId, preventMultiple });
        } else {
            callback();
        }

    };

    const observer = new MutationObserver((mutationsList, observer) => {
        for (let mutation of mutationsList) {
            // Réinitialise le délai chaque fois qu'une mutation est détectée
            clearTimeout(timeoutId);
            timeoutId = setTimeout(action, delay);
        }
    });

    observer.observe(document, { childList: true, subtree: true });
};


/**
 * Observe l'apparition d'un élément dans le DOM et exécute une fonction de rappel.
 * Remplace lightObserver
 * @param {Object} options - Les options sous forme destructurée pour plus de clarté :
 * @param {string} options.selector - Le sélecteur de l'élément à observer.
 * @param {Function} [options.callback] - La fonction à exécuter lorsque l'élément apparaît (optionnel si utilisé avec await).
 * @param {HTMLElement} [options.parentElement=document] - L'élément parent dans lequel observer les mutations.
 * @param {boolean} [options.justOnce=false] - Si vrai, l'observation s'arrête après la première apparition de l'élément.
 * @param {boolean} [options.debug=false] - Si vrai, affiche des messages de debug dans la console.
 * @param {string|null} [options.textContent=null] - Filtre les éléments par leur contenu textuel.
 * @param {boolean} [options.triggerOnInit=false] - Si vrai, déclenche le callback immédiatement si les éléments existent déjà.
 * @returns {Promise|MutationObserver} - Retourne une promesse si aucun callback n'est fourni, sinon l'observateur.
 *
 * @example
 * // Utilisation avec callback
 * waitForElement({
 *   selector: '.my-element',
 *   callback: (elements) => { console.log('Elements found:', elements); },
 *   parentElement: document.body,
 *   justOnce: true,
 *   debug: true,
 *   textContent: 'Hello'
 * });
 * 
 * @example
 * // Utilisation avec async/await
 * const elements = await waitForElement({
 *   selector: '.my-element',
 *   justOnce: true,
 *   textContent: 'Hello'
 * });
 * console.log('Elements found:', elements);
 */

let observedElements = new WeakMap();
function waitForElement({ selector, callback, parentElement = document, justOnce = false, debug = false, textContent = null, triggerOnInit = false }) {
    // Si aucun callback n'est fourni, retourne une promesse
    if (!callback) {
        return new Promise(resolve => {
            waitForElement({
                selector,
                callback: elements => resolve(elements),
                parentElement,
                justOnce,
                debug,
                textContent,
                triggerOnInit
            });
        });
    }

    let observer = new MutationObserver((mutations) => {
        for (let i = 0; i < mutations.length; i++) {
            let mutation = mutations[i];
            if (mutation.type === 'childList') {
                if (debug) {
                    console.log('[waitForElement]', selector, parentElement, ' Mutation:', mutation);
                }
                let elements = parentElement.querySelectorAll(selector);
                if (textContent) {
                    elements = Array.from(elements).filter(element => element.textContent.includes(textContent));
                }
                let newElements = [];
                for (let j = 0; j < elements.length; j++) {
                    let element = elements[j];
                    if (!observedElements.has(element)) {
                        if (debug) { console.log('[waitForElement] Element', element, ' has appeared'); }
                        observedElements.set(element, true); // Add the element to the WeakMap
                        newElements.push(element);
                    } else {
                        if (debug) { console.log('[waitForElement] Element', element, ' already observed'); }
                    }
                }
                if (newElements.length > 0) {
                    if (justOnce) {
                        observer.disconnect();
                    }
                    callback(newElements);
                }
            }
        }
    });

    let config = { childList: true, subtree: true };
    observer.observe(parentElement, config);

    // Déclenche le callback immédiatement si les éléments existent déjà
    if (triggerOnInit) {
        let elements = parentElement.querySelectorAll(selector);
        if (textContent) {
            elements = Array.from(elements).filter(element => element.textContent.includes(textContent));
        }
        let newElements = [];
        for (let j = 0; j < elements.length; j++) {
            let element = elements[j];
            if (!observedElements.has(element)) {
                if (debug) { console.log('[waitForElement] Element', element, ' has appeared'); }
                observedElements.set(element, true); // Ajoute l'élément au WeakMap
                newElements.push(element);
            } else {
                if (debug) { console.log('[waitForElement] Element', element, ' already observed'); }
            }
        }
        if (newElements.length > 0) {
            callback(newElements);
        }
    }

    // Retourne l'observateur pour permettre de l'interrompre manuellement si nécessaire
    return observer;
}


/**
 * Observe la disparition d'un élément du DOM avec support pour callback et Promise
 * @param {HTMLElement} element - L'élément à observer
 * @param {Function} [callback=null] - Fonction de callback optionnelle appelée quand l'élément disparaît
 * @param {number} [options] - Options de configuration
 * @param {number} [options.interval=100] - Intervalle de vérification en ms
 * @param {number} [options.timeout=30000] - Délai maximum d'attente en ms
 * @returns {Promise} - Une promesse qui se résout quand l'élément disparaît
 * 
 * @example
 * // Utilisation avec callback
 * observeDiseapearance(element, () => {
 *   console.log('Élément disparu');
 * });
 * 
 * @example
 * // Utilisation avec async/await
 * await observeDiseapearance(element);
 * console.log('Élément disparu');
 */
function observeDiseapearance(element, callback = null, options = {}) {
    const interval = options.interval || 100; // 100ms par défaut
    const timeout = options.timeout || 30000; // 30 secondes par défaut

    return new Promise((resolve) => {
        let elapsed = 0;

        const intervalId = setInterval(() => {
            if (!document.contains(element)) {
                clearInterval(intervalId);
                if (callback && typeof callback === 'function') {
                    callback();
                }
                resolve();
            }

            elapsed += interval;
            if (elapsed >= timeout) {
                clearInterval(intervalId);
                console.warn(`[observeDiseapearance] Timeout après ${timeout}ms, l'élément n'a pas disparu`);
                resolve();
            }
        }, interval);
    });
}

/**
 * Attend de manière asynchrone la réception des données de configuration Weda.
 * Vérifie périodiquement si les données sont disponibles avec un timeout configurable.
 * 
 * @async
 * @param {Object} [options={}] - Options de configuration
 * @param {number} [options.timeoutMs=500] - Délai maximum d'attente en ms avant timeout
 * @param {number} [options.checkEveryMs=50] - Intervalle de vérification en ms
 * @param {string} [options.logWait] - Identifiant optionnel pour les logs
 * @returns {Promise<void>} - Promesse résolue quand les données sont reçues ou après timeout
 * 
 * @example
 * await waitForWeda({ timeoutMs: 1000 });
 * console.log('Données Weda disponibles');
 */
async function waitForWeda({ timeoutMs = 500, checkEveryMs = 50, logWait } = {}) {
    if (gotDataFromWeda) return;

    const start = Date.now();
    return new Promise((resolve) => {
        const tick = () => {
            if (gotDataFromWeda) {
                // console.log('[waitForWedaAsync] Données de Weda reçues, on continue', { logWait, timeoutMs });
                resolve();
                return;
            }
            const elapsed = Date.now() - start;
            if (elapsed >= timeoutMs) {
                console.warn('[waitForWedaAsync] Timeout atteint, on continue sans données de Weda', { logWait, timeoutMs, elapsed });
                gotDataFromWeda = true; // bypass
                resolve();
                return;
            }
            setTimeout(tick, checkEveryMs);
        };
        tick();
    });
}




// // Ecoutes d'évènements
// Vérifie que la fenêtre est active et que le focus est sur la page
window.addEventListener('blur', function () {
    console.log('Window lost focus (blur)');
    mouseoutW();
});
document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
        console.log('Window lost focus (hidden)');
        mouseoutW();
    };
});


/**
 * Extrait uniquement la dernière page d'un document PDF contenu dans un Blob.
 * Utilise la bibliothèque PDFLib pour manipuler le PDF.
 * 
 * @async
 * @param {Blob} blob - Le Blob contenant le document PDF source
 * @returns {Promise<Blob>} - Un nouveau Blob contenant uniquement la dernière page du PDF
 * 
 * @example
 * const lastPageBlob = await getLastPageFromBlob(pdfBlob);
 */
async function getLastPageFromBlob(blob) {
    const pdfBytes = await blob.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();

    const newPdfDoc = await PDFLib.PDFDocument.create();
    const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [totalPages - 1]);
    newPdfDoc.addPage(copiedPage);

    const newPdfBytes = await newPdfDoc.save();
    const newBlob = new Blob([newPdfBytes], { type: 'application/pdf' });
    return newBlob;
}
