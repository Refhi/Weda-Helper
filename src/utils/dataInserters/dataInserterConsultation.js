/**
 * @file dataInserterConsultation.js
 * @description Insertion de contenus dans une NOUVELLE consultation du patient courant.
 * S'appuie sur insertToDocument (dataInserter.js), exposé via insertData('toConsultation', ...).
 */


/**
 * Enregistre un contenu texte dans une NOUVELLE consultation pour le patient courant.
 * @see insertToDocument
 */
async function insertToConsultation(data, options) {
    return insertToDocument(data, options, {
        menuLabel: 'Consultation',
        editorSelector: "iframe[id^='CE_ContentPlaceHolder1_EditorConsultation'][id$='_ID_Frame'], #CE_ContentPlaceHolder1_EvenementInformationFiltreUCForm1_EditorZoneUserTextInEvement_ID_Frame",
        iframeName: 'WedaHelperConsultationIframe',
    });
}
