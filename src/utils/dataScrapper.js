/**
 * @file dataScrapper.js
 * @description S’occupe de récupérer les données de Weda pour les présenter à d’autres modules de façon structurée.
 * 
*/


// ─── Constantes ──────────────────────────────────────────────────────────────


/** Sélecteurs CSS centralisés — à mettre à jour si Weda change son DOM */
const SELECTORS = {
    // Boutons de navigation entre catégories
    buttons: {
        consultations:     '#ButtonConsultation',       // ouvert par défaut // Containeurs Journaliers
        resultats_examens: '#ButtonResultatExamen',     // Containeurs Journaliers
        courriers:         '#ButtonCourrier',           // Containeurs Journaliers
        vaccins:           '#ButtonVaccins',            // Containeurs spécifiques
        charts:            '#ButtonChart',              // Grand tableau de données et données très hétérogènes
        documents:         '#ButtonDocumentJointAction',// Système spécifique
        grossesse:         '#ButtonPregnant',           // Système spécifique
        arrets_travail:    '#ButtonAT',                 // Containeurs Journaliers
    },

    // Conteneurs journaliers
    dayContainer: {
        main:              "#HistoriqueUCForm1_UpdatePanelLiteralAfficheWeda .sc",
        date:              "[title='Cliquez sur la date pour ouvrir.']", // est forcément dans le main
        author:            ".sign" // est dans le main, mais présent dans chaque sous-section. A priori non gênant (?)
    },

    // Sous-types des "consultations" (filtrés par classe d’icone)
    consultationTypes: {
        consultation:      '.img16Consultation',
        certificat:        '.img16Certificat',
        demande:           '.img16Demande',
        prescription:      '.img16Prescription',
        formulaire:        '.img16Formulaire',
        recette:           '.img16Recette',
        piecesJointes:     ['.bufi', '.pjii', '.nsi'], // TODO : vérifier autres types d’éléments ?
    },
};




// ───────────────────────────────────────────────────────────────────────────────

/** 
 * @param {*} dataToRetrieve 
 * @example
 * scrapData('facturation history');
 * scrapData('facturation history', { startDate: '2023-01-01', endDate: '2023-12-31' });
 * scrapData('prescriptions');
 */
function scrapData({
    dataToRetrieve,
    fullPage = false,
    dateRange = null
} = {}) {
}


/** 
 * structure des données retour en json ?
 * en général les données vont être scrappées depuis la ligne chronologique de Weda du /FolderMedical/PopUpHistoriqueForm.aspx
 * cette page est en effet assez "pure" et évite de déclencher les scripts de Weda et WH qui peuvent ralentir le scrapping.
 */

// 1 - charger la page web popup historique en utilisant la génération d’url depuis l’api patient
// peut-être dans une iframe invisible ?
 
// 2 - y cliquer éventuellemenent sur un des boutons secondaires permettant d’accéder à une autre catégorie


// 3 - Dans la plupart des cas, on va chercher à identifier les containeurs de données. Un par jour en général.

// 4 - une fois les containeurs identifiés, on va récupérer les données voulues selon :

// 5 - enfin, on renvoie le tout sous forme d’un objet JSON structuré, avec les dates et les catégories de données.