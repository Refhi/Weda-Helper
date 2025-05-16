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

// -------------------------- +1click VSM -------------------------------------
addTweak(['/FolderMedical/PatientViewForm.aspx', '/FolderMedical/CdaForm.aspx', '/FolderMedical/DMP/view'], 'oneClickVSM', async function () {
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

    // Depuis la page de vérification du VSM (on attends l'apparition du titre avant de vérifier les erreurs)
    waitForElement({
        selector: 'h1.h1center',
        callback: function () { handleVSMVerificationPage(MAX_ERROR_RATIO, CLICK_TIMEOUT) }
    });

    // Validation finale, à décommenter si nécessaire
    waitForElement({
        selector: 'div.tab_valid_cancel button.button.valid',
        // triggerOnInit: true, => contre-productif
        callback: function (elements) {
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

// Sauvegarde de la position de défilement
addTweak('/FolderMedical/PatientViewForm.aspx', '*keepScrollPosition', function () {
    const boutonSuiteHaute = document.querySelector('#ContentPlaceHolder1_HistoriqueUCForm1_LinkButtonSuiteWeda');
    const boutonSuiteBas = document.querySelector('#ContentPlaceHolder1_HistoriqueUCForm1_ButtonSuiteWeda');
    const boutonsSuite = [boutonSuiteHaute, boutonSuiteBas];
    let scrollContainer = document.querySelector('#ContentPlaceHolder1_DivScrollHistorique');

    // On ajoute un listener sur les boutons de suite pour sauvegarder la position de défilement
    boutonsSuite.forEach(bouton => {
        if (bouton) {
            bouton.addEventListener('click', function () {
                if (scrollContainer) {
                    sessionStorage.setItem('historicScrollPosition', scrollContainer.scrollTop);
                    console.log('[keepScrollPosition] historicScrollPosition sauvegardée', scrollContainer.scrollTop);
                }
                // On attends que les boutons disparaissent pour restaurer la position de défilement
                observeDiseapearance(boutonSuiteHaute, function () {
                    console.log('[keepScrollPosition] boutonSuiteHaute disparu');
                    if (scrollContainer) {
                        const historicScrollPosition = sessionStorage.getItem('historicScrollPosition');
                        if (historicScrollPosition) {
                            let scrollContainer = document.querySelector('#ContentPlaceHolder1_DivScrollHistorique');
                            scrollContainer.scrollTop = parseInt(historicScrollPosition);
                            console.log('[keepScrollPosition] historicScrollPosition restaurée', historicScrollPosition);
                            sessionStorage.removeItem('historicScrollPosition');
                        }
                    }
                });
            });
        }
    });
});


// Simplification de l'accès aux atcd
// Quand on fait un clic droit sur un atcd depuis la page d'accueil, récupérer l'innerText du span title.
// Ensuite une fois dans la gestion des antécédents, cliquer sur l'atcd correspondant
addTweak('/FolderMedical/PatientViewForm.aspx', 'simplifyATCD', function () {
    const atcdPanelSelector = 'div[title="Cliquez ici pour modifier le volet médical du patient"]';
    const atcdPanelElement = document.querySelector(atcdPanelSelector);
    // Ensuite on liste l'ensemble des atcd possibles (uniquement les div directs, sauf ceux avec .sm)
    const atcdElements = Array.from(atcdPanelElement.children).filter(child =>
        child.tagName === 'DIV' && !child.classList.contains('sm') && !child.classList.contains('st')
    );
    // On y ajoute des clic droit listeners pour chaque atcd
    atcdElements.forEach(atcdElement => {
        // Variable pour stocker le timeout pour l'affichage du tooltip
        let tooltipTimeout;
        
        // Ajout d'un mouseover pour afficher une info-bulle après 200ms
        atcdElement.addEventListener('mouseover', function () {
            tooltipTimeout = setTimeout(function() {
                showTooltip(atcdElement, "WH:bouton droit pour éditer");
            }, 200);
        });
        
        // Ajout d'un mouseout pour annuler le timeout et retirer l'info-bulle
        atcdElement.addEventListener('mouseout', function () {
            // Annuler le timeout si l'utilisateur quitte l'élément avant 200ms
            clearTimeout(tooltipTimeout);
            // On retire l'info-bulle
            removeTooltip(atcdElement);
        });
        
        atcdElement.addEventListener('contextmenu', function (e) {
            e.preventDefault(); // Empêcher le menu contextuel par défaut
            // On récupère l'innerText du span title
            const atcdTitle = atcdElement.querySelector('span[title]').innerText;
            // On le stocke dans le sessionStorage
            sessionStorage.setItem('atcdTitle', atcdTitle);
            console.log('[simplifyATCD] atcdTitle sauvegardé', atcdTitle);
            
            // Cliquer sur l'élément pour naviguer vers la page des ATCD
            atcdElement.click();
        });
    });
});

function showTooltip(element, message) {
    // Créer une info-bulle
    let tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.innerText = message;
    tooltip.style.position = 'absolute';
    tooltip.style.backgroundColor = '#fff';
    tooltip.style.border = '1px solid #000';
    tooltip.style.padding = '5px';
    tooltip.style.zIndex = '1000';
    document.body.appendChild(tooltip);

    // Positionner l'info-bulle
    let rect = element.getBoundingClientRect();
    tooltip.style.left = rect.left + window.scrollX + 'px';
    tooltip.style.top = rect.bottom + window.scrollY + 'px';

    // Retirer l'info-bulle au bout de 2 secondes
    setTimeout(() => {
        document.body.removeChild(tooltip);
    }, 2000);
}

function removeTooltip(element) {
    // Retirer l'info-bulle si elle existe
    let tooltip = document.querySelector('.tooltip');
    if (tooltip) {
        document.body.removeChild(tooltip);
    }
}

// Ensuite on travaille dans la page des atcd.
addTweak('/FolderMedical/AntecedentForm.aspx', 'simplifyATCD', function () {
    const atcdTitle = sessionStorage.getItem('atcdTitle');
    console.log('[simplifyATCD] atcdTitle récupéré', atcdTitle);
    if (atcdTitle) {
        // On cherche l'élément qui correspond à l'atcdTitle
        const atcdElements = document.querySelectorAll('table[title="Cliquez pour modifier"]');
        atcdElements.forEach(atcdElement => {
            if (atcdElement.innerText.includes(atcdTitle)) {
                console.log('[simplifyATCD] atcdElement', atcdElement);
                // On clique dessus
                sessionStorage.removeItem('atcdTitle');
                atcdElement.click();                
            }
        });
    } 
});