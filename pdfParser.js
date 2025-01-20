/** pdfParser est un script qui permet d'extraire les informations d'un PDF et de les insérer dans les fenêtres d'import.
 * En premier lieu on va travailler sur https://secure.weda.fr/FolderMedical/UpLoaderForm.aspx mais il a vocation à être généralisé.
 * 
 */

// On commence par charger la lib pdf.mjs
// (pdf-lib ne permet pas la lecture du texte présent dans un PDF)
(async () => { //Méthode détournée pour importer le module pdf.js https://stackoverflow.com/questions/48104433/how-to-import-es6-modules-in-content-script-for-chrome-extension
    const pdfjsLib = await import(chrome.runtime.getURL("lib/pdf.mjs"));
    pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("lib/pdf.worker.mjs");
})();

// Structure :
// 1. Utilisation de l'addTweak pour déclencher l'injection du script
addTweak('/FolderMedical/UpLoaderForm.aspx', 'autoPdfParser', function () {
    // 2. Attente de l'apparition de l'iframe contenant le PDF
    // Les sélecteurs des pages de UpLoaderForm.aspx peuvent être :
    // ContentPlaceHolder1_ViewPdfDocumentUCForm2_iFrameViewFile ou ContentPlaceHolder1_ViewPdfDocumentUCForm1_iFrameViewFile
    // TODO : peut-être privilégier un bouton à côté de "Patient à définir" pour lancer le script ?
    waitForElement({
        selector: "[id^='ContentPlaceHolder1_ViewPdfDocumentUCForm'][id$='_iFrameViewFile']",
        callback: processFoundPdfIframe
    });
});


// A partir de là la procédure suis un enchainement de "roll-over" :
// - il regarde a chaque étape si les données sont déjà présentes
// - si elles ne le sont pas, il effectue l'étape demandée, ce qui déclenche un rafrachissement de la page
// - sinon elles le sont, il passe donc à l'étape suivante
// - et ainsi de suite jusqu'à la fin de la procédure


// 3. Extraction du texte du PDF
async function processFoundPdfIframe(elements) {
    let urlPDF = await findPdfUrl(elements);
    console.log('[pdfParser] urlPDF', urlPDF);
    if (!urlPDF) {
        console.error("[pdfParser] l'url du PDF n'a pas été trouvée. Arrêt de l'extraction.");
        return;
    }

    let fullText = await extractTextFromPDF(urlPDF);
    console.log('[pdfParser] fullText', fullText);
    // 4. Analyse du texte pour en extraire les informations pertinentes
    let extractedData = extractRelevantData(fullText);

    // 5. Création d'un id unique à partir d'un hash de fullText
    let hashId = customHash(fullText);
    console.log('[pdfParser] hashId', hashId);

    // 5.1. On vérifie si des données ont déjà été extraites pour ce PDF
    const alreadyExtractedData = JSON.parse(sessionStorage.getItem(hashId));
    console.log('[pdfParser] alreadyExtractedData', alreadyExtractedData);
    const alreadyImported = alreadyExtractedData ? alreadyExtractedData.alreadyImported : false; 
    console.log('[pdfParser] alreadyImported', alreadyImported);

    if (alreadyImported) {
        console.log("[pdfParser] Données déjà extraites pour ce PDF. Arrêt de la procédure.");
        return;
    } else {
        console.log("[pdfParser] Données non extraites pour ce PDF. Poursuite de la procédure.");
    }

    // 6. Stockage des informations pertinentes dans sessionStorage
    // Ajouter à extractedData l'identifiant de la ligne d'action actuelle
    extractedData.actionLine = actualActionLine();
    extractedData.alreadyImported = false;
    extractedData.isUserRejected = false;
    let extractedDataStr = JSON.stringify(extractedData);
    console.log('[pdfParser] extractedData', extractedDataStr);
    sessionStorage.setItem(hashId, extractedDataStr);
    // On obtiens un objet du type :
    // {
    //     documentDate: "01/01/2021",
    //     dateOfBirth: "01/01/2021",
    //     nameMatches: ["DUPONT Jean", "DUPONT Jeanne"],
    //     actionLine: "0",
    //     alreadyImported: false,
    //     isUserRejected: false
    // }

    // 7. Recherche du patient pertinent dans la base de données via la date de naissance si elle est présente
    // 7.1 On lance la recherche par DDN
    let properDDNSearched = lookupPatient(extractedData["dateOfBirth"]);
    if (!properDDNSearched) {
        console.log("[pdfParser] DDN non trouvée, arrêt pour cette fois.");
        return; // Ici c'est un échec complet, la procédure s'arrête pour de bon.
    }
    console.log("[pdfParser] DDN présente, on continue à chercher le patient.");
    
    // 7.2. On clique sur le bon patient s'il est présent sans ambiguïté et qu'il n'est pas déjà sélectionné
    let patientElements = getPatientsList();
    console.log('[pdfParser] patientElements', patientElements);
    let nameMatches = extractedData["nameMatches"];
    let patientToClick = searchProperPatient(patientElements, nameMatches);
    let patientToClickName = patientToClick.innerText;
    if (patientToClickName === selectedPatientName()) {
        // Ici le bon patient est déjà sélectionné.
        // On en déduis que la procédure a déjà aboutie et qu'il faut s'arrêter.
        console.log("[pdfParser] Patient déjà sélectionné, arrêt de la recherche.");
        return;
    } else {
        let patientToClicSelector = "#" + patientToClick.id;
        console.log("[pdfParser] Patient à sélectionner :", patientToClickName, patientToClick);
        // patientToClick.click(); => ne fonctionne pas à cause du CSP en milieu ISOLATED
        clicCSPLockedElement(patientToClicSelector);
    }   


    // 8. Intégration des données dans le formulaire d'import, avec possibilité de les corriger par l'utilisateur
    useExtractedData("documentDate", extractedData["documentDate"]);

    // 9. Marquage des données comme déjà importées
    extractedData.alreadyImported = true;
    extractedDataStr = JSON.stringify(extractedData);
    sessionStorage.setItem(hashId, extractedDataStr);
    

    // si besoin sans se faire écraser les données par le script
}



// // Fonctions utilitaires
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
        let patientName = patientElement.innerText;
        if (nameMatches.includes(patientName)) {
            return patientElement;
        }
    }

    // Deuxième passe : chercher chaque mot indépendamment
    for (let i = 0; i < patientElements.length; i++) {
        let patientElement = patientElements[i];
        let patientName = patientElement.innerText;
        for (let j = 0; j < nameMatches.length; j++) {
            let nameParts = nameMatches[j].split(' ');
            for (let k = 0; k < nameParts.length; k++) {
                if (patientName.includes(nameParts[k])) {
                    return patientElement;
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



// Application des données extraites dans les zones adaptées
function useExtractedData(dataLocation, dataToUse) {
    let dictInputZones = {
        "documentDate": "#ContentPlaceHolder1_FileStreamClassementsGrid_EditBoxGridFileStreamClassementDate_",
        "researchField": "[id^='ContentPlaceHolder1_FindPatientUcForm'][id$='_TextBoxRecherche']",
        "titleField": "#ContentPlaceHolder1_FileStreamClassementsGrid_EditBoxGridFileStreamClassementTitre_",
        "classificationTarget": "#ContentPlaceHolder1_FileStreamClassementsGrid_DropDownListGridFileStreamClassementEvenementType_",
        "classificationType": "#ContentPlaceHolder1_FileStreamClassementsGrid_DropDownListGridFileStreamClassementLabelClassification_",
    };
    const ligneAction = actualActionLine();
    let inputSelector = dictInputZones[dataLocation] + ligneAction;
    let inputElement = document.querySelector(inputSelector);
    let valeurActuelle = inputElement.value;
    if (valeurActuelle === dataToUse) {
        return;
    } else {
        inputElement.value = dataToUse;
        inputElement.dispatchEvent(new Event('change'));
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
        return null;
    }


    return new Promise((resolve, reject) => {
        let intervalId = setInterval(() => {
            let url = iframe.contentWindow.location.href;
            console.log('[pdfParser] url', url);

            if (url !== 'about:blank' && url !== null) {
                clearInterval(intervalId);
                resolve(url);
            }
        }, 100);

        setTimeout(() => {
            clearInterval(intervalId);
            reject(new Error('Timeout: PDF URL not found'));
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
function extractRelevantData(fullText) {
    const regexPatterns = {
        dateRegexes: [
            /[0-9]{2}[\/|-][0-9]{2}[\/|-][0-9]{4}/g // Match dates dd/mm/yyyy ou dd-mm-yyyy
        ],
        dateOfBirthRegexes: [
            /(?:né\(e\) le|date de naissance:|date de naissance :|née le)[\s\S]([0-9]{2}[\/|-][0-9]{2}[\/|-][0-9]{4})/gi // Match la date de naissance
        ],
        nameRegexes: [
            /(?:Mme|Madame|Monsieur|M\.) (.*?)(?: \(| né| - né)/gi, // Match pour les courriers, typiquement "Mr. XXX né le"
            /(?:Nom de naissance : |Nom : |Nom de naiss\.: )(.*?)(?:\n|$)/gim // Match pour les CR d'imagerie, typiquement "Nom : XXX \n" ou "Nom : XXX"
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

    return {
        documentDate: documentDate ? formatDate(documentDate) : null,
        dateOfBirth: dateOfBirth ? formatDate(dateOfBirth) : null,
        nameMatches: nameMatches
    };
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
        console.log('[pdfParser] regex', regex);
        const matches = fullText.matchAll(regex);
        for (const match of matches) {
            if (match[1]) {
                console.log('[pdfParser] date trouvée', match[1]);
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
        console.log('[pdfParser] directDate trouvée pour la date du document', directDate);
        documentDate = directDate;
    } else {
        console.log('[pdfParser] directDate non trouvée pour la date du document');
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
        console.log('[pdfParser] directDate trouvée pour la DDN', directDate);
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