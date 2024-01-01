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

    // Vérifie si un bouton "oui" ou "non" est coché pour la question question_number
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

    // // Travail sur l'automatisation de la lecture de la carte vitale
    // Vérifie la présence du texte "Carte Vitale non lue" dans le texte de l'élément avec class = lectureCvContainer


    function CarteVitaleNonLue() {
        // Vérifie l'existence de conditions nécessitant la lecture de la cv :
        // - soit la présence du texte d'erreur de cohérence
        // - soit la présence du texte d'erreur de cv non lue
        console.log('CarteVitaleNonLue demarré : je vérifie la présence du texte d erreur ou de l absence de cv');
        waitForElement('span', 'Le nom, le prénom et/ou la date de naissance sont différents entre les données du bénéficiaire et celles contenues dans le dossier patient Weda.', 5000, function(spanElement) {
            console.log('Détecté : nom/prenom != dossier patient Weda. Je clique sur le bouton de lecture de la carte vitale');
            clickCarteVitale(); // cf. keyCommands.js
            checkPatientName();
            addFSEVariantButtons();
        });
        setTimeout(function() {
            waitForElement('span', 'Carte Vitale non lue', 5000, function(spanElement) {
                console.log('Détecté : Carte Vitale non lue. Je clique sur le bouton de lecture de la carte vitale');
                clickCarteVitale(); // cf. keyCommands.js
                checkPatientName();
                addFSEVariantButtons();
            });
        }, 200); // Attendre 200 ms avant d'exécuter le code à l'intérieur de setTimeout (utile pour éviter une lecture cv trop rapide)
    }

    // Ajoute deux boutons : un pour les FSE dégradées, un pour les FSE Teleconsultation à côté de lecture carte vitale
    function addFSEVariantButtons() {
        // Attendre que l'élément "Lire la carte vitale" existe
        waitForElement('a[title="Relance une lecture de la carte vitale"]', null, 5000, function(lireCarteVitaleElement) {
            // Créer le premier bouton
            var button1 = document.createElement('button');
            button1.textContent = 'FSE dégradée'; // Mettez le texte que vous voulez ici
            button1.onclick = function() {
                // Trouver l'icône "fingerprint" et cliquer dessus
                var fingerprintIcon = document.querySelector('.mat-icon.notranslate.material-icons.mat-icon-no-color');
                fingerprintIcon.click();
                // Attendre que le bouton contenant le texte "Degradée" existe et cliquer dessus
                waitForElement('button', 'Dégradé', 5000, function(degradeeButton) {
                    degradeeButton.click();
                });
            };

            // Créer le deuxième bouton
            var button2 = document.createElement('button');
            button2.textContent = 'FSE Teleconsultation'; // Mettez le texte que vous voulez ici
            button2.onclick = function() {
                // Trouver l'icône "fingerprint" et cliquer dessus
                var fingerprintIcon = document.querySelector('.mat-icon.notranslate.material-icons.mat-icon-no-color');
                fingerprintIcon.click();
                // Attendre que le bouton contenant le texte "Teleconsultation" existe et cliquer dessus
                waitForElement('button', 'Téléconsultation', 5000, function(teleconsultationButton) {
                    // Clique sur le bouton téléconsultation
                    setTimeout(function() {teleconsultationButton.click();}, 200);
                    // Puis clique sur le bouton "Adri"
                    setTimeout(function() {
                        adriElement = document.getElementsByClassName('mat-tooltip-trigger mr5 pointer');
                        adriElement[0].click();
                    }, 400);
                });
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
            'ÿ': 'y',
            '-': ' '
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

        });
    }


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

    // vérifie la CPS
    CPSNonLue(); // TODO : vérifier que ça ne s'emmèle pas avec la carte vitale

    // vérifie la carte vitale
    CarteVitaleNonLue();
    // Add visual clues
    addVisualClue(clue_index['n'][0]);
    addVisualClue(clue_index['o'][0]); 




    // Détecte les touches "n" et "o" et cochent les boutons correspondants
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