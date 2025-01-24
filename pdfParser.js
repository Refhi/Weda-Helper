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
 */

async function processFoundPdfIframe(elements) {
    // Setup de la procédure
    let dataMatrixReturn = null;
    console.log('[pdfParser] ----------------- Nouvelle boucle --------------------------------');
    let urlPDF = await findPdfUrl(elements);
    if (!urlPDF) {
        console.log("[pdfParser] l'url du PDF n'a pas été trouvée. Arrêt de l'extraction.");
        return;
    }
    console.log('[pdfParser] urlPDF', urlPDF);

    // Extraction du texte
    let fullText = await extractTextFromPDF(urlPDF);
    console.log('[pdfParser] fullText', fullText);

    // Extraction des informations pertinentes
    let extractedData = await extractRelevantData(fullText, urlPDF);

    // Création d'un id unique
    let hashId = customHash(fullText);

    // Données déjà extraites pour ce PDF ?
    let { alreadyExtractedData, alreadyImported } = checkAlreadyExtractedData(hashId);
    if (alreadyImported) {
        console.log("[pdfParser] Données déjà importées pour ce PDF. Arrêt de l'extraction.");
        return;
    }

    // Si la date de naissance ou le nom n'ont pas été trouvés, on recherche le datamatrix
    if (!extractedData.dateOfBirth || extractedData.nameMatches.length === 0) {
        console.log("[pdfParser] Date de naissance ou nom non trouvée. Recherche du datamatrix.");
        dataMatrixReturn = await extractDatamatrixFromPDF(urlPDF);
        console.log('[pdfParser] dataMatrixReturn', dataMatrixReturn);
        if (!dataMatrixReturn) {
            console.log("[pdfParser] Datamatrix non trouvé. Arrêt de la procédure.");
            return;
        }
    }

    // Stockage et priorisation des informations pertinentes dans le sessionStorage
    // => le dataMatrix est prioritaire sur les informations extraites du texte
    completeExtractedData(extractedData, dataMatrixReturn);
    let extractedDataStr = JSON.stringify(extractedData);
    console.log('[pdfParser] extractedData', extractedDataStr);
    sessionStorage.setItem(hashId, extractedDataStr);

    // Recherche du patient par la date de naissance
    // => on pourrait rechercher par INS si on a le datamatrix, mais cela impliquerait de
    //    naviguer entre les différents types de recherche dans la fenêtre d'import
    let properDDNSearched = lookupPatient(extractedData["dateOfBirth"]);
    if (!properDDNSearched) {
        console.log("[pdfParser] DDN non trouvée, arrêt de la procédure.");
        return; // Ici c'est un échec complet, la procédure s'arrête pour de bon.
    }
    console.log("[pdfParser] DDN présente, on continue à chercher le patient.");

    // Clic sur le patient pertinent dans la liste trouvée (ou on arrête si le bon patient est déjà sélectionné)
    if (!clicPatient(extractedData)) {return;}

    // Intégration des données dans le formulaire d'import
    setExtractedDataInForm(extractedData);

    // Marquage des données comme déjà importées
    // markDataAsImported(hashId, extractedData); // TODO : décommenter pour activer le marquage des données
}



// // Fonctions utilitaires
// marque les données comme déjà importées
function markDataAsImported(hashId, extractedData) {
    extractedData.alreadyImported = true;
    let extractedDataStr = JSON.stringify(extractedData);
    sessionStorage.setItem(hashId, extractedDataStr);
}


// Application des données extraites dans les zones adaptées
function setExtractedDataInForm(extractedData) {
    // Récupère la ligne d'action actuelle
    const ligneAction = actualActionLine();

    // Sélecteurs pour les champs du formulaire
    const selectors = {
        documentDate: `#ContentPlaceHolder1_FileStreamClassementsGrid_EditBoxGridFileStreamClassementDate_${ligneAction}`,
        documentType: `#ContentPlaceHolder1_FileStreamClassementsGrid_DropDownListGridFileStreamClassementEvenementType_${ligneAction}`,
        title: `#ContentPlaceHolder1_FileStreamClassementsGrid_EditBoxGridFileStreamClassementTitre_${ligneAction}`
    };

    // Récupère les éléments du DOM correspondant aux sélecteurs
    const inputs = {
        documentDate: document.querySelector(selectors.documentDate),
        documentType: document.querySelector(selectors.documentType),
        title: document.querySelector(selectors.title)
    };

    // Données à insérer dans les champs du formulaire
    const fields = {
        documentDate: extractedData.documentDate,
        documentType: extractedData.documentType,
        title: extractedData.Title
    };

    // Parcourt chaque champ et met à jour la valeur si elle existe
    Object.keys(fields).forEach(key => {
        if (fields[key] && inputs[key]) {
            inputs[key].value = fields[key];
            // Déclenche un événement de changement pour chaque champ mis à jour
            inputs[key].dispatchEvent(new Event('change'));
        }
    });
}

// Clic sur le patient trouvé
function clicPatient(extractedData) {
    let patientToClick = searchProperPatient(getPatientsList(), extractedData["nameMatches"]);
    let patientToClickName = patientToClick.innerText;
    if (patientToClickName === selectedPatientName()) {
        // Ici le bon patient est déjà sélectionné pour import.
        // On en déduis que la procédure a déjà aboutie et qu'il faut s'arrêter.
        console.log("[pdfParser] Patient déjà sélectionné, arrêt de la recherche.");
        return false;
    } else {
        let patientToClicSelector = "#" + patientToClick.id;
        console.log("[pdfParser] Patient à sélectionner :", patientToClickName, patientToClick);
        // patientToClick.click(); => ne fonctionne pas à cause du CSP en milieu ISOLATED
        clicCSPLockedElement(patientToClicSelector);
        return true;
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
 *     isUserRejected: false
 * }
 */
function completeExtractedData(extractedData, dataMatrixReturn) {
    extractedData.actionLine = actualActionLine();
    extractedData.alreadyImported = false;
    extractedData.isUserRejected = false;
    if (dataMatrixReturn) {
        extractedData.dataMatrix = dataMatrixReturn;
        extractedData.dateOfBirth = dataMatrixReturn.DateNaissance;
        extractedData.nameMatches = [dataMatrixReturn.Nom + dataMatrixReturn.Prenoms.split(' ')[0]];
    }
}

// Vérifie si les données d'un pdf ont déjà été extraites
function checkAlreadyExtractedData(hashId) {
    const alreadyExtractedData = JSON.parse(sessionStorage.getItem(hashId));
    console.log('[pdfParser] alreadyExtractedData', alreadyExtractedData);
    const alreadyImported = alreadyExtractedData ? alreadyExtractedData.alreadyImported : false;
    return { alreadyExtractedData, alreadyImported };
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
    let idPatientSelected = idPatientSelectedBaseId + actualActionLine();
    // On cherche son nom dans l'innerText
    let patientSelectedElement = document.querySelector(idPatientSelected);
    let patientSelectedName = patientSelectedElement.innerText;
    console.log('[pdfParser] patientSelectedName', patientSelectedName);
    return patientSelectedName;
}


// Recherche du patient dans la base de données via la date de naissance
function lookupPatient(dateOfBirth) {
    if (!dateOfBirth) {
        console.log("[pdfParser] Pas de date de naissance trouvée. Arrêt de la recherche de patient.");
        return null;
    }
    // D'abord il nous faut sélectionner "Naissance" dans le menu déroulant "#ContentPlaceHolder1_FindPatientUcForm2_DropDownListRechechePatient"
    const dropDownResearch = document.querySelector("[id^='ContentPlaceHolder1_FindPatientUcForm'][id$='_DropDownListRechechePatient']");
    console.log('[pdfParser] dropDownResearch', dropDownResearch);
    // Valeur actuelle
    const currentDropDownValue = dropDownResearch.value;
    if (currentDropDownValue !== "Naissance") {
        dropDownResearch.value = "Naissance";
        dropDownResearch.dispatchEvent(new Event('change'));
        return null;
    }

    // On vérifie que le champ de recherche de DDN est bien apparu
    const inputResearch = document.querySelector("[id^='ContentPlaceHolder1_FindPatientUcForm'][id$='_TextBoxRecherchePatientByDate']");
    if (!inputResearch) {
        console.log("[pdfParser] Champ de recherche de date de naissance non trouvé. Arrêt de la recherche de patient.");
        // On va remettre le menu déroulant à une autre valeur par exemple "Nom"
        dropDownResearch.value = "Nom";
        dropDownResearch.dispatchEvent(new Event('change'));
        // La page est rafraichie par ce changement, on arrête là
        return null;
    }
    // On remplit le champ de recherche avec la date de naissance si elle n'est pas déjà renseignée

    console.log('[pdfParser] inputResearch', inputResearch);
    const valeurActuelle = inputResearch.value;
    if (valeurActuelle === dateOfBirth) {
        return true;
    } else {
        inputResearch.value = dateOfBirth;
        // On clique sur le bouton de recherche ContentPlaceHolder1_FindPatientUcForm2_ButtonRecherchePatient
        const searchButton = document.querySelector("[id^='ContentPlaceHolder1_FindPatientUcForm'][id$='_ButtonRecherchePatient']");
        searchButton.click();
        return false;
    }
}




// Récupérer la meta-ligne d'action actuelle
function actualActionLine() {
    const ligneSelectionne = document.querySelector(".grid-selecteditem");
    // On cherche ContentPlaceHolder1_FileStreamClassementsGrid_LinkButtonFileStreamClassementsGridPatientNom_0 mais le 0 est variable jusqu'à 9
    let patientADefinirElement = ligneSelectionne.querySelector("[id^='ContentPlaceHolder1_FileStreamClassementsGrid_LinkButtonFileStreamClassementsGridPatientNom_']");
    // de là on récupère le dernier chiffre de l'id de l'élément
    let numeroDeLigne = patientADefinirElement.id.match(/\d+$/)[0];
    return numeroDeLigne;
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
                console.log('[pdfParser] url', url);

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
        console.log("Extracting page" + i + "/" + maxPages);
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        const textItems = textContent.items;

        let fullText = await extractLines(textItems);
        pagePromises.push(fullText);
    }

    const allPageTexts = await Promise.all(pagePromises);
    const fullText = allPageTexts.join('\n');

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
            /[0-9]{2}[\/|-][0-9]{2}[\/|-][0-9]{4}/g // Match dates dd/mm/yyyy ou dd-mm-yyyy
        ],
        dateOfBirthRegexes: [
            /(?:né\(e\) le|date de naissance:|date de naissance :|née le)[\s\S]([0-9]{2}[\/|-][0-9]{4})/gi // Match la date de naissance
        ],
        nameRegexes: [
            /(?:Mme|Madame|Monsieur|M\.) (.*?)(?: \(| né| - né)/gi, // Match pour les courriers, typiquement "Mr. XXX né le"
            /(?:Nom de naissance : |Nom : |Nom de naiss\.: )(.*?)(?:\n|$)/gim, // Match pour les CR d'imagerie, typiquement "Nom : XXX \n" ou "Nom : XXX"
            /(?<=(?:MME|Mme)\s+)([A-Z\s]+)(?=\s|$)/g, // Match pour les courriers, typiquement "Mme XXX"
            /([A-Z]+[a-z]+)(?:\s)?Né(?:e)? le/g,  // Support des deux genres "Né le" et "Née le"
            /_?Nom\s*d[e']\s*(?:usage|naissance)\s*([A-Z]+)/g, // Nom de naissance ou nom d'usage avec ou sans espace
            /Enfant ([A-Z\s]+)(?:\s|$)/g,  // Modification pour capturer plusieurs mots majuscules
            /(?:née|né)\s+([A-Z][A-Za-z]+\s+[A-Z][A-Za-z]+)(?=\s+le)/g, // Match pour les courriers, typiquement "né XXX XXX le"
            /Nometprénomdenaissance:([A-Z]+[a-z]+)/g, // Match pour les courriers, typiquement "Nometprénomdenaissance: XXX"
        ],
        documentDateRegexes: [
            /, le (\d{2}[\/-]\d{2}[\/-]\d{4})/gi // Match pour les dates dans les courriers
        ]
    };

    // Extraction de l'ensemble des dates présentes dans le texte
    const dateMatches = extractDates(fullText, regexPatterns.dateRegexes);
    // Extraction des éléments pertinents
    const documentDate = determineDocumentDate(fullText, dateMatches, regexPatterns.documentDateRegexes);
    const dateOfBirth = determineDateOfBirth(fullText, dateMatches, regexPatterns.dateOfBirthRegexes);
    const nameMatches = extractNames(fullText, regexPatterns.nameRegexes);
    const documentType = determineDocumentType(fullText);

    let extractedData = {
        documentDate: documentDate ? formatDate(documentDate) : null,
        dateOfBirth: dateOfBirth ? formatDate(dateOfBirth) : null,
        nameMatches: nameMatches,
        documentType: documentType
    };
    return extractedData;
}

// Extraction du datamatrix des pages du PDF
async function extractDatamatrixFromPDF(pdfUrl) {
    const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
    const pagesToCheck = [1, pdf.numPages]; // Vérifie la première et la dernière page

    for (const pageNum of pagesToCheck) {
        const page = await pdf.getPage(pageNum);
        const pageData = await extractDatamatrixFromPage(page);
        if (pageData) {
            return pageData;
        }
    }

    return null;
}

async function renderPageToCanvas(PDFpage) {
    const viewport = PDFpage.getViewport({ scale: 1 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await PDFpage.render({ canvasContext: context, viewport: viewport }).promise;

    return canvas;
}

function generateBinaryBitmap(canvas) {
    const luminanceSource = new ZXing.HTMLCanvasElementLuminanceSource(canvas, false);
    const hybridBinarizer = new ZXing.HybridBinarizer(luminanceSource);
    return new ZXing.BinaryBitmap(hybridBinarizer);
}

function generateHints() {
    const hints = new Map();
    // const formats = [ZXing.BarcodeFormat.QR_CODE, ZXing.BarcodeFormat.DATA_MATRIX/*, ...*/]; // TODO : évaluer les types nécessaires
    const formats = [ZXing.BarcodeFormat.DATA_MATRIX/*, ...*/]; // Pour l'instant uniquement les datamatrix
    hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);
    return hints;
}

async function extractDatamatrixFromPage(PDFpage) {
    // Rendu de la page du PDF dans un canvas (objet HTML obligatoire pour ZXing)
    const canvas = await renderPageToCanvas(PDFpage);
    // Création d'un lecteur de code-barres, nécessite de sélectionner un reader, des hints et un binaryBitmap
    const hints = generateHints();
    const reader = new ZXing.MultiFormatReader();
    const binaryBitmap = generateBinaryBitmap(canvas);
    // Appeler la fonction pour visualiser le binaryBitmap, aide au débug
    visualizeBinaryBitmap(binaryBitmap);
    // Décodage du binaryBitmap
    try {
        const result = reader.decode(binaryBitmap, hints);
        let formattedResult = null;
        if (result) {
            formattedResult = formatDecodeResult(result);
        }
        console.log('[pdfParser] formattedResult', formattedResult);
        return formattedResult;
    } catch (error) {
        console.warn('[pdfParser] Error decoding barcode:', error);
        return null;
    }
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
function formatDecodeResult(result) { // TODO : reprendre ici pour formater les données du datamatrix
    // et ne renvoyer que les données pertinentes dans un format plus lisible
    // Par exemple {"Prénom": "Jean Paul", "Nom": "Dupont", "Date de naissance": "01/01/1970", "NIR": "1234567890123"} etc.
    const formattedResult = {
        text: result.getText(),
        rawBytes: Array.from(result.getRawBytes()),
        numBits: result.getNumBits(),
        resultPoints: result.getResultPoints().map(point => ({ x: point.getX(), y: point.getY() })),
        format: result.getBarcodeFormat(),
        timestamp: Date.now(),
        resultMetadata: result.getResultMetadata()
    };

    // Split the text into relevant parts
    const textParts = formattedResult.text.split('\u001d');
    formattedResult.parsedText = {
        INS: textParts[0],
        OID: textParts[1],
        Prenoms: textParts[2],
        Nom: textParts[3],
        Sexe: textParts[4],
        DateNaissance: textParts[5],
        CodeLieuNaissance: textParts[6]
    };

    // Convertir la date de naissance en objet Date
    const dateParts = formattedResult.parsedText.DateNaissance.split('-');
    const dateOfBirth = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
    formattedResult.parsedText.DateNaissance = dateOfBirth;

    return {
        INS: formattedResult.parsedText.INS,
        OID: formattedResult.parsedText.OID,
        Prenoms: formattedResult.parsedText.Prenoms,
        Nom: formattedResult.parsedText.Nom,
        Sexe: formattedResult.parsedText.Sexe,
        DateNaissance: formattedResult.parsedText.DateNaissance,
        CodeLieuNaissance: formattedResult.parsedText.CodeLieuNaissance
    };
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
    console.log(dataUrl);
}

// Détermination du type de courrier
function determineDocumentType(fullText) {
    const documentTypes = {
        "Courrier": ["Chère Consœur", "chère consoeur", "Cher confrère", "courrier", "lettre"],
        "Compte Rendu": ["compte rendu", "rapport"],
        "IMAGERIE": ["imagerie", "radiographie", "scanner", "IRM"],
        "CRO/CRH": ["cro", "crh"],
        "Administratif": [],
        "Arrêt de travail": ["arrêt de travail", "congé maladie"],
        "Biologie": ["biologie", "analyse sanguine"],
        "Bon de transport": ["bon de transport", "transport médical"],
        "Certificat": ["certificat", "attestation"],
        "ECG": ["ecg", "électrocardiogramme"],
        "EFR": ["efr", "exploration fonctionnelle respiratoire"],
        "LABORATOIRE/BIO": ["laboratoire", "bio"],
        "MT": ["mt", "médecine du travail"],
        "Ordonnance": ["ordonnance", "prescription"],
        "PARAMEDICAL": ["paramédical", "soins"],
        "SPECIALISTE": ["spécialiste", "consultation spécialisée"],
        "Consultation": ["consultation", "visite médicale"],
    };

    for (const [type, keywords] of Object.entries(documentTypes)) {
        for (const keyword of keywords) {
            if (fullText.toLowerCase().includes(keyword.toLowerCase())) {
                // console.log('[pdfParser] type de document trouvé', type);
                return type;
            }
        }
    }

    return null;
}

// Extraction des dates du texte
function extractDates(fullText, dateRegexes) {
    let matches = [];
    for (const regex of dateRegexes) {
        matches = matches.concat(fullText.match(regex) || []);
    }
    return matches;
}

// Fonction auxiliaire pour chercher directement la date dans le texte
function findDateInText(fullText, dateRegexes) {
    console.log('[pdfParser] fullText', fullText);
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
function determineDocumentDate(fullText, dateMatches, documentDateRegexes) {
    let documentDate = null;
    // On cherche la date la plus récente, ce qui correspond souvent à la date du document
    for (const date of dateMatches) {
        const processedDate = parseDate(date); // On convertit la date en objet Date
        if (!documentDate || documentDate < processedDate) {
            documentDate = processedDate;
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
        const processedDate = parseDate(date); // On convertit la date en objet Date
        if (!dateOfBirth || dateOfBirth > processedDate) {
            dateOfBirth = processedDate;
        }
    }
    // Mais on peut aussi chercher directement la date de naissance
    const directDate = findDateInText(fullText, dateOfBirthRegexes);
    if (directDate) {
        dateOfBirth = directDate;
    }

    return dateOfBirth;
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

function parseDate(dateString) {
    const parts = dateString.split(/[\/-]/);
    return new Date(parts[2], parts[1] - 1, parts[0]);
}

function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Fonction de hachage personnalisée pour générer un identifiant unique à partir du texte du PDF
// Assez basique, mais largement suffisant pour nos besoins
function customHash(str) {
    const FNV_PRIME = 0x01000193;
    const FNV_OFFSET_BASIS = 0x811c9dc5;

    let hash = FNV_OFFSET_BASIS;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = (hash * FNV_PRIME) >>> 0; // Convert to 32bit unsigned integer
    }
    return hash.toString(16); // Return as hexadecimal string
}