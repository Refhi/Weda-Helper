// // [page d'accueil]
let homePageUrls = [
    '/FolderMedical/FindPatientForm.aspx',
    '/FolderMedical/PatientViewForm.aspx'
];

let homePageFunctions = [
    {
        option: '!RemoveLocalCompanionPrint',
        callback: function () {
            console.log('je tente de clicker sur le dernier pdf');
            chrome.storage.local.get(['autoAATIexit'], function (result) {
                if (Date.now() - result.autoAATIexit < 10000 && RemoveLocalCompanionPrint === false) {
                    console.log('autoAATIexit', result.autoAATIexit, 'is less than 10s old, donc je tente d\'ouvrir le pdf du dernier arrêt de travail');
                    // Ouvre le dernier arrêt de travail
                    // class = sc et le titre débute par "Dernier A.T."
                    let element = document.querySelector('.sc');
                    element.click();
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