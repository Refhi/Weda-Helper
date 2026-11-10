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

// Page Messagerie sécurisée
addTweak("/FolderMedical/WedaEchanges/", "secureExchangeOpenNextAfterImport", function () {
    const getRows = () => [...document.querySelectorAll("#messageList > .messageListItem")];
    const getRowKey = row => row.querySelector(".messageLineItem")?.textContent.replace(/\s+/g, " ").trim();
    const queueIsRunning = () => document.querySelector('#whMessageQueueToolbox[data-running="true"]');
    let stopWaiting;

    document.addEventListener("click", event => {
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
        const currentKey = getRowKey(currentRow);
        const nextKey = getRowKey(nextRow);
        if (!currentKey || !nextKey) return;
        const currentCount = rows.filter(row => getRowKey(row) === currentKey).length;

        const observer = new MutationObserver(() => {
            if (queueIsRunning()) {
                stopWaiting?.();
                return;
            }
            const remaining = getRows();
            // Une reconstruction du DOM peut recréer la ligne du courrier en cours.
            if (remaining.includes(currentRow)
                || remaining.filter(row => getRowKey(row) === currentKey).length >= currentCount) return;

            const matchingRows = remaining.filter(row => getRowKey(row) === nextKey);
            const successor = matchingRows.length === 1 ? matchingRows[0] : matchingRows.find(row => row === nextRow);
            const line = successor?.querySelector(".messageLineItem");
            if (!line?.getClientRects().length) return;

            stopWaiting?.();
            if (successor.classList.contains("selected")) return;
            line.click();
            recordMetrics({ clicks: 1, drags: 0 });
        });
        const timeout = setTimeout(() => stopWaiting?.(), 10000);
        stopWaiting = () => {
            observer.disconnect();
            clearTimeout(timeout);
            stopWaiting = null;
        };
        observer.observe(document.body, {
            childList: true, subtree: true, attributes: true,
            attributeFilter: ["class", "hidden", "data-running"]
        });
    }, true);
});

addTweak('/FolderMedical/WedaEchanges/', 'secureExchangeAutoRefresh', function () {
    // clique sur reçu pour rafraichir la liste des messages à intervalle régulier
    function clickOnInbox() {
        console.log('[clickOnInbox] je clique sur reçu pour rafraichir la liste des messages');
        var element = document.querySelector('#inboxToolbar > li.inbox.selected > a');
        if (element) {
            element.click();
            recordMetrics({ clicks: 1, drags: 1 });
            // Signale le rafraîchissement aux autres tweaks (ex: secureExchangeMessageQueue, mode "auto")
            document.dispatchEvent(new CustomEvent('wedaEchangesInboxRefreshed'));
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


// Clic automatique sur "Un patient" dès qu'un élément  .messageListItem passe en  .messageListItem.selected
addTweak('/FolderMedical/WedaEchanges/', 'autoClickUnPatient', function () {
    // waitForElement ne signale qu'une fois chaque nœud : un retour sur un message déjà sélectionné
    // (simple changement de classe) ne serait pas détecté. On suit donc directement la sélection.
    let lastSelected = null;
    const observer = new MutationObserver(async () => {
        const selected = document.querySelector('.messageListItem.selected');
        if (selected === lastSelected) return;
        lastSelected = selected;
        if (!selected) return;
        await sleep(100); // Laisse Weda afficher le détail du message
        if (document.querySelector('.messageListItem.selected') !== selected) return; // sélection changée entre-temps
        const unPatientButton = document.querySelector('.btnImport.importPatient');
        console.log('[autoClickUnPatient] unPatientButton', unPatientButton);
        if (unPatientButton) {
            unPatientButton.click();
            recordMetrics({ clicks: 1, drags: 0 });
        }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
});


/**
 * Parcourt successivement les messages de la messagerie sécurisée pour déclencher
 * l'analyse automatique du PDF (simple +/- IA) sur chacun d'entre eux à la suite.
 *
 * Deux scénarios de sélection des messages à parcourir :
 * - les messages dont la case a été cochée (bouton ▶️, déclenchement manuel)
 * - les messages non lus (bouton 🔁, déclenchement à l'activation puis à chaque rafraîchissement
 *   de la boîte de réception, cf. secureExchangeAutoRefresh)
 *
 * Il n'y a pas de pause entre deux messages : la boucle ne s'arrête que si le bouton ⏹️ est
 * utilisé. Le remplissage du formulaire (sélection du patient, titre, catégorie...) reste géré
 * par processFoundPdfIframeEchanges ; l'utilisateur garde la main pour valider manuellement
 * chaque message, y compris après coup en revenant dessus dans la liste.
 */
addTweak('/FolderMedical/WedaEchanges/', 'secureExchangeMessageQueue', function () {
    // Émis par pdfParser.js (processFoundPdfIframeEchanges) à la fin du traitement d'un message,
    // qu'il ait réussi, échoué, ou que le PDF ait déjà été importé auparavant.
    const ANALYSIS_DONE_EVENT = 'pdfParserEchangesDone';
    // Garde-fou si l'évènement de fin n'arrive jamais (ex : message sans PDF ni corps de texte exploitable).
    // Large car l'analyse des antécédents (option verifierEtMettreAJourAntecedents) précède l'évènement de fin.
    const ANALYSIS_TIMEOUT = 300000;
    // Délai après le clic sur le rafraîchissement automatique avant de vérifier les messages non lus
    // (le temps que Weda recharge la liste depuis le serveur)
    const REFRESH_CHECK_DELAY = 3000;

    let queueRunning = false;
    let queueShouldStop = false;
    let autoModeEnabled = false;

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
    function waitForAnalysisDone() {
        return new Promise(resolve => {
            let settled = false;
            const finish = () => {
                if (settled) return;
                settled = true;
                document.removeEventListener(ANALYSIS_DONE_EVENT, finish);
                clearInterval(stopPollId);
                clearInterval(countdownId);
                clearTimeout(timeoutId);
                updateProgressLabel();
                resolve();
            };
            const stopPollId = setInterval(() => {
                if (queueShouldStop) finish();
            }, 200);
            const deadline = Date.now() + ANALYSIS_TIMEOUT;
            const countdownId = setInterval(() => {
                const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
                updateProgressLabel(undefined, undefined, `⏳ ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`);
            }, 1000);
            const timeoutId = setTimeout(() => {
                console.warn('[secureExchangeMessageQueue] Timeout en attendant la fin de l\'analyse, passage au message suivant.');
                finish();
            }, ANALYSIS_TIMEOUT);
            document.addEventListener(ANALYSIS_DONE_EVENT, finish);
        });
    }

    async function processQueue(selectorFn) {
        if (queueRunning) {
            console.warn('[secureExchangeMessageQueue] Une file est déjà en cours de traitement.');
            return;
        }
        // La liste Angular n'est pas rechargée à l'ouverture d'un message : les nœuds restent valides
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
        updateToolboxState();
        console.log('[secureExchangeMessageQueue] Démarrage, messages à traiter :', itemsToProcess.length);

        try {
            for (let i = 0; i < itemsToProcess.length; i++) {
                if (queueShouldStop) {
                    console.log('[messageQueue] Arrêt demandé par l\'utilisateur.');
                    break;
                }

                const item = itemsToProcess[i];
                if (!item.isConnected) {
                    console.warn('[messageQueue] Message disparu de la liste (liste rafraîchie ?), ignoré.');
                    continue;
                }

                updateProgressLabel(i + 1, itemsToProcess.length);
                console.log(`[secureExchangeMessageQueue] (${i + 1}/${itemsToProcess.length}) Clic sur le message :`, item);
                // Le clic doit viser .messageLineItem (le listener Angular n'est pas sur le conteneur)
                const lineItem = item.querySelector('.messageLineItem');
                if (!lineItem) {
                    console.warn('[secureExchangeMessageQueue] .messageLineItem introuvable, message ignoré :', item);
                    continue;
                }
                lineItem.click();
                recordMetrics({ clicks: 1, drags: 0 });

                await waitForAnalysisDone();
                await sleep(300); // laisse le DOM se stabiliser avant de passer au message suivant
            }
        } finally {
            queueRunning = false;
            queueShouldStop = false;
            updateToolboxState();
            console.log('[secureExchangeMessageQueue] File terminée.');
        }
    }

    function stopQueue() {
        queueShouldStop = true;
    }

    function startCheckedQueue() {
        processQueue(getCheckedMessages);
    }

    function startAutoQueueIfUnread() {
        if (!autoModeEnabled || queueRunning) return;
        const unread = getUnreadMessages();
        if (unread.length > 0) {
            processQueue(getUnreadMessages);
        }
    }

    function toggleAutoMode() {
        autoModeEnabled = !autoModeEnabled;
        updateToolboxState();
        if (autoModeEnabled) {
            startAutoQueueIfUnread();
        }
    }

    // --- Rafraîchissement automatique toutes les 15 min (cf. secureExchangeAutoRefresh) ---
    document.addEventListener('wedaEchangesInboxRefreshed', () => {
        setTimeout(startAutoQueueIfUnread, REFRESH_CHECK_DELAY);
    });

    // --- Boîte à outils (▶️ cochés / 🔁 auto non lus / ⏹️ stop) ---
    let playButton, autoButton, stopButton, progressLabel;

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
        if (!queueRunning) {
            progressText = '';
            progressLabel.textContent = '';
        }
    }

    function createToolbox() {
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

        progressLabel = document.createElement('span');
        progressLabel.style.fontSize = '0.85em';
        progressLabel.style.cursor = 'pointer';
        // Clic : termine immédiatement l'attente du message en cours (même effet que l'évènement de fin d'analyse).
        progressLabel.addEventListener('click', () => {
            if (queueRunning) document.dispatchEvent(new CustomEvent(ANALYSIS_DONE_EVENT));
        });
        progressLabel.title = "Weda-Helper : numéro du message en cours / nombre de messages à traiter. ⏳ = temps restant avant l'abandon de l'analyse de CE message (timeout individuel, pas un total) : passé ce délai, on passe au message suivant. Cliquer ici passe immédiatement au message suivant.";

        toolbox.append(playButton, autoButton, stopButton, progressLabel);

        const inboxContainer = document.querySelector('#weInboxContainer');
        inboxContainer.insertAdjacentElement('afterend', toolbox);
    }

    waitForElement({
        selector: '#weInboxContainer',
        justOnce: true,
        triggerOnInit: true,
        callback: createToolbox
    });
});