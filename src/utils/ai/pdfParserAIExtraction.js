/**
 * @file pdfParserAIExtraction.js
 * @description Complète via l'assistant IA local les champs du PDF Parser (@see features/pdfParser.js)
 * restés vides après l'analyse regex. L'appel se fait via le chat IA visible (@see discussionClient.js
 * whenChatApiReady/publishChatApi) : un prompt est envoyé "comme si l'utilisateur l'avait tapé",
 * donnant à l'utilisateur la visibilité sur la requête et la réponse, et la réponse attendue est un
 * appel de fonction dédié (renseignerChampsPdfParser, @see callableFunctions.js) plutôt qu'un texte JSON
 * à parser nous-mêmes.
 */

// Champs du PDF Parser éligibles à un complément IA : clé dans extractedData, description utilisée
// dans le prompt, et test de "valeur manquante" déclenchant la tentative.
const PDF_PARSER_AI_FIELDS = [
    { key: 'documentDate', missing: v => !v },
    { key: 'dateOfBirth', missing: v => !v },
    { key: 'nameMatches', missing: v => !v || v.length === 0 },
    { key: 'documentCommentaire', missing: v => !v }
];

// Champs supplémentaires confiés à l'IA lorsque l'option PdfParserAutoAIFullMode est activée : dans ce
// mode, ils sont systématiquement redemandés au modèle (et remplacent le résultat de l'analyse par
// mots-clés/gabarit de titre), avec pour seule aide la liste des classifications réellement
// disponibles dans Weda (@see features/pdfParser.js initDocumentTypes, passée en paramètre par l'appelant).
const PDF_PARSER_AI_FULL_MODE_FIELDS = [
    { key: 'documentTitle' },
    { key: 'destinationClass' },
    { key: 'documentType' }
];

// Délai maximum d'attente de l'appel de fonction renseignerChampsPdfParser avant d'abandonner (le
// client de chat peut être indisponible, désactivé, ou le modèle peut ne jamais appeler la fonction).
const PDF_PARSER_AI_TIMEOUT_MS = 60000;
// Timeout court utilisé quand le mode complet (PdfParserAutoAIFullMode) est activé :
// on souhaite échouer rapidement si l'IA n'est pas disponible.
const PDF_PARSER_AI_QUICK_TIMEOUT_MS = 1000;

// Résolveur de la complétion IA en cours (un seul PDF traité à la fois), appelé par le tool call
// "renseignerChampsPdfParser" une fois le modèle exécuté (@see callableFunctions.js).
let pendingPdfParserResolve = null;

// Délai maximum d'attente de la vérification des antécédents (plusieurs échanges avec le modèle).
const ANTECEDENTS_CHECK_TIMEOUT_MS = 120000;
// Résolveur de la vérification des antécédents en cours, appelé par le tool call "renseignerAntecedentsDiscordances".
let pendingAntecedentsResolve = null;

/** Appelée par le tool call "renseignerAntecedentsDiscordances" : transmet les opérations proposées par le modèle. */
function resolvePendingAntecedentsDiscordances(operations) {
    if (!pendingAntecedentsResolve) {
        throw new Error("Aucune vérification des antécédents en attente (délai déjà dépassé, ou fonction appelée deux fois).");
    }
    pendingAntecedentsResolve(operations);
    pendingAntecedentsResolve = null;
    return { status: "success" };
}

/**
 * Appelée par le tool call "renseignerChampsPdfParser" : transmet les champs renvoyés par le modèle à
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
 * @param {string|null} urlPDF - URL du PDF (@see extractBasePdfData), relue page par page pour envoyer
 * en images (@see discussionClient.js lancerChaine) les pages dont le texte est absent
 * ou illisible (PDF scanné, police non standard...).
 * @param {string[]|null} [possibleDocumentTypes] - Valeurs de classification réellement disponibles dans
 * Weda (@see features/pdfParser.js initDocumentTypes), récupérées par l'appelant au moment de l'appel.
 * Utilisée uniquement en mode complet (PdfParserAutoAIFullMode), pour contraindre le champ documentType.
 * @param {{pdfText?: string|null, messageBody?: string|null}} [aiSources] - Texte du PDF et corps du message
 * (échanges sécurisés) séparés : la lisibilité du PDF est évaluée indépendamment du corps du message.
 * @returns {Promise<object>} Les champs complétés par l'IA, objet vide si rien n'a pu être complété.
 */
async function completeExtractedDataWithAI(extractedData, fullText, urlPDF = null, possibleDocumentTypes = null, aiSources = {}) {
    if (!await getOptionPromise('PdfParserAutoAIExtraction')) return {};

    const fullModeEnabled = await getOptionPromise('PdfParserAutoAIFullMode');
    const fieldsToAsk = await listFieldsToAsk(extractedData, fullModeEnabled);
    if (fieldsToAsk.length === 0) return {};

    const chatApi = await prepareChatApi(fullModeEnabled);
    if (!chatApi) return {};

    const sendToChatApi = await buildChainLauncher(chatApi, 'completerDocument', {
        toolName: 'renseignerChampsPdfParser', fieldsToAsk, fullModeEnabled, fullText, urlPDF, possibleDocumentTypes, messageBody: aiSources.messageBody
    });

    let parsedFields;
    try {
        parsedFields = await new Promise((resolve, reject) => {
            pendingPdfParserResolve = resolve;
            // Le timeout court (mode complet) ne sert qu'à vérifier la disponibilité du client dans
            // prepareChatApi : l'attente de la réponse du modèle utilise toujours le délai complet.
            setTimeout(() => {
                if (pendingPdfParserResolve !== resolve) return; // déjà résolu entre-temps
                pendingPdfParserResolve = null;
                reject(new Error("Délai dépassé en attendant l'appel de renseignerChampsPdfParser"));
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

/**
 * Compare le document aux antécédents du patient actuellement sélectionné (chaîne verifierAntecedentsDepuisDocument),
 * sans rien modifier : les opérations proposées (format de traiterAntecedentsBatch) sont renvoyées pour être appliquées
 * sur demande de l'utilisateur. À appeler une fois la complétion des champs terminée et le patient sélectionné,
 * car la conversation est réinitialisée.
 * @returns {Promise<Array<object>|null>} opérations proposées (vide : aucune différence), null si la vérification n'a pas eu lieu.
 */
async function checkAntecedentsAgainstDocument(fullText, urlPDF = null, { messageBody = null } = {}) {
    if (!await getOptionPromise('verifierEtMettreAJourAntecedents')) return null;
    if (!await resolveCurrentPatientIdWithWait()) {
        console.warn('[pdfParserAIExtraction] Aucun patient sélectionné, vérification des antécédents ignorée.');
        return null;
    }
    const chatApi = await prepareChatApi(false);
    if (!chatApi) return null;

    const sendToChatApi = await buildChainLauncher(chatApi, 'verifierAntecedentsDepuisDocument', {
        fieldsToAsk: [], fullText, urlPDF, messageBody,
        instructions: "Compare le document ci-dessous avec les antécédents du patient actuel, sans rien modifier. Suis les consignes de chaque étape : les outils à appeler te seront indiqués au fur et à mesure."
    });
    try {
        const operations = await new Promise((resolve, reject) => {
            pendingAntecedentsResolve = resolve;
            setTimeout(() => {
                if (pendingAntecedentsResolve !== resolve) return;
                pendingAntecedentsResolve = null;
                reject(new Error("Délai dépassé en attendant l'appel de renseignerAntecedentsDiscordances"));
            }, ANTECEDENTS_CHECK_TIMEOUT_MS);
            sendToChatApi();
        });
        if (operations === 'erreur') console.warn('[pdfParserAIExtraction] Analyse des antécédents abandonnée (essais épuisés).');
        else console.log('[pdfParserAIExtraction] Opérations proposées sur les antécédents :', operations);
        return operations;
    } catch (error) {
        console.warn('[pdfParserAIExtraction] Échec de la vérification des antécédents :', error.message || error);
        return 'erreur';
    }
}

/**
 * Bouton "Résumé IA" d'une pièce jointe (@see attachmentAIRename.js) : envoie le document à l'assistant IA avec la
 * même demande que le PDF Parser, mais via la chaîne renommerPieceJointe qui transmet le fileId à renseignerDocument.
 * L'option PdfParserAutoAIExtraction est ignorée (demande explicite de l'utilisateur), PdfParserAutoAIFullMode respectée.
 * On n'attend pas de résultat : renseignerDocument s'en charge lui-même.
 * @param {string} fileId
 * @param {string} fullText - Texte extrait du document.
 * @param {string|null} urlPDF - URL du PDF à relire page par page (null pour un contenu texte).
 * @param {string[]|null} possibleDocumentTypes - Classifications autorisées (mode complet uniquement).
 */
async function submitAttachmentToAI(fileId, fullText, urlPDF = null, possibleDocumentTypes = null) {
    const fullModeEnabled = await getOptionPromise('PdfParserAutoAIFullMode');
    // La date de naissance et le nom du patient ne servent pas à renseigner un document : on les déclare déjà connus.
    const fieldsToAsk = await listFieldsToAsk({ dateOfBirth: 'non requis', nameMatches: ['non requis'] }, fullModeEnabled);
    const chatApi = await prepareChatApi(fullModeEnabled);
    if (!chatApi) return;

    const sendToChatApi = await buildChainLauncher(chatApi, 'renommerPieceJointe', {
        toolName: 'renseignerDocument', fieldsToAsk, fullModeEnabled, fullText, urlPDF, possibleDocumentTypes,
        extraInstructions: `Le fileId du document à renseigner est "${fileId}" : transmets-le à la fonction.`,
        entree: { fileId }
    });
    sendToChatApi();
}

/**
 * Champs à demander au modèle : ceux absents de `extractedData`, plus ceux du mode complet le cas échéant.
 * @returns {Promise<Array<{key: string}>>}
 */
async function listFieldsToAsk(extractedData, fullModeEnabled) {
    const missingFields = PDF_PARSER_AI_FIELDS.filter(field => field.missing(extractedData[field.key]));
    return fullModeEnabled ? missingFields.concat(PDF_PARSER_AI_FULL_MODE_FIELDS) : missingFields;
}

/**
 * Renvoie l'API du chat IA prête à recevoir une demande (génération en cours arrêtée, conversation vierge),
 * ou null si l'assistant est désactivé ou indisponible. En mode complet, échoue vite en lançant une erreur
 * pour que l'appelant puisse le gérer explicitement (annuler la procédure, avertir l'utilisateur).
 */
async function prepareChatApi(fullModeEnabled) {
    // Assistant IA désactivé : le client de chat n'est jamais publié, inutile d'attendre son timeout.
    if (!await getOptionPromise('enableIAassistant')) {
        console.warn('[pdfParserAIExtraction] Assistant IA désactivé, poursuite sans complétion IA.');
        return null;
    }

    const waitTimeout = fullModeEnabled ? PDF_PARSER_AI_QUICK_TIMEOUT_MS : PDF_PARSER_AI_TIMEOUT_MS;
    const chatApi = await Promise.race([
        whenChatApiReady(),
        new Promise(resolve => setTimeout(() => resolve(null), waitTimeout))
    ]);
    if (!chatApi) {
        const msg = fullModeEnabled
            ? '[pdfParserAIExtraction] Mode complet activé mais client de chat IA indisponible : arrêt rapide de la complétion IA.'
            : '[pdfParserAIExtraction] Client de chat IA indisponible (désactivé ou non chargé), poursuite sans complétion IA.';
        console.warn(msg);
        // En mode complet, échouer rapidement en rejetant pour que l'appelant puisse gérer l'échec
        // explicitement (par ex. annuler la procédure ou avertir l'utilisateur).
        if (fullModeEnabled) throw new Error('Client IA indisponible en mode complet');
        return null;
    }

    // Arrête d'abord toute réflexion/génération en cours pour ce patient (ex: PDF précédent encore
    // en attente de tool call) avant de repartir d'une conversation vierge : sans ça, l'ancien appel
    // pouvait rester bloqué indéfiniment (son appel d'outil n'arrivant jamais après le reset).
    chatApi.stop();

    // Plus de bascule de conversation : le patient est redéterminé au moment où un outil en a
    // besoin (@see offscreenBridge.js resolveCurrentPatientId).
    // Repart d'une conversation vierge à chaque PDF : sans cela, l'historique (et les pièces
    // jointes) des documents précédents restait dans le contexte envoyé au modèle.
    chatApi.resetConversation();
    return chatApi;
}

/**
 * Construit le prompt et les pièces jointes de la demande, puis renvoie la fonction qui lance la chaîne d'outils
 * (@see toolChainsDefinitions.js). `entree` est transmise à la chaîne ; `toolName` est l'outil que le modèle doit appeler.
 * @returns {Promise<function(): void>}
 */
async function buildChainLauncher(chatApi, chainName, { toolName, fieldsToAsk, fullModeEnabled, fullText, urlPDF, possibleDocumentTypes, messageBody = null, extraInstructions = '', entree = {}, instructions: customInstructions = null }) {
    const instructions = customInstructions ?? await buildFieldInstructions({ toolName, fieldsToAsk, fullModeEnabled, possibleDocumentTypes, extraInstructions });
    return buildLauncherWithDocument(chatApi, chainName, { instructions, fieldsToAsk, fullText, urlPDF, messageBody, entree });
}

/** Prompt demandant au modèle de renseigner les champs de `fieldsToAsk` via l'outil `toolName`. */
async function buildFieldInstructions({ toolName, fieldsToAsk, fullModeEnabled, possibleDocumentTypes, extraInstructions }) {
    const basePrompt = await getOptionPromise('PdfParserAutoAIExtractionPrompt');
    const fieldDescriptions = await getOptionPromise(fieldsToAsk.map(field => `PdfParserAIDesc_${field.key}`));
    const fieldsDescription = fieldsToAsk.map((field, i) => `- "${field.key}" : ${fieldDescriptions[i]}`).join('\n');
    const categorizationContext = (fullModeEnabled && possibleDocumentTypes?.length)
        ? `\n\nValeurs autorisées pour "documentType" : ${possibleDocumentTypes.join(', ')}.`
        : '';
    const extraContext = extraInstructions ? `\n\n${extraInstructions}` : '';
    return `${basePrompt}${categorizationContext}${extraContext}\n\nPour répondre, appelle OBLIGATOIREMENT la fonction ${toolName}. Les dates DOIVENT être au format JJ/MM/AAAA. Voici les champs à compléter :\n${fieldsDescription}`;
}

/** Joint le document (texte, ou pages en images s'il n'est pas lisible) aux consignes et renvoie la fonction qui lance la chaîne. */
async function buildLauncherWithDocument(chatApi, chainName, { instructions, fieldsToAsk, fullText, urlPDF, messageBody, entree }) {
    // Pages sans texte lisible (PDF scanné, police non standard...) : elles partent en images avec les
    // pages lisibles en texte (@see resolvePdfAttachment), pour laisser le modèle les analyser lui-même.
    let resolvedPdf = null;
    if (urlPDF) {
        try {
            resolvedPdf = await resolvePdfAttachment(urlPDF);
        } catch (error) {
            console.warn('[pdfParserAIExtraction] Lecture page par page du PDF impossible, envoi du texte extrait seul :', error);
        }
    }
    let sendToChatApi;
    if (resolvedPdf?.images.length > 0) {
        const bodyContext = messageBody
            ? `\n\n--- Corps du message accompagnant le PDF ---\n${messageBody}\n--- Fin du corps du message ---`
            : '';
        const attachments = pdfAttachmentsFromResolved(resolvedPdf, 'document.pdf');
        sendToChatApi = () => chatApi.lancerChaine(chainName, entree, instructions + bodyContext, attachments);
    } else {
        const prompt = `${instructions}\n\n--- Texte du document ---\n${fullText}\n--- Fin du texte du document ---`;
        sendToChatApi = () => chatApi.lancerChaine(chainName, entree, prompt);
    }

    console.log('[pdfParserAIExtraction] Demande à l\'IA, champs :', fieldsToAsk.map(f => f.key));
    return sendToChatApi;
}


