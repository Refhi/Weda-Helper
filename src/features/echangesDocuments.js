/**
 * Pièces jointes et suivi des analyses dans Échanges.
 * Les corrections sont liées au courrier et à l'empreinte du fichier.
 */
const ECHANGES_TITLE_INPUT = "input[title=\"C'est le titre qu'aura le document dans le dossier patient\"], input.docTitle";
const ECHANGES_TYPE_INPUT = "select[title='Attribuer une classification au document']";
const ECHANGES_PDF_TARGETS = "#PanelViewDocument iframe, iframe#iFrameViewFile, iframe[type='application/pdf'], .mssAttachment embed, "
    + ".attachmentContainer object[type='application/pdf'], .view-pdf-document-uc-form iframe[src*='BinaryData'], "
    + ".view-pdf-document-uc-form iframe[src*='downloadAttachment'], .messageAttachment a[href]";
const echangesFieldKeys = new WeakMap();
const echangesManualFields = new WeakMap();
const echangesPendingCorrections = new Map();
const echangesRowAnalyses = new WeakMap();
const echangesAnalysesByKey = new Map();
const echangesRowIds = new WeakMap();
let echangesNextRowId = 0;
let echangesAnalysisTail = Promise.resolve();

function getSelectedEchangesRow() {
    return document.querySelector("#messageList .messageListItem.selected");
}

function getEchangesRows() {
    return [...document.querySelectorAll("#messageList .messageListItem")];
}

function getEchangesRowId(row) {
    if (!row) return null;
    if (!echangesRowIds.has(row)) echangesRowIds.set(row, ++echangesNextRowId);
    return echangesRowIds.get(row);
}

function getEchangesMessageKey(row) {
    const line = row?.querySelector(".messageLineItem");
    if (!line) return "";
    const copy = line.cloneNode(true);
    copy.querySelectorAll(".patientLine").forEach(node => node.remove());
    return copy.textContent.replace(/\s+/g, " ").trim();
}

function getEchangesRowAnalysis(row) {
    const key = getEchangesMessageKey(row);
    if (!key) return null;
    const current = echangesRowAnalyses.get(row);
    if (current?.key === key) return current;
    const previous = echangesAnalysesByKey.get(key);
    if (previous && !previous.row.isConnected && getEchangesRows().filter(item => getEchangesMessageKey(item) === key).length === 1) {
        return previous;
    }
    return null;
}

function beginEchangesAnalysis(row) {
    const record = { row, key: getEchangesMessageKey(row), running: true, reason: "", fingerprints: [], updatedAt: Date.now() };
    if (row) echangesRowAnalyses.set(row, record);
    return record;
}

function finishEchangesAnalysis(record, reason, fingerprints = []) {
    const { row, key } = record;
    if (!row || !key || echangesRowAnalyses.get(row) !== record) return;
    Object.assign(record, { running: false, reason, fingerprints });
    const matches = getEchangesRows().filter(item => getEchangesMessageKey(item) === key);
    if (matches.length <= 1 && (!row.isConnected || matches[0] === row)) {
        echangesAnalysesByKey.delete(key);
        echangesAnalysesByKey.set(key, record);
        if (echangesAnalysesByKey.size > 200) echangesAnalysesByKey.delete(echangesAnalysesByKey.keys().next().value);
    }
    renderEchangesAnalysisBadges();
    document.dispatchEvent(new Event("wedaEchangesAnalysisChanged"));
}

function queueEchangesAnalysis(callback) {
    // L'assistant IA ne dispose que d'un résolveur par type de demande dans cet onglet.
    const task = echangesAnalysisTail.then(callback);
    echangesAnalysisTail = task.catch(() => {});
    return task;
}

function echangesFailureLabel(reason) {
    if (reason === "ai-unavailable") return "IA indisponible";
    if (reason === "not-found" || reason === "missing-identity") return "Patient introuvable";
    if (reason === "missing-document" || reason === "read-error") return "PDF à vérifier";
    if (reason === "form-unavailable") return "Champs d’import indisponibles";
    if (reason === "timeout" || reason === "cancelled") return "Analyse interrompue";
    if (reason === "search-unavailable") return "Recherche patient indisponible";
    return "Patient à vérifier";
}

function renderEchangesAnalysisBadges() {
    const entries = getEchangesRows().map(row => ({ row, analysis: getEchangesRowAnalysis(row) }));
    for (const { row, analysis } of entries) {
        const matches = entries.filter(other => other.row !== row
            && other.analysis?.fingerprints.some(hash => analysis?.fingerprints.includes(hash)));
        const reason = analysis?.reason || "";
        const state = reason + ":" + matches.length;
        const previous = row.querySelector(":scope > .whEchangesAnalysisBadges");
        if (previous?.dataset.state === state) continue;
        previous?.remove();
        if (!reason && !matches.length) continue;

        const badges = document.createElement("span");
        badges.className = "whEchangesAnalysisBadges";
        badges.dataset.state = state;
        badges.style.cssText = "display:inline-flex;gap:4px;align-items:center;flex-wrap:wrap;font-size:0.8em";
        if (reason) {
            const failure = document.createElement("span");
            failure.className = "whEchangesAnalysisFailure";
            failure.textContent = echangesFailureLabel(reason);
            failure.style.cssText = "background:#fff2d6;color:#694500;padding:2px 4px;border-radius:4px";
            badges.append(failure);
        }
        if (matches.length) {
            const duplicate = document.createElement("button");
            duplicate.type = "button";
            duplicate.className = "whEchangesIdenticalPdf";
            duplicate.textContent = "PDF identique";
            duplicate.title = "Ouvrir un autre courrier contenant le même PDF";
            duplicate.onclick = event => {
                event.stopPropagation();
                const hashes = getEchangesRowAnalysis(row)?.fingerprints || [];
                const other = getEchangesRows().find(item => item !== row
                    && getEchangesRowAnalysis(item)?.fingerprints.some(hash => hashes.includes(hash)));
                other?.querySelector(".messageLineItem")?.click();
            };
            badges.append(duplicate);
        }
        row.append(badges);
    }
}

function getEchangesPdfSource(element) {
    const raw = element.getAttribute("original-url") || element.getAttribute("data-original-url")
        || element.data || element.src || element.href;
    if (!raw || raw === "about:blank") return "";
    let url;
    try {
        url = new URL(raw, location.href);
    } catch {
        return "";
    }
    if (url.origin === location.origin || url.origin === "https://message.weda.fr"
        || url.protocol === "data:" && /^data:application\/pdf[;,]/i.test(url.href)) return url.href;
    return "";
}

function getEchangesPdfSourceKey(source) {
    if (!source) return "";
    const url = new URL(source);
    if (/\/BinaryData\.aspx$/i.test(url.pathname)) url.searchParams.delete("crypt");
    url.hash = "";
    return url.href;
}

function getEchangesDocumentTargets() {
    const targets = [];
    const zones = new Set();
    const occurrences = new Map();
    const message = document.querySelector("#messageContainer");
    if (!message) return targets;
    // Un visualiseur est prioritaire sur le lien de téléchargement du même document.
    const elements = [...message.querySelectorAll(ECHANGES_PDF_TARGETS)];
    for (const element of elements.filter(element => element.tagName !== "A").concat(elements.filter(element => element.tagName === "A"))) {
        const zone = element.closest(".messageAttachment");
        if (zone && zones.has(zone)) continue;
        const source = getEchangesPdfSource(element);
        if (element.tagName === "A" && !/\.pdf(?:$|[?#\s])/i.test([source, element.download, element.textContent.trim()].join(" "))) continue;
        if (/\.(?:zip|7z|rar)(?:$|[?#])/i.test(source)) continue;
        if (/^(?:image\/|application\/(?:zip|x-zip|x-rar))/i.test(element.getAttribute("type") || "")) continue;

        const sourceKey = getEchangesPdfSourceKey(source);
        const occurrence = occurrences.get(sourceKey) || 0;
        occurrences.set(sourceKey, occurrence + 1);
        targets.push({ element, zone, sourceKey, occurrence });
        if (zone) zones.add(zone);
    }
    return targets.filter((target, index) => target.zone || !target.sourceKey
        || !targets.some((other, position) => other.sourceKey === target.sourceKey && (other.zone || position < index)));
}

function getEchangesDocumentZone(target) {
    if (!target?.zone) return null;
    const matches = getEchangesDocumentTargets().filter(candidate => candidate.sourceKey === target.sourceKey);
    return matches.find(candidate => candidate.zone === target.zone)?.zone
        || (matches.length === 1 ? matches[0].zone : null);
}

async function echangesFingerprint(bytes) {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function echangesCorrectionKey(doc, field) {
    return doc.correctionKey ? "echangesCorrection:" + doc.correctionKey + ":" + field : "";
}

async function readEchangesCorrections(doc) {
    if (!doc.correctionKey) return {};
    const fields = ["documentTitle", "documentType"];
    const keys = fields.map(field => echangesCorrectionKey(doc, field));
    let stored = {};
    try {
        stored = await chrome.storage.local.get(keys);
    } catch (error) {
        console.warn("[Échanges] Lecture des corrections indisponible.", error.name);
    }
    const corrections = {};
    fields.forEach((field, index) => {
        const value = echangesPendingCorrections.get(keys[index]) ?? stored[keys[index]];
        if (typeof value === "string") corrections[field] = value;
    });
    return corrections;
}

function rememberEchangesCorrection(key, value) {
    if (!key) return;
    echangesPendingCorrections.set(key, value);
    chrome.storage.local.set({ [key]: value }).then(() => {
        if (echangesPendingCorrections.get(key) === value) echangesPendingCorrections.delete(key);
    }).catch(error => {
        console.warn("[Échanges] Enregistrement de la correction indisponible.", error.name);
    });
}

function bindEchangesCorrectionFields(doc, zone) {
    for (const [selector, field] of [[ECHANGES_TITLE_INPUT, "documentTitle"], [ECHANGES_TYPE_INPUT, "documentType"]]) {
        const element = zone?.querySelector(selector);
        if (!element) continue;
        const key = echangesCorrectionKey(doc, field);
        const row = getSelectedEchangesRow();
        const target = { row, messageKey: getEchangesMessageKey(row), sourceKey: doc.target.sourceKey };
        echangesFieldKeys.set(element, { ...target, key });
        const edit = echangesManualFields.get(element);
        if (sameEchangesCorrectionTarget(edit, target)) rememberEchangesCorrection(key, edit.value);
    }
}

function sameEchangesCorrectionTarget(left, right) {
    return left && left.row === right.row && left.messageKey === right.messageKey && left.sourceKey === right.sourceKey;
}

async function readEchangesDocuments(record, isCurrent) {
    const messageBody = returnMessageBodyES() || "";
    const targets = getEchangesDocumentTargets();
    const documents = [];
    let readError = false;
    let aiUnavailable = false;
    for (const target of targets.length ? targets : [null]) {
        if (!isCurrent()) break;
        record.updatedAt = Date.now();
        let urlPDF = null;
        let pdfText = "";
        let fingerprint = "";
        if (target) {
            try {
                urlPDF = getEchangesPdfSource(target.element);
                const deadline = Date.now() + 2500;
                while (!urlPDF && isCurrent() && target.element.isConnected && Date.now() < deadline) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    urlPDF = getEchangesPdfSource(target.element);
                }
                if (!isCurrent()) break;
                if (!urlPDF) throw new Error("PDF indisponible");
                target.sourceKey = getEchangesPdfSourceKey(urlPDF);
                const pdf = await loadPdfDocument(urlPDF);
                try {
                    fingerprint = await echangesFingerprint(await pdf.getData());
                    pdfText = (await extractPageTextsFromPdfDocument(pdf)).join("\n");
                } finally {
                    await pdf.destroy();
                }
            } catch (error) {
                console.warn("[Échanges] Lecture du PDF interrompue.", error.name);
                readError = true;
                continue;
            }
        }
        if (!isCurrent() || !target && !messageBody.trim()) break;
        const fullText = messageBody && pdfText.length < 100 ? [pdfText, messageBody].filter(Boolean).join("\n\n") : pdfText;
        const context = JSON.stringify([record.key, messageBody, target?.sourceKey, target?.occurrence]);
        const contextHash = await echangesFingerprint(new TextEncoder().encode(context));
        const hashId = "echanges-v2:" + (fingerprint ? "pdf-" + fingerprint + ":" : "text-") + contextHash;
        const doc = { target, fingerprint, urlPDF, pdfText, messageBody, fullText, hashId,
            correctionKey: target && record.key ? hashId : "" };
        if (!isCurrent()) break;
        bindEchangesCorrectionFields(doc, getEchangesDocumentZone(target));
        const corrections = await readEchangesCorrections(doc);
        if (!isCurrent()) break;
        try {
            doc.extractedData = await handleDataExtraction(fullText, urlPDF, hashId, {
                pdfText, messageBody, echanges: true, isCurrent, target, corrections,
                onAIUnavailable: () => { aiUnavailable = true; }
            });
            documents.push(doc);
        } catch (error) {
            console.warn("[Échanges] Extraction des champs interrompue.", error.name);
            readError = true;
        }
    }
    return { documents, readError, aiUnavailable };
}

async function applyEchangesDocumentFields(doc, isCurrent, { titleOnly = false } = {}) {
    const [autoTitle, autoClassification] = await getOptionPromise(["PdfParserAutoTitle", "PdfParserAutoClassification"]);
    let zone = getEchangesDocumentZone(doc.target);
    if (!zone || !isCurrent()) return;
    bindEchangesCorrectionFields(doc, zone);
    const corrections = await readEchangesCorrections(doc);
    if (!isCurrent()) return;
    zone = getEchangesDocumentZone(doc.target);
    if (!zone) return;
    const { documentTitle, documentType, destinationClass, documentCommentaire } = doc.extractedData;
    if (!titleOnly && autoClassification) {
        const destination = { 1: "Ranger dans les consultations", 2: "Ranger dans les résultats d'examens", 3: "Ranger dans les courriers" }[destinationClass];
        if (destination) zone.querySelector('.weImportDocTargets[title="' + destination + '"]')?.click();
        zone = getEchangesDocumentZone(doc.target);
        if (!zone || !isCurrent()) return;
    }
    bindEchangesCorrectionFields(doc, zone);
    const updateField = (field, value) => {
        if (!field || value === null || value === undefined || field.value === value) return;
        field.value = value;
        field.dispatchEvent(new Event("input", { bubbles: true }));
        field.dispatchEvent(new Event("change", { bubbles: true }));
    };
    if (autoTitle || Object.hasOwn(corrections, "documentTitle")) {
        const title = corrections.documentTitle ?? (doc.title || documentTitle || null);
        updateField(zone.querySelector(ECHANGES_TITLE_INPUT), title);
    }
    if (titleOnly) return true;
    zone = getEchangesDocumentZone(doc.target);
    if (!zone || !isCurrent()) return;
    bindEchangesCorrectionFields(doc, zone);
    const select = zone.querySelector(ECHANGES_TYPE_INPUT);
    const type = corrections.documentType ?? documentType;
    const option = type && select && [...select.options].find(item => item.text.trim().toLowerCase() === type.toLowerCase());
    if (option) updateField(select, option.value);
    if (documentCommentaire && isCurrent()) {
        updateField(getEchangesDocumentZone(doc.target)?.querySelector("input[placeholder='Commentaire']"), documentCommentaire);
    }
    return true;
}

async function checkEchangesDocumentAntecedents(documents, isCurrent, record) {
    const result = { operations: null, keys: [], aiUnavailable: false, isCurrent };
    if (!await getOptionPromise("verifierEtMettreAJourAntecedents") || !isCurrent()) return result;
    const patientId = await resolveCurrentPatientIdWithWait();
    if (!patientId || !isCurrent()) return result;
    result.isCurrent = () => isCurrent() && String(resolveCurrentPatientId()) === String(patientId);
    const proposals = new Map();
    for (const doc of documents) {
        if (!result.isCurrent()) break;
        record.updatedAt = Date.now();
        const key = doc.hashId + ":atcd:" + patientId;
        let operations = getPdfData(key).antecedentsDiscordances;
        if (!Array.isArray(operations)) {
            operations = await checkAntecedentsAgainstDocument(doc.fullText, doc.urlPDF, {
                messageBody: doc.messageBody, isCurrent: result.isCurrent,
                onAIUnavailable: () => { result.aiUnavailable = true; }
            });
            if (!result.isCurrent()) break;
            if (Array.isArray(operations)) setPdfData(key, { antecedentsDiscordances: operations });
        }
        if (operations === "erreur") result.aiUnavailable = true;
        if (!Array.isArray(operations)) continue;
        result.keys.push(key);
        for (const operation of operations) proposals.set(JSON.stringify(operation), operation);
    }
    if (result.keys.length) result.operations = [...proposals.values()];
    else if (result.aiUnavailable) result.operations = "erreur";
    return result;
}

async function processEchangesDocuments(record, isCurrent, selectPatient, reportIssue = reason => {
    sendWedaNotif({ message: echangesFailureLabel(reason), type: "info", icon: "search_off" });
}) {
    let documents = [];
    let reason = "";
    try {
        if (!isCurrent()) return;
        const batch = await readEchangesDocuments(record, isCurrent);
        documents = batch.documents;
        if (!isCurrent()) return;
        reason = batch.aiUnavailable ? "ai-unavailable" : batch.readError ? "read-error" : "";
        if (!documents.length) {
            reason ||= "missing-document";
            reportIssue(reason);
            return;
        }

        const selection = await selectPatient(documents);
        if (!isCurrent()) return;
        if (selection.reason) {
            const noIdentity = ["not-found", "missing-identity", "incomplete-identity"].includes(selection.reason);
            reason = batch.aiUnavailable && noIdentity ? "ai-unavailable" : selection.reason;
            for (const doc of documents) await applyEchangesDocumentFields(doc, isCurrent, { titleOnly: true });
            if (isCurrent()) reportIssue(reason, selection.suggestion);
            return documents;
        }

        const review = await checkEchangesDocumentAntecedents(documents, isCurrent, record);
        if (!isCurrent()) return;
        if (review.aiUnavailable) reason = "ai-unavailable";
        for (const doc of documents) {
            const applied = await applyEchangesDocumentFields(doc, isCurrent);
            if (doc.target && !applied) reason ||= "form-unavailable";
        }
        if (!isCurrent()) return;
        const validationButton = document.querySelector("#messageContainer .button.valid");
        if (validationButton && !validationButton.disabled && validationButton.getAttribute("aria-disabled") !== "true") {
            if (!document.activeElement?.matches(ECHANGES_TITLE_INPUT + ", " + ECHANGES_TYPE_INPUT)) {
                validationButton.focus();
                validationButton.style.outline = "2px solid rgba(255, 255, 255, 0.5)";
                validationButton.style.outlineOffset = "2px";
                const removeOutline = () => {
                    validationButton.style.outline = "";
                    validationButton.style.outlineOffset = "";
                };
                for (const event of ["click", "keydown", "blur"]) {
                    validationButton.addEventListener(event, removeOutline, { once: true });
                }
            }
            if (!reason) {
                sendWedaNotifAllTabs({
                    message: "Sélection terminée. Appuyez sur Espace pour valider, Maj+Tab pour corriger.",
                    type: "success", icon: "success"
                });
            }
            document.querySelectorAll("#messageContainer iframe#iFrameViewFile").forEach(frame => frame.tabIndex = -1);
        }
        addAntecedentsButton(review.operations, validationButton, review.keys, review.isCurrent);
        if (reason) reportIssue(reason);
    } catch (error) {
        if (isCurrent()) {
            reason = "read-error";
            console.warn("[Échanges] Analyse interrompue.", error.name);
            reportIssue(reason);
        }
    } finally {
        if (!isCurrent()) reason = "cancelled";
        try {
            finishEchangesAnalysis(record, reason, documents.map(doc => doc.fingerprint).filter(Boolean));
        } finally {
            notifyEchangesProcessingDone(documents[0]?.hashId ?? null, record.row, reason);
        }
    }
}

addTweak("/FolderMedical/WedaEchanges", "autoPdfParser", function () {
    function trackCorrection(event) {
        if (!event.isTrusted || !event.target.closest?.("#messageContainer .messageAttachment")) return;
        const title = event.type === "input" && event.target.matches(ECHANGES_TITLE_INPUT);
        const classification = event.type === "change" && event.target.matches(ECHANGES_TYPE_INPUT);
        if (!title && !classification) return;
        const value = title ? event.target.value : event.target.selectedOptions[0]?.text.trim();
        if (typeof value !== "string") return;
        const row = getSelectedEchangesRow();
        const zone = event.target.closest(".messageAttachment");
        const sourceKey = getEchangesDocumentTargets().find(doc => doc.zone === zone)?.sourceKey;
        const edit = { value, row, messageKey: getEchangesMessageKey(row), sourceKey };
        echangesManualFields.set(event.target, edit);
        const binding = echangesFieldKeys.get(event.target);
        if (sameEchangesCorrectionTarget(binding, edit)) rememberEchangesCorrection(binding.key, value);
    }
    document.addEventListener("input", trackCorrection, true);
    document.addEventListener("change", trackCorrection, true);
    waitForElement({ selector: "#messageList .messageListItem", observerId: "echangesAnalysisBadges",
        triggerOnInit: true, callback: () => {
            renderEchangesAnalysisBadges();
            document.dispatchEvent(new Event("wedaEchangesAnalysisChanged"));
        } });
});
