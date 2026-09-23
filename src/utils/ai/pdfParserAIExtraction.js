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

// Champs supplémentaires confiés à l'IA lorsque l'option PdfParserAutoAIFullMode est activée : dans ce
// mode, ils sont systématiquement redemandés au modèle (et remplacent le résultat de l'analyse par
// mots-clés/gabarit de titre), avec pour seule aide la liste des classifications réellement
// disponibles dans Weda (@see features/pdfParser.js initDocumentTypes, passée en paramètre par l'appelant).
const PDF_PARSER_AI_FULL_MODE_FIELDS = [
    { key: 'documentTitle', description: "Titre complet du document, tel qu'il doit apparaître dans le dossier patient" },
    { key: 'destinationClass', description: "Destination du classement : '1' pour Consultation, '2' pour Résultats d'examens, '3' pour Courrier" },
    { key: 'documentType', description: "Classification du document, parmi les valeurs listées ci-dessous" }
];

// Délai maximum d'attente de l'appel de fonction submitPdfParserFields avant d'abandonner (le
// client de chat peut être indisponible, désactivé, ou le modèle peut ne jamais appeler la fonction).
const PDF_PARSER_AI_TIMEOUT_MS = 60000;

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
        // Lève une erreur (plutôt que de la renvoyer comme résultat) pour que le tool call soit
        // marqué en échec côté chat (bulle ❌) et que le modèle en informe explicitement l'utilisateur,
        // au lieu d'un résultat "réussi" contenant silencieusement un champ error ignoré.
        throw new Error("Aucune complétion du PDF Parser en attente (délai déjà dépassé, ou fonction appelée deux fois pour la même demande).");
    }
    pendingPdfParserResolve(fields);
    pendingPdfParserResolve = null;
    return { status: "success" };
}

/**
 * Tente de compléter, via l'assistant IA local, les champs non trouvés par l'analyse regex dans
 * `extractedData`. Échoue silencieusement (log uniquement) si l'option est désactivée, le chat IA
 * indisponible, ou la fonction jamais appelée : le PDF Parser continue alors normalement avec les
 * seules données regex.
 * @param {object} extractedData - Données déjà extraites, utilisées pour déterminer les champs manquants (non modifié).
 * @param {string} fullText - Texte complet du PDF, envoyé au modèle si suffisamment lisible.
 * @param {string|null} urlPDF - URL du PDF (@see extractBasePdfData), utilisée pour envoyer le PDF
 * complet en pièce jointe (@see discussionClient.js sendPromptWithFile) quand le texte extrait est
 * absent ou illisible (PDF scanné, police non standard...).
 * @param {string[]|null} [possibleDocumentTypes] - Valeurs de classification réellement disponibles dans
 * Weda (@see features/pdfParser.js initDocumentTypes), récupérées par l'appelant au moment de l'appel.
 * Utilisée uniquement en mode complet (PdfParserAutoAIFullMode), pour contraindre le champ documentType.
 * @returns {Promise<object>} Les champs complétés par l'IA, objet vide si rien n'a pu être complété.
 */
async function completeExtractedDataWithAI(extractedData, fullText, urlPDF = null, possibleDocumentTypes = null) {
    const aiExtractionEnabled = await getOptionPromise('PdfParserAutoAIExtraction');
    if (!aiExtractionEnabled) return {};

    const fullModeEnabled = await getOptionPromise('PdfParserAutoAIFullMode');
    const missingFields = PDF_PARSER_AI_FIELDS.filter(field => field.missing(extractedData[field.key]));
    const fieldsToAsk = fullModeEnabled ? missingFields.concat(PDF_PARSER_AI_FULL_MODE_FIELDS) : missingFields;
    if (fieldsToAsk.length === 0) return {};

    const chatApi = await Promise.race([
        whenChatApiReady(),
        new Promise(resolve => setTimeout(() => resolve(null), PDF_PARSER_AI_TIMEOUT_MS))
    ]);
    if (!chatApi) {
        console.warn('[pdfParserAIExtraction] Client de chat IA indisponible (désactivé ou non chargé), poursuite sans complétion IA.');
        return {};
    }

    // Arrête d'abord toute réflexion/génération en cours pour ce patient (ex: PDF précédent encore
    // en attente de tool call) avant de repartir d'une conversation vierge : sans ça, l'ancien appel
    // pouvait rester bloqué indéfiniment (son submitPdfParserFields n'arrivant jamais après le reset).
    chatApi.stop();

    // Repart d'une conversation vierge à chaque PDF : sans cela, l'historique (et les pièces
    // jointes) des documents précédents restait dans le contexte envoyé au modèle.
    chatApi.resetConversation();

    // Rattache la conversation au patient déjà identifié à ce stade, s'il y en a un (le PDF Parser
    // peut appeler cette fonction avant même qu'un patient n'ait été trouvé pour ce document).
    // getCurrentPatientId() se base sur l'URL de la page, absente sur la page d'import
    // (UpLoaderForm.aspx) : on se rabat alors sur le patient sélectionné dans la grille d'import.
    const currentPatientId = getImportGridPatientId();
    if (currentPatientId) {
        console.log('[pdfParserAIExtraction] Association de la conversation au patient :', currentPatientId);
        // Attend la resynchronisation (stateSync) avant d'envoyer le prompt : sans ça, sur le tout
        // premier switch (port offpage venant d'être créé), le prompt pouvait être affiché puis
        // effacé par un stateSync arrivant après coup (@see discussionClient.js switchToPatient).
        // Filet de sécurité si le stateSync ne revient jamais (onglet/offpage indisponible).
        await Promise.race([
            chatApi.switchToPatient(currentPatientId),
            new Promise(resolve => setTimeout(resolve, 5000))
        ]);
    } else {
        console.log('[pdfParserAIExtraction] Aucun patient associé à la conversation.');
    }



    const basePrompt = await getOptionPromise('PdfParserAutoAIExtractionPrompt');
    const fieldsDescription = fieldsToAsk.map(field => `- "${field.key}" : ${field.description}`).join('\n');
    const categorizationContext = (fullModeEnabled && possibleDocumentTypes?.length)
        ? `\n\nValeurs autorisées pour "documentType" : ${possibleDocumentTypes.join(', ')}.`
        : '';
    const instructions = `${basePrompt}${categorizationContext}\n\nPour répondre, appelle OBLIGATOIREMENT la fonction submitPdfParserFields. Les dates DOIVENT être au format JJ/MM/AAAA. Voici les champs à compléter :\n${fieldsDescription}`;

    // Texte extrait absent/illisible (PDF scanné, police non standard...) : on envoie le PDF
    // complet en pièce jointe (@see isPdfTextReadable, discussionClient.js) plutôt que le texte,
    // pour laisser le modèle l'analyser lui-même (OCR via image si nécessaire).
    const textReadable = isPdfTextReadable(fullText);
    let sendToChatApi;
    if (!textReadable && urlPDF) {
        console.log('[pdfParserAIExtraction] Texte du PDF absent ou illisible, envoi du PDF complet en pièce jointe.');
        const pdfFile = new File([await pdfBlob(urlPDF)], 'document.pdf', { type: 'application/pdf' });
        sendToChatApi = () => chatApi.sendPromptWithFile(instructions, pdfFile);
    } else {
        const prompt = `${instructions}\n\n--- Texte du document ---\n${fullText}\n--- Fin du texte du document ---`;
        sendToChatApi = () => chatApi.sendPrompt(prompt);
    }

    console.log('[pdfParserAIExtraction] Champs manquants, tentative de complétion IA :', fieldsToAsk.map(f => f.key));

    let parsedFields;
    try {
        parsedFields = await new Promise((resolve, reject) => {
            pendingPdfParserResolve = resolve;
            setTimeout(() => {
                if (pendingPdfParserResolve !== resolve) return; // déjà résolu entre-temps
                pendingPdfParserResolve = null;
                reject(new Error("Délai dépassé en attendant l'appel de submitPdfParserFields"));
            }, PDF_PARSER_AI_TIMEOUT_MS);
            sendToChatApi();
        });
    } catch (error) {
        console.warn('[pdfParserAIExtraction] Échec de la complétion IA, poursuite sans ces champs :', error.message || error);
        return {};
    }

    const completedFields = {};
    for (const field of fieldsToAsk) {
        const value = parsedFields?.[field.key];
        if (value === undefined || value === null || value === '') continue;
        if (field.key === 'nameMatches') {
            completedFields[field.key] = [value].flat();
        } else if (field.key === 'documentCommentaire') {
            // Marque le commentaire comme généré par l'IA, pour distinction visuelle dans le formulaire
            completedFields[field.key] = `[IA] ${value}`;
        } else {
            completedFields[field.key] = value;
        }
    }

    console.log('[pdfParserAIExtraction] Champs complétés par l\'IA :', completedFields);
    return completedFields;
}

