// [Page de Consultation]
// addTabsToIframe est appelé depuis keyCommands.js au moment où on injecte les raccourcis clavier via addShortcutsToIframe



function removeExceedingSpaces(iframe) {
    function removeSpacesFromElement(element) {
        // Si l'élément est un nœud de texte, remplacez les espaces insécables triples
        if (element.nodeType === 3) {
            element.nodeValue = element.nodeValue.replace(/\u00A0\u00A0\u00A0/g, "");
        } else if (element.nodeType === 1) { // Si l'élément est un nœud d'élément, parcourez ses enfants
            Array.from(element.childNodes).forEach(removeSpacesFromElement);
        }
    }

    // Commencez par le corps du document dans l'iframe
    removeSpacesFromElement(iframe.contentDocument.body);
}

function addTabsToIframe(scopeName, iframe, index, iframes) { // est appelé depuis keyCommands.js
    iframes = removeHistoryIframe(iframes);
    addHotkeyToDocument(scopeName, iframe.contentDocument, 'tab', function () {
        console.log('tab activé');
        removeExceedingSpaces(iframe);
        // focus on next iframe or specific element if it's the last iframe
        if (index + 1 < iframes.length) {
            recordMetrics({ clicks: 1, drags: 1 });
            iframes[index + 1].focus();
        } else {
            // Si c'est le dernier iframe, mettre le focus sur l'élément spécifié
            console.log('focus sur le premier élément de suivi');
            document.querySelector('#ContentPlaceHolder1_SuivisGrid_EditBoxGridSuiviReponse_0').focus();
        }
    });

    addHotkeyToDocument(scopeName, iframe.contentDocument, 'shift+tab', function () {
        console.log('shift+tab activé');
        removeExceedingSpaces(iframe);
        // focus on previous iframe or specific element if it's the first iframe
        if (index - 1 >= 0) {
            recordMetrics({ clicks: 1, drags: 1 });
            iframes[index - 1].focus();
        } else {
            // Si c'est le premier iframe, mettre le focus sur l'élément spécifié
            document.querySelector('#TextBoxDocumentTitre').focus();
        }
    });
}

addTweak('/FolderMedical/ConsultationForm.aspx', 'TweakTabConsultation', function () {
    let titleElement = document.querySelector('#TextBoxEvenementTitre');
    titleElement.tabIndex = 1;
    let subTitleElement = document.querySelector('#TextBoxDocumentTitre');
    subTitleElement.tabIndex = 2;

    var iframes = document.querySelectorAll('iframe');
    iframes = removeHistoryIframe(iframes); // retirer les iframes d'historique qui n'on pas besoin de navigation par tabulation
    let iframeTextNumber = iframes.length;
    // On va attribuer un tabIndex aux iframes de début et de fin seulement
    // puisque les autres sont naviguées via un système custom d'écoute des tab et shift+tab
    let firstIframe = iframes[0];
    firstIframe.tabIndex = 3;
    let lastIframe = iframes[iframes.length - 1];
    lastIframe.tabIndex = 4; 



    // Modifier l'ordre de tabulation des valeurs de suivi    
    function changeTabOrder(elements) {
        console.log('changeTabOrder started');
        for (var i = 0; i < elements.length; i++) {
            elements[i].tabIndex = i + 1 + 4; // pour sauter les 4 premiers champs attribués plus haut
        }
    }


    waitForElement({
        selector: '[id^="ContentPlaceHolder1_SuivisGrid_EditBoxGridSuiviReponse_"]',
        callback: function (elements) {
            changeTabOrder(elements)
            console.log('ConsultationFormTabOrderer started');
            // ici aussi les métriques sont difficiles à évaluer. Si on considère environs
            // 2 éléments par consultation, on peut estimer en gros à 1 clic + 1 drag par consultation
            recordMetrics({ clicks: 1, drags: 1 });
        }
    });
});

addTweak('/FolderMedical/ConsultationForm.aspx', 'FocusOnTitleInConsultation', function () {
    let titleElement = document.querySelector('#TextBoxEvenementTitre');
    afterMutations({
        delay: 300, callBackId: 'FocusOnTitleInConsultation',
        callback: function () {
            titleElement.focus();
        }
    });
    recordMetrics({ clicks: 1, drags: 1 });
});

// l'age
function ageCalculated() {
    let birthdateElement = document.querySelector('span[title^="Patient"]');
    let birthdateString = birthdateElement.title.split(' ')[3];
    let birthdate = new Date(birthdateString.split('/').reverse().join('-'));
    let ageDiff = Date.now() - birthdate.getTime();
    let ageDate = new Date(ageDiff);
    let age = Math.abs(ageDate.getUTCFullYear() - 1970);
    return age;
}

function genderCalculated() {
    return document.querySelector('[title="Sexe féminin"]') ? 'F' :
        (document.querySelector('[title="Sexe masculin"]') ? 'M' : undefined);
}


addTweak('/FolderMedical/ConsultationForm.aspx', '*CourbesPediatriques', function () {
    // Afficher en overlay une image issue d'une URL en cas de survol de certains éléments
    // Récupérer la liste des éléments présents dans le suivi
    let courbesPossibles = {
        "Taille-Poids : 3 ans": { "TC": "10", "Question": "Taille", "Genre": "F", "AgeMin": 0, "AgeMax": 2 },
        "Taille-Poids : 3 ans (M)": { "TC": "11", "Question": "Taille", "Genre": "M", "AgeMin": 0, "AgeMax": 2 },
        "P.crânien : 5 ans": { "TC": "12", "Question": "Pc", "Genre": "F", "AgeMin": 0, "AgeMax": 4 },
        "P.crânien : 5 ans (M)": { "TC": "13", "Question": "Pc", "Genre": "M", "AgeMin": 0, "AgeMax": 4 },
        "Taille-Poids : 18 ans": { "TC": "14", "Question": "Taille", "Genre": "F", "AgeMin": 3, "AgeMax": 18 },
        "Taille-Poids : 18 ans (M)": { "TC": "15", "Question": "Taille", "Genre": "M", "AgeMin": 3, "AgeMax": 18 },
        "IMC : 18 ans": { "TC": "16", "Question": "IMC", "Genre": "F", "AgeMin": 0, "AgeMax": 18 },
        "IMC : 18 ans (M)": { "TC": "17", "Question": "IMC", "Genre": "M", "AgeMin": 0, "AgeMax": 18 },
        "Garçon 0 mois à 6 mois (OMS)": { "TC": "18", "Question": "Poids", "Genre": "M", "AgeMin": 0, "AgeMax": 0 },
        "Fille 0 mois à 6 mois (OMS)": { "TC": "19", "Question": "Poids", "Genre": "F", "AgeMin": 0, "AgeMax": 0 }
    };

    // // Récupère les valeurs de genre et d'âge dans la page.
    let age = ageCalculated();

    // Le genre
    let gender = genderCalculated();
    console.log('age and gender', age, gender);

    // épurer courbesPossibles pour ne garder que les lignes pertinentes selon l'age et le genre
    let courbesPossiblesFiltered = {};
    Object.keys(courbesPossibles).forEach((key) => {
        let courbe = courbesPossibles[key];
        if (courbe.AgeMin <= age && age <= courbe.AgeMax && courbe.Genre === gender) {
            courbesPossiblesFiltered[key] = courbe;
        }
    });

    // Ajouter les éléments de suivi au tableau courbesPossiblesFiltered
    let elementsQuestions = document.querySelectorAll('[id^="ContentPlaceHolder1_SuivisGrid_LabelGridSuiviQuestion_"]');
    elementsQuestions.forEach((element) => {
        let text = element.textContent.toLowerCase();
        Object.keys(courbesPossiblesFiltered).forEach((key) => {
            if (text.includes(courbesPossiblesFiltered[key].Question.toLowerCase())) {
                courbesPossiblesFiltered[key].id = element.id;
            }
        });
    });

    console.log('courbesPossiblesFiltered', courbesPossiblesFiltered);

    function addOverIcon() {
        function createTooltip() {
            let tooltip = document.createElement('div');
            tooltip.style.display = 'none';
            tooltip.style.position = 'fixed';
            tooltip.style.border = '1px solid #000';
            tooltip.style.background = '#fff';
            tooltip.style.padding = '10px';
            tooltip.style.top = '50%';
            tooltip.style.left = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
            tooltip.style.zIndex = '1000';
            return tooltip;
        }

        function createImage(key) {
            let img = document.createElement('img');
            img.style.display = 'none';
            img.style.maxHeight = '100vh';
            img.alt = key;
            img.id = 'WHcourbePedia-' + key.replace(/ /g, '_').replace(/:/g, '-');
            return img;
        }

        function createLoadingText() {
            let loadingText = document.createElement('span');
            loadingText.textContent = 'Chargement en cours...';
            return loadingText;
        }

        function createExplanatoryText() {
            let explanationText = document.createElement('p');
            explanationText.innerHTML = 'Courbes Pédiatrique affichée via Weda-Helper :<br>- Pour obtenir une courbe avec les valeurs du jour faites ctrl+S avant affichage ou cliquez sur le bouton Enregistrer en haut à gauche.<br>- Cliquez sur l\'icone courbe pour maintenir l\'affichage.<br>- Imprimez avec ctrl+P.<br>- Aller dans les Options pour désactiver ce message<br>';
            explanationText.style.marginTop = '200px'; // éviter que le message soit tout en haut
            explanationText.style.maxWidth = '15em';
            return explanationText;
        }


        function addHoverElement(element, key) {
            let tooltip = createTooltip(key);
            let img = createImage(key);
            let loadingText = createLoadingText();
            let explanationText = createExplanatoryText();
            tooltip.appendChild(loadingText);
            tooltip.appendChild(img);
            document.body.appendChild(tooltip);

            element.addEventListener('mouseover', function () {
                let imageUrl = urlImage(key);
                let pdfUrl = urlImage(key) + '&Pdf=True';
                // ajouter le pdfUrl comme information dans l'élément img
                img.setAttribute('data-pdf-url', pdfUrl);
                img.src = imageUrl;
                img.onload = function () {
                    loadingText.style.display = 'none';
                    img.style.display = 'block';
                    tooltip.appendChild(explanationText);
                };
                tooltip.style.display = 'flex';
            });

            function toolTipOff() {
                tooltip.style.display = 'none';
                img.removeAttribute('data-pdf-url');
            }

            // Ne pas cacher l'info-bulle lorsque la souris quitte l'élément si l'élément a été cliqué
            element.addEventListener('mouseout', function () {
                if (!element.clicked) {
                    toolTipOff();
                } else if (tooltip.style.display === 'none') {
                    element.clicked = false;
                }
            });

            // Ne pas cacher l'info-bulle lors du clic sur l'élément, ou la cacher si elle est déjà visible
            element.addEventListener('click', function (event) {
                if (element.clicked) {
                    element.clicked = false;
                    toolTipOff();
                } else {
                    element.clicked = true;
                }
                event.stopPropagation(); // Empêcher l'événement de se propager au document
            });

            // Cacher l'info-bulle lors du clic sur l'image
            img.addEventListener('click', function (event) {
                element.clicked = false;
                toolTipOff();
            });
        }
        function urlImage(key) {
            let url = window.location.href;
            let patDk = url.split('PatDk=')[1].split('&')[0];
            let tc = courbesPossiblesFiltered[key].TC;
            // pour la métrique je considère que dès que l'url est appelée c'est une action
            recordMetrics({ clicks: 4, drags: 4 });
            return `${baseUrl}/CourbeWEDA.aspx?PatDk=${patDk}&TC=${tc}`;
        }

        console.log('addOverIcon started with', courbesPossiblesFiltered);
        // Ajouter à gauche du texte de chaque élément présent dans courbesPossiblesFiltered une icone évoquant une courbe/graphique
        let icon = '📈 ';
        Object.keys(courbesPossiblesFiltered).forEach((key) => {
            let elementId = courbesPossiblesFiltered[key].id;
            let element = document.getElementById(elementId);
            if (element) {
                element.textContent = icon + element.textContent;
                addHoverElement(element, key);
            }
        });
    }


    waitForElement({
        selector: '#ContentPlaceHolder1_SuivisGrid_LabelGridSuiviQuestion_0',
        callback: addOverIcon
    });



    // Ajouter les unités pour les valeurs de suivi
    getOption('defautDataType', function (defautDataType) {
        // defautDataType est une liste de valeurs de suivi pour lesquelles les unités doivent être ajoutées
        // il est formaté comme ceci : 'Taille:cm,Poids:kg,Pc:cm,IMC:kg/t²,TAS:mmHg,TAD:mmHg,FC:bpm,Sat:%'
        let dataTypes = defautDataType.split(',');
        dataTypes.forEach((dataType) => {
            let [key, value] = dataType.split(':');
            // On a donc une liste de valeurs de suivi et d'unités
            let element = document.querySelector(`[title="${key}"]`);
            if (element) {
                let elementId = element.id.split('_')[element.id.split('_').length - 1];
                let unitId = `ContentPlaceHolder1_SuivisGrid_EditBoxGridSuiviUnit_${elementId}`;
                console.log('[defautDataType] element titre trouvé', element, 'avec id', elementId);

                let unitElement = document.getElementById(unitId);
                console.log('je recupere l\'element', unitElement);
                let unitValue = unitElement.value;
                console.log('for key', key, 'unitValue', unitValue);
                if (unitValue === '') {
                    unitElement.value = value;
                }
            }
        });
        // un peu compliqué de mettre des metrics ici... car les utilisateurs ne mettent en général simplement pas d'unité
    });

});

addTweak('/FolderMedical/ConsultationForm.aspx', '*ZScoreIMC', function () {
    // Calcul automatique du Z-score pour l'IMC
    // 1 - tableau du Z-score selon les références Françaises
    // => source : https://banco.podia.com/calculette-imc-z-score
    // => Conceptrice - Caroline CARRIERE-JULIA qui a donné son accord de principe pour la diffusion (merci à elle)
    // => Propriétaire - APOP - représentée par Dr Véronique Nègre qui a donné son accord pour la diffusion (merci à elle également)
    // L, S et M sont les paramètres de la courbe de référence utilisés dans le calcul du Z-score
    // m et f pour masculin et féminin
    const zscoreData = [
        { 'age': 0.0, 'Lm': 0.24, 'Sm': 0.0925, 'Mm': 13.21, 'Lf': 0.27, 'Sf': 0.0842, 'Mf': 12.92 },
        { 'age': 0.1, 'Lm': -0.16, 'Sm': 0.0882, 'Mm': 14.56, 'Lf': 0.18, 'Sf': 0.0805, 'Mf': 14.26 },
        { 'age': 0.2, 'Lm': -0.29, 'Sm': 0.0864, 'Mm': 15.38, 'Lf': 0.14, 'Sf': 0.0797, 'Mf': 15.04 },
        { 'age': 0.3, 'Lm': -0.37, 'Sm': 0.0852, 'Mm': 16.01, 'Lf': 0.12, 'Sf': 0.0794, 'Mf': 15.66 },
        { 'age': 0.4, 'Lm': -0.43, 'Sm': 0.0841, 'Mm': 16.49, 'Lf': 0.1, 'Sf': 0.0794, 'Mf': 16.15 },
        { 'age': 0.5, 'Lm': -0.48, 'Sm': 0.0832, 'Mm': 16.84, 'Lf': 0.09, 'Sf': 0.0795, 'Mf': 16.54 },
        { 'age': 0.6, 'Lm': -0.51, 'Sm': 0.0823, 'Mm': 17.1, 'Lf': 0.07, 'Sf': 0.0796, 'Mf': 16.81 },
        { 'age': 0.7, 'Lm': -0.53, 'Sm': 0.0815, 'Mm': 17.27, 'Lf': 0.06, 'Sf': 0.0797, 'Mf': 17.01 },
        { 'age': 0.8, 'Lm': -0.54, 'Sm': 0.0808, 'Mm': 17.37, 'Lf': 0.05, 'Sf': 0.0797, 'Mf': 17.12 },
        { 'age': 0.9, 'Lm': -0.55, 'Sm': 0.0801, 'Mm': 17.42, 'Lf': 0.04, 'Sf': 0.0797, 'Mf': 17.18 },
        { 'age': 1.0, 'Lm': -0.55, 'Sm': 0.0794, 'Mm': 17.42, 'Lf': 0.03, 'Sf': 0.0798, 'Mf': 17.2 },
        { 'age': 1.1, 'Lm': -0.55, 'Sm': 0.0787, 'Mm': 17.39, 'Lf': 0.03, 'Sf': 0.0797, 'Mf': 17.18 },
        { 'age': 1.2, 'Lm': -0.55, 'Sm': 0.0781, 'Mm': 17.32, 'Lf': 0.02, 'Sf': 0.0797, 'Mf': 17.12 },
        { 'age': 1.3, 'Lm': -0.54, 'Sm': 0.0775, 'Mm': 17.25, 'Lf': 0.01, 'Sf': 0.0797, 'Mf': 17.05 },
        { 'age': 1.4, 'Lm': -0.54, 'Sm': 0.0769, 'Mm': 17.15, 'Lf': 0.005, 'Sf': 0.0796, 'Mf': 16.97 },
        { 'age': 1.5, 'Lm': -0.53, 'Sm': 0.0763, 'Mm': 17.06, 'Lf': 0.001, 'Sf': 0.0796, 'Mf': 16.88 },
        { 'age': 2.0, 'Lm': -0.47, 'Sm': 0.0741, 'Mm': 16.58, 'Lf': -0.03, 'Sf': 0.079, 'Mf': 16.44 },
        { 'age': 2.5, 'Lm': -0.41, 'Sm': 0.0726, 'Mm': 16.23, 'Lf': -0.06, 'Sf': 0.0785, 'Mf': 16.12 },
        { 'age': 3.0, 'Lm': -0.35, 'Sm': 0.0718, 'Mm': 15.98, 'Lf': -0.09, 'Sf': 0.0781, 'Mf': 15.86 },
        { 'age': 3.5, 'Lm': -0.32, 'Sm': 0.0716, 'Mm': 15.81, 'Lf': -0.13, 'Sf': 0.078, 'Mf': 15.64 },
        { 'age': 4.0, 'Lm': -0.29, 'Sm': 0.072, 'Mm': 15.69, 'Lf': -0.17, 'Sf': 0.0781, 'Mf': 15.45 },
        { 'age': 4.5, 'Lm': -0.29, 'Sm': 0.0729, 'Mm': 15.58, 'Lf': -0.22, 'Sf': 0.0785, 'Mf': 15.31 },
        { 'age': 5.0, 'Lm': -0.3, 'Sm': 0.0742, 'Mm': 15.51, 'Lf': -0.27, 'Sf': 0.0792, 'Mf': 15.2 },
        { 'age': 5.5, 'Lm': -0.33, 'Sm': 0.0759, 'Mm': 15.46, 'Lf': -0.31, 'Sf': 0.0803, 'Mf': 15.14 },
        { 'age': 6.0, 'Lm': -0.37, 'Sm': 0.0779, 'Mm': 15.44, 'Lf': -0.36, 'Sf': 0.0817, 'Mf': 15.16 },
        { 'age': 6.5, 'Lm': -0.41, 'Sm': 0.0802, 'Mm': 15.47, 'Lf': -0.41, 'Sf': 0.0834, 'Mf': 15.16 },
        { 'age': 7.0, 'Lm': -0.47, 'Sm': 0.0826, 'Mm': 15.53, 'Lf': -0.45, 'Sf': 0.0855, 'Mf': 15.22 },
        { 'age': 7.5, 'Lm': -0.53, 'Sm': 0.0851, 'Mm': 15.62, 'Lf': -0.5, 'Sf': 0.0879, 'Mf': 15.32 },
        { 'age': 8.0, 'Lm': -0.59, 'Sm': 0.0877, 'Mm': 15.75, 'Lf': -0.54, 'Sf': 0.0907, 'Mf': 15.44 },
        { 'age': 8.5, 'Lm': -0.66, 'Sm': 0.0902, 'Mm': 15.89, 'Lf': -0.57, 'Sf': 0.0937, 'Mf': 15.59 },
        { 'age': 9.0, 'Lm': -0.72, 'Sm': 0.0928, 'Mm': 16.04, 'Lf': -0.61, 'Sf': 0.0968, 'Mf': 15.76 },
        { 'age': 9.5, 'Lm': -0.77, 'Sm': 0.0952, 'Mm': 16.2, 'Lf': -0.64, 'Sf': 0.1001, 'Mf': 15.96 },
        { 'age': 10.0, 'Lm': -0.82, 'Sm': 0.0975, 'Mm': 16.36, 'Lf': -0.67, 'Sf': 0.1033, 'Mf': 16.18 },
        { 'age': 10.5, 'Lm': -0.87, 'Sm': 0.0997, 'Mm': 16.53, 'Lf': -0.69, 'Sf': 0.1064, 'Mf': 16.44 },
        { 'age': 11.0, 'Lm': -0.9, 'Sm': 0.1017, 'Mm': 16.73, 'Lf': -0.71, 'Sf': 0.1094, 'Mf': 16.73 },
        { 'age': 11.5, 'Lm': -0.92, 'Sm': 0.1035, 'Mm': 16.94, 'Lf': -0.73, 'Sf': 0.1121, 'Mf': 17.04 },
        { 'age': 12.0, 'Lm': -0.93, 'Sm': 0.1052, 'Mm': 17.2, 'Lf': -0.75, 'Sf': 0.1145, 'Mf': 17.38 },
        { 'age': 12.5, 'Lm': -0.93, 'Sm': 0.1065, 'Mm': 17.48, 'Lf': -0.77, 'Sf': 0.1164, 'Mf': 17.74 },
        { 'age': 13.0, 'Lm': -0.93, 'Sm': 0.1077, 'Mm': 17.8, 'Lf': -0.79, 'Sf': 0.1181, 'Mf': 18.12 },
        { 'age': 13.5, 'Lm': -0.91, 'Sm': 0.1086, 'Mm': 18.14, 'Lf': -0.81, 'Sf': 0.1193, 'Mf': 18.49 },
        { 'age': 14.0, 'Lm': -0.9, 'Sm': 0.1093, 'Mm': 18.49, 'Lf': -0.82, 'Sf': 0.1202, 'Mf': 18.85 },
        { 'age': 14.5, 'Lm': -0.87, 'Sm': 0.1099, 'Mm': 18.85, 'Lf': -0.84, 'Sf': 0.1207, 'Mf': 19.19 },
        { 'age': 15.0, 'Lm': -0.85, 'Sm': 0.1102, 'Mm': 19.18, 'Lf': -0.85, 'Sf': 0.1209, 'Mf': 19.48 },
        { 'age': 15.5, 'Lm': -0.82, 'Sm': 0.1105, 'Mm': 19.51, 'Lf': -0.87, 'Sf': 0.1208, 'Mf': 19.74 },
        { 'age': 16.0, 'Lm': -0.8, 'Sm': 0.1106, 'Mm': 19.81, 'Lf': -0.88, 'Sf': 0.1206, 'Mf': 19.96 },
        { 'age': 16.5, 'Lm': -0.77, 'Sm': 0.1106, 'Mm': 20.09, 'Lf': -0.9, 'Sf': 0.1202, 'Mf': 20.13 },
        { 'age': 17.0, 'Lm': -0.74, 'Sm': 0.1106, 'Mm': 20.35, 'Lf': -0.92, 'Sf': 0.1198, 'Mf': 20.26 },
        { 'age': 18.0, 'Lm': -0.69, 'Sm': 0.1106, 'Mm': 20.8, 'Lf': -0.95, 'Sf': 0.1189, 'Mf': 20.44 },
        { 'age': 19.0, 'Lm': -0.65, 'Sm': 0.1106, 'Mm': 21.18, 'Lf': -0.99, 'Sf': 0.1185, 'Mf': 20.54 },
        { 'age': 20.0, 'Lm': -0.61, 'Sm': 0.1107, 'Mm': 21.52, 'Lf': -1.03, 'Sf': 0.1187, 'Mf': 20.59 },
        { 'age': 21.0, 'Lm': -0.57, 'Sm': 0.1111, 'Mm': 21.83, 'Lf': -1.07, 'Sf': 0.1197, 'Mf': 20.61 },
        { 'age': 22.0, 'Lm': -0.54, 'Sm': 0.1116, 'Mm': 22.1, 'Lf': -1.12, 'Sf': 0.1213, 'Mf': 20.63 },
        { 'age': 23.0, 'Lm': -0.51, 'Sm': 0.1124, 'Mm': 22.32, 'Lf': -1.16, 'Sf': 0.1231, 'Mf': 20.65 },
        { 'age': 24.0, 'Lm': -0.5, 'Sm': 0.1132, 'Mm': 22.52, 'Lf': -1.19, 'Sf': 0.1253, 'Mf': 20.69 },
        { 'age': 25.0, 'Lm': -0.49, 'Sm': 0.1141, 'Mm': 22.7, 'Lf': -1.22, 'Sf': 0.1277, 'Mf': 20.74 },
        { 'age': 26.0, 'Lm': -0.48, 'Sm': 0.115, 'Mm': 22.85, 'Lf': -1.25, 'Sf': 0.1301, 'Mf': 20.8 },
        { 'age': 27.0, 'Lm': -0.48, 'Sm': 0.116, 'Mm': 22.99, 'Lf': -1.28, 'Sf': 0.1325, 'Mf': 20.88 },
        { 'age': 28.0, 'Lm': -0.48, 'Sm': 0.1168, 'Mm': 23.11, 'Lf': -1.29, 'Sf': 0.1347, 'Mf': 20.96 },
        { 'age': 29.0, 'Lm': -0.48, 'Sm': 0.1175, 'Mm': 23.25, 'Lf': -1.31, 'Sf': 0.137, 'Mf': 21.05 },
        { 'age': 30.0, 'Lm': -0.47, 'Sm': 0.1182, 'Mm': 23.37, 'Lf': -1.32, 'Sf': 0.139, 'Mf': 21.16 },
        { 'age': 31.0, 'Lm': -0.47, 'Sm': 0.1188, 'Mm': 23.49, 'Lf': -1.32, 'Sf': 0.1411, 'Mf': 21.27 },
        { 'age': 32.0, 'Lm': -0.47, 'Sm': 0.1193, 'Mm': 23.62, 'Lf': -1.32, 'Sf': 0.1429, 'Mf': 21.39 },
        { 'age': 33.0, 'Lm': -0.47, 'Sm': 0.1198, 'Mm': 23.75, 'Lf': -1.32, 'Sf': 0.1447, 'Mf': 21.53 },
        { 'age': 34.0, 'Lm': -0.47, 'Sm': 0.1203, 'Mm': 23.88, 'Lf': -1.31, 'Sf': 0.1465, 'Mf': 21.68 },
        { 'age': 35.0, 'Lm': -0.47, 'Sm': 0.1207, 'Mm': 24.02, 'Lf': -1.3, 'Sf': 0.1482, 'Mf': 21.84 },
        { 'age': 36.0, 'Lm': -0.47, 'Sm': 0.121, 'Mm': 24.15, 'Lf': -1.28, 'Sf': 0.1498, 'Mf': 21.99 },
        { 'age': 37.0, 'Lm': -0.46, 'Sm': 0.1214, 'Mm': 24.27, 'Lf': -1.27, 'Sf': 0.1514, 'Mf': 22.14 },
        { 'age': 38.0, 'Lm': -0.45, 'Sm': 0.1218, 'Mm': 24.39, 'Lf': -1.25, 'Sf': 0.153, 'Mf': 22.29 },
        { 'age': 39.0, 'Lm': -0.45, 'Sm': 0.1221, 'Mm': 24.48, 'Lf': -1.22, 'Sf': 0.1547, 'Mf': 22.43 },
        { 'age': 40.0, 'Lm': -0.43, 'Sm': 0.1226, 'Mm': 24.58, 'Lf': -1.2, 'Sf': 0.1562, 'Mf': 22.57 }
    ];


    // 2 - Calcul du Z-score à partir de l'age et de l'IMC via la formule =(((IMC/M)^L)-1)/(L*S)
    function calculateZscore(age, gender, imc) {
        // Trouver les données de référence pour l'âge donné
        const reference = zscoreData.find(data => data.age === age);
        if (!reference) {
            // Trouver l'âge le plus proche
            let closestReference = null;
            let closestAgeDifference = Infinity;

            for (const data of zscoreData) {
                const ageDifference = Math.abs(data.age - age);
                if (ageDifference < closestAgeDifference) {
                    closestAgeDifference = ageDifference;
                    closestReference = data;
                }
            }

            // Vérifier si l'âge le plus proche est dans une différence de 1 an
            if (closestAgeDifference > 1) {
                console.log('Impossible de trouver une référence pour l\'âge donné');
                return null;
            }

            reference = closestReference;
        }

        // Sélectionner les valeurs de référence en fonction du genre
        const L = gender === 'f' ? reference.Lf : reference.Lm;
        const S = gender === 'f' ? reference.Sf : reference.Sm;
        const M = gender === 'f' ? reference.Mf : reference.Mm;

        // Calculer le Z-score
        const zscore = (((imc / M) ** L) - 1) / (L * S);

        return zscore;
    }

    // 3 - Récupérer les paramètres nécessaires pour le calcul du Z-score
    let age = ageCalculated();
    let gender = genderCalculated();

    function textAreaOfTitleSuiviVariable(title) {
        let TitleElement = document.querySelector(`[title="${title}"]`);
        if (!TitleElement) {
            console.log('Element non trouvé pour le titre', title);
            return null;
        }
        let ValueElement = TitleElement.parentElement.parentElement.querySelector('.entry');
        return ValueElement;
    }

    if (!textAreaOfTitleSuiviVariable("IMC")) {
        console.log('Le champ IMC n\'existe pas');
        return;
    }

    let IMC = textAreaOfTitleSuiviVariable("IMC").value;

    // Vérifier si le champ de texte est vide
    if (!IMC.trim()) {
        console.log('Le champ IMC est vide');
        return;
    }

    // Convertir l'IMC au format décimal
    IMC = parseFloat(IMC.replace(',', '.'));

    // Vérifier si la conversion a réussi
    if (isNaN(IMC)) {
        console.log('IMC invalide');
        return;
    }

    // 4 - Calculer le Z-score
    let zscore = calculateZscore(age, gender, IMC);
    console.log('Z-score calculé :', zscore);

    // 5 - Afficher le Z-score dans le champ de texte "Z-IMC"
    let ZScoreIMCElement = textAreaOfTitleSuiviVariable("Z-IMC");
    if (ZScoreIMCElement) {
        ZScoreIMCElement.value = zscore.toFixed(2);

        // très grossièrement
        recordMetrics({ clicks: 6, drags: 6, keyStrokes: 6 });
    }
});



// // // Historique à gauche

// // Clic automatique sur le bouton d'historique
// Nécessaire depusi env. le 15 octobre 2024 et la 2.7.1 car l'historique à gauche
// dans les pages de consultation est repris par Weda et plus ouvert automatiquement
addTweak('/FolderMedical/ConsultationForm.aspx', 'AutoOpenHistory_Consultation', function () {
    waitForElement({
        selector:'#ContentPlaceHolder1_EvenementUcForm1_LinkButtonShowHistoriqueFrame',
        justOnce: true,
        callback: function (elements) {
            elements[0].click();
        }
    });

    // Suppression d'un élément de l'historique pour gagner un peu de place
    waitForElement({
        selector: '#ContentPlaceHolder1_PanelHistoriqueConsultationFrame > iframe',
        callback: function (elements) {
            removeElements(elements[0].contentDocument);
        }
    });
});

// // Définir les pages pour lesquelles l'historique doit être déplacé à gauche et leur cible
let pagesToLeftPannel_ = [
    {
        url: '/FolderMedical/ConsultationForm.aspx',
        targetElementSelector: '#form1 > div:nth-child(14) > div > table > tbody > tr > td:nth-child(1) > table',
        option: 'MoveHistoriqueToLeft_Consultation',
        pageType: 'Consultation'
    },
    {
        url: '/FolderMedical/CertificatForm.aspx',
        targetElementSelector: 'table[onmouseover="ForceCloseListBoxGlossaire();"] > tbody > tr',
        option: 'MoveHistoriqueToLeft_Certificat',
        pageType: 'Certificat'
    },
    {
        url: '/FolderMedical/DemandeForm.aspx',
        targetElementSelector: '#ContentPlaceHolder1_UpdatePanelAll',
        option: 'MoveHistoriqueToLeft_Demande',
        pageType: 'Demande'
    },
    {
        url: '/FolderMedical/FormulaireForm.aspx',
        targetElementSelector: '#form1 > div:nth-child(14) > table > tbody > tr > td > table',
        option: 'MoveHistoriqueToLeft_Formulaire',
        pageType: 'Formulaire'
    },
    {
        url: '/FolderMedical/CourrierForm.aspx',
        targetElementSelector: 'table[onmouseover="ForceCloseListBoxGlossaire();"] > tbody > tr',
        option: 'MoveHistoriqueToLeft_Courrier',
        pageType: 'Courrier'
    }
]


const SELECTORS_TO_REMOVE = [
    '#PanelFiltre',
    '.fondcoordination',
    '[name="dh9"]',
    '.frameupright',
    '.frameupleft',
    '.frameupcenter',
    '#HistoriqueUCForm1_PanelInfoFlottante',
];
const HISTORY_PROPORTION = 0.29;

function getUrlHistory() {
    const url = window.location.href;
    const params = url.split('?')[1];
    return `${baseUrl}/FolderMedical/FrameHistoriqueForm.aspx?${params}`;
}

function createIframe(targetElement) {
    console.log('Création de l\'iframe', targetElement);
    const iframe = document.createElement('iframe');
    iframe.style.width = `${window.innerWidth * HISTORY_PROPORTION}px`;
    iframe.style.height = `${window.innerHeight - 175}px`;
    iframe.src = getUrlHistory();
    iframe.style.position = 'absolute'; // ou 'fixed' si vous voulez qu'elle reste en place lors du défilement
    iframe.style.left = '0px'; // Aligné avec le bord gauche
    iframe.style.border = "none";
    iframe.style.zIndex = '0';
    // Injecter l'iframe dans le DOM proche de targetElement pour que ça soit au même niveau (sur l'axe vertical)
    const parent = targetElement.parentNode;
    if (parent) {
        parent.insertBefore(iframe, targetElement.nextSibling); // Insère l'iframe juste après targetElement
    }
    return iframe;
}

function removeElements(iframeDocument) {
    SELECTORS_TO_REMOVE.forEach(selector => {
        const elements = iframeDocument.querySelectorAll(selector);
        elements.forEach(element => element.remove());
    });
}

function setBackgroundDmp() {
    let prescriptionDmp = document.querySelector('#ContentPlaceHolder1_DocVersionUserControl_PanelPrescriptionDmp');
    if (prescriptionDmp) {
        Object.assign(prescriptionDmp.style, {
            position: 'relative',
            zIndex: '-1'
        });
    }
}

function moveAndResizeDocTypes(availableWidth) {
    let documentTypeWidth = (1 - HISTORY_PROPORTION) * availableWidth * 0.2;
    var toSetRight = document.querySelector('#ContentPlaceHolder1_UpdatePanelBaseGlossaireUCForm1').parentNode;
    toSetRight.setAttribute("align", "right");
    var toSetFifty = document.querySelector('#ContentPlaceHolder1_UpdatePanelBaseGlossaireUCForm1 table');
    toSetFifty.style.width = `${documentTypeWidth}px`;
}

function resizeTextArea(availableWidth, pageType, targetElement) {
    const adjustement = getAdjustment(availableWidth, pageType);
    const textAreaWidth = (1 - HISTORY_PROPORTION) * (availableWidth * adjustement) * 0.8;
    targetElement.style.width = `${textAreaWidth}px`;
}

function adjustLayout(pageType, iframe, targetElement) {
    const availableWidth = window.innerWidth;
    const targetElementWidth = (1 - HISTORY_PROPORTION - 0.01) * availableWidth;
    targetElement.style.position = 'absolute';
    targetElement.style.left = `${iframe.getBoundingClientRect().right}px`;
    targetElement.style.marginTop = '0px';
    targetElement.style.width = `${targetElementWidth}px`;
    targetElement.style.zIndex = '0';

    if (["Certificat", "Demande", "Courrier"].includes(pageType)) {
        moveAndResizeDocTypes(availableWidth);
        resizeTextArea(availableWidth, pageType, targetElement);
        setBackgroundDmp();
    }
}

function getAdjustment(availableWidth, pageType) {
    const adjustmentTable = {
        "Certificat": { 1500: 0.85, 1700: 0.9, 2000: 0.95, 5000: 1 },
        "Demande": { 1300: 0.7, 1700: 0.8, 2000: 0.9, 2500: 1 },
        "Courrier": { 1500: 0.75, 1700: 0.85, 1900: 0.9, 2100: 0.95, 5000: 1 }
    };

    const keys = Object.keys(adjustmentTable[pageType]).sort((a, b) => a - b);
    let adjustment = 1; // Valeur par défaut si aucune correspondance n'est trouvée
    for (let i = 0; i < keys.length; i++) {
        if (availableWidth <= keys[i]) {
            adjustment = adjustmentTable[pageType][keys[i]];
            break;
        }
    }

    // Si availableWidth est supérieur à toutes les clés, utilisez la dernière valeur d'ajustement
    if (availableWidth > keys[keys.length - 1]) {
        adjustment = adjustmentTable[pageType][keys[keys.length - 1]];
    }

    return adjustment;
}

function historyToLeft() {
    // ne pas activer l'historique si le panneau de prévisu est détecté
    let previsuPanel = document.querySelector('#ContentPlaceHolder1_EvenementUcForm1_ViewPdfDocumentUCForm1_PanelViewDocument');
    if (!previsuPanel) {
        pagesToLeftPannel_.forEach(page => {
            addTweak(page.url, page.option, () => {
                const targetElement = document.querySelector(page.targetElementSelector);
                const iframe = createIframe(targetElement); // ici targetElement est nécessaire comme référence pour l'insertion de l'iframe
                iframe.addEventListener('load', () => {
                    removeElements(iframe.contentDocument);
                });
                adjustLayout(page.pageType, iframe, targetElement);
                recordMetrics({ clicks: 1, drags: 1 });
            });
        });
    }
}

historyToLeft();

waitForElement({
    selector: '#ContentPlaceHolder1_BaseGlossaireUCForm1_ButtonDemandeRadioType',
    callback: historyToLeft
});
// nécessaire pour les pages de demande


// // Afficher les antécédents automatiquement sur les pages où Historique peut être déplacé à gauche (la cible devra peut-être être ajustée)
pagesToLeftPannel_.forEach((page) => {
    addTweak(page.url, 'autoATCD', function () {
        // Automatiquement afficher l'ATCD
        waitForElement({
            selector: '#ContentPlaceHolder1_EvenementUcForm1_ImageButtonShowAntecedent',
            justOnce: true,
            callback: () => {
                console.log('[autoATCD] bouton atcd détecté');
                waitForElement({
                    selector: '#ContentPlaceHolder1_EvenementUcForm1_PanelHistoriqueFrame',
                    callback: () => {
                        console.log('[autoATCD] iframe chargé');
                        let atcdElement = document.querySelector('#ContentPlaceHolder1_EvenementUcForm1_PanelAntecedent');
                        let buttonAtcd = document.querySelector('#ContentPlaceHolder1_EvenementUcForm1_ImageButtonShowAntecedent');
                        if (!atcdElement && buttonAtcd) {
                            buttonAtcd.click();
                            recordMetrics({ clicks: 1, drags: 1 });
                        }
                    }
                });
            }
        });
    });
});
