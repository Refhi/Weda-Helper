/**
 * @file imti.js
 * @description Gestion du contrôle et de la déclaration du Médecin Traitant (IMTI).
 * Automatise le processus de vérification et déclaration MT :
 * - Contrôle automatique du MT
 * - Récupération des infos MT depuis les contacts
 * - Recherche automatique dans l'annuaire
 * - Déclaration en un clic
 * - Gestion du workflow avec session storage
 * 
 * @requires tweaks.js (addTweak)
 * @requires storage.js (getOption)
 * @requires optionalPermissions.js (handleTabsFeature, closeCurrentTab)
 * @requires notifications.js (sendWedaNotif)
 */

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
addTweak(['/FolderMedical/PatientViewForm.aspx', '/FolderMedical/PopUpViewBinaryForm.aspx'], 'oneClickMT', function () {
    const surveillanceDelay = 45000;
    waitForElement({
        selector: '.dmpMtInfo',
        callback: async function (elements) {
            // Setup. On vérifie dans quelle occurrence on se trouve (Première ou deuxième apparition du panneau d'info)
            const lastDetection = localStorage.getItem("lastdmpMtInfoDetection");
            const lastDetectionTime = lastDetection ? parseInt(lastDetection, 10) : NaN;

            const isFirstDetection = isNaN(lastDetectionTime) || Date.now() - lastDetectionTime > surveillanceDelay;
            const isSecondDetection = !isFirstDetection;
            localStorage.setItem('lastdmpMtInfoDetection', Date.now());

            // 1. Gestion du message d'information et de la tab
            if (isFirstDetection) {
                newPatientTab();
                sendWedaNotifAllTabs({
                    message: 'Déclaration un clic du médecin traitant activée. Allez dans les options de Weda pour la désactiver si vous préférez.',
                    type: 'success',
                    icon: 'done',
                    duration: 10000
                });
                document.title = 'Décla. MT. en cours';
            }



            // 2. Cochage et validation du formulaire
            if (isSecondDetection) {
                let checkBoxes = document.querySelectorAll('#ContentPlaceHolder1_dmpContainer input[type="checkbox"]');
                console.log('[oneClickMT] checkBoxes trouvés : ', checkBoxes);
                checkBoxes.forEach(checkBox => {
                    if (!checkBox.checked) {
                        console.log('[oneClickMT] checkBox non coché : ', checkBox, 'je clique dessus');
                        checkBox.click();
                        recordMetrics({ clicks: 1, drags: 1 });
                    }
                });
                // Validation du formulaire
                setTimeout(() => {
                    document.title = 'Décla. MT. validée';
                    let boutonValider = document.querySelector('button[title="Transmettre le formulaire de déclaration de choix du médecin traitant"]');
                    // On place un timestamp pour marquer que la page doit être fermée
                    localStorage.setItem('autoMTDeclarationThisTabMustBeClosed', Date.now());
                    boutonValider.click(); // La page va se recharger
                    recordMetrics({ clicks: 1, drags: 1 });
                }, 500);
            }
        }
    });
});

// 4. Fermeture auto de la page de confirmation
// On attend l'ouverture de la page de confirmation dans une nouvelle tab (via les autorisations tab)
// On va faire une boucle toutes les 500ms pour vérifier si la page de confirmation est ouverte avec un timeout de 10 secondes
addTweak('/FolderMedical/PopUpViewBinaryForm.aspx', 'oneClickMT', function () {
    const surveillanceDelay = 45000;
    const lastDetection = localStorage.getItem("lastdmpMtInfoDetection");
    const lastDetectionTime = lastDetection ? parseInt(lastDetection, 10) : NaN;
    // On vérifie si le temps de dernière détection est inférieur à surveillanceDelay
    const isRecetDetection = !isNaN(lastDetectionTime) && Date.now() - lastDetectionTime < surveillanceDelay;
    if (isRecetDetection) {
        localStorage.removeItem("lastdmpMtInfoDetection");
        window.close();
    }
});

// 5. Fermeture auto de la page de déclaration du MT
addTweak('/FolderMedical/PatientViewForm.aspx', 'oneClickMT', async function () {
    const lastDetection = localStorage.getItem("autoMTDeclarationThisTabMustBeClosed");
    const lastDetectionTime = lastDetection ? parseInt(lastDetection, 10) : NaN;
    // On vérifie si le temps de dernière détection est inférieur à 5 secondes
    const isRecetDetection = !isNaN(lastDetectionTime) && Date.now() - lastDetectionTime < 15000;
    console.log("[oneClickMT] Dernière détection : ", lastDetectionTime, " - Temps écoulé : ", Date.now() - lastDetectionTime, "isRecetDetection", isRecetDetection);
    if (isRecetDetection) {
        localStorage.removeItem("autoMTDeclarationThisTabMustBeClosed");
        console.log("[oneClickMT] Fermeture de la page de déclaration du MT car ", isRecetDetection);
        await sendWedaNotifAllTabs({
            message: 'Déclaration du médecin traitant automatique terminée.',
            type: 'success',
            icon: 'done',
        });
        window.close();
    }
});


/**
 * Intégration automatique du MT et mise à jour de sa fiche avec l'annuaire IMTi
 * @description
 * Cette partie est assez complexe car elle s'étale sur plusieurs pages et nécessite de surveiller
 * l'état de la page et des actions précédentes pour valider la suite du processus.
 * D'où l'utilisation de la mémoire de session pour stocker l'état de l'opération via un système de checklist.
 * J'ai essayé de commenter au mieux chaque étape pour faciliter la compréhension.
 */

// Configuration du workflow
const MT_WORKFLOW_KEY = 'autoMTIncludeAndCheckContact_workflow';
const MT_WORKFLOW_TIMEOUT = 15000; // 15 secondes de timeout global

const MT_STEPS = {
    INIT: 'INIT',
    CONTACT_PAGE_OPENED: 'CONTACT_PAGE_OPENED',
    MT_EXTRACTED: 'MT_EXTRACTED',
    SPECIALTY_UPDATED: 'SPECIALTY_UPDATED',
    SEARCH_UPDATED: 'SEARCH_UPDATED',
    CONTACT_SELECTED: 'CONTACT_SELECTED',
    ASIP_UPDATE_CLICKED: 'ASIP_UPDATE_CLICKED',
    CONTACT_SELECTED_FROM_ASIP: 'CONTACT_SELECTED_FROM_ASIP',
    REPLACEMENT_VALIDATED: 'REPLACEMENT_VALIDATED',
    FINAL_VALIDATED: 'FINAL_VALIDATED'
};

// Fonctions de gestion du workflow
function initWorkflow() {
    const workflow = {
        startTime: Date.now(),
        completed: [MT_STEPS.INIT],
        currentStep: MT_STEPS.INIT,
        mtInfo: null
    };
    sessionStorage.setItem(MT_WORKFLOW_KEY, JSON.stringify(workflow));
    console.log('[MT Workflow] Initialisé', workflow);
    return workflow;
}

function getWorkflow() {
    const data = sessionStorage.getItem(MT_WORKFLOW_KEY);
    if (!data) return null;
    try {
        return JSON.parse(data);
    } catch (e) {
        console.error('[MT Workflow] Erreur de parsing', e);
        return null;
    }
}

function updateWorkflow(updates) {
    const workflow = getWorkflow();
    if (!workflow) {
        console.error('[MT Workflow] Tentative de mise à jour sur workflow inexistant');
        return null;
    }
    
    const updated = { ...workflow, ...updates };
    sessionStorage.setItem(MT_WORKFLOW_KEY, JSON.stringify(updated));
    console.log('[MT Workflow] Mis à jour', updated);
    return updated;
}

function completeStep(step, additionalData = {}) {
    const workflow = getWorkflow();
    if (!workflow) {
        console.error('[MT Workflow] Tentative de complétion sur workflow inexistant');
        return null;
    }
    
    if (!workflow.completed.includes(step)) {
        workflow.completed.push(step);
    }
    workflow.currentStep = step;
    
    const updated = { ...workflow, ...additionalData };
    sessionStorage.setItem(MT_WORKFLOW_KEY, JSON.stringify(updated));
    console.log(`[MT Workflow] Étape complétée: ${step}`, updated);
    return updated;
}

function isStepCompleted(step) {
    const workflow = getWorkflow();
    return workflow && workflow.completed.includes(step);
}

function isWorkflowValid() {
    const workflow = getWorkflow();
    if (!workflow) {
        console.log('[MT Workflow] Aucun workflow trouvé');
        return false;
    }
    
    const elapsed = Date.now() - workflow.startTime;
    const isValid = elapsed < MT_WORKFLOW_TIMEOUT;
    
    if (!isValid) {
        console.log(`[MT Workflow] Expiré (${elapsed}ms > ${MT_WORKFLOW_TIMEOUT}ms)`);
    }
    
    return isValid;
}

function cleanWorkflow() {
    const workflow = getWorkflow();
    console.log('[MT Workflow] Nettoyage', workflow);
    sessionStorage.removeItem(MT_WORKFLOW_KEY);
}

function handleWorkflowError(message) {
    sendWedaNotifAllTabs({
        message: message,
        type: 'undefined',
        icon: 'help_outline'
    });
    console.error('[MT Workflow] ' + message);
    cleanWorkflow();
    return false;
}


// I. Fonction d'entrée !
// Comportement modifié = ajoute un lien à côté du bouton "Ajouter aux contacts du patient" qui
// clique sur ce bouton et initialise le workflow
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
                // Initialisation du workflow
                initWorkflow();
                elements[0].click();
                recordMetrics({ clicks: 1, drags: 1 });
            });
        }
    });
});

// II. Renvoi vers la page de contact si le workflow a été initialisé
addTweak('/FolderMedical/PatientViewForm.aspx', 'autoMTIncludeAndCheckContact', function () {
    function openContactPage() {
        let elementToClick = document.querySelector('div[title="Cliquez ici pour renseigner les contacts du patient"]')
        if (elementToClick) {
            recordMetrics({ clicks: 1, drags: 1 });
            elementToClick.click();
        }
    }
    
    const workflow = getWorkflow();
    if (workflow && isWorkflowValid() && workflow.currentStep === MT_STEPS.INIT) {
        console.log('[MT Workflow] Redirection vers page de contact');
        completeStep(MT_STEPS.CONTACT_PAGE_OPENED);
        openContactPage();
    }
});

// III. Intégration du MT dans les contacts
/**
 * Déclenché depuis l'accueil du ContactForm
 * Cherche le contact du médecin traitant et le sélectionne pour édition
 */
addTweak('/FolderTools/ContactForm.aspx', 'autoMTIncludeAndCheckContact', function () {
    if (!isWorkflowValid()) {
        cleanWorkflow();
        return;
    }
    
    waitForElement({
        selector: '[id^="ContentPlaceHolder1_PatientContactsGrid_LabelIsContactWeda_"]',
        triggerOnInit: true,
        callback: function (contacts) {
            console.log('[MT Workflow] Contacts trouvés : ', contacts);
            
            if (!isWorkflowValid()) {
                cleanWorkflow();
                return;
            }
            
            const workflow = getWorkflow();
            console.log('[MT Workflow] État actuel:', workflow);
            
            // Extraction des infos MT si pas déjà fait
            if (!isStepCompleted(MT_STEPS.MT_EXTRACTED)) {
                const mtInfo = extractMTInfo(contacts);
                recordMetrics({ clicks: 1, drags: 1 });
                if (!mtInfo) {
                    cleanWorkflow();
                    return;
                }
                
                console.log('[MT Workflow] MT trouvé : ', mtInfo);
                completeStep(MT_STEPS.MT_EXTRACTED, { mtInfo });
            }
            
            // Mise à jour de la spécialité si pas déjà fait
            if (!isStepCompleted(MT_STEPS.SPECIALTY_UPDATED)) {
                recordMetrics({ clicks: 1, drags: 1 });
                if (!updateSpeciality()) {
                    cleanWorkflow();
                    return;
                }
                console.log('[MT Workflow] Spécialité mise à jour');
                completeStep(MT_STEPS.SPECIALTY_UPDATED);
            }
            
            // Mise à jour du champ de recherche si pas déjà fait
            if (!isStepCompleted(MT_STEPS.SEARCH_UPDATED)) {
                const currentWorkflow = getWorkflow();
                recordMetrics({ clicks: 1, drags: 1 });
                if (!updateSearchField(currentWorkflow.mtInfo.nom)) {
                    return;
                }
                console.log('[MT Workflow] Champ de recherche mis à jour');
                completeStep(MT_STEPS.SEARCH_UPDATED);
            }
            
            // Sélection du contact si pas déjà fait
            if (!isStepCompleted(MT_STEPS.CONTACT_SELECTED)) {
                const currentWorkflow = getWorkflow();
                recordMetrics({ clicks: 1, drags: 1 });
                console.log('[MT Workflow] Sélection du contact : ', currentWorkflow.mtInfo.prenom);
                selectMTContact(currentWorkflow.mtInfo.prenom);
                completeStep(MT_STEPS.CONTACT_SELECTED);
            }
        }
    });

    // III.d. Intégration du MT depuis ASIP
    /**
     * Intégration automatique des informations du MT depuis le carnet d'addresses
     */

    // III.d.1 - ASIP Update Button
    waitForElement({
        selector: '#ContentPlaceHolder1_ButtonMiseAJourAsip',
        callback: function (elements) {
            if (isWorkflowValid() && isStepCompleted(MT_STEPS.CONTACT_SELECTED) && 
                !isStepCompleted(MT_STEPS.ASIP_UPDATE_CLICKED)) {
                completeStep(MT_STEPS.ASIP_UPDATE_CLICKED);
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
                isStepCompleted(MT_STEPS.ASIP_UPDATE_CLICKED) &&
                !isStepCompleted(MT_STEPS.CONTACT_SELECTED_FROM_ASIP) &&
                isWorkflowValid()) {
                completeStep(MT_STEPS.CONTACT_SELECTED_FROM_ASIP);
                recordMetrics({ clicks: 1, drags: 1 });
                elements[0].click();
            }
        }
    });

    // III.d.3 - Replacement Validation
    waitForElement({
        selector: '#ContentPlaceHolder1_ButtonValidRemplacement',
        callback: function (elements) {
            if (isStepCompleted(MT_STEPS.CONTACT_SELECTED_FROM_ASIP) &&
                !isStepCompleted(MT_STEPS.REPLACEMENT_VALIDATED) &&
                isWorkflowValid()) {
                completeStep(MT_STEPS.REPLACEMENT_VALIDATED);
                recordMetrics({ clicks: 1, drags: 1 });
                elements[0].click();
            }
        }
    });

    // III.d.4 - Final Validation
    waitForElement({
        selector: '#ContentPlaceHolder1_ButtonValid',
        callback: function (elements) {
            if (isStepCompleted(MT_STEPS.REPLACEMENT_VALIDATED) &&
                !isStepCompleted(MT_STEPS.FINAL_VALIDATED) &&
                isWorkflowValid()) {
                completeStep(MT_STEPS.FINAL_VALIDATED);
                elements[0].click();
                recordMetrics({ clicks: 1, drags: 1 });
                cleanWorkflow();
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
