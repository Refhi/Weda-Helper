// // Différentes petites fonctions ajoutées ou supprimées de Weda
// // Ne justifiant pas la création d'un fichier séparé


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
 * @param {string|string[]} url - L'URL ou les URLs auxquelles la modification doit s'appliquer. Peut être une chaîne ou un tableau de chaînes.
 * @param {string|Array<{option: string, callback: function}>} option - 
 * L'option ou les options à vérifier. Peut être une chaîne ou un tableau d'objets contenant une option et un callback.
 * Si l'option commence par '!', elle est considérée comme négative. Si elle commence par '*', le callback est toujours exécuté.
 * @param {function} callback - La fonction à exécuter si l'option est activée. Ignorée si l'option est un array contenant des options/callback .
 */
function addTweak(url, option, callback) {
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
    // on vérifie que l'url correspond à une de celles passées en paramètre
    let urlMatches;
    if (url === '*') {
        urlMatches = true; // Si l'URL est '*', on considère que ça correspond toujours
    } else {
        urlMatches = Array.isArray(url)
            ? url.some(u => window.location.href.startsWith(u))
            : window.location.href.startsWith(url);
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
            // ça fait un appel à la fonction plus court
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


// // Boutons du popup
// Celui pour renvoyer le dernier paiement TPE est dans fse.js
// Permet de mettre tout les éléments de la page en attente d'import sur "Consultation"
function allConsultation() {
    console.log('setAllImportToConsultation');
    var elements = document.querySelectorAll('[id^="ContentPlaceHolder1_FileStreamClassementsGrid_DropDownListGridFileStreamClassementEvenementType_"]');
    for (var i = 0; i < elements.length; i++) {
        // set the dropdown to "Consultation"
        elements[i].selectedIndex = 0;
        console.log('Element set to Consultation:', elements[i]);
        recordMetrics({ clicks: 2, drags: 2 });
    }
}

// // Gestion de l'affichage de l'aide
// afficher une infobulle à côté des entrées W avec la clé de submenuDict
function tooltipshower() {
    // vérifier que la fenêtre est active et que le focus est sur la page
    if (!document.hasFocus() || document.hidden) {
        return;
    }

    // simuler un survol de W
    var element = document.querySelector('[class="has-popup static"]');
    if (element) {
        element.dispatchEvent(new MouseEvent('mouseover', {
            view: window,
            bubbles: true,
            cancelable: true
        }));
    }
    chrome.storage.local.get(["defaultShortcuts", "shortcuts"], function (result) {
        const { shortcuts, defaultShortcuts } = result;
        let submenuDict = {};
        let submenuDictAll = {};

        Object.entries(keyCommands).forEach(([key, action]) => {
            const match = action.toString().match(/submenuW\('(.*)'\)/);
            if (match) {
                const submenu = match[1];
                submenuDict[submenu] = shortcutDefaut(shortcuts, defaultShortcuts, key);
            }
            submenuDictAll[key] = {
                raccourci: shortcutDefaut(shortcuts, defaultShortcuts, key),
                description: defaultShortcuts[key].description
            };
        });

        // Ajouts manuels
        Object.assign(submenuDictAll, {
            "ouinonfse": { raccourci: 'n/o', description: "Valide oui/non dans les FSE" },
            "pavnumordo": { raccourci: "pavé num. /'à'", description: "Permet d’utiliser les touches 0 à 9 et « à » pour faire les prescriptions de médicaments." }
        });

        updateElementsWithTooltips(submenuDict);
        displayShortcutsList(submenuDictAll);
    });


    function updateElementsWithTooltips(submenuDict) {
        document.querySelectorAll('.level2.dynamic').forEach(element => {
            const description = element.innerText.replace(/ \(\d+\)$/, '');
            if (submenuDict[description]) {
                const tooltip = createTooltip(submenuDict[description]);
                element.appendChild(tooltip);
            }
        });
    }

    function createTooltip(text) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        Object.assign(tooltip.style, {
            position: 'absolute',
            top: '0px',
            left: '100%',
            padding: '10px',
            backgroundColor: '#284E98',
            border: '1px solid black',
            zIndex: '1000',
        });
        tooltip.textContent = text;
        return tooltip;
    }

    function displayShortcutsList(submenuDictAll) {
        const shortcutsList = document.createElement('div');
        shortcutsList.className = 'tooltip';
        Object.assign(shortcutsList.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: '1001',
            backgroundColor: '#ffffff',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
            border: '1px solid #e0e0e0',
            fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
            color: '#333',
            fontSize: '14px',
        });
        shortcutsList.innerHTML = buildTableHTML(submenuDictAll);
        document.body.appendChild(shortcutsList);
    }

    function buildTableHTML(submenuDictAll) {
        let tableHTML = '<table><tr><th style="text-align:right;">Raccourci&nbsp;</th><th style="text-align:left">&nbsp;Description</th></tr>';
        Object.entries(submenuDictAll).forEach(([_, { raccourci, description }]) => {
            tableHTML += `<tr><td style="text-align:right;">${raccourci}&nbsp;</td><td style="text-align:left">&nbsp;${description}</td></tr>`;
        });
        return tableHTML + '</table>';
    }
}

// retirer l'infobulle d'aide et relacher W
function mouseoutW() {
    // Supprimer les tooltips
    var tooltips = document.querySelectorAll('div.tooltip');
    tooltips.forEach(function (tooltip) {
        tooltip.remove();
    });
    // relacher W
    var element = document.querySelector('[class="has-popup static"]');
    if (element) {
        element.dispatchEvent(new MouseEvent('mouseout', {
            view: window,
            bubbles: true,
            cancelable: true
        }));
    }

}


// // vérification de la présence du Companion
function testCompanion() {
    function askLinkActivation() {
        chrome.storage.local.get('promptCompanionMessage', function (result) {
            if (result.promptCompanionMessage !== false) {
                // Demander à l'utilisateur s'il souhaite activer RemoveLocalCompanionPrint
                const choixUtilisateur = confirm("[Weda Helper] : Le Companion est bien détecté, mais les options de lien sont désactivées. Cliquez sur ok pour activer l'impression automatique ou allez dans les options de Weda Helper pour le TPE. Cliquez sur annuler pour ignorer définitivement ce message.");

                if (choixUtilisateur) {
                    // Si l'utilisateur confirme, activer RemoveLocalCompanionPrint
                    chrome.storage.local.set({ 'RemoveLocalCompanionPrint': false });
                    alert("Le lien avec l'imprimate a été activé. Pensez à définir acrobat reader ou équivalent comme lecteur par défaut. Vous pouvez désactiver cette fonctionnalité dans les options de Weda Helper");
                } else {
                    // Si l'utilisateur refuse, ne rien faire ou afficher un message
                    console.log("L'utilisateur a choisi de ne pas activer RemoveLocalCompanionPrint.");
                    chrome.storage.local.set({ 'promptCompanionMessage': false });
                }
            } else {
                console.log("Le message de demande d'activation du lien avec le Companion a déjà été affiché.");
            }
        });
    }

    setTimeout(() =>
        sendToCompanion('', null, (isPresent) => {
            if (isPresent) {
                console.log('Companion présent');
                getOption(['RemoveLocalCompanionPrint', 'RemoveLocalCompanionTPE'], function ([RemoveLocalCompanionPrint, RemoveLocalCompanionTPE]) {
                    console.log('Remove Companion print =', RemoveLocalCompanionPrint)
                    console.log('Remove Companion TPE =', RemoveLocalCompanionTPE)
                    if (RemoveLocalCompanionPrint && RemoveLocalCompanionTPE) {
                        console.log('Companion présent, mais options désactivées');
                        // Afficher un message proposant d'activer le lien pour l'impression
                        askLinkActivation();
                    } else {
                        console.log('Companion présent, et au moins une option de lien activée');
                    }
                });
            } else {
                console.log('Companion non présent');
            }
        }, null, true)
        , 1000); // vérification de la présence du Companion après 1s
}
testCompanion();




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


// Vérifie la présence de l'élément avec title="Prénom du patient"
function checkPatientName() {
    waitForElement({
        selector: '[title="Prénom du patient"]', timeout: 5000,
        callback: patientNameElements => {
            var patientNameElement = patientNameElements[0];
            var patientName = patientNameElement.value;
            waitForElement({
                selector: 'vz-lecture-cv-widget', timeout: 5000,
                callback: widgetElements => {
                    var widgetElement = widgetElements[0];
                    var spans = widgetElement.getElementsByTagName('span');
                    for (var i = 0; i < spans.length; i++) {
                        if (spans[i].textContent.includes(patientName)) {
                            console.log('Patient name found');
                            spans[i].click();
                            recordMetrics({ clicks: 1, drags: 1 });
                            return true;
                        }
                    }
                    console.log('Patient name not found');
                    return false;
                }
            });
        }
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

addTweak('*', '*Tooltip', function () {
    // Ecoute l'appuis de la touches Alt pour afficher l'aide
    var lastAltPressTime = 0;
    var altKeyPressCount = 0; // Compteur d'appuis sur la touche Alt
    var checkAltReleaseInterval = null;
    var resetAltKeyPressCountInterval = null;


    document.addEventListener('keydown', function (event) {
        if (event.key === 'Alt') {
            console.log('Alt key pressed');
            lastAltPressTime = Date.now();
            altKeyPressCount++; // Incrémenter le compteur à chaque appui sur Alt
            clearTimeout(resetAltKeyPressCountInterval);
            resetAltKeyPressCountInterval = setTimeout(function () {
                altKeyPressCount = 0; // Réinitialiser altKeyPressCount après 1 seconde sans appui sur Alt
            }, 1000); // Délai de 1 seconde

            // Ignorer le premier appui sur Alt
            if (altKeyPressCount > 1) {
                if (altKeyPressCount === 2) {
                    tooltipshower();
                }
                // Si l'intervalle n'est pas déjà en cours, le démarrer
                if (!checkAltReleaseInterval) {
                    checkAltReleaseInterval = setInterval(function () {
                        // Si plus de 100ms se sont écoulées depuis la dernière pression
                        if (Date.now() - lastAltPressTime > 100) {
                            console.log('Alt key released');
                            clearInterval(checkAltReleaseInterval);
                            checkAltReleaseInterval = null; // Réinitialiser l'intervalle
                            mouseoutW(); // Appeler la fonction de relâchement
                            altKeyPressCount = 0; // Réinitialiser le compteur pour permettre la détection lors de la prochaine série d'appuis
                        }
                    }, 100); // Vérifier toutes les 100ms
                }
            }
        }
    });
});

// // Change certains éléments selon l'URL les options
// [page de recettes] Appuie automatiquement sur le bouton "rechercher" après avoir sélectionné la page des recettes
// seulement si la page est https://secure.weda.fr/FolderGestion/RecetteForm.aspx, appuis sur id="ContentPlaceHolder1_ButtonFind"
// Utilisation des nouvelles fonctions pour simplifier le code
addTweak('https://secure.weda.fr/FolderGestion/RecetteForm.aspx', 'TweakRecetteForm', function () {
    var button = document.getElementById('ContentPlaceHolder1_ButtonFind');
    if (button) {
        button.click();
        recordMetrics({ clicks: 1, drags: 1 });
        console.log('Button clicked on RecetteForm page');
    }
});


// [page de recettes manuelles] Envoie automatiquement au TPE si on clique sur #ContentPlaceHolder1_ButtonValid
addTweak('https://secure.weda.fr/FolderGestion/ReglementForm.aspx', '!RemoveLocalCompanionTPE', function () {
    function sendToTPE() {
        console.log('sendToTPE');
        let menuDeroulant = document.getElementById('ContentPlaceHolder1_DropDownListRecetteLabelMode');
        let amountElement = document.getElementById('ContentPlaceHolder1_TextBoxRecetteMontant');
        if (menuDeroulant && amountElement) {
            // vérifier que le mode de paiement est "C.B."
            if (menuDeroulant.options[menuDeroulant.selectedIndex].text !== "C.B.") {
                console.log('Le mode de paiement n\'est pas "C.B."');
                return;
            }
            let amount = amountElement.value;
            // retirer la virgule du montant et le convertir en entier
            amount = parseInt(amount.replace(/,/g, ''), 10);
            if (amount) {
                console.log('Je demande au TPE le montant : ', amount);
                sendtpeinstruction(amount);
                recordMetrics({ clicks: 4 });
            }
        }
    }


    waitForElement({
        selector: '#ContentPlaceHolder1_ButtonValid',
        callback: function (elements) {
            console.log('Ecouteur sur le bouton de validation de la recette manuelle', elements);
            elements[0].addEventListener('click', sendToTPE);
        }
    });
});



// // [page d'accueil]
let homePageUrls = [
    'https://secure.weda.fr/FolderMedical/FindPatientForm.aspx',
    'https://secure.weda.fr/FolderMedical/PatientViewForm.aspx'
];

let homePageFunctions = [
    {
        option: 'autoSelectPatientCV',
        callback: function () {
            // lit automatiquement la carte vitale elle est insérée
            // selecteur de ttt131 : body > weda-notification-container > ng-component > mat-card > div > p
            // selecteur ce jour : body > weda-notification-container > ng-component:nth-child(2) > mat-card > div > p
            let cvSelectors = 'weda-notification-container ng-component mat-card div p';

            waitForElement({
                selector: cvSelectors,
                callback: function (elements) {
                    console.log('cvSelectors', elements, 'found');
                    elements.forEach(cvElement => {
                        console.log('cvElement text', cvElement.textContent);
                        if (cvElement.textContent.includes('Vitale insérée')) {
                            console.log('cvElement', cvElement, 'found');
                            recordMetrics({ clicks: 1, drags: 1 });
                            clickCarteVitale();
                        }
                    });
                }
            });


            // sélectionne automatiquement le dossier patient lié s'il est seul sur la carte
            let patientSelector = '#mat-dialog-0 > vz-lecture-cv table .grid-item'
            const lookForPatient = () => {
                var elements = document.querySelectorAll(patientSelector);
                // remove from the elements all without only capital letters or spaces in the text
                elements = Array.from(elements).filter(element => element.textContent.match(/^[A-Z\s-]+$/));
                // remove any .patientLink.pointer.ng-star-inserted
                elements = Array.from(elements).filter(element => !element.querySelector('.patientLink.pointer.ng-star-inserted'));
                // remove any NOT containing a space in the text
                elements = Array.from(elements).filter(element => element.textContent.match(/\s/));

                console.log('les patients trouvés sont', elements);
                if (elements.length === 1) {
                    console.log('Patient seul trouvé, je clique dessus', elements[0]);
                    // target the next element in the DOM on the same level, with .grid-item as class
                    var nextElement = elements[0].nextElementSibling;
                    console.log('nextElement', nextElement);
                    // if it have a direct child with .mat-tooltip-trigger.sign click it
                    let linkedDossier = nextElement.querySelector('.mat-tooltip-trigger.sign');
                    if (linkedDossier) {
                        console.log('nextElement', linkedDossier, 'found and clickable');
                        linkedDossier.click();
                        recordMetrics({ clicks: 1, drags: 1 });
                    } else {
                        console.log('nextElement', nextElement, 'not found or not clickable');
                    }

                } else if (elements.length >= 2) {
                    console.log(elements.length, 'trop de patients trouvé, je ne clique pas', elements);
                } else {
                    console.log('Aucun patient trouvé', elements);
                }
            };

            waitForElement({
                selector: patientSelector,
                justOnce: true,
                callback: function () {
                    setTimeout(lookForPatient, 100);
                }
            });


        }
    },
    {
        option: 'TweakNIR',
        callback: function () {
            function addCopySymbol(element, copyText) {
                // Define the id for the copySymbol
                var copySymbolId = 'copySymbol-' + element.id;

                // Check if an element with the same id already exists
                if (!document.getElementById(copySymbolId)) {
                    console.log('copySymbolId', copySymbolId, 'not found, creating it');
                    // Create a new element for the copy symbol
                    var copySymbol = document.createElement('span');
                    copySymbol.textContent = '📋'; // Use clipboard emoji as copy symbol
                    copySymbol.style.cursor = 'pointer'; // Change cursor to pointer when hovering over the copy symbol
                    copySymbol.title = 'Cliquez ici pour copier le NIR dans le presse-papiers'; // Add tooltip text
                    copySymbol.id = copySymbolId;

                    // Add a click event handler to the copy symbol
                    copySymbol.addEventListener('click', function () {
                        console.log(copyText);
                        navigator.clipboard.writeText(copyText);
                        recordMetrics({ clicks: 3, drags: 2 });
                    });

                    // Add the copy symbol next to the element
                    console.log('copySymbol', copySymbol, 'added next to element', element);
                    element.parentNode.insertBefore(copySymbol, element.nextSibling);
                } else {
                    console.log('copySymbolId', copySymbolId, 'already exists');
                }
            }


            waitForElement({
                selector: '#ContentPlaceHolder1_EtatCivilUCForm1_insiContainer span.label',
                callback: (elements) => {
                    console.log('element', elements[0]);
                    var nir = elements[0].textContent.match(/(\d{13} \d{2})/)[1];
                    nir = nir.replace(/\s/g, ''); // Supprime tous les espaces de la chaîne
                    addCopySymbol(elements[0], nir);
                    elements[0].addEventListener('click', function () {
                        console.log('nir', nir);
                        navigator.clipboard.writeText(nir);
                        recordMetrics({ clicks: 3, drags: 2 });
                    });
                }
            });



            waitForElement({
                selector: '#ContentPlaceHolder1_EtatCivilUCForm1_LabelPatientSecuriteSocial',
                callback: (elements) => {
                    var secu = elements[0].textContent.match(/(\d{1} \d{2} \d{2} \d{2} \d{3} \d{3} \d{2})/)[1];
                    secu = secu.replace(/\s/g, ''); // Supprime tous les espaces de la chaîne
                    addCopySymbol(elements[0], secu);
                    elements[0].addEventListener('click', function () {
                        console.log('secu', secu);
                        navigator.clipboard.writeText(secu);
                        recordMetrics({ clicks: 3, drags: 2 });
                    });
                }
            });

        }
    },
];

addTweak(homePageUrls, homePageFunctions);



// [page de gestion des feuilles de soins]
addTweak('https://secure.weda.fr/vitalzen/gestion.aspx', 'TweakFSEGestion', function () {
    waitForElement({
        selector: '.mat-icon.notranslate.material-icons.mat-icon-no-color', textContent: 'search', timeout: 5000, justOnce: true,
        callback: elements => {
            let element = elements[0];
            console.log('element', element, 'trouvé, je clique dessus');
            element.click();
            recordMetrics({ clicks: 1, drags: 1 });
        }
    });
});



// // Retrait des suggestions de titre
let titleSuggestionsUrls = [
    'https://secure.weda.fr/FolderMedical/ConsultationForm.aspx',
    'https://secure.weda.fr/FolderMedical/CertificatForm.aspx',
    'https://secure.weda.fr/FolderMedical/DemandeForm.aspx',
    'https://secure.weda.fr/FolderMedical/PrescriptionForm.aspx',
    'https://secure.weda.fr/FolderMedical/FormulaireForm.aspx',
    'https://secure.weda.fr/FolderMedical/ResultatExamenForm.aspx',
    'https://secure.weda.fr/FolderMedical/CourrierForm.aspx',
];

addTweak(titleSuggestionsUrls, 'RemoveTitleSuggestions', function () {
    function RemoveTitleSuggestions() {
        setTimeout(() => {
            console.log('Remove TitleSuggestions started');
            let elements = document.querySelectorAll('#DivGlossaireReponse');
            if (elements[0]) {
                elements[0].remove();
            }
        }, 400);
    }

    RemoveTitleSuggestions(); // nécessaire pour certaines pages se chargeant trop vite
    waitForElement({ selector: '#DivGlossaireReponse', callback: RemoveTitleSuggestions });
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

// Page HRPIM
addTweak('https://secure.weda.fr/FolderMedical/HprimForm.aspx', '*HPRIMtweak', function () {
    function makeHPRIMListSticky() {
        let element = document.querySelector("#ContentPlaceHolder1_UpdatePanelHprimsGrid");
        element.style.position = "sticky";
        element.style.top = "0px";
    }
    makeHPRIMListSticky();
    // dur d'estimer précisement la métrique. Là c'est très grossier, on va dire 5 drags
    recordMetrics({ drags: 5 });

});


// Page Messagerie sécurisée
addTweak('https://secure.weda.fr/FolderMedical/WedaEchanges/', 'secureExchangeAutoRefresh', function () {
    if (result.secureExchangeAutoRefresh !== false) {
        // clique sur reçu pour rafraichir la liste des messages à intervalle régulier
        function clickOnInbox() {
            console.log('[clickOnInbox] je clique sur reçu pour rafraichir la liste des messages');
            var element = document.querySelector('#inboxToolbar > li.inbox.selected > a');
            if (element) {
                element.click();
                recordMetrics({ clicks: 1, drags: 1 });
            }
        }
        setTimeout(function () {
            setInterval(clickOnInbox, 900000);
        }, 30000);
    }
});
addTweak('https://secure.weda.fr/FolderMedical/WedaEchanges/', 'secureExchangeUncheckIHEMessage', function () {
    waitForElement({
        selector: 'we-doc-import',
        callback: function (elements) {
            for (const element of elements) {
                if (!element.className.includes('docImportAttach')) //docImportAttach correspond aux documents joints donc si il n'y a pas cette classe, il s'agit du corps du message
                {
                    let checkbox = element.querySelector('input[type=checkbox]')
                    checkbox.checked = false;
                    checkbox.dispatchEvent(new Event('change'));
                    recordMetrics({ clicks: 1, drags: 1 });
                } else {
                    let docTitle = element.querySelector('input.docTitle');
                    if (docTitle.value.toUpperCase() == 'IHE_XDM.ZIP') {
                        let checkbox = element.querySelector('input[type=checkbox]')
                        checkbox.checked = false;
                        checkbox.dispatchEvent(new Event('change'));
                        recordMetrics({ clicks: 1, drags: 1 });
                    }
                }
            }

        }
    });
});



// // Sélection automatique du type de document pour les courriers envoyés au DMP
// Au moment de l'impression des courriers
addTweak('https://secure.weda.fr/FolderMedical/CourrierForm.aspx', '*autoDocTypeSelection', function () {
    let dropDownMenu = document.querySelector('#ContentPlaceHolder1_DropDownListDocumentTypes');
    function watchDocumentTypeCourrierDMP() {
        dropDownMenu.addEventListener('change', function () {
            console.log('New selected value:', this.value);
            chrome.storage.local.set({ 'selectedDocumentTypeCourrierDMP': this.value });
        });
    }

    // after page load, change the dropdown value to the last selected value
    chrome.storage.local.get('selectedDocumentTypeCourrierDMP', function (result) {
        let selectedDocumentTypeCourrierDMP = result.selectedDocumentTypeCourrierDMP;
        console.log('selectedDocumentTypeCourrierDMP', selectedDocumentTypeCourrierDMP);
        if (selectedDocumentTypeCourrierDMP) {
            dropDownMenu.value = selectedDocumentTypeCourrierDMP;
        }
    });

    watchDocumentTypeCourrierDMP();
});

// Si on envoie un pdf considéré comme un courrier dans Weda :
addTweak('https://secure.weda.fr/FolderMedical/DMP/view', '*autoDocTypeSelectionPDFUpload', function () {
    // fonction permettant de surveiller un éventuel changement de choix dans le menu déroulant
    function watchDocumentTypeCourrierPDFDMP(menuASurveiller) {
        menuASurveiller.addEventListener('change', function () {
            console.log('[autoDocTypeSelectionPDFUpload] Nouvelle valeur par défaut enregistrée :', this.value);
            chrome.storage.local.set({ 'selectedDocumentTypeCourrierPDFDMP': this.value });
        });
    }

    const listeChoixTypeDMP = document.querySelector('#form1 > div:nth-child(11) > div > div.patientDmpContainer > dmp-container > div > div.frameContent > dmp-main > dmp-share-document > div > div > div > div.fieldContainer > select');
    watchDocumentTypeCourrierPDFDMP(listeChoixTypeDMP);

    const choixActuelTypeDMP = listeChoixTypeDMP.value;

    if (choixActuelTypeDMP === '11490-0') {
        console.log('[autoDocTypeSelectionPDFUpload] choix type courrier défaut détecté, je change pour le dernier choix enregistré');
        chrome.storage.local.get('selectedDocumentTypeCourrierPDFDMP', function (result) {
            let selectedDocumentTypeCourrierPDFDMP = result.selectedDocumentTypeCourrierPDFDMP;
            if (selectedDocumentTypeCourrierPDFDMP) {
                listeChoixTypeDMP.value = selectedDocumentTypeCourrierPDFDMP;
            }
        });
    }
});

// Sélection automatique du champ "titre" lors de la création d'un antécédent.
addTweak('https://secure.weda.fr/FolderMedical/AntecedentForm.aspx', '*autoSelectTitleField', function () {
    waitForElement({
        selector: '#ContentPlaceHolder1_TextBoxAntecedentNom',
        callback: function (elements) {
            elements[0].focus();
        }
    });

});


// Ajout d'une icone d'imprimante dans les "Documents du cabinet"
addTweak('https://secure.weda.fr/FolderTools/BiblioForm.aspx', '*addPrintIcon', function () {
    function addPrintIcon() {
        let allElements = document.querySelectorAll('[id^="ContentPlaceHolder1_TreeViewBibliot"]');
        let allElementsEndingWithI = Array.from(allElements).filter(element => element.id.endsWith('i'));
        let filteredElementspdf = Array.from(allElementsEndingWithI).filter(element => {
            let imgTags = element.querySelectorAll('img');
            return Array.from(imgTags).some(img => img.getAttribute('src') === "../Images/Icons/pdf.gif");
        });
        console.log('filteredElementspdf', filteredElementspdf);

        // Ajouter l'emoji d'imprimante à chaque élément filtré
        filteredElementspdf.forEach(element => {
            let printIcon = document.createElement('span');
            printIcon.textContent = '🖨️'; // Utiliser l'emoji d'imprimante
            printIcon.style.fontSize = '16px'; // Ajuster la taille si nécessaire
            printIcon.style.marginLeft = '5px';
            printIcon.style.position = 'relative';
            printIcon.style.top = '-2px'; // Décaler de 2px vers le haut

            // Ajouter un gestionnaire d'événements de clic sur l'icône d'imprimante
            printIcon.addEventListener('click', function () {
                handlePrint('print')
            });

            element.appendChild(printIcon);
        });
    }

    waitForElement({
        selector: '[id^="ContentPlaceHolder1_TreeViewBibliot"]',
        callback: addPrintIcon
    });

});

// Lien avec l'API de Weda (https://secure.weda.fr/api/patients/[numeropatient])
// Exemple pour Mme DESMAUX (un dossier de démonstration) :
// https://secure.weda.fr/api/patients/65407357 qui retourne un objet JSON
// par exemple :
// getPatientInfo(65407357)
//     .then(data => {
//         let name = data.birthName;
//         console.log('getPatientInfo ok, name:', name);
//     });
// Le json contiens les éléments suivants :
// {
//     "id": 65407357,
//     "patientFileUrl": "/FolderMedical/PatientViewForm.aspx?PatDk=[numéro du patient]|0|0|0&crypt=[clé selon la session]",]",
//     "medicalOfficeId": 4341,
//     "createdDate": "2023-09-15T00:00:00",
//     "lastModifiedDate": "2023-09-15T09:12:07.527",
//     "prefix": "Mme",
//     "sex": "F",
//     "birthName": "DESMAUX",
//     "lastName": "DESMAUX",
//     "firstNames": "NATHALIE",
//     "preferredBirthFirstName": "NATHALIE",
//     "preferredFirstName": "NATHALIE",
//     "isLunarBirthDate": false,
//     "birthDate": "1955-06-15T00:00:00",
//     "lunarBirthDate": null,
//     "dateOfBirth": {
//       "date": "15/06/1955",
//       "isLunar": false
//     },
//     "birthPlace": "inconnu",
//     "birthPlaceInsee": "99999",
//     "familyStatus": null,
//     "zip": "27670",
//     "city": "ST OUEN DU TILLEUL",
//     "profession": null,
//     "professionFreeForm": "",
//     "nir": "2550699999999",
//     "nirCle": "34",
//     "birthRank": "1",
//     "nationality": null,
//     "isDeceased": false,
//     "deathDate": null,
//     "deathCause": null,
//     "refDoctorUserId": 37637,
//     "refDoctorStart": "2024-05-19T00:00:00",
//     "refDoctorEnd": null,
//     "recordNumber": "",
//     "appointmentTag": null,
//     "prematurity": {
//       "isPremature": false,
//       "weeks": 0,
//       "days": 0
//     },
//     "refDoctorNote": null,
//     "consent": {
//       "consentSharingWithinStructure": false,
//       "consentSharingWithDmp": 0,
//       "mspVisitData": null
//     }
// }



// Fonction pour récupérer les informations du patient
async function getPatientInfo(patientId) {
    return fetch('https://secure.weda.fr/api/patients/' + patientId)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .catch(error => console.error('There has been a problem with your fetch operation:', error));
}


// // Ajout d'un accès simplifié dans un onglet dédié aux antécédents, depuis n'importe
// quelle page affichant une liste de patient après recherche
// Ainsi que dans les pages de biologie où 
let urls = [
    'https://secure.weda.fr/FolderMedical/FindPatientForm.aspx',
    'https://secure.weda.fr/FolderMedical/UpLoaderForm.aspx',
    'https://secure.weda.fr/FolderMedical/WedaEchanges/',
    'https://secure.weda.fr/FolderMedical/HprimForm.aspx'
];

addTweak(urls, '*addATCDShortcut', function () {
    let patientsSelector =
        '[id^="ContentPlaceHolder1_FindPatientUcForm1_PatientsGrid_LinkButtonPatientGetNomPrenom_"], ' +
        '[id^="ContentPlaceHolder1_FindPatientUcForm2_PatientsGrid_LinkButtonPatientGetNomPrenom_"]' // mode vertical dans les imports

    async function addPatientUrlParams(element, patientFileNumber) {
        let patientInfo = await getPatientInfo(patientFileNumber);
        console.log('patientInfo', patientInfo);
        let patientFileUrl = patientInfo.patientFileUrl;
        let patientFileUrlParts = patientFileUrl.split('?');
        let patientFileUrlParams = patientFileUrlParts[1];
        console.log('patientFileUrlParams', patientFileUrlParams);
        // Ajoute l'information dans une propriété UrlParams
        element.UrlParams = patientFileUrlParams;
        console.log('ajout de ', patientFileUrlParams, 'à', element, 'ce qui donne ', element.UrlParams);
    }

    function openPatientNotes(element) {
        const baseUrl = 'https://secure.weda.fr/FolderMedical/PopUpRappel.aspx?';
        let patientFileUrlParams = element.UrlParams;
        let url = baseUrl + patientFileUrlParams;
        recordMetrics({ clicks: 2, drags: 2 });
        window.open(url, '_blank');
    }

    function openPatientATCD(element) {
        const baseUrl = 'https://secure.weda.fr/FolderMedical/AntecedentForm.aspx?';
        let patientFileUrlParams = element.UrlParams;
        let url = baseUrl + patientFileUrlParams;
        recordMetrics({ clicks: 2, drags: 2 });
        window.open(url, '_blank');
    }

    function addHintOverlay(element) {
        element.title = '[Weda-Helper] Clic droit pour ajouter une note, ctrl+clic (ou clic du milieu) pour gérer les antécédents';
    }


    function processFoundPatientList(elements = null) {
        if (!elements) {
            elements = document.querySelectorAll(patientsSelector);
        }
        elements.forEach(element => {
            let title = element.title;
            let parts = title.split('|');
            let patientFileNumber = parts[0]; // Prendre le premier élément
            if (parseInt(patientFileNumber, 10) === 0) {
                console.log('Ne fonctionne pas pour Achimed');
                return;
            } console.log('patientFileNumber', patientFileNumber);
            addPatientUrlParams(element, patientFileNumber);
            addATCDShortcut(element);
        });
    }

    function addATCDShortcut(element) {
        // Trouver l'élément parent pour les pages HPRIM, sinon l'élément lui-même
        let target
        if (window.location.href.startsWith('https://secure.weda.fr/FolderMedical/HprimForm.aspx')) {
            target = element.parentElement.parentElement;
        } else {
            target = element;
        }

        addHintOverlay(target);


        // Gestion du clic droit
        target.addEventListener('contextmenu', function (event) {
            event.preventDefault(); // Empêche le menu contextuel de s'ouvrir
            openPatientNotes(element);
        });

        // Gestion du clic du milieu
        target.addEventListener('mousedown', function (event) {
            if (event.button === 1 || (event.ctrlKey && event.button === 0)) { // Bouton du milieu ou Ctrl+clic gauche
                // retirer l'élément href pour éviter l'ouverture d'un nouvel onglet
                let href = element.getAttribute('href');
                element.removeAttribute('href');
                event.preventDefault(); // Empêche le comportement par défaut (comme ouvrir un lien dans un nouvel onglet)
                console.log('Clic du milieu sur', event.target);
                openPatientATCD(element);

                // Rétablir l'attribut href après un délai
                setTimeout(() => {
                    element.setAttribute('href', href);
                }, 500);
            }
        });
    }
    // Pour tout les endroits où une liste de patient est issue d'un champ de recherche
    waitForElement({ selector: patientsSelector, callback: processFoundPatientList });

    // Puis la gestion des ATCD dans les pages de biologie et messagerie sécurisée
    let selecteurHprimEtMessagesSecurises =
        '[title="Ouvrir le dossier patient dans un autre onglet"], ' + // Dans la messagerie sécurisée
        '[title="Ouvrir la fiche patient dans un onglet"]'; // Dans HPRIM
    function ProcessHprimEtMessagesSecurises() {
        let elements = document.querySelectorAll(selecteurHprimEtMessagesSecurises);
        console.log('ProcessHprimEtMS', elements);
        elements.forEach(element => {
            let href = element.getAttribute('href');
            if (href) {
                let patientFileNumber = href.match(/PatDk=(\d+)/)[1];
                addPatientUrlParams(element, patientFileNumber);
                addATCDShortcut(element);
            }
        });
    }

    waitForElement({
        selector: selecteurHprimEtMessagesSecurises,
        callback: ProcessHprimEtMessagesSecurises
    });

});

// Set the focus in the text fied https://secure.weda.fr/FolderMedical/PopUpRappel.aspx
addTweak('https://secure.weda.fr/FolderMedical/PopUpRappel.aspx', '*focusOnTextArea', function () {
    let textAreaSelector = '#TextBoxCabinetPatientRappel';
    let textArea = document.querySelector(textAreaSelector);
    textArea.focus();
    recordMetrics({ clicks: 1, drags: 1 });
});


// Retirer le caractère "gras" du prénom du patient dans la page d'accueil pour plus facilement distinguer le nom du prénom
addTweak('https://secure.weda.fr/FolderMedical/PatientViewForm.aspx', 'removeBoldPatientFirstName', function () {
    let elementPrenom1 = document.querySelector('#ContentPlaceHolder1_EtatCivilUCForm1_LabelPatientPrenom');
    let elementPrenom2 = document.querySelector('#ContentPlaceHolder1_EtatCivilUCForm1_LabelPatientJeuneFille');
    if (elementPrenom1) {
        elementPrenom1.style.fontWeight = 'normal';
    }
    if (elementPrenom2) {
        elementPrenom2.style.fontWeight = 'normal';
    }
});


/* === test d'implementation ... === */
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.action === "sendNotif") {
            let script = document.createElement('script');
            script.src = chrome.runtime.getURL('FW_scripts/FWNotifv2.js?test=true');
            console.log(script)
            (document.head || document.documentElement).appendChild(script);
        }
    }
);
