
// Table de conversion d'unités par défaut pour les tableaux de résultats d'examens (.hprimgrid)
// Suit le format attendu par TYPE_JSON : [libellé (correspond au code du résultat), [unité source, facteur de conversion, unité cible, décimales (optionnel)]]
const unitConverterDefaultTable = JSON.stringify([
    ["CHOLESTEROL", ["mmol/L", "0.3862", "g/L"]],
    ["CHOLESTEROL", ["g/L", "2.5893", "mmol/L"]],
    ["CHOLESTEROL HDL", ["mmol/L", "0.3862", "g/L"]],
    ["CHOLESTEROL HDL", ["g/L", "2.5893", "mmol/L"]],
    ["CHOLESTEROL LDL", ["mmol/L", "0.3862", "g/L"]],
    ["CHOLESTEROL LDL", ["g/L", "2.5893", "mmol/L"]],
    ["CHOLESTEROL H.D.L.", ["mmol/L", "0.3862", "g/L"]],
    ["CHOLESTEROL H.D.L.", ["g/L", "2.5893", "mmol/L"]],
    ["CHOLESTEROL L.D.L.", ["mmol/L", "0.3862", "g/L"]],
    ["CHOLESTEROL L.D.L.", ["g/L", "2.5893", "mmol/L"]],
    ["CHOLESTEROL TOTAL", ["mmol/L", "0.3862", "g/L"]],
    ["CHOLESTEROL TOTAL", ["g/L", "2.5893", "mmol/L"]],
    ["Non HDL", ["mmol/L", "0.3862", "g/L"]],
    ["Non HDL", ["g/L", "2.5893", "mmol/L"]],
    ["TRIGLYCERIDES", ["mmol/L", "0.8762", "g/L"]],
    ["TRIGLYCERIDES", ["g/L", "1.1413", "mmol/L"]],
    ["GLY", ["mmol/L", "0.1802", "g/L"]],
    ["GLY", ["g/L", "5.5494", "mmol/L"]],
    ["CREATININE", ["µmol/L", "0.0113", "mg/L"]],
    ["CREATININE", ["mg/L", "88.4956", "µmol/L"]],
    ["UREE", ["mmol/L", "0.0600", "g/L"]],
    ["UREE", ["g/L", "16.6667", "mmol/L"]],
    ["ACIDE URIQUE", ["µmol/L", "0.168", "mg/L"]],
    ["ACIDE URIQUE", ["mg/L", "5.9524", "µmol/L"]],
]);

