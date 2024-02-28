// // Page de prescription
let DemandeForm = window.location.href.startsWith('https://secure.weda.fr/FolderMedical/DemandeForm.aspx');
let PrescriptionForm = window.location.href.startsWith('https://secure.weda.fr/FolderMedical/PrescriptionForm.aspx');
if (PrescriptionForm) {
    var isFirstCall = true;
    // maintient le texte d'un type de recherche à l'autre et ajoute des boutons de recherche
    chrome.storage.local.get(['keepMedSearch', 'addMedSearchButtons'], function (result) {
        let keepMedSearch = result.keepMedSearch;
        let addMedSearchButtons = result.addMedSearchButtons;
        console.log('keepMedSearch', keepMedSearch, 'addMedSearchButtons', addMedSearchButtons);

        function storeSearchSelection() {
            var inputField = document.getElementById('ContentPlaceHolder1_BaseVidalUcForm1_TextBoxFindPack');
            if (inputField) { // TODO fiabiliser
                console.log('Le texte de recherche actuel est ', inputField.value, 'je le stocke localement suite à sa modification');
                chrome.storage.local.set({medSearchText: inputField.value});
            } else {
                console.log('Le champ d\'entrée n\'a pas été trouvé');
            }
        }

        function searchTextKeeper() {
            var searchTextField = document.getElementById('ContentPlaceHolder1_BaseVidalUcForm1_TextBoxFindPack');
            if (searchTextField) {
                console.log('searchTextKeeper started sur ', searchTextField);
                searchTextField.addEventListener('input', function() {
                    // Stocker la valeur de inputField dans medSearchText lorsque le texte est modifié
                    storeSearchSelection();
                });
            } else {
                console.log('searchTextKeeper non démarré car searchTextField non trouvé');
            }
        }

        // Fonction pour trier le texte de recherche
        function textSorter() {
            var inputField = document.getElementById('ContentPlaceHolder1_BaseVidalUcForm1_TextBoxFindPack');
            var selectMenu = document.getElementById('ContentPlaceHolder1_BaseVidalUcForm1_DropDownListRecherche');

            console.log('textSorter started');

            // Obtenez la valeur actuelle du menu déroulant
            var medSearchSelectionCurrent = selectMenu.value;
            chrome.storage.local.get(['medSearchSelection', 'medSearchText'], function(result) {
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
                setTimeout(function() {
                    inputField.value = savedValue;
                    var button = document.getElementById('ContentPlaceHolder1_BaseVidalUcForm1_ButtonFind');
                    button.click();

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
                return function() {
                    console.log('boutonRecherche-' + value, 'cliqué');
                    storeSearchSelection();
                    selectMenu.value = value;
                };
            }

            var optionsBoutonRecherche = Object.keys(dropDownList).map(function(key) {
                return 'boutonRecherche-' + key;
            });

            chrome.storage.local.get(optionsBoutonRecherche, function(result) {
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
            var panneauFav = document.getElementById('PanelBasesPosologies');
            var panneauType = document.getElementById('ContentPlaceHolder1_PanelListePrescritionType');
            var panneauRO = document.getElementById('ContentPlaceHolder1_RenouvellementUCForm1_PanelFindDocument');
            if (!panneauFav) {
                console.log('onDOMChange started et panneau fav non présent');
                if (keepMedSearch !== false) {
                    console.log('keepMedSearch started');
                    searchTextKeeper();
                    if (!isFirstCall && !panneauType && !panneauRO) {
                        textSorter();
                    }
                    isFirstCall = false;
                }
                if (addMedSearchButtons !== false) {
                    addMedSearchButtonsFunction();
                }
            } else {
                console.log('onDOMChange non démarré car panneau fav présent');
                if (keepMedSearch !== false) {
                    console.log('keepMedSearch started');
                    searchTextKeeper();
                }
            }
        }


        chrome.storage.local.get(['autoOpenOrdoType'], function(result) {
            if (result.autoOpenOrdoType === true) {
                document.getElementById('ContentPlaceHolder1_ButtonPrescritionType').click();
                lightObserver('#ContentPlaceHolder1_LabelBasePrescritionType', function() {
                    onDOMChange();
                });
            }
            else {
                onDOMChange();
            }
        });


        setTimeout(function() {
            lightObserver('#ContentPlaceHolder1_BaseVidalUcForm1_DropDownListRecherche', onDOMChange);
        }, 2000);
    });


    // Ajoute l'écoute du clavier pour faciliter les prescription
    chrome.storage.local.get(['KeyPadPrescription'], function(result) {
        if (result.KeyPadPrescription !== false) {
            if (window.location.href.startsWith('https://secure.weda.fr/FolderMedical/PrescriptionForm.aspx')) {
                console.log('numpader started');
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
                    ',' : 'SetQuantite(\',\');',
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
            }
        }
    });
}

// Selectionne automatiquement l'ordonnance numérique sur les pages souhaitées
if (DemandeForm || PrescriptionForm) {
    // Coche automatiquement le bouton de consentement de l'ordonnance numérique
    chrome.storage.local.get(['autoConsentNumPres'], function(result) {
        if (result.autoConsentNumPres !== false) {
            // autoclique le bouton de consentement de l'ordonnance numérique
            lightObserver('.cdk-overlay-container .mat-radio-label', function(elements) {
                // console.log('[debug].cdk-overlay-container .mat-radio-label', elements);
                elements[0].click();
            });
        }
    });



    let logContext = '[WH, prescription.js] ';
    console.log(logContext, 'selection ordoNum démarrée');
    chrome.storage.local.get(['NumPresPrescription','NumPresDemande'], function(result) {
        if (result.NumPresPrescription === true || result.NumPresDemande === true) {
            console.log(logContext, 'NumPresPrescription ou NumPresDemande est true');
            function changeCheckBoxViaClick(valueRequested) {
                var checkbox = document.getElementById('ContentPlaceHolder1_EvenementUcForm1_CheckBoxEPrescription');
                if (checkbox) {
                    console.log(logContext, 'checkbox checked', checkbox.checked, 'valueRequested', valueRequested);
                    if (checkbox.checked !== valueRequested) {
                        checkbox.click();
                    }
                }
            }
            if (DemandeForm) {
                console.log(logContext, 'DemandeForm', result.NumPresDemande);
                changeCheckBoxViaClick(result.NumPresDemande === true);
            }
            if (PrescriptionForm) {
                console.log(logContext, 'PrescriptionForm', result.NumPresPrescription);
                changeCheckBoxViaClick(result.NumPresPrescription === true);
            }
        
        }
    });
}

if (DemandeForm) { // TODO à mettre ça en option
    lightObserver('#prescriptionType div', function(element) {
        console.log('menu déroulant trouvé, je clique dessus', element);
        element[0].click();
    });

    lightObserver('#prescriptionType-panel mat-option .mat-option-text', function(elements) {
        console.log('options trouvées, je clique sur la première', elements);
        elements[0].click();
    });
}