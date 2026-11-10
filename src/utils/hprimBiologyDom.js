const HprimBiologyDom = (() => {
    const gridSelector = "#ContentPlaceHolder1_HprimsGrid";
    const gridPanelSelector = "#ContentPlaceHolder1_UpdatePanelHprimsGrid";
    const titleSelector = "#ContentPlaceHolder1_TextBoxHprimTitre";
    const assignSelector = '#ContentPlaceHolder1_PatientsGrid input[type="submit"][id*="ButtonAffecteResultat_"]';
    const historyPanel = '[id$="PanelHistoriqueSuivi"]';
    const historyGrid = '[id$="HistoriqueSuiviGrid"]';
    const { text, fold } = WedaBiology;
    const dateIn = value => String(value || "").match(/\b\d{2}\/\d{2}\/\d{4}\b/)?.[0] || "";

    function rows(root = document) {
        const listed = Array.from(root.querySelector(gridSelector)?.rows || []).flatMap(element => {
            const link = element.querySelector('a[id*="HprimsGrid_LinkButtonHprimNom_"], a[id*="HprimsGrid_LinkButtonHprimPrenom_"]');
            if (!link) return [];
            const cells = Array.from(element.cells, cell =>
                text(Array.from(cell.childNodes, node => node.textContent).join(" ")));
            const date = dateIn(element.querySelector('label[for*="CheckBoxHprimDateResultat_"]')?.textContent) || dateIn(cells[0]);
            const [type, last, first, birth, practitioner] = cells.slice(1, 6);
            const identity = JSON.stringify([date, type, last, first, birth, practitioner].map(fold));
            return [{ element, link, identity, date, type, last, first, birth: dateIn(birth) }];
        });
        const count = new Map(), seen = new Map();
        listed.forEach(row => count.set(row.identity, (count.get(row.identity) || 0) + 1));
        return listed.map(row => {
            const ordinal = (seen.get(row.identity) || 0) + 1;
            seen.set(row.identity, ordinal);
            return { ...row, key: JSON.stringify([row.identity, count.get(row.identity), ordinal]) };
        });
    }

    function selection(list = rows()) {
        const selected = list.filter(row => row.element.classList.contains("grid-selecteditem"));
        return selected.length === 1 ? selected[0] : null;
    }

    function visible(element) {
        return Boolean(element && element.getClientRects().length && getComputedStyle(element).visibility !== "hidden");
    }

    function capture(key) {
        const row = selection();
        if (!row || row.key !== key) return null;
        const input = document.querySelector(titleSelector);
        const structure = document.querySelector("#ContentPlaceHolder1_LabelHprimDataStructure");
        const table = structure?.querySelector("table.hprimgrid, table");
        const rawElements = Array.from(document.querySelectorAll(
            "#ContentPlaceHolder1_DivDataHprim, #ContentPlaceHolder1_LabelHprimData"));
        const raw = rawElements.map(element => (element.innerText || element.textContent).trim())
            .filter(Boolean).sort((a, b) => b.length - a.length)[0] || "";
        const header = [];
        if (table) {
            const range = document.createRange();
            range.selectNodeContents(structure);
            range.setEndBefore(table);
            header.push(range.toString());
        }
        // Le script d'origine confirme la date du résultat, la date de naissance et le nom affiché.
        const identityMatches = value => {
            const source = fold(value).replace(/[’‘]/g, "'");
            const hasName = name => name && source.includes(fold(name).replace(/[’‘]/g, "'"));
            return row.date && row.birth && source.includes(row.date) && source.includes(row.birth) &&
                (hasName(row.last) || hasName(row.first));
        };
        const measures = WedaBiology.readTable(table);
        const structured = Boolean(measures.length && identityMatches(header.join(" ")));
        const narrative = Boolean(raw && identityMatches(raw.split(/\r?\n/).slice(0, 24).join(" ")));
        if (!input || (!structured && !narrative)) return null;
        const sourceRows = structured ? measures : [];
        const sourceRaw = narrative ? raw : "";
        const data = JSON.stringify([row.key, structured ? text(header.join(" ")) : "", sourceRows, sourceRaw]);
        return { row, input, data, measures: sourceRows, raw: sourceRaw, title: input.value,
            source: structured ? structure : rawElements.find(element => (element.innerText || element.textContent).trim() === raw) };
    }

    function assertSnapshot(snapshot) {
        const current = capture(snapshot.row.key);
        if (!current || current.data !== snapshot.data) throw new Error("Le bilan affiché a changé. Relancez l’analyse sur la bonne ligne.");
        return current;
    }

    function native(action, target, signal) {
        return new Promise((resolve, reject) => {
            signal?.throwIfAborted();
            if (!target?.id) { reject(new Error("Commande Weda introuvable.")); return; }
            const id = crypto.randomUUID();
            const cleanup = () => {
                clearTimeout(timer);
                document.removeEventListener("wh-hprim-response", receive);
                signal?.removeEventListener("abort", abort);
            };
            const fail = (message, code) => { cleanup(); reject(Object.assign(new Error(message), { code })); };
            const abort = () => { cleanup(); reject(signal.reason); };
            const receive = event => {
                if (event.detail?.id !== id) return;
                const state = event.detail.state;
                if (state === "complete" || (action === "open" && state === "dispatched")) { cleanup(); resolve(); }
                else if (state === "busy") fail("Weda traite déjà une demande. Réessayez après son chargement.", "busy");
                else if (state === "missing") fail("La commande n’est plus disponible dans Weda.");
                else fail("Weda n’a pas répondu à la commande de lecture.");
            };
            const timer = setTimeout(() => fail("Weda n’a pas répondu à la commande."), 14000);
            document.addEventListener("wh-hprim-response", receive);
            signal?.addEventListener("abort", abort, { once: true });
            document.dispatchEvent(new CustomEvent("wh-hprim-request", { detail: { id, action, targetId: target.id } }));
        });
    }

    function waitFor(checkPage, signal, message) {
        return new Promise((resolve, reject) => {
            signal?.throwIfAborted();
            const cleanup = () => {
                observer.disconnect();
                clearTimeout(timer);
                signal?.removeEventListener("abort", abort);
            };
            const abort = () => { cleanup(); reject(signal.reason); };
            const check = () => {
                const result = checkPage();
                if (!result) return;
                cleanup();
                resolve(result);
            };
            const observer = new MutationObserver(check);
            const timer = setTimeout(() => {
                cleanup();
                reject(new Error(message));
            }, 15000);
            observer.observe(document.body, {
                childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class", "value"]
            });
            signal?.addEventListener("abort", abort, { once: true });
            check();
        });
    }

    function afterAssignment(request, signal) {
        const remaining = request.before.filter((_, index) => index !== request.index);
        const assigned = request.before[request.index].identity;
        const sameIdentity = row => row.identity === assigned;
        return waitFor(() => {
            if (!document.querySelector(gridPanelSelector)) return null;
            const list = rows();
            // La liste doit avoir perdu le bilan affecté et conservé l’ordre des autres lignes.
            if (list.filter(sameIdentity).length !== remaining.filter(sameIdentity).length ||
                remaining.some((row, index) => row.identity !== list[index]?.identity)) return null;
            return { list, remaining, next: list[request.index] };
        }, signal, "Weda n’a pas confirmé l’affectation dans la liste des imports.");
    }

    async function open(key, signal, staleInput) {
        signal?.throwIfAborted();
        const current = capture(key);
        if (current && current.input !== staleInput) return current;
        const deadline = Date.now() + 4000;
        const x = window.scrollX, y = window.scrollY;
        for (;;) {
            const link = rows().find(row => row.key === key)?.link;
            if (!link?.isConnected) throw new Error("La ligne à ouvrir n’est plus disponible dans Weda.");
            // Weda peut remplacer le formulaire précédent pendant l'attente d'une lecture.
            const previousInput = document.querySelector(titleSelector);
            const previousDefault = previousInput?.defaultValue;
            // La lecture du suivant ne doit pas renvoyer le titre du bilan déjà affecté.
            const name = previousInput === staleInput && previousInput?.getAttribute("name");
            if (name) previousInput.removeAttribute("name");
            try {
                await native("open", link, signal);
                const snapshot = await waitFor(() => {
                    // Une nouvelle sélection peut apparaître avant le remplacement du formulaire.
                    const input = document.querySelector(titleSelector);
                    if (!input || (input === previousInput && input.defaultValue === previousDefault)) return null;
                    return capture(key);
                }, signal, "Weda n’a pas chargé le compte rendu attendu pour cette ligne.");
                window.scrollTo(x, y);
                return snapshot;
            } catch (error) {
                if (error.code !== "busy" || Date.now() >= deadline) throw error;
            } finally {
                if (name && !previousInput.hasAttribute("name")) previousInput.setAttribute("name", name);
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    async function history(snapshot, signal) {
        if (visible(document.querySelector(historyPanel))) return [];
        const commands = Array.from(document.querySelectorAll(
            '#ContentPlaceHolder1_PatientsGrid [id*="ButtonHistoriqueResultat_"]')).filter(button => !button.disabled && visible(button));
        if (commands.length !== 1) return [];
        const oldGrid = document.querySelector(historyGrid), oldContent = oldGrid?.textContent;
        try {
            assertSnapshot(snapshot);
            await native("history", commands[0], signal);
            signal.throwIfAborted();
            assertSnapshot(snapshot);
            const grid = document.querySelector(historyGrid);
            if (!visible(document.querySelector(historyPanel)) || !grid || (grid === oldGrid && grid.textContent === oldContent)) return [];
            return WedaBiology.historyEntries(grid);
        } finally {
            if (!signal.aborted && capture(snapshot.row.key)?.data === snapshot.data) {
                const close = Array.from(document.querySelector(historyPanel)?.querySelectorAll("button,input,a,img") || [])
                    .filter(element => visible(element) && /^(?:fermer|close|annuler|×|x)$/i.test(
                        text(element.value || element.title || element.alt || element.textContent)));
                if (close.length === 1) close[0].click();
            }
        }
    }

    async function fingerprint(data, originalKey) {
        if (originalKey) {
            const report = JSON.parse(data);
            report[0] = originalKey;
            data = JSON.stringify(report);
        }
        const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data)));
        return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
    }

    return { rows, selection, capture, assertSnapshot, open, history, afterAssignment, fingerprint, dateIn,
        gridSelector, gridPanelSelector, titleSelector, assignSelector };
})();
