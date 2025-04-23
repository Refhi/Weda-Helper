// // Page de prescription
let demandeUrl = '/FolderMedical/DemandeForm.aspx'
let prescriptionUrl = '/FolderMedical/PrescriptionForm.aspx'
let DemandeForm = window.location.href.startsWith(`${baseUrl}${demandeUrl}`);
let PrescriptionForm = window.location.href.startsWith(`${baseUrl}${prescriptionUrl}`);
if (PrescriptionForm) {
    var isFirstCall = true;
    var firstCallTimeStamp = Date.now();
    chrome.storage.local.set({ medSearchText: '' });
    // maintient le texte d'un type de recherche à l'autre et ajoute des boutons de recherche
    getOption(['keepMedSearch', 'addMedSearchButtons'], function ([keepMedSearch, addMedSearchButtons]) {
        console.log('keepMedSearch', keepMedSearch, 'addMedSearchButtons', addMedSearchButtons);

        function storeSearchSelection() {
            var inputField = document.getElementById('ContentPlaceHolder1_BaseVidalUcForm1_TextBoxFindPack');
            if (inputField) {
                console.log('Le texte de recherche actuel est ', inputField.value, 'je le stocke localement suite à sa modification');
                chrome.storage.local.set({ medSearchText: inputField.value });
            } else {
                console.log('Le champ d\'entrée n\'a pas été trouvé');
            }
        }

        function searchTextKeeper() {
            // il semble nécessaire de répéter la recherche de l'élément pour éviter les erreurs
            waitForElement({
                selector: '#ContentPlaceHolder1_BaseVidalUcForm1_TextBoxFindPack',
                callback: function () {
                    var searchTextField = document.getElementById('ContentPlaceHolder1_BaseVidalUcForm1_TextBoxFindPack');
                    if (searchTextField) {
                        console.log('searchTextKeeper started sur ', searchTextField);
                        if (!searchTextField.getAttribute('data-hasListener')) { // éviter d'ajouter plusieurs écouteurs
                            searchTextField.addEventListener('input', function () {
                                // Stocker la valeur de inputField dans medSearchText lorsque le texte est modifié
                                storeSearchSelection();
                            });
                            searchTextField.setAttribute('data-hasListener', 'true');
                        }
                    } else {
                        console.log('searchTextKeeper non démarré car searchTextField non trouvé');
                    }
                }
            });
        }

        // Fonction pour trier le texte de recherche
        function textSorter() {
            var inputField = document.getElementById('ContentPlaceHolder1_BaseVidalUcForm1_TextBoxFindPack');
            var selectMenu = document.getElementById('ContentPlaceHolder1_BaseVidalUcForm1_DropDownListRecherche');

            console.log('textSorter started');

            // Obtenez la valeur actuelle du menu déroulant
            var medSearchSelectionCurrent = selectMenu.value;
            chrome.storage.local.get(['medSearchSelection', 'medSearchText'], function (result) {
                var medSearchSelection = result.medSearchSelection;
                var medSearchText = result.medSearchText;
                // Si la valeur stockée localement est différente de la valeur actuelle
                console.log('medSearchSelection est ', medSearchSelection, 'et medSearchSelectionCurrent est ', medSearchSelectionCurrent);
                console.log('medSearchText est ', medSearchText, 'et inputField.value est ', inputField.value);
                if (medSearchText !== inputField.value && medSearchSelection !== medSearchSelectionCurrent) {
                    typeText(medSearchText);
                } else if (medSearchText && inputField.value === '') {
                    typeText(medSearchText);
                }

            });
        }

        function typeText(savedValue) {
            console.log('typeText started');
            if (savedValue !== undefined) {
                console.log('typeText started with savedValue', savedValue);
                var inputField = document.getElementById('ContentPlaceHolder1_BaseVidalUcForm1_TextBoxFindPack');
                setTimeout(function () {
                    inputField.value = savedValue;
                    const keyStrokes = savedValue.length;
                    recordMetrics({ keyStrokes: keyStrokes });
                    var button = document.getElementById('ContentPlaceHolder1_BaseVidalUcForm1_ButtonFind');
                    button.click();
                    recordMetrics({ clicks: 1, drags: 1 });
                }, 10);
            }
        }

        function addMedSearchButtonsFunction() {
            console.log('addMedSearchButtons started');
            var dropDownList = {
                "1": { fullText: "Médicaments", shortText: "Med" },
                "14": { fullText: "Recherche par produits", shortText: "Prod" },
                "8": { fullText: "Dénomination commune (DCI)", shortText: "DCI" },
                "2": { fullText: "Molécules (principes actifs)", shortText: "PA" },
                "10": { fullText: "Recherche par U.C.D.", shortText: "UCD" },
                "3": { fullText: "Recherche par A.T.C.", shortText: "ATC" },
                "13": { fullText: "Recherche par Vidal", shortText: "Vid" },
                "4": { fullText: "Indications", shortText: "Ind" },
                "5": { fullText: "Groupe d'indications", shortText: "Ind" },
                "6": { fullText: "Laboratoires", shortText: "Lab" },
                "7": { fullText: "Vos favoris et perso.", shortText: "Fav" },
                "9": { fullText: "Le Top 50", shortText: "Top" }
            };
            var selectMenu = document.getElementById('ContentPlaceHolder1_BaseVidalUcForm1_DropDownListRecherche');
            var parentElement = selectMenu.parentElement;

            function makeOnClickFunction(value) {
                return function () {
                    console.log('boutonRecherche-' + value, 'cliqué');
                    storeSearchSelection();
                    selectMenu.value = value;
                };
            }

            var optionsBoutonRecherche = Object.keys(dropDownList).map(function (key) {
                return 'boutonRecherche-' + key;
            });

            chrome.storage.local.get(optionsBoutonRecherche, function (result) {
                for (var key in dropDownList) {
                    // Ajoutez le préfixe à la clé avant de vérifier l'option
                    var storageKey = 'boutonRecherche-' + key;
                    let defautOptions = ['boutonRecherche-1', 'boutonRecherche-2', 'boutonRecherche-8'];

                    // Vérifiez si l'option pour cette clé est activée
                    if (result[storageKey] === true || (result[storageKey] === undefined && defautOptions.includes(storageKey))) {
                        // Ajoutez un identifiant unique à chaque bouton
                        var buttonId = 'button-search-' + key;

                        // Vérifiez si un bouton avec cet identifiant existe déjà
                        if (document.getElementById(buttonId)) {
                            continue; // Si c'est le cas, passez à la prochaine itération de la boucle
                        }

                        var button = document.createElement('button');
                        button.id = buttonId; // Attribuez l'identifiant au bouton
                        button.textContent = dropDownList[key].shortText;
                        button.title = dropDownList[key].fullText;
                        button.style.marginRight = '5px';
                        button.style.display = 'inline-block';
                        button.className = 'buttonheader find';
                        button.onmousedown = makeOnClickFunction(key);
                        parentElement.insertBefore(button, selectMenu);
                    }
                }
            });
        }

        function onDOMChange() {
            var panneau = document.querySelector('.paneltransparentpopup');
            var panneau2 = document.querySelector('.panelpopup');
            console.log('onDOMChange started', panneau);
            if (!panneau && !panneau2) {
                console.log('onDOMChange started et aucun panneau présent');
                if (keepMedSearch) {
                    console.log('keepMedSearch started');
                    searchTextKeeper();
                    if (!isFirstCall && Date.now() - firstCallTimeStamp > 1000) {
                        textSorter();
                    }
                    isFirstCall = false;
                }
                if (addMedSearchButtons) {
                    addMedSearchButtonsFunction();
                }
            } else {
                console.log('onDOMChange non démarré car panneau présent');
                if (keepMedSearch !== false) {
                    console.log('keepMedSearch started');
                    searchTextKeeper();
                }
            }
        }

        waitForElement({
            selector: '#ContentPlaceHolder1_BaseVidalUcForm1_DropDownListRecherche',
            callback: onDOMChange
        });
        onDOMChange() // a priori nécessaire sur certains setups en plus du waitForElement
    });
}

addTweak(prescriptionUrl, 'autoOpenOrdoType', function () {
    document.getElementById('ContentPlaceHolder1_ButtonPrescritionType').click();
    waitForElement({
        selector: "#ContentPlaceHolder1_BaseGlossaireUCForm2_UpdatePanelDocument",
        callback: function () {
            var inputField = document.getElementById('ContentPlaceHolder1_BaseVidalUcForm1_TextBoxFindPack');
            if (inputField) {
                inputField.focus();
            }
        }
    });
});

addTweak(prescriptionUrl, 'AlertOnMedicationInteraction', function () {
    waitForElement({
        selector: "div.imgInter4",
        callback: function (elements) { //Déclenché en cas de présence d'une contre-indication absolue
            var interactions = [];
            for (element of elements) {
                if (!interactions.includes(element.title)) {
                    interactions.push(element.title);
                    var interactionDiv = document.createElement("div");
                    interactionDiv.style = "padding: .75rem 1.25rem; color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: .25rem; margin-bottom: 1rem; margin-top: 1rem;"
                    interactionDiv.textContent = element.title;
                    let node = document.getElementById('ContentPlaceHolder1_PrescriptionsGrid');
                    let parentNode = node.parentNode;
                    parentNode.insertBefore(interactionDiv, node);
                }
            }
        }
    });
});

addTweak(prescriptionUrl, 'KeyPadPrescription', function () {
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
        ',': 'SetQuantite(\',\');',
        'Backspace': 'AnnulerQuantite();',
        'à': 'SetQuantite(\' à \');',
    };

    document.addEventListener('keydown', function (event) {
        console.log('event.key', event.key);
        if (event.key in index) {
            console.log('key pressed:', event.key);
            clickElementByOnclick(index[event.key]);
        }
    });
});

function validateOrdoNumIfOptionActivated() {
    console.log('[validateOrdoNumIfOptionActivated] started');
    getOption('autoValidateOrdoNum', function (autoValidateOrdoNum) {
        if (autoValidateOrdoNum) {
            let buttonValider = document.querySelector('.cdk-overlay-container .mat-raised-button[type="submit"]')
            console.log('[validateOrdoNumIfOptionActivated] buttonValider', buttonValider);
            buttonValider.click();
            recordMetrics({ clicks: 1, drags: 1 });
        }
    });
}

// autoclique le bouton de consentement de l'ordonnance numérique
addTweak([demandeUrl, prescriptionUrl], 'autoConsentNumPres', function () {
    function addYesNoChoiceBox(consent) {
        var optionOrdoNumElement = document.getElementById('ContentPlaceHolder1_EvenementUcForm1_CheckBoxEPrescription');
        console.log('autoConsentNumPres started');
        var checkbox = optionOrdoNumElement;
        console.log('checkbox', checkbox);

        // Si les boutons radio existent déjà, on ne les recrée pas
        if (document.getElementById('autoConsentNumPres_Oui') || document.getElementById('autoConsentNumPres_Non')) {
            return;
        }

        function createRadioButton(id, value, labelText) {
            var radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'autoConsentNumPres';
            radio.value = value;
            radio.id = id;
            radio.title = 'Mon patient ou et le ou les titulaire(s) de l\'autorité parentale a (ont) accepté que je puisse consulter ce qui a été délivré ou exécuté sur la présente prescription';

            var label = document.createElement('label');
            label.htmlFor = id;
            label.textContent = labelText;

            return { radio: radio, label: label };
        }

        var radioOuiObj = createRadioButton('autoConsentNumPres_Oui', 'true', 'Oui');
        var radioNonObj = createRadioButton('autoConsentNumPres_Non', 'false', 'Non');

        if (consent === true) {
            radioOuiObj.radio.checked = true;
        } else if (consent === false) {
            radioNonObj.radio.checked = true;
        }

        radioOuiObj.radio.addEventListener('change', function () {
            if (radioOuiObj.radio.checked) {
                consent = true;
                sessionStorage.setItem('consent', 'true');
            }
        });

        radioNonObj.radio.addEventListener('change', function () {
            if (radioNonObj.radio.checked) {
                consent = false;
                sessionStorage.setItem('consent', 'false');
            }
        });

        var container = document.createElement('div');
        container.style.display = 'none'; // Initialement caché
        container.appendChild(radioOuiObj.radio);
        container.appendChild(radioOuiObj.label);
        container.appendChild(radioNonObj.radio);
        container.appendChild(radioNonObj.label);

        checkbox.parentElement.insertBefore(container, checkbox);

        function addMouseOuverListener(element) {
            element.addEventListener('mouseover', function () {
                container.style.display = 'block';
            });
        }
        addMouseOuverListener(checkbox);
        addMouseOuverListener(checkbox.nextElementSibling);
    }


    getOption('autoConsentNumPres_Oui', function (autoConsentNumPres_Oui) {
        // Renvoie le consentement à utiliser (le sessionConsent étant prioritaire)
        function getConsent() {
            let sessionConsent = sessionStorage.getItem('consent');
            if (sessionConsent) {
                return sessionConsent === 'true';
            }
            return autoConsentNumPres_Oui;
        }
        addYesNoChoiceBox(getConsent());

        waitForElement({
            selector: '#ContentPlaceHolder1_EvenementUcForm1_CheckBoxEPrescription',
            callback: function () {
                addYesNoChoiceBox(getConsent());
            }
        });


        waitForElement({
            selector: '.cdk-overlay-container .mat-radio-label',
            callback: function (elements) {

                if (getConsent()) {
                    elements[0].click();
                } else {
                    elements[1].click();
                }

                recordMetrics({ clicks: 1, drags: 1 });

                if (PrescriptionForm) { //Pas de selection du type de l'ordonnance donc on valide une fois le consentement coché
                    validateOrdoNumIfOptionActivated();
                }
            }
        });
    });
});

function isElementSelected(elementid) {
    let element = document.getElementById(elementid);
    if (element && element.style.color.toLowerCase() === 'red' && element.style.fontWeight.toLowerCase() == 'bold')
        return true;
    else
        return false;
}

// Selectionne automatiquement l'ordonnance numérique sur les pages souhaitées
// pas vraiment possible d'utiliser addTweak correctement ici car on est à cheval entre deux pages et deux options...
addTweak([demandeUrl, prescriptionUrl], '*NumPres', function () {
    getOption(['NumPresDemande', 'NumPresPrescription'], function ([NumPresDemande, NumPresPrescription]) {
        let checkboxInitiale = document.getElementById('ContentPlaceHolder1_EvenementUcForm1_CheckBoxEPrescription');
        let ordoNumeriquePreCoche = checkboxInitiale && checkboxInitiale.checked;

        function changeCheckBoxViaClick(valueRequested) {
            var checkbox = document.getElementById('ContentPlaceHolder1_EvenementUcForm1_CheckBoxEPrescription');
            if (checkbox) {
                console.log('checkbox checked', checkbox.checked, 'valueRequested', valueRequested);
                if (checkbox.checked !== valueRequested) {
                    checkbox.click();
                    recordMetrics({ clicks: 1, drags: 1 });
                }
            } else {
                console.log('checkbox non trouvé');
            }
        }


        if (NumPresDemande || NumPresPrescription) {
            ordoNumeriquePreCoche = true; // quand on a une des optiosn activées, ça signifie que de base on veut que ça soit coché
            if (DemandeForm) {
                changeCheckBoxViaClick(NumPresDemande);
            } else if (PrescriptionForm) {
                changeCheckBoxViaClick(NumPresPrescription);
            }
        }
    });
});

// Selectionne automatiquement le type de prescription numérique
addTweak(demandeUrl, 'autoSelectTypeOrdoNum', function () {
    const typesSoins = [
        { regex: /\bIDE\b|infirmier|pansement|injection/i, type: 0 },
        { regex: /\bkiné\b|\bkine\b|kinésithérapie|kinesitherapie|MKDE|KDE|kinesitherapeute|kinesithérapeute/i, type: 1 },
        { regex: /orthophonie|orthophonique|orthophoniste/i, type: 2 },
        { regex: /orthoptie|orthoptique|orthoptiste/i, type: 3 },
        { regex: /pédicure|pedicure|pédicurie|pedicurie|podologie|podologique|podologue|semelle|orthoplastie/i, type: 4 },
        { regex: /psychologue|psychologie/i, type: 99 },
    ];

    let contexteSoins = [
        { regex: /domicile/i, checkBoxText: " Soins à réaliser à domicile " },
        { regex: /urgent|urgence/i, checkBoxText: " Prescription à caractère urgent " },
        { regex: /prevention|prévention/i, checkBoxText: " Prescription dans le cadre de la prévention " },
    ]

    function checkContexteSoins(demandeContent, callback) {
        waitForElement({
            selector: '.horCBoxWithLabel > span',
            justOnce: true,
            callback: function (checkBoxElements) {
                console.log('checkContexteSoins déclenché', demandeContent);
                contexteSoins.forEach(contexte => {
                    if (contexte.regex.test(demandeContent)) {
                        checkBoxElements.forEach(element => {
                            let checkBoxInput = element.parentElement.querySelector('mat-checkbox > label > span > input');
                            if (element.textContent === contexte.checkBoxText) {
                                checkBoxInput.click();
                            }
                        });
                    }
                    if (callback) { callback(); }
                });
            }
        });
    }

    // Déterminer quel ligne il faut cliquer dans le menu déroulant
    function determinerTypeSoin(demandeContent) {
        for (let soin of typesSoins) {
            if (soin.regex.test(demandeContent)) {
                return soin.type;
            }
        }
        return null; // Retourne null si aucun type de soin n'est trouvé
    }


    function clickDropDownMenuWhenObserved(callback) {
        waitForElement({
            selector: '#prescriptionType div',
            justOnce: true,
            callback: function (elements) {
                console.log('menu déroulant trouvé, je clique dessus', elements);
                elements[0].click();
                recordMetrics({ clicks: 1, drags: 1 });
                callback();
            }
        });
    }



    function clickOnProperDropDownOption(demandeContent, callback) {
        let choixPossibles = document.querySelectorAll('.mat-option-text');
        var type = null;
        let isLab = isElementSelected('ContentPlaceHolder1_BaseGlossaireUCForm1_LabelILAnalyses');
        let isImagerie = isElementSelected('ContentPlaceHolder1_BaseGlossaireUCForm1_LabelILRadio');

        if (isImagerie) {
            console.log("Imagerie: Ordonnance numérique non réalisable");
            return;
        }
        else if (isLab)
            type = 0;
        else
            type = determinerTypeSoin(demandeContent);

        if (type === null) {
            console.log("Type de soin non détecté, je laisse l'utilisateur sélectionner le bon");
        }

        else {
            console.log('type de soin trouvé', type, 'je clique dessus', choixPossibles[type]);
            if (type === 99) {
                console.log("[autoSelectTypeOrdoNum] Type de soin non éligible à l'ordonnance numérique, je clique sur 'Continuer sans l'ordonnance numérique'");
                // Type de soin non éligible à l'ordonnance numérique, je clique sur #targetAnnuler
                const targetAnnuler = document.querySelectorAll('.mat-button-wrapper');
                // Rechercher le texte Continuez sans l'ordonnance numérique et cliquer dessus
                targetAnnuler.forEach(function (element) {
                    if (element.textContent === "Continuez sans l'ordonnance numérique") {
                        console.log("[autoSelectTypeOrdoNum] 'Continuez sans l'ordonnance numérique' trouvé, je clique dessus, element", element);
                        element.click();
                    }
                });
            } else {
                choixPossibles[type].click();
            }
            recordMetrics({ clicks: 1, drags: 1 });
            if (callback) { callback(); }

        }
    };


    waitForElement({
        selector: '.mat-dialog-title',
        textContent: 'Création d\'une ordonnance numérique',
        callback: function (element) {
            console.log("menu 'Création d'une ordonnance numérique' trouvé", element);
            setTimeout(function () { // attendre un peu pour que le contenu de l'iframe soit chargé
                let demandeContent = '';
                let horsALDFrame = document.querySelector("#CE_ContentPlaceHolder1_EditorPrescription_ID_Frame");
                let ALDFrame = document.querySelector("#CE_ContentPlaceHolder1_EditorPrescriptionBizone_ID_Frame");
                if (horsALDFrame && horsALDFrame.contentWindow && horsALDFrame.contentWindow.document.body) {
                    demandeContent += horsALDFrame.contentWindow.document.body.innerText;
                }
                if (ALDFrame && ALDFrame.contentWindow && ALDFrame.contentWindow.document.body) {
                    demandeContent += " " + ALDFrame.contentWindow.document.body.innerText; // Ajout d'un espace pour séparer le contenu des deux iframes
                }

                console.log('[demandeContent]', demandeContent);
                clickDropDownMenuWhenObserved(function () {
                    clickOnProperDropDownOption(demandeContent, function () {
                        checkContexteSoins(demandeContent, function () {
                            validateOrdoNumIfOptionActivated();
                        });
                    });
                });
            }, 400);
        }
    });
});


// Automatiquement basculer le contenu de l'ordonnance entre les zones ALD et hors ALD
addTweak(demandeUrl, '*autoSwitchALD', function () {
    waitForElement({
        selector: '#ContentPlaceHolder1_ButtonBizone',
        justOnce: false,
        callback: function (elements) {
            console.log('Listener ajouté sur #ContentPlaceHolder1_ButtonBizone', elements);
            elements[0].addEventListener('click', function () {
                console.log('autoSwitchALD déclenché');
                waitForElement({
                    selector: '#ContentPlaceHolder1_ButtonInversion',
                    justOnce: true,
                    callback: function (elements) {
                        elements[0].click();
                        recordMetrics({ clicks: 1, drags: 1 });
                    }
                });
            });
        }
    });
});

// Appuie automatiquement sur "Continuer sans l'ordonnance numérique" si l'option est activée
addTweak(prescriptionUrl, 'autoContinueWithoutNumPres', function () {
    waitForElement({
        selector: 'button > span',
        justOnce: true,
        textContent: 'Continuez sans l\'ordonnance numérique',
        callback: function (elements) {
            console.log('autoContinueWithoutNumPres déclenché');
            elements[0].click();
            recordMetrics({ clicks: 1, drags: 1 });
        }
    });
});


// Création d'un type de recherche par défaut dans la page de prescription
addTweak(prescriptionUrl, '*defautSearchType', async function () {
    const defautSearchType = await getOptionPromise('defautSearchType');
    if (defautSearchType === "0" || defautSearchType === 0) { return; }
    console.log('[defautSearchType] le type par défaut est', defautSearchType);
    let searchMenu = document.getElementById('ContentPlaceHolder1_BaseVidalUcForm1_DropDownListRecherche');
    if (searchMenu.value === defautSearchType) { return; }
    console.log('[defautSearchType] je change le type de recherche par défaut pour', defautSearchType, 'de', searchMenu.value);
    searchMenu.value = defautSearchType;
    recordMetrics({ clicks: 2, drags: 2 });
});



// Changement des durées de prescription globale
addTweak(prescriptionUrl, '*changeDureePrescription', async function () {
    // On ajoute les boutons
    afterMutations({
        delay: 100,
        callBackId: 'changeDureePrescription',
        callback: addTreatmentDurationButtons,
    });
    addTreatmentDurationButtons();

    // Si on est en processing, on continue le traitement
    if (sessionStorage.getItem('dureePrescriptionProcessing') === 'true') {
        console.log('[changeDureePrescription] Processing en cours');
        await changePrescriptionDurationCore();
        return;
    }
});


async function changePrescriptionDurationCore(duration = null, durationType = null) {
    console.log('[changeDureePrescription] started', duration, durationType);
    const storageKeys = {
        processed: 'dureePrescriptionProcessed',
        processing: 'dureePrescriptionProcessing',
        duration: 'dureePrescriptionDuration',
        durationType: 'dureePrescriptionDurationType'
    };

    try {
        // Restaurer ou sauvegarder les valeurs de durée et type
        if (duration !== null && durationType !== null) {
            // Sauvegarde des nouveaux paramètres
            sessionStorage.setItem(storageKeys.duration, duration);
            sessionStorage.setItem(storageKeys.durationType, durationType);
        } else {
            // Restauration des paramètres précédemment sauvegardés
            duration = sessionStorage.getItem(storageKeys.duration);
            durationType = sessionStorage.getItem(storageKeys.durationType);

            if (!duration || !durationType) {
                console.error(`[changeDureePrescription] Aucune durée ou type de durée stocké`);
                clearProcessState(storageKeys);
                return;
            }
        }

        // Récupérer l'état actuel du traitement
        const processState = getPrescriptionProcessState(storageKeys);
        const { processedLines, isProcessing } = processState;

        // Vérifier si le traitement est déjà terminé
        const prescriptionLines = returnPrescriptionLines();
        if (isProcessing && processedLines.length > 0 && processedLines.length >= prescriptionLines.length) {
            console.log(`[changeDureePrescription] Toutes les lignes ont été traitées, nettoyage du stockage`);
            clearProcessState(storageKeys);
            return;
        }

        console.log(`[changeDureePrescription] Changement de la durée de traitement à ${duration} ${durationType}`);
        console.log(`[changeDureePrescription] Lignes déjà traitées: ${processedLines.length}`);
        console.log(`[changeDureePrescription] ${prescriptionLines.length} lignes de prescription trouvées`);

        // Sortir si aucune ligne n'est trouvée
        if (prescriptionLines.length === 0) {
            console.log(`[changeDureePrescription] Aucune ligne trouvée, nettoyage du stockage`);
            clearProcessState(storageKeys);
            return;
        }

        // Marquer que nous sommes en train de traiter des lignes
        sessionStorage.setItem(storageKeys.processing, 'true');

        // Trouver la prochaine ligne à traiter
        const nextLine = findNextLineToProcess(prescriptionLines, processedLines);

        if (nextLine) {
            const { lineElement, lineIndex } = nextLine;
            console.log(`[changeDureePrescription] Traitement de la ligne ${lineIndex}`);

            const posoNextLine = returnPosoLineContent(lineIndex);
            if (posoNextLine) {
                console.log(`[changeDureePrescription] Posologie ligne à traiter trouvée: ${posoNextLine}`);
            }

            if (posoNextLine === null || posoNextLine === undefined || posoNextLine === '') {
                console.log('[changeDureePrescription] Pas de posologie trouvée, passage à la ligne suivante');
                // Ajouter la ligne traitée à notre liste
                processedLines.push(lineIndex);
                sessionStorage.setItem(storageKeys.processed, JSON.stringify(processedLines));
                changePrescriptionDurationCore();
            } else {
                // Traiter la ligne
                await processPrescriptionLine(lineElement, duration, durationType);
                // Ajouter la ligne traitée à notre liste
                processedLines.push(lineIndex);
                sessionStorage.setItem(storageKeys.processed, JSON.stringify(processedLines));
                // Valider (va provoquer un rechargement de page)
                validateTreatment();
            }


        } else {
            console.log(`[changeDureePrescription] Toutes les lignes ont été traitées, nettoyage du stockage`);
            clearProcessState(storageKeys);
        }
    } catch (error) {
        console.error(`[changeDureePrescription] Erreur: ${error.message}`);
        // Nettoyer l'état en cas d'erreur pour éviter de bloquer le traitement
        clearProcessState(storageKeys);
    }
}

// Récupère l'état actuel du traitement depuis sessionStorage
function getPrescriptionProcessState(storageKeys) {
    const processedLines = JSON.parse(sessionStorage.getItem(storageKeys.processed) || '[]');
    const isProcessing = sessionStorage.getItem(storageKeys.processing) === 'true';
    return { processedLines, isProcessing };
}

// Nettoie les données de session liées au traitement
function clearProcessState(storageKeys) {
    sessionStorage.removeItem(storageKeys.processed);
    sessionStorage.removeItem(storageKeys.processing);
    sessionStorage.removeItem(storageKeys.duration);
    sessionStorage.removeItem(storageKeys.durationType);
}

// Trouve la prochaine ligne à traiter
function findNextLineToProcess(prescriptionLines, processedLines) {
    let nextLineIndex = 0;
    while (nextLineIndex < prescriptionLines.length && processedLines.includes(nextLineIndex)) {
        nextLineIndex++;
    }

    if (nextLineIndex < prescriptionLines.length) {
        return {
            lineElement: prescriptionLines[nextLineIndex],
            lineIndex: nextLineIndex
        };
    }

    return null;
}

// Traite une ligne de prescription (ouvre, définit durée et type)
async function processPrescriptionLine(lineElement, duration, durationType) {
    await openPrescriptionLine(lineElement);
    await setTreatmentDuration(duration);
    setTreatmentDurationType(durationType);
}


// 0 - Faire une liste avec les différentes lignes de prescription, peu importe leur nombre
function returnPrescriptionLines() {
    const baseId = 'ContentPlaceHolder1_PrescriptionsGrid_LinkButtonPrescriptionCommonNameGroupName_';
    let prescriptionLines = [];
    let i = 0;
    let line;

    // Boucle jusqu'à ce qu'il n'y ait plus de ligne à trouver
    while (line = document.getElementById(baseId + i)) {
        prescriptionLines.push(line);
        i++;
    }

    console.log(`[returnPrescriptionLines] ${prescriptionLines.length} lignes de prescription trouvées`);
    return prescriptionLines;
}

// 1 - cliquer sur la ligne de prescription
async function openPrescriptionLine(line) {
    return new Promise((resolve) => {
        // line.click(); => protégé
        const lineId = line.id;
        clicCSPLockedElement('#' + lineId);
        waitForElement({
            selector: '#ContentPlaceHolder1_BaseVidalUcForm1_PanelPosologie',
            callback: function () {
                console.log('La ligne de prescription a été ouverte');
                resolve(); // Résout la promesse une fois que l'élément est trouvé
            }
        });
    });
}

// 2 - y cliquer sur la durée de traitement
async function setTreatmentDuration(duration) {
    // Vérification que duration est un nombre
    if (isNaN(duration)) {
        console.error(`[setTreatmentDuration] La durée "${duration}" n'est pas un nombre valide`);
        return;
    }

    // Ici on va cliquer sur la calculette de traitement
    // Les boutons à cliquer sont des input de classe imgposo0 (ou imgposo1, imgposo2, etc.)
    // On va cliquer dans l'ordre sur les boutons correspondant à la durée de traitement
    let digits = duration.toString().split('');
    console.log(`[setTreatmentDuration] Entrée de la durée: ${duration} (${digits.length} chiffres)`);

    for (let digit of digits) {
        clickButtonDuration(digit);
        // Ajout d'un petit délai entre les clics pour simuler une saisie humaine
        await sleep(50);
    }
}

function clickButtonDuration(digit) {
    let button = document.querySelector(`.imgposo${digit}`);
    if (button) {
        button.click();
        recordMetrics({ clicks: 1, drags: 1 });
        return true;
    } else {
        console.error(`[clickButtonDuration] Bouton pour le chiffre ${digit} non trouvé`);
        return false;
    }
}

/** 3 - y cliquer sur le type de durée
 * 
 * @param {string} durationType - Type de durée à sélectionner (d, w, m)
 */
function setTreatmentDurationType(durationType) {
    if (!['d', 'w', 'm'].includes(durationType)) {
        console.error(`[setTreatmentDurationType] Type de durée "${durationType}" invalide`);
        return;
    }
    const dayButton = document.querySelector('.imgposoday');
    const weekButton = document.querySelector('.imgposoweek');
    const monthButton = document.querySelector('.imgposomonth');
    const buttons = { d: dayButton, w: weekButton, m: monthButton };
    buttons[durationType].click();
    recordMetrics({ clicks: 1, drags: 1 });
}


// 4 - valider
function validateTreatment() {
    const validateButton = document.querySelector('#ButtonPosoValid');
    validateButton.click();
    recordMetrics({ clicks: 1, drags: 1 });
}

// On ajoute des boutons à droite du menu de durée déjà présent dans Weda
function addTreatmentDurationButtons() {
    // On va chercher à ajouter des boutons à côté de certains éléments.
    // Les éléments sont tout les a .level3.dynamic dont le texte est "Traitement pour un mois"
    // "un" est remplacé ensuite par 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
    const baseSelector = 'a.level3.dynamic';
    const targetText = 'Traitement pour'; // Début du texte à rechercher
    const targetElements = Array.from(document.querySelectorAll(baseSelector))
        .filter(element => element.textContent.startsWith(targetText));
    console.log(`[addTreatmentDurationButtons] ${targetElements.length} éléments trouvés`);

    // Mapping des textes vers les nombres (pour gérer le cas "un" au lieu de "1")
    const durationMapping = {
        'un': 1,
        '2': 2,
        '3': 3,
        '4': 4,
        '5': 5,
        '6': 6,
        '7': 7,
        '8': 8,
        '9': 9,
        '10': 10,
        '11': 11,
        '12': 12
    };

    targetElements.forEach(element => {
        // Extraire le nombre du texte (ex: "Traitement pour un mois" -> "un")
        const text = element.textContent;
        let durationText = text.replace('Traitement pour ', '').replace(' mois', '');
        const duration = durationMapping[durationText];
        // console.log(`[addTreatmentDurationButtons] Durée trouvée: ${duration} mois`);

        if (duration) {
            // Créer le bouton
            const button = document.createElement('button');
            button.textContent = 'via Weda-Helper';
            button.title = `Weda-Helper va appliquer "${text}" à toutes les lignes comme si vous sélectionniez manuellement la durée pour chaque ligne.`;
            button.className = 'buttonheader';
            button.style.marginLeft = '5px';
            button.style.padding = '2px 5px';
            button.style.fontSize = '11px';
            button.id = `wh-button-${duration}`;

            // Vérifier si le bouton existe déjà
            if (document.getElementById(button.id)) {
                // console.log(`[addTreatmentDurationButtons] Bouton pour la durée ${duration} mois déjà présent`);
                return;
            }

            // Ajouter l'événement au clic
            button.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                console.log(`[addTreatmentDurationButtons] Changement global de durée: ${duration} mois`);
                // Nettoyer les données précédentes
                sessionStorage.removeItem('dureePrescriptionProcessed');
                sessionStorage.removeItem('dureePrescriptionProcessing');
                // Démarrer le processus
                changePrescriptionDurationCore(duration.toString(), 'm');
                return false;
            });

            // Insérer le bouton après l'élément
            const parent = element.parentNode;
            if (parent.nextSibling) {
                parent.parentNode.insertBefore(button, parent.nextSibling);
            } else {
                parent.parentNode.appendChild(button);
            }
        }
    });
}

function returnPosoLineContent(line) {
    const debutIdPosoLine = 'ContentPlaceHolder1_PrescriptionsGrid_LinkButtonPrescriptionPosoText_'
    const posoLineId = debutIdPosoLine + line;
    console.log('[returnPosoLineContent] posoLineId', posoLineId);
    const posoLine = document.getElementById(posoLineId);
    return posoLine.textContent;
}




// Suppression dans les prescriptions des textes entre {} : ex "{test}" => ""
addTweak([demandeUrl, prescriptionUrl, "/FolderMedical/CertificatForm.aspx"], '*removeBrackets', function () {
    // Sélectionner toutes les iframes qui commencent par CE_ContentPlaceHolder1_Editor
    let iframes = document.querySelectorAll("iframe[id^='CE_ContentPlaceHolder1_Editor']");

    if (iframes.length === 0) {
        console.log('[removeBrackets] aucune iframe trouvée');
        return;
    }

    // Parcourir toutes les iframes trouvées et appliquer la fonction
    iframes.forEach(removeBracketsFromIframe);

    // On va également recommencer aux DOM refresh
    afterMutations({
        delay: 100,
        callBackId: 'removeBrackets',
        callback: function () {
            iframes = document.querySelectorAll("iframe[id^='CE_ContentPlaceHolder1_Editor']");
            iframes.forEach(removeBracketsFromIframe);
        }
    });
});


// Fonction pour supprimer les textes entre accolades dans une iframe
function removeBracketsFromIframe(iframe) {
    try {
        // Accéder au document de l'iframe
        const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;

        // Vérifier que le corps du document est disponible
        if (!iframeDocument.body) {
            console.log(`[removeBracketsFromIframe] corps du document non disponible pour l'iframe ${iframe.id}`);
            return;
        }

        // Cette fonction sera exécutée une fois que l'iframe est chargée
        function processIframeContent() {
            // Rechercher dans le contenu HTML
            const bodyContent = iframeDocument.body.innerHTML;

            // Si on trouve des textes entre accolades
            if (bodyContent.match(/\{.*?\}/g)) {
                // Remplacer les textes entre accolades par une chaîne vide
                const newContent = bodyContent.replace(/\{.*?\}/g, '');

                // Mettre à jour le contenu de l'iframe
                iframeDocument.body.innerHTML = newContent;

                console.log(`[removeBracketsFromIframe] texte modifié dans l'iframe ${iframe.id}`);

                // Si l'iframe utilise un éditeur WYSIWYG qui stocke le contenu ailleurs
                // (comme dans un champ caché), essayons de le mettre à jour aussi
                const hiddenFields = iframeDocument.querySelectorAll('input[type="hidden"]');
                hiddenFields.forEach(field => {
                    if (field.value && field.value.match(/\{.*?\}/g)) {
                        field.value = field.value.replace(/\{.*?\}/g, '');
                    }
                });

                sendWedaNotifAllTabs({
                    message: 'mots entre accolades supprimés. A désactiver dans les optiosn de Weda-Helper si vous ne le souhaitez pas.',
                    icon: 'success',
                    type: 'success',
                });
            } else {
                console.log(`[removeBracketsFromIframe] aucun texte entre accolades trouvé dans l'iframe ${iframe.id}`);
            }
        }

        // Si l'iframe est déjà chargée, traiter immédiatement
        if (iframe.contentWindow.document.readyState === 'complete') {
            processIframeContent();
        } else {
            // Sinon, attendre que l'iframe soit chargée
            console.log(`[removeBracketsFromIframe] ajout d'un écouteur d'événement pour l'iframe ${iframe.id}`);
            iframe.addEventListener('load', processIframeContent);
        }

    } catch (e) {
        console.error(`[removeBracketsFromIframe] erreur d'accès à l'iframe ${iframe.id}:`, e);
    }
}