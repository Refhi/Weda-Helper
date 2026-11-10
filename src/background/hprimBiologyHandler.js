/**
 * Les brouillons sont propres à l'onglet et ne survivent pas à la session Chrome.
 * Ils permettent de reprendre après un postback complet, sans les exposer à la page Weda.
 */
const hprimSessionTasks = new Map();

function accessHprimSession(key, message) {
    // La page de retour doit attendre les messages déjà envoyés avant sa navigation.
    const previous = hprimSessionTasks.get(key) || Promise.resolve();
    const task = previous.catch(() => {}).then(async () => {
        if (!Object.hasOwn(message, "state")) return { state: (await chrome.storage.session.get(key))[key] };
        await chrome.storage.session.set({ [key]: message.state });
        return { saved: true };
    });
    hprimSessionTasks.set(key, task);
    return task.finally(() => {
        if (hprimSessionTasks.get(key) === task) hprimSessionTasks.delete(key);
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!["whHprimSession", "whHprimAnalysis"].includes(message?.type) || sender.tab?.id === undefined ||
        sender.frameId !== 0 || !/^https:\/\/secure\.weda\.fr\/FolderMedical\/HprimForm\.aspx(?:[?#]|$)/i.test(sender.url || "")) {
        return false;
    }
    const key = "hprimDrafts:" + sender.tab.id;
    const perform = async () => {
        if (message.type === "whHprimSession") return accessHprimSession(key, message);
        await ensureOffscreenDocument();
        return chrome.runtime.sendMessage({ type: "whHprimOffscreenAnalysis", rows: message.rows });
    };
    perform().then(sendResponse, () => sendResponse({ error: "Service d’analyse indisponible." }));
    return true;
});

chrome.tabs.onRemoved.addListener(tabId => {
    const key = "hprimDrafts:" + tabId;
    Promise.resolve(hprimSessionTasks.get(key)).catch(() => {})
        .then(() => chrome.storage.session.remove(key)).catch(() => {});
});
