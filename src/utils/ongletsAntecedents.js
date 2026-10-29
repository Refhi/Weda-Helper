/**
 * @file ongletsAntecedents.js
 * @description Règles de compatibilité entre la modalité d'ajout d'un antécédent et le type d'onglet Weda.
 * Chargé à la fois dans le content script et dans la page offscreen (chaînes d'outils de l'IA).
 */

/**
 * Filtre les onglets pouvant recevoir un ajout selon sa modalité :
 * CIM-10 uniquement sur les onglets de pathologies, antécédents, antécédents familiaux et dépistages ;
 * allergie par molécule uniquement sur les allergies ; médicament (princeps) sur les allergies ou traitements ;
 * antécédent libre (searchType absent) partout.
 * @param {Array<{titre: string, type?: string, categorie?: string}>} onglets type (storage) ou categorie (ongletsPossibles)
 * @param {string} [searchType]
 */
function ongletsCompatibles(onglets = [], searchType) {
    const typesParRecherche = {
        CIM10: ['Pathologies actives', 'Antécédents', 'Antécédents familiaux', 'Prévention et dépistages'],
        allergieMolecule: ['Allergies'],
        allergiePrinceps: ['Allergies', 'Traitement']
    };
    const types = typesParRecherche[searchType]?.map(t => t.toLowerCase());
    return types ? onglets.filter(o => types.includes((o.type ?? o.categorie ?? '').trim().toLowerCase())) : onglets;
}
