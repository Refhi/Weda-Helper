// Extension réelle dans Chromium, courriers et patients entièrement fictifs.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const url = "https://secure.weda.fr/FolderMedical/WedaEchanges/";

function samplePdf(text) {
    const stream = "BT /F1 12 Tf 40 750 Td (" + text + ") Tj ET";
    const objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        "<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream"
    ];
    let pdf = "%PDF-1.4\n";
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

function setupMailbox() {
    window.weda = { wedaHelper: {}, capabilities: {} };
    const state = window.mailbox = { opened: [], outcomes: [] };
    const messages = {
        A: ["cardio.pdf", "radio.pdf", "echo.pdf", "IHE_XDM.zip"],
        B: ["copie.pdf"],
        C: ["reparable.pdf"],
        D: [],
        E: ["ia.pdf"],
        F: ["naissance-a.pdf", "naissance-b.pdf"]
    };
    const pane = document.querySelector("#messageContainer");
    function attachment(file) {
        const source = "/fixtures/" + file;
        const download = file === "echo.pdf" || file.endsWith(".zip");
        const viewer = download ? '<a href="' + source + '" download="' + file + '">' + file + '</a>'
            : '<iframe id="iFrameViewFile" src="' + source + '"></iframe>';
        return '<div class="messageAttachment" data-file="' + file + '"><we-doc-import class="docImportAttach">'
            + '<input class="docTitle" value="Titre initial">'
            + '<select title="Attribuer une classification au document"><option value="0">Défaut</option>'
            + '<option value="cardio">Cardiologie</option><option value="radio">Imagerie</option>'
            + '<option value="echo">Échographie</option><option value="manuel">Courrier relu</option></select>'
            + '</we-doc-import><div class="view-pdf-document-uc-form">' + viewer + '</div></div>';
    }
    function open(row, name) {
        document.querySelector(".messageListItem.selected")?.classList.remove("selected");
        row.classList.add("selected");
        state.opened.push(name);
        const action = name === "D" ? '<button class="btnImport importPatient">Un patient</button>'
            : '<table><tbody><tr><td><a href="#">Importer le message</a></td><td><a href="#">Patient fictif</a></td><td>02/03/1980</td></tr></tbody></table>';
        pane.innerHTML = '<div class="messageBody">Corps fictif du message ' + name + '</div>'
            + '<div class="docImportBody">' + action + '</div>'
            + messages[name].map(attachment).join("")
            + '<button class="button valid">Valider</button>';
        pane.querySelectorAll("a[href='#']").forEach(link => link.onclick = event => event.preventDefault());
    }
    window.renderMailbox = () => {
        const list = document.createElement("div");
        list.id = "messageList";
        for (const name of Object.keys(messages)) {
            const row = document.createElement("div");
            row.className = "messageListItem";
            row.dataset.mail = name;
            const line = document.createElement("button");
            line.className = "messageLineItem";
            line.textContent = "Courrier fictif " + name;
            line.onclick = () => open(row, name);
            row.append(line);
            list.append(row);
        }
        document.querySelector("#messageList").replaceWith(list);
    };
    window.renderMailbox();
    document.addEventListener("pdfParserEchangesDone", event => {
        state.outcomes.push(event.detail.reason);
    });
}

const mailbox = '<!doctype html><meta charset="utf-8"><div id="weInboxContainer"><div id="messageList"></div></div>'
    + '<div id="messageContainer"></div><script>(' + setupMailbox.toString() + ')();</script>';

async function run() {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "weda-documents-test-"));
    const extension = path.join(temp, "extension");
    let browser;
    try {
        fs.cpSync(path.join(__dirname, ".."), extension, {
            recursive: true,
            filter: source => ![".git", ".github", "tests"].includes(path.basename(source))
        });
        browser = await chromium.launchPersistentContext(path.join(temp, "profile"), {
            channel: "chromium", headless: true,
            args: ["--disable-extensions-except=" + extension, "--load-extension=" + extension,
                "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost"]
        });
        let repaired = false;
        let archiveRequests = 0;
        await browser.route(/^https?:\/\//, route => {
            const request = new URL(route.request().url());
            if (request.href.startsWith(url)) return route.fulfill({ contentType: "text/html; charset=utf-8", body: mailbox });
            if (request.origin !== "https://secure.weda.fr" || !request.pathname.startsWith("/fixtures/")) return route.abort();
            const file = request.pathname.split("/").at(-1);
            if (file.endsWith(".zip")) {
                archiveRequests++;
                return route.abort();
            }
            if (file === "reparable.pdf" && !repaired) return route.fulfill({ status: 404, body: "PDF fictif absent" });
            const texts = {
                "cardio.pdf": "Rapport CARDIOLOGIQUE fictif sans information reelle.",
                "copie.pdf": "Rapport CARDIOLOGIQUE fictif sans information reelle.",
                "radio.pdf": "Rapport RADIOGRAPHIQUE fictif sans information reelle.",
                "echo.pdf": "Rapport ECHOGRAPHIQUE fictif sans information reelle.",
                "reparable.pdf": "Fichier repare ECHOGRAPHIQUE et entierement fictif.",
                "ia.pdf": "Courrier RADIOGRAPHIQUE fictif avec assistant indisponible.",
                "naissance-a.pdf": "Nom : PERRIN ; Prenom : Alice ; Date de naissance : 04/07/1990",
                "naissance-b.pdf": "Nom : BERTRAND ; Prenom : Paul ; Date de naissance : 12/05/1984"
            };
            return route.fulfill({ contentType: "application/pdf", body: samplePdf(texts[file]) });
        });
        const isBackground = worker => worker.url().endsWith("/src/background.js");
        const worker = browser.serviceWorkers().find(isBackground)
            || await browser.waitForEvent("serviceworker", { predicate: isBackground });
        await worker.evaluate(() => chrome.storage.local.set({
            secureExchangeAutoRefresh: false, secureExchangeMessageQueue: true,
            secureExchangeMessageQueueAutoEnabled: false, autoPdfParser: true, autoClickUnPatient: false,
            PdfParserAutoAIExtraction: false, verifierEtMettreAJourAntecedents: false,
            PdfParserAutoTitle: true,
            PdfParserAutoCategoryDict: JSON.stringify([
                ["Cardiologie", ["cardiologique"]], ["Imagerie", ["radiographique"]],
                ["Échographie", ["echographique"]], ["Courrier relu", ["titre manuel"]]
            ]),
            PdfParserAutoTitleFormat: JSON.stringify([["*", ["[category]"]]])
        }));
        const page = await browser.newPage();
        page.setDefaultTimeout(16000);
        const logs = [];
        page.on("console", message => logs.push(message.text()));
        page.on("pageerror", error => logs.push(error.message));
        async function start(tab) {
            const ready = tab.waitForEvent("console", {
                predicate: message => message.text() === "[pdfParser] Chargement de la page d'échanges"
            });
            await tab.goto(url);
            await ready;
        }
        function row(tab, name) {
            return tab.locator('[data-mail="' + name + '"]');
        }
        async function analyse(tab, name, alreadyOpen = false) {
            if (!alreadyOpen) await row(tab, name).locator(".messageLineItem").press("Space");
            const count = await tab.evaluate(() => window.mailbox.outcomes.length);
            if (name === "D") await tab.getByRole("button", { name: "Un patient" }).press("Space");
            else await tab.getByRole("link", { name: "Importer le message" }).press("Enter");
            await tab.waitForFunction(previous => window.mailbox.outcomes.length > previous, count).catch(error => {
                throw new Error(logs.slice(-24).join("\n"), { cause: error });
            });
            return tab.evaluate(() => window.mailbox.outcomes.at(-1));
        }
        const title = (tab, file) => tab.locator('[data-file="' + file + '"] .docTitle');
        const classification = (tab, file) => tab.locator('[data-file="' + file + '"] select');

        await start(page);
        assert.equal(await analyse(page, "A"), "");
        for (const [file, expectedTitle, type] of [
            ["cardio.pdf", "Cardiologie", "cardio"], ["radio.pdf", "Imagerie", "radio"], ["echo.pdf", "Échographie", "echo"]
        ]) {
            assert.equal(await title(page, file).inputValue(), expectedTitle, logs.slice(-22).join("\n"));
            assert.equal(await classification(page, file).inputValue(), type);
        }
        assert.equal(await title(page, "IHE_XDM.zip").inputValue(), "Titre initial");
        assert.equal(archiveRequests, 0);
        console.log("OK titres et classifications distincts, y compris pour un PDF en téléchargement");

        await title(page, "cardio.pdf").fill("Titre relu");
        await classification(page, "cardio.pdf").press("End");
        assert.equal(await classification(page, "cardio.pdf").inputValue(), "manuel");
        const extractions = () => logs.filter(log => log.includes("Données non extraites pour ce PDF")).length;
        const before = extractions();
        assert.equal(await analyse(page, "A"), "");
        assert.equal(extractions(), before);
        assert.equal(await title(page, "cardio.pdf").inputValue(), "Titre relu");
        assert.equal(await classification(page, "cardio.pdf").inputValue(), "manuel");

        const newTab = await browser.newPage();
        await start(newTab);
        assert.equal(await analyse(newTab, "A"), "");
        assert.equal(await title(newTab, "cardio.pdf").inputValue(), "Titre relu");
        assert.equal(await classification(newTab, "cardio.pdf").inputValue(), "manuel");
        assert.equal(await title(newTab, "radio.pdf").inputValue(), "Imagerie");
        await newTab.close();
        console.log("OK corrections persistantes par fichier et analyse réutilisée au retour");

        assert.equal(await analyse(page, "B"), "");
        assert.equal(await title(page, "copie.pdf").inputValue(), "Cardiologie");
        assert.equal(await row(page, "A").getByRole("button", { name: "PDF identique" }).count(), 1);
        assert.equal(await row(page, "B").getByRole("button", { name: "PDF identique" }).count(), 1);
        assert.equal(await row(page, "C").getByRole("button", { name: "PDF identique" }).count(), 0);
        await page.evaluate(() => window.renderMailbox());
        await row(page, "B").getByRole("button", { name: "PDF identique" }).press("Space");
        assert.equal(await row(page, "A").evaluate(element => element.classList.contains("selected")), true);
        console.log("OK repérage des octets identiques sur deux courriers et accès à l’autre ligne");

        assert.equal(await analyse(page, "C"), "read-error");
        assert.ok(["not-found", "missing-identity"].includes(await analyse(page, "D")));
        assert.equal(await row(page, "D").locator(".whEchangesAnalysisFailure").textContent(), "Patient introuvable");
        await worker.evaluate(() => chrome.storage.local.set({ PdfParserAutoAIExtraction: true, enableIAassistant: false }));
        assert.equal(await analyse(page, "E"), "ai-unavailable");
        assert.equal(await row(page, "E").locator(".whEchangesAnalysisFailure").textContent(), "IA indisponible");

        await worker.evaluate(() => chrome.storage.local.set({ PdfParserAutoAIExtraction: false }));
        repaired = true;
        const current = await page.evaluate(() => ({ opened: window.mailbox.opened.length, outcomes: window.mailbox.outcomes.length }));
        await page.getByRole("button", { name: "Relancer les échecs" }).press("Space");
        await page.waitForFunction(count => window.mailbox.outcomes.length === count + 3, current.outcomes);
        const retry = await page.evaluate(previous => ({
            opened: window.mailbox.opened.slice(previous.opened),
            outcomes: window.mailbox.outcomes.slice(previous.outcomes)
        }), current);
        assert.deepEqual(retry.opened, ["C", "D", "E"]);
        assert.equal(retry.outcomes[0], "");
        assert.equal(retry.outcomes[2], "");
        assert.equal(await row(page, "C").locator(".whEchangesAnalysisFailure").count(), 0);
        assert.equal(await row(page, "E").locator(".whEchangesAnalysisFailure").count(), 0);
        console.log("OK échec IA distinct du rapprochement patient et relance limitée aux courriers en échec");

        assert.equal(await analyse(page, "F"), "conflicting-identity");
        assert.equal(await row(page, "F").locator(".whEchangesAnalysisFailure").textContent(), "Patient à vérifier");
        console.log("OK attribution suspendue quand deux pièces donnent des identités contradictoires");
    } finally {
        if (browser) await browser.close();
        assert.equal(path.dirname(fs.realpathSync(temp)), fs.realpathSync(os.tmpdir()));
        assert.ok(path.basename(temp).startsWith("weda-documents-test-"));
        fs.rmSync(temp, { recursive: true, force: true });
    }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
