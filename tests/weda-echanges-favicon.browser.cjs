// Vérifie l'extension réelle avec une boîte de courriers fictive, sans accès au réseau.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const exchanges = "https://secure.weda.fr/FolderMedical/WedaEchanges/";
const originalHref = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E";

function mailbox(url) {
    const params = new URL(url).searchParams;
    const icon = params.has("no-icon") ? "" : params.has("empty-icon")
        ? '<link rel="icon">'
        : `<link rel="shortcut icon" type="image/svg+xml" href="${originalHref.replaceAll('"', '&quot;')}">`;
    return `<!doctype html><html><head><meta charset="utf-8"><title>Weda Échanges</title>${icon}</head>
        <body><div id="weInboxContainer">${params.has("late-list") ? "" : '<div id="messageList"></div>'}</div>
        <script>window.weda = { wedaHelper: {}, capabilities: {} };</script></body></html>`;
}

async function expectBadge(page, label) {
    const expected = await page.evaluate(text => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 64;
        const context = canvas.getContext("2d");
        context.beginPath();
        context.arc(32, 32, 30, 0, Math.PI * 2);
        context.fillStyle = "#174ea6";
        context.fill();
        context.lineWidth = 3;
        context.strokeStyle = "#ffffff";
        context.stroke();
        context.fillStyle = "#ffffff";
        context.font = `800 ${text.length === 1 ? 38 : text.length === 2 ? 32 : 24}px Arial, sans-serif`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(text, 32, text.length > 2 ? 33 : 34);
        return canvas.toDataURL("image/png");
    }, label);
    await page.waitForFunction(href => document.querySelector("link[rel~='icon']")?.href === href,
        expected, { timeout: 8000 });
    assert.equal(await page.locator("link[rel~='icon']").count(), 1);
    assert.equal(await page.title(), "Weda Échanges");
}

async function replaceList(page, count) {
    await page.evaluate(size => {
        const list = document.createElement("div");
        list.id = "messageList";
        for (let index = 0; index < size; index++) {
            const row = document.createElement("div");
            row.className = "messageListItem";
            row.innerHTML = `<span class="sender${index % 2 ? " unread" : ""}">Courrier fictif</span>`;
            list.append(row);
        }
        const current = document.querySelector("#messageList");
        if (current) current.replaceWith(list);
        else document.querySelector("#weInboxContainer").append(list);
    }, count);
}

async function run() {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "weda-favicon-test-"));
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
        await browser.route(/^https?:\/\//, route => route.request().url().startsWith("https://secure.weda.fr/")
            ? route.fulfill({ contentType: "text/html; charset=utf-8", body: mailbox(route.request().url()) })
            : route.abort());
        const isBackground = worker => worker.url().endsWith("/src/background.js");
        const worker = browser.serviceWorkers().find(isBackground)
            || await browser.waitForEvent("serviceworker", { predicate: isBackground });
        assert.equal(await worker.evaluate(() => defaultSettings.secureExchangeFaviconCounter), true);
        await worker.evaluate(() => chrome.storage.local.set({
            secureExchangeMessageQueue: false, secureExchangeAutoRefresh: false,
            autoPdfParser: false, autoClickUnPatient: false
        }));
        const page = await browser.newPage();
        await page.goto(exchanges);
        await expectBadge(page, "0");
        for (const count of [1, 9, 10, 99, 100, 132]) {
            await replaceList(page, count);
            await expectBadge(page, count > 99 ? "99+" : String(count));
        }
        await page.locator("#messageList > .messageListItem").last().evaluate(row => row.remove());
        await replaceList(page, 2);
        await expectBadge(page, "2");
        await page.locator("#messageList > .messageListItem").last().evaluate(row => row.remove());
        await expectBadge(page, "1");
        await page.locator("#messageList").evaluate(list => list.replaceChildren());
        await expectBadge(page, "0");
        console.log("OK compteur de tous les courriers, suppressions, liste remplacée, zéro et 99+");

        await page.evaluate(() => {
            window.iconMutations = 0;
            new MutationObserver(records => { window.iconMutations += records.length; })
                .observe(document.querySelector("link[rel~='icon']"), { attributes: true });
            document.body.append(document.createElement("span"));
        });
        await page.waitForTimeout(350);
        assert.equal(await page.evaluate(() => window.iconMutations), 0);
        await page.locator("#messageList").evaluate(list => list.remove());
        await page.waitForFunction(href => document.querySelector("link[rel~='icon']")?.getAttribute("href") === href,
            originalHref);
        assert.equal(await page.locator("link[rel~='icon']").getAttribute("type"), "image/svg+xml");
        assert.equal(await page.locator("link[rel~='icon']").getAttribute("rel"), "shortcut icon");
        await replaceList(page, 3);
        await expectBadge(page, "3");
        await page.reload();
        await expectBadge(page, "0");
        console.log("OK absence de boucle de redessin, icône d'origine restaurée et reprise après rechargement");

        await page.goto(exchanges + "?no-icon&late-list");
        await replaceList(page, 4);
        await expectBadge(page, "4");
        await page.locator("#messageList").evaluate(list => list.remove());
        await page.waitForFunction(() => !document.querySelector("link[rel~='icon']"));
        await replaceList(page, 5);
        await expectBadge(page, "5");
        await page.goto(exchanges + "?empty-icon");
        await expectBadge(page, "0");
        await page.locator("#messageList").evaluate(list => list.remove());
        await page.waitForFunction(() => document.querySelector("link[rel~='icon']")?.getAttribute("href") === null);
        assert.equal(await page.locator("link[rel~='icon']").getAttribute("type"), null);
        console.log("OK liste chargée tardivement et restauration avec ou sans icône initiale");

        await worker.evaluate(() => chrome.storage.local.set({ secureExchangeFaviconCounter: false }));
        await page.goto(exchanges);
        await replaceList(page, 7);
        await page.waitForTimeout(500);
        assert.equal(await page.locator("link[rel~='icon']").getAttribute("href"), originalHref);
        await worker.evaluate(() => chrome.storage.local.set({ secureExchangeFaviconCounter: true }));
        await page.goto("https://secure.weda.fr/FolderMedical/PatientViewForm.aspx");
        await replaceList(page, 8);
        await page.waitForTimeout(500);
        assert.equal(await page.locator("link[rel~='icon']").getAttribute("href"), originalHref);
        console.log("OK option désactivée et pages extérieures à Échanges");
    } finally {
        if (browser) await browser.close();
        assert.equal(path.dirname(path.resolve(temp)), path.resolve(os.tmpdir()));
        assert.ok(path.basename(temp).startsWith("weda-favicon-test-"));
        fs.rmSync(temp, { recursive: true, force: true });
    }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
