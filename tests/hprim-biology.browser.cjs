// Extension réelle, Weda et serveur IA simulés. Aucun dossier réel.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const origin = "https://secure.weda.fr";
const url = origin + "/FolderMedical/HprimForm.aspx";
const patient = origin + "/FolderMedical/PatientViewForm.aspx?PatDk=101";
const prefix = "ContentPlaceHolder1_";
const date = "03/11/2026";
const birth = "05/05/1980";
const prompt = "Préférence fictive : inclure HDL.\nConserver la deuxième ligne.";
const numeric = [
    ["CRP", "14", "mg/L", "", "5"],
    ["HbA1c", "7,1", "%", "4", "6"],
    ["Hémoglobine glyquée", "54", "mmol/mol", "20", "42"],
    ["HDL", "0,58", "g/L", "0,4", "1"]
];
const documents = [
    { id: "a", name: "Exemplealpha", type: "Biologie", rows: numeric },
    { id: "b", name: "Exemplealpha", type: "Biologie", raw: "Diagnostic histologique :\nAbsence de dysplasie.\nSignature : laboratoire fictif." },
    { id: "c", name: "Exemplegamma", type: "Biologie", rows: [["CRP", "9", "mg/L", "", "5"], ["CRP", "15", "mg/L", "", "5"]] }
];
const titles = new Map([["c", "Titre déjà saisi dans Weda"]]), requests = [];
const opened = [], assignments = [], titlePosts = [];
let assignMode = "reject", fullOpen = false, pageLoads = 0;
let holdNextAnalysis;
const titleName = "ctl00$ContentPlaceHolder1$TextBoxHprimTitre";
const openTarget = index => "ctl00$ContentPlaceHolder1$HprimsGrid$ctl" +
    String(index + 2).padStart(2, "0") + "$LinkButtonHprimNom";
const esc = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const cells = (rows, inbox = false) => "<table class=hprimgrid><tbody>" +
    [["Libellé", "Valeur", "Unité", "Minimum", "Maximum"], ...rows].map(row =>
        "<tr>" + (inbox ? "<td></td>" : "") + row.map(value => "<td>" + esc(value) + "</td>").join("") + "</tr>").join("") + "</tbody></table>";
function reportView(item) {
    const header = "Patient HPRIM : " + item.name + " Camille · Date de naissance : " + birth + "\nDate du résultat : " + date;
    const result = item.rows ?
        '<div id="' + prefix + 'LabelHprimDataStructure"><div>' + esc(header) + "</div>" + cells(item.rows, true) + "</div>" :
        '<pre id="' + prefix + 'DivDataHprim">' + esc(header + "\n" + item.raw) + "</pre>";
    return result + '<input maxlength="350" id="' + prefix + 'TextBoxHprimTitre" name="' + titleName + '" value="' +
        esc(titles.get(item.id) || "") + '" onchange="window.__doPostBack(this.name)"><div id="' + prefix + 'PatientsGrid"><button type="button" id="' + prefix +
        'PatientsGrid_ButtonHistoriqueResultat_0" onclick="fakeHistory(this)">Historique</button>' +
        '<input type="submit" id="' + prefix + 'PatientsGrid_ButtonAffecteResultat_0" name="ctl00$ContentPlaceHolder1$PatientsGrid$ctl02$ButtonAffecteResultat"' +
        ' value="Affecter ce résultat" onclick="return confirm(\'Affecter ce résultat ?\')"></div>';
}
function inboxGrid(selected) {
    const grid = documents.map((item, index) => '<tr data-record="' + item.id + '"' +
        (selected === item.id ? ' class="grid-selecteditem"' : "") + "><td>" + date + "</td><td>" + item.type +
        '</td><td><a id="' + prefix + "HprimsGrid_LinkButtonHprimNom_" + index +
        '" href="javascript:WebForm_DoPostBackWithOptions(new WebForm_PostBackOptions(\'' +
        openTarget(index) + '\',\'\',true,\'\',\'\',false,true))">' + item.name + "</a></td><td>Camille</td><td>" +
        birth + "</td><td>ZZ</td></tr>").join("");
    return '<table id="' + prefix + 'HprimsGrid"><tbody>' + grid + '</tbody></table>';
}
function inbox(selected) {
    const item = documents.find(item => item.id === selected);
    return `<!doctype html><meta charset="utf-8">
<style>
    #${prefix}HprimsGrid td { white-space: nowrap; }
    #${prefix}HprimsGrid td a { display: inline-block; width: 100%; }
</style>
<form method="post">
    <input type="hidden" name="kind"><input type="hidden" name="record">
    <div id="${prefix}UpdatePanelHprimsGrid">${inboxGrid(selected)}</div>
    <div id="fixture-report">${item ? reportView(item) : ""}</div>
    <div id="fixture-history"></div>
    <div id="fixture-message"></div>
</form>
<script>
    window.weda = { wedaHelper: {}, capabilities: {} };
    const form = document.forms[0];
    const begin = new Set(), end = new Set();
    let active = false;
    window.Sys = { WebForms: { PageRequestManager: { getInstance: () => ({
        get_isInAsyncPostBack: () => active,
        add_beginRequest: fn => begin.add(fn), remove_beginRequest: fn => begin.delete(fn),
        add_endRequest: fn => end.add(fn), remove_endRequest: fn => end.delete(fn)
    }) } } };
    async function command(kind, element, record, title, postbackTarget = "") {
        const request = { get_body: () => new URLSearchParams({ __EVENTTARGET: postbackTarget }).toString() };
        // L'ouverture peut aboutir sans événement exploitable par PageRequestManager.
        if (kind === "history") {
            for (const listener of begin) listener(null, { get_postBackElement: () => element, get_request: () => request });
        }
        active = true;
        let error;
        try {
            const formTitle = new FormData(form).get("${titleName}");
            const response = await fetch("?fixture=async", { method: "POST", body: JSON.stringify({ kind, record, title, formTitle }) });
            const body = await response.json();
            if (body.full) {
                form.elements.kind.value = kind;
                form.elements.record.value = record;
                form.submit();
                return;
            }
            if (kind === "open") {
                document.querySelectorAll("[data-record]").forEach(row => row.classList.toggle("grid-selecteditem", row.dataset.record === record));
                // La sélection arrive avant le nouveau compte rendu, y compris pour un même patient.
                await new Promise(resolve => setTimeout(resolve, 75));
                document.getElementById("fixture-report").innerHTML = body.html;
                if (formTitle === null && record === "b") {
                    // Le panneau est visible, mais Weda termine encore cette réponse.
                    await new Promise(resolve => setTimeout(resolve, 180));
                }
            } else if (kind === "history") document.getElementById("fixture-history").innerHTML = body.html;
            else if (kind === "assign") {
                document.getElementById("fixture-message").textContent = body.grid ? "" : "Affectation refusée";
                // La liste peut être actualisée avant le panneau du compte rendu.
                if (body.grid) document.getElementById("${prefix}UpdatePanelHprimsGrid").innerHTML = body.grid;
            }
        } catch (cause) { error = cause; }
        active = false;
        if (kind !== "open") {
            for (const listener of end) listener(null, {
                get_error: () => error, get_response: () => ({ get_webRequest: () => request })
            });
        }
    }
    function selected() { return document.querySelector(".grid-selecteditem")?.dataset.record; }
    // Comme dans Weda, le nom WebForms du contrôle n'est pas l'ID du lien dans le DOM.
    window.WebForm_PostBackOptions = function (eventTarget) { this.eventTarget = eventTarget; };
    window.WebForm_DoPostBackWithOptions = ({ eventTarget }) => {
        const index = Number(eventTarget.split("$").at(-2).slice(3)) - 2;
        const record = document.getElementById("${prefix}HprimsGrid_LinkButtonHprimNom_" + index)?.closest("tr")?.dataset.record;
        setTimeout(() => command("open", null, record, undefined, eventTarget), 0);
    };
    window.fakeHistory = element => command("history", element, selected());
    window.__doPostBack = target => {
        const input = document.querySelector('[name="' + target + '"]');
        const record = selected(), title = input.value;
        setTimeout(() => command("title", null, record, title, target), 0);
    };
    form.addEventListener("submit", event => {
        if (!event.submitter?.id.includes("ButtonAffecteResultat_")) return;
        const record = selected();
        if (form.dataset.fullAssignment) {
            form.elements.kind.value = "assign";
            form.elements.record.value = record;
        } else {
            event.preventDefault();
            command("assign", event.submitter, record);
        }
    });
</script>`;
}
const history = '<div id="PanelHistoriqueSuivi"><table id="HistoriqueSuiviGrid"><tbody>' +
    '<tr><td>CRP :</td><td>03/11/2026 : 99 mg/L  02/11/2026 : 4 mg/L</td></tr>' +
    '</tbody></table><button type="button" onclick="this.parentElement.remove()">Fermer</button></div>';
function assignReport(record, title) {
    assignments.push({ record, title });
    const index = documents.findIndex(item => item.id === record);
    if (assignMode === "reject" || index < 0) return false;
    titles.set(record, title);
    documents.splice(index, 1);
    return true;
}
function dossier() {
    return '<!doctype html><meta charset=utf-8><script>window.weda={wedaHelper:{},capabilities:{}};</script>' +
        '<div class="sc"><span title="Cliquez sur la date pour ouvrir.">' + date + "</span>" + cells(numeric) + "</div>" +
        '<div class="sc"><span title="Cliquez sur la date pour ouvrir.">02/11/2026</span>' + cells([["CRP", "4", "mg/L", "", "5"]]) + "</div>";
}

const api = http.createServer((req, res) => {
    const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
    if (req.method === "OPTIONS") { res.writeHead(204, headers).end(); return; }
    if (req.method === "GET") { res.writeHead(200, headers).end('{"data":[{"id":"hprim-test"}]}'); return; }
    let raw = "";
    req.on("data", chunk => { raw += chunk; });
    req.on("end", () => {
        const request = JSON.parse(raw);
        requests.push(request);
        const rows = JSON.parse(request.messages.at(-1).content);
        const indices = rows.filter(row => row.examen === "HDL").map(row => row.indice);
        const reply = () => res.writeHead(200, headers).end(JSON.stringify({ choices: [{ finish_reason: "stop",
            message: { content: JSON.stringify({ indices }) } }] }));
        if (holdNextAnalysis) {
            const hold = holdNextAnalysis;
            holdNextAnalysis = null;
            hold(reply);
        } else reply();
    });
});

async function run() {
    const root = path.join(__dirname, "..");
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "weda-hprim-test-"));
    const extension = path.join(temp, "extension");
    let browser;
    try {
        await new Promise(resolve => api.listen(0, "127.0.0.1", resolve));
        fs.cpSync(root, extension, { recursive: true, filter: source => ![".git", ".github", "tests"].includes(path.basename(source)) });
        browser = await chromium.launchPersistentContext(path.join(temp, "profile"), {
            channel: "chromium", headless: true, acceptDownloads: true,
            args: ["--disable-extensions-except=" + extension, "--load-extension=" + extension,
                "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1"]
        });
        await browser.route(origin + "/**", async route => {
            const req = route.request(), address = new URL(req.url());
            if (req.url() === patient) return route.fulfill({ contentType: "text/html; charset=utf-8", body: dossier() });
            if (address.pathname !== new URL(url).pathname) return route.fulfill({ status: 404, body: "" });
            if (address.searchParams.get("fixture") === "async") {
                const { kind, record, title, formTitle } = JSON.parse(req.postData());
                let response;
                if (kind === "open") {
                    opened.push({ record, formTitle });
                    response = fullOpen ? { full: true } : { html: reportView(documents.find(item => item.id === record)) };
                    fullOpen = false;
                } else if (kind === "history") response = { html: history };
                else if (kind === "assign") response = { grid: assignReport(record, formTitle) ? inboxGrid(null) : null };
                else {
                    titlePosts.push({ record, title });
                    response = {};
                }
                return route.fulfill({ json: response });
            }
            let selected = documents[0]?.id;
            if (req.method() === "POST") {
                const fields = new URLSearchParams(req.postData());
                selected = fields.get("record");
                if (fields.get("kind") === "assign" && assignReport(selected, fields.get(titleName))) {
                    selected = null;
                }
            }
            if (req.isNavigationRequest()) pageLoads++;
            return route.fulfill({ contentType: "text/html; charset=utf-8", body: inbox(selected) });
        });
        const background = worker => worker.url().endsWith("/src/background.js");
        const worker = browser.serviceWorkers().find(background) || await browser.waitForEvent("serviceworker", { predicate: background });
        await worker.evaluate(async ({ endpoint, prompt }) => {
            await chrome.storage.local.set({
                enableHprimBiologyAnalysis: true, enableIAassistant: true, hprimBiologyAuto: false, hprimBiologyPrompt: prompt,
                IAassistantModelName: "hprim-test", IAassistantBaseUrl: endpoint, IAassistantUseSecondProfile: false,
                firstStart: true, lastExtensionVersion: chrome.runtime.getManifest().version
            });
        }, { endpoint: "http://localhost:" + api.address().port + "/v1", prompt });

        const page = await browser.newPage();
        page.setDefaultTimeout(11000);
        if (process.env.HPRIM_TEST_DEBUG) {
            page.on("pageerror", error => console.error("Page:", error.message));
            page.on("console", message => console.error("Chromium:", message.text().slice(0, 330)));
        }
        await page.goto(url);
        const tools = page.getByRole("region", { name: "Analyse des biologies" });
        const state = tools.getByRole("status");
        const play = tools.getByRole("button", { name: "Analyser toutes les biologies" });
        const auto = tools.getByRole("button", { name: "Analyse automatique des biologies" });
        const stop = tools.getByRole("button", { name: "Arrêter l’analyse" });
        const select = record => page.locator('[data-record="' + record + '"] a').click();
        const titleSelector = "#" + prefix + "TextBoxHprimTitre";
        const proposal = page.locator(titleSelector);
        const waitTitle = text => page.waitForFunction(({ selector, text }) => document.querySelector(selector)?.value.includes(text),
            { selector: titleSelector, text });
        const active = () => page.locator(".grid-selecteditem").getAttribute("data-record");
        const affect = page.getByRole("button", { name: "Affecter ce résultat", exact: true });
        const waitStatus = (pattern, options) => state.filter({ hasText: pattern }).waitFor({ state: "attached", ...options });
        await tools.waitFor();
        assert.deepEqual(await tools.getByRole("button").allTextContents(), ["▶️", "🔁", "⏹️"]);
        assert.ok(await stop.isDisabled());

        // Force un vrai rechargement au milieu de la file pour vérifier sa reprise.
        fullOpen = true;
        await play.click();
        await waitStatus(/Analyse terminée.*Aucun titre proposé pour 1 bilan/);
        assert.equal(await page.locator(".wh-hprim-badge, .wh-hprim-card").count(), 0);
        assert.equal(assignments.length, 0);
        assert.ok(pageLoads >= 2);
        assert.equal(await active(), "a");
        await waitTitle("HDL");
        await select("c");
        await waitTitle(titles.get("c"));
        assert.equal(await proposal.inputValue(), titles.get("c"));
        await select("b");
        await waitTitle("Anapath");
        assert.equal(await proposal.inputValue(), "Anapath : Absence de dysplasie.");
        await select("a");
        await waitTitle("HDL");
        assert.deepEqual(opened.at(-1), { record: "a", formTitle: "" });
        const title = await proposal.inputValue();
        assert.match(title, /CRP ↑ 14 mg\/L \[4 mg\/L le 02\/11\/2026\]/);
        assert.equal((title.match(/HbA1c/g) || []).length, 1);
        assert.ok(requests[0].messages[0].content.includes(prompt));
        assert.doesNotMatch(JSON.stringify(requests), /Exemplealpha|05\/05\/1980|02\/11\/2026|dysplasie/);
        console.log("OK lot, reprise après rechargement, doublon, antériorité, anapath, prompt appliqué");

        await proposal.fill("Titre corrigé manuellement < 5");
        await proposal.press("Tab");
        await select("b");
        await waitTitle("Anapath");
        assert.equal(titlePosts.length, 0);
        assert.equal(assignments.length, 0);
        assert.deepEqual(opened.at(-1), { record: "b", formTitle: "" });
        await select("a");
        await waitTitle("Titre corrigé manuellement < 5");
        const editedTitle = "Titre relu avant validation < 5";
        await proposal.fill(editedTitle);
        const beforeAssign = opened.length;
        page.once("dialog", dialog => dialog.dismiss());
        await affect.click();
        assert.equal(assignments.length, 0);
        assert.equal(await active(), "a");
        assert.equal(await proposal.inputValue(), editedTitle);

        page.once("dialog", dialog => dialog.accept());
        await affect.click();
        await waitStatus(/n’a pas confirmé l’affectation/, { timeout: 18000 });
        assert.equal(await active(), "a");
        assert.equal(opened.length, beforeAssign);
        assert.deepEqual(assignments, [{ record: "a", title: editedTitle }]);
        assert.equal(titles.has("a"), false);
        assert.equal(await proposal.inputValue(), editedTitle);

        const finalTitle = "Titre transmis < 5";
        await proposal.evaluate((input, value) => { input.value = value; }, finalTitle);
        assignMode = "accept";
        page.once("dialog", dialog => dialog.accept());
        await affect.click();
        await waitStatus(/Bilan suivant affiché/);
        assert.equal(await active(), "b");
        assert.equal(assignments.length, 2);
        assert.equal(titles.get("a"), finalTitle);
        assert.deepEqual(opened.slice(beforeAssign), [{ record: "b", formTitle: null }]);
        await waitTitle("Anapath");

        const fullTitle = "Anapath : conclusion relue";
        await worker.evaluate(title => {
            const write = chrome.storage.session.set.bind(chrome.storage.session);
            let delayed = false;
            chrome.storage.session.set = async entries => {
                const state = Object.values(entries)[0];
                if (!delayed && !state?.assignment && state?.drafts?.some(([, draft]) => draft.title === title)) {
                    // L'écriture liée à la sortie du champ peut durer plus longtemps que la navigation.
                    delayed = true;
                    await new Promise(resolve => setTimeout(resolve, 900));
                }
                return write(entries);
            };
        }, fullTitle);
        await affect.evaluate(button => { button.form.dataset.fullAssignment = "true"; });
        await proposal.fill(fullTitle);
        const beforeFull = pageLoads;
        page.once("dialog", dialog => dialog.accept());
        await Promise.all([page.waitForEvent("load"), affect.click()]);
        await waitStatus(/Bilan suivant affiché/);
        assert.equal(await active(), "c");
        assert.equal(pageLoads, beforeFull + 1);
        assert.equal(assignments.length, 3);
        assert.equal(titlePosts.length, 0);
        assert.equal(titles.get("b"), fullTitle);
        assert.deepEqual(opened.at(-1), { record: "c", formTitle: null });
        console.log("OK titre transmis par le bouton natif, annulation et refus sans changement de bilan");
        console.log("OK bilan suivant après affectation AJAX ou rechargement complet, même avec deux lignes identiques");

        await auto.click();
        await tools.getByRole("button", { name: "Analyse automatique des biologies", pressed: true }).waitFor();
        assert.equal(await auto.evaluate(button => getComputedStyle(button).backgroundColor), "rgb(76, 175, 80)");
        const before = requests.length;
        const inFlight = new Promise((resolve, reject) => {
            holdNextAnalysis = resolve;
            AbortSignal.timeout(11000).addEventListener("abort", () => reject(new Error("Aucune analyse à arrêter.")));
        });
        documents.push({ id: "d", name: "Exempledelta", type: "Biologie", rows: [["TSH", "2", "mUI/L", "1", "4"]] });
        assert.equal(await page.locator('[data-record="d"]').count(), 0);
        await page.evaluate(() => window.dispatchEvent(new Event("focus")));
        const reply = await inFlight;
        await stop.click();
        reply();
        await waitStatus(/^Analyse arrêtée/);
        await play.and(page.locator("button:enabled")).waitFor();
        assert.equal(await auto.getAttribute("aria-pressed"), "true");
        assert.ok(await stop.isDisabled());
        assert.equal(requests.length, before + 1);
        await page.reload();
        await tools.getByRole("button", { name: "Analyse automatique des biologies", pressed: true }).waitFor();

        documents.push({ id: "e", name: "Exempleepsilon", type: "Biologie", rows: [["TSH", "3", "mUI/L", "1", "4"]] });
        await page.evaluate(() => window.dispatchEvent(new Event("focus")));
        await waitStatus(/Analyse terminée/);
        await select("e");
        await waitTitle("TSH N 3 mUI/L");
        assert.equal(requests.length, before + 2);
        await select("d");
        await page.waitForFunction(selector => document.querySelector(".grid-selecteditem")?.dataset.record === "d" &&
            document.querySelector(selector)?.value === "", titleSelector);
        // Reprendre dès le changement de sélection, avant la fin du chargement du compte rendu.
        await play.click();
        await waitStatus(/Analyse terminée/);
        await waitTitle("TSH N 2 mUI/L");
        assert.equal(requests.length, before + 3);
        assert.equal(assignments.length, 3);
        await page.reload();
        await tools.getByRole("button", { name: "Analyse automatique des biologies", pressed: true }).waitFor();
        assert.equal(requests.length, before + 3);
        assert.equal(assignments.length, 3);
        await auto.click();
        await page.reload();
        await tools.getByRole("button", { name: "Analyse automatique des biologies", pressed: false }).waitFor();
        console.log("OK trois icônes, arrêt sans relance, mode automatique persistant et reprise manuelle");

        await select("e");
        await waitTitle("TSH N 3 mUI/L");
        const beforeLast = opened.length;
        page.once("dialog", dialog => dialog.accept());
        await affect.click();
        await waitStatus(/^Bilan affecté dans Weda\.$/);
        assert.equal(await page.locator('[data-record="e"]').count(), 0);
        assert.equal(opened.length, beforeLast);

        const view = await browser.newPage();
        view.setDefaultTimeout(10000);
        await view.goto(patient);
        const card = view.locator(".wh-hprim-card").first();
        await card.locator("summary").press("Enter");
        assert.match(await card.innerText(), /Précédent : 4 mg\/L le 02\/11\/2026/);
        assert.equal(await view.locator("table.hprimgrid").count(), 2);
        const options = await browser.newPage();
        options.setDefaultTimeout(10000);
        options.on("dialog", dialog => dialog.accept());
        let clipboard = "";
        await options.exposeFunction("writeFixtureClipboard", value => { clipboard = value; });
        await options.exposeFunction("readFixtureClipboard", () => clipboard);
        await options.addInitScript(() => Object.defineProperty(navigator, "clipboard", {
            value: { writeText: window.writeFixtureClipboard, readText: window.readFixtureClipboard }
        }));
        await options.goto(new URL("ui/options.html", worker.url()).href);
        await options.waitForFunction(value => document.querySelector("#hprimBiologyPrompt")?.value === value, prompt);
        const download = options.waitForEvent("download");
        await options.getByRole("button", { name: /Copier\/Sauv\. param\./ }).evaluate(button => button.click());
        const backup = JSON.parse(fs.readFileSync(await (await download).path(), "utf8"));
        assert.equal(backup.hprimBiologyPrompt, prompt);
        await worker.evaluate(() => chrome.storage.local.remove("hprimBiologyPrompt"));
        const restored = options.waitForEvent("load");
        await options.getByRole("button", { name: /Coller paramètres/ }).evaluate(button => button.click());
        await restored;
        await options.waitForFunction(value => document.querySelector("#hprimBiologyPrompt")?.value === value, prompt);
        console.log("OK fiche dans le dossier, prompt multiligne exporté et réimporté");
    } finally {
        if (browser) await browser.close();
        if (api.listening) await new Promise(resolve => api.close(resolve));
        assert.equal(path.dirname(path.resolve(temp)), path.resolve(os.tmpdir()));
        assert.ok(path.basename(temp).startsWith("weda-hprim-test-"));
        fs.rmSync(temp, { recursive: true, force: true });
    }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
