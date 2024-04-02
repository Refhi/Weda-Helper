// Arrêts de travail automatisés
if (window.location.href.startsWith('https://secure.weda.fr/FolderMedical/Aati.aspx') || window.location.href.startsWith('https://secure.weda.fr/BinaryData.aspx')) {
    chrome.storage.local.get('autoAATI', function (result) {
        if (result.autoFillAATI !== false) {
            let selecteurBoutonCV = '#mat-dialog-1 > ng-component > div:nth-child(2) > div.footer.weda-row.weda-main-align-around.weda-cross-align-center.ng-star-inserted > button:nth-child(1)'
            let selecteurSortieNonLimites = '#form1 > div:nth-child(10) > div > dmp-aati-form > div > div:nth-child(2) > div.ml10 > div > div.frameContent > dmp-aati-leave-permission > div.flexColStart.mt10 > div.flexColStart.mt10.ng-star-inserted > div.flexColStart.pt3.ng-star-inserted > div.flexRow.mt5 > input'
            let selectorExitButton = '.frameback.dmtiForm.ng-star-inserted .imgfixe a'

            function clickPremierPatientCV () {
                var boutonPremierPatientCV = document.querySelector('[title="Déclarer l\'AT pour ce bénéficiaire."]');
                if (boutonPremierPatientCV) {
                    boutonPremierPatientCV.click();
                    recordMetrics({clicks: 1, drags: 1});
                }
            }

            function fillDateSorties () {
                var sortieNonLimites = document.querySelector(selecteurSortieNonLimites);
                if (sortieNonLimites) {
                    console.log('sortieNonLimites', sortieNonLimites, 'found');
                    // Get the current date
                    let currentDate = new Date();
                    // Format the date as dd/mm/yyyy
                    let day = String(currentDate.getDate()).padStart(2, '0');
                    let month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Months are 0-based in JavaScript
                    let year = currentDate.getFullYear();
                    let formattedDate = day + '/' + month + '/' + year;
                    sortieNonLimites.value = formattedDate;

                    // Create a new 'compositionend' event
                    let event = new Event('compositionend', {
                        bubbles: true,
                        cancelable: true
                    });

                    // Dispatch the event
                    console.log('sortieNonLimites', sortieNonLimites, 'dispatching event', event);
                    recordMetrics({keyStroke: 10});
                    sortieNonLimites.dispatchEvent(event); // indispensable sinon la date n'est pas prise en compte
                }
            }

            function setTimeOfSending(actionName) {
                // Get the current time as a Unix timestamp (number of milliseconds since the Unix Epoch)
                let currentTime = Date.now();

                // Create an object to store
                let obj = {};
                obj[actionName] = currentTime;

                // Store the object in the local Chrome storage
                chrome.storage.local.set(obj, function() {
                    console.log('The time of action "' + actionName + '" was stored as "' + currentTime + '".');
                });
            }


            lightObserver(selecteurBoutonCV, function (elements) {elements[0].click();});
            waitForElement('[title="Déclarer l\'AT pour ce bénéficiaire."]', null, 50000, clickPremierPatientCV); // assez long car sinon la demande CPS peux bloquer le processus
            lightObserver(selecteurSortieNonLimites, fillDateSorties, document, true);
            lightObserver(selectorExitButton, function (elements) {
                setTimeOfSending('autoAATIexit');
                elements[0].click();
                recordMetrics({clicks: 1, drags: 1});
            });

            if (window.location.href.startsWith('https://secure.weda.fr/BinaryData.aspx')) {
                chrome.storage.local.get('autoAATIexit', function (result) {
                    if (Date.now() - result.autoAATIexit < 10000) {
                        console.log('autoAATIexit', result.autoAATIexit, 'is less than 10 seconds ago');
                        let url = window.location.href;
                        console.log('url', url);
                        fetch(url)
                            .then(response => response.blob())
                            .then(blob => {
                                console.log('blob', blob);
                                return sendToCompanion(`print`, blob);
                            })
                            .then(() => {
                                // The blob has been successfully transferred
                                console.log('The blob has been successfully transferred.');
                                recordMetrics({clicks: 3, drags: 3});
                                setTimeout(function () {
                                    window.close();
                                }, 1000); // essai avec un délai de 1s
                            })
                            .catch(error => {
                                console.warn(errortype + ' Impossible de joindre Weda-Helper-Companion : est-il bien paramétré et démarré ? Erreur:', error);
                                if (!errortype.includes('[focus]')) {
                                    alert(errortype + ' Impossible de joindre Weda-Helper-Companion : est-il bien paramétré et démarré ? Erreur: ' + error);
                                }
                            });
                    }
                });
            }
        }
    });
}

