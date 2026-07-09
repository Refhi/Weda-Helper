/**
 * @file fse.js
 * @description Fonctionnalités principales pour la page de Feuille de Soins Électronique (FSE).
 * Gère les améliorations de l'interface FSE :
 * - Raccourcis clavier pour la navigation (touches n/o/t/c/Entrée)
 * - Lecture automatique de la carte vitale et gestion des erreurs
 * - Boutons FSE dégradée et téléconsultation
 * - Configuration personnalisée des cotations par défaut
 * - Détection automatique du médecin traitant
 * - Gestion du SCOR (auto-sélection, validation PDF)
 * - Envoi automatique du montant au TPE
 * - Utilitaires FSE partagés : patientAgeInFSE, estMTdeclareOuReferent, loggedInUser
 *
 * L'aide à la cotation a été déplacée dans fse_cotation_helper.js.
 * L'historique des facturations a été déplacé dans fse_history.js.
 *
 * @requires tweaks.js (addTweak)
 * @requires storage.js (getOptionPromise)
 * @requires companionLink.js (sendtpeinstruction)
 * @requires notifications.js (sendWedaNotif, sendWedaNotifAllTabs)
 * @requires metrics.js (recordMetrics)
 */

let fseUrl = '/vitalzen/fse.aspx';


/**
 * Gestion de la lecture automatique de la carte vitale
 */
addTweak(fseUrl, 'TweakFSECreation', function tweakFSECarteVitale() {
    if (window.location.href.includes('Buffer=')) {
        console.log('[TweakFSECreation] Buffer mode detected, skipping carte vitale handling to avoid conflicts with other features like omnidoc facturation');
        return;
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

        // On récupère le prénom du patient dans l’en-tête de la FSE
        const patientNameElement = document.querySelector('[title="Prénom du patient"]');
        var patientName = patientNameElement.textContent;
        patientName = replaceSpecialChars(patientName).toUpperCase(); // convertie un prénom classique en majuscules sans accents
        console.log('Le prénom du patient est : ' + patientName);

        // Ensuite on attends que les éléments issus de la CV soient chargés et on clique sur le bon
        waitForElement({
            selector: '[class="grid-item pointer"]',
            justOnce: true,
            callback: function (elements) {
                console.log('patient trouvé, je clique sur son nom');
                elements = document.getElementsByClassName('grid-item pointer');
                for (var i = 0; i < elements.length; i++) {
                    if (elements[i].textContent.includes(patientName)) {
                        elements[i].click();
                        recordMetrics({ clicks: 1, drags: 1 });
                        break;
                    }
                }
            }
        });
    }

    function CarteVitaleNonLue() {
        // Vérifie l'existence de conditions nécessitant la lecture de la cv :
        // - soit la présence du texte d'erreur de cohérence
        // - soit la présence du texte d'erreur de cv non lue
        var carteVitaleLue = false; // Indicateur pour suivre si la carte vitale a été lue
        console.log('CarteVitaleNonLue demarré : je vérifie la présence du texte d erreur ou de l absence de cv');
        waitLegacyForElement('span', 'Le nom, le prénom et/ou la date de naissance sont différents entre les données du bénéficiaire et celles contenues dans le dossier patient Weda.', 5000, function (spanElement) {
            if (carteVitaleLue) return; // Si la carte vitale a déjà été lue, arrête la surveillance
            console.log('Détecté : nom/prenom != dossier patient Weda. Je clique sur le bouton de lecture de la carte vitale');
            setTimeout(function () {
                clickCarteVitale(); // cf. keyCommands.js
                checkPatientName();
            }, 200); // petit délai pour laisser le temps au système de se stabiliser
            carteVitaleLue = true; // Indique que la carte vitale a été lue
        });
        setTimeout(function () {
            waitLegacyForElement('span', 'Carte Vitale non lue', 5000, async function (spanElement) {
                if (carteVitaleLue) return; // Si la carte vitale a déjà été lue, arrête la surveillance
                console.log('Détecté : Carte Vitale non lue. Je clique sur le bouton de lecture de la carte vitale');
                await sleep(200); // petit délai pour laisser le temps au système de se stabiliser
                clickCarteVitale(); // cf. keyCommands.js
                checkPatientName();
                carteVitaleLue = true; // Indique que la carte vitale a été lue
            });
        }, 300); // Attendre 300 ms avant d'exécuter le code à l'intérieur de setTimeout (utile pour éviter une lecture cv trop rapide)
    }

    // vérifie la carte vitale
    setTimeout(function () {
        CarteVitaleNonLue();
    }, 200); // Attendre 200 ms avant de vérifier la carte vitale
});

/**
 * Gestion des boutons FSE dégradée et téléconsultation
 */
addTweak(fseUrl, 'TweakFSECreation', function tweakFSEVariantButtons() {
    function startFSEsansCV(type) {
        // fermer la fenêtre de lecture de carte vitale
        var closeButton = document.querySelector('a[title="Fermer cette fenêtre"]');
        if (closeButton) {
            closeButton.click();
            recordMetrics({ clicks: 1, drags: 1 });
        }
        // Trouver l'icône "fingerprint" et cliquer dessus
        var fingerprintIcon = document.querySelector('.mat-icon.notranslate.material-icons.mat-icon-no-color');
        console.log('Détecté : pression sur bouton dégradée. Je clique sur le bouton emprunte digitale');
        fingerprintIcon.click();
        recordMetrics({ clicks: 1, drags: 1 });
        // Attendre que le bouton contenant le texte "Degradée" existe et cliquer dessus
        waitLegacyForElement('[class="mat-button-wrapper"]', type, 5000, function (degradeeButton) {
            setTimeout(function () {
                console.log('Détecté : pression sur bouton ', type, '. Je clique sur le bouton degradé');
                degradeeButton.click();
                recordMetrics({ clicks: 1, drags: 1 });
            }, 200); // un clic trop précoce semble avoir des effets de bord
            // Puis clique sur le bouton "Adri"
            setTimeout(function () {
                console.log('Détecté : pression sur bouton ', type, '. Je clique sur le bouton de lecture adri');
                var adriElement = document.querySelector('img[src="/Images/adri.png"]');
                if (adriElement) {
                    adriElement.click();
                    recordMetrics({ clicks: 1, drags: 1 });
                }
            }, 3000);
        });
    }

    // Ajoute deux boutons : un pour les FSE dégradées, un pour les FSE Teleconsultation à côté de lecture carte vitale
    waitForElement({
        selector: 'a[title="Relance une lecture de la carte vitale"]',
        justOnce: false,
        callback: function (elements) {
            let lireCarteVitaleElement = elements[0];

            // Vérifier si les boutons existent déjà
            if (document.getElementById('targetValider') || document.getElementById('targetAnnuler')) {
                return;
            }

            // Style commun pour les boutons
            const commonStyle = {
                backgroundColor: 'rgba(0, 0, 0, 0.32)',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                margin: '0 4px',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'background-color 0.3s ease'
            };

            // Créer le premier bouton
            var button1 = document.createElement('button');
            button1.id = 'targetValider';
            button1.classList.add('boutonCustonWH');
            button1.textContent = 'FSE dégradée';
            Object.assign(button1.style, commonStyle);
            button1.onclick = function () {
                startFSEsansCV('Dégradé');
            };

            // Créer le deuxième bouton
            var button2 = document.createElement('button');
            button2.id = 'targetAnnuler';
            button2.classList.add('boutonCustonWH');
            button2.textContent = 'FSE Teleconsultation';
            Object.assign(button2.style, commonStyle);
            button2.onclick = function () {
                startFSEsansCV('Téléconsultation');
            };

            // Insérer les boutons avant l'élément "Lire la carte vitale"
            lireCarteVitaleElement.parentNode.insertBefore(button2, lireCarteVitaleElement);
            lireCarteVitaleElement.parentNode.insertBefore(button1, lireCarteVitaleElement);
        }
    });
});

/**
 * Gestion des raccourcis clavier n/o et des indices visuels pour les boutons radio
 */
addTweak(fseUrl, 'TweakFSECreation', function tweakFSENavigationNO() {
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
        var checkExist = setInterval(function () {
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
            var element = document.getElementById(index[event.key][0]);
            if (event.key == 'n' || event.key == 'o') {
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
                    recordMetrics({ clicks: 1, drags: 1 });
                    element.dispatchEvent(new Event('change'));
                }
                else if (element && element.type == 'checkbox' && !event.altKey) { //checked puis un event change ne fonctionnent pas sur une Checkbox donc on trigger un click()
                    console.log('trying to click element', element);
                    element.click();
                    recordMetrics({ clicks: 1, drags: 1 });
                }
            }

        }
    });
});

/**
 * Gestion des cotations par défaut en fonction des conditions (ALD, âge, téléconsultation, etc.)
 */
addTweak(fseUrl, 'defaultCotation', function tweakFSECotationDefaut() {
    if (window.location.href.includes('Buffer=')) {
        console.log('[defaultCotation] Buffer mode detected, skipping defaultCotation handling to avoid conflicts with other features like omnidoc facturation');
        return;
    }
    let aDefaultCotationHasBeenApplied = false; // Flag pour éviter d'appliquer plusieurs cotations par défaut
    function setDefaultValue() { // !! déclenche un rafraichissement partiel
        // va parcourir dans l'ordre le tableau de conditions et appliquer la première qui est remplie
        let conditionalCotations = [
            {
                condition: function () {
                    let fseTypeElement = document.querySelector('#form1 > div:nth-child(14) > div > div:nth-child(2) > vz-feuille-de-soin > div.fseContainer > div > div.toolbarContainer.thinCards.flexRow > mat-card.mat-card.mat-focus-indicator.cvContainer > vz-lecture-cv-widget > div > vz-mode-teletrans > div')
                    let isTeleconsultation = fseTypeElement.textContent === 'SV';
                    return isTeleconsultation;
                },
                action: 'DéfautTC',
                secondaryAction: function () {
                    let teleconsultationElement = document.querySelector('option[value="VI"]');
                    let menu = teleconsultationElement.parentElement;
                    menu.value = 'VI';

                    // Créez et déclenchez un événement 'change' sur le menu
                    let changeEvent = new Event('change', { bubbles: true });
                    menu.dispatchEvent(changeEvent);

                    // Créez et déclenchez un événement 'input' sur le menu
                    let inputEvent = new Event('input', { bubbles: true });
                    menu.dispatchEvent(inputEvent);

                    console.log('Teleconsultation sélectionnée');
                }
            },
            {
                condition: function () {
                    let ageOK = patientAgeInFSE() >= 80;
                    let isMT = estMTdeclareOuReferent(loggedInUser());
                    return ageOK && !isMT
                },
                action: 'DéfautMOP'

            },
            {
                condition: function () {
                    let isALD = document.querySelector('#mat-radio-2-input').checked;
                    return isALD;
                },
                action: 'DéfautALD'
            },
            {
                condition: function () {
                    // accident de travail
                    // Chercher le menu contenant les choix possibles de type d'assurance
                    // C'est le parent de l'élément contenant le texte "Accident du travail / Maladie professionnelle"
                    let textToSearch = 'Accident du travail / Maladie professionnelle';
                    let elements = document.querySelectorAll('.ng-star-inserted');
                    let elementOptionAT = Array.from(elements).find(el => el.textContent === textToSearch);
                    if (elementOptionAT) {
                        let menu = elementOptionAT.parentElement;
                        return menu.value === '41';
                    }
                },
                action: 'DéfautALD'
            },
            {
                condition: () => patientAgeInFSE() < 6,
                action: 'DéfautPédia'
            },
            {
                condition: function () {
                    return true; // Cette condition sera toujours vraie pour la cotation "Défaut"
                },
                action: 'Défaut'
            },
        ];

        // Définit la cotation par défaut
        addTweak('*', 'defaultCotation', function () {
            var elements = document.querySelectorAll('.flexRow.favoris.ng-star-inserted');
            console.log('elements', elements);

            for (let i = 0; i < conditionalCotations.length; i++) { // Loop dans le dico des cotations conditionnelles
                if (conditionalCotations[i].condition()) {// Si la condition est remplie
                    let action = conditionalCotations[i].action; // L'action c'est le nom du favori à appliquer
                    // L'action secondaire est une fonction à exécuter après avoir cliqué sur le favori.
                    // Par exemple, pour sélectionner le type de paiement "VI" pour les téléconsultations
                    let secondaryAction = conditionalCotations[i].secondaryAction;
                    // keyboard_arrow_right est nécessaire pour matcher le texte complet du favori qui contient ">" devant le nom
                    let targetElement = Array.from(elements).find(el => el.textContent.trim() === 'keyboard_arrow_right' + action);
                    if (targetElement) {
                        targetElement.click();
                        if (secondaryAction) {
                            secondaryAction();
                        }

                        recordMetrics({ clicks: 1, drags: 1 });
                        console.log('Cotation appliquée:', action);
                        return; // Arrête la fonction après avoir appliqué une cotation
                    } else if (action === 'Défaut') {
                        console.log('Action "Défaut" spécifiée mais non trouvée parmi les éléments.');
                        sendWedaNotifAllTabs({
                            message: "\"cotation par défaut\" n\'est pas désactivé dans les options, mais aucune cotation favorite nommée \"Défaut\" n\'a été trouvé. Vous devez soit ajouter un favori nommé exactement \"Défaut\", soit désactiver l\'option `\"cotation par défaut\" dans les options de Weda-Helper. Vous pouvez également définir DéfautPédia et DéfautALD.",
                            type: 'undefined',
                            icon: 'error_outline'
                        })
                        return; // Arrête la fonction si "Défaut" est spécifié mais non trouvé
                    }
                }
            }

            // Si aucune condition n'est remplie, afficher un message d'erreur
            console.log('Aucune condition remplie pour appliquer une cotation spécifique.');
        });
    }

    // Détecte le fait de cocher un élément contenant for='mat-radio-3-input' et for='mat-radio-2-input' puis déclencher setDefaultValue
    waitForElement({
        selector: '#mat-radio-3-input',
        callback: function () {
            let boutonsRadioASurveiller = document.querySelectorAll('#mat-radio-3-input, #mat-radio-2-input');
            boutonsRadioASurveiller.forEach(function (bouton) {
                bouton.addEventListener('change', function () {
                    console.log('[debug] change event detected');
                    if (!aDefaultCotationHasBeenApplied) {
                        setDefaultValue();
                        aDefaultCotationHasBeenApplied = true;
                    } else {
                        console.log('Une cotation par défaut a déjà été appliquée, je n\'en applique pas une autre');
                    }
                });
            });
        }
    });
});



/**
 * Détection automatique du médecin traitant et sélection de "Je suis le médecin traitant" dans la FSE
 */
addTweak(fseUrl, 'TweakFSEDetectMT', function () {
    waitForElement({
        selector: 'vz-medecin-traitant-weda div.mt10.ng-star-inserted',
        callback: function (element) {
            let userName = loggedInUser();
            let isMT = estMTdeclareOuReferent(userName);
            if (isMT) {
                console.log('MT déclaré = utilisateur en cours => je coche MT déclaré');
                let select = document.querySelector('vz-orientation select');
                select.value = '03'; // Je suis le médecin traitant
                select.dispatchEvent(new Event('change', { bubbles: true }));
                select.dispatchEvent(new Event('input', { bubbles: true }));
                recordMetrics({ clicks: 1, drags: 1 });
            }
        }
    });
});

/**
 * Gestion automatique de la FSE en gestion unique
 */
addTweak(fseUrl, 'TweakFSEGestionUnique', function () {
    waitForElement({
        selector: 'label[for=mat-checkbox-11-input] > span.mat-checkbox-inner-container.mat-checkbox-inner-container-no-side-margin > input',
        callback: function (element) {
            if (element[0].parentElement.parentElement.parentElement.parentElement.parentElement.textContent.includes('Réaliser une FSE en gestion unique')) //Fix un peu sale
            {
                console.log('Gestion unique activée clic sur element', element);
                element[0].click();
                recordMetrics({ clicks: 1, drags: 1 });
            }
        }
    });
});

/**
 * Coche automatiquement "Accident du travail / Maladie professionnelle : Non"
 */
addTweak(fseUrl, 'TweakFSEAccident', function () {
    waitForElement({
        selector: 'input[id="mat-radio-9-input"]',
        callback: function (element) {
            console.log('J trouve le bouton "non" pour accident de travail, je le coche', element);
            element[0].checked = true;
            recordMetrics({ clicks: 1, drags: 1 });
            element[0].dispatchEvent(new Event('change'));
        }
    });
});


// Dans le cas où est utilisé des paramètres AMC spécifiques (en cliquant sur AMC)
// cette partie permet de conserver le dernier choix
addTweak('/vitalzen/fse.aspx', '*TweakAMCFormule', function () {
    console.log('[TweakAMCFormule] Démarrage');
    // D'abord on attends l'élément encadrant le menu déroulant
    waitForElement({
        selector: '.mat-card-subtitle',
        textContent: 'Formule',
        // justOnce: false,
        callback: function (elements) {
            console.log('[TweakAMCFormule] élément trouvé', elements);
            // on sélection le frère suivant du parent
            let menuDeroulant = elements[0].parentElement.nextElementSibling;
            console.log('[TweakAMCFormule] menuDeroulant trouvé', menuDeroulant);
            // On vérifie si un des éléments est déjà sélectionné
            let currentOption = menuDeroulant.value;
            if (!currentOption) {
                console.log('[TweakAMCFormule] pas d\'option sélectionnée');
                // On récupère la valeur stockée
                chrome.storage.local.get(['AMCFormule'], function (result) {
                    console.log('[TweakAMCFormule] AMCFormule récupérée', result.AMCFormule);
                    if (result.AMCFormule) {
                        // Trouver l'option correspondante dans le menu déroulant
                        let optionToSelect = Array.from(menuDeroulant.options).find(option => option.value === result.AMCFormule);
                        if (optionToSelect) {
                            optionToSelect.selected = true; // Sélectionner l'option
                            optionToSelect.click(); // Cliquer sur l'option
                        }
                    }
                });
            }

            // On surveille le clic sur un des éléments du menu déroulant (les options)
            menuDeroulant.addEventListener('click', function (event) {
                console.log('[TweakAMCFormule] clic détecté sur le menu déroulant');
                // On stocke la valeur du menu déroulant
                let saveObj = {};
                saveObj['AMCFormule'] = menuDeroulant.value;
                chrome.storage.local.set(saveObj, function () {
                    console.log(`[TweakAMCFormule] AMCFormule saved`, menuDeroulant.value);
                });
            });
        }
    });
});


// Coche automatiquement "Présentation d'un feuillet AT" pour les FSE en accident de travail
addTweak('/vitalzen/fse.aspx', '*autoCheckFeuilletAT', function () {
    waitForElement({
        selector: 'span',
        textContent: "Présentation d'un feuillet AT",
        justOnce: true,
        callback: function (element) {
            console.log('[autoCheckFeuilletAT] élément trouvé je le click', element);
            element[0].click();
            recordMetrics({ clicks: 1, drags: 1 });
        }
    });
});

// Sélectionne automatiquement "Rien" dans "Pièce justificative AMO" si le texte d'erreur
// "Champ de donnée Actes - Pièce Justificative AMO invalide : Erreur de saisie Nature" apparaît
addTweak('/vitalzen/fse.aspx', '*autoSelectRienAMO', function () {
    waitForElement({
        selector: 'div',
        textContent: "Champ de donnée Actes - Pièce Justificative AMO invalide : Erreur de saisie Nature",
        callback: function () {
            console.log('[autoSelectRienAMO] erreur détectée');
            // Trouve le grand-père de l'élément span contenant le text "Nature de la pièce"
            let spans = document.querySelectorAll('span .ng-star-inserted');
            console.log('[autoSelectRienAMO] spans trouvés', spans);
            let ElementWithNature;
            for (let span of spans) {
                if (span.textContent.includes("Nature de la pièce")) {
                    console.log('[autoSelectRienAMO] élément Nature de la pièce trouvé', span);
                    ElementWithNature = span;
                    break; // Arrête la boucle dès que l'élément est trouvé
                }
            }
            let dropDownMenu = ElementWithNature.parentElement.parentElement;
            console.log('[autoSelectRienAMO] dropDownMenu trouvé', dropDownMenu);
            dropDownMenu.click();
            setTimeout(function () {
                let RienElement = document.querySelector('.mat-option-text');
                RienElement.click();
                recordMetrics({ clicks: 1, drags: 1 });
            }, 10); // Semble suffisant pour que le menu se soit ouvert
        }
    });
});


// Envoie automatiquement le montant de la FSE au TPE lors de la validation de la FSE
addTweak('/vitalzen/fse.aspx', '!RemoveLocalCompanionTPE', function () {
    waitForElement({
        selector: 'button',
        textContent: 'Sécuriser',
        callback: function (element) {
            console.log('bouton Sécuriser trouvé, je lui ajoute un écouteur de click');
            element[0].addEventListener('click', tpesender);
        }
    });
});


// Validation automatique du PDF de la FSE dégradée en SCOR
addTweak('/vitalzen/fse.aspx', 'autoValidateSCOR', function () {
    waitForElement({
        selector: '.previewDocument',
        callback: function () {
            console.log('[autoValidateSCOR] pdf-viewer trouvé, je clique sur le bouton de validation');
            // Chercher le bouton .mat-button-wrapper avec le innerText "Inclure"
            let button = document.querySelectorAll('.mat-button-wrapper');
            console.log('[autoValidateSCOR] boutons trouvés', button);
            for (let i = 0; i < button.length; i++) {
                if (button[i].innerText === 'Inclure') {
                    sendWedaNotif({
                        message: "PDF de la FSE dégradée en SCOR validée automatiquement. Vous pouvez désactiver cette fonctionnalité si vous le souhaitez dans les options de Weda Helper.",
                        type: 'success',
                        icon: 'check_circle'
                    })
                    console.log('[autoValidateSCOR] bouton trouvé, je clique dessus', button[i]);
                    button[i].click();
                    recordMetrics({ clicks: 1, drags: 1 });
                    break;
                }
            }
        }
    });
});





/**
 * -------------------------------------------------------------
 * Fonctions utilitaires pour la FSE
 * -------------------------------------------------------------
 */

/**
 * Calcule et retourne l'âge du patient depuis la FSE.
 * Extrait la date de naissance de l'interface et calcule l'âge en années.
 * 
 * @returns {number|null} - Âge du patient en années, ou null si indisponible
 */
function patientAgeInFSE() {
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

    // Étape 4: Retourner l'âge
    return age;
}

/**
 * Vérifie si l'utilisateur connecté est le médecin traitant déclaré ou le référent.
 * 
 * @param {string} userName - Nom de l'utilisateur connecté
 * @returns {boolean} - True si MT déclaré ou référent, false sinon
 */
function estMTdeclareOuReferent(userName) {
    // Recherche dans les éléments .ng-star-inserted si le nom du MT est présent en text
    let elements = document.querySelectorAll('.ng-star-inserted');
    for (let i = 0; i < elements.length; i++) {
        if (elements[i].textContent.includes(userName)) {
            return true;
        }
    }
    return false;
}

/**
 * Récupère le nom de l'utilisateur actuellement connecté.
 * Recherche dans l'interface Weda l'élément contenant le nom d'utilisateur.
 * 
 * @returns {string|null} - Nom de l'utilisateur, ou null si non trouvé
 */
function loggedInUser() {
    // Récupère le nom de l'utilisateur connecté
    let userName = document.getElementById('LabelUserLog').innerText;
    return userName;
}

/**
 * Vérifie et sélectionne automatiquement le patient correspondant dans le widget de lecture CV.
 * Compare le prénom du patient avec les éléments affichés et clique sur la correspondance.
 */
function checkPatientName() {
    waitForElement({
        selector: '[title="Prénom du patient"]', timeout: 5000,
        callback: patientNameElements => {
            var patientNameElement = patientNameElements[0];
            var patientName = patientNameElement.value;
            waitForElement({
                selector: 'vz-lecture-cv-widget', timeout: 5000,
                callback: widgetElements => {
                    var widgetElement = widgetElements[0];
                    var spans = widgetElement.getElementsByTagName('span');
                    for (var i = 0; i < spans.length; i++) {
                        if (spans[i].textContent.includes(patientName)) {
                            console.log('Patient name found');
                            spans[i].click();
                            recordMetrics({ clicks: 1, drags: 1 });
                            return true;
                        }
                    }
                    console.log('Patient name not found');
                    return false;
                }
            });
        }
    });
}



/**
 * Envoie automatiquement le montant au TPE après sécurisationou facturation FSE.
 * Surveille les boutons de sécurisation et facturation pour déclencher l'envoi TPE.
 */
async function tpesender() {
    let modeReglement = document.querySelector("vz-facturation select").value;
    let TPEOnlyForCB = await getOptionPromise('TPEOnlyForCB');
    if (TPEOnlyForCB && modeReglement != "CB") {
        return;
    }
    console.log('tpe_sender activé');
    var montantElement = document.querySelector('input[placeholder="Montant"]');
    // extraire le montant de l'élément
    var amount = montantElement.value;
    // retirer la virgule de amount
    amount = amount.replace(/\./g, '');
    console.log('amount', amount);
    sendtpeinstruction(amount);
}



