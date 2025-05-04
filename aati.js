// Arrêts de travail automatisés
// Ajout d'un 2e bouton à côté de AT nommé "AT sans CV" pour shunter la lecture automatique de la carte vitale
addTweak('/FolderMedical/PatientViewForm.aspx', 'autoAATI', function () {
    let selecteurBoutonAT = '[title="Transmettre un avis d\'arrêt de travail via le téléservice AATi"]';
    function processButton(elements) {
        // remplace le texte "AT" par "AT avec CV | AT sans CV"
        elements[0].textContent = 'AT avec CV | AT sans CV';

        // ajoute sur la partie droite de l'élément un event listener pour le click qui met dans le local storage la valeur "timestampAATIsansCV" au moment du click
        elements[0].addEventListener('click', function (e) {
            // Récupère la largeur de l'élément
            let boutonWidth = elements[0].offsetWidth;

            // Récupère la position du clic relative à l'élément
            let clickPosition = e.clientX - elements[0].getBoundingClientRect().left;

            // Si le clic est sur la moitié droite de l'élément
            if (clickPosition > boutonWidth / 2) {
                console.log('Clic sur AT sans CV détecté au timestamp', Date.now());
                // Stocke le timestamp actuel dans le stockage local avec la clé "timestampAATIsansCV"
                chrome.storage.local.set({ timestampAATIsansCV: Date.now() });
            }
        });
    }

    waitForElement({ selector: selecteurBoutonAT, justOnce: true, callback: processButton });
});


urlAATI = [
    '/FolderMedical/Aati.aspx',
    '/FolderMedical/PopUpViewBinaryForm.aspx'
]

addTweak(urlAATI, 'autoAATI', function () {
    let selecteurBoutonCV = '#mat-dialog-1 > ng-component > div:nth-child(2) > div.footer.weda-row.weda-main-align-around.weda-cross-align-center.ng-star-inserted > button:nth-child(1)'
    let selecteurBoutonEntreeManuelle = '#mat-dialog-1 > ng-component > div:nth-child(2) > div.footer.weda-row.weda-main-align-around.weda-cross-align-center.ng-star-inserted > button:nth-child(2)'
    let selecteurSortieNonLimites = '#form1 > div:nth-child(10) > div > dmp-aati-form > div > div:nth-child(2) > div.ml10 > div > div.frameContent > dmp-aati-leave-permission > div.flexColStart.mt10 > div.flexColStart.mt10.ng-star-inserted > div.flexColStart.pt3.ng-star-inserted > div.flexRow.mt5 > input'
    let selectorExitButton = '.frameback.dmtiForm.ng-star-inserted .imgfixe a'

    function clickPremierPatientCV() {
        console.log('clickPremierPatientCV déclenché');
        var boutonPremierPatientCV = document.querySelector('[title="Déclarer l\'AT pour ce bénéficiaire."]');
        if (boutonPremierPatientCV) {
            boutonPremierPatientCV.click();
            recordMetrics({ clicks: 1, drags: 1 });
        }
    }

    function fillDateSorties() {
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
            recordMetrics({ keyStroke: 10 });
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
        chrome.storage.local.set(obj, function () {
            console.log('The time of action "' + actionName + '" was stored as "' + currentTime + '".');
        });
    }

    function clickProperButton(elements) {
        console.log('clickProperButton déclenché');
        chrome.storage.local.get(['timestampAATIsansCV'], function (result) {
            if (Date.now() - result.timestampAATIsansCV < 5000) {
                console.log('timestampAATIsansCV', result.timestampAATIsansCV, 'is less than 10 seconds ago donc je dois cliquer sur le bouton "AT sans CV"');
                let boutonSansCV = document.querySelector(selecteurBoutonEntreeManuelle);
                console.log('boutonSansCV', boutonSansCV);
                if (boutonSansCV) {
                    boutonSansCV.click();
                }
            } else {
                console.log('timestampAATIsansCV', result.timestampAATIsansCV, 'is more than 10 seconds ago donc je dois cliquer sur le bouton "AT avec CV"');
                elements[0].click();
            }
        });
    }

    // Fonction pour vérifier la valeur de autoAATIexit
    let intervalId;
    function checkAutoAATIexit(elements) {
        chrome.storage.local.get(['autoAATIexit'], function (result) {
            console.log('[debug] autoAATIexit', result.autoAATIexit);
            if (result.autoAATIexit === 0) {
                // Si autoAATIexit est égal à 0, déclencher le clic et arrêter l'intervalle
                elements[0].click();
                clearInterval(intervalId);
            }
        });
    }




    waitForElement({
        selector: selecteurBoutonCV,
        callback: clickProperButton,
        justOnce: true
    });

    // waitLegacyForElement('[title="Déclarer l\'AT pour ce bénéficiaire."]', null, 50000, clickPremierPatientCV); // assez long car sinon la demande CPS peux bloquer le processus
    waitForElement({
        selector: '[title="Déclarer l\'AT pour ce bénéficiaire."]',
        callback: clickPremierPatientCV,
        justOnce: true
    });


    waitForElement({
        selector: selecteurSortieNonLimites,
        callback: fillDateSorties,
        justOnce: true
    });


    waitForElement({
        selector: selectorExitButton,
        callback: function (elements) {
            // 2.7.2 La nouvelle méthode est d'aller ensuite récupérer le pdf depuis la page d'accueil du dossier patient
            setTimeOfSending('autoAATIexit'); // A l'ouverure de la page d'accueil on n'ouvrira le pdf seulement si < 10 secondes
            // Ici on essai de laisser le temps au pdf d'être généré avant de cliquer sur quitter.
            // Mais on ne pourra pas empêcher la popup de prévisu de s'afficher
            console.log('autoAATIexit', Date.now(), 'attente de 3 secondes avant de cliquer sur le bouton de sortie');
            setTimeout(() => {
                console.log('clicking on the exit button + timestamp');
                elements[0].click(); // Finalement on quitte direct sans attendre
                recordMetrics({ clicks: 1, drags: 1 });
            }, 3000);
        }
    });

    function observeLastPrintDateChange(callback) {
        const originalSetItem = sessionStorage.setItem;
        sessionStorage.setItem = function(key, value) {
            originalSetItem.apply(this, arguments);
            if (key === 'lastPrintDate') {
                callback(value);
            }
        };
    }

    // Cette partie gère la fermeture de la prévisu de l'AT au moment où on récupère le pdf depuis la page d'accueil du patient    
    addTweak('/FolderMedical/PopUpViewBinaryForm.aspx', "*sendDocToCompanion", function () {
        chrome.storage.local.get(['autoAATIexit'], function (result) {
            getOption('RemoveLocalCompanionPrint', function (RemoveLocalCompanionPrint) {
                if (Date.now() - result.autoAATIexit < 10000 && RemoveLocalCompanionPrint === false) {
                    console.log('autoAATIexit', result.autoAATIexit, 'is less than 10 seconds ago');
                    chrome.storage.local.set({ autoAATIexit: 0 });
                    let iframeElement = document.querySelector('iframe');
                    let url = iframeElement.src;
                    console.log('url', url);
                    fetch(url)
                        .then(response => response.blob())
                        .then(getLastPageFromBlob)
                        .then(blob => {
                            console.log('blob', blob);
                            return sendToCompanion(`print`, blob);
                        })
                        .then(() => {
                            // The blob has been successfully transferred
                            console.log('The blob has been successfully transferred.');
                            recordMetrics({ clicks: 3, drags: 3 });
                            observeLastPrintDateChange(async (newValue) => {
                                let printTime = Date.parse(newValue);
                                if (Date.now() - printTime < 10000) {
                                    sendWedaNotifAllTabs({
                                        message: 'Page 3 de l\'arrêt de travail imprimé avec succès.',
                                        type: 'success',
                                        icon: 'print'
                                    });
                                    window.close(); // Pas la peine d'utiliser les permissions tab car cette page est ouverte par le script
                                    const tabs = await getAllTabs();
                                    tabs.forEach(tab => {
                                        if (tab.url.includes('blob:')) {
                                            closeTab(tab.id);
                                            console.log('Fermeture de l\'onglet', tab.id, 'car il s\'agit d\'un blob');
                                        }
                                    });
                                }
                            });
                        })
                        .catch(error => {
                            console.warn(errortype + ' Impossible de joindre Weda-Helper-Companion : est-il bien paramétré et démarré ? Erreur:', error, 'Problème de Firewall ?');
                            if (!errortype.includes('[focus]')) {
                                sendWedaNotifAllTabs({
                                    message: 'Impossible de joindre Weda-Helper-Companion : est-il bien paramétré et démarré ? Erreur: ' + error + 'Problème de Firewall ?',
                                    type: 'fail',
                                    icon: 'print'
                                })
                                // alert(errortype + ' Impossible de joindre Weda-Helper-Companion : est-il bien paramétré et démarré ? Erreur: ' + error);
                            }
                        });
                }
            });
        });
    });
});


// Cochage automatique de " Mon patient accepte que je transmette le présent avis d'arrêt de travail pour son compte et [...]"
addTweak('/FolderMedical/Aati.aspx', 'aatiTermsExcerpt', function () {
    // La checkbox est le fils du frère ainé de .aatiTermsExcerpt
    const selecteurCheckbox = '.aatiTermsExcerpt';
    const checkBox = document.querySelector(selecteurCheckbox).previousElementSibling.querySelector('input');
    if (!checkBox) {
        console.error('Checkbox not found');
        return;
    }

    if (checkBox.checked) {
        console.log('Checkbox already checked');
        return;
    }

    console.log("[aatiTermsExcerpt] checkBox d'auto-accord", checkBox);

    checkBox.checked = true;
    checkBox.dispatchEvent(new Event('change'));

    sendWedaNotifAllTabs({
        message: "La case 'Mon patient accepte que je transmette [...] a été cochée automatiquement. Allez dans les options de Weda-Helper si vous souhaitez désactiver cette fonctionnalité.",
        type: 'success',
        icon: 'check'
    });

    recordMetrics({ clicks: 1, drags: 1 });    
});