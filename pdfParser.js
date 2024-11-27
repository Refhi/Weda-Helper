(async () => { //Méthode détournée pour importer le module pdf.js https://stackoverflow.com/questions/48104433/how-to-import-es6-modules-in-content-script-for-chrome-extension
    const pdfjsLib = await import(chrome.runtime.getURL("pdf.mjs"));
    pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("pdf.worker.mjs");
})();


lightObserver("#ContentPlaceHolder1_ViewPdfDocumentUCForm1_iFrameViewFile", foundPDF, parentElement = document);

function foundPDF(elements) {

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
                if (!documentDate) {
                    documentDate = moment(dateMatch[i], "DD/MM/YYYY");
                }
                if (documentDate < moment(dateMatch[i], "DD/MM/YYYY")) { // On choisit la date la plus grande car c'est la date de l'examen (date de prescription et DDN sont inférieures)
                    documentDate = moment(dateMatch[i], "DD/MM/YYYY");
                }

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

    });
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