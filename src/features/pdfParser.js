/**
 * @file pdfParser.js
 * @description Système complet d'analyse et extraction de données depuis les PDF.
 * Extrait automatiquement les informations des PDF importés :
 * - Date du document
 * - Nom et date de naissance du patient
 * - NIR du patient
 * - Catégorisation automatique (type de document, spécialité, etc.)
 * - Génération automatique de titres
 * - Classification destination (Consultation/Résultats/Courrier)
 * 
 * Utilisé sur les pages d'import (UpLoaderForm) et de messagerie (WedaEchanges).
 * 
 * @requires lib/pdf.mjs (pdfjsLib)
 * @requires lib/ZXing (lecture datamatrix)
 * @requires tweaks.js (addTweak)
 * @requires storage.js (getOption)
 * @requires notifications.js (sendWedaNotif)
 * 
 * @typedef {Object} ExtractedData
 * @property {string} documentDate - Date du document
 * @property {string} dateOfBirth - Date de naissance patient
 * @property {Array<string>} nameMatches - Noms correspondants trouvés
 * @property {Array<string>} nirMatches - NIR correspondants trouvés
 * @property {string} category - Catégorie du document
 * @property {string} destinationClass - Classe de destination (1/2/3)
 */

// IMPORTATION DES MODULES
// -----------------------

/**
 * Import des modules es6, on utise une méthode détournée pour les importer dans le contexte de l'extension
 * (voir https://stackoverflow.com/questions/48104433/how-to-import-es6-modules-in-content-script-for-chrome-extension)
 */


// Import de lib pdf.mjs pour la lecture du texte présent dans un PDF (non permis par pdf-lib)
(async () => {
    const pdfjsLib = await import(chrome.runtime.getURL("lib/pdf.mjs"));
    pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("lib/pdf.worker.mjs");
})();

// Imports de lib ZXing pour la lecture des datamatrix
(async () => {
    const ZXing = await import(chrome.runtime.getURL('lib/ZXing/index.min.js'));
    console.log('[pdfParser] ZXing chargé');
})();




// FLUX PRINCIPAL DU SCRIPT
// ------------------------

// 1. Injection du script
// 1.a. Dans la page d'import
addTweak('/FolderMedical/UpLoaderForm.aspx', 'autoPdfParser', function () {
    // 1. Ajout du bouton pour initialiser les catégories
    addDocumentTypesButton();
    // 2. Attente de l'apparition de l'iframe contenant le PDF
    waitForElement({
        // l'id est splité car il y a un chiffre variable au milieu (1 ou 2 selon que l'option
        // "vertical" est cochée ou nondans la fenêtre d'import)
        selector: "[id^='ContentPlaceHolder1_ViewPdfDocumentUCForm'][id$='_iFrameViewFile']",
        callback: processFoundPdfIframeImport
    });
});

// 1.b. Dans la page des Echanges Sécurisés
addTweak('/FolderMedical/WedaEchanges', 'autoPdfParser', function () {
    console.log('[pdfParser] Chargement de la page d\'échanges');
    waitForElement({
        // Ici on déclenche la procédure à la détection de la page de sélection du patient
        selector: "#ContentPlaceHolder1_FindPatientUcForm1_DropDownListRechechePatient",
        callback: function () {
            processFoundPdfIframeEchanges(false);
        }
    });

    // On va également déclencher une procédure simplifiée si est cliqué le bouton "Importer le message"
    waitForElement({
        selector: "div.docImportBody td a",
        text: "Importer le message",
        callback: function (elements) {
            // Ajout d'un listener sur tous les boutons "Importer le message"
            elements.forEach(function (element) {
                element.addEventListener("click", function () {
                    console.log("[pdfParser] Importation du message cliqué, je vais traiter le PDF présent dans l'iframe.");

                    // Récupérer l'élément frère en troisième position vers le haut
                    let gdParrentElement = element.parentNode.parentNode;
                    let nameElement = gdParrentElement.querySelector("td:nth-child(2) a");
                    let nameText = nameElement ? nameElement.innerText : "Élément non trouvé";
                    let ddnElement = gdParrentElement.querySelector("td:nth-child(3)");
                    nameText += ddnElement ? ` ${ddnElement.innerText}` : "";
                    console.log("[pdfParser] Nom du document importé :", nameText);
                    addPatientNameDisplay(nameText);
                    processFoundPdfIframeEchanges(true);
                });
            });
        }
    });

    // On ajoute aussi une petite aide : le champ de recherche de patient est décalé vers le bas de l'écran
    waitForElement({
        selector: "#ContentPlaceHolder1_FindPatientUcForm1_PanelFindPatient",
        callback: function () {
            const searchField = document.querySelector("#ContentPlaceHolder1_FindPatientUcForm1_PanelFindPatient");
            if (searchField) {
                const maxHeight = 300;
                // Déplacer l'élément à 300px du bas de l'écran
                const displacement = window.innerHeight - maxHeight;
                searchField.style.position = "fixed";
                searchField.style.top = `${displacement - 50}px`;
                searchField.style.left = "0";
                searchField.style.width = "99%";
                searchField.style.maxHeight = `${maxHeight}px`;
                searchField.style.overflow = "auto"; // Ajoute un défilement si le contenu dépasse
                console.log(`[pdfParser] Champ de recherche de patient décalé vers le bas de ${displacement}px avec une hauteur maximale de ${maxHeight}px`);
            }
        }
    });

    // Et on ajoute un bouton pour réinitialiser les données d'analyse automatique du PDF
    waitForElement({
        selector: ".documentImport",
        callback: function (elements) {
            const mainDiv = elements[0];

            if (mainDiv) {
                const resetButton = document.createElement('button');
                resetButton.innerText = '🔄 WH : Réinitialiser auto-imports';
                resetButton.style.marginLeft = '10px';
                resetButton.title = "Weda-Helper : Réinitialise les données d'analyse automatique du PDF. Utile lorsque vous testez différents mots-clés de classement automatique dans les options."; // Texte lors du survol de la souris
                resetButton.type = 'button'; // Assure que c'est un bouton cliquable
                resetButton.id = 'pdfParserResetButton';
                resetButton.onclick = function () {
                    sessionStorage.clear();
                    console.log("[pdfParser] Toutes les données d'analyse automatique du PDF ont été réinitialisées.");
                    sendWedaNotif({
                        message: "Toutes les données d'analyse automatique du PDF ont été réinitialisées.",
                        type: 'success'
                    });
                };
                mainDiv.appendChild(resetButton);
            }
        }
    });

});

// 1.c. Ajout d’un champ de debug pour le PDF Parser
addTweak('/FolderMedical/UpLoaderForm.aspx', 'debugModePdfParser', function () {
    // Création du champ d’input texte (textarea)
    const debugMode = document.createElement('textarea');
    debugMode.placeholder = "Mode debug PDF Parser";
    debugMode.style.width = "100%";
    debugMode.style.marginTop = "10px";
    debugMode.style.minHeight = "80px"; // ou plus selon le besoin

    // Création du bouton pour lancer le debug
    const debugButton = document.createElement('button');
    debugButton.innerText = 'Lancer le debug';
    debugButton.style.marginTop = "10px";
    debugButton.style.display = "block";

    // Création du champ output (readonly)
    const debugOutput = document.createElement('textarea');
    debugOutput.placeholder = "Résultat du debug";
    debugOutput.style.width = "100%";
    debugOutput.style.marginTop = "10px";
    debugOutput.style.minHeight = "250px";
    debugOutput.readOnly = true;

    // Ajout de la logique du bouton
    debugButton.onclick = async function () {
        const destinations = {
            '1': "Consultation",
            '2': "Résultats d'examens",
            '3': "Courrier"
        };

        const debugValue = debugMode.value;
        const extractedData = await extractRelevantData(debugValue);
        extractedData.readeableDestination = destinations[extractedData.destinationClass] || "Inconnue";
        // Affichage lisible de l'objet
        debugOutput.value = JSON.stringify(extractedData, null, 2);
        console.log("[pdfParser] Mode debug activé avec la valeur : ", debugValue, extractedData);
    };

    // Insertion dans le DOM : textarea, puis bouton, puis output (dans l'ordre)
    document.body.prepend(debugOutput);
    document.body.prepend(debugButton);
    document.body.prepend(debugMode);
});




/** A partir de là la procédure suit globalement un enchainement de "roll-over" :
 * - il regarde a chaque étape si les données sont déjà présentes
 * - si elles ne le sont pas, il effectue l'étape demandée, ce qui déclenche un rafraichissement de la page
 * - sinon elles le sont, il passe donc à l'étape suivante
 * - et ainsi de suite jusqu'à la fin de la procédure
 * 
 * Exemple d'objet extractedData :
 * {
 *    documentDate: "01/01/2021",
 *    dateOfBirth: "01/01/2021",
 *    nameMatches: ["DUPONT Jean", "DUPONT Jeanne"],
 *    nirMatches: ["1234567890123", "1234567890124"],
 *    actionLine: "0",
 *    alreadyImported: false,
 *    failedSearches: ["InsSearch", "DateSearch"]
 * }
 */
async function processFoundPdfIframeImport(elements) {
    // Setup de la procédure
    // Partie "neutre" => n'entraine pas de rafraichissement de la page ou de DOM change
    // ---------------------------------

    // Extraction des données de base
    const baseData = await extractBasePdfData(elements);
    if (!baseData) return;

    const { urlPDF, fullText, hashId } = baseData;

    // Ajout d'un bouton de reset du sessionStorage correspondant
    addResetButton(hashId);

    // Récupération des données déjà extraites pour ce PDF
    let extractedData = getPdfData(hashId);

    // Données déjà importées pour ce PDF ?
    if (extractedData.alreadyImported) {
        console.log("[pdfParser] Données déjà importées pour ce PDF. Arrêt de l'extraction. Renvoi vers le champ de recherche ou le 1er patient de la liste si présent");
        selectFirstPatientOrSearchField();
        return;
    }

    // Extraction ou récupération des données
    extractedData = await handleDataExtraction(fullText, urlPDF, hashId);

    // Partie "non-neutre" - entraine un rafraichissement de la page ou un changement du DOM
    // ---------------------------------
    // Recherche du patient par la date de naissance
    // => on pourrait rechercher par INS si on a le datamatrix, mais cela impliquerait de
    //    naviguer entre les différents types de recherche dans la fenêtre d'import

    let handlePatientSearchReturn = handlePatientSearch(extractedData, hashId);
    if (handlePatientSearchReturn.action === 'refresh') {
        console.log("[pdfParser] handlePatientSearchReturn", handlePatientSearchReturn.message);
        // La procédure n'est pas arrivée au bout, un rafraichissement de la page est attendu
        // On bloque donc ici pour éviter d'intégrer des données trop tôt
        return;
    }

    // Intégration des données dans le formulaire d'import
    await setExtractedDataInForm(extractedData);

    // Marquage des données comme déjà importées
    markDataAsImported(hashId, extractedData);

    // Enregistrement des métriques approximatives
    recordMetrics({ clicks: 9, drags: 9, keyStrokes: 10 });

    // Mise du focus sur la date du document importé
    setTimeout(function () {
        highlightDate();
    }, 200);
}

// Fonction pour traiter le PDF dans la page des échanges sécurisés
// va suivre une logique similaire à celle de la page d'import
async function processFoundPdfIframeEchanges(isINSValidated = false) {
    console.log("[pdfParser] processFoundPdfIframeEchanges avec isINSValidated", isINSValidated);
    let iframesElements = document.querySelectorAll('#PanelViewDocument iframe');
    if (iframesElements.length === 0) {
        // On n'a pas trouvé d'iframe, on est donc peut-être dans le cadre d'un pdf mis dans un embed (c'est le cas
        // quand les pdfs sont accompagnés d'un corps de message dans les échanges sécurisés)
        iframesElements = document.querySelectorAll('.mssAttachment embed');
    }

    // Setup de la procédure
    // Extraction des données de base
    const baseData = await extractBasePdfData(iframesElements);
    if (!baseData) return;

    const { urlPDF, fullText, hashId } = baseData;

    // récupération des données déjà extraites pour ce PDF
    let extractedData = getPdfData(hashId);

    // Récupérer les données via extraction/datamatrix ou sessionStorage si déjà extraites
    extractedData = await handleDataExtraction(fullText, urlPDF, hashId);

    // Surveiller les listes de patients cliquables pour savoir quel patient a été cliqué
    waitForElement({
        selector: ".grid-item_tr, .grid-selecteditem",
        callback: showClickedPatient,
        triggerOnInit: true
    });


    // Données déjà importées pour ce PDF ?
    if (extractedData.alreadyImported) {
        console.log("[pdfParser] Données déjà importées pour ce PDF. Arrêt de l'extraction. Renvoi vers le champ de recherche ou le 1er patient de la liste si présent");
        selectFirstPatientOrSearchField();
        return;
    }


    console.log("[pdfParser] je travaille sur les données", extractedData);

    if (!isINSValidated) {
        console.log("[pdfParser] Je ne suis pas sur une INS validée, je vais donc chercher le patient");
        // Boucle de recherche patient - on continue jusqu'à ce qu'il n'y ait plus de refresh nécessaire
        let continueSearching = true;
        let attempts = 0;
        const MAX_ATTEMPTS = 5; // Limite pour éviter une boucle infinie

        while (continueSearching && attempts < MAX_ATTEMPTS) {
            attempts++;
            console.log(`[pdfParser] Tentative de recherche de patient ${attempts}/${MAX_ATTEMPTS}`);

            // Recherche du patient
            let handlePatientSearchReturn = handlePatientSearch(extractedData, hashId);

            if (handlePatientSearchReturn.status === 'success' || handlePatientSearchReturn.message === 'Patient trouvé et cliqué') {
                console.log("[pdfParser] Recherche de patient terminée avec succès", handlePatientSearchReturn.message);
                continueSearching = false;
                console.log("[pdfParser] Traitement terminé pour la page d'échanges");
            } else if (handlePatientSearchReturn.status === 'error') {
                console.error("[pdfParser] Erreur lors de la recherche de patient :", handlePatientSearchReturn.message);
                continueSearching = false;
                // sendWedaNotifAllTabs({
                //     message: "Erreur lors de la recherche de patient : " + handlePatientSearchReturn.message,
                //     type: 'undefined',
                //     icon: 'search_off',
                //     duration: 10000
                // });
            } else if (handlePatientSearchReturn.action === 'refresh') {
                console.log("[pdfParser] handlePatientSearchReturn nécessite une action:", handlePatientSearchReturn.message);
                // On attend un peu pour que les changements DOM se produisent
                await new Promise(resolve => setTimeout(resolve, 500));
                // On continue la boucle sans quitter la fonction
                continue;
            } else {
                console.log("[pdfParser] Échec de la recherche de patient après plusieurs tentatives");
                continueSearching = false;
            }
        }

        if (attempts >= MAX_ATTEMPTS) {
            console.log("[pdfParser] Nombre maximum de tentatives atteint pour la recherche de patient");
            // Marquage des données comme déjà importées
            markDataAsImported(hashId, extractedData);
            return;
        }
    }

    // On a normalement pu sélectionner le bon patient
    // Sélectionner la bonne destination d'importation (soumis à option false par défaut)
    await selectDestinationIfNeededES(extractedData.destinationClass);
    // 2. Mettre le titre
    await setTitleIfNeededES(extractedData.documentTitle);
    // 3. Sélectionner la bonne catégorie
    await selectDocumentTypeES(extractedData.documentType);
    // Marquage des données comme déjà importées
    markDataAsImported(hashId, extractedData);


    // pas de champ de date possible depuis les échanges sécurisés
    // si #ContentPlaceHolder1_FindPatientUcForm1_PatientsGrid_LinkButtonPatientGetNomPrenom_0 existe, y mettre le focus
    const patientLinkButton = document.querySelector("#ContentPlaceHolder1_FindPatientUcForm1_PatientsGrid_LinkButtonPatientGetNomPrenom_0");
    if (patientLinkButton) {
        console.log("[pdfParser] Mise au focus sur le patient sélectionné");
        patientLinkButton.focus();
        ListTabOrderer(patientLinkButton.id);
        await observeDiseapearance(patientLinkButton);
    }
    // 4. mettre le focus sur le bouton de validation "#messageContainer class.button.valid"
    const validationButton = document.querySelector("#messageContainer .button.valid");
    if (validationButton) {
        console.log("[pdfParser] Mise au focus sur le bouton de validation");
        validationButton.focus();
        // sendWedaNotifAllTabs({
        //     message: "Sélection du patient et des données d'import terminée. Vous pouvez valider l'import en appuyant sur Enter. Maj+Tab pour effectuer des corrections.",
        //     type: 'success',
        //     icon: 'success'
        // });
        // Supprimer #iFrameViewFile du taborder
        const iframe = document.querySelector("#iFrameViewFile");
        if (iframe) {
            iframe.setAttribute("tabindex", "-1");
            console.log("[pdfParser] Suppression de l'iframe du taborder");
        }
    } else {
        console.error("[pdfParser] Bouton de validation introuvable");
    }
}

async function showClickedPatient() {
    // On surveille quel patient a été cliqué. : tout les éléments .grid-item_tr et .grid-selecteditem
    const possibleClickablePatient = document.querySelectorAll(".grid-item_tr, .grid-selecteditem");
    if (possibleClickablePatient.length > 0) {
        possibleClickablePatient.forEach((patient) => {
            patient.addEventListener("click", function () {
                console.log("[pdfParser] Patient cliqué :", patient.innerText);
                // La DDN a un id qui commence par "ContentPlaceHolder1_FindPatientUcForm1_PatientsGrid_LinkButtonPatienDateNaissance_"
                const DDN = patient.querySelector("[id^='ContentPlaceHolder1_FindPatientUcForm1_PatientsGrid_LinkButtonPatienDateNaissance_']");
                // Le NOM PRENOM a un id qui commence par "ContentPlaceHolder1_FindPatientUcForm1_PatientsGrid_LinkButtonPatientGetNomPrenom_"
                const NOM_PRENOM = patient.querySelector("[id^='ContentPlaceHolder1_FindPatientUcForm1_PatientsGrid_LinkButtonPatientGetNomPrenom_']");

                // Correction de la ligne pour éviter les erreurs de concaténation avec null
                const nomPrenom = NOM_PRENOM ? NOM_PRENOM.innerText : "";
                const dateNaiss = DDN ? DDN.innerText : "";
                const patientData = `${nomPrenom} ${dateNaiss}`.trim();

                console.log("[pdfParser] Patient cliqué :", patientData);

                addPatientNameDisplay(patientData);

                // On retire les listeners pour éviter les doublons
                possibleClickablePatient.forEach((p) => {
                    p.removeEventListener("click", arguments.callee);
                });
            });
        });
    }
}


function addPatientNameDisplay(patientName) {
    // Ajouter le nom du patient à côté du bouton de validation
    if (document.querySelector("#pdfParserPatientName")) {
        document.querySelector("#pdfParserPatientName").remove();
    }
    const patientNameSpan = document.createElement('span');
    patientNameSpan.innerText = `Vers dossier : ${patientName}`;
    patientNameSpan.style.marginLeft = '10px';
    patientNameSpan.id = 'pdfParserPatientName';
    const validationButton = document.querySelector("#messageContainer .button.valid");
    validationButton.insertAdjacentElement('afterend', patientNameSpan)
}



// Fonctions utilitaires
function returnMessageBodyES() {
    // Sélection de l'élément messageBody
    const messageBodyElement = document.querySelector('.messageBody');
    if (messageBodyElement) {
        // Extraction du texte de l'élément
        const messageBodyText = messageBodyElement.innerText.trim();
        console.log("[pdfParser] Texte extrait de messageBody :", messageBodyText);

        return messageBodyText;
    } else {
        console.warn("[pdfParser] Aucun élément messageBody trouvé.");
    }

    return null;
}

/**
 * Sélectionne le bon type de document pour les échanges sécurisés
 */
async function selectDocumentTypeES(documentType) {
    console.log("[pdfParser] Sélection du type de document :", documentType);
    // Le menu déroulant est le select avec le titre "Attribuer une classification au document"
    const selectElement = document.querySelector("select[title='Attribuer une classification au document']");

    // Vérifier si on a un élément select et un type de document spécifié
    if (!selectElement || !documentType) {
        console.log("[pdfParser] Pas de select ou pas de type de document défini");
        return;
    }

    // Parcourir les options pour trouver celle qui correspond au documentType
    for (let i = 0; i < selectElement.options.length; i++) {
        const option = selectElement.options[i];
        // On compare en ignorant la casse
        if (option.text.toLowerCase() === documentType.toLowerCase()) {
            // Option trouvée, on la sélectionne
            selectElement.value = option.value;
            selectElement.dispatchEvent(new Event('change'));
            console.log(`[pdfParser] Type de document '${documentType}' sélectionné`);
            return;
        }
    }
    console.warn(`[pdfParser] Aucun type de document correspondant à '${documentType}' trouvé`);

}

/**
 * Insère le titre au bon endroit pour les échanges sécurisés
 */
async function setTitleIfNeededES(Titre) {
    const titleOption = await getOptionPromise('PdfParserAutoTitle');
    console.log("[pdfParser] setTitleIfNeededES avec titleOption", titleOption);
    if (!titleOption) {
        console.log("[pdfParser] Option PdfParserAutoTitle désactivée, pas de titre à mettre");
        return;
    }
    // Le champ de titre est l'input avec le titre "C'est le titre qu'aura le document dans le dossier patient"
    let titleInput = document.querySelectorAll("input[title=\"C'est le titre qu'aura le document dans le dossier patient\"]");
    // On sélectionne le dernier input (le plus bas dans le DOM)
    titleInput = titleInput[titleInput.length - 1];
    if (titleInput) {
        console.log("[pdfParser] Titre trouvé, on le met dans le champ de titre", Titre);
        titleInput.value = Titre;
        titleInput.dispatchEvent(new Event('change'));
        titleInput.dispatchEvent(new Event('input')); // dans certains cas, l'input est écouté via un listener 'input'
        return;
    }
    console.error("[pdfParser] Titre non trouvé, impossible de le mettre dans le champ de titre");
}

/**
 * Sélectionne la bonne destination d'importation dans les **échanges sécurisés**, si l'option est activée.
 */
async function selectDestinationIfNeededES(destinationNumber) {
    const selectionNeeded = await getOptionPromise('PdfParserAutoClassification');
    if (!selectionNeeded) {
        return;
    }
    // Si l'option est activée, on va chercher la bonne destination
    // Les destinations possibles sont sélectionnées via des éléments clickables
    // On reprend la classification de extractDestinationClass, mais les noms sont différents
    const destinations = {
        '1': "Ranger dans les consultations",
        '2': "Ranger dans les résultats d'examens",
        '3': "Ranger dans les courriers"
    };
    // On va cliquer sur l'élément .weImportDocTargets dont le titre est celui de la destination
    const elementACliquer = document.querySelector(`.weImportDocTargets[title="${destinations[destinationNumber]}"]`);
    if (elementACliquer) {
        console.log("[pdfParser] Sélection de la destination d'importation :", destinations[destinationNumber]);
        // On va cliquer sur l'élément
        elementACliquer.click();
        return;
    }

    console.error("[pdfParser] Aucune destination d'importation trouvée pour le numéro :", destinationNumber);
}





/**
 * Extrait les données de base communes à partir d'un PDF (url, texte, hash).
 * @param {Element[]} iframesElements - Les éléments DOM contenant l'iframe.
 * @returns {Promise<Object|null>} - Les données de base extraites ou null si échec.
 */
async function extractBasePdfData(iframesElements) {
    console.log('[pdfParser] ----------------- Nouvelle boucle --------------------------------');
    // Initialisation des variables
    let urlPDF = null;
    let fullText = null;
    let hashId = null;

    // 1. Trouver l'URL du PDF
    urlPDF = await findPdfUrl(iframesElements);
    if (!urlPDF) {
        console.log("[pdfParser] l'url du PDF n'a pas été trouvée. On va se baser sur le corps du texte.");
        urlPDF = null;
        fullText = returnMessageBodyES();
        hashId = await customHash(fullText, urlPDF);
        const toReturn = { urlPDF, fullText, hashId };
        console.log("[pdfParser] toReturn", toReturn);
        return toReturn;
    }
    console.log('[pdfParser] urlPDF', urlPDF);

    // 2. Extraire le texte du PDF
    fullText = await extractTextFromPDF(urlPDF);

    // 3. Ajouter le corps du message à la fin du texte du PDF si disponible et si le PDF contient moins de 3 lignes
    const messageBody = returnMessageBodyES();
    if (messageBody) {
        const pdfLineCount = fullText.split('\n').length;
        if (pdfLineCount < 3) {
            console.log(`[pdfParser] Le PDF ne contient que ${pdfLineCount} ligne(s), ajout du corps du message`);
            fullText += "\n\n=== Corps du message ===\n" + messageBody;
        } else {
            console.log(`[pdfParser] Le PDF contient ${pdfLineCount} lignes, pas d'ajout du corps du message`);
        }
    }

    console.log('[pdfParser] fullText', [fullText]);

    // 4. Créer un identifiant unique pour ce PDF
    hashId = await customHash(fullText, urlPDF);


    return { urlPDF, fullText, hashId };
}
/**
 * Gère l'extraction des données à partir du PDF (texte ou datamatrix).
 * @param {string} fullText - Le texte extrait du PDF.
 * @param {string} urlPDF - L'URL du PDF.
 * @param {string} hashId - L'identifiant unique du PDF.
 * @param {boolean} isEchanges - Si true, contexte des échanges sécurisés, sinon import standard.
 * @returns {Promise<Object>} - Les données extraites du PDF.
 */
async function handleDataExtraction(fullText, urlPDF, hashId) {
    let dataMatrixReturn = null;
    let extractedData = getPdfData(hashId);

    if (Object.keys(extractedData).length > 0) {
        console.log("[pdfParser] Données déjà extraites pour ce PDF. Utilisation des données existantes.", extractedData);
        return extractedData;
    } else {
        console.log("[pdfParser] Données non extraites pour ce PDF. Extraction des données.");
        // Extraction des informations pertinentes
        extractedData = await extractRelevantData(fullText);

        // Si on n'a pas de nirMatches, on se rabattra sur la DDN et le nom
        if (!extractedData.nirMatches || extractedData.nirMatches.length === 0) {
            // Si la date de naissance ou le nom n'ont pas été trouvés, on recherche le datamatrix
            if (!extractedData.dateOfBirth || extractedData.nameMatches.length === 0) {
                console.log("[pdfParser] Date de naissance ou nom non trouvée. Recherche du datamatrix.");
                dataMatrixReturn = await extractDatamatrixFromPDF(urlPDF);
                console.log('[pdfParser] dataMatrixReturn', dataMatrixReturn);
                if (!dataMatrixReturn) {
                    console.log("[pdfParser] Datamatrix non trouvé.");
                    setPdfData(hashId, { alreadyImported: true });
                }
            }
        }

        // Stockage et priorisation des informations pertinentes
        // => le dataMatrix est prioritaire sur les informations extraites du texte
        completeExtractedData(extractedData, dataMatrixReturn);
        console.log('[pdfParser] extractedData', JSON.stringify(extractedData));
        setPdfData(hashId, extractedData);

        return extractedData;
    }
}

/**
 * Récupère les données du PDF en fonction du hash.
 * 
 * @param {string} hashId - L'identifiant unique du hash pour le PDF.
 * @param {string|null} [key=null] - La clé des données à récupérer.
 * 
 * @returns {Object|null} - Les données récupérées depuis le sessionStorage si key est null, sinon la valeur associée à la clé.
 */
function getPdfData(hashId, key = null) {
    if (typeof hashId !== 'string') {
        throw new Error('hashId doit être une chaîne de caractères');
    }

    let storedData = JSON.parse(sessionStorage.getItem(hashId)) || {};
    return key === null ? storedData : (storedData[key] || null);
}

/**
 * Stocke les données du PDF en fonction du hash.
 * 
 * @param {string} hashId - L'identifiant unique du hash pour le PDF.
 * @param {Object} data - Les données à stocker.
 */
function setPdfData(hashId, data) {
    if (typeof hashId !== 'string') {
        throw new Error('hashId doit être une chaîne de caractères');
    }

    if (typeof data !== 'object' || data === null) {
        throw new Error('Les données à stocker doivent être un objet non nul');
    }

    let storedData = JSON.parse(sessionStorage.getItem(hashId)) || {};
    let mergedData = { ...storedData, ...data };
    sessionStorage.setItem(hashId, JSON.stringify(mergedData));
}

// Rechercher quels types de recherche sont possibles
function checkSearchPossibility(searchOptionValue) {
    let dropDownResearch = document.querySelector("[id*='FindPatientUcForm'][id*='_DropDownListRechechePatient']");
    if (!dropDownResearch) {
        console.error("[pdfParser] Le dropdown de recherche n'a pas été trouvé : recherche terminée ?");
        return false;
    }

    let options = dropDownResearch.options;
    for (let i = 0; i < options.length; i++) {
        if (options[i].value === searchOptionValue) {
            return true;
        }
    }
    sendWedaNotif({
        message: `Type de recherche ${searchOptionValue} non disponible. Contactez votre expert pour l'activer. (demandez l'accès aux INS pour votre compte)`,
        type: 'fail'
    });

    return false;
}

/**
 * Gère la recherche et la sélection du patient en fonction des données extraites.
 * 
 * @param {Object} extractedData - Les données extraites du PDF.
 * @param {Array} extractedData.nirMatches - Les correspondances de NIR trouvées dans les données extraites.
 * @param {string} extractedData.dateOfBirth - La date de naissance extraite.
 * @param {Array} extractedData.nameMatches - Les correspondances de noms trouvées dans les données extraites.
 * @param {Array} extractedData.failedSearches - Les méthodes de recherche qui ont échoué.
 * 
 * @returns {Object} - L'action et le message de la recherche.
 * @returns {string} action - Le statut de la recherche ('refresh', 'continue').
 * @returns {string} status - Le statut de la recherche ('success', 'error', 'ongoing').
 * @returns {string} message - Le message associé au statut.
 */
function handlePatientSearch(extractedData, hashId) {
    console.log("[pdfParser] handlePatientSearch", extractedData);
    // On initialise les priorités de recherche en vérifiant si les données sont présentes et cohérentes
    const searchPriorities = [
        { type: "InsSearch", data: extractedData.nirMatches && extractedData.nirMatches.length > 0 ? extractedData.nirMatches[0] : null },
        // "Nom" porte mal son nom : on peut y rechercher pas mal de choses, dont le NIR tronqué (sans clé) ce qui est utile pour les INS non validés
        { type: "Nom", data: extractedData.nirMatches && extractedData.nirMatches.length > 0 ? extractedData.nirMatches[0] : null },
        { type: "Naissance", data: extractedData.dateOfBirth && extractedData.dateOfBirth !== formatDate(new Date()) ? extractedData.dateOfBirth : null },

    ];

    for (let search of searchPriorities) {
        console.log("[pdfParser] Les méthodes refusées sont :", extractedData.failedSearches);
        console.log("[pdfParser] Recherche de patient par :", search.type, "=>", search.data);
        if (search.data && !extractedData.failedSearches.includes(search.type)) {
            let properSearched = lookupPatient(search.type, search.data);
            console.log(`[pdfParser] après lookupPatient : ${search.type} :`, properSearched);
            if (properSearched.status === 'success') {
                console.log(`[pdfParser] ${search.type} présent, on continue à chercher le patient.`);
                const clicPatientReturn = clicPatient(extractedData);
                console.log("[pdfParser] clicPatientReturn", clicPatientReturn.status, clicPatientReturn.message);
                if (clicPatientReturn.status === 'success') {
                    return { status: 'success', action: 'refresh', message: 'Patient trouvé et cliqué' };
                } else if (clicPatientReturn.status === 'error') {
                    extractedData.failedSearches.push(search.type);
                    setPdfData(hashId, extractedData); // permet la rémanence des données
                } else if (clicPatientReturn.status === 'continue') {
                    console.log("[pdfParser] Patient non trouvé ou correctement sélectionné, je continue la procédure.");
                    return { status: 'success', action: 'continue', message: 'Patient non trouvé ou correctement sélectionné' };
                } else {
                    console.error("[pdfParser] Erreur inconnue lors de la recherche du patient, je continue la procédure.");
                    return { status: 'error', action: 'continue', message: 'Erreur inconnue lors de la recherche du patient' };
                }
            } else if (properSearched.status === 'refresh') {
                console.log(`[pdfParser] arrêt de la procédure car :`, properSearched.message);
                // On attends aussi un rafraichissement de la page
                return { status: 'ongoing', action: 'refresh', message: properSearched.message };
            } else {
                // On marque l'échec de cette méthode de recherche => la boucle suivante l'écartera
                console.error(`[pdfParser] Echec de la méthode de recherche :`, properSearched.message, `pour ${search.type}`, "je la marque comme un échec et je continue la procédure.");
                extractedData.failedSearches.push(search.type);
                setPdfData(hashId, extractedData); // permet la rémanence des données
            }
        }
    }

    console.log("[pdfParser] Aucune donnée permettant de trouver le patient. Arrêt de la recherche de patient.");
    return { status: 'error', action: 'continue', message: 'Aucune donnée permettant de trouver le patient. Merci de chercher manuellement le patient.' };
}


// Fonction pour sélectionner le premier patient de la liste ou le champ de recherche
function selectFirstPatientOrSearchField() {
    // On va chercher le premier patient de la liste
    let firstPatient = getPatientsList()[0];
    console.log("[pdfParser] firstPatient", firstPatient);
    if (firstPatient) {
        ListTabOrderer(firstPatient.id);
        PatientSelectEntryListener();
        firstPatient.focus();
    } else {
        // Si aucun patient n'est trouvé, on va chercher le champ de recherche  
        let searchField = document.querySelector("[id^='ContentPlaceHolder1_FindPatientUcForm'][id$='_TextBoxRecherchePatientByDate']");
        console.log("[pdfParser] searchField", searchField);
        if (searchField) {
            searchField.focus();
            searchField.select();
        }
    }
}

// Bouton pour réinitialiser les données d'un PDF
function addResetButton(hashId) {
    let resetButton = document.createElement('button');
    resetButton.innerText = '🔄'; // Emoji de réinitialisation
    resetButton.style.marginLeft = '10px';
    resetButton.title = "Weda-Helper : Réinitialiser les données d'analyse automatique du PDF. En cliquant vous pourrez visualiser le log de l’extraction.";
    resetButton.id = "pdfParserResetButton";
    resetButton.onclick = function () {
        sessionStorage.removeItem(hashId);
        console.log("[pdfParser] Données réinitialisées pour le PDF.");
    };
    let binButtonSelector = "#ContentPlaceHolder1_FileStreamClassementsGrid_DeleteButtonGridFileStreamClassement_" + actualImportActionLine();
    let buttonContainer = document.querySelector(binButtonSelector);
    buttonContainer.insertAdjacentElement('afterend', resetButton);
}

// met la date en focus et surbrillance pour faciliter la saisie
function highlightDate() {
    let dateSelector = `#ContentPlaceHolder1_FileStreamClassementsGrid_EditBoxGridFileStreamClassementDate_${actualImportActionLine()}`;
    console.log("[pdfParser] Mise en surbrillance de la date pour faciliter la saisie.");
    document.querySelector(dateSelector).focus();
    document.querySelector(dateSelector).select();
}


// Récupérer la meta-ligne d'action actuelle dans la fenêtre des importations
function actualImportActionLine() {
    const ligneSelectionne = document.querySelector(".grid-selecteditem");
    if (ligneSelectionne) {
        // On cherche ContentPlaceHolder1_FileStreamClassementsGrid_LinkButtonFileStreamClassementsGridPatientNom_0 mais le 0 est variable jusqu'à 9
        let patientADefinirElement = ligneSelectionne.querySelector("[id^='ContentPlaceHolder1_FileStreamClassementsGrid_LinkButtonFileStreamClassementsGridPatientNom_']");
        if (!patientADefinirElement) {
            return null;
        }
        // de là on récupère le dernier chiffre de l'id de l'élément
        let numeroDeLigne = patientADefinirElement.id.match(/\d+$/)[0];
        return numeroDeLigne;
    } else {
        console.log("[pdfParser] Pas de ligne d'action sélectionnée.");
        return null;
    }
}



// marque les données comme déjà importées
function markDataAsImported(hashId, extractedData) {
    extractedData.alreadyImported = true;
    let extractedDataStr = JSON.stringify(extractedData);
    sessionStorage.setItem(hashId, extractedDataStr);
}


async function setExtractedDataInForm(extractedData) {
    // Récupère la ligne d'action actuelle
    const ligneAction = actualImportActionLine();

    // Sélecteurs pour les champs du formulaire
    const selectors = {
        documentDate: `#ContentPlaceHolder1_FileStreamClassementsGrid_EditBoxGridFileStreamClassementDate_${ligneAction}`,
        documentType: `#ContentPlaceHolder1_FileStreamClassementsGrid_DropDownListGridFileStreamClassementLabelClassification_${ligneAction}`,
        documentTitle: `#ContentPlaceHolder1_FileStreamClassementsGrid_EditBoxGridFileStreamClassementTitre_${ligneAction}`,
        documentAddressedTo: `#ContentPlaceHolder1_FileStreamClassementsGrid_DropDownListGridFileStreamClassementUser_${ligneAction}`,
        documentDestinationClass: `#ContentPlaceHolder1_FileStreamClassementsGrid_DropDownListGridFileStreamClassementEvenementType_${ligneAction}`,
    };

    // Récupère les éléments du DOM correspondant aux sélecteurs
    const inputs = {
        documentDate: document.querySelector(selectors.documentDate),
        documentType: document.querySelector(selectors.documentType),
        documentTitle: document.querySelector(selectors.documentTitle),
        documentAddressedTo: document.querySelector(selectors.documentAddressedTo),
        documentDestinationClass: document.querySelector(selectors.documentDestinationClass)
    };

    PdfParserAutoTitle = await getOptionPromise('PdfParserAutoTitle')
    PdfParserAutoDate = await getOptionPromise('PdfParserAutoDate')
    PdfParserAutoClassification = await getOptionPromise('PdfParserAutoClassification')

    // Données à insérer dans les champs du formulaire
    const fields = {
        documentDate: PdfParserAutoDate ? extractedData.documentDate : null,
        documentType: extractedData.documentType,
        documentTitle: PdfParserAutoTitle ? extractedData.documentTitle : null,
        documentAddressedTo: extractedData.addressedTo,
        documentDestinationClass: PdfParserAutoClassification ? extractedData.destinationClass : null
    };

    console.log('[pdfParser] INtroduction des données dans les champs : ', fields);

    // Parcourt chaque champ et met à jour la valeur si elle existe
    Object.keys(fields).forEach(key => {
        if (fields[key] && inputs[key]) {
            if (key === 'documentType') { // Cas particulier pour le champ documentType
                // Trouver l'option correspondante pour documentType
                const options = inputs[key].options;
                for (let i = 0; i < options.length; i++) {
                    if (options[i].text === fields[key]) {
                        inputs[key].value = options[i].value;
                        break;
                    }
                }
            } else {
                inputs[key].value = fields[key];
            }
            // Déclenche un événement de changement pour chaque champ mis à jour
            inputs[key].dispatchEvent(new Event('change'));
        }
    });
}

function clicPatient(extractedData) {
    let patientToClick = searchProperPatient(getPatientsList(), extractedData["nameMatches"]);
    if (!patientToClick) {
        // On va tenter le premier patient de la liste
        console.log("[pdfParser] Patient non trouvé, je vais essayer le premier de la liste s'il est seul.");
        const patientList = getPatientsList();
        if (patientList.length === 1) {
            patientToClick = getPatientsList()[0];
        } else {
            patientToClick = null;
        }
    }
    if (!patientToClick) {
        return { status: 'error', message: "Aucun patient trouvé" };
    }

    let patientToClickName = patientToClick.innerText;
    let patientSelectionneText = selectedPatientName();
    if (patientSelectionneText !== 'Patient à définir...' && patientSelectionneText !== null) {
        console.log("[pdfParser] Un patient est déjà sélectionné :", patientSelectionneText, "je vérifie si c'est le bon.", patientToClickName);
        // Vérifier que le patient sélectionné est bien celui qu'on cherche
        const normalizedSelected = normalizeString(patientSelectionneText);
        const normalizedToClick = normalizeString(patientToClickName);
        
        // Comparaison directe entre le patient sélectionné et le patient à cliquer
        const matchesExpectedPatient = normalizedSelected.includes(normalizedToClick) ||
            normalizedToClick.includes(normalizedSelected);

        if (matchesExpectedPatient) {
            console.log("[pdfParser] Le bon patient est déjà sélectionné, arrêt.");
            return { status: 'continue', message: "Le bon patient est déjà sélectionné" };
        } else {
            console.log("[pdfParser] Un patient est sélectionné mais ce n'est pas le bon, on continue");
            // Continuer pour cliquer sur le bon patient
        }
    }
    
    // Clic sur le bon patient
    let patientToClicSelector = "#" + patientToClick.id;
    // patientToClick.click(); => ne fonctionne pas à cause du CSP en milieu ISOLATED
    if (patientToClick) {
        console.log("[pdfParser] Patient à sélectionner :", patientToClickName, patientToClick);
        clicCSPLockedElement(patientToClicSelector);
        return { status: 'success', message: "Patient trouvé et cliqué" };
    } else {
        console.log("[pdfParser] Patient non trouvé");
        return { status: 'error', message: "Aucun patient trouvé" };
    }
}


// Complète les données d'extractedData avec des informations supplémentaires.
/**
 * Exemple d'objet obtenu après extraction :
 * {
 *     documentDate: "01/01/2021",
 *     dateOfBirth: "01/01/2021",
 *     nameMatches: ["DUPONT Jean", "DUPONT Jeanne"],
 *     actionLine: "0",
 *     alreadyImported: false,
 * }
 */
function completeExtractedData(extractedData, dataMatrixReturn) {
    extractedData.actionLine = actualImportActionLine();
    extractedData.alreadyImported = false;
    extractedData.failedSearches = [];
    if (dataMatrixReturn) { // Cf. parseTextDataMatrix()
        extractedData.dataMatrix = dataMatrixReturn;
        extractedData.dateOfBirth = formatDate(dataMatrixReturn.DateNaissance);
        extractedData.nameMatches = [dataMatrixReturn.Nom + dataMatrixReturn.Prenoms.split(' ')[0]];
        extractedData.nirMatches = dataMatrixReturn.INS;
    }
    // Vérifier que les dates ne sont pas identiques
    if (extractedData.documentDate === extractedData.dateOfBirth) {
        extractedData.documentDate = null;
    }
}

// Vérifie si les données d'un pdf ont déjà été extraites
function checkAlreadyExtractedData(hashId) {
    const alreadyExtractedData = JSON.parse(sessionStorage.getItem(hashId));
    if (alreadyExtractedData) {
        return true;
    } else {
        return false;
    }
}


// Renvoie la liste des patients trouvés après recherche
function getPatientsList() {
    // #ContentPlaceHolder1_FindPatientUcForm1_PatientsGrid_LinkButtonPatientGetNomPrenom_0
    const patientListSelector = "[id^='ContentPlaceHolder1_FindPatientUcForm'][id*='_PatientsGrid_LinkButtonPatientGetNomPrenom_']";
    const patientElements = document.querySelectorAll(patientListSelector);
    return patientElements;
}

function searchProperPatient(patientElements, nameMatches) {
    // Normaliser tous les noms de correspondance une seule fois
    const normalizedNameMatches = nameMatches.map(name => normalizeString(name));

    // Première passe : chercher le nom complet
    for (let i = 0; i < patientElements.length; i++) {
        let patientElement = patientElements[i];
        let normalizedPatientName = normalizeString(patientElement.innerText);

        if (normalizedNameMatches.includes(normalizedPatientName)) {
            return patientElement;
        }
    }

    // Deuxième passe : chercher chaque mot indépendamment
    for (let i = 0; i < patientElements.length; i++) {
        let patientElement = patientElements[i];
        let normalizedPatientName = normalizeString(patientElement.innerText);

        for (let j = 0; j < normalizedNameMatches.length; j++) {
            let nameParts = normalizedNameMatches[j].split(' ');
            for (let k = 0; k < nameParts.length; k++) {
                if (normalizedPatientName.includes(nameParts[k])) {
                    return patientElement;
                }
            }
        }
    }

    // Troisième passe : comparaison des parties
    for (let i = 0; i < patientElements.length; i++) {
        let patientElement = patientElements[i];
        let normalizedPatientNameParts = normalizeString(patientElement.innerText).split(' ');

        for (let j = 0; j < normalizedNameMatches.length; j++) {
            let nameParts = normalizedNameMatches[j].split(' ');
            for (let k = 0; k < nameParts.length; k++) {
                for (let l = 0; l < normalizedPatientNameParts.length; l++) {
                    if (nameParts[k].includes(normalizedPatientNameParts[l])) {
                        return patientElement;
                    }
                }
            }
        }
    }

    return false;
}

function selectedPatientName() {
    // On va rechercher si un patient est déjà sélectionné dans l'élément #ContentPlaceHolder1_FileStreamClassementsGrid_LinkButtonFileStreamClassementsGridPatientNom_1
    let idPatientSelectedBaseId = '#ContentPlaceHolder1_FileStreamClassementsGrid_LinkButtonFileStreamClassementsGridPatientNom_'
    // On ajoute le niveau de selection actuel au sélecteur
    let actionLineNumber = actualImportActionLine();
    if (!actionLineNumber) { // On est probablement dans le cas des échanges sécurisés
        return null
    }
    let idPatientSelected = idPatientSelectedBaseId + actionLineNumber;
    // On cherche son nom dans l'innerText
    let patientSelectedElement = document.querySelector(idPatientSelected);
    let patientSelectedName = patientSelectedElement.innerText;
    console.log('[pdfParser] patientSelectedName', patientSelectedName);
    return patientSelectedName;
}

/**
 * Recherche du patient dans la base de données via la date de naissance ou le NIR
 * @param {string} searchType - Type de recherche (InsSearch, DateSearch, NameSearch)
 * @param {string} data - Données à utiliser pour la recherche
 * @returns {Object} - Objet contenant le statut et un message
 * @returns {string} status - Statut de la recherche ('success', 'refresh', 'error', 'searchTypeFail')
 * @returns {string} message - Message décrivant le résultat de la recherche
 */

function lookupPatient(searchType, data) {
    if (!isValidSearchType(searchType)) {
        console.error(`[pdfParser] Type de recherche ${searchType} non disponible.`);
        return { status: 'error', message: `Type de recherche ${searchType} non disponible.` };
    }

    // On vérifie que la valeur de recherche est disponible (les comptes secretaire n'ont pas forcément la recherche par INS)
    if (!checkSearchPossibility(searchType)) {
        console.error(`[pdfParser] Type de recherche ${searchType} non disponible.`);
        return { status: 'searchTypeFail', message: `Type de recherche ${searchType} non disponible.` };
    }

    // Petite conversion de donnée : si on recherche par nom, on veut en fait une recherche par NIR tronqué (sans clé)
    if (searchType === "Nom") { data = data.substring(0, 13); }

    let dropDownResearch = document.querySelector("[id*='FindPatientUcForm'][id*='_DropDownListRechechePatient']");


    if (dropDownResearch.value !== searchType) {
        console.log(`[pdfParser] Menu de recherche réglé sur ${dropDownResearch.value} alors qu'on souhaite ${searchType} => Changement de valeur du menu déroulant de recherche vers ${searchType} + change event`);
        dropDownResearch.value = searchType;
        dropDownResearch.dispatchEvent(new Event('change'));
        return { status: 'refresh', message: 'Change Search Mode' };

    } else {
        console.log(`[pdfParser] Menu de recherche déjà réglé sur ${searchType}`);
    }

    const inputFields = {
        Naissance: document.querySelector("[id*='FindPatientUcForm'][id*='_TextBoxRecherchePatientByDate']"),
        others: document.querySelector("[id*='FindPatientUcForm'][id*='_TextBoxRecherche']")
    };

    const inputResearch = searchType === "Naissance" ? inputFields.Naissance : inputFields.others;
    if (!inputResearch) {
        console.log(`[pdfParser] Champ de recherche de ${searchType} non trouvé. Arrêt de la recherche de patient.`);
        dropDownResearch.value = "Prenom";
        dropDownResearch.dispatchEvent(new Event('change'));
        return { status: 'refresh', message: `Champ de recherche non réglé sur ${searchType} alors que l'input est pourtant présent => set vers Prenom pour forcer le rafraichissement de la page` };
    }

    console.log(`[pdfParser] Champ de recherche de ${searchType} trouvé :`, inputResearch, "il contient :", inputResearch.value, "et devrait contenir :", data);
    if (inputResearch.value === data) {
        // Les données de recherche sont déjà présentes, on peut valider la suite de la procédure
        return { status: 'success', message: 'Les données de recherche sont déjà présentes.' };
    } else {
        inputResearch.value = data;
        const searchButton = document.querySelector("[id^='ContentPlaceHolder1_FindPatientUcForm'][id$='_ButtonRecherchePatient']");
        searchButton.click();
        return { status: 'refresh', message: `searchButton clicked avec ${searchType}` };
    }
}

function isValidSearchType(searchType) {
    const searchTypes = {
        Nom: "Recherche d'une fiche patient",
        Prenom: "Recherche exacte par prénom",
        Naissance: "Recherche exacte par date de naissance",
        Covid: "Recherche des patients ayant un formulaire COVID-19",
        DCD: "Recherche des patients DCD",
        NumeroDossier: "Recherche des patients par n° de dossier",
        WithoutRecette: "Recherche des patients sans recette",
        Date: "Recherche d'une fiche patient par date",
        RdV: "Recherche d'une fiche patient par RdV",
        Vac: "Recherche des alarmes, rappels ou vaccins",
        Gro: "Recherche des grossesses en cours",
        CG42952: "Grossesse : 1ère échographie",
        CG42953: "Grossesse : Dépistage sérique de trisomie 21",
        CG42954: "Grossesse : 2ème échographie",
        CG42955: "Grossesse : 3ème échographie",
        CG42956: "Grossesse : Accouchement",
        CG42957: "Grossesse : Début",
        P4P: "Recherche des patients ayant un indicateur ROSP",
        Prioritaire: "Recherche des patients prioritaires",
        NPV: "Recherche des patients NPV",
        StatEtiquette: "Recherche des patients par étiquette",
        NoMTInCab: "Recherche des patients sans MT dans ce cabinet",
        InsSearch: "Recherche par INS"
    };

    // Vérification que searchType fait bien partie des types de recherche
    if (!searchTypes.hasOwnProperty(searchType)) {
        console.error(`Type de recherche ${searchType} non disponible.`);
        return false;
    }
    return true;
}






// Renvoie l'URL du PDF de l'iframe quand elle est chargée 
async function findPdfUrl(iframesElements) {
    let iframe = iframesElements[0];
    console.log('[pdfParser/findPdfUrl] iframe', iframe);

    if (!iframe) { // Pas certain que cette partie soit encore utile, mais je laisse dans le doute
        let base64 = document.querySelector('.attachmentContainer object[type="application/pdf"]'); //Bypass pour les pages Echanges Sécurisés sans iframe PDF
        if (!base64) {
            console.warn("[pdfParser] iframe et base64 non trouvés. Arrêt de l'extraction du pdf.");
            return null;
        }
        return base64.data;
    }


    return new Promise((resolve, reject) => {
        let intervalId = setInterval(() => {
            if (iframe.contentWindow) {
                let url = iframe.contentWindow.location.href;

                if (url !== 'about:blank' && url !== null) {
                    clearInterval(intervalId);
                    resolve(url);
                }
            } else if (iframe.src && iframe.src !== 'about:blank') {
                let url = iframe.src;
                clearInterval(intervalId);
                resolve(url);
            }
        }, 100);

        setTimeout(() => {
            clearInterval(intervalId);
            resolve(null);
        }, 5000);
    });
}

// Extraction du texte du PDF en 2 parties
async function extractTextFromPDF(pdfUrl) {
    console.log('[pdfParser] Début de l\'extraction du texte du PDF depuis', pdfUrl);
    let pdf;
    if (pdfUrl.includes('base64')) { // Pas certain que cette partie soit encore utile, mais je laisse dans le doute
        pdfUrl = pdfUrl.replace('data:application/pdf;base64,', '');
        pdfUrl = atob(pdfUrl);
        pdf = await pdfjsLib.getDocument({ data: pdfUrl }).promise;
    } else if (pdfUrl.includes('downloadAttachment')) { // Pour les échanges sécurisés dans certains cas
        console.log('[pdfParser] pdfUrl downloadAttachment détecté');
        pdf = await pdfjsLib.getDocument({
            url: pdfUrl,
            withCredentials: true, // Indispensable pour les échanges sécurisés
        }).promise;

    } else {
        pdf = await pdfjsLib.getDocument(pdfUrl).promise;
    }
    const maxPages = pdf.numPages;
    const pagePromises = [];
    for (var i = 1; i <= maxPages; i++) {
        // console.log("Extracting page" + i + "/" + maxPages);
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const annotations = await page.getAnnotations();

        const textItems = textContent.items;

        let fullText = await extractLines(textItems);

        // Extraction du contenu des champs de formulaire remplis
        annotations.forEach(annotation => {
            if (annotation.subtype === 'Widget' && annotation.fieldType === 'Tx') {
                fullText += `\n${annotation.fieldName}: ${annotation.fieldValue}`;
            }
        });

        pagePromises.push(fullText);
    }

    const allPageTexts = await Promise.all(pagePromises);
    const fullText = allPageTexts.join('\n');
    console.log(`[pdfParser] ait extrait ${allPageTexts.length} pages`);

    return fullText;
}


// Extraction des lignes du PDF car sinon le texte extrait est en un seul bloc, ce qui limite les possibilités de parse
async function extractLines(textItems) {
    var pageText = "";
    var currentLine = 0;
    // Tolérance pour détecter une nouvelle ligne (en px)
    // Facilite l'usage du script lorsqu'une OCR a été utilisée un peu de travers
    var tolerance = 4;

    for (var i = 0; i < textItems.length; i++) { // Permet de reconnaître les lignes dans le PDF
        if (Math.abs(currentLine - textItems[i].transform[5]) > tolerance) { // Si la différence est supérieure à la tolérance, on considère une nouvelle ligne
            if (currentLine != 0) {
                pageText += '\n';
            }

            currentLine = textItems[i].transform[5];
        }

        pageText += textItems[i].str;
    }
    return pageText;
}

/**
 * Extrait les données pertinentes d'un texte PDF.
 * 
 * @async
 * @param {string} fullText - Le texte complet extrait du PDF.
 * @param {string} pdfUrl - L'URL du PDF.
 * 
 * @returns {Promise<Object>} Un objet contenant les données extraites.
 * @returns {string|null} extractedData.documentDate - La date du document au format JJ/MM/AAAA.
 * @returns {string|null} extractedData.dateOfBirth - La date de naissance au format JJ/MM/AAAA.
 * @returns {string[]} extractedData.nameMatches - Les noms trouvés dans le document.
 * @returns {string|null} extractedData.documentType - Le type de document (ex: "COURRIER", "IMAGERIE").
 * @returns {string|null} extractedData.documentTitle - Le titre suggéré pour le document.
 * @returns {string[]} extractedData.nirMatches - Les numéros de sécurité sociale (NIR) trouvés.
 * 
 * @example
 * // Exemple d'objet retourné
 * {
 *   documentDate: "15/03/2025",
 *   dateOfBirth: "01/01/1980",
 *   nameMatches: ["DUPONT Jean", "DUPONT J."],
 *   documentType: "COURRIER",
 *   documentTitle: "COURRIER - Cardiologie",
 *   nirMatches: ["123456789012345"]
 * }
 */
async function extractRelevantData(fullText) {
    const regexPatterns = {
        dateRegexes: [
            /(?!06\/01\/1978)[0-9]{2}[\/\-.][0-9]{2}[\/\-.][0-9]{4}/g, // Match dates dd/mm/yyyy ou dd-mm-yyyy sauf 06/01/1978
            /([0-9]{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+([0-9]{4})/gi // Match dates comme "28 novembre 2024"
        ],
        dateOfBirthRegexes: [
            /(?:né\(e\) le|date de naissance:|date de naissance :|née le|né le)[\s\S]([0-9]{2}[\/\-.][0-9]{4})/gi // Match la date de naissance
        ],
        nameRegexes: [
            /(?:Mme|Madame|Monsieur|M\.) (.*?)(?: \(| né| - né)/gi, // Match pour les courriers, typiquement "Mr. XXX né le"
            /(?:Nom de naissance : |Nom : |Nom de naiss\.: )(.*?)(?:\n|$)/gim, // Match pour les CR d'imagerie, typiquement "Nom : XXX \n" ou "Nom : XXX"
            /(?<=(?:MME|Mme|Madame|Monsieur|MR)\s+)([A-Za-z\s]+)(?=\s|$)/gi, // Match pour les courriers, typiquement "Mme XXX", "Madame XXX", "Monsieur XXX"
            /([A-Z]+[a-z]+)(?:\s)?Né(?:e)? le/g,  // Support des deux genres "Né le" et "Née le"
            /_?Nom\s*d[e']\s*(?:usage|naissance)\s*([A-Z]+)/g, // Nom de naissance ou nom d'usage avec ou sans espace
            /Enfant ([A-Z\s]+)(?:\s|$)/g,  // Modification pour capturer plusieurs mots majuscules
            /(?:née|né)\s+([A-Z][A-Za-z]+\s+[A-Z][A-Za-z]+)(?=\s+le)/g, // Match pour les courriers, typiquement "né XXX XXX le"
            /Nometprénomdenaissance:([A-Z]+[a-z]+)/g, // Match pour les courriers, typiquement "Nometprénomdenaissance: XXX"
        ],
        documentDateRegexes: [
            /, le (\d{2}[\/\-.]\d{2}[\/\-.]\d{4})/gi // Match pour les dates dans les courriers
        ],
        /** 
         * Les NIR sont des numéros de sécurité sociale, ils sont composés de 15 chiffres
         * et commencent par 1 ou 2. Ils sont souvent écrits sans espace, mais peuvent aussi
         * dans le cadre des arrêts de travail être écrits comme ceci :
         * 1 8 8 0 1 1 2 1 2 3 4 5 6
         * NOM PRENOM
         * 8 (un chiffre)
         * 7 8 (la clé)
         */
        nirRegexes: [
            /\b[12]\d{14}\b/g, // Match pour le NIR, un nombre de 15 chiffres commençant par 1 ou 2
            /((1|2)(\s\d){12})\n[\s\S]*?\n8\n(\d \d)/gm,
            /\b[12]\d{12}\s\d{2}\b/g // Si la clé est séparée par un espace
        ]
    };

    const categoryExtractorsOptions = {
        specialite: "PdfParserAutoSpecialiteDict",
        imagerie: "PdfParserAutoImagerieDict",
        region: "PdfParserAutoRegionDict",
        lieu: "PdfParserAutoLieuDict",
        typeCR: "PdfParserAutoTypeCRDict",
        custom1: "PdfParserAutoCustom1Dict",
        custom2: "PdfParserAutoCustom2Dict",
        custom3: "PdfParserAutoCustom3Dict"
    };

    sessionStorage.setItem('logExtraction', ""); // Pour debug
    // Dates et NIR : recherche via regex pur et priorisation
    const dateMatches = await extractDates(fullText, regexPatterns.dateRegexes);
    const documentDate = await determineDocumentDate(fullText, dateMatches, regexPatterns.documentDateRegexes);
    const dateOfBirth = determineDateOfBirth(fullText, dateMatches, regexPatterns.dateOfBirthRegexes);
    const nirMatches = extractNIR(fullText, regexPatterns.nirRegexes);

    // Noms : recherche via contexte des mots avant/après et place théorique dans le document
    const nameMatches = extractNames(fullText, regexPatterns.nameRegexes);
    const addressedTo = await extractAddressedTo(fullText); // Retourne l'id du choix du dropdown

    // Catégorisation générale : recherche via contexte et heuristiques
    const destinationClass = await extractDestinationClass(fullText); // 1-consultation, 2-résultat d’examen ou 3-courrier
    const documentType = await determineDocumentType(fullText); // type de document (ex: compte rendu, ordonnance selon la liste d’import de l’utilisateur

    // Extraction en parallèle des caractéristiques basées sur les options
    const specialite = await extractCategoryFromOptions(fullText, categoryExtractorsOptions.specialite);
    const imagerie = await extractCategoryFromOptions(fullText, categoryExtractorsOptions.imagerie);
    const region = await extractCategoryFromOptions(fullText, categoryExtractorsOptions.region);
    const lieu = await extractCategoryFromOptions(fullText, categoryExtractorsOptions.lieu);
    const typeCR = await extractCategoryFromOptions(fullText, categoryExtractorsOptions.typeCR);
    const doctorName = extractDoctorName(fullText);
    const custom1 = await extractCategoryFromOptions(fullText, categoryExtractorsOptions.custom1);
    const custom2 = await extractCategoryFromOptions(fullText, categoryExtractorsOptions.custom2);
    const custom3 = await extractCategoryFromOptions(fullText, categoryExtractorsOptions.custom3);



    // ASSEMBLAGE DES DONNÉES EXTRAITES
    // =================================
    let extractedData = {
        documentDate: documentDate ? formatDate(documentDate) : null,
        dateOfBirth: dateOfBirth ? formatDate(dateOfBirth) : null,
        nameMatches: nameMatches,
        documentType: documentType,
        documentTitle: null,
        nirMatches: nirMatches,
        addressedTo: addressedTo,
        destinationClass: destinationClass,
        // Caractéristiques spécialisées
        specialite: specialite,
        imagerie: imagerie,
        region: region,
        lieu: lieu,
        typeCR: typeCR,
        doctorName: doctorName,
        custom1: custom1,
        custom2: custom2,
        custom3: custom3
    };

    // Titrage
    extractedData.documentTitle = await buildTitle(extractedData);

    const resetButtonExists = document.querySelector("#pdfParserResetButton");
    if (!resetButtonExists) {
        console.warn("[pdfParser] erreur : le bouton de réinitialisation n'existe pas");
    } else {
        console.log("[pdfParser] Le bouton de réinitialisation existe.");
        const logToShow = sessionStorage.getItem('logExtraction');
        // resetButtonExists.title += "\n\n=== Log d'extraction ===\n" + logToShow;
        addLogMessageOnMouseOver("#pdfParserResetButton", "\n\n=== Log d'extraction ===\n" + logToShow);
    }




    return extractedData;
}

function addLogMessageOnMouseOver(elementSelector, message) {
    const element = document.querySelector(elementSelector);
    if (element) {
        let leaveTimeout;

        // Créer la popup
        const popup = document.createElement('div');
        popup.id = 'pdfParserLogPopup';
        popup.innerHTML = `<pre>${message}</pre>`;
        popup.style.cssText = `
            position: fixed;
            background: #333;
            color: #fff;
            padding: 10px;
            border-radius: 5px;
            font-size: 12px;
            max-width: 80vw;
            max-height: 80vh;
            overflow: auto;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            z-index: 10000;
            display: none;
            white-space: pre-wrap;
            word-wrap: break-word;
            width: fit-content;
            height: fit-content;
        `;
        document.body.appendChild(popup);

        // Gestionnaires d'événements
        element.addEventListener('mouseenter', (e) => {
            // Annuler le timeout de disparition si il existe
            if (leaveTimeout) {
                clearTimeout(leaveTimeout);
                leaveTimeout = null;
            }

            popup.style.display = 'block';

            // Attendre que le navigateur calcule les dimensions
            requestAnimationFrame(() => {
                // Positionner la popup près de l'élément
                const rect = element.getBoundingClientRect();
                const popupRect = popup.getBoundingClientRect();

                let left = rect.left + 10;
                let top = rect.bottom + 5;

                // Calculer l'espace disponible sous l'élément
                const spaceBelow = window.innerHeight - rect.bottom;

                // Ajuster si la popup dépasse de l'écran horizontalement
                if (left + popupRect.width > window.innerWidth) {
                    left = window.innerWidth - popupRect.width - 10;
                }

                top = rect.bottom + 5;
                popup.style.maxHeight = `${spaceBelow - 40}px`; // 50px de marge
                popup.style.overflow = 'auto';

                // S'assurer que la popup reste dans les limites de l'écran
                left = Math.max(10, left);
                top = Math.max(10, top);

                popup.style.left = `${left}px`;
                popup.style.top = `${top}px`;
            });
        });

        element.addEventListener('mouseleave', () => {
            // Programmer la disparition après 1000ms
            leaveTimeout = setTimeout(() => {
                popup.style.display = 'none';
                leaveTimeout = null;
            }, 1000);
        });

        // Optionnel : annuler le timeout si on survole la popup elle-même
        popup.addEventListener('mouseenter', () => {
            if (leaveTimeout) {
                clearTimeout(leaveTimeout);
                leaveTimeout = null;
            }
        });

        popup.addEventListener('mouseleave', () => {
            leaveTimeout = setTimeout(() => {
                popup.style.display = 'none';
                leaveTimeout = null;
            }, 1000);
        });

        console.log(`[pdfParser] Popup de log ajoutée à l'élément : ${elementSelector}`);
    }
    else {
        console.warn(`[pdfParser] Élément non trouvé pour l'ajout du log : ${elementSelector}`);
    }
}

/**
 * Extrait la catégorie d'un document à partir de règles de correspondance utilisateur.
 *
 * @param {string} fullText - Le texte complet du PDF à analyser.
 * @param {string} optionSelector - Clé de l'option (dans le stockage) contenant les règles de classification au format JSON.
 * @param {string[]} possibleCats - Tableau des catégories possibles (ex : ["COURRIER", "IMAGERIE"]).
 * @param {boolean} [perfectRuleMatchingNeeded=false] - Si true, exige que toutes les catégories/règles soient strictement cohérentes avec possibleCats.
 *
 * Le format attendu pour la configuration est un tableau de tableaux :
 * [
 *   ["LABORATOIRE/BIO", ["BIOCEANE", "LABORATOIRE"]],
 *   ["Arrêt de travail", ["avis d’arrêt de travail"]],
 *   ["LABORATOIRE", ["mots-clés moins spécifiques"]],
 *   ["IMAGERIE", ["autresmots-clés moins spécifiques"]]
 * ]
 *
 * - Chaque sous-tableau contient : [nom_catégorie, [liste de mots-clés]]
 * - L’ordre du tableau définit la priorité de détection.
 * - Une même catégorie peut apparaître plusieurs fois avec des mots-clés différents.
 *
 * @returns {string|null} - La première catégorie trouvée (selon l’ordre des règles) ou null si aucune correspondance.
 */
async function extractCategoryFromOptions(fullText, optionSelector, possibleCats = null, perfectRuleMatchingNeeded = false) {
    // Dictionnaire des noms d'options pour les wildcards
    const wildcardOptionsDict = {
        'PdfParserAutoSpecialiteDict': '[specialite]',
        'PdfParserAutoImagerieDict': '[imagerie]',
        'PdfParserAutoRegionDict': '[region]',
        'PdfParserAutoLieuDict': '[lieu]',
        'PdfParserAutoTypeCRDict': '[typeCR]',
        'PdfParserAutoCategoryDict': '[category]',
        'PdfParserAutoCustom1Dict': '[custom1]',
        'PdfParserAutoCustom2Dict': '[custom2]',
        'PdfParserAutoCustom3Dict': '[custom3]',
        'PdfParserAutoDestinationClassDict': "Destination de classement"
    };
    // console.log("[pdfParser] Extraction de la catégorie à partir des options", optionSelector);
    // 1 - récupérer le tableau via getOption et le convertir en format exploitable
    // On utilise un tableau de tableaux pour permettre de parcourir les types de documents par ordre de spécificité
    // Et de mettre plusieurs fois la même clé, avec des valeurs de moins en moins exigeantes
    let categoryMatchingRules = await getOptionPromise(optionSelector);
    categoryMatchingRules = properArrayOfCategoryMatchingRules(categoryMatchingRules);
    // console.log("[pdfParser] Règles de correspondance pour l'extraction de catégorie :", categoryMatchingRules);
    if (categoryMatchingRules === false) {
        console.warn("[pdfParser] Règles de correspondance invalides pour l'extraction de catégorie.");
        dealWithInvalidRules(optionSelector);
        return null;
    }

    // 2 - Vérifier que toutes les options présentes dans categoryMatchingRules sont bien présente dans possibleCats
    // et vice-versa si une correspondance parfaite est nécessaire
    if (possibleCats && !matchingRulesAreLegit(categoryMatchingRules, possibleCats, perfectRuleMatchingNeeded)) {
        console.warn("[pdfParser] Les règles de correspondance ne correspondent pas aux catégories possibles.");
        dealWithInvalidRules(optionSelector);
        return null;
    }

    // 3 - parcourir chaque ligne de règle et confronter les mots/phrases-clés.
    // En cas de match, faire un return de la catégorie retrouvée
    return lookForMatch(fullText, categoryMatchingRules);


    function lookForMatch(fullText, categoryMatchingRules) {
        let toBeReturned = null;
        let toBeLogged = null;
        let extractionLog = sessionStorage.getItem('logExtraction') || "";
        // Normaliser le texte complet une seule fois
        const normalizedFullText = normalizeString(fullText);

        for (const [type, keywords] of categoryMatchingRules) {
            // Séparer les mots-clés d'inclusion et d'exclusion
            const inclusionKeywords = keywords.filter(keyword => !keyword.startsWith('-'));
            const exclusionKeywords = keywords.filter(keyword => keyword.startsWith('-')).map(keyword => keyword.substring(1));
            let lineNumber = null;

            for (const keyword of inclusionKeywords) {
                // Ignorer les mots-clés vides
                if (!keyword || keyword.trim() === '') {
                    continue;
                }

                // Si le keyword est *, on valide automatiquement
                if (keyword.trim() === '*') {
                    lineNumber = '*'; // Ligne arbitraire pour l'astérisque
                    if (!toBeReturned) {
                        toBeReturned = type;
                        toBeLogged = `${wildcardOptionsDict[optionSelector]} : ${type} validé par défaut car présence de "${keyword}" (wildcard match)`;
                    } else {
                        toBeLogged = `      ↳ autre correspondance non retenue pour ${type}, car présence de "${keyword}" (wildcard match)`;
                    }
                    console.log("[pdfParser]" + optionSelector + toBeLogged);
                    extractionLog += toBeLogged + "\n";
                    continue; // Passer au keyword suivant sans faire de regex
                }

                // Normaliser le mot-clé
                const normalizedKeyword = normalizeString(keyword);

                // Remplacer les espaces par \s* pour permettre les espaces optionnels
                const regex = new RegExp(normalizedKeyword.replace(/\s+/g, '\\s*'), 'i');
                const match = normalizedFullText.match(regex);

                if (match) {
                    // Vérifier les exclusions avec le texte normalisé
                    const matchIndex = match.index;
                    const matchLength = match[0].length;

                    let isExcluded = false;

                    for (const exclusionKeyword of exclusionKeywords) {
                        const normalizedExclusionKeyword = normalizeString(exclusionKeyword);
                        const contextSize = normalizedExclusionKeyword.length;

                        const contextStart = Math.max(0, matchIndex - contextSize);
                        const contextEnd = Math.min(normalizedFullText.length, matchIndex + matchLength + contextSize);
                        const contextText = normalizedFullText.substring(contextStart, contextEnd);

                        const exclusionRegex = new RegExp(normalizedExclusionKeyword.replace(/\s+/g, '\\s*'), 'i');
                        if (exclusionRegex.test(contextText)) {
                            toBeLogged = `${wildcardOptionsDict[optionSelector]} : match trouvé pour "${keyword}" mais exclu par "${exclusionKeyword}" dans le contexte`;
                            console.log("[pdfParser]" + optionSelector + toBeLogged);
                            extractionLog += toBeLogged + "\n";
                            isExcluded = true;
                            break;
                        }
                    }

                    if (!isExcluded) {
                        lineNumber = fullText.substr(0, match.index).split("\n").length;
                        if (!toBeReturned) {
                            toBeReturned = type;
                            toBeLogged = `${wildcardOptionsDict[optionSelector]} trouvé : ${type}, car présence de "${keyword}" en ligne ${lineNumber}`;
                        } else {
                            toBeLogged = `      ↳ autre correspondance non retenue pour ${type}, car présence de "${keyword}" en ligne ${lineNumber}`;
                        }
                        console.log("[pdfParser]" + optionSelector + toBeLogged);
                        extractionLog += toBeLogged + "\n";

                    }
                }
            }
        }

        if (toBeReturned) {
            sessionStorage.setItem('logExtraction', extractionLog); // Pour debug
            return toBeReturned;
        }

        // Si on arrive ici, c'est qu'aucune correspondance n'a été trouvée

        toBeLogged = `${wildcardOptionsDict[optionSelector]} : aucune correspondance trouvée`;
        console.log("[pdfParser]" + optionSelector + toBeLogged);
        extractionLog += toBeLogged + "\n";
        sessionStorage.setItem('logExtraction', extractionLog); // Pour debug
        return null;
    }


    function dealWithInvalidRules(optionSelector) {
        // la réponse à apporter va varier selon le type d’options
        const invalidRulesDictionary = {
            "PdfParserAutoCategoryDict": handleDocumentTypesConsent,
        };

        // on gère d’abord les cas de figure connus
        const invalidRuleHandler = invalidRulesDictionary[optionSelector];
        if (invalidRuleHandler) {
            invalidRuleHandler();
            return;
        }

        // on gère ensuite les cas génériques
        sendWedaNotifAllTabs({
            message: `Des règles de correspondance invalides ont été détectées pour ${optionSelector}. Merci de les vérifier dans les options de Weda-Helper.`,
            type: "undefined",
            icon: "error"
        });
    }

    /**
     * Vérifie si les règles de correspondance sont légitimes par rapport aux catégories possibles.
     * @param {Array} categoryMatchingRules - Règles de correspondance au format [[catégorie, [mots-clés]], ...]
     * @param {Array} possibleCats - Catégories possibles au format [catégorie1, catégorie2, ...]
     * @param {boolean} perfectRuleMatchingNeeded - Si true, exige une correspondance parfaite
     * @returns {boolean} - True si les règles sont valides
     */
    function matchingRulesAreLegit(categoryMatchingRules, possibleCats, perfectRuleMatchingNeeded = false) {
        // Validation des paramètres d'entrée
        if (!Array.isArray(categoryMatchingRules)) {
            console.error(`[pdfParser] categoryMatchingRules doit être un tableau ${categoryMatchingRules}`);
            return false;
        }

        if (!Array.isArray(possibleCats)) {
            console.error(`[pdfParser] possibleCats doit être un tableau ${possibleCats}`);
            return false;
        }

        // Vérifier que toutes les catégories des règles sont dans possibleCats
        const ruleCategories = categoryMatchingRules.map(rule => rule[0]);
        const uniqueRuleCategories = [...new Set(ruleCategories)];

        for (const category of uniqueRuleCategories) {
            if (!possibleCats.includes(category)) {
                console.warn(`[pdfParser] Catégorie '${category}' des règles n'est pas dans les catégories possibles`);
                return false;
            }
        }

        // Si correspondance parfaite requise, vérifier que toutes les catégories possibles sont couvertes
        if (perfectRuleMatchingNeeded) {
            for (const possibleCat of possibleCats) {
                if (!uniqueRuleCategories.includes(possibleCat)) {
                    console.warn(`[pdfParser] Catégorie possible '${possibleCat}' n'est pas couverte par les règles`);
                    return false;
                }
            }
        }

        return true;
    }
}


// Extraction du médecin à qui est adressé le document
async function extractAddressedTo(fullText) {
    // D'abord récupérer la liste des médecins accessible
    const doctorsSelect = document.querySelector('#ContentPlaceHolder1_FileStreamClassementsGrid_DropDownListGridFileStreamClassementUser_0');
    if (!doctorsSelect) {
        console.log("[pdfParser] Liste des médecins non trouvée");
        return null;
    }

    // Récupérer la liste des médecins sous forme d'un tableau d'objets avec leurs noms et IDs
    const doctors = Array.from(doctorsSelect.options).map(option => {
        // Extraction du nom et prénom du format "NOM Prénom (Dr.)"
        const fullName = option.text.trim();
        const nameParts = fullName.match(/^([A-Z\-]+)\s+([^(]+)/);

        return {
            id: option.value,
            fullName: fullName,
            lastName: nameParts ? nameParts[1].trim() : '',
            firstName: nameParts ? nameParts[2].trim() : '',
            text: option.text
        };
    });

    console.log("[pdfParser] Liste des médecins disponibles:", doctors);

    // Recherche dans le texte pour chaque médecin
    for (const doctor of doctors) {
        // Normaliser les noms du médecin
        const normalizedLastName = normalizeString(doctor.lastName);
        const normalizedFirstName = normalizeString(doctor.firstName.split('-')[0]);
        const normalizedFullText = normalizeString(fullText);

        // Créer différentes variations pour la recherche
        const patterns = [
            // Format NOM Prénom (tolère des caractères entre les deux)
            new RegExp(`${normalizedLastName}[\\s\\S]{0,5}${normalizedFirstName}`, 'i'),

            // Format Prénom NOM (tolère des caractères entre les deux)
            new RegExp(`${normalizedFirstName}[\\s\\S]{0,5}${normalizedLastName}`, 'i'),

            // Recherche seulement le nom de famille s'il est assez distinctif (>= 5 caractères)
            ...(normalizedLastName.length >= 5 ? [new RegExp(`\\b${normalizedLastName}\\b`, 'i')] : []),

            // Recherche seulement le prénom s'il est assez distinctif (>= 5 caractères)
            ...(normalizedFirstName.length >= 5 ? [new RegExp(`\\b${normalizedFirstName}\\b`, 'i')] : [])
        ];

        // Tester chaque pattern sur le texte normalisé
        for (const pattern of patterns) {
            if (pattern.test(normalizedFullText)) {
                console.log(`[pdfParser] Médecin trouvé dans le texte: ${doctor.fullName} avec le pattern ${pattern}`);
                return doctor.id;
            }
        }
    }

    console.log("[pdfParser] Aucun médecin destinataire identifié dans le texte");
    return null;
}

/**
 * Extrait la classe de destination d'un document à partir du texte complet.
 * Utilise extractCategoryFromOptions avec les règles configurées dans les options.
 * 
 * @param {string} fullText - Le texte complet du PDF à analyser.
 * @returns {Promise<string>} - L'ID de la destination détectée ('1', '2', ou '3').
 */
async function extractDestinationClass(fullText) {
    // Les trois destinations possibles 
    const destinations = {
        '1': "Consultation",
        '2': "Résultats d'examens",
        '3': "Courrier"
    };

    // Les destinations possibles avec leurs IDs
    const possibleDestinations = ['1', '2', '3'];

    try {
        // Utiliser extractCategoryFromOptions pour faire la classification
        const detectedDestination = await extractCategoryFromOptions(
            fullText,
            'PdfParserAutoDestinationClassDict',
            possibleDestinations,
            true // perfectRuleMatchingNeeded = true car nous définissons toutes les destinations
        );

        // Si aucune destination n'est détectée, privilégier "Consultation" par défaut
        const selectedDestination = detectedDestination || '1';

        console.log(`[pdfParser] Classe de destination détectée: ${destinations[selectedDestination]} (ID: ${selectedDestination})`);
        return selectedDestination;

    } catch (error) {
        console.error('[pdfParser] Erreur lors de la classification de destination:', error);

        // Retourner "Consultation" par défaut en cas d'erreur
        console.log('[pdfParser] Classe de destination par défaut: Consultation (ID: 1)');
        return '1';
    }
}


// Extraction du datamatrix des pages du PDF
async function extractDatamatrixFromPDF(pdfUrl) {
    if (!pdfUrl) { return null }
    const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
    const numPages = pdf.numPages;
    const pagesToCheck = numPages === 1 ? [1] : [1, numPages]; // Vérifie la première et la dernière page, ou juste la première si une seule page

    const pages = [];
    for (const pageNum of pagesToCheck) {
        const page = await pdf.getPage(pageNum);
        pages.push(page);
    }

    const pageData = await extractDatamatrixFromPage(pages);
    return pageData || null;
}

async function renderPagesToCanvases(PDFpages) {
    const canvases = [];

    for (const PDFpage of PDFpages) {
        const viewport = PDFpage.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await PDFpage.render({ canvasContext: context, viewport: viewport }).promise;
        canvases.push(canvas);
    }

    return canvases;
}

function generateBinaryBitmap(canvas) {
    const luminanceSource = new ZXing.HTMLCanvasElementLuminanceSource(canvas, false);
    const hybridBinarizer = new ZXing.HybridBinarizer(luminanceSource);
    return new ZXing.BinaryBitmap(hybridBinarizer);
}

function generateHints() {
    const hints = new Map();
    // const formats = [ZXing.BarcodeFormat.QR_CODE, ZXing.BarcodeFormat.DATA_MATRIX/*, ...*/]; // on pourrait faire évoluer les types nécessaires
    const formats = [ZXing.BarcodeFormat.DATA_MATRIX/*, ...*/]; // Pour l'instant uniquement les datamatrix
    hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);
    return hints;
}

class DatamatrixHeatMap {
    constructor() {
        this.storageKey = 'datamatrix_heatmap';
        this.heatMap = {};
    }

    async load() {
        return new Promise((resolve) => {
            chrome.storage.local.get(this.storageKey, (result) => {
                this.heatMap = result[this.storageKey] || {};
                resolve();
            });
        });
    }

    async save() {
        return new Promise((resolve) => {
            chrome.storage.local.set({ [this.storageKey]: this.heatMap }, resolve);
        });
    }

    async addHit(coordinates) {
        if (!this.heatMap[coordinates]) {
            this.heatMap[coordinates] = 0;
        }
        this.heatMap[coordinates]++;
        await this.save();
    }

    getHotSpots() {
        return Object.entries(this.heatMap)
            .sort(([, a], [, b]) => b - a)
            .map(([coords]) => coords);
    }
}

function createSubCanvas(canvas, x, y, squareSize) {
    const subCanvas = document.createElement('canvas');
    subCanvas.width = squareSize;
    subCanvas.height = squareSize;
    const subContext = subCanvas.getContext('2d');
    subContext.drawImage(canvas, x, y, squareSize, squareSize, 0, 0, squareSize, squareSize);
    return subCanvas;
}

async function extractDatamatrixFromPage(PDFpages) {
    const heatMap = new DatamatrixHeatMap();
    await heatMap.load();
    const canvases = await renderPagesToCanvases(PDFpages);
    const hints = generateHints();
    const reader = new ZXing.MultiFormatReader();
    let passCount = 0;
    const uniqueId = Date.now();
    console.time(`[pdfParser] Datamatrix Extraction Time ${uniqueId}`);

    const decodeSubCanvas = async (subCanvas, coordinates, source = 'scan') => {
        passCount++;
        const binaryBitmap = generateBinaryBitmap(subCanvas);
        try {
            const result = reader.decode(binaryBitmap, hints);
            if (result) {
                console.log(`[pdfParser] Datamatrix trouvé: ${coordinates}`);
                await heatMap.addHit(coordinates);
                console.timeEnd(`[pdfParser] Datamatrix Extraction Time ${uniqueId}`);
                console.log(`[pdfParser] Trouvé après ${passCount} passes (source: ${source})`);
                const dataUrl = visualizeBinaryBitmap(binaryBitmap);
                console.log(`[pdfParser] Datamatrix trouvé: ${dataUrl}`);
                return { ...formatDecodeResult(result), source };
            }
        } catch (error) { /* Ignorer les erreurs */ }
        return null;
    };

    // Test des zones chaudes
    for (const coordinates of heatMap.getHotSpots()) {
        console.log(`[pdfParser] Test de la zone chaude: ${coordinates}`);
        const [canvasIndex, x, y, squareSize] = coordinates.split(',').map(Number);
        if (canvasIndex >= canvases.length) continue;

        const result = await decodeSubCanvas(
            createSubCanvas(canvases[canvasIndex], x, y, squareSize),
            coordinates,
            'heatmap'
        );
        if (result) { return result }
    }

    // Balayage classique
    for (const [coordinates, subCanvas] of generateSubCanvases(canvases)) {
        const result = await decodeSubCanvas(subCanvas, coordinates, 'scan');
        if (result) return result;
    }

    console.timeEnd(`[pdfParser] Datamatrix Extraction Time ${uniqueId}`);
    console.log(`[pdfParser] Nombre de passes: ${passCount}`);
    console.warn('[pdfParser] No datamatrix found');
    return null;
}

function* generateSubCanvases(canvases) {
    // Ces paramètres effectuent un balayage d'un pdf standard en plusieurs passes
    const initialSquareSize = 360; // Taille initiale plus grande
    const reductionSize = 80; // Réduction de la taille à chaque passe
    const minSquareSize = 280; // Taille minimale des carrés
    let offset = 0;

    for (let canvasIndex = 0; canvasIndex < canvases.length; canvasIndex++) {
        const canvas = canvases[canvasIndex];
        // J'ai neutralisé la réduction de taille pour des questions de performances
        // for (let squareSize = initialSquareSize; squareSize >= minSquareSize; squareSize -= reductionSize) {
        // offset = Math.floor(squareSize / 2);
        offset = Math.floor(initialSquareSize / 2);
        let squareSize = initialSquareSize;
        for (let y = 0; y < canvas.height; y += offset) {
            for (let x = 0; x < canvas.width; x += offset) {
                const coordinates = `${canvasIndex},${x},${y},${squareSize}`;
                // console.log(`[pdfParser] Génération de la sous-canvas: ${coordinates}`);
                yield [coordinates, createSubCanvas(canvas, x, y, squareSize)];
            }
        }
        // }
    }
}

function displaySubCanvases(subCanvases) {
    const newWindow = window.open('', '_blank');
    newWindow.document.write('<html><head><title>SubCanvases</title></head><body>');
    newWindow.document.write('<h1>SubCanvases</h1>');

    for (const [coordinates, subCanvas] of Object.entries(subCanvases)) {
        const binaryBitmap = generateBinaryBitmap(subCanvas);
        const dataURL = visualizeBinaryBitmap(binaryBitmap);
        newWindow.document.write(`<div style="display:inline-block; margin:10px;">`);
        newWindow.document.write(`<p>${coordinates}</p>`);
        newWindow.document.write(`<img src="${dataURL}" alt="SubCanvas at ${coordinates}"/>`);
        newWindow.document.write(`</div>`);
    }

    newWindow.document.write('</body></html>');
    newWindow.document.close();
}


function parseTextDataMatrix(text) {
    const result = {};

    // Regex pour extraire les informations
    const insRegex = /S1(\d{15})/;
    const oidRegex = /S2([\d.]+)/;
    const prenomsRegex = /S3([A-Z\s]+)/;
    const nomRegex = /S4([A-Z]+)/;
    const sexeRegex = /S5([A-Z])/;
    const dateNaissanceRegex = /S6(\d{2}-\d{2}-\d{4})/;
    const codeLieuNaissanceRegex = /S7(\d{5})/;

    // Extraction des informations
    const insMatch = text.match(insRegex);
    const oidMatch = text.match(oidRegex);
    const prenomsMatch = text.match(prenomsRegex);
    const nomMatch = text.match(nomRegex);
    const sexeMatch = text.match(sexeRegex);
    const dateNaissanceMatch = text.match(dateNaissanceRegex);
    const codeLieuNaissanceMatch = text.match(codeLieuNaissanceRegex);

    if (insMatch) result.INS = insMatch[1];
    if (oidMatch) result.OID = oidMatch[1];
    if (prenomsMatch) result.Prenoms = prenomsMatch[1].trim();
    if (nomMatch) result.Nom = nomMatch[1];
    if (sexeMatch) result.Sexe = sexeMatch[1];
    if (dateNaissanceMatch) result.DateNaissance = dateNaissanceMatch[1];
    if (codeLieuNaissanceMatch) result.CodeLieuNaissance = codeLieuNaissanceMatch[1];

    return result;
}


/**
 * Formate le résultat décodé du datamatrix et renvoie les données pertinentes dans un format plus lisible.
 * 
 * Specifications techniques issues de https://industriels.esante.gouv.fr/sites/default/files/media/document/ANS_Datamatrix_INS_v2.2.pdf (fev. 2022 p6-9)
 * IS - Matricule INS.
 *      Taille Min.: 15, Taille Max.: 15, Type: Alphanumérique
 * S1 - OID.
 *      Taille Min.: 19, Taille Max.: 20, Type: Alphanumérique
 * S2 - Liste des prénoms de naissance.
 *      Taille Min.: 1, Taille Max.: 100, Type: Alphanumérique
 * S3 - Nom de naissance.
 *      Taille Min.: 1, Taille Max.: 100, Type: Alphanumérique
 * S4 - Sexe.
 *      Taille Min.: 1, Taille Max.: 1, Type: Alphanumérique, Format: M ou F
 * S5 - Date de naissance.
 *      Taille Min.: 10, Taille Max.: 10, Type: Alphanumérique, Format: JJ-MM-AAAA
 * S7 - Code lieu de naissance.
 *      Taille Min.: 5, Taille Max.: 5, Type: Alphanumérique
 */
function formatDecodeResult(result) {
    // Split the text into relevant parts
    // Exemple : "ISO010000000000000000000000S1123456789012345S21.2.250.1.213.1.4.8S3JOHN DOES4SMITHS5MS601-01-1990S799999"
    const text = result.getText();
    const parsedText = parseTextDataMatrix(text);
    // console.log('[pdfParser] parsedText', parsedText);

    // Convertir la date de naissance en objet Date si elle est présente
    if (parsedText.DateNaissance) {
        const dateParts = parsedText.DateNaissance.split('-');
        if (dateParts.length === 3) {
            parsedText.DateNaissance = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
        } else {
            parsedText.DateNaissance = null;
        }
    }
    return parsedText;
}

function visualizeBinaryBitmap(binaryBitmap) {
    const canvasForBitmap = document.createElement('canvas');
    canvasForBitmap.width = binaryBitmap.getWidth();
    canvasForBitmap.height = binaryBitmap.getHeight();
    const contextForBitmap = canvasForBitmap.getContext('2d');
    const imageData = contextForBitmap.createImageData(canvasForBitmap.width, canvasForBitmap.height);
    const blackMatrix = binaryBitmap.getBlackMatrix();
    for (let y = 0; y < canvasForBitmap.height; y++) {
        for (let x = 0; x < canvasForBitmap.width; x++) {
            const offset = (y * canvasForBitmap.width + x) * 4;
            const pixelValue = blackMatrix.get(x, y) ? 0 : 255;
            imageData.data[offset] = pixelValue; // R
            imageData.data[offset + 1] = pixelValue; // G
            imageData.data[offset + 2] = pixelValue; // B
            imageData.data[offset + 3] = 255; // A
        }
    }
    contextForBitmap.putImageData(imageData, 0, 0);

    const dataUrl = canvasForBitmap.toDataURL();
    return dataUrl;
}

async function determineDocumentType(fullText) {
    // Vérifier que tous les types de documents sont bien définis
    const possibleDocumentTypes = initDocumentTypes();

    // Si possibleDocumentTypes est undefined (cas des échanges sécurisés)
    // on retourne null pour éviter l'erreur
    if (!possibleDocumentTypes) {
        console.error('[pdfParser] Liste des types de documents non disponible');
        return null;
    }

    return extractCategoryFromOptions(fullText, 'PdfParserAutoCategoryDict', possibleDocumentTypes, true);
}

// Fonction pour initialiser les catégories possibles de classification
function initDocumentTypes() {
    // on va d'abord sélectionner le menu contenant les catégories de classification
    let dropDownCats = document.querySelector("#ContentPlaceHolder1_FileStreamClassementsGrid_DropDownListGridFileStreamClassementLabelClassification_0");
    // Si l'élément n'existe pas, on est probablement dans les échanges sécurisés donc on va essayer de le trouver ailleurs
    if (!dropDownCats) {
        dropDownCats = document.querySelector("select[title='Attribuer une classification au document']");
        console.log('[pdfParser] dropDownCats ES', dropDownCats);
    }
    if (!dropDownCats) {
        console.warn('[pdfParser] Impossible de trouver le menu déroulant des catégories de classification.');
        // alert('[pdfParser] Pour initialiser les catégories, vous devez avoir au moins un document en attente de classification.');
        return;
    }
    const options = dropDownCats.options;

    // Créer un tableau pour stocker les catégories (simple tableau de chaînes)
    const categories = [];

    // Parcourir les options et ajouter les catégories au tableau
    for (let i = 0; i < options.length; i++) {
        const option = options[i];
        if (option.value !== "0") { // Ignorer l'option par défaut
            categories.push(option.text); // Ajouter seulement le nom de la catégorie
        }
    }

    console.log('[pdfParser] Catégories possibles de classification:', categories);
    return categories;
}

// Stockage des différentes catégories de classification dans le chrome local storage
function storeDocumentTypes(categories) {
    getOption('PdfParserAutoCategoryDict', (PdfParserAutoCategoryDict) => {
        console.log('[pdfParser] Catégories de classification existantes:', PdfParserAutoCategoryDict);
        let existingCategories = PdfParserAutoCategoryDict ? JSON.parse(PdfParserAutoCategoryDict) : [];

        // Transformer les catégories simples en format [catégorie, []] si nécessaire
        const formattedCategories = categories.map(category => {
            // Si c'est déjà un tableau avec le bon format, le garder tel quel
            if (Array.isArray(category) && category.length === 2 && Array.isArray(category[1])) {
                return category;
            }
            // Sinon, créer le format attendu avec un tableau vide de mots-clés
            return [category, []];
        });

        // Ajouter les nouvelles catégories
        formattedCategories.forEach(category => {
            if (!existingCategories.some(existingCategory => existingCategory[0] === category[0])) {
                existingCategories.push(category);
            }
        });

        // Supprimer les catégories qui ne sont pas dans la variable
        existingCategories = existingCategories.filter(existingCategory =>
            formattedCategories.some(category => category[0] === existingCategory[0])
        );

        const updatedCategories = JSON.stringify(existingCategories);

        chrome.storage.local.set({ 'PdfParserAutoCategoryDict': updatedCategories }, function () {
            console.log('[pdfParser] Catégories de classification mises à jour:', updatedCategories);
            // Contrôle de ce qui a été stocké
            chrome.storage.local.get('PdfParserAutoCategoryDict', function (result) {
                console.log('[pdfParser] Catégories de classification stockées:', result.PdfParserAutoCategoryDict);
            });
        });
    });
}

// gestion du consentement de l'utilisateur pour l'initialisation des catégories de classification
function handleDocumentTypesConsent() {
    if (confirm("Initialiser les catégories de classification ? Pensez ensuite à compléter les mots-clés dans les options de l'extension.")) {
        const categories = initDocumentTypes();
        console.log('[pdfParser] Catégories de classification initialisées:', categories);
        storeDocumentTypes(categories);
    }
}

// Ajout d'un bouton à côté de #ContentPlaceHolder1_ButtonExit pour initialiser les catégories de classification
function addDocumentTypesButton() {
    console.log('[pdfParser] Ajout du bouton pour initialiser les catégories de classification');
    const exitButton = document.querySelector("#ContentPlaceHolder1_ButtonExit");
    const initButton = document.createElement('button');

    // Style du bouton
    initButton.style.padding = '5px';
    initButton.style.border = 'none';
    initButton.style.background = 'none';
    initButton.style.cursor = 'pointer';
    initButton.style.position = 'relative';

    // Ajouter l'icône d'engrenage
    const icon = document.createElement('span');
    icon.textContent = '⚙️';
    initButton.appendChild(icon);

    // Ajouter le titre pour afficher le texte au survol
    initButton.title = 'Initialiser les catégories de classification. Cette action est nécessaire une seule fois à la première utilisation puis si vous modifiez les catégories.';

    initButton.onclick = handleDocumentTypesConsent;
    exitButton.parentNode.insertBefore(initButton, exitButton);
}




async function buildTitle(caracteristics) {
    // Récupérer le format de titre depuis les options et le formater
    let titleFormat = await getOptionPromise('PdfParserAutoTitleFormat');
    titleFormat = properArrayOfCategoryMatchingRules(titleFormat);


    // Chercher le format correspondant au type de document
    let selectedFormat = null;

    // D'abord chercher une correspondance exacte avec le type de document
    for (const [category, format] of titleFormat) {
        if (category === caracteristics.documentType) {
            selectedFormat = format;
            break;
        }
    }

    // Si pas trouvé, chercher un format générique (*)
    if (!selectedFormat) {
        for (const [category, format] of titleFormat) {
            if (category === '*') {
                selectedFormat = format;
                break;
            }
        }
    }

    // Si toujours pas trouvé, envoyer une erreur à l’utilisateur
    if (!selectedFormat) {
        console.error('[pdfParser] Aucun format de titre trouvé pour le type de document:', caracteristics.documentType);
        sendWedaNotifAllTabs({
            message: 'Aucun format de titre trouvé pour le type de document: ' + caracteristics.documentType + ', vous devez définir au moins une ligne * dans les options de weda-helper.',
            icon: 'error',
            type: 'undefined'
        });
        return "";
    }

    // Remplacer les variables dans le format
    let documentTitle = selectedFormat[0];
    console.log('[pdfParser] Format de titre sélectionné:', documentTitle);

    // Variables disponibles avec leurs valeurs
    const variables = {
        '[specialite]': caracteristics.specialite || '',
        '[imagerie]': caracteristics.imagerie || '',
        '[region]': caracteristics.region || '',
        '[lieu]': caracteristics.lieu || '',
        '[typeCR]': caracteristics.typeCR || '',
        '[doctorName]': caracteristics.doctorName || '',
        '[category]': caracteristics.documentType || '',
        '[custom1]': caracteristics.custom1 || '',
        '[custom2]': caracteristics.custom2 || '',
        '[custom3]': caracteristics.custom3 || '',
    };

    // Remplacer chaque variable par sa valeur
    for (const [variable, value] of Object.entries(variables)) {
        documentTitle = documentTitle.replace(new RegExp(escapeRegExp(variable), 'g'), value);
    }

    // Nettoyer le titre : supprimer les espaces multiples et les séparateurs en trop
    documentTitle = cleanTitle(documentTitle);

    console.log('[pdfParser] Titre du document déterminé:', documentTitle, "caractéristiques:", caracteristics);

    return documentTitle;
}

/**
 * Échappe les caractères spéciaux pour utilisation dans une RegExp
 * @param {string} string - La chaîne à échapper
 * @returns {string} - La chaîne échappée
 */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Nettoie le titre en supprimant les espaces multiples, les séparateurs orphelins, etc.
 * @param {string} title - Le titre à nettoyer
 * @returns {string} - Le titre nettoyé
 */
function cleanTitle(title) {
    return title
        // Supprimer les espaces multiples
        .replace(/\s+/g, ' ')
        // Supprimer les séparateurs orphelins au début ou à la fin
        .replace(/^[\s\-–—:,]+|[\s\-–—:,]+$/g, '')
        // Supprimer les séparateurs multiples
        .replace(/[\s]*[\-–—:,][\s]*[\-–—:,]+[\s]*/g, ' - ')
        // Supprimer les parenthèses vides
        .replace(/\(\s*\)/g, '')
        // Nettoyer les espaces autour des parenthèses
        .replace(/\s+\(/g, ' (')
        .replace(/\(\s+/g, '(')
        .replace(/\s+\)/g, ')')
        // Supprimer les espaces en début et fin
        .trim();
}

function extractDoctorName(fullText) {
    // Diviser le texte en lignes pour analyser ligne par ligne
    const normalizedFullText = normalizeString(fullText);
    const lines = normalizedFullText.split('\n');
    const originalLines = fullText.split('\n'); // Garder les lignes originales pour préserver la casse


    // Patterns simplifiés pour les noms de médecins, sans distinction de casse
    const doctorPatterns = [
        // Format "Dr" ou "Docteur" suivi de 1-4 mots (pour nom/prénom potentiellement composés)
        // Détail de la regex :
        // (?:dr\.?|docteur|professeur|pr\.?) - Groupe non-capturant pour "Dr" (avec point optionnel), "Docteur", "Professeur" ou "Pr" (avec point optionnel)
        // \s+ - Un ou plusieurs espaces blancs
        // ( - Début du groupe de capture principal
        //   (?:[A-Z]\.?\s*)* - Zéro ou plusieurs initiales : lettre majuscule, point optionnel, espaces optionnels (ex: "B. " ou "A.C. ")
        //   [A-ZÀ-ÿ] - Première lettre du nom principal (majuscule, avec accents français)
        //   [A-Za-zÀ-ÿ\-]+ - Reste du nom principal (lettres avec accents et traits d'union, ex: "Anne-Claire")
        //   (?:\s+[A-ZÀ-ÿ][A-Za-zÀ-ÿ\-]+)* - Zéro ou plusieurs noms/prénoms supplémentaires (même format)
        // ) - Fin du groupe de capture
        // /i - Flag insensible à la casse
        //
        // Exemples de correspondances :
        // "Dr. B. AUBERT" → "B. AUBERT"
        // "Professeur Anne-Claire Vançon" → "Anne-Claire Vançon"
        // "Pr François Müller" → "François Müller"
        /((?:dr\.?|docteur|professeur|pr\.?)\s+(?:[A-Z]\.?\s*)*[A-ZÀ-ÿ][A-Za-zÀ-ÿ\-]+(?:\s+[A-ZÀ-ÿ][A-Za-zÀ-ÿ\-]+)*)/i
    ];

    // Parcourir toutes les lignes
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        const originalLine = originalLines[i]; // Ligne originale avec la casse préservée

        if (isAnAddress(line)) continue; // Passer à la ligne suivante si c'est une adresse

        // console.log(`[pdfParser] Analyse de la ligne ${i}:`, line);

        for (const pattern of doctorPatterns) {
            const match = line.match(pattern);
            const originalMatch = originalLine.match(pattern); // Chercher aussi dans la ligne originale
            if (match && match[1] && originalMatch && originalMatch[1]) {
                const vicinityCheckNumber = 4;
                // Vérifier s'il y a une autre occurrence dans les x lignes précédentes et suivantes
                let hasOtherOccurrence = false;

                // Vérifier les x lignes précédentes
                for (let j = Math.max(0, i - vicinityCheckNumber); j < i; j++) {
                    const prevLine = lines[j];
                    if (isAnAddress(prevLine)) continue; // Passer à la ligne suivante si c'est une adresse
                    for (const checkPattern of doctorPatterns) {
                        if (checkPattern.test(prevLine)) {
                            hasOtherOccurrence = true;
                            break;
                        }
                    }
                    if (hasOtherOccurrence) {
                        // console.log(`[pdfParser] Autre occurrence trouvée dans les lignes précédentes : ${prevLine}, ligne ${j}`);
                    }
                }

                // Vérifier les x lignes suivantes si pas encore trouvé d'occurrence
                if (!hasOtherOccurrence) {
                    for (let j = i + 1; j <= i + vicinityCheckNumber && j < lines.length; j++) {
                        const nextLine = lines[j];
                        if (isAnAddress(nextLine)) continue; // Passer à la ligne suivante si c'est une adresse
                        for (const checkPattern of doctorPatterns) {
                            if (checkPattern.test(nextLine)) {
                                hasOtherOccurrence = true;
                                break;
                            }
                        }
                        if (hasOtherOccurrence) {
                            //console.log(`[pdfParser] Autre occurrence trouvée dans les lignes suivantes : ${nextLine}, ligne ${j}`);
                        }
                    }
                }

                // Si pas d'autre occurrence trouvée dans les x lignes précédentes ET suivantes, retourner ce nom
                if (!hasOtherOccurrence) {
                    console.log(`[pdfParser] Nom de médecin trouvé: ${originalMatch[1].trim()} dans la ligne ${i}`);
                    return originalMatch[1].trim(); // Utiliser la version originale avec la casse préservée
                }
            }
        }
    }

    return null;



    function isAnAddress(line) {
        // vérifier qu’il ne s’agisse pas non plus d’une rue, avenue etc
        const streetPatterns = [
            /\b(rue|avenue|boulevard|impasse|chemin|place|cedex)\b/i
        ];

        for (const streetPattern of streetPatterns) {
            if (streetPattern.test(line)) {
                hasOtherOccurrence = true;
                // console.log(`[pdfParser] cette ligne semble être une adresse : ${line}`);
                return true;
            }
        }

        return false;
    }
}

// Extraction des dates du texte
async function extractDates(fullText, dateRegexes) {
    let matches = [];
    const today = new Date();

    for (const regex of dateRegexes) {
        const dateStrings = fullText.match(regex) || [];
        const parsedDates = await Promise.all(dateStrings.map(async dateString => {
            const date = await parseDate(dateString);
            return date <= today ? date : null;
        }));
        matches = matches.concat(parsedDates.filter(date => date !== null));
    }

    return matches;
}

// Fonction auxiliaire pour chercher directement la date dans le texte
function findDateInText(fullText, dateRegexes) {
    for (const regex of dateRegexes) {
        const matches = fullText.matchAll(regex);
        for (const match of matches) {
            if (match[1]) {
                return parseDate(match[1]); // On récupère le groupe du Regex
            }
        }
    }
    return null;
}

// Détermination de la date du document
async function determineDocumentDate(fullText, dateMatches, documentDateRegexes) {
    let documentDate = null;
    // On cherche la date la plus récente, ce qui correspond souvent à la date du document
    for (const date of dateMatches) {
        if (!documentDate || documentDate < date) {
            documentDate = date;
        }
    }
    // On peut aussi chercher directement la date du document
    const directDate = findDateInText(fullText, documentDateRegexes);
    if (directDate) {
        documentDate = directDate;
    }

    return documentDate;
}

// Détermination de la date de naissance
function determineDateOfBirth(fullText, dateMatches, dateOfBirthRegexes) {
    let dateOfBirth = null;
    // Recherche prioritaire dans .messageClassement s'il existe
    const messageClassementElement = document.querySelectorAll('.messageClassement');
    messageClassementElement.forEach((element) => {
        // On ne prend que si le innerText commence par "Patient :"
        if (!element.innerText.startsWith('Patient :')) {
            return;
        }
        console.log('[pdfParser] Recherche de la date de naissance dans', element);
        // On cherche un élément au format 01/01/2000
        const dateRegex = /\d{1,2}\/\d{1,2}\/\d{4}/; // Format dd/mm/yyyy
        const dateMatch = element.innerText.match(dateRegex);
        if (dateMatch) {
            console.log('[pdfParser] Date de naissance trouvée dans .messageClassement:', dateMatch);
            return dateMatch;
        }
    });
    // Si pas de date trouvée dans .messageClassement, on continue avec les dates extraites
    // On cherche la date la plus ancienne, ce qui correspond souvent à la date de naissance
    for (const date of dateMatches) {
        if (!dateOfBirth || dateOfBirth > date) {
            dateOfBirth = date;
        }
    }
    // Mais on peut aussi chercher directement la date de naissance
    const directDate = findDateInText(fullText, dateOfBirthRegexes);
    if (directDate) {
        dateOfBirth = directDate;
    }

    return dateOfBirth;
}

// Extraction du NIR du texte
function extractNIR(fullText, nirRegexes) {
    function flattenNIR(result) {
        // Vérifie si result est bien composé d'au moins 5 éléments
        if (result.length < 5) {
            return "";
        }
        const nir = result[1].replace(/\s+/g, ''); // Supprimer les espaces du NIR
        const cle = result[4].replace(/\s+/g, ''); // Supprimer les espaces de la clé
        return nir + cle;
    }
    // console.log('[pdfParser] extractNIR', nirRegexes);
    let matches = [];
    let result = [];
    for (const regex of nirRegexes) {
        result = regex.exec(fullText);
        if (result) {
            // console.log('[pdfParser] NIR result', result, "de longueur", result.length);
            // Le nir a été trouvé d'un bloc
            if (result.length === 1) {
                // console.log('[pdfParser] NIR matches une seule entrée', matches);
                matches = matches.concat(fullText.match(regex) || []);
            } else { // Le nir a été trouvé en plusieurs blocs dans un arrêt de travail
                matches = matches.concat(flattenNIR(result));
            }
        }
    }
    console.log('[pdfParser] NIR matches', matches);
    return matches;
}

// Extraction des noms du texte
function extractNames(fullText, nameRegexes) {
    const nameMatches = [];

    // 1. Recherche prioritaire dans l'élément .messageClassement s'il existe
    const messageClassementElement = document.querySelectorAll('.messageClassement');
    messageClassementElement.forEach((element) => {
        console.log('[pdfParser] Recherche du nom du patient dans', element);
        // On ne prend que si le innerText commence par "Patient :"
        if (!element.innerText.startsWith('Patient :')) {
            return;
        }
        // On retire 'Patient :' et on ne garde que le texte qu'on envoie dans fullText
        let patientText = element.innerText.replace('Patient :', '').trim();
        // On retire une éventuelle date à la fin
        const dateRegex = /\d{1,2}\/\d{1,2}\/\d{4}$/; // Format dd/mm/yyyy
        const dateMatch = patientText.match(dateRegex);
        if (dateMatch) {
            patientText = patientText.replace(dateRegex, '').trim();
        }
        console.log('[pdfParser] patientText', patientText);
        nameMatches.push(patientText);
        return nameMatches;
    });

    // 2. Si aucun nom n'est trouvé dans .messageClassement, procéder avec la méthode habituelle
    for (const regex of nameRegexes) {
        let nameMatchesIterator = fullText.matchAll(regex);
        for (const match of nameMatchesIterator) {
            nameMatches.push(match[1]);
        }
    }

    return nameMatches;
}

// Fonction modifiée pour analyser les dates avec mois en toutes lettres
async function parseDate(dateString) {
    // Mapping des noms de mois en français vers leurs numéros
    const moisEnFrancais = {
        'janvier': 1, 'février': 2, 'mars': 3, 'avril': 4, 'mai': 5, 'juin': 6,
        'juillet': 7, 'août': 8, 'septembre': 9, 'octobre': 10, 'novembre': 11, 'décembre': 12
    };

    // Détecter si c'est une date avec le mois en toutes lettres
    const dateTextuelle = /([0-9]{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+([0-9]{4})/i.exec(dateString);
    let rechercheDateAlphabetique = await getOptionPromise('PdfParserDateAlphabetique');
    if (dateTextuelle && rechercheDateAlphabetique) {
        const jour = parseInt(dateTextuelle[1], 10);
        const mois = moisEnFrancais[dateTextuelle[2].toLowerCase()];
        const annee = parseInt(dateTextuelle[3], 10);

        // Vérification des plages valides
        if (jour < 1 || jour > 31 || !mois || annee < 1900 || annee > 9999) {
            return null;
        }

        const date = new Date(annee, mois - 1, jour);

        // Vérification que la date est valide
        if (date.getDate() !== jour || date.getMonth() !== mois - 1 || date.getFullYear() !== annee) {
            return null;
        }

        const minDate = new Date(1900, 0, 1);
        const today = new Date();

        if (date < minDate || date > today) {
            return null;
        }

        return date;
    } else {
        // Format standard dd/mm/yyyy ou dd-mm-yyyy
        const parts = dateString.split(/[\/\-.]/);
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);

        // Vérification des plages valides pour jour, mois et année
        if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 9999) {
            return null; // Retourne null pour une date invalide
        }

        const date = new Date(year, month - 1, day);

        // Vérification que la date est valide (par exemple, 30 février n'existe pas)
        if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
            return null; // Retourne null pour une date invalide
        }

        const minDate = new Date(1900, 0, 1); // 1er janvier 1900
        const today = new Date();

        if (date < minDate || date > today) {
            return null; // Retourne null si la date n'est pas dans la plage valide
        }

        return date;
    }
}

function formatDate(date) {
    // Vérifier si date est bien un objet Date
    if (!(date instanceof Date) || isNaN(date)) {
        console.warn('[pdfParser] formatDate a reçu une valeur non valide:', date);
        return null;
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Fonction de hachage personnalisée pour générer un identifiant unique à partir du texte du PDF
// Assez basique, mais largement suffisant pour nos besoins
async function pdfBlob(urlPDF) {
    const response = await fetch(urlPDF);
    const blob = await response.blob();
    return blob;
}

async function customHash(str, urlPDF) {
    // console.time('customHash'); // Démarrer le chronomètre

    if (str.length < 10) {
        str = await pdfBlob(urlPDF); // Attendre la promesse
        console.log('[pdfParser] je demande un hash basé sur le blob du pdf');
        // ça prend environs 20ms pour un pdf de 300ko
    }

    const FNV_PRIME = 0x01000193;
    const FNV_OFFSET_BASIS = 0x811c9dc5;

    let hash = FNV_OFFSET_BASIS;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = (hash * FNV_PRIME) >>> 0; // Convertir en entier non signé 32 bits
    }

    // console.timeEnd('customHash'); // Arrêter le chronomètre et afficher le temps écoulé
    // console.log('[pdfParser] hash', hash.toString(16)); // Afficher le hash en hexadécimal
    return hash.toString(16); // Retourner en chaîne hexadécimale
}



function properArrayOfCategoryMatchingRules(rawOptionOutput) {
    let jsonOptionOutput = rawOptionOutput;
    // normalement le raw est au format json
    if (typeof rawOptionOutput === "string") {
        try {
            jsonOptionOutput = JSON.parse(rawOptionOutput);
        } catch (error) {
            console.error("[pdfParser] Erreur lors de l'analyse du JSON pour les règles de correspondance :", rawOptionOutput, error);
            return false;
        }
    }

    // si le tableau est vide, on renvoie un tableau vide
    if ((Array.isArray(jsonOptionOutput) && jsonOptionOutput.length === 0) || !jsonOptionOutput) {
        return [];
    }

    // On s'assure que le format est un tableau de tableaux
    if (!Array.isArray(jsonOptionOutput)) {
        console.warn("[pdfParser] Format inattendu pour les règles de correspondance, attendu un tableau et j’ai reçu :", jsonOptionOutput, "pour rawOptionOutput :", rawOptionOutput);
        return false;
    }

    // On s’assure que chaque règle a bien un mot-clé et une catégorie
    if (jsonOptionOutput.some(rule => !Array.isArray(rule) || rule.length !== 2)) {
        console.warn("[pdfParser] Certaines règles de correspondance sont invalides, elles seront ignorées.");
        jsonOptionOutput = jsonOptionOutput.filter(rule => Array.isArray(rule) && rule.length === 2);
    }

    return jsonOptionOutput;
}


/**
 * Normalise une chaîne de caractères en remplaçant les accents et caractères spéciaux
 * @param {string} str - La chaîne à normaliser
 * @returns {string} - La chaîne normalisée
 */
function normalizeString(str) {
    if (!str || typeof str !== 'string') return str;

    return str
        // Normalisation Unicode (décompose les caractères accentués)
        .normalize('NFD')
        // Supprime les marques diacritiques (accents)
        .replace(/[\u0300-\u036f]/g, '')
        // Normalise les ligatures
        .replace(/œ/g, 'oe')
        .replace(/Œ/g, 'OE')
        .replace(/æ/g, 'ae')
        .replace(/Æ/g, 'AE')
        .replace(/ß/g, 'ss')
        // Normalise les apostrophes et guillemets
        .replace(/[''`´]/g, "'")
        .replace(/[""«»]/g, '"')
        // Normalise les tirets
        .replace(/[–—]/g, '-')
        // Normalise les espaces (espaces insécables, etc.)
        .replace(/[\u00A0\u2000-\u200B\u2028\u2029]/g, ' ')
        .toLowerCase()
        .trim();
}