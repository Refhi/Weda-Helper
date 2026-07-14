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
function scrapData({loadFullFile = false, dataToRetrieve, dateRange = null} = {}) {
}


/** 
 * structure des données retour en json ?
 * en général les données vont être scrappées depuis la ligne chronologique de Weda du /FolderMedical/PopUpHistoriqueForm.aspx
 * cette page est en effet assez "pure" et évite de déclencher les scripts de Weda et WH qui peuvent ralentir le scrapping.
 */

// 1 - charger la page web popup historique en utilisant la génération d’url depuis l’api patient
// peut-être dans une iframe invisible ?
 
// 2 - y appliquer les modifications nécessaires en terme de filtres :
// loadFullFile = false : de base le dossier n’affiche que le dossier récent
// wedaFiltersToApply = ['consultations', 'certificats', 'demandes', 'prescriptions', 'formulaires', 'documents joints', 'recettes']