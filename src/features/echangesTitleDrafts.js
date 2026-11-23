// Le bouton Annuler du sélecteur patient ferme aussi le formulaire d'import Weda.
// Les titres restent dans cet onglet et reviennent dans les champs natifs à la reprise.
const echangesTitleDrafts = (() => {
    const selector = 'input.docTitle, input[title="C\'est le titre qu\'aura le document dans le dossier patient"]';
    const drafts = new Map();
    const shown = new Map();
    let observer;

    function messageKey(pane) {
        const row = document.querySelector("#messageList .messageListItem.selected");
        const key = getEchangesMessageKey(row);
        if (!key) return null;
        // Deux objets identiques reçus à la même heure ne doivent pas partager un brouillon.
        if ([...document.querySelectorAll("#messageList .messageListItem")].some(other => other !== row && getEchangesMessageKey(other) === key)) return row;
        return JSON.stringify([key, pane.querySelector(".messageHeader")?.textContent.trim()]);
    }

    function fileKey(zone) {
        const viewer = zone.querySelector(ECHANGES_PDF_VIEWER);
        const link = zone.querySelector('a[href*="BinaryData.aspx" i], a[download][href]');
        const src = viewer?.getAttribute("src") || viewer?.getAttribute("data") || link?.getAttribute("href");
        if (!src || src === "about:blank") return null;
        const url = new URL(src, document.baseURI);
        if (/\/BinaryData\.aspx$/i.test(url.pathname) && url.searchParams.has("id")) {
            return JSON.stringify([url.pathname, url.searchParams.get("id"), url.searchParams.get("i")]);
        }
        return url.href;
    }

    function slots(pane) {
        const attachments = [...pane.querySelectorAll(".messageAttachment")];
        const keys = attachments.map(fileKey);
        const body = pane.querySelector(".messageBody");
        const bodyInput = [...pane.querySelectorAll(selector)].find(input => !input.closest(".messageAttachment"));
        const result = [];
        if (body) result.push({ key: "body:" + body.textContent.trim(), host: body, input: bodyInput, body: true });
        attachments.forEach((host, index) => {
            const key = keys[index];
            if (key && keys.indexOf(key) === keys.lastIndexOf(key)) result.push({ key, host, input: host.querySelector(selector) });
        });
        return result;
    }

    function remember(draft, slot, edited) {
        const field = slot.input;
        const box = (field.closest("we-doc-import") || slot.host).querySelector('input[type="checkbox"]');
        const entry = draft.get(slot.key) || {};
        entry.value = field.value;
        if (edited) entry.edited = true;
        entry.included = !box || box.checked;
        draft.set(slot.key, entry);
    }

    function makeEditor(entry, body) {
        const label = document.createElement("label");
        label.className = "whEchangesDraftTitle";
        label.style.cssText = "display:flex;align-items:center;gap:.5em;margin:.4em 0;width:100%";
        label.textContent = body ? "Titre du courrier" : "Titre de la pièce jointe";
        label.title = "Ce titre sera repris lors de la prochaine ouverture de l’import.";
        const input = document.createElement("input");
        input.type = "text";
        input.style.cssText = "flex:1;min-width:8em;max-width:55em";
        input.value = entry.value;
        input.addEventListener("input", () => { entry.value = input.value; entry.edited = true; });
        label.append(input);
        return label;
    }

    function sync() {
        const pane = document.querySelector("#messageContainer");
        const draft = pane && drafts.get(messageKey(pane));
        const keep = new Set();
        for (const slot of draft ? slots(pane) : []) {
            const entry = draft.get(slot.key);
            if (!entry) continue;
            if (slot.input) {
                if ((entry.value || entry.edited) && slot.input.value !== entry.value) {
                    slot.input.value = entry.value;
                    slot.input.dispatchEvent(new Event("input", { bubbles: true }));
                    slot.input.dispatchEvent(new Event("change", { bubbles: true }));
                }
            }
            if (!slot.input?.getClientRects().length && entry.preview && entry.included
                && !pane.querySelector(".docImportButtons .button.valid")?.getClientRects().length) {
                const label = shown.get(entry) || makeEditor(entry, slot.body);
                if (slot.body && label.nextElementSibling !== slot.host) slot.host.before(label);
                if (!slot.body && label.parentElement !== slot.host) slot.host.prepend(label);
                shown.set(entry, label);
                keep.add(entry);
            }
        }
        for (const [entry, label] of shown) {
            if (!keep.has(entry)) { label.remove(); shown.delete(entry); }
        }
    }

    function capture(field) {
        const pane = document.querySelector("#messageContainer");
        const key = pane && messageKey(pane);
        if (!key) return;
        const draft = drafts.get(key) || new Map();
        for (const slot of slots(pane)) {
            if (!slot.input || (field && field !== slot.input)) continue;
            remember(draft, slot, !!field);
            if (!field) draft.get(slot.key).preview = true;
        }
        if (!draft.size) return;
        drafts.set(key, draft);
        if (!observer) {
            observer = new MutationObserver(records => {
                const pane = document.querySelector("#messageContainer");
                if (records.some(({ target }) => pane?.contains(target) || target.contains(pane) || target.closest?.("#messageList"))) sync();
            });
            observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "class", "style"] });
        }
    }

    function valueFor(field) {
        if (!drafts.size) return;
        const pane = field.closest("#messageContainer");
        const draft = pane && drafts.get(messageKey(pane));
        const entry = draft?.get(slots(pane).find(slot => slot.input === field)?.key);
        if (entry && (entry.value || entry.edited)) return entry.value;
    }

    function install() {
        document.addEventListener("input", event => {
            if (event.isTrusted && event.target.matches?.(selector) && event.target.closest("#messageContainer")) capture(event.target);
        }, true);
        document.addEventListener("click", event => {
            const pane = document.querySelector("#messageContainer");
            if (pane && event.isTrusted && event.target.closest?.("#messageContainer .docImportButtons .button.cancel")) drafts.delete(messageKey(pane));
        }, true);
    }
    return { selector, capture, valueFor, install };
})();
