/**
 * Fichier contenant les commandes clés pour l'application.
 * Les commandes clés sont définies comme des objets avec une description, une combinaison de touches et une action associée.
 * @typedef {Object} KeyCommand
 * @property {string} description - La description de la commande clé.
 * @property {string} key - La combinaison de touches associée à la commande clé.
 * @property {Function} action - La fonction exécutée lorsque la commande clé est activée.
 */

// Ecoute les messages envoyés par le background script
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

// fonction scanner
// function lancerScan() {
//     console.log('shortcut_scanner activé');
//     // let scanner = document.querySelector('#ContentPlaceHolder1_MenuPeripherique\\:submenu\\:28 .dynamic .level2');
//     let scanner = document.querySelector('#ContentPlaceHolder1_MenuPeripherique .level1 .level2 .dynamic .level2');
//     if (scanner) {
//         scanner.click();
//     }
// }

// Permet d'appuyer sur le bouton "Valider" ou équivalent
function push_valider() {
    console.log('push_valider activé');
    function clickClassExceptIf(class_name, class_exception, id_exception) {
        var elements = document.getElementsByClassName(class_name);
        console.log('elements', elements);
        for (var i = 0; i < elements.length; i++) {
            if (elements[i].value !== class_exception && elements[i].id !== id_exception) {
                elements[i].click();
                return true
            }
        }
        return false
    }

    function clicSecure() {
        function tpesender() {
            console.log('tpe_sender activé');
            var montantElement = document.querySelector('input[placeholder="Montant"]');
            // extraire le montant de l'élément
            var amount = montantElement.value;
            // retirer la virgule de amount
            amount = amount.replace(/\./g, '');            
            console.log('amount', amount);
            sendtpeinstruction(amount);
        }

        var targetElement = document.querySelector('.mat-focus-indicator.bold.mat-raised-button.mat-button-base.mat-accent');
        console.log('Clicking on target element', targetElement);
        if (targetElement) {
            targetElement.click();
            tpesender();
            return true;
        } else {
            return false;
        }
    }
    // click other elements, one after the other, until one of them works
    const actions = [
        () => clickElementById('targetValider'), // utilisé quand j'ajoute une cible à un bouton
        () => clickElementById('ContentPlaceHolder1_BaseGlossaireUCForm1_ButtonValidDocument'),
        () => clickElementById('ContentPlaceHolder1_FindPatientUcForm1_ButtonValidFamille'),
        () => clickClassExceptIf('button valid', 'Chercher', 'ContentPlaceHolder1_btnScanDatamatrix'),
        () => GenericClicker("title", "Enregistrer et quitter"),
        () => GenericClicker("title", "Valider"),
        () => clickElementByChildtextContent("VALIDER"),
        () => clickElementById('ContentPlaceHolder1_ButtonQuitter2'),
        () => clicSecure()
    ];

    actions.some(action => action() !== false);
}

function push_annuler() {
    console.log('push_annuler activé');
    const actions = [
        () => clickElementById('targetAnnuler'), // utilisé quand j'ajoute une cible à un bouton
        () => clickElementById('ContentPlaceHolder1_FindPatientUcForm1_ButtonCancelFamille'),
        () => clickElementByClass('button cancel'),
        () => GenericClicker("title", "Annuler"),
        () => GenericClicker("title", "Quitter"),
        () => clickElementByChildtextContent("ANNULER")
    ];

    actions.some(action => action() !== false);
}

function startPrinting() {
    console.log('print_meds activé');
    clickFirstPrinter();
    function whenFrameLoaded(elements) {
        let iframe = elements[0];
        console.log('iframe détecté:', iframe);
        chrome.storage.local.get(['RemoveLocalCompanionPrint', 'postPrintBehavior'], function (result) {
            if (result.RemoveLocalCompanionPrint) {
                iframe.contentWindow.print();
            }
            else {
                let closebutton = {
                    'doNothing' : null,
                    'closePreview' : 'ContentPlaceHolder1_ViewPdfDocumentUCForm1_ButtonCloseStay',
                    'returnToPatient' : 'ContentPlaceHolder1_ViewPdfDocumentUCForm1_ButtonClose',
                }

                console.log('id to look for ', closebutton[result.postPrintBehavior], 'postPrintBehavior is ', result.postPrintBehavior)
                let buttonToClick = document.getElementById(closebutton[result.postPrintBehavior]);
                console.log('button to click', buttonToClick)

                sendPrint(buttonToClick);
                console.log('sendPrint envoyé');
            }
        });
    }
    lightObserver("#ContentPlaceHolder1_ViewPdfDocumentUCForm1_iFrameViewFile", whenFrameLoaded, parentElement = document, justOne = true);
}

// // Diverses aides au clic
// Clique sur la première imprimante
function clickFirstPrinter() {
    var element = document.querySelector('[onclick*="ctl00$ContentPlaceHolder1$MenuPrint"][class*="popout-dynamic level2"]');
    console.log('first printer Element is', element);
    if (element) {
        element.click();
        return true;
    } else {
        return false;
    }
}

// Clique sur un bouton selon sa classe
function clickElementByClass(className) {
    var elements = document.getElementsByClassName(className);
    if (elements.length > 0) {
        var lastElement = elements[elements.length - 1]; // Get the last element
        lastElement.click(); // Click the last element with the class
        console.log('[clickElementByClass] : Element clicked class', className);
        console.dir(lastElement); // Log all properties of the clicked element
        return true;
    }
    else {
        console.log('[clickElementByClass] : no Element clicked class', className);
        return false;
    }
}

// Clique sur un bouton selon un de ses attributs et sa valeur
function GenericClicker(valueName, value) {
    var elements = document.querySelectorAll(`[${valueName}="${value}"]`);
    if (elements.length > 0) {
        var element = elements[0]
        // console.log('Clicking element', valueName, value);
        element.click();
        return true;
    } else {
        // console.log('Element not found', valueName, value);
        return false;
    }
}

// Clique sur un bouton selon son Id
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

// Clique sur le bouton carte vitale
function clickCarteVitale() {
    clickElementByClass("cv");
    if (!GenericClicker("title", "Relance une lecture de la carte vitale")) {
        GenericClicker("mattooltip", "Lire la Carte Vitale");
    }
}


// Clique sur un élément du menu W selon sa description
function submenuW(description) {
    var level1Element = document.getElementsByClassName('level1 static')[0];
    console.log('level1Element', level1Element);
    if (level1Element) {
        var level3Element = Array.from(level1Element.getElementsByClassName('level3 dynamic')).find(function (element) {
            return element.innerText.includes(description) && element.hasAttribute('tabindex') && element.innerText !== " Courrier à établir"; // la fin est un fix sale pour éviter de cliquer sur l'alerte de courrier à établir
        });
        console.log('level3Element', level3Element);
        if (level3Element) {
            level3Element.click();
            console.log('Element clicked:', level3Element);
            return true;
        } else {
            var level2Element = Array.from(level1Element.getElementsByClassName('level2 dynamic')).find(function (element) {
                return element.innerText.includes(description) && element.hasAttribute('tabindex');
            });
            console.log('level2Element', level2Element);
            if (level2Element) {
                level2Element.click();
                console.log('Element clicked:', level2Element);
                return true;
            }
        }
    }
    console.log('No elements found', description);
    return false;
}

// Clique sur un élément selon le text de son enfant
function clickElementByChildtextContent(childtextContent) {
    var elements = document.querySelectorAll('span.mat-button-wrapper');
    console.log('click element by child context clicking first one in list', elements);
    for (var i = 0; i < elements.length; i++) {
        if (elements[i].textContent === childtextContent) {
            elements[i].parentNode.click();
            return true
        }
    }
    console.log('No elements found', childtextContent);
    return false
}

// focus on the first element with asked Name
function focusElementByName(elementName) {
    console.log('Focusing element:', elementName);
    var element = document.getElementsByName(elementName)[0];
    if (element) {
        element.focus();
        console.log('Focusing element success:', elementName);
    }
}



function openSearch() {
    // crée un timestamp et le stocke dans la variable searchTime
    var searchTime = Date.now();
    // stocke la variable searchTime dans le stockage local de Chrome
    chrome.storage.local.set({ searchTime: searchTime }, function () {
        console.log('searchTime sauvegardé avec succès', searchTime);
    });

    // permet d'ouvrir la recherche de patient sans avoir à demander les droits 'tabs' à l'extension
    console.log('openSearch activé');
    var link = document.createElement('a');
    link.href = 'https://secure.weda.fr/FolderMedical/FindPatientForm.aspx';
    link.click();
}

const keyCommands = {
    'push_valider': {
        description: 'Appuie le bouton Valider ou équivalent',
        key: 'alt+v',
        action: push_valider
    },
    'push_annuler': {
        description: 'Appuie le bouton Annuler ou équivalent',
        key: 'alt+a',
        action: push_annuler
    },
    'print_meds': {
        description: 'Imprime les médicaments',
        key: 'ctrl+p',
        action: startPrinting
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
            clickCarteVitale();
        }
    },
    'shortcut_search': {
        description: 'Raccourci Recherche',
        key: 'alt+r',
        action: function () {
            console.log('shortcut_search activé');
            openSearch();            
        }
    },
    // 'shortcut_scanner': {
    //     description: 'Raccourci Scanner',
    //     key: 'alt+z',
    //     action: lancerScan
    // },
};