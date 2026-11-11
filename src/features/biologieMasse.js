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
    function getBiologieRows() {
        const occurrences = {};
        return [...document.querySelectorAll('#ContentPlaceHolder1_HprimsGrid tr')]
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
        const prompt = `${await getOptionPromise('biologieMasseAnalysePrompt')}\n\nPour répondre, appelle OBLIGATOIREMENT la fonction renseignerAnalyseBiologie.`
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

    let running = false;
    let stopRequested = false;
    let toolbox, progress, startButtons, stopButton;

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

    function updateUi(text = '') {
        if (!toolbox) return;
        startButtons.forEach(button => { button.disabled = running; });
        stopButton.disabled = !running;
        progress.textContent = text;
    }

    async function processQueue(keys) {
        if (running) return;
        running = true;
        stopRequested = false;
        const total = keys.length;
        let pending = [...keys];
        try {
            while (pending.length && !stopRequested) {
                const key = pending[0];
                updateUi(`${total - pending.length + 1}/${total}`);
                sessionStorage.setItem(BIOLOGIE_QUEUE_KEY, JSON.stringify({ pending, total }));
                const row = getBiologieRows().find(r => r.key === key);
                if (row && await openBiologieRow(key)) {
                    const donnees = await pageContext();
                    if (donnees.error) {
                        saveAnalyse(key, { statut: 'erreur', resume: donnees.error });
                    } else {
                        try {
                            saveAnalyse(key, await analyseBiologieWithAI(row, donnees));
                        } catch (error) {
                            console.warn('[biologieMasse] Échec de l\'analyse :', error);
                            saveAnalyse(key, { statut: 'erreur', resume: String(error.message || error) });
                        }
                    }
                    decorateRows();
                }
                pending = pending.slice(1);
            }
        } finally {
            running = false;
            sessionStorage.removeItem(BIOLOGIE_QUEUE_KEY);
            updateUi();
        }
    }

    function startQueue(selectFn) {
        const analyses = readBiologieSession(BIOLOGIE_ANALYSES_KEY, {});
        const keys = selectFn(getBiologieRows()).filter(row => !analyses[row.key]).map(row => row.key);
        if (!keys.length) {
            sendWedaNotif({ message: "Aucun résultat à analyser (déjà analysés, ou aucun résultat coché).", type: 'info', icon: 'info' });
            return;
        }
        processQueue(keys);
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
        const checkedButton = makeButton('🧪 Analyser les cochés', "Weda-Helper : analyse par IA des résultats cochés (ceux déjà analysés sont ignorés).", () => startQueue(rows => rows.filter(r => r.checked)));
        const allButton = makeButton('🧪 Tout analyser', "Weda-Helper : analyse par IA de tous les résultats de la liste (ceux déjà analysés sont ignorés).", () => startQueue(rows => rows));
        const clearButton = makeButton('🗑️', "Weda-Helper : oublie les analyses enregistrées pour cette session.", () => {
            sessionStorage.removeItem(BIOLOGIE_ANALYSES_KEY);
            decorateRows();
        });
        stopButton = makeButton('⏹️', "Weda-Helper : arrête l'analyse en cours après le résultat courant.", () => { stopRequested = true; });
        progress = document.createElement('span');
        progress.style.fontSize = '0.85em';
        startButtons = [checkedButton, allButton];
        toolbox.append(checkedButton, allButton, stopButton, clearButton, progress);
        grid.insertAdjacentElement('beforebegin', toolbox);
        updateUi();
    }

    waitForElement({
        selector: '#ContentPlaceHolder1_UpdatePanelHprimsGrid',
        justOnce: true,
        triggerOnInit: true,
        callback: async ([panel]) => {
            createToolbox(panel);
            // Le panneau est recréé à chaque postback : on réapplique les pastilles.
            new MutationObserver(decorateRows).observe(panel, { childList: true, subtree: true });
            decorateRows();

            // Reprise après un rechargement complet de la page pendant une analyse.
            const saved = readBiologieSession(BIOLOGIE_QUEUE_KEY, null);
            if (saved?.pending?.length) processQueue(saved.pending);
        }
    });
});
