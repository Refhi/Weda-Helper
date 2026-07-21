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
addTweak('/FolderMedical/PopUpRappel.aspx', '*sendPostItContent', function () {
    const debug = false; // true pour afficher l'iframe de consultation, false pour la cacher
    const textAreaSelector = '#TextBoxCabinetPatientRappel';
    const fermerButtonSelector = '#ButtonFermerRappel';
    const actionButtonId = 'WedaHelperSendPostItToConsultation';
    const iframeId = 'WedaHelperPostItConsultationIframe';

    function createConsultationIframe(url, iframeDebug = false) {
        return new Promise((resolve, reject) => {
            const iframe = document.createElement('iframe');
            if (iframeDebug) {
                iframe.style.position = 'fixed';
                iframe.style.top = '2vh';
                iframe.style.left = '2vw';
                iframe.style.width = '96vw';
                iframe.style.height = '96vh';
                iframe.style.zIndex = '999999';
                iframe.style.border = '3px solid #d22';
                iframe.style.background = '#fff';
                iframe.style.display = 'block';
            } else {
                iframe.style.display = 'none';
            }
            iframe.src = url;
            iframe.id = iframeId;
            iframe.onload = () => resolve(iframe);
            iframe.onerror = err => reject(err);
            document.body.appendChild(iframe);
        });
    }

    async function constructPatientUrls() {
        const patientId = getCurrentPatientId();
        if (!patientId) {
            throw new Error('Patient non détecté dans l\'URL');
        }

        const patientInfo = await getPatientInfo(patientId);
        const patientFileUrl = patientInfo?.patientFileUrl;
        const patientFileUrlParams = patientFileUrl?.split('?')[1];
        if (!patientFileUrlParams) {
            throw new Error('Paramètres patient introuvables');
        }

        return {
            homeUrl: `${baseUrl}/FolderMedical/PatientViewForm.aspx?${patientFileUrlParams}`,
            consultationUrl: `${baseUrl}/FolderMedical/ConsultationForm.aspx?${patientFileUrlParams}`,
        };
    }

    async function navigateIframeToUrl(iframe, url) {
        await new Promise((resolve, reject) => {
            iframe.onload = () => resolve();
            iframe.onerror = err => reject(err);
            iframe.src = url;
        });
    }

    function openNewConsultationFromHome(iframeDocument) {
        const baseMenuLvl1 = iframeDocument.getElementsByClassName('level1 static')[0];
        if (!baseMenuLvl1) {
            return false;
        }

        const level2Element = Array.from(baseMenuLvl1.querySelectorAll('a.level2'))
            .find(a => a.textContent.trim().startsWith('Consultation'));
        if (!level2Element) {
            return false;
        }

        // Reprise de la logique keyCommands: filtrer les éléments non pertinents du niveau 3.
        const blackList = [
            'Courrier à établir',
            'Demande laboratoire',
            'Demande imagerie',
            'Demande paramédicale',
            'Renouvellement'
        ];
        let level3Elements = level2Element.parentElement?.querySelectorAll('a.level3') || [];
        level3Elements = Array.from(level3Elements).filter(el => !blackList.includes(el.textContent.trim()));

        // Ici on veut explicitement créer une NOUVELLE consultation.
        level2Element.click();

        // Dans certains contextes, le clic niveau 2 n'est pas pris: fallback sur le premier niveau 3 utile.
        if (level3Elements.length > 0) {
            const firstSpan = level3Elements[0].querySelector('span');
            const isCurrent = !!firstSpan?.title?.includes('Vous êtes actuellement positionné sur ce document');
            if (!isCurrent) {
                level3Elements[0].click();
            }
        }

        return true;
    }

    async function waitForElementInDocument(docGetter, selector, timeoutMs = 12000, intervalMs = 100) {
        const startedAt = Date.now();
        while (Date.now() - startedAt < timeoutMs) {
            const doc = docGetter();
            const element = doc?.querySelector(selector);
            if (element) {
                return element;
            }
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
        throw new Error(`Timeout: élément non trouvé (${selector})`);
    }

    function buildConsultationTitle() {
        const now = new Date();
        const date = now.toLocaleDateString('fr-FR');
        const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        return `Post-it ${date} ${time}`;
    }

    async function sendPostItContentToConsultation(button) {
        const postItContent = document.querySelector(textAreaSelector)?.value?.trim();
        const fermerButton = document.querySelector(fermerButtonSelector);

        if (!postItContent) {
            console.warn('[sendPostItContent] Contenu vide, envoi annulé.');
            return;
        }

        if (!fermerButton) {
            console.warn('[sendPostItContent] Bouton de fermeture introuvable.');
            return;
        }

        button.disabled = true;
        button.textContent = 'Envoi...';

        let consultationIframe = null;
        try {
            const { homeUrl, consultationUrl } = await constructPatientUrls();
            consultationIframe = await createConsultationIframe(homeUrl, debug);

            const getConsultationDoc = () => consultationIframe.contentDocument || consultationIframe.contentWindow?.document;

            const menuReady = await waitForElementInDocument(getConsultationDoc, '.level1.static', 12000, 100);
            if (!menuReady) {
                throw new Error('Menu d\'accueil non disponible');
            }

            const openedFromMenu = openNewConsultationFromHome(getConsultationDoc());
            if (!openedFromMenu) {
                console.warn('[sendPostItContent] Impossible d\'ouvrir la consultation via menu.');
            }

            const titleInput = await waitForElementInDocument(getConsultationDoc, '#TextBoxDocumentTitre');
            titleInput.value = buildConsultationTitle();
            titleInput.dispatchEvent(new Event('input', { bubbles: true }));
            titleInput.dispatchEvent(new Event('change', { bubbles: true }));

            const editorIframe = await waitForElementInDocument(
                getConsultationDoc,
                "iframe[id^='CE_ContentPlaceHolder1_EditorConsultation'][id$='_ID_Frame'], #CE_ContentPlaceHolder1_EvenementInformationFiltreUCForm1_EditorZoneUserTextInEvement_ID_Frame"
            );

            let editorBody = await waitForElementInDocument(
                () => editorIframe.contentDocument || editorIframe.contentWindow?.document,
                'body'
            );


            await sleep(200); // Attendre un peu pour que l'iframe soit bien chargée
            editorBody = consultationIframe.contentDocument.querySelector("iframe[id^='CE_ContentPlaceHolder1_EditorConsultation'][id$='_ID_Frame']").contentDocument.body;
            console.log('[sendPostItContent] editorBody trouvé dans l\'iframe de consultation:', editorBody);
            

            editorBody.innerText = postItContent;
            editorBody.dispatchEvent(new Event('input', { bubbles: true }));
            editorBody.dispatchEvent(new Event('change', { bubbles: true }));



            // Appui sur "Enregistrer" dans le document de la consultation (iframe).
            const saveButton = await waitForElementInDocument(getConsultationDoc, '#ButtonSave');
            saveButton.click();
            await sleep(500); // Attendre un peu pour que l'enregistrement se fasse
            console.log('[sendPostItContent] Demande d\'enregistrement envoyée dans la consultation.');
            // On met un check vert
            button.textContent = 'Enregistré ✔️';
            button.title = "Contenu du post-it enregistré dans une nouvelle consultation pour le patient courant. Vous pouvez fermer cette fenêtre. La nouvelle consultation n’apparaitra qu’après actualisation.";

            
            recordMetrics({ clicks: 4, keyStrokes: 2, drags: 1 });

            console.log('[sendPostItContent] Contenu envoyé dans une consultation via iframe.');
        } catch (error) {
            console.error('[sendPostItContent] Échec de l\'envoi vers consultation :', error);
            button.textContent = 'Échec';
            button.title = "Erreur lors de l'envoi vers consultation. Voir console pour détails.";
        } finally {
            if (consultationIframe && !debug) {
                consultationIframe.remove();
            }
            button.disabled = false;
        }
    }

    function addSendButton() {
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
        sendButton.title = 'Weda-Helper : Envoie le contenu du post-it dans une nouvelle consultation pour le patient courant';
        sendButton.style.marginLeft = '8px';
        sendButton.addEventListener('click', () => sendPostItContentToConsultation(sendButton));

        fermerButton.parentElement.insertBefore(sendButton, fermerButton.nextSibling);
    }

    addSendButton();
});