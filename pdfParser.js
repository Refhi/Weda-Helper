/** pdfParser est un script qui permet d'extraire les informations d'un PDF et de les insérer dans les fenêtres d'import.
 * En premier lieu on va travailler sur https://secure.weda.fr/FolderMedical/UpLoaderForm.aspx mais il a vocation à être généralisé.
 * 
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

// 2.b. Dans la page des Echanges Sécurisés TODO
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
            // Ajout d'un listener sur le bouton "Importer le message"
            elements[0].addEventListener("click", function () {
                console.log("[pdfParser] Importation du message cliqué, je vais traiter le PDF présent dans l'iframe.");
                processFoundPdfIframeEchanges(true);
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
    if (handlePatientSearchReturn.status === 'refresh') {
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
    iframeDocToImport = document.querySelectorAll('#PanelViewDocument iframe');

    // Setup de la procédure
    // Extraction des données de base
    const baseData = await extractBasePdfData(iframeDocToImport);
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

            if (handlePatientSearchReturn.status === 'continue' || handlePatientSearchReturn.message === 'Patient trouvé et cliqué') {
                console.log("[pdfParser] Recherche de patient terminée avec succès", handlePatientSearchReturn.message);
                continueSearching = false;
                console.log("[pdfParser] Traitement terminé pour la page d'échanges");
            } else if (handlePatientSearchReturn.status === 'refresh') {
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
        sendWedaNotifAllTabs({
            message: "Sélection du patient et des données d'import terminée. Vous pouvez valider l'import en appuyant sur Enter. Maj+Tab pour effectuer des corrections.",
            type: 'success',
            icon: 'success'
        });
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
                // Ajouter le nom du patient à côté du bouton de validation
                if (document.querySelector("#pdfParserPatientName")) {
                    document.querySelector("#pdfParserPatientName").remove();
                }
                const patientNameSpan = document.createElement('span');
                patientNameSpan.innerText = `Vers dossier : ${patientData}`;
                patientNameSpan.style.marginLeft = '10px';
                patientNameSpan.id = 'pdfParserPatientName';
                const validationButton = document.querySelector("#messageContainer .button.valid");
                validationButton.insertAdjacentElement('afterend', patientNameSpan)
                // On retire les listeners pour éviter les doublons
                possibleClickablePatient.forEach((p) => {
                    p.removeEventListener("click", arguments.callee);
                });
            });
        });
    }
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
    // Le champ de titre est l'input avec le titre "C'est le titre qu'aura le document dans le dossier patient"
    let titleInput = document.querySelectorAll("input[title=\"C'est le titre qu'aura le document dans le dossier patient\"]");
    // On sélectionne le dernier input (le plus bas dans le DOM)
    titleInput = titleInput[titleInput.length - 1];
    if (titleInput) {
        console.log("[pdfParser] Titre trouvé, on le met dans le champ de titre", Titre);
        titleInput.value = Titre;
        titleInput.dispatchEvent(new Event('change'));
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
 * @param {Element[]} elements - Les éléments DOM contenant l'iframe.
 * @returns {Promise<Object|null>} - Les données de base extraites ou null si échec.
 */
async function extractBasePdfData(elements) {
    console.log('[pdfParser] ----------------- Nouvelle boucle --------------------------------');
    // Initialisation des variables
    let urlPDF = null;
    let fullText = null;
    let hashId = null;

    // 1. Trouver l'URL du PDF
    urlPDF = await findPdfUrl(elements);
    if (!urlPDF) {
        console.log("[pdfParser] l'url du PDF n'a pas été trouvée. Arrêt de l'extraction.");
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
    console.log('[pdfParser] fullText', [fullText]);

    // 3. Créer un identifiant unique pour ce PDF
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
        extractedData = await extractRelevantData(fullText, urlPDF);

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
 * @returns {Object} - Le statut et le message de la recherche.
 * @returns {string} status - Le statut de la recherche ('refresh', 'continue').
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
                    return { status: 'refresh', message: 'Patient trouvé et cliqué' };
                } else if (clicPatientReturn.status === 'error') {
                    extractedData.failedSearches.push(search.type);
                    setPdfData(hashId, extractedData); // permet la rémanence des données
                } else if (clicPatientReturn.status === 'continue') {
                    console.log("[pdfParser] Patient non trouvé ou correctement sélectionné, je continue la procédure.");
                    return { status: 'continue', message: 'Patient non trouvé ou correctement sélectionné' };
                } else {
                    console.error("[pdfParser] Erreur inconnue lors de la recherche du patient, je continue la procédure.");
                    return { status: 'continue', message: 'Erreur inconnue lors de la recherche du patient' };
                }
            } else if (properSearched.status === 'refresh') {
                console.log(`[pdfParser] arrêt de la procédure car :`, properSearched.message);
                // On attends aussi un rafraichissement de la page
                return { status: 'refresh', message: properSearched.message };
            } else {
                // On marque l'échec de cette méthode de recherche => la boucle suivante l'écartera
                console.error(`[pdfParser] Echec de la méthode de recherche :`, properSearched.message, `pour ${search.type}`, "je la marque comme un échec et je continue la procédure.");
                extractedData.failedSearches.push(search.type);
                setPdfData(hashId, extractedData); // permet la rémanence des données
            }
        }
    }

    console.log("[pdfParser] Aucune donnée ou méthode de recherche disponible. Arrêt de la recherche de patient.");
    return { status: 'continue', message: 'Aucune donnée ou méthode de recherche disponible' };
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
    resetButton.title = "Weda-Helper : Réinitialiser les données d'analyse automatique du PDF"; // Texte lors du survol de la souris
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

/**
 * Clic sur le patient trouvé.
 * @param {Object} extractedData - Les données extraites du PDF.
 * @param {Array} extractedData.nameMatches - Les noms correspondants trouvés dans le PDF.
 * @returns {Object} - Objet contenant le statut et un message.
 * @returns {string} status - Statut de l'opération ('success', 'error', 'continue').
 * @returns {string} message - Message décrivant le résultat de l'opération.
 */
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
        // Ici le bon patient est déjà sélectionné pour import.
        // On en déduis que la procédure a déjà aboutie et qu'il faut s'arrêter.
        console.log("[pdfParser] Un patient est déjà sélectionné, arrêt de la recherche.");
        return { status: 'continue', message: "Un patient est déjà sélectionné" };
    } else {
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
    // Première passe : chercher le nom complet
    for (let i = 0; i < patientElements.length; i++) {
        let patientElement = patientElements[i];
        let patientName = patientElement.innerText.toLowerCase();
        if (nameMatches.map(name => name.toLowerCase()).includes(patientName)) {
            return patientElement;
        }
    }

    // Deuxième passe : chercher chaque mot indépendamment
    for (let i = 0; i < patientElements.length; i++) {
        let patientElement = patientElements[i];
        let patientName = patientElement.innerText.toLowerCase();
        for (let j = 0; j < nameMatches.length; j++) {
            let nameParts = nameMatches[j].toLowerCase().split(' ');
            for (let k = 0; k < nameParts.length; k++) {
                if (patientName.includes(nameParts[k])) {
                    return patientElement;
                }
            }
        }
    }

    // Troisième passe : comparaison des parties
    for (let i = 0; i < patientElements.length; i++) {
        let patientElement = patientElements[i];
        let patientNameParts = patientElement.innerText.toLowerCase().split(' ');
        for (let j = 0; j < nameMatches.length; j++) {
            let nameParts = nameMatches[j].toLowerCase().split(' ');
            for (let k = 0; k < nameParts.length; k++) {
                for (let l = 0; l < patientNameParts.length; l++) {
                    if (nameParts[k].includes(patientNameParts[l])) {
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
async function findPdfUrl(elements) {
    let iframe = elements[0];
    if (!iframe) {
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
    let pdf;
    if (pdfUrl.includes('base64')) {
        pdfUrl = pdfUrl.replace('data:application/pdf;base64,', '');
        pdfUrl = atob(pdfUrl);
        pdf = await pdfjsLib.getDocument({ data: pdfUrl }).promise;
    }
    else {
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
async function extractRelevantData(fullText, pdfUrl) {
    const regexPatterns = {
        dateRegexes: [
            /[0-9]{2}[\/\-.][0-9]{2}[\/\-.][0-9]{4}/g, // Match dates dd/mm/yyyy ou dd-mm-yyyy
            /([0-9]{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+([0-9]{4})/gi // Match dates comme "28 novembre 2024"
        ],
        dateOfBirthRegexes: [
            /(?:né\(e\) le|date de naissance:|date de naissance :|née le)[\s\S]([0-9]{2}[\/\-.][0-9]{4})/gi // Match la date de naissance
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

    // Extraction de l'ensemble des dates présentes dans le texte
    const dateMatches = await extractDates(fullText, regexPatterns.dateRegexes);
    // Extraction des éléments pertinents
    const documentDate = await determineDocumentDate(fullText, dateMatches, regexPatterns.documentDateRegexes);
    const dateOfBirth = determineDateOfBirth(fullText, dateMatches, regexPatterns.dateOfBirthRegexes);
    const nameMatches = extractNames(fullText, regexPatterns.nameRegexes);
    const documentType = await determineDocumentType(fullText);
    const documentTitle = determineDocumentTitle(fullText, documentType);
    const nirMatches = extractNIR(fullText, regexPatterns.nirRegexes);
    const addressedTo = extractAddressedTo(fullText); // Retourne l'id du choix du dropdown
    const destinationClass = extractDestinationClass(fullText);


    let extractedData = {
        documentDate: documentDate ? formatDate(documentDate) : null,
        dateOfBirth: dateOfBirth ? formatDate(dateOfBirth) : null,
        nameMatches: nameMatches,
        documentType: documentType,
        documentTitle: documentTitle,
        nirMatches: nirMatches,
        addressedTo: addressedTo,
        destinationClass: destinationClass
    };
    return extractedData;
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
        // Créer différentes variations pour la recherche (en tenant compte des possibles sauts de ligne ou caractères entre nom et prénom)
        const patterns = [
            // Format NOM Prénom (tolère des caractères entre les deux)
            new RegExp(`${doctor.lastName}[\\s\\S]{0,5}${doctor.firstName.split('-')[0]}`, 'i'),

            // Format Prénom NOM (tolère des caractères entre les deux)
            new RegExp(`${doctor.firstName.split('-')[0]}[\\s\\S]{0,5}${doctor.lastName}`, 'i'),

            // Recherche seulement le nom de famille s'il est assez distinctif (>= 5 caractères)
            ...(doctor.lastName.length >= 5 ? [new RegExp(`\\b${doctor.lastName}\\b`, 'i')] : []),

            // Recherche seulement le prénom s'il est assez distinctif (>= 5 caractères)
            ...(doctor.firstName.length >= 5 ? [new RegExp(`\\b${doctor.firstName.split('-')[0]}\\b`, 'i')] : [])
        ];

        // Tester chaque pattern
        for (const pattern of patterns) {
            if (pattern.test(fullText)) {
                console.log(`[pdfParser] Médecin trouvé dans le texte: ${doctor.fullName} avec le pattern ${pattern}`);
                return doctor.id;
            }
        }
    }

    console.log("[pdfParser] Aucun médecin destinataire identifié dans le texte");
    return null;
}

// Extraction de la classe de destination
function extractDestinationClass(fullText) {
    // Les trois destinations possibles 
    const destinations = {
        '1': "Consultation",
        '2': "Résultats d'examens",
        '3': "Courrier"
    };

    // Mots-clés pour chaque destination
    const keywordsByDestination = {
        '1': [
            /consultation/i,
            /prise en charge/i,
            /examen clinique/i,
            /visite médicale/i,
            /Motif :/i,
            /histoire de la maladie/i,
            /SOAP/i,
            /anamnèse/i,
            /auscultation/i,
            /Antécédents :/i,
            /Au terme de ce bilan/i,
            /à l'examen clinique/i
        ],
        '2': [
            /examen/i,
            /résultat/i,
            /biologie/i,
            /bilan/i,
            /analyse/i,
            /laboratoire/i,
            /scanner/i,
            /imagerie/i,
            /radiographie/i,
            /échographie/i,
            /irm/i,
            /tdm/i,
            /tep/i,
            /doppler/i,
            /mammographie/i,
            /scintigraphie/i,
            /echodoppler/i,
            /renseignements cliniques/i,
            /technique/i,
            /conclusion/i
        ],
        '3': [
            /courrier/i,
            /lettre/i,
            /correspondance/i,
            /avis/i,
            /compte rendu/i,
            /compte-rendu/i,
            /CR.{0,5}consult/i,
            /adressé(?:e)? par/i,
            /adressé(?:e)? pour/i,
            /Cher Confrère/i,
            /chère consoeur/i,
            /chère consœur/i,
            /Je vous remercie/i,
            /nous a consulté/i,
            /nous a été adressé/i,
            /information destinée/i,
            /spécialiste/i
        ]
    };

    // Compteur de correspondances pour chaque destination
    const matchCounts = {
        '1': 0,
        '2': 0,
        '3': 0
    };

    // Vérifier chaque destination
    for (const [destId, patterns] of Object.entries(keywordsByDestination)) {
        for (const pattern of patterns) {
            const matches = fullText.match(pattern);
            if (matches) {
                matchCounts[destId] += matches.length;
            }
        }
    }

    console.log('[pdfParser] Correspondances de classe par destination:', matchCounts);

    // Vérifier s'il y a des correspondances spécifiques qui augmentent fortement la probabilité
    const specificPatterns = {
        '1': [/consultation.*du\s+\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4}/i],
        '2': [/Résultats? d[''](?:examen|analyse)s?/i, /valeurs? de référence/i],
        '3': [/Je vous remercie de m'avoir adressé/i]
    };

    for (const [destId, patterns] of Object.entries(specificPatterns)) {
        for (const pattern of patterns) {
            if (pattern.test(fullText)) {
                matchCounts[destId] += 5; // Ajoute un poids plus fort
            }
        }
    }

    // Sélectionner la destination avec le plus grand nombre de correspondances
    let maxCount = 0;
    let selectedDestination = null;

    for (const [destId, count] of Object.entries(matchCounts)) {
        if (count > maxCount) {
            maxCount = count;
            selectedDestination = destId;
        }
    }

    // Si aucune correspondance ou égalité, on privilégie "Courrier" qui est souvent la catégorie par défaut
    if (maxCount === 0 || (matchCounts['3'] === matchCounts['2'] && matchCounts['2'] === maxCount)) {
        selectedDestination = '3';
    }

    console.log(`[pdfParser] Classe de destination détectée: ${destinations[selectedDestination]} (ID: ${selectedDestination})`);
    return selectedDestination;
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
    // console.log('[pdfParser] determineDocumentType');
    // On utilise un tableau de tableaux pour permettre de parcourir les types de documents par ordre de spécificité
    // Et de mettre plusieurs fois la même clé, avec des valeurs de moins en moins exigeantes
    const PdfParserAutoCategoryDict = await getOptionPromise('PdfParserAutoCategoryDict');
    let documentTypes;
    try {
        documentTypes = JSON.parse(PdfParserAutoCategoryDict);
    } catch (error) {
        console.error('[pdfParser] Erreur lors de l\'analyse du JSON pour PdfParserAutoCategoryDict:', error, PdfParserAutoCategoryDict);
        if (confirm('Erreur de syntaxe pour la catégorisation automatique du document. Vérifiez dans les options de Weda-Helper. Cliquez sur OK pour réinitialiser ce paramètre.')) {
            handleDocumentTypesConsent();
        }
        return null;
    }

    // Vérifier que tous les types de documents sont bien définis
    const possibleDocumentTypes = initDocumentTypes();

    // Si possibleDocumentTypes est undefined (cas des échanges sécurisés)
    // on retourne null pour éviter l'erreur
    if (!possibleDocumentTypes) {
        console.error('[pdfParser] Liste des types de documents non disponible');
        return null;
    }

    // Vérifier que chaque type de document dans documentTypes est présent dans possibleDocumentTypes
    for (const [type, _] of documentTypes) {
        if (!possibleDocumentTypes.some(possibleType => possibleType[0] === type)) {
            console.error(`[pdfParser] Type de document ${type} non défini dans les catégories possibles. Veuillez mettre à jour les catégories.`);
            if (confirm(`Type de document ${type} non défini dans les catégories possibles. Voulez-vous mettre à jour les catégories ?`)) {
                handleDocumentTypesConsent();
            }
            return null;
        }
    }

    // Vérifier que chaque type de document dans possibleDocumentTypes est présent dans documentTypes
    for (const [possibleType, _] of possibleDocumentTypes) {
        if (!documentTypes.some(([type, _]) => type === possibleType)) {
            console.error(`[pdfParser] Catégorie possible ${possibleType} non définie dans les types de documents. Veuillez mettre à jour les types de documents.`);
            if (confirm(`Catégorie possible ${possibleType} non définie dans les types de documents. Voulez-vous mettre à jour les types de documents ?`)) {
                handleDocumentTypesConsent();
            }
            return null;
        }
    }

    for (const [type, keywords] of documentTypes) {
        // console.log('[pdfParser] recherche du type de document', type);
        for (const keyword of keywords) {
            // Remplacer les espaces par \s* pour permettre les espaces optionnels
            const regex = new RegExp(keyword.replace(/\s+/g, '\\s*'), 'i');
            if (regex.test(fullText)) {
                console.log('[pdfParser] type de document trouvé', type, 'car présence de', keyword);
                return type;
            }
        }
    }
    console.log('[pdfParser] type de document non trouvé');
    return null;
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

    // Créer un tableau pour stocker les catégories
    const categories = [];

    // Parcourir les options et ajouter les catégories au tableau
    for (let i = 0; i < options.length; i++) {
        const option = options[i];
        if (option.value !== "0") { // Ignorer l'option par défaut
            categories.push([option.text, []]); // Initialiser les valeurs à un tableau vide
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

        // Ajouter les nouvelles catégories
        categories.forEach(category => {
            if (!existingCategories.some(existingCategory => existingCategory[0] === category[0])) {
                existingCategories.push(category);
            }
        });

        // Supprimer les catégories qui ne sont pas dans la variable
        existingCategories = existingCategories.filter(existingCategory =>
            categories.some(category => category[0] === existingCategory[0])
        );

        const updatedCategories = JSON.stringify(existingCategories);

        chrome.storage.local.set({ 'PdfParserAutoCategoryDict': updatedCategories }, function () {
            console.log('[pdfParser] Catégories de classification mises à jour:', updatedCategories);
            // Contrôle de ce qui a été stocké
            chrome.storage.local.get('PdfParserAutoCategoryDict', function (result) {
                console.log('[pdfParser] Catégories de classification stockées:', PdfParserAutoCategoryDict);
            });
        });
    });
}

// gestion du consentement de l'utilisateur pour l'initialisation des catégories de classification
function handleDocumentTypesConsent() {
    if (confirm("Initialiser les catégories de classification ? Pensez ensuite à compléter les mots-clés dans les options de l'extension.")) {
        const categories = initDocumentTypes();
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



// Fonction pour trouver la spécialité dans le texte
function findSpecialite(fullText, specialites) {
    for (const [specialite, keywords] of Object.entries(specialites)) {
        for (const keyword of keywords) {
            if (fullText.toLowerCase().includes(keyword.toLowerCase())) {
                console.log('[pdfParser] spécialité trouvée', specialite);
                return specialite;
            }
        }
    }
    return null;
}

// Fonction pour trouver le type d'imagerie dans le texte
function findImagerie(fullText, imageries) {
    for (const [imagerie, keywords] of Object.entries(imageries)) {
        for (const keyword of keywords) {
            if (fullText.toLowerCase().includes(keyword.toLowerCase())) {
                console.log('[pdfParser] type d\'imagerie trouvé', imagerie);
                return imagerie;
            }
        }
    }
    return null;
}

// Fonction pour déterminer le titre du document
function determineDocumentTitle(fullText, documentType) {
    // Phrases-clés prioritaires avec leurs titres associés
    const phrasesPrioritaires = {
        "Frottis": ["Frottis gynécologique de dépistage", "papilloma", "Frottis cervico-vaginal"],
        "Prescription de transport": ["transport pour patient"],
        "Arrêt de travail": ["ARRET DE TRAVAIL", "D’ARRET DE TRAVAIL"],
        "Protocole de soin": ["PROTOCOLE DE SOINS ELECTRONIQUE"],
    };

    // Vérifier d'abord s'il y a une phrase prioritaire dans le texte
    for (const [titre, phrases] of Object.entries(phrasesPrioritaires)) {
        for (const phrase of phrases) {
            // Rechercher la phrase avec une regex insensible à la casse
            const regex = new RegExp(phrase, 'i');
            if (regex.test(fullText)) {
                console.log(`[pdfParser] Phrase prioritaire trouvée: "${phrase}" => Titre: "${titre}"`);
                let documentTitle = titre;

                // Si un lieu est présent, on peut l'ajouter
                for (const [nom, mots] of Object.entries(lieux)) {
                    for (const mot of mots) {
                        const lieuRegex = new RegExp(`(^|\\s|\\n)${mot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|\\n|$)`, 'i');
                        if (lieuRegex.test(fullText)) {
                            documentTitle += ` (${nom})`;
                            break;
                        }
                    }
                }

                return documentTitle;
            }
        }
    }

    const specialites = {
        "Médecine Interne": ["Médecine Interne"],
        "Orthopédie": ["Orthopédie", "Orthopédique", "Traumatologie"],
        "Gynécologie": ["Gynécologie", "Obstétrique", "Gynéco"],
        "Cardiologie": ["Cardiologie", "Cardio", "Cardiovasculaire"],
        "Neurologie": ["Neurologie", "Neuro", "Neurochirurgie"],
        "Pédiatrie": ["Pédiatrie", "Pédiatre", "Enfant"],
        "Radiologie": ["Radiologie", "Radio"],
        "Ophtalmologie": ["Ophtalmologie", "Ophtalmo", "Oculaire"],
        "Pneumologie": ["Pneumologie", "Pneumo", "Respiratoire", "Pulmonaire"],
        "Dermatologie": ["Dermatologie", "Dermato", "Cutané"],
        "Urologie": ["Urologie", "Uro"],
        "Chirurgie": ["Chirurgie", "Chirurgical", "Opération"],
        "Rhumatologie": ["Rhumatologie", "Rhumato"],
        "Endocrinologie": ["Endocrinologie", "Endocrino", "Diabète", "Diabétologie"],
        "Gastro-entérologie": ["Gastro-entérologie", "Gastro", "Digestif"],
        "Hématologie": ["Hématologie", "Hémato"],
        "Néphrologie": ["Néphrologie", "Néphro", "Rénale"],
        "Oncologie": ["Oncologie", "Onco", "Cancer"],
        "Psychiatrie": ["Psychiatrie", "Psy", "Psychologie"],
        "Stomatologie": ["Stomatologie", "Stomato", "Maxillo-facial"],
        "Addictologie": ["Addictologie", "Addiction"],
        "ORL": ["ORL", "Otologie", "Rhinologie", "Laryngologie", "Otorhinolaryngologie"],
        "Allergologie": ["Allergologie", "Allergie", "Allergique"],
        "Gériatrie": ["Gériatrie", "Gérontologie", "Personnes âgées"],
        "Anesthésiologie": ["Anesthésiologie", "Anesthésie", "Réanimation"]
    };

    const imageries = {
        "scanner": ["scanner", "TDM", "tomodensitométrie"],
        "échographie": ["échographie", "écho", "doppler", "échodoppler"],
        "radiographie": ["radiographie", "radio", "rx"],
        "mammographie": ["mammographie", "mammo"],
        "scintigraphie": ["scintigraphie", "scinti"],
        "ostéodensitométrie": ["ostéodensitométrie", "densitométrie osseuse"],
        "IRM": ["IRM", "imagerie par résonance magnétique"]
    };

    // Organes/régions anatomiques fréquents pour préciser l'examen
    const regions = {
        "thoracique": ["thorax", "thoracique", "pulmonaire", "poumon"],
        "abdominal": ["abdomen", "abdominal", "abdominale"],
        "crânien": ["crâne", "crânien", "cérébral", "cerveau", "tête"],
        "rachis": ["rachis", "colonne vertébrale", "lombaire", "cervical", "dorsal", "vertèbre"],
        "genou": ["genou", "fémoro-tibial"],
        "hanche": ["hanche", "coxo-fémoral"],
        "épaule": ["épaule", "scapulo-huméral"],
        "poignet": ["poignet", "radio-carpien"],
        "coude": ["coude"],
        "cheville": ["cheville", "tibio-tarsien"],
        "pied": ["pied", "tarsien"],
        "main": ["main", "métacarpien"],
        "bassin": ["bassin", "pelvien"],
        "sinus": ["sinus", "facial"],
        "artère": ["artère", "artériel", "aorte", "carotide", "fémorale"],
        "cardiaque": ["cardiaque", "cœur", "coronaire"]
    };

    // Établissements de santé ou lieux
    const lieux = {
        "CHU": ["CHU", "Centre Hospitalier Universitaire"],
        "CH": ["CH", "Centre Hospitalier de", "Hôpital de", "Hôpital"],
        "Clinique": ["Clinique", "Polyclinique"],
        "Centre": ["Centre médical", "Centre de radiologie", "Centre d'imagerie"],
        "Cabinet": ["Cabinet médical", "Cabinet de radiologie"]
    };

    // Type de compte-rendu
    const typesCR = {
        "consultation": ["Consultation", "CS", "Cs", "consultation"],
        "hospitalisation": ["Hospitalisation", "CRH", "compte rendu d'hospitalisation"],
        "examen": ["Compte rendu d'examen", "CR d'examen", "compte-rendu d'examen"],
        "opération": ["Compte rendu opératoire", "CRO", "opération"]
    };

    // Trouver la spécialité médicale
    let specialite = findSpecialite(fullText, specialites);

    // Trouver le type d'imagerie si présent
    let imagerie = findImagerie(fullText, imageries);

    // Trouver la région anatomique si présente
    let region = null;
    for (const [nom, mots] of Object.entries(regions)) {
        for (const mot of mots) {
            if (fullText.toLowerCase().includes(mot.toLowerCase())) {
                region = nom;
                break;
            }
        }
        if (region) break;
    }

    // Trouver le lieu si présent
    let lieu = null;
    for (const [nom, mots] of Object.entries(lieux)) {
        for (const mot of mots) {
            // Utiliser une regex avec des limites de mots pour garantir des correspondances exactes
            const regex = new RegExp(`(^|\\s|\\n)${mot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|\\n|$)`, 'i');
            if (regex.test(fullText)) {
                lieu = nom;
                break;
            }
        }
        if (lieu) break;
    }

    // Trouver le type de compte-rendu
    let typeCR = null;
    for (const [nom, mots] of Object.entries(typesCR)) {
        for (const mot of mots) {
            if (fullText.toLowerCase().includes(mot.toLowerCase())) {
                typeCR = nom;
                break;
            }
        }
        if (typeCR) break;
    }

    const extractDoctorName = (fullText) => {
        // Diviser le texte en lignes pour analyser ligne par ligne
        const lines = fullText.split('\n');

        // Patterns simplifiés pour les noms de médecins, sans distinction de casse
        const doctorPatterns = [
            // Format "Dr" ou "Docteur" suivi de 1-4 mots (pour nom/prénom potentiellement composés)
            /^(?:dr\.?|docteur|médecin|praticien)\s+(\w+(?:\s+\w+){0,3})/i,
            // Même format mais n'importe où dans la ligne
            /(?:dr\.?|docteur|médecin|praticien)\s+(\w+(?:\s+\w+){0,3})/i
        ];

        // Diviser le document en tiers
        const thirds = [
            { start: Math.floor(lines.length * 2 / 3), end: lines.length, name: 'signature' },  // Dernier tiers
            { start: Math.floor(lines.length * 1 / 3), end: Math.floor(lines.length * 2 / 3), name: 'corps' },  // Tiers du milieu
            { start: 0, end: Math.floor(lines.length * 1 / 3), name: 'entête' }  // Premier tiers
        ];

        // Parcourir les tiers dans l'ordre: dernier, milieu, premier
        for (const third of thirds) {
            for (let i = third.start; i < third.end; i++) {
                const line = lines[i];
                for (const pattern of doctorPatterns) {
                    const match = line.match(pattern);
                    if (match && match[1]) {
                        return {
                            fullName: match[1].trim(),
                            location: third.name
                        };
                    }
                }
            }
        }

        return null;
    };    // Utiliser la fonction pour extraire le nom du médecin
    const doctorInfo = extractDoctorName(fullText);
    const medecin = doctorInfo ? doctorInfo.fullName : null;
    // Construire le titre du document en fonction du contexte
    let documentTitle = documentType || "";

    // Pour les documents d'imagerie
    if (documentType === "IMAGERIE") {
        if (imagerie) {
            documentTitle = imagerie.charAt(0).toUpperCase() + imagerie.slice(1);
            if (region) {
                documentTitle += ` ${region}`;
            }
        } else if (specialite === "Radiologie") {
            documentTitle = "Examen radiologique";
            if (region) {
                documentTitle += ` ${region}`;
            }
        }
    }
    // Pour les consultations
    else if (documentType === "CONSULTATION" || typeCR === "consultation") {
        documentTitle = "Consultation";
        if (medecin) {
            documentTitle += ` Dr. ${medecin}`;
        } else if (specialite) {
            documentTitle += ` ${specialite}`;
        }
    }
    // Pour les hospitalisations
    else if (typeCR === "hospitalisation") {
        documentTitle = "CRH";
        if (specialite) {
            documentTitle += ` ${specialite}`;
        }
    }
    // Pour les autres types de documents
    else if (specialite) {
        documentTitle += documentTitle ? ` - ${specialite}` : specialite;
    }

    // Ajouter le lieu en dernier si présent
    if (lieu) {
        documentTitle += ` (${lieu})`;
    }

    console.log('[pdfParser] Titre du document déterminé', documentTitle,
        'avec type:', documentType,
        'spécialité:', specialite,
        'imagerie:', imagerie,
        'région:', region,
        'médecin:', medecin,
        'lieu:', lieu,
        'type CR:', typeCR);

    return documentTitle;
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