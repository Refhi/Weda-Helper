// [Page de Consultation]
if (window.location.href.startsWith('https://secure.weda.fr/FolderMedical/ConsultationForm.aspx')) {
    // Modifier l'ordre de tabulation des valeurs de suivi
    chrome.storage.local.get('TweakTabConsultation', function (result) {    
        if (result.TweakTabConsultation !== false) {        
            function changeTabOrder(elements) {
                console.log('changeTabOrder started');
                for (var i = 0; i < elements.length; i++) {
                    elements[i].tabIndex = i + 1;
                }
            }

            lightObserver('[id^="ContentPlaceHolder1_SuivisGrid_EditBoxGridSuiviReponse_"]',changeTabOrder)
            console.log('ConsultationFormTabOrderer started');
        }
    });


    // Afficher en overlay une image issue d'une URL en cas de survol de certains éléments //TODO : le mettre en option ?
    // Récupérer la liste des éléments présents dans le suivi
    let courbesPossibles = {
        "Taille-Poids : 3 ans": {"TC": "10", "Question": "Taille", "Genre": "F", "AgeMin": 0, "AgeMax": 2 },
        "Taille-Poids : 3 ans (M)": { "TC": "11", "Question": "Taille", "Genre": "M", "AgeMin": 0, "AgeMax": 2 },
        "P.crânien : 5 ans": { "TC": "12", "Question": "Pc", "Genre": "F", "AgeMin": 0, "AgeMax": 4 },
        "P.crânien : 5 ans (M)": { "TC": "13", "Question": "Pc", "Genre": "M", "AgeMin": 0, "AgeMax": 4 },
        "Taille-Poids : 18 ans": { "TC": "14", "Question": "Taille", "Genre": "F", "AgeMin": 3, "AgeMax": 18 },
        "Taille-Poids : 18 ans (M)": { "TC": "15", "Question": "Taille", "Genre": "M", "AgeMin": 3, "AgeMax": 18 },
        "IMC : 18 ans": { "TC": "16", "Question": "IMC", "Genre": "F", "AgeMin": 0, "AgeMax": 18 },
        "IMC : 18 ans (M)": { "TC": "17", "Question": "IMC", "Genre": "M", "AgeMin": 0, "AgeMax": 18 },
        "Garçon 0 mois à 6 mois (OMS)": { "TC": "18", "Question": "Poids", "Genre": "M", "AgeMin": 0, "AgeMax": 1 },
        "Fille 0 mois à 6 mois (OMS)": { "TC": "19", "Question": "Poids", "Genre": "F", "AgeMin": 0, "AgeMax": 1 }
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
        let text = element.textContent;
        Object.keys(courbesPossiblesFiltered).forEach((key) => {
            if (text.includes(courbesPossiblesFiltered[key].Question)) {
                courbesPossiblesFiltered[key].id = element.id;
            }
        });
    });

    console.log('courbesPossiblesFiltered', courbesPossiblesFiltered);

    function addOverIcon() {
        function addHoverElement(element, key) {
            // Créer une info-bulle personnalisée
            let tooltip = document.createElement('div');
            tooltip.style.display = 'none';
            tooltip.style.position = 'fixed'; // Position fixe par rapport à l'écran
            tooltip.style.border = '1px solid #000';
            tooltip.style.background = '#fff';
            tooltip.style.padding = '10px';
            tooltip.style.top = '50%'; // Centrer verticalement
            tooltip.style.left = '50%'; // Centrer horizontalement
            tooltip.style.transform = 'translate(-50%, -50%)'; // Ajuster la position pour que le centre de l'info-bulle soit au centre de l'écran
            let img = document.createElement('img');
            img.style.display = 'none'; // Cacher l'image jusqu'à ce qu'elle soit chargée
            img.style.maxHeight = '100vh'; // Limiter la hauteur de l'image à 75% de la hauteur de l'écran
            img.alt = key;
            let loadingText = document.createElement('span');
            loadingText.textContent = 'Chargement en cours...';
            tooltip.appendChild(loadingText);
            tooltip.appendChild(img);
            element.appendChild(tooltip);

            // Afficher l'info-bulle et charger l'image lors du survol de l'élément
            element.addEventListener('mouseover', function() {
                let imageUrl = urlImage(key);
                img.src = imageUrl;
                img.onload = function() {
                    loadingText.style.display = 'none'; // Cacher le texte de chargement une fois que l'image est chargée
                    img.style.display = 'block';
                };
                tooltip.style.display = 'block';
            });

            // Ne pas cacher l'info-bulle lorsque la souris quitte l'élément si l'élément a été cliqué
            element.addEventListener('mouseout', function() {
                if (!element.clicked) {
                    tooltip.style.display = 'none';
                } else if (tooltip.style.display === 'none') {
                    element.clicked = false;
                }
            });

            // Ne pas cacher l'info-bulle lors du clic sur l'élément, ou la cacher si elle est déjà visible
            element.addEventListener('click', function(event) {
                if (element.clicked) {
                    element.clicked = false;
                    tooltip.style.display = 'none';
                } else {
                    element.clicked = true;
                }
                event.stopPropagation(); // Empêcher l'événement de se propager au document
            });

            // Cacher l'info-bulle lors du clic sur l'image
            img.addEventListener('click', function(event) {
                element.clicked = false;
                tooltip.style.display = 'none';
            });
        }
        function urlImage(key) {
            let url = window.location.href;
            let patDk = url.split('PatDk=')[1].split('&')[0];
            let tc = courbesPossiblesFiltered[key].TC;
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



}



// // Mettre l'historique dans une colonne à gauche de l'écran
// TODO l'ajouter sur d'autres pages ?
let pagesToLeftPannel = [
    { url: 'https://secure.weda.fr/FolderMedical/ConsultationForm.aspx', targetElementSelector: '#form1 > div:nth-child(14) > div > table > tbody > tr > td:nth-child(1) > table' },
    // { url: 'https://secure.weda.fr/FolderMedical/CertificatForm.aspx', targetElementSelector: '#CE_ContentPlaceHolder1_EditorCertificat_ID' },
    // { url: 'https://secure.weda.fr/FolderMedical/DemandeForm.aspx', targetElementSelector: '#ContentPlaceHolder1_UpdatePanelAll' },
    // { url: 'https://secure.weda.fr/FolderMedical/PrescriptionForm.aspx', targetElementSelector: '#ContentPlaceHolder1_PanelBaseVidalBackGround > table' },
    // { url: 'https://secure.weda.fr/FolderMedical/FormulaireForm.aspx', targetElementSelector: '#form1 > div:nth-child(14) > table > tbody > tr > td > table' },
    // { url: 'https://secure.weda.fr/FolderMedical/ResultatExamenForm.aspx', targetElementSelector: '#form1 > div:nth-child(14) > table > tbody > tr > td > table' },
    // { url: 'https://secure.weda.fr/FolderMedical/CourrierForm.aspx', targetElementSelector: '#form1 > div:nth-child(15) > table > tbody > tr > td:nth-child(1) > table' }
];
let currentPage = pagesToLeftPannel.find(page => page.url === window.location.origin + window.location.pathname);
if (currentPage) {
    chrome.storage.local.get('MoveHistoriqueToLeft', function (result) {
        if (result.MoveHistoriqueToLeft !== false) {
            console.log('MoveHistoriqueToLeft démarré');
            function moveToLeft(iframes) {
                function warpHistory(elementToShrink) {
                    // Redimensionner l'affichage de l'historique
                    let margin = (elementToMove.getBoundingClientRect().width - 70);
                    if (elementToShrink) {
                        elementToShrink.style.maxWidth = margin + 'px';
                    }
                }


                function warpElements() {
                    let historyProportion = 0.3;
                    let availableWidth = window.innerWidth;
                    let elementToMoveWidth = availableWidth * historyProportion;
                    let targetElementWidth = (1 - historyProportion) * availableWidth;
                    let unitsElementWidth = (1 - historyProportion) * availableWidth * 0.2;
                    
                    // Bouger l'historique à gauche et le redimensionner
                    elementToMove.style.position = 'absolute';
                    elementToMove.style.left = '0px';
                    elementToMove.style.marginTop = '0px'; // Remove top margin
                    elementToMove.style.width = elementToMoveWidth + 'px'; 

                    // Stocker les valeurs initiales
                    initialStylesTargetElement = {
                        position: targetElement.style.position,
                        left: targetElement.style.left,
                        marginTop: targetElement.style.marginTop,
                        width: targetElement.style.width
                    };
                    initialStylesUnitsElement = {
                        position: unitsElement.style.position,
                        left: unitsElement.style.left,
                        marginTop: unitsElement.style.marginTop,
                        width: unitsElement.style.width
                    };

                    // Modifier la largeur de l'élément de suivi
                    unitsElement.style.width = unitsElementWidth + 'px';

                    // Bouger la cible à droite et la redimensionner
                    targetElement.style.position = 'absolute';
                    targetElement.style.left = (elementToMove.getBoundingClientRect().right) + 'px';
                    targetElement.style.marginTop = '0px'; // Remove top margin
                    console.log('availableWidth', availableWidth);
                    targetElement.style.width = targetElementWidth + 'px';
                }

                function resetTargetElement() {
                    console.log('resetTargetElement');
                    // Rétablir les valeurs initiales
                    targetElement.style.position = initialStylesTargetElement.position;
                    targetElement.style.left = initialStylesTargetElement.left;
                    targetElement.style.marginTop = initialStylesTargetElement.marginTop;
                    targetElement.style.width = initialStylesTargetElement.width;

                    unitsElement.style.position = initialStylesUnitsElement.position;
                    unitsElement.style.left = initialStylesUnitsElement.left;
                    unitsElement.style.marginTop = initialStylesUnitsElement.marginTop;
                    unitsElement.style.width = initialStylesUnitsElement.width;
                }


                // Définition des éléments à déplacer et de la cible
                let elementToMove = document.querySelector('#ContentPlaceHolder1_EvenementUcForm1_PanelHistoriqueFrame');
                let targetElement = document.querySelector(currentPage['targetElementSelector']);
                let unitsElement = document.querySelector('#ContentPlaceHolder1_SuivisGrid');
                let iframeToActOn = iframes[0];

                // liste des selecteurs à suppimer
                let selectorsToRemove = [
                    '#PanelFiltre',
                    '.fondcoordination',
                    '[name="dh9"]',
                    '.frameupright',
                    '.frameupleft',
                    '.frameupcenter',
                ];

                warpElements(); // à appeler avant le load de l'iframe pour plus de réactivité

                iframeToActOn.addEventListener('load', () => {
                    let iframeDocument = iframeToActOn.contentDocument;

                    // Supprimer les éléments inutiles
                    selectorsToRemove.forEach((selector) => {
                        lightObserver(selector, (elements) => {
                            elements.forEach((element) => {
                                element.remove();
                            });
                        }, iframeDocument);
                    });

                    setTimeout(() => {
                        selectorsToRemove.forEach((selector) => {
                            let element = iframeDocument.querySelector(selector);
                            if (element) {
                                element.remove();
                            }
                        });
                    }, 20);

                    // Redimensionner l'historique
                    let elementToShrink = iframeDocument.querySelector('[style*="max-width:"]');
                    warpHistory(elementToShrink);

                    // réinitialiser les éléments à la disparition de l'iframe
                    observeDiseapearance(iframeToActOn, resetTargetElement);
                });
            }


            // Automatiquement afficher l'historique
            lightObserver('#ContentPlaceHolder1_EvenementUcForm1_ImageButtonShowHistoriqueFrame', (elements) => {
                if (elements.length > 0) {
                    elements[0].click();
                }
            }, document, true);


            // Attendre que l'iframe soit présente ET chargée pour déplacer l'historique
            lightObserver('#ContentPlaceHolder1_EvenementUcForm1_PanelHistoriqueFrame > iframe', moveToLeft);
        }
    });
}


