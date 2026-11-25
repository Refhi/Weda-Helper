/**
 * @file antecedentsComparePanel.js
 * @description Panneau affiché au clic sur le bouton « Antécédents » du PDF Parser (@see addAntecedentsButton) :
 * compare les antécédents existants du patient aux opérations proposées par l'IA
 * (ajouter = vert, modifier = orange, supprimer = rouge) et permet de valider ou non chacune d'elles.
 *
 * @requires pdfParser.js (resolveCurrentPatientIdWithWait via offscreenBridge.js, libelleCim10)
 * @requires callableFunctions.js (recoverPatientData)
 * @requires floatingPanelLayout.js
 */

const ATCD_PANEL_STYLE_ID = 'wh-atcd-panel-style';
const ATCD_PANEL_ID = 'wh-atcd-panel';
const ATCD_PANEL_GEOMETRY_KEY = 'antecedentsComparePanelGeometry';
let atcdPanelGeometrySave = Promise.resolve();

// L'empreinte ne dépend pas de la relecture du PDF. Le pointeur de session mène aux résultats
// conservés avec ce PDF, que les boutons existants de réinitialisation peuvent donc effacer.
const echangesAntecedents = (() => {
    const prefix = "wh-atcd:";
    let lastSignature, current, ready, enabled = false, pending = Promise.resolve();
    function source() {
        const pane = document.getElementById("messageContainer");
        const row = document.querySelector("#messageList .messageListItem.selected");
        const subject = row => (row?.querySelector(".subjectRow") || row?.querySelector(".messageLineItem"))?.textContent.trim();
        const name = subject(row);
        const files = Array.from(pane?.querySelectorAll("#PanelViewDocument iframe, .messageAttachment #iFrameViewFile, .mssAttachment embed, .messageAttachment object[type='application/pdf']") || [], viewer => {
            const src = viewer.getAttribute("src") || viewer.getAttribute("data");
            if (!src || src === "about:blank") return null;
            if (src.startsWith("data:")) return src;
            const url = new URL(src, document.baseURI);
            return /\/BinaryData\.aspx$/i.test(url.pathname) && url.searchParams.has("id")
                ? JSON.stringify([url.origin, url.pathname, url.searchParams.get("id"), url.searchParams.get("i")]) : url.href;
        });
        const body = pane?.querySelector(".messageBody")?.textContent.trim();
        if (!name || !pane || !crypto.subtle || [...document.querySelectorAll("#messageList .messageListItem")].some(other => other !== row && subject(other) === name)
            || (files.length ? files.includes(null) || new Set(files).size !== files.length : !body || pane.querySelector(".messageAttachment"))) {
            lastSignature = null;
            return row || pane?.querySelector(".button.valid"); // Analyse courante uniquement si la pièce est ambiguë.
        }
        const patientLine = row.querySelector(".patientLine")?.cloneNode(true);
        patientLine?.querySelectorAll(".dossierChip").forEach(chip => chip.remove());
        const signature = [name, patientLine?.textContent, pane.querySelector(".messageHeader")?.textContent, body, ...files];
        if (signature.length !== lastSignature?.length || signature.some((part, i) => part !== lastSignature[i])) {
            lastSignature = signature;
            const key = crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(signature)))
                .then(buffer => prefix + Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, "0")).join(""));
            current = { key };
        }
        return current;
    }
    function patient(context) {
        const marker = document.getElementById("pdfParserPatientName");
        const id = resolveCurrentPatientId();
        if (marker && (marker.whAtcdSource !== context || marker.dataset.patientId !== String(id))) return null;
        return /^[1-9]\d*$/.test(id) ? String(id) : null;
    }
    function confirmed(comparison) {
        return enabled && comparison?.patientId && comparison.context === source() && patient(comparison.context) === comparison.patientId;
    }
    async function restore() {
        if (!enabled && !antecedentsButton?.whComparison) return;
        const context = enabled && source();
        const key = await context?.key;
        if (context && context !== source()) return;
        const hash = key && sessionStorage.getItem(key);
        const saved = hash && getPdfData(hash, key);
        if (hash && !saved) sessionStorage.removeItem(key);
        const selected = patient(context);
        const anchor = document.querySelector("#messageContainer .button.valid") || document.querySelector("#messageContainer .btnImport.importPatient");
        if (enabled && saved && anchor && (!selected || selected === saved.patientId)) {
            addAntecedentsButton(saved.operations, anchor, hash, { key, context, patientId: saved.patientId });
        } else if (antecedentsButton?.whComparison && (!enabled || antecedentsButton.whComparison.context !== context || (antecedentsButton.whComparison.key && !antecedentsButton.disabled))) {
            addAntecedentsButton(null, null);
        }
    }
    function save(hash, { key, patientId }, operations) {
        setPdfData(hash, { [key]: { patientId, operations } });
        sessionStorage.setItem(key, hash);
    }
    async function compare(context, { hashId, fullText, urlPDF, messageBody }) {
        await ready;
        if (!enabled || !context || context !== source()) return;
        const patientId = String(await resolveCurrentPatientIdWithWait());
        const key = await context.key;
        const comparison = { context, key, patientId };
        // La chaîne d'antécédents a un seul appel IA en cours par onglet.
        const task = pending.then(async () => {
            if (!confirmed(comparison)) return;
            const saved = key && sessionStorage.getItem(key) === hashId && getPdfData(hashId, key);
            if (saved?.patientId === patientId) return { ...comparison, operations: saved.operations };
            if (key) sessionStorage.removeItem(key);
            const operations = await checkAntecedentsAgainstDocument(fullText, urlPDF, { messageBody });
            if (!confirmed(comparison)) return;
            if (key && Array.isArray(operations) && sessionStorage.getItem(hashId)) save(hashId, comparison, operations);
            return { ...comparison, operations };
        });
        pending = task.catch(() => {});
        return task;
    }
    function watch() {
        ready = getOptionPromise("verifierEtMettreAJourAntecedents").then(value => { enabled = value; restore(); });
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === "local" && changes.verifierEtMettreAJourAntecedents) {
                enabled = changes.verifierEtMettreAJourAntecedents.newValue;
                restore();
            }
        });
        waitForElement({ selector: "#messageList, #messageContainer", observerId: "atcdEchanges", triggerOnInit: true, callback(nodes) {
            for (const node of nodes) new MutationObserver(restore).observe(node, {
                childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class", "src", "data"]
            });
            restore();
        } });
    }
    function invalidate(patientId) {
        const cache = readDataScrapperCache(patientId);
        delete cache.antecedents;
        writeDataScrapperCache(patientId, cache);
        for (const key of Object.keys(sessionStorage).filter(key => key.startsWith(prefix))) {
            const hash = sessionStorage.getItem(key);
            if (getPdfData(hash, key)?.patientId === patientId) {
                setPdfData(hash, { [key]: null });
                sessionStorage.removeItem(key);
            }
        }
    }
    return { source, watch, compare, confirmed, save, invalidate };
})();

function injectAntecedentsPanelStyle() {
    if (document.getElementById(ATCD_PANEL_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = ATCD_PANEL_STYLE_ID;
    style.textContent = `
        .wh-atcd-panel { position: fixed; z-index: 100000; width: min(560px, 100vw); height: min(500px, 65vh); box-sizing: border-box;
            display: flex; flex-direction: column; overflow: hidden;
            background: #fff; color: #222; border: 1px solid #888; border-radius: 6px; box-shadow: 0 4px 16px rgba(0,0,0,.3);
            padding: 8px; font-size: 13px; text-align: left; }
        .wh-atcd-header { display: flex; justify-content: space-between; align-items: center; flex: none;
            cursor: move; user-select: none; touch-action: none; padding: 4px; font-weight: bold; }
        .wh-atcd-close { cursor: pointer; }
        .wh-atcd-content { overflow: auto; flex: 1; min-height: 0; }
        .wh-atcd-panel h4 { margin: 8px 0 4px; padding: 2px 6px; font-size: 11px; font-weight: bold; text-transform: uppercase;
            background: #dde6f2; color: #1d3f6e; border: 1px solid #a0a0a0; border-radius: 3px; }
        .wh-atcd-icon { width: 20px; text-align: center; flex: none; }
        .wh-atcd-title { font-size: 10pt; }
        .wh-atcd-code { color: #a0a0a0; margin-left: 4px; }
        .wh-atcd-date { margin-left: 6px; font-weight: bold; }
        .wh-atcd-date.debut { color: #000; font-weight: normal; }
        .wh-atcd-date.ponctuelle { color: #006000; }
        .wh-atcd-date.fin { color: #555; font-weight: normal; }
        .wh-atcd-date.alerte { color: #ff0000; }
        .wh-atcd-desc { font-size: x-small; color: #333; white-space: pre-line; }
        .wh-atcd-toolbar { display: flex; gap: 6px; align-items: center; position: sticky; top: 0; background: #fff; padding-bottom: 4px; }
        .wh-atcd-row { display: flex; gap: 6px; align-items: flex-start; padding: 3px 4px; margin: 2px 0; border: 1px solid #e0e0e0; border-left: 4px solid transparent; border-radius: 5px; }
        .wh-atcd-row.existing { color: #000; }
        .wh-atcd-row.ajouter { background: #e6f7e6; border-left-color: #2e9e2e; }
        .wh-atcd-row.modifier { background: #fff3da; border-left-color: #e69500; }
        .wh-atcd-row.supprimer { background: #fde4e4; border-left-color: #d32f2f; }
        .wh-atcd-row.supprimer .wh-atcd-title { text-decoration: line-through; }
        .wh-atcd-row.refused { opacity: .45; }
        .wh-atcd-details { font-size: 12px; color: #444; white-space: pre-line; }
        .wh-atcd-tag { font-weight: bold; margin-right: 4px; }
    `;
    document.head.appendChild(style);
}

function normalizeAtcdText(text) {
    return String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

/** Opération → intitulé de l'antécédent existant visé (modifier / supprimer). */
function atcdOperationTarget(op) {
    return op.nomCible || op.data?.nom || '';
}

function atcdItemMatchesOperation(item, op) {
    const target = normalizeAtcdText(atcdOperationTarget(op));
    if (!target) return false;
    return normalizeAtcdText(item.titre) === target || normalizeAtcdText(item.cim10Code) === target;
}

function atcdOperationDetails(op) {
    const name = op.data?.nom || op.nomCible || '';
    const label = /^[A-Z]\d{2}(\.\d+)?$/i.test(name) && typeof libelleCim10 === 'function' ? libelleCim10(name) : null;
    const { nom, searchType, onglet, ...changes } = op.data || {};
    const details = Object.entries(changes).filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${k} : ${v}`);
    if (op.action === 'modifier' && nom && nom !== op.nomCible) details.unshift(`nouveau nom : ${nom}`);
    return { name, label, details };
}

const ATCD_DATE_LABELS = { debut: 'Début', fin: 'Fin', ponctuelle: '', alerte: 'Alerte' };

/** Icône de l'onglet, à la manière de Weda (pathologie, divers, allergie). */
function atcdSectionIcon(sectionTitle) {
    const title = normalizeAtcdText(sectionTitle);
    if (title.includes('allerg')) return '🟠';
    if (title.includes('divers')) return '📋';
    return '🩺';
}

/** Titre, code gris, dates colorées puis description en petit, comme dans le volet médical de Weda. */
function buildExistingAtcdContent(item, op) {
    const wrapper = document.createElement('div');
    const title = document.createElement('span');
    title.className = 'wh-atcd-title';
    title.textContent = item.titre;
    wrapper.appendChild(title);
    if (item.cim10Code) {
        const code = document.createElement('span');
        code.className = 'wh-atcd-code';
        code.textContent = `[${item.cim10Code}]`;
        wrapper.appendChild(code);
    }
    Object.entries(ATCD_DATE_LABELS).filter(([key]) => item.dates?.[key]).forEach(([key, label]) => {
        const date = document.createElement('span');
        date.className = `wh-atcd-date ${key}`;
        date.textContent = `${label ? `${label} : ` : ''}${item.dates[key]}`;
        wrapper.appendChild(date);
    });
    if (item.description) {
        const description = document.createElement('div');
        description.className = 'wh-atcd-desc';
        description.textContent = item.description;
        wrapper.appendChild(description);
    }
    return wrapper;
}

function makeAtcdRow(className) {
    const row = document.createElement('div');
    row.className = `wh-atcd-row ${className}`;
    return row;
}

/**
 * Attache le panneau de comparaison à un bouton : un clic l'ouvre ou le ferme.
 * @param {HTMLElement} button
 * @param {Array<object>} operations - Opérations proposées (format de traiterAntecedentsBatch).
 * @param {object} [options]
 * @param {function(): Promise<string|number>} [options.getPatientId]
 * @param {function(number): void} [options.onSelectionChange] - Appelé avec le nombre d'opérations retenues.
 * @param {function(Array<object>): Promise<string>} [options.onApply] - Appelé par « Valider la sélection » avec les opérations
 *   retenues ; renvoie le message de résultat à afficher.
 * @returns {{getSelectedOperations: function(): Array<object>, destroy: function(): void}}
 */
function attachAntecedentsComparePanel(button, operations, { getPatientId = resolveCurrentPatientIdWithWait, canApply = () => true, onSelectionChange = () => { }, onApply = null } = {}) {
    injectAntecedentsPanelStyle();
    const selected = new Set(operations.map((_, index) => index));
    let panel = null;
    let hideTimer = null;
    let existingPromise = null;
    let applying = false;
    let validateButton = null;
    let cleanupLayout = null;
    const checkboxes = [];

    const refreshValidateButton = () => {
        if (validateButton) {
            const confirmed = canApply();
            validateButton.disabled = applying || !onApply || !selected.size || !confirmed;
            validateButton.title = confirmed ? "Appliquer les propositions cochées" : "Comparaison mémorisée. Confirmez le dossier patient pour appliquer les propositions.";
        }
    };
    const notify = () => {
        refreshValidateButton();
        onSelectionChange(selected.size);
    };

    const setAll = (value) => {
        selected.clear();
        if (value) operations.forEach((_, index) => selected.add(index));
        checkboxes.forEach((checkbox, index) => {
            checkbox.checked = value;
            checkbox.closest('.wh-atcd-row')?.classList.toggle('refused', !value);
        });
        notify();
    };

    const makeOperationCheckbox = (index) => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = selected.has(index);
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) selected.add(index); else selected.delete(index);
            checkbox.closest('.wh-atcd-row')?.classList.toggle('refused', !checkbox.checked);
            notify();
        });
        checkboxes[index] = checkbox;
        return checkbox;
    };

    const loadExisting = async () => {
        const patientId = await getPatientId();
        if (!patientId) return null;
        const cached = readDataScrapperCache(patientId).antecedents?.data;
        if (Array.isArray(cached)) return cached;
        if (!canApply()) return null;
        existingPromise ??= (async () => {
            try {
                // patientId est le 2e argument de recoverPatientData, pas une option
                const res = await recoverPatientData({ categories: ['antecedents'], refreshMode: 'noRefresh' }, patientId);
                if (res?.error) throw new Error(res.error);
                return res?.antecedents || [];
            } catch (error) {
                console.warn('[antecedentsComparePanel] Antécédents existants indisponibles :', error);
                return null;
            }
        })();
        return existingPromise;
    };

    const buildContent = async (isCurrent) => {
        const content = document.createDocumentFragment();

        const toolbar = document.createElement('div');
        toolbar.className = 'wh-atcd-toolbar';
        const status = document.createElement('span');
        status.className = 'wh-atcd-details';
        const validateSelection = document.createElement('button');
        validateButton = validateSelection;
        validateSelection.type = 'button';
        validateSelection.textContent = '✔ Valider la sélection';
        validateSelection.title = "Applique au dossier du patient toutes les opérations cochées";
        validateSelection.addEventListener('click', async () => {
            if (!onApply || applying || !selected.size || !canApply()) return;
            applying = true;
            validateSelection.disabled = true;
            cancelAll.disabled = true;
            status.textContent = 'Application en cours…';
            try {
                status.textContent = await onApply(operations.filter((_, index) => selected.has(index)));
            } catch (error) {
                status.textContent = `❌ ${error.message || error}`;
            }
            applying = false;
            hide(1500);
        });
        const cancelAll = document.createElement('button');
        cancelAll.type = 'button';
        cancelAll.textContent = '✖ Tout annuler';
        cancelAll.title = 'Décoche toutes les propositions et ferme le panneau';
        cancelAll.addEventListener('click', () => { setAll(false); hide(0); });
        const legend = document.createElement('span');
        legend.textContent = '🟩 ajouter  🟧 modifier  🟥 supprimer';
        toolbar.append(validateSelection, cancelAll, legend, status);
        refreshValidateButton();
        content.appendChild(toolbar);

        const existing = await loadExisting();
        const details = operations.map(atcdOperationDetails);
        if (!isCurrent()) return null;
        const handled = new Set();

        const sections = (existing || []).map(section => ({ title: section.titre, items: section.items || [] }));
        const addToSection = (title) => {
            let section = sections.find(s => normalizeAtcdText(s.title) === normalizeAtcdText(title));
            if (!section) {
                section = { title: title || 'Autres', items: [] };
                sections.push(section);
            }
            return section;
        };
        // Les ajouts sont rattachés à leur onglet (créé s'il n'est pas déjà dans les antécédents existants)
        const additionsBySection = new Map();
        operations.forEach((op, index) => {
            if (op.action !== 'ajouter') return;
            const section = addToSection(op.data?.onglet);
            if (!additionsBySection.has(section)) additionsBySection.set(section, []);
            additionsBySection.get(section).push(index);
        });

        if (existing === null) {
            const warning = document.createElement('div');
            warning.textContent = '⚠️ Antécédents existants indisponibles : seules les propositions sont affichées.';
            content.appendChild(warning);
        }

        sections.forEach(section => {
            const additions = additionsBySection.get(section) || [];
            if (!section.items.length && !additions.length) return;
            const title = document.createElement('h4');
            title.textContent = section.title;
            content.appendChild(title);

            section.items.forEach(item => {
                const index = operations.findIndex((op, i) => op.action !== 'ajouter' && !handled.has(i) && atcdItemMatchesOperation(item, op));
                const op = index >= 0 ? operations[index] : null;
                if (op) handled.add(index);
                const row = makeAtcdRow(op ? op.action : 'existing');
                if (op) {
                    row.appendChild(makeOperationCheckbox(index));
                    if (!selected.has(index)) row.classList.add('refused');
                }
                const icon = document.createElement('div');
                icon.className = 'wh-atcd-icon';
                icon.textContent = atcdSectionIcon(section.title);
                row.appendChild(icon);
                const text = buildExistingAtcdContent(item, op);
                if (op) {
                    const tag = document.createElement('span');
                    tag.className = 'wh-atcd-tag';
                    tag.textContent = op.action === 'supprimer' ? '🗑 À supprimer :' : '✏️ À modifier :';
                    text.prepend(tag);
                    if (op.action === 'supprimer') text.querySelector('.wh-atcd-title').style.textDecoration = 'line-through';
                    if (details[index].details.length) {
                        const extra = document.createElement('div');
                        extra.className = 'wh-atcd-details';
                        extra.textContent = `→ ${details[index].details.join('\n→ ')}`;
                        text.appendChild(extra);
                    }
                }
                row.appendChild(text);
                content.appendChild(row);
            });

            additions.forEach(index => {
                const row = makeAtcdRow('ajouter');
                row.appendChild(makeOperationCheckbox(index));
                if (!selected.has(index)) row.classList.add('refused');
                const text = document.createElement('div');
                const tag = document.createElement('span');
                tag.className = 'wh-atcd-tag';
                tag.textContent = '➕ À ajouter :';
                const name = document.createElement('span');
                name.className = 'wh-atcd-title';
                name.textContent = details[index].name;
                details[index].label?.then(label => { if (label && isCurrent()) name.append(" — " + label); });
                text.append(tag, name);
                if (details[index].details.length) {
                    const extra = document.createElement('div');
                    extra.className = 'wh-atcd-details';
                    extra.textContent = details[index].details.join('\n');
                    text.appendChild(extra);
                }
                row.appendChild(text);
                content.appendChild(row);
            });
        });

        // Modifier / supprimer dont l'antécédent n'a pas été retrouvé dans la liste existante
        const orphans = operations.map((op, index) => index).filter(index => operations[index].action !== 'ajouter' && !handled.has(index));
        if (orphans.length) {
            const title = document.createElement('h4');
            title.textContent = 'Antécédent visé introuvable';
            content.appendChild(title);
            orphans.forEach(index => {
                const op = operations[index];
                const row = makeAtcdRow(op.action);
                row.appendChild(makeOperationCheckbox(index));
                if (!selected.has(index)) row.classList.add('refused');
                const text = document.createElement('div');
                text.textContent = `${op.action} ${atcdOperationTarget(op)}${details[index].details.length ? ` : ${details[index].details.join(', ')}` : ''}`;
                row.appendChild(text);
                content.appendChild(row);
            });
        }
        return content;
    };

    const closePanel = () => {
        if (applying) return;
        clearTimeout(hideTimer);
        cleanupLayout?.();
        cleanupLayout = null;
        panel?.remove();
        panel = null;
        validateButton = null;
        checkboxes.length = 0;
    };
    const hide = (delay = 0) => {
        clearTimeout(hideTimer);
        if (delay > 0) hideTimer = setTimeout(closePanel, delay);
        else closePanel();
    };

    const show = async () => {
        if (panel) {
            closePanel();
            return;
        }
        if (document.getElementById(ATCD_PANEL_ID)) return;
        panel = document.createElement('div');
        panel.id = ATCD_PANEL_ID;
        panel.className = 'wh-atcd-panel';
        panel.style.visibility = 'hidden';
        const header = document.createElement('div');
        header.className = 'wh-atcd-header';
        const title = document.createElement('span');
        title.textContent = 'Antécédents';
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'wh-atcd-close';
        close.textContent = '✖';
        close.title = 'Fermer le panneau';
        close.setAttribute('aria-label', 'Fermer le panneau des antécédents');
        close.addEventListener('click', closePanel);
        header.append(title, close);
        const body = document.createElement('div');
        body.className = 'wh-atcd-content';
        body.textContent = 'Chargement des antécédents…';
        panel.append(header, body);
        document.body.appendChild(panel);
        const currentPanel = panel;
        const rect = button.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();
        panel.style.left = `${Math.max(0, Math.min(rect.left, window.innerWidth - panelRect.width))}px`;
        panel.style.top = `${Math.max(0, Math.min(rect.bottom + 2, window.innerHeight - panelRect.height))}px`;
        const saveGeometry = (geometry) => {
            atcdPanelGeometrySave = atcdPanelGeometrySave
                .then(() => chrome.storage.local.set({ [ATCD_PANEL_GEOMETRY_KEY]: geometry }))
                .catch(error => console.error('[antecedentsComparePanel] Erreur de sauvegarde de la position et de la taille :', error));
        };
        const layout = attachFloatingPanel(currentPanel, {
            dragHandle: header,
            resizable: true,
            minWidth: 260,
            minHeight: 200,
            canStartDrag: event => !event.target.closest('button'),
            onChange: saveGeometry
        });
        cleanupLayout = layout.destroy;
        try {
            await atcdPanelGeometrySave;
            const stored = await chrome.storage.local.get(ATCD_PANEL_GEOMETRY_KEY);
            if (panel !== currentPanel) return;
            const geometry = stored[ATCD_PANEL_GEOMETRY_KEY];
            if (geometry && [geometry.right, geometry.bottom, geometry.width, geometry.height].every(Number.isFinite)
                && geometry.width > 0 && geometry.height > 0) {
                layout.applyGeometry(geometry);
            }
        } catch (error) {
            console.error('[antecedentsComparePanel] Erreur de chargement de la position et de la taille :', error);
            if (panel !== currentPanel) return;
        }
        currentPanel.style.visibility = '';
        try {
            const content = await buildContent(() => panel === currentPanel);
            if (panel === currentPanel && content) body.replaceChildren(content);
        } catch (error) {
            console.error('[antecedentsComparePanel] Erreur de chargement du panneau :', error);
            if (panel === currentPanel) body.textContent = 'Impossible de charger les antécédents.';
        }
    };

    button.addEventListener('click', show);

    return {
        refresh: refreshValidateButton,
        getSelectedOperations: () => operations.filter((_, index) => selected.has(index)),
        destroy: () => {
            button.removeEventListener('click', show);
            clearTimeout(hideTimer);
            cleanupLayout?.();
            cleanupLayout = null;
            panel?.remove();
            panel = null;
        }
    };
}
