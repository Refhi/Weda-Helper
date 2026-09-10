/**
 * @file pdfParserAIExtraction.js
 * @description Complète via l'assistant IA local les champs du PDF Parser (@see features/pdfParser.js)
 * restés vides après l'analyse regex, via une complétion IA ponctuelle et silencieuse
 * (@see offscreenBridge.js requestSilentAICompletion), sans passer par le chat visible ni son
 * historique de conversation.
 */

// Champs du PDF Parser éligibles à un complément IA : clé dans extractedData, description utilisée
// dans le prompt, et test de "valeur manquante" déclenchant la tentative.
const PDF_PARSER_AI_FIELDS = [
    { key: 'documentDate', description: "Date du document, au format JJ/MM/AAAA", missing: v => !v },
    { key: 'dateOfBirth', description: "Date de naissance du patient, au format JJ/MM/AAAA", missing: v => !v },
    { key: 'nameMatches', description: "Nom complet (nom et prénom) du patient", missing: v => !v || v.length === 0 },
    { key: 'documentCommentaire', description: "Bref commentaire (1 à 2 phrases) résumant le contenu du document", missing: v => !v }
];

/**
 * Tente de compléter, via l'assistant IA local, les champs de `extractedData` non trouvés par
 * l'analyse regex. N'écrase jamais une valeur déjà trouvée. Échoue silencieusement (log uniquement)
 * si l'option est désactivée, l'IA indisponible, ou la réponse invalide : le PDF Parser continue
 * alors normalement avec les seules données regex.
 * @param {object} extractedData - Modifié en place avec les champs complétés par l'IA.
 * @param {string} fullText - Texte complet du PDF, envoyé au modèle.
 */
async function completeExtractedDataWithAI(extractedData, fullText) {
    const missingFields = PDF_PARSER_AI_FIELDS.filter(field => field.missing(extractedData[field.key]));
    if (missingFields.length === 0) return;

    const aiExtractionEnabled = await getOptionPromise('PdfParserAutoAIExtraction');
    if (!aiExtractionEnabled) return;

    const basePrompt = await getOptionPromise('PdfParserAutoAIExtractionPrompt');
    const fieldsDescription = missingFields.map(field => `- "${field.key}" : ${field.description}`).join('\n');
    const systemPrompt = `${basePrompt}\n\nChamps à renseigner (JSON, une clé par champ, valeur null si introuvable) :\n${fieldsDescription}`;

    console.log('[pdfParserAIExtraction] Champs manquants, tentative de complétion IA :', missingFields.map(f => f.key));

    let responseContent;
    try {
        responseContent = await requestSilentAICompletion(systemPrompt, fullText);
    } catch (error) {
        console.warn('[pdfParserAIExtraction] Échec de la complétion IA, poursuite sans ces champs :', error.message || error);
        return;
    }

    let parsedFields;
    try {
        parsedFields = JSON.parse(responseContent);
    } catch (error) {
        console.warn('[pdfParserAIExtraction] Réponse IA non exploitable (JSON invalide) :', responseContent);
        return;
    }

    for (const field of missingFields) {
        const value = parsedFields[field.key];
        if (value === undefined || value === null || value === '') continue;
        extractedData[field.key] = field.key === 'nameMatches' ? [value].flat() : value;
    }

    console.log('[pdfParserAIExtraction] Champs complétés par l\'IA :', extractedData);
}
