(async () => { //Méthode détournée pour importer le module pdf.js https://stackoverflow.com/questions/48104433/how-to-import-es6-modules-in-content-script-for-chrome-extension
    const pdfjsLib = await import(chrome.runtime.getURL("lib/pdf.mjs"));
    pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("lib/pdf.worker.mjs");
})();


waitForElement({selector:"#ContentPlaceHolder1_ViewPdfDocumentUCForm1_iFrameViewFile", callback:findPDF});

function findPDF(elements) {

    let iframe = elements[0];

    // Obtenez l'URL du document dans l'iframe
    let intervalId = setInterval(() => {
        let url = iframe.contentWindow.location.href;
        console.log('url', url);

        if (url !== 'about:blank') {
            clearInterval(intervalId);
            parsePDF(url);
        }
    }, 100);

    setTimeout(() => {
        clearInterval(intervalId);
    }, 5000);
}

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


function parsePDF(url) {

    extractTextFromPDF(url).then(fullText => {
        // console.log(fullText)
        var firstName;
        var documentDate;
        var dateOfBirth;
        var dateRegex = /[0-9]{2}[\/|-][0-9]{2}[\/|-][0-9]{4}/g; // Match dates dd/mm/yyyy ou dd-mm-yyyy
        var dateOfBirthRegex = /(?:né\(e\) le|date de naissance:|date de naissance :|née le)[\s\S]([0-9]{2}[\/|-][0-9]{2}[\/|-][0-9]{4})/i; //Match la date de naissance
        var firstNameRegex = /(?:Mme|Madame|Monsieur|M\.) (.*?)(?: \(| né| - né)/gi; // Match pour les courriers, typiquement "Mr. XXX né le"
        var backupFirstNameRegex = /(?:Nom de naissance : |Nom : |Nom de naiss\.: )(.*?)\n/gim; // Match pour les CR d'imagerie, typiquement "Nom : XXX \n"
        let dateMatch = fullText.match(dateRegex);
        // console.log(dateMatch);
        if (dateMatch) {
            for (var i = 0; i < dateMatch.length; i++) {
                if (!dateOfBirth) {
                    dateOfBirth = moment(dateMatch[i], "DD/MM/YYYY");
                }
                if (!documentDate) {
                    documentDate = moment(dateMatch[i], "DD/MM/YYYY");
                }
                if (documentDate < moment(dateMatch[i], "DD/MM/YYYY")) { // On choisit la date la plus grande car c'est la date de l'examen (date de prescription et DDN sont inférieures)
                    documentDate = moment(dateMatch[i], "DD/MM/YYYY");
                }
                if (dateOfBirth > moment(dateMatch[i], "DD/MM/YYYY")) {
                    dateOfBirth = moment(dateMatch[i], "DD/MM/YYYY");
                }

            }

            if (dateOfBirth == documentDate){
                dateOfBirth == null;
            }

            console.log("Found date: " + documentDate.format("DD/MM/YYYY"));
            let dateElement = document.querySelector('tr.grid-selecteditem input[title="Date du document"]');
            dateElement.value = documentDate.format("DD/MM/YYYY");
        }

        let dateOfBirthMatch = fullText.match(dateOfBirthRegex);
        if (dateOfBirthMatch) {
          dateOfBirth = moment(dateOfBirthMatch[1], "DD/MM/YYYY"); //On récupére le groupe du Regex

          console.log("Found date of birth: " + dateOfBirth.format("DD/MM/YYYY"));
        }


        var nameMatchesIterator = fullText.matchAll(firstNameRegex);
        var nameMatches = Array();
        for (const match of nameMatchesIterator) {
            // console.log(match);
            nameMatches.push(match[1]);
        }

        if (nameMatches.length == 0) {
            nameMatchesIterator = fullText.matchAll(backupFirstNameRegex);
            for (const match of nameMatchesIterator) {
                nameMatches.push(match[1]);
            }
        }

        console.log("Found name: " + nameMatches);
        // var firstName = nameMatches[0].match(/\b[A-Z][A-Z]+/g)[0]; //Isole le nom de famille
        // console.log(firstName);
        let div = document.getElementById("extractedData");
        if (div) {
            document.remove(div);
        }

        var extractedDataDiv = document.createElement("div");
        extractetDataDive.setAttribute("id", "extracteddata")

        let content = document.createTextNode(`Date du document: ${documentDate.format("DD/MM/YYYY")} Date de naissance: ${dateOfBirth.format("DD/MM/YYYY")}`);
        extractedDataDiv.appendChild(content);
        let tableDiv = document.getElementById("ContentPlaceHolder1_UpdatePanelClassementGrid");
        tableDiv.parentNode.insertBefore(extractedDataDiv, tableDiv);
    });
}

function searchForDDN(date) {

    document.getElementById("ContentPlaceHolder1_FindPatientUcForm1_DropDownListRechechePatient").value = "Naissance" //On cherche par DDN

    let searchButton = document.getElementById('ContentPlaceHolder1_FindPatientUcForm1_ButtonRecherchePatient');
    var searchField = document.getElementById("ContentPlaceHolder1_FindPatientUcForm1_TextBoxRecherchePatientByDate");
    if(!searchField)
    {
      searchField = document.getElementById("ContentPlaceHolder1_FindPatientUcForm1_TextBoxRecherche");
    }

    if(searchField.value != dateOfBirth.format("DD/MM/YYYY")){
      searchField.value = dateOfBirth.format("DD/MM/YYYY");
      searchButton.click();
    }
    else {
      //On vérifie qu'il n'y a bien qu'un seul patient avec cette DDN
      let secondPatient = document.getElementById("ContentPlaceHolder1_FindPatientUcForm1_PatientsGrid_LinkButtonPatientGetNomPrenom_1") //Lien n°2 dans la liste de patient, s'il n'existe pas, il n'y a qu'un patient dans la liste de recherche
      if (!secondPatient)
      {
        let firstPatient = document.getElementById("ContentPlaceHolder1_FindPatientUcForm1_PatientsGrid_LinkButtonPatientGetNomPrenom_0");
        firstPatient.focus();
      }
    }

}

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