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

async function runHeidiRecording({ operation, tabId, owner, sessionId }, stopOnly = false) {
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
        if (operation === "start" || stopOnly || result.error) return { ...result, tabId: tab.id };

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

function getHeidiRecordingWedaContext(sender) {
    if (sender?.id !== chrome.runtime.id || sender.frameId !== 0 || !Number.isInteger(sender.tab?.id)) return null;
    const page = sender.url?.match(/^https:\/\/secure\.weda\.fr\/FolderMedical\/(Consultation|PatientView)Form\.aspx(?:[?#]|$)/i);
    if (!page) return null;
    const patientId = new URL(sender.url).searchParams.get("PatDk")?.match(/^(\d+)(?:\||$)/)?.[1];
    return patientId ? { patientId, wedaTabId: sender.tab.id, patientPage: page[1].toLowerCase() === "patientview" } : null;
}

function isHeidiConsultationSender(sender) {
    const context = getHeidiRecordingWedaContext(sender);
    return !!context && !context.patientPage;
}

// La fiche et la consultation sont deux documents. Conserver seulement la liaison dans
// l’extension, par onglet Weda. Le texte reste dans Heidi jusqu’au transfert.
const heidiPatientRecordingKey = tabId => "heidiPatientRecording:" + tabId;
const heidiWedaCommands = new Set();

async function handleHeidiWedaRecording(request, { patientId, wedaTabId, patientPage }) {
    const key = heidiPatientRecordingKey(wedaTabId);
    const { operation, owner, tabId, sessionId } = request;
    if (operation === "restore") {
        const { [key]: pending } = await chrome.storage.session.get(key);
        if (!pending) return {};
        return pending.patientId === patientId ? { pending } : { otherPatient: true };
    }
    if (heidiWedaCommands.has(wedaTabId)) return { error: "Une commande Heidi est déjà en cours dans cet onglet." };
    heidiWedaCommands.add(wedaTabId);
    try {
        const { [key]: pending } = await chrome.storage.session.get(key);
        const matches = pending?.patientId === patientId && pending.owner === owner
            && pending.tabId === tabId && pending.sessionId === sessionId;
        if (operation === "release") {
            if (matches) await chrome.storage.session.remove(key);
            return matches || !pending ? {} : { error: "La liaison avec Heidi a changé." };
        }
        if (operation === "start" && pending) {
            return { error: pending.patientId === patientId
                ? "Une session est déjà liée à ce dossier. Actualisez la page pour reprendre le transfert."
                : "Une transcription est liée à un autre patient dans cet onglet." };
        }
        if (operation === "stop" && (pending || patientPage) && !matches) {
            return { error: "La session Heidi n’est pas liée à ce dossier dans cet onglet." };
        }
        const result = await runHeidiRecording(request, patientPage);
        if (patientPage && operation === "start" && result.sessionId) {
            await chrome.storage.session.set({
                [key]: { patientId, owner, tabId: result.tabId, sessionId: result.sessionId, readyForTransfer: false }
            });
        }
        if (patientPage && operation === "stop" && !result.error && result.sessionId === sessionId) {
            await chrome.storage.session.set({ [key]: { ...pending, readyForTransfer: true } });
        }
        return result;
    } finally {
        heidiWedaCommands.delete(wedaTabId);
    }
}

chrome.tabs.onRemoved.addListener(tabId => {
    chrome.storage.session.remove(heidiPatientRecordingKey(tabId)).catch(() => {});
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request?.action !== "heidiConsultationRecording") return false;
    const context = getHeidiRecordingWedaContext(sender);
    if (!context) {
        sendResponse({ error: "Commande Heidi refusée hors d’une fiche patient ou d’une consultation Weda." });
        return false;
    }
    handleHeidiWedaRecording(request, context).then(sendResponse).catch(() => {
        sendResponse({ error: "Impossible de communiquer avec Heidi. Vérifiez la session et les autorisations." });
    });
    return true;
});
