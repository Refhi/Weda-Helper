/**
 * @file biologieMasse.js
 * @description Analyse de masse des résultats de biologie (page HprimForm.aspx) par l'assistant IA.
 * Chaque résultat de la liste est ouvert à tour de rôle, ses valeurs (@see callableFunctions.js pageContext)
 * sont envoyées à l'IA via la chaîne analyserBiologie, et l'analyse est conservée dans le sessionStorage
 * (disparaît à la fermeture de l'onglet). La file en cours y est aussi conservée, pour survivre à un
 * éventuel rechargement complet de la page par Weda.
 *
 * @requires pdfParserAIExtraction.js (prepareChatApi, PDF_PARSER_AI_TIMEOUT_MS)
 * @requires callableFunctions.js (pageContext)
 */

addTweak('/FolderMedical/HprimForm.aspx', 'biologieMasseAnalyse', async function () {
    if (!await getOptionPromise('enableIAassistant')) return;

    const BIOLOGIE_ANALYSES_KEY = 'biologieMasseAnalyses';
    const BIOLOGIE_QUEUE_KEY = 'biologieMasseQueue';
    const BIOLOGIE_AUTO_KEY = "biologieMasseAutoEnabled";
    const BIOLOGIE_AUTO_INTERVAL = 45000;
    const BIOLOGIE_PANEL = "#ContentPlaceHolder1_UpdatePanelHprimsGrid";
    const BIOLOGIE_TITLE = "#ContentPlaceHolder1_TextBoxHprimTitre";
    const BIOLOGIE_STATUT_ICONES = { normal: '🟢', a_surveiller: '🟠', urgent: '🔴', erreur: '⚠️' };

    // Résolveur de l'analyse en cours (un seul résultat à la fois), appelé par le tool call "renseignerAnalyseBiologie".
    let pendingBiologieResolve = null;

    // Seule exposition globale : le tool call (@see callableFunctions.js) doit pouvoir joindre le résolveur.
    globalThis.resolvePendingBiologieAnalyse = analyse => {
        if (!pendingBiologieResolve) {
            throw new Error("Aucune analyse de biologie en attente (délai déjà dépassé, ou fonction appelée deux fois).");
        }
        pendingBiologieResolve(analyse);
        pendingBiologieResolve = null;
        return { status: "success" };
    };

    function readBiologieSession(key, fallback) {
        try { return JSON.parse(sessionStorage.getItem(key)) ?? fallback; } catch (e) { return fallback; }
    }

    /** Lignes de la liste, avec une clé stable (date, nom, prénom, naissance, rang parmi les doublons) et le lien à cliquer. */
    function getBiologieRows(root = document) {
        const occurrences = {};
        return [...root.querySelectorAll('#ContentPlaceHolder1_HprimsGrid tr')]
            .filter(tr => tr.querySelector('[id^="ContentPlaceHolder1_HprimsGrid_LinkButtonHprimNom_"]'))
            .map(tr => {
                const text = selector => tr.querySelector(selector)?.textContent.trim() ?? '';
                const date = text('label[for^="ContentPlaceHolder1_HprimsGrid_CheckBoxHprimDateResultat_"]');
                const naissance = text('[id^="ContentPlaceHolder1_HprimsGrid_LinkButtonHprimDateNaissance_"]');
                const base = [date, text('[id^="ContentPlaceHolder1_HprimsGrid_LinkButtonHprimNom_"]'),
                    text('[id^="ContentPlaceHolder1_HprimsGrid_LinkButtonHprimPrenom_"]'), naissance].join('|');
                occurrences[base] = (occurrences[base] ?? 0) + 1;
                return {
                    tr, date, naissance,
                    key: `${base}|${occurrences[base]}`,
                    link: tr.querySelector('[id^="ContentPlaceHolder1_HprimsGrid_LinkButtonHprimNom_"]'),
                    checked: !!tr.querySelector('input[type=checkbox]')?.checked
                };
            });
    }

    function isBiologieSelected(key) {
        return getBiologieRows().some(row => row.key === key && row.tr.classList.contains("grid-selecteditem"));
    }

    function ageFromBirthDate(naissance) {
        const [jour, mois, annee] = (naissance || '').split('/').map(Number);
        if (!annee) return null;
        const now = new Date();
        let age = now.getFullYear() - annee;
        if (now.getMonth() + 1 < mois || (now.getMonth() + 1 === mois && now.getDate() < jour)) age--;
        return age;
    }

    /** Ouvre le résultat et attend que la liste ait été rechargée avec cette ligne sélectionnée. */
    async function openBiologieRow(key) {
        const before = getBiologieRows();
        const index = before.findIndex(row => row.key === key);
        if (index < 0) return false;
        if (before[index].tr.classList.contains("grid-selecteditem") && document.querySelector(BIOLOGIE_TITLE)) return true;
        const oldGrid = document.querySelector('#ContentPlaceHolder1_HprimsGrid');
        clicCSPLockedElement(`#${before[index].link.id}`);
        recordMetrics({ clicks: 1, drags: 0 });
        for (let i = 0; i < 75; i++) {
            await sleep(200);
            const grid = document.querySelector('#ContentPlaceHolder1_HprimsGrid');
            const row = getBiologieRows()[index];
            if (grid && grid !== oldGrid && row?.key === key && row.tr.classList.contains('grid-selecteditem')) return true;
        }
        return false;
    }

    async function analyseBiologieWithAI(row, donnees) {
        const chatApi = await prepareChatApi(false);
        if (!chatApi) throw new Error("Assistant IA indisponible");
        const age = ageFromBirthDate(row.naissance);
        const analysePrompt = await getOptionPromise('biologieMasseAnalysePrompt');
        if (!analysePrompt) throw new Error("Prompt d'analyse de biologie non configuré");
        const prompt = `${analysePrompt}\n\nPour répondre, appelle OBLIGATOIREMENT la fonction renseignerAnalyseBiologie.`
            + `\n\nDate du résultat : ${row.date}${age !== null ? `\nÂge du patient : ${age} ans` : ''}`
            + `\n\n--- Résultat ---\n${JSON.stringify(donnees)}\n--- Fin du résultat ---`;
        return new Promise((resolve, reject) => {
            pendingBiologieResolve = resolve;
            setTimeout(() => {
                if (pendingBiologieResolve !== resolve) return;
                pendingBiologieResolve = null;
                reject(new Error("Délai dépassé en attendant renseignerAnalyseBiologie"));
            }, PDF_PARSER_AI_TIMEOUT_MS);
            chatApi.lancerChaine('analyserBiologie', {}, prompt);
        });
    }

    const titleHandledInputs = new WeakSet();

    /** Titre à inscrire pour une analyse réussie, ou null. */
    function titleFor(analyse) {
        if (!analyse?.resume || analyse.statut === 'erreur') return null;
        return `[IA] ${analyse.resume}`.replace(/\s+/g, ' ').slice(0, 250);
    }

    /** Inscrit la synthèse dans le titre du résultat ouvert ; le changement déclenche un postback Weda qui recharge la liste. */
    async function writeBiologieTitle(analyse) {
        const input = document.querySelector('#ContentPlaceHolder1_TextBoxHprimTitre');
        const title = titleFor(analyse);
        if (!input || !title) return;
        // Titre déjà présent (Weda peut renvoyer une valeur avec espaces parasites) : on ne réécrit pas.
        if (input.value.replace(/\s+/g, ' ').trim() === title) return;
        const oldGrid = document.querySelector('#ContentPlaceHolder1_HprimsGrid');
        titleHandledInputs.add(input);
        input.value = title;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        recordMetrics({ clicks: 1, drags: 1 });
        for (let i = 0; i < 40; i++) {
            await sleep(200);
            const grid = document.querySelector('#ContentPlaceHolder1_HprimsGrid');
            if (grid && grid !== oldGrid) return;
        }
    }

    // Weda ne conserve pas le titre en changeant de ligne : on le réapplique à la réouverture d'un résultat déjà analysé.
    // Une seule tentative par champ de saisie, pour ne jamais boucler si Weda réinitialise le titre.
    let reapplyTimer;
    function scheduleTitleReapply() {
        if (running) return;
        clearTimeout(reapplyTimer);
        reapplyTimer = setTimeout(async () => {
            const input = document.querySelector('#ContentPlaceHolder1_TextBoxHprimTitre');
            if (running || !input || input === editedTitle || titleHandledInputs.has(input)) return;
            const selected = getBiologieRows().find(row => row.tr.classList.contains('grid-selecteditem'));
            const analyse = selected && readBiologieSession(BIOLOGIE_ANALYSES_KEY, {})[selected.key];
            if (!analyse || !await getOptionPromise('biologieMasseAnalyseTitre')) return;
            if (running || !input.isConnected || input === editedTitle || !isBiologieSelected(selected.key)) return;
            await writeBiologieTitle(analyse);
        }, 700);
    }

    let running = false;
    let stopRequested = false;
    let automaticQueue = false;
    let autoEnabled, autoLock, requestingAutoLock = false, checkingInbox = false;
    let autoTimer, lastInteraction = 0, editedTitle;
    let toolbox, progress, checkedButton, allButton, autoButton, stopButton;

    const saveAnalyse = (key, analyse) => {
        const analyses = readBiologieSession(BIOLOGIE_ANALYSES_KEY, {});
        analyses[key] = analyse;
        sessionStorage.setItem(BIOLOGIE_ANALYSES_KEY, JSON.stringify(analyses));
    };

    function decorateRows() {
        const analyses = readBiologieSession(BIOLOGIE_ANALYSES_KEY, {});
        for (const row of getBiologieRows()) {
            const analyse = analyses[row.key];
            let badge = row.tr.querySelector('.whBiologieBadge');
            if (!analyse) { badge?.remove(); continue; }
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'whBiologieBadge';
                badge.style.cursor = 'help';
                // Dans le span (inline-block, 100 %) pour rester sur la ligne de la date.
                const dateLabel = row.tr.querySelector('label[for^="ContentPlaceHolder1_HprimsGrid_CheckBoxHprimDateResultat_"]');
                dateLabel?.insertAdjacentElement('afterend', badge);
            }
            const lignes = [analyse.resume, ...(analyse.anomalies ?? []).map(a => `• ${a.libelle}${a.valeur ? ` : ${a.valeur}` : ''}${a.commentaire ? ` — ${a.commentaire}` : ''}`)];
            const text = ` ${BIOLOGIE_STATUT_ICONES[analyse.statut] ?? '❔'}🤖`;
            const title = ['🤖 Analyse générée par IA — à vérifier, elle ne remplace pas votre lecture du résultat.', '', ...lignes.filter(Boolean)].join('\n');
            // Évite de re-déclencher le MutationObserver quand rien ne change.
            if (badge.textContent !== text) badge.textContent = text;
            if (badge.title !== title) badge.title = title;
        }
    }

    function refreshCheckedButton() {
        if (!checkedButton) return;
        checkedButton.disabled = running || !getBiologieRows().some(row => row.checked);
    }

    function updateUi(text = '') {
        if (!toolbox) return;
        allButton.disabled = running;
        refreshCheckedButton();
        autoButton.setAttribute("aria-pressed", String(autoEnabled === true));
        autoButton.style.backgroundColor = autoEnabled ? "#4CAF50" : "";
        autoButton.style.color = autoEnabled ? "white" : "";
        stopButton.disabled = !running && !autoEnabled;
        progress.textContent = text;
    }

    async function processQueue(keys, automatic = false) {
        if (running) return;
        running = true;
        automaticQueue = automatic;
        stopRequested = false;
        const total = keys.length;
        let pending = [...keys];
        try {
            while (pending.length && !stopRequested) {
                const key = pending[0];
                updateUi(`${total - pending.length + 1}/${total}`);
                sessionStorage.setItem(BIOLOGIE_QUEUE_KEY, JSON.stringify({ pending, automatic }));
                const row = getBiologieRows().find(r => r.key === key);
                if (row && !readBiologieSession(BIOLOGIE_ANALYSES_KEY, {})[key] && await openBiologieRow(key)) {
                    if (!isBiologieSelected(key)) break;
                    const donnees = await pageContext();
                    if (!isBiologieSelected(key)) break;
                    if (donnees.error) {
                        saveAnalyse(key, { statut: 'erreur', resume: donnees.error });
                    } else {
                        try {
                            const analyse = await analyseBiologieWithAI(row, donnees);
                            saveAnalyse(key, analyse);
                            if (await getOptionPromise('biologieMasseAnalyseTitre') && isBiologieSelected(key)
                                && (!automatic || !isEditingBiologie())) await writeBiologieTitle(analyse);
                        } catch (error) {
                            console.warn('[biologieMasse] Échec de l\'analyse :', error);
                            saveAnalyse(key, { statut: 'erreur', resume: String(error.message || error) });
                        }
                    }
                    decorateRows();
                } else if (automatic && row && !stopRequested && !readBiologieSession(BIOLOGIE_ANALYSES_KEY, {})[key]) {
                    saveAnalyse(key, { statut: 'erreur', resume: "Weda n’a pas ouvert le résultat." });
                    decorateRows();
                }
                pending = pending.slice(1);
                if (automatic && isEditingBiologie()) break;
            }
        } finally {
            running = false;
            automaticQueue = false;
            sessionStorage.removeItem(BIOLOGIE_QUEUE_KEY);
            updateUi();
            if (!autoEnabled) autoLock?.();
            scheduleAutoScan();
        }
    }

    function unanalysedKeys(rows) {
        const analyses = readBiologieSession(BIOLOGIE_ANALYSES_KEY, {});
        return rows.filter(row => !analyses[row.key]).map(row => row.key);
    }

    function startQueue(selectFn) {
        const keys = unanalysedKeys(selectFn(getBiologieRows()));
        if (!keys.length) {
            sendWedaNotif({ message: "Aucun résultat à analyser (déjà analysés, ou aucun résultat coché).", type: 'info', icon: 'info' });
            return;
        }
        processQueue(keys);
    }

    function isEditingBiologie() {
        return Date.now() - lastInteraction < 5000 || editedTitle?.isConnected;
    }

    function canStartAuto() {
        return autoEnabled && autoLock && !running && !isEditingBiologie();
    }

    function startAutoQueue() {
        if (!canStartAuto()) return;
        const keys = unanalysedKeys(getBiologieRows());
        if (keys.length) processQueue(keys, true);
    }

    function scheduleAutoScan() {
        if (!autoEnabled) return;
        clearTimeout(autoTimer);
        autoTimer = setTimeout(startAutoQueue, 250);
    }

    function claimAutoMode() {
        if (!autoEnabled || autoLock || requestingAutoLock) return;
        requestingAutoLock = true;
        let acquired = false;
        // Un seul onglet HPRIM traite les arrivées automatiquement.
        navigator.locks.request(BIOLOGIE_AUTO_KEY, { ifAvailable: true }, async lock => {
            if (!lock || !autoEnabled) return;
            acquired = true;
            await new Promise(resolve => {
                autoLock = resolve;
                startAutoQueue();
            });
            autoLock = null;
        }).catch(error => console.warn("[biologieMasse] Mode automatique indisponible :", error))
            .finally(() => {
                requestingAutoLock = false;
                if (acquired) claimAutoMode();
            });
    }

    async function checkBiologieInbox() {
        claimAutoMode();
        startAutoQueue();
        if (!canStartAuto() || checkingInbox || !document.querySelector(BIOLOGIE_PANEL)) return;
        checkingInbox = true;
        const interaction = lastInteraction;
        try {
            const response = await fetch(location.href, {
                cache: "no-store", credentials: "same-origin", redirect: "error", signal: AbortSignal.timeout(12000)
            });
            if (!response.ok) return;
            const preview = document.createElement("template");
            preview.innerHTML = await response.text();
            const visibleKeys = new Set(getBiologieRows().map(row => row.key));
            const newKeys = unanalysedKeys(getBiologieRows(preview.content));
            if (!canStartAuto() || lastInteraction !== interaction || !newKeys.some(key => !visibleKeys.has(key))) return;
            // Un GET évite de rejouer le dernier formulaire natif Weda après un postback.
            const url = new URL(location.href);
            url.searchParams.set("wh_biologie_refresh", Date.now());
            location.replace(url.href);
        } catch (error) {
            console.warn("[biologieMasse] Impossible de vérifier les nouveaux résultats :", error);
        } finally {
            checkingInbox = false;
        }
    }

    function setAutoEnabled(enabled) {
        autoEnabled = enabled;
        if (enabled) {
            claimAutoMode();
            scheduleAutoScan();
        } else if (automaticQueue) stopRequested = true;
        else autoLock?.();
        updateUi(progress?.textContent);
    }

    async function toggleAuto(enabled) {
        if (enabled) lastInteraction = 0;
        setAutoEnabled(enabled);
        try {
            await chrome.storage.local.set({ [BIOLOGIE_AUTO_KEY]: enabled });
        } catch (error) {
            console.warn("[biologieMasse] Impossible de mémoriser le mode automatique :", error);
        }
    }

    function createToolbox(grid) {
        if (document.querySelector('#whBiologieToolbox')) return;
        toolbox = document.createElement('div');
        toolbox.id = 'whBiologieToolbox';
        toolbox.style.cssText = 'display:flex;gap:6px;align-items:center;padding:4px 0;';
        const makeButton = (label, title, onclick) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = label;
            button.title = title;
            button.onclick = event => { event.preventDefault(); onclick(); };
            return button;
        };
        checkedButton = makeButton('🧪 Analyser les cochés', "Weda-Helper : analyse par IA des résultats cochés (ceux déjà analysés sont ignorés).", () => startQueue(rows => rows.filter(r => r.checked)));
        allButton = makeButton('🧪 Tout analyser', "Weda-Helper : analyse par IA de tous les résultats de la liste (ceux déjà analysés sont ignorés).", () => startQueue(rows => rows));
        autoButton = makeButton("🔁", "Weda-Helper : analyse automatiquement les résultats en attente et les nouveaux résultats.", () => toggleAuto(!autoEnabled));
        autoButton.setAttribute("aria-label", "Analyse automatique des biologies");
        const clearButton = makeButton('🗑️', "Weda-Helper : oublie les analyses enregistrées pour cette session.", () => {
            sessionStorage.removeItem(BIOLOGIE_ANALYSES_KEY);
            decorateRows();
        });
        stopButton = makeButton('⏹️', "Weda-Helper : arrête la file après le résultat courant et désactive le mode automatique.", () => {
            stopRequested = true;
            sessionStorage.removeItem(BIOLOGIE_QUEUE_KEY);
            if (autoEnabled) toggleAuto(false);
        });
        progress = document.createElement('span');
        progress.style.fontSize = '0.85em';
        toolbox.append(checkedButton, allButton, autoButton, stopButton, clearButton, progress);
        grid.insertAdjacentElement('beforebegin', toolbox);
        updateUi();
    }

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && BIOLOGIE_AUTO_KEY in changes) setAutoEnabled(changes[BIOLOGIE_AUTO_KEY].newValue === true);
    });
    try {
        const stored = await chrome.storage.local.get(BIOLOGIE_AUTO_KEY);
        autoEnabled ??= stored[BIOLOGIE_AUTO_KEY] === true;
    } catch (error) {
        autoEnabled ??= false;
        console.warn("[biologieMasse] Impossible de relire le mode automatique :", error);
    }

    document.addEventListener("input", event => {
        if (event.isTrusted && event.target.matches(BIOLOGIE_TITLE)) editedTitle = event.target;
    }, true);
    for (const type of ["pointerdown", "keydown"]) {
        document.addEventListener(type, event => {
            if (event.isTrusted && !toolbox?.contains(event.target)) lastInteraction = Date.now();
        }, true);
    }
    window.addEventListener("pagehide", () => {
        autoEnabled = false;
        autoLock?.();
    });
    window.addEventListener("pageshow", async event => {
        if (!event.persisted) return;
        try {
            const stored = await chrome.storage.local.get(BIOLOGIE_AUTO_KEY);
            setAutoEnabled(stored[BIOLOGIE_AUTO_KEY] === true);
        } catch (error) {
            console.warn("[biologieMasse] Impossible de relire le mode automatique :", error);
        }
    });

    let gridObserver;
    let initialized = false;
    waitForElement({
        selector: BIOLOGIE_PANEL,
        observerId: "biologieMasse",
        triggerOnInit: true,
        callback: ([panel]) => {
            createToolbox(panel);
            gridObserver?.disconnect();
            gridObserver = new MutationObserver(() => {
                decorateRows();
                scheduleTitleReapply();
                refreshCheckedButton();
                scheduleAutoScan();
            });
            gridObserver.observe(panel, { childList: true, subtree: true });
            panel.addEventListener('change', refreshCheckedButton);
            decorateRows();

            // Reprise après un rechargement complet de la page pendant une analyse.
            if (!initialized) {
                initialized = true;
                const saved = readBiologieSession(BIOLOGIE_QUEUE_KEY, null);
                if (saved?.pending?.length && !saved.automatic) processQueue(saved.pending);
                else sessionStorage.removeItem(BIOLOGIE_QUEUE_KEY);
                setInterval(checkBiologieInbox, BIOLOGIE_AUTO_INTERVAL);
                claimAutoMode();
            }
            scheduleAutoScan();
        }
    });
});
