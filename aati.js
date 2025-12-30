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



addTweak('/FolderMedical/Aati.aspx', 'autoAATI', function () {
    let selecteurBoutonCV = '#mat-dialog-1 > ng-component > div:nth-child(2) > div.footer.weda-row.weda-main-align-around.weda-cross-align-center.ng-star-inserted > button:nth-child(1)'
    let selecteurBoutonEntreeManuelle = '#mat-dialog-1 > ng-component > div:nth-child(2) > div.footer.weda-row.weda-main-align-around.weda-cross-align-center.ng-star-inserted > button:nth-child(2)'
    let boutonEnvoyerEntreeManuelle = '#mat-dialog-2 > ng-component > div:nth-child(2) > div.footer.weda-row.weda-main-align-around.weda-cross-align-center > button.mat-focus-indicator.color-purple-bold.mat-raised-button.mat-button-base'
    let selecteurSortieNonLimites = '#form1 > div:nth-child(10) > div > dmp-aati-form > div > div:nth-child(2) > div.ml10 > div > div.frameContent > dmp-aati-leave-permission > div.flexColStart.mt10 > div.flexColStart.mt10.ng-star-inserted > div.flexColStart.pt3.ng-star-inserted > div.flexRow.mt5 > input'
    let selectorExitButton = '.frameback.dmtiForm.ng-star-inserted .imgfixe a'

    // lors de la réalisation d’un arrêt de travail, on considère que le premier patient est le bon
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

    // arrivé dans la page AATI, le workflow change si on a cliqué sur la partie "AT sans CV"
    // par défaut on considère un arrêt de travail avec CV
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

    // appuie sur le bouton adéquat selon le type d'arrêt de travail
    waitForElement({
        selector: selecteurBoutonCV,
        callback: function (elements) {
            clickProperButton(elements);
            // appuie sur le bouton "Envoyer" de la saisie manuelle si on est dans ce mode
            console.log('waitForElement pour boutonEnvoyerEntreeManuelle déclenché');
            waitForElement({
                selector: boutonEnvoyerEntreeManuelle,
                callback: function (elements) {
                    console.log('boutonEnvoyerEntreeManuelle détecté, on clique dessus', elements);
                    elements[0].click();
                    recordMetrics({ clicks: 1, drags: 1 });
                },
                justOnce: true,
                triggerOnInit: true
            });
        },
        justOnce: true
    });



    // guette la liste des patients présents sur la carte vitale pour cliquer sur le premier patient
    waitForElement({
        selector: '[title="Déclarer l\'AT pour ce bénéficiaire."]',
        callback: clickPremierPatientCV,
        justOnce: true
    });

    // ajoute la date du jour dans le champ "Sortie non limitée" s’il apparait
    waitForElement({
        selector: selecteurSortieNonLimites,
        callback: fillDateSorties,
        justOnce: true
    });

    // on surveille le bouton de sortie pour le cliquer automatiquement
    waitForElement({
        selector: selectorExitButton,
        callback: async function (elements) {
            console.log('selectorExitButton', elements);
            // on enregistre le timestamp de sortie dans le local storage
            await chrome.storage.local.set({ autoAATIexit: Date.now() });
            console.log('autoAATIexit set to', Date.now());
            setTimeout(function () {
                elements[0].click();
            }, 500); // essai avec un délai de 500ms
            recordMetrics({ clicks: 1, drags: 1 });
        },
        justOnce: true
    });
});

// Envoi de la page 3 (la seule page visible) de l'arrêt de travail à Companion
// depuis la page de prévisualisation de l'arrêt de travail
addTweak('/BinaryData.aspx', "*sendDocToCompanion", async function () {
    console.log("[sendDocToCompanion] called");
    // récupération des valeurs et options importantes
    const autoAATIexitTimestamp = await chrome.storage.local.get(['autoAATIexit']);
    const isRecentExit = Date.now() - autoAATIexitTimestamp.autoAATIexit < 10000;
    const companionPrintEnabled = !(await getOptionPromise('RemoveLocalCompanionPrint'));
    console.log('[sendDocToCompanion] variables : autoAATIexit', autoAATIexitTimestamp.autoAATIexit, 'isRecentExit', isRecentExit, 'companionPrintEnabled', companionPrintEnabled);
    // tout d’abord on vérifie qu’on a bien un arrêt de travail récent
    if (!isRecentExit) {
        console.log('autoAATIexit is not recent, skipping Companion print');
        return;
    }
    // ensuite on vérifie que l’option Companion print est activée, sinon on utilise la méthode classique window.print()
    if (!companionPrintEnabled) {
        console.log("Companion print is disabled, simple window.print() will be used");
        window.print();
        return;
    }

    console.log('autoAATIexit is recent and Companion print is enabled, proceeding with Companion print');
    // réinitialisation de la valeur autoAATIexit
    await chrome.storage.local.set({ autoAATIexit: 0 });

    // l’url de la page est censée être la page 3 de l'arrêt de travail, on va l'envoyer à Companion
    let url = window.location.href;
    const pdfBlob = await fetchBlobFromUrl(url);
    sendToCompanion('print', pdfBlob, function (response) {
        console.log('The blob has been successfully transferred to Companion.');
        recordMetrics({ clicks: 3, drags: 3 });
        setTimeout(function () {
            window.close();
        }, 1000);
    })
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