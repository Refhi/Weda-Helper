// [Page de Consultation]
// addTabsToIframe est appelé depuis keyCommands.js au moment où on injecte les raccourcis clavier via addShortcutsToIframe

function removeHistoryIframe(iframes) {
    iframes = Array.from(iframes).filter(iframe => !iframe.src.startsWith('https://secure.weda.fr/FolderMedical/FrameHistoriqueForm.aspx'));
    return iframes;
}

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

function addTabsToIframe(scopeName, iframe, index, iframes) {
    iframes = removeHistoryIframe(iframes);
    addHotkeyToDocument(scopeName, iframe.contentDocument, 'tab', function() {
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

    addHotkeyToDocument(scopeName, iframe.contentDocument, 'shift+tab', function() {
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

addTweak('https://secure.weda.fr/FolderMedical/ConsultationForm.aspx', 'TweakTabConsultation', function () {
    let titleElement = document.querySelector('#TextBoxEvenementTitre');
    titleElement.tabIndex = 1;
    let subTitleElement = document.querySelector('#TextBoxDocumentTitre');
    subTitleElement.tabIndex = 2;

    var iframes = document.querySelectorAll('iframe');
    iframes = removeHistoryIframe(iframes); // retirer les iframes d'historique qui n'on pas besoin de navigation par tabulation
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

    lightObserver('[id^="ContentPlaceHolder1_SuivisGrid_EditBoxGridSuiviReponse_"]', function(elements) {
        changeTabOrder(elements)
        console.log('ConsultationFormTabOrderer started');
        // ici aussi les métriques sont difficiles à évaluer. Si on considère environs
        // 2 éléments par consultation, on peut estimer en gros à 1 clic + 1 drag par consultation
        recordMetrics({ clicks: 1, drags: 1 });
    });
});

addTweak('https://secure.weda.fr/FolderMedical/ConsultationForm.aspx', 'FocusOnTitleInConsultation', function () {
    let titleElement = document.querySelector('#TextBoxEvenementTitre');
    afterMutations(300, () => {
        titleElement.focus();
    });
    recordMetrics({ clicks: 1, drags: 1 });
});


addTweak('https://secure.weda.fr/FolderMedical/ConsultationForm.aspx', '*CourbesPediatriques', function () {
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
    let age = ageCalculated();

    // Le genre
    let gender = document.querySelector('[title="Sexe féminin"]') ? 'F' :
        (document.querySelector('[title="Sexe masculin"]') ? 'M' : undefined);
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
            return `https://secure.weda.fr/CourbeWEDA.aspx?PatDk=${patDk}&TC=${tc}`;
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

    lightObserver('#ContentPlaceHolder1_SuivisGrid_LabelGridSuiviQuestion_0', addOverIcon);


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



// // Historique à gauche
// Définir les pages pour lesquelles l'historique doit être déplacé à gauche et leur cible
let pagesToLeftPannel_ = [
    {
        url: 'https://secure.weda.fr/FolderMedical/ConsultationForm.aspx',
        targetElementSelector: '#form1 > div:nth-child(14) > div > table > tbody > tr > td:nth-child(1) > table',
        option: 'MoveHistoriqueToLeft_Consultation',
        pageType: 'Consultation'
    },
    {
        url: 'https://secure.weda.fr/FolderMedical/CertificatForm.aspx',
        targetElementSelector: '#form1 > div:nth-child(15) > table > tbody > tr > td:nth-child(1) > table > tbody > tr',
        option: 'MoveHistoriqueToLeft_Certificat',
        pageType: 'Certificat'
    },
    {
        url: 'https://secure.weda.fr/FolderMedical/DemandeForm.aspx',
        targetElementSelector: '#ContentPlaceHolder1_UpdatePanelAll',
        option: 'MoveHistoriqueToLeft_Demande',
        pageType: 'Demande'
    },
    {
        url: 'https://secure.weda.fr/FolderMedical/FormulaireForm.aspx',
        targetElementSelector: '#form1 > div:nth-child(14) > table > tbody > tr > td > table',
        option: 'MoveHistoriqueToLeft_Formulaire',
        pageType: 'Formulaire'
    },
    {
        url: 'https://secure.weda.fr/FolderMedical/CourrierForm.aspx',
        targetElementSelector: '#form1 > div:nth-child(15) > table > tbody > tr > td:nth-child(1) > table',
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
    return `https://secure.weda.fr/FolderMedical/FrameHistoriqueForm.aspx?${params}`;
}

function createIframe(targetElement) {
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
lightObserver('#ContentPlaceHolder1_BaseGlossaireUCForm1_ButtonDemandeRadioType', historyToLeft, document, false); // nécessaire pour les pages de demande


// // Afficher les antécédents automatiquement sur les pages où Historique peut être déplacé à gauche (la cible devra peut-être être ajustée)
pagesToLeftPannel_.forEach((page) => {
    addTweak(page.url, 'autoATCD', function () {
        // Automatiquement afficher l'ATCD
        lightObserver('#ContentPlaceHolder1_EvenementUcForm1_ImageButtonShowAntecedent', () => {
            console.log('[autoATCD] bouton atcd détecté');
            lightObserver('#ContentPlaceHolder1_EvenementUcForm1_PanelHistoriqueFrame', () => {
                console.log('[autoATCD] iframe chargé');
                let atcdElement = document.querySelector('#ContentPlaceHolder1_EvenementUcForm1_PanelAntecedent');
                let buttonAtcd = document.querySelector('#ContentPlaceHolder1_EvenementUcForm1_ImageButtonShowAntecedent');
                if (!atcdElement && buttonAtcd) {
                    buttonAtcd.click();
                    recordMetrics({ clicks: 1, drags: 1 });
                }
            });
        }, document, true);
    });
});
