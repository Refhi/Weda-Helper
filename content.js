// // Différentes petites fonctions ajoutées ou supprimées de Weda
// // Ne justifiant pas la création d'un fichier séparé


// // Change certains éléments selon l'URL les options
// [page de recettes] Appuie automatiquement sur le bouton "rechercher" après avoir sélectionné la page des recettes
// seulement si la page est /FolderGestion/RecetteForm.aspx, appuis sur id="ContentPlaceHolder1_ButtonFind"
// Utilisation des nouvelles fonctions pour simplifier le code
addTweak('/FolderGestion/RecetteForm.aspx', 'TweakRecetteForm', function () {
    var button = document.getElementById('ContentPlaceHolder1_ButtonFind');
    if (button) {
        button.click();
        recordMetrics({ clicks: 1, drags: 1 });
        console.log('Button clicked on RecetteForm page');
    }
});


// [page de recettes manuelles] Envoie automatiquement au TPE si on clique sur #ContentPlaceHolder1_ButtonValid
addTweak('/FolderGestion/ReglementForm.aspx', '!RemoveLocalCompanionTPE', function () {
    function sendToTPE() {
        console.log('sendToTPE');
        let menuDeroulant = document.getElementById('ContentPlaceHolder1_DropDownListRecetteLabelMode');
        let amountElement = document.getElementById('ContentPlaceHolder1_TextBoxRecetteMontant');
        if (menuDeroulant && amountElement) {
            // vérifier que le mode de paiement est "C.B."
            if (menuDeroulant.options[menuDeroulant.selectedIndex].text !== "C.B.") {
                console.log('Le mode de paiement n\'est pas "C.B."');
                return;
            }
            let amount = amountElement.value;
            // retirer la virgule du montant et le convertir en entier
            amount = parseInt(amount.replace(/,/g, ''), 10);
            if (amount) {
                console.log('Je demande au TPE le montant : ', amount);
                sendtpeinstruction(amount);
                recordMetrics({ clicks: 4 });
            }
        }
    }


    waitForElement({
        selector: '#ContentPlaceHolder1_ButtonValid',
        callback: function (elements) {
            console.log('Ecouteur sur le bouton de validation de la recette manuelle', elements);
            elements[0].addEventListener('click', sendToTPE);
        }
    });
});






// [page de gestion des feuilles de soins]
addTweak('/vitalzen/gestion.aspx', 'TweakFSEGestion', function () {
    waitForElement({
        selector: '.mat-icon.notranslate.material-icons.mat-icon-no-color', textContent: 'search', timeout: 5000, justOnce: true,
        callback: elements => {
            let element = elements[0];
            console.log('element', element, 'trouvé, je clique dessus');
            element.click();
            recordMetrics({ clicks: 1, drags: 1 });
        }
    });
});



// // Retrait des suggestions de titre
let titleSuggestionsUrls = [
    '/FolderMedical/ConsultationForm.aspx',
    '/FolderMedical/CertificatForm.aspx',
    '/FolderMedical/DemandeForm.aspx',
    '/FolderMedical/PrescriptionForm.aspx',
    '/FolderMedical/FormulaireForm.aspx',
    '/FolderMedical/ResultatExamenForm.aspx',
    '/FolderMedical/CourrierForm.aspx',
];

addTweak(titleSuggestionsUrls, 'RemoveTitleSuggestions', function () {
    function RemoveTitleSuggestions() {
        setTimeout(() => {
            console.log('Remove TitleSuggestions started');
            let elements = document.querySelectorAll('#DivGlossaireReponse');
            if (elements[0]) {
                elements[0].remove();
            }
        }, 400);
    }

    RemoveTitleSuggestions(); // nécessaire pour certaines pages se chargeant trop vite
    waitForElement({ selector: '#DivGlossaireReponse', callback: RemoveTitleSuggestions });
});




// Page HRPIM
addTweak('/FolderMedical/HprimForm.aspx', '*HPRIMtweak', function () {
    function makeHPRIMListSticky() {
        let element = document.querySelector("#ContentPlaceHolder1_UpdatePanelHprimsGrid");
        element.style.position = "sticky";
        element.style.top = "0px";
    }
    makeHPRIMListSticky();
    // dur d'estimer précisement la métrique. Là c'est très grossier, on va dire 5 drags
    recordMetrics({ drags: 5 });

});


// Page Messagerie sécurisée
addTweak('/FolderMedical/WedaEchanges/', 'secureExchangeAutoRefresh', function () {
    if (result.secureExchangeAutoRefresh !== false) {
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
    }
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



// // Sélection automatique du type de document pour les courriers envoyés au DMP
// Au moment de l'impression des courriers
addTweak('/FolderMedical/CourrierForm.aspx', '*autoDocTypeSelection', function () {
    let dropDownMenu = document.querySelector('#ContentPlaceHolder1_DropDownListDocumentTypes');
    function watchDocumentTypeCourrierDMP() {
        dropDownMenu.addEventListener('change', function () {
            console.log('New selected value:', this.value);
            chrome.storage.local.set({ 'selectedDocumentTypeCourrierDMP': this.value });
        });
    }

    // after page load, change the dropdown value to the last selected value
    chrome.storage.local.get('selectedDocumentTypeCourrierDMP', function (result) {
        let selectedDocumentTypeCourrierDMP = result.selectedDocumentTypeCourrierDMP;
        console.log('selectedDocumentTypeCourrierDMP', selectedDocumentTypeCourrierDMP);
        if (selectedDocumentTypeCourrierDMP) {
            dropDownMenu.value = selectedDocumentTypeCourrierDMP;
        }
    });

    watchDocumentTypeCourrierDMP();
});

// Si on envoie un pdf considéré comme un courrier dans Weda :
addTweak('/FolderMedical/DMP/view', '*autoDocTypeSelectionPDFUpload', function () {
    // fonction permettant de surveiller un éventuel changement de choix dans le menu déroulant
    function watchDocumentTypeCourrierPDFDMP(menuASurveiller) {
        menuASurveiller.addEventListener('change', function () {
            console.log('[autoDocTypeSelectionPDFUpload] Nouvelle valeur par défaut enregistrée :', this.value);
            chrome.storage.local.set({ 'selectedDocumentTypeCourrierPDFDMP': this.value });
        });
    }

    const listeChoixTypeDMP = document.querySelector('#form1 > div:nth-child(11) > div > div.patientDmpContainer > dmp-container > div > div.frameContent > dmp-main > dmp-share-document > div > div > div > div.fieldContainer > select');
    watchDocumentTypeCourrierPDFDMP(listeChoixTypeDMP);

    const choixActuelTypeDMP = listeChoixTypeDMP.value;

    if (choixActuelTypeDMP === '11490-0') {
        console.log('[autoDocTypeSelectionPDFUpload] choix type courrier défaut détecté, je change pour le dernier choix enregistré');
        chrome.storage.local.get('selectedDocumentTypeCourrierPDFDMP', function (result) {
            let selectedDocumentTypeCourrierPDFDMP = result.selectedDocumentTypeCourrierPDFDMP;
            if (selectedDocumentTypeCourrierPDFDMP) {
                listeChoixTypeDMP.value = selectedDocumentTypeCourrierPDFDMP;
            }
        });
    }
});

// Sélection automatique du champ "titre" lors de la création d'un antécédent.
addTweak('/FolderMedical/AntecedentForm.aspx', '*autoSelectTitleField', function () {
    waitForElement({
        selector: '#ContentPlaceHolder1_TextBoxAntecedentNom',
        callback: function (elements) {
            elements[0].focus();
        }
    });

});


// Ajout d'une icone d'imprimante dans les "Documents du cabinet"
addTweak('/FolderTools/BiblioForm.aspx', '*addPrintIcon', function () {
    function addPrintIcon() {
        let allElements = document.querySelectorAll('[id^="ContentPlaceHolder1_TreeViewBibliot"]');
        let allElementsEndingWithI = Array.from(allElements).filter(element => element.id.endsWith('i'));
        let filteredElementspdf = Array.from(allElementsEndingWithI).filter(element => {
            let imgTags = element.querySelectorAll('img');
            return Array.from(imgTags).some(img => img.getAttribute('src') === "../Images/Icons/pdf.gif");
        });
        console.log('filteredElementspdf', filteredElementspdf);

        // Ajouter l'emoji d'imprimante à chaque élément filtré
        filteredElementspdf.forEach(element => {
            let printIcon = document.createElement('span');
            printIcon.textContent = '🖨️'; // Utiliser l'emoji d'imprimante
            printIcon.style.fontSize = '16px'; // Ajuster la taille si nécessaire
            printIcon.style.marginLeft = '5px';
            printIcon.style.position = 'relative';
            printIcon.style.top = '-2px'; // Décaler de 2px vers le haut

            // Ajouter un gestionnaire d'événements de clic sur l'icône d'imprimante
            printIcon.addEventListener('click', function () {
                handlePrint('print')
            });

            element.appendChild(printIcon);
        });
    }

    waitForElement({
        selector: '[id^="ContentPlaceHolder1_TreeViewBibliot"]',
        callback: addPrintIcon
    });

});



// Set the focus in the text fied /FolderMedical/PopUpRappel.aspx
addTweak('/FolderMedical/PopUpRappel.aspx', '*focusOnTextArea', function () {
    let textAreaSelector = '#TextBoxCabinetPatientRappel';
    let textArea = document.querySelector(textAreaSelector);
    textArea.focus();
    recordMetrics({ clicks: 1, drags: 1 });
});




/* === test d'implementation ... === */
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.action === "sendNotif") {
            let script = document.createElement('script');
            script.src = chrome.runtime.getURL('FW_scripts/FWNotif.js?test=true');
            // console.log(script) // Error in event handler: TypeError: console.log(...) is not a function
            (document.head || document.documentElement).appendChild(script);
        }
    }
);
