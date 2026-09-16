/**
 * Cette partie du data inserter permet de créer/modifier/supprimer des antécédents
 * elle prend pour entrée un json structuré pouvant être libre ou en CIM-10
 * 
 * Elle gère les antécédents en saisie libre, ou en CIM-10.
 * 
 * Elle peut également insérer des ALD,allergie, médicament.
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
            // Les résultats CIM-10 sont des icônes "main" (drag) dans l'arbre de recherche, dont le clic déclenche SetParamID(...)
            CIM10: '#ContentPlaceHolder1_ArbreCim10UCForm1_TreeViewCim10n2 img',
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

/**
 * Fonction pour insérer un antécédent. Prend en paramètre un objet avec les même données
 * que les sélecteurs définis dans l'objet ci-dessus.
 * @param {*} data 
 */
async function insertAntecedent(data = {}) {
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
        const searchInput = document.querySelector(AntecedentFormSelectors.searchPanel.searchInput);
        const toSearch = data.nom
        if (searchInput) searchInput.value = toSearch;
        searchInput.dispatchEvent(new Event('change', { bubbles: true }));
        await sleep(300); // Attend que les résultats de recherche se mettent à jour

        // Ensuite on doit sélectionner le premier résultat de la recherche et
        // l'envoyer vers l'onglet correspondant.
        const ongletCible = trouverOnglet(ongletsPossibles(), data.onglet);
        const resultatSelectionne = await selectionnerPremierResultatRecherche(data.searchType, ongletCible);
        console.log("[dataInserterATCD] Résultat sélectionné :", resultatSelectionne);

        // Dans le cas où une recherche de medicament a été effectuée, et que le princeps contiens
        // plusieurs molécules, il faut pouvoir valider le panneau.
        waitLegacyForElement(AntecedentFormSelectors.searchPanel.resultats.allergiePrincepsValidationButton, null, 300)
        .then(() => {
            console.log("[dataInserterATCD] Panneau de validation des molécules affiché.");
            document.querySelector(AntecedentFormSelectors.searchPanel.resultats.allergiePrincepsValidationButton)?.click();
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
    await waitLegacyForElement(AntecedentFormSelectors.pannelAntecedents.panel, null, 3000) // Sur les connexions lentes, 3 sec n'est pas de trop
    .catch(err => console.error("[dataInserterATCD] Erreur lors de l'attente du panneau des antécédents :", err));

    remplirPaneauAntecedent(data);

    // Validation de l'antécédent
    document.querySelector(AntecedentFormSelectors.pannelAntecedents.boutonValider)?.click();
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
        const items = document.querySelectorAll(AntecedentFormSelectors.antecedentList.atcdItem);
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
        while (document.querySelector(titleSelector) !== null && !currentTitleIsCorrect(expectedTitle)) {
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
        const titreRechercheElement = document.querySelector(AntecedentFormSelectors.searchPanel.titreRecherche);
        return titreRechercheElement ? titreRechercheElement.textContent.trim() : "";
    }

    function currentTitleIsCorrect(expectedTitle) {
        return getCurrentTitle() === expectedTitle;
    }

    console.log("[dataInserterATCD] Vérification de la modalité de recherche :", searchType);
    
    if (!currentTitleIsCorrect(expectedTitle)) {
        console.log("[dataInserterATCD] Modalité de recherche actuelle incorrecte, correction en cours...");
        const searchButton = document.querySelector(AntecedentFormSelectors.searchPanel[searchType]);
        console.log("[dataInserterATCD] Bouton de recherche à cliquer :", searchButton);
        if (searchButton) searchButton.click();
    }

    await awaitProperTitle();
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
    await waitLegacyForElement(selecteur1erResultatRecherche, null, timeoutMs)
    .catch(err => console.error("[dataInserterATCD] Erreur lors de l'attente des résultats de recherche :", err));


    const resultat = document.querySelector(selecteur1erResultatRecherche);
    if (!resultat) {
        console.log("[dataInserterATCD] Aucun résultat de recherche trouvé pour", searchType);
        return null;
    }

    console.log("[dataInserterATCD] Premier résultat de recherche sélectionné pour", searchType, ":", resultat, "de selecteur :", selecteur1erResultatRecherche);
    resultat.click(); 

    if (onglet && onglet.zoneDepot) {
        onglet.zoneDepot.click(); // Dépose l'antécédent sur l'onglet visé, ouvre le panneau
    } else {
        console.warn("[dataInserterATCD] Aucune zone de dépôt disponible pour l'onglet visé.");
    }
    return resultat.textContent;
}

/**
 * Remplis les champs d'un paneau atcd ouvert à partir des données fournies.
 */
function remplirPaneauAntecedent(data = {}) {
    console.log("[dataInserterATCD] Remplissage du panneau des antécédents avec les données :", data);
    const sel = AntecedentFormSelectors.pannelAntecedents;

    AntecedentFieldTypes.dropDownMenus.forEach(champ => {
        if (data[champ] === undefined) return;
        const element = document.querySelector(sel[champ]);
        if (element) element.value = data[champ];
    });

    AntecedentFieldTypes.dates.forEach(champ => {
        if (data[champ] === undefined) return;
        const element = document.querySelector(sel[champ]);
        if (element) element.value = data[champ];
    });

    AntecedentFieldTypes.text.forEach(champ => {
        if (data[champ] === undefined) return;
        const element = document.querySelector(sel[champ]);
        if (element) element.value = data[champ];
    });

    AntecedentFieldTypes.checkboxes.forEach(champ => {
        if (data[champ] === undefined) return;
        const element = document.querySelector(sel[champ]);
        if (element) element.checked = !!data[champ];
    });

    // La couleur nécessite d'ouvrir la palette puis de cliquer sur la case correspondante
    if (data.couleur !== undefined) {
        const openColorGrid = document.querySelector(sel.couleur.openColorGrid);
        if (openColorGrid) openColorGrid.click();

        const cible = data.couleur.trim().toLowerCase();
        const cases = document.querySelectorAll(sel.couleur.colorSquares);
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
    const tables = document.querySelectorAll(`${ongletsAutorisés}, ${ongletsInterdits}`);

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
    titre.textContent = 'Test insertAntecedent';
    titre.style.fontWeight = 'bold';
    titre.style.marginBottom = '6px';
    panneau.appendChild(titre);

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
    bouton.textContent = 'Insérer';
    bouton.style.marginTop = '4px';
    bouton.style.width = '100%';
    bouton.addEventListener('click', () => {
        const data = lireDonneesFormulaireTest(panneau);
        console.log('[dataInserterATCD] Insertion test avec données :', data);
        console.log(insertAntecedent(data));
    });
    panneau.appendChild(bouton);

    document.body.appendChild(panneau);
}

addTweak("/FolderMedical/AntecedentForm.aspx", "boutonTestAtcd", function() {
    ajouterBoutonTest();
});

