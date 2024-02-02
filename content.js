// // Différentes petites fonctions ajoutées ou supprimées de Weda
// // Ne justifiant pas la création d'un fichier séparé

// // Fonction pour attendre la présence d'un élément avant de lancer une fonction
// // ! Très utilisé dans toute l'exension
function waitForElement(selector, text = null, timeout, callback) {
    var checkInterval = setInterval(function() {
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

    var timeoutId = setTimeout(function() {
        clearInterval(checkInterval);
        console.log(`Element ${selector} ${text ? 'with text "' + text + '"' : ''} not found after ${timeout} ms`);
    }, timeout);
}



// Fonction "light" pour observer l'apparition d'un élément dans le DOM
let observedElements = new WeakMap();

function lightObserver(selector, callback, parentElement = document, justOnce = false) {
    let observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                let element = parentElement.querySelector(selector);
                if (element && !observedElements.has(element)) {
                    console.log('Element has appeared');
                    observedElements.set(element, true); // Ajouter l'élément à la WeakMap
                    callback(true);
                    if (justOnce) {
                        observer.disconnect();
                    }
                }
            }
        });
    });

    let config = { childList: true, subtree: true };
    observer.observe(document, config);
}

// exemple d'utilisation :
// lightObserver('#ContentPlaceHolder1_EtatCivilUCForm1_LabelPatientSecuriteSocial', (result) => {
//     if (result) {
//         console.log('LightObserver returned true');
//     }
// });


// Déclenche un callback lorsque :
// - un élément avec le sélecteur est ajouté au DOM (facultatif)
// et - le délai debouceDelay est dépassé
// et - le délai cooldownDelay est dépassé
// inhibe le callback durant les délais cooldownDelay et debounceDelay
// a vocation à être utilisé de façon large dans l'extension
function observeDOM(callback, debounceDelay = 0, cooldownDelay = 0, selector = 'any', searchText = null, justOnce = false) {
    if (typeof debounceDelay !== 'number' || typeof cooldownDelay !== 'number' || typeof callback !== 'function') {
        throw new Error('Invalid parameters');
    }
    if (searchText === '') {
        searchText = null;
    }

    let timeout;
    let executed = false;
    let anyMutation = false;
    if (selector === 'any' || selector === 'null' || selector === 'all') {
        anyMutation = true;
    }

    const observer = new MutationObserver(function(mutations) {
        clearTimeout(timeout); // Annule le délai d'attente précédent
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                console.log('mutation executed');
                const element = document.querySelector(selector);
                if ((element || anyMutation) && !executed) {
                    if (searchText !== null) {
                        console.log('searchText non null et de valeur ', searchText);
                        if (element.textContent.indexOf(searchText) === -1) {
                            console.log('searchText', searchText, 'non trouvé dans l\'élément', element);
                            return; // Si le texte recherché n'est pas dans l'élément, ne faites rien
                        }
                    }
                    executed = true;
                    setTimeout(function() {
                        try {
                            console.log('callback', callback, 'executed');
                            callback();
                        } catch (error) {
                            console.error('Error executing callback:', error);
                        }
                        clearTimeout(timeout);
                        timeout = setTimeout(function() {
                            executed = false;
                            if (justOnce) {
                                observer.disconnect();
                            }
                        }, cooldownDelay);
                    }, debounceDelay);
                }
            }
        });
    });

    observer.observe(document, { childList: true, subtree: true });
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
    // from keyCommands, extract for each key the action
    const entries = Object.entries(keyCommands);
    let submenuDict = {};

    for (const [key, value] of entries) {
        let action = value.action;
        // in the action extract the variable send to submenuW
        if (action.toString().includes('submenuW')) {
            var match = action.toString().match(/submenuW\('(.*)'\)/);
            if (match) {
                var submenu = match[1];
                submenuDict[submenu] = value.key;
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



// // Aide au clic
// permet de cliquer sur un élément selon l'attribut onclick
function clickElementByOnclick(onclickValue) {
    var element = document.querySelector(`[onclick*="${onclickValue}"]`);
    console.log('Element:', element);
    if (element) {
        console.log('Clicking element onclickvalue', onclickValue);
        element.click();
        return true;
    } else {
        console.log('Element not found onclickvalue', onclickValue);
        return false;
    }
}


// Vérifie la présence de l'élément avec title="Prénom du patient"
function checkPatientName() {
    waitForElement('[title="Prénom du patient"]', null, 5000, function(patientNameElement) {
        var patientName = patientNameElement.value;
        waitForElement('vz-lecture-cv-widget', null, 5000, function(widgetElement) {
            var spans = widgetElement.getElementsByTagName('span');
            for (var i = 0; i < spans.length; i++) {
                if (spans[i].textContent.includes(patientName)) {
                    console.log('Patient name found');
                    spans[i].click();
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
document.addEventListener('visibilitychange', function() {
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
// [Page de Consultation] Modifie l'ordre de tabulation des valeurs de suivi
chrome.storage.local.get('TweakTabConsultation', function (result) {
    function changeTabOrder() {
        console.log('changeTabOrder started');
        var elements = document.querySelectorAll('[id^="ContentPlaceHolder1_SuivisGrid_EditBoxGridSuiviReponse_"]');
        // change the taborder starting with 0 for elements[0] and incrementing by 1 for each element
        for (var i = 0; i < elements.length; i++) {
            elements[i].tabIndex = i + 1;
        }
    }
    if (result.TweakTabConsultation !== false) {
        if (window.location.href.startsWith('https://secure.weda.fr/FolderMedical/ConsultationForm.aspx')) {
            // Crée un nouvel observateur de mutations
            var observer = new MutationObserver(changeTabOrder);

            // Commence à observer le document avec les configurations spécifiées
            observer.observe(document, { childList: true, subtree: true });

            console.log('ConsultationFormTabOrderer started');
        }
    }
});

// [page de recettes] Appuie automatiquement sur le bouton "rechercher" après avoir sélectionné la page des recettes
// seulement si la page est https://secure.weda.fr/FolderGestion/RecetteForm.aspx, appuis sur id="ContentPlaceHolder1_ButtonFind"
chrome.storage.local.get('TweakRecetteForm', function (result) {
    let TweakRecetteForm = result.TweakRecetteForm;
    if (window.location.href === 'https://secure.weda.fr/FolderGestion/RecetteForm.aspx' && TweakRecetteForm !== false) {
        var button = document.getElementById('ContentPlaceHolder1_ButtonFind');
        if (button) {
            button.click();
            console.log('Button clicked on RecetteForm page');
        }
    }
});

// // [page d'accueil]
if (window.location.href.startsWith('https://secure.weda.fr/FolderMedical/PatientViewForm.aspx')) {
    // sélectionne automatiquement le patient après une lecture de carte vitale
    chrome.storage.local.get('autoSelectPatientCV', function (result) {
        let autoSelectPatientCV = result.autoSelectPatientCV;
        if (autoSelectPatientCV !== false) {
            const lookForPatient = () => {
                var elements = document.querySelectorAll('[mattooltip="Dossier patient lié"]'); // TODO changer le sélecteur par un tableau pour le nom du patient à la place, puis chercher s'il a un dossier lié, et cliquer dessus
                if (elements.length === 1) {
                    console.log('Patient seul trouvé, je clique dessus', elements[0]);
                    elements[0].click();
                    // remove element
                    elements[0].remove(); // évite un double clic sur l'élément
                } else if (elements.length >= 2) {
                    console.log(elements.length, 'trop de patients trouvé, je ne clique pas', elements);
                } else {
                    console.log('Aucun patient trouvé', elements);
                }
            };

            observeDOM(lookForPatient, 300, 300, '[mattooltip="Dossier patient lié"]');

        }
    });


    // copie automatiquement dans le presse papier le NIR du patient quand on clique dessus:
    chrome.storage.local.get('TweakNIR', function (result) {
        let TweakNIR = result.TweakNIR;
        if (TweakNIR !== false) {
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
                    });

                    // Add the copy symbol next to the element
                    console.log('copySymbol', copySymbol, 'added next to element', element);
                    element.parentNode.insertBefore(copySymbol, element.nextSibling);
                }
            }

            // function watchForElements() {
            lightObserver('span.label', (result) => {
            // waitForElement('span.label', 'NIR', 5000, function (element) {
                var element = document.querySelector('#ContentPlaceHolder1_EtatCivilUCForm1_insiContainer span.label');
                console.log('element', element);
                var nir = element.textContent.match(/(\d{13} \d{2})/)[1];
                nir = nir.replace(/\s/g, ''); // Supprime tous les espaces de la chaîne
                addCopySymbol(element, nir);
                element.addEventListener('click', function () {
                    console.log('nir', nir);
                    navigator.clipboard.writeText(nir);
                });
            });
            
            lightObserver('#ContentPlaceHolder1_EtatCivilUCForm1_LabelPatientSecuriteSocial', (result) => {
            // waitForElement('#ContentPlaceHolder1_EtatCivilUCForm1_LabelPatientSecuriteSocial', '', 5000, function (element) {
                var element = document.querySelector('#ContentPlaceHolder1_EtatCivilUCForm1_LabelPatientSecuriteSocial');
                var secu = element.textContent.match(/(\d{1} \d{2} \d{2} \d{2} \d{3} \d{3} \d{2})/)[1];
                secu = secu.replace(/\s/g, ''); // Supprime tous les espaces de la chaîne
                addCopySymbol(element, secu);
                element.addEventListener('click', function () {
                    console.log('secu', secu);
                    navigator.clipboard.writeText(secu);
                });
            });
            
            
            // window.addEventListener('load', function () {
            //     watchForElements();
            // });

            // function observerCopy(parent) {
            //     // Créer un observateur de mutations pour surveiller les modifications du DOM
            //     var observer = new MutationObserver(function (mutations) {
            //         mutations.forEach(function (mutation) {
            //             // only if mat-tooltip-trigger weda-row-no-wrap weda-main-align-start weda-cross-align-center pointer detecté
            //             let elementsNIR = Array.from(mutation.addedNodes).filter(node => node.classList && node.matches('.mat-tooltip-trigger.weda-row-no-wrap.weda-main-align-start.weda-cross-align-center.pointer'));
            //             let elementsSECU = Array.from(mutation.addedNodes).filter(node => node.classList && node.matches('#ContentPlaceHolder1_EtatCivilUCForm1_LabelPatientSecuriteSocial'));
            //             if (elementsNIR.length + elementsSECU.length > 0) {
            //                 console.log('nir ou secu ajouté => add copy buttons');
            //                 watchForElements();
            //             }
            //         });
            //     });

            //     // Configurer l'observateur pour surveiller tout le document
            //     var config = { childList: true, subtree: true };
            //     observer.observe(parent, config);
            // }
            // let frametowatch = document.getElementById('ContentPlaceHolder1_EtatCivilUCForm1_FramePatient');
            // if (frametowatch) {
            //     observerCopy(frametowatch);
            // } else {
            //     console.log('Element with id "ContentPlaceHolder1_EtatCivilUCForm1_FramePatient" not found');
            // }
        }
    });
}

// [page de gestion des feuilles de soins]
if (window.location.href === 'https://secure.weda.fr/vitalzen/gestion.aspx') {
    chrome.storage.local.get('TweakFSEGestion', function (result) {
        let TweakFSEGestion = result.TweakFSEGestion;
        if (TweakFSEGestion !== false) {
            waitForElement('.mat-icon.notranslate.material-icons.mat-icon-no-color', 'search', 5000, function (element) {
                console.log('element', element, 'trouvé, je clique dessus');
                element.click();
            });
        }
    });
}



// // Retrait des suggestions de titre
chrome.storage.local.get('RemoveTitleSuggestions', function (result) {
    function RemoveTitleSuggestions() {
        console.log('RemoveTitleSuggestions started');
        var elements = document.getElementById('DivGlossaireReponse');
        if (elements) {
            elements.remove();
        }
    }
    if (result.RemoveTitleSuggestions !== false) {
        // vérifie que l'on est sur une page soufrant du problème
        if (window.location.href.startsWith('https://secure.weda.fr/FolderMedical/')
            && window.location.href.includes('Form.aspx')
            && !window.location.href.startsWith('https://secure.weda.fr/FolderMedical/PatientViewForm.aspx')
            && !window.location.href.startsWith('https://secure.weda.fr/FolderMedical/UpLoaderForm.aspx')) {

            // Créer un observateur de mutations pour surveiller les modifications du DOM
            var titleremoverTimeout;
            var observer = new MutationObserver(function (mutations) {
                mutations.forEach(function (mutation) {
                    if (titleremoverTimeout) {
                        clearTimeout(titleremoverTimeout);
                    }
                    titleremoverTimeout = setTimeout(RemoveTitleSuggestions, 400);
                });
            });

            // Configurer l'observateur pour surveiller tout le document
            var config = { childList: true, subtree: true };
            observer.observe(document, config);

            RemoveTitleSuggestions();
        }
    }
});



// // Travail sur les boutons des interfaces secu (IMTI, DMP etc.) TODO
function warpButtons() {
    function addIdToButton(button) {
        // make a dictionnary with text as key and id as value
        var actions = {
            'Annuler': ['Non', 'NON', 'Annuler'],
            'Valider': ['Oui', 'OUI', 'Valider', 'Réessayer', 'Désactiver aujourd\'hui']
        };
        if (button) {
            // Si le bouton a déjà un ID, retourner false
            if (button.id === 'targetAnnuler' || button.id === 'targetValider') {
                console.log('button already has id', button);
                return false;
            }
            console.log('ajout de id au button', button);
            var action = Object.keys(actions).find(key => actions[key].includes(button.textContent));
            console.log('action', action);
            if (action) {
                button.id = 'target' + action;
            }
        }
        return true;
    }

    function addShortcutsToButton(button) {
        // make a dictionnary with text as key and id as value
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
        }
    }

    var container = document.querySelector('.cdk-overlay-container');
    console.log('container', container);
    if (container) {
        // L'élément avec la classe 'cdk-overlay-container' existe, vous pouvez travailler sur ses descendants
        setTimeout(function () {


            var buttons = Array.from(container.querySelectorAll('button'))
            console.log('buttons', buttons);
            buttons.forEach(function (button) {
                console.log('Bouton trouvé ! Je le redimentionne, lui ajoute un id et note le raccourcis clavier par défaut', button);
                button.style.width = 'auto';
                if (addIdToButton(button)) {
                    addShortcutsToButton(button);
                }
            });

            // make #cdk-overlay-1 from 398px high to auto
            let textbox = document.querySelector('mat-dialog-container');
            if (textbox) {
                textbox.style.height = '440px';
            } else {
                console.log('Element with id "cdk-overlay-1" not found');
            }
            
        }, 200);

    }
}

chrome.storage.local.get('WarpButtons', function (result) {
    let WarpButtons = result.WarpButtons;
    if (WarpButtons !== false) {
        function observerWarpButtons() {
            let childCssSelector = '#cdk-describedby-message-container'; // cet élément semble être modifié à chaque fois qu'un overlay est ajouté
            let parentElement = document.body
            console.log('starting observerWarpButtons with', parentElement, childCssSelector)

            if (document.getElementsByClassName(childCssSelector)){
                console.log(childCssSelector, 'already exists');
                warpButtons();
            }
            
            let observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        let elements = Array.from(mutation.addedNodes).filter(node => node.classList && node.matches(childCssSelector));
                        if (elements.length > 0) {
                            console.log(childCssSelector, ' a été ajouté');
                            warpButtons();
                        }
                    }
                });
            });

            // Configuration de l'observateur :
            let config = { childList: true, subtree: false};

            // Commencez à observer l'élément parent avec la configuration donnée
            observer.observe(parentElement, config);
        }



        console.log('observeDOM warpButtons');
        observerWarpButtons();
    }
});