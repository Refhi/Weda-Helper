// Contrôle de l'IMTi

// Contrôle automatique du MT :
addTweak('/FolderMedical/PatientViewForm.aspx', 'autoControlMT', function () {
    getOption(['autoMTnewTab'], function ([autoMTnewTab]) {
        if (autoMTnewTab) {
            waitForElement({
                selector: 'a[title="Récupère l\'identité du médecin traitant en interrogeant le téléservice IMTi"]',
                callback: function (elements) {
                    // On ajoute un event listener pour attendre le clic
                    elements[0].addEventListener('click', function () {
                        if (autoMTnewTab) {
                            newPatientTab();
                        }
                    });
                }
            });
        }

        waitForElement({
            selector: '.dmpVitaleTable',
            callback: async function (elements) {
                let patientInfo = await getPatientInfo(getCurrentPatientId());
                let birthDate = patientInfo['birthDate']; // date au format "1955-06-15T00:00:00"
                let tableauPatientsCV = elements[0];
                let possibleDDN = tableauPatientsCV.querySelectorAll('tbody tr td:nth-child(4)'); // date au format " JJ/MM/AAAA "
                // dans ces éléments recherche celui correspondant à la bonne ddn
                let ddnElements = Array.from(possibleDDN).filter(element => element.textContent.trim() === birthDate.split('T')[0].split('-').reverse().join('/'));
                // Clique sur son parent
                if (ddnElements.length === 1) {
                    ddnElements[0].parentElement.click();
                    // Attendre l'apparition de l'élément de réponse
                    waitForElement({
                        selector: 'dmp-imti-response .flexColStart div span',
                        callback: function (elements) {
                            let nomMT = elements[0].parentElement.innerText.trim();
                            sendWedaNotifAllTabs({
                                message: `Le médecin traitant déclaré est : \"${nomMT}\", allez à l'onglet précédent pour valider.`,
                                type: 'success',
                                icon: 'done',
                                duration: 10000
                            });
                        }
                    });
                } else {
                    sendWedaNotifAllTabs({
                        message: 'Erreur dans le contrôle automatique du MT, jumeaux présents ?',
                        type: 'undefined',
                        icon: 'help_outline',
                    })
                }
            }
        });
    });
});

// Facilite la déclaration du MT en précochant les cases puis en validant le formulaire
addTweak(['/FolderMedical/PatientViewForm.aspx','/FolderMedical/PopUpViewBinaryForm.aspx'], 'oneClickMT', function () {
    const surveillanceDelay = 45000; // 30 secondes
    waitForElement({
        selector: '.dmpMtInfo',
        callback: function (elements) {
            // On ouvre un nouvel onglet pour la déclaration du MT + Ajout d'un timestamp pour vérifier qu'aucun newPatientTab n'a été ouvert entre temps
            // On vérifie que le timestamp est toujours valide car le .dmpMtInfo s'affiche 2 fois
            if (sessionStorage.getItem('lastNewPatientTab') && Date.now() - parseInt(sessionStorage.getItem('lastNewPatientTab')) < surveillanceDelay) {
                console.log("[oneClickMT] Un nouvel onglet a été ouvert entre temps, on ne fait rien.");
                return;
            }
            newPatientTab();
            sendWedaNotifAllTabs({
                message: 'Déclaration un clic du médecin traitant activée. Allez dans les options de Weda pour la désactiver si vous préférez.',
                type: 'success',
                icon: 'done',
                duration: 10000
            });
            document.title = 'Décla. MT. en cours';
            let checkBoxes = elements[0].parentElement.querySelectorAll('input[type="checkbox"]');
            checkBoxes.forEach(checkBox => {
                if (!checkBox.checked) {
                    checkBox.click();
                    recordMetrics({ clicks: 1, drags: 1 });
                }
            });
            setTimeout(() => {
                document.title = 'Décla. MT. validée';
                let boutonValider = document.querySelector('button[title="Transmettre le formulaire de déclaration de choix du médecin traitant"]');
                boutonValider.click();
            }, 500);

            // Ensuite on attend l'ouverture de la page de confirmation dans une nouvelle tab (via les autorisations tab)
            // On va faire une boucle toutes les 500ms pour vérifier si la page de confirmation est ouverte avec un timeout de 10 secondes
            let startTime = Date.now();
            let interval = setInterval(async () => {
                if (Date.now() - startTime > surveillanceDelay) {
                    clearInterval(interval);
                    sendWedaNotifAllTabs({
                        message: "Erreur dans la déclaration du MT, la page de confirmation n'a pas été trouvée.",
                        type: 'undefined',
                        icon: 'help_outline',
                    });
                    document.title = 'Décla. MT. erreur';
                } else {
                    document.title = 'Attente conf. MT.';
                    let tabs = await getAllTabs();
                    let tab = tabs.find(tab => tab.url.includes('https://secure.weda.fr/FolderMedical/PopUpViewBinaryForm.aspx?Eve='));
                    if (tab) {
                        clearInterval(interval);
                        sendWedaNotifAllTabs({
                            message: 'Déclaration du MT réussie !',
                            type: 'success',
                            icon: 'done',
                            duration: 10000
                        });
                        document.title = 'fin décla. MT. Fermeture.';
                        // On ferme la tab de déclaration du MT puis la page en cours
                        await closeTab(tab.id);
                        closeCurrentTab();
                    }
                }
            }, 500);
        }
    });
});

/**
 * Intégration automatique du MT et mise à jour de sa fiche avec l'annuaire IMTi
 * @description
 * Cette partie est assez complexe car elle s'étale sur plusieurs pages et nécessite de surveiller
 * l'état de la page et des actions précédentes pour valider la suite du processus.
 * D'où l'utilisation de la mémoire de session pour stocker l'état de l'opération.
 * J'ai essayé de commenter au mieux chaque étape pour faciliter la compréhension.
 */


// I. Fonction d'entrée !
addTweak('/FolderMedical/PatientViewForm.aspx', 'autoMTIncludeAndCheckContact', function () {
    console.log('[addMtToContacts] débuté');
    waitForElement({
        selector: '#ContentPlaceHolder1_imtiContainer a.ml5', // Correspond au bouton "Ajouter aux contacts du patient"
        callback: function (elements) {
            // Ajouter à sa droite un lien "WH : + adr. MSsante"
            let link = document.createElement('a');
            link.innerText = ' /+ avec son addresse MSsante';
            link.title = "Ajoute le médecin traitant aux contacts du patient et tente de récupérer son adresse MSsante via l'annuaire des pro de santé. Affiche une alerte en cas d'échec. (fonction ajoutée par Weda-Helper)";
            link.href = '#'; // Vous pouvez définir une URL si nécessaire
            elements[0].parentElement.appendChild(link);
            link.addEventListener('click', function (event) {
                event.preventDefault(); // Empêche le comportement par défaut du lien
                recordMetrics({ clicks: 1, drags: 1 });
                // Clic sur le bouton "Ajouter aux contacts du patient"
                console.log('[addMtToContacts] lien cliqué', elements[0]);
                // Ajout d'un timestamp dans la mémoire de session pour rediriger vers le bon onglet
                sessionStorage.setItem('autoMTIncludeAndCheckContact', Date.now());
                elements[0].click();
                recordMetrics({ clicks: 1, drags: 1 });
            });
        }
    });
});

// II. Renvoi vers la page de contact si la récupération du MT a été faite récemment
addTweak('/FolderMedical/PatientViewForm.aspx', 'autoMTIncludeAndCheckContact', function () {
    function openContactPage() {
        let elementToClick = document.querySelector('div[title="Cliquez ici pour renseigner les contacts du patient"]')
        if (elementToClick) {
            recordMetrics({ clicks: 1, drags: 1 });
            elementToClick.click();
        }
    }
    if (sessionStorage.getItem('autoMTIncludeAndCheckContact')) {
        // Vérifier le timestamp : s'il est récent (moins de 5 secondes), alors on clique sur le bouton
        let timestamp = parseInt(sessionStorage.getItem('autoMTIncludeAndCheckContact'));
        if (Date.now() - timestamp < 5000) {
            // mettre à jour le timestamp
            sessionStorage.setItem('autoMTIncludeAndCheckContact', Date.now());
            recordMetrics({ clicks: 1, drags: 1 });
            openContactPage();
        }
    }
});

// III. Intégration du MT dans les contacts
/**
 * Déclenché depuis l'accueil du ContactForm
 * Cherche le contact du médecin traitant et le sélectionne pour édition
 * S'arrête si plus de 5 secondes se sont écoulées
 */
addTweak('/FolderTools/ContactForm.aspx', 'autoMTIncludeAndCheckContact', function () {
    if (!verifierTimestamp()) {
        nettoyerTimestamp();
        return;
    }
    waitForElement({ // On attend que les contacts à droite de la page soient chargés
        selector: '[id^="ContentPlaceHolder1_PatientContactsGrid_LabelIsContactWeda_"]',
        callback: function (contacts) {
            console.log('[autoMTIncludeAndCheckContact] Contacts trouvés : ', contacts);
            // Si le timestamp est toujours valide, on continue
            if (!verifierTimestamp()) {
                return;
            }
            console.log('[autoMTIncludeAndCheckContact] Timestamp valide');

            const mtInfo = extractMTInfo(contacts); // Récupération nom/prénom du MT dans la liste de contact à droite
            recordMetrics({ clicks: 1, drags: 1 });
            if (!mtInfo) {
                nettoyerTimestamp();
                return;
            }

            console.log('[autoMTIncludeAndCheckContact] MT trouvé : ', mtInfo);
            // Mise à jour de la spécialité - arrêt si échec
            recordMetrics({ clicks: 1, drags: 1 });
            if (!updateSpeciality()) {
                nettoyerTimestamp();
                return;
            }

            console.log('[autoMTIncludeAndCheckContact] Spécialité mise à jour');

            // Mise à jour du champ de recherche avec le nom du MT
            recordMetrics({ clicks: 1, drags: 1 });
            if (!updateSearchField(mtInfo.nom)) {
                return;
            }

            console.log('[autoMTIncludeAndCheckContact] Champ de recherche mis à jour');

            // Sélection du contact du MT pour édition
            timeStampUpdate();
            recordMetrics({ clicks: 1, drags: 1 });

            console.log('[autoMTIncludeAndCheckContact] Contact sélectionné : ', mtInfo.prenom);
            selectMTContact(mtInfo.prenom);
        }
    });

    // III.d. Intégration du MT
    /**
     * Intégration automatique des informations du MT depuis le carnet d'addresses
     * 
     * @Note
     * Les ids des sélecteurs sont spécifiques aux pages pertinentes, d'où la simplification du flux
     */

    const GREENLIGHT_MT = 'GreenLightForContactMT';
    const GREENLIGHT_STATES = {
        READY_FOR_ASIP_UPDATE: 'READY_FOR_ASIP_UPDATE',
        READY_FOR_CONTACT_SELECTION: 'READY_FOR_CONTACT_SELECTION',
        READY_FOR_REPLACEMENT_VALIDATION: 'READY_FOR_REPLACEMENT_VALIDATION',
        READY_FOR_FINAL_VALIDATION: 'READY_FOR_FINAL_VALIDATION'
    };

    // III.d.1 - ASIP Update Button
    waitForElement({
        selector: '#ContentPlaceHolder1_ButtonMiseAJourAsip',
        callback: function (elements) {
            if (verifierTimestamp()) {
                sessionStorage.setItem(GREENLIGHT_MT, GREENLIGHT_STATES.READY_FOR_CONTACT_SELECTION);
                recordMetrics({ clicks: 1, drags: 1 });
                elements[0].click();
            }
        }
    });

    // III.d.2 - Contact Selection
    waitForElement({
        selector: '[id^="ContentPlaceHolder1_NewUserAsipUCForm1_AsipCAT18ToutePopulationsGrid_AsipCAT18ToutePopulationShowID_"]',
        callback: function (elements) {
            if (elements.length === 1 &&
                sessionStorage.getItem(GREENLIGHT_MT) === GREENLIGHT_STATES.READY_FOR_CONTACT_SELECTION &&
                verifierTimestamp()) {
                sessionStorage.setItem(GREENLIGHT_MT, GREENLIGHT_STATES.READY_FOR_REPLACEMENT_VALIDATION);
                recordMetrics({ clicks: 1, drags: 1 });
                elements[0].click();
            }
        }
    });

    // III.d.3 - Replacement Validation
    waitForElement({
        selector: '#ContentPlaceHolder1_ButtonValidRemplacement',
        callback: function (elements) {
            if (sessionStorage.getItem(GREENLIGHT_MT) === GREENLIGHT_STATES.READY_FOR_REPLACEMENT_VALIDATION &&
                verifierTimestamp()) {
                sessionStorage.setItem(GREENLIGHT_MT, GREENLIGHT_STATES.READY_FOR_FINAL_VALIDATION);
                recordMetrics({ clicks: 1, drags: 1 });
                elements[0].click();
            }
        }
    });

    // III.d.4 - Final Validation
    waitForElement({
        selector: '#ContentPlaceHolder1_ButtonValid',
        callback: function (elements) {
            if (sessionStorage.getItem(GREENLIGHT_MT) === GREENLIGHT_STATES.READY_FOR_FINAL_VALIDATION &&
                verifierTimestamp()) {
                sessionStorage.removeItem(GREENLIGHT_MT);
                elements[0].click();
                recordMetrics({ clicks: 1, drags: 1 });
                nettoyerTimestamp();
            }
        }
    });
});



// Fonctions support
function handleError(message) {
    sendWedaNotifAllTabs({
        message: message,
        type: 'undefined',
        icon: 'help_outline'
    });
    console.error("[autoMTIncludeAndCheckContact] " + message);
    sessionStorage.removeItem('autoMTIncludeAndCheckContact');
    return false;
}

function extractMTInfo(contacts) {
    const mtList = contacts
        .map(contact => {
            const contactNumber = contact.id.split('_')[3];
            const dropDown = document.querySelector(
                `#ContentPlaceHolder1_PatientContactsGrid_DropDownListGridPatientContactLabelRelation_${contactNumber}`
            );
            return dropDown.value === '5' ? contact.parentElement.querySelector('b').innerText : null;
        })
        .filter(Boolean);

    if (mtList.length !== 1) {
        return handleError('Erreur dans la récupération du MT : plusieurs ou aucun MT trouvés !');
    }

    const noms = mtList[0].split(' ');
    console.log('[extractMTInfo]', noms);
    return {
        nom: noms.filter(word => !/[a-z]/.test(word)).join(' '),
        prenom: noms.filter(word => /[a-z]/.test(word)).join(' ')
    };
}

function updateSpeciality() {
    const dropDown = document.querySelector('#ContentPlaceHolder1_DropDownListUserSpecialiteSVFind');
    if (dropDown.value === '01') return true;

    dropDown.value = '01';
    dropDown.dispatchEvent(new Event('change'));
    return false;
}

function updateSearchField(nom) {
    const input = document.querySelector('#ContentPlaceHolder1_TextBoxRecherche');
    if (input.value === nom) return true;

    input.value = nom;
    input.dispatchEvent(new Event('change'));
    return false;
}

function selectMTContact(prenom) {
    const prenoms = document.querySelectorAll('[id^="ContentPlaceHolder1_ContactsGrid_LinkButtonContactPrenom_"]');
    const contactNumbers = Array.from(prenoms)
        .filter(p => p.innerText === prenom)
        .map(p => p.id.split('_').pop());

    console.log("[selectMTContact]  : trouvé ces contacts", contactNumbers);

    if (contactNumbers.length !== 1) {
        return handleError('Erreur dans la recherche du MT : plusieurs ou aucun prenoms correspondants trouvés !');
    }

    console.log("[selectMTContact]  : sélection du contact", contactNumbers[0]);
    const editionButtonElement = document.querySelector(`#ContentPlaceHolder1_ContactsGrid_EditButtonContactsGrid_${contactNumbers[0]}`)
    if (editionButtonElement) {
        editionButtonElement.click();
    } else {
        handleError('Erreur dans la recherche du MT : bouton d\'édition non trouvé !');
    }
    return true;
}

// III.b.1. Fonctions de support à nouveau
function timeStampUpdate() {
    console.log("[autoMTIncludeAndCheckContact] Mise à jour du timestamp");
    sessionStorage.setItem('autoMTIncludeAndCheckContact', Date.now());
}

function verifierTimestamp() {
    const timestamp = sessionStorage.getItem('autoMTIncludeAndCheckContact');
    if (!timestamp) {
        console.log("[autoMTIncludeAndCheckContact] Aucun timestamp trouvé");
        return false;
    }
    const timeDiff = Date.now() - parseInt(timestamp);
    const resultCheck = timeDiff < 5000;
    console.log("[autoMTIncludeAndCheckContact] Vérification du timestamp : ", resultCheck);
    return resultCheck;
}

function nettoyerTimestamp() {
    let timeStampActuel = sessionStorage.getItem('autoMTIncludeAndCheckContact');
    console.log("[autoMTIncludeAndCheckContact] Nettoyage du timestamp", timeStampActuel);
    sessionStorage.removeItem('autoMTIncludeAndCheckContact');
}
