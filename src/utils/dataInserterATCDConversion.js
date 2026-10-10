/**
 * Conversion d'un antécédent existant (le plus souvent libre) en antécédent codé CIM-10.
 * S'appuie sur les fonctions de dataInserterATCD.js (contexte _atcdDoc, ouverture/lecture du panneau, insertion CIM-10).
 */



/**
 * Lit directement dans le panneau d'antécédent ouvert toutes les valeurs à reporter sur le nouvel antécédent
 * (le dataScrapper ne les fournit pas toutes : couleur, latéralité, options, etc.).
 * @returns {{nom: string, onglet: string|undefined, donnees: object}} nom/onglet (libellé) de l'antécédent d'origine,
 *   et donnees au format attendu par remplirPaneauAntecedent (sans nom ni onglet, imposés par la recherche CIM-10)
 */
function lireDonneesPanneauPourConversion() {
    const sel = AntecedentFormSelectors.pannelAntecedents;
    const etat = lireEtatPanneauAntecedent();

    const donnees = {};
    [...AntecedentFieldTypes.dates, ...AntecedentFieldTypes.checkboxes, 'validation', 'lateralite', 'tri', 'commentaire']
        .forEach(champ => {
            if (etat[champ] !== undefined) donnees[champ] = etat[champ];
        });

    // La couleur est portée par la value de l'input (ex. "#3333ff", au format des cases de la palette) ; sans couleur, elle ne contient que des espaces.
    const couleur = _atcdDoc.querySelector(sel.couleur.input)?.value.trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(couleur || '')) donnees.couleur = couleur;

    // La value du select d'onglet est un identifiant sans rapport avec le libellé : on lit donc le libellé de l'option choisie.
    const onglet = _atcdDoc.querySelector(sel.onglet)?.selectedOptions?.[0]?.textContent?.trim() || undefined;
    return { nom: etat.nom, onglet, donnees };
}

/**
 * Crée un antécédent CIM-10 portant les mêmes valeurs que l'antécédent libre existant `nomCible`, puis supprime ce dernier
 * (avec la confirmation utilisateur de _supprimerAntecedent).
 * Si le libellé de l'antécédent d'origine n'est pas strictement identique à celui du nouvel antécédent, il est
 * inséré en première ligne du commentaire.
 * À appeler dans le contexte de withAntecedentContext.
 * @param {string} nomCible nom de l'antécédent existant à convertir
 * @param {{nom: string}} data nom = code CIM-10 exact (choisi au préalable via rechercherCim10)
 */
async function _convertirAntecedentEnCim10(nomCible, { nom: codeCim10 } = {}) {
    if (!nomCible || !codeCim10) {
        return { success: false, message: "'nomCible' et 'data.nom' (code CIM-10) sont requis." };
    }

    const item = await ouvrirPanneauAntecedent(nomCible, { codifie: false });
    if (!item) return { success: false, message: messageAntecedentIntrouvable(nomCible, false) };
    await waitForElementInDocument(() => _atcdDoc, AntecedentFormSelectors.pannelAntecedents.panel, 3000)
    .catch(err => console.error("[dataInserterATCD] Erreur lors de l'attente du panneau des antécédents :", err));

    const origine = lireDonneesPanneauPourConversion();
    if (!origine.nom) {
        return { success: false, message: `Aucun antécédent trouvé pour "${nomCible}".` };
    }

    const nouveau = { searchType: 'CIM10', nom: codeCim10, ...origine.donnees };

    // Un onglet interdit pour la recherche CIM-10 n'a pas de zone de dépôt : on laisse alors _insertAntecedent choisir.
    const onglet = origine.onglet;
    const ongletOrigine = ongletsPossibles().find(o => o.titre.toLowerCase() === (onglet || '').toLowerCase());
    if (ongletOrigine?.autorise) nouveau.onglet = onglet;

    _atcdDoc.querySelector(AntecedentFormSelectors.pannelAntecedents.boutonAnnuler)?.click();
    await attendreStabilisationPage();

    // Le libellé du nouvel antécédent n'est connu qu'une fois le panneau ouvert, d'où ce rappel avant remplissage.
    const avantRemplissage = donnees => {
        if (lireEtatPanneauAntecedent().nom !== origine.nom) {
            donnees.commentaire = origine.donnees.commentaire ? `${origine.nom}\n${origine.donnees.commentaire}` : origine.nom;
        }
    };
    const resultat = await _insertAntecedent(nouveau, { avantRemplissage });
    if (!resultat.success) return resultat;

    const messages = [];
    if (!nouveau.onglet && onglet) {
        messages.push(`Onglet d'origine "${onglet}" inutilisable pour un antécédent CIM-10 : onglet par défaut utilisé.`);
    }

    // Le nouvel antécédent étant codifié et l'original non, la recherche avec codifie:false cible bien l'original même à titre identique.
    await attendreStabilisationPage();
    const suppression = await _supprimerAntecedent(origine.nom, { codifie: false });
    if (!suppression.success) messages.push(`Antécédent d'origine non supprimé : ${suppression.message}`);
    return messages.length ? { ...resultat, message: messages.join(' ') } : resultat;
}
