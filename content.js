// // Différentes petites fonctions ajoutées ou supprimées de Weda
// // Ne justifiant pas la création d'un fichier séparé

// // Fonction pour attendre la présence d'un élément avant de lancer une fonction
// // ! Très utilisé dans toute l'exension, a vocation a laisser sa place à lightObserver
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
function lightObserver(selector, callback, parentElement = document, justOnce = false, debug = false) {
    let observer = new MutationObserver((mutations) => {
        for (let i = 0; i < mutations.length; i++) {
            let mutation = mutations[i];
            if (mutation.type === 'childList') {
                if (debug) {
                    console.log('[lightObserver]', selector, parentElement, ' Mutation:', mutation);
                }
                let elements = parentElement.querySelectorAll(selector);
                let newElements = [];
                for (let j = 0; j < elements.length; j++) {
                    let element = elements[j];
                    if (!observedElements.has(element)) {
                        if (debug) {console.log('[lightObserver] Element', element, ' has appeared');}
                        observedElements.set(element, true); // Add the element to the WeakMap
                        newElements.push(element);
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

function observeDiseapearance(element, callback) {
    function callBackIfElementDisapear() {
        if (!document.contains(element)) {
            callback();
        }
    }

    let observer = new MutationObserver(callBackIfElementDisapear);
    let config = { childList: true, subtree: true };
    observer.observe(document, config);
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
if (window.location.href.startsWith('https://secure.weda.fr/FolderMedical/ConsultationForm.aspx')) {
    chrome.storage.local.get('TweakTabConsultation', function (result) {    
        if (result.TweakTabConsultation !== false) {        
            function changeTabOrder(elements) {
                console.log('changeTabOrder started');
                for (var i = 0; i < elements.length; i++) {
                    elements[i].tabIndex = i + 1;
                }
            }

            lightObserver('[id^="ContentPlaceHolder1_SuivisGrid_EditBoxGridSuiviReponse_"]',changeTabOrder)
            console.log('ConsultationFormTabOrderer started');
        }
    });
}

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
if (window.location.href.startsWith('https://secure.weda.fr/FolderMedical/PatientViewForm.aspx') || window.location.href.startsWith('https://secure.weda.fr/FolderMedical/FindPatientForm.aspx')) {
    chrome.storage.local.get('autoSelectPatientCV', function (result) {
        console.log('autoSelectPatientCV démarré');
        let autoSelectPatientCV = result.autoSelectPatientCV;
        if (autoSelectPatientCV !== false) {
            // lit automatiquement la carte vitale elle est insérée
            let cvSelectors = 'weda-notification-container .mat-card.mat-focus-indicator.info.ng-star-inserted div .ng-star-inserted';
            lightObserver(cvSelectors, function (elements) {
                console.log('cvSelectors', elements, 'found');
                elements.forEach(cvElement => {
                    console.log('cvElement text', cvElement.textContent);
                    if (cvElement.textContent.includes('Vitale insérée')) {
                        console.log('cvElement', cvElement, 'found');
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
                });
            });
            
            lightObserver('#ContentPlaceHolder1_EtatCivilUCForm1_LabelPatientSecuriteSocial', (elements) => {
                var secu = elements[0].textContent.match(/(\d{1} \d{2} \d{2} \d{2} \d{3} \d{3} \d{2})/)[1];
                secu = secu.replace(/\s/g, ''); // Supprime tous les espaces de la chaîne
                addCopySymbol(elements[0], secu);
                elements[0].addEventListener('click', function () {
                    console.log('secu', secu);
                    navigator.clipboard.writeText(secu);
                });
            });
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
    function RemoveTitleSuggestions(elements) {
        setTimeout(() => {
            console.log('Remove TitleSuggestions started');
            if (elements[0]) {
                elements[0].remove();
            }
        }, 400);
    }
    if (result.RemoveTitleSuggestions !== false) {
        console.log('RemoveTitleSuggestions démarré');
        // vérifie que l'on est sur une page soufrant du problème
        if (window.location.href.startsWith('https://secure.weda.fr/FolderMedical/')
            && window.location.href.includes('Form.aspx')
            && !window.location.href.startsWith('https://secure.weda.fr/FolderMedical/PatientViewForm.aspx')
            && !window.location.href.startsWith('https://secure.weda.fr/FolderMedical/UpLoaderForm.aspx')) {
            RemoveTitleSuggestions(document.querySelectorAll('#DivGlossaireReponse')); // nécessaire pour certaines pages se chargeant trop vite
            lightObserver('#DivGlossaireReponse', RemoveTitleSuggestions)
        }
    }
});



// // Travail sur les boutons des interfaces secu (IMTI, DMP etc.) 
chrome.storage.local.get('WarpButtons', function (result) {
    let WarpButtons = result.WarpButtons;
    if (WarpButtons !== false) {
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
        
            function resizeTextBox () {
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
    }
});

// Page HRPIM
if (window.location.href.startsWith('https://secure.weda.fr/FolderMedical/HprimForm.aspx')) {
    function makeHPRIMListSticky() {
        let element = document.querySelector("#ContentPlaceHolder1_UpdatePanelHprimsGrid");
        element.style.position = "sticky";
        element.style.top = "0px";
    }
    makeHPRIMListSticky();
}

// // Mettre l'historique dans une colonne à gauche de l'écran
// TODO l'ajouter sur d'autres pages ?
let pagesToLeftPannel = [
    { url: 'https://secure.weda.fr/FolderMedical/ConsultationForm.aspx', targetElementSelector: '#form1 > div:nth-child(14) > div > table > tbody > tr > td:nth-child(1) > table' },
    // { url: 'https://secure.weda.fr/FolderMedical/CertificatForm.aspx', targetElementSelector: '#CE_ContentPlaceHolder1_EditorCertificat_ID' },
    // { url: 'https://secure.weda.fr/FolderMedical/DemandeForm.aspx', targetElementSelector: '#ContentPlaceHolder1_UpdatePanelAll' },
    // { url: 'https://secure.weda.fr/FolderMedical/PrescriptionForm.aspx', targetElementSelector: '#ContentPlaceHolder1_PanelBaseVidalBackGround > table' },
    // { url: 'https://secure.weda.fr/FolderMedical/FormulaireForm.aspx', targetElementSelector: '#form1 > div:nth-child(14) > table > tbody > tr > td > table' },
    // { url: 'https://secure.weda.fr/FolderMedical/ResultatExamenForm.aspx', targetElementSelector: '#form1 > div:nth-child(14) > table > tbody > tr > td > table' },
    // { url: 'https://secure.weda.fr/FolderMedical/CourrierForm.aspx', targetElementSelector: '#form1 > div:nth-child(15) > table > tbody > tr > td:nth-child(1) > table' }
];
let currentPage = pagesToLeftPannel.find(page => page.url === window.location.origin + window.location.pathname);
if (currentPage) {
    chrome.storage.local.get('MoveHistoriqueToLeft', function (result) {
        if (result.MoveHistoriqueToLeft !== false) {
            console.log('MoveHistoriqueToLeft démarré');
            function moveToLeft(iframes) {
                function warpHistory(elementToShrink) {
                    // Redimensionner l'affichage de l'historique
                    let margin = (elementToMove.getBoundingClientRect().width - 70);
                    elementToShrink.style.maxWidth = margin + 'px';
                }


                function warpElements() {
                    let historyProportion = 0.3;
                    let availableWidth = window.innerWidth;
                    let elementToMoveWidth = availableWidth * historyProportion;
                    let targetElementWidth = (1 - historyProportion) * availableWidth;
                    let unitsElementWidth = (1 - historyProportion) * availableWidth * 0.2;
                    
                    // Bouger l'historique à gauche et le redimensionner
                    elementToMove.style.position = 'absolute';
                    elementToMove.style.left = '0px';
                    elementToMove.style.marginTop = '0px'; // Remove top margin
                    elementToMove.style.width = elementToMoveWidth + 'px'; 

                    // Stocker les valeurs initiales
                    initialStylesTargetElement = {
                        position: targetElement.style.position,
                        left: targetElement.style.left,
                        marginTop: targetElement.style.marginTop,
                        width: targetElement.style.width
                    };
                    initialStylesUnitsElement = {
                        position: unitsElement.style.position,
                        left: unitsElement.style.left,
                        marginTop: unitsElement.style.marginTop,
                        width: unitsElement.style.width
                    };

                    // Modifier la largeur de l'élément de suivi
                    unitsElement.style.width = unitsElementWidth + 'px';

                    // Bouger la cible à droite et la redimensionner
                    targetElement.style.position = 'absolute';
                    targetElement.style.left = (elementToMove.getBoundingClientRect().right) + 'px';
                    targetElement.style.marginTop = '0px'; // Remove top margin
                    console.log('availableWidth', availableWidth);
                    targetElement.style.width = targetElementWidth + 'px';
                }

                function resetTargetElement() {
                    console.log('resetTargetElement');
                    // Rétablir les valeurs initiales
                    targetElement.style.position = initialStylesTargetElement.position;
                    targetElement.style.left = initialStylesTargetElement.left;
                    targetElement.style.marginTop = initialStylesTargetElement.marginTop;
                    targetElement.style.width = initialStylesTargetElement.width;

                    unitsElement.style.position = initialStylesUnitsElement.position;
                    unitsElement.style.left = initialStylesUnitsElement.left;
                    unitsElement.style.marginTop = initialStylesUnitsElement.marginTop;
                    unitsElement.style.width = initialStylesUnitsElement.width;
                }


                // Définition des éléments à déplacer et de la cible
                let elementToMove = document.querySelector('#ContentPlaceHolder1_EvenementUcForm1_PanelHistoriqueFrame');
                let targetElement = document.querySelector(currentPage['targetElementSelector']);
                let unitsElement = document.querySelector('#ContentPlaceHolder1_SuivisGrid');
                let iframeToActOn = iframes[0];

                // liste des selecteurs à suppimer
                let selectorsToRemove = [
                    '#PanelFiltre',
                    '.fondcoordination',
                    '[name="dh9"]',
                    '.frameupright',
                    '.frameupleft',
                    '.frameupcenter',
                ];

                warpElements(); // à appeler avant le load de l'iframe pour plus de réactivité

                iframeToActOn.addEventListener('load', () => {
                    let iframeDocument = iframeToActOn.contentDocument;

                    // Supprimer les éléments inutiles
                    selectorsToRemove.forEach((selector) => {
                        lightObserver(selector, (elements) => {
                            elements.forEach((element) => {
                                element.remove();
                            });
                        }, iframeDocument);
                    });

                    setTimeout(() => {
                        selectorsToRemove.forEach((selector) => {
                            let element = iframeDocument.querySelector(selector);
                            if (element) {
                                element.remove();
                            }
                        });
                    }, 20);

                    // Redimensionner l'historique
                    let elementToShrink = iframeDocument.querySelector('[style*="max-width:"]');
                    warpHistory(elementToShrink);

                    // réinitialiser les éléments à la disparition de l'iframe
                    observeDiseapearance(iframeToActOn, resetTargetElement);
                });
            }


            // Automatiquement afficher l'historique
            lightObserver('#ContentPlaceHolder1_EvenementUcForm1_ImageButtonShowHistoriqueFrame', (elements) => {
                if (elements.length > 0) {
                    elements[0].click();
                }
            }, document, true);


            // Attendre que l'iframe soit présente ET chargée pour déplacer l'historique
            lightObserver('#ContentPlaceHolder1_EvenementUcForm1_PanelHistoriqueFrame > iframe', moveToLeft);
        }
    });
}


