/**
 * @file dataScrapperFileHandler.js
 * @description Résolution différée de l'URL réelle (pdf) des pièces jointes repérées par
 * dataScrapper.js. On ne peut pas reconstruire l'URL de la popup Weda soi-même (le serveur exige
 * un contexte de clic/session valide, sinon il redirige vers l'accueil) : on rejoue donc le clic
 * natif sur le lien (OpenViewBinaryForm) dans l'iframe de scraping, ce qui ouvre une vraie popup
 * Weda. Un tweak dédié s'active dans cette popup (content script auto-injecté, même origine),
 * en extrait l'URL du pdf et la renvoie par postMessage à la fenêtre qui l'a ouverte avant de se
 * fermer automatiquement.
 *
 * Certains documents (ex. volet de synthèse médicale, ordonnance DMP) s'ouvrent dans la visionneuse CDA
 * (/Cda/CdaViewerForm.aspx, via OpenPopupCdaViewerForm) plutôt que dans PopUpViewBinaryForm : le flux est
 * le même, mais la popup renvoie soit le pdf embarqué (data URL), soit le texte du document structuré
 * (data URL text/plain, @see buildTextContentUrl).
 *
 * @exports resolveAttachmentUrls - Résout l'URL du pdf (ou du texte, pour la visionneuse CDA) pour une liste de fileId
 * @exports resolveAttachmentContent - Lit le contenu (texte/images) d'une URL produite par resolveAttachmentUrls
 * @exports extractAttachmentText - Texte brut d'une URL produite par resolveAttachmentUrls
 * @exports isTextContentUrl - Indique si l'URL produite par resolveAttachmentUrls est un texte (et non un pdf)
 * @exports injectAttachmentUrls - Injecte les URLs résolues dans le résultat de recoverData
 * @exports collectAttachmentFileIds - Liste les fileId présents dans le résultat d'une catégorie
 * @exports iterateAttachments - Parcourt toutes les pièces jointes (avec fileId) d'un résultat de recoverData
 */

/** Type de message postMessage envoyé par la popup PopUpViewBinaryForm vers sa fenêtre ouvrante */
const DATA_SCRAPPER_ATTACHMENT_URL_MESSAGE = 'dataScrapperAttachmentUrl';

/**
 * Clé localStorage utilisée pour marquer qu'une résolution d'URL est en cours pour un fileId
 * donné : le tweak de la popup ne doit fermer celle-ci que si elle correspond à une demande
 * explicite de resolveAttachmentUrls, jamais lors d'une consultation manuelle classique.
 */
const DATA_SCRAPPER_ATTACHMENT_PENDING_KEY = 'dataScrapperFileHandlerPendingFileId';

/** Préfixe des "URLs" portant directement le texte d'un document de la visionneuse CDA (non pdf) */
const DATA_SCRAPPER_TEXT_CONTENT_URL_PREFIX = 'data:text/plain;charset=utf-8,';

/** Délai maximal d'attente de la popup (la visionneuse CDA, en Angular, peut être lente à charger) */
const DATA_SCRAPPER_ATTACHMENT_POPUP_TIMEOUT_MS = 15000;

function buildTextContentUrl(text) {
    return DATA_SCRAPPER_TEXT_CONTENT_URL_PREFIX + encodeURIComponent(text);
}

function isTextContentUrl(url) {
    return typeof url === 'string' && url.startsWith(DATA_SCRAPPER_TEXT_CONTENT_URL_PREFIX);
}

/**
 * Lit le contenu d'une URL produite par resolveAttachmentUrls : texte décodé pour un document CDA
 * non pdf, lecture du pdf (@see resolvePdfAttachment) sinon.
 * @param {string} url
 * @returns {Promise<{text: string|null, images: string[], imagePages: number[]}>}
 */
async function resolveAttachmentContent(url) {
    if (isTextContentUrl(url)) {
        return { text: decodeURIComponent(url.slice(DATA_SCRAPPER_TEXT_CONTENT_URL_PREFIX.length)), images: [], imagePages: [] };
    }
    return resolvePdfAttachment(url);
}

/**
 * Texte brut d'une URL produite par resolveAttachmentUrls (toutes pages concaténées pour un pdf).
 * @param {string} url
 * @returns {Promise<string>}
 */
async function extractAttachmentText(url) {
    if (isTextContentUrl(url)) return (await resolveAttachmentContent(url)).text;
    return extractTextFromPDF(url);
}

/**
 * Retrouve dans le document le lien permettant d'ouvrir la pièce jointe : OpenViewBinaryForm (pdf, image...)
 * ou OpenPopupCdaViewerForm (visionneuse CDA). Le repli sur un simple "Fil=" exclut le bouton Weda Echanges
 * (id WEPJ), dont l'onclick contient aussi le fileId mais qui n'ouvre pas le document.
 * @param {Document} doc
 * @param {string} fileId
 * @returns {HTMLElement|null}
 */
function findAttachmentLink(doc, fileId) {
    return doc.querySelector(`[onclick*="OpenViewBinaryForm"][onclick*="Fil=${fileId}"]`)
        || doc.querySelector(`a[onclick*="OpenPopupCdaViewerForm('id=${fileId}&"]`)
        || doc.querySelector(`[onclick*="Fil=${fileId}"]:not([id^="WEPJ"])`);
}

/**
 * Résout l'URL réelle du pdf (BinaryData.aspx) pour chaque fileId demandé, en rejouant le clic
 * sur le lien correspondant dans l'iframe de scraping (qui doit encore contenir les journées
 * concernées, avec leurs pièces jointes visibles).
 * @param {HTMLIFrameElement|{contentWindow: Window, contentDocument: Document}} iframe - iframe de scraping
 * encore chargée sur l'historique patient, ou `{contentWindow: window, contentDocument: document}` pour
 * rejouer le clic directement dans la page courante (@see attachmentAIRename.js)
 * @param {Array<string>} fileIds - Liste des attachment.fileId dont on veut résoudre l'URL
 * @returns {Promise<Object<string, string|null>>} Map fileId -> url du pdf, ou texte du document pour la
 * visionneuse CDA (@see isTextContentUrl), ou null si non résolu
 */
async function resolveAttachmentUrls(iframe, fileIds) {
    console.log(`[dataScrapperFileHandler] Résolution des URLs pour les fileIds :`, fileIds);
    const urlsByFileId = {};
    const iframeWindow = iframe.contentWindow;

    for (const fileId of fileIds) {
        const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
        const link = findAttachmentLink(iframeDocument, fileId);
        if (!link) {
            console.warn(`[dataScrapperFileHandler] Lien introuvable pour Fil=${fileId}`);
            urlsByFileId[fileId] = null;
            continue;
        }

        // La popup ouverte par le clic devient une vraie fenêtre/tab de secure.weda.fr : le tweak
        // ci-dessous s'y active automatiquement et nous renvoie l'URL par postMessage. On écoute ce
        // message sur la fenêtre de l'iframe, car c'est elle qui deviendra window.opener côté popup.
        // Le flag localStorage indique au tweak qu'une demande explicite est en cours pour ce fileId.
        localStorage.setItem(DATA_SCRAPPER_ATTACHMENT_PENDING_KEY, fileId);
        urlsByFileId[fileId] = await new Promise((resolve) => {
            const expectedOrigin = new URL(baseUrl).origin;
            const timeoutId = setTimeout(() => { cleanup(); resolve(null); }, DATA_SCRAPPER_ATTACHMENT_POPUP_TIMEOUT_MS);
            function onMessage(event) {
                if (event.origin !== expectedOrigin || event.data?.type !== DATA_SCRAPPER_ATTACHMENT_URL_MESSAGE) return;
                cleanup();
                resolve(event.data.url);
            }
            function cleanup() {
                clearTimeout(timeoutId);
                iframeWindow.removeEventListener('message', onMessage);
                localStorage.removeItem(DATA_SCRAPPER_ATTACHMENT_PENDING_KEY);
            }
            iframeWindow.addEventListener('message', onMessage);
            link.click();
        });

        if (!urlsByFileId[fileId]) {
            console.warn(`[dataScrapperFileHandler] Aucune URL reçue de la popup pour Fil=${fileId}`);
        }
    }

    return urlsByFileId;
}

/**
 * S'active dans la popup PopUpViewBinaryForm ouverte par resolveAttachmentUrls : en extrait
 * l'URL réelle du pdf (iframe #ViewPdfDocumentUCForm1_iFrameViewFile) et la renvoie à la fenêtre
 * ouvrante par postMessage, puis se ferme. Ne s'active que si une demande explicite est en cours
 * pour ce fileId précis (flag localStorage posé par resolveAttachmentUrls) : une consultation
 * manuelle classique du document (sans demande en cours, ou pour un autre fileId) reste inchangée.
 */
addTweak('/FolderMedical/PopUpViewBinaryForm.aspx', '*dataScrapperFileHandlerUrlRecovery', async function () {
    const pendingFileId = localStorage.getItem(DATA_SCRAPPER_ATTACHMENT_PENDING_KEY);
    const currentFileId = new URLSearchParams(window.location.search).get('Fil');
    if (!window.opener || !pendingFileId || pendingFileId !== currentFileId) return;
    console.log(`[dataScrapperFileHandler] PopUpViewBinaryForm détectée pour une demande en cours (Fil=${currentFileId}), extraction de l'URL du pdf`);

    const pdfFrame = await waitForElementInDocument(() => document, '#ViewPdfDocumentUCForm1_iFrameViewFile').catch(() => null);
    const relativeSrc = pdfFrame?.getAttribute('src');
    const url = relativeSrc ? new URL(relativeSrc, window.location.href).href : null;

    window.opener.postMessage({ type: DATA_SCRAPPER_ATTACHMENT_URL_MESSAGE, url }, window.location.origin);
    window.close();
});

/**
 * Variante de la popup pour la visionneuse CDA (CdaViewerForm.aspx, composants Angular à shadow DOM) :
 * renvoie le pdf embarqué dans la visionneuse (iframe en data URL) ou, pour un document structuré,
 * son texte (en-tête compris), sous la même forme que le tweak PopUpViewBinaryForm ci-dessus.
 */
addTweak('/Cda/CdaViewerForm.aspx', '*dataScrapperFileHandlerCdaRecovery', async function () {
    const pendingFileId = localStorage.getItem(DATA_SCRAPPER_ATTACHMENT_PENDING_KEY);
    const currentFileId = new URLSearchParams(window.location.search).get('id');
    if (!window.opener || !pendingFileId || pendingFileId !== currentFileId) return;
    console.log(`[dataScrapperFileHandler] CdaViewerForm détectée pour une demande en cours (id=${currentFileId}), extraction du contenu`);

    let url = null;
    try {
        const component = await waitForElementInDocument(() => document, 'cda-viewer-pdf-component, cda-viewer-unsafe-component');
        const content = await waitForElementInDocument(() => component.shadowRoot, 'iframe.cda-viewer-pdf-component-iframe, .cda-content');
        if (content.tagName === 'IFRAME') {
            url = await toDataUrl(content.src);
        } else {
            const header = document.querySelector('.cda-header')?.innerText?.trim();
            const body = (content.innerText || content.textContent || '').trim();
            url = body ? buildTextContentUrl(header ? `${header}\n\n${body}` : body) : null;
        }
    } catch (e) {
        console.warn('[dataScrapperFileHandler] Contenu de la visionneuse CDA introuvable :', e);
    }

    window.opener.postMessage({ type: DATA_SCRAPPER_ATTACHMENT_URL_MESSAGE, url }, window.location.origin);
    window.close();
});

/**
 * Convertit une URL (typiquement blob: ou data:) en data URL, seule forme encore lisible une fois la popup fermée.
 * @param {string} url
 * @returns {Promise<string>}
 */
async function toDataUrl(url) {
    if (url.startsWith('data:')) return url;
    const blob = await (await fetch(url)).blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}

/**
 * Injecte les URLs résolues (map fileId -> url) dans les pièces jointes correspondantes du
 * résultat de recoverData, en ajoutant un champ `url` à chaque attachment concerné.
 * @param {Object} data - Résultat de recoverData (une clé par catégorie)
 * @param {Object<string, string|null>} urlsByFileId - Map produite par resolveAttachmentUrls
 */
function injectAttachmentUrls(data, urlsByFileId) {
    for (const attachment of iterateAttachments(data)) {
        if (urlsByFileId[attachment.fileId]) attachment.url = urlsByFileId[attachment.fileId];
    }
}

/**
 * Parcourt les pièces jointes ayant un fileId dans un résultat de recoverData (ou dans les
 * données d'une seule catégorie). Deux formes coexistent : les catégories journalières portent
 * leurs pièces jointes dans `day.attachments`, alors que la catégorie "documents" a un fileId
 * directement sur chacune de ses entrées.
 * @param {Object|Array} dataOrCategoryData - Résultat de recoverData, ou données d'une catégorie
 * @returns {Generator<Object>} Les objets portant un fileId (modifiables en place)
 */
function* iterateAttachments(dataOrCategoryData) {
    const categories = Array.isArray(dataOrCategoryData) ? [dataOrCategoryData] : Object.values(dataOrCategoryData || {});
    for (const categoryData of categories) {
        if (!Array.isArray(categoryData)) continue;
        for (const entry of categoryData) {
            if (entry?.fileId) yield entry;
            for (const attachment of entry?.attachments || []) {
                if (attachment.fileId) yield attachment;
            }
        }
    }
}

/**
 * Liste les fileId présents dans le résultat (brut, avant filtrage par date) d'une seule
 * catégorie de recoverMainViewData, pour savoir lesquels des fileId demandés peuvent être
 * résolus pendant que cette catégorie est encore affichée dans l'iframe.
 * @param {Array<Object>|*} categoryData - Résultat de recoverMainViewData pour une catégorie
 * @returns {Array<string>}
 */
function collectAttachmentFileIds(categoryData) {
    return [...iterateAttachments(categoryData)].map(a => a.fileId);
}
