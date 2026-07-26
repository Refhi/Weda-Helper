/**
 * @file accueil.js
 * @description Fonctionnalités pour la page d'accueil patient.
 * Gère les améliorations de la page d'accueil et de vue patient :
 * - Alertes de dates ATCD
 * - Lecture automatique carte vitale et sélection patient
 * - Copie NIR et numéro sécu
 * - Edition simplifiée des antécédents
 * 
 * @requires tweaks.js (addTweak)
 * @requires storage.js (getOptionPromise)
 * @requires keyCommands.js (clickCarteVitale)
 * @requires notifications.js (sendWedaNotif)
 */

// // [page d'accueil]
let homePageUrls = [
    '/FolderMedical/FindPatientForm.aspx',
    '/FolderMedical/PatientViewForm.aspx'
];

// Note : La gestion des alertes de dates d'antécédents (preAlertATCD) a été déplacée dans alertesDates.js

addTweak(homePageUrls, 'autoSelectPatientCV', async function () {
    // lit automatiquement la carte vitale elle est insérée
    // selecteur de ttt131 : body > weda-notification-container > ng-component > mat-card > div > p
    // selecteur ce jour : body > weda-notification-container > ng-component:nth-child(2) > mat-card > div > p
    let cvSelectors = 'weda-notification-container ng-component mat-card div p';

    // Fonction helper pour vérifier si l'onglet courant est l'onglet actif
    async function isCurrentTabActive() {
        const autoSelectPatientCV_OnlyOnActiveTab = await getOptionPromise('autoSelectPatientCV_OnlyOnActiveTab');
        if (!autoSelectPatientCV_OnlyOnActiveTab) {
            console.log('autoSelectPatientCV_OnlyOnActiveTab désactivé, lecture CV autorisée dans tout les onglets');
            return true; // Si l'option est désactivée, on autorise par défaut
        }

        try {
            const hasPermission = await checkPermission('tabs');
            if (!hasPermission) {
                console.log('Permission tabs non accordée, lecture CV autorisée par défaut');
                return true; // Par défaut, on autorise si pas de permission
            }

            const [currentTab, activeTab] = await Promise.all([
                handleTabsFeature({ action: 'getCurrentTab', info: 'Vérification onglet CV' }),
                handleTabsFeature({ action: 'getActiveTab', info: 'Vérification onglet CV' })
            ]);

            return currentTab && activeTab && currentTab.id === activeTab.id;
        } catch (error) {
            console.error('Erreur vérification onglet actif:', error);
            return true; // En cas d'erreur, on autorise par défaut
        }
    }

    waitForElement({
        selector: cvSelectors,
        callback: async function (elements) {
            console.log('cvSelectors', elements, 'found');
            for (const cvElement of elements) {
                console.log('cvElement text', cvElement.textContent);
                if (cvElement.textContent.includes('Vitale insérée')) {
                    console.log('cvElement', cvElement, 'found');
                    recordMetrics({ clicks: 1, drags: 1 });
                    // On vérifie que l'onglet est actif (même si le navigateur est réduit)
                    const tabIsActive = await isCurrentTabActive();
                    if (!tabIsActive) {
                        console.log('Onglet inactif, je ne clique pas sur la carte vitale');
                        return;
                    }
                    clickCarteVitale();
                }
            }
        }
    });


    // sélectionne automatiquement le dossier patient lié s'il est seul sur la carte
    let patientSelector = '#mat-dialog-0 > vz-lecture-cv table .grid-item'
    const lookForPatient = () => {
        var elements = document.querySelectorAll(patientSelector);
        // remove from the elements all without only capital letters or spaces in the text
        elements = Array.from(elements).filter(element => element.textContent.match(/^[A-Z\s-]+$/));
        // remove any .patientLink.pointer.ng-star-inserted
        elements = Array.from(elements).filter(element => !element.querySelector('.patientLink.pointer.ng-star-inserted'));
        // remove any NOT containing a space in the text
        elements = Array.from(elements).filter(element => element.textContent.match(/\s/));

        console.log('les patients trouvés sont', elements);
        if (elements.length === 1) {
            // on vérifie d’abord que le timeStamp n’est pas trop récent
            let lastClickedPatient = sessionStorage.getItem('lastClickedPatient');
            let delaySinceLastClick = lastClickedPatient ? Date.now() - lastClickedPatient : null;
            if (lastClickedPatient && delaySinceLastClick < 15000) { // 15 secondes
                console.log('Patient déjà cliqué récemment, je ne clique pas à nouveau', elements[0], 'delaySinceLastClick', delaySinceLastClick);
                return;
            }
            console.log('Patient seul trouvé, je clique dessus', elements[0]);
            // target the next element in the DOM on the same level, with .grid-item as class
            var nextElement = elements[0].nextElementSibling;
            console.log('nextElement', nextElement);
            // if it have a direct child with .mat-tooltip-trigger.sign click it
            let linkedDossier = nextElement.querySelector('.mat-tooltip-trigger.sign');
            if (linkedDossier) {
                console.log('nextElement', linkedDossier, 'found and clickable');
                // on stocke un timestamp dans le stockage de session
                sessionStorage.setItem('lastClickedPatient', Date.now());
                linkedDossier.click();
                recordMetrics({ clicks: 1, drags: 1 });
            } else {
                console.log('nextElement', nextElement, 'not found or not clickable');
            }

        } else if (elements.length >= 2) {
            console.log(elements.length, 'trop de patients trouvé, je ne clique pas', elements);
        } else {
            console.log('Aucun patient trouvé', elements);
        }
    };

    waitForElement({
        selector: patientSelector,
        justOnce: true,
        callback: function () {
            setTimeout(lookForPatient, 100);
        }
    });
});

addTweak(homePageUrls, 'TweakNIR', function () {
    function addCopySymbol(element, copyText) {
        // Define the id for the copySymbol
        var copySymbolId = 'copySymbol-' + element.id;

        // Check if an element with the same id already exists
        if (!document.getElementById(copySymbolId)) {
            console.log('copySymbolId', copySymbolId, 'not found, creating it');
            // Create a new element for the copy symbol
            var copySymbol = document.createElement('span');
            copySymbol.textContent = '📋'; // Use clipboard emoji as copy symbol
            copySymbol.style.cursor = 'pointer'; // Change cursor to pointer when hovering over the copy symbol
            copySymbol.title = 'Cliquez ici pour copier le NIR dans le presse-papiers'; // Add tooltip text
            copySymbol.id = copySymbolId;

            // Add a click event handler to the copy symbol
            copySymbol.addEventListener('click', function () {
                console.log(copyText);
                navigator.clipboard.writeText(copyText);
                recordMetrics({ clicks: 3, drags: 2 });
            });

            // Add the copy symbol next to the element
            console.log('copySymbol', copySymbol, 'added next to element', element);
            element.parentNode.insertBefore(copySymbol, element.nextSibling);
        } else {
            console.log('copySymbolId', copySymbolId, 'already exists');
        }
    }


    waitForElement({
        selector: '#ContentPlaceHolder1_EtatCivilUCForm1_insiContainer span.label',
        callback: (elements) => {
            console.log('element', elements[0]);
            var nir = elements[0].textContent.match(/(\d{13} \d{2})/)[1];
            nir = nir.replace(/\s/g, ''); // Supprime tous les espaces de la chaîne
            addCopySymbol(elements[0], nir);
            elements[0].addEventListener('click', function () {
                navigator.clipboard.writeText(nir);
                recordMetrics({ clicks: 3, drags: 2 });
            });
        }
    });



    waitForElement({
        selector: '#ContentPlaceHolder1_EtatCivilUCForm1_LabelPatientSecuriteSocial',
        callback: (elements) => {
            var secu = elements[0].textContent.match(/(\d{1} \d{2} \d{2} \d{2} \d{3} \d{3} \d{2})/)[1];
            secu = secu.replace(/\s/g, ''); // Supprime tous les espaces de la chaîne
            addCopySymbol(elements[0], secu);
            elements[0].addEventListener('click', function () {
                navigator.clipboard.writeText(secu);
                recordMetrics({ clicks: 3, drags: 2 });
            });
        }
    });
});






// Retirer le caractère "gras" du prénom du patient dans la page d'accueil pour plus facilement distinguer le nom du prénom
addTweak('/FolderMedical/PatientViewForm.aspx', 'removeBoldPatientFirstName', function () {
    let elementPrenom1 = document.querySelector('#ContentPlaceHolder1_EtatCivilUCForm1_LabelPatientPrenom');
    let elementPrenom2 = document.querySelector('#ContentPlaceHolder1_EtatCivilUCForm1_LabelPatientJeuneFille');
    if (elementPrenom1) {
        elementPrenom1.style.fontWeight = 'normal';
    }
    if (elementPrenom2) {
        elementPrenom2.style.fontWeight = 'normal';
    }
});


// Sauvegarde de la position de défilement
addTweak('/FolderMedical/PatientViewForm.aspx', '*keepScrollPosition', function () {
    const boutonSuiteHaute = document.querySelector('#ContentPlaceHolder1_HistoriqueUCForm1_LinkButtonSuiteWeda');
    const boutonSuiteBas = document.querySelector('#ContentPlaceHolder1_HistoriqueUCForm1_ButtonSuiteWeda');
    const boutonsSuite = [boutonSuiteHaute, boutonSuiteBas];
    let scrollContainer = document.querySelector('#ContentPlaceHolder1_DivScrollHistorique');

    // On ajoute un listener sur les boutons de suite pour sauvegarder la position de défilement
    boutonsSuite.forEach(bouton => {
        if (bouton) {
            bouton.addEventListener('click', function () {
                if (scrollContainer) {
                    sessionStorage.setItem('historicScrollPosition', scrollContainer.scrollTop);
                    console.log('[keepScrollPosition] historicScrollPosition sauvegardée', scrollContainer.scrollTop);
                }
                // On attends que les boutons disparaissent pour restaurer la position de défilement
                observeDiseapearance(boutonSuiteHaute, function () {
                    console.log('[keepScrollPosition] boutonSuiteHaute disparu');
                    if (scrollContainer) {
                        const historicScrollPosition = sessionStorage.getItem('historicScrollPosition');
                        if (historicScrollPosition) {
                            let scrollContainer = document.querySelector('#ContentPlaceHolder1_DivScrollHistorique');
                            scrollContainer.scrollTop = parseInt(historicScrollPosition);
                            console.log('[keepScrollPosition] historicScrollPosition restaurée', historicScrollPosition);
                            sessionStorage.removeItem('historicScrollPosition');
                        }
                    }
                });
            });
        }
    });
});


// Simplification de l'accès aux atcd
// Quand on fait un clic droit sur un atcd depuis la page d'accueil, récupérer l'innerText du span title.
// Ensuite une fois dans la gestion des antécédents, cliquer sur l'atcd correspondant
addTweak('/FolderMedical/PatientViewForm.aspx', 'simplifyATCD', function () {
    const atcdPanelSelector = 'div[title="Cliquez ici pour modifier le volet médical du patient"]';
    waitForElement({
        selector: atcdPanelSelector,
        triggerOnInit: true,
        callback: function () {
            const atcdPanelElement = document.querySelector(atcdPanelSelector);
            // Ensuite on liste l'ensemble des atcd possibles (uniquement les div directs, sauf ceux avec .sm)
            const atcdElements = Array.from(atcdPanelElement.children).filter(child =>
                child.tagName === 'DIV' && !child.classList.contains('sm') && !child.classList.contains('st')
            );
            // On y ajoute des clic droit listeners pour chaque atcd
            atcdElements.forEach(atcdElement => {
                // Variable pour stocker le timeout pour l'affichage du tooltip
                let tooltipTimeout;

                // Ajout d'un mouseover pour afficher une info-bulle après 200ms
                atcdElement.addEventListener('mouseover', function () {
                    tooltipTimeout = setTimeout(function () {
                        showTooltip(atcdElement, "WH:bouton droit pour éditer");
                    }, 200);
                });

                // Ajout d'un mouseout pour annuler le timeout et retirer l'info-bulle
                atcdElement.addEventListener('mouseout', function () {
                    // Annuler le timeout si l'utilisateur quitte l'élément avant 200ms
                    clearTimeout(tooltipTimeout);
                    // On retire l'info-bulle
                    removeTooltip(atcdElement);
                });

                atcdElement.addEventListener('contextmenu', function (e) {
                    e.preventDefault(); // Empêcher le menu contextuel par défaut
                    // On récupère l'innerText du span title
                    const atcdTitle = atcdElement.querySelector('span[title]').innerText;
                    // On le stocke dans le sessionStorage
                    sessionStorage.setItem('atcdTitle', atcdTitle);
                    console.log('[simplifyATCD] atcdTitle sauvegardé', atcdTitle);

                    // Cliquer sur l'élément pour naviguer vers la page des ATCD
                    atcdElement.click();
                });
            });
        }
    });
});

function showTooltip(element, message) {
    // Créer une info-bulle
    let tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.innerText = message;
    tooltip.style.position = 'absolute';
    tooltip.style.backgroundColor = '#fff';
    tooltip.style.border = '1px solid #000';
    tooltip.style.padding = '5px';
    tooltip.style.zIndex = '1000';
    document.body.appendChild(tooltip);

    // Positionner l'info-bulle
    let rect = element.getBoundingClientRect();
    tooltip.style.left = rect.left + window.scrollX + 'px';
    tooltip.style.top = rect.bottom + window.scrollY + 'px';

    // Retirer l'info-bulle au bout de 2 secondes
    setTimeout(() => {
        document.body.removeChild(tooltip);
    }, 2000);
}

function removeTooltip(element) {
    // Retirer l'info-bulle si elle existe
    let tooltip = document.querySelector('.tooltip');
    if (tooltip) {
        document.body.removeChild(tooltip);
    }
}

// Ensuite on travaille dans la page des atcd.
addTweak('/FolderMedical/AntecedentForm.aspx', 'simplifyATCD', function () {
    const atcdTitle = sessionStorage.getItem('atcdTitle');
    console.log('[simplifyATCD] atcdTitle récupéré', atcdTitle);
    if (atcdTitle) {
        // On cherche l'élément qui correspond à l'atcdTitle
        const atcdElements = document.querySelectorAll('table[title="Cliquez pour modifier"]');
        atcdElements.forEach(atcdElement => {
            if (atcdElement.innerText.includes(atcdTitle)) {
                console.log('[simplifyATCD] atcdElement', atcdElement);
                // On clique dessus
                sessionStorage.removeItem('atcdTitle');
                atcdElement.click();
            }
        });
    }
});

addTweak('*', 'pastePatient', function () {
    // tout d'abord on ajoute un élément à droite du champ de recherche
    const champRecherche = document.querySelector('#PanelFindPatient');
    if (!champRecherche) return;
    const champRechercheInput = document.querySelector("#TextBoxFindPatient");
    // on ajoute à sa droite une emoticone de collage
    const emoticoneColle = document.createElement('span');
    emoticoneColle.innerText = '📋';
    emoticoneColle.style.cursor = 'pointer';
    emoticoneColle.style.marginLeft = '5px';
    emoticoneColle.style.verticalAlign = 'middle';
    emoticoneColle.title = 'Coller le contenu du presse-papiers';
    emoticoneColle.addEventListener('click', function () {
        navigator.clipboard.readText().then(text => {
            console.log('[pastePatient] texte collé', text, "dans", champRechercheInput);
            // ajout d'un timestamp
            champRechercheInput.value = text;
            sessionStorage.setItem('lastPatientSearch', Date.now());
            champRechercheInput.dispatchEvent(new Event('change', { bubbles: true }));
            recordMetrics({ clicks: 1, drags: 1 });
        });
    });

    // Insérer directement dans le panel, à côté de l'input
    champRecherche.appendChild(emoticoneColle);
});


// Ajoute un écouteur d’évènements sur la searchbox
addTweak('*', '*watchPatientSearchBox', function () {
    const champRechercheInput = document.querySelector("#TextBoxFindPatient");
    if (!champRechercheInput) return;

    champRechercheInput.addEventListener('input', function () {
        // On met à jour le timestamp à chaque saisie
        sessionStorage.setItem('lastPatientSearch', Date.now());
        // console.log('[watchPatientSearchBox] lastPatientSearch', sessionStorage.getItem('lastPatientSearch'));
    });
});



// Panneau de test pour les notifications
addTweak('*', 'testNotifPanel', function () {
    // Créer le panneau de test
    const testPanel = document.createElement('div');
    testPanel.id = 'wedaHelperNotifTestPanel';
    testPanel.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: white;
        border: 2px solid #333;
        padding: 15px;
        z-index: 10000;
        max-width: 400px;
        display: none;
    `;

    // Titre
    const title = document.createElement('h3');
    title.textContent = 'Test Notifications Weda-Helper';
    title.style.marginTop = '0';
    testPanel.appendChild(title);

    // Bouton pour fermer
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Fermer';
    closeBtn.style.cssText = 'float: right; margin-top: -30px;';
    closeBtn.addEventListener('click', () => {
        testPanel.style.display = 'none';
    });
    testPanel.appendChild(closeBtn);

    // Champ de texte pour le message
    const messageLabel = document.createElement('label');
    messageLabel.textContent = 'Message:';
    messageLabel.style.display = 'block';
    messageLabel.style.marginTop = '10px';
    testPanel.appendChild(messageLabel);

    const messageInput = document.createElement('input');
    messageInput.type = 'text';
    messageInput.value = 'Test de notification';
    messageInput.style.cssText = 'width: 100%; padding: 5px; margin: 5px 0;';
    testPanel.appendChild(messageInput);

    // Sélecteur de type
    const typeLabel = document.createElement('label');
    typeLabel.textContent = 'Type:';
    typeLabel.style.display = 'block';
    typeLabel.style.marginTop = '10px';
    testPanel.appendChild(typeLabel);

    const typeSelect = document.createElement('select');
    typeSelect.style.cssText = 'width: 100%; padding: 5px; margin: 5px 0;';
    ['success', 'fail', 'undefined'].forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        typeSelect.appendChild(option);
    });
    testPanel.appendChild(typeSelect);

    // Sélecteur d'icône avec une liste étendue
    const iconLabel = document.createElement('label');
    iconLabel.textContent = 'Icône (Material Icon):';
    iconLabel.style.display = 'block';
    iconLabel.style.marginTop = '10px';
    testPanel.appendChild(iconLabel);

    const iconInput = document.createElement('input');
    iconInput.type = 'text';
    iconInput.value = 'info';
    iconInput.style.cssText = 'width: 100%; padding: 5px; margin: 5px 0;';
    testPanel.appendChild(iconInput);

    // Liste d'icônes communes
    const iconSuggestions = document.createElement('div');
    iconSuggestions.style.cssText = 'margin: 10px 0; font-size: 12px;';
    iconSuggestions.innerHTML = '<strong>Icônes courantes:</strong><br>';
    
    const commonIcons = [
        'info', 'warning', 'error', 'check_circle', 'cancel',
        'home', 'settings', 'search', 'favorite', 'star',
        'person', 'group', 'diversity_3', 'notifications', 'campaign',
        'medical_services', 'medication', 'vaccines', 'local_hospital', 'healing',
        'assignment', 'description', 'folder', 'schedule', 'event',
        'help', 'lightbulb', 'verified', 'celebration', 'psychology'
    ];

    commonIcons.forEach(icon => {
        const iconBtn = document.createElement('button');
        iconBtn.textContent = icon;
        iconBtn.style.cssText = 'margin: 2px; padding: 3px 6px; font-size: 11px;';
        iconBtn.addEventListener('click', () => {
            iconInput.value = icon;
        });
        iconSuggestions.appendChild(iconBtn);
    });
    testPanel.appendChild(iconSuggestions);

    // Durée
    const durationLabel = document.createElement('label');
    durationLabel.textContent = 'Durée (ms):';
    durationLabel.style.display = 'block';
    durationLabel.style.marginTop = '10px';
    testPanel.appendChild(durationLabel);

    const durationInput = document.createElement('input');
    durationInput.type = 'number';
    durationInput.value = '5000';
    durationInput.style.cssText = 'width: 100%; padding: 5px; margin: 5px 0;';
    testPanel.appendChild(durationInput);

    // Boutons d'envoi
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = 'margin-top: 15px;';

    const sendBtn = document.createElement('button');
    sendBtn.textContent = 'Envoyer (onglet actuel)';
    sendBtn.style.cssText = 'padding: 8px 12px; margin-right: 5px;';
    sendBtn.addEventListener('click', () => {
        sendWedaNotif({
            message: messageInput.value,
            type: typeSelect.value,
            icon: iconInput.value,
            duration: parseInt(durationInput.value)
        });
        console.log('[TestNotif] Notification envoyée:', {
            message: messageInput.value,
            type: typeSelect.value,
            icon: iconInput.value,
            duration: parseInt(durationInput.value)
        });
    });
    buttonsContainer.appendChild(sendBtn);

    const sendAllBtn = document.createElement('button');
    sendAllBtn.textContent = 'Envoyer (tous onglets)';
    sendAllBtn.style.cssText = 'padding: 8px 12px;';
    sendAllBtn.addEventListener('click', () => {
        sendWedaNotifAllTabs({
            message: messageInput.value,
            type: typeSelect.value,
            icon: iconInput.value,
            duration: parseInt(durationInput.value)
        });
        console.log('[TestNotif] Notification envoyée à tous les onglets:', {
            message: messageInput.value,
            type: typeSelect.value,
            icon: iconInput.value,
            duration: parseInt(durationInput.value)
        });
    });
    buttonsContainer.appendChild(sendAllBtn);

    testPanel.appendChild(buttonsContainer);

    // Lien vers la documentation Material Icons
    const docLink = document.createElement('div');
    docLink.style.cssText = 'margin-top: 15px; font-size: 11px; color: #666;';
    docLink.innerHTML = 'Liste complète: <a href="https://fonts.google.com/icons?icon.set=Material+Icons" target="_blank">Material Icons</a>';
    testPanel.appendChild(docLink);

    // Ajouter au DOM
    document.body.appendChild(testPanel);

    // Créer un bouton flottant pour ouvrir/fermer le panneau
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = '🔔 Test';
    toggleBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 10px 15px;
        background: #4285f4;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        z-index: 9999;
        font-weight: bold;
    `;
    toggleBtn.addEventListener('click', () => {
        if (testPanel.style.display === 'none') {
            testPanel.style.display = 'block';
            toggleBtn.style.display = 'none';
        }
    });
    document.body.appendChild(toggleBtn);

    // Permettre de fermer en affichant le bouton
    closeBtn.addEventListener('click', () => {
        toggleBtn.style.display = 'block';
    });

    console.log('[TestNotif] Panneau de test des notifications chargé. Cliquez sur le bouton "🔔 Test" en bas à droite.');
});