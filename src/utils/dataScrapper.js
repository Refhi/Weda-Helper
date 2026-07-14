/**
 * @file dataScrapper.js
 * @description S’occupe de récupérer les données de Weda pour les présenter à d’autres modules de façon structurée.
 * 
*/


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
/**
 * les catégories secondaires possibles : (des id d’éléments à cliquer)
 * - #ButtonConsultation (ouvert par défaut)
 * - #ButtonResultatExamen
 * - #ButtonCourrier
 * - #ButtonVaccins
 * - #ButtonChart
 * - #ButtonDocumentJointAction
 * - #ButtonPregnant
 * - #ButtonAT
 */



// 3 - Dans la plupart des cas, on va chercher à identifier les containeurs de données. Un par jour en général.

// 4 - une fois les containeurs identifiés, on va récupérer les données voulues selon :
/**
 * spécifiquement pour les consultations, voici les sous-catégories possibles
 * qui seront à filtrer au sein du code (là on va devoir séparer les éléments par leur class)
 * - .img16Consultation
 * - .img16Certificat
 * - .img16Demande
 * - .img16Prescription
 * - .img16Formulaire
 * - [.bufi, .pjii, .nsi]//un poil différent car ici chaque élément // TODO : vérifier autres types d’éléments ?
 * - .img16Recette
 */

// 5 - enfin, on renvoie le tout sous forme d’un objet JSON structuré, avec les dates et les catégories de données.