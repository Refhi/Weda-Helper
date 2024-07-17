// // Page de prescription
let demandeUrl = 'https://secure.weda.fr/FolderMedical/DemandeForm.aspx'
let prescriptionUrl = 'https://secure.weda.fr/FolderMedical/PrescriptionForm.aspx'
let DemandeForm = window.location.href.startsWith(demandeUrl);
let PrescriptionForm = window.location.href.startsWith(prescriptionUrl);
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
            lightObserver('#ContentPlaceHolder1_BaseVidalUcForm1_TextBoxFindPack', function () {
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
        lightObserver('#ContentPlaceHolder1_BaseVidalUcForm1_DropDownListRecherche', onDOMChange);
        onDOMChange() // a priori nécessaire sur certains setups en plus du lightObserver
    });

}

addTweak(prescriptionUrl, 'autoOpenOrdoType', function () {
    document.getElementById('ContentPlaceHolder1_ButtonPrescritionType').click();
    lightObserver("#ContentPlaceHolder1_BaseGlossaireUCForm2_UpdatePanelDocument", function () {
        var inputField = document.getElementById('ContentPlaceHolder1_BaseVidalUcForm1_TextBoxFindPack');
        if (inputField) {
            inputField.focus();
        }
    });
});

addTweak(prescriptionUrl, 'AlertOnMedicationInteraction', function () {
    lightObserver("div.imgInter4", function (elements) { //Déclenché en cas de présence d'une contre-indication absolue
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
    lightObserver('.cdk-overlay-container .mat-radio-label', function (elements) {
        // console.log('[debug].cdk-overlay-container .mat-radio-label', elements);
        elements[0].click();
        recordMetrics({ clicks: 1, drags: 1 });

        if (PrescriptionForm) { //Pas de selection du type de l'ordonnance donc on valide une fois le consentement coché
            validateOrdoNumIfOptionActivated();
        }
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

        function uncheckSiImagerie() { // n'est appelé que si l'ordo numérique est demandée ou déjà cochée
            addTweak('*', 'uncheckDMPIfImagerie', function () {
                lightObserver('#ContentPlaceHolder1_BaseGlossaireUCForm1_LabelILRadio', function () {
                    if (isElementSelected('ContentPlaceHolder1_BaseGlossaireUCForm1_LabelILRadio')) {
                        changeCheckBoxViaClick(false);
                    } else {
                        // seulement si ordoNumeriquePreCoche est vrai
                        if (ordoNumeriquePreCoche) {
                            changeCheckBoxViaClick(true);
                        }
                    }
                    observeCheckbox();
                });
            });
        }

        function observeCheckbox() {
            // Sélection de l'élément cible
            let checkbox = document.getElementById('ContentPlaceHolder1_EvenementUcForm1_CheckBoxEPrescription');

            // Vérification si l'élément checkbox existe
            if (checkbox) {
                // Ajout d'un écouteur d'événements pour détecter les changements
                checkbox.addEventListener('change', function () {
                    // Enregistrement du statut de la case à cocher
                    ordoNumeriquePreCoche = checkbox.checked;
                });
            }
        }

        if (NumPresDemande || NumPresPrescription) {
            ordoNumeriquePreCoche = true; // quand on a une des optiosn activées, ça signifie que de base on veut que ça soit coché
            if (DemandeForm) {
                changeCheckBoxViaClick(NumPresDemande);
                if (NumPresDemande) {
                    uncheckSiImagerie();
                }
            } else if (PrescriptionForm) {
                changeCheckBoxViaClick(NumPresPrescription);
            }
        } else if (ordoNumeriquePreCoche && DemandeForm) {
            uncheckSiImagerie();
        }
    });
});

// Selectionne automatiquement le type de prescription numérique
addTweak(demandeUrl, 'autoSelectTypeOrdoNum', function () {
    const typesSoins = [
        { regex: /\bIDE\b|infirmier|pansement|injection/i, type: 1 },
        { regex: /\bkiné\b|\bkine\b|kinésithérapie|kinesitherapie|MKDE|kinesitherapeute|kinesithérapeute|rééducation|reeducation/i, type: 2 },
        { regex: /pédicure|pedicure|podologie|podologique|podologue|semelle|orthoplastie/i, type: 5 },
        { regex: /orthophonie|orthophonique|orthophoniste/i, type: 3 },
        { regex: /orthoptie|orthoptique|orthoptiste/i, type: 4 }
    ];

    let contexteSoins = [
        { regex: /domicile/i, checkBoxText: " Soins à réaliser à domicile " },
        { regex: /urgent|urgence/i, checkBoxText: " Prescription à caractère urgent " },
        { regex: /prevention|prévention/i, checkBoxText: " Prescription dans le cadre de la prévention " },
    ]

    function checkContexteSoins(demandeContent, callback) {
        lightObserver('.horCBoxWithLabel > span', function (checkBoxElements) {
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
        }, document, true);

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
            lightObserver('#prescriptionType div', function (elements) {
                console.log('menu déroulant trouvé, je clique dessus', elements);
                elements[0].click();
                recordMetrics({ clicks: 1, drags: 1 });
                callback();
            }, document, true);
    }



    function clickOnProperDropDownOption(demandeContent, callback) {
        let choixPossibles = document.querySelectorAll('.mat-option-text');
        let type = null; //non déf
        let isLab = isElementSelected('ContentPlaceHolder1_BaseGlossaireUCForm1_LabelILAnalyses');
        let isParamedical = isElementSelected('ContentPlaceHolder1_BaseGlossaireUCForm1_LabelILKine');
        let isImagerie = isElementSelected('ContentPlaceHolder1_BaseGlossaireUCForm1_LabelILRadio');

        if (isImagerie) { reject("Imagerie détectée, je ne peux pas traiter ce cas"); }

        if (isLab) { type = 0; }
        else if (isParamedical) {
            type = determinerTypeSoin(demandeContent);
        }
        if (type === null) { console.log("Type de soin non détecté, je laisse l'utilisateur sélectionner le bon"); }
        else {
            console.log('type de soin trouvé', type, 'je clique dessus', choixPossibles[type]);
            choixPossibles[type].click();
            recordMetrics({ clicks: 1, drags: 1 });
            if (callback) { callback(); }

        }
    };


    lightObserver('.mat-dialog-title', function (element) {
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
        }, 200);        
    }, document, false, false, 'Création d\'une ordonnance numérique');
});