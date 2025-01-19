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
    waitForElement({
        selector: "[id^='ContentPlaceHolder1_ViewPdfDocumentUCForm'][id$='_iFrameViewFile']",
        callback: processFoundPdfIframe
    });
});


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
    extractedData = JSON.stringify(extractedData);
    console.log('[pdfParser] parsedData', extractedData);

    // 5. Création d'un id unique à partir d'un hash de fullText
    let hashId = customHash(fullText);
    console.log('[pdfParser] hashId', hashId);

    // 6. Stockage des informations dans sessionStorage
    sessionStorage.setItem(hashId, extractedData);

    // 7. Intégration des données dans le formulaire d'import, avec possibilité de les corriger par l'utilisateur
    useExtractedData(extractedData);

    // si besoin sans se faire écraser les données par le script
}



// // Fonctions utilitaires
// Application des données extraites dans les zones adaptées, si elle n'ont pas été modifiées par l'utilisateur
function useExtractedData(extractedData) {
    // Récupération des données extraites
    const data = JSON.parse(extractedData);
    console.log('[pdfParser] data', data);
}

    



// Renvoie l'URL du PDF de l'iframe quand elle est chargée 
async function findPdfUrl(elements) {
    let iframe = elements[0];
    console.log('[pdfParser] iframe trouvée', iframe);

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

    for (var i = 0; i < textItems.length; i++) { //Permet de reconnaitre les lignes dans le PDF
        if (currentLine != textItems[i].transform[5]) { //Si l'élément transform[5] qui correspond à la ligne dans le PDF a changé alors on retourne à la ligne
            if (currentLine != 0) {
                pageText += '\n';
            }

            currentLine = textItems[i].transform[5]
        }

        pageText += textItems[i].str;
    }
    return pageText;
}

// Extraction des informations pertinentes du texte du PDF
function extractRelevantData(fullText) {
    let documentDate;
    let dateOfBirth;
    let nameMatches = [];

    const dateRegex = /[0-9]{2}[\/|-][0-9]{2}[\/|-][0-9]{4}/g; // Match dates dd/mm/yyyy ou dd-mm-yyyy
    const dateOfBirthRegex = /(?:né\(e\) le|date de naissance:|date de naissance :|née le)[\s\S]([0-9]{2}[\/|-][0-9]{2}[\/|-][0-9]{4})/i; // Match la date de naissance
    const firstNameRegex = /(?:Mme|Madame|Monsieur|M\.) (.*?)(?: \(| né| - né)/gi; // Match pour les courriers, typiquement "Mr. XXX né le"
    const backupFirstNameRegex = /(?:Nom de naissance : |Nom : |Nom de naiss\.: )(.*?)\n/gim; // Match pour les CR d'imagerie, typiquement "Nom : XXX \n"

    const dateMatch = fullText.match(dateRegex);
    if (dateMatch) {
        for (let i = 0; i < dateMatch.length; i++) {
            const currentDate = parseDate(dateMatch[i]);
            if (!dateOfBirth) {
                dateOfBirth = currentDate;
            }
            if (!documentDate) {
                documentDate = currentDate;
            }
            if (documentDate < currentDate) { // On choisit la date la plus grande car c'est la date de l'examen (date de prescription et DDN sont inférieures)
                documentDate = currentDate;
            }
            if (dateOfBirth > currentDate) {
                dateOfBirth = currentDate;
            }
        }

        if (dateOfBirth.getTime() === documentDate.getTime()) {
            dateOfBirth = null;
        }
    }

    const dateOfBirthMatch = fullText.match(dateOfBirthRegex);
    if (dateOfBirthMatch) {
        dateOfBirth = parseDate(dateOfBirthMatch[1]); // On récupère le groupe du Regex
    }

    let nameMatchesIterator = fullText.matchAll(firstNameRegex);
    for (const match of nameMatchesIterator) {
        nameMatches.push(match[1]);
    }

    if (nameMatches.length === 0) {
        nameMatchesIterator = fullText.matchAll(backupFirstNameRegex);
        for (const match of nameMatchesIterator) {
            nameMatches.push(match[1]);
        }
    }

    return {
        documentDate: documentDate ? formatDate(documentDate) : null,
        dateOfBirth: dateOfBirth ? formatDate(dateOfBirth) : null,
        nameMatches: nameMatches
    };
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

// ---------------------- Toutes les parties ci-dessous ont vocation à être supprimées ----------------------
// => soit en les mettant ci-dessus dans la structure prévue
// => soit en les supprimant si elles ne sont pas nécessaires




function confirmAndFill(documentDate, dateOfBirth, nameMatches) { // TODO : non appelée, à évaluer
    // Prend les éléments et fait un log si non trouvé
    function getElement(selector) {
        const element = document.querySelector(selector);
        if (!element) {
            console.error(`Element not found: ${selector}`);
        }
        return element;
    }

    // Vérifie si un élément avec l'ID 'extractedData' existe déjà et le supprime
    let existingDiv = getElement("#extractedData");
    if (existingDiv) {
        existingDiv.remove();
    }

    // Création de l'interface de confirmation
    let extractedDataDiv = document.createElement("div");
    extractedDataDiv.setAttribute("id", "extractedData");

    // Validation des entrées : vérification de la date du document
    if (!documentDate || !(documentDate instanceof moment)) {
        console.error("Invalid or missing documentDate");
        alert("Erreur: La date du document est introuvable ou invalide");
        return;
    }

    // Validation des entrées : vérification des noms extraits du document
    if (!nameMatches || !Array.isArray(nameMatches) || nameMatches.length === 0) {
        console.error("No name found in the document");
        alert("Erreur: Aucun nom trouvé dans le document.");
        return;
    }

    // Création du contenu HTML pour afficher la confirmation
    let content = `
    <label>Date du document:</label> 
    <input type="text" id="confirmDocumentDate" value="${documentDate.format("DD/MM/YYYY")}" />
    <br/>
    <label>Date de naissance:</label> 
    <input type="text" id="confirmDateOfBirth" value="${dateOfBirth ? dateOfBirth.format("DD/MM/YYYY") : ''}" />
    <br/>
    <label>Noms trouvés:</label> 
    <select id="confirmName">
        ${nameMatches.map(name => `<option value="${name}">${name}</option>`).join('')}
    </select>
    <br/>
    <button id="confirmButton">Confirmer</button>
    `;
    extractedDataDiv.innerHTML = content;

    // Recherche de l'élément où l'interface doit être insérée
    let tableDiv = getElement("#ContentPlaceHolder1_UpdatePanelClassementGrid");
    if (!tableDiv) {
        alert("Erreur: L'élément cible pour insérer les données est introuvable");
        return;
    }
    // Insertion de l'interface de confirmation avant le tableau
    tableDiv.parentNode.insertBefore(extractedDataDiv, tableDiv);


    // Ajout d'un événement au bouton de confirmation
    let confirmButton = getElement("#confirmButton");
    if (confirmButton) {
        confirmButton.addEventListener("click", () => {
            try {
                // Récupération des valeurs confirmées
                let confirmedDocumentDate = getElement("#confirmDocumentDate").value;
                let confirmedDateOfBirth = getElement("#confirmDateOfBirth").value;
                let confirmedName = getElement("#confirmName").value;

                // Validation de la date du document
                if (!confirmedDocumentDate || !moment(confirmedDocumentDate, "DD/MM/YYYY", true).isValid()) {
                    alert("Erreur: La date du document confirmée est invalide.");
                    return;
                }

                // Validation de la date de naissance si elle est fournie
                if (confirmedDateOfBirth && !moment(confirmedDateOfBirth, "DD/MM/YYYY", true).isValid()) {
                    alert("Erreur: La date de naissance confirmée est invalide.");
                    return;
                }

                // Validation du nom confirmé
                if (!confirmedName) {
                    alert("Erreur: Aucun nom confirmé.");
                    return;
                }

                // Mise à jour de la valeur du champ 'Date du document' dans le formulaire
                let dateElement = getElement('tr.grid-selecteditem input[title="Date du document"]');
                if (dateElement) {
                    dateElement.value = confirmedDocumentDate;
                } else {
                    console.error("Date element not found in the form.");
                }

                // Si la date de naissance est confirmée, recherche du patient par DDN
                if (confirmedDateOfBirth) {
                    searchForDDN(moment(confirmedDateOfBirth, "DD/MM/YYYY"));
                }

                // Affichage des valeurs confirmées dans la console pour vérification
                console.log(`Confirmed Document Date: ${confirmedDocumentDate}`);
                console.log(`Confirmed Date of Birth: ${confirmedDateOfBirth}`);
                console.log(`Confirmed Name: ${confirmedName}`);
            } catch (error) {
                console.error("An error occurred during the confirmation process", error);
                alert("Une erreur inattendue s'est produite lors du processus de confirmation");
            }
        });
    } else {
        console.error("Confirmation button not found.");
    }
}




function searchForDDN(date) {

    document.getElementById("ContentPlaceHolder1_FindPatientUcForm1_DropDownListRechechePatient").value = "Naissance" //On cherche par DDN

    let searchButton = document.getElementById('ContentPlaceHolder1_FindPatientUcForm1_ButtonRecherchePatient');
    var searchField = document.getElementById("ContentPlaceHolder1_FindPatientUcForm1_TextBoxRecherchePatientByDate");
    if (!searchField) {
        searchField = document.getElementById("ContentPlaceHolder1_FindPatientUcForm1_TextBoxRecherche");
    }

    if (searchField.value != dateOfBirth.format("DD/MM/YYYY")) {
        searchField.value = dateOfBirth.format("DD/MM/YYYY");
        searchButton.click();
    }
    else {
        //On vérifie qu'il n'y a bien qu'un seul patient avec cette DDN
        let secondPatient = document.getElementById("ContentPlaceHolder1_FindPatientUcForm1_PatientsGrid_LinkButtonPatientGetNomPrenom_1") //Lien n°2 dans la liste de patient, s'il n'existe pas, il n'y a qu'un patient dans la liste de recherche
        if (!secondPatient) {
            let firstPatient = document.getElementById("ContentPlaceHolder1_FindPatientUcForm1_PatientsGrid_LinkButtonPatientGetNomPrenom_0");
            firstPatient.focus();
        }
    }

}