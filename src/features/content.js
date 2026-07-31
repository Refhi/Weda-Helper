/**
 * @file content.js
 * @description Tweaks et modifications diverses pour améliorer l'interface Weda.
 * Contient des petites améliorations ne justifiant pas un fichier dédié :
 * - Bouton de recherche auto sur page recettes
 * - Envoi automatique au TPE pour recettes manuelles
 * - Suppression des suggestions de titre
 * - Sticky list HPRIM
 * - Sélection automatique type document courrier DMP
 * - Ajout icône imprimante documents cabinet
 * 
 * @requires tweaks.js (addTweak)
 * @requires companionLink.js (sendtpeinstruction)
 * @requires print.js (handlePrint)
 */

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
            printIcon.className = 'print-icon-addPrintIcon-wh';

            // Ajouter un gestionnaire d'événements de clic sur l'icône d'imprimante
            printIcon.addEventListener('click', function () {
                handlePrint({printType: 'print'});
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




// Modifier le comportement d'un clic-milieu sur l'élément "W" pour ouvrir le dossier patient dans un nouvel onglet
addTweak('*', '*middleClickW', function () {
    // Fonction pour ajouter l'événement de clic-milieu
    function addMiddleClickEvent() {
        let elements = document.querySelectorAll('.level1.static');
        let element = elements[1];
        console.log('[middleClickW] element', element);
        if (element) {
            element.addEventListener('auxclick', async function(event) {
                if (event.button === 1) { // Vérifie si c'est un clic du milieu
                    event.preventDefault(); // Inhibe le comportement par défaut
                    newPatientTab(); // Ouvre le dossier patient dans un nouvel onglet
                }
            });
        }
    }

    waitForElement({
        selector: '.level1.static',
        callback: addMiddleClickEvent
    });
});


// Inhibition du comportement classique de la touche Alt pour ouvrir le menu du navigateur
// cela facilite l'usage de l'aide (affichée en maintenant Alt appuyé)
// et de la récupération du focus via le Companion qui simule un Alt

addTweak('*', 'inhitAltKey', function () {
    window.addEventListener('keydown', function (event) {
        if (event.key === 'Alt') {
            event.preventDefault();
        }
    });
});


/**
 * Navigation par les flèches dans les listes d'éléments à renouveller
 */
addTweak([
    '/FolderMedical/DemandeForm.aspx',
    '/FolderMedical/ConsultationForm.aspx',
    '/FolderMedical/CertificatForm.aspx',
    '/FolderMedical/PrescriptionForm.aspx',
    '/FolderMedical/CourrierForm.aspx',
    '/FolderMedical/FormulaireForm.aspx'], '*tabNav', function () {
    const selectorForRenouvellementItems = '[id^="ContentPlaceHolder1_RenouvellementUCForm1_DocumentsGrid_LinkButtonDocumentEvenementTitre_"]';
    waitForElement({
        selector: selectorForRenouvellementItems,
        callback: function () {
            afterMutations({
                delay: 400,
                callBackId: 'quickAccess_renouvellement_tabNav',
                callback: function () {
                    elements = document.querySelectorAll(selectorForRenouvellementItems);
                    let selectedEl = null;
                    elements.forEach((el, index) => {
                        el.setAttribute('tabindex', index + 1);
                        // console.log(`[QuickAccess] Élément de renouvellement #${index + 1} rendu focusable pour navigation au clavier:`, el);
                        if (el.closest('tr.grid-selecteditem')) {
                            selectedEl = el;
                        }
                    });
                    (selectedEl ?? elements[0])?.focus();
                }
            });
        }
    });
});


/** 
 * envoi rapide du contenu du post-it dans une consultation
 */
addTweak('/FolderTools/PostItReaderInForm.aspx', '*sendPostItContent', async function () {
    console.log('[sendPostItContent] Ajout du bouton d\'envoi vers consultation');
    const actionButtonId = 'WedaHelperSendPostItToConsultation';
    const linkToPatientSelector = '#ContentPlaceHolder1_HyperLinkPatient';
    const linkToPatientTab = "#ContentPlaceHolder1_HyperLinkPatientTarget";


    async function sendPostItToConsultation() {
        // le lien est au format https://secure.weda.fr/FolderMedical/PatientViewForm.aspx?PatDk=65407357|4152|630|2&crypt=15-A0-4F-82-80-4A-EB-03-E3-E4-0D-9C-F6-2F-BD-77-52-7B-3F-2D-93-A2-D0-E8-E3-A5-AF-C7-47-EF-12-B4
        const linkToPatient = document.querySelector(linkToPatientSelector);
        const questionContentIframe = document.querySelector('#CE_ContentPlaceHolder1_TextBoxPostItMessage_ID_Frame');
        const postItContent = questionContentIframe?.contentDocument?.querySelector('body')?.innerText?.trim();
        if (!postItContent) {
            console.warn('[sendPostItContent] Contenu du post-it vide, insertion annulée.');
            return;
        }
        if (!linkToPatient) {
            console.warn('[sendPostItContent] Lien vers le patient introuvable, insertion annulée.');
            return;
        }

        // Expéditeur du post-it, affiché dans son en-tête (ex: "Dr. Herve MATHIEU DE VIENNE")
        const expediteurTitre = document.querySelector('#ContentPlaceHolder1_LabelUserLabelTitle')?.textContent?.trim() || '';
        const expediteurPrenom = document.querySelector('#ContentPlaceHolder1_LabelUserForenames')?.textContent?.trim() || '';
        const expediteurNom = document.querySelector('#ContentPlaceHolder1_LabelUserSurname')?.textContent?.trim() || '';
        const expediteur = [expediteurTitre, expediteurPrenom, expediteurNom].filter(Boolean).join(' ') || null;

        // Destinataires et leurs éventuelles réponses, listés dans la grille "PostItReadsGridOther"
        const destinataireRows = document.querySelectorAll('#ContentPlaceHolder1_PostItReadsGridOther > tbody > tr');
        const destinataires = [];
        const reponses = [];
        destinataireRows.forEach(row => {
            const nomEl = row.querySelector('td.grid-item table tr:first-child b');
            const nom = nomEl?.textContent?.replace(/\s+/g, ' ').trim();
            if (!nom) {
                return;
            }
            destinataires.push(nom);
            const reponseEl = row.querySelector('td[title="Réponse du destinataire"]');
            const reponseTexte = reponseEl?.textContent?.replace(/\s+/g, ' ').trim();
            if (reponseTexte) {
                reponses.push(`${nom} : ${reponseTexte}`);
            }
        });
        const recipiendaire = destinataires.length ? destinataires.join(', ') : getConnectedDoctorName();

        // Date du post-it, affichée dans son en-tête (ex: "Post-it du 22/07/2026 14:32")
        const postItDate = document.querySelector('#ContentPlaceHolder1_LabelPostItDate')?.textContent?.trim();
        
        // Titre du post-it
        const postItTitle = document.querySelector('#ContentPlaceHolder1_LabelPostItTitle')?.textContent?.trim();


        // Génération du titre à mettre dans la consultation, basé sur le titre du post-it et la date
        const timestampedTitle = buildTimestampedTitle(postItTitle || 'Post-it');
        
        // Construction du contenu à insérer dans la consultation
        const enTete = [
            `Post-it${postItDate ? ` du ${postItDate}` : ''}`,
            expediteur ? `De : ${expediteur}` : null,
            recipiendaire ? `À : ${recipiendaire}` : null,
        ].filter(Boolean).join('\n');

        const content = `${enTete}\n\n${postItContent}${reponses.length ? `\n\nRéponse(s) :\n${reponses.join('\n')}` : ''}`;


        const button = document.getElementById(actionButtonId);
        button.disabled = true;
        button.textContent = 'Envoi en cours...';

        const result = await insertData('toConsultation', { content, titleForConsultation: timestampedTitle }, { homeUrl: linkToPatient.href });

        if (result) {
            button.textContent = 'Envoi terminé !';
            console.log('[sendPostItContent] Contenu du post-it envoyé dans une nouvelle consultation :', result);
        } else {
            button.textContent = 'Échec de l\'envoi';
            console.error('[sendPostItContent] Échec de l\'envoi du post-it vers la consultation');
        }        
    }

    function addSendButton() {
        const fermerButtonSelector = linkToPatientTab;
        if (document.getElementById(actionButtonId)) {
            return;
        }

        const fermerButton = document.querySelector(fermerButtonSelector);
        if (!fermerButton || !fermerButton.parentElement) {
            return;
        }

        const sendButton = document.createElement('button');
        sendButton.id = actionButtonId;
        sendButton.type = 'button';
        sendButton.className = 'button';
        sendButton.textContent = 'Envoyer vers consultation';
        sendButton.title = 'Weda-Helper : Envoie le contenu du post-it dans une nouvelle consultation pour le patient concerné. Cette action n’enregistre pas le post-it ni ne l’envoi, vous devrez cliquer sur envoyer +/- archiver si nécessaire.';
        sendButton.style.marginLeft = '8px';
        sendButton.style.marginTop = '8px';
        sendButton.style.display = 'block';
        sendButton.addEventListener('click', () => sendPostItToConsultation(sendButton));

        fermerButton.parentElement.insertBefore(sendButton, fermerButton.nextSibling);
    }

    waitForElement({
        selector: linkToPatientTab,
        triggerOnInit: true,
        callback: addSendButton,
    });
});