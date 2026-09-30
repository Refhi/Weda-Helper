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
 * @exports resolveAttachmentUrls - Résout l'URL du pdf pour une liste de fileId
 * @exports injectAttachmentUrls - Injecte les URLs résolues dans le résultat de recoverData
 * @exports collectAttachmentFileIds - Liste les fileId présents dans le résultat d'une catégorie
 */

/** Type de message postMessage envoyé par la popup PopUpViewBinaryForm vers sa fenêtre ouvrante */
const DATA_SCRAPPER_ATTACHMENT_URL_MESSAGE = 'dataScrapperAttachmentUrl';

/**
 * Clé localStorage utilisée pour marquer qu'une résolution d'URL est en cours pour un fileId
 * donné : le tweak de la popup ne doit fermer celle-ci que si elle correspond à une demande
 * explicite de resolveAttachmentUrls, jamais lors d'une consultation manuelle classique.
 */
const DATA_SCRAPPER_ATTACHMENT_PENDING_KEY = 'dataScrapperFileHandlerPendingFileId';

/**
 * Résout l'URL réelle du pdf (BinaryData.aspx) pour chaque fileId demandé, en rejouant le clic
 * sur le lien correspondant dans l'iframe de scraping (qui doit encore contenir les journées
 * concernées, avec leurs pièces jointes visibles).
 * @param {HTMLIFrameElement} iframe - iframe de scraping encore chargée sur l'historique patient
 * @param {Array<string>} fileIds - Liste des attachment.fileId dont on veut résoudre l'URL
 * @returns {Promise<Object<string, string|null>>} Map fileId -> url (ou null si non résolu)
 */
async function resolveAttachmentUrls(iframe, fileIds) {
    console.log(`[dataScrapperFileHandler] Résolution des URLs pour les fileIds :`, fileIds);
    const urlsByFileId = {};
    const iframeWindow = iframe.contentWindow;

    for (const fileId of fileIds) {
        const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
        const link = iframeDocument.querySelector(`[onclick*="Fil=${fileId}"]`);
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
            const timeoutId = setTimeout(() => { cleanup(); resolve(null); }, 8000);
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
 * Injecte les URLs résolues (map fileId -> url) dans les pièces jointes correspondantes du
 * résultat de recoverData, en ajoutant un champ `url` à chaque attachment concerné.
 * @param {Object} data - Résultat de recoverData (une clé par catégorie)
 * @param {Object<string, string|null>} urlsByFileId - Map produite par resolveAttachmentUrls
 */
function injectAttachmentUrls(data, urlsByFileId) {
    for (const categoryData of Object.values(data)) {
        if (!Array.isArray(categoryData)) continue;
        for (const day of categoryData) {
            for (const attachment of day.attachments || []) {
                if (attachment.fileId && urlsByFileId[attachment.fileId]) {
                    attachment.url = urlsByFileId[attachment.fileId];
                }
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
    if (!Array.isArray(categoryData)) return [];
    return categoryData.flatMap(day => (day.attachments || []).map(a => a.fileId).filter(Boolean));
}
