// Tweak the FSE page (Add a button in the FSE page to send the amount to the TPE, implement shortcuts)

// Définition de la fonction principale
// (tableau et bouche après)
function tweakFSECreation() {
    // Make a dictionnary with keystrokes and their corresponding actions
    var index = {
        'n': ['mat-radio-9-input', 'mat-radio-3-input'],
        'o': ['mat-radio-8-input', 'mat-radio-2-input'],
        't': ['mat-checkbox-1-input'],
        'c': ['mat-checkbox-2-input'],
        // add an entry for the enter key
        'Enter': ['secure_FSE'],
    }
    var clue_index = {
        'n': ['mat-radio-9', 'mat-radio-3'],
        'o': ['mat-radio-8', 'mat-radio-2'],
    }

    // Vérifie si un bouton "oui" ou "non" est coché pour la question question_number
    // Renvoie également true si la première question n'existe pas
    function YesNoButtonChecked(question_number) {
        var element1 = document.getElementById(index['n'][question_number]);
        var element2 = document.getElementById(index['o'][question_number]);
        // Si la première question n'existe pas, renvoie true
        if (question_number == 0 && (!element1 || !element2)) {
            return true;
        }
        // Sinon renvoie true si l'un des deux boutons est coché
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

    // // Travail sur l'automatisation de la lecture de la carte vitale
    // Vérifie la présence du texte "Carte Vitale non lue" dans le texte de l'élément avec class = lectureCvContainer


    function CarteVitaleNonLue() {
        // Vérifie l'existence de conditions nécessitant la lecture de la cv :
        // - soit la présence du texte d'erreur de cohérence
        // - soit la présence du texte d'erreur de cv non lue
        var carteVitaleLue = false; // Indicateur pour suivre si la carte vitale a été lue
        console.log('CarteVitaleNonLue demarré : je vérifie la présence du texte d erreur ou de l absence de cv');
        waitForElement('span', 'Le nom, le prénom et/ou la date de naissance sont différents entre les données du bénéficiaire et celles contenues dans le dossier patient Weda.', 5000, function(spanElement) {
            if (carteVitaleLue) return; // Si la carte vitale a déjà été lue, arrête la surveillance
            console.log('Détecté : nom/prenom != dossier patient Weda. Je clique sur le bouton de lecture de la carte vitale');
            clickCarteVitale(); // cf. keyCommands.js
            checkPatientName();
            addFSEVariantButtons();
            carteVitaleLue = true; // Indique que la carte vitale a été lue
        });
        setTimeout(function() {
            waitForElement('span', 'Carte Vitale non lue', 5000, function(spanElement) {
                if (carteVitaleLue) return; // Si la carte vitale a déjà été lue, arrête la surveillance
                console.log('Détecté : Carte Vitale non lue. Je clique sur le bouton de lecture de la carte vitale');
                clickCarteVitale(); // cf. keyCommands.js
                checkPatientName();
                addFSEVariantButtons();
                carteVitaleLue = true; // Indique que la carte vitale a été lue
            });
        }, 300); // Attendre 300 ms avant d'exécuter le code à l'intérieur de setTimeout (utile pour éviter une lecture cv trop rapide)
    }
    // Ajoute deux boutons : un pour les FSE dégradées, un pour les FSE Teleconsultation à côté de lecture carte vitale
    function addFSEVariantButtons() {
        function degradeTeleconsult(type) {
            // fermer la fenêtre de lecture de carte vitale
            var closeButton = document.querySelector('a[title="Fermer cette fenêtre"]');
            if (closeButton) {
                closeButton.click();
                recordMetrics({clicks: 1, drags: 1});
            }
            // Trouver l'icône "fingerprint" et cliquer dessus
            var fingerprintIcon = document.querySelector('.mat-icon.notranslate.material-icons.mat-icon-no-color');
            console.log('Détecté : pression sur bouton dégradée. Je clique sur le bouton emprunte digitale');
            fingerprintIcon.click();
            recordMetrics({clicks: 1, drags: 1});
            // Attendre que le bouton contenant le texte "Degradée" existe et cliquer dessus
            waitForElement('[class="mat-button-wrapper"]', type, 5000, function(degradeeButton) {
                setTimeout(function() {
                    console.log('Détecté : pression sur bouton ', type, '. Je clique sur le bouton degradé');
                    degradeeButton.click();
                    recordMetrics({clicks: 1, drags: 1});
                }, 100); // un clic trop précoce semble avoir des effets de bord
                // Puis clique sur le bouton "Adri"
                setTimeout(function() {
                    console.log('Détecté : pression sur bouton ', type, '. Je clique sur le bouton de lecture adri');
                    var adriElement = document.querySelector('img[src="/Images/adri.png"]');
                    if (adriElement) {
                        adriElement.click();
                        recordMetrics({clicks: 1, drags: 1});
                    }
                }, 500);
            });
        }
        // Attendre que l'élément "Lire la carte vitale" existe
        waitForElement('a[title="Relance une lecture de la carte vitale"]', null, 5000, function(lireCarteVitaleElement) {
            // Créer le premier bouton
            var button1 = document.createElement('button');
            button1.textContent = 'FSE dégradée';
            button1.onclick = function() {
                degradeTeleconsult('Dégradé');
            };

            // Créer le deuxième bouton
            var button2 = document.createElement('button');
            button2.textContent = 'FSE Teleconsultation'; // Mettez le texte que vous voulez ici
            button2.onclick = function() {
                degradeTeleconsult('Téléconsultation');
            };

            // Insérer les boutons après l'élément "Lire la carte vitale"
            lireCarteVitaleElement.parentNode.insertBefore(button1, lireCarteVitaleElement.nextSibling);
            lireCarteVitaleElement.parentNode.insertBefore(button2, button1.nextSibling);
        });
    }

    // Vérifie la présence de l'élément avec title="Prénom du patient"
    function checkPatientName() {
        var specialCharsMap = {
            'à': 'a',
            'â': 'a',
            'ä': 'a',
            'é': 'e',
            'è': 'e',
            'ê': 'e',
            'ë': 'e',
            'î': 'i',
            'ï': 'i',
            'ô': 'o',
            'ö': 'o',
            'ù': 'u',
            'û': 'u',
            'ü': 'u',
            'ç': 'c',
            'œ': 'oe',
            'æ': 'ae',
            'ÿ': 'y'
        };

        function replaceSpecialChars(str) {
            for (var char in specialCharsMap) {
                var regex = new RegExp(char, 'g');
                str = str.replace(regex, specialCharsMap[char]);
            }
            return str;
        }


        console.log('checkPatientName démarré');
        waitForElement('[title="Prénom du patient"]', null, 5000, function(patientNameElement) {
            var patientName = patientNameElement.textContent;
            patientName = replaceSpecialChars(patientName).toUpperCase(); // convertie un prénom classique en majuscules sans accents
            console.log('Le prénom du patient est : ' + patientName);
            waitForElement('[class="grid-item pointer"]', patientName, 5000, function(widgetElement) {
                console.log('patient trouvé, je clique sur son nom');
                elements = document.getElementsByClassName('grid-item pointer');
                for (var i = 0; i < elements.length; i++) {
                    if (elements[i].textContent.includes(patientName)) {
                        elements[i].click();
                        recordMetrics({clicks: 1, drags: 1});
                        break;
                    }
                }
            });
        });

        
    }

    function CPSNonLue() {
        console.log('CPSNonLue démarré');
        waitForElement('span', 'CPS non lue', 5000, function(spanElement) {
            console.log('Détecté : CPS non lue. Je clique sur le bouton de lecture de la CPS');
            spanElement.click();
            recordMetrics({clicks: 1, drags: 1});

        });
    }


    function setDefaultValue() {
        // Si on envisage d'ajouter des cotations automatisées plus complexes, on pourra simplement se greffer sur cette fonction
        // par exemple en mettant dans une des conditions la récupération d'une valeur mémoire spécifique
        let conditionalCotations = [
            {
                condition: function() {
                    let isALD = document.querySelector('#mat-radio-2-input').checked;
                    return isALD;
                },
                action: 'DéfautALD'
            },
            {
                condition: function() {
                    // Étape 1: Sélectionner le span et extraire la date de naissance du title
                    let spanWithTitle = document.querySelector('#LabelInfoPatientNom > span > span:last-child');
                    let title = spanWithTitle.getAttribute('title');
                    let birthDateString = title.match(/(\d{2}\/\d{2}\/\d{4})/)[0];
                
                    // Étape 2: Convertir la chaîne de date en un objet Date
                    let birthDateParts = birthDateString.split('/');
                    let birthDate = new Date(birthDateParts[2], birthDateParts[1] - 1, birthDateParts[0]);
                
                    // Étape 3: Calculer l'âge
                    let today = new Date();
                    let age = today.getFullYear() - birthDate.getFullYear();
                    let m = today.getMonth() - birthDate.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                        age--;
                    }
                
                    console.log('Age du patient :', age, 'ans');
                
                    // Étape 4: Retourner true si l'âge est inférieur à 7 ans
                    return age < 7;
                },
                action: 'DéfautPédia'
            },
            {
                condition: function() {
                    let fseTypeElement = document.querySelector('#form1 > div:nth-child(14) > div > div:nth-child(2) > vz-feuille-de-soin > div.fseContainer > div > div.toolbarContainer.thinCards.flexRow > mat-card.mat-card.mat-focus-indicator.cvContainer > vz-lecture-cv-widget > div > vz-mode-teletrans > div')
                    let isTeleconsultation = fseTypeElement.textContent === 'SV';
                    return isTeleconsultation;
                },
                action: 'DéfautTC'
            },
            {
                condition: function() {
                    return true; // Cette condition sera toujours vraie pour la cotation "Défaut"
                },
                action: 'Défaut'
            },            
        ];

        // Définit la cotation par défaut
        addTweak('*', 'defaultCotation', function() {
            var elements = document.querySelectorAll('.flexRow.favoris.ng-star-inserted');
            console.log('elements', elements);

            for (let i = 0; i < conditionalCotations.length; i++) { // Loop dans le dico des cotations conditionnelles
                if (conditionalCotations[i].condition()) {// Si la condition est remplie
                    let action = conditionalCotations[i].action; // L'action c'est le nom du favori à appliquer
                    let targetElement = Array.from(elements).find(el => el.textContent.trim() === 'keyboard_arrow_right'+action);
                    // keyboard_arrow_right est nécessaire pour matcher le texte complet du favori qui contient ">" devant le nom
                    if (targetElement) {
                        targetElement.click();
                        recordMetrics({clicks: 1, drags: 1});
                        console.log('Cotation appliquée:', action);
                        return; // Arrête la fonction après avoir appliqué une cotation
                    } else if (action === 'Défaut') {
                        console.log('Action "Défaut" spécifiée mais non trouvée parmi les éléments.');
                        alert('Weda-Helper : "cotation par défaut" n\'est pas désactivé dans les options, mais aucune cotation favorite nommée "Défaut" n\'a été trouvé. Vous devez soit ajouter un favori nommé exactement "Défaut", soit désactiver l\'option "cotation par défaut" dans les options de Weda-Helper. Vous pouvez également définir DéfautPédia et DéfautALD.');
                        return; // Arrête la fonction si "Défaut" est spécifié mais non trouvé
                    }
                }
            }

            // Si aucune condition n'est remplie, afficher un message d'erreur
            console.log('Aucune condition remplie pour appliquer une cotation spécifique.');
        });
    }

    // vérifie la carte vitale
    setTimeout(function() {
        CarteVitaleNonLue();
    }, 50); // Attendre 50 ms avant de vérifier la carte vitale
    

    // Ajoute un indice visuel pour les touches "n" et "o"
    // selon la présence ou non de la première question oui/non
    let firstQuestionExist = document.getElementById('mat-radio-9-input');
    if (firstQuestionExist) {
        addVisualClue(clue_index['n'][0]);
        addVisualClue(clue_index['o'][0]);
    } else {
        addVisualClue(clue_index['n'][1]);
        addVisualClue(clue_index['o'][1]);
    }

    // Détecte les touches "n" et "o" et cochent les boutons correspondants
    document.addEventListener('keydown', function (event) {
        if (event.key in index) {
            console.log('key pressed:', event.key);
            var  element = document.getElementById(index[event.key][0]);
            if (event.key =='n' || event.key == 'o') {
                if (!YesNoButtonChecked(0)) {
                    console.log('No button checked on first yes/no question');
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
            }
            console.log('element to act on is', element);

            // Do nothing if the focus is in a text input field
            let focusedElement = document.activeElement;
            if (focusedElement && focusedElement.tagName.toLowerCase() === 'input' && focusedElement.type === 'text') {
                console.log('Entrée clavier détectée dans un champ de texte, je ne fais rien');
            } else {
                if (element && element.type === 'radio') {
                    console.log('trying to check element', element);
                    element.checked = true;
                    recordMetrics({clicks: 1, drags: 1});
                    element.dispatchEvent(new Event('change'));
                }
                else if (element && element.type == 'checkbox' && !event.altKey) { //checked puis un event change ne fonctionnent pas sur une Checkbox donc on trigger un click()
                    console.log('trying to click element', element);
                    element.click(); 
                    recordMetrics({clicks: 1, drags: 1});
                }
            }
            
        }
    });

    // Détecte le fait de cocher un élément contenant for='mat-radio-3-input' et for='mat-radio-2-input' puis déclencher setDefaultValue
    lightObserver('#mat-radio-3-input', function() {
        let boutonsRadioASurveiller = document.querySelectorAll('#mat-radio-3-input, #mat-radio-2-input');
        boutonsRadioASurveiller.forEach(function(bouton) {
            bouton.addEventListener('change', function() {
                console.log('[debug] change event detected');
                setDefaultValue();
            });
        });
    });
}


// Création du tableau de tweak

let fseUrl = 'https://secure.weda.fr/vitalzen/fse.aspx';
let fseTable = 
    [
        {
            option: 'TweakFSEDetectMT',
            callBack: function() {
                lightObserver('vz-medecin-traitant-weda div.mt10.ng-star-inserted', function(element) {
                    let MTDeclare = element[0].innerText;
                    console.log('found MT: ' + MTDeclare);
                    var loggedInUser = document.getElementById('LabelUserLog').innerText;
                    if (MTDeclare.includes(loggedInUser)) {
                        console.log('MT déclaré = utilisateur en cours => je coche MT déclaré');
                        let select = document.querySelector('vz-orientation select');
                        select.value = '03'; // Je suis le médecin traitant
                    }
                });
            }
        },
        {
            option: 'TweakFSEGestionUnique',
            callBack: function() {
                lightObserver('label[for=mat-checkbox-11-input] > span.mat-checkbox-inner-container.mat-checkbox-inner-container-no-side-margin > input', function(element) {
                    if(element[0].parentElement.parentElement.parentElement.parentElement.parentElement.textContent.includes('Réaliser une FSE en gestion unique')) //Fix un peu sale
                    {
                        console.log('Gestion unique activée clic sur element', element);
                        element[0].click();
                        recordMetrics({clicks: 1, drags: 1});
                    }
                });
            }
        },
        {
            option: 'TweakFSEAccident',
            callBack: function() {
                lightObserver('input[id="mat-radio-9-input"]', function(element) {
                    console.log('J trouve le bouton "non" pour accident de travail, je le coche', element);
                    element[0].checked = true;
                    recordMetrics({clicks: 1, drags: 1});
                    element[0].dispatchEvent(new Event('change'));
                });
            }
        },
        {
            option: 'TweakFSECreation',
            callBack: tweakFSECreation

        }

    ];

fseTable.forEach(tweak => {
    addTweak(fseUrl, tweak.option, tweak.callBack);
});

addTweak('https://secure.weda.fr/vitalzen/gestion.aspx', 'TweakSCORDegradee', function () {
    lightObserver('mat-select[name=selectedType]', function (element) {
        console.log('menu déroulant trouvé, je clique dessus', element);
        element[0].click();
        recordMetrics({ clicks: 1, drags: 1 });
    });

    lightObserver('#mat-select-8-panel mat-option .mat-option-text', function (elements) {
        console.log('options trouvées', elements);
        elements[1].click();
        recordMetrics({ clicks: 1, drags: 1 });
    });
});


addTweak('https://secure.weda.fr/vitalzen/fse.aspx', '*keepPrintDegradeeParameters', function() {
    lightObserver('.mat-slide-toggle-label span', function(element) { // on cherche aussi le texte, mais cf. Fin de fonction
        // d'abord rechercher tout les éléments avec comme role="switch"
        let toggles = document.querySelectorAll('[role="switch"]');
        let backgroundToggle;
        let canSignToggle;
        
        // retourne le texte de l'élément "switch" passé en paramètre
        function textOfToggle(toggle) {
            let parentParent = toggle.parentElement.parentElement;
            let textElement = parentParent.querySelector('span');
            return textElement.innerText;
        }

        toggles.forEach(function(toggle) {
            let textofTheToggle = textOfToggle(toggle);
            if (textofTheToggle === 'Retirer le fond') {
                backgroundToggle = toggle;
                console.log('[keepPrintDegradeeParameters] found backgroundToggle', backgroundToggle, ' dont le texte est: ',textofTheToggle);
            } else if (textofTheToggle === 'le patient peut signer') {
                canSignToggle = toggle;
                console.log('[keepPrintDegradeeParameters] found canSignToggle', canSignToggle, ' dont le texte est: ',textofTheToggle);
            } else {
                console.log('[keepPrintDegradeeParameters] found an unknown toggle : ', toggle, ' . With text :', textofTheToggle);
            }
        });


        // surveille les changements de valeur des boutons et les enregistre dans le stockage local
        function addToggleWatcher(toggleElement, storageKey) {
            toggleElement.addEventListener('change', function() {
                let saveObj = {};
                saveObj[storageKey] = toggleElement.checked;
                chrome.storage.local.set(saveObj, function() {
                    console.log(`[${storageKey}] ${storageKey} saved`, toggleElement.checked);
                });
            });
        }
        
        // Ajoute un écouteur d'événement pour chaque bouton
        addToggleWatcher(backgroundToggle, 'backgroundToggle');
        addToggleWatcher(canSignToggle, 'canSignToggle');

        // If their state is different from the last time, set them to the last state
        chrome.storage.local.get(['backgroundToggle', 'canSignToggle'], function(result) {
            console.log('[keepPrintDegradeeParameters] Value currently is backgroundToggle : ' + result.backgroundToggle, 'canSignToggle : ' + result.canSignToggle);
            function changeToggleIfDifferent(toggleElement, storageKey) {
                if (result[storageKey] !== undefined && toggleElement.checked !== result[storageKey]) {
                    toggleElement.click();
                    console.log('[keepPrintDegradeeParameters] ', storageKey, ' set to', result[storageKey]);
                    return true
                } else {
                    console.log('[keepPrintDegradeeParameters] ', storageKey, ' already set to', result[storageKey]);
                    return false
                }
            }
            let backGroundToggleIsNotSet = changeToggleIfDifferent(backgroundToggle, 'backgroundToggle');
            let canSignToggleIsNotSet = changeToggleIfDifferent(canSignToggle, 'canSignToggle');
            if (!backGroundToggleIsNotSet && !canSignToggleIsNotSet) {
                console.log('[keepPrintDegradeeParameters] No toggle was changed, greenLight for printing');
                let date = new Date();
                let timestamp = date.getTime();
                chrome.storage.local.set({FSEPrintGreenLightTimestamp: timestamp}, function() {
                    console.log('[keepPrintDegradeeParameters] FSEPrintGreenLightTimestamp saved', timestamp);
                });
            };
        });
    }, document, false, false, "le patient peut signer");
});