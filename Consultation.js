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


    // Afficher en overlay une image issue d'une URL en cas de survol de certains éléments
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

    // Récupère les valeurs de genre et d'âge dans la page.
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

    // Le genre est défini par la présence d'un élément avec title="Sexe féminin" ou "Sexe masculin"
    let gender = document.querySelector('[title="Sexe féminin"]') ? 'F' : 
                 (document.querySelector('[title="Sexe masculin"]') ? 'M' : undefined);  
    
    console.log('age and gender', age, gender);

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
                    elementToShrink.style.maxWidth = margin + 'px';
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


