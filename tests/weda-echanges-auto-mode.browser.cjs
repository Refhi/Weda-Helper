// L’extension réelle tourne dans un profil Chromium isolé sur une boîte Weda fictive.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const exchanges = "https://secure.weda.fr/FolderMedical/WedaEchanges/";
const mailbox = `<!doctype html><meta charset="utf-8">
<div id="weInboxContainer"><div id="messageList"></div></div>
<script>
    window.weda = { wedaHelper: {}, capabilities: {} };
    window.openedMessages = 0;
    window.addMessage = () => {
        const row = document.createElement("div");
        row.className = "messageListItem";
        const line = document.createElement("button");
        line.className = "messageLineItem";
        const sender = document.createElement("span");
        sender.className = "sender";
        sender.textContent = "Message fictif";
        line.append(sender);
        row.append(line);
        line.onclick = () => {
            window.openedMessages++;
            sender.classList.remove("unread");
            setTimeout(() => document.dispatchEvent(new Event("pdfParserEchangesDone")), 0);
        };
        document.querySelector("#messageList").append(row);
        return sender;
    };
</script>`;

async function run() {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "weda-auto-mode-test-"));
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
        await browser.route(/^https?:\/\//, route => route.request().url() === exchanges
            ? route.fulfill({ contentType: "text/html; charset=utf-8", body: mailbox })
            : route.abort());
        const isBackground = worker => worker.url().endsWith("/src/background.js");
        const worker = browser.serviceWorkers().find(isBackground)
            || await browser.waitForEvent("serviceworker", { predicate: isBackground });
        await worker.evaluate(() => chrome.storage.local.set({
            secureExchangeMessageQueue: true, secureExchangeAutoRefresh: false,
            autoPdfParser: false, autoClickUnPatient: false
        }));

        const page = await browser.newPage();
        const waitForMode = (tab, pressed) => tab.getByRole("button", {
            name: "Analyse automatique des messages non lus", pressed
        }).waitFor({ timeout: 8000 });
        const automatic = page.getByRole("button", { name: "Analyse automatique des messages non lus" });

        await page.goto(exchanges);
        await waitForMode(page, false);
        await page.evaluate(() => window.addMessage().classList.add("unread"));
        await automatic.press("Space");
        await waitForMode(page, true);
        await page.waitForFunction(() => window.openedMessages === 1);

        await page.reload();
        await waitForMode(page, true);
        await page.evaluate(() => { window.lateSender = window.addMessage(); });
        assert.equal(await page.evaluate(() => window.openedMessages), 0);
        await page.evaluate(() => window.lateSender.classList.add("unread"));
        await page.waitForFunction(() => window.openedMessages === 1);
        console.log("OK mode activé après rechargement, analyse reprise quand un message non lu apparaît");

        const otherTab = await browser.newPage();
        await otherTab.goto(exchanges);
        await waitForMode(otherTab, true);
        await automatic.press("Space");
        await waitForMode(page, false);
        await waitForMode(otherTab, false);
        await page.reload();
        await waitForMode(page, false);
        const opened = await page.evaluate(async () => {
            window.addMessage().classList.add("unread");
            await new Promise(resolve => requestAnimationFrame(resolve));
            return window.openedMessages;
        });
        assert.equal(opened, 0);
        console.log("OK arrêt synchronisé et conservé après rechargement, aucun départ automatique");
    } finally {
        if (browser) await browser.close();
        assert.equal(path.dirname(path.resolve(temp)), path.resolve(os.tmpdir()));
        assert.ok(path.basename(temp).startsWith("weda-auto-mode-test-"));
        fs.rmSync(temp, { recursive: true, force: true });
    }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
