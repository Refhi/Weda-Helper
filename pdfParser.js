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
addTweak('/FolderMedical/UpLoaderForm.aspx', 'autoPdfParser', function () {
    // 1. Ajout du bouton pour initialiser les catégories
    addDocumentTypesButton();
    // 2. Attente de l'apparition de l'iframe contenant le PDF
    waitForElement({
        // l'id est splité car il y a un chiffre variable au milieu (1 ou 2 selon que l'option
        // "vertical" est cochée ou nondans la fenêtre d'import)
        selector: "[id^='ContentPlaceHolder1_ViewPdfDocumentUCForm'][id$='_iFrameViewFile']",
        callback: processFoundPdfIframe
    });
});


/** A partir de là la procédure suis globalement un enchainement de "roll-over" :
 * - il regarde a chaque étape si les données sont déjà présentes
 * - si elles ne le sont pas, il effectue l'étape demandée, ce qui déclenche un rafrachissement de la page
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

async function processFoundPdfIframe(elements) {
    // Setup de la procédure
    // Partie "neutre" => n'entraine pas de rafraichissement de la page ou de DOM change
    // ---------------------------------
    let dataMatrixReturn = null;
    let extractedData = null;
    console.log('[pdfParser] ----------------- Nouvelle boucle --------------------------------');
    let urlPDF = await findPdfUrl(elements);
    if (!urlPDF) {
        console.log("[pdfParser] l'url du PDF n'a pas été trouvée. Arrêt de l'extraction.");
        return;
    }
    console.log('[pdfParser] urlPDF', urlPDF);

    // Extraction du texte
    let fullText = await extractTextFromPDF(urlPDF);
    console.log('[pdfParser] fullText', [fullText]);



    // Création d'un id unique
    let hashId = await customHash(fullText, urlPDF);

    // Ajout d'un bouton de reset du sessionStorage correspondant
    addResetButton(hashId);

    // Récupération des données déjà extraites pour ce PDF
    extractedData = getPdfData(hashId);


    // Données déjà extraites pour ce PDF ?
    if (extractedData.alreadyImported) {
        console.log("[pdfParser] Données déjà importées pour ce PDF. Arrêt de l'extraction. Renvoi vers le champ de recherche ou le 1er patient de la liste si présent");
        selectFirstPatientOrSearchField();
        return;
    }
    if (Object.keys(extractedData).length > 0) {
        console.log("[pdfParser] Données déjà extraites pour ce PDF. Utilisation des données existantes.", extractedData);
    } else {
        console.log("[pdfParser] Données non extraites pour ce PDF. Extraction des données.");
        // Extraction des informations pertinentes
        extractedData = await extractRelevantData(fullText, urlPDF);
        // Si on n'a pas de nirMatches, on se rabattra sur la DDN et le nom.
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

        // Stockage et priorisation des informations pertinentes dans le sessionStorage
        // => le dataMatrix est prioritaire sur les informations extraites du texte
        completeExtractedData(extractedData, dataMatrixReturn);
        console.log('[pdfParser] extractedData', JSON.stringify(extractedData));
        setPdfData(hashId, extractedData);
    }

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



// Fonctions utilitaires
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
    let dropDownResearch = document.querySelector("[id^='ContentPlaceHolder1_FindPatientUcForm'][id$='_DropDownListRechechePatient']");
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
    // On initialise les priorités de recherche en vérifiant si les données sont présentes et cohérentes
    const searchPriorities = [
        { type: "InsSearch", data: extractedData.nirMatches && extractedData.nirMatches.length > 0 ? extractedData.nirMatches[0] : null },
        // "Nom" porte mal son nom : on peut y rechercher pas mal de choses, dont le NIR tronqué (sans clé) ce qui est utile pour les INS non validés
        { type: "Nom", data: extractedData.nirMatches && extractedData.nirMatches.length > 0 ? extractedData.nirMatches[0] : null },
        { type: "Naissance", data: extractedData.dateOfBirth && extractedData.dateOfBirth !== formatDate(new Date()) ? extractedData.dateOfBirth : null },

    ];

    for (let search of searchPriorities) {
        console.log("[pdfParser] Les méthodes refusées sont :", extractedData.failedSearches);
        if (search.data && !extractedData.failedSearches.includes(search.type)) {
            let properSearched = lookupPatient(search.type, search.data);
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
        documentTitle: `#ContentPlaceHolder1_FileStreamClassementsGrid_EditBoxGridFileStreamClassementTitre_${ligneAction}`
    };

    // Récupère les éléments du DOM correspondant aux sélecteurs
    const inputs = {
        documentDate: document.querySelector(selectors.documentDate),
        documentType: document.querySelector(selectors.documentType),
        documentTitle: document.querySelector(selectors.documentTitle)
    };

    PdfParserAutoTitle = await getOptionPromise('PdfParserAutoTitle')
    PdfParserAutoDate = await getOptionPromise('PdfParserAutoDate')

    // Données à insérer dans les champs du formulaire
    const fields = {
        documentDate: PdfParserAutoDate ? extractedData.documentDate : null,
        documentType: extractedData.documentType,
        documentTitle: PdfParserAutoTitle ? extractedData.documentTitle : null
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
    if (selectedPatientName() !== 'Patient à définir...') {
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
    let idPatientSelected = idPatientSelectedBaseId + actualImportActionLine();
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
        sendWedaNotif({
            message: `Type de recherche ${searchType} non disponible. Contactez votre expert pour l'activer.`,
            type: 'fail'
        })
        return { status: 'searchTypeFail', message: `Type de recherche ${searchType} non disponible.` };
    }

    // Petite conversion de donnée : si on recherche par nom, on veut en fait une recherche par NIR tronqué (sans clé)
    if (searchType === "Nom") { data = data.substring(0, 13); }

    const dropDownResearch = document.querySelector("[id^='ContentPlaceHolder1_FindPatientUcForm'][id$='_DropDownListRechechePatient']");

    if (dropDownResearch.value !== searchType) {
        console.log(`[pdfParser] Menu de recherche réglé sur ${dropDownResearch.value} alors qu'on souhaite ${searchType} => Changement de valeur du menu déroulant de recherche vers ${searchType} + change event`);
        dropDownResearch.value = searchType;
        dropDownResearch.dispatchEvent(new Event('change'));
        return { status: 'refresh', message: 'Change Search Mode' };

    } else {
        console.log(`[pdfParser] Menu de recherche déjà réglé sur ${searchType}`);
    }

    const inputFields = {
        Naissance: document.querySelector("[id^='ContentPlaceHolder1_FindPatientUcForm'][id$='_TextBoxRecherchePatientByDate']"),
        others: document.querySelector("[id^='ContentPlaceHolder1_FindPatientUcForm'][id$='_TextBoxRecherche']")
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
        console.error("[pdfParser] iframe non trouvée. Arrêt de l'extraction.");
        resolve(null);
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
    const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
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

// Extraction des informations pertinentes du texte du PDF
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

    let extractedData = {
        documentDate: documentDate ? formatDate(documentDate) : null,
        dateOfBirth: dateOfBirth ? formatDate(dateOfBirth) : null,
        nameMatches: nameMatches,
        documentType: documentType,
        documentTitle: documentTitle,
        nirMatches: nirMatches
    };
    return extractedData;
}

// Extraction du datamatrix des pages du PDF
async function extractDatamatrixFromPDF(pdfUrl) {
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
    const dropDownListCats = "#ContentPlaceHolder1_FileStreamClassementsGrid_DropDownListGridFileStreamClassementLabelClassification_0";
    const dropDownCats = document.querySelector(dropDownListCats);
    if (!dropDownCats) {
        alert('[pdfParser] Pour initialiser les catégories, vous devez avoir au moins un document en attente de classification.');
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
    const specialites = {
        "Médecine Interne": ["Médecine Interne"],
        "Orthopédie": ["Orthopédie"],
        "Gynécologie": ["Gynécologie"],
        "Cardiologie": ["Cardiologie"],
        "Neurologie": ["Neurologie"],
        "Pédiatrie": ["Pédiatrie"],
        "Radiologie": ["Radiologie"],
        "Ophtalmologie": ["Ophtalmologie"],
        "Pneumologie": ["Pneumologie"],
        "Dermatologie": ["Dermatologie"],
        "Urologie": ["Urologie"],
        "Chirurgie": ["Chirurgie"],
        "Rhumatologie": ["Rhumatologie"],
        "Endocrinologie": ["Endocrinologie"],
        "Gastro-entérologie": ["Gastro-entérologie"],
        "Hématologie": ["Hématologie"],
        "Néphrologie": ["Néphrologie"],
        "Oncologie": ["Oncologie"],
        "Psychiatrie": ["Psychiatrie"],
        "Stomatologie": ["Stomatologie"],
        "Addictologie": ["Addictologie"],
        "ORL": ["Otologie", "Rhinologie", "Laryngologie"],
    };

    const imageries = {
        "scanner": ["scanner"],
        "échographie": ["échographie", "doppler"],
        "radiographie": ["radiographie"],
        "mammographie": ["mammographie"],
        "scintigraphie": ["scintigraphie"],
        "tomodensitométrie": ["tomodensitométrie"],
        "ostéodensitométrie": ["ostéodensitométrie"],
        "TDM": ["TDM"],
        "IRM": ["IRM"]
    };

    // console.log('[pdfParser] determineDocumentTitle');

    // Trouver la spécialité médicale
    let specialite = findSpecialite(fullText, specialites);

    // Trouver le type d'imagerie si présent
    let imagerie = findImagerie(fullText, imageries);

    // Construire le titre du document
    let documentTitle = documentType;
    if (documentType === "IMAGERIE" && imagerie) {
        if (imagerie) {
            documentTitle += ` - ${imagerie}`;
        }
    } else if (specialite) {
        documentTitle += ` - ${specialite}`;
    }


    console.log('[pdfParser] Titre du document déterminé', documentTitle, 'car document de type', documentType, 'avec spécialité', specialite, 'et imagerie', imagerie);
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
        const nir = result[1].replace(/\s/g, ''); // Supprimer les espaces du NIR
        const cle = result[4].replace(/\s/g, ''); // Supprimer les espaces de la clé
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