// // Page de prescription
let demandeUrl = 'https://secure.weda.fr/FolderMedical/DemandeForm.aspx'
let prescriptionUrl = 'https://secure.weda.fr/FolderMedical/PrescriptionForm.aspx'
let DemandeForm = window.location.href.startsWith(demandeUrl);
let PrescriptionForm = window.location.href.startsWith(prescriptionUrl);
if (PrescriptionForm) {
    var isFirstCall = true;
    var firstCallTimeStamp = Date.now();
    chrome.storage.local.set({medSearchText: ''});
    // maintient le texte d'un type de recherche à l'autre et ajoute des boutons de recherche
    getOption(['keepMedSearch', 'addMedSearchButtons'], function([keepMedSearch, addMedSearchButtons]) {        
        console.log('keepMedSearch', keepMedSearch, 'addMedSearchButtons', addMedSearchButtons);

        function storeSearchSelection() {
            var inputField = document.getElementById('ContentPlaceHolder1_BaseVidalUcForm1_TextBoxFindPack');
            if (inputField) {
                console.log('Le texte de recherche actuel est ', inputField.value, 'je le stocke localement suite à sa modification');
                chrome.storage.local.set({medSearchText: inputField.value});
            } else {
                console.log('Le champ d\'entrée n\'a pas été trouvé');
            }
        }

        function searchTextKeeper() {
            // il semble nécessaire de répéter la recherche de l'élément pour éviter les erreurs
            lightObserver('#ContentPlaceHolder1_BaseVidalUcForm1_TextBoxFindPack', function() {
                var searchTextField = document.getElementById('ContentPlaceHolder1_BaseVidalUcForm1_TextBoxFindPack');
                if (searchTextField) {
                    console.log('searchTextKeeper started sur ', searchTextField);
                    if (!searchTextField.getAttribute('data-hasListener')) { // éviter d'ajouter plusieurs écouteurs
                        searchTextField.addEventListener('input', function() {
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
                    const keyStrokes = savedValue.length;
                    recordMetrics({keyStrokes: keyStrokes});
                    var button = document.getElementById('ContentPlaceHolder1_BaseVidalUcForm1_ButtonFind');
                    button.click();
                    recordMetrics({clicks: 1, drags: 1});
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
    });

}

addTweak(prescriptionUrl, 'autoOpenOrdoType', function() {
    window.onload = function() {
        document.getElementById('ContentPlaceHolder1_ButtonPrescritionType').click();
    };
});


addTweak(prescriptionUrl, 'KeyPadPrescription', function() {
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
});


// autoclique le bouton de consentement de l'ordonnance numérique
addTweak([demandeUrl, prescriptionUrl], 'autoConsentNumPres', function() {
    lightObserver('.cdk-overlay-container .mat-radio-label', function(elements) {
        // console.log('[debug].cdk-overlay-container .mat-radio-label', elements);
        elements[0].click();
        recordMetrics({clicks: 1, drags: 1});
    });
});


// Selectionne automatiquement l'ordonnance numérique sur les pages souhaitées
// pas vraiment possible d'utiliser addTweak ici car on est à cheval entre deux pages et deux options...
addTweak([demandeUrl, prescriptionUrl], '*NumPres', function() {
    function changeCheckBoxViaClick(valueRequested) {
        console.log('changeCheckBoxViaClick started');
        var checkbox = document.getElementById('ContentPlaceHolder1_EvenementUcForm1_CheckBoxEPrescription');
        if (checkbox) {
            console.log('checkbox checked', checkbox.checked, 'valueRequested', valueRequested);
            if (checkbox.checked !== valueRequested) {
                checkbox.click();
                recordMetrics({clicks: 1, drags: 1});
            }
        } else {
            console.log(logContext, 'checkbox non trouvé');
        }
    }
    getOption(['NumPresDemande', 'NumPresPrescription'], function([NumPresDemande, NumPresPrescription]) {
        if (NumPresDemande || NumPresPrescription ) {
            console.log('NumPresDemande', NumPresDemande, 'NumPresPrescription', NumPresPrescription);
            if (DemandeForm) {
                changeCheckBoxViaClick(NumPresDemande);
            } else if (PrescriptionForm) {
                changeCheckBoxViaClick(NumPresPrescription);
            }
        }
    });
});


// Selectionne automatiquement le type de prescription (pour l'instant pas d'option assignée)
addTweak(demandeUrl,'*AutoSelectPrescriptionType', function() {
    lightObserver('#prescriptionType div', function(element) {
        console.log('menu déroulant trouvé, je clique dessus', element);
        element[0].click();
        recordMetrics({clicks: 1, drags: 1});
    });

    lightObserver('#prescriptionType-panel mat-option .mat-option-text', function(elements) {
        console.log('options trouvées, je clique sur la première', elements);
        elements[0].click();
        recordMetrics({clicks: 1, drags: 1});
    });
});