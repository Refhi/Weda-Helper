"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.join(__dirname, "..");
const handler = fs.readFileSync(path.join(root, "src/background/heidiContextHandler.js"), "utf8");
const callable = fs.readFileSync(path.join(root, "src/utils/ai/callableFunctions.js"), "utf8");
const origin = "https://scribe.heidihealth.com/*";
const synthetic = { source: "heidi", sessionId: "demo", transcript: "Consultation fictive." };

function background({ enabled = true, permitted = true, tabs = [{ id: 7, status: "complete" }], inject } = {}) {
    const calls = { queries: [], injections: [] };
    let listener;
    const chrome = {
        storage: { local: { get: async () => ({ heidiContextEnabled: enabled }) } },
        permissions: { contains: async options => {
            assert.deepEqual(JSON.parse(JSON.stringify(options)), { permissions: ["scripting"], origins: [origin] });
            return permitted;
        } },
        tabs: { query: async options => { calls.queries.push(options); return tabs; } },
        scripting: { executeScript: async options => {
            calls.injections.push(options);
            return inject ? inject(options) : [{ result: synthetic }];
        } },
        runtime: { id: "extension-demo", onMessage: { addListener: callback => { listener = callback; } } }
    };
    const context = vm.createContext({ chrome });
    vm.runInContext(handler, context);
    return { calls, read: context.readHeidiPageContext, listener };
}

for (const options of [{ enabled: false }, { permitted: false }]) {
    test(`aucune lecture sans activation et permissions : ${JSON.stringify(options)}`, async () => {
        const bg = background(options);
        assert.match((await bg.read()).error, /Activez/);
        assert.equal(bg.calls.queries.length, 0);
        assert.equal(bg.calls.injections.length, 0);
    });
}

test("une session : injection isolée dans le seul onglet autorisé, sans permission tabs", async () => {
    const bg = background();
    assert.deepEqual(await bg.read(), synthetic);
    assert.deepEqual(JSON.parse(JSON.stringify(bg.calls.queries)), [{ url: [origin] }]);
    const injection = bg.calls.injections[0];
    assert.equal(injection.target.tabId, 7);
    assert.equal(injection.world, "ISOLATED");
    assert.equal(injection.func.name, "extractHeidiPageContext");
});

test("aucun onglet : erreur actionnable", async () => {
    assert.match((await background({ tabs: [] }).read()).error, /Aucun onglet/);
});

test("plusieurs onglets : choix explicite avant toute lecture", async () => {
    const bg = background({ tabs: [{ id: 7, title: "DEMO A" }, { id: 8, title: "DEMO B" }] });
    const result = await bg.read();
    assert.match(result.error, /Plusieurs/);
    assert.deepEqual(JSON.parse(JSON.stringify(result.tabs)), [{ tabId: 7, title: "DEMO A" }, { tabId: 8, title: "DEMO B" }]);
    assert.equal(bg.calls.injections.length, 0);
    assert.deepEqual(await bg.read({ tabId: 8 }), synthetic);
    assert.equal(bg.calls.injections[0].target.tabId, 8);
});

test("un tabId étranger ou disparu ne peut pas être injecté", async () => {
    const bg = background();
    assert.match((await bg.read({ tabId: 42 })).error, /plus disponible/);
    assert.equal(bg.calls.injections.length, 0);
});

for (const tabId of ["7", -1, null, 2.5]) {
    test(`tabId mal formé refusé : ${JSON.stringify(tabId)}`, async () => {
        const bg = background();
        assert.match((await bg.read({ tabId })).error, /invalide/);
        assert.equal(bg.calls.queries.length, 0);
    });
}

for (const state of [{ discarded: true }, { status: "loading" }]) {
    test(`onglet non prêt refusé : ${JSON.stringify(state)}`, async () => {
        const bg = background({ tabs: [{ id: 7, ...state }] });
        assert.match((await bg.read()).error, /chargement/);
        assert.equal(bg.calls.injections.length, 0);
    });
}

test("résultat absent signalé", async () => {
    assert.match((await background({ inject: async () => [] }).read()).error, /aucun contenu/);
});

test("lectures simultanées refusées et verrou libéré après échec", async () => {
    let reject;
    const bg = background({ inject: () => new Promise((resolve, fail) => { reject = fail; }) });
    const first = bg.read();
    // Laisser les vérifications asynchrones atteindre executeScript.
    await new Promise(resolve => setImmediate(resolve));
    assert.match((await bg.read()).error, /déjà en cours/);
    reject(new Error("onglet fermé"));
    await assert.rejects(first, /onglet fermé/);
    const second = bg.read();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(bg.calls.injections.length, 2);
    reject(new Error("permission retirée"));
    await assert.rejects(second);
});

const sender = { id: "extension-demo", frameId: 0, url: "https://secure.weda.fr/FolderMedical/PatientViewForm.aspx", tab: { id: 1 } };
test("passerelle réservée aux content scripts Weda de cette extension", async () => {
    for (const invalid of [{ ...sender, id: "autre" }, { ...sender, frameId: 1 }, { ...sender, url: "https://example.com/" }, { ...sender, tab: undefined }, {}]) {
        const bg = background();
        let response;
        assert.equal(bg.listener({ action: "heidiPageContext" }, invalid, value => { response = value; }), false);
        assert.match(response.error, /refusée/);
        assert.equal(bg.calls.injections.length, 0);
    }
    const bg = background();
    assert.equal(bg.listener({ action: "unrelated" }, sender, () => assert.fail()), false);
    const result = await new Promise(resolve => {
        assert.equal(bg.listener({ action: "heidiPageContext" }, sender, resolve), true);
    });
    assert.deepEqual(result, synthetic);
});

test("échec Chrome converti en erreur sans contenu médical ni détails internes", async () => {
    const bg = background({ inject: async () => { throw new Error("DÉTAIL INTERNE"); } });
    const result = await new Promise(resolve => bg.listener({ action: "heidiPageContext" }, sender, resolve));
    assert.match(result.error, /Impossible de lire Heidi/);
    assert.doesNotMatch(result.error, /DÉTAIL/);
});

function page(url, sendMessage = async () => synthetic) {
    const messages = [];
    const window = { location: { href: `https://secure.weda.fr${url}` } };
    const context = vm.createContext({
        window, console: { log() {} },
        chrome: { runtime: { sendMessage: async request => { messages.push(request); return sendMessage(request, window); } } }
    });
    // Même fichier chargé dans l'offscreen et dans les content scripts : pas d'accès DOM au chargement.
    vm.runInContext(callable, context);
    vm.runInContext('lirePdfDepuisIframesPage = async () => ({pdfText: "PDF fictif"}); lireResultatsHprim = () => ({compteRendu: "Hprim fictif"});', context);
    return { context, messages, execute: vm.runInContext("availableFunctions.pageContext.execute", context) };
}

test("routage existant PDF et Hprim conservé, sans accéder à Heidi", async () => {
    for (const [url, field] of [["/FolderMedical/PopUpViewBinaryForm.aspx", "pdfText"], ["/FolderMedical/HprimForm.aspx", "compteRendu"]]) {
        const p = page(url);
        assert.ok((await p.execute())[field]);
        assert.equal(p.messages.length, 0);
        assert.deepEqual(await p.execute({ source: "heidi" }), synthetic);
        assert.equal(p.messages.length, 1);
    }
});

test("mode auto depuis une consultation et transmission du choix d'onglet", async () => {
    const p = page("/FolderMedical/ConsultationForm.aspx?PatDk=demo");
    assert.deepEqual(await p.execute(), synthetic);
    await p.execute({ source: "heidi", tabId: 7 });
    assert.equal(p.messages[1].tabId, 7);
    assert.equal(p.messages[1].action, "heidiPageContext");
    assert.match((await p.execute({ source: "weda" })).error, /Aucune information/);
    assert.match((await p.execute({ source: "other" })).error, /inconnue/);
    assert.equal(p.messages.length, 2);
});

test("changement de page Weda : résultat Heidi écarté", async () => {
    const p = page("/FolderMedical/PatientViewForm.aspx?PatDk=A", async (request, window) => {
        window.location.href = "https://secure.weda.fr/FolderMedical/PatientViewForm.aspx?PatDk=B";
        return synthetic;
    });
    const result = await p.execute();
    assert.match(result.error, /page Weda a changé/);
    assert.equal(result.transcript, undefined);
});

test("absence de passerelle ou de réponse : erreur explicite", async () => {
    assert.match((await page("/", async () => { throw new Error("extension reloaded"); }).execute()).error, /passerelle Heidi/);
    assert.match((await page("/", async () => undefined).execute()).error, /Aucune réponse/);
});

test("livraison : autorisation facultative et chargement du gestionnaire dans le service worker", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
    assert.ok(manifest.optional_permissions.includes("scripting"));
    assert.ok(!manifest.permissions.includes("scripting"));
    assert.ok(!manifest.host_permissions.some(host => host.includes("heidi")));
    assert.match(fs.readFileSync(path.join(root, "src/background.js"), "utf8"), /background\/heidiContextHandler\.js/);
});
