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
        let optionOrdoNumElement = document.getElementById('ContentPlaceHolder1_EvenementUcForm1_CheckBoxEPrescription');
        console.log('autoConsentNumPres started');
        let checkbox = optionOrdoNumElement;
        console.log('checkbox', checkbox);
    
        let radioOui = document.createElement('input');
        radioOui.type = 'radio';
        radioOui.name = 'autoConsentNumPres';
        radioOui.value = 'true';
        radioOui.id = 'autoConsentNumPres_Oui';
    
        let labelOui = document.createElement('label');
        labelOui.htmlFor = 'autoConsentNumPres_Oui';
        labelOui.textContent = 'Oui';
    
        let radioNon = document.createElement('input');
        radioNon.type = 'radio';
        radioNon.name = 'autoConsentNumPres';
        radioNon.value = 'false';
        radioNon.id = 'autoConsentNumPres_Non';
    
        let labelNon = document.createElement('label');
        labelNon.htmlFor = 'autoConsentNumPres_Non';
        labelNon.textContent = 'Non';

        // Set default checked value based on consent
        if (consent === true) {
            radioOui.checked = true;
        } else if (consent === false) {
            radioNon.checked = true;
        }
        
    
        let box = document.createElement('div');
        box.style.display = 'none';
        box.style.position = 'absolute';
        box.style.backgroundColor = 'white';
        box.style.border = '1px solid black';
        box.style.padding = '5px';
    
        let title = document.createElement('h3');
        title.textContent = 'Consentement à consulter ce qui a été délivré/fait ?';
        box.appendChild(title);
    
        box.appendChild(radioOui);
        box.appendChild(labelOui);
        box.appendChild(radioNon);
        box.appendChild(labelNon);
    
        checkbox.parentElement.appendChild(box);
    
        checkbox.addEventListener('mouseover', function () {
            let rect = checkbox.getBoundingClientRect();
            box.style.left = `${rect.left + window.scrollX + rect.width / 2}px`;
            box.style.top = `${rect.top + window.scrollY + rect.height}px`;
            box.style.transform = 'translate(-50%, 0)';
            box.style.display = 'block';
        });
    
        checkbox.addEventListener('mouseout', function () {
            if (!box.matches(':hover')) {
                box.style.display = 'none';
            }
        });
    
        box.addEventListener('mouseover', function () {
            box.style.display = 'block';
        });
    
        box.addEventListener('mouseout', function () {
            box.style.display = 'none';
        });

        // Add event listeners to update consent value
        radioOui.addEventListener('change', function () {
            if (radioOui.checked) {
                consent = true;
                sessionStorage.setItem('consent', 'true');
            }
        });

        radioNon.addEventListener('change', function () {
            if (radioNon.checked) {
                consent = false;
                sessionStorage.setItem('consent', 'false');
            }
        });

    }
    

    getOption('autoConsentNumPres_Oui', function (autoConsentNumPres_Oui) {
        // Si on appelle addYesNoChoiceBox, il faut soit utiliser le sessionConsent s'il existe, soit l'option choisie dans WH
        // On crée donc une fonction qui renvoie le consentement à utiliser (le sessionConsent étant prioritaire)
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
        { regex: /\bkiné\b|\bkine\b|kinésithérapie|kinesitherapie|MKDE|kinesitherapeute|kinesithérapeute|rééducation|reeducation/i, type: 1 },
        { regex: /orthophonie|orthophonique|orthophoniste/i, type: 2 },
        { regex: /orthoptie|orthoptique|orthoptiste/i, type: 3 },
        { regex: /pédicure|pedicure|podologie|podologique|podologue|semelle|orthoplastie/i, type: 4 }
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
            choixPossibles[type].click();
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