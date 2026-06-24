/**
 * @file VSM.js
 * @description Fonctionnalités pour la page de gestion des VSM.
 * Gère les améliorations de l'interface des VSM :
 * - Surveillance de la date du dernier VSM
 * - Alertes pour les VSM manquants ou expirés
 * - Notifications pour les patients en ALD de faire un VSM
 * - Ajout de la date du dernier VSM sur la page des antécédents
 * 
 * @requires tweaks.js (addTweak)
 * @requires storage.js (getOption)
 * @requires metrics.js (recordMetrics)
 */


// Surveillance de la date du dernier VSM
addTweak('/FolderMedical/PatientViewForm.aspx', '*preAlertVSM', async function () {
    let preAlertDuration = await getOptionPromise('preAlertVSM');
    // Si la valeur est négative, on ne fait rien
    if (preAlertDuration < 0) {
        return;
    }
    const patientNumber = getCurrentPatientId();

    waitForElement({
        selector: '#ContentPlaceHolder1_EtatCivilUCForm1_LabelLastVSMDate',
        callback: function (elements) {
            const VSMElement = elements[0];
            console.log('[preAlertVSM] VSMElement', VSMElement);
            const lastVSMDate = VSMElement.textContent;
            
            if (lastVSMDate) {
                const today = new Date();
                // lastVSMDate est au format (12/04/2024), on le convertit en objet Date
                const [day, month, year] = lastVSMDate.match(/\d+/g);
                const lastVSMDateObj = new Date(`${year}-${month}-${day}`);
                // On vérifie que la date est valide
                if (isNaN(lastVSMDateObj)) {
                    return;
                }
                // On vérifie quelle est l'ancienneté du VSM
                const VSMAge = today - lastVSMDateObj;
                // Calculer combien de temps avant d'atteindre 1 an
                const timeUntilExpiration = 31557600000 - VSMAge; // 31557600000 ms = 1 an
                // Si le VSM expire dans moins de preAlertDuration mois, on le met en orange
                if (timeUntilExpiration > 0 && timeUntilExpiration < preAlertDuration * 30.44 * 24 * 60 * 60 * 1000) {
                    VSMElement.style.color = 'orange';
                    VSMElement.style.fontWeight = 'bold';
                }
                // Si le VSM est plus vieux que 1 an, on le met en rouge
                if (VSMAge > 31557600000) {
                    VSMElement.style.color = 'red';
                    VSMElement.style.fontWeight = 'bold';
                }

                // On stocke dans le sessionStorage la date du dernier VSM, la couleur et le numéro du dossier patient pour pouvoir l'utiliser sur la page des antécédents
                const lastVSMData = {
                    date: lastVSMDate,
                    color: VSMElement.style.color,
                    patientNumber: patientNumber
                };
                sessionStorage.setItem('lastVSMData', JSON.stringify(lastVSMData));
                console.log('[preAlertVSM][showLastVSMDate] lastVSMData stored in sessionStorage', lastVSMData);

            } else {
                // On vérifie si on a déjà alerté pour ce patient
                const lastVSMAlertPatient = sessionStorage.getItem('lastVSMAlertPatient');
                if (lastVSMAlertPatient === patientNumber) {
                    console.log('[preAlertVSM] Alert already sent for patient', patientNumber);
                    return;
                }
                console.log('[preAlertVSM] Alert not sent for patient', patientNumber);
                // On vérifie si le patient a des prescriptions ALD
                waitForElement({
                    selector: 'div.aldt',
                    justOnce: true,
                    callback: function (aldElements) {
                        if (aldElements.length > 0) {
                            // On envoie une notification pour prévenir l'utilisateur
                            sendWedaNotif({
                                message: 'Le patient semble être en ALD, mais la date du dernier VSM est introuvable, pensez à remplir le VSM pour bénéficier du ROSP. Vous pouvez désactiver cette alerte dans les options de Weda-Helper.',
                                type: 'undefined',
                                duration: 7000,
                                icon: 'info',
                            });
                        }
                    }
                });
            }

            // On stocke le numéro du patient dans le sessionStorage pour évincer les alertes répétées
            // => une seule alerte à l'ouverture du dossier.
            sessionStorage.setItem('lastVSMAlertPatient', patientNumber);
        }
    });
});

// -------------------------- +1click VSM -------------------------------------
addTweak(['/FolderMedical/PatientViewForm.aspx', '/FolderMedical/CdaForm.aspx', '/FolderMedical/DMP/view', '/FolderMedical/AntecedentForm.aspx'], 'oneClickVSM', async function () {
    let pourcentageUtilisateur = await getOptionPromise('oneClickVSMToleranceLevel'); // Au format 70 pour 70% pour 0.3 de ratio
    // Conversion au format numérique
    pourcentageUtilisateur = parseFloat(pourcentageUtilisateur);
    // const MAX_ERROR_RATIO = 0.3;
    const MAX_ERROR_RATIO = parseFloat((1 - pourcentageUtilisateur / 100).toFixed(2)); // On arrondit à 2 décimales
    console.log('[oneClickVSM] MAX_ERROR_RATIO', MAX_ERROR_RATIO, 'pourcentageUtilisateur', pourcentageUtilisateur);
    const CLICK_TIMEOUT = 15000;

    // Depuis la page d'accueil on ajoute un bouton pour le VSM en un clic
    waitForElement({
        selector: '#ContentPlaceHolder1_EtatCivilUCForm1_HyperLinkOpenVSM',
        callback: function () { setupPatientViewButton() }
    });

    // On ajoute également un bouton sur la page d’édition des antécédents
    waitForElement({
        selector: '#ContentPlaceHolder1_ButtonExitVsm',
        callback: function (elements) {
            const exitVSMButton = elements[0];
            if (!document.querySelector('#oneClickVSMButton')) {
                const oneClickVSMButton = document.createElement('button');
                oneClickVSMButton.textContent = '+1clickVSM';
                oneClickVSMButton.id = 'oneClickVSMButton';
                oneClickVSMButton.title = 'Weda-Helper : Créer un VSM en un clic. Ne fonctionne que si au moins 70% des champs sont au format CIM-10';

                // Copier le style du bouton de référence
                const referenceButton = document.querySelector('#ContentPlaceHolder1_ButtonFind');
                // Lui retirer les classes button et valid pour éviter les conflits de raccourcis clavier
                if (referenceButton) {
                    oneClickVSMButton.className = referenceButton.className;
                    oneClickVSMButton.classList.remove('button');
                    // Ajouter uniquement la marge gauche en plus
                    oneClickVSMButton.style.marginLeft = '10px';
                }

                oneClickVSMButton.id = 'oneClickVSMButton';
                oneClickVSMButton.addEventListener('click', async function () {
                    setOneClickVSMTimestamp();
                    await sleep(500);
                    const refreshedVSMButton = document.querySelector('#ContentPlaceHolder1_ButtonExitVsm');
                    console.log('refreshedVSMButton', refreshedVSMButton);
                    recordMetrics({ clicks: 1, drags: 1 });
                    refreshedVSMButton.click();
                });
                exitVSMButton.parentNode.parentNode.appendChild(oneClickVSMButton);
            }
        }
    });

    // Depuis la page de vérification du VSM (on attends l'apparition du titre avant de vérifier les erreurs)
    waitForElement({
        selector: 'h1.h1center',
        callback: function () { handleVSMVerificationPage(MAX_ERROR_RATIO, CLICK_TIMEOUT) }
    });

    // Validation finale, à décommenter si nécessaire
    waitForElement({
        selector: 'div.tab_valid_cancel button.button.valid',
        observerId: 'oneClickVSMFinalValidation',
        // triggerOnInit: true, => contre-productif
        callback: function (elements) {
            console.log('[oneClickVSM] Validation finale détectée', elements); 
            if (oneClickVSMwithinTimeRange(CLICK_TIMEOUT)) {
                recordMetrics({ clicks: 1, drags: 1 });
                setTimeout(() => {
                    elements[0].click();
                }, 500);
            }
        }
    });
});


// Gestion depuis l'accueil du dossier patient
function setupPatientViewButton() {
    const VSMButton = document.querySelector('#ContentPlaceHolder1_EtatCivilUCForm1_HyperLinkOpenVSM');
    if (!VSMButton) return;

    // Vérifier que le cadre où on va ajouter le bouton a une taille suffisante
    const cadre = document.querySelector('#ContentPlaceHolder1_EtatCivilUCForm1_PanelDmp');
    const cadreWidth = cadre.offsetWidth;
    const conteneur = document.querySelector('#ContentPlaceHolder1_EtatCivilUCForm1_FramePatient');
    const conteneurWidth = conteneur.offsetWidth;
    // Le bouton ajoute (nommé +1clickVSM) fait environs 70px de large
    const enoughSpace = conteneurWidth - cadreWidth - 65 > 70; // 65 pour l'icone MonEspaceSanté
    console.log('cadreWidth', cadreWidth, 'conteneurWidth', conteneurWidth, 'enoughSpace', enoughSpace);

    // Création du bouton de raccourci
    const oneClickVSMButton = document.createElement('a');
    oneClickVSMButton.textContent = '+1clickVSM';
    oneClickVSMButton.id = 'oneClickVSMButton';
    oneClickVSMButton.title = 'Weda-Helper : Créer un VSM en un clic. Ne fonctionne que si au moins 70% des champs sont au format CIM-10';
    oneClickVSMButton.style.cssText = 'cursor: pointer; color: blue; text-decoration: underline; margin-left: 10px;';

    oneClickVSMButton.addEventListener('click', function () {
        setOneClickVSMTimestamp();
        VSMButton.click();
    });

    if (enoughSpace) {
        // Si assez d'espace, ajouter à côté
        VSMButton.parentNode.appendChild(oneClickVSMButton);
    } else {
        console.log('Pas assez de place pour ajouter le bouton +1clickVSM à côté, ajout en dessous');

        // Créer un div conteneur pour positionner le bouton sous le VSMButton
        const container = document.createElement('div');
        container.style.marginTop = '5px';
        container.appendChild(oneClickVSMButton);


        VSMButton.parentNode.parentNode.parentNode.appendChild(container, VSMButton.nextSibling);
    }
}

// Gestion depuis la page de vérification du VSM
function handleVSMVerificationPage(MAX_ERROR_RATIO, CLICK_TIMEOUT) {
    const DMPButton = document.querySelector('img[aria-describedby="cdk-describedby-message-5"]');
    if (!DMPButton) return;

    // Vérification du timestamp
    if (!oneClickVSMwithinTimeRange(CLICK_TIMEOUT)) return;

    // Analyse des erreurs
    const checkBoxElementsNum = document.querySelectorAll('input[type="checkbox"]').length;
    const errorPanel = document.querySelectorAll('div.invite p.alertPanel')[1];
    const errorNum = errorNumber(errorPanel);

    if (errorNum <= checkBoxElementsNum * MAX_ERROR_RATIO) {
        const successRate = Math.round(((checkBoxElementsNum - errorNum) / checkBoxElementsNum) * 100);
        console.log(`Nombre d'erreurs acceptable (${errorNum}/${checkBoxElementsNum}, taux de réussite: ${successRate}%), envoi automatique du VSM`);
        sendWedaNotifAllTabs({
            message: `Taux de validation du VSM: ${successRate}% supérieur au taux de ${(1 - MAX_ERROR_RATIO) * 100}% requis => envoi automatique du VSM`,
            type: 'success',
            duration: 5000,
            icon: 'success',
        });
        recordMetrics({ clicks: 1, drags: 1 });
        setOneClickVSMTimestamp(); // On rafrachit le timestamp
        DMPButton.click();
    } else {
        const successRate = Math.round(((checkBoxElementsNum - errorNum) / checkBoxElementsNum) * 100);
        console.log(`Trop d'erreurs pour le VSM en un clic (${errorNum}/${checkBoxElementsNum}, taux de réussite: ${successRate}%)`);
        message = `Taux de validation du VSM: ${successRate}% inférieur au taux de ${(1 - MAX_ERROR_RATIO) * 100}% requis pour le ROSP. Envoi automatique annulé.`;
        sendWedaNotifAllTabs({
            message: message,
            type: 'undefined',
            duration: 5000,
            icon: 'error',
        });
    }
}

function errorNumber(errorPanel) {
    if (!errorPanel) return 0; // Si le panneau n'apparait pas c'est qu'il n'y a pas aucune ligne en erreur
    const errorNumMatch = errorPanel.textContent.match(/\d+/);


    return parseInt(errorNumMatch[0]);
}

function oneClickVSMwithinTimeRange(CLICK_TIMEOUT) {
    const oneClickVSMTimestamp = sessionStorage.getItem('oneClickVSM');
    if (!oneClickVSMTimestamp) return false;

    return Date.now() - oneClickVSMTimestamp < CLICK_TIMEOUT;
}

function setOneClickVSMTimestamp() {
    sessionStorage.setItem('oneClickVSM', Date.now());
}


// -------------------------- ajout de la date du dernier VSM sur la page des antécédents ---------------------
addTweak('/FolderMedical/AntecedentForm.aspx', '*showLastVSMDate', function () {
    const lastVSMData = JSON.parse(sessionStorage.getItem('lastVSMData'));
    if (!lastVSMData) {
        console.log('[showLastVSMDate] lastVSMData not found in sessionStorage');
        return;
    }
    const VSMButtonElement = document.querySelector('#ContentPlaceHolder1_ButtonExitVsm');
    if (!VSMButtonElement) {
        console.log('[showLastVSMDate] VSMButtonElement not found');
        return;
    }
    console.log('[showLastVSMDate] lastVSMData', lastVSMData);

    const lastVSMDateElement = document.createElement('span');
    lastVSMDateElement.textContent = `Dernier VSM : ${lastVSMData.date}`;
    lastVSMDateElement.title = 'Weda-Helper : date du dernier VSM, récupérée depuis la page d’accueil lors de cette session.';
    lastVSMDateElement.style.color = lastVSMData.color;
    lastVSMDateElement.style.fontWeight = 'bold';
    lastVSMDateElement.style.marginLeft = '10px';

    VSMButtonElement.parentNode.insertBefore(lastVSMDateElement, VSMButtonElement.nextSibling);
});