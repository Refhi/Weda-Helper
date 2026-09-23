/**
 * Cette partie du data inserter permet de créer/modifier/supprimer des antécédents
 * elle prend pour entrée un json structuré pouvant être libre ou en CIM-10
 * 
 * Elle gère les antécédents en saisie libre, ou en CIM-10.
 * 
 * Elle peut également insérer des ALD,allergie, médicament.
 * 
 * Ne peut être appellée que depuis la page antécédents.
 * Pour un appel depuis n'importe quel autre page, passer par l'appel de fonction dans dataInserter.js
 */


// Définition des sélecteurs
const AntecedentFormSelectors = {
    pannelAntecedents: {
        // Panneau global
        panel:              '#ContentPlaceHolder1_PanelModifyAntecedent',
        // Onglet dans lequel l'antécédent est classé (liste à récupérer dans antecedentList pour s'assurer de la bonne classe de chaque onglet)
        onglet:             '#ContentPlaceHolder1_DropDownListOngletByType',

        // Dates au format jj/mm/aaaa
        dateDebut:          '#ContentPlaceHolder1_TextBoxAntecedentDebut',
        dateFin:            '#ContentPlaceHolder1_TextBoxAntecedentFin',
        datePonctuelle:     '#ContentPlaceHolder1_TextBoxAntecedentDatePonctuel',
        dateAlerte:         '#ContentPlaceHolder1_TextBoxAntecedentDateAlerte',

        // Couleur
        couleur: {
            // Contient la couleur sélectionnée, ex. style="width: 60px; background-color: rgb(255, 0, 0); color: rgb(255, 0, 0);"
            input:              '#ContentPlaceHolder1_TextBoxGlossaireCouleur',
            // A cliquer pour ouvrir la palette
            openColorGrid:      '#ContentPlaceHolder1_PanelModifyAntecedent img[alt="Couleur"]',
            // Cases de couleur, ex: <td bgcolor="#0099ff" class="cell_color" onclick="setClr('#0099ff')">
            colorSquares:       '.cell_color',
        },

        // Contenu
        // Le nom est grisé quand la nomenclature est utilisée (ex. CIM-10)
        nom:                '#ContentPlaceHolder1_TextBoxAntecedentNom',
        // Le code CIM-10 associé au nom de l'antécédent, non modifiable directement.
        cim10:              '#ContentPlaceHolder1_LabelAntecedentCIM10',
        // Le commentaire libre, qui peut par exemple contenir un historique, une précision, etc.
        commentaire:        '#ContentPlaceHolder1_TextBoxAntecedentCommentaire',

        // Classification
        // La latéralité de l'antécédent, le plus souvent laissé vacant. 0 = non spécifié, 1 = Droite, 2 = Gauche, 3 = D + G
        lateralite:         '#ContentPlaceHolder1_DropDownListAntecedentLabelLateralite',
        // Permet de définir l'ordre de tri des antécédents, vieux système peu ergonomique, peu fiable. Valeur numérique, plus petit = plus haut dans la liste.
        tri:                '#ContentPlaceHolder1_TextBoxAntecedentTri',
        // DropDown menu permettant de choisir entre Confirmé (1, par défaut), Hypothétique(2), Non confirmé(3), Exclu(4), Désactivé(5)
        validation:         '#ContentPlaceHolder1_DropDownListAntecedentLabelConfirme',
        // Si coché permet d'afficher l'atcd en gras
        isImportant:        '#ContentPlaceHolder1_CheckBoxAntecedentIsImportant',
        // Si coché indique que l'antécédent est familial, et s'affichera dans les dossiers des ayants-droits. A éviter.
        isHeritage:         '#ContentPlaceHolder1_CheckBoxAntecedentIsHeritage',
        // Si coché indique que l'antécédent est privé, non visible par les autres utilisateurs.
        isPrive:            '#ContentPlaceHolder1_CheckBoxAntecedentPrive',
        // Si coché, exclut l'antécédent du VSM
        isExclureVsm:         '#ContentPlaceHolder1_CheckBoxAntecedentExclureVsm',

        // Actions
        // Permet d'ajouter un status - ne pas utiliser
        ajouterStatut:      '#ContentPlaceHolder1_LinkButtonAddAntecedentStatus',
        // Valide les modifications apportées à l'antécédent (via un .click sur le bouton)
        boutonValider:      '#ContentPlaceHolder1_ButtonValid',
        // Supprime l'antécédent (via un .click sur le bouton)
        boutonSupprimer:    '#ContentPlaceHolder1_ButtonDelete',
        // Annule les modifications apportées à l'antécédent (via un .click sur le bouton)
        boutonAnnuler:       '#ContentPlaceHolder1_ButtonCancel',
        // Télécharge un document à joindre à l'antécédent - ne pas utiliser
        boutonTelecharger:  '#ContentPlaceHolder1_ButtonTelecharger',
        // Affiche un message d'erreur si la validation échoue ? Utilitée incertaine.
        messageErreur:      '#ContentPlaceHolder1_LabelErrorMessage',
    },
    searchPanel: {
        // Le champ de recherche commun
        searchInput: "input[name='ctl00$ContentPlaceHolder1$TextBoxFind']",

        // ":has()" cible le parent direct de l'id, car le clic doit être fait sur ce conteneur et non sur l'icône elle-même
        CIM10: "*:has(> #ContentPlaceHolder1_ImageButtonPathologieCIM10)",
        allergieMolecule: "*:has(> #ContentPlaceHolder1_ImageButtonAllergieMolecule)",
        allergiePrinceps: "*:has(> #ContentPlaceHolder1_ImageButtonMedicament)",
        // aldVIDAL: "#ContentPlaceHolder1_ButtonAldVIDAL",
        titreRecherche: "#ContentPlaceHolder1_LabelILTitreRecherche",

        // Résultats de la recherche selon la modalité active
        resultats: {
            // Les résultats CIM-10 sont des icônes "main" (drag) dans l'arbre de recherche, dont le clic déclenche SetParamID(...).
            // Utilisé uniquement pour attendre l'apparition d'AU MOINS un résultat (voir trouverResultatCim10 pour le choix précis).
            CIM10: 'img[title="Drag and Drop"]',
            // Les résultats allergie portent un attribut title ("...par rapport à une classe/molécule"), contrairement aux médicaments
            allergieMolecule: '.ap[title]',
            allergiePrinceps: '.ap:not([title])',
            allergiePrincepsValidationButton: '#ContentPlaceHolder1_ButtonValidMolecule',
            // Les résultats ALD portent aussi un attribut title, mais au format "ALD : Code X", ex. <div class="ap" title="ALD : Code 08">DIABETE DE TYPE 1 ET DIABETE DE TYPE 2</div>
            // aldVIDAL: '.ap[title^="ALD"]',            
        }
    },
    antecedentList: {
        // Panneau affichant la liste des antécédents
        panel: '.sca',

        // Selon le mode de recherche, seuls certains onglets sont autorisés.
        // La table entière porte l'attribut title indiquant l'autorisation, ex. <table title="Les éléments resultant de la recherche d'une contre-indications sont autorisés à être lâché sur cet onglet.">...<div title="Type de l'onglet : Pathologies actives" class="sma">ANTÉCÉDENTS MÉDICAUX <span class="smna">[Pathologies actives]</span></div>...</table>
        // Le milieu du titre varie selon la modalité de recherche (contre-indications, molécule, etc.), d'où l'utilisation de ^= et $= pour ignorer cette partie.
        ongletsAutorisés: `table[title^="Les éléments resultant de la recherche d"][title$="sont autorisés à être lâché sur cet onglet."]`,

        // Onglets interdits (ceux qui ne peuvent pas être utilisés dans le mode de recherche actuel, mais tout de même utilisable en atcd libre)
        ongletsInterdits: `table[title^="Les éléments resultant de la recherche d"][title$="ne peuvent pas être lâché sur cet onglet."]`,

        // Bouton pour ajouter un antécédent libre
        boutonAjouterLibre: 'img[title="Ajouter un antécédent (libre)"]',

        // Chaque antécédent/allergie déjà inséré est une table cliquable qui ouvre son panneau de modification
        atcdItem: 'table[onclick^="ModifyAtcd("]'
    }
}

const AntecedentFieldTypes = {
    dropDownMenus: ['onglet', 'validation', 'lateralite'],
    dates:         ['dateDebut', 'dateFin', 'datePonctuelle', 'dateAlerte'],
    text:          ['nom', 'commentaire', 'tri'],
    checkboxes:    ['isImportant', 'isHeritage', 'isPrive', 'isExclureVsm'],
    couleur:       ['couleur'], // traitement spécifique (palette de cellules)
};

const titreRecherche = {
    CIM10: "Recherche d'une pathologie dans la base des CIM10",
    allergieMolecule: "Recherche d'une allergie dans la base des classes et des molécules",
    allergiePrinceps: "Recherche d'un médicament pour définir une allergie ou un traitement chronique",
    // aldVIDAL: "Recherche dans les ALD"
};

// Document courant utilisé par toutes les fonctions internes : soit le document de la page
// (si on est déjà sur AntecedentForm.aspx), soit celui d'une iframe cachée naviguant dessus.
let _atcdDoc = document;

/**
 * Exécute fn() dans le contexte du formulaire antécédents : si la page courante n'est pas
 * AntecedentForm.aspx, ouvre une iframe cachée dessus (pour le patient courant) et fait pointer
 * _atcdDoc sur son document le temps de l'exécution, avant de nettoyer.
 * @param {() => Promise<*>} fn
 * @param {{debug?: boolean}} [options]
 */
async function withAntecedentContext(fn, { debug = false } = {}) {
    const onAntecedentPage = window.location.pathname.includes('/FolderMedical/AntecedentForm.aspx');
    if (onAntecedentPage) {
        _atcdDoc = document;
        return await fn();
    }

    let iframe = null;
    try {
        const url = await getCurrentPatientPageUrl('/FolderMedical/AntecedentForm.aspx');
        iframe = await createHiddenIframe(url, debug, 'WedaHelperAntecedentIframe');
        const getDoc = () => iframe.contentDocument || iframe.contentWindow?.document;
        await waitForElementInDocument(getDoc, AntecedentFormSelectors.antecedentList.panel, 12000, 100);
        _atcdDoc = getDoc();
        return await fn();
    } finally {
        _atcdDoc = document;
        if (iframe && !debug) {
            iframe.remove();
        }
    }
}

/**
 * Fonction pour insérer un antécédent. Prend en paramètre un objet avec les même données
 * que les sélecteurs définis dans l'objet ci-dessus.
 * Peut être appelée depuis n'importe quelle page (voir withAntecedentContext).
 * @param {*} data
 * @param {{debug?: boolean}} [options]
 */
async function insertAntecedent(data = {}, options = {}) {
    return withAntecedentContext(() => _insertAntecedent(data), options);
}

async function _insertAntecedent(data = {}) {
    // Exemple d'objet data attendu :
    // {
    //     searchType: "CIM10" | "allergieMolecule" | "allergiePrinceps",
    //     onglet: "Choléra",
    //     date...: "2024-06-05",
    //     couleur: "#0099ff",
    //     commentaire: "valeur"
    //     autres issus de la partie classification
    // }
    // mais étonnament on peut créer un antécédent libre sans fournir aucun champ.
    
    if (!data.searchType) {
        // Aucune modalité de recherche n'est spécifiée, on crée donc un antécédent libre.
        
        // Si aucun onglet n'est spécifié dans les données, on prend le premier onglet autorisé.
        const ongletCible = trouverOnglet(ongletsPossibles(), data.onglet);
        
        // On cliques sur le bouton d'ajout d'antécédent libre.
        if (ongletCible && ongletCible.freeAtcdButton) {
            ongletCible.freeAtcdButton.click(); // Ouvre un panneau vide
        }

    } else {
        if (!data.nom) {
            console.warn("[dataInserterATCD] Aucun nom fourni pour la recherche.");
            return { success: false, message: "Aucun nom fourni pour la recherche." };
        }
        // Si le champ searchType est présent, on va utiliser le module de recherche d'atcd.
        
        await ensureProperSearchType(data.searchType);

        // On considère que la bonne modalité de recherche est maintenant sélectionnée.
        // Pour searchType="CIM10", data.nom doit être le code exact (ex. "J18.9"), déjà choisi en amont
        // par l'IA via le tool rechercherCim10 (voir callableFunctions.js).
        const searchInput = _atcdDoc.querySelector(AntecedentFormSelectors.searchPanel.searchInput);
        const toSearch = data.nom;
        if (searchInput) searchInput.value = toSearch;
        searchInput.dispatchEvent(new Event('change', { bubbles: true }));
        await sleep(300); // Attend que les résultats de recherche se mettent à jour

        // Ensuite on doit sélectionner le premier résultat de la recherche et
        // l'envoyer vers l'onglet correspondant.
        const ongletCible = trouverOnglet(ongletsPossibles(), data.onglet);
        const resultatSelectionne = await selectionnerPremierResultatRecherche(data.searchType, ongletCible);
        console.log("[dataInserterATCD] Résultat sélectionné :", resultatSelectionne);

        // Pour CIM10, l'absence de résultat "Vos favoris"/"Votre recherche" pertinent est un échec franc :
        // on n'a jamais le droit de retomber sur un chapitre/bloc générique sans rapport avec le terme cherché.
        if (data.searchType === "CIM10" && !resultatSelectionne) {
            return { success: false, message: `Aucun résultat pertinent (favoris/recherche) trouvé pour le code CIM-10 "${toSearch}".` };
        }

        // Dans le cas où une recherche de medicament a été effectuée, et que le princeps contiens
        // plusieurs molécules, il faut pouvoir valider le panneau.
        waitForElementInDocument(() => _atcdDoc, AntecedentFormSelectors.searchPanel.resultats.allergiePrincepsValidationButton, 300)
        .then(() => {
            console.log("[dataInserterATCD] Panneau de validation des molécules affiché.");
            _atcdDoc.querySelector(AntecedentFormSelectors.searchPanel.resultats.allergiePrincepsValidationButton)?.click();
        })
        .catch(err => console.error("[dataInserterATCD] Erreur lors de l'attente du panneau de validation des molécules :", err));

        // Dans le cas d'une allergie, le panneau ne s'ouvre pas automatiquement...
        if (data.searchType === "allergieMolecule" || data.searchType === "allergiePrinceps") {
            console.log("[dataInserterATCD] Ouverture du panneau de l'antécédent ciblé.", resultatSelectionne);
            ouvrirPanneauAntecedent(resultatSelectionne);
        }

        // Enfin, nous sommes dans un cas où le nom est automatique et géré par Weda. On le retire de data pour ne pas l'écraser.
        delete data.nom;
    }

    // Suppression des données d'onglet, car on considère qu'on a du déclencher avec le bon appuis.
    delete data.onglet;



    // À ce stade, le panneau de l'antécédent ciblé devrait être ouvert et prêt à être rempli.
    // on attend son ouverture
    await waitForElementInDocument(() => _atcdDoc, AntecedentFormSelectors.pannelAntecedents.panel, 3000) // Sur les connexions lentes, 3 sec n'est pas de trop
    .catch(err => console.error("[dataInserterATCD] Erreur lors de l'attente du panneau des antécédents :", err));

    remplirPaneauAntecedent(data);

    // Validation de l'antécédent
    const boutonValider = _atcdDoc.querySelector(AntecedentFormSelectors.pannelAntecedents.boutonValider);
    if (boutonValider) {
        console.log("[dataInserterATCD] Bouton de validation trouvé, clic en cours.");
        boutonValider.click();
    } else {
        console.warn("[dataInserterATCD] Bouton de validation introuvable.");
    }
    return { success: true };
}

/**
 * Modifie un antécédent déjà existant, retrouvé par son nom (comme pour l'ajout d'une allergie).
 * Demande une confirmation à l'utilisateur en détaillant les champs qui vont changer avant d'appliquer les modifications.
 * Peut être appelée depuis n'importe quelle page (voir withAntecedentContext).
 * @param {string} nomCible nom (ou début du nom) de l'antécédent à modifier
 * @param {object} data mêmes champs que insertAntecedent, uniquement ceux fournis seront modifiés
 * @param {{debug?: boolean}} [options]
 */
async function modifierAntecedent(nomCible, data = {}, options = {}) {
    return withAntecedentContext(() => _modifierAntecedent(nomCible, data), options);
}

async function _modifierAntecedent(nomCible, data = {}) {
    await ouvrirPanneauAntecedent(nomCible);
    await waitForElementInDocument(() => _atcdDoc, AntecedentFormSelectors.pannelAntecedents.panel, 3000)
    .catch(err => console.error("[dataInserterATCD] Erreur lors de l'attente du panneau des antécédents :", err));

    const avant = lireEtatPanneauAntecedent();
    const message = construireMessageConfirmationModification(avant, data);

    if (!confirm(message)) {
        _atcdDoc.querySelector(AntecedentFormSelectors.pannelAntecedents.boutonAnnuler)?.click();
        return { success: false, message: "Modification annulée par l'utilisateur." };
    }

    remplirPaneauAntecedent(data);
    _atcdDoc.querySelector(AntecedentFormSelectors.pannelAntecedents.boutonValider)?.click();
    return { success: true };
}

/**
 * Supprime un antécédent déjà existant, retrouvé par son nom.
 * Demande une confirmation à l'utilisateur en précisant l'antécédent ciblé avant suppression.
 * Peut être appelée depuis n'importe quelle page (voir withAntecedentContext).
 * @param {string} nomCible nom (ou début du nom) de l'antécédent à supprimer
 * @param {{debug?: boolean}} [options]
 */
async function supprimerAntecedent(nomCible, options = {}) {
    return withAntecedentContext(() => _supprimerAntecedent(nomCible), options);
}

async function _supprimerAntecedent(nomCible) {
    await ouvrirPanneauAntecedent(nomCible);
    await waitForElementInDocument(() => _atcdDoc, AntecedentFormSelectors.pannelAntecedents.panel, 3000)
    .catch(err => console.error("[dataInserterATCD] Erreur lors de l'attente du panneau des antécédents :", err));

    const avant = lireEtatPanneauAntecedent();
    if (!avant.nom) {
        return { success: false, message: `Aucun antécédent trouvé pour "${nomCible}".` };
    }

    if (!confirm(`Supprimer définitivement l'antécédent "${avant.nom}" ?\n${avant.commentaire ? `Commentaire : ${avant.commentaire}` : ''}`)) {
        _atcdDoc.querySelector(AntecedentFormSelectors.pannelAntecedents.boutonAnnuler)?.click();
        return { success: false, message: "Suppression annulée par l'utilisateur." };
    }

    // Le bouton de suppression déclenche lui-même un confirm() natif ; on l'autorise puisque l'utilisateur vient de valider le nôtre.
    const originalConfirm = window.confirm;
    window.confirm = () => true;
    try {
        _atcdDoc.querySelector(AntecedentFormSelectors.pannelAntecedents.boutonSupprimer)?.click();
    } finally {
        window.confirm = originalConfirm;
    }
    return { success: true };
}

/**
 * Exécute une liste d'opérations (ajout/modification/suppression) sur les antécédents en réutilisant le
 * même contexte (même iframe cachée le cas échéant), au lieu d'en rouvrir une par opération.
 * Peut être appelée depuis n'importe quelle page (voir withAntecedentContext).
 * @param {Array<{action: 'ajouter'|'modifier'|'supprimer', nomCible?: string, data?: object}>} operations
 * @param {{debug?: boolean}} [options]
 * @returns {Promise<Array<object>>} un résultat par opération, dans le même ordre
 */
async function traiterAntecedentsBatch(operations = [], options = {}) {
    return withAntecedentContext(() => _traiterAntecedentsBatch(operations), options);
}

async function _traiterAntecedentsBatch(operations = []) {
    const resultats = [];
    for (const operation of operations) {
        const { action, nomCible, data = {} } = operation || {};
        try {
            let resultat;
            switch (action) {
                case 'ajouter':
                    resultat = await _insertAntecedent({ ...data });
                    break;
                case 'modifier':
                    resultat = await _modifierAntecedent(nomCible, { ...data });
                    break;
                case 'supprimer':
                    resultat = await _supprimerAntecedent(nomCible);
                    break;
                default:
                    resultat = { success: false, message: `Action inconnue : "${action}" (attendu 'ajouter', 'modifier' ou 'supprimer').` };
            }
            resultats.push({ action, nomCible, ...resultat });
        } catch (e) {
            console.error("[dataInserterATCD] Erreur lors d'une opération du batch :", operation, e);
            resultats.push({ action, nomCible, success: false, message: `Erreur : ${e.message || e}` });
        }
        // Laisse le postback ASP.NET déclenché par l'opération précédente se terminer avant d'enchaîner.
        await attendreStabilisationPage();
    }
    return resultats;
}

/**
 * Attend que l'indicateur de chargement ASP.NET (UpdateProgress) soit masqué depuis au moins `stableMs`,
 * pour éviter d'enchaîner une opération pendant qu'un postback est encore en cours.
 * @param {number} [stableMs] durée minimale (ms) pendant laquelle l'indicateur doit rester masqué
 * @param {number} [timeoutMs] délai maximal d'attente avant d'abandonner
 */
async function attendreStabilisationPage(stableMs = 300, timeoutMs = 10000) {
    const selector = '#ContentPlaceHolder1_UpdateProgress1';
    const debut = Date.now();
    let masqueDepuis = null;
    while (Date.now() - debut < timeoutMs) {
        const element = _atcdDoc.querySelector(selector);
        const estMasque = !element || element.style.display === 'none' || element.offsetParent === null;
        if (estMasque) {
            if (masqueDepuis === null) masqueDepuis = Date.now();
            if (Date.now() - masqueDepuis >= stableMs) return;
        } else {
            masqueDepuis = null;
        }
        await sleep(20);
    }
    console.warn("[dataInserterATCD] Timeout en attendant la stabilisation de la page (UpdateProgress toujours visible).");
}

/**
 * Lit l'état actuel des champs du panneau d'antécédent ouvert, pour comparaison avant/après.
 */
function lireEtatPanneauAntecedent() {
    const sel = AntecedentFormSelectors.pannelAntecedents;
    const etat = {};

    [...AntecedentFieldTypes.dropDownMenus, ...AntecedentFieldTypes.dates, ...AntecedentFieldTypes.text].forEach(champ => {
        const element = _atcdDoc.querySelector(sel[champ]);
        if (element) etat[champ] = element.value;
    });

    AntecedentFieldTypes.checkboxes.forEach(champ => {
        const element = _atcdDoc.querySelector(sel[champ]);
        if (element) etat[champ] = element.checked;
    });

    return etat;
}

/**
 * Construit le message de confirmation listant les champs qui changeraient (avant -> après).
 */
function construireMessageConfirmationModification(avant, apres) {
    const lignes = Object.keys(apres)
        .filter(champ => champ !== 'onglet' && String(avant[champ]) !== String(apres[champ]))
        .map(champ => `${champ} : "${avant[champ] ?? ''}" → "${apres[champ]}"`);

    const intro = `Modifier l'antécédent "${avant.nom ?? ''}" ?`;
    return lignes.length ? `${intro}\n\n${lignes.join('\n')}` : intro;
}

//----------------------------------------------------------------------------------------
// Fonctions support
//----------------------------------------------------------------------------------------
/**
 * Clique sur l'antécédent/allergie de la liste dont le texte contient celui fourni, pour ouvrir son panneau de modification.
 * La comparaison se fait sur le premier mot du texte recherché (nom du médicament/pathologie), insensible à la casse,
 * car le texte affiché dans la liste peut être tronqué ou écrit différemment (ex. "gel transderm" vs "Gel transdermique Récip").
 */
async function ouvrirPanneauAntecedent(titre) {
    // On commence par vérifier que le titre est valide.
    if (!titre) return;
    const premierMot = titre.trim().split(/\s+/)[0]?.toLowerCase();
    if (!premierMot) return;

    let counter = 0;
    let item = null;
    while (!item && counter < 50) {
        const items = _atcdDoc.querySelectorAll(AntecedentFormSelectors.antecedentList.atcdItem);
        item = Array.from(items).find(el => el.textContent.toLowerCase().includes(premierMot));
        if (!item) {
            await sleep(10);
            counter++;
        }
    }

    console.log("[dataInserterATCD] Item trouvé pour ouverture du panneau :", item);
    if (item) item.click();
}

/**
 * vérifie que la modalité de recherche sélectionnée est correcte.
 */
async function ensureProperSearchType(searchType) {
    const expectedTitle = titreRecherche[searchType];

    async function awaitProperTitle() {
        const titleSelector = AntecedentFormSelectors.searchPanel.titreRecherche;
        let counter = 0;
        while (_atcdDoc.querySelector(titleSelector) !== null && !currentTitleIsCorrect(expectedTitle)) {
            counter++;
            if (counter > 50) {
                console.error("[dataInserterATCD] Timeout lors de l'attente du titre de recherche correct :", expectedTitle);
                break;
            }
            await sleep(10);
        }
        console.log("[dataInserterATCD] Titre de recherche correct :", getCurrentTitle());
    }

    function getCurrentTitle() {
        const titreRechercheElement = _atcdDoc.querySelector(AntecedentFormSelectors.searchPanel.titreRecherche);
        return titreRechercheElement ? titreRechercheElement.textContent.trim() : "";
    }

    function currentTitleIsCorrect(expectedTitle) {
        return getCurrentTitle() === expectedTitle;
    }

    console.log("[dataInserterATCD] Vérification de la modalité de recherche :", searchType);
    
    if (!currentTitleIsCorrect(expectedTitle)) {
        console.log("[dataInserterATCD] Modalité de recherche actuelle incorrecte, correction en cours...");
        const searchButton = _atcdDoc.querySelector(AntecedentFormSelectors.searchPanel[searchType]);
        console.log("[dataInserterATCD] Bouton de recherche à cliquer :", searchButton);
        if (searchButton) searchButton.click();
    }

    await awaitProperTitle();
}

/**
 * Choisit le meilleur résultat parmi l'arbre de recherche CIM-10, qui regroupe plusieurs sections
 * (dans l'ordre d'affichage : "Vos favoris : ...", "Votre recherche : ...", puis les chapitres/blocs
 * CIM-10 contenant le terme). Chaque section est une <table> d'en-tête suivie d'un <div id="...Nodes">
 * listant ses résultats cliquables (icônes "main", title="Drag and Drop"). Seules les sections "Vos
 * favoris" et "Votre recherche" contiennent des diagnostics réellement pertinents pour le terme
 * recherché : les autres sections (chapitres/blocs CIM-10 génériques) ne doivent JAMAIS être choisies
 * automatiquement, sous peine de sélectionner un diagnostic sans rapport avec la recherche.
 * @returns {Element|null} l'icône "main" du résultat choisi, ou null si aucun résultat pertinent n'est présent.
 */
function trouverResultatCim10() {
    const racine = _atcdDoc.querySelector('#ContentPlaceHolder1_ArbreCim10UCForm1_TreeViewCim10');
    if (!racine) return null;

    const sections = Array.from(racine.querySelectorAll(':scope > table')).map(table => {
        // Chaque en-tête contient 2 <a id="..."> : l'icône (id se terminant par "i", sans texte) puis le
        // lien texte réel ("Vos favoris : ...", "Votre recherche : ..."). Ne pas prendre le premier venu.
        const liensEnTete = Array.from(table.querySelectorAll('a[id]'));
        const enTete = liensEnTete.find(a => a.textContent.trim().length > 0) || liensEnTete[0];
        const nodesDiv = table.nextElementSibling?.id?.endsWith('Nodes') ? table.nextElementSibling : null;
        return {
            texte: enTete ? enTete.textContent.trim() : '',
            resultat: nodesDiv ? nodesDiv.querySelector('img[title="Drag and Drop"]') : null
        };
    }).filter(s => s.resultat);

    const favoris = sections.find(s => s.texte.startsWith('Vos favoris'));
    const recherche = sections.find(s => s.texte.startsWith('Votre recherche'));
    // Ni fallback sur sections[0], ni sur un autre chapitre générique : mieux vaut échouer que
    // d'insérer un diagnostic sans rapport avec le terme recherché.
    const choisi = favoris || recherche;
    console.log("[dataInserterATCD] Sections CIM-10 trouvées :", sections.map(s => s.texte), "→ section retenue :", choisi?.texte || "(aucune, échec)");
    return choisi?.resultat || null;
}

/**
 * Selectionne l'antécédent présent dans les résultats de la recherche CIM-10, allergie ou médicament,
 * puis le dépose sur l'onglet visé. Le clic sur le résultat "accroche" l'antécédent à la souris ;
 * il faut ensuite cliquer sur la zone de dépôt de l'onglet cible pour le relâcher et ouvrir le panneau.
 * @param {string} searchType "CIM10" | "allergieMolecule" | "allergiePrinceps"
 * @param {object} onglet onglet cible (issu de ongletsPossibles()), dont la propriété zoneDepot sera cliquée
 * @param {number} timeoutMs délai maximal d'attente d'un résultat
 */
async function selectionnerPremierResultatRecherche(searchType, onglet, timeoutMs = 5000) {
    const selecteur1erResultatRecherche = AntecedentFormSelectors.searchPanel.resultats[searchType];
    await waitForElementInDocument(() => _atcdDoc, selecteur1erResultatRecherche, timeoutMs)
    .catch(err => console.error("[dataInserterATCD] Erreur lors de l'attente des résultats de recherche :", err));


    const resultat = searchType === 'CIM10' ? trouverResultatCim10() : _atcdDoc.querySelector(selecteur1erResultatRecherche);
    if (!resultat) {
        console.log("[dataInserterATCD] Aucun résultat de recherche trouvé pour", searchType);
        return null;
    }

    console.log("[dataInserterATCD] Premier résultat de recherche sélectionné pour", searchType, ":", resultat, "de selecteur :", selecteur1erResultatRecherche);
    resultat.click(); // Déclenche une alerte CSP dans le log mais fonctionne quand même

    if (onglet && onglet.zoneDepot) {
        onglet.zoneDepot.click(); // Dépose l'antécédent sur l'onglet visé, ouvre le panneau
    } else {
        console.warn("[dataInserterATCD] Aucune zone de dépôt disponible pour l'onglet visé.");
    }
    // Pour CIM10, resultat est l'icône <img> "main" (title="Drag and Drop"), sans texte propre :
    // le libellé réel est porté par le lien <a> englobant. resultat.textContent serait alors une
    // chaîne vide, faussement interprétée comme un échec par l'appelant (`!resultatSelectionne`).
    const resultatTexte = resultat.closest('a')?.textContent?.trim() || resultat.textContent?.trim() || resultat.getAttribute('alt') || 'résultat sélectionné';
    return resultatTexte;
}

/**
 * Remplis les champs d'un paneau atcd ouvert à partir des données fournies.
 */
function remplirPaneauAntecedent(data = {}) {
    console.log("[dataInserterATCD] Remplissage du panneau des antécédents avec les données :", data);
    const sel = AntecedentFormSelectors.pannelAntecedents;

    AntecedentFieldTypes.dropDownMenus.forEach(champ => {
        if (data[champ] === undefined) return;
        const element = _atcdDoc.querySelector(sel[champ]);
        if (!element) return;

        if (champ === 'onglet') {
            // Le select "onglet" a des value numériques arbitraires (ex. 71871) sans rapport avec le libellé
            // affiché : on doit donc retrouver l'<option> correspondante par son texte plutôt que par sa value.
            const cible = String(data[champ]).trim().toLowerCase();
            const option = Array.from(element.options).find(o => o.textContent.trim().toLowerCase() === cible);
            if (option) element.value = option.value;
            else console.warn(`[dataInserterATCD] Aucun onglet trouvé pour le libellé "${data[champ]}", valeur non modifiée.`);
            return;
        }

        element.value = data[champ];
    });

    AntecedentFieldTypes.dates.forEach(champ => {
        if (data[champ] === undefined) return;
        const element = _atcdDoc.querySelector(sel[champ]);
        if (element) element.value = data[champ];
    });

    AntecedentFieldTypes.text.forEach(champ => {
        if (data[champ] === undefined) return;
        const element = _atcdDoc.querySelector(sel[champ]);
        if (element) element.value = data[champ];
    });

    AntecedentFieldTypes.checkboxes.forEach(champ => {
        if (data[champ] === undefined) return;
        const element = _atcdDoc.querySelector(sel[champ]);
        if (element) element.checked = !!data[champ];
    });

    // La couleur nécessite d'ouvrir la palette puis de cliquer sur la case correspondante
    if (data.couleur !== undefined) {
        const openColorGrid = _atcdDoc.querySelector(sel.couleur.openColorGrid);
        if (openColorGrid) openColorGrid.click();

        const cible = data.couleur.trim().toLowerCase();
        const cases = _atcdDoc.querySelectorAll(sel.couleur.colorSquares);
        const caseCorrespondante = Array.from(cases).find(c => (c.getAttribute('bgcolor') || '').toLowerCase() === cible);
        if (caseCorrespondante) caseCorrespondante.click();
    }
}



/**
 * Recherche un onglet parmi une liste par son titre, à défaut par son type (categorie),
 * et à défaut (ou si aucune recherche n'est fournie) retourne le premier onglet autorisé.
 * @param {Array} onglets liste retournée par ongletsPossibles()
 * @param {string} ongletSouhaite titre ou type recherché
 */
function trouverOnglet(ongletsPossibles, ongletSouhaite) {
    console.log("[dataInserterATCD] ongletsPossibles:", ongletsPossibles, "recherche:", ongletSouhaite);
    let toReturn = null;
    if (ongletSouhaite) {
        const cible = ongletSouhaite.trim().toLowerCase();
        const parTitre = ongletsPossibles.find(o => o.titre.trim().toLowerCase() === cible);
        if (parTitre)  toReturn = parTitre;
        const parCategorie = ongletsPossibles.find(o => o.categorie.trim().toLowerCase() === cible);
        if (parCategorie) toReturn = parCategorie;
    }
    if (!toReturn) {
        const premierOngletAutorise = ongletsPossibles.find(o => o.autorise) || ongletsPossibles[0];
        toReturn = premierOngletAutorise;
    }
    
    console.log("[dataInserterATCD] onglet trouvé:", toReturn);
    return toReturn;
}

function ongletsPossibles() {
    // Retourne la liste des onglets possibles avec les caractéristiques importantes
    // à savoir titre, catégorie, et statut d'autorisation
    const { ongletsAutorisés, ongletsInterdits } = AntecedentFormSelectors.antecedentList;
    const tables = _atcdDoc.querySelectorAll(`${ongletsAutorisés}, ${ongletsInterdits}`);

    let toReturn = [];

    Array.from(tables).forEach(table => {
        // Le nom/type de l'onglet sont portés par le div .sma (autorisé) ou .smna dans .stna (interdit)
        const ongletDiv = table.querySelector('.sma, .stna > .smna');
        if (!ongletDiv) return;

        const nom = ongletDiv.textContent.split('[')[0].trim();
        const type = (ongletDiv.getAttribute('title') || '').replace("Type de l'onglet :", '').trim();
        const freeAtcdButton = table.querySelector(AntecedentFormSelectors.antecedentList.boutonAjouterLibre);
        // console.log("[dataInserterATCD] freeAtcdButton:", freeAtcdButton);

        toReturn.push({
            titre: nom,
            categorie: type,
            autorise: table.matches(ongletsAutorisés),
            freeAtcdButton: freeAtcdButton, // Ajout du bouton d'antécédent libre pour référence future
            // Zone de dépôt = le libellé de l'onglet (onclick="OnDropPostBack(id)"), PAS l'icône verte
            // (onclick="OnDropPostBackDirect(id)") qui dépose sans ouvrir la fenêtre de paramétrage.
            zoneDepot: table.querySelector('div.sta[onclick^="OnDropPostBack("]'),
        });
    });
    // Exemple d'onglet possible
    // {
    //     "titre": "ANTÉCÉDENTS MÉDICAUX",
    //     "categorie": "Pathologies actives",
    //     "autorise": true
    // }
    console.log("[dataInserterATCD] onglets possibles:", toReturn); 
    return toReturn;
}



//----------------------------------------------------------------------------------------
/**
 * Description des champs du formulaire de test, utilisée pour générer les inputs et lire les valeurs saisies.
 */
const champsFormulaireTest = [
    { champ: 'searchType', label: 'Type de recherche', type: 'select', options: ['', 'CIM10', 'allergieMolecule', 'allergiePrinceps'] },
    { champ: 'nom', label: 'Nom / recherche', type: 'text' },
    { champ: 'onglet', label: 'Onglet cible', type: 'text' },
    { champ: 'commentaire', label: 'Commentaire', type: 'text' },
    { champ: 'dateDebut', label: 'Date début', type: 'text', placeholder: 'jj/mm/aaaa' },
    { champ: 'dateFin', label: 'Date fin', type: 'text', placeholder: 'jj/mm/aaaa' },
    { champ: 'datePonctuelle', label: 'Date ponctuelle', type: 'text', placeholder: 'jj/mm/aaaa' },
    { champ: 'dateAlerte', label: 'Date alerte', type: 'text', placeholder: 'jj/mm/aaaa' },
    { champ: 'couleur', label: 'Couleur', type: 'text', placeholder: '#0099ff' },
    { champ: 'validation', label: 'Validation', type: 'select', options: ['', '1', '2', '3', '4', '5'] },
    { champ: 'lateralite', label: 'Latéralité', type: 'select', options: ['', '0', '1', '2', '3'] },
    { champ: 'tri', label: 'Tri', type: 'text' },
    { champ: 'isImportant', label: 'Important', type: 'checkbox' },
    { champ: 'isHeritage', label: 'Héréditaire', type: 'checkbox' },
    { champ: 'isPrive', label: 'Privé', type: 'checkbox' },
    { champ: 'isExclureVsm', label: 'Exclure VSM', type: 'checkbox' },
];

/**
 * Lit les valeurs saisies dans le formulaire de test et construit l'objet data attendu par insertAntecedent.
 */
function lireDonneesFormulaireTest(panneau) {
    const data = {};
    champsFormulaireTest.forEach(({ champ, type }) => {
        const element = panneau.querySelector(`[name="${champ}"]`);
        if (!element) return;
        if (type === 'checkbox') {
            if (element.checked) data[champ] = true;
        } else if (element.value !== '') {
            data[champ] = element.value;
        }
    });
    return data;
}

/**
 * Fonction test, ajoute un panneau de test permettant de saisir tous les paramètres pertinents d'insertAntecedent
 */
function ajouterBoutonTest() {
    const panneau = document.createElement('div');
    panneau.style.position = 'fixed';
    panneau.style.top = '500px';
    panneau.style.left = '1000px';
    panneau.style.zIndex = 10000;
    panneau.style.background = '#fff';
    panneau.style.border = '1px solid #888';
    panneau.style.borderRadius = '4px';
    panneau.style.padding = '8px';
    panneau.style.maxHeight = '90vh';
    panneau.style.overflowY = 'auto';
    panneau.style.font = '12px sans-serif';
    panneau.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';

    const titre = document.createElement('div');
    titre.textContent = 'Test antécédents';
    titre.style.fontWeight = 'bold';
    titre.style.marginBottom = '6px';
    panneau.appendChild(titre);

    const ligneMode = document.createElement('div');
    ligneMode.style.display = 'flex';
    ligneMode.style.justifyContent = 'space-between';
    ligneMode.style.alignItems = 'center';
    ligneMode.style.gap = '6px';
    ligneMode.style.marginBottom = '4px';

    const labelMode = document.createElement('label');
    labelMode.textContent = 'Action';
    ligneMode.appendChild(labelMode);

    const selectMode = document.createElement('select');
    selectMode.name = 'mode';
    [['insert', 'Insérer'], ['modifier', 'Modifier'], ['supprimer', 'Supprimer']].forEach(([valeur, texte]) => {
        const optionEl = document.createElement('option');
        optionEl.value = valeur;
        optionEl.textContent = texte;
        selectMode.appendChild(optionEl);
    });
    selectMode.style.width = '140px';
    ligneMode.appendChild(selectMode);
    panneau.appendChild(ligneMode);

    const ligneNombre = document.createElement('div');
    ligneNombre.style.display = 'flex';
    ligneNombre.style.justifyContent = 'space-between';
    ligneNombre.style.alignItems = 'center';
    ligneNombre.style.gap = '6px';
    ligneNombre.style.marginBottom = '4px';

    const labelNombre = document.createElement('label');
    labelNombre.textContent = "Nombre d'exemplaires";
    ligneNombre.appendChild(labelNombre);

    const inputNombre = document.createElement('input');
    inputNombre.type = 'number';
    inputNombre.name = 'nombre';
    inputNombre.min = '1';
    inputNombre.value = '1';
    inputNombre.title = "Uniquement pour l'action 'Insérer' : insère plusieurs fois le même antécédent en un seul batch (via traiterAntecedentsBatch).";
    inputNombre.style.width = '140px';
    ligneNombre.appendChild(inputNombre);
    panneau.appendChild(ligneNombre);

    champsFormulaireTest.forEach(({ champ, label, type, options, placeholder }) => {
        const ligne = document.createElement('div');
        ligne.style.display = 'flex';
        ligne.style.justifyContent = 'space-between';
        ligne.style.alignItems = 'center';
        ligne.style.gap = '6px';
        ligne.style.marginBottom = '4px';

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.flex = '0 0 auto';
        ligne.appendChild(labelEl);

        let input;
        if (type === 'select') {
            input = document.createElement('select');
            options.forEach(opt => {
                const optionEl = document.createElement('option');
                optionEl.value = opt;
                optionEl.textContent = opt || '(aucun)';
                input.appendChild(optionEl);
            });
        } else if (type === 'checkbox') {
            input = document.createElement('input');
            input.type = 'checkbox';
        } else {
            input = document.createElement('input');
            input.type = 'text';
            if (placeholder) input.placeholder = placeholder;
        }
        input.name = champ;
        if (type !== 'checkbox') input.style.width = '140px';
        ligne.appendChild(input);

        panneau.appendChild(ligne);
    });

    const bouton = document.createElement('button');
    bouton.textContent = 'Exécuter';
    bouton.style.marginTop = '4px';
    bouton.style.width = '100%';
    bouton.addEventListener('click', () => {
        const mode = panneau.querySelector('[name="mode"]').value;
        const data = lireDonneesFormulaireTest(panneau);
        const nombre = Math.max(1, parseInt(panneau.querySelector('[name="nombre"]').value, 10) || 1);
        console.log(`[dataInserterATCD] Test '${mode}' (x${nombre}) avec données :`, data);

        if (mode === 'insert') {
            if (nombre > 1) {
                // Identiques d'un exemplaire à l'autre, pas grave : le but est juste de tester le batch.
                const operations = Array.from({ length: nombre }, () => ({ action: 'ajouter', data: { ...data } }));
                console.log(traiterAntecedentsBatch(operations));
            } else {
                console.log(insertAntecedent(data));
            }
        } else if (mode === 'modifier') {
            const nomCible = data.nom;
            delete data.nom;
            console.log(modifierAntecedent(nomCible, data));
        } else if (mode === 'supprimer') {
            console.log(supprimerAntecedent(data.nom));
        }
    });
    panneau.appendChild(bouton);

    document.body.appendChild(panneau);
}

addTweak("/FolderMedical/AntecedentForm.aspx", "boutonTestAtcd", function() {
    ajouterBoutonTest();
});

