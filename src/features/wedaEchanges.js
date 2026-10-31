/**
 * @file wedaEchanges.js
 * @description Fonctionnalités pour la page de messagerie sécurisée Weda Echanges.
 * Gère les améliorations de la messagerie :
 * - Rafraîchissement automatique de la boîte de réception
 * - Décochage automatique des messages IHE_XDM.zip
 * - Permutation titre PJ / corps message
 * 
 * @requires tweaks.js (addTweak)
 * @requires storage.js (getOption)
 * @requires dom-oberver.js (waitForElement)
 */

// Page Messagerie sécurisée
addTweak('/FolderMedical/WedaEchanges/', 'secureExchangeAutoRefresh', function () {
    // clique sur reçu pour rafraichir la liste des messages à intervalle régulier
    function clickOnInbox() {
        console.log('[clickOnInbox] je clique sur reçu pour rafraichir la liste des messages');
        var element = document.querySelector('#inboxToolbar > li.inbox.selected > a');
        if (element) {
            element.click();
            recordMetrics({ clicks: 1, drags: 1 });
        }
    }
    setTimeout(function () {
        setInterval(clickOnInbox, 900000);
    }, 30000);
});


addTweak('/FolderMedical/WedaEchanges/', 'secureExchangeUncheckIHEMessage', async function () {
    const titlesString = await getOptionPromise('secureExchangeUncheckSomeTitles');
    const titlesToUncheck = (titlesString || '').split(',').map(s => s.trim()).filter(s => s.length > 0);

    // Comme dans push_valider : change + input avec bubbles pour que Weda prenne bien en compte la modification
    async function uncheck(checkbox) {
        await sleep(2000)
        checkbox.checked = false;
        checkbox.dispatchEvent(new Event('change'));
    }

    waitForElement({
        selector: 'we-doc-import',
        callback: function (elements) {
            for (const element of elements) {
                if (!element.className.includes('docImportAttach')) //docImportAttach correspond aux documents joints donc si il n'y a pas cette classe, il s'agit du corps du message
                {
                    let checkbox = element.querySelector('input[type=checkbox]')
                    uncheck(checkbox);
                    recordMetrics({ clicks: 1, drags: 1 });
                } else {
                    let docTitle = element.querySelector('input.docTitle');
                    if (docTitle && titlesToUncheck.some(title => docTitle.value.toUpperCase().startsWith(title.toUpperCase()))) {
                        let checkbox = element.querySelector('input[type=checkbox]')
                        uncheck(checkbox);
                        recordMetrics({ clicks: 1, drags: 1 });
                    }
                }
            }

        }
    });
});

addTweak('/FolderMedical/WedaEchanges/', 'swapTitrePJetCorpsMessage', function () {
    // On doit selectionner les éléments avec titre="C'est le titre qu'aura le document dans le dossier patient"
    const selecteurTitres = 'input[title="C\'est le titre qu\'aura le document dans le dossier patient"]';
    waitForElement({
        selector: selecteurTitres,
        callback: function (elements) {
            if (elements.length >= 2) {
                let titreCorpsMessage = elements[0].value;
                let titrePieceJointe = elements[1].value;
                console.log('[swapTitrePJetCorpsMessage] titreCorpsMessage', titreCorpsMessage, 'titrePieceJointe', titrePieceJointe);
                elements[0].value = titrePieceJointe;
                elements[1].value = titreCorpsMessage;
                recordMetrics({ clicks: 4, drags: 4 });
            }
        }
    });
});


// Clic automatique sur "Un patient" dès qu'un élément  .messageListItem passe en  .messageListItem.selected
addTweak('/FolderMedical/WedaEchanges/', 'autoClickUnPatient', function () {
    // waitForElement ne signale qu'une fois chaque nœud : un retour sur un message déjà sélectionné
    // (simple changement de classe) ne serait pas détecté. On suit donc directement la sélection.
    let lastSelected = null;
    const observer = new MutationObserver(async () => {
        const selected = document.querySelector('.messageListItem.selected');
        if (selected === lastSelected) return;
        lastSelected = selected;
        if (!selected) return;
        await sleep(100); // Laisse Weda afficher le détail du message
        if (document.querySelector('.messageListItem.selected') !== selected) return; // sélection changée entre-temps
        const unPatientButton = document.querySelector('.btnImport.importPatient');
        console.log('[autoClickUnPatient] unPatientButton', unPatientButton);
        if (unPatientButton) {
            unPatientButton.click();
            recordMetrics({ clicks: 1, drags: 0 });
        }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
});


/**
 * Parcours successivement les messages de la messagerie sécurisée : TODO
 *
 */

// Liste les messages à parcourir dans la messagerie sécurisée
// scénarios possibles :
// - les messages dont la case a été cochée (déclenchement manuel sur bouton à rajouter)
// - tous les messages non lus (déclenchement automatique, peut-être toutes les X minutes ?)



// Boucle principale
// Clic sur le message pertinent
// Attend que l'analyse auto (simple +/- IA) soit terminée
// pour savoir si analyse terminée : vérification d'un indicateur à créer (visuel ? simple élément DOM ?)