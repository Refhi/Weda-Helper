// [Page de Consultation]
addTweak('https://secure.weda.fr/FolderMedical/ConsultationForm.aspx', 'TweakTabConsultation', function () {
    // Modifier l'ordre de tabulation des valeurs de suivi    
        function changeTabOrder(elements) {
            console.log('changeTabOrder started');
            for (var i = 0; i < elements.length; i++) {
                elements[i].tabIndex = i + 1;
            }
        }

        lightObserver('[id^="ContentPlaceHolder1_SuivisGrid_EditBoxGridSuiviReponse_"]',changeTabOrder)
        console.log('ConsultationFormTabOrderer started');
        // ici aussi les métriques sont difficiles à évaluer. Si on considère environs
        // 2 éléments par consultation, on peut estimer en gros à 1 clic + 1 drag par consultation
        recordMetrics({clicks: 1, drags: 1});


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
            element.appendChild(tooltip);

            element.addEventListener('mouseover', function() {
                let imageUrl = urlImage(key);
                let pdfUrl = urlImage(key) + '&Pdf=True';
                // ajouter le pdfUrl comme information dans l'élément img
                img.setAttribute('data-pdf-url', pdfUrl);
                img.src = imageUrl;
                img.onload = function() {
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
            element.addEventListener('mouseout', function() {
                if (!element.clicked) {
                    toolTipOff();
                } else if (tooltip.style.display === 'none') {
                    element.clicked = false;
                }
            });

            // Ne pas cacher l'info-bulle lors du clic sur l'élément, ou la cacher si elle est déjà visible
            element.addEventListener('click', function(event) {
                if (element.clicked) {
                    element.clicked = false;
                    toolTipOff();
                } else {
                    element.clicked = true;
                }
                event.stopPropagation(); // Empêcher l'événement de se propager au document
            });

            // Cacher l'info-bulle lors du clic sur l'image
            img.addEventListener('click', function(event) {
                element.clicked = false;
                toolTipOff();
            });
        }
        function urlImage(key) {
            let url = window.location.href;
            let patDk = url.split('PatDk=')[1].split('&')[0];
            let tc = courbesPossiblesFiltered[key].TC;
            // pour la métrique je considère que dès que l'url est appelée c'est une action
            recordMetrics({clicks: 4, drags: 4});
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
    getOption(['defautDataType'], function (result) {
        // defautDataType est une liste de valeurs de suivi pour lesquelles les unités doivent être ajoutées
        // il est formaté comme ceci : 'Taille:cm,Poids:kg,Pc:cm,IMC:kg/t²,TAS:mmHg,TAD:mmHg,FC:bpm,Sat:%'
        let defautDataType = result.defautDataType
        if (defautDataType === undefined) {
            defautDataType = 'TAILLE:cm,Taille:cm,POIDS:kg,Poids:kg,Pc:cm,IMC:p/t²,PAd:mmHg,PAs:mmhg,TAS:mmHg,TAD:mmHg,FC:bpm,Sat:%';
        }
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

// TODO : refactoriser ici pour utiliser getOption et addTweak
// deux étapes :
// 1. isoler autoATCD qui clique sur le bouton ATCD
// 2. pour panel gauche :
//    - faire la liste des urls
//    - pour chaque url, faire un addTweak qui appelle moveToLeftWrapper, chacune l'option spécifique
// par exemple :
let pagesToLeftPannel_ = [
    {
        url: 'https://secure.weda.fr/FolderMedical/ConsultationForm.aspx',
        targetElementSelector: '#form1 > div:nth-child(14) > div > table > tbody > tr > td:nth-child(1) > table',
        option: 'MoveHistoriqueToLeft_Consultation'
    },
    {
        url: 'https://secure.weda.fr/FolderMedical/CertificatForm.aspx',
        targetElementSelector: '#CE_ContentPlaceHolder1_EditorCertificat_ID',
        option: 'MoveHistoriqueToLeft_Certificat'
    },
    {
        url: 'https://secure.weda.fr/FolderMedical/DemandeForm.aspx',
        targetElementSelector: '#ContentPlaceHolder1_UpdatePanelAll',
        option: 'MoveHistoriqueToLeft_Demande'
    },
    {
        url: 'https://secure.weda.fr/FolderMedical/FormulaireForm.aspx',
        targetElementSelector: '#form1 > div:nth-child(14) > table > tbody > tr > td > table',
        option: 'MoveHistoriqueToLeft_Formulaire'
    },
    {
        url: 'https://secure.weda.fr/FolderMedical/CourrierForm.aspx',
        targetElementSelector: '#form1 > div:nth-child(15) > table > tbody > tr > td:nth-child(1) > table',
        option: 'MoveHistoriqueToLeft_Courrier'
    }
]
// 3. Faire un appel de addTweak pour chaque page présente dans pagesToLeftPannel_



pagesToLeftPannel_.forEach(page => {
    addTweak(page.url, page.option, function() {
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

                // Bouger la cible à droite et la redimensionner
                targetElement.style.position = 'absolute';
                targetElement.style.left = (elementToMove.getBoundingClientRect().right) + 'px';
                targetElement.style.marginTop = '0px'; // Remove top margin
                console.log('availableWidth', availableWidth);
                

                if (pageType === "Consultation") {
                    targetElement.style.width = targetElementWidth + 'px';
                    let unitsElementWidth = (1 - historyProportion) * availableWidth * 0.2;

                    initialStylesUnitsElement = {
                        position: unitsElement.style.position,
                        left: unitsElement.style.left,
                        marginTop: unitsElement.style.marginTop,
                        width: unitsElement.style.width
                    };

                    // Modifier la largeur de l'élément de suivi
                    unitsElement.style.width = unitsElementWidth + 'px';
                } else if (pageType === "Formulaire") {
                    targetElement.style.width = targetElementWidth + 'px';

                } else if (pageType === "Certificat" || pageType === "Demande" || pageType === "Courrier") {
                    // modifier la taille du cadre contenant la selection de documents type
                    let documentTypeWidth = (1 - historyProportion) * availableWidth * 0.2;
                    toSetRight.setAttribute("align", "right");
                    console.log('toSetFifty', toSetFifty);
                    toSetFifty.setAttribute("width", documentTypeWidth + "px");

                    // modifier la taille du cadre contenant la zone de texte (l'équivalent de targetElement sur la page de consultation)
                    if (pageType === "Certificat") {
                        var adjustementTable = {1500: 0.85, 1700: 0.9, 2000: 0.95, 5000:1};
                    } else if (pageType === "Demande") {
                        var adjustementTable = {1300: 0.7, 1700: 0.8, 2000: 0.9, 2500: 1};
                    } else if (pageType === "Courrier") {
                        var adjustementTable = {1500: 0.75, 1700: 0.85, 1900: 0.9, 2100: 0.95, 5000: 1};
                    }
                    let keys = Object.keys(adjustementTable).sort((a, b) => a - b);
                    let adjustementKey = keys.find(key => availableWidth <= key);
                    let adjustement = adjustementTable[adjustementKey] || adjustementTable[keys[keys.length - 1]];
                    console.log('adjustement', adjustement);
                    let textAreaWidth = (1 - historyProportion) * (availableWidth * adjustement) * 0.8;
                    targetElement.style.width = textAreaWidth + 'px';

                    // put #ContentPlaceHolder1_DocVersionUserControl_PanelPrescriptionDmp and its children to the background
                    let prescriptionDmp = document.querySelector('#ContentPlaceHolder1_DocVersionUserControl_PanelPrescriptionDmp');
                    if (prescriptionDmp) {
                        prescriptionDmp.style.position = 'relative'; // z-index only works on positioned elements
                        prescriptionDmp.style.zIndex = '-1'; // set to a negative value to put it to the background
                    }
                }

            }

            function resetTargetElement() {
                console.log('resetTargetElement');
                // Rétablir les valeurs initiales
                targetElement.style.position = initialStylesTargetElement.position;
                targetElement.style.left = initialStylesTargetElement.left;
                targetElement.style.marginTop = initialStylesTargetElement.marginTop;
                targetElement.style.width = initialStylesTargetElement.width;

                if (pageType === "Consultation" || pageType === "Formulaire") {
                    unitsElement.style.position = initialStylesUnitsElement.position;
                    unitsElement.style.left = initialStylesUnitsElement.left;
                    unitsElement.style.marginTop = initialStylesUnitsElement.marginTop;
                    unitsElement.style.width = initialStylesUnitsElement.width;
                } else if (pageType === "Certificat" || pageType === "Demande" || pageType === "Courrier") {
                    toSetFifty.setAttribute("width", '100%');
                }
            }


            // Définition des éléments à déplacer et de la cible
            let elementToMove = document.querySelector('#ContentPlaceHolder1_EvenementUcForm1_PanelHistoriqueFrame');
            let targetElement = document.querySelector(currentPage['targetElementSelector']);
            if (pageType === "Consultation") {
                var unitsElement = document.querySelector('#ContentPlaceHolder1_SuivisGrid'); // spécifique à la page de consultation
            } else if (pageType === "Certificat" || pageType === "Demande" || pageType === "Courrier") {
                var toSetRight = document.querySelector('#ContentPlaceHolder1_UpdatePanelBaseGlossaireUCForm1').parentNode;
                var toSetFifty = document.querySelector('#ContentPlaceHolder1_UpdatePanelBaseGlossaireUCForm1 table');
            }
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

                if (pageType === "Consultation") {
                    let iframeToWriteIn = document.querySelector('#CE_ContentPlaceHolder1_EditorConsultation1_ID_Frame');
                    iframeToWriteIn.contentDocument.querySelector('body').focus();
                }

                // réinitialiser les éléments à la disparition de l'iframe
                observeDiseapearance(iframeToActOn, resetTargetElement, true);
            });
        }


        // Automatiquement afficher l'historique
        lightObserver('#ContentPlaceHolder1_EvenementUcForm1_ImageButtonShowHistoriqueFrame', (elements) => {
            let iframe = document.querySelector('#ContentPlaceHolder1_EvenementUcForm1_PanelHistoriqueFrame > iframe');
            if (elements.length > 0 && !iframe) {
                elements[0].click();
                recordMetrics({clicks: 1, drags: 1});
            }
        }, document, true);


        // Attendre que l'iframe soit présente ET chargée pour déplacer l'historique
        lightObserver('#ContentPlaceHolder1_EvenementUcForm1_PanelHistoriqueFrame > iframe', moveToLeft);            
    });
});



pagesToLeftPannel_.forEach((page) => {
    addTweak(page.url, 'autoATCD', function() {
        // Automatiquement afficher l'ATCD
        lightObserver('#ContentPlaceHolder1_EvenementUcForm1_ImageButtonShowAntecedent', () => {
            console.log('[autoATCD] bouton atcd détecté');
            lightObserver('#ContentPlaceHolder1_EvenementUcForm1_PanelHistoriqueFrame', () => {
                console.log('[autoATCD] iframe chargé');
                let atcdElement = document.querySelector('#ContentPlaceHolder1_EvenementUcForm1_PanelAntecedent');
                let buttonAtcd = document.querySelector('#ContentPlaceHolder1_EvenementUcForm1_ImageButtonShowAntecedent');
                if (!atcdElement && buttonAtcd) {
                    buttonAtcd.click();
                    recordMetrics({clicks: 1, drags: 1});
                }
            });                
        }, document,true);
    });
});