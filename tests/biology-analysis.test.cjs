const assert = require("node:assert/strict");
const { test } = require("node:test");
const biology = require("../src/utils/biologyAnalysis.js");

function read(values, { importTable = true } = {}) {
    const row = cells => ({
        getAttribute: () => "",
        cells: cells.map(cell => ({
            textContent: Array.isArray(cell) ? cell[0] : cell,
            getAttribute: attribute => attribute === "style" && Array.isArray(cell) ? cell[1] : ""
        }))
    });
    const input = [["Libellé", "Valeur", "Unité", "Minimum", "Maximum"], ...values];
    return biology.readTable({ rows: input.map(cells => row(importTable ? ["", ...cells] : cells)) });
}

test("les normes source, les comparateurs et le signalement du laboratoire sont conservés", () => {
    const rows = read([
        ["CRP", "<5", "mg/L", "", "<5"],
        ["CRP", "5", "mg/L", "", "<5"],
        ["CRP", ["2", "color:#CE0000"], "mg/L", "1", "5"],
        ["CRP", "<3", "mg/L", "1", "5"],
        ["CRP", "3", "mg/L", "", "999999"]
    ]);
    assert.deepEqual(rows.map(cells => cells[5]), ["NORMAL", "HAUT", "À RELIRE", "NON CLASSÉ", "NON CLASSÉ"]);
    assert.equal(biology.buildTitle(biology.analyze(read([["CRP", "<3", "mg/L", "1", "5"]]), "")), "CRP ? <3 mg/L");
});

test("deux unités concordantes donnent une ligne, deux valeurs distinctes demandent une relecture", () => {
    const source = [
        ["HbA1c", "7,1", "%", "4", "6"],
        ["Hémoglobine glyquée", "54", "mmol/mol", "20", "42"]
    ];
    const matching = biology.analyze(read(source, { importTable: false }), "");
    assert.deepEqual(matching.warnings, []);
    assert.equal(matching.rows.length, 1);
    assert.equal(biology.buildTitle(matching), "HbA1c ↑ 7,1 %");
    const conflict = biology.analyze(read([source[0], ["Hémoglobine glyquée", "93", "mmol/mol", "20", "42"]]), "");
    assert.equal(conflict.rows.length, 2);
    assert.ok(conflict.rows.every(row => row.ambiguous));
    assert.match(conflict.warnings.join(), /discordants/);
    assert.equal(biology.buildTitle(conflict), "");
    const missing = biology.analyze(read([["Glycémie", "1,7", "", "0,8", "1,1"]]), "");
    assert.match(missing.warnings.join(), /Unité absente/);
    assert.equal(biology.buildTitle(missing), "");
});

test("l'ordre du prompt ne peut pas faire disparaître une anomalie ou un marqueur de suivi", () => {
    const report = biology.analyze(read([
        ["CRP", "12", "mg/L", "", "5"], ["HDL", "0,5", "g/L", "0,4", "1"],
        ["TSH", "3", "mUI/L", "0,5", "5"]
    ]), "");
    const prefs = biology.parsePreference('{"indices":[2]}', 3);
    assert.equal(biology.buildTitle(report, prefs), "CRP ↑ 12 mg/L, HDL N 0,5 g/L, TSH N 3 mUI/L");
    assert.throws(() => biology.parsePreference('{"indices":[100]}', 3));
    assert.throws(() => biology.parsePreference('{"titre":"CRP 999"}', 3));
});

test("seules les mesures antérieures comparables sont affichées, avec leur unité source", () => {
    const report = biology.analyze(read([
        ["DFG CKD-EPI 2021", "50", "mL/min/1,73m²", "60", ""],
        ["BNP", "130", "pg/mL", "", "100"], ["CRP", "18", "mg/L", "", "5"]
    ]), "");
    const entries = [
        { label: "DFG CKD-EPI 2009", date: "02/11/2026", value: "72", unit: "mL/min/1,73m²" },
        { label: "DFG CKD-EPI 2021", date: "01/11/2026", value: "64", unit: "mL/min/1,73m²" },
        { label: "NT-proBNP", date: "02/11/2026", value: "83", unit: "pg/mL" },
        { label: "CRP", date: "03/11/2026", value: "11", unit: "mg/L" },
        { label: "CRP", date: "02/11/2026", value: "0,01", unit: "g/L" }
    ];
    const [dfg, bnp, crp] = biology.addHistory(report.rows, entries, "03/11/2026");
    assert.equal(dfg.previous?.value, "64");
    assert.equal(bnp.previous, undefined);
    assert.deepEqual(crp.previous, { value: "0,01", unit: "g/L", date: "02/11/2026" });
    const discordant = biology.addHistory(report.rows, [...entries,
        { label: "CRP", date: "02/11/2026", value: "24", unit: "mg/L" }], "03/11/2026");
    assert.equal(discordant[2].previous, undefined);
});

test("l'anapath cite la conclusion et conserve les négations ; plusieurs conclusions ne sont pas fusionnées", () => {
    const raw = "Examen histopathologique\nConclusion histologique :\nPas de dysplasie. Absence de malignité.\nSignature : Labo";
    assert.equal(biology.buildTitle(biology.analyze([], raw)), "Anapath : Pas de dysplasie. Absence de malignité.");
    const uncertain = biology.analyze([], raw + "\nConclusion : à confronter", "Anapath");
    assert.equal(uncertain.title, "");
    assert.ok(uncertain.warnings.length);
});
