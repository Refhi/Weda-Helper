/**
 * Fichier contenant les commandes clés pour l'application.
 * Les commandes clés sont définies comme des objets avec une description, une combinaison de touches et une action associée.
 * @typedef {Object} KeyCommand
 * @property {Function} action - La fonction exécutée lorsque la commande clé est activée.
 */



const keyCommands = {
    'push_valider': push_valider,
    'push_annuler': push_annuler,
    'print_meds': function () {
        handlePrint('print', 0);
    },
    'print_meds_bis': function () {
        handlePrint('print', 1);
    },
    'download_document': function () {
        handlePrint('download', 0);
    },
    'download_document_bis': function () {
        handlePrint('download', 1);
    },
    'send_document': function () {
        send_document(0);
    },
    'send_document_bis': function () {
        send_document(1);
    },
    'upload_latest_file': uploadLatest,
    'twain_scan': startscanning,
    'insert_date': insertDate,
    'push_enregistrer': function () {
        console.log('push_enregistrer activé');
        clickElementById('ButtonSave');
    },
    'push_delete': function () {
        console.log('push_delete activé');
        const binElementCurrentImport = document.getElementById(`ContentPlaceHolder1_FileStreamClassementsGrid_DeleteButtonGridFileStreamClassement_${actualImportActionLine()}`);
        if (binElementCurrentImport) {
            binElementCurrentImport.click();
        } else {
            clickElementByClass('button delete');
            clickElementByClass('targetSupprimer');
        }
    },
    'shortcut_w': function () {
        console.log('shortcut_w activé');
        if (!clickElementByOnclick("ctl00$ContentPlaceHolder1$EvenementUcForm1$MenuNavigate")) {
            clickElementByOnclick('ctl00$ContentPlaceHolder1$MenuNavigate');
        }
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

// Fonction throttle avec persistance via chrome.storage.local
// Enregistrer le temps de début du chargement de la page
const pageLoadStartTime = Date.now();
let lastRan;
function throttleWithPersistence(func, limit) {
    let lastFunc;
    // // Charger la valeur de lastRan depuis chrome.storage.local
    // chrome.storage.local.get(['lastRan'], function(result) {
    //     lastRan = result.lastRan || 0;  // Si lastRan n'existe pas, initialisez-le à 0
    // });

    return function (...args) {
        const context = this;

        // Vérifier si la page a débuté son chargement depuis au moins 500ms
        if (Date.now() - pageLoadStartTime < 300) {
            console.log('[throttleWithPersistence] La page a commencé à charger il y a moins de 500ms, ne pas exécuter la fonction');
            lastRan = Date.now();
            return;
        }
        // Vérifier si suffisamment de temps s'est écoulé depuis la dernière exécution
        if (!lastRan || Date.now() - lastRan >= limit) {
            // Exécuter la fonction et mettre à jour lastRan
            console.log('[throttleWithPersistence] Exécution de la fonction car lastRan est', lastRan, 'et Date.now() est', Date.now());
            func.apply(context, args);
            lastRan = Date.now();

            // Sauvegarder la nouvelle valeur de lastRan dans chrome.storage.local
            chrome.storage.local.set({ lastRan: lastRan });
        } else {
            // Si la fonction est appelée trop vite, utiliser un timeout
            console.log('[throttleWithPersistence] La fonction a été appelée trop vite, inhibiteur de délai');
            clearTimeout(lastFunc);
            lastFunc = setTimeout(function () {
                if ((Date.now() - lastRan) >= limit) {
                    lastRan = Date.now();

                    // Sauvegarder la nouvelle valeur de lastRan
                    chrome.storage.local.set({ lastRan: lastRan });
                }
            }, limit - (Date.now() - lastRan));
        }
    }
}

// // Gestion des raccourcis claviers via hotkeys.js
// Pour ajouter les raccourcis sur un élément spécifique
function addHotkeyToDocument(scope, element, shortcut, action) {
    if (shortcut != undefined)
        hotkeys(shortcut, {
            scope: scope,
            element: element
        }, throttleWithPersistence(function (event, handler) {
            event.preventDefault();  // Empêche le comportement par défaut
            action();  // Exécute l'action associée au raccourci
        }, 300));
}

// Renvoie le raccourcis pertinent (personnalisé ou par défaut) pour une action donnée
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
    chrome.storage.local.get(["defaultShortcuts", "shortcuts"], function (result) {
        hotkeys.filter = function (event) {
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


function removeHistoryIframe(iframes) {
    iframes = Array.from(iframes).filter(iframe => !iframe.src.startsWith(`${baseUrl}/FolderMedical/FrameHistoriqueForm.aspx`));
    return iframes;
}

function isHistoriqueIframe(iframe) {
    let isHistoriqueIframe_bol = iframe.src.startsWith(`${baseUrl}/FolderMedical/FrameHistoriqueForm.aspx`);
    return isHistoriqueIframe_bol;
}

function addShortcutsToIframe() {
    var iframes = document.querySelectorAll('iframe');
    if (iframes.length !== 0) {
        iframes.forEach(function (iframe, index) {
            let scopeName = 'iframe' + (index + 1);
            hotkeys.setScope(scopeName);
            // console.log('iframe' + (index + 1), iframe);
            addShortcuts(keyCommands, iframe.contentDocument, scopeName);
            if (!isHistoriqueIframe(iframe)) { // Pas besoin des tabulations sur l'historique
                iframes = removeHistoryIframe(iframes);
                addTweak('/FolderMedical/ConsultationForm.aspx', 'TweakTabConsultation', function () {
                    addTabsToIframe(scopeName, iframe, iframes); // est géré dans Constation.js dans la section TweakTabConsultation
                });
            }
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
setTimeout(function () {
    addAllShortcuts();
}, 20);
afterMutations({ delay: 300, callback: addAllShortcuts, callBackId: 'ajout raccourcis aux iframes' }); // ajoute les raccourcis à toutes les iframes après chaque mutation du document
// ne pas mettre moins de 300ms sinon les raccourcis s'ajoutent quand même de façon cumulative
afterMutations({ delay: 1000, callback: addAllShortcuts, callBackId: 'ajout raccourcis aux iframes' });; // 2e ajout car parfois fonctionne mal



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

    // click other elements, one after the other, until one of them works
    const actions = [
        () => clickElementById('ButtonValidFileStream'),
        () => clickElementByClass('targetValider'), // utilisé quand j'ajoute une cible à un bouton
        () => clickElementById('ContentPlaceHolder1_BaseGlossaireUCForm1_ButtonValidDocument'),
        () => clickElementById('ContentPlaceHolder1_ButtonLibreValid'),
        () => clickElementById('ContentPlaceHolder1_FindPatientUcForm1_ButtonValidFamille'),
        () => clickClassExceptIf('button valid', 'Chercher', 'ContentPlaceHolder1_btnScanDatamatrix'),
        () => GenericClicker("title", "Enregistrer et quitter"),
        () => GenericClicker("title", "Valider"),
        // () => clickElementByChildtextContent("VALIDER"), => on passe à la gestion par targetValider
        () => clickElementById('ContentPlaceHolder1_ButtonQuitter2'),
        // () => clicSecure(), => on passe à la gestion par targetValider
        () => clickElementById('ButtonFermerRappel')
    ];

    actions.some(action => action() !== false);
}

function push_annuler() {
    console.log('push_annuler activé');
    const actions = [
        () => clickElementByClass('targetAnnuler'), // utilisé quand j'ajoute une cible à un bouton
        () => clickElementById('ContentPlaceHolder1_FindPatientUcForm1_ButtonCancelFamille'),
        () => clickElementByClass('button cancel'),
        () => GenericClicker("title", "Annuler"),
        () => GenericClicker("title", "Quitter"),
        () => clickElementById('ContentPlaceHolder1_PatientsGrid_ButtonHistoriqueResultat_0'),
        // () => clickElementByChildtextContent("ANNULER") => on passe à la gestion par targetAnnuler
    ];

    actions.some(action => action() !== false);
}


//Fonction appellée par un bouton ou un raccourci clavier pour uploader le dernier fichier d'un dossier dans le dossier patient actuel
function uploadLatest() {
    chrome.storage.local.set({ 'automaticUpload': true }, function () { //On met un flag qui informe que l'upload sera automatique
        let uploadURL = `${baseUrl}/FolderMedical/PopUpUploader.aspx${window.location.search}`; //On récupère l'url de l'upload
        console.log(uploadURL);
        var uploadWindow = window.open(uploadURL, "Upload", "width=700,height=600"); //On ouvre la fenetre d'upload dans un popup
    });
}


function insertDate() {
    let date = new Date();
    let currentDate = String(date.getDate()).padStart(2, '0') + "/" + String(date.getMonth() + 1).padStart(2, '0') + "/" + String(date.getFullYear());
    let activeElement = document.activeElement;
    if (!activeElement)
        return;

    var tagName = activeElement.tagName.toLowerCase();
    if (tagName == 'iframe') {
        activeElement = activeElement.contentWindow.document.activeElement; //On récupère l'activeElement dans l'iframe
        tagName = 'body'
    }
    if (tagName == 'input' || tagName == 'textarea') {
        activeElement.value += currentDate;
    }
    else if (tagName == 'body') {
        activeElement.textContent += currentDate;
    }
}

// Débute le scan de documents
function startscanning() {
    console.log('startscanning activé');
    const scanButtonSelector = 'a.level2.dynamic[href^="javascript:void(window.weda.actions.startScan"]';
    let scanButton = document.querySelector(scanButtonSelector);
    if (scanButton) {
        clicCSPLockedElement(scanButtonSelector);
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
    link.href = `${baseUrl}/FolderMedical/FindPatientForm.aspx`;
    link.click();
    recordMetrics({ clicks: 1, drags: 3 });
}


// Ajout des info-bulles sur les boutons + les "sensibilise" aux raccourcis claviers en ajoutant des targets
addTweak('*', 'WarpButtons', async function () {
    async function getShortcuts() {
        return new Promise((resolve) => {
            chrome.storage.local.get(["defaultShortcuts", "shortcuts"], function (result) {
                const raccourcis = {
                    'targetAnnuler': shortcutDefaut(result.shortcuts, result.defaultShortcuts, 'push_annuler'),
                    'targetValider': shortcutDefaut(result.shortcuts, result.defaultShortcuts, 'push_valider'),
                    'targetSupprimer': shortcutDefaut(result.shortcuts, result.defaultShortcuts, 'push_delete')
                };
                resolve(raccourcis);
            });
        });
    }

    const raccourcis = await getShortcuts();
    console.log('[WarpButtons] Raccourcis', raccourcis);

    function warpButtons(buttons) {
        function addClassToButton(button) {
            var actions = {
                'Annuler': [
                    'Annuler',
                    'ANNULER',
                    'Continuez sans l\'ordonnance numérique',
                    'Non',
                    'NON',
                    'Ne pas inclure',
                    'FSE dégradée',
                    'Valider les modifications'
                ],
                'Valider': [
                    'Oui',
                    'OUI',
                    'Confirmer',
                    'Valider',
                    'VALIDER',
                    'Réessayer',
                    'Désactiver aujourd\'hui',
                    'Transmettre',
                    'Importer',
                    'Inclure',
                    'Sécuriser',
                    'Affecter ce résultat',
                    'FSE Teleconsultation',
                    'Valider et archiver'
                ],
                'Supprimer': [
                    'Valider et mettre à la corbeille',
                    'Supprimer',
                ]

            };
            if (button) {
                var buttonText = button.textContent;
                if (buttonText.length == 0) {
                    buttonText = button.value; //Bypass pour les boutons non Angular qui ont un textContent vide
                }
                var action = Object.keys(actions).find(key => actions[key].includes(buttonText));
                if (action) {
                    button.classList.add('target' + action);
                }
            }
            return true;
        }

        function addShortcutsToButton(button) {
            function applyStylesToSpan(span) {
                span.style.position = 'absolute';
                span.style.bottom = '-10px'; // Placer le texte un peu plus bas
                span.style.right = '5px';
                span.style.color = 'grey';
                span.style.fontSize = '0.8em';
                span.style.backgroundColor = 'rgba(240, 240, 240, 0.6)'; // Ajouter un fond semi-transparent
                span.style.padding = '2px'; // Ajouter un peu de padding pour le texte
                span.style.borderRadius = '10px'; // Ajouter des angles arrondis
                span.style.height = 'auto'; // Fixer la hauteur
                span.style.lineHeight = 'normal'; // Fixer la hauteur de ligne
                span.style.display = 'inline-block'; // S'assurer que le span ne prenne pas plus de hauteur que nécessaire
                span.style.pointerEvents = 'none'; // Empêcher les événements de pointer sur le span
            }

            if (button) {
                let raccourci = null;
                for (let i = 0; i < button.classList.length; i++) {
                    let className = button.classList[i];
                    if (raccourcis[className]) {
                        raccourci = raccourcis[className];
                        break;
                    }
                }
                console.log('ajout de raccourcis au button', button, 'raccourcis', raccourci);
                if (raccourci) {
                    console.log("Je tente d'ajouter une info de raccourci à un bouton", button);
                    // Créer l'élément span pour le raccourci
                    var span = document.createElement('span');
                    span.textContent = raccourci;
                    applyStylesToSpan(span);
                    button.style.position = 'relative'; // S'assurer que le bouton a une position relative
                    button.appendChild(span);
                }
            }
        }

        buttons.forEach(function (button) {
            button.style.width = 'auto';
            if (addClassToButton(button)) {
                addShortcutsToButton(button);
            }
        });
    }

    // Les sélecteurs des boutons à "sensibiliser"
    // Dès qu'ils sont détectés, on appelle warpButtons
    const selectors = [
        '.cdk-overlay-container .mat-raised-button',
        '.docImportButtons button',
        '#ContentPlaceHolder1_PatientsGrid_ButtonAffecteResultat_0',
        '.mat-button-wrapper',
        '.tab_valid_cancel .button', // Notamment dans la déclaration de MT
        '.boutonCustonWH',
        '.button.delete', // Le bouton de suppression classique
        // Trois boutons pour la validation et archivage/suppression suite à ctrl+U
        '#WHButtonValidAndArchive',
        '#WHButtonValidAndDelete',
        '#ButtonValidFileStream'
    ];

    selectors.forEach(selector => {
        waitForElement({
            selector: selector,
            triggerOnInit: true,
            callback: warpButtons
        });
    });
});


// Gestion du workflow pour envoi + impression + DMP des courriers
function send_document(printModelNumber) {
    getOption('sendAndPrint', function (sendAndPrint) {
        if (sendAndPrint) {
            console.log('sendAndPrint activé');
            handlePrint('print', printModelNumber, 'send');
        } else {
            clickPrintModelNumber(printModelNumber, true);
        }
    });
}