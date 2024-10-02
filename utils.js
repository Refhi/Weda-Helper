/**
 * @file utils.js
 * @description Ce fichier contient des fonctions utilitaires utilisées massivement dans toute l'extension Chrome.
 * Ces fonctions incluent des méthodes pour manipuler le DOM, observer les mutations, gérer les options de stockage,
 * et d'autres utilitaires communs nécessaires au bon fonctionnement de l'extension.
 */

// Récupère l'url de base définie dans le manifest.json
const manifest = chrome.runtime.getManifest();
const url_star = manifest.content_scripts.flatMap(script => script.matches)[0]; // *://secure.weda.fr/*
const baseUrl = url_star.replace('*', 'https').replace('/*', '');

// Afficher la nouvelle URL
console.log("[WH] baseUrl = ", baseUrl); // https://secure.weda.fr en général



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


// // Sorte de post-chargement pour les pages, car le onload fonctionne mal, et après une mutation c'est pas toujours évident
function afterMutations({ delay, callback, callBackId = "callback id undefined", preventMultiple = false }) {
    let timeoutId = null;
    const action = () => {
        console.log(`Aucune mutation détectée pendant ${delay}ms, je considère la page comme chargée. Appel du Callback. (${callBackId})`);
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
 * @param {Function} options.callback - La fonction à exécuter lorsque l'élément apparaît.
 * @param {HTMLElement} [options.parentElement=document] - L'élément parent dans lequel observer les mutations.
 * @param {boolean} [options.justOnce=false] - Si vrai, l'observation s'arrête après la première apparition de l'élément.
 * @param {boolean} [options.debug=false] - Si vrai, affiche des messages de debug dans la console.
 * @param {string|null} [options.textContent=null] - Filtre les éléments par leur contenu textuel.
 *
 * @example
 * waitForElement({
 *   selector: '.my-element',
 *   callback: (elements) => { console.log('Elements found:', elements); },
 *   parentElement: document.body,
 *   justOnce: true,
 *   debug: true,
 *   textContent: 'Hello'
 * });
 */

let observedElements = new WeakMap();
function waitForElement({ selector, callback, parentElement = document, justOnce = false, debug = false, textContent = null }) {
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
                    callback(newElements)
                }
            }
        }
    });

    let config = { childList: true, subtree: true };
    observer.observe(parentElement, config);
}



function observeDiseapearance(element, callback, justOnce = false) {
    function callBackIfElementDisapear() {
        if (!document.contains(element)) {
            callback();
            if (justOnce) {
                observer.disconnect();
            }
        }
    }

    let observer = new MutationObserver(callBackIfElementDisapear);
    let config = { childList: true, subtree: true };
    observer.observe(document, config);
}

/**
 * Récupère la valeur d'une ou plusieurs options depuis le stockage local de Chrome.
 * Si une option n'est pas trouvée, elle utilise la valeur par défaut des paramètres.
 *
 * @param {string|string[]} optionNames - Le nom de l'option ou un tableau de noms d'options à récupérer.
 * @param {function} callback - La fonction de rappel à exécuter avec les valeurs des options récupérées.
 *
 * @example <caption>Récupération d'une seule option</caption>
 * getOption('trimCIM10', function (trimCIM10) {
 *     console.log('Valeur de trimCIM10:', trimCIM10);
 * });
 *
 * @example <caption>Récupération de plusieurs options</caption>
 * getOption(['RemoveLocalCompanionPrint', 'postPrintBehavior'], function ([RemoveLocalCompanionPrint, postPrintBehavior]) {
 *     console.log('Valeur de RemoveLocalCompanionPrint:', RemoveLocalCompanionPrint);
 *     console.log('Valeur de postPrintBehavior:', postPrintBehavior);
 * });
 * 
 */
function getOption(optionNames, callback) {
    let isInputArray = Array.isArray(optionNames);

    if (!isInputArray) {
        optionNames = [optionNames];
    }

    chrome.storage.local.get([...optionNames, 'defaultSettings'], function (result) {
        let options = optionNames.map(optionName => result[optionName] ?? result.defaultSettings[optionName]);
        callback(isInputArray ? options : options[0]);
    });
}

/**
 * Ajoute une modification (tweak) en fonction de l'URL et des options spécifiées.
 *
 * @param {string|string[]} path - Le chemin ou les chemins auxquels la modification doit s'appliquer. Peut être une chaîne ou un tableau de chaînes.
 * @param {string|Array<{option: string, callback: function}>} option - 
 * L'option ou les options à vérifier. Peut être une chaîne ou un tableau d'objets contenant une option et un callback.
 * Si l'option commence par '!', elle est considérée comme négative. Si elle commence par '*', le callback est toujours exécuté.
 * @param {function} callback - La fonction à exécuter si l'option est activée. Ignorée si l'option est un array contenant des options/callback .
 */
function addTweak(path, option, callback) {
    function executeOption(option, callback, invert = false) {
        if (option.startsWith('*')) {
            callback();
        } else {
            getOption(option, function (optionValue) {
                if ((optionValue === true && !invert) || (optionValue === false && invert)) {
                    callback();
                }
            });
        }
    }

    // Construire l'URL complète en utilisant baseUrl
    const fullUrl = (path) => `${baseUrl}${path}`;

    // on vérifie que l'url correspond à une de celles passées en paramètre
    let urlMatches;
    if (path === '*') {
        urlMatches = true; // Si l'URL est '*', on considère que ça correspond toujours
    } else {
        urlMatches = Array.isArray(path)
            ? path.some(p => window.location.href.startsWith(fullUrl(p)))
            : window.location.href.startsWith(fullUrl(path));
    }

    if (urlMatches) {
        // permet de gérer les options en négatif
        let invert = false;
        if (typeof option === 'string' && option.startsWith('!')) {
            option = option.slice(1);
            invert = true;
        }
        if (typeof option === 'string' && typeof callback === 'function') {
            // Si une seule option et un seul callback sont passés, on les utilise directement
            console.log(`[addTweak] ${option} activé`);
            executeOption(option, callback, invert);
        } else if (Array.isArray(option) && option.length > 0) {
            // Si un tableau d'options et de callbacks est passé, on les utilise tous
            // permet de ne pas avoir à écrire plusieurs fois la même condition
            option.forEach(({ option, callback }) => {
                console.log(`[addTweaks] ${option} activé`);
                executeOption(option, callback, invert);
            });
        }
    }
}



// // Aide au clic
// permet de cliquer sur un élément selon l'attribut onclick
function clickElementByOnclick(onclickValue) {
    var element = document.querySelector(`[onclick*="${onclickValue}"]`);
    console.log('Element:', element);
    if (element) {
        console.log('Clicking element onclickvalue', onclickValue);
        element.click();
        recordMetrics({ clicks: 1, drags: 1 });
        return true;
    } else {
        console.log('Element not found onclickvalue', onclickValue);
        return false;
    }
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


// Ecoute les instructions du script de fond au sujet de la popup
const actions = {
    'allConsultation': allConsultation,
    'tpebis': () => sendLastTPEamount(),
    'sendCustomAmount': (amount) => sendtpeinstruction(amount) // Ajout de l'action sendCustomAmount

};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action in actions) {
        console.log(request.action + ' demandé');
        if (request.action === 'sendCustomAmount' && request.amount !== undefined) {
            let amount = request.amount;
            // First the amount must contain only digits and exactly one or zero comma or dot
            let amountCheck = amount.replace(/[^0-9,.]/g, '');
            if (amountCheck.length !== amount.length) {
                console.log('Amount', amount, 'is not valid');
                console.warn('Amount', amount, 'is not valid');
                return;
            }
            if (amount.match(/[,.]/g) && amount.match(/[,.]/g).length > 1) {
                console.log('Amount', amount, 'is not valid');
                console.warn('Amount', amount, 'is not valid');
                return;
            }
            let splitedAmount = amount.split(/,|\./);
            let amountUnits = splitedAmount[0];
            let amountDecimals = splitedAmount[1] || '00';
            if (amountDecimals.length === 1) {
                amountDecimals += '0'; // Ajoute un zéro si la partie décimale a une seule position
            } else if (amountDecimals.length > 2) {
                amountDecimals = amountDecimals.slice(0, 2); // Coupe la partie décimale à 2 positions
            }
            amount = parseInt(amountUnits + amountDecimals, 10);
            console.warn('[debug] pause');
            actions[request.action](amount); // Appel avec le montant personnalisé
        } else {
            actions[request.action]();
        }
    }
});


// // Travail sur les boutons des interfaces secu (IMTI, DMP etc.)
addTweak('*', 'WarpButtons', function () {
    function warpButtons(buttons) {
        function addIdToButton(button) {
            var actions = {
                'Annuler': ['Continuez sans l\'ordonnance numérique', 'Non', 'NON', 'Annuler'],
                'Valider': ['Oui', 'OUI', 'Confirmer', 'Valider', 'Réessayer', 'Désactiver aujourd\'hui', 'Transmettre', 'Importer']
            };
            if (button) {
                var action = Object.keys(actions).find(key => actions[key].includes(button.textContent));
                // vérifie que l'id n'est pas déjà présent. Utile quand plusieurs boutons sont éligible.
                if (document.getElementById('target' + action)) {
                    console.log(action, 'id already exist !');
                    return false;
                }
                if (action) {
                    button.id = 'target' + action;
                }
            }
            return true;
        }

        function addShortcutsToButton(button) {
            var raccourcis = {
                'targetAnnuler': ' (alt+A)',
                'targetValider': ' (alt+V)'
            };
            if (button) {
                console.log('ajout de raccourcis au button', button);
                var raccourci = raccourcis[button.id];
                if (raccourci) {
                    button.textContent += raccourci;
                }
                if (button.textContent.includes('Désactiver aujourd\'hui')) { // certains boutons nécessitent d'étendre la taille de la fenêtre
                    resizeTextBox();
                }
            }
        }

        function resizeTextBox() {
            let textbox = document.querySelector('.mat-dialog-container');
            let currentHeight = parseInt(window.getComputedStyle(textbox).height, 10);
            if (textbox && currentHeight < 440) {
                textbox.style.height = '440px';
            } else {
                console.log('textBox not found :-/ can\'t resize it');
            }
        }


        buttons.forEach(function (button) {
            console.log('Bouton trouvé ! Je le redimentionne, lui ajoute un id et note le raccourcis clavier par défaut', button);
            button.style.width = 'auto';
            if (addIdToButton(button)) {
                addShortcutsToButton(button);
            }
        });
    }


    waitForElement({
        selector: '.cdk-overlay-container .mat-raised-button',
        callback: warpButtons
    });
    waitForElement({
        selector: '.docImportButtons button',
        callback: warpButtons
    });
});
