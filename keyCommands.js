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
        if (window.location.href.includes('/FolderMedical/PatientViewForm.aspx')) {
            startPrintAll();
        } else {
            handlePrint({printType: 'print', modelNumber: 0});
        }
    },
    'print_meds_bis': function () {
        handlePrint({printType: 'print', modelNumber: 1});
    },
    'download_document': function () {
        handlePrint({printType: 'download', modelNumber: 0});
    },
    'download_document_bis': function () {
        handlePrint({printType: 'download', modelNumber: 1});
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
        submenuW(' Consultation');
    },
    'shortcut_consult_bis': function () {
        console.log('shortcut_consult_bis activé');
        submenuW(' Consultation', true);
    },
    'shortcut_certif': function () {
        console.log('shortcut_certif activé');
        submenuW(' Certificat');
    },
    'shortcut_certif_bis': function () {
        console.log('shortcut_certif_bis activé');
        submenuW(' Certificat', true);
    },
    'shortcut_demande': function () {
        console.log('shortcut_demande activé');
        submenuW(' Demande');
    },
    'shortcut_demande_bis': function () {
        console.log('shortcut_demande_bis activé');
        submenuW(' Demande', true);
    },
    'shortcut_prescription': function () {
        console.log('shortcut_prescription activé');
        submenuW(' Prescription');
    },
    'shortcut_prescription_bis': function () {
        console.log('shortcut_prescription_bis activé');
        submenuW(' Prescription', true);
    },
    'shortcut_formulaire': function () {
        console.log('shortcut_formulaire activé');
        submenuW(' Formulaire');
    },
    'shortcut_formulaire_bis': function () {
        console.log('shortcut_formulaire_bis activé');
        submenuW(' Formulaire', true);
    },
    'shortcut_courrier': function () {
        console.log('shortcut_courrier activé');
        submenuW(' Courrier');
    },
    'shortcut_courrier_bis': function () {
        console.log('shortcut_courrier_bis activé');
        submenuW(' Courrier', true);
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

/**
 * Trouve un élément de niveau 3 du menu qui correspond à la description donnée
 * @param {HTMLElement} baseMenuLvl1 - L'élément de base du menu de niveau 1
 * @param {string} description - La description à rechercher
 * @returns {HTMLElement|null} - L'élément trouvé ou null si non trouvé
 */
function findLevel3Element(baseMenuLvl1, description) {
    if (!baseMenuLvl1) {
        console.log('[findLevel3Element] Menu de base (level 1) non trouvé');
        return null;
    }
    
    // Récupère tous les éléments de niveau 3
    const level3Elements = Array.from(baseMenuLvl1.getElementsByClassName('level3 dynamic'));
    
    if (level3Elements.length === 0) {
        console.log('[findLevel3Element] Aucun élément de niveau 3 trouvé dans le menu');
        return null;
    }
    
    console.log(`[findLevel3Element] Recherche de "${description}" parmi ${level3Elements.length} éléments de niveau 3`);
    
    // On va éviter de cliquer sur les éléments suivants qui sont systématiquement inappropriés
    const blackList = [
        " Courrier à établir",
        " Demande laboratoire",
        " Demande imagerie",
        " Demande paramédicale"
    ];


    // Recherche l'élément correspondant aux critères
    const matchingElement = level3Elements.find(function (element) {
        const includesText = element.innerText.includes(description);
        const hasTabIndex = element.hasAttribute('tabindex');
        const isNotBlacklisted = !blackList.some(blacklistedText => element.innerText.includes(blacklistedText));
        
        console.log(`[findLevel3Element] Élément: "${element.innerText}" - ` +
                    `contient "${description}": ${includesText ? 'oui' : 'non'}, ` +
                    `tabindex: ${hasTabIndex ? 'oui' : 'non'}, ` +
                    `n'est pas alerte courrier: ${isNotBlacklisted ? 'oui' : 'non'}`);
        
        return includesText && hasTabIndex && isNotBlacklisted;
    });
    
    if (matchingElement) {
        console.log(`[findLevel3Element] Élément trouvé pour "${description}":`, matchingElement.innerText);
    } else {
        console.log(`[findLevel3Element] Aucun élément correspondant à "${description}" trouvé`);
    }
    
    return matchingElement;
}

/**
 * Trouve un élément de niveau 2 du menu qui correspond à la description donnée
 * @param {HTMLElement} baseMenuLvl1 - L'élément de base du menu de niveau 1
 * @param {string} description - La description à rechercher
 * @returns {HTMLElement|null} - L'élément trouvé ou null si non trouvé
 */
function findLevel2Element(baseMenuLvl1, description) {
    if (!baseMenuLvl1) return null;

    return Array.from(baseMenuLvl1.getElementsByClassName('level2 dynamic')).find(function (element) {
        return element.innerText.includes(description) && element.hasAttribute('tabindex');
    });
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


    // D'abord on cherche si un document existe déjà
    // On le cherche dans les elements de niveau 3
    var level3Element = findLevel3Element(baseMenuLvl1, description);

    console.log('level3Element', level3Element);
    if (level3Element && !shiftOn) {
        level3Element.click();
        recordMetrics({ clicks: 1, drags: 3 });
        console.log('Element clicked:', level3Element);
        return true;
    } else {
        // Si la création d'un nouveau document est requise, on va cliquer dans les éléments de niveau 2
        var level2Element = findLevel2Element(baseMenuLvl1, description);
        console.log('level2Element', level2Element);

        if (level2Element) {
            level2Element.click();
            recordMetrics({ clicks: 1, drags: 2 });
            console.log('Element clicked:', level2Element);
            return true;
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
    const targetToAction = {
        'targetAnnuler': 'push_annuler',
        'targetValider': 'push_valider',
        'targetSupprimer': 'push_delete'
    };
    const raccourcis = await getShortcuts(["push_annuler", "push_valider", "push_delete"]);
    // Remplacer chaque clé présente dans raccourcis par le target correspondant
    for (const [key, value] of Object.entries(raccourcis)) {
        if (targetToAction[key]) {
            raccourcis[targetToAction[key]] = value;
            delete raccourcis[key];
        }
    }

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
        '#ContentPlaceHolder1_PatientsGrid_ButtonHistoriqueResultat_0' // Pour les biologies
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