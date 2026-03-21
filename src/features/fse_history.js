/**
 * @file fse_history.js
 * @description Affichage de l'historique des facturations dans la page FSE.
 * Charge l'historique via une iframe, en extrait les données (date, cotation, montant)
 * et les affiche dans un panneau fixe de l'interface.
 * Expose getHiddenBillingData(), utilisée par fse_cotation_helper.js.
 *
 * @requires tweaks.js (addTweak)
 * @requires storage.js (getOptionPromise)
 * @requires consultation.js (createIframe)
 * @requires date-time-helpers.js (sleep)
 * @requires dom-helpers.js (clicCSPLockedElement)
 */

addTweak('/vitalzen/fse.aspx', 'showBillingHistory', async function () {
    if (window.location.href.includes('Buffer=')) {
        console.log('[showBillingHistory] Buffer mode detected, skipping billing history display to avoid conflicts with other features like omnidoc facturation');
        return;
    }

    const iframeId = 'WHHistoryIframe';
    const targetElement = document.querySelector('.fseContainer');
    const iframe = createIframe(targetElement, iframeId); // ici targetElement est nécessaire comme référence pour l'insertion de l'iframe

    await new Promise((resolve) => {
        iframe.addEventListener('load', resolve);
    });

    await sleep(1000); // Attendre un peu pour que la page se charge

    // Vérifier qu'on soit bien sur l'onglet "Consultation" sinon les cotations ne sont pas affichées
    if (!iframe.contentDocument.querySelector('#LabelCommandAffiche').textContent.includes('Consultation')) {
        console.log('[showBillingHistory] Onglet "Consultation" non sélectionné, les cotations ne sont pas affichées');
        let ongletConsultation = iframe.contentDocument.querySelector('#ButtonConsultation');
        ongletConsultation.click();
        await sleep(100);
    }

    const userSelector = '#DropDownListUsers';
    const currentUser = getCurrentUser(iframeId, userSelector);
    // On stocke la valeur dans le session storage
    sessionStorage.setItem('currentHistoryUserForCotationHistory', currentUser);
    const loggedInUser = swapNomPrenom(document.getElementById('LabelUserLog').innerText);


    await selectProperUser(iframeId, loggedInUser, userSelector);
    await sleep(250);
    await showWholeHistory(iframeId);

    let billingData = extractBillingData(iframe.contentDocument);
    // console.log('billingData', billingData);
    billingData = trimOldBillingData(billingData, 5); // Afficher uniquement les 5 dernières années, car certaines cotations peuvent être appliquées une fois sur 5 ans
    let filteredBillingData = await filterBillingData(billingData); // Filtrer les cotations indésirables
    await showBillingData(billingData, filteredBillingData);

    await sleep(250);
    await selectProperUser(iframeId, currentUser, userSelector);
    // On supprime la valeur du session storage
    sessionStorage.removeItem('currentHistoryUserForCotationHistory');
});

// On restaure l'utilisateur sélectionné avant l'affichage de l'historique dans la page d'accueil si le mauvais utilisateur est sélectionné
// et que le session storage contient une valeur
addTweak('/FolderMedical/PatientViewForm.aspx', 'showBillingHistory', async function () {
    console.log('[showBillingHistory] On restaure l\'utilisateur sélectionné avant l\'affichage de l\'historique');
    const recordedUser = sessionStorage.getItem('currentHistoryUserForCotationHistory');
    if (!recordedUser) {
        return;
    }
    console.log('[showBillingHistory] Utilisateur enregistré:', recordedUser);
    const menuUtilisateur = document.querySelector('#ContentPlaceHolder1_DropDownListUsers');
    if (!menuUtilisateur) {
        return;
    }
    const currentSelectedUser = menuUtilisateur.options[menuUtilisateur.selectedIndex].textContent;
    if (currentSelectedUser !== recordedUser) {
        console.log('[showBillingHistory] Mauvais utilisateur sélectionné, on restaure l\'utilisateur enregistré');
        // Parcourir toutes les options pour trouver celle qui correspond exactement au utilisateur enregistré
        for (let i = 0; i < menuUtilisateur.options.length; i++) {
            if (menuUtilisateur.options[i].textContent.trim() === recordedUser.trim()) {
                menuUtilisateur.selectedIndex = i;
                menuUtilisateur.dispatchEvent(new Event('change', { bubbles: true }));
                sessionStorage.removeItem('currentHistoryUserForCotationHistory');
                break;
            }
        }
    }
});

// Fonction utilitaire pour accéder à l'iframe et au sélecteur d'utilisateur
function getUserSelect(iframeId, selector) {
    const iframe = document.querySelector('#' + iframeId);
    if (!iframe) {
        console.error('[showBillingHistory] iframe not found');
        return null;
    }
    return iframe.contentDocument.querySelector(selector);
}

// Fonction utilitaire pour obtenir l'utilisateur sélectionné
function getSelectedUser(userSelect) {
    return userSelect.options[userSelect.selectedIndex].textContent;
}

/**
 * Récupère l'utilisateur actuellement sélectionné dans un iframe.
 * 
 * @param {string} iframeId - ID de l'iframe contenant le sélecteur d'utilisateur
 * @param {string} selector - Sélecteur CSS du menu déroulant utilisateur
 * @returns {string|null} - Nom de l'utilisateur sélectionné, ou null
 */
function getCurrentUser(iframeId, selector) {
    console.log('[showBillingHistory] getCurrentUser');
    const userSelect = getUserSelect(iframeId, selector);
    return userSelect ? getSelectedUser(userSelect) : null;
}

/**
 * Sélectionne l'utilisateur approprié dans l'historique des facturations.
 * Cherche et sélectionne l'utilisateur correspondant au nom donné.
 * 
 * @async
 * @param {string} iframeId - ID de l'iframe contenant l'historique
 * @param {string} nom - Nom de l'utilisateur à sélectionner
 * @param {string} selector - Sélecteur CSS du menu déroulant
 * @returns {Promise<boolean>} - True si sélection réussie, false sinon
 */
async function selectProperUser(iframeId, nom, selector) {
    nom = nom.trim();
    console.log('[showBillingHistory] selectProperUser on cherche à sélectionner :', nom);
    const userSelect = getUserSelect(iframeId, selector);

    const currentSelectedUser = getSelectedUser(userSelect);

    if (currentSelectedUser.startsWith(nom)) {
        console.log('[showBillingHistory] user already selected');
        return;
    }

    // On parcourt les options pour trouver le nom et le sélectionner
    const options = userSelect.options;
    for (let i = 0; i < options.length; i++) {
        if (options[i].textContent.trim().startsWith(nom)) {
            userSelect.selectedIndex = i;
            userSelect.dispatchEvent(new Event('change', { bubbles: true }));
            break;
        }
    }
}



async function showWholeHistory(iframeId) {
    console.log('[showBillingHistory] showWholeHistory');
    const iframeSel = '#' + iframeId;
    clicCSPLockedElement("#HistoriqueUCForm1_LinkButtonSuiteWeda", iframeSel);

    const iframe = document.querySelector(iframeSel);
    if (iframe) {
        await sleep(250);
    }
}


function swapNomPrenom(loggedInUser) {
    const parts = loggedInUser.split(' ');
    const lastNameIndex = parts.findIndex(part => part === part.toUpperCase());
    if (lastNameIndex === -1) {
        return loggedInUser; // Si aucun nom en majuscule n'est trouvé, retourner l'original
    }
    const firstName = parts.slice(0, lastNameIndex).join(' ');
    const lastName = parts.slice(lastNameIndex).join(' ');
    return `${lastName} ${firstName}`;
}

/**
 * Extrait les données de facturation depuis l'historique FSE.
 * Parse le tableau d'historique et retourne un tableau structuré de facturations.
 * 
 * @param {Document} iframeDocument - Document de l'iframe contenant l'historique
 * @returns {Array<Object>} - Tableau d'objets de facturation avec date, cotation, etc.
 */
function extractBillingData(iframeDocument) {
    const elements = iframeDocument.querySelectorAll('[name=dh9]');
    const billingData = [];

    elements.forEach(element => {
        const labelilElements = element.querySelectorAll('.labelil');
        console.log('Nombre d\'éléments labelil trouvés:', labelilElements.length);

        // Traiter chaque labelil à position impaire (index pair)
        for (let i = 1; i < labelilElements.length; i += 2) {
            const currentLabelil = labelilElements[i];
            if (!currentLabelil) continue;

            const values = currentLabelil.nextElementSibling?.querySelectorAll('td');
            if (!values || values.length < 6) continue;

            const Date = values[1].textContent?.trim() || '';
            const Actes = values[4].textContent?.trim() || '';
            const Montant = (values[5].textContent?.trim() || '') + ' €';
            console.log('Date', Date, 'Actes', Actes, 'Montant', Montant);

            if (Date && Actes) {  // Vérifier que les données essentielles sont présentes
                billingData.push({ Date, Actes, Montant });
            }
        }
    });

    return billingData;
}

function trimOldBillingData(billingData, olderThanYears) {
    const today = new Date();
    const year = today.getFullYear();
    const olderThan = year - olderThanYears;
    return billingData.filter(data => {
        const year = parseInt(data.Date.split('/')[2]);
        return year >= olderThan;
    });
}

async function showBillingData(billingData, billingDataFiltered) {
    const billingDataContainer = createBillingDataContainer();

    const toggleButton = document.createElement('button');
    toggleButton.textContent = 'Afficher toutes les données';
    let showingFiltered = true;

    toggleButton.addEventListener('click', () => {
        showingFiltered = !showingFiltered;
        toggleButton.textContent = showingFiltered ? 'Afficher toutes les données' : 'Afficher les données filtrées';
        updateBillingData(showingFiltered ? billingDataFiltered : billingData);
    });

    const infoIcon = document.createElement('span');
    infoIcon.textContent = 'ℹ️'; // Icône d'information
    infoIcon.className = 'info-icon';
    infoIcon.style.fontFamily = 'Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"'; // Ensure emoji font
    infoIcon.style.cursor = 'pointer';
    infoIcon.title = "Historique des facturations affiché via Weda-Helper. Si non désiré ou s'il gène l'affichage sur un écran en 4:3, vous pouvez le désactiver dans les options";

    const title = document.createElement('h3');
    title.textContent = 'Historique des facturations';
    title.appendChild(infoIcon);

    billingDataContainer.appendChild(title);
    billingDataContainer.appendChild(toggleButton);
    document.body.appendChild(billingDataContainer);

    // Create a hidden div to store the billingData
    const hiddenBillingData = document.createElement('div');
    hiddenBillingData.style.display = 'none';
    hiddenBillingData.id = 'hiddenBillingData';
    hiddenBillingData.textContent = JSON.stringify(billingData);
    document.body.appendChild(hiddenBillingData);

    updateBillingData(billingDataFiltered);

    function updateBillingData(data) {
        billingDataContainer.querySelectorAll('div').forEach(div => div.remove());
        const dataContainer = document.createElement('div');
        data.forEach(item => {
            dataContainer.innerHTML += `<p>${item.Date} - ${item.Actes} - ${item.Montant}</p>`;
        });
        billingDataContainer.appendChild(dataContainer);
    }
}

function getHiddenBillingData() {
    const hiddenBillingData = document.getElementById('hiddenBillingData');
    return hiddenBillingData ? JSON.parse(hiddenBillingData.textContent) : [];
}

async function filterBillingData(billingData) {
    // billingDataFilter contiens une liste de cotations à filtrer
    let toBeFiltered = await getOptionPromise('billingDataFilter');
    // console.log('toBeFiltered', toBeFiltered);
    if (!toBeFiltered) {
        return billingData;
    }
    // Convertir la chaîne en tableau sans espaces
    toBeFiltered = toBeFiltered.split(',').map(item => item.trim());

    function checkIfCotationOk(data) {
        // On cherche dans data.actes si on trouve +xIK (où x peut-être n'importe quel nombre).
        // S'il est trouvé, on le remplace par +IK pour la comparaison, mais on garde l'original.
        const actesForComparison = data.Actes.replace(/\+\d+IK/g, '+IK');
        let toReturn = !toBeFiltered.includes(actesForComparison);
        return toReturn;
    }

    return billingData.filter(checkIfCotationOk);
}

function createBillingDataContainer() {
    const container = document.createElement('div');
    container.style = 'position: fixed; top: 40px; right: 20px; padding: 10px; border: 1px solid #ccc; border-radius: 5px; width: 300px; height: auto;';
    container.style.maxHeight = '80vh'; // Limite la hauteur à 80% de la hauteur de la fenêtre
    container.style.overflowY = 'auto'; // Active le défilement vertical si nécessaire
    container.style.width = 'auto';
    return container;
}