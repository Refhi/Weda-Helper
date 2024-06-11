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

// Définition de la fonction startPrinting
// TODO : à refactoriser (trop fouilli avec des morceaux ici et des morceaux dans companionlink.js)
// pour l'instant exclus de addTweak en attendant le refactoring
// Refactory :
// - d'abord il doit localiser le pdf
// - ensuite il doit décider si on envoie au companion, si on fait un .print() ou un telechargement
function startPrinting2(handlingType) { // handlingType = 'print' ou 'download' ou 'companion' ?
    console.log('startPrinting activé');
    let courbe = window.location.href.startsWith('https://secure.weda.fr/FolderMedical/ConsultationForm.aspx');
    processPrintSequence();

    function locatePDFurl() {
        return new Promise((resolve, reject) => {
            if (courbe) {
                handleImage(resolve, reject);
            } else {
                handleIframe(resolve, reject);
            }
        });

        function handleImage(resolve, reject) {
            console.log('[locatePDFurl] ConsultationForm détecté : je cherche une image avec le lien pdf');

            var pdfUrl = document.querySelector('img[data-pdf-url]');
            if (pdfUrl) {
                let url = pdfUrl.getAttribute('data-pdf-url');
                resolve(url);
            } else {
                console.log('[locatePDFurl] pdfUrl non détecté');
                reject('pdfUrl non détecté');
            }
        }

        function handleIframe(resolve, reject) {
            // d'abord on attend que l'iframe apparaisse :
            lightObserver("#ContentPlaceHolder1_ViewPdfDocumentUCForm1_iFrameViewFile", whenFrameLoaded, parentElement = document, justOne = true);
            function whenFrameLoaded() {
                let iframe = document.getElementById('ContentPlaceHolder1_ViewPdfDocumentUCForm1_iFrameViewFile');
                if (!iframe) {
                    reject(new Error('Iframe non trouvé'));
                    return;
                }

                console.log('[locatePDFurl] recherche de iframe :', iframe);

                let intervalId = setInterval(() => {
                    let url = iframe.contentWindow.location.href;
                    console.log('url', url);

                    if (url !== 'about:blank') {
                        clearInterval(intervalId);
                        resolve(url);
                    };
                }, 100);

                setTimeout(() => {
                    clearInterval(intervalId);
                    reject(new Error('Timed out waiting for URL'));
                }, 5000);
            }
        }
    }

    function handlePDFurl(url, type) {
        return new Promise((resolve, reject) => {
            console.log('[handlePDFurl] url:', url);
            if (type === 'print') {
                printPDF(url);
                resolve();
            } else if (type === 'download') {
                downloadPDF(url);
                resolve();
            } else if (type === 'companion') {
                fullPrintPDF(url).then(blob => {
                    sendToCompanion(`print`, blob);
                    watchForFocusLoss();
                    resolve();
                }).catch(reject);
            } else {
                reject(new Error('Type non reconnu : ' + type));
            }
        });
    }

    function printPDF() {
        // ouvre le panneau d'impression avec .print()
    }

    function downloadPDF() {
        // télécharger le pdf
    }

    function fullPrintPDF() {
        // envoie le pdf au companion pour impression complète
    }

    function postPrintBehavior() {
        // comportement après impression
    }

    function processPrintSequence() {
        if (!courbe) {
            // Clique sur le bouton d'impression
            clickFirstPrinter();
        }

        // Récupère l'URL du PDF
        locatePDFurl()
            .then(url => {
                // Procèsse le PDF (télécharge, imprime ou envoie au companion)
                console.log('URL du PDF trouvé :', url);
                return handlePDFurl(url, handlingType); // Remplacez 'print' par le type d'action que vous voulez effectuer
            })
            .then(() => {
                if (!courbe) {
                    // Effectue l'opération de cloture
                }
                recordMetrics({ clicks: 3, drags: 4 });
            })
            .catch(error => {
                console.error('Erreur lors de la localisation de l\'URL du PDF :', error);
            });
    }





    // Trier les actions selon le type d'url :
    // - si on est sur une page de consultation => on cherche à imprimer les courbes, donc on cherche une image avec un attribut pdf
    // - si on est sur un autre type de page => on clique une imprimante (par défaut la première, mais doit être configurable) puis on cherche le pdf

    // Trier selon le type d'action
    // - si print => on ouvre le panneau d'impression
    // - si download => on télécharge le pdf
    // - si companion => on envoie le pdf au companion
}

function startPrinting() {
    // Log pour indiquer que la fonction d'impression est activée
    console.log('print_meds activé');

    // Vérifie si l'URL actuelle commence par l'URL spécifiée
    if (window.location.href.startsWith('https://secure.weda.fr/FolderMedical/ConsultationForm.aspx')) {
        console.log('ConsultationForm détecté : je cherche une image avec le lien pdf');

        // Recherche d'une image avec un attribut data-pdf-url
        var pdfUrl = document.querySelector('img[data-pdf-url]');

        // Si une telle image est trouvée
        if (pdfUrl) {
            // Récupère l'URL du PDF
            let url = pdfUrl.getAttribute('data-pdf-url');

            // Récupère la valeur de RemoveLocalCompanionPrint du stockage local
            chrome.storage.local.get(['RemoveLocalCompanionPrint'], function (result) {
                // Si RemoveLocalCompanionPrint est false
                if (result.RemoveLocalCompanionPrint === false) {
                    console.log('pdfUrl détecté, je lance impression de la courbe', url);

                    // Récupère le PDF à partir de l'URL
                    fetch(url)
                        .then(response => response.blob())
                        .then(blob => {
                            console.log('blob', blob);

                            // Envoie le blob à Companion pour impression
                            sendToCompanion(`print`, blob);

                            // Appelle la fonction watchForFocusLoss
                            watchForFocusLoss();
                        })
                        .catch(error => {
                            // Log en cas d'erreur
                            console.error('Error:', error);
                        });
                } else {
                    // Crée un nouvel élément iframe pour l'impression
                    let printFrame = document.createElement('iframe');
                    printFrame.name = 'print_frame';
                    printFrame.width = '0';
                    printFrame.height = '0';
                    printFrame.style.display = 'none';
                    document.body.appendChild(printFrame);

                    // Définit une fonction à exécuter lorsque l'iframe est chargée
                    printFrame.onload = function () {
                        let win = window.frames['print_frame'];
                        win.focus();
                        win.print();
                    };

                    // Vérifie l'origine de l'URL
                    let urlObject = new URL(url);
                    if (urlObject.origin === 'https://secure.weda.fr') {
                        console.log('url origin ok', urlObject.origin);
                        printFrame.src = url;
                    } else {
                        // Log en cas d'URL non fiable
                        console.error('Untrusted URL:', url);
                    }
                }
            });
        } else {
            console.log('pdfUrl non détecté');
        }

    } else {
        // Appelle la fonction clickFirstPrinter
        clickFirstPrinter();

        // Définition de la fonction whenFrameLoaded
        function whenFrameLoaded(elements) {
            let iframe = elements[0];
            console.log('iframe détecté:', iframe);

            // Récupère les valeurs de RemoveLocalCompanionPrint et postPrintBehavior du stockage local
            chrome.storage.local.get(['RemoveLocalCompanionPrint', 'postPrintBehavior'], function (result) {
                if (result.RemoveLocalCompanionPrint) {
                    iframe.contentWindow.print();
                }
                else {
                    let closebutton = {
                        'doNothing': null,
                        'closePreview': 'ContentPlaceHolder1_ViewPdfDocumentUCForm1_ButtonCloseStay',
                        'returnToPatient': 'ContentPlaceHolder1_ViewPdfDocumentUCForm1_ButtonClose',
                    }

                    console.log('id to look for ', closebutton[result.postPrintBehavior], 'postPrintBehavior is ', result.postPrintBehavior)
                    let buttonToClick = document.getElementById(closebutton[result.postPrintBehavior]);
                    console.log('button to click', buttonToClick)

                    // Envoie le bouton à cliquer pour impression
                    sendPrint(buttonToClick);
                    console.log('sendPrint envoyé');
                }
            });
        }
        // Appelle la fonction lightObserver
        lightObserver("#ContentPlaceHolder1_ViewPdfDocumentUCForm1_iFrameViewFile", whenFrameLoaded, parentElement = document, justOne = true);
    }
}

function startDownload() {
    console.log("donwload activé")
    clickFirstPrinter();
    function whenFrameLoadedDownload(elements) {
        let iframe = elements[0];
        let buttonToClick = document.getElementById("ContentPlaceHolder1_ViewPdfDocumentUCForm1_ButtonCloseStay");
        let intervalId = setInterval(() => {
            let url = iframe.contentWindow.location.href;

            if (url !== 'about:blank') {
                clearInterval(intervalId);
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
                buttonToClick.click();
                recordMetrics({ clicks: 3, drags: 4 });
            }
        }, 100);

        setTimeout(() => {
            clearInterval(intervalId);
        }, 5000);

    }
    lightObserver("#ContentPlaceHolder1_ViewPdfDocumentUCForm1_iFrameViewFile", whenFrameLoadedDownload, parentElement = document, justOne = true);
}

// // Diverses aides au clic
// Clique sur la première imprimante
function clickFirstPrinter() {
    var element = document.querySelector('[onclick*="ctl00$ContentPlaceHolder1$MenuPrint"][class*="popout-dynamic level2"]');
    console.log('first printer Element is', element);
    if (element) {
        element.click();
        // records metrics fait dans companionLink
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

// Clique sur un bouton selon son Id
function clickElementById(elementId) {
    var element = document.getElementById(elementId);
    if (element) {
        element.click();
        recordMetrics({ clicks: 1, drags: 1 });
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
    'download_document': {
        description: 'Télécharge le PDF du document',
        key: 'ctrl+d',
        action: startDownload
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
    'shortcut_atcd': {
        description: 'Raccourci Affichage antécédents',
        key: 'alt+z',
        action: toggleAtcd
    },
};
