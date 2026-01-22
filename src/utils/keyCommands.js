/**
 * @file keyCommands.js
 * @description Système de gestion des raccourcis clavier et commandes globales.
 * Définit et gère tous les raccourcis clavier de l'extension,
 * avec support du throttling, des scopes, et de l'injection dans les iframes.
 * 
 * @exports addHotkeyToDocument - Ajoute un raccourci clavier à un document
 * @exports getShortcuts - Récupère les raccourcis configurés
 * @exports addShortcuts - Ajoute des raccourcis à un scope
 * @exports addShortcutsToIframe - Injecte les raccourcis dans une iframe
 * @exports warpButtons - Ajoute des indicateurs de raccourcis aux boutons
 * 
 * @requires storage.js (getOption)
 * @requires metrics.js (recordMetrics)
 * @requires dom-oberver.js (waitForElement)
 * 
 * @typedef {Object} KeyCommand
 * @property {Function} action - La fonction exécutée lorsque la commande clé est activée.
 */



const keyCommands = {
    'push_valider': push_valider,
    'push_annuler': push_annuler,
    'print_meds': function () {
        if (window.location.href.includes('/FolderMedical/PatientViewForm.aspx')) {
            startPrintAll();
        } else {
            handlePrint({ printType: 'print', modelNumber: 0 });
        }
    },
    'print_meds_bis': function () {
        handlePrint({ printType: 'print', modelNumber: 1 });
    },
    'download_document': function () {
        handlePrint({ printType: 'download', modelNumber: 0 });
    },
    'download_document_bis': function () {
        handlePrint({ printType: 'download', modelNumber: 1 });
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
            // clickElementByClass('button delete');
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
        submenuW('Consultation');
    },
    'shortcut_consult_bis': function () {
        console.log('shortcut_consult_bis activé');
        submenuW('Consultation', true);
    },
    'shortcut_certif': function () {
        console.log('shortcut_certif activé');
        submenuW('Certificat');
    },
    'shortcut_certif_bis': function () {
        console.log('shortcut_certif_bis activé');
        submenuW('Certificat', true);
    },
    'shortcut_demande': function () {
        console.log('shortcut_demande activé');
        submenuW('Demande');
    },
    'shortcut_demande_bis': function () {
        console.log('shortcut_demande_bis activé');
        submenuW('Demande', true);
    },
    'shortcut_prescription': function () {
        console.log('shortcut_prescription activé');
        submenuW('Prescription');
    },
    'shortcut_prescription_bis': function () {
        console.log('shortcut_prescription_bis activé');
        submenuW('Prescription', true);
    },
    'shortcut_formulaire': function () {
        console.log('shortcut_formulaire activé');
        submenuW('Formulaire');
    },
    'shortcut_formulaire_bis': function () {
        console.log('shortcut_formulaire_bis activé');
        submenuW('Formulaire', true);
    },
    'shortcut_courrier': function () {
        console.log('shortcut_courrier activé');
        submenuW('Courrier');
    },
    'shortcut_courrier_bis': function () {
        console.log('shortcut_courrier_bis activé');
        submenuW('Courrier', true);
    },
    'shortcut_fse': function () {
        console.log('shortcut_fse activé');
        submenuW('FSE');
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

/**
 * Fonction throttle avec persistance du dernier appel.
 * Limite la fréquence d'exécution d'une fonction et ignore les appels pendant le chargement initial.
 * 
 * @param {Function} func - Fonction à throttler
 * @param {number} limit - Délai minimum en ms entre deux exécutions
 * @returns {Function} - Fonction throttlée
 */
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

/**
 * Ajoute un raccourci clavier à un élément spécifique avec ou sans throttle.
 * 
 * @param {string} scope - Portée du raccourci (nom unique pour regrouper les raccourcis)
 * @param {HTMLElement} element - Élément DOM auquel attacher le raccourci
 * @param {string} shortcut - Combinaison de touches (ex: 'ctrl+p', 'alt+s')
 * @param {Function} action - Fonction à exécuter lors de l'activation du raccourci
 * @param {boolean} [noThrottle=false] - Si true, désactive le throttle
 */
function addHotkeyToDocument(scope, element, shortcut, action, noThrottle = false) {
    if (shortcut != undefined) {
        const handler = noThrottle
            ? function (event, handler) {
                event.preventDefault();  // Empêche le comportement par défaut
                action();  // Exécute l'action associée au raccourci
            }
            : throttleWithPersistence(function (event, handler) {
                event.preventDefault();  // Empêche le comportement par défaut
                action();  // Exécute l'action associée au raccourci
            }, 300);

        hotkeys(shortcut, {
            scope: scope,
            element: element
        }, handler);
    }
}

/**
 * Renvoie le raccourci pertinent (personnalisé ou par défaut) pour une action.
 * 
 * @param {Object} shortcuts - Raccourcis personnalisés de l'utilisateur
 * @param {Object} defaultShortcuts - Raccourcis par défaut du système
 * @param {string} key - Clé de l'action recherchée
 * @returns {string} - Raccourci clavier à utiliser
 */
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

/**
 * Récupère les raccourcis clavier pour une liste d'actions données
 * 
 * Cette fonction récupère les raccourcis personnalisés ou par défaut pour chaque nom d'action fourni
 * dans le tableau nomsRaccourcis. Elle utilise la fonction shortcutDefaut pour déterminer le raccourci
 * à utiliser pour chaque action.
 * 
 * @async
 * @param {string[]} nomsRaccourcis - Tableau contenant les noms des actions dont on veut récupérer les raccourcis
 * @returns {Promise<Object>} Une promesse qui se résout avec un objet où les clés sont les noms des raccourcis et les valeurs sont les raccourcis clavier
 * @example
 * // Récupération de plusieurs raccourcis (format objet)
 * const raccourcis = await getShortcuts(['push_annuler', 'push_valider', 'push_delete']);
 * // Retourne (exemple) : 
 * // {
 * //   push_annuler: "Alt+Q",
 * //   push_valider: "Alt+W",
 * //   push_delete: "Alt+E"
 * // }
 */
async function getShortcuts(nomsRaccourcis) {
    return new Promise((resolve) => {
        let raccourcisClaviers = {};
        chrome.storage.local.get(["defaultShortcuts", "shortcuts"], function (result) {
            nomsRaccourcis.forEach(function (shortcut) {
                const currentShortcut = shortcutDefaut(result.shortcuts, result.defaultShortcuts, shortcut);
                console.log('currentShortcut', currentShortcut);
                raccourcisClaviers[shortcut] = currentShortcut;
            });
            console.log('raccourcisClaviers', raccourcisClaviers);
            resolve(raccourcisClaviers);
        });
    });
}

/**
 * Ajoute tous les raccourcis d'un scope donné à l'élément document.
 * 
 * @param {Object} keyCommands - Objet contenant les commandes et leurs actions
 * @param {string} scope - Portée des raccourcis (nom du scope)
 * @param {string} scopeName - Nom du scope pour les logs
 */
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


/**
 * Retire les iframes d'historique d'un tableau d'iframes.
 * 
 * @param {HTMLIFrameElement[]} iframes - Tableau d'iframes à filtrer
 * @returns {HTMLIFrameElement[]} - Iframes sans les iframes d'historique
 */
function removeHistoryIframe(iframes) {
    iframes = Array.from(iframes).filter(iframe => !iframe.src.startsWith(`${baseUrl}/FolderMedical/FrameHistoriqueForm.aspx`));
    return iframes;
}

/**
 * Vérifie si un iframe est un iframe d'historique patient.
 * 
 * @param {HTMLIFrameElement} iframe - Iframe à vérifier
 * @returns {boolean} - True si iframe d'historique, false sinon
 */
function isHistoriqueIframe(iframe) {
    let isHistoriqueIframe_bol = iframe.src.startsWith(`${baseUrl}/FolderMedical/FrameHistoriqueForm.aspx`);
    return isHistoriqueIframe_bol;
}

/**
 * Ajoute les raccourcis clavier aux iframes de la page.
 * Exclut les iframes d'historique pour éviter les conflits.
 */
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

/**
 * Ajoute tous les raccourcis clavier à la page et aux iframes.
 * Configure les raccourcis pour les différents scopes : global, consultation, agenda, etc.
 */
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



/**
 * Bascule l'affichage des antécédents en cliquant sur le bouton approprié.
 */
function toggleAtcd() {
    console.log('toggleAtcd activé');
    var element = document.getElementById('ContentPlaceHolder1_EvenementUcForm1_ImageButtonShowAntecedent');
    if (element) {
        element.click();
        recordMetrics({ clicks: 1, drags: 1 });
    }
}


/**
 * Appuie sur le bouton Valider de la page actuelle.
 * Cherche le bouton avec texte 'Valider' ou 'Enregistrer'.
 */
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

    // d’abord envoyer un change et un input dans le champ en cours d’édition pour éviter les pertes de données
    var activeElement = document.activeElement;
    if (activeElement) {
        var eventChange = new Event('change', { bubbles: true });
        var eventInput = new Event('input', { bubbles: true });
        activeElement.dispatchEvent(eventChange);
        activeElement.dispatchEvent(eventInput);
        console.log('Dispatched change and input events to activeElement', activeElement);
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
    const scanButtonSelector2 = '#ContentPlaceHolder1_EvenementUcForm1_MenuScanner ul a';
    let scanButton = document.querySelector(scanButtonSelector);
    let scanButton2 = document.querySelector(scanButtonSelector2);
    if (scanButton) {
        clicCSPLockedElement(scanButtonSelector);
    } else if (scanButton2) {
        clicCSPLockedElement(scanButtonSelector2);
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



/** Clique sur un élément du menu selon sa description
 * @param {string} description - La description de l'élément à cliquer ex. " Consultation"
 * @param {boolean} shiftOn - Si true, on doit créer un nouveau document obligatoirement
 */
function submenuW(description, shiftOn = false) {
    console.log('[submenuW] activé', description, shiftOn);
    // Selection du menu de base
    var baseMenuLvl1 = document.getElementsByClassName('level1 static')[0];
    console.log('baseMenuLvl1', baseMenuLvl1);

    if (!baseMenuLvl1) {
        console.log('Menu de base non trouvé');
        return false;
    }

    // On recherche l'élément de niveau 2 et on ne garde que celui qui correspond à la description
    let level2Element = Array.from(baseMenuLvl1.querySelectorAll(`a.level2`)).find(a => a.textContent.trim().startsWith(description.trim()));
    console.log('level2Element', level2Element);

    // On liste les éléments de niveau 3 sous le parent de level2Element
    let level3Elements = level2Element.parentElement.querySelectorAll('a.level3');
    console.log('level3Elements', level3Elements);

    // Filtre des éléments "parasitaires" qui ne sont pas des documents
    const blackList = [
        "Courrier à établir",
        "Demande laboratoire",
        "Demande imagerie",
        "Demande paramédicale",
        "Renouvellement"
    ];

    // On retire les éléments qui sont dans la blackList
    level3Elements = Array.from(level3Elements).filter(el => !blackList.includes(el.textContent.trim()));
    console.log('level3Elements après filtrage', level3Elements, "de taille", level3Elements.length);


    function clicLvlElement(element) {
        if (element) {
            element.click();
            recordMetrics({ clicks: 1, drags: 1 });
            return true;
        }
        return false;
    }

    console.log('shiftOn', shiftOn);
    if (shiftOn) {
        console.log('Shift est enfoncé, on force la création d\'un nouveau document, je clique sur', level2Element);
        clicLvlElement(level2Element);
    } else if (level3Elements.length === 0) {
        // Si pas d'élément de niveau 3 on clique sur l'élément de niveau 2 pour créer un nouveau document
        console.log('Aucun élément de niveau 3 trouvé, on clique sur le niveau 2', level2Element);
        clicLvlElement(level2Element);
    } else if (level3Elements.length >= 1) {
        // On cherche le titre du premier élément de niveau 3
        const level3Title = level3Elements[0].querySelector('span').title;
        // On a trouvé au moins un élément de niveau 3
        console.log('Au moins un élément de niveau 3 trouvé', level3Elements, level3Title);
        // Si un seul élément de niveau 3 on vérifie que ça n’est pas déjà le document courant
        if (level3Title.includes("Vous êtes actuellement positionné sur ce document")) {
            console.log('Déjà sur ce document, on force la création d\'un nouveau document', level2Element);
            clicLvlElement(level2Element);
        } else {
            console.log('Un seul élément de niveau 3 trouvé, on clique dessus', level3Elements[0]);
            clicLvlElement(level3Elements[0]);
        }
    }
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
    const targetToAction = {
        'targetAnnuler': 'push_annuler',
        'targetValider': 'push_valider',
        'targetSupprimer': 'push_delete'
    };
    let raccourcis = await getShortcuts(["push_annuler", "push_valider", "push_delete"]);

    // Créer un nouvel objet pour stocker les raccourcis transformés
    const transformedRaccourcis = {};

    // Pour chaque paire action/raccourci dans l'objet original
    for (const [action, shortcut] of Object.entries(raccourcis)) {
        // Trouver la clé dans targetToAction qui correspond à cette action
        const target = Object.keys(targetToAction).find(key => targetToAction[key] === action);
        if (target) {
            // Ajouter au nouvel objet avec la clé transformée
            transformedRaccourcis[target] = shortcut;
        } else {
            // Conserver les clés qui n'ont pas de transformation
            transformedRaccourcis[action] = shortcut;
        }
    }

    // Remplacer l'objet raccourcis par la version transformée
    console.log('[WarpButtons] Raccourcis originaux', raccourcis);
    console.log('[WarpButtons] Raccourcis transformés', transformedRaccourcis);
    raccourcis = transformedRaccourcis;

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
                    'Valider les modifications',
                    'H'
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
                    'Valider et archiver',
                    ' Un patient '
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

        function addShortcutsToButton(element) {
            function applyCommonStylesToSpan(span) {
                span.style.color = 'grey';
                span.style.fontSize = '0.8em';
                span.style.backgroundColor = 'rgba(240, 240, 240, 0.6)';
                span.style.padding = '2px 5px';
                span.style.borderRadius = '10px';
                span.style.pointerEvents = 'none';
                span.style.whiteSpace = 'nowrap'; // Prevent text wrapping
                span.style.zIndex = '5'; // Ensure it appears above other content
            }

            function applyStylesToSpanForButton(span) {
                applyCommonStylesToSpan(span);
                span.style.position = 'absolute';
                span.style.bottom = '-10px';
                span.style.right = '5px';
                span.style.height = 'auto';
                span.style.lineHeight = 'normal';
                span.style.display = 'inline-block';
            }

            function applyStylesToSpanForInput(span) {
                applyCommonStylesToSpan(span);
                span.style.position = 'absolute';
                span.style.bottom = '-10px'; // Position below the input
                span.style.right = '25%';    // Position at the right quarter (75% from left)
                span.style.transform = 'translateX(50%)'; // Center the tooltip at the 75% point
            }

            if (element) {
                let raccourci = null;
                for (let i = 0; i < element.classList.length; i++) {
                    let className = element.classList[i];
                    if (raccourcis[className]) {
                        raccourci = raccourcis[className];
                        break;
                    }
                }

                console.log('ajout de raccourcis à l\'élément', element, 'raccourcis', raccourci);

                if (raccourci) {
                    console.log("Je tente d'ajouter une info de raccourci à", element.tagName);

                    // Créer l'élément span pour le raccourci
                    var span = document.createElement('span');
                    span.textContent = raccourci;
                    // Ici on veut que l'id soit le raccourci pour pouvoir le cibler, mais il faut que les caractères soient valides
                    span.id = raccourci
                        .replace(/ /g, '_')
                        .replace(/\+/g, 'plus')  // Replace + with the word "plus"
                        .replace(/'/g, '')
                        .replace(/é/g, 'e')
                        .replace(/è/g, 'e')
                        .replace(/à/g, 'a')
                        .replace(/ç/g, 'c');

                    // On vérifie si un élément avec cet id existe déjà
                    if (document.getElementById(span.id)) {
                        return;
                    }

                    // Appliquer les styles selon le type d'élément
                    if (element.tagName.toLowerCase() === 'input') {
                        console.log('C\'est un input');
                        // Pour les éléments input
                        applyStylesToSpanForInput(span);

                        // On doit ajouter le span à un parent conteneur
                        const wrapper = document.createElement('div');
                        wrapper.style.position = 'relative';
                        wrapper.style.display = 'inline-block';

                        // Remplacer l'input par le wrapper contenant l'input et le span
                        element.parentNode.insertBefore(wrapper, element);
                        wrapper.appendChild(element);
                        wrapper.appendChild(span);
                    } else {
                        console.log('C\'est un autre élément');
                        // Pour les boutons et autres éléments
                        applyStylesToSpanForButton(span);
                        element.style.position = 'relative'; // S'assurer que l'élément a une position relative
                        element.appendChild(span);
                    }
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
        '#ButtonValidFileStream',
        '#ContentPlaceHolder1_PatientsGrid_ButtonHistoriqueResultat_0', // Pour les biologies
        '.btnImport.importPatient'
    ];

    selectors.forEach(selector => {
        waitForElement({
            selector: selector,
            triggerOnInit: true,
            callback: warpButtons
        });
    });
});


// Gestion du workflow ctrl(+shift)+E pour envoi + impression + DMP des courriers
function send_document(printModelNumber) {
    getOption('sendAndPrint', function (sendAndPrint) {
        if (sendAndPrint) {
            console.log('sendAndPrint activé');
            handlePrint({ printType: 'print', modelNumber: printModelNumber, sendAfterPrint: true });
        } else {
            clickPrintModelNumber(printModelNumber, true);
        }
    });
}