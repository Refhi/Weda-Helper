// Modifie l'order de tabulation des éléments d'une liste
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
                elementToLookFor = '[id^="' + validTarget + '"]';
                waitForElement(elementToLookFor, null, 1000, function () {
                    console.log('element found');
                    setupUIInteractions();
                    watchForEarlyDOMChanges();
                });
            }
        });
    }
}



// // Tab and search tweaks
// [Page d'upload] Tweak the uploader page
chrome.storage.local.get('TweakImports', function (result) {
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


// [Page de prescriptions] Tweaks the prescription page to select the first medicine after a search
chrome.storage.local.get('TweakTabPrescription', function (result) {
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
if (window.location.href === 'https://secure.weda.fr/FolderMedical/FindPatientForm.aspx') {
    chrome.storage.local.get(['TweakTabSearchPatient', 'searchTime'], function (result) {
        console.log('TweakTabSearchPatient from storage:', result.TweakTabSearchPatient);
        if (result.TweakTabSearchPatient !== false) {
            var currentTime = Date.now();
            var timeDifference = currentTime - result.searchTime;
            var timeDifferenceInSeconds = timeDifference / 1000;
            const idsSearchBox = 'ContentPlaceHolder1_FindPatientUcForm1_TextBoxRecherche';
            const validTarget = 'ContentPlaceHolder1_FindPatientUcForm1_PatientsGrid_LinkButtonPatientGetNomPrenom_0';
            if (timeDifferenceInSeconds >= 5 || isNaN(timeDifferenceInSeconds)) {
                console.log('délais depuis le dernier alt+r :', timeDifferenceInSeconds, 'secondes donc on lance le tweak');
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
            } else {
                console.log('délais depuis le dernier alt+r :', timeDifferenceInSeconds, 'secondes donc la page est appellée depuis alt+r donc on ne lance pas le tweak. Le focus est naturellement dans la case de recherche.');
                SearchBoxEntryListener(idsSearchBox, validTarget, listTabOrderer = true);
            }
        }
    });
}