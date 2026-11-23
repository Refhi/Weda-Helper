/**
 * @file wedaEchanges.js
 * @description Fonctionnalités pour la page de messagerie sécurisée Weda Echanges.
 * Gère les améliorations de la messagerie :
 * - Rafraîchissement automatique de la boîte de réception
 * - Décochage automatique des messages IHE_XDM.zip
 * - Permutation titre PJ / corps message
 * 
 * @requires tweaks.js (addTweak)
 * @requires storage.js (getOption)
 * @requires dom-oberver.js (waitForElement)
 */

function getEchangesMessageKey(row = document.querySelector("#messageList .messageListItem.selected")) {
    const line = row?.querySelector(".messageLineItem");
    if (!line) return "";
    const subject = line.querySelector(".subjectLine");
    if (subject) return JSON.stringify([subject.textContent.trim(), line.querySelector(".subjectRow .date")?.textContent.trim()]);
    const copy = line.cloneNode(true);
    copy.querySelectorAll(".patientLine,.dossierChip,.whEchangesStatus").forEach(element => element.remove());
    return copy.textContent.replace(/\s+/g, " ").trim();
}

function findEchangesMessage(row, key) {
    if (row?.isConnected && getEchangesMessageKey(row) === key) return row;
    const matches = [...document.querySelectorAll("#messageList .messageListItem")].filter(item => getEchangesMessageKey(item) === key);
    return matches.length === 1 ? matches[0] : null;
}

// Page Messagerie sécurisée
addTweak("/FolderMedical/WedaEchanges/", "*secureExchangeOpenNextAfterImport", async function () {
    let enabled = await getOptionPromise("secureExchangeOpenNextAfterImport");
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes.secureExchangeOpenNextAfterImport) enabled = changes.secureExchangeOpenNextAfterImport.newValue;
    });
    const getRows = () => [...document.querySelectorAll("#messageList > .messageListItem")];
    const queueIsRunning = () => document.querySelector('#whMessageQueueToolbox[data-running="true"]');
    let stopWaiting;

    document.addEventListener("click", event => {
        if (!enabled) return;
        // Une action dans la liste ou un changement de boîte prend la main sur la navigation.
        if (event.target.closest?.("#weInboxContainer, #inboxToolbar, #whMessageQueueToolbox, .docImportButtons .button.cancel")) {
            stopWaiting?.();
            return;
        }

        const importButton = event.target.closest?.("#messageContainer .docImportButtons button.button.valid");
        if (!importButton || importButton.disabled || importButton.getAttribute("aria-disabled") === "true"
            || !importButton.getClientRects().length) return;
        stopWaiting?.();
        if (queueIsRunning()) return;

        const rows = getRows();
        const visibleRows = rows.filter(row => row.getClientRects().length);
        const selectedIndex = visibleRows.findIndex(row => row.classList.contains("selected"));
        if (selectedIndex < 0 || selectedIndex === visibleRows.length - 1) return;

        const currentRow = visibleRows[selectedIndex];
        const nextRow = visibleRows[selectedIndex + 1];
        const currentKey = getEchangesMessageKey(currentRow);
        const nextKey = getEchangesMessageKey(nextRow);
        if (!currentKey || !nextKey) return;
        const currentCount = rows.filter(row => getEchangesMessageKey(row) === currentKey).length;
        let nextStarted = false;
        const started = event => { if (event.detail?.messageKey === nextKey) nextStarted = true; };
        document.addEventListener("pdfParserEchangesStarted", started);

        const observer = new MutationObserver(() => {
            if (queueIsRunning()) {
                stopWaiting?.();
                return;
            }
            const remaining = getRows();
            // Une reconstruction du DOM peut recréer la ligne du courrier en cours.
            if (remaining.filter(row => getEchangesMessageKey(row) === currentKey).length >= currentCount) return;

            const successor = findEchangesMessage(nextRow, nextKey);
            const line = successor?.querySelector(".messageLineItem");
            if (!line?.getClientRects().length) return;

            stopWaiting?.();
            if (successor.classList.contains("selected") && nextStarted) return;
            line.click();
            recordMetrics({ clicks: 1, drags: 0 });
        });
        const timeout = setTimeout(() => stopWaiting?.(), 10000);
        stopWaiting = () => {
            observer.disconnect();
            clearTimeout(timeout);
            document.removeEventListener("pdfParserEchangesStarted", started);
            stopWaiting = null;
        };
        observer.observe(document.body, {
            childList: true, subtree: true, attributes: true,
            attributeFilter: ["class", "hidden", "data-running"]
        });
    }, true);
});

addTweak("/FolderMedical/WedaEchanges/", "secureExchangeFaviconCounter", function () {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const context = canvas.getContext("2d");
    if (!context) return;

    let favicon;
    let originalAttributes;
    let lastCount = null;
    let refreshTimer;

    function refreshFavicon() {
        const list = document.querySelector("#messageList");
        if (!list) {
            if (!favicon) return;
            if (originalAttributes) {
                for (const [name, value] of Object.entries(originalAttributes)) {
                    if (value === null) favicon.removeAttribute(name);
                    else favicon.setAttribute(name, value);
                }
            } else {
                favicon.remove();
            }
            favicon = null;
            lastCount = null;
            return;
        }

        // Comme dans le script d'analyse de courriers, compter les lignes de la liste courante.
        const count = list.querySelectorAll(":scope > div.messageListItem").length;
        if (count === lastCount && favicon?.isConnected) return;

        if (!favicon?.isConnected) {
            favicon = document.querySelector("link[rel~='icon']");
            originalAttributes = favicon ? {
                href: favicon.getAttribute("href"),
                type: favicon.getAttribute("type")
            } : null;
            if (!favicon) {
                favicon = document.createElement("link");
                favicon.rel = "icon";
                document.head.append(favicon);
            }
        }

        const label = count > 99 ? "99+" : String(count);
        const fontSize = label.length === 1 ? 38 : label.length === 2 ? 32 : 24;
        context.clearRect(0, 0, 64, 64);
        context.beginPath();
        context.arc(32, 32, 30, 0, Math.PI * 2);
        context.fillStyle = "#174ea6";
        context.fill();
        context.lineWidth = 3;
        context.strokeStyle = "#ffffff";
        context.stroke();
        context.fillStyle = "#ffffff";
        context.font = `800 ${fontSize}px Arial, sans-serif`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(label, 32, label.length > 2 ? 33 : 34);
        favicon.type = "image/png";
        favicon.href = canvas.toDataURL("image/png");
        lastCount = count;
    }

    function scheduleRefresh() {
        if (refreshTimer) return;
        refreshTimer = setTimeout(() => {
            refreshTimer = null;
            refreshFavicon();
        }, 100);
    }

    new MutationObserver(scheduleRefresh).observe(document.body, { childList: true, subtree: true });
    window.addEventListener("focus", scheduleRefresh);
    document.addEventListener("visibilitychange", scheduleRefresh);
    refreshFavicon();
});

addTweak('/FolderMedical/WedaEchanges/', 'secureExchangeAutoRefresh', function () {
    // clique sur reçu pour rafraichir la liste des messages à intervalle régulier
    function clickOnInbox() {
        console.log('[clickOnInbox] je clique sur reçu pour rafraichir la liste des messages');
        var element = document.querySelector('#inboxToolbar > li.inbox.selected > a');
        if (element) {
            element.click();
            recordMetrics({ clicks: 1, drags: 1 });
        }
    }
    setTimeout(function () {
        setInterval(clickOnInbox, 900000);
    }, 30000);
});


addTweak('/FolderMedical/WedaEchanges/', 'secureExchangeUncheckIHEMessage', async function () {
    const titlesString = await getOptionPromise('secureExchangeUncheckSomeTitles');
    const titlesToUncheck = (titlesString || '').split(',').map(s => s.trim()).filter(s => s.length > 0);

    // Comme dans push_valider : change + input avec bubbles pour que Weda prenne bien en compte la modification
    async function uncheck(checkbox) {
        await sleep(2000)
        checkbox.checked = false;
        checkbox.dispatchEvent(new Event('change'));
    }

    waitForElement({
        selector: 'we-doc-import',
        callback: function (elements) {
            for (const element of elements) {
                if (!element.className.includes('docImportAttach')) //docImportAttach correspond aux documents joints donc si il n'y a pas cette classe, il s'agit du corps du message
                {
                    let checkbox = element.querySelector('input[type=checkbox]')
                    uncheck(checkbox);
                    recordMetrics({ clicks: 1, drags: 1 });
                } else {
                    let docTitle = element.querySelector('input.docTitle');
                    if (docTitle && titlesToUncheck.some(title => docTitle.value.toUpperCase().startsWith(title.toUpperCase()))) {
                        let checkbox = element.querySelector('input[type=checkbox]')
                        uncheck(checkbox);
                        recordMetrics({ clicks: 1, drags: 1 });
                    }
                }
            }

        }
    });
});

addTweak('/FolderMedical/WedaEchanges/', 'swapTitrePJetCorpsMessage', function () {
    // On doit selectionner les éléments avec titre="C'est le titre qu'aura le document dans le dossier patient"
    const selecteurTitres = 'input[title="C\'est le titre qu\'aura le document dans le dossier patient"]';
    waitForElement({
        selector: selecteurTitres,
        callback: function (elements) {
            if (elements.length >= 2) {
                let titreCorpsMessage = elements[0].value;
                let titrePieceJointe = elements[1].value;
                console.log('[swapTitrePJetCorpsMessage] titreCorpsMessage', titreCorpsMessage, 'titrePieceJointe', titrePieceJointe);
                elements[0].value = titrePieceJointe;
                elements[1].value = titreCorpsMessage;
                recordMetrics({ clicks: 4, drags: 4 });
            }
        }
    });
});


// Clic automatique sur "Un patient" à l'ouverture d'un message (clic manuel ou parcours par lot).
addTweak('/FolderMedical/WedaEchanges/', '*autoClickUnPatient', async function () {
    const [autoOpen, parserEnabled] = await Promise.all([getOptionPromise('autoClickUnPatient'), getOptionPromise('autoPdfParser')]);
    let cancel;
    document.addEventListener('click', event => {
        if (event.target.closest?.("#messageContainer .importPatient, #messageContainer .docImportBody td a")) {
            cancel?.();
            return;
        }
        const line = event.target.closest?.('#messageList .messageLineItem');
        if (!line) return;
        cancel?.();
        if (!autoOpen && !document.querySelector('#whMessageQueueToolbox[data-running="true"]')) return;
        const row = line.closest(".messageListItem");
        const key = getEchangesMessageKey(row);
        const selector = "#messageContainer .btnImport.importPatient";
        const previousButton = document.querySelector(selector);
        const previousBody = document.querySelector("#messageContainer .messageBody");
        const previousText = previousBody?.textContent;
        const getViewer = () => document.querySelector("#messageContainer")?.querySelector(ECHANGES_PDF_VIEWER);
        const previousViewer = getViewer();
        const previousUrl = previousViewer?.src || previousViewer?.data;
        const wasSelected = !!line.closest(".messageListItem.selected");
        let bodyReadyAt = 0, bodyTimer;
        const check = () => {
            if (cancel !== stop) return;
            if (!findEchangesMessage(row, key)?.classList.contains("selected")) return;
            const button = document.querySelector(selector);
            if (!button?.getClientRects().length || button.disabled) return;
            const body = document.querySelector("#messageContainer .messageBody");
            const viewer = getViewer();
            const url = viewer?.getAttribute("src") || viewer?.getAttribute("data");
            const attachment = document.querySelector("#messageContainer .messageAttachment");
            // L'en-tête et « Un patient » arrivent avant le contenu. Un clic à ce
            // stade ouvre l'import mais Weda n'initialise pas la recherche patient.
            if ((!url || url === "about:blank") && !(attachment?.querySelector("a[href]") || (!attachment && body?.innerText.trim()))) return;
            if (!wasSelected && button === previousButton && body === previousBody && body?.textContent === previousText) {
                // Avec deux messages sans corps, Angular peut ne remplacer que la source du lecteur.
                if (!viewer || (viewer === previousViewer && (viewer.src || viewer.data) === previousUrl)) return;
            }
            if (!url && !attachment) {
                if (!bodyReadyAt) {
                    bodyReadyAt = performance.now();
                    bodyTimer = setTimeout(check, 620);
                    return;
                }
                if (performance.now() - bodyReadyAt < 600) return;
            }
            stop();
            const freshPreview = !document.querySelector("#messageContainer .docImportButtons .button.valid");
            button.click();
            recordMetrics({ clicks: 1, drags: 0 });
            if (parserEnabled && freshPreview) recoverMissingPicker(row, key);
        };
        const observer = new MutationObserver(check);
        const timer = setTimeout(() => stop(), 9000);
        const stop = () => { observer.disconnect(); clearTimeout(timer); clearTimeout(bodyTimer); if (cancel === stop) cancel = null; };
        cancel = stop;
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
        queueMicrotask(check);
    }, true);

    // Reprendre une seule fois notre propre ouverture quand Weda a créé un
    // formulaire sans sélecteur. Une interaction humaine garde toujours la main.
    async function recoverMissingPicker(row, key) {
        let untouched = true;
        const stopOnInput = event => { if (event.isTrusted) untouched = false; };
        const events = ["pointerdown", "keydown", "input"];
        for (const name of events) document.addEventListener(name, stopOnInput, true);
        const current = () => untouched && findEchangesMessage(row, key)?.classList.contains("selected");
        const picker = () => echangesPatientSearch.form() || echangesPatientSearch.candidates() || document.querySelector("#pdfParserPatientName");
        try {
            if (await echangesPatientSearch.waitFor(picker, current, 2500) || !current()) return;
            const cancelButton = document.querySelector("#messageContainer .docImportButtons .button.cancel");
            if (!cancelButton?.getClientRects().length || !getPdfAttachmentZonesES().length) return;
            // Aucun champ modifié dans le brouillon depuis son ouverture.
            if (document.querySelector("#messageContainer .ng-dirty")) return;
            cancelButton.click();
            const preview = await echangesPatientSearch.waitFor(() => !document.querySelector("#messageContainer .docImportButtons .button.valid")
                && document.querySelector("#messageContainer .btnImport.importPatient"), current, 2000);
            if (preview && current()) preview.click();
        } finally {
            for (const name of events) document.removeEventListener(name, stopOnInput, true);
        }
    }
});


/**
 * Parcourt successivement les messages de la messagerie sécurisée pour déclencher
 * l'analyse automatique du PDF (simple +/- IA) sur chacun d'entre eux à la suite.
 *
 * Deux scénarios de sélection des messages à parcourir :
 * - les messages dont la case a été cochée (bouton ▶️, déclenchement manuel)
 * - les messages non lus (bouton 🔁, déclenchement à l'activation puis vérification
 *   toutes les 20 secondes)
 *
 * Il n'y a pas de pause entre deux messages : la boucle ne s'arrête que si le bouton ⏹️ est
 * utilisé. Le remplissage du formulaire (sélection du patient, titre, catégorie...) reste géré
 * par processFoundPdfIframeEchanges ; l'utilisateur garde la main pour valider manuellement
 * chaque message, y compris après coup en revenant dessus dans la liste.
 */
addTweak('/FolderMedical/WedaEchanges/', 'secureExchangeMessageQueue', async function () {
    const AUTO_MODE_STORAGE_KEY = 'secureExchangeMessageQueueAutoEnabled';
    // Émis par pdfParser.js (processFoundPdfIframeEchanges) à la fin du traitement d'un message,
    // qu'il ait réussi, échoué, ou que le PDF ait déjà été importé auparavant.
    const ANALYSIS_DONE_EVENT = 'pdfParserEchangesDone';
    // Garde-fou si l'évènement de fin n'arrive jamais (ex : message sans PDF ni corps de texte exploitable).
    // Large car l'analyse des antécédents (option verifierEtMettreAJourAntecedents) précède l'évènement de fin.
    const ANALYSIS_TIMEOUT = 300000;

    let queueRunning = false;
    let queueShouldStop = false;
    let finishCurrent;
    let summary = "";
    let items = [];
    let autoModeEnabled;
    const UNREAD_CHECK_INTERVAL = 20000;

    // --- Gestion du cache de session ---
    function getExtractedEchangesDataKeys() {
        const pdfDataFields = ['documentDate', 'nameMatches', 'alreadyImported', 'antecedentsDiscordances'];
        const keys = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            try {
                const data = JSON.parse(sessionStorage.getItem(key));
                if (data && typeof data === 'object' && pdfDataFields.some(field => field in data)) keys.push(key);
            } catch (e) { /* valeur non JSON : ignorée */ }
        }
        return keys;
    }

    function clearExtractedEchangesData() {
        const keys = getExtractedEchangesDataKeys();
        keys.forEach(key => sessionStorage.removeItem(key));
        return keys.length;
    }

    // --- Sélection des messages selon le scénario ---
    function getAllMessages() {
        return Array.from(document.querySelectorAll('.messageListItem'));
    }

    function getCheckedMessages() {
        return getAllMessages().filter(item => item.querySelector('input[type=checkbox]')?.checked);
    }

    function getUnreadMessages() {
        return getAllMessages().filter(item => item.querySelector('.sender.unread'));
    }

    // Attend la fin de l'analyse (évènement), avec un timeout de secours et une sortie rapide si
    // l'utilisateur a cliqué sur Stop entre-temps.
    function waitForAnalysisDone(messageKey, open) {
        return new Promise(resolve => {
            let deadline;
            let timer;
            const finish = status => {
                document.removeEventListener("pdfParserEchangesStarted", started);
                document.removeEventListener(ANALYSIS_DONE_EVENT, done);
                clearInterval(countdownId);
                clearTimeout(timer);
                finishCurrent = null;
                updateProgressLabel();
                resolve(status);
            };
            const arm = delay => {
                clearTimeout(timer);
                deadline = Date.now() + delay;
                timer = setTimeout(() => finish("failed"), delay);
            };
            const started = event => { if (event.detail?.messageKey === messageKey) arm(ANALYSIS_TIMEOUT); };
            const done = event => {
                if (event.detail?.messageKey === messageKey && ["ready","review","failed"].includes(event.detail.status)) finish(event.detail.status);
            };
            const countdownId = setInterval(() => {
                const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
                updateProgressLabel(undefined, undefined, `⏳ ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`);
            }, 1000);
            finishCurrent = finish;
            document.addEventListener("pdfParserEchangesStarted", started);
            document.addEventListener(ANALYSIS_DONE_EVENT, done);
            arm(15000); // Le délai long de l'IA commence uniquement quand ce courrier a démarré.
            open();
        });
    }

    async function processQueue(selectorFn) {
        if (queueRunning) {
            console.warn('[secureExchangeMessageQueue] Une file est déjà en cours de traitement.');
            return;
        }
        const itemsToProcess = selectorFn();
        if (itemsToProcess.length === 0) {
            console.log('[secureExchangeMessageQueue] Aucun message à traiter.');
            sendWedaNotif({
                message: "Aucun message à traiter, cochez au moins un message.",
                type: 'info',
                icon: 'info'
            });
            return;
        }

        queueRunning = true;
        queueShouldStop = false;
        summary = "";
        items = itemsToProcess.map(row => ({ row, key: getEchangesMessageKey(row), status: "" }));
        updateToolboxState();
        console.log('[secureExchangeMessageQueue] Démarrage, messages à traiter :', itemsToProcess.length);

        try {
            for (let i = 0; i < itemsToProcess.length; i++) {
                if (queueShouldStop) {
                    console.log('[messageQueue] Arrêt demandé par l\'utilisateur.');
                    break;
                }

                updateProgressLabel(i + 1, itemsToProcess.length);
                const item = items[i];
                const lineItem = findEchangesMessage(item.row, item.key)?.querySelector('.messageLineItem');
                if (!lineItem) {
                    item.status = "failed";
                    continue;
                }
                item.status = await waitForAnalysisDone(item.key, () => {
                    lineItem.click();
                    recordMetrics({ clicks: 1, drags: 0 });
                });
                markResult(item);
                await sleep(300); // laisse le DOM se stabiliser avant de passer au message suivant
            }
        } finally {
            queueRunning = false;
            const count = status => items.filter(item => item.status === status).length;
            summary = [count("ready") + (count("ready") > 1 ? " prêts" : " prêt"), count("review") + " à vérifier", count("failed") + " en échec"].join(" · ");
            if (queueShouldStop) summary = "Parcours arrêté · " + summary;
            queueShouldStop = false;
            updateToolboxState();
            console.log('[secureExchangeMessageQueue] File terminée.');
        }
    }

    function stopQueue() {
        queueShouldStop = true;
        finishCurrent?.("review");
    }

    document.addEventListener("click", event => {
        if (queueRunning && event.isTrusted && event.target.closest?.("#messageList .messageLineItem, #inboxToolbar")) stopQueue();
    }, true);

    function markResult(item) {
        if (!item.status) return;
        const row = findEchangesMessage(item.row, item.key);
        if (!row) return;
        const labels = { ready: "Dossier prêt", review: "À vérifier", failed: "Analyse incomplète" };
        let label = row.querySelector(".whEchangesStatus");
        if (!label) {
            label = document.createElement("small");
            label.className = "whEchangesStatus";
            label.style.marginInlineStart = "0.5em";
            (row.querySelector(".metaRow") || row).append(label);
        }
        if (label.textContent !== labels[item.status]) label.textContent = labels[item.status];
    }
    function startCheckedQueue() {
        processQueue(getCheckedMessages);
    }

    function startAutoQueueIfUnread() {
        if (!autoModeEnabled || queueRunning || getUnreadMessages().length === 0) return;
        processQueue(getUnreadMessages);
    }

    function setAutoMode(enabled) {
        autoModeEnabled = enabled;
        updateToolboxState();
    }

    async function toggleAutoMode() {
        const enabled = !autoModeEnabled;
        await chrome.storage.local.set({ [AUTO_MODE_STORAGE_KEY]: enabled });
        setAutoMode(enabled);
        if (enabled) startAutoQueueIfUnread();
    }

    // --- Boîte à outils (▶️ cochés / 🔁 auto non lus / ⏹️ stop / 🧹 vider cache) ---
    let playButton, autoButton, stopButton, clearButton, progressLabel, openNext;

    let progressText = '';
    function updateProgressLabel(current, total, countdown = '') {
        if (current !== undefined) progressText = `${current}/${total}`;
        if (progressLabel) {
            progressLabel.textContent = countdown ? `${progressText} ${countdown}` : progressText;
        }
    }

    function updateToolboxState() {
        if (!playButton) return;
        playButton.disabled = queueRunning;
        playButton.parentElement.dataset.running = String(queueRunning);
        autoButton.classList.toggle('whQueueAutoActive', autoModeEnabled);
        autoButton.style.backgroundColor = autoModeEnabled ? '#4CAF50' : '';
        autoButton.style.color = autoModeEnabled ? 'white' : '';
        stopButton.disabled = !queueRunning;
        if (clearButton) {
            const cached = getExtractedEchangesDataKeys().length;
            clearButton.disabled = cached === 0;
            clearButton.title = `Weda-Helper : supprime toutes les données extraites (statut « déjà importé », antécédents vérifiés...) pour ré-analyser les messages de zéro. ${cached} message(s) en cache.`;
        }
        if (!queueRunning) {
            progressText = '';
            if (progressLabel.textContent !== summary) progressLabel.textContent = summary;
        }
        items.forEach(markResult);
    }

    function createToolbox([inboxContainer]) {
        if (document.querySelector('#whMessageQueueToolbox')) return;

        const toolbox = document.createElement('div');
        toolbox.id = 'whMessageQueueToolbox';
        toolbox.style.display = 'flex';
        toolbox.style.flexDirection = 'column';
        toolbox.style.alignItems = 'flex-start';
        toolbox.style.gap = '6px';
        toolbox.style.padding = '4px 8px';
        toolbox.style.marginBottom = '4px';

        playButton = document.createElement('button');
        playButton.type = 'button';
        playButton.innerText = '▶️';
        playButton.title = "Weda-Helper : parcourir et analyser successivement les messages cochés.";
        playButton.onclick = startCheckedQueue;

        autoButton = document.createElement('button');
        autoButton.type = 'button';
        autoButton.innerText = '🔁';
        autoButton.title = "Weda-Helper : analyser automatiquement les messages non lus dès qu'il y en a (à l'activation puis à chaque rafraîchissement de la boîte de réception).";
        autoButton.onclick = toggleAutoMode;

        stopButton = document.createElement('button');
        stopButton.type = 'button';
        stopButton.innerText = '⏹️';
        stopButton.title = "Weda-Helper : arrêter le parcours automatique des messages en cours.";
        stopButton.onclick = stopQueue;
        stopButton.disabled = true;

        clearButton = document.createElement('button');
        clearButton.type = 'button';
        clearButton.innerText = '🧹';
        clearButton.title = "Weda-Helper : Vide toutes les données en cache de pré-analyse. Utile pour ré-analyser les messages de zéro, notamment pour les tests ou si vous avez changé les prompts. Est de toute façon vidé à la fermeture du navigateur.";
        clearButton.onclick = function () {
            const count = clearExtractedEchangesData();
            updateToolboxState();
            sendWedaNotif({ message: `Données extraites supprimées pour ${count} message(s).`, type: 'success' });
        };

        progressLabel = document.createElement('span');
        progressLabel.style.fontSize = '0.85em';
        progressLabel.style.cursor = 'pointer';
        // Clic : termine immédiatement l'attente du message en cours (même effet que l'évènement de fin d'analyse).
        progressLabel.addEventListener('click', () => {
            if (queueRunning) finishCurrent?.("review");
        });
        progressLabel.title = "Weda-Helper : numéro du message en cours / nombre de messages à traiter. ⏳ = temps restant avant l'abandon de l'analyse de CE message (timeout individuel, pas un total) : passé ce délai, on passe au message suivant. Cliquer ici passe immédiatement au message suivant.";

        const nextLabel = document.createElement("label");
        openNext = document.createElement("input");
        openNext.type = "checkbox";
        getOptionPromise("secureExchangeOpenNextAfterImport").then(value => { openNext.checked = !!value; });
        openNext.onchange = () => chrome.storage.local.set({ secureExchangeOpenNextAfterImport: openNext.checked });
        nextLabel.append(openNext, " Ouvrir le suivant après import");
        toolbox.append(playButton, autoButton, stopButton, clearButton, progressLabel, nextLabel);

        inboxContainer.insertAdjacentElement('afterend', toolbox);
        updateToolboxState();

        // Filet de sécurité : la liste Weda peut arriver après le conteneur ou être rechargée
        // sans passer par le rafraîchissement automatique.
        setInterval(startAutoQueueIfUnread, UNREAD_CHECK_INTERVAL);
        // Le cache évolue au fil des analyses (pdfParser.js) : rafraîchissement périodique
        setInterval(updateToolboxState, 2000);
        startAutoQueueIfUnread();
    }

    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (openNext && areaName === "local" && changes.secureExchangeOpenNextAfterImport) openNext.checked = !!changes.secureExchangeOpenNextAfterImport.newValue;
        if (areaName === 'local' && AUTO_MODE_STORAGE_KEY in changes) {
            setAutoMode(changes[AUTO_MODE_STORAGE_KEY].newValue === true);
        }
    });
    try {
        const stored = await chrome.storage.local.get(AUTO_MODE_STORAGE_KEY);
        autoModeEnabled ??= stored[AUTO_MODE_STORAGE_KEY] === true;
    } catch (error) {
        autoModeEnabled ??= false;
        console.warn('[secureExchangeMessageQueue] Impossible de relire le mode automatique.', error);
    }

    waitForElement({
        selector: '#weInboxContainer',
        justOnce: true,
        triggerOnInit: true,
        callback: createToolbox
    });
});
