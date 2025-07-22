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


// WedaOverloadOptions est un objet qui contient les options de Weda. Il contient les mêmes clés que les différentes options de l'extension.
// La valeur de ces clés écrase l'option du même nom dans l'extension.
// Weda peut donc, à dessein, forcer l'activation ou la neutralisation d'une option.
// C'est plutôt pensé pour neutraliser une option qui vient d'être implémentée par Weda.
let WedaOverloadOptions = {};
let gotDataFromWeda = false;


// initialise les options provenant de Weda
var script = document.createElement('script');
script.src = chrome.runtime.getURL('FW_scripts/FWData.js');
(document.head || document.documentElement).appendChild(script);

window.addEventListener("message", function (event) {
    if (event.source === window && event.data.type === "FROM_PAGE") {
        WedaOverloadOptions = event.data.payload.wedaHelper;
        gotDataFromWeda = true;
        if (WedaOverloadOptions == undefined) {
            WedaOverloadOptions = false;
        }

        // Modification de la clé MoveHistoriqueToLeft_Consultation  à true pour les tests
        // WedaOverloadOptions.MoveHistoriqueToLeft_Consultation = true;

        console.log('WedahelperOverload', WedaOverloadOptions);
    }
});

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

    // Trigger callback on initialization if elements already exist
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
                observedElements.set(element, true); // Add the element to the WeakMap
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

function waitForWeda(logWait, callback) {
    if (gotDataFromWeda === false) {
        // console.log('[waitForWeda] pas encore de données de Weda', logWait);
        setTimeout(waitForWeda, 10, logWait, callback); // Vérifie toutes les 100ms
        return;
    } else {
        callback();
    }
}

/**
 * Récupère la valeur d'une ou plusieurs options depuis le stockage local de Chrome.
 * Si une option n'est pas trouvée, elle utilise la valeur par défaut des paramètres.
 * @see getOptionPromise pour une version utilisant les Promesses
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
 * 
 */
function getOption(optionNames, callback) {
    getOptionValues(optionNames, callback);
}


/**
 * version de getOption utilisant les Promesses
 * @see getOption pour une version utilisant les callbacks 
 */
function getOptionPromise(optionNames) {
    return new Promise((resolve, reject) => {
        getOptionValues(optionNames, resolve);
    });
}


function getOptionValues(optionNames, callback) {
    let isInputArray = Array.isArray(optionNames);

    if (!isInputArray) {
        optionNames = [optionNames];
    }

    waitForWeda(optionNames, () => {
        chrome.storage.local.get([...optionNames, 'defaultSettings'], function (result) {
            let options = [];
            for (let optionName of optionNames) {
                let optionValue;
                if (!WedaOverloadOptions) { // Si WedaOverloadOptions est false car non rempli par Weda, on le signale
                    // console.log('[getOption] WedaOverloadOptions est vide, et de valeur ', WedaOverloadOptions);
                }
                if (WedaOverloadOptions && Object.keys(WedaOverloadOptions).length > 0 && WedaOverloadOptions[optionName] !== undefined) {
                    // console.log('[getOption] WedaOverloadOptions[', optionName, '] est ', WedaOverloadOptions[optionName]);
                    optionValue = WedaOverloadOptions[optionName];
                } else if (result[optionName] !== undefined) {
                    // console.log('[getOption] result[', optionName, '] est ', result[optionName]);
                    optionValue = result[optionName];
                } else {
                    // console.log('[getOption] result.defaultSettings[', optionName, '] est ', result.defaultSettings[optionName]);
                    optionValue = result.defaultSettings[optionName];
                }
                options.push(optionValue);
            }
            callback(isInputArray ? options : options[0]);
        });
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
 * @example addTweak('/FolderGestion/RecetteForm.aspx', 'TweakRecetteForm', function () {console.log('TweakRecetteForm activé');});
 */
function addTweak(path, option, callback) {
    function executeOption(option, callback, invert = false, mandatory = false) {
        if (mandatory) {
            waitForWeda(option, () => {
                console.log(`[addTweak] ${option} activé`);
                callback();
            });
        } else {
            getOption(option, function (optionValue) {
                // Considérer comme true si:
                // - optionValue est true (booléen)
                // - optionValue est une chaîne non vide
                // Et appliquer l'inversion si nécessaire
                const isActive = (optionValue === true || (typeof optionValue === 'string' && optionValue !== ''));
                if ((isActive && !invert) || (!isActive && invert)) {
                    console.log(`[addTweak] ${option} activé`);
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
        // Convertir l'option en tableau si ce n'est pas déjà le cas
        if (!Array.isArray(option)) {
            option = [{ option, callback }];
        }
        if (Array.isArray(option) && option.length > 0) {
            // Si un tableau d'options et de callbacks est passé, on les utilise tous
            // permet de ne pas avoir à écrire plusieurs fois la même condition
            option.forEach(({ option, callback }) => {
                // permet de gérer les options en négatif
                let invert = false;
                if (option.startsWith('!')) {
                    option = option.slice(1);
                    invert = true;
                }

                let mandatory = false;
                if (option.startsWith('*')) {
                    option = option.slice(1);
                    mandatory = true;
                }
                executeOption(option, callback, invert, mandatory);
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


// Renvoie uniquement la dernière page d'un pdf présent dans un blob
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


// // Lien avec les notifications de Weda
// Exemple de load de notification
let notifToSend = {
    message: "Notification de test 2", // message displayed
    icon: "home", // mat icon used for the notification
    type: "success", // color (success / fail / undefined)
    extra: "{}", // extra data (json)
    duration: 5000 // duration of the notification
};

// On démarre le script d'écoute, qui doit tourner à part dans FWNotif.js
// Il écoutera les évènements pour afficher les notifications
function startNotifScript() {
    let script = document.createElement('script');
    script.src = chrome.runtime.getURL('FW_scripts/FWNotif.js?test=true');
    // console.log(script) // Error in event handler: TypeError: console.log(...) is not a function
    (document.head || document.documentElement).appendChild(script);
}

startNotifScript();


/**
 * Envoi simplifié d'une notification Weda.
 * Appelé via la fonction ou l'envoi d'un onMessage.
 * 
 * Il est en général préférable d'utiliser la fonction sendWedaNotif() qui est plus simple à utiliser.
 * 
 * @param {Object} options - Options de la notification.
 * @param {string} [options.message="Notification de test"] - Message affiché dans la notification.
 * @param {string} [options.icon="home"] - Icône utilisée pour la notification (mat icon).
 * @param {string} [options.type="success"] - Type de notification (success / fail / undefined). /!\ 'fail' entraîne une notification qui ne tient pas compte de 'duration'. C'est volontaire (confirmé par Weda le 28/11/24, pour faciliter les captures d'écran)
 * @param {string} [options.extra="{}"] - Données supplémentaires (JSON).
 * @param {number} [options.duration=5000] - Durée de la notification en millisecondes.
 */
function sendWedaNotif({
    message = "Notification de test",
    icon = "home",
    type = "success",
    extra = "{}",
    duration = 5000,
    action = null
} = {}) {
    // Vérifie si chaque option est vide et assigne la valeur par défaut si nécessaire
    message = message || "Notification de test";
    icon = icon || "home";
    type = type || "success";
    extra = extra || "{}";
    duration = duration || 5000;

    const notifToSend = {
        message: `[Weda-Helper] ${message}`,
        icon,
        type,
        extra,
        duration
    };

    console.log('Notification envoyée :', notifToSend);

    if (action) {
        confirmationPopup(action);
    }


    const event = new CustomEvent('showNotification', { detail: notifToSend });
    document.dispatchEvent(event);
    // Rendre la notification cliquable si elle contient une URL
    setTimeout(() => { addUrlLink(); }, 100);
}

/**
 * Affiche une popup de confirmation personnalisée et exécute l'action associée lorsque l'utilisateur clique sur "Oui"
 * @param {Object} action - L'action à exécuter {'requestPermission': 'permission_name'}
 */
function confirmationPopup(action) {
    // Vérifier si l'action est une demande de permission
    if (action.requestPermission) {
        const permission = action.requestPermission;

        // Créer les éléments de la popup
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        const popup = document.createElement('div');
        popup.style.cssText = `
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            max-width: 400px;
            width: 100%;
        `;

        // En-tête
        const title = document.createElement('h3');
        title.textContent = 'Autorisation requise';
        title.style.cssText = `
            margin-top: 0;
            color: #333;
            font-size: 18px;
        `;

        // Message
        const message = document.createElement('p');
        message.textContent = `Weda-Helper a besoin d'accéder aux onglets pour cette fonctionnalité. Voulez-vous autoriser ? Chrome vous demandera votre permission pour "Consulter l'historique de navigation". (Weda-Helper n'utilise cette permission que pour la gestion des onglets ne consulte pas l'historique). Vous pouvez révoquer cette autorisation à tout moment dans les paramètres de Chrome.`;
        message.style.cssText = `
            margin-bottom: 20px;
            color: #555;
        `;

        // Conteneur de boutons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        `;

        // Bouton Non
        const noButton = document.createElement('button');
        noButton.textContent = 'Non';
        noButton.style.cssText = `
            padding: 8px 16px;
            background-color: #f1f1f1;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            color: #333;
        `;

        // Bouton Oui
        const yesButton = document.createElement('button');
        yesButton.textContent = 'Oui';
        yesButton.style.cssText = `
            padding: 8px 16px;
            background-color: #4285f4;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            color: white;
        `;

        // Fonction pour fermer la popup
        const closePopup = () => {
            document.body.removeChild(overlay);
        };

        // Événements des boutons
        noButton.addEventListener('click', () => {
            closePopup();
            console.log(`Permission ${permission} refusée par l'utilisateur`);
        });

        yesButton.addEventListener('click', () => {
            // Exécuter l'action de demande de permission - C'est un vrai geste utilisateur ici
            closePopup();

            // Demande la permission spécifiée
            let granted = requestPermission(permission);
            if (granted) {
                // Permission accordée
                sendWedaNotifAllTabs({
                    message: "Accès accordé avec succès!",
                    icon: 'success',
                    duration: 5000
                });

                // Déclenche un événement pour informer le reste de l'application
                const permissionEvent = new CustomEvent('permissionGranted', {
                    detail: { permission: permission }
                });
                document.dispatchEvent(permissionEvent);
            } else {
                // Permission refusée par Chrome
                sendWedaNotifAllTabs({
                    message: `L'autorisation a été refusée. Certaines fonctionnalités ne seront pas disponibles.`,
                    icon: 'warning',
                    duration: 8000
                });
            }
        });

        // Assembler la popup
        buttonContainer.appendChild(noButton);
        buttonContainer.appendChild(yesButton);
        popup.appendChild(title);
        popup.appendChild(message);
        popup.appendChild(buttonContainer);
        overlay.appendChild(popup);

        // Ajouter au DOM
        document.body.appendChild(overlay);
    } else {
        console.warn('Action non reconnue dans confirmationPopup:', action);
    }
}

function addUrlLink() {
    let NotifPopupElement = document.querySelector('weda-notification-container p.ng-star-inserted');
    if (!NotifPopupElement) {
        console.warn('NotifPopupElement not found');
        return;
    }
    // Cherche dans le innerText une éventuelle URL
    console.log('Notification popup:', NotifPopupElement.innerText);
    let url = NotifPopupElement.innerText.match(/(https?:\/\/[^\s]+)/);
    if (url) {
        // Rend la popup cliquable
        NotifPopupElement.style.cursor = 'pointer';
        console.log('URL trouvée dans la notification :', url[0]);
        NotifPopupElement.addEventListener('click', () => {
            window.open(url[0], '_blank');
        });
    }
}


/* === implementation de la fonction sendWedaNotif === */
// utilisé pour l'envoi depuis le popup
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.action === "sendWedaNotif") {
            sendWedaNotif(request.options);
            sendResponse({ message: "Notification envoyée !" });
        }
    }
);

/**
 * Envoie une notification Weda à tous les onglets en utilisant le stockage local de Chrome.
 * Cette fonction stocke les options de notification avec un identifiant unique basé sur l'horodatage,
 * ce qui déclenche ensuite l'affichage de la notification dans tous les onglets grâce au listener
 * chrome.storage.onChanged.
 * 
 * @async
 * @function sendWedaNotifAllTabs
 * @param {Object} options - Les options de la notification à envoyer.
 * @param {string} [options.message="Notification de test"] - Le message à afficher dans la notification.
 * @param {string} [options.icon="home"] - L'icône Material Design à utiliser pour la notification.
 * @param {string} [options.type="success"] - Le type de notification ('success', 'fail', ou undefined pour neutre).
 * @param {string} [options.extra="{}"] - Données supplémentaires au format JSON.
 * @param {number} [options.duration=5000] - Durée d'affichage de la notification en millisecondes.
 * @param {Object} [options.action] - Action optionnelle à exécuter (ex: demande de permission).
 * 
 * @example
 * // Envoi d'une notification simple
 * const notifId = await sendWedaNotifAllTabs({
 *     message: "Opération réussie",
 *     type: "success",
 *     duration: 3000
 * });
 * 
 * @example
 * // Envoi d'une notification avec gestion d'erreur
 * try {
 *     await sendWedaNotifAllTabs({
 *         message: "Erreur lors du traitement",
 *         type: "fail",
 *         icon: "error"
 *     });
 * } catch (error) {
 *     console.error('Échec de l\'envoi de la notification:', error);
 * }
 * 
 * @see {@link sendWedaNotif} Pour envoyer une notification uniquement dans l'onglet actuel.
 */
async function sendWedaNotifAllTabs(options) {
    // Ajoute un identifiant unique basé sur l'horodatage actuel
    options.id = Date.now();
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({ 'wedaNotifOptions': options }, function () {
            if (chrome.runtime.lastError) {
                console.error('Erreur lors du stockage des options de notification :', chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
            } else {
                console.log('Options de notification stockées avec ID:', options.id);
                resolve(options.id);
            }
        });
    });
}

chrome.storage.onChanged.addListener(function (changes, namespace) {
    if (namespace === 'local' && changes.wedaNotifOptions) {
        const options = changes.wedaNotifOptions.newValue;
        sendWedaNotif(options);
    }
});


// // envoi une notif après 5 secondes
// setTimeout(() => {
//     sendWedaNotifAllTabs({
//         message: 'Notification de test custom2',
// //        icon: 'home',
//         type: 'fail',
// //        extra: '{}',
// //        duration: 5000
//     });
// }, 5000);



// ** set lastPrintDate
// * permet de définir la date de la dernière impression et donc de permettre ensuite la fermeture de l'onglet appelant
// * dans le cadre de la fonction instantPrint
function setLastPrintDate() {
    const date = new Date();
    sessionStorage.setItem('lastPrintDate', date.toISOString());
    console.log('Dernière date d\'impression enregistrée :', date);
}


// Clic sur certains éléments où le CSP bloque le clic quand on est en isolated
// Passe par un script injecté pour contourner le problème

// Initialise d'abord clickElement.js
function startClicScript() {
    var scriptClicElements = document.createElement('script');
    scriptClicElements.src = chrome.runtime.getURL('FW_scripts/clickElement.js');
    (document.head || document.documentElement).appendChild(scriptClicElements);
}
startClicScript();

function clicCSPLockedElement(elementSelector, iframeSelector = null) {
    console.log('Clic sur élément bloqué par CSP :', elementSelector);
    const event = new CustomEvent('clicElement', { detail: { elementSelector, iframeSelector } });
    document.dispatchEvent(event);
}

// Fonction utilitaire pour attendre un certain nombre de millisecondes
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}