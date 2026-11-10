/**
 * Commandes explicites de la consultation Weda. La session et le verrou restent dans
 * le monde isolé d'Heidi et survivent à la mise en veille du service worker.
 */
async function controlHeidiRecording({ operation, owner, expectedSessionId }) {
    if (location.origin !== "https://scribe.heidihealth.com") {
        return { error: "L’onglet sélectionné n’affiche plus Heidi." };
    }
    const startSelector = '[data-testid="start-recording-button"]';
    const stopSelector = '[data-testid="stop-recording-button"]';
    const visible = element => element.getClientRects().length > 0
        && getComputedStyle(element).visibility !== "hidden";
    const find = selector => [...document.querySelectorAll(selector)].find(visible);
    const enabled = element => element && !element.disabled && element.getAttribute("aria-disabled") !== "true";
    const getSessionId = () => {
        const tab = find('[data-testid="session-tab-transcript"][id^="transcript/"]')
            || find('[data-testid="session-tab-note"][id^="note/"]');
        const id = tab?.id.split("/")[1];
        const routeId = location.pathname.match(/\/scribe\/sessions\/([^/]+)\/?$/)?.[1];
        return id && (!routeId || routeId === id) ? id : null;
    };
    const waitFor = async (condition, timeoutMs) => {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const result = condition();
            if (result) return result;
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        return null;
    };
    const sessionChanged = { error: "La session Heidi a changé. Vérifiez l’onglet Heidi." };
    const lock = globalThis.wedaHelperHeidiRecording;

    if (operation === "stop") {
        if (lock?.owner !== owner || lock.sessionId !== expectedSessionId || getSessionId() !== expectedSessionId) {
            return sessionChanged;
        }
        const stop = find(stopSelector);
        if (enabled(stop)) stop.click();
        const stopped = await waitFor(() => getSessionId() !== expectedSessionId || !find(stopSelector), 8000);
        if (getSessionId() !== expectedSessionId) return sessionChanged;
        if (!stopped) return { error: "L’arrêt n’est pas confirmé par Heidi. Vérifiez l’enregistrement avant de réessayer." };
        return { sessionId: expectedSessionId };
    }

    if (lock?.starting || find(stopSelector)) {
        return { error: "Une transcription est déjà en cours dans cet onglet Heidi." };
    }
    const create = find('button[data-testid="session-toolbar-cta-main"], button[aria-label="Nouvelle session"], '
        + '[data-testid="global-create-new-session"], button[data-testid="sessions-panel-action-new-session"]');
    if (!enabled(create)) return { error: "Commande « Nouvelle session » introuvable dans Heidi. Ouvrez la vue des sessions." };

    const previousId = getSessionId();
    // Ne pas partir d'une vue de session dont l'identifiant n'est pas encore lisible.
    if (/\/scribe\/sessions\/[^/]+/.test(location.pathname) && !previousId) {
        return { error: "Attendez le chargement de la session Heidi, puis réessayez." };
    }
    const newLock = { owner, starting: true, sessionId: null };
    globalThis.wedaHelperHeidiRecording = newLock;
    try {
        create.click();
        const sessionId = await waitFor(() => {
            const id = getSessionId();
            return id && id !== previousId && id;
        }, 10000);
        if (!sessionId) return { error: "La création d’une nouvelle session n’a pas été confirmée par Heidi." };

        const start = await waitFor(() => {
            const button = find(startSelector);
            return getSessionId() === sessionId && enabled(button) && button;
        }, 4000);
        if (getSessionId() !== sessionId) return sessionChanged;
        if (!start || find(stopSelector)) return { error: "Heidi n’est pas prêt à démarrer la transcription dans la nouvelle session." };

        newLock.sessionId = sessionId;
        start.click();
        const started = await waitFor(() => getSessionId() !== sessionId || !!find(stopSelector), 8000);
        if (getSessionId() !== sessionId) return sessionChanged;
        if (!started) {
            // Le clic est parti. Conserver l'association pour permettre l'arrêt ou la récupération
            // si Heidi confirme le démarrage plus tard (par exemple après le choix du microphone).
            return { sessionId, error: "Démarrage non confirmé. Vérifiez le microphone et l’état de la transcription dans Heidi." };
        }
        return { sessionId };
    } finally {
        newLock.starting = false;
    }
}

async function runHeidiRecording({ operation, tabId, owner, sessionId }) {
    if (!["start", "stop"].includes(operation) || !/^[a-f\d-]{36}$/i.test(owner || "")
        || (tabId !== undefined && (!Number.isInteger(tabId) || tabId < 0))
        || (operation === "stop" && (tabId === undefined || typeof sessionId !== "string" || !sessionId))) {
        return { error: "Commande de transcription Heidi invalide." };
    }
    const { heidiConsultationWorkflow, heidiContextAccess, killSwitch } =
        await chrome.storage.local.get(["heidiConsultationWorkflow", "heidiContextAccess", "killSwitch"]);
    if (!heidiConsultationWorkflow || !heidiContextAccess || killSwitch
        || !await chrome.permissions.contains(HEIDI_CONTEXT_PERMISSIONS)) {
        return { error: "Activez « Transcription Heidi en consultation » et « Accès à Heidi » dans les options." };
    }
    const tabs = await getHeidiContextTabs();
    if (tabId === undefined && tabs.length > 1) {
        return { tabs: tabs.map(({ id, title }) => ({ id, title: title || "Heidi" })) };
    }
    const tab = tabId === undefined ? tabs[0] : tabs.find(candidate => candidate.id === tabId);
    if (!tab) return { error: "L’onglet Heidi est introuvable. Ouvrez-le puis réessayez.", resetTab: true };
    if (tab.discarded || tab.status === "loading" || heidiContextReads.has(tab.id)) {
        return { error: "L’onglet Heidi est en veille, en chargement ou déjà utilisé. Vérifiez-le puis réessayez." };
    }
    heidiContextReads.add(tab.id);
    try {
        const [command] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: controlHeidiRecording,
            args: [{ operation, owner, expectedSessionId: sessionId ?? null }],
            world: "ISOLATED"
        });
        const result = command?.result;
        if (!result) return { error: "Heidi n’a pas répondu. Vérifiez l’onglet Heidi." };
        if (operation === "start" || result.error) return { ...result, tabId: tab.id };

        const [context] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: extractHeidiPageContext,
            args: [{ expectedSessionId: sessionId }],
            world: "ISOLATED"
        });
        const transcript = context?.result;
        if (transcript?.error) return { error: transcript.error };
        if (transcript?.sessionId !== sessionId || !transcript.transcript || transcript.transcriptTruncated) {
            return { error: "La transcription est indisponible ou trop longue pour un transfert intégral. Récupérez-la dans Heidi." };
        }
        return { sessionId, transcript: transcript.transcript };
    } finally {
        heidiContextReads.delete(tab.id);
    }
}

function isHeidiConsultationSender(sender) {
    return sender?.id === chrome.runtime.id && sender.frameId === 0 && !!sender.tab
        && /^https:\/\/secure\.weda\.fr\/FolderMedical\/ConsultationForm\.aspx(?:[?#]|$)/i.test(sender.url || "");
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request?.action !== "heidiConsultationRecording") return false;
    if (!isHeidiConsultationSender(sender)) {
        sendResponse({ error: "Commande Heidi refusée hors d’une consultation Weda." });
        return false;
    }
    runHeidiRecording(request).then(sendResponse).catch(() => {
        sendResponse({ error: "Impossible de communiquer avec Heidi. Vérifiez la session et les autorisations." });
    });
    return true;
});
