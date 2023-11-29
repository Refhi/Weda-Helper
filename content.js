// Function to resize elements
function uploaderformResizeElements() {
    // Change the size of specific elements here
    // For example, to change the height of the PDF viewer:
    var pdfViewer = document.querySelector('#ContentPlaceHolder1_ViewPdfDocumentUCForm1_PanelViewDocument');
    if (pdfViewer) {
        pdfViewer.style.height = '600px'; // replace '500px' with the desired height
    }

    // Change the height of the iframe
    var iframe = document.querySelector('#ContentPlaceHolder1_ViewPdfDocumentUCForm1_iFrameViewFile');
    if (iframe) {
        iframe.style.height = '600px'; // replace '450px' with the desired height
    }

    // Set the top of the PanelFindPatient element
    var panelFindPatient = document.querySelector('#ContentPlaceHolder1_FindPatientUcForm1_PanelFindPatient');
    if (panelFindPatient) {
        panelFindPatient.style.top = '600px'; // replace '600px' with the desired top position
    }
}


function uploaderformSetTabOrder() {
    var elementIds = [
        'ContentPlaceHolder1_FileStreamClassementsGrid_LinkButtonFileStreamClassementsGridPatientNom_',
        'ContentPlaceHolder1_FileStreamClassementsGrid_EditBoxGridFileStreamClassementDate_',
        'ContentPlaceHolder1_FileStreamClassementsGrid_EditBoxGridFileStreamClassementTitre_',
        'ContentPlaceHolder1_FileStreamClassementsGrid_DropDownListGridFileStreamClassementLabelClassification_'
    ];

    var tabIndex = 1;
    for (var i = 0; i <= 7; i++) {
        elementIds.forEach(function (elementId) {
            var element = document.getElementById(elementId + i);
            if (element) {
                element.tabIndex = tabIndex;
                tabIndex++;
            }
        });
    }
}

function ListTabOrderer(truncated_id) {
    // get how many ContentPlaceHolder1_FindPatientUcForm1_PatientsGrid_LinkButtonPatientGetNomPrenom_0 there are
    var elements = document.querySelectorAll(truncated_id);
    // change the taborder starting with 100 for ContentPlaceHolder1_FindPatientUcForm1_PatientsGrid_LinkButtonPatientGetNomPrenom_0 and incrementing by 1 for each element
    for (var i = 0; i < elements.length; i++) {
        elements[i].tabIndex = i + 100;
    }
}

function FocusToDocDateAfterPatientSelect() {
    // find all elements with id starting with ContentPlaceHolder1_FileStreamClassementsGrid_LinkButtonFileStreamClassementsGridPatientNom_
    var elements = document.querySelectorAll('[id^="ContentPlaceHolder1_FileStreamClassementsGrid_LinkButtonFileStreamClassementsGridPatientNom_"]');
    // starting from the last element, find the first element with title= starting with "Vous avez attribué ce document au patient" and gets its id
    for (var i = elements.length - 1; i >= 0; i--) {
        var element = elements[i];
        console.log('element', element);
        if (element.title.startsWith("Vous avez attribué ce document au patient")) {
            var id = element.id;
            // get the 1 or 2 digits at the end of the id
            var patient_number = id.match(/\d+$/)[0];
            console.log('Le patient en cours est en position', patient_number);
            // focus on the element with ContentPlaceHolder1_FileStreamClassementsGrid_EditBoxGridFileStreamClassementDate_ + patient_number
            var elementToFocus = document.getElementById('ContentPlaceHolder1_FileStreamClassementsGrid_EditBoxGridFileStreamClassementDate_' + patient_number);
            if (elementToFocus) {
                elementToFocus.focus();
                break;
            }
        }
    }
}

// place a listner on all patients names (ContentPlaceHolder1_FindPatientUcForm1_PatientsGrid_LinkButtonPatientGetNomPrenom_0 etc.)
function PatientSelectEntryListener() {
    // place a listener on all elements starting with ContentPlaceHolder1_FindPatientUcForm1_PatientsGrid_LinkButtonPatientGetNomPrenom_
    var elements = document.querySelectorAll('[id^="ContentPlaceHolder1_FindPatientUcForm1_PatientsGrid_LinkButtonPatientGetNomPrenom_"]');
    for (var i = 0; i < elements.length; i++) {
        elements[i].addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                console.log('Enter pressed on patient name');
                setTimeout(function () {
                    FocusToDocDateAfterPatientSelect();
                }, 500);
            }
        });
    }
}

function SearchBoxEntryListener() {
    var ids_search_box = [
        'ContentPlaceHolder1_FindPatientUcForm1_TextBoxRecherche',
        'ContentPlaceHolder1_FindPatientUcForm1_PanelNom',
        'ContentPlaceHolder1_BaseVidalUcForm1_TextBoxFindPack'
    ];
    var element = null;

    for (var i = 0; i < ids_search_box.length; i++) {
        element = document.getElementById(ids_search_box[i]);
        if (element !== null) {
            break;
        }
    }

    if (element === null) {
        console.log('SearchBoxEntryListener: element null');
    }
    if (element) {
        element.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                console.log('Enter pressed in search box');
                setTimeout(function () {
                    var elementToFocus = document.getElementById('ContentPlaceHolder1_FindPatientUcForm1_PatientsGrid_LinkButtonPatientGetNomPrenom_0');
                    if (elementToFocus === null) {
                        elementToFocus = document.getElementById('ContentPlaceHolder1_BaseVidalUcForm1_VidalPacksGrid_LinkButtonVidalPacksGridName_0');
                    }
                    if (elementToFocus) {
                        elementToFocus.focus();
                    }
                    ListTabOrderer('[id^="ContentPlaceHolder1_FindPatientUcForm1_PatientsGrid_LinkButtonPatientGetNomPrenom_"]');
                    PatientSelectEntryListener();
                    SearchBoxEntryListener();
                }, 400);
            }
        });
    }
}


function ConsultationFormTabOrderer() {
    // make a var with all the elements with id starting with ContentPlaceHolder1_SuivisGrid_EditBoxGridSuiviReponse_
    var elements = document.querySelectorAll('[id^="ContentPlaceHolder1_SuivisGrid_EditBoxGridSuiviReponse_"]');
    // change the taborder starting with 0 for elements[0] and incrementing by 1 for each element
    for (var i = 0; i < elements.length; i++) {
        elements[i].tabIndex = i + 1;
    }
}




// focus the tab selection on an element named 'ctl00$ContentPlaceHolder1$ViewPdfDocumentUCForm1$ButtonCloseStay'
function focusElementByName(elementName) {
    console.log('Focusing element:', elementName);
    var element = document.getElementsByName(elementName)[0];
    if (element) {
        element.focus();
        console.log('Focusing element success:', elementName);
    }
}

function waitForElementToExist(elementId, callback) {
    var element = document.getElementById(elementId);
    if (element) {
        callback(element);
    } else {
        var startTime = Date.now();
        var checkInterval = setInterval(function () {
            var elapsedTime = Date.now() - startTime;
            if (elapsedTime >= 5000) {
                clearInterval(checkInterval);
                console.log('Timeout: Element not found after 5 seconds');
            } else {
                var element = document.getElementById(elementId);
                if (element) {
                    clearInterval(checkInterval);
                    callback(element);
                }
            }
        }, 100); // Check every 100 milliseconds
    }
}

// set all ContentPlaceHolder1_FileStreamClassementsGrid_DropDownListGridFileStreamClassementEvenementType_ to option value 1
function allConsultation() {
    console.log('setAllImportToConsultation');
    var elements = document.querySelectorAll('[id^="ContentPlaceHolder1_FileStreamClassementsGrid_DropDownListGridFileStreamClassementEvenementType_"]');
    for (var i = 0; i < elements.length; i++) {
        // set the dropdown to "Consultation"
        elements[i].selectedIndex = 0;
        console.log('Element set to Consultation:', elements[i]);
    }
}

function push_valider() {
    console.log('push_valider activé');
    // click the first element with class="button valid" except if its value is "Chercher"
    function clickClassExceptIf(class_name, exception) {
        var elements = document.getElementsByClassName(class_name);
        console.log('elements', elements);
        for (var i = 0; i < elements.length; i++) {
            if (elements[i].value !== exception) {
                elements[i].click();
                return true
            }
        }
        return false
    }

    // click other elements, one after the other, until one of them works
    const actions = [
        () => clickElementById('ContentPlaceHolder1_BaseGlossaireUCForm1_ButtonValidDocument'),
        () => clickClassExceptIf('button valid', 'Chercher'),
        () => GenericClicker("title", "Enregistrer et quitter"),
        () => GenericClicker("title", "Valider"),
        () => clickElementByChildtextContent("VALIDER"),
        () => clickElementById('ContentPlaceHolder1_ButtonQuitter2')
    ];

    actions.some(action => action() !== false);
}


// TODO break into functions
function tooltipshower(shortcuts) {
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

const keyCommands = {
    'push_valider': {
        description: 'Appuie le bouton Valider ou équivalent',
        key: 'alt+v',
        action: function () {
            push_valider();
        }
    },
    'push_annuler': {
        description: 'Appuie le bouton Annuler ou équivalent',
        key: 'alt+a',
        action: function () {
            console.log('push_annuler activé');
            if (!clickElementByClass('button cancel')) {
                GenericClicker("title", "Annuler")
                GenericClicker("title", "Quitter")
                clickElementByChildtextContent("ANNULER")
            };
        }
    },
    'print_meds': {
        description: 'Imprime les médicaments',
        key: 'ctrl+p',
        action: function () {
            console.log('print_meds activé');
            clickFirstPrinter();
            waitForElementToExist('ContentPlaceHolder1_ViewPdfDocumentUCForm1_ButtonCloseStay', function (element) {
                console.log('Element détecté:', element);
                setTimeout(function () {
                    focusElementByName('ctl00$ContentPlaceHolder1$ViewPdfDocumentUCForm1$ButtonCloseStay');
                }, 400);
            });
        }
    },
    'push_enregistrer': {
        description: 'Appuie le bouton Enregistrer ou équivalent',
        key: 'ctrl+s',
        action: function () {
            console.log('push_enregistrer activé');
            clickElementById('ButtonSave');
        }
    },
    'push_delete': {
        description: 'Appuie le bouton Supprimer ou équivalent',
        key: 'alt+s',
        action: function () {
            console.log('push_delete activé');
            clickElementByClass('button delete');
        }
    },
    'shortcut_w': {
        description: 'Raccourci W',
        key: 'alt+w',
        action: function () {
            console.log('shortcut_w activé');
            clickElementByOnclick("ctl00$ContentPlaceHolder1$EvenementUcForm1$MenuNavigate")
        }
    },
    'shortcut_consult': {
        description: 'Raccourci Consultation (crée une nouvelle consultation ou ouvre celle existante)',
        key: 'alt+&',
        action: function () {
            console.log('shortcut_consult activé');
            submenuW(' Consultation');
        }
    },
    'shortcut_certif': {
        description: 'Raccourci Certificat (crée un nouveau certificat ou ouvre celui existant)',
        key: 'alt+é',
        action: function () {
            console.log('shortcut_certif activé');
            submenuW(' Certificat');
        }
    },
    'shortcut_demande': {
        description: 'Raccourci Demande (crée une nouvelle demande ou ouvre celle existante)',
        key: 'alt+\"',
        action: function () {
            console.log('shortcut_demande activé');
            submenuW(' Demande');
        }
    },
    'shortcut_prescription': {
        description: 'Raccourci Prescription (crée une nouvelle prescription ou ouvre celle existante)',
        key: 'alt+\'',
        action: function () {
            console.log('shortcut_prescription activé');
            submenuW(' Prescription');
        }
    },
    'shortcut_formulaire': {
        description: 'Raccourci Formulaire (crée un nouveau formulaire ou ouvre celui existant)',
        key: 'alt+f',
        action: function () {
            console.log('shortcut_formulaire activé');
            submenuW(' Formulaire');
        }
    },
    'shortcut_courrier': {
        description: 'Raccourci Courrier (crée un nouveau courrier ou ouvre celui existant)',
        key: 'alt+(',
        action: function () {
            console.log('shortcut_courrier activé');
            submenuW(' Courrier');
        }
    },
    'shortcut_fse': {
        description: 'Raccourci FSE',
        key: 'alt+-',
        action: function () {
            console.log('shortcut_fse activé');
            submenuW(' FSE');
        }
    },
    'shortcut_carte_vitale': {
        description: 'Raccourci Carte Vitale',
        key: 'alt+c',
        action: function () {
            console.log('shortcut_carte_vitale activé');
            clickElementByClass("cv");
            if (!GenericClicker("title", "Relance une lecture de la carte vitale")) { //TODO à tester : pour l'instant sous linux j'ai un message d'erreur
                GenericClicker("mattooltip", "Lire la Carte Vitale");
            }
        }
    },
};

// // Listeners

// Listen for messages from the background script about options
const actions = {
    'allConsultation': allConsultation,
    'tpetest': () => sendtpeinstruction(1)
    // Ajoutez d'autres actions ici
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action in actions) {
        console.log(request.action + ' demandé');
        actions[request.action]();
    }
});

// Listen for messages from the background script about keycommands
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log('request', request);
    const entries = Object.entries(keyCommands);
    for (const [key, value] of entries) {
        if (request.action === key) {
            value.action();
            break;
        }
    }
});




// // "Main"

// Tooltip shower
var tooltipTimeout;
document.addEventListener('keydown', function (event) {
    if (event.key === 'Alt') {
        var shortcuts = '';
        for (var command in keyCommands) {
            shortcuts += command + ': ' + keyCommands[command].description + ' (' + keyCommands[command].key + ')\n';
        }
        tooltipTimeout = setTimeout(function () {
            tooltipshower(shortcuts);
        }, 500);
    }
});
document.addEventListener('keyup', function (event) {
    if (event.key === 'Alt') {
        clearTimeout(tooltipTimeout);
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
});


// // Change some elements based on the URL and function parameters

// Tweak the uploader page
chrome.storage.sync.get('TweakImports', function (result) {
    function uploaderformSetup() {
        uploaderformResizeElements();
        uploaderformSetTabOrder();
        SearchBoxEntryListener();
    };
    if (result.TweakImports !== false) {
        if (window.location.href === 'https://secure.weda.fr/FolderMedical/UpLoaderForm.aspx') {
            // Create a MutationObserver instance to watch for changes in the DOM
            var observer = new MutationObserver(function (mutations) {
                uploaderformSetup();
            });

            // Start observing the document with the configured parameters
            observer.observe(document, { childList: true, subtree: true });

            uploaderformSetup();
        }
    }
});

// Tweaks the consultation page to re-order the tab order of the values
chrome.storage.sync.get('TweakTabConsultation', function (result) {
    if (result.TweakTabConsultation !== false) {
        if (window.location.href.startsWith('https://secure.weda.fr/FolderMedical/ConsultationForm.aspx')) {
            ConsultationFormTabOrderer();
            console.log('ConsultationFormTabOrderer started');
        }
    }
});

// Tweaks the prescription page to select the first medicine after a search
chrome.storage.sync.get('TweakTabPrescription', function (result) {
    if (result.TweakTabPrescription !== false) {
        if (window.location.href.startsWith('https://secure.weda.fr/FolderMedical/PrescriptionForm.aspx')) {
            console.log('SearchBoxEntryListener started');
            SearchBoxEntryListener();
        }
    }
});

// Tweaks the search patient page to select the first patient after a search
chrome.storage.sync.get('TweakTabSearchPatient', function (result) {
    console.log('TweakTabSearchPatient from storage:', result.TweakTabSearchPatient);
    if (result.TweakTabSearchPatient !== false) {
        if (window.location.href === 'https://secure.weda.fr/FolderMedical/FindPatientForm.aspx') {
            console.log('TweakTabSearchPatient started');
            ListTabOrderer('[id^="ContentPlaceHolder1_FindPatientUcForm1_PatientsGrid_LinkButtonPatientGetNomPrenom_"]');
            var elementToFocus = document.getElementById('ContentPlaceHolder1_FindPatientUcForm1_PatientsGrid_LinkButtonPatientGetNomPrenom_0');
            if (elementToFocus) {
                elementToFocus.focus();
            }
            SearchBoxEntryListener();
        }
    }
});


// Remove the title suggestions
chrome.storage.sync.get('RemoveTitleSuggestions', function (result) {
    function RemoveTitleSuggestions() {
        console.log('RemoveTitleSuggestions started');
        var elements = document.getElementById('DivGlossaireReponse');
        if (elements) {
            elements.remove();
        }
    }
    if (result.RemoveTitleSuggestions !== false) {
        if (window.location.href.startsWith('https://secure.weda.fr/FolderMedical/')
            && window.location.href.includes('Form.aspx')
            && !window.location.href.startsWith('https://secure.weda.fr/FolderMedical/PatientViewForm.aspx')) {

            // Créer un observateur de mutations pour surveiller les modifications du DOM
            var titleremoverTimeout;
            var observer = new MutationObserver(function (mutations) {
                mutations.forEach(function (mutation) {
                    if (titleremoverTimeout) {
                        clearTimeout(titleremoverTimeout);
                    }
                    titleremoverTimeout = setTimeout(RemoveTitleSuggestions, 200);
                });
            });

            // Configurer l'observateur pour surveiller tout le document
            var config = { childList: true, subtree: true };
            observer.observe(document, config);

            RemoveTitleSuggestions();
        }
    }
});




// Enable the numpad in the prescription form
if (window.location.href.startsWith('https://secure.weda.fr/FolderMedical/PrescriptionForm.aspx')) {
    console.log('numpader started');
    // set index with some keyboard touches corresponding to some ids (set randmon ids for now)
    var index = {
        '0': 'SetQuantite(0);',
        '1': 'SetQuantite(1);',
        '2': 'SetQuantite(2);',
        '3': 'SetQuantite(3);',
        '4': 'SetQuantite(4);',
        '5': 'SetQuantite(5);',
        '6': 'SetQuantite(6);',
        '7': 'SetQuantite(7);',
        '8': 'SetQuantite(8);',
        '9': 'SetQuantite(9);',
        '/': 'SetQuantite(\'/\');',
        '.': 'SetQuantite(\',\');',
        // add a key for backspace which click on AnnulerQuantite();
        'Backspace': 'AnnulerQuantite();',

    };

    // detect the press of keys in index, and click the corresponding element with clickElementByonclick

    document.addEventListener('keydown', function (event) {
        console.log('event.key', event.key);
        if (event.key in index) {
            console.log('key pressed:', event.key);
            clickElementByOnclick(index[event.key]);
        }
    });
}
