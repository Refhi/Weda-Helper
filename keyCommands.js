/**
 * Fichier contenant les commandes clés pour l'application.
 * Les commandes clés sont définies comme des objets avec une description, une combinaison de touches et une action associée.
 * @typedef {Object} KeyCommand
 * @property {Function} action - La fonction exécutée lorsque la commande clé est activée.
 */




const keyCommands = {
    'push_valider':  push_valider,
    'push_annuler': push_annuler,
    'print_meds': function () {
            printIfOption(0);
        },    
    'print_meds_bis': function () {
            printIfOption(1);
        },
    'download_document': function () {
            startPrinting('download', 0);
        },
    'download_document_bis': function () {
            startPrinting('download', 1);
        },
    'upload_latest_file': uploadLatest,
    'push_enregistrer': function () {
            console.log('push_enregistrer activé');
            clickElementById('ButtonSave');
        },
    'push_delete': function () {
            console.log('push_delete activé');
            clickElementByClass('button delete');
        },
    'shortcut_w': function () {
            console.log('shortcut_w activé');
            clickElementByOnclick("ctl00$ContentPlaceHolder1$EvenementUcForm1$MenuNavigate")
        },
    'shortcut_consult': function () {
            console.log('shortcut_consult activé');
            submenuW(' Consultation');
        },
    'shortcut_certif': function () {
            console.log('shortcut_certif activé');
            submenuW(' Certificat');
        },
    'shortcut_demande': function () {
            console.log('shortcut_demande activé');
            submenuW(' Demande');
        },
    'shortcut_prescription': function () {
            console.log('shortcut_prescription activé');
            submenuW(' Prescription');
        },
    'shortcut_formulaire': function () {
            console.log('shortcut_formulaire activé');
            submenuW(' Formulaire');
        },
    'shortcut_courrier': function () {
            console.log('shortcut_courrier activé');
            submenuW(' Courrier');
        },
    'shortcut_fse': function () {
            console.log('shortcut_fse activé');
            submenuW(' FSE');
        },
    'shortcut_carte_vitale': function () {
            console.log('shortcut_carte_vitale activé');
            clickCarteVitale();
        },
    'shortcut_search': function () {
            console.log('shortcut_search activé');
            openSearch();            
        },
    'shortcut_atcd': toggleAtcd
};


// // Gestion des raccourcis claviers via hotkeys.js
// Pour ajouter les raccourcis sur un élément spécifique
function addHotkeyToDocument(scope, element, shortcut, action) {
    if (shortcut != undefined)
        // console.log('Ajout du raccourci', shortcut, 'avec la fonction', action, 'dans le scope', scope, 'et l\'élément', element);
        hotkeys(shortcut, {
            scope: scope,
            element: element
        }, function (event, handler) {
            event.preventDefault();

            action();
        });
}

function shortcutDefaut(shortcuts, defaultShortcuts, key) {
    if (shortcuts == undefined) {
        return defaultShortcuts[key]["default"];
    }
    else if (shortcuts[key] == undefined) {
        return defaultShortcuts[key]["default"];
    }
    else {
        return shortcuts[key];
    }
}

function addShortcuts(keyCommands, scope, scopeName) {
    chrome.storage.local.get(["defaultShortcuts", "shortcuts"], function(result) {
        hotkeys.filter = function(event){
            return true; // Permet d'utiliser les raccourcis depuis un input ou un textarea
        }
        // console.log('[addShortcuts] ajout des raccourcis sur element', scope, 'avec scopeName', scopeName, 'et result', result);
        for (let key in keyCommands) {
            action = keyCommands[key];
            shortcut = shortcutDefaut(result.shortcuts, result.defaultShortcuts, key);
            addHotkeyToDocument(scopeName, scope, shortcut, action);
        }
    });
}



function addShortcutsToIframe() {
    var iframes = document.querySelectorAll('iframe');
    if (iframes.length !== 0) {
        iframes.forEach(function(iframe, index) {
            let scopeName = 'iframe' + (index + 1);
            hotkeys.setScope(scopeName);    
            // console.log('iframe' + (index + 1), iframe);
            addShortcuts(keyCommands, iframe.contentDocument, scopeName);
            addTweak('https://secure.weda.fr/FolderMedical/ConsultationForm.aspx', 'TweakTabConsultation', function() {                
                addTabsToIframe(scopeName, iframe, index, iframes); // est géré dans Constation.js dans la section TweakTabConsultation
            });
        });
    }
}

function addAllShortcuts() {
    console.log('[addAllShortcuts] activé');
    hotkeys.unbind(); // nécessaire pour éviter les doublons de raccourcis clavier entrainant des doublons de documents...
    addShortcuts(keyCommands, document, 'all');
    addShortcutsToIframe();
}

// Ajout des raccourcis claviers sur le document racine
setTimeout(function() {
    addAllShortcuts();
}, 20);
afterMutations(300, addAllShortcuts, "ajout raccourcis aux iframes"); // ajoute les raccourcis à toutes les iframes après chaque mutation du document
// ne pas mettre moins de 300ms sinon les raccourcis s'ajoutent quand même de façon cumulative
afterMutations(1000, addAllShortcuts, "ajout raccourcis aux iframes"); // 2e ajout car parfois fonctionne mal



function toggleAtcd() {
    console.log('toggleAtcd activé');
    var element = document.getElementById('ContentPlaceHolder1_EvenementUcForm1_ImageButtonShowAntecedent');
    if (element) {
        element.click();
        recordMetrics({ clicks: 1, drags: 1 });
    }
}


// Permet d'appuyer sur le bouton "Valider" ou équivalent
function push_valider() {
    console.log('push_valider activé');
    function clickClassExceptIf(class_name, class_exception, id_exception) {
        var elements = document.getElementsByClassName(class_name);
        console.log('elements', elements);
        for (var i = 0; i < elements.length; i++) {
            if (elements[i].value !== class_exception && elements[i].id !== id_exception) {
                elements[i].click();
                recordMetrics({ clicks: 1, drags: 1 });
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
            recordMetrics({ clicks: 1, drags: 1 });
            tpesender();
            return true;
        } else {
            return false;
        }
    }
    // click other elements, one after the other, until one of them works
    const actions = [
        () => clickElementById('ButtonValidFileStream'),
        () => clickElementById('targetValider'), // utilisé quand j'ajoute une cible à un bouton
        () => clickElementById('ContentPlaceHolder1_BaseGlossaireUCForm1_ButtonValidDocument'),
        () => clickElementById('ContentPlaceHolder1_ButtonLibreValid'),
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

// Fonction permettant d'imprimer selon les options choisies
function printIfOption(modelNumber = 0) {    
    getOption('RemoveLocalCompanionPrint', function (RemoveLocalCompanionPrint) {
        if (!RemoveLocalCompanionPrint) {
            startPrinting('companion', modelNumber);
        } else {
            startPrinting('print', modelNumber);
        }
    });
}

// Définition de la fonction startPrinting
function startPrinting(handlingType, modelNumber) {
    // handlingType = 'print' ou 'download' ou 'companion'
    // modelNumber = integer, correspondant à la place dans la liste des modèles. Commence à 0.
    console.log('startPrinting activé');
    let courbe = window.location.href.startsWith('https://secure.weda.fr/FolderMedical/ConsultationForm.aspx');
    processPrintSequence(handlingType, modelNumber, courbe);

    function urlFromImage() {
        var pdfUrl = document.querySelector('img[data-pdf-url]');
        if (pdfUrl) {
            console.log('[urlFromImage] pdf Url détecté :', pdfUrl);
            let url = pdfUrl.getAttribute('data-pdf-url');
            return url;
        } else {
            console.log('[urlFromImage] pdfUrl non détecté');
            return null;
        }
    }

    function makeIframe() {
        // Crée un nouvel élément iframe pour l'impression
        let printFrame = document.createElement('iframe');
        printFrame.name = 'print_frame';
        printFrame.width = '0';
        printFrame.height = '0';
        printFrame.style.display = 'none';
        document.body.appendChild(printFrame);
        return printFrame;
    }

    async function downloadBlob(url) {
        console.log('fetchPDF', url);
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            return blob;
        } catch (error) {
            console.error('Error:', error);
        }
    }


    function loadAndPrintIframe(printIframe, url) {
        // Définit une fonction à exécuter lorsque l'iframe est chargée
        printIframe.onload = function () {
            let win = window.frames['print_frame'];
            win.focus();
            win.print();
        };

        // Vérifie l'origine de l'URL
        let urlObject = new URL(url);
        if (urlObject.origin === 'https://secure.weda.fr') {
            console.log('url origin ok', urlObject.origin);
            printIframe.src = url;
        } else {
            // Log en cas d'URL non fiable
            console.error('Untrusted URL:', url);
        }
    }

    function download(url) {
        // On va contourner les restrictions de téléchargement en créant un élément 'a' caché
        // Ce dernier, quand cliqué, va déclencher le téléchargement du fichier via son attribut 'download'
        // Cela permet de télécharger le fichier sans modifier le manifest
        var link = document.createElement('a');
        link.href = url;
        link.download = 'nom_du_fichier.pdf'; // pas certain que ça soit nécessaire mais ça ne coûte rien
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click(); // Cela déclenche le téléchargement
        document.body.removeChild(link); // Suppression de l'élément 'a' après le téléchargement
    }

    function clickPrinterNumber(modelNumber = 0) {
        var elements = document.querySelectorAll('[onclick*="ctl00$ContentPlaceHolder1$MenuPrint"][class*="popout-dynamic level2"]');
        console.log('Voici les modeles d impression trouvés', elements);
        if (elements[modelNumber]) {
            console.log('clicking on model number', modelNumber, elements[modelNumber]);
            elements[modelNumber].click();
            return true;
        } else {
            return false;
        }
    }

    async function grabIframeWhenLoaded() {
        return new Promise((resolve, reject) => {
            lightObserver("#ContentPlaceHolder1_ViewPdfDocumentUCForm1_iFrameViewFile", (newElements) => {
                // Assuming the first new element is the iframe we're interested in
                let iframe = newElements[0];
                resolve(iframe);
            }, document, true);
        });
    }

    function grabUrlFromIframe(iframe) {
        return new Promise((resolve, reject) => {
            let intervalId = setInterval(() => {
                let url = iframe.contentWindow.location.href;
                console.log('url', url);

                if (url !== 'about:blank') {
                    clearInterval(intervalId);
                    resolve(url);
                }
            }, 100);

            setTimeout(() => {
                clearInterval(intervalId);
                reject(new Error('Timeout while waiting for iframe URL'));
            }, 5000);
        });
    }


    function postPrintAction() {
        let closebutton = {
            'doNothing': null,
            'closePreview': 'ContentPlaceHolder1_ViewPdfDocumentUCForm1_ButtonCloseStay',
            'returnToPatient': 'ContentPlaceHolder1_ViewPdfDocumentUCForm1_ButtonClose',
        }

        getOption('postPrintBehavior', function (postPrintBehavior) {
            console.log('postPrintBehavior is ', postPrintBehavior, 'id to look for ', closebutton[postPrintBehavior])
            let buttonToClick = document.getElementById(closebutton[postPrintBehavior]);
            if (buttonToClick) {
                console.log('clicking on', buttonToClick)
                buttonToClick.click();
                recordMetrics({ clicks: 1, drags: 1 });
            }
        });
    }




    function processPrintSequence(handlingType, modelNumber, courbe) {
        // vérification du type de demande
        const handlingTypes = ['print', 'download', 'companion'];
        if (!handlingTypes.includes(handlingType)) {
            console.error('[processPrintSequence] Type non reconnu :', handlingType);
            return;
        }

        recordMetrics({ clicks: 3, drags: 4 });

        // deux grands cas de figure : impression d'une courbe ou d'un document
        if (courbe) {
            let url = urlFromImage();
            if (!url) {
                console.log('[processPrintSequence] URL non trouvée');
                return;
            }
            if (handlingType === 'print') {
                let iframe = makeIframe();
                loadAndPrintIframe(iframe, url);
            } else if (handlingType === 'companion') {
                downloadBlob(url)
                    .then(blob => { sendToCompanion('print', blob); });
            } else if (handlingType === 'download') {
                download(url);
            }
        } else { // cas d'un document
            // il faut d'abord cliquer sur le modèle d'impression pertinent
            clickPrinterNumber(modelNumber);
            // ensuite attendre que l'iframe soit chargé
            grabIframeWhenLoaded()
                .then(iframe => {
                    // On se contente de lancer l'impression si on a demandé l'impression
                    if (handlingType === 'print') {
                        iframe.contentWindow.print();
                        return;
                    } else {
                        // sinon on récupère l'URL du document (ce qui prend parfois quelques centaines de ms)
                        return grabUrlFromIframe(iframe);
                    }
                })
                .then(url => {
                    if (handlingType === 'companion') {
                        downloadBlob(url)
                            .then(blob => {
                                sendToCompanion('print', blob,
                                    postPrintAction);
                                });
                    } else if (handlingType === 'download') {
                        download(url);
                        postPrintAction();
                    }
                });
        }
    }
}
        
//Fonction appellée par un bouton ou un raccourci clavier pour uploader le dernier fichier d'un dossier dans le dossier patient actuel
function uploadLatest() {
    chrome.storage.local.set({ 'automaticUpload': true }, function () { //On met un flag qui informe que l'upload sera automatique
        let uploadURL = "https://secure.weda.fr/FolderMedical/PopUpUploader.aspx"+window.location.search 
        console.log(uploadURL);
        var uploadWindow = window.open(uploadURL, "Upload", "width=700,height=600"); //On ouvre la fenetre d'upload dans un popup
    });
}




// Clique sur un bouton selon sa classe
function clickElementByClass(className) {
    var elements = document.getElementsByClassName(className);
    if (elements.length > 0) {
        var lastElement = elements[elements.length - 1]; // Get the last element
        lastElement.click(); // Click the last element with the class
        recordMetrics({ clicks: 1, drags: 1 });
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
        recordMetrics({ clicks: 1, drags: 1 });
        return true;
    } else {
        // console.log('Element not found', valueName, value);
        return false;
    }
}

// Clique sur un bouton et inhibe les clics trop rapides
var lastClickTime = 0;
function clickWithRefractoryPeriod(element) {
    var currentTime = new Date().getTime();
    var timeSinceLastClick = currentTime - lastClickTime;

    if (timeSinceLastClick >= 200) {
        element.click();
        recordMetrics({ clicks: 1, drags: 1 });
        console.log('Element clicked:', element);
        lastClickTime = currentTime;
    } else {
        console.log('Clicking too fast, waiting', 200 - timeSinceLastClick, 'ms');
        setTimeout(function() {
            lastClickTime = new Date().getTime();
        }, 200 - timeSinceLastClick);
    }
}


// Clique sur un bouton selon son Id
function clickElementById(elementId) {
    var element = document.getElementById(elementId);
    if (element) {
        clickWithRefractoryPeriod(element); // Utilise une période réfractaire pour éviter les clics trop rapides
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
        recordMetrics({ clicks: 1, drags: 1 });
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
            recordMetrics({ clicks: 1, drags: 3 });
            console.log('Element clicked:', level3Element);
            return true;
        } else {
            var level2Element = Array.from(level1Element.getElementsByClassName('level2 dynamic')).find(function (element) {
                return element.innerText.includes(description) && element.hasAttribute('tabindex');
            });
            console.log('level2Element', level2Element);
            if (level2Element) {
                level2Element.click();
                recordMetrics({ clicks: 1, drags: 2 });
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
            recordMetrics({ clicks: 1, drags: 1 });
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
        recordMetrics({ clicks: 1, drags: 1 });
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
    recordMetrics({ clicks: 1, drags: 3 });
}