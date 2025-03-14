// // [page d'accueil]
let homePageUrls = [
    '/FolderMedical/FindPatientForm.aspx',
    '/FolderMedical/PatientViewForm.aspx'
];

let homePageFunctions = [
    {
        option: '*preAlertATCD',
        callback: function () {
            waitForElement({
                selector: '[title="Date d\'alerte"]',
                callback: function (elements) {
                    elements.forEach(alertElement => {
                        // ici le texte est au format Alerte : 01/01/2011.
                        // Donc d'abord retirer le point final
                        alertElement.textContent = alertElement.textContent.replace('.', '');
                        let alertDateText = alertElement.textContent.split(' : ')[1];
                        if (!alertDateText) {
                            return;
                        }

                        // Vérifier que alertDateText est bien au format xx/xx/xxxx
                        const datePattern = /^\d{2}\/\d{2}\/\d{4}$/;
                        if (!datePattern.test(alertDateText)) {
                            return;
                        }
                        // Conversion manuelle de la date
                        let [day, month, year] = alertDateText.split('/');
                        let alertDate = new Date(`${year}-${month}-${day}`);

                        // Ne continuer que si la date est valide
                        if (isNaN(alertDate)) {
                            return;
                        }
                        let today = new Date();
                        let fiveMonthsLater = new Date();
                        console.log('alertDate', alertDate, 'today', today);
                        getOption('preAlertATCD', function (preAlertATCD) {
                            preAlertATCD = parseInt(preAlertATCD);
                            fiveMonthsLater.setMonth(today.getMonth() + preAlertATCD);
                            if (alertDate <= fiveMonthsLater && alertDate > today) {
                                // Mettre l'élément en orange et en gras
                                alertElement.style.color = 'orange';
                                alertElement.style.fontWeight = 'bold';

                            }
                        });
                    });
                }
            });
        }
    },
    {
        option: '!RemoveLocalCompanionPrint',
        callback: function () {
            function returnAATIElement() {
                // Le selecteur est .sc et le titre débute par "Dernier A.T."
                let aatiElement = document.querySelector('.sc[title^="Dernier A.T."]');
                console.log('aatiElement', aatiElement);
                return aatiElement;
            }
            console.log('je tente de clicker sur le dernier pdf');
            chrome.storage.local.get(['autoAATIexit', 'RemoveLocalCompanionPrint'], function (result) {
                if (Date.now() - result.autoAATIexit < 10000 && result.RemoveLocalCompanionPrint === false) {
                    console.log('autoAATIexit', result.autoAATIexit, 'is less than 10s old, donc je tente d\'ouvrir le pdf du dernier arrêt de travail');
                    // Ouvre le dernier arrêt de travail
                    let element = returnAATIElement();
                    element.click();
                } else {
                    // let element = returnAATIElement();
                    // element.click();
                }
            });
        },
    },
    {
        option: 'autoSelectPatientCV',
        callback: function () {
            // lit automatiquement la carte vitale elle est insérée
            // selecteur de ttt131 : body > weda-notification-container > ng-component > mat-card > div > p
            // selecteur ce jour : body > weda-notification-container > ng-component:nth-child(2) > mat-card > div > p
            let cvSelectors = 'weda-notification-container ng-component mat-card div p';

            waitForElement({
                selector: cvSelectors,
                callback: function (elements) {
                    console.log('cvSelectors', elements, 'found');
                    elements.forEach(cvElement => {
                        console.log('cvElement text', cvElement.textContent);
                        if (cvElement.textContent.includes('Vitale insérée')) {
                            console.log('cvElement', cvElement, 'found');
                            recordMetrics({ clicks: 1, drags: 1 });
                            clickCarteVitale();
                        }
                    });
                }
            });


            // sélectionne automatiquement le dossier patient lié s'il est seul sur la carte
            let patientSelector = '#mat-dialog-0 > vz-lecture-cv table .grid-item'
            const lookForPatient = () => {
                var elements = document.querySelectorAll(patientSelector);
                // remove from the elements all without only capital letters or spaces in the text
                elements = Array.from(elements).filter(element => element.textContent.match(/^[A-Z\s-]+$/));
                // remove any .patientLink.pointer.ng-star-inserted
                elements = Array.from(elements).filter(element => !element.querySelector('.patientLink.pointer.ng-star-inserted'));
                // remove any NOT containing a space in the text
                elements = Array.from(elements).filter(element => element.textContent.match(/\s/));

                console.log('les patients trouvés sont', elements);
                if (elements.length === 1) {
                    console.log('Patient seul trouvé, je clique dessus', elements[0]);
                    // target the next element in the DOM on the same level, with .grid-item as class
                    var nextElement = elements[0].nextElementSibling;
                    console.log('nextElement', nextElement);
                    // if it have a direct child with .mat-tooltip-trigger.sign click it
                    let linkedDossier = nextElement.querySelector('.mat-tooltip-trigger.sign');
                    if (linkedDossier) {
                        console.log('nextElement', linkedDossier, 'found and clickable');
                        linkedDossier.click();
                        recordMetrics({ clicks: 1, drags: 1 });
                    } else {
                        console.log('nextElement', nextElement, 'not found or not clickable');
                    }

                } else if (elements.length >= 2) {
                    console.log(elements.length, 'trop de patients trouvé, je ne clique pas', elements);
                } else {
                    console.log('Aucun patient trouvé', elements);
                }
            };

            waitForElement({
                selector: patientSelector,
                justOnce: true,
                callback: function () {
                    setTimeout(lookForPatient, 100);
                }
            });


        }
    },
    {
        option: 'TweakNIR',
        callback: function () {
            function addCopySymbol(element, copyText) {
                // Define the id for the copySymbol
                var copySymbolId = 'copySymbol-' + element.id;

                // Check if an element with the same id already exists
                if (!document.getElementById(copySymbolId)) {
                    console.log('copySymbolId', copySymbolId, 'not found, creating it');
                    // Create a new element for the copy symbol
                    var copySymbol = document.createElement('span');
                    copySymbol.textContent = '📋'; // Use clipboard emoji as copy symbol
                    copySymbol.style.cursor = 'pointer'; // Change cursor to pointer when hovering over the copy symbol
                    copySymbol.title = 'Cliquez ici pour copier le NIR dans le presse-papiers'; // Add tooltip text
                    copySymbol.id = copySymbolId;

                    // Add a click event handler to the copy symbol
                    copySymbol.addEventListener('click', function () {
                        console.log(copyText);
                        navigator.clipboard.writeText(copyText);
                        recordMetrics({ clicks: 3, drags: 2 });
                    });

                    // Add the copy symbol next to the element
                    console.log('copySymbol', copySymbol, 'added next to element', element);
                    element.parentNode.insertBefore(copySymbol, element.nextSibling);
                } else {
                    console.log('copySymbolId', copySymbolId, 'already exists');
                }
            }


            waitForElement({
                selector: '#ContentPlaceHolder1_EtatCivilUCForm1_insiContainer span.label',
                callback: (elements) => {
                    console.log('element', elements[0]);
                    var nir = elements[0].textContent.match(/(\d{13} \d{2})/)[1];
                    nir = nir.replace(/\s/g, ''); // Supprime tous les espaces de la chaîne
                    addCopySymbol(elements[0], nir);
                    elements[0].addEventListener('click', function () {
                        console.log('nir', nir);
                        navigator.clipboard.writeText(nir);
                        recordMetrics({ clicks: 3, drags: 2 });
                    });
                }
            });



            waitForElement({
                selector: '#ContentPlaceHolder1_EtatCivilUCForm1_LabelPatientSecuriteSocial',
                callback: (elements) => {
                    var secu = elements[0].textContent.match(/(\d{1} \d{2} \d{2} \d{2} \d{3} \d{3} \d{2})/)[1];
                    secu = secu.replace(/\s/g, ''); // Supprime tous les espaces de la chaîne
                    addCopySymbol(elements[0], secu);
                    elements[0].addEventListener('click', function () {
                        console.log('secu', secu);
                        navigator.clipboard.writeText(secu);
                        recordMetrics({ clicks: 3, drags: 2 });
                    });
                }
            });

        }
    },
];

addTweak(homePageUrls, homePageFunctions);


// Retirer le caractère "gras" du prénom du patient dans la page d'accueil pour plus facilement distinguer le nom du prénom
addTweak('/FolderMedical/PatientViewForm.aspx', 'removeBoldPatientFirstName', function () {
    let elementPrenom1 = document.querySelector('#ContentPlaceHolder1_EtatCivilUCForm1_LabelPatientPrenom');
    let elementPrenom2 = document.querySelector('#ContentPlaceHolder1_EtatCivilUCForm1_LabelPatientJeuneFille');
    if (elementPrenom1) {
        elementPrenom1.style.fontWeight = 'normal';
    }
    if (elementPrenom2) {
        elementPrenom2.style.fontWeight = 'normal';
    }
});

// Surveillance de la date du dernier VSM
addTweak('/FolderMedical/PatientViewForm.aspx', '*preAlertVSM', async function () {
    let preAlertDuration = await getOptionPromise('preAlertVSM');
    let lastVSMDate = null;
    // Si la valeur est négative, on ne fait rien
    if (preAlertDuration < 0) {
        return;
    }
    const patientNumber = getCurrentPatientId();

    const VSMElement = document.querySelector('#ContentPlaceHolder1_EtatCivilUCForm1_LabelLastVSMDate');
    console.log('[preAlertVSM] VSMElement', VSMElement);
    if (VSMElement) {
        lastVSMDate = VSMElement.textContent;
    }
    if (VSMElement && lastVSMDate) {
        console.log('[preAlertVSM] VSMElement', VSMElement);
        const lastVSMDate = VSMElement.textContent;
        if (!lastVSMDate) {
            return;
        }
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
        // Si le VSM a plus de preAlertDuration mois, on le met en orange
        if (VSMAge > preAlertDuration * 30.44 * 24 * 60 * 60 * 1000) {
            VSMElement.style.color = 'orange';
            VSMElement.style.fontWeight = 'bold';
        }
        // Si le VSM est plus vieux que 1 an, on le met en rouge
        if (VSMAge > 31557600000) {
            VSMElement.style.color = 'red';
            VSMElement.style.fontWeight = 'bold';
        }
    } else {
        // On vérifie si on a déjà alerté pour ce patient
        const lastVSMAlertPatient = sessionStorage.getItem('lastVSMAlertPatient');
        if (lastVSMAlertPatient === patientNumber) {
            console.log('[preAlertVSM] Alert already sent for patient', patientNumber);
            return;
        }
        console.log('[preAlertVSM] Alert not sent for patient', patientNumber);
        // On vérifie si le patient
        let possibleALDPrescription = document.querySelectorAll('div.aldt');
        if (possibleALDPrescription.length > 0) {
            // On envoie une notification pour prévenir l'utilisateur
            sendWedaNotif({
                message: 'Le patient semble être en ALD, mais la date du dernier VSM est introuvable, pensez à remplir le VSM pour bénéficier du ROSP. Vous pouvez désactiver cette alerte dans les options de Weda-Helper.',
                type: 'undefined',
                duration: 7000,
                icon: 'info',
            });

        }
    }

    // On stocke le numéro du patient dans le sessionStorage pour évincer les alertes répétées
    // => une seule alerte à l'ouverture du dossier.
    sessionStorage.setItem('lastVSMAlertPatient', patientNumber);
});