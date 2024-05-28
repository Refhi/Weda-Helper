// Arrêts de travail automatisés
// Ajout d'un 2e bouton à côté de AT nommé "AT sans CV" pour shunter la lecture automatique de la carte vitale
addTweak('https://secure.weda.fr/FolderMedical/PatientViewForm.aspx','autoAATI', function () {
    let selecteurBoutonAT = '[title="Transmettre un avis d\'arrêt de travail via le téléservice AATi"]';
    function processButton (elements) {
        // remplace le texte "AT" par "AT avec CV | AT sans CV"
        elements[0].textContent = 'AT avec CV | AT sans CV';
    
        // ajoute sur la partie droite de l'élément un event listener pour le click qui met dans le local storage la valeur "timestampAATIsansCV" au moment du click
        elements[0].addEventListener('click', function(e) {
            // Récupère la largeur de l'élément
            let boutonWidth = elements[0].offsetWidth;
    
            // Récupère la position du clic relative à l'élément
            let clickPosition = e.clientX - elements[0].getBoundingClientRect().left;
    
            // Si le clic est sur la moitié droite de l'élément
            if (clickPosition > boutonWidth / 2) {
                console.log('Clic sur AT sans CV détecté au timestamp', Date.now());
                // Stocke le timestamp actuel dans le stockage local avec la clé "timestampAATIsansCV"
                chrome.storage.local.set({timestampAATIsansCV: Date.now()});
            }
        });
    }

    lightObserver(selecteurBoutonAT, processButton, document, true);
});


urlAATI = [
    'https://secure.weda.fr/FolderMedical/Aati.aspx',
    'https://secure.weda.fr/BinaryData.aspx'
]

addTweak(urlAATI, 'autoAATI', function () {
    let selecteurBoutonCV = '#mat-dialog-1 > ng-component > div:nth-child(2) > div.footer.weda-row.weda-main-align-around.weda-cross-align-center.ng-star-inserted > button:nth-child(1)'
    let selecteurBoutonEntreeManuelle = '#mat-dialog-1 > ng-component > div:nth-child(2) > div.footer.weda-row.weda-main-align-around.weda-cross-align-center.ng-star-inserted > button:nth-child(2)'
    let selecteurSortieNonLimites = '#form1 > div:nth-child(10) > div > dmp-aati-form > div > div:nth-child(2) > div.ml10 > div > div.frameContent > dmp-aati-leave-permission > div.flexColStart.mt10 > div.flexColStart.mt10.ng-star-inserted > div.flexColStart.pt3.ng-star-inserted > div.flexRow.mt5 > input'
    let selectorExitButton = '.frameback.dmtiForm.ng-star-inserted .imgfixe a'

    function clickPremierPatientCV () {
        console.log('clickPremierPatientCV déclenché');
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


    lightObserver(selecteurBoutonCV, clickProperButton, document, true);
    waitForElement('[title="Déclarer l\'AT pour ce bénéficiaire."]', null, 50000, clickPremierPatientCV); // assez long car sinon la demande CPS peux bloquer le processus
    lightObserver(selecteurSortieNonLimites, fillDateSorties, document, true);
    lightObserver(selectorExitButton, function (elements) {
        setTimeOfSending('autoAATIexit');
        console.log('clicking on the exit button + timestamp');
        elements[0].click();
        recordMetrics({clicks: 1, drags: 1});
    });


    // Envoi du document à l'assistant
    // On n'utilise pas addTweak car ici les options appelées sont spécifiques à ce tweak
    // TODO : passer par getOption, reprendre ici
    if (window.location.href.startsWith('https://secure.weda.fr/BinaryData.aspx')) {
        chrome.storage.local.get(['autoAATIexit', 'RemoveLocalCompanionPrint'], function (result) {
            if (Date.now() - result.autoAATIexit < 10000 && result.RemoveLocalCompanionPrint === false) {
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
            } else {
                // en cas de Companion désactivé
                window.print();
            }
        });
    }

});