/**
 * @file fse_history.js
 * @description Affichage de l'historique des facturations dans la page FSE.
 * Récupère l'historique via recoverData() (dataScrapper.js), filtre les recettes de
 * l'utilisateur connecté et les affiche dans un panneau fixe de l'interface.
 * Expose getHiddenBillingData(), utilisée par fse_cotation_helper.js.
 *
 * @requires tweaks.js (addTweak)
 * @requires storage.js (getOptionPromise)
 * @requires dataScrapper.js (recoverData)
 */

addTweak('/vitalzen/fse.aspx', '*showBillingHistory', async function () {
    // Si l’option est désactivée, affiche un bouton simple pour déclencher tout de même l’affichage de l’historique des fse
    // sinon, fait l’affichage automatiquement
    const showBillingHistoryOption = await getOptionPromise('showBillingHistory');

    if (window.location.href.includes('Buffer=')) {
        console.log('[showBillingHistory] Buffer mode detected, skipping billing history display to avoid conflicts with other features like omnidoc facturation');
        return;
    }

    if (!showBillingHistoryOption) {
        addShowBillingHistoryButton();
        return;
    }

    await displayBillingHistory();
});

/**
 * Ajoute un bouton permettant de déclencher manuellement l'affichage de l'historique des
 * facturations, lorsque l'option showBillingHistory est désactivée.
 */
function addShowBillingHistoryButton() {
    const button = document.createElement('button');
    button.textContent = "Afficher l'historique";
    button.title = "Affiché via Weda-Helper. Vous pouvez rendre cet affichage systématique en activant l'option ad-hoc dans les options de l'extension";
    button.style.position = 'fixed';
    button.style.top = '40px';
    button.style.right = '20px';
    button.style.zIndex = 1000;
    button.addEventListener('click', async () => {
        button.remove();
        await displayBillingHistory();
    });
    document.body.appendChild(button);
}

/**
 * Récupère l'historique des facturations et l'affiche dans un panneau fixe de l'interface.
 */
async function displayBillingHistory() {
    const loggedInUser = document.getElementById('LabelUserLog').innerText.trim();

    const data = await recoverData({
        fullPage: true,
        categories: ['consultations'],
        includeLegacy: true,
    });

    let billingData = extractBillingData(data, loggedInUser);
    // console.log('billingData', billingData);
    billingData = trimOldBillingData(billingData, 7); // Afficher uniquement les 7 dernières années, car certaines cotations peuvent être appliquées une fois sur 5 ans
    let filteredBillingData = await filterBillingData(billingData); // Filtrer les cotations indésirables
    await showBillingData(billingData, filteredBillingData);
}




/**
 * Extrait les données de facturation (recettes) depuis les données récupérées par recoverData(),
 * en ne gardant que les journées dont l'auteur correspond à l'utilisateur actuellement connecté.
 * 
 * @param {Object} data - Objet retourné par recoverData({ categories: ['consultations'] })
 * @param {string} loggedInUser - Nom de l'utilisateur connecté, au format "NOM Prénom" (voir swapNomPrenom)
 * @returns {Array<Object>} - Tableau d'objets de facturation avec Date, Actes, Montant
 */
function extractBillingData(data, loggedInUser) {
    console.log('[fse_history] données de recettes récupérées :', data, loggedInUser);
    const days = data?.consultations || [];
    const nom = loggedInUser.trim();
    const billingData = [];

    days.forEach(day => {
        if (!day.author || !day.author.trim().startsWith(nom)) return; // On ne garde que les journées de l'utilisateur connecté

        (day.documents || []).forEach(doc => {
            if (doc.type !== 'recette' || !doc.recette) return;
            const Date = doc.recette.date || '';
            const Actes = doc.recette.actes || '';
            // On affiche le montant total de l'acte (issu de la ligne F.S.E.), et non le
            // montant de la recette qui ne correspond qu'à la part restant à charge du patient.
            const Montant = doc.fds?.[0]?.total || doc.recette.montant || '';
            const MontantFacture = doc.recette.montant || '';
            const Mode = doc.recette.mode  || '';
            if (Date && Actes) {
                billingData.push({ Date, Actes, Montant, MontantFacture, Mode});
            }
        });
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
            dataContainer.innerHTML += `<p>${item.Date} - ${item.Actes} - ${item.Montant} - ${item.MontantFacture} ${item.Mode}</p>`;
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