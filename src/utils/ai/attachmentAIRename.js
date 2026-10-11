/**
 * @file attachmentAIRename.js
 * @description Ajoute, à côté de "Renommer" dans le panneau d'édition d'une pièce jointe de
 * l'historique patient, un bouton qui : ouvre le document (clic natif sur le lien, comme le fait
 * dataScrapperFileHandler.js pour récupérer l'URL du pdf dans la popup PopUpViewBinaryForm),
 * l'envoie à l'assistant IA (même prompt et même flux que le PDF Parser, @see pdfParserAIExtraction.js)
 * en lui demandant d'appeler l'outil renameJoinedDocumentInHistory, qui enregistre le résultat.
 *
 * Cet outil est exposé au modèle en tool calling (@see callableFunctions.js), aussi pour un usage libre :
 * il ne sert qu'à insérer des données, la lecture du document passe par ses autres outils.
 */

/**
 * Préremplit les données d'un document de l'historique via le panneau "Renommer" de Weda.
 * La validation finale reste toujours à la charge de l'utilisateur.
 * @param {string} fileId - Identifiant de la pièce jointe (attachment.fileId)
 * @param {{documentTitle?: string, documentDate?: string, destinationClass?: string, documentType?: string, documentCommentaire?: string}} fields -
 * Champs issus de l'IA, avec les clés du PDF Parser (le commentaire est préfixé par "[IA] ")
 * @returns {Promise<{error?: string, notApplied?: string[], classificationListMismatch?: boolean}>}
 * `notApplied` liste les champs qui n'ont pas pu être renseignés
 */
async function renameJoinedDocumentInHistory(fileId, fields) {
    const prefix = '#ContentPlaceHolder1_HistoriqueUCForm1_';
    const panelSelector = `${prefix}PanelRenommerFileStream`;
    const renameButtonSelector = `#UPJ${fileId}`;
    if (!document.querySelector(renameButtonSelector)) return { error: `Document introuvable sur la page actuelle pour fileId "${fileId}".` };

    // Un panneau resté ouvert pour un autre document serait remplacé par le postback déclenché par le clic
    const stalePanel = document.querySelector(panelSelector);
    clicCSPLockedElement(renameButtonSelector);
    const opened = await waitUntil(() => {
        const panel = document.querySelector(panelSelector);
        return panel && panel !== stalePanel;
    }, { label: 'ouverture du panneau Renommer' });
    if (!opened) return { error: "Le panneau de renommage n'est pas apparu." };

    const notApplied = [];
    const setValue = (selector, value) => {
        const element = document.querySelector(selector);
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    };
    // Sélectionne une option de liste déroulante par sa valeur ou, à défaut, par son libellé (insensible à la casse)
    const selectOption = (selector, wanted) => {
        const normalize = text => text.trim().toLowerCase();
        const select = document.querySelector(selector);
        if (!select) return false;
        const option = [...select.options].find(o => o.value === wanted || normalize(o.text) === normalize(wanted));
        if (!option) return false;
        setValue(selector, option.value);
        return true;
    };

    const { documentTitle, documentDate, destinationClass, documentType, documentCommentaire } = fields;
    let classificationListMismatch = false;
    if (documentDate) setValue(`${prefix}TextBoxFileStreamDate`, documentDate);
    if (destinationClass && !selectOption(`${prefix}DropDownListDeplacement`, destinationClass)) notApplied.push('destinationClass');
    if (documentType) {
        const classificationSelect = document.querySelector(`${prefix}DropDownListClassification`);
        const configuredTypes = await getConfiguredDocumentTypes();
        const availableTypes = classificationSelect
            ? [...classificationSelect.options].filter(option => option.value !== '0').map(option => option.text.trim())
            : [];
        if (availableTypes.length) {
            const normalize = value => value.trim().toLowerCase();
            const configuredSet = new Set(configuredTypes.map(normalize));
            const availableSet = new Set(availableTypes.map(normalize));
            classificationListMismatch = configuredSet.size !== availableSet.size
                || [...configuredSet].some(type => !availableSet.has(type));
        }
        const classificationApplied = selectOption(`${prefix}DropDownListClassification`, documentType);
        if (!classificationApplied) notApplied.push('documentType');
        if (classificationListMismatch || !classificationApplied) {
            sendWedaNotif({
                message: classificationListMismatch
                    ? `Les catégories de PdfParserAutoCategoryDict ne correspondent plus à celles du menu Weda${classificationApplied ? '' : ` ; « ${documentType} » n'existe pas dans la liste actuelle`}. Réinitialisez les catégories depuis le PDF Parser.`
                    : `La classification « ${documentType} » proposée par l'IA n'existe pas dans le menu Weda et n'a pas été appliquée.`,
                icon: 'warning',
                duration: 10000
            });
        }
    }
    if (documentTitle) setValue('#TextBoxFileStreamTitre', documentTitle);
    if (documentCommentaire) setValue(`${prefix}TextBoxFileStreamCommentaire`, documentCommentaire);

    return { notApplied, classificationListMismatch };
}

/**
 * Récupère les noms des catégories configurées pour le PDF Parser.
 * @returns {Promise<string[]>}
 */
async function getConfiguredDocumentTypes() {
    const rawRules = await getOptionPromise('PdfParserAutoCategoryDict');
    let rules = rawRules;
    if (typeof rawRules === 'string') {
        try {
            rules = JSON.parse(rawRules);
        } catch (error) {
            throw new Error(`Option PdfParserAutoCategoryDict invalide : ${error.message}`);
        }
    }
    if (!Array.isArray(rules)) {
        throw new Error('Option PdfParserAutoCategoryDict invalide : un tableau de règles était attendu.');
    }
    return [...new Set(rules
        .filter(rule => Array.isArray(rule) && typeof rule[0] === 'string' && rule[0].trim())
        .map(rule => rule[0].trim()))];
}

/**
 * Ouvre le document dans la popup Weda (clic natif sur son lien dans la page courante) et renvoie
 * l'URL de son pdf. Doit être appelée de façon synchrone depuis un clic utilisateur pour que le
 * navigateur autorise l'ouverture de la popup.
 * @param {string} fileId
 * @returns {Promise<string|null>}
 */
async function getAttachmentPdfUrl(fileId) {
    const urls = await resolveAttachmentUrls({ contentWindow: window, contentDocument: document }, [fileId]);
    return urls[fileId];
}

/**
 * Flux du bouton : ouverture du document, puis envoi au chat IA avec la même demande que le PDF Parser,
 * mais en lui faisant appeler renameJoinedDocumentInHistory (@see renameJoinedDocumentInHistoryTool)
 * plutôt que submitPdfParserFields : on n'attend donc pas de résultat ici.
 * @param {string} fileId
 * @returns {Promise<{error?: string}>}
 */
async function summarizeAttachment(fileId) {
    const url = await getAttachmentPdfUrl(fileId);
    if (!url) return { error: "Impossible d'ouvrir le document (lien introuvable ou popup bloquée)." };

    const pdfText = await extractTextFromPDF(url);
    // La date de naissance et le nom du patient ne servent pas à renseigner un document : on les déclare déjà connus
    // pour que l'IA ne les demande pas. Les autres champs demandés dépendent de PdfParserAutoAIFullMode.
    const knownData = { dateOfBirth: 'non requis', nameMatches: ['non requis'] };
    try {
        const fullMode = await getOptionPromise('PdfParserAutoAIFullMode');
        const possibleDocumentTypes = fullMode ? await getConfiguredDocumentTypes() : null;
        await completeExtractedDataWithAI(knownData, pdfText, url, possibleDocumentTypes, { pdfText }, {
            externalTool: {
                name: 'renameJoinedDocumentInHistory',
                extraInstructions: `Le fileId du document à renseigner est "${fileId}" : transmets-le à la fonction.`
            },
            patientId: getCurrentPatientId()
        });
    } catch (error) {
        return { error: error.message || String(error) };
    }
    return {};
}

/**
 * Outil appelable par le modèle (@see callableFunctions.js renameJoinedDocumentInHistory), aussi
 * utilisé par le bouton "Résumé IA" : les champs portent les mêmes clés que ceux du PDF Parser
 * (@see pdfParserAIExtraction.js) et seuls ceux fournis par le modèle sont transmis à
 * renameJoinedDocumentInHistory. Comme pour le PDF Parser, le titre, l'emplacement et la classification
 * ne sont acceptés que si l'option PdfParserAutoAIFullMode est activée. Les catégories configurées sont
 * fournies au modèle et comparées aux catégories actuelles de Weda lors de la sélection.
 * @param {{fileId?: string, documentTitle?: string, documentDate?: string, destinationClass?: string, documentType?: string, documentCommentaire?: string}} args
 * @returns {Promise<object>}
 */
async function renameJoinedDocumentInHistoryTool({ fileId, documentTitle, documentDate, destinationClass, documentType, documentCommentaire } = {}) {
    const fullMode = await getOptionPromise('PdfParserAutoAIFullMode');
    const fullModeFields = {
        ...(documentTitle ? { documentTitle } : {}),
        ...(destinationClass ? { destinationClass } : {}),
        ...(documentType ? { documentType } : {})
    };
    const fields = {
        ...(fullMode ? fullModeFields : {}),
        ...(documentDate ? { documentDate } : {}),
        // Marque le commentaire comme généré par l'IA, comme dans le PDF Parser
        ...(documentCommentaire ? { documentCommentaire: `[IA] ${documentCommentaire}` } : {})
    };
    const ignoredFields = fullMode ? [] : Object.keys(fullModeFields);

    if (!fileId || Object.keys(fields).length === 0) {
        return {
            error: "Appel incomplet : fileId (obligatoire) et au moins un champ parmi documentTitle, documentDate, destinationClass, documentType, documentCommentaire sont requis. Refais l'appel en renseignant ces arguments.",
            ...(ignoredFields.length ? { ignoredFields } : {})
        };
    }
    const { error, notApplied = [], classificationListMismatch = false } = await renameJoinedDocumentInHistory(fileId, fields);
    if (error) return { error, notApplied, classificationListMismatch };
    sendWedaNotif({
        message: "Les champs ont été préremplis. Vérifiez-les puis validez manuellement dans le panneau Renommer.",
        icon: 'info',
        duration: 10000
    });
    const notes = [
        "Les champs ont été préremplis dans Weda, mais ne sont pas encore enregistrés. Vérifiez-les puis validez manuellement dans le panneau Renommer.",
        ...(notApplied.length ? [`${notApplied.join(', ')} : valeur inconnue dans les listes de Weda, non enregistré.`] : []),
        ...(classificationListMismatch ? ["La liste PdfParserAutoCategoryDict diffère des catégories actuelles de Weda ; réinitialisez les catégories depuis le PDF Parser."] : []),
        ...(ignoredFields.length ? [`${ignoredFields.join(', ')} : modification par l'IA désactivée dans les options de Weda-Helper (mode complet du PDF Parser), non enregistré.`] : [])
    ];
    return { status: "awaiting_user_confirmation", awaitingUserConfirmation: true, fileId, notes };
}

/**
 * Ajoute le bouton "Résumé IA" après "Renommer" dans le panneau d'édition d'une pièce jointe.
 * Weda n'affiche ce panneau qu'au survol de la pièce jointe (en modifiant le style des boutons par
 * leur id) : le style du nouveau bouton est donc aligné sur celui de "Renommer" à chaque survol.
 * @param {HTMLElement} renameButton - Bouton "Renommer" (id UPJ<fileId>)
 */
function addSummaryButton(renameButton) {
    const fileId = renameButton.id.replace('UPJ', '');
    const renameCell = renameButton.closest('td');
    if (!fileId || !renameCell) return;

    const button = document.createElement('div');
    button.className = renameButton.className;
    button.id = `AIPJ${fileId}`;
    button.textContent = 'Résumé IA';
    button.title = "Ouvre le document et demande à l'assistant IA d'en faire un résumé";
    button.addEventListener('click', async () => {
        sendWedaNotif({ message: "Document envoyé à l'assistant IA, la réponse apparaît dans le chat.", icon: 'summarize' });
        const result = await summarizeAttachment(fileId);
        if (result.error) sendWedaNotif({ message: result.error, type: 'fail', icon: 'error' });
    });

    const newCell = document.createElement('td');
    newCell.appendChild(button);
    renameCell.after(newCell);

    const syncStyle = () => { button.style.cssText = renameButton.style.cssText; };
    syncStyle();
    const attachmentContainer = renameButton.closest('.pja') || renameCell;
    attachmentContainer.addEventListener('mouseover', syncStyle);
    attachmentContainer.addEventListener('mouseout', syncStyle);
}

addTweak('/FolderMedical/PatientViewForm.aspx', 'enableIAassistant', function () {
    waitForElement({
        selector: 'div[id^="UPJ"]',
        callback: (renameButtons) => renameButtons.forEach(addSummaryButton),
        triggerOnInit: true,
        observerId: 'attachmentAISummaryButton'
    });
});
