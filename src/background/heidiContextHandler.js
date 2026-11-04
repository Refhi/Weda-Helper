// Lecture ponctuelle du DOM Heidi : aucune API privée, aucun stockage du contenu médical.
const HEIDI_CONTEXT_ORIGIN = "https://scribe.heidihealth.com/*";
const heidiContextReads = new Set();

/** Fonction autonome, sérialisée par executeScript dans le monde isolé de l'onglet Heidi. */
async function extractHeidiPageContext() {
    if (location.origin !== "https://scribe.heidihealth.com") {
        return { error: "L'onglet sélectionné n'affiche plus Heidi." };
    }
    const visible = element => element && element.getClientRects().length > 0
        && getComputedStyle(element).visibility !== "hidden";
    const findVisible = selector => [...document.querySelectorAll(selector)].find(visible);
    const text = element => (element?.innerText || "").replace(/\u00a0/g, " ")
        .replace(/\r\n?/g, "\n").trim();
    const transcriptSelector = '[data-testid="transcript-content"]';
    const tabSelector = '[role="tab"][aria-selected="true"]';
    const getSessionId = () => {
        const tab = findVisible('[data-testid="session-tab-transcript"][id^="transcript/"]')
            || findVisible('[data-testid="session-tab-note"][id^="note/"]');
        return tab?.id.split("/").slice(1).join("/") || null;
    };
    const readTranscript = () => {
        const content = findVisible(transcriptSelector);
        const items = content ? [...content.querySelectorAll('[data-testid="transcript-item"]')] : [];
        if (items.length) {
            return items.filter(visible).map(item => {
                const words = text(item.querySelector('[data-testid="transcript-item-text"]')
                    || item.querySelector("p:last-child"));
                const timestamp = text(item.querySelector(".text-xs"));
                return words ? (timestamp ? `[${timestamp}] ${words}` : words) : "";
            }).filter(Boolean).join("\n\n");
        }
        // Ne pas présenter les seuls marqueurs de début/fin comme une transcription.
        return text(content).split("\n").filter(line =>
            !/^Transcription\s+(commencée|terminée|started|ended)/i.test(line.trim())).join("\n").trim();
    };
    const sessionId = getSessionId();
    const initialUrl = location.href;
    if (!sessionId) return { error: "Ouvrez une session de consultation dans Heidi, puis réessayez." };
    const sameSession = () => location.href === initialUrl && getSessionId() === sessionId;
    const transcriptTab = findVisible('[data-testid="session-tab-transcript"]');
    const tabList = transcriptTab?.closest('[role="tablist"]') || document;
    const initialTab = [...tabList.querySelectorAll(tabSelector)].find(visible);
    const noteEditor = findVisible('[data-testid="template-block-editor-content"] .ProseMirror, '
        + '[data-testid="scribe-tab-block-editor"] .ProseMirror, '
        + '#template-block-editor-content .ProseMirror, .prose-mirror-container .ProseMirror');
    const note = text(noteEditor);
    let switchedTab = false;
    try {
        // Heidi démonte parfois le panneau inactif. Ne toucher qu'à l'onglet Transcription,
        // jamais aux commandes d'enregistrement, de génération ou de copie.
        if (!findVisible(transcriptSelector) && transcriptTab && initialTab && initialTab !== transcriptTab) {
            switchedTab = true;
            transcriptTab.click();
        }
        if (!readTranscript() && transcriptTab?.getAttribute("aria-selected") === "true") {
            // Attendre aussi les segments chargés après le conteneur. Un observateur évite
            // les chaînes de timers fortement ralenties dans les onglets en arrière-plan.
            await new Promise(resolve => {
                const finish = () => { observer.disconnect(); clearTimeout(timer); resolve(); };
                const observer = new MutationObserver(() => {
                    if (!sameSession() || readTranscript()
                        || transcriptTab.getAttribute("aria-selected") !== "true") finish();
                });
                const timer = setTimeout(finish, 2500);
                observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true });
            });
        }
        if (!sameSession()) return { error: "La session Heidi a changé pendant la lecture. Réessayez." };
        const transcript = readTranscript();
        if (!transcript && !note) {
            return { error: "Aucune transcription ni note lisible dans la session Heidi ouverte." };
        }
        const limit = 60000;
        const result = {
            source: "heidi",
            sessionId,
            url: location.origin + location.pathname,
            transcript: transcript.slice(0, limit),
            note: note.slice(0, limit),
            avertissement: "La session Heidi n'est pas liée automatiquement au patient Weda. Vérifier la concordance avant utilisation."
        };
        if (!transcript) result.transcriptWarning = "Transcription indisponible ; seule la note affichée a pu être lue.";
        if (transcript.length > limit) result.transcriptTruncated = true;
        if (note.length > limit) result.noteTruncated = true;
        return result;
    } finally {
        // Ne pas annuler une navigation de session ou un choix d'onglet effectué entre-temps.
        if (switchedTab && sameSession() && initialTab.isConnected
            && transcriptTab.getAttribute("aria-selected") === "true") {
            initialTab.click();
        }
    }
}

async function readHeidiPageContext({ tabId } = {}) {
    if (tabId !== undefined && (!Number.isInteger(tabId) || tabId < 0)) {
        return { error: "tabId Heidi invalide." };
    }
    const permissions = { permissions: ["scripting"], origins: [HEIDI_CONTEXT_ORIGIN] };
    if (!await chrome.permissions.contains(permissions)) {
        return { error: "Activez « Accès à Heidi » dans les options de Weda-Helper > Assistant IA, puis autorisez l'accès à Heidi." };
    }
    const tabs = await chrome.tabs.query({ url: [HEIDI_CONTEXT_ORIGIN] });
    const candidates = tabs.filter(tab => Number.isInteger(tab.id));
    let tab;
    if (tabId !== undefined) {
        tab = candidates.find(candidate => candidate.id === tabId);
        if (!tab) return { error: "L'onglet Heidi demandé n'est plus disponible." };
    } else {
        if (!candidates.length) return { error: "Aucun onglet Heidi ouvert. Ouvrez la consultation dans Heidi." };
        if (candidates.length > 1) {
            return {
                error: "Plusieurs onglets Heidi sont ouverts. Demander à l'utilisateur lequel utiliser, puis rappeler heidiContext avec son tabId.",
                tabs: candidates.map(({ id, title }) => ({ tabId: id, title: title || "Heidi" }))
            };
        }
        tab = candidates[0];
    }
    if (tab.discarded || tab.status === "loading") {
        return { error: "L'onglet Heidi est en veille ou en cours de chargement. Ouvrez-le puis réessayez." };
    }
    if (heidiContextReads.has(tab.id)) return { error: "Une lecture de cet onglet Heidi est déjà en cours. Réessayez." };
    heidiContextReads.add(tab.id);
    try {
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: extractHeidiPageContext,
            world: "ISOLATED"
        });
        return results[0]?.result || { error: "Heidi n'a renvoyé aucun contenu. Réessayez." };
    } finally {
        heidiContextReads.delete(tab.id);
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request?.action !== "heidiPageContext") return false;
    // Cette passerelle n'accepte que les content scripts Weda de cette extension.
    if (sender.id !== chrome.runtime.id || sender.frameId !== 0
        || !sender.tab || !sender.url?.startsWith("https://secure.weda.fr/")) {
        sendResponse({ error: "Lecture Heidi refusée : appel hors de Weda." });
        return false;
    }
    readHeidiPageContext({ tabId: request.tabId }).then(sendResponse).catch(() => {
        sendResponse({ error: "Impossible de lire Heidi. Vérifiez l'autorisation, le chargement et la session de l'onglet, puis réessayez." });
    });
    return true;
});
