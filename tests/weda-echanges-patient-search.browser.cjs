"use strict";

// Extension réelle, site Weda fictif et aucun accès réseau externe.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const origin = "https://secure.weda.fr";
const exchanges = origin + "/FolderMedical/WedaEchanges/";
const testData = "Nom d’usage : LENOIR\nNom de naissance : VIOLET\nPrénom : Anne-Marie\nNée le 9-2-1947";
const prefix = "ContentPlaceHolder1_FindPatientUcForm1_";

function samplePdf(scenario) {
    const text = scenario === "conflict" ? "Date de naissance 10/02/1947"
        : scenario.startsWith("scan-") ? ""
            : "Rapport fictif destine aux tests. Texte du courrier sans identite patient. "
                + "Le rapport mentionne une date de publication 14/07/1900, qui ne constitue pas une date de naissance.";
    const stream = "BT /F1 11 Tf 45 780 Td (" + text + ") Tj ET";
    const objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 1400 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        "<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream"
    ];
    let pdf = "%PDF-1.4\n%" + scenario + "\n";
    const offsets = objects.map((object, index) => {
        const offset = pdf.length;
        pdf += (index + 1) + " 0 obj\n" + object + "\nendobj\n";
        return offset;
    });
    const xref = pdf.length;
    pdf += "xref\n0 6\n0000000000 65535 f \n"
        + offsets.map(offset => String(offset).padStart(10, "0") + " 00000 n \n").join("")
        + "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF\n";
    return Buffer.from(pdf);
}

function setupWeda(prefix) {
    window.weda = { wedaHelper: {}, capabilities: {} };
    const test = window.fixture = { requests: [], picks: [], validations: 0, done: 0, responses: 0, allowMatch: false };
    const scenario = new URL(location.href).searchParams.get("test");
    const panel = document.getElementById(prefix + "PanelFindPatient");
    const good = ["correct", "LENOIR Anne", "09/02/1947", "VIOLET"];
    const stale = ["stale", "LENOIR Anne-Marie", "09/02/1947", "VIOLET"];
    const wrong = ["wrong", "LENOIR Anne-Marie", "09/02/1948", "VIOLET"];
    const names = { Prenom: "Recherche par prénom", Nom: "Recherche par noms, prénoms, nom de naissance", Naissance: "Recherche par date de naissance" };
    function renderResults(rows) {
        document.getElementById("results").innerHTML = '<span id="' + prefix + 'LabelPatientCount">' + rows.length + '</span>'
            + (!rows.length ? "" : '<table id="' + prefix + 'PatientsGridOld"><tbody>' + rows.map(([id, name, date, alternate], n) =>
                '<tr><td><a href="#" data-result="' + id + '" id="' + prefix + 'PatientsGridOld_LinkButtonPatientGetNomPrenom_' + n + '">'
                + name + '</a></td><td><a id="' + prefix + 'LinkButtonOldPatienDateNaissance_' + n + '">' + date
                + '</a></td><td><a id="' + prefix + 'LinkButtonOldPatientNomJeuneFille_' + n + '">' + alternate + '</a></td></tr>'
            ).join("") + "</tbody></table>");
        document.querySelectorAll("[data-result]").forEach(link => link.onclick = event => {
            event.preventDefault();
            test.picks.push(link.dataset.result);
            panel.hidden = true;
        });
    }
    function renderMode(type) {
        const date = type === "Naissance";
        const fields = document.getElementById("fields");
        fields.innerHTML = '<select id="' + prefix + 'DropDownListRechechePatient"><option>Prenom</option><option>Nom</option><option>Naissance</option></select>'
            + '<input id="' + prefix + (date ? 'TextBoxRecherchePatientByDate' : 'TextBoxRecherche') + '">'
            + (date ? '<input id="' + prefix + 'TextBoxNomForDN" value="Ancien filtre"><input id="' + prefix + 'TextBoxPrenomForDN" value="Ancien prénom">' : "")
            + '<button id="' + prefix + 'ButtonRecherchePatient" title="' + names[type] + '">Rechercher</button>';
        fields.querySelector("select").value = type;
        fields.querySelector("select").onchange = event => {
            const next = event.target.value;
            setTimeout(() => renderMode(next), 260);
        };
        fields.querySelector("button").onclick = () => {
            const query = fields.querySelector("input").value;
            const filters = [...fields.querySelectorAll("input")].slice(1).map(input => input.value);
            test.requests.push({ type, query, filters });
            let rows = [];
            if (scenario === "alternate" && type === "Nom" && query === "VIOLET") rows = [wrong, good];
            if (scenario === "retry" && date && test.allowMatch) rows = [good];
            if (scenario === "homonym") rows = [good, ["homonym", ...good.slice(1)]];
            if (scenario === "switch" || scenario.startsWith("scan-")) rows = [good];
            // Pendant ce délai, Weda montre toujours le tableau précédent.
            setTimeout(() => { renderResults(rows); test.responses++; }, 1000);
        };
    }
    renderMode("Prenom");
    renderResults([stale]);
    document.querySelector(".importPatient").onclick = () => {
        setTimeout(() => { panel.hidden = false; }, 720);
    };
    document.querySelector(".otherMessage").onclick = () => {
        document.querySelector(".messageListItem.selected").classList.remove("selected");
        document.querySelector(".otherMessage").closest(".messageListItem").classList.add("selected");
    };
    document.querySelector(".button.valid").onclick = () => test.validations++;
    document.addEventListener("pdfParserEchangesDone", event => {
        test.hash = event.detail.hashId;
        test.done++;
    });
}

function pageHtml(scenario) {
    const attachment = ["alternate", "conflict", "scan-a", "scan-b"].includes(scenario)
        ? '<div class="messageAttachment"><div class="view-pdf-document-uc-form"><iframe id="iFrameViewFile" src="/test/rapport.pdf?type='
            + scenario + '"></iframe></div></div>' : "";
    return '<!doctype html><meta charset="utf-8"><div id="messageList">'
        + '<div class="messageListItem selected"><button class="messageLineItem">Courrier fictif</button></div>'
        + '<div class="messageListItem"><button class="messageLineItem otherMessage">Autre courrier</button></div></div>'
        + '<div id="messageContainer"><button class="btnImport importPatient">Un patient</button>'
        + '<div class="messageBody" style="white-space:pre-line">' + testData + '</div>' + attachment
        + '<button class="button valid">Valider</button></div>'
        + '<section id="' + prefix + 'PanelFindPatient" hidden><div id="fields"></div><div id="results"></div></section>'
        + '<script>(' + setupWeda.toString() + ')(' + JSON.stringify(prefix) + ');</script>';
}

async function run() {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "weda-echanges-test-"));
    const extension = path.join(temp, "extension");
    let browser;
    try {
        fs.cpSync(path.join(__dirname, ".."), extension, {
            recursive: true, filter: source => ![".git", ".github", "tests"].includes(path.basename(source))
        });
        browser = await chromium.launchPersistentContext(path.join(temp, "profile"), {
            channel: "chromium", headless: true,
            args: ["--disable-extensions-except=" + extension, "--load-extension=" + extension,
                "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost"]
        });
        await browser.route(/^https?:\/\//, route => {
            const url = new URL(route.request().url());
            if (url.origin !== origin) return route.abort();
            if (url.pathname === "/test/rapport.pdf") {
                return route.fulfill({ contentType: "application/pdf", body: samplePdf(url.searchParams.get("type") || "") });
            }
            return route.fulfill({ contentType: "text/html; charset=utf-8", body: pageHtml(url.searchParams.get("test")) });
        });
        const worker = browser.serviceWorkers().find(w => w.url().endsWith("/src/background.js"))
            || await browser.waitForEvent("serviceworker", { predicate: w => w.url().endsWith("/src/background.js") });
        await worker.evaluate(() => chrome.storage.local.set({
            autoPdfParser: true, autoClickUnPatient: false, secureExchangeMessageQueue: false,
            secureExchangeAutoRefresh: false, PdfParserAutoAIExtraction: false, verifierEtMettreAJourAntecedents: false
        }));

        const page = await browser.newPage();
        const logs = [];
        page.on("console", m => logs.push(m.text()));
        const clickImport = () => page.locator("#messageContainer .importPatient").evaluate(button => button.click());
        const open = async scenario => {
            const ready = page.waitForEvent("console", {
                predicate: m => m.text().includes("[pdfParser] Chargement de la page d'échanges")
            });
            await page.goto(exchanges + "?test=" + scenario);
            await ready;
            await clickImport();
        };
        const finish = n => page.waitForFunction(n => window.fixture.done >= n, n, { timeout: 18000 }).catch(error => {
            throw new Error(logs.slice(-24).join("\n"), { cause: error });
        });
        const report = () => page.evaluate(() => window.fixture);

        await open("alternate");
        await finish(1);
        let result = await report();
        assert.deepEqual(result.requests.map(r => [r.type, r.query]), [["Nom", "LENOIR"], ["Nom", "VIOLET"]], logs.slice(-9).join("\n"));
        assert.deepEqual(result.picks, ["correct"]);
        assert.equal(result.validations, 0);
        assert.equal(logs.some(log => log.includes("PDF non lisible")), false);
        assert.match(await page.locator("#pdfParserPatientName").innerText(), /Anne.*09\/02\/1947/);
        console.log("OK PDF long et identité dans le message ; anciens résultats ignorés ; nom de naissance et prénom composé");

        await open("retry");
        await finish(1);
        result = await report();
        assert.deepEqual(result.picks, []);
        assert.deepEqual(result.requests.at(-1), { type: "Naissance", query: "09/02/1947", filters: ["", ""] });
        await page.evaluate(() => { window.fixture.allowMatch = true; });
        await clickImport();
        await finish(2);
        result = await report();
        assert.deepEqual(result.picks, ["correct"]);
        assert.equal(result.validations, 0);
        console.log("OK date de naissance sans ancien filtre et nouvel essai du même courrier après un échec");

        await open("homonym");
        await finish(1);
        assert.deepEqual((await report()).picks, []);
        assert.ok(logs.some(log => log.includes("recherche patient : ambiguous")));
        console.log("OK homonymes : aucune fiche sélectionnée");

        await open("conflict");
        await finish(1);
        assert.deepEqual((await report()).requests, []);
        assert.ok(logs.some(log => log.includes("recherche patient : conflicting-identity")));
        console.log("OK dates de naissance différentes dans le PDF et le message : aucune recherche lancée");

        await open("scan-a");
        await finish(1);
        const firstScan = await report();
        await open("scan-b");
        await finish(1);
        const secondScan = await report();
        assert.match(firstScan.hash, /^echanges-v2:pdf-[a-f0-9]{64}:/);
        assert.match(secondScan.hash, /^echanges-v2:pdf-[a-f0-9]{64}:/);
        assert.notEqual(firstScan.hash, secondScan.hash);
        assert.deepEqual(secondScan.picks, ["correct"]);
        console.log("OK PDF sans couche texte : caches distincts pour deux fichiers avec le même corps de message");

        await open("switch");
        await page.waitForFunction(() => window.fixture.requests.length === 1);
        await page.locator(".otherMessage").evaluate(button => button.click());
        await page.waitForFunction(() => window.fixture.responses === 1);
        assert.deepEqual((await report()).picks, []);
        assert.equal(await page.locator("#pdfParserPatientName").count(), 0);
        console.log("OK changement de courrier pendant la recherche : aucun résultat reporté sur le suivant");
    } finally {
        if (browser) await browser.close();
        assert.equal(path.dirname(path.resolve(temp)), path.resolve(os.tmpdir()));
        assert.ok(path.basename(temp).startsWith("weda-echanges-test-"));
        fs.rmSync(temp, { recursive: true, force: true });
    }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
