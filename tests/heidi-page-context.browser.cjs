"use strict";
// Navigateur séparé, réseau intercepté et données entièrement fictives.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = path.join(__dirname, "..");
const handler = fs.readFileSync(path.join(root, "src/background/heidiContextHandler.js"), "utf8");
const sandbox = vm.createContext({ chrome: { runtime: { onMessage: { addListener() {} } } } });
vm.runInContext(handler, sandbox);
const extract = sandbox.extractHeidiPageContext.toString();
const heidiUrl = "https://scribe.heidihealth.com/fr-FR/scribe/sessions/demo";
const transcript = '<div data-testid="transcript-content"><p>Transcription commencée à 09:00</p>'
    + '<div data-testid="transcript-item"><span class="text-xs">00:03</span><p data-testid="transcript-item-text">Douleur du genou depuis trois jours.</p></div>'
    + '<div data-testid="transcript-item"><span class="text-xs">00:12</span><p data-testid="transcript-item-text">Pas de traumatisme rapporté.</p></div></div>';
const note = '<div data-testid="template-block-editor-content"><div class="ProseMirror"><p>Note de démonstration.</p></div></div>';
const tabs = '<button role="tab" data-testid="session-tab-note" id="note/demo" aria-selected="true">Note</button>'
    + '<button role="tab" data-testid="session-tab-transcript" id="transcript/demo" aria-selected="false">Transcription</button>'
    + '<button role="tab" id="context" aria-selected="false">Contexte</button>';
function fixture({ content = transcript, delay = 0, extra = "" } = {}) {
    return '<!doctype html><html><body>' + tabs + '<div id="panel">' + note + '</div>'
        + '<div hidden>' + transcript.replaceAll("genou", "ANCIEN PATIENT") + '</div>'
        + '<button data-testid="stop-recording-button" onclick="window.recordingClicks++">Arrêter</button>'
        + '<script>window.recordingClicks=0;window.tabClicks=[];'
        + 'for(const tab of document.querySelectorAll("[role=tab]")){tab.onclick=()=>{'
        + 'window.tabClicks.push(tab.id);for(const other of document.querySelectorAll("[role=tab]"))other.setAttribute("aria-selected",String(tab===other));'
        + 'document.querySelector("#panel").innerHTML="";'
        + 'if(tab.id.startsWith("note/"))document.querySelector("#panel").innerHTML=' + JSON.stringify(note) + ';'
        + 'if(tab.id.startsWith("transcript/"))setTimeout(()=>{document.querySelector("#panel").innerHTML=' + JSON.stringify(content) + ';},' + delay + ');'
        + extra + '};}</script></body></html>';
}

async function run() {
    const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || "chromium", headless: true });
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    let html = fixture();
    await page.route("**/*", route => route.fulfill({ contentType: "text/html; charset=utf-8", body: html }));
    const check = async (name, callback) => { await callback(); console.log(`OK ${name}`); };
    const load = async body => { html = body; await page.goto(heidiUrl); };
    const read = () => page.evaluate(`(${extract})()`);
    try {
        await check("transcription montée à la demande, note préservée, onglet restauré", async () => {
            await load(fixture({ delay: 100 }));
            const result = await read();
            assert.equal(result.sessionId, "demo");
            assert.equal(result.note, "Note de démonstration.");
            assert.equal(result.transcript, "[00:03] Douleur du genou depuis trois jours.\n\n[00:12] Pas de traumatisme rapporté.");
            assert.doesNotMatch(result.transcript, /ANCIEN|commencée/);
            assert.match(result.avertissement, /pas liée automatiquement/);
            assert.equal(await page.locator('[aria-selected="true"]').getAttribute("id"), "note/demo");
            assert.equal(await page.evaluate(() => window.recordingClicks), 0);
        });
        await check("transcription déjà affichée : aucun clic", async () => {
            await load(fixture());
            await page.locator('[id="transcript/demo"]').click();
            await page.locator('#panel [data-testid="transcript-content"]').waitFor();
            await page.evaluate(() => { window.tabClicks = []; });
            const result = await read();
            assert.match(result.transcript, /genou/);
            assert.equal(result.note, "");
            assert.deepEqual(await page.evaluate(() => window.tabClicks), []);
        });
        await check("conteneur monté avant les segments : attendre le texte", async () => {
            await load(fixture({ content: '<div data-testid="transcript-content"></div>',
                extra: 'if(tab.id.startsWith("transcript/"))setTimeout(()=>{document.querySelector("#panel").innerHTML=' + JSON.stringify(transcript) + ';},100);' }));
            assert.match((await read()).transcript, /genou/);
        });
        await check("variante de sélecteur transcript p:last-child", async () => {
            await load(fixture({ content: transcript.replaceAll('data-testid="transcript-item-text"', "") }));
            assert.match((await read()).transcript, /genou/);
        });
        await check("transcription brute sans segments", async () => {
            await load(fixture({ content: '<div data-testid="transcript-content">Texte brut fictif.</div>' }));
            assert.equal((await read()).transcript, "Texte brut fictif.");
        });
        await check("marqueurs sans transcription : avertissement et note seulement", async () => {
            await load(fixture({ content: '<div data-testid="transcript-content"><p>Transcription commencée à 09:00</p><p>Transcription terminée à 09:01</p></div>' }));
            const result = await read();
            assert.equal(result.transcript, "");
            assert.match(result.transcriptWarning, /indisponible/);
        });
        await check("panneau absent : délai borné et restauration", async () => {
            await load(fixture({ content: "" }));
            const result = await read();
            assert.match(result.transcriptWarning, /indisponible/);
            assert.equal(await page.locator('[aria-selected="true"]').getAttribute("id"), "note/demo");
        });
        await check("changement de session pendant l'attente : tout résultat écarté", async () => {
            await load(fixture({ delay: 200, extra: 'if(tab.id.startsWith("transcript/"))setTimeout(()=>{document.querySelector("[data-testid=session-tab-note]").id="note/autre";document.querySelector("[data-testid=session-tab-transcript]").id="transcript/autre";},20);' }));
            const result = await read();
            assert.match(result.error, /session Heidi a changé/);
            assert.equal(result.note, undefined);
            assert.equal((await page.evaluate(() => window.tabClicks)).length, 1);
        });
        await check("choix de l'utilisateur pendant l'attente préservé", async () => {
            await load(fixture({ delay: 200, extra: 'if(tab.id.startsWith("transcript/"))setTimeout(()=>document.querySelector("#context").click(),20);' }));
            await read();
            assert.equal(await page.locator('[aria-selected="true"]').getAttribute("id"), "context");
        });
        await check("longue transcription : coupure signalée", async () => {
            await load(fixture({ content: '<div data-testid="transcript-content">' + "a".repeat(60001) + '</div>' }));
            const result = await read();
            assert.equal(result.transcript.length, 60000);
            assert.equal(result.transcriptTruncated, true);
        });
        await check("session absente : erreur, aucune lecture globale de la page", async () => {
            await load("<html><body>Connexion Heidi — texte à ne pas lire</body></html>");
            const result = await read();
            assert.match(result.error, /Ouvrez une session/);
            assert.equal(result.transcript, undefined);
        });
        await check("autre origine refusée", async () => {
            await page.goto("https://example.com/");
            assert.match((await read()).error, /plus Heidi/);
        });

        const options = fs.readFileSync(path.join(root, "src/ui/options.js"), "utf8");
        const setup = options.slice(options.indexOf("function initHeidiContextPermissions()"), options.indexOf("// 2 - Récupérer"));
        await check("activation par clic, refus, désactivation et permissions minimales", async () => {
            await load('<button id="heidi-context-enable">Activer</button><button id="heidi-context-disable">Désactiver</button><span id="heidi-context-status"></span>');
            await page.evaluate(() => {
                window.permissionState = { enabled: false, granted: false, accept: false, requests: [], removals: [] };
                const state = window.permissionState;
                window.chrome = {
                    storage: { local: {
                        get: async () => ({ heidiContextEnabled: state.enabled }),
                        set: async value => { state.enabled = value.heidiContextEnabled; }
                    } },
                    permissions: {
                        contains: async () => state.granted,
                        request: async permissions => {
                            if (!navigator.userActivation.isActive) throw new Error("missing user gesture");
                            state.requests.push(permissions); state.granted = state.accept; return state.accept;
                        },
                        remove: async permissions => { state.removals.push(permissions); state.granted = false; return true; }
                    }
                };
            });
            await page.evaluate("(() => {\n" + setup + "\ninitHeidiContextPermissions();\n})()");
            await page.getByText("Accès désactivé.", { exact: true }).waitFor();
            await page.locator("#heidi-context-enable").click();
            await page.getByText(/Autorisation refusée/).waitFor();
            assert.equal(await page.evaluate(() => window.permissionState.enabled), false);
            await page.evaluate(() => { window.permissionState.accept = true; });
            await page.locator("#heidi-context-enable").click();
            await page.getByText("Accès activé.", { exact: true }).waitFor();
            assert.equal(await page.evaluate(() => window.permissionState.enabled), true);
            assert.deepEqual(await page.evaluate(() => window.permissionState.requests[1]), {
                permissions: ["scripting"], origins: ["https://scribe.heidihealth.com/*"]
            });
            await page.locator("#heidi-context-disable").click();
            await page.getByText("Accès désactivé.", { exact: true }).waitFor();
            assert.equal(await page.evaluate(() => window.permissionState.enabled), false);
            assert.deepEqual(await page.evaluate(() => window.permissionState.removals), [{ origins: ["https://scribe.heidihealth.com/*"] }]);
        });
        assert.deepEqual(errors, []);
    } finally {
        await browser.close();
    }

    // Vérifier aussi le vrai service worker et chrome.scripting (pas seulement un mock).
    // Le manifeste de cette extension de test matérialise des permissions déjà accordées.
    // Le manifeste livré conserve ces permissions facultatives.
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "weda-heidi-test-"));
    let context;
    try {
        const extension = path.join(temp, "extension");
        fs.mkdirSync(extension);
        fs.writeFileSync(path.join(extension, "handler.js"), handler);
        fs.writeFileSync(path.join(extension, "manifest.json"), JSON.stringify({
            manifest_version: 3, name: "Heidi synthetic test", version: "1.0",
            permissions: ["storage", "scripting"],
            host_permissions: ["https://scribe.heidihealth.com/*"],
            background: { service_worker: "handler.js" }
        }));
        context = await chromium.launchPersistentContext(path.join(temp, "profile"), {
            channel: "chromium", headless: true,
            ...(process.env.PLAYWRIGHT_EXTENSION_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_EXTENSION_EXECUTABLE } : {}),
            args: [`--disable-extensions-except=${extension},${root}`, `--load-extension=${extension},${root}`]
        });
        await context.route(/^https?:\/\//, route => route.fulfill({ contentType: "text/html; charset=utf-8", body: fixture() }));
        const worker = context.serviceWorkers().find(worker => worker.url().endsWith("/handler.js"))
            || await context.waitForEvent("serviceworker", { predicate: worker => worker.url().endsWith("/handler.js") });
        const target = await context.newPage();
        await target.goto(heidiUrl);
        await worker.evaluate(() => chrome.storage.local.set({ heidiContextEnabled: true }));
        const result = await worker.evaluate(() => readHeidiPageContext());
        assert.match(result.transcript, /genou/);
        assert.equal(result.note, "Note de démonstration.");
        await worker.evaluate(() => chrome.storage.local.set({ heidiContextEnabled: false }));
        assert.match((await worker.evaluate(() => readHeidiPageContext())).error, /Activez/);
        console.log("OK vrai service worker : requête d'onglets sans tabs, injection isolée, extraction et désactivation");
        const fullWorker = context.serviceWorkers().find(worker => worker.url().endsWith("/src/background.js"))
            || await context.waitForEvent("serviceworker", { predicate: worker => worker.url().endsWith("/src/background.js") });
        assert.equal(await fullWorker.evaluate(async () => {
            const deadline = Date.now() + 5000;
            while (Date.now() < deadline) {
                if ((await chrome.storage.local.get("advancedDefaultSettings")).advancedDefaultSettings) return true;
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            return false;
        }), true, "initialisation des options de l'extension complète");
        const options = await context.newPage();
        const optionErrors = [];
        options.on("pageerror", error => optionErrors.push(error.message));
        await options.goto(new URL("ui/options.html", fullWorker.url()).href);
        await options.locator("#heidi-context-enable").waitFor({ timeout: 5000 }).catch(async error => {
            throw new Error(`${error.message}\n${JSON.stringify(optionErrors)}\n${(await options.locator("body").innerText()).slice(0, 1500)}`);
        });
        await options.getByText("Accès désactivé.", { exact: true }).waitFor();
        assert.match((await fullWorker.evaluate(() => readHeidiPageContext())).error, /Activez/);
        await options.locator("#heidi-context-disable").click();
        await options.getByText("Accès désactivé.", { exact: true }).waitFor();
        console.log("OK extension complète : imports du service worker, options générées et accès désactivé par défaut");
    } finally {
        if (context) await context.close();
        assert.equal(path.dirname(path.resolve(temp)), path.resolve(os.tmpdir()));
        assert.ok(path.basename(temp).startsWith("weda-heidi-test-"));
        fs.rmSync(temp, { recursive: true, force: true });
    }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
