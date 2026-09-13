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
        // La latéralité de l'antécédent, le plus souvent laissé vacant.
        lateralite:         '#ContentPlaceHolder1_DropDownListAntecedentLabelLateralite',
        // Permet de définir l'ordre de tri des antécédents, vieux système peu ergonomique, peu fiable.
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
        exclureVsm:         '#ContentPlaceHolder1_CheckBoxAntecedentExclureVsm',

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
    searchPanel: {},
    antecedentList: {
        // Panneau affichant la liste des antécédents
        panel: '.sca',

        // Selon le mode de recherche, seuls certains onglets sont autorisés.
        // ex. <div title="Type de l'onglet : Allergies" class="sma">Allergie <span class="smna">[Allergies]</span></div>
        ongletsAutorisés: '.sma',

        // Onglets interdits
        // ex. <div style="cursor:not-allowed;" onclick="StopDrag();" class="stna"><div title="Type de l'onglet : Antécédents" class="smna"><div style="height:12px;width:12px;float:left;" title="Non droppable" class="imgForbidden"></div>ANTECEDENTS GYNECOLOGIQUES <span class="smno">[Vous ne pouvez pas dropper dans cette zone]</span></div></div>
        ongletsInterdits: '.stna > .smna'

    }
}

/**
 * Fonction pour insérer un antécédent. Prend en paramètre un objet avec les même données
 * que les sélecteurs définis dans l'objet ci-dessus.
 * @param {*} data 
 */
async function insertAntecedent(data) {
    // Si le champ CIM-10 n'est pas présent, on crée un antécédent libre dans l'onglet demandé.

    // Implementation for inserting antecedent data goes here
}