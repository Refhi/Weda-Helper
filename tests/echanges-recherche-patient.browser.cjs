"use strict";

// Extension complète, profil Chromium temporaire et messagerie Weda fictive.
const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const extension = process.env.WEDA_HELPER_EXTENSION || path.resolve(__dirname, "..");
const origin = "https://secure.weda.fr";
const prefix = "ContentPlaceHolder1_FindPatientUcForm1_";
const mssScenarios = ["mss", "mss-delayed", "mss-delayed-pdf", "mss-data-pdf", "mss-columns", "mss-homonyms", "mss-birth-mismatch",
    "mss-report-date", "mss-absent", "mss-choice", "mss-confirm-after", "mss-switch", "mss-reused-detail",
    "mss-subject-imaging", "mss-subject-civil", "mss-late-picker", "mss-late-category", "mss-mounted", "mss-reopen"];

function mailbox(scenario, prefix, pdfSource) {
    sessionStorage.clear();
    window.weda = { wedaHelper: {}, capabilities: {} };
    const state = window.mailbox = { searches: [], picks: [], done: 0, validations: 0, retry: false };
    const pane = document.querySelector("#messageContainer");
    document.addEventListener("pdfParserEchangesDone", event => { state.done++; state.hash = event.detail.hashId; state.status = event.detail.status; });
    if (["batch-rebuild", "next-rebuild", "next-refused"].includes(scenario)) {
        const list = document.querySelector("#messageList");
        const render = (letters, selected, chip) => {
            list.innerHTML = letters.map(name => '<div class="messageListItem' + (name === selected ? ' selected' : '') + '"><input type="checkbox" checked>'
                + '<button class="messageLineItem"><span class="subjectRow"><span class="subjectLine">' + name
                + '</span><span class="date">10h00</span></span><span class="metaRow"><span class="dossierChip">' + chip + '</span></span></button></div>').join("");
        };
        render(["A", "B", "C"], "A", "");
        state.visits = [];
        list.addEventListener("click", event => {
            const line = event.target.closest(".messageLineItem");
            if (!line) return;
            const name = line.querySelector(".subjectLine").textContent;
            const key = JSON.stringify([name, "10h00"]);
            state.visits.push(name);
            if (scenario !== "batch-rebuild") { state.openedAfterRemoval = !list.innerText.includes("A"); return; }
            // Angular remplace les lignes avant la fin et la réponse d'un autre courrier arrive entre-temps.
            render(["A", "B", "C"], name, "Dossier");
            document.dispatchEvent(new CustomEvent("pdfParserEchangesStarted", { detail: { messageKey: key } }));
            document.dispatchEvent(new CustomEvent("pdfParserEchangesDone", { detail: { messageKey: "autre", status: "ready" } }));
            setTimeout(() => document.dispatchEvent(new CustomEvent("pdfParserEchangesDone", {
                detail: { messageKey: key, status: ({A:"ready", B:"review", C:"failed"})[name] }
            })), 450);
        });
        pane.innerHTML = '<div class="docImportButtons"><button class="button valid">Importer</button></div>';
        pane.querySelector(".valid").onclick = () => {
            state.validations++;
            render(["A", "B", "C"], "A", "Mis à jour");
            if (scenario === "next-rebuild") setTimeout(() => render(["B", "C"], "B", "Rechargé"), 250);
        };
        return;
    }
    if (scenario.startsWith("mss")) {
        const line = document.querySelector(".messageLineItem");
        const subjects = { "mss-report-date": "Compte rendu du 07/03/1980",
            "mss-subject-imaging": "Cabinet fictif - CR d'imagerie médicale FICTIF Camille 07/03/1980",
            "mss-subject-civil": "Cabinet fictif - CS DU 23.11.2026 POUR MADAME FICTIF CAMILLE NEE LE 07.03.1980" };
        const subject = subjects[scenario] || "Compte rendu - FICTIF Camille07/03/1980";
        line.innerHTML = '<span class="sender"><span class="subjectRow"><span class="subjectLine">' + subject
            + '</span><span class="date">23/11/2026</span></span><span class="metaRow"><span class="patientLine">FICTIF Camille</span></span></span>';
        if (scenario.startsWith("mss-subject")) line.querySelector(".patientLine").textContent = "";
        pane.innerHTML = '<div class="docImportBody"><div class="btnImport importPatient">Un patient</div></div><div class="messageBody"></div>'
            + '<div class="messageAttachment"><input class="docTitle" title="C\'est le titre qu\'aura le document dans le dossier patient">'
            + '<select title="Attribuer une classification au document"><option value="0"></option><option value="bilan">Bilan fictif</option></select>'
            + '<div id="PanelViewDocument"></div></div>'
            + '<button class="button valid targetValider">Importer</button><section hidden id="' + prefix + 'PanelPatient"><div id="' + prefix + 'UpdatePanelPatientsGrid"></div></section>';
        const viewer = document.createElement("iframe");
        viewer.id = "iFrameViewFile";
        viewer.src = pdfSource || (scenario === "mss-reused-detail" ? "/BinaryData.aspx?doc=ancien" : "/rapport.pdf");
        const showPdf = () => pane.querySelector("#PanelViewDocument").append(viewer);
        if (!["mss-delayed-pdf", "mss-mounted"].includes(scenario)) showPdf();
        pane.querySelector(".valid").onclick = () => state.validations++;
        if (scenario === "mss-reopen") pane.querySelector(".valid").remove();
        const rows = [["1901", "FICTIF Camilla", "07/03/1980"], ["1902", "FICTIF Camille", scenario === "mss-birth-mismatch" ? "08/03/1980" : "07/03/1980"]];
        if (scenario === "mss-homonyms") rows.push(["1903", "FICTIF Camille", "07/03/1980"]);
        const showCandidates = () => {
            const grid = document.createElement("table");
            grid.className = "grid";
            grid.innerHTML = '<tr><th></th><th>Patient</th><th>Date de Naissance</th><th>Ville</th><th>Action</th><th>Statut INS</th></tr>'
                + rows.map(([id, name, birth]) => '<tr><td></td><td><a href="/FolderMedical/PatientViewForm.aspx?PatDk='
                    + id + '">' + name + '</a></td><td>' + birth + '</td><td></td><td><a href="#" class="choose" data-choice="' + id
                    + '">Importer le message</a></td><td></td></tr>').join("");
            if (scenario === "mss-columns") {
                for (const row of grid.rows) row.prepend(row.cells[4]);
                const heading = grid.insertRow(0).insertCell();
                heading.colSpan = 6;
                heading.textContent = "Patients Weda dont le nom correspond";
            }
            grid.addEventListener("click", event => {
                const choice = event.target.closest(".choose");
                if (!choice) return;
                event.preventDefault();
                state.picks.push(choice.dataset.choice);
                grid.remove();
            });
            pane.querySelector(".docImportBody").append(grid);
        };
        if (!["mss-absent", "mss-delayed", "mss-switch", "mss-reopen"].includes(scenario)) showCandidates();
        pane.querySelector(".importPatient").onclick = () => {
            if (scenario === "mss-delayed-pdf") setTimeout(showPdf, 250);
            if (scenario === "mss-late-picker") setTimeout(openClassic, 400);
            if (scenario === "mss-mounted") state.openedWithViewer = viewer.isConnected;
            if (scenario === "mss-reopen") {
                state.opens = (state.opens || 0) + 1;
                const controls = document.createElement("div");
                controls.className = "docImportButtons";
                controls.innerHTML = '<button class="button valid">Importer</button><button class="button cancel">Annuler</button>';
                controls.querySelector(".valid").onclick = () => state.validations++;
                controls.querySelector(".cancel").onclick = () => controls.remove();
                pane.append(controls);
                if (state.opens === 2) openClassic();
            }
            if (scenario === "mss-reused-detail") state.startedAfterUpdate = state.detailReady === true;
            if (["mss-delayed", "mss-switch"].includes(scenario)) setTimeout(showCandidates, 500);
            setTimeout(() => line.querySelector(".metaRow").insertAdjacentHTML("beforeend", '<span class="dossierChip">Dossier Weda</span>'), 30);
        };
        if (scenario === "mss-mounted") line.addEventListener("click", () => setTimeout(showPdf, 450));
        if (scenario === "mss-late-category") {
            pane.querySelector(".messageAttachment select").addEventListener("change", () => setTimeout(() => {
                const attachment = pane.querySelector(".messageAttachment");
                const fresh = attachment.cloneNode(true);
                fresh.querySelector(".docTitle").value = "";
                fresh.querySelector("select").selectedIndex = 0;
                attachment.replaceWith(fresh);
            }, 350), { once: true });
        }
        if (scenario === "mss-reused-detail") {
            const next = document.querySelector("#messageList .messageListItem:last-child .messageLineItem");
            next.innerHTML = line.innerHTML;
            next.querySelector(".subjectLine").prepend("Suivant ");
            next.addEventListener("click", () => setTimeout(() => {
                state.detailReady = true;
                viewer.src = "/BinaryData.aspx?doc=courant";
            }, 350));
        }
        return;
    }
    const metadata = '<div class="messageClassement">Patient : FICTIF Camille 7/3/1980</div>';
    const bodies = {
        name: "Nom : FICTIF<br>Prénom : Camille", long: "Nom : FICTIF<br>Prénom : Camille<br>Née le 7-3-1980",
        conflict: "Nom : FICTIF<br>Prénom : Camille<br>Née le 08/03/1980", ins: "INS de démonstration : 180037100000018",
        reportdate: "Patient : FICTIF Camille<br>Compte rendu du 15/01/2025",
        hospital: 'Ci-joint le document concernant votre patient(e) CAMILLE FICTIF né(e) NOM ANCIEN le 07/03/1980',
        bodyonly: "Nom : FICTIF<br>Prénom : Camille<br>Née le 07/03/1980<br>Compte rendu fictif."
    };
    const body = bodies[scenario] || "Veuillez trouver le compte rendu en pièce jointe.";
    const pdf = ["pdf", "long", "conflict", "confirmed", "object", "embed"].includes(scenario);
    const viewers = { object: '<object type="application/pdf" data="/rapport.pdf"></object>',
        embed: '<div class="mssAttachment"><embed src="/rapport.pdf" type="application/pdf"></div>' };
    pane.innerHTML = '<div class="docImportBody"><button class="importPatient btnImport">Un patient</button>'
        + '<table><tr><td></td><td><a>FICTIF Camille</a></td><td>07/03/1980</td><td><a href="#">Importer le message</a></td></tr></table></div>'
        + '<div class="messageBody">' + body + '</div>'
        + (["missing", "name", "long", "pdf", "confirmed", "ins", "reportdate", "hospital", "object", "embed"].includes(scenario) ? "" : metadata)
        + (pdf ? '<div class="messageAttachment"><input class="docTitle" title="C\'est le titre qu\'aura le document dans le dossier patient">'
            + (viewers[scenario] || '<iframe id="iFrameViewFile" src="/rapport.pdf"></iframe>') + '</div>' : "")
        + '<button class="button valid">Valider</button>';
    pane.querySelector(".valid").onclick = () => state.validations++;
    if (scenario === "bodyonly") pane.querySelector(".messageBody").insertAdjacentHTML("beforebegin",
        '<div class="weImportItemContainer"><we-doc-import><input type="checkbox" checked><input class="docTitle">'
        + '<select title="Attribuer une classification au document"><option value="0"></option><option value="bilan">Bilan fictif</option></select></we-doc-import></div>');
    if (scenario === "confirmed") {
        const attachment = pane.querySelector(".messageAttachment");
        for (const title of ["Ranger dans les consultations", "Ranger dans les résultats d'examens", "Ranger dans les courriers"]) {
            const destination = document.createElement("button");
            destination.className = "weImportDocTargets";
            destination.title = title;
            destination.onclick = () => { state.rebuilt = true; attachment.replaceWith(attachment.cloneNode(true)); };
            attachment.append(destination);
        }
    }
    pane.querySelector('a[href]').onclick = event => event.preventDefault();

    function renderRows(rows) {
        document.querySelector("#resultats").innerHTML = '<span id="' + prefix + 'LabelPatientCount">' + rows.length + '</span>'
            + '<table id="' + prefix + 'PatientsGridOld">' + rows.map(([id, name, dob], i) =>
                '<tr class="grid-item_tr"><td><a href="#" data-person="' + id + '" id="' + prefix + 'PatientsGridOld_LinkButtonPatientGetNomPrenom_' + i + '">'
                + name + '</a></td><td><a id="' + prefix + 'PatientsGridOld_LinkButtonOldPatienDateNaissance_' + i + '">' + dob + '</a></td></tr>'
            ).join("") + '</table>';
        for (const link of document.querySelectorAll("[data-person]")) {
            link.onclick = event => {
                event.preventDefault();
                state.picks.push(link.dataset.person);
                document.getElementById(prefix + "PanelPatient").remove();
            };
        }
    }
    function renderForm(mode) {
        const form = document.querySelector("#champs");
        form.innerHTML = '<select id="' + prefix + 'DropDownListRechechePatient"><option>Nom</option><option>Naissance</option></select>'
            + '<input id="' + prefix + (mode === "Nom" ? 'TextBoxRecherche' : 'TextBoxRecherchePatientByDate') + '">'
            + (mode === "Naissance" ? '<input id="' + prefix + 'TextBoxNomForDN" value="Ancien">' : "")
            + '<button id="' + prefix + 'ButtonRecherchePatient">Rechercher</button>';
        form.querySelector("select").value = mode;
        form.querySelector("select").onchange = event => setTimeout(() => renderForm(event.target.value), 100);
        form.querySelector("button").onclick = () => {
            const inputs = [...form.querySelectorAll("input")].map(input => input.value);
            state.searches.push({ mode, inputs });
            const good = ["correct", "FICTIF Camille", "07/03/1980"];
            const other = ["autre", "FICTIF Camilla", "07/03/1980"];
            const rows = scenario === "ins" ? [good] : scenario === "retry" && !state.retry ? [] : scenario === "homonyms"
                ? [good, ["homonyme", ...good.slice(1)]] : [other, good];
            setTimeout(() => renderRows(rows), scenario === "slow" || scenario === "switch" ? 1450 : 150);
        };
    }
    function openClassic() {
        document.getElementById(prefix + "PanelPatient")?.remove();
        const panel = document.createElement("section");
        panel.id = prefix + "PanelPatient";
        panel.innerHTML = '<div id="' + prefix + 'PanelFindPatient"><div id="champs"></div><div id="resultats"></div></div>';
        document.body.append(panel);
        setTimeout(() => {
            renderForm("Nom");
            renderRows([["ancien", "FICTIF Camille", "07/03/1980"]]);
        }, scenario === "slow" ? 1250 : 50);
    }
    pane.querySelector(".importPatient").onclick = openClassic;
    if (scenario === "queue") {
        const button = pane.querySelector(".importPatient");
        button.remove();
        document.querySelector(".messageLineItem").addEventListener("click", () => {
            setTimeout(() => pane.querySelector(".docImportBody").prepend(button), 480);
        });
    }
}

function pdfWithText(value) {
    const stream = "BT /F 10 Tf 15 550 Td (" + value + ") Tj ET";
    const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 1400 600] /Resources << /Font << /F 4 0 R >> >> /Contents 5 0 R >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", "<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream"];
    let content = "%PDF-1.4\n";
    const offsets = objects.map((object, i) => {
        const offset = content.length;
        content += (i + 1) + " 0 obj\n" + object + "\nendobj\n";
        return String(offset).padStart(10, "0") + " 00000 n \n";
    });
    return content + "xref\n0 6\n0000000000 65535 f \n" + offsets.join("") + "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + content.length + "\n%%EOF\n";
}

function fixturePdf(scenario, previous = false) {
    const identity = ["pdf", "conflict", "object", "embed"].includes(scenario) ? "Mme FICTIF Camille - nee le 07/03/1980. " : "";
    const reportDate = previous ? "08/02/2023" : "12/04/2025";
    return pdfWithText(identity + "Compte rendu fictif, le " + reportDate + ". Comparaison du 20/06/2019. " + "Texte de demonstration. ".repeat(5));
}

async function run() {
    const browser = await chromium.launchPersistentContext("", { channel: "chromium", headless: true,
        args: ["--disable-extensions-except=" + extension, "--load-extension=" + extension, "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost"] });
    try {
        let scenario;
        await browser.route(/^https?:\/\//, route => {
            const url = new URL(route.request().url());
            if (url.origin !== origin) return route.abort();
            if (url.pathname === "/rapport.pdf" || url.pathname === "/BinaryData.aspx") {
                return route.fulfill({ contentType: "application/pdf", body: fixturePdf(scenario, url.searchParams.get("doc") === "ancien") });
            }
            const pdfSource = scenario === "mss-data-pdf" ? "data:application/pdf;base64," + Buffer.from(fixturePdf(scenario)).toString("base64") : null;
            const html = '<!doctype html><meta charset="utf-8"><div id="weInboxContainer"><div id="messageList"><div class="messageListItem selected"><input type="checkbox" checked><button class="messageLineItem">Premier</button></div>'
                + '<div class="messageListItem"><button class="messageLineItem" onclick="document.querySelector(\'.selected\').classList.remove(\'selected\');this.parentNode.classList.add(\'selected\')">Suivant</button></div></div>'
                + '</div><div id="messageContainer"></div><script>(' + mailbox.toString() + ')(...'
                + JSON.stringify([scenario, prefix, pdfSource]) + ');</script>';
            return route.fulfill({ contentType: "text/html; charset=utf-8", body: html });
        });
        const worker = browser.serviceWorkers()[0] || await browser.waitForEvent("serviceworker");
        await worker.evaluate(() => chrome.storage.local.set({ autoPdfParser: true, autoClickUnPatient: false, secureExchangeMessageQueue: false,
            PdfParserAutoAIExtraction: false, verifierEtMettreAJourAntecedents: false, secureExchangeAutoRefresh: false,
            PdfParserAutoTitle: true, PdfParserAutoClassification: true, PdfParserAutoTitleFormat: JSON.stringify([["*", ["Titre du test"]]]),
            PdfParserAutoCategoryDict: JSON.stringify([["Bilan fictif", ["Compte rendu fictif"]]]) }));
        const page = await browser.newPage();
        const failures = [];
        page.on("console", message => {
            if (message.text().includes("Recherche patient échouée") || message.text().includes("Recherche patient automatique échouée"))
                failures.push(message.text());
        });
        const requested = process.argv.slice(2);
        for (scenario of requested.length ? requested : ["metadata", "slow", "long", "pdf", "name", "retry", "homonyms", "missing", "conflict", "switch", "confirmed", "ins", "reportdate", "hospital", "bodyonly", "object", "embed", "queue", ...mssScenarios, "batch-rebuild", "next-rebuild", "next-refused"]) {
            await worker.evaluate(scenario => chrome.storage.local.set({ autoClickUnPatient: ["mss-reused-detail", "mss-mounted", "mss-reopen"].includes(scenario),
                secureExchangeMessageQueue: ["queue","batch-rebuild","next-rebuild","next-refused"].includes(scenario),
                secureExchangeOpenNextAfterImport: false }), scenario);
            const ready = page.waitForEvent("console", { predicate: m => m.text().includes("[pdfParser] Chargement de la page d'échanges") });
            await page.goto(origin + "/FolderMedical/WedaEchanges/?scenario=" + scenario);
            await ready;
            if (scenario === "batch-rebuild") {
                await page.locator("#whMessageQueueToolbox button").first().evaluate(button => button.click());
                await page.waitForFunction(() => document.querySelector("#whMessageQueueToolbox").textContent.includes("1 à vérifier"), null, { timeout: 7000 })
                    .catch(async error => { throw new Error(await page.locator("#whMessageQueueToolbox").innerText() + " " +
                        JSON.stringify(await page.evaluate(() => window.mailbox)), { cause: error }); });
                assert.deepEqual(await page.evaluate(() => window.mailbox.visits), ["A","B","C"]);
                assert.deepEqual(await page.locator(".whEchangesStatus").allTextContents(), ["Dossier prêt","À vérifier","Analyse incomplète"]);
                assert.match(await page.locator("#whMessageQueueToolbox").innerText(), /1 prêt · 1 à vérifier · 1 en échec/);
                console.log("OK", scenario);
                continue;
            }
            if (scenario.startsWith("next-")) {
                await page.getByLabel("Ouvrir le suivant après import").evaluate(box => box.click());
                await page.waitForFunction(() => document.querySelector("#whMessageQueueToolbox input").checked);
                await page.locator(".docImportButtons .valid").evaluate(button => button.click());
                if (scenario === "next-rebuild") {
                    await page.waitForFunction(() => window.mailbox.visits.length > 0);
                    assert.deepEqual(await page.evaluate(() => window.mailbox.visits), ["B"]);
                    assert.equal(await page.evaluate(() => window.mailbox.openedAfterRemoval), true);
                } else {
                    await page.waitForTimeout(600);
                    assert.deepEqual(await page.evaluate(() => window.mailbox.visits), []);
                }
                console.log("OK", scenario);
                continue;
            }
            const trigger = page.locator(scenario === "queue" ? "#whMessageQueueToolbox button:first-child"
                : ["mss-mounted", "mss-reopen"].includes(scenario) ? ".messageListItem.selected .messageLineItem"
                : scenario === "confirmed" ? ".docImportBody a[href]" : scenario === "mss-reused-detail" ? ".messageListItem:last-child .messageLineItem" : ".importPatient");
            await trigger.evaluate(button => button.click());
            if (scenario.startsWith("mss")) {
                const confirmed = ["mss-choice", "mss-confirm-after"].includes(scenario);
                if (scenario === "mss-choice") await page.locator('[data-choice="1902"]').evaluate(link => link.click());
                if (scenario === "mss-switch") {
                    await page.locator(".messageLineItem").last().evaluate(line => line.click());
                    await page.waitForTimeout(900);
                    assert.equal(await page.locator(".docTitle").inputValue(), "");
                    assert.equal(await page.evaluate(() => window.mailbox.done), 0);
                } else {
                    await page.waitForFunction(() => window.mailbox.done === 1, null, { timeout: 18000 });
                    if (scenario === "mss-confirm-after") {
                        await page.evaluate(() => {
                            const key = window.mailbox.hash;
                            const doc = JSON.parse(sessionStorage.getItem(key));
                            sessionStorage.setItem(key, JSON.stringify({ ...doc, antecedentsPatientId: "1901", antecedentsDiscordances: [] }));
                        });
                        await page.locator('[data-choice="1902"]').evaluate(link => link.click());
                        await page.waitForFunction(() => window.mailbox.done === 2);
                        assert.equal(await page.locator("#pdfParserAntecedentsButton").count(), 0);
                    }
                    assert.equal(await page.locator(".docTitle").inputValue(), "Titre du test", scenario);
                    assert.equal(await page.locator(".messageAttachment select").inputValue(), "bilan", scenario);
                    const doc = await page.evaluate(() => JSON.parse(sessionStorage.getItem(window.mailbox.hash)));
                    assert.equal(doc.documentDate, "12/04/2025", scenario + ": date présente seulement dans le PDF");
                    const focused = await page.evaluate(() => document.activeElement.dataset.choice || "");
                    assert.equal(focused, ["mss", "mss-delayed", "mss-delayed-pdf", "mss-data-pdf", "mss-columns", "mss-reused-detail",
                        "mss-subject-imaging", "mss-subject-civil", "mss-late-category", "mss-mounted"].includes(scenario) ? "1902" : "", scenario);
                    const patientId = await page.locator("body").evaluate(e => e.querySelector("#pdfParserPatientName")?.dataset.patientId || "");
                    assert.equal(patientId, confirmed ? "1902" : "", scenario);
                    assert.equal(await page.locator(".valid").evaluate(e => document.activeElement === e), confirmed || ["mss-late-picker", "mss-reopen"].includes(scenario), scenario);
                }
                const state = await page.evaluate(() => window.mailbox);
                if (scenario === "mss-reused-detail") assert.equal(state.startedAfterUpdate, true);
                if (scenario === "mss-mounted") assert.equal(state.openedWithViewer, true);
                if (scenario === "mss-reopen") assert.equal(state.opens, 2);
                assert.equal(state.validations, 0, scenario);
                assert.deepEqual(state.picks, confirmed ? ["1902"] : ["mss-late-picker","mss-reopen"].includes(scenario) ? ["correct"] : [], scenario);
                console.log("OK", scenario);
                continue;
            }
            if (scenario === "switch") {
                await page.waitForFunction(() => window.mailbox.searches.length > 0);
                await page.locator(".messageLineItem").last().evaluate(line => line.click());
                await page.waitForTimeout(1800);
            } else {
                await page.waitForFunction(() => window.mailbox.done === 1, null, { timeout: 18000 });
            }
            if (scenario === "retry") {
                assert.deepEqual(await page.evaluate(() => window.mailbox.picks), []);
                await page.evaluate(() => { window.mailbox.retry = true; });
                await trigger.evaluate(button => button.click());
                await page.waitForFunction(() => window.mailbox.done === 2);
            }
            const state = await page.evaluate(() => window.mailbox);
            const manual = ["homonyms", "missing", "conflict", "switch", "confirmed"].includes(scenario);
            assert.deepEqual(state.picks, manual ? [] : ["correct"], scenario + ": " + failures.slice(-2).join("\n"));
            assert.equal(state.validations, 0, scenario);
            if (["missing", "conflict", "confirmed"].includes(scenario)) assert.equal(state.searches.length, 0, scenario);
            if (scenario === "slow") {
                assert.equal(state.searches.length, 1);
                assert.deepEqual(state.searches[0], { mode: "Naissance", inputs: ["07/03/1980", ""] });
            }
            if (scenario === "ins") assert.deepEqual(state.searches, [{ mode: "Nom", inputs: ["1800371000000"] }]);
            if (scenario === "queue") await page.waitForFunction(() => document.querySelector("#whMessageQueueToolbox").dataset.running === "false");
            if (scenario === "confirmed") assert.equal(state.rebuilt, true);
            if (scenario === "bodyonly") {
                assert.equal(await page.locator("we-doc-import .docTitle").inputValue(), "Titre du test");
                assert.equal(await page.locator("we-doc-import select").inputValue(), "bilan");
            }
            if (["long", "pdf", "confirmed", "object", "embed"].includes(scenario)) assert.equal(await page.locator(".docTitle").inputValue(), "Titre du test");
            console.log("OK", scenario);
        }
    } finally {
        await browser.close();
    }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
