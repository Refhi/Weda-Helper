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

        CIM10: "ContentPlaceHolder1_ImageButtonPathologieCIM10",
        allergieMolecule: "ContentPlaceHolder1_ImageButtonAllergieMolecule",
        allergiePrinceps: "ContentPlaceHolder1_ImageButtonMedicament",
        // aldVIDAL: "ContentPlaceHolder1_ButtonAldVIDAL",
        titreRecherche: "ContentPlaceHolder1_LabelILTitreRecherche",

        // Résultats de la recherche selon la modalité active
        resultats: {
            // Les résultats CIM-10 sont des liens dans l'arbre de recherche (sFINDER)
            CIM10: 'a[href*="sFINDER"]',
            // Les résultats allergie portent un attribut title ("...par rapport à une classe/molécule"), contrairement aux médicaments
            allergieMolecule: '.ap[title]',
            allergiePrinceps: '.ap:not([title])',
            // Les résultats ALD portent aussi un attribut title, mais au format "ALD : Code X", ex. <div class="ap" title="ALD : Code 08">DIABETE DE TYPE 1 ET DIABETE DE TYPE 2</div>
            // aldVIDAL: '.ap[title^="ALD"]',
        }
    },
    antecedentList: {
        // Panneau affichant la liste des antécédents
        panel: '.sca',

        // Selon le mode de recherche, seuls certains onglets sont autorisés.
        // La table entière porte l'attribut title indiquant l'autorisation, ex. <table title="Les éléments resultant de la recherche d'une contre-indications sont autorisés à être lâché sur cet onglet.">...<div title="Type de l'onglet : Pathologies actives" class="sma">ANTÉCÉDENTS MÉDICAUX <span class="smna">[Pathologies actives]</span></div>...</table>
        ongletsAutorisés: `table[title="Les éléments resultant de la recherche d'une contre-indications sont autorisés à être lâché sur cet onglet."]`,

        // Onglets interdits (ceux qui ne peuvent pas être utilisés dans le mode de recherche actuel, mais tout de même utilisable en atcd libre)
        ongletsInterdits: `table[title="Les éléments resultant de la recherche d'une contre-indications ne peuvent pas être lâché sur cet onglet."]`,

        // Bouton pour ajouter un antécédent libre
        boutonAjouterLibre: 'img[title="Ajouter un antécédent (libre)"]'
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
    // Création de l'objet antecedent à partir des données fournies
    let antecedent = {} // Etonnament, aucun champ n'est nécessaire ! On peut très bien créer un antécédent libre totalement vide.

    // Lecture des onglets possibles pour déterminer où insérer l'antécédent
    const onglets = ongletsPossibles();
    console.log("[dataInserterATCD] Onglets possibles:", onglets);


    if (!data.searchType) {
        // Aucune modalité de recherche n'est spécifiée, on crée donc un antécédent libre.
        
        // Si aucun onglet n'est spécifié dans les données, on prend le premier onglet disponible.
        const onglet = trouverOnglet(onglets, data.onglet) || onglets[0];
        
        // On cliques sur le bouton d'ajout d'antécédent libre.
        if (onglet && onglet.freeAtcdButton) {
            onglet.freeAtcdButton.click(); // Ouvre un panneau vide
        }

        // Suppression des données d'onglet, car on considère qu'on a du déclencher avec le bon appuis.
        delete data.onglet;
    } else {
        if (!data.nom) {
            console.warn("[dataInserterATCD] Aucun nom fourni pour la recherche.");
            return { success: false, message: "Aucun nom fourni pour la recherche." };
        }
        // Si le champ searchType est présent, on va utiliser le module de recherche d'atcd.
        
        // Est-ce que la bonne modalité de recherche est déjà sélectionnée ?
        const titreRechercheElement = document.querySelector(AntecedentFormSelectors.searchPanel.titreRecherche);
        if (titreRechercheElement && titreRechercheElement.textContent.trim() !== titreRecherche[data.searchType]) {
            const searchButton = document.querySelector(AntecedentFormSelectors.searchPanel[data.searchType]);
            // Non, donc on clique sur le bouton correspondant à la modalité de recherche souhaitée.
            if (searchButton) searchButton.click();
            await sleep(100) // Et on attend que le panneau de recherche se mette à jour
        }
        // On considère que la bonne modalité de recherche est maintenant sélectionnée.
        const searchInput = document.querySelector(AntecedentFormSelectors.searchPanel.searchInput);
        const toSearch = data.nom
        if (searchInput) searchInput.value = toSearch;
        searchInput.dispatchEvent(new Event('change', { bubbles: true }));
        await sleep(300); // Attend que les résultats de recherche se mettent à jour

        // Ensuite on doit sélectionner le premier résultat de la recherche et
        // l'envoyer vers l'onglet correspondant.
        const ongletCible = trouverOnglet(onglets, data.onglet) || onglets[0];
        await selectionnerPremierResultatRecherche(data.searchType, ongletCible);

    }

    // À ce stade, le panneau de l'antécédent ciblé devrait être ouvert et prêt à être rempli.
    await waitLegacyForElement(AntecedentFormSelectors.pannelAntecedents.panel, null, 5000)
    .catch(err => console.error("[dataInserterATCD] Erreur lors de l'attente du panneau des antécédents :", err));

    remplirPaneauAntecedent(data);

    // Validation de l'antécédent
    document.querySelector(AntecedentFormSelectors.pannelAntecedents.boutonValider)?.click();
}

//----------------------------------------------------------------------------------------
// Fonctions support
//----------------------------------------------------------------------------------------
/**
 * Selectionne l'antécédent présent dans les résultats de la recherche CIM-10, allergie ou médicament,
 * puis le dépose sur l'onglet visé. Le clic sur le résultat "accroche" l'antécédent à la souris ;
 * il faut ensuite cliquer sur la zone de dépôt de l'onglet cible pour le relâcher et ouvrir le panneau.
 * @param {string} searchType "CIM10" | "allergieMolecule" | "allergiePrinceps"
 * @param {object} onglet onglet cible (issu de ongletsPossibles()), dont la propriété zoneDepot sera cliquée
 * @param {number} timeoutMs délai maximal d'attente d'un résultat
 */
async function selectionnerPremierResultatRecherche(searchType, onglet, timeoutMs = 15000) {
    const selecteur = AntecedentFormSelectors.searchPanel.resultats[searchType];
    if (!selecteur) return null;

    const debut = Date.now();
    let resultat = null;
    while (Date.now() - debut < timeoutMs) {
        resultat = document.querySelector(selecteur);
        if (resultat) break;
        await sleep(300);
    }

    if (!resultat) {
        console.log("[dataInserterATCD] Aucun résultat de recherche trouvé pour", searchType);
        return null;
    }

    resultat.click(); // Accroche l'antécédent à la souris
    await sleep(300);

    if (onglet && onglet.zoneDepot) {
        onglet.zoneDepot.click(); // Dépose l'antécédent sur l'onglet visé, ouvre le panneau
    } else {
        console.warn("[dataInserterATCD] Aucune zone de dépôt disponible pour l'onglet visé.");
    }
    await sleep(800); // Laisse le temps à la popup de s'ouvrir/se mettre à jour
    return resultat;
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
 * Recherche un onglet parmi une liste par son titre, ou à défaut par son type (categorie), en ignorant la casse et les espaces superflus.
 * @param {Array} onglets liste retournée par ongletsPossibles()
 * @param {string} recherche titre ou type recherché
 */
function trouverOnglet(onglets, recherche) {
    if (!recherche) return undefined;
    const cible = recherche.trim().toLowerCase();
    return onglets.find(o => o.titre.trim().toLowerCase() === cible)
        || onglets.find(o => o.categorie.trim().toLowerCase() === cible);
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
        console.log("[dataInserterATCD] freeAtcdButton:", freeAtcdButton);

        toReturn.push({
            titre: nom,
            categorie: type,
            autorise: table.matches(ongletsAutorisés),
            freeAtcdButton: freeAtcdButton, // Ajout du bouton d'antécédent libre pour référence future
            zoneDepot: table // La table de l'onglet est elle-même la cible sur laquelle cliquer pour y déposer un antécédent accroché
        });
    });
    // Exemple d'onglet possible
    // {
    //     "titre": "ANTÉCÉDENTS MÉDICAUX",
    //     "categorie": "Pathologies actives",
    //     "autorise": true
    // }
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

addTweak("/FolderMedical/AntecedentForm.aspx", "*boutonTestAtcd", function() {
    ajouterBoutonTest();
});

