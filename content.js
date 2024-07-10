// // Différentes petites fonctions ajoutées ou supprimées de Weda
// // Ne justifiant pas la création d'un fichier séparé

// // Sorte de post-chargement pour les pages, car le onload fonctionne mal, et après une mutation c'est pas toujours évident
function afterMutations(delay, callback, callBackId = "callback id undefined") {
    let timeoutId = null;
    const action = () => {
        console.log(`Aucune mutation détectée pendant ${delay}ms, je considère la page comme chargée. Appel du Callback. (${callBackId})`);
        callback();
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

// // Fonction pour attendre la présence d'un élément avant de lancer une fonction
// // ! Très utilisé dans toute l'exension, a vocation a laisser sa place à lightObserver
function waitForElement(selector, text = null, timeout, callback) {
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



// Fonction "light" pour observer l'apparition d'un élément dans le DOM
let observedElements = new WeakMap();
function lightObserver(selector, callback, parentElement = document, justOnce = false, debug = false, textContent = null) {
    let observer = new MutationObserver((mutations) => {
        for (let i = 0; i < mutations.length; i++) {
            let mutation = mutations[i];
            if (mutation.type === 'childList') {
                if (debug) {
                    console.log('[lightObserver]', selector, parentElement, ' Mutation:', mutation);
                }
                let elements = parentElement.querySelectorAll(selector);
                if (textContent) {
                    elements = Array.from(elements).filter(element => element.textContent.includes(textContent));
                }
                let newElements = [];
                for (let j = 0; j < elements.length; j++) {
                    let element = elements[j];
                    if (!observedElements.has(element)) {
                        if (debug) { console.log('[lightObserver] Element', element, ' has appeared'); }
                        observedElements.set(element, true); // Add the element to the WeakMap
                        newElements.push(element);
                    } else {
                        if (debug) { console.log('[lightObserver] Element', element, ' already observed'); }
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

// // Fonctions de contrôle de l'url et de l'option pour lancer une fonction
// récupération de la valeur de l'option (donc soit la valeur sauvegardée, soit la valeur par défaut)
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

// Permet de simplifier le code et de ne pas avoir à écrire la même condition à chaque fois
// Si l'url et/ou les options sont multiples, on peut passer un tableau
// Pour simplifier le code : on fait un appel à addTweak après chaque tableau d'url/option
// Une option précédée de '!' sera considérée comme négative
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

    // first force the mouseover status to the element with class="level1 static" and aria-haspopup="ContentPlaceHolder1_MenuNavigate:submenu:2"
    var element = document.querySelector('[class="has-popup static"]');
    if (element) {
        element.dispatchEvent(new MouseEvent('mouseover', {
            view: window,
            bubbles: true,
            cancelable: true
        }));
    }
    chrome.storage.local.get(["defaultShortcuts", "shortcuts"], function (result) {
        // from keyCommands, extract for each key the action
        const entries = Object.entries(keyCommands);
        let submenuDict = {};

        for (const [key, action] of entries) {
            // in the action extract the variable send to submenuW
            if (action.toString().includes('submenuW')) {
                var match = action.toString().match(/submenuW\('(.*)'\)/);
                if (match) {
                    var submenu = match[1];
                    submenuDict[submenu] = shortcutDefaut(result.shortcuts, result.defaultShortcuts, key);
                }
            }
        }
        console.log(submenuDict);

        // change the description of each class="level2 dynamic" whom description contain the key of submenuDict to add the corresponding value
        var elements = document.getElementsByClassName('level2 dynamic');
        for (var i = 0; i < elements.length; i++) {
            var element = elements[i];
            var description = element.innerText;
            description = description.replace(/ \(\d+\)$/, '');
            // console.log('description', description);
            if (description in submenuDict) {
                // console.log('description in submenuDict', description);
                // add a tooltip with the key of submenuDict next to the element
                var tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.style.position = 'absolute';
                tooltip.style.top = '0px';
                tooltip.style.left = '100%';
                tooltip.style.padding = '10px';
                tooltip.style.backgroundColor = '#284E98';
                tooltip.style.border = '1px solid black';
                tooltip.style.zIndex = '1000';
                // tooltip.style.color = 'black';
                tooltip.textContent = submenuDict[description];
                element.appendChild(tooltip);
            }
        }
    });
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


// // vérification de la présence du Companion TODO

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
    waitForElement('[title="Prénom du patient"]', null, 5000, function (patientNameElement) {
        var patientName = patientNameElement.value;
        waitForElement('vz-lecture-cv-widget', null, 5000, function (widgetElement) {
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
        });
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
    'tpebis': () => sendLastTPEamount()
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action in actions) {
        console.log(request.action + ' demandé');
        actions[request.action]();
    }
});

// Ecoute l'appuis de la touches Alt pour afficher l'aide
var tooltipTimeout;
document.addEventListener('keydown', function (event) {
    if (event.key === 'Alt') {
        tooltipTimeout = setTimeout(function () {
            tooltipshower();
        }, 500);
    }
});
document.addEventListener('keyup', function (event) {
    if (event.key === 'Alt') {
        clearTimeout(tooltipTimeout);
        mouseoutW();
    }
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
            lightObserver(cvSelectors, function (elements) {
                console.log('cvSelectors', elements, 'found');
                elements.forEach(cvElement => {
                    console.log('cvElement text', cvElement.textContent);
                    if (cvElement.textContent.includes('Vitale insérée')) {
                        console.log('cvElement', cvElement, 'found');
                        recordMetrics({ clicks: 1, drags: 1 });
                        clickCarteVitale();
                    }
                });
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
            lightObserver(patientSelector, function () {
                setTimeout(lookForPatient, 100);
            }, document, true);

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

            lightObserver('#ContentPlaceHolder1_EtatCivilUCForm1_insiContainer span.label', (elements) => {
                console.log('element', elements[0]);
                var nir = elements[0].textContent.match(/(\d{13} \d{2})/)[1];
                nir = nir.replace(/\s/g, ''); // Supprime tous les espaces de la chaîne
                addCopySymbol(elements[0], nir);
                elements[0].addEventListener('click', function () {
                    console.log('nir', nir);
                    navigator.clipboard.writeText(nir);
                    recordMetrics({ clicks: 3, drags: 2 });
                });
            });

            lightObserver('#ContentPlaceHolder1_EtatCivilUCForm1_LabelPatientSecuriteSocial', (elements) => {
                var secu = elements[0].textContent.match(/(\d{1} \d{2} \d{2} \d{2} \d{3} \d{3} \d{2})/)[1];
                secu = secu.replace(/\s/g, ''); // Supprime tous les espaces de la chaîne
                addCopySymbol(elements[0], secu);
                elements[0].addEventListener('click', function () {
                    console.log('secu', secu);
                    navigator.clipboard.writeText(secu);
                    recordMetrics({ clicks: 3, drags: 2 });
                });
            });
        }
    },
];

addTweak(homePageUrls, homePageFunctions); //TODO à vérifier : semble engendrer un message abscond dans la console



// [page de gestion des feuilles de soins]
addTweak('https://secure.weda.fr/vitalzen/gestion.aspx', 'TweakFSEGestion', function () {
    waitForElement('.mat-icon.notranslate.material-icons.mat-icon-no-color', 'search', 5000, function (element) {
        console.log('element', element, 'trouvé, je clique dessus');
        element.click();
        recordMetrics({ clicks: 1, drags: 1 });
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
    lightObserver('#DivGlossaireReponse', RemoveTitleSuggestions);
});



// // Travail sur les boutons des interfaces secu (IMTI, DMP etc.)
addTweak('*', 'WarpButtons', function () {
    function warpButtons(buttons) {
        function addIdToButton(button) {
            var actions = {
                'Annuler': ['Continuez sans l\'ordonnance numérique', 'Non', 'NON', 'Annuler'],
                'Valider': ['Oui', 'OUI', 'Confirmer', 'Valider', 'Réessayer', 'Désactiver aujourd\'hui', 'Transmettre']
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

    lightObserver('.cdk-overlay-container .mat-raised-button', warpButtons)
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
    lightObserver('we-doc-import', function (elements) {
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
    lightObserver('#ContentPlaceHolder1_TextBoxAntecedentNom', function (elements) {
        elements[0].focus();
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
                printIfOption()
            });

            element.appendChild(printIcon);
        });
    }
    lightObserver('[id^="ContentPlaceHolder1_TreeViewBibliot"]', addPrintIcon);
});