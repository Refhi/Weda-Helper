"use strict";

// Extension complète dans un profil Chromium jetable. Toutes les données sont fictives.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const root = path.join(__dirname, "..");
const wedaOrigin = "https://secure.weda.fr";
const patient = wedaOrigin + "/FolderMedical/PatientViewForm.aspx?PatDk=101%7C0%7C0%7C0";
const consultation = wedaOrigin + "/FolderMedical/ConsultationForm.aspx?PatDk=101&Evenement=1";
const heidiOrigin = "https://scribe.heidihealth.com";
const heidiUrl = heidiOrigin + "/fr-FR/scribe/sessions/ancienne";
const primaryId = "CE_ContentPlaceHolder1_EditorConsultation1_ID_Frame";
const confidentialId = "CE_ContentPlaceHolder1_EvenementInformationFiltreUCForm1_EditorZoneUserTextInEvement_ID_Frame";
const previous = "Asthme ancien confirmé.";
const newHistory = "Appendicectomie dans l’enfance.";
const referral = "Je rédige un courrier au cardiologue pour avis.";
const imaging = "Je prescris une radiographie du genou gauche.";
const marker = "Marqueur fictif <img src=x>.";

const html = body => "<!doctype html><html><head><meta charset=utf-8></head><body>"
    + "<script>window.weda={wedaHelper:{},capabilities:{}};</script>" + body + "</body></html>";
const segment = (time, text) => '<div data-testid="transcript-item"><span class="text-xs">' + time
    + '</span><p data-testid="transcript-item-text">' + text.replaceAll("<", "&lt;") + '</p></div>';
const finalTranscript = '<div data-testid="transcript-content"><p>Transcription commencée à 09:00</p>'
    + [previous, newHistory, referral, imaging, marker].map((text, index) => segment("00:0" + index, text)).join("")
    + '<p>Transcription terminée à 09:01</p></div>';

function heidiFixture() {
    return html(`
        <button data-testid="session-toolbar-cta-main">Nouvelle session</button>
        <button data-testid="start-recording-button">Transcription</button>
        <button data-testid="stop-recording-button" hidden>Arrêter la transcription</button>
        <div role="tablist">
            <button role="tab" data-testid="session-tab-note" id="note/ancienne" aria-selected="true">Note</button>
            <button role="tab" data-testid="session-tab-transcript" id="transcript/ancienne" aria-selected="false">Transcription</button>
        </div>
        <div id="panel"></div>
        <div hidden data-testid="transcript-content">TEXTE SESSION ANTÉRIEURE</div>
        <script>
            const get = name => document.querySelector('[data-testid="' + name + '"]');
            const note = get("session-tab-note");
            const transcript = get("session-tab-transcript");
            const start = get("start-recording-button");
            const stop = get("stop-recording-button");
            const panel = document.querySelector("#panel");
            window.counts = { sessions: 0, start: 0, stop: 0 };
            let finished = true;
            function show() {
                if (transcript.getAttribute("aria-selected") === "true") {
                    panel.innerHTML = finished ? ${JSON.stringify(finalTranscript)}
                        : ${JSON.stringify('<div data-testid="transcript-content">' + segment("00:00", "Texte en cours.") + '</div>')};
                } else panel.innerHTML = '<div data-testid="template-block-editor-content"><div class="ProseMirror">Note fictive</div></div>';
            }
            function select(tab) {
                for (const candidate of [note, transcript]) candidate.setAttribute("aria-selected", String(tab === candidate));
                show();
            }
            window.switchSession = id => {
                history.pushState(null, "", "/fr-FR/scribe/sessions/" + id);
                note.id = "note/" + id;
                transcript.id = "transcript/" + id;
                select(note);
            };
            get("session-toolbar-cta-main").onclick = () => {
                finished = false;
                window.switchSession("nouvelle-" + (++counts.sessions));
            };
            start.onclick = () => { counts.start++; start.hidden = true; stop.hidden = false; };
            stop.onclick = () => {
                counts.stop++;
                stop.hidden = true;
                start.hidden = false;
                document.body.dataset.stopRequested = "true";
                setTimeout(() => { finished = true; show(); }, 700);
            };
            note.onclick = () => select(note);
            transcript.onclick = () => select(transcript);
            select(note);
        </script>`);
}

function patientFixture(withMenu) {
    return html(withMenu ? `
        <div id="ContentPlaceHolder1_MenuNavigate">
            <ul id="ContentPlaceHolder1_MenuNavigate:submenu:89" hidden>
                <li><a href="#" onclick="__doPostBack('ctl00$ContentPlaceHolder1$MenuNavigate','0\\\\1');return false;">Consultation</a></li>
            </ul>
        </div>
        <script>
            window.__doPostBack = (target, argument) => {
                if (target === "ctl00$ContentPlaceHolder1$MenuNavigate" && argument === "0\\\\1") {
                    location.href = ${JSON.stringify(consultation)};
                }
            };
        </script>` : "");
}

function consultationFixture() {
    return html(`
        <form id="form1">
            <input id="TextBoxEvenementTitre" aria-label="Titre">
            <input id="TextBoxDocumentTitre" aria-label="Sous-titre">
            <iframe id="${primaryId}" src="/test/editeur" title="Consultation"></iframe>
            <iframe id="${confidentialId}" src="/test/confidentiel" title="Confidentiel"></iframe>
            <input type="button" id="ButtonSave" value="Enregistrer" onclick="window.saves++">
        </form>
        <script>window.saves=0;</script>`);
}

function antecedentFixture() {
    return html(`
        <div class="sca">
            <table title="Les éléments resultant de la recherche de pathologies sont autorisés à être lâché sur cet onglet.">
                <tr><td><div class="sma" title="Type de l'onglet : Antécédents">Médicaux</div>
                <img title="Ajouter un antécédent (libre)" alt="Ajouter un antécédent (libre)" width=16 height=16
                    onclick="document.querySelector('#ContentPlaceHolder1_PanelModifyAntecedent').style.display='block'"></td></tr>
            </table>
        </div>
        <div id="ContentPlaceHolder1_PanelModifyAntecedent" style="display:none">
            <input id="ContentPlaceHolder1_TextBoxAntecedentNom" aria-label="Antécédent">
            <button id="ContentPlaceHolder1_ButtonValid">Valider</button>
            <button id="ContentPlaceHolder1_ButtonCancel">Annuler</button>
        </div>
        <script>
            const panel = document.querySelector("#ContentPlaceHolder1_PanelModifyAntecedent");
            document.querySelector("#ContentPlaceHolder1_ButtonValid").onclick = async () => {
                await fetch("/test/antecedent", { method: "POST",
                    body: document.querySelector("#ContentPlaceHolder1_TextBoxAntecedentNom").value });
                panel.style.display = "none";
            };
            document.querySelector("#ContentPlaceHolder1_ButtonCancel").onclick = () => { panel.style.display = "none"; };
        </script>`);
}

const aiCalls = [];
let malformedAI = false;
const ai = http.createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/v1/models") return res.end(JSON.stringify({ data: [{ id: "modele-fictif" }] }));
    if (req.method !== "POST" || req.url !== "/v1/chat/completions") {
        res.statusCode = 404;
        return res.end("{}");
    }
    const buffers = [];
    for await (const chunk of req) buffers.push(chunk);
    const request = JSON.parse(Buffer.concat(buffers).toString("utf8"));
    aiCalls.push(request);
    const source = JSON.parse(request.messages[1].content);
    const result = source.document
        ? (source.document.type === "courrier" ? "Brouillon fictif pour le cardiologue." : "Brouillon fictif pour la radiographie.")
        : JSON.stringify({
            antecedents: [
                { libelleClinique: "Asthme", idOnglet: 1, extrait: previous },
                { libelleClinique: "Appendicectomie", idOnglet: 1, extrait: newHistory },
                { libelleClinique: "À écarter", idOnglet: 99, extrait: newHistory }
            ],
            documents: [
                { type: "courrier", titre: "Avis cardiologique", extrait: referral },
                { type: "imagerie", titre: "Radiographie genou gauche", extrait: imaging },
                { type: "courrier", titre: "Source absente", extrait: "Ce texte n’a jamais été transcrit." }
            ]
        });
    res.end(JSON.stringify({ choices: [{ message: { content: malformedAI ? "texte invalide" : result }, finish_reason: "stop" }] }));
});

async function run() {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "weda-heidi-consultation-"));
    const extension = path.join(temp, "extension");
    let browser;
    try {
        await new Promise(resolve => ai.listen(0, "127.0.0.1", resolve));
        fs.cpSync(root, extension, { recursive: true, filter: source => ![".git", ".github", "tests"].includes(path.basename(source)) });
        const manifestPath = path.join(extension, "manifest.json");
        const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
        assert.ok(manifest.optional_permissions.includes("scripting"));
        assert.ok(!manifest.permissions.includes("scripting") && !manifest.permissions.includes("tabs"));
        assert.ok(!manifest.host_permissions.some(origin => origin.includes("heidihealth")));
        // Simule l’autorisation explicite déjà accordée dans ce profil de test.
        manifest.permissions.push("scripting");
        manifest.host_permissions.push(heidiOrigin + "/*");
        fs.writeFileSync(manifestPath, JSON.stringify(manifest));
        browser = await chromium.launchPersistentContext(path.join(temp, "profile"), {
            channel: "chromium", headless: true,
            args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`,
                "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost"]
        });
        const saved = [];
        await browser.route(/^https?:\/\//, route => {
            const url = new URL(route.request().url());
            if (url.hostname === "localhost") return route.continue();
            if (url.origin === heidiOrigin) return route.fulfill({ contentType: "text/html", body: heidiFixture() });
            if (url.origin !== wedaOrigin) return route.abort();
            if (url.pathname === "/test/antecedent") {
                saved.push(route.request().postData());
                return route.fulfill({ body: "OK" });
            }
            if (url.pathname.startsWith("/api/patients/")) {
                return route.fulfill({ json: { patientFileUrl: "/FolderMedical/PatientViewForm.aspx?PatDk=" + url.pathname.split("/").pop() } });
            }
            const pages = {
                "/FolderMedical/PatientViewForm.aspx": patientFixture(!url.searchParams.has("sansMenu")),
                "/FolderMedical/ConsultationForm.aspx": consultationFixture(),
                "/FolderMedical/PopUpHistoriqueForm.aspx": html('<div id="PanelPatient"><div></div><div></div><div></div><div></div><div><div class="sc"><div class="st"><span class="sm">Médicaux</span></div><div>Asthme [J45]</div>'
                    + saved.map(item => '<div>' + item.replaceAll("<", "&lt;") + '</div>').join("") + '</div></div></div>'),
                "/FolderMedical/AntecedentForm.aspx": antecedentFixture(),
                "/test/editeur": html('<script>document.body.contentEditable="true";window.events=0;document.body.oninput=()=>events++;</script><p>Texte déjà saisi.</p>'),
                "/test/confidentiel": html('<script>document.body.contentEditable="true";</script><p>Champ distinct.</p>')
            };
            return route.fulfill({ contentType: "text/html; charset=utf-8", body: pages[url.pathname] || html("") });
        });
        const worker = browser.serviceWorkers().find(w => w.url().endsWith("/src/background.js"))
            || await browser.waitForEvent("serviceworker", { predicate: w => w.url().endsWith("/src/background.js") });
        assert.equal(await worker.evaluate(async () => {
            const deadline = Date.now() + 5000;
            while (Date.now() < deadline) {
                const { defaultSettings, advancedDefaultSettings } = await chrome.storage.local.get(["defaultSettings", "advancedDefaultSettings"]);
                if (advancedDefaultSettings && defaultSettings?.heidiConsultationWorkflow === false) return true;
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            return false;
        }), true, "initialisation des options et des valeurs par défaut");
        const options = await browser.newPage();
        const optionErrors = [];
        options.on("pageerror", error => optionErrors.push(error.message));
        await options.goto(new URL("ui/options.html", worker.url()).href);
        await options.locator("#heidiConsultationWorkflow").waitFor({ state: "attached", timeout: 10000 }).catch(error => {
            throw new Error(error.message + "\nErreurs des options : " + optionErrors.join(" | "));
        });
        assert.equal(await options.locator("#heidiConsultationWorkflow").isChecked(), false);
        assert.equal(await options.locator("#heidiConsultationAnalysis").isChecked(), false);
        assert.ok(await options.locator("#heidiConsultationImagingPrompt").count());
        const heidiKeys = options.getByRole("group", { name: "Raccourcis Heidi" });
        const startShortcut = heidiKeys.locator("#heidi_start_recording");
        const stopShortcut = heidiKeys.locator("#heidi_stop_recording");
        assert.equal(await startShortcut.innerText(), "Alt+Shift+F8");
        assert.equal(await stopShortcut.innerText(), "Alt+Shift+F9");
        await startShortcut.click();
        await options.keyboard.press("PageUp");
        await heidiKeys.getByRole("button", { name: "PageUp", exact: true }).waitFor();
        await stopShortcut.click();
        await options.keyboard.press("PageUp");
        await heidiKeys.getByRole("status").filter({ hasText: "Ce raccourci est déjà utilisé" }).waitFor();
        await options.keyboard.press("Escape");
        assert.equal(await stopShortcut.innerText(), "Alt+Shift+F9");
        await stopShortcut.click();
        await options.keyboard.press("PageDown");
        await options.waitForFunction(async () => {
            const { shortcuts } = await chrome.storage.local.get("shortcuts");
            return shortcuts?.heidi_start_recording === "PageUp" && shortcuts?.heidi_stop_recording === "PageDown";
        });
        await options.reload();
        await heidiKeys.getByRole("button", { name: "PageUp", exact: true }).waitFor();
        await heidiKeys.getByRole("button", { name: "PageDown", exact: true }).waitFor();
        console.log("OK personnalisation Heidi dans les options, conflit refusé et choix conservés après rechargement");
        await options.close();
        await worker.evaluate(baseUrl => chrome.storage.local.set({
            heidiContextAccess: true, heidiConsultationWorkflow: true, heidiConsultationAnalysis: true,
            enableIAassistant: true, IAassistantBaseUrl: baseUrl, IAassistantModelName: "auto",
            heidiConsultationLetterPrompt: "CONSIGNE COURRIER DE TEST",
            heidiConsultationImagingPrompt: "CONSIGNE IMAGERIE DE TEST",
            TweakTabConsultation: false
        }), `http://localhost:${ai.address().port}/v1`);

        const heidi = await browser.newPage();
        const secondHeidi = await browser.newPage();
        await heidi.goto(heidiUrl);
        await secondHeidi.goto(heidiUrl + "?second");
        const weda = await browser.newPage();
        const launch = weda.getByRole("button", { name: "Démarrer Heidi", exact: true });
        const stop = weda.getByRole("button", { name: "Arrêter et transférer", exact: true });
        const editor = weda.frameLocator("#" + primaryId).locator("body");
        const state = weda.locator("#wh-heidi-consultation [role=status]");
        const dialog = weda.getByRole("dialog", { name: "Propositions Heidi" });
        await weda.goto(consultation);
        await editor.waitFor();
        await launch.waitFor();
        await worker.evaluate(() => chrome.storage.local.set({ heidiContextAccess: false }));
        await launch.click();
        await state.filter({ hasText: "Accès à Heidi" }).waitFor();
        assert.equal(await heidi.evaluate(() => counts.sessions), 0);
        await worker.evaluate(() => chrome.storage.local.set({ heidiContextAccess: true }));
        await weda.keyboard.press("PageUp");
        const tabPicker = weda.getByRole("combobox", { name: "Onglet Heidi" });
        await tabPicker.waitFor();
        assert.equal(await heidi.evaluate(() => counts.sessions), 0);
        const wantedId = await worker.evaluate(async url => (await getHeidiContextTabs()).find(tab => tab.url === url).id, heidiUrl);
        await tabPicker.selectOption(String(wantedId));
        await launch.click();
        await state.filter({ hasText: "Transcription Heidi en cours" }).waitFor();
        assert.deepEqual(await heidi.evaluate(() => counts), { sessions: 1, start: 1, stop: 0 });
        assert.equal(await secondHeidi.evaluate(() => counts.sessions), 0);
        await secondHeidi.close();
        await editor.focus();
        assert.equal(await weda.evaluate(() => document.activeElement.id), primaryId);
        await weda.keyboard.press("PageDown");
        await heidi.locator('body[data-stop-requested="true"]').waitFor();
        assert.equal(aiCalls.length, 0);
        await state.filter({ hasText: "1 antécédent(s) et 2 document(s)" }).waitFor({ timeout: 15000 });
        assert.deepEqual(await heidi.evaluate(() => counts), { sessions: 1, start: 1, stop: 1 });
        assert.equal(await heidi.locator('[aria-selected="true"]').getAttribute("id"), "note/nouvelle-1");
        const written = await editor.innerText();
        assert.match(written, /Texte déjà saisi/);
        assert.match(written, /radiographie du genou gauche/);
        assert.doesNotMatch(written, /SESSION ANTÉRIEURE|Texte en cours/);
        assert.ok(written.includes(marker));
        assert.equal(await editor.locator("img").count(), 0);
        assert.equal(await editor.evaluate(body => body.ownerDocument.defaultView.events), 1);
        assert.equal(await weda.frameLocator("#" + confidentialId).locator("body").innerText(), "Champ distinct.");
        assert.equal(await weda.evaluate(() => saves), 0);
        assert.equal(aiCalls[0].model, "modele-fictif");
        assert.equal(aiCalls[0].tools, undefined);
        assert.match(aiCalls[0].messages[1].content, /Asthme/);
        assert.equal(aiCalls.length, 1, "aucun brouillon généré automatiquement");
        const directRead = await worker.evaluate(tabId => readHeidiPageContext({ tabId }), wantedId);
        assert.match(directRead.transcript, /radiographie du genou gauche/);
        assert.equal(directRead.note, "Note fictive");
        assert.deepEqual(await heidi.evaluate(() => counts), { sessions: 1, start: 1, stop: 1 });
        await weda.keyboard.press("PageDown");
        await state.filter({ hasText: "La transcription est déjà dans la consultation" }).waitFor();
        assert.equal(await editor.innerText(), written);
        assert.equal(aiCalls.length, 1);
        console.log("OK options, accès refusé, choix de l’onglet, raccourcis, fin Heidi, insertion dans le champ courant et analyse");

        const review = weda.getByRole("button", { name: "Voir les propositions" });
        await review.click();
        await dialog.waitFor();
        assert.doesNotMatch(await dialog.innerText(), /À écarter|Source absente/);
        for (const [title, expectedPrompt] of [
            ["Avis cardiologique", "CONSIGNE COURRIER DE TEST"],
            ["Radiographie genou gauche", "CONSIGNE IMAGERIE DE TEST"]
        ]) {
            await dialog.locator("article").filter({ hasText: title }).getByRole("button", { name: "Rédiger le brouillon" }).click();
            const draft = weda.getByRole("textbox", { name: "Brouillon à relire" });
            await draft.waitFor();
            assert.match(await draft.inputValue(), /Brouillon fictif/);
            assert.match(aiCalls.at(-1).messages[0].content, new RegExp(expectedPrompt));
            await draft.fill("Brouillon relu et modifié.");
            await weda.getByRole("button", { name: "Retour aux propositions" }).click();
            await dialog.locator("article").filter({ hasText: title }).getByRole("button", { name: "Revoir le brouillon" }).click();
            assert.equal(await draft.inputValue(), "Brouillon relu et modifié.");
            await weda.getByRole("button", { name: "Retour aux propositions" }).click();
        }
        assert.equal(aiCalls.length, 3);
        assert.deepEqual(saved, []);
        console.log("OK brouillons distincts à la demande, prompts personnalisés et modifications conservées");

        const prepare = dialog.getByRole("button", { name: "Préparer l’ajout dans Weda" });
        const native = weda.frameLocator("#WedaHelperAntecedentIframe");
        await prepare.click();
        const field = native.getByRole("textbox", { name: "Antécédent" });
        await field.waitFor();
        assert.equal(await field.inputValue(), "Appendicectomie");
        assert.deepEqual(saved, []);
        await native.getByRole("button", { name: "Annuler" }).click();
        await state.filter({ hasText: "Ajout annulé" }).waitFor();
        await review.click();
        await prepare.click();
        await field.waitFor();
        await native.getByRole("button", { name: "Valider", exact: true }).click();
        await state.filter({ hasText: "Ajout retrouvé dans le dossier" }).waitFor();
        assert.deepEqual(saved, ["Appendicectomie"]);
        await review.click();
        assert.equal(await prepare.count(), 0);
        await dialog.getByRole("button", { name: "Fermer" }).click();
        console.log("OK formulaire natif, annulation, validation et relecture de l’antécédent ajouté");

        await weda.goto(consultation);
        await launch.click();
        await state.filter({ hasText: "Transcription Heidi en cours" }).waitFor();
        await heidi.evaluate(() => window.switchSession("autre"));
        await stop.click();
        await state.filter({ hasText: "La session Heidi a changé" }).waitFor();
        assert.equal(await heidi.evaluate(() => counts.stop), 1);
        assert.doesNotMatch(await editor.innerText(), /Transcription Heidi/);
        console.log("OK changement de session Heidi : aucun arrêt ni collage sur la session étrangère");

        await heidi.goto(heidiUrl);
        await weda.goto(consultation);
        await launch.click();
        await state.filter({ hasText: "Transcription Heidi en cours" }).waitFor();
        await stop.click();
        await heidi.locator('body[data-stop-requested="true"]').waitFor();
        await weda.evaluate(() => history.replaceState(null, "", "?PatDk=202&Evenement=2"));
        await state.filter({ hasText: "La consultation a changé" }).waitFor();
        assert.doesNotMatch(await editor.innerText(), /Transcription Heidi/);
        assert.equal(aiCalls.length, 3);
        console.log("OK changement de patient Weda pendant l’attente : aucun collage ni appel IA");

        malformedAI = true;
        await heidi.goto(heidiUrl);
        await weda.goto(consultation);
        await launch.click();
        await state.filter({ hasText: "Transcription Heidi en cours" }).waitFor();
        await stop.click();
        await state.filter({ hasText: "Réponse IA illisible" }).waitFor();
        assert.equal((await editor.innerText()).split("Transcription Heidi").length - 1, 1);
        assert.equal(await review.isVisible(), false);
        assert.equal(await weda.getByRole("button", { name: "Relancer l’analyse" }).isVisible(), true);
        console.log("OK réponse IA invalide : transcription conservée et analyse relançable");

        const requestsBeforeOptOut = aiCalls.length;
        await worker.evaluate(() => chrome.storage.local.set({ heidiConsultationAnalysis: false }));
        await heidi.goto(heidiUrl);
        await weda.goto(consultation);
        await launch.click();
        await state.filter({ hasText: "Transcription Heidi en cours" }).waitFor();
        await stop.click();
        await state.filter({ hasText: "Transcription ajoutée. Activez l’analyse Heidi" }).waitFor();
        assert.match(await editor.innerText(), /Transcription Heidi/);
        assert.equal(aiCalls.length, requestsBeforeOptOut);
        assert.equal(await review.isVisible(), false);
        console.log("OK transfert possible sans activer l’analyse et sans appel IA");

        await heidi.goto(heidiUrl);
        await weda.goto(patient);
        await launch.waitFor({ timeout: 6000 });
        await weda.keyboard.press("PageUp");
        await state.filter({ hasText: "Transcription Heidi en cours" }).waitFor();
        assert.equal(weda.url(), patient);
        assert.deepEqual(await heidi.evaluate(() => counts), { sessions: 1, start: 1, stop: 0 });
        await weda.keyboard.press("PageDown");
        await weda.waitForURL(consultation);
        await state.filter({ hasText: "Transcription ajoutée. Activez l’analyse Heidi" }).waitFor();
        assert.deepEqual(await heidi.evaluate(() => counts), { sessions: 1, start: 1, stop: 1 });
        assert.equal((await editor.innerText()).split("Transcription Heidi").length - 1, 1);
        assert.equal(await weda.evaluate(() => saves), 0);
        console.log("OK raccourcis personnalisés depuis la fiche, arrêt puis ouverture native et transfert unique");

        await worker.evaluate(async () => {
            const { shortcuts } = await chrome.storage.local.get("shortcuts");
            delete shortcuts.heidi_start_recording;
            delete shortcuts.heidi_stop_recording;
            await chrome.storage.local.set({ shortcuts });
        });
        await heidi.goto(heidiUrl);
        await weda.goto(patient + "&sansMenu=1");
        await launch.waitFor();
        await weda.keyboard.press("Alt+Shift+F8");
        await state.filter({ hasText: "Transcription Heidi en cours" }).waitFor();
        await weda.keyboard.press("Alt+Shift+F9");
        await state.filter({ hasText: "Ouvrez une consultation de ce patient" }).waitFor();
        await weda.goto(consultation.replace("PatDk=101", "PatDk=202"));
        await state.filter({ hasText: "autre patient" }).waitFor();
        assert.doesNotMatch(await editor.innerText(), /Transcription Heidi/);
        await weda.goto(consultation);
        await state.filter({ hasText: "Transcription ajoutée. Activez l’analyse Heidi" }).waitFor();
        assert.equal((await editor.innerText()).split("Transcription Heidi").length - 1, 1);
        assert.equal(await heidi.evaluate(() => counts.stop), 1);
        assert.equal(aiCalls.length, requestsBeforeOptOut);
        console.log("OK touches par défaut, menu absent : aucun transfert vers un autre patient, reprise sur le dossier d’origine");
    } finally {
        if (browser) await browser.close();
        await new Promise(resolve => ai.close(resolve));
        assert.equal(path.dirname(path.resolve(temp)), path.resolve(os.tmpdir()));
        assert.ok(path.basename(temp).startsWith("weda-heidi-consultation-"));
        fs.rmSync(temp, { recursive: true, force: true });
    }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
