/**
 * @file pdfAttachmentHelper.js
 * @description Centralise la logique commune de traitement d'un pdf destiné à être envoyé à
 * l'assistant IA (pièce jointe utilisateur dans discussionClient.js, ou pdf du dossier patient lu
 * via callableFunctions.js) : extraction du texte, détection de lisibilité, et rendu de secours
 * en images (data URL) quand le pdf est un scan sans texte exploitable.
 * @requires lib/pdf.mjs (pdfjsLib, chargé par pdfParser.js)
 * @requires src/features/pdfParser.js (extractTextFromPDF, renderPagesToCanvases)
 */

/** Nombre minimum de caractères "normaux" (lettres/chiffres) requis pour considérer un texte extrait de PDF comme lisible. */
const MIN_READABLE_PDF_CHAR_COUNT = 20;
/** Proportion minimale de caractères "normaux" dans le texte extrait, en dessous de laquelle on considère le texte comme du charabia (police non standard/CID mal mappée, etc.). */
const MIN_READABLE_PDF_CHAR_RATIO = 0.5;
/** Nombre maximum de pages converties en images pour un PDF scanné (sans texte lisible), afin d'éviter d'envoyer un nombre excessif d'images au modèle. */
const MAX_SCANNED_PDF_PAGES_AS_IMAGES = 50;

/**
 * Détermine si le texte extrait d'un PDF est réellement lisible : certains PDF scannés ou avec
 * un encodage de police non standard renvoient un texte non vide mais illisible (charabia,
 * caractères de contrôle/privés…), qu'il vaut mieux traiter comme si aucun texte n'avait été trouvé.
 * @param {string} text
 * @returns {boolean}
 */
function isPdfTextReadable(text) {
    if (!text) return false;
    // On retire tout ce qui est entre crochets [WedaAutoParse...] et qui a été rajouté par Weda-Helper
    const cleanedText = text.replace(/\[WedaAutoParse.*?\]/g, '');

    const trimmed = cleanedText.trim();
    if (!trimmed) return false;
    // Lettres (avec accents) et chiffres : un texte "normal" en est majoritairement composé.
    const normalChars = trimmed.match(/[a-zA-Z0-9À-ÿ]/g) || [];
    if (normalChars.length < MIN_READABLE_PDF_CHAR_COUNT) return false;
    const isReadable = (normalChars.length / trimmed.length) >= MIN_READABLE_PDF_CHAR_RATIO;
    console.log('[pdfAttachmentHelper] Texte PDF lisible :', isReadable, '(', normalChars.length, '/', trimmed.length, ')', 'Texte :', trimmed);
    return isReadable;
}

/**
 * Convertit les pages d'un PDF (typiquement un document scanné, sans texte extractible) en
 * images PNG encodées en data URL, une par page (dans la limite de MAX_SCANNED_PDF_PAGES_AS_IMAGES).
 * Réutilise pdfjsLib et renderPagesToCanvases (@see pdfParser.js).
 * @param {string} pdfUrl
 * @returns {Promise<string[]>}
 */
async function renderPdfPagesAsImageDataUrls(pdfUrl) {
    const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
    const pageCount = Math.min(pdf.numPages, MAX_SCANNED_PDF_PAGES_AS_IMAGES);
    const pages = [];
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        pages.push(await pdf.getPage(pageNum));
    }
    const canvases = await renderPagesToCanvases(pages);
    return canvases.map(canvas => canvas.toDataURL('image/png'));
}

/**
 * Point d'entrée unique pour lire un pdf destiné à l'IA : extrait son texte, et si celui-ci est
 * absent/illisible (scan), se rabat sur un rendu de ses pages en images. Utilisé aussi bien pour
 * les pdf uploadés manuellement par l'utilisateur (discussionClient.js) que pour les pdf du dossier
 * patient lus via function calling (callableFunctions.js).
 * @param {string} pdfUrl - URL ou object URL du pdf.
 * @returns {Promise<{kind: 'text', text: string} | {kind: 'images', images: string[]}>}
 */
async function resolvePdfAttachment(pdfUrl) {
    const text = await extractTextFromPDF(pdfUrl);
    if (isPdfTextReadable(text)) {
        return { kind: 'text', text };
    }
    console.warn('[pdfAttachmentHelper] Texte extrait absent ou illisible, rendu des pages en images.');
    const images = await renderPdfPagesAsImageDataUrls(pdfUrl);
    return { kind: 'images', images };
}
