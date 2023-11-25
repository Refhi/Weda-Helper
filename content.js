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

function uploaderformSetup() {
    uploaderformResizeElements();
    uploaderformSetTabOrder();
}

// Check the current URL and add the event listener if it matches
if (window.location.href === 'https://secure.weda.fr/FolderMedical/UpLoaderForm.aspx') {
    // Create a MutationObserver instance to watch for changes in the DOM
    var observer = new MutationObserver(function (mutations) {
        uploaderformSetup();
    });

    // Start observing the document with the configured parameters
    observer.observe(document, { childList: true, subtree: true });

    uploaderformSetup();
}

// Shortcuts
function clickElementById(elementId) {
    var element = document.getElementById(elementId);
    if (element) {
        element.click();
        console.log('Element clicked:', elementId);
        return true;
    } else {
        console.log('Element not found:', elementId);
        return false;
    }
}

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
function clickElementByClass(className) {
    var elements = document.getElementsByClassName(className);
    if (elements.length > 0) {
        var lastElement = elements[elements.length - 1]; // Get the last element
        lastElement.click(); // Click the last element with the class
        console.log('Element clicked class', className);
        console.dir(lastElement); // Log all properties of the clicked element
        return true;
    }
    else {
        console.log('no Element clicked class', className);
        return false;
    }
}

function GenericClicker(valueName, value) {
    var elements = document.querySelectorAll(`[${valueName}="${value}"]`);
    if (elements.length > 0) {
        var element = elements[0]
        console.log('Clicking element', valueName, value);
        element.click();
        return true;
    } else {
        console.log('Element not found', valueName, value);
        return false;
    }
}


function submenuW(description) {
    if (!clickElementByDescription('level2 dynamic', description)) {
        if (!clickElementByDescription('level3 dynamic', description)) {
            clickElementByDescription('level3 dynamic', description + " n°1")
        };
    }
}

// Click an element by its description
function clickElementByDescription(lvl_dynamic, description) {
    var elements = document.getElementsByClassName(lvl_dynamic);
    if (elements.length > 0) {
        var element = Array.from(elements).find(function (element) {
            return element.innerText === description;
        });
        if (element) {
            element.click();
            console.log('Element clicked:', description);
            return true;
        } else {
            console.log('Element not found:', description);
            return false;
        }
    } else {
        console.log('No elements found', description);
        return false;
    }
}
function clickElementByChildtextContent(childtextContent) {
    var elements = document.querySelectorAll('span.mat-button-wrapper');
    console.log('elements', elements);
    for (var i = 0; i < elements.length; i++) {
        if (elements[i].textContent === childtextContent) {
            elements[i].parentNode.click();
            break;
        }
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
        var checkInterval = setInterval(function() {
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

const keyCommands = {
    'push_valider': {
        description: 'Appuie le bouton Valider ou équivalent',
        key: 'alt+v',
        action: function() {
            console.log('push_valider activé');
            if (!clickElementById('ContentPlaceHolder1_BaseGlossaireUCForm1_ButtonValidDocument')) {
                if(!clickElementByClass('button valid')) {
                    GenericClicker("title","Enregistrer et quitter")
                    GenericClicker("title","Valider")
                    clickElementByChildtextContent("VALIDER")
                };
            }
        }
    },
    'push_annuler': {
        description: 'Appuie le bouton Annuler ou équivalent',
        key: 'alt+a',
        action: function() {
            console.log('push_annuler activé');
            if (!clickElementByClass('button cancel')) {
                GenericClicker("title","Annuler")
                GenericClicker("title","Quitter")
                clickElementByChildtextContent("ANNULER")
            };
        }
    },
    'print_meds': {
        description: 'Imprime les médicaments',
        key: 'ctrl+p',
        action: function() {
            console.log('print_meds activé');
            clickElementByOnclick("Dhf163775");
            clickElementByOnclick("Dhf146050");
            waitForElementToExist('ContentPlaceHolder1_ViewPdfDocumentUCForm1_ButtonCloseStay', function(element) {
                console.log('Element détecté:', element);
                setTimeout(function() {
                    focusElementByName('ctl00$ContentPlaceHolder1$ViewPdfDocumentUCForm1$ButtonCloseStay');
                }, 400);
            });
        }
    },
    'push_enregistrer': {
        description: 'Appuie le bouton Enregistrer ou équivalent',
        key: 'ctrl+s',
        action: function() {
            console.log('push_enregistrer activé');
            clickElementById('ButtonSave');
        }
    },
    'push_delete': {
        description: 'Appuie le bouton Supprimer ou équivalent',
        key: 'alt+s',
        action: function() {
            console.log('push_delete activé');
            clickElementByClass('button delete');
        }
    },
    'shortcut_w': {
        description: 'Raccourci W',
        key: 'alt+w',
        action: function() {
            console.log('shortcut_w activé');
            clickElementByOnclick("ctl00$ContentPlaceHolder1$EvenementUcForm1$MenuNavigate")
        }
    },
    'shortcut_consult': {
        description: 'Raccourci Consultation (crée une nouvelle consultation ou ouvre celle existante)',
        key: 'alt+&',
        action: function() {
            console.log('shortcut_consult activé');
            submenuW(' Consultation');
        }
    },
    'shortcut_certif': {
        description: 'Raccourci Certificat (crée un nouveau certificat ou ouvre celui existant)',
        key: 'alt+é',
        action: function() {
            console.log('shortcut_certif activé');
            submenuW(' Certificat');
        }
    },
    'shortcut_demande': {
        description: 'Raccourci Demande (crée une nouvelle demande ou ouvre celle existante)',
        key: 'alt+\"',
        action: function() {
            console.log('shortcut_demande activé');
            submenuW(' Demande');
        }
    },
    'shortcut_prescription': {
        description: 'Raccourci Prescription (crée une nouvelle prescription ou ouvre celle existante)',
        key: 'alt+\'',
        action: function() {
            console.log('shortcut_prescription activé');
            submenuW(' Prescription');
        }
    },
    'shortcut_formulaire': {
        description: 'Raccourci Formulaire (crée un nouveau formulaire ou ouvre celui existant)',
        key: 'alt+f',
        action: function() {
            console.log('shortcut_formulaire activé');
            submenuW(' Formulaire');
        }
    },
    'shortcut_courrier': {
        description: 'Raccourci Courrier (crée un nouveau courrier ou ouvre celui existant)',
        key: 'alt+(',
        action: function() {
            console.log('shortcut_courrier activé');
            submenuW(' Courrier');
        }
    },
    'shortcut_fse': {
        description: 'Raccourci FSE',
        key: 'alt+-',
        action: function() {
            console.log('shortcut_fse activé');
            submenuW(' FSE');
        }
    },
    'shortcut_carte_vitale': {
        description: 'Raccourci Carte Vitale',
        key: 'alt+c',
        action: function() {
            console.log('shortcut_carte_vitale activé');
            clickElementByClass("cv");
            if (!GenericClicker("title","Relance une lecture de la carte vitale")) { //TODO à tester : pour l'instant sous linux j'ai un message d'erreur
                GenericClicker("mattooltip","Lire la Carte Vitale");
            }
        }
    },
};


// Listen for messages from the background script
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


//TODO :
// add a shortcut to search box for patient
// modifier le tabindex dans les imports