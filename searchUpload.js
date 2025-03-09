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
            recordMetrics({ clicks: 1, drags: 1 });
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
                waitLegacyForElement(elementToLookFor, null, 1000, function () {
                    console.log('element found');
                    setupUIInteractions();
                    watchForEarlyDOMChanges();
                });
            }
        });
    }
}

function waitForLoadSpin(shouldAppear) {
    const interval = 50; // Intervalle de vérification en ms
    const timeout = 5000; // Durée maximale en ms
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
        const checkLoadSpin = () => {
            const loadSpin = document.querySelector('#ContentPlaceHolder1_progress');
            if (loadSpin) {
                const display = window.getComputedStyle(loadSpin).display;
                const conditionMet = shouldAppear ? display === 'block' : display === 'none';
                if (conditionMet) {
                    console.log(`loadSpin is ${shouldAppear ? 'visible' : 'hidden'}`);
                    resolve(true);
                } else {
                    console.log(`loadSpin is ${shouldAppear ? 'hidden' : 'visible'}`);
                    if (Date.now() - startTime >= timeout) {
                        reject(new Error(`Timeout: loadSpin did not ${shouldAppear ? 'appear' : 'disappear'} within 5 seconds`));
                    } else {
                        setTimeout(checkLoadSpin, interval);
                    }
                }
            } else {
                reject(new Error('loadSpin element not found'));
            }
        };

        checkLoadSpin();
    });
}


// place a listner on all patients names (ContentPlaceHolder1_FindPatientUcForm1_PatientsGrid_LinkButtonPatientGetNomPrenom_0 etc.)
function PatientSelectEntryListener() {
    console.log('[debug] PatientSelectEntryListener started');
    // place a listener on all elements starting with ContentPlaceHolder1_FindPatientUcForm1_PatientsGrid_LinkButtonPatientGetNomPrenom_
    var elements = document.querySelectorAll(
        '[id^="ContentPlaceHolder1_FindPatientUcForm1_PatientsGrid_LinkButtonPatientGetNomPrenom_"], ' + // mode horizontal
        '[id^="ContentPlaceHolder1_FindPatientUcForm2_PatientsGrid_LinkButtonPatientGetNomPrenom_"]'); // mode vertical
    for (var i = 0; i < elements.length; i++) {
        console.log('added event listener to patient name', elements[i]);
        elements[i].addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                console.log('Enter pressed on patient name');
                waitForLoadSpin(true).then(() => {
                    waitForLoadSpin(false).then(() => {
                        setTimeout(function () {
                            highlightDate();
                        }, 300);
                    })
                });
            }
        });
    }
}





// // Tab and search tweaks
// [Page d'upload] Tweak the uploader page
addTweak('/FolderMedical/UpLoaderForm.aspx', 'TweakImports', function () {
    // Modifie la taille de la fenêtre de prévisualisation du PDF
    function uploaderformResizeElements() {
        const newsize = '600px';
        const pdfViewer = document.querySelector('#ContentPlaceHolder1_ViewPdfDocumentUCForm1_PanelViewDocument');
        if (pdfViewer) {
            pdfViewer.style.height = newsize;
            // en gros évite un drag (molette)
            recordMetrics({ drags: 1 });
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
        // Ajouter l'élément .grid-pager rd a à la fin de l'ordre de tabulation
        var actualPagePager = document.querySelector('.grid-pager span');
        if (actualPagePager) {
            var nextAnchor = actualPagePager.nextElementSibling;
            if (nextAnchor && nextAnchor.tagName.toLowerCase() === 'a') {
                nextAnchor.tabIndex = tabIndex;
                // Ajout d'un listener sur nextAnchor pour renvoyer le focus vers le premier élément de la liste de patients
                nextAnchor.addEventListener('keydown', function (event) {
                    if (event.key === 'Enter') {
                        setTimeout(function () {
                            const firstPatientElement = document.getElementById('ContentPlaceHolder1_FileStreamClassementsGrid_LinkButtonFileStreamClassementsGridPatientNom_0');
                            if (firstPatientElement) {
                                firstPatientElement.focus();
                            }
                        }, 500);
                    }
                });
            }
        }

        // Ajouter un listener sur tout les #ContentPlaceHolder1_FileStreamClassementsGrid_EditBoxGridFileStreamClassementDate_
        // pour renvoyer le focus vers #ContentPlaceHolder1_FindPatientUcForm1_TextBoxRecherchePatientByDate 
        const dateElements = document.querySelectorAll('[id^="ContentPlaceHolder1_FileStreamClassementsGrid_EditBoxGridFileStreamClassementDate_"]');
        dateElements.forEach(function (dateElement) {
            dateElement.addEventListener('keydown', function (event) {
                const searchBox = document.getElementById('ContentPlaceHolder1_FindPatientUcForm1_TextBoxRecherchePatientByDate');
                if (event.key === 'Tab' && event.shiftKey && searchBox) {
                    event.preventDefault(); // Inhibe le comportement par défaut de Shift+Tab
                    if (searchBox) {
                        searchBox.focus();
                        searchBox.select();
                    }
                }
            });
        });


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
        } else if (!validDayLengths.includes(length)) {
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
                    const keyStrokes = 10 - textField.value.length;
                    recordMetrics({ keyStrokes: keyStrokes });
                }
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
    function uploaderformSetup(verticalMode) {
        if (!verticalMode) {
            uploaderformResizeElements();
        }
        uploaderformSetTabOrder();
        SearchBoxEntryListener(idsSearchBox, validTarget, true);
        addEventListeners();
    };

    let verticalModeCheckBox = document.getElementById('ContentPlaceHolder1_CheckBoxHorizontal');

    // L'ID de la searchbox change en fonction du mode d'affichage
    let verticalMode = verticalModeCheckBox.checked;
    let idsSearchBox = '';
    let validTarget = '';
    if (verticalMode) {
        console.log('Mode vertical');
        idsSearchBox = 'ContentPlaceHolder1_FindPatientUcForm2_TextBoxRecherche';
        validTarget = 'ContentPlaceHolder1_FindPatientUcForm2_PatientsGrid_LinkButtonPatientGetNomPrenom_0';
    } else {
        console.log('Mode horizontal');
        idsSearchBox = 'ContentPlaceHolder1_FindPatientUcForm1_TextBoxRecherche';
        validTarget = 'ContentPlaceHolder1_FindPatientUcForm1_PatientsGrid_LinkButtonPatientGetNomPrenom_0';
    }

    // Create a MutationObserver instance to watch for changes in the DOM
    var observer = new MutationObserver(function (mutations) {
        uploaderformSetup(verticalMode);
    });

    // Start observing the document with the configured parameters
    observer.observe(document, { childList: true, subtree: true });

    uploaderformSetup(verticalMode);
});


// [Page de prescriptions] Tweaks the prescription page to select the first medicine after a search
addTweak('/FolderMedical/PrescriptionForm.aspx', '*TweakPrescription', function () {
    var idsSearchBox = 'ContentPlaceHolder1_BaseVidalUcForm1_TextBoxFindPack';
    var validTarget = 'ContentPlaceHolder1_BaseVidalUcForm1_VidalPacksGrid_LinkButtonVidalPacksGridName_0';
    SearchBoxEntryListener(idsSearchBox, validTarget);
});

// [Page de recherche patient] Tweaks the search patient page to select the first patient after a search
addTweak('/FolderMedical/FindPatientForm.aspx', 'TweakTabSearchPatient', function () {
    chrome.storage.local.get('searchTime', function (result) {
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
                recordMetrics({ clicks: 1, drags: 1 });
            }
            // Place un listener sur la searchbox (qui s'auto-entretiens à chaque recherche)
            SearchBoxEntryListener(idsSearchBox, validTarget, true);
        } else {
            console.log('délais depuis le dernier alt+r :', timeDifferenceInSeconds, 'secondes donc la page est appellée depuis alt+r donc on ne lance pas le tweak. Le focus est naturellement dans la case de recherche.');
            SearchBoxEntryListener(idsSearchBox, validTarget, true);
        }
    });
});