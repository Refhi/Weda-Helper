// Vérifie le clic natif dans une boîte Weda fictive, sans connexion au serveur.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const exchanges = "https://secure.weda.fr/FolderMedical/WedaEchanges/";

function setupMailbox() {
    window.weda = { wedaHelper: {}, capabilities: {} };
    const state = window.mailbox = { imported: [], opened: [] };
    const currentRow = () => document.querySelector("#messageList > .messageListItem.selected");
    window.renderRows = (names, selected) => {
        const list = document.createElement("div");
        list.id = "messageList";
        for (const name of names) {
            const row = document.createElement("div");
            row.className = "messageListItem";
            row.classList.toggle("selected", name === selected);
            row.dataset.mail = name;
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            const line = document.createElement("button");
            line.className = "messageLineItem";
            line.textContent = "Courrier fictif " + name;
            line.onclick = () => {
                currentRow()?.classList.remove("selected");
                row.classList.add("selected");
                state.opened.push(name);
            };
            row.append(checkbox, line);
            list.append(row);
        }
        document.querySelector("#messageList").replaceWith(list);
    };
    document.querySelector("form").onsubmit = event => {
        event.preventDefault();
        state.imported.push(currentRow()?.dataset.mail);
    };
    window.completeImport = (selected = null) => {
        document.querySelector('[data-mail="' + state.imported.at(-1) + '"]')?.remove();
        if (selected) document.querySelector('[data-mail="' + selected + '"]').classList.add("selected");
    };
    window.renderRows(["A", "B", "C"], new URLSearchParams(location.search).get("selected") || "B");
}

const pageHtml = `<!doctype html><meta charset="utf-8">
<ul id="inboxToolbar"><li class="inbox selected"><a href="#">Reçus</a></li></ul>
<div id="weInboxContainer"><div id="messageList"></div></div>
<div id="messageContainer"><form><div class="docImportButtons">
    <button type="submit" class="button valid targetValider">Importer<span>f7</span></button>
    <button type="button" class="button cancel">Annuler</button>
</div></form></div><script>(${setupMailbox.toString()})();</script>`;

async function run() {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "weda-next-message-test-"));
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
        await browser.route(/^https?:\/\//, route => route.request().url().startsWith(exchanges)
            ? route.fulfill({ contentType: "text/html; charset=utf-8", body: pageHtml })
            : route.abort());
        const isBackground = worker => worker.url().endsWith("/src/background.js");
        const worker = browser.serviceWorkers().find(isBackground)
            || await browser.waitForEvent("serviceworker", { predicate: isBackground });
        await worker.evaluate(() => chrome.storage.local.set({
            secureExchangeAutoRefresh: false, secureExchangeMessageQueue: false,
            autoPdfParser: false, autoClickUnPatient: false
        }));

        const page = await browser.newPage();
        page.setDefaultTimeout(8000);
        const importButton = page.locator("#messageContainer .docImportButtons .button.valid");
        const submit = () => importButton.press("Space");
        const state = () => page.evaluate(() => window.mailbox);
        const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => resolve())));
        async function open(selected = "B", tweak = "secureExchangeOpenNextAfterImport") {
            const ready = page.waitForEvent("console", {
                predicate: message => message.text() === `[addTweak] ${tweak} activé`, timeout: 8000
            });
            await page.goto(exchanges + "?selected=" + selected);
            await ready;
        }

        await open();
        await submit();
        assert.deepEqual(await state(), { imported: ["B"], opened: [] });
        await page.evaluate(() => window.completeImport());
        await page.waitForFunction(() => window.mailbox.opened[0] === "C");
        assert.deepEqual(await state(), { imported: ["B"], opened: ["C"] });
        assert.equal(await page.locator(".messageListItem.selected").getAttribute("data-mail"), "C");
        console.log("OK le retrait après import ouvre le suivant une seule fois");

        await open();
        // Comme le raccourci Valider, un clic programmatique passe par le bouton natif.
        await importButton.evaluate(button => button.click());
        await page.evaluate(() => window.renderRows(["A", "B", "C"], "B"));
        await settle();
        assert.deepEqual(await state(), { imported: ["B"], opened: [] });
        await page.evaluate(() => window.renderRows(["D", "A", "C"], null));
        await page.waitForFunction(() => window.mailbox.opened[0] === "C");
        assert.deepEqual(await state(), { imported: ["B"], opened: ["C"] });
        console.log("OK attente tant que le courrier est présent et suivi du bon courrier après reconstruction");

        await open();
        await submit();
        await page.locator('[data-mail="A"] .messageLineItem').press("Space");
        await page.evaluate(() => window.completeImport());
        await settle();
        assert.deepEqual(await state(), { imported: ["B"], opened: ["A"] });
        await open();
        await submit();
        await page.evaluate(() => window.completeImport("C"));
        await settle();
        assert.deepEqual(await state(), { imported: ["B"], opened: [] });
        await open("C");
        await submit();
        await page.evaluate(() => window.completeImport());
        await settle();
        assert.deepEqual(await state(), { imported: ["C"], opened: [] });
        console.log("OK navigation manuelle, sélection native du suivant et fin de liste");

        await worker.evaluate(() => chrome.storage.local.set({ secureExchangeMessageQueue: true }));
        await open("B", "secureExchangeMessageQueue");
        const toolbox = page.locator("#whMessageQueueToolbox");
        await page.locator('[data-mail="B"] input').press("Space");
        await toolbox.locator("button").first().press("Space");
        await page.waitForFunction(() => document.querySelector('#whMessageQueueToolbox[data-running="true"]'));
        await submit();
        await page.evaluate(() => window.completeImport());
        await settle();
        assert.deepEqual(await state(), { imported: ["B"], opened: ["B"] });
        console.log("OK le parcours d’analyse en cours garde la main");

        await worker.evaluate(() => chrome.storage.local.set({ secureExchangeOpenNextAfterImport: false }));
        await open("B", "secureExchangeMessageQueue");
        await submit();
        await page.evaluate(() => window.completeImport());
        await settle();
        assert.deepEqual(await state(), { imported: ["B"], opened: [] });
        console.log("OK désactivation du réglage");
    } finally {
        if (browser) await browser.close();
        assert.equal(path.dirname(fs.realpathSync(temp)), fs.realpathSync(os.tmpdir()));
        assert.ok(path.basename(temp).startsWith("weda-next-message-test-"));
        fs.rmSync(temp, { recursive: true, force: true });
    }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
