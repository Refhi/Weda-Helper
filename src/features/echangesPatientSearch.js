/**
 * Recherche patient dans les échanges sécurisés, sans changer le parcours de l’onglet Import.
 * Les champs et le tableau Weda peuvent être remplacés séparément pendant un postback.
 */
const ECHANGES_PATIENT_PANEL = '[id$="_PanelFindPatient"]';
const ECHANGES_PATIENT_LINK = 'a[id*="_LinkButtonPatientGetNomPrenom_"], a[id*="_LinkButtonOldPatientGetNomPrenom_"]';
const ECHANGES_PATIENT_BIRTH = '[id*="PatienDateNaissance"], [id*="PatientDateNaissance"]';
const ECHANGES_PATIENT_BIRTH_NAME = '[id*="PatientNomJeuneFille"], [id*="PatientNomNaissance"]';

function echangesNameKey(value) {
    return String(value || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
        .replace(/œ/g, "oe").replace(/æ/g, "ae").replace(/[^\p{L}]+/gu, " ").trim();
}

function echangesBirthDate(value) {
    const text = String(value || "").trim();
    const fr = text.match(/^(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{4})$/);
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const monthNames = "janvier fevrier mars avril mai juin juillet aout septembre octobre novembre decembre".split(" ");
    const words = text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
    const [day, month, year] = (fr?.slice(1) || (iso && [iso[3], iso[2], iso[1]])
        || (words && [words[1], monthNames.indexOf(words[2]) + 1, words[3]]) || []).map(Number);
    const date = new Date(year, month - 1, day);
    if (!(year >= 1900) || date > new Date() || date.getDate() !== day
        || date.getMonth() !== month - 1 || date.getFullYear() !== year) return "";
    return [day, month].map(n => String(n).padStart(2, "0")).join("/") + "/" + year;
}

function cleanEchangesPatientName(value) {
    const name = String(value || "").trim()
        .replace(/^(?:mme|madame|monsieur|m\.|mr\.?|mlle)\s+/i, "")
        .replace(/\s*(?:\(|\bn[ée](?:e|\(e\))?\s+(?:le\s+)?|\bdate\s+de\s+naissance\b).*$/iu, "")
        .replace(/[.,;:\s]+$/g, "").replace(/\s+/g, " ");
    return /^[\p{L}\p{M}][\p{L}\p{M} '’‐‑-]{1,89}$/u.test(name) && name.split(" ").length <= 7 ? name : "";
}

function splitEchangesPatientName(value) {
    const label = cleanEchangesPatientName(value);
    const words = label.split(" ");
    if (words.length < 2) return { family: label, given: "", alternativeQuery: "" };
    const isUpper = word => word !== word.toLowerCase() && word === word.toUpperCase();
    const firstMixed = words.findIndex(word => !isUpper(word));
    if (firstMixed > 0) {
        return { family: words.slice(0, firstMixed).join(" "), given: words.slice(firstMixed).join(" ") };
    }
    let end = words.length;
    while (end > 0 && isUpper(words[end - 1])) end--;
    if (end > 0 && end < words.length) {
        return { family: words.slice(end).join(" "), given: words.slice(0, end).join(" ") };
    }
    // L’ordre de deux mots de même casse n’est pas certain. Interroger les deux,
    // puis comparer le nom complet à celui du tableau.
    return {
        family: words.length === 2 || firstMixed === 0 ? words[0] : words.slice(0, -1).join(" "),
        given: words.length === 2 || firstMixed === 0 ? words.slice(1).join(" ") : words.at(-1),
        alternativeQuery: words.length === 2 ? words[1] : firstMixed === -1 ? words[0] : ""
    };
}

function readEchangesIdentity(text) {
    const source = String(text || "").replace(/\r\n?/g, "\n");
    const datePattern = /(?:\bdate\s+de\s+naissance\b|\bddn\b|\bnaissance\s*[:=-]|\bn[ée](?:e|\(e\))?(?:\s+[\p{L}'’ -]{1,45})?\s+le)\s*[:=( -]*\s*(\d{4}-\d{2}-\d{2}|\d{1,2}\s*[/.-]\s*\d{1,2}\s*[/.-]\s*\d{4}|\d{1,2}\s+[\p{L}]+\s+\d{4})(?!\d)/giu;
    const dates = [...new Set([...source.matchAll(datePattern)].map(match => echangesBirthDate(match[1])).filter(Boolean))];
    const fields = /(?:^|[\s;,])(?<label>nom(?:\s+et\s+pr[ée]noms?(?:\s+de\s+naissance)?|\s+d['’ ]usage|\s+de\s+naissance)?|pr[ée]noms?(?:\s+de\s+naissance)?|patiente?|b[ée]n[ée]ficiaire|identit[ée]|concerne)\s*[:=-]\s*(?<value>[^\n;]+?)(?=$|[\n;]|\s+(?:nom\b|pr[ée]nom|date\s+de\s+naissance|naissance\s*:|[âa]ge\s*:|sexe\s*:|dossier\s*:))/gimu;
    const values = new Map();
    let conflict = dates.length > 1;
    for (const { groups: { label, value } } of source.matchAll(fields)) {
        const key = echangesNameKey(label);
        const name = cleanEchangesPatientName(value);
        if (!name) continue;
        if (values.has(key) && echangesNameKey(values.get(key)) !== echangesNameKey(name)) conflict = true;
        else values.set(key, name);
    }
    const direct = [...values].find(([key]) => /^(?:patient|patiente|beneficiaire|identite|concerne|nom et prenoms?\b)/.test(key))?.[1];
    const civil = source.match(/(?:^|\n|\b(?:concerne|pour)\s+)\s*(?:mme|madame|monsieur|m\.|mr\.?)\s+([^\n;]{3,90}?)\s*(?:\(\s*)?n[ée](?:e|\(e\))?\s+le\b/imu)?.[1];
    const parsed = splitEchangesPatientName(direct || civil);
    const usage = values.get("nom d usage") || values.get("nom");
    const birthName = values.get("nom de naissance");
    const given = values.get("prenom") || values.get("prenoms") || values.get("prenoms de naissance")
        || values.get("prenom de naissance") || parsed.given;
    return {
        families: [usage, birthName, parsed.family].filter(Boolean), given,
        alternativeQuery: usage || birthName ? "" : parsed.alternativeQuery,
        birthDate: dates[0] || "", conflict
    };
}

function getEchangesPatientIdentity({ pdfText, messageBody }, extractedData = {}) {
    const pdf = readEchangesIdentity(pdfText);
    const message = readEchangesIdentity(messageBody);
    const matrix = extractedData.dataMatrix || {};
    const barcode = {
        families: [cleanEchangesPatientName(matrix.Nom)].filter(Boolean),
        given: cleanEchangesPatientName(matrix.Prenoms),
        birthDate: echangesBirthDate(matrix.DateNaissance)
    };
    const sources = [barcode, pdf, message];
    const full = source => source.given && source.families.length;
    const primary = sources.find(full) || sources.find(s => s.families.length) || pdf;
    const sameName = (a, b) => a.families.some(familyA => b.families.some(familyB => {
        const left = echangesNameKey(familyA);
        const right = echangesNameKey(familyB);
        const givenA = echangesNameKey(a.given);
        const givenB = echangesNameKey(b.given);
        return (left + " " + givenA === right + " " + givenB)
            || (left === right && (givenA === givenB || (a.birthDate && a.birthDate === b.birthDate
            && givenA.split(" ")[0] === givenB.split(" ")[0])))
            || (a.alternativeQuery && left === givenB && right === givenA)
            || (b.alternativeQuery && right === givenA && left === givenB);
    }));
    const dates = [...new Set(sources.map(source => source.birthDate).filter(Boolean))];
    const conflict = pdf.conflict || message.conflict || dates.length > 1
        || (full(primary) && sources.some(source => full(source) && !sameName(primary, source)));
    const ai = extractedData.echangesAIIdentity || {};
    const aiName = splitEchangesPatientName(ai.name);
    const aiBirthDate = echangesBirthDate(ai.birthDate);
    // Un texte scanné peut être complété par l’IA déjà configurée, mais
    // un nom déduit par l’IA seul ne suffit jamais à choisir une fiche.
    const fallbackAI = !full(primary) && aiName.given && (dates[0] || aiBirthDate)
        && (!primary.families.length || primary.families.some(f => echangesNameKey(f) === echangesNameKey(aiName.family)))
        && (!primary.given || echangesNameKey(primary.given) === echangesNameKey(aiName.given));
    const names = [...primary.families, ...sources.filter(s => s !== primary && full(s) && sameName(primary, s))
        .flatMap(s => s.families), ...(fallbackAI ? [aiName.family] : [])];
    const families = [...new Map(names.map(name => [echangesNameKey(name), name])).values()];
    const list = [matrix.INS, ...[extractedData.nirMatches || []].flat()];
    const ins = [...new Set(list.map(value => String(value || "").replace(/\s+/g, "")).filter(value => /^[12]\d{14}$/.test(value)))];
    return {
        families, given: primary.given || (fallbackAI ? aiName.given : ""),
        birthDate: dates[0] || (fallbackAI || full(primary) ? aiBirthDate : ""),
        alternativeQuery: primary.alternativeQuery || (fallbackAI ? aiName.alternativeQuery : ""),
        ins: ins.length === 1 ? ins[0] : "", conflict: Boolean(conflict)
    };
}

function echangesPatientMatches(identity, candidate) {
    const { family, given, alternativeQuery } = splitEchangesPatientName(candidate.name);
    const candidateNames = [family, candidate.birthName].map(echangesNameKey).filter(Boolean);
    const expectedNames = identity.families.map(echangesNameKey).filter(Boolean);
    const first = echangesNameKey(given);
    const expected = echangesNameKey(identity.given);
    if (!first || !expected || !expectedNames.length) return false;
    if (identity.birthDate && identity.birthDate !== candidate.birthDate) return false;
    if (expectedNames.some(name => name + " " + expected === echangesNameKey(candidate.name))) return true;
    const compatibleGiven = first === expected || (identity.birthDate
        && (first.startsWith(expected + " ") || expected.startsWith(first + " ")));
    return (compatibleGiven && candidateNames.some(name => expectedNames.includes(name)))
        || ((identity.alternativeQuery || alternativeQuery) && expectedNames.includes(first) && candidateNames.includes(expected));
}

function getEchangesPatientCandidates(panel) {
    return [...panel.querySelectorAll(ECHANGES_PATIENT_LINK)].filter(echangesPatientVisible).map(link => {
        const row = link.closest("tr");
        return {
            link, name: link.textContent.trim(),
            birthDate: echangesBirthDate(row?.querySelector(ECHANGES_PATIENT_BIRTH)?.textContent),
            birthName: row?.querySelector(ECHANGES_PATIENT_BIRTH_NAME)?.textContent?.trim() || ""
        };
    });
}

function echangesPatientVisible(element) {
    return !!element?.getClientRects().length && getComputedStyle(element).visibility !== "hidden";
}

function getEchangesPatientPanel() {
    return [...document.querySelectorAll(ECHANGES_PATIENT_PANEL)].find(echangesPatientVisible);
}

function getEchangesValidationButton() {
    const button = document.querySelector("#messageContainer .button.valid");
    return echangesPatientVisible(button) && !button.disabled && button.getAttribute("aria-disabled") !== "true"
        && !button.classList.contains("disabled") ? button : null;
}

async function waitEchangesPatient(condition, isCurrent, timeout = 9000) {
    const deadline = Date.now() + timeout;
    while (isCurrent() && Date.now() < deadline) {
        const value = condition();
        if (value) return value;
        await new Promise(resolve => setTimeout(resolve, 120));
    }
    return null;
}

function echangesPatientRequestPending(panel) {
    return [...panel.querySelectorAll('[id*="_UpdateProgress"]')].some(echangesPatientVisible);
}

async function prepareEchangesPatientMode(type, isCurrent) {
    const readMode = () => getEchangesPatientPanel()?.querySelector('[id$="_DropDownListRechechePatient"]');
    const previousMode = await waitEchangesPatient(readMode, isCurrent);
    if (!previousMode || ![...previousMode.options].some(option => option.value === type) || !isCurrent()) return null;
    const initialButton = getEchangesPatientPanel()?.querySelector('[id$="_ButtonRecherchePatient"]');
    const initialTitle = initialButton?.title;
    const changed = previousMode.value !== type;
    if (changed) {
        previousMode.value = type;
        previousMode.dispatchEvent(new Event("change", { bubbles: true }));
    }
    return waitEchangesPatient(() => {
        const panel = getEchangesPatientPanel();
        if (!panel || readMode()?.value !== type || echangesPatientRequestPending(panel)) return null;
        const button = panel.querySelector('[id$="_ButtonRecherchePatient"]');
        const input = panel.querySelector(type === "Naissance"
            ? '[id$="_TextBoxRecherchePatientByDate"]' : '[id$="_TextBoxRecherche"]');
        const title = echangesNameKey(button?.title);
        if (!echangesPatientVisible(button) || button.disabled || !echangesPatientVisible(input)) return null;
        if (type === "Nom" && title && !/\bnoms?\b/.test(title)) return null;
        if (type === "Naissance" && title && !/\bdate de naissance\b/.test(title)) return null;
        if (changed && button === initialButton && button.title === initialTitle) return null;
        return { panel, button, input };
    }, isCurrent);
}

function echangesPatientResultState(panel) {
    const grid = panel?.querySelector('[id$="_PatientsGridOld"], [id$="_PatientsGrid"]');
    const count = panel?.querySelector('[id$="_LabelPatientCount"]');
    return { grid, count, text: count?.textContent.trim() || "", rows: grid?.textContent || "" };
}

async function searchEchangesPatient(identity, isCurrent) {
    if (identity.conflict) return { reason: "conflicting-identity" };
    const searches = [
        ["InsSearch", identity.ins],
        ...[...identity.families, identity.alternativeQuery].filter(Boolean).slice(0, 3).map(name => ["Nom", name]),
        ["Naissance", identity.birthDate]
    ].filter(([, value]) => value);
    if (!searches.length) return { reason: "missing-identity" };

    let reason = "search-unavailable";
    for (const [type, value] of searches) {
        const controls = await prepareEchangesPatientMode(type, isCurrent);
        if (!isCurrent()) return { reason: "cancelled" };
        if (!controls) continue;
        const { panel, button, input } = controls;
        // Les filtres facultatifs du mode naissance peuvent contenir le nom du courrier précédent.
        const extraFields = type === "Naissance"
            ? panel.querySelectorAll('[id$="_TextBoxNomForDN"], [id$="_TextBoxPrenomForDN"]') : [];
        for (const field of [...extraFields, input]) {
            field.value = field === input ? value : "";
            field.dispatchEvent(new Event("input", { bubbles: true }));
        }
        const before = echangesPatientResultState(panel);
        button.click();
        const result = await waitEchangesPatient(() => {
            const current = getEchangesPatientPanel();
            if (!current || echangesPatientRequestPending(current)) return null;
            const after = echangesPatientResultState(current);
            const refreshed = after.grid !== before.grid || after.count !== before.count
                || after.text !== before.text || after.rows !== before.rows;
            if (!refreshed) return null;
            if (after.text === "0") return { reason: "not-found" };
            const candidates = getEchangesPatientCandidates(current);
            if (!candidates.length) return null;
            if (!identity.given || !identity.families.length) return { reason: "incomplete-identity" };
            const matches = candidates.filter(candidate => echangesPatientMatches(identity, candidate));
            if (matches.length > 1) return { reason: "ambiguous" };
            if (/^\d+$/.test(after.text) && Number(after.text) > candidates.length) return { reason: "partial-results" };
            return matches.length ? { candidate: matches[0] } : { reason: "not-found" };
        }, isCurrent);
        if (!isCurrent()) return { reason: "cancelled" };
        if (result?.reason === "ambiguous") return result;
        if (!result?.candidate) {
            reason = result?.reason || "stale-results";
            continue;
        }
        const { candidate } = result;
        if (!candidate.link.isConnected || !candidate.link.id) return { reason: "selection-unconfirmed" };
        clicCSPLockedElement("#" + CSS.escape(candidate.link.id));
        const applied = await waitEchangesPatient(() => !getEchangesPatientPanel()
            && getEchangesValidationButton(), isCurrent);
        return applied ? { candidate } : { reason: isCurrent() ? "selection-unconfirmed" : "cancelled" };
    }
    return { reason };
}
