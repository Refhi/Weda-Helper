/**
 * Stratégie de minimisation des tokens envoyés au modèle lors d'un tool call.
 * Appliquée uniquement sur le résultat renvoyé au modèle, jamais en amont : le dataScrapper et son
 * cache conservent les données complètes. Les fonctions ne mutent pas leur entrée (partagée avec le cache).
 *
 * Pour ajouter une règle de compaction : écrire un transformateur (clé, valeur) → valeur compactée
 * et l'ajouter à COMPACTION_RULES.
 */

/** Une analyse biologique → "1,21 g/L (N: 1,00 - 1,90) [hors normes]". */
function formaterAnalyseBio({ valeur, unite, minimum, maximum, horsNormes }) {
    const aMin = minimum && minimum !== '-';
    const aMax = maximum && maximum !== '-';
    const normes = aMin && aMax ? `(N: ${minimum} - ${maximum})` : aMin ? `(N > ${minimum})` : aMax ? `(N < ${maximum})` : '';
    return `${valeur ?? ''} ${unite ?? ''} ${normes}${horsNormes ? ' [hors normes]' : ''}`.trim();
}

/** resultatsBio : { libellé: [analyses] } → { libellé: "chaîne(s)" }. */
function compacterResultatsBio(resultatsBio) {
    if (!resultatsBio || typeof resultatsBio !== 'object' || Array.isArray(resultatsBio)) return resultatsBio;
    return Object.fromEntries(Object.entries(resultatsBio).map(([libelle, analyses]) => [
        libelle,
        Array.isArray(analyses) ? analyses.map(formaterAnalyseBio).join(' ; ') : analyses,
    ]));
}

// Règles appliquées par clé, à n'importe quel niveau de l'arbre de données.
const COMPACTION_RULES = {
    resultatsBio: compacterResultatsBio,
};

/**
 * Retourne une copie compactée des données à envoyer au modèle.
 * @param {*} node - Données issues d'un tool call (ex: recoverPatientData)
 * @returns {*}
 */
function compactDataForAI(node) {
    if (Array.isArray(node)) return node.map(compactDataForAI);
    if (!node || typeof node !== 'object') return node;
    const copie = {};
    for (const [cle, valeur] of Object.entries(node)) {
        copie[cle] = COMPACTION_RULES[cle] ? COMPACTION_RULES[cle](valeur) : compactDataForAI(valeur);
    }
    return copie;
}
