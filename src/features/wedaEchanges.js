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


addTweak('/FolderMedical/WedaEchanges/', 'secureExchangeUncheckIHEMessage', function () {
    waitForElement({
        selector: 'we-doc-import',
        callback: function (elements) {
            for (const element of elements) {
                if (!element.className.includes('docImportAttach')) //docImportAttach correspond aux documents joints donc si il n'y a pas cette classe, il s'agit du corps du message
                {
                    let checkbox = element.querySelector('input[type=checkbox]')
                    checkbox.checked = false;
                    checkbox.dispatchEvent(new Event('change'));
                    recordMetrics({ clicks: 1, drags: 1 });
                } else {
                    let docTitle = element.querySelector('input.docTitle');
                    if (docTitle.value.toUpperCase() == 'IHE_XDM.ZIP') {
                        let checkbox = element.querySelector('input[type=checkbox]')
                        checkbox.checked = false;
                        checkbox.dispatchEvent(new Event('change'));
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
