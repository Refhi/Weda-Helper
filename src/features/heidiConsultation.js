/**
 * Transcription Heidi depuis la fiche patient ou la consultation Weda.
 * La transcription et les propositions ne sont chargées que dans la consultation.
 */
const HEIDI_CONSULTATION_EDITOR = "iframe[id^='CE_ContentPlaceHolder1_EditorConsultation'][id$='_ID_Frame']";
let heidiConsultationPausesAutoSave = () => false;

function getHeidiConsultationEditor() {
    const frame = document.getElementById("CE_ContentPlaceHolder1_EditorConsultation1_ID_Frame")
        || document.querySelector(HEIDI_CONSULTATION_EDITOR);
    const doc = frame?.contentDocument;
    return frame?.getClientRects().length && (doc?.body?.isContentEditable || doc?.designMode === "on")
        ? doc.body : null;
}

function getHeidiNewConsultationLink() {
    // Commande native utilisée par le connecteur Heidi–Weda. L’identifiant
    // du sous-menu ASP.NET varie : vérifier le libellé et le postback existant.
    const links = [...document.querySelectorAll("#ContentPlaceHolder1_MenuNavigate a")].filter(link =>
        /^(?:Nouvelle )?Consultation$/i.test(link.textContent.trim())
        && /__doPostBack\(\s*'ctl00\$ContentPlaceHolder1\$MenuNavigate'\s*,\s*'0\\\\1'\s*\)/.test(link.getAttribute("onclick") || "")
    );
    return links.length === 1 ? links[0] : null;
}

function appendHeidiTranscript(editor, transcript) {
    const doc = editor.ownerDocument;
    const block = doc.createElement("div");
    const heading = doc.createElement("strong");
    heading.textContent = "Transcription Heidi";
    block.append(heading);
    for (const line of transcript.split("\n")) {
        block.append(doc.createElement("br"), doc.createTextNode(line));
    }
    editor.append(block);
    for (const type of ["input", "change", "keyup"]) {
        editor.dispatchEvent(new doc.defaultView.Event(type, { bubbles: true }));
    }
}

async function readHeidiConsultationAntecedents(patientId) {
    const url = await getCurrentPatientPageUrl("/FolderMedical/PopUpHistoriqueForm.aspx", patientId);
    const iframe = await createHiddenIframe(url, false, "WedaHelperHeidiHistory", { timeoutMs: 15000 });
    try {
        const { mainContainer, parser } = SELECTORS.categories.antecedents;
        const container = await waitForElementInDocument(() => iframe.contentDocument, mainContainer, 10000);
        if (extractPatDkFromUrl(container.ownerDocument.URL) !== patientId) {
            throw new Error("Impossible de vérifier le patient de l’historique.");
        }
        return parser(container);
    } finally {
        iframe.remove();
    }
}

function sameHeidiAntecedent(known, proposal, onglets) {
    const family = section => onglets.some(o => o.titre === section && o.type === "Antécédents familiaux");
    const title = normalizeAtcdText(proposal.titre);
    return known.some(section => family(section.titre) === family(proposal.onglet)
        && section.items.some(item => normalizeAtcdText(item.titre) === title));
}

function mountHeidiConsultation() {
    const patientPage = /\/PatientViewForm\.aspx$/i.test(location.pathname);
    const patientMismatch = "Une transcription est liée à un autre patient dans cet onglet. Revenez au dossier d’origine.";
    const waitingForConsultation = "Heidi est arrêté. Ouvrez une consultation de ce patient dans cet onglet pour recevoir la transcription.";
    let flow = null;
    let busy = false;
    let otherPatient = false;
    let pendingAI = null;
    const make = (tag, text) => {
        const element = document.createElement(tag);
        if (text) element.textContent = text;
        return element;
    };
    const button = (label, action) => {
        const element = make("button", label);
        element.type = "button";
        element.addEventListener("click", action);
        return element;
    };
    const panel = make("section");
    panel.id = "wh-heidi-consultation";
    panel.setAttribute("aria-label", "Transcription Heidi");
    const status = make("p", "Ouvrez Heidi dans un onglet, puis démarrez la transcription depuis Weda.");
    status.setAttribute("role", "status");
    const tabPicker = make("select");
    tabPicker.hidden = true;
    tabPicker.setAttribute("aria-label", "Onglet Heidi");

    const dialog = make("dialog");
    dialog.id = "wh-heidi-proposals";
    const heading = make("h2", "Propositions Heidi");
    heading.id = "wh-heidi-proposals-title";
    dialog.setAttribute("aria-labelledby", heading.id);
    const content = make("div");
    const dialogStatus = make("p");
    dialogStatus.setAttribute("role", "status");
    dialog.append(heading, content, dialogStatus, button("Fermer", () => dialog.close()));

    const start = button("Démarrer Heidi", () => run(startRecording));
    const stop = button("Arrêter et transférer", () => run(stopRecording));
    const review = button("Voir les propositions", () => {
        if (!isCurrent(flow)) {
            say("La consultation a changé. Les propositions ont été écartées.");
            flow = null;
            refresh();
            return;
        }
        showProposals(flow);
        if (!dialog.open) dialog.showModal();
    });
    const retry = button("Relancer l’analyse", () => run(() => analyse(flow)));
    const abandon = button("Abandonner le transfert", () => run(async () => {
        if (flow?.fromPatientPage) await releasePatientRecording(flow);
        flow = null;
        say("Transfert abandonné. Si Heidi enregistre encore, arrêtez-le dans son onglet.");
    }));
    const controls = make("div");
    controls.append(make("strong", "Heidi"), tabPicker, start, stop, review, retry, abandon);
    panel.append(controls, status);
    const style = make("style");
    style.textContent = `
        #wh-heidi-consultation { position: fixed; bottom: 1rem; left: 1rem; z-index: 10010;
            max-width: min(43rem, calc(100vw - 2rem)); padding: .5rem .75rem; background: #fff;
            color: #1f2937; border: 1px solid #a6b8ca; border-radius: 6px; font: 13px system-ui; }
        #wh-heidi-consultation > div { display: flex; flex-wrap: wrap; align-items: center; gap: .4rem; }
        #wh-heidi-consultation select { max-width: 15rem; }
        #wh-heidi-consultation p { margin: .35rem 0 0; }
        #wh-heidi-proposals { box-sizing: border-box; width: min(42rem, calc(100vw - 2rem));
            max-height: 85vh; padding: 1rem; background: #fff; color: #1f2937;
            border: 1px solid #a6b8ca; border-radius: 8px; font: 14px system-ui; }
        #wh-heidi-proposals::backdrop { background: #10182855; }
        #wh-heidi-proposals h2, #wh-heidi-proposals h3 { margin: 0 0 .5rem; }
        #wh-heidi-proposals article { margin: .5rem 0 1rem; padding-left: .6rem; border-left: 3px solid #a6b8ca; }
        #wh-heidi-proposals blockquote { margin: .35rem 0; white-space: pre-wrap; overflow-wrap: anywhere; }
        #wh-heidi-proposals textarea { display: block; box-sizing: border-box; width: 100%; margin-bottom: .6rem; }
        #wh-heidi-proposals button { margin-right: .35rem; }
    `;
    document.head.append(style);
    document.body.append(panel, dialog);

    const isCurrentPage = job => !!job && job === flow && job.url === location.href
        && job.patientId === getCurrentPatientId();
    const isCurrent = job => isCurrentPage(job) && job.editor === getHeidiConsultationEditor();
    function requireCurrent(job) {
        if (!isCurrent(job)) throw new Error("La consultation a changé. Vérifiez Heidi et ouvrez le bon dossier.");
    }
    function say(message) {
        status.textContent = message;
        dialogStatus.textContent = message;
    }
    function refresh() {
        const pending = !!flow && !flow.transcript;
        panel.setAttribute("aria-busy", String(busy));
        start.disabled = busy || pending || otherPatient;
        stop.disabled = busy || !pending || (patientPage && flow.readyForTransfer);
        abandon.hidden = !pending;
        abandon.disabled = busy;
        tabPicker.disabled = busy || pending;
        retry.hidden = !flow?.retryAnalysis;
        retry.disabled = busy;
        review.hidden = !flow?.proposals;
        review.disabled = busy;
    }
    async function run(action) {
        if (busy) return;
        busy = true;
        refresh();
        try {
            await action();
        } catch (error) {
            say(error.message || "Action Heidi indisponible.");
        } finally {
            busy = false;
            refresh();
        }
    }
    heidiConsultationPausesAutoSave = () => busy || (!!flow && !flow.transcript) || dialog.open;
    refresh();

    function recordingCommand(payload) {
        return chrome.runtime.sendMessage({ action: "heidiConsultationRecording", ...payload });
    }
    function jobCommand(operation, { owner, tabId, sessionId }) {
        return recordingCommand({ operation, owner, tabId, sessionId });
    }
    async function releasePatientRecording(job) {
        const result = await jobCommand("release", job);
        if (result?.error) throw new Error(result.error);
    }
    async function restorePatientRecording() {
        const url = location.href;
        const result = await recordingCommand({ operation: "restore" });
        if (url !== location.href) return;
        if (result?.error) throw new Error(result.error);
        if (result?.otherPatient) {
            otherPatient = true;
            say(patientMismatch);
            return;
        }
        if (!result?.pending) return;
        flow = { ...result.pending, fromPatientPage: true, url, editor: getHeidiConsultationEditor() };
        if (flow.readyForTransfer) {
            if (patientPage) say(waitingForConsultation);
            else await stopRecording();
        } else {
            say("Session Heidi liée à ce dossier. Arrêtez-la pour transférer la transcription.");
        }
    }
    async function startRecording() {
        if (otherPatient) throw new Error(patientMismatch);
        if (flow && !flow.transcript) {
            throw new Error("Une session est déjà liée à ce dossier. Terminez son transfert avant d’en démarrer une autre.");
        }
        const patientId = getCurrentPatientId();
        const editor = getHeidiConsultationEditor();
        if (!patientId || (!patientPage && !editor)) throw new Error("Ouvrez une fiche patient ou une consultation Weda dont l’éditeur est prêt.");
        const job = { patientId, editor, url: location.href, owner: crypto.randomUUID(), fromPatientPage: patientPage };
        say("Création de la session Heidi…");
        const result = await recordingCommand({
            operation: "start", owner: job.owner,
            ...(tabPicker.value ? { tabId: Number(tabPicker.value) } : {})
        });
        if (result?.tabs?.length) {
            const placeholder = make("option", "Choisir un onglet Heidi");
            placeholder.value = "";
            tabPicker.replaceChildren(placeholder);
            for (const tab of result.tabs) {
                const option = make("option", tab.title);
                option.value = String(tab.id);
                tabPicker.append(option);
            }
            tabPicker.hidden = false;
            say("Choisissez l’onglet Heidi, puis relancez le démarrage.");
            return;
        }
        if (result?.resetTab) {
            tabPicker.replaceChildren();
            tabPicker.hidden = true;
        }
        if (result?.sessionId) {
            flow = { ...job, tabId: result.tabId, sessionId: result.sessionId };
            requireCurrent(flow);
        }
        if (result?.error || !result?.sessionId) {
            throw new Error(result?.error || "Le démarrage Heidi n’a pas été confirmé.");
        }
        say("Transcription Heidi en cours.");
    }

    async function stopRecording() {
        if (otherPatient) throw new Error(patientMismatch);
        const job = flow;
        if (!job) throw new Error("Démarrez d’abord une transcription depuis ce dossier.");
        if (job.transcript) throw new Error("La transcription est déjà dans la consultation.");
        if (!patientPage && job.fromPatientPage && !job.editor) {
            job.editor = await waitForElementInDocument(
                () => isCurrentPage(job) ? getHeidiConsultationEditor()?.ownerDocument : null, "body"
            ).catch(() => null);
            if (!job.editor) throw new Error("Attendez que l’éditeur de consultation soit prêt, puis relancez le transfert.");
        }
        requireCurrent(job);
        if (patientPage && job.readyForTransfer) {
            say(waitingForConsultation);
            return;
        }
        say(patientPage ? "Arrêt de Heidi…" : "Arrêt de Heidi et attente de la transcription finale…");
        const result = await jobCommand("stop", job);
        requireCurrent(job);
        if (result?.error || result?.sessionId !== job.sessionId) {
            throw new Error(result?.error || "La transcription de cette session n’a pas été reçue.");
        }
        if (patientPage) {
            job.readyForTransfer = true;
            say(waitingForConsultation);
            getHeidiNewConsultationLink()?.click();
            return;
        }
        if (!result.transcript) throw new Error("La transcription de cette session n’a pas été reçue.");
        appendHeidiTranscript(job.editor, result.transcript);
        job.transcript = result.transcript;
        say("Transcription ajoutée à la consultation.");
        if (job.fromPatientPage) await releasePatientRecording(job);
        await analyse(job);
    }

    // Un aller-retour isolé du chat, identifié pour ignorer toute réponse tardive.
    if (!patientPage) {
        onOffscreenMessage(message => {
            if (message?.type === "heidiConsultationAIResult" && pendingAI?.id === message.requestId) {
                pendingAI.complete(message.result);
            }
        });
    }
    function requestAnalysis(operation, payload) {
        return new Promise((resolve, reject) => {
            const id = crypto.randomUUID();
            const finish = () => {
                clearTimeout(timer);
                pendingAI = null;
            };
            const timer = setTimeout(() => {
                finish();
                reject(new Error("Le délai de réponse de l’IA est dépassé. Réessayez."));
            }, 90000);
            pendingAI = {
                id, complete(result) {
                    finish();
                    if (result?.error || !result) reject(new Error(result?.error || "Aucune réponse de l’IA."));
                    else resolve(result);
                }
            };
            try {
                sendOffscreenMessage({ type: "heidiConsultationAI", requestId: id, operation, payload });
            } catch (error) {
                finish();
                reject(error);
            }
        });
    }

    async function analyse(job) {
        requireCurrent(job);
        job.retryAnalysis = true;
        const [enabled, assistant] = await getOptionPromise(["heidiConsultationAnalysis", "enableIAassistant"]);
        if (!enabled || !assistant) {
            say("Transcription ajoutée. Activez l’analyse Heidi et l’assistant IA pour obtenir des propositions.");
            return;
        }
        say("Transcription ajoutée. Comparaison avec le dossier et détection des documents…");
        let antecedents = [];
        let onglets = [];
        try {
            const known = await readHeidiConsultationAntecedents(job.patientId);
            requireCurrent(job);
            onglets = await withAntecedentContext(() => ongletsPossibles().map(({ titre, categorie, freeAtcdButton }) => ({
                titre, type: categorie, ajoutLibre: !!freeAtcdButton && !["Allergies", "Traitement"].includes(categorie)
            })), { patientId: job.patientId, verifyPatient: true });
            if (onglets.length) {
                antecedents = known.map(section => ({
                    titre: section.titre,
                    items: section.items.map(({ titre, cim10Code, description }) => ({ titre, cim10Code, description }))
                }));
            }
        } catch {
            onglets = [];
        }
        requireCurrent(job);
        const result = await requestAnalysis("analyse", { transcript: job.transcript, antecedents, onglets });
        requireCurrent(job);
        job.onglets = onglets;
        job.proposals = result;
        job.retryAnalysis = !onglets.length;
        say(`${result.antecedents.length} antécédent(s) et ${result.documents.length} document(s) proposés.`
            + (onglets.length ? "" : " Les antécédents du dossier n’ont pas pu être vérifiés."));
    }

    async function prepareAntecedent(job, proposal) {
        requireCurrent(job);
        dialog.close();
        say("Vérification de l’antécédent dans le dossier Weda…");
        const known = await readHeidiConsultationAntecedents(job.patientId);
        requireCurrent(job);
        if (sameHeidiAntecedent(known, proposal, job.onglets)) {
            proposal.status = "Déjà présent dans le dossier";
            say("Cet antécédent figure déjà dans le dossier Weda.");
            return;
        }
        say("Vérifiez l’antécédent dans le formulaire Weda, puis validez ou annulez.");
        const result = await insertAntecedent({ nom: proposal.titre, onglet: proposal.onglet }, {
            patientId: job.patientId, verifyPatient: true, strictOnglet: true,
            isCurrent: () => isCurrent(job)
        });
        requireCurrent(job);
        if (!result.success) throw new Error(result.message);
        // La fermeture du formulaire ne suffit pas à prouver que Weda a enregistré l'ajout.
        proposal.status = "Validation reçue, à vérifier dans le dossier";
        const updated = await readHeidiConsultationAntecedents(job.patientId).catch(() => []);
        requireCurrent(job);
        if (sameHeidiAntecedent(updated, proposal, job.onglets)) proposal.status = "Ajout retrouvé dans le dossier";
        say(proposal.status);
    }

    function showProposals(job) {
        heading.textContent = "Propositions Heidi";
        content.replaceChildren();
        for (const [label, proposals] of [
            ["Antécédents à vérifier", job.proposals.antecedents],
            ["Documents à rédiger", job.proposals.documents]
        ]) {
            content.append(make("h3", label));
            if (!proposals.length) content.append(make("p", "Aucune proposition."));
            for (const item of proposals) {
                const row = make("article");
                const detail = item.onglet || (item.type === "imagerie" ? "Demande d’imagerie" : "Courrier au spécialiste");
                row.append(make("strong", item.titre), make("div", detail), make("blockquote", item.extrait));
                if (item.status) {
                    row.append(make("span", item.status));
                } else if (item.type) {
                    row.append(button(item.draft !== undefined ? "Revoir le brouillon" : "Rédiger le brouillon",
                        () => run(() => prepareDraft(job, item))));
                } else if (job.onglets.some(o => o.titre === item.onglet && o.ajoutLibre)) {
                    row.append(button("Préparer l’ajout dans Weda", () => run(() => prepareAntecedent(job, item))));
                } else {
                    row.append(make("span", "Saisie manuelle dans cet onglet Weda."));
                }
                content.append(row);
            }
        }
    }

    async function prepareDraft(job, item) {
        requireCurrent(job);
        if (item.draft === undefined) {
            say("Rédaction du brouillon…");
            const { type, titre, extrait } = item;
            const result = await requestAnalysis("redige", { transcript: job.transcript, proposal: { type, titre, extrait } });
            requireCurrent(job);
            item.draft = result.text;
        }
        if (!dialog.open) {
            say("Brouillon prêt. Ouvrez les propositions pour le relire.");
            return;
        }
        heading.textContent = item.titre;
        const editor = make("textarea");
        editor.setAttribute("aria-label", "Brouillon à relire");
        editor.rows = 12;
        editor.value = item.draft;
        editor.addEventListener("input", () => { item.draft = editor.value; });
        content.replaceChildren(editor, button("Copier le brouillon", async () => {
            try {
                requireCurrent(job);
                await navigator.clipboard.writeText(editor.value);
                say("Brouillon copié.");
            } catch {
                say("Copie indisponible. Sélectionnez le texte du brouillon pour le copier.");
            }
        }), button("Retour aux propositions", () => showProposals(job)));
        say("Relisez le brouillon avant de l’utiliser dans Weda.");
        editor.focus();
    }

    keyCommands.heidi_start_recording = () => run(startRecording);
    keyCommands.heidi_stop_recording = () => run(stopRecording);
    addAllShortcuts();
    run(restorePatientRecording);
}

addTweak(["/FolderMedical/PatientViewForm.aspx", "/FolderMedical/ConsultationForm.aspx"],
    "heidiConsultationWorkflow", mountHeidiConsultation);
