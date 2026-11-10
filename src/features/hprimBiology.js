/** Outils de préparation des titres HPRIM. Les imports restent des actions natives de Weda. */
addTweak("/FolderMedical/HprimForm.aspx", "enableHprimBiologyAnalysis", () => {
    setupHprimBiology().catch(() => sendWedaNotif({ message: "Les outils de biologie n’ont pas pu démarrer.", type: "warning" }));
});

addTweak("/FolderMedical/PatientViewForm.aspx", "enableHprimBiologyAnalysis", () => {
    const cards = new WeakMap();
    waitForElement({
        selector: "table.hprimgrid",
        observerId: "wh-biology-cards",
        triggerOnInit: true,
        callback: () => {
            const results = Array.from(document.querySelectorAll("table.hprimgrid")).map(table => {
                const day = table.closest(".sc");
                const date = HprimBiologyDom.dateIn(day?.querySelector(
                    "[title='Cliquez sur la date pour ouvrir.'], table.st td[style='font-size:14px;']")?.textContent);
                const rows = WedaBiology.readTable(table);
                return { table, date, rows };
            }).filter(result => result.rows.length);
            const entries = results.flatMap(({ date, rows }) => rows.map(([label, value, unit]) => ({ label, value, unit, date })));
            for (const { table, date, rows } of results) {
                const report = WedaBiology.analyze(rows, "");
                report.rows = WedaBiology.addHistory(report.rows, entries, date);
                const card = hprimSummaryCard(report, table);
                const old = cards.get(table);
                if (old?.isConnected) {
                    card.open = old.open;
                    old.replaceWith(card);
                } else table.before(card);
                cards.set(table, card);
            }
        }
    });
});

function hprimSummaryCard(report, source) {
    const card = document.createElement("details");
    card.className = "wh-hprim-card";
    const summary = document.createElement("summary");
    summary.textContent = "Synthèse de biologie";
    card.append(summary);
    if (report.conclusion) {
        const conclusion = document.createElement("p");
        conclusion.textContent = report.conclusion;
        card.append(conclusion);
    }
    const groups = new Map();
    for (const row of report.rows) {
        const group = WedaBiology.group(row);
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group).push(row);
    }
    for (const [group, rows] of groups) {
        const label = document.createElement("strong");
        label.textContent = group;
        const list = document.createElement("ul");
        for (const row of rows) {
            const item = document.createElement("li");
            item.classList.toggle("wh-hprim-flag", WedaBiology.abnormal(row.state));
            const limits = row.min || row.max ? " · Normes du labo : " + (row.min || "—") + " à " + (row.max || "—") : "";
            const previous = row.previous ? " · Précédent : " + [row.previous.value, row.previous.unit, "le", row.previous.date].join(" ") : "";
            item.textContent = [row.label + " :", row.value, row.unit, "·", row.state].join(" ") + limits + previous;
            list.append(item);
        }
        card.append(label, list);
    }
    for (const warning of report.warnings) {
        const line = document.createElement("p");
        line.className = "wh-hprim-flag";
        line.textContent = warning;
        card.append(line);
    }
    if (source) {
        const original = document.createElement("button");
        original.type = "button";
        original.textContent = "Voir le compte rendu d’origine";
        original.onclick = () => source.scrollIntoView({ block: "center" });
        card.append(original);
    }
    return card;
}

async function setupHprimBiology() {
    const D = HprimBiologyDom, B = WedaBiology;
    const autoKey = "hprimBiologyAuto", panelId = "wh-hprim-tools", refreshMs = 45000;
    if (document.getElementById(panelId)) return;
    const [saved, initialAuto] = await Promise.all([
        chrome.runtime.sendMessage({ type: "whHprimSession" }), getOptionPromise(autoKey)
    ]);
    const drafts = new Map(saved?.state?.drafts || []);
    const recent = entry => entry && Date.now() - entry.at < 5 * 60000;
    let job = recent(saved?.state?.job) ? saved.state.job : null;
    let pending = recent(saved?.state?.pending) ? saved.state.pending : null;
    let auto = initialAuto === true, controller, nativeEdited, interaction = 0, reviewHold = false;
    let owner = false, releaseOwner, acquiring = false, polling = false, refreshTimer;
    let rendered = null, writes = Promise.resolve();
    const panel = document.createElement("section");
    panel.id = panelId;
    panel.className = "wh-hprim-tools";
    panel.setAttribute("aria-label", "Analyse des biologies");
    const button = (label, onClick) => {
        const node = document.createElement("button");
        node.type = "button";
        node.textContent = label;
        node.onclick = onClick;
        return node;
    };
    const status = document.createElement("div");
    status.setAttribute("role", "status");
    status.textContent = "Sélectionnez un bilan ou lancez l’analyse de la liste.";
    const detail = document.createElement("div");
    const edit = document.createElement("textarea");
    edit.setAttribute("aria-label", "Titre de biologie proposé");
    edit.rows = 3;
    const analyze = button("Analyser ce bilan", () => {
        const row = D.selection();
        if (row) run("single", [row.key]);
    });
    const batch = button("Analyser toutes les biologies", () => run("batch", D.rows().map(row => row.key)));
    const toggle = button("Analyse automatique des biologies", async () => {
        try {
            await chrome.storage.local.set({ [autoKey]: !auto });
        } catch {
            status.textContent = "Impossible de mémoriser le mode automatique.";
        }
    });
    toggle.title = "Analyse les nouveaux bilans tant que cet onglet reste ouvert.";
    const stop = button("Arrêter l’analyse", () => {
        if (auto) {
            auto = false;
            releaseOwner?.();
            chrome.storage.local.set({ [autoKey]: false }).catch(() => {});
        }
        cancel("Analyse arrêtée. Les propositions déjà préparées restent disponibles.");
    });
    const save = button("Valider le titre et passer au suivant", saveTitle);
    panel.append(analyze, batch, toggle, stop, status, edit, save, detail);

    function persist() {
        const state = structuredClone({ drafts: [...drafts].slice(-400), job, pending });
        const write = writes.catch(() => {}).then(async () => {
            const reply = await chrome.runtime.sendMessage({ type: "whHprimSession", state });
            if (!reply?.saved) throw new Error("Le brouillon n’a pas pu être conservé dans cet onglet.");
        });
        writes = write;
        return write;
    }

    function cancel(message) {
        if (controller && !pending) controller.abort(new DOMException(message, "AbortError"));
    }

    function controls(list) {
        const busy = Boolean(controller || job || pending);
        analyze.disabled = busy || !D.selection(list);
        batch.disabled = busy || !list.length;
        stop.disabled = !controller || Boolean(pending);
        toggle.setAttribute("aria-pressed", String(auto));
        edit.disabled = busy;
        save.disabled = busy || !rendered?.draft || !edit.value.trim();
    }

    async function render() {
        const list = D.rows();
        const grid = document.querySelector("#ContentPlaceHolder1_UpdatePanelHprimsGrid") || document.querySelector(D.gridSelector);
        if (grid && panel.previousElementSibling !== grid) grid.after(panel);
        for (const row of list) {
            const state = drafts.get(row.key)?.state;
            let badge = row.element.querySelector(".wh-hprim-badge");
            if (!state) { badge?.remove(); continue; }
            if (!badge) {
                badge = document.createElement("span");
                badge.className = "wh-hprim-badge";
                row.link.after(badge);
            }
            const label = ({ ready: "À valider", review: "À relire", saved: "Titre vérifié" })[state];
            if (badge.dataset.state !== state) badge.dataset.state = state;
            if (badge.textContent !== label) badge.textContent = label;
        }
        const row = D.selection(list), draft = drafts.get(row?.key);
        const snapshot = row && draft?.hash && D.capture(row.key);
        if (rendered?.key !== row?.key || rendered?.sourceDraft !== draft || rendered?.data !== snapshot?.data) {
            if (snapshot) {
                const hash = await D.fingerprint(snapshot.data);
                if (D.capture(row.key)?.data !== snapshot.data || drafts.get(row.key) !== draft) return;
                rendered = { key: row.key, draft: draft.hash === hash ? draft : null, sourceDraft: draft, data: snapshot.data };
            } else rendered = { key: row?.key, draft: null, sourceDraft: draft };
            edit.hidden = save.hidden = !rendered.draft;
            edit.value = rendered.draft?.title || "";
            detail.replaceChildren();
            if (rendered.draft && snapshot) {
                const report = B.analyze(snapshot.measures, snapshot.raw, row.type);
                report.rows.forEach((result, index) => { result.previous = draft.previous?.[index]; });
                report.warnings = draft.warnings;
                const card = hprimSummaryCard(report, snapshot.source);
                card.open = draft.state === "review";
                detail.append(card);
            } else if (draft?.warnings.length) {
                detail.textContent = draft.warnings.join(" ");
            }
        }
        controls(list);
    }

    async function preferences(report, signal) {
        if (!await getOptionPromise("enableIAassistant")) return { order: [] };
        // Les libellés libres, conclusions et antériorités restent dans Weda.
        const rows = report.rows.flatMap((row, index) => row.item && !row.ambiguous &&
            /^[<>≤≥]?[+-]?\d+(?:[,.]\d+)?(?:e[+-]?\d+)?$/i.test(row.value.replace(/\s/g, "")) ?
            [{ indice: index + 1, examen: row.item.name, valeur: row.value, statut: row.state }] : []);
        if (!rows.length) return { order: [] };
        try {
            const reply = await new Promise((resolve, reject) => {
                signal.throwIfAborted();
                const abort = () => reject(signal.reason);
                signal.addEventListener("abort", abort, { once: true });
                chrome.runtime.sendMessage({ type: "whHprimAnalysis", rows }).then(resolve, reject)
                    .finally(() => signal.removeEventListener("abort", abort));
            });
            signal.throwIfAborted();
            if (reply?.skipped) return { order: [] };
            const order = B.parsePreference(reply?.content, report.rows.length);
            if (order.some(index => !rows.some(row => row.indice === index))) throw new Error("Indice absent.");
            return { order };
        } catch {
            signal.throwIfAborted();
            return { order: [], warning: "Prompt IA indisponible ; proposition calculée à partir du bilan." };
        }
    }

    async function prepare(snapshot, hash, signal) {
        const report = B.analyze(snapshot.measures, snapshot.raw, snapshot.row.type);
        if (report.rows.some(row => row.item && !row.ambiguous && ["HAUT", "BAS"].includes(row.state))) {
            let entries = [];
            try { entries = await D.history(snapshot, signal); }
            catch {
                signal.throwIfAborted();
                D.assertSnapshot(snapshot);
                report.warnings.push("L’historique de ce bilan n’a pas pu être relu.");
            }
            report.rows = B.addHistory(report.rows, entries, snapshot.row.date);
        }
        const { order, warning } = report.narrative ? { order: [] } : await preferences(report, signal);
        signal.throwIfAborted();
        const current = D.assertSnapshot(snapshot);
        if (current.title !== snapshot.title) throw new Error("Le titre a été modifié dans Weda pendant l’analyse.");
        const title = B.buildTitle(report, order);
        const max = Math.min(current.input.maxLength > 0 ? current.input.maxLength : 350, 350);
        if (title.length > max) report.warnings.push("Titre trop long pour Weda : raccourcissez-le avant de valider.");
        if (!title && !report.warnings.length) report.warnings.push("Aucun titre fiable ne peut être proposé à partir de ces résultats.");
        const state = report.warnings.length || report.rows.some(row => row.state === "À RELIRE") ? "review" : "ready";
        if (warning) report.warnings.push(warning);
        return { hash, title, original: current.title, warnings: report.warnings,
            previous: Object.fromEntries(report.rows.flatMap((row, index) => row.previous ? [[index, row.previous]] : [])), state };
    }

    async function run(mode, keys, resume = false) {
        if (controller || pending || (!resume && job) || !keys.length) return;
        if (mode !== "auto") reviewHold = false;
        controller = new AbortController();
        const signal = controller.signal;
        if (!resume) job = { mode, keys: [...keys], start: D.selection()?.key || keys[0], at: Date.now(), opening: false };
        const total = job.keys.length;
        controls(D.rows());
        try {
            if (resume && job.opening && !D.capture(job.keys[0])) {
                throw new Error("Weda a changé de bilan au rechargement. Relancez l’analyse.");
            }
            while (job.keys.length) {
                signal.throwIfAborted();
                const key = job.keys[0];
                status.textContent = "Analyse en cours · " + (total - job.keys.length + 1) + " / " + total;
                job.opening = true;
                job.at = Date.now();
                await persist();
                try {
                    const snapshot = await D.open(key, signal);
                    const hash = await D.fingerprint(snapshot.data);
                    const existing = drafts.get(key);
                    if (existing?.hash !== hash || mode === "single") {
                        drafts.set(key, await prepare(snapshot, hash, signal));
                    }
                } catch (error) {
                    signal.throwIfAborted();
                    drafts.set(key, { state: "review", warnings: [error.message] });
                }
                job.keys.shift();
                job.opening = false;
                await persist();
                await render();
            }
            const target = D.rows().find(row => keys.includes(row.key) && drafts.get(row.key)?.state === "review")?.key || job.start;
            const review = keys.filter(key => drafts.get(key)?.state === "review").length;
            job = null;
            await persist();
            if (target && D.rows().some(row => row.key === target)) {
                try { await D.open(target, signal); } catch { signal.throwIfAborted(); }
            }
            status.textContent = review ? "Analyse terminée · " + review + " bilan(s) à relire." :
                "Analyse terminée. Les titres proposés sont disponibles dans la liste.";
        } catch (error) {
            status.textContent = error.message;
        } finally {
            job = null;
            controller = null;
            await persist().catch(() => {});
            await render();
            schedule();
        }
    }

    async function verifySave(resumed = false) {
        const request = pending;
        if (!request) return;
        const signal = controller.signal;
        let reread;
        if (resumed && request.stage === "reread") reread = D.capture(request.key);
        else {
            const current = D.capture(request.key);
            if (!current || await D.fingerprint(current.data) !== request.hash) {
                throw new Error("La sélection a changé. Le titre n’a pas pu être vérifié.");
            }
            D.assertSnapshot(current);
            pending = { ...request, stage: "reread" };
            await persist();
            D.assertSnapshot(current);
            reread = await D.open(request.key, signal, true);
        }
        if (!reread || await D.fingerprint(reread.data) !== request.hash || !B.sameSavedTitle(request.title, reread.title)) {
            throw new Error("Le titre relu dans Weda ne correspond pas au titre transmis. Passage au suivant suspendu.");
        }
        D.assertSnapshot(reread);
        reviewHold = false;
        const draft = drafts.get(request.key);
        if (draft) drafts.set(request.key, { ...draft, title: reread.title, original: reread.title, state: "saved" });
        pending = null;
        await persist();
        status.textContent = "Titre enregistré et relu dans Weda.";
        if (request.next && D.rows().some(row => row.key === request.next)) {
            try { await D.open(request.next, signal); }
            catch { status.textContent += " Sélectionnez le bilan suivant dans la liste."; }
        }
    }

    async function saveTitle() {
        if (controller || job || pending || !rendered?.draft) return;
        const snapshot = D.capture(rendered.key), draft = rendered.draft, title = edit.value.trim();
        if (!snapshot || snapshot.title !== draft.original) {
            status.textContent = "Le titre natif ou le bilan a changé. Relancez l’analyse avant de valider.";
            return;
        }
        const max = Math.min(snapshot.input.maxLength > 0 ? snapshot.input.maxLength : 350, 350);
        if (!title || title.length > max || /[\r\n]/.test(title)) {
            status.textContent = "Saisissez un titre sur une ligne, de " + max + " caractères au maximum.";
            return;
        }
        controller = new AbortController();
        controls(D.rows());
        try {
            const hash = await D.fingerprint(snapshot.data);
            if (hash !== draft.hash) throw new Error("Le contenu du bilan a changé. Relancez l’analyse.");
            const list = D.rows(), index = list.findIndex(row => row.key === snapshot.row.key);
            pending = { key: snapshot.row.key, hash, title, next: list[index + 1]?.key, stage: "saving", at: Date.now() };
            await persist();
            const current = D.assertSnapshot(snapshot);
            if (current.title !== snapshot.title) throw new Error("Le titre natif a changé avant l’enregistrement.");
            status.textContent = "Enregistrement et relecture du titre dans Weda…";
            if (!B.sameSavedTitle(title, current.title)) {
                current.input.value = title;
                await D.native("save", current.input, controller.signal);
            }
            await verifySave();
        } catch (error) {
            reviewHold = true;
            if (snapshot.input.isConnected && D.capture(snapshot.row.key)?.data === snapshot.data &&
                snapshot.input.value === title) snapshot.input.value = snapshot.title;
            status.textContent = error.message;
        } finally {
            pending = null;
            controller = null;
            await persist().catch(() => {});
            await render();
        }
    }

    function editing() {
        return reviewHold || nativeEdited?.isConnected ||
            document.activeElement?.matches("input:not([type='button']), textarea, select, [contenteditable='true']");
    }
    function idleAuto() { return auto && owner && !controller && !job && !pending && !editing(); }

    function schedule() {
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(async () => {
            await render();
            if (!idleAuto()) return;
            const keys = D.rows().filter(row => !drafts.has(row.key)).map(row => row.key);
            if (keys.length) run("auto", keys);
        }, 100);
    }

    async function poll() {
        if (!idleAuto() || polling || !panel.isConnected) return;
        polling = true;
        const revision = interaction;
        try {
            const response = await fetch(location.href, { cache: "no-store", credentials: "same-origin",
                redirect: "error", signal: AbortSignal.timeout(12000) });
            if (!response.ok) throw new Error();
            const template = document.createElement("template");
            template.innerHTML = await response.text();
            const known = new Set(D.rows().map(row => row.key));
            if (!D.rows(template.content).some(row => !known.has(row.key))) return;
            if (!idleAuto() || revision !== interaction) return;
            await persist();
            if (idleAuto() && revision === interaction) {
                // Un rechargement de l'URL affichée peut répéter le POST du dernier titre.
                const next = new URL(location.href);
                next.searchParams.set("wh_hprim_refresh", String(Date.now()));
                location.replace(next.href);
            }
        } catch {
            if (idleAuto()) status.textContent = "La liste n’a pas pu être actualisée. Nouvelle tentative au prochain contrôle.";
        } finally { polling = false; }
    }

    function claimAuto() {
        if (!auto || owner || acquiring) return;
        acquiring = true;
        navigator.locks.request("wh-hprim-auto", { ifAvailable: true }, async lock => {
            if (!lock || !auto) return;
            owner = true;
            schedule();
            await new Promise(resolve => { releaseOwner = resolve; });
            owner = false;
        }).catch(() => {}).finally(() => { acquiring = false; });
    }

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "local" || !Object.hasOwn(changes, autoKey)) return;
        auto = changes[autoKey].newValue === true;
        if (!auto) {
            if (job?.mode === "auto") cancel("Analyse automatique arrêtée.");
            releaseOwner?.();
        } else claimAuto();
        schedule();
    });
    edit.oninput = () => { controls(D.rows()); };
    edit.onchange = () => {
        if (!rendered?.draft) return;
        rendered.draft.title = edit.value;
        persist().catch(() => {});
    };
    document.addEventListener("input", event => {
        if (!event.isTrusted || !event.target.matches(D.titleSelector)) return;
        nativeEdited = event.target;
        cancel("Analyse arrêtée : titre natif modifié.");
    });
    document.addEventListener("click", event => {
        if (!event.isTrusted) return;
        interaction++;
        if (event.target.closest(D.gridSelector)) {
            nativeEdited = null;
            reviewHold = false;
            cancel("Analyse arrêtée : un autre bilan a été sélectionné.");
        }
    }, true);
    window.addEventListener("pagehide", () => releaseOwner?.(), { once: true });
    window.addEventListener("focus", () => { claimAuto(); poll(); });
    const observer = new MutationObserver(records => {
        if (records.some(({ target }) => !(target.parentElement?.closest("#" + panelId + ", .wh-hprim-badge") ||
            target.closest?.("#" + panelId + ", .wh-hprim-badge")))) schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    edit.hidden = save.hidden = true;
    await render();
    if (pending) {
        controller = new AbortController();
        controls(D.rows());
        try { await verifySave(true); }
        catch (error) { reviewHold = true; status.textContent = error.message; }
        finally {
            pending = null;
            controller = null;
            await persist().catch(() => {});
            await render();
        }
    } else if (job && (job.mode !== "auto" || auto)) {
        await run(job.mode, [...job.keys], true);
    } else job = null;
    claimAuto();
    setInterval(() => { claimAuto(); poll(); }, refreshMs);
    schedule();
}
