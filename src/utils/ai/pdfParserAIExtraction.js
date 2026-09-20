/**
 * @file pdfParserAIExtraction.js
 * @description Complète via l'assistant IA local les champs du PDF Parser (@see features/pdfParser.js)
 * restés vides après l'analyse regex. L'appel se fait via le chat IA visible (@see discussionClient.js
 * whenChatApiReady/publishChatApi) : un prompt est envoyé "comme si l'utilisateur l'avait tapé",
 * donnant à l'utilisateur la visibilité sur la requête et la réponse, et la réponse attendue est un
 * appel de fonction dédié (submitPdfParserFields, @see callableFunctions.js) plutôt qu'un texte JSON
 * à parser nous-mêmes.
 */

// Champs du PDF Parser éligibles à un complément IA : clé dans extractedData, description utilisée
// dans le prompt, et test de "valeur manquante" déclenchant la tentative.
const PDF_PARSER_AI_FIELDS = [
    { key: 'documentDate', description: "Date du document, au format JJ/MM/AAAA", missing: v => !v },
    { key: 'dateOfBirth', description: "Date de naissance du patient, au format JJ/MM/AAAA", missing: v => !v },
    { key: 'nameMatches', description: "Nom complet (nom et prénom) du patient", missing: v => !v || v.length === 0 },
    { key: 'documentCommentaire', description: "Bref commentaire (1 à 2 phrases) résumant le contenu du document", missing: v => !v }
];

// Délai maximum d'attente de l'appel de fonction submitPdfParserFields avant d'abandonner (le
// client de chat peut être indisponible, désactivé, ou le modèle peut ne jamais appeler la fonction).
const PDF_PARSER_AI_TIMEOUT_MS = 30000;

// Résolveur de la complétion IA en cours (un seul PDF traité à la fois), appelé par le tool call
// "submitPdfParserFields" une fois le modèle exécuté (@see callableFunctions.js).
let pendingPdfParserResolve = null;

/**
 * Appelée par le tool call "submitPdfParserFields" : transmet les champs renvoyés par le modèle à
 * la complétion IA en attente, le cas échéant.
 * @param {object} fields
 */
function resolvePendingPdfParserFields(fields) {
    if (!pendingPdfParserResolve) {
        return { error: "Aucune complétion du PDF Parser en attente." };
    }
    pendingPdfParserResolve(fields);
    pendingPdfParserResolve = null;
    return { status: "success" };
}

/**
 * Tente de compléter, via l'assistant IA local, les champs de `extractedData` non trouvés par
 * l'analyse regex. N'écrase jamais une valeur déjà trouvée. Échoue silencieusement (log uniquement)
 * si l'option est désactivée, le chat IA indisponible, ou la fonction jamais appelée : le PDF Parser
 * continue alors normalement avec les seules données regex.
 * @param {object} extractedData - Modifié en place avec les champs complétés par l'IA.
 * @param {string} fullText - Texte complet du PDF, envoyé au modèle.
 */
async function completeExtractedDataWithAI(extractedData, fullText) {
    const missingFields = PDF_PARSER_AI_FIELDS.filter(field => field.missing(extractedData[field.key]));
    if (missingFields.length === 0) return;

    const aiExtractionEnabled = await getOptionPromise('PdfParserAutoAIExtraction');
    if (!aiExtractionEnabled) return;

    const chatApi = await Promise.race([
        whenChatApiReady(),
        new Promise(resolve => setTimeout(() => resolve(null), PDF_PARSER_AI_TIMEOUT_MS))
    ]);
    if (!chatApi) {
        console.warn('[pdfParserAIExtraction] Client de chat IA indisponible (désactivé ou non chargé), poursuite sans complétion IA.');
        return;
    }

    // Rattache la conversation au patient déjà identifié à ce stade, s'il y en a un (le PDF Parser
    // peut appeler cette fonction avant même qu'un patient n'ait été trouvé pour ce document).
    const currentPatientId = getCurrentPatientId();
    if (currentPatientId) chatApi.switchToPatient(currentPatientId);

    const basePrompt = await getOptionPromise('PdfParserAutoAIExtractionPrompt');
    const fieldsDescription = missingFields.map(field => `- "${field.key}" : ${field.description}`).join('\n');
    const prompt = `${basePrompt}\n\nAppelle la fonction submitPdfParserFields avec les champs suivants déduits du texte ci-dessous (laisse un champ vide si introuvable) :\n${fieldsDescription}\n\n--- Texte du document ---\n${fullText}\n--- Fin du texte du document ---`;

    console.log('[pdfParserAIExtraction] Champs manquants, tentative de complétion IA :', missingFields.map(f => f.key));

    let parsedFields;
    try {
        parsedFields = await new Promise((resolve, reject) => {
            pendingPdfParserResolve = resolve;
            setTimeout(() => {
                if (pendingPdfParserResolve !== resolve) return; // déjà résolu entre-temps
                pendingPdfParserResolve = null;
                reject(new Error("Délai dépassé en attendant l'appel de submitPdfParserFields"));
            }, PDF_PARSER_AI_TIMEOUT_MS);
            chatApi.sendPrompt(prompt);
        });
    } catch (error) {
        console.warn('[pdfParserAIExtraction] Échec de la complétion IA, poursuite sans ces champs :', error.message || error);
        return;
    }

    for (const field of missingFields) {
        const value = parsedFields?.[field.key];
        if (value === undefined || value === null || value === '') continue;
        extractedData[field.key] = field.key === 'nameMatches' ? [value].flat() : value;
    }

    console.log('[pdfParserAIExtraction] Champs complétés par l\'IA :', extractedData);
}

