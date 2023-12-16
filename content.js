// Order the tab order of the elements shown after a search
function ListTabOrderer(validTarget) {
    console.log('ListTabOrderer started');
    var truncated_id = validTarget.slice(0, -1);
    var elements = document.querySelectorAll('[id^="' + truncated_id + '"]');
    for (var i = 0; i < elements.length; i++) {
        elements[i].tabIndex = i + 100;
    }
}


// place a listener on the search box and focus on the first element of the list after a search
function SearchBoxEntryListener(idsSearchBox, validTarget, listTabOrderer = false) {
    var searchBox = document.getElementById(idsSearchBox);
    function focusOnFirstListElement(validTarget) {    
        const elementToFocus = document.getElementById(validTarget);
        if (elementToFocus) {
            elementToFocus.focus();
        }
    }

    function FocusToDocDateAfterPatientSelect() {
        // find all elements with id starting with ContentPlaceHolder1_FileStreamClassementsGrid_LinkButtonFileStreamClassementsGridPatientNom_
        const elements = document.querySelectorAll('[id^="ContentPlaceHolder1_FileStreamClassementsGrid_LinkButtonFileStreamClassementsGridPatientNom_"]');
        // starting from the last element, find the first element with title= starting with "Vous avez attribué ce document au patient" and gets its id
        for (let i = elements.length - 1; i >= 0; i--) {
            const element = elements[i];
            console.log('element', element);
            if (element.title.startsWith("Vous avez attribué ce document au patient")) {
                const id = element.id;
                // get the 1 or 2 digits at the end of the id
                const patient_number = id.match(/\d+$/)[0];
                console.log('Le patient en cours est en position', patient_number);
                // focus on the element with ContentPlaceHolder1_FileStreamClassementsGrid_EditBoxGridFileStreamClassementDate_ + patient_number
                const elementToFocus = document.getElementById('ContentPlaceHolder1_FileStreamClassementsGrid_EditBoxGridFileStreamClassementDate_' + patient_number);
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

    function watchForEarlyDOMChanges() {
        var startTime = Date.now();
        var observer = new MutationObserver(function (mutations) {
            console.log('DOM changed, resetting setupUIInteractions');
            // check if the timer has been running for more than 500ms, then remove the listener and the timer
            var elapsedTime = Date.now() - startTime;
            if (elapsedTime >= 500) {
                observer.disconnect();
                startTime = null;                
            }
            setupUIInteractions();

        });
        observer.observe(document, { childList: true, subtree: true });
    }

    function setupUIInteractions() {
        if (listTabOrderer) {
            ListTabOrderer(validTarget);
            PatientSelectEntryListener();
        }
        focusOnFirstListElement(validTarget);
        SearchBoxEntryListener(idsSearchBox, validTarget, listTabOrderer);
    } 


    if (searchBox) {
        searchBox.addEventListener('keydown', function (event) {
            console.log('added event listener to search box');
            if (event.key === 'Enter') {
                console.log('Enter pressed in search box');
                setTimeout(function () {
                    setupUIInteractions();
                    watchForEarlyDOMChanges();
                }, 600);
            }
        });
    }
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
        () => clickElementById('ContentPlaceHolder1_BaseGlossaireUCForm1_ButtonValidDocument'),
        () => clickClassExceptIf('button valid', 'Chercher', 'ContentPlaceHolder1_btnScanDatamatrix'),
        () => GenericClicker("title", "Enregistrer et quitter"),
        () => GenericClicker("title", "Valider"),
        () => clickElementByChildtextContent("VALIDER"),
        () => clickElementById('ContentPlaceHolder1_ButtonQuitter2'),
        () => clicSecure()
    ];

    actions.some(action => action() !== false);
}


// show a tooltip next to W entries with the key of submenuDict
function tooltipshower() {
    // abort if the focus is out of the window/tab TODO
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

// remove the tooltip next to W and relacher W
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


// // External functions : lien avec Weda-Helper-Companion
// envoi d'instruction au TPE via Weda-Helper-Companion
function sendtpeinstruction(amount) {
    // store the amount in chrome.storage.sync
    chrome.storage.sync.set({ 'lastTPEamount': amount }, function () {
        console.log('lastTPEamount', amount, 'sauvegardé avec succès');
    });
    chrome.storage.sync.get(['portCompanion','ipTPE', 'portTPE', 'RemoveLocalCompanionTPE'], function (result) {
        const portCompanion = result.portCompanion;
        const ipTPE = result.ipTPE;
        const portTPE = result.portTPE;
        const removeLocalCompanionTPE = result.RemoveLocalCompanionTPE;

        if (!portCompanion || !ipTPE || !portTPE || removeLocalCompanionTPE !== false) {
            console.warn('ipTPE, portTPE ou RemoveLocalCompanionTPE ne sont pas définis ou RemoveLocalCompanionTPE est !false (valeur actuelle :', removeLocalCompanionTPE, ')');
            return;
        } else if (!(/^\d+$/.test(amount))) {
            console.log('amount', amount, 'n\'est pas un nombre entier');
            return;
        }
        else {
            console.log('sendinstruction', amount + 'c€' + ' to ' + ipTPE + ':' + portTPE);
            fetch(`http://localhost:${portCompanion}/tpe/${ipTPE}/${portTPE}/${amount}`)
                // les deux ci-dessous sont désactivés car ils ne fonctionnent pas avec no-cors
                .then(response => response.json())
                .then(data => console.log(data))
                .catch(error => console.error('Error:', error));
        }
    });
}

// envoi du dernier montant au TPE dans Weda-Helper-Companion
function sendLastTPEamount() {
    chrome.storage.sync.get('lastTPEamount', function (result) {
        const lastTPEamount = result.lastTPEamount;
        console.log('Envoi du dernier montant demandé au TPE : ' + lastTPEamount + 'c€');
        if (lastTPEamount) {
            console.log('lastTPEamount', lastTPEamount);
            sendtpeinstruction(lastTPEamount);
        }
    });
}

// déclenchement de l'impression dans Weda-Helper-Companion
function sendPrint() {
    chrome.storage.sync.get('RemoveLocalCompanionPrint', function (result) {
        const RemoveLocalCompanionPrint = result.RemoveLocalCompanionPrint;
        if (RemoveLocalCompanionPrint !== false) {
            console.log('RemoveLocalCompanionPrint est !false (valeur actuelle :', RemoveLocalCompanionPrint, ')');
            return;
        } else {
            console.log('send Print');
            chrome.storage.sync.get(['portCompanion', 'delay_primary', 'delay_btw_tabs', 'delay_btw_tab_and_enter', 'delay_btw_enters'], function (result) {
                const portCompanion = result.portCompanion;
                const delay_primary = result.delay_primary;
                const delay_btw_tabs = result.delay_btw_tabs;
                const delay_btw_tab_and_enter = result.delay_btw_tab_and_enter;
                const delay_btw_enters = result.delay_btw_enters;
                if (!portCompanion || !delay_primary || !delay_btw_tabs || !delay_btw_tab_and_enter || !delay_btw_enters) {
                    console.warn('ipTPE, portTPE ou RemoveLocalCompanionTPE ne sont pas définis. Aller à chrome-extension://fnfdbangkcmjacbeaaiongkbacaamnfd/options.html pour les définir');
                    return;
                }
                console.log('delay_btw_tabs', delay_btw_tabs);
                console.log('delay_btw_tab_and_enter', delay_btw_tab_and_enter);
                console.log('delay_btw_enters', delay_btw_enters);
                fetch(`http://localhost:${portCompanion}/print/${delay_primary}/${delay_btw_tabs}/${delay_btw_tab_and_enter}/${delay_btw_enters}`)
                    .catch(error => console.error('Error:', error));
            });
        }
    });
}



// // Listeners
// Listen for messages from the background script about options
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

// Listen for focus leaving the window
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



// // "Main"
// Affiche une fenêtre d'aide pour mettre en avant les raccourcis clavier
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


// // Change some elements based on the URL and function parameters

// // Tab and search tweaks
// [Page d'upload] Tweak the uploader page
chrome.storage.sync.get('TweakImports', function (result) {
    // Modifie la taille de la fenêtre de prévisualisation du PDF
    function uploaderformResizeElements() {
        const newsize = '600px'; // TODO mettre ça dans les options
        const pdfViewer = document.querySelector('#ContentPlaceHolder1_ViewPdfDocumentUCForm1_PanelViewDocument');
        if (pdfViewer) {
            pdfViewer.style.height = newsize;
        }

        const iframe = document.querySelector('#ContentPlaceHolder1_ViewPdfDocumentUCForm1_iFrameViewFile');
        if (iframe) {
            iframe.style.height = newsize;
        }

        const panelFindPatient = document.querySelector('#ContentPlaceHolder1_FindPatientUcForm1_PanelFindPatient');
        if (panelFindPatient) {
            panelFindPatient.style.top = newsize;
        }
    }

    // Modifie l'ordre de tabulation des éléments
    function uploaderformSetTabOrder() {
        const elementIds = [
            'ContentPlaceHolder1_FileStreamClassementsGrid_LinkButtonFileStreamClassementsGridPatientNom_',
            'ContentPlaceHolder1_FileStreamClassementsGrid_EditBoxGridFileStreamClassementDate_',
            'ContentPlaceHolder1_FileStreamClassementsGrid_EditBoxGridFileStreamClassementTitre_',
            'ContentPlaceHolder1_FileStreamClassementsGrid_DropDownListGridFileStreamClassementLabelClassification_'
        ];
    
        let tabIndex = 1;
        for (let i = 0; i <= 7; i++) {
            elementIds.forEach(function (elementId) {
                var element = document.getElementById(elementId + i);
                if (element) {
                    element.tabIndex = tabIndex;
                    tabIndex++;
                }
            });
        }
    }

    // Convert a truncated date to a full date
    function convertDate(truncatedDate) {
        let parts = truncatedDate.split('/');
        let day = parts[0];
        let month = parts[1] || new Date().getMonth() + 1;
        let year = new Date().getFullYear();
        let length = day.length;
        let validDayLengths = [1, 2, 4, 6, 8];
        
        if (length === 4) {
            // If truncatedDate is 4 digits, assume the first 2 digits are the day and the last 2 digits are the month
            day = truncatedDate.substring(0, 2);
            month = truncatedDate.substring(2, 4);
        } else if (length === 6) {
            // If truncatedDate is 6 digits, assume the first 2 digits are the day, the next 2 digits are the month, and the last 2 digits are the year
            day = truncatedDate.substring(0, 2);
            month = truncatedDate.substring(2, 4);
            year = '20' + truncatedDate.substring(4, 6); // Add '20' to the beginning of the year to make it 4 digits
        } else if (length === 8) {
            // If truncatedDate is 8 digits, assume the first 2 digits are the day, the next 2 digits are the month, and the last 4 digits are the year
            day = truncatedDate.substring(0, 2);
            month = truncatedDate.substring(2, 4);
            year = truncatedDate.substring(4, 8);
        } else if (!validDayLengths.includes(length)){
            // If truncatedDate is not 4, 6, or 8 digits, return it without modification
            console.log('Invalid date format:', truncatedDate);
            return truncatedDate;
        }

        // Add leading zeros to day and month if needed
        if (day < 10 && day.length < 2) {
            day = '0' + day;
        }
        
        if (month < 10 && month.length < 2) {
            month = '0' + month;
        }
    
        return day + '/' + month + '/' + year;
    }

    // Function to handle the 'keydown' event
    function handleKeyDown(event) {
        if (event.key === 'Tab') {
            // The 'Tab' key was pressed, check and modify the text content as needed
            let textField = event.target;
            let datePattern = /^\d{2}\/\d{2}\/\d{4}$/; // Regular expression for dd/mm/yyyy
            if (!datePattern.test(textField.value)) {
                // The text is not in the correct date format. Check if it contains only / and numbers
                let validPattern = /^[\d\/]+$/;
                if (validPattern.test(textField.value)) {
                    // The text is valid, convert it to a full date
                    textField.value = convertDate(textField.value);
                }
                // ...
            }
        }
    }

    // Add the event listener to each date document field
    function addEventListeners() {
        for (let i = 0; i <= 7; i++) {
            let textField = document.getElementById(`ContentPlaceHolder1_FileStreamClassementsGrid_EditBoxGridFileStreamClassementDate_${i}`);
            if (textField) {
                textField.addEventListener('keydown', handleKeyDown);
            }
        }
    }
    
    // modifie la page d'upload : modifie la taille de prévisu, modifie l'ordre de tabulation et place un listener sur la searchbox.
    function uploaderformSetup() {
        uploaderformResizeElements();
        uploaderformSetTabOrder();
        SearchBoxEntryListener(idsSearchBox, validTarget, listTabOrderer = true);
        addEventListeners();
    };
    
    if (result.TweakImports !== false) {
        if (window.location.href === 'https://secure.weda.fr/FolderMedical/UpLoaderForm.aspx') {
            var idsSearchBox = 'ContentPlaceHolder1_FindPatientUcForm1_TextBoxRecherche';
            var validTarget = 'ContentPlaceHolder1_FindPatientUcForm1_PatientsGrid_LinkButtonPatientGetNomPrenom_0';
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

// [Page de Consultation] Modifie l'ordre de tabulation des valeurs de suivi
chrome.storage.sync.get('TweakTabConsultation', function (result) {
    function changeTabOrder() {
        var elements = document.querySelectorAll('[id^="ContentPlaceHolder1_SuivisGrid_EditBoxGridSuiviReponse_"]');
        // change the taborder starting with 0 for elements[0] and incrementing by 1 for each element
        for (var i = 0; i < elements.length; i++) {
            elements[i].tabIndex = i + 1;
        }
    }
    if (result.TweakTabConsultation !== false) {
        if (window.location.href.startsWith('https://secure.weda.fr/FolderMedical/ConsultationForm.aspx')) {
            changeTabOrder();
            console.log('ConsultationFormTabOrderer started');
        }
    }
});

// [Page de prescriptions] Tweaks the prescription page to select the first medicine after a search
chrome.storage.sync.get('TweakTabPrescription', function (result) {
    if (result.TweakTabPrescription !== false) {
        if (window.location.href.startsWith('https://secure.weda.fr/FolderMedical/PrescriptionForm.aspx')) {
            var idsSearchBox = 'ContentPlaceHolder1_BaseVidalUcForm1_TextBoxFindPack';
            var validTarget = 'ContentPlaceHolder1_BaseVidalUcForm1_VidalPacksGrid_LinkButtonVidalPacksGridName_0';
            console.log('SearchBoxEntryListener started (prescription)');
            SearchBoxEntryListener(idsSearchBox, validTarget);
        }
    }
});

// [Page de recherche patient] Tweaks the search patient page to select the first patient after a search
chrome.storage.sync.get('TweakTabSearchPatient', function (result) {
    console.log('TweakTabSearchPatient from storage:', result.TweakTabSearchPatient);
    if (result.TweakTabSearchPatient !== false) {
        if (window.location.href === 'https://secure.weda.fr/FolderMedical/FindPatientForm.aspx') {
            const idsSearchBox = 'ContentPlaceHolder1_FindPatientUcForm1_TextBoxRecherche';
            const validTarget = 'ContentPlaceHolder1_FindPatientUcForm1_PatientsGrid_LinkButtonPatientGetNomPrenom_0';
            console.log('TweakTabSearchPatient started');
            // Réorganise l'ordre de tabulation des éléments de la liste de patients
            ListTabOrderer(validTarget);
            // Place le focus sur le premier élément de la liste de patients
            const elementToFocus = document.getElementById(validTarget);
            if (elementToFocus) {
                elementToFocus.focus();
            }
            // Place un listener sur la searchbox (qui s'auto-entretiens à chaque recherche)
            SearchBoxEntryListener(idsSearchBox, validTarget, listTabOrderer = true);
        }
    }
});

// // Remove stuff

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



// // New functions in weda

// Enable the numpad in the prescription form
if (window.location.href.startsWith('https://secure.weda.fr/FolderMedical/PrescriptionForm.aspx')) {
    console.log('numpader started');
    // Make a dictionnary with keystrokes and their corresponding actions
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

// Tweak the FSE page (Add a button in the FSE page to send the amount to the TPE, implement shortcuts)
if (window.location.href.startsWith('https://secure.weda.fr/vitalzen/fse.aspx')) {
    console.log('fse started');
    // Make a dictionnary with keystrokes and their corresponding actions
    var index = {
        'n': ['mat-radio-9-input', 'mat-radio-3-input'],
        'o': ['mat-radio-8-input', 'mat-radio-2-input'],
        // add an entry for the enter key
        'Enter': 'secure_FSE',
    }
    var clue_index = {
        'n': ['mat-radio-9', 'mat-radio-3'],
        'o': ['mat-radio-8', 'mat-radio-2'],
    }

    // check if either of the two radio buttons is checked in id mat-radio-9 and mat-radio-8
    function YesNoButtonChecked(question_number) {
        var element1 = document.getElementById(index['n'][question_number]);
        var element2 = document.getElementById(index['o'][question_number]);
        if (element1.checked || element2.checked) {
            return true;
        } else {
            return false;
        }
    }
    // add a visual clue to the element with id element_id
    function addVisualClue(element_id) {
        var checkExist = setInterval(function() {
            var radioButton = document.getElementById(element_id);
            if (radioButton) {
                clearInterval(checkExist); // Arrête de vérifier une fois que l'élément est trouvé
                var labelContents = radioButton.getElementsByClassName('mat-radio-label-content');
                console.log('labelContents', labelContents);
                if (labelContents.length > 0) {
                    var labelContent = labelContents[0];
                    var text = labelContent.innerHTML;
                    console.log('Texte à souligner', text);
                    text = text.replace('N', '<span style="text-decoration: underline;">N</span>');
                    text = text.replace('O', '<span style="text-decoration: underline;">O</span>');
                    labelContent.innerHTML = text;
                }
            }
        }, 100); // Vérifie l'existence de l'élément toutes les 100ms
    }
    function removeVisualClue(element_id) {
        console.log('removeVisualClue', element_id);
        var radioButton = document.getElementById(element_id);
        if (radioButton) {
            var labelContents = radioButton.getElementsByClassName('mat-radio-label-content');
            console.log('labelContents', labelContents);
            if (labelContents.length > 0) {
                var labelContent = labelContents[0];
                var text = labelContent.innerHTML;
                console.log('Texte à de-souligner', text);
                text = text.replace('<span style="text-decoration: underline;">N</span>', 'N');
                text = text.replace('<span style="text-decoration: underline;">O</span>', 'O');
                labelContent.innerHTML = text;
            }
        }
    }

    // function setDefaultValue() {
    //     // set defaut value
    //     chrome.storage.sync.get('defaultCotation', function (result) {
    //         var defaultCotation = result.defaultCotation;
    //         // si defaultCotation n'est pas défini, le définir à ''
    //         if (!defaultCotation) {
    //             defaultCotation = '';
    //         }
    //         console.log('Je met la cotation par défaut : ', defaultCotation);

    //         var checkExist = setInterval(function() {
    //             var inputField = document.querySelector('.acteCell .mat-input-element');
    //             if (inputField) {
    //                 clearInterval(checkExist); // Arrête de vérifier une fois que l'élément est trouvé
    //                 inputField.value = defaultCotation;
    //             }
    //         }, 100); // Vérifie l'existence de l'élément toutes les 100ms
    //     });
    // }

    function setDefaultValue() {
        // set defaut value
        chrome.storage.sync.get('defaultCotation', function (result) {
            var defaultCotation = result.defaultCotation;
            // si defaultCotation n'est pas défini, le définir à ''
            if (!defaultCotation) {
                defaultCotation = '';
            }
            console.log('Je met la cotation par défaut : ', defaultCotation);

            var checkExist = setInterval(function() {
                var inputField = document.querySelector('.acteCell .mat-input-element');
                if (inputField) {
                    clearInterval(checkExist); // Arrête de vérifier une fois que l'élément est trouvé
                    for (let i = 0; i < defaultCotation.length; i++) {
                        var event = new KeyboardEvent('keydown', {
                            key: defaultCotation[i],
                            bubbles: true,
                            cancelable: true,
                        });
                        inputField.dispatchEvent(event);
                        inputField.value += defaultCotation[i];
                        var event = new Event('input', {
                            bubbles: true,
                            cancelable: true,
                        });
                        inputField.dispatchEvent(event);
                    }
                }
            }, 100); // Vérifie l'existence de l'élément toutes les 100ms
        });
    }
    // Add visual clues
    addVisualClue(clue_index['n'][0]);
    addVisualClue(clue_index['o'][0]); 


    // detect the press of keys in index, and check the corresponding element with clickElementById
    document.addEventListener('keydown', function (event) {
        if (event.key in index) {
            console.log('key pressed:', event.key);
            let element;
            if (!YesNoButtonChecked(0)) {
                console.log('No button checked on first yes/no question');
                element = document.getElementById(index[event.key][0]);
                setTimeout(function () {
                    addVisualClue(clue_index['n'][1]);
                    addVisualClue(clue_index['o'][1]);
                }, 100);
                setTimeout(function () {
                    removeVisualClue(clue_index['n'][0]);
                    removeVisualClue(clue_index['o'][0]);
                }, 100);

            } else if (YesNoButtonChecked(0) && !YesNoButtonChecked(1)) {
                element = document.getElementById(index[event.key][1]);
                console.log('A button is checked on first yes/no question but not the second one');
                setTimeout(function () {
                    removeVisualClue(clue_index['n'][1]);
                    removeVisualClue(clue_index['o'][1]);
                }, 100);
            } else {
                console.log('Both yes/no questions have an answer');
            }
            console.log('element to act on is', element);
            if (element && element.type === 'radio') {
                console.log('trying to check element', element);
                element.checked = true;
                element.dispatchEvent(new Event('change'));
            }
            if (YesNoButtonChecked(0) && YesNoButtonChecked(1)) {
                console.log('Both yes/no questions have an answer');
                var inputField = document.querySelector('.acteCell .mat-input-element');
                console.log('trying to focus on', inputField);
                if (inputField) {
                    setTimeout(function () {
                        inputField.focus();
                        setDefaultValue();
                    }, 100);
                }
            }
        }
    });
}


// TODO : ajouter d'autres fenêtres d'information
// TODO : basculer l'écoute du clavier sur keydown et keyup