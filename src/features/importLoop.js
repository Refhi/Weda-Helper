/**
 * @file importLoop.js
 * @description Boucle d'analyse des imports en attente (page UpLoaderForm) avant validation manuelle.
 * Clique tour à tour sur les liens ..._PatientNom_0 à _7 puis sur la page suivante.
 * pdfParser.js appelle advanceImportLoop() lorsqu'il a fini d'analyser une ligne.
 */


// BOUCLE D'ANALYSE DES IMPORTS EN ATTENTE
// ---------------------------------------
// Parcourt les lignes _0 à _7 de chaque page de la grille puis passe à la page suivante.
// L'état est conservé dans sessionStorage pour survivre aux rafraîchissements de page.
const IMPORT_LOOP_KEY = 'WH_importLoop';
const IMPORT_LOOP_LAST_ROW = 7;
const IMPORT_LOOP_WATCHDOG_MS = 15000;

function getImportLoopState() {
    try { return JSON.parse(sessionStorage.getItem(IMPORT_LOOP_KEY)); } catch (e) { return null; }
}

function setImportLoopState(state) {
    if (state) sessionStorage.setItem(IMPORT_LOOP_KEY, JSON.stringify(state));
    else sessionStorage.removeItem(IMPORT_LOOP_KEY);
    updateImportLoopUI();
}

// Met à jour l'état des boutons et l'indicateur de progression
function updateImportLoopUI() {
    const playButton = document.getElementById('pdfParserLoopPlay');
    const stopButton = document.getElementById('pdfParserLoopStop');
    const progress = document.getElementById('pdfParserLoopProgress');
    const clearButton = document.getElementById('pdfParserLoopClear');
    if (clearButton) {
        const cached = getExtractedDataKeys().length;
        clearButton.disabled = cached === 0;
        clearButton.title = `Weda-Helper : supprime toutes les données extraites (statut « déjà importé », antécédents vérifiés...) pour ré-analyser les imports de zéro. ${cached} dossier(s) en cache.`;
    }
    if (!playButton || !stopButton || !progress) return;
    const state = getImportLoopState();
    playButton.disabled = !!state;
    stopButton.disabled = !state;
    progress.textContent = state
        ? `Page ${state.page}, ligne ${Math.max(state.index, 0) + 1}/${IMPORT_LOOP_LAST_ROW + 1}`
        : '';
}

function stopImportLoop(message) {
    setImportLoopState(null);
    console.log("[pdfParser] Boucle d'analyse terminée :", message);
    sendWedaNotif({ message: "Analyse des imports : " + message, type: 'success' });
}

function getImportLink(index) {
    return document.querySelector(`#ContentPlaceHolder1_FileStreamClassementsGrid_LinkButtonFileStreamClassementsGridPatientNom_${index}`);
}

async function goToNextImportPage(state) {
    const currentPage = document.querySelector('.grid-pager span');
    const nextLink = currentPage && currentPage.nextElementSibling && currentPage.nextElementSibling.tagName === 'A'
        ? currentPage.nextElementSibling : null;
    if (!nextLink) {
        stopImportLoop("toutes les pages ont été parcourues.");
        return;
    }
    const previousPage = currentPage.textContent;
    state.index = -1;
    state.page = (state.page || 1) + 1;
    setImportLoopState(state);
    clicCSPLockedElement('.grid-pager span + a');
    // Seul #ContentPlaceHolder1_UpdatePanelClassementGrid est rafraîchi : on attend le changement de page
    for (let i = 0; i < 50; i++) {
        await new Promise(r => setTimeout(r, 200));
        const span = document.querySelector('.grid-pager span');
        if (span && span.textContent !== previousPage && getImportLink(0)) {
            advanceImportLoop();
            return;
        }
    }
    stopImportLoop("échec du changement de page.");
}

function advanceImportLoop() {
    const state = getImportLoopState();
    if (!state) return;
    state.index += 1;
    if (state.index > IMPORT_LOOP_LAST_ROW || !getImportLink(state.index)) {
        goToNextImportPage(state);
        return;
    }
    const token = Date.now();
    state.token = token;
    setImportLoopState(state);
    console.log(`[pdfParser] Boucle d'analyse : page ${state.page}, ligne ${state.index}`);
    const link = getImportLink(state.index);
    // Si rien ne se passe après le clic, on passe à la suivante
    setTimeout(() => {
        const current = getImportLoopState();
        if (current && current.token === token) advanceImportLoop();
    }, IMPORT_LOOP_WATCHDOG_MS);
    console.log(`[pdfParser] Clic sur le lien d'import : page ${state.page}, ligne ${state.index}`, link);
    clicCSPLockedElement(`#${link.id}`);
}

// Clés sessionStorage des données extraites (une entrée par hashId de PDF)
function getExtractedDataKeys() {
    const pdfDataFields = ['documentDate', 'nameMatches', 'alreadyImported', 'antecedentsDiscordances'];
    const keys = [];
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key === IMPORT_LOOP_KEY) continue;
        try {
            const data = JSON.parse(sessionStorage.getItem(key));
            if (data && typeof data === 'object' && pdfDataFields.some(field => field in data)) keys.push(key);
        } catch (e) { /* valeur non JSON : ignorée */ }
    }
    return keys;
}

// Supprime toutes les données extraites, renvoie le nombre d'entrées supprimées
function clearExtractedData() {
    const keys = getExtractedDataKeys();
    keys.forEach(key => sessionStorage.removeItem(key));
    updateImportLoopUI();
    return keys.length;
}

function addImportLoopButton() {
    waitForElement({
        selector: '#ContentPlaceHolder1_UpdatePanelClassementGrid',
        triggerOnInit: true,
        callback: function () {
            if (document.getElementById('pdfParserLoopButton')) return;
            const grid = document.querySelector('#ContentPlaceHolder1_UpdatePanelClassementGrid');
            const container = document.createElement('div');
            container.id = 'pdfParserLoopButton';
            const makeButton = (label, title, onclick) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.innerText = label;
                button.title = title;
                button.style.marginRight = '5px';
                button.onclick = onclick;
                return button;
            };
            container.appendChild(makeButton('▶️',
                "Weda-Helper : analyse automatiquement chaque import en attente avant validation manuelle.",
                function () {
                    setImportLoopState({ index: -1, page: 1 });
                    advanceImportLoop();
                }));
            container.appendChild(makeButton('⏹️',
                "Weda-Helper : arrête l'analyse automatique des imports.",
                function () { stopImportLoop("arrêtée manuellement."); }));
            container.appendChild(makeButton('🧹',
                "Weda-Helper : Vide toutes les données en cache de pré-analyse. Utile pour ré-analyser les imports de zéro, notamment pour les tests ou si vous avez changé les prompts. Est de toute façon vidé à la fermeture du navigateur.",
                function () {
                    const count = clearExtractedData();
                    sendWedaNotif({ message: `Données extraites supprimées pour ${count} import(s).`, type: 'success' });
                }));
            const progress = document.createElement('span');
            progress.id = 'pdfParserLoopProgress';
            container.appendChild(progress);
            container.children[0].id = 'pdfParserLoopPlay';
            container.children[1].id = 'pdfParserLoopStop';
            container.children[2].id = 'pdfParserLoopClear';
            grid.parentNode.insertBefore(container, grid);
            updateImportLoopUI();
            // Le cache évolue au fil des analyses (pdfParser.js) : rafraîchissement périodique
            setInterval(updateImportLoopUI, 2000);
        }
    });
}

addTweak('/FolderMedical/UpLoaderForm.aspx', 'autoPdfParser', function () {
    addImportLoopButton();
});
