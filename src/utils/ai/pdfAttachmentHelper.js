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
/** Nombre minimum de caractères "normaux" pour qu'une page d'un PDF multipage soit envoyée en texte : en dessous, la page (scan avec simple en-tête/pied de page, page quasi vide...) est envoyée en image. */
const MIN_READABLE_PDF_PAGE_CHAR_COUNT = 150;
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
function isPdfTextReadable(text, minCharCount = MIN_READABLE_PDF_CHAR_COUNT) {
    if (!text) return false;
    // On retire tout ce qui est entre crochets [WedaAutoParse...] et qui a été rajouté par Weda-Helper
    const cleanedText = text.replace(/\[WedaAutoParse.*?\]/g, '');

    const trimmed = cleanedText.trim();
    if (!trimmed) return false;
    // Lettres (avec accents) et chiffres : un texte "normal" en est majoritairement composé.
    const normalChars = trimmed.match(/[a-zA-Z0-9À-ÿ]/g) || [];
    if (normalChars.length < minCharCount) return false;
    const isReadable = (normalChars.length / trimmed.length) >= MIN_READABLE_PDF_CHAR_RATIO;
    console.log('[pdfAttachmentHelper] Texte PDF lisible :', isReadable, '(', normalChars.length, '/', trimmed.length, ')', 'Texte :', trimmed);
    return isReadable;
}

/**
 * Convertit les pages d'un PDF (typiquement un document scanné, sans texte extractible) en
 * images PNG encodées en data URL, une par page (dans la limite de MAX_SCANNED_PDF_PAGES_AS_IMAGES).
 * Réutilise pdfjsLib et renderPagesToCanvases (@see pdfParser.js).
 * @param {object} pdf - Document PDF.js déjà chargé (@see loadPdfDocument, pdfParser.js).
 * @param {number[]|null} [pageNumbers] - Pages (numérotées à partir de 1) à rendre ; toutes par défaut.
 * @returns {Promise<string[]>}
 */
async function renderPdfPagesAsImageDataUrls(pdf, pageNumbers = null) {    const numbers = (pageNumbers || Array.from({ length: pdf.numPages }, (_, i) => i + 1))
        .slice(0, MAX_SCANNED_PDF_PAGES_AS_IMAGES);
    const pages = [];
    for (const pageNum of numbers) {
        pages.push(await pdf.getPage(pageNum));
    }
    const canvases = await renderPagesToCanvases(pages);
    return canvases.map(canvas => canvas.toDataURL('image/png'));
}

/**
 * Point d'entrée unique pour lire un pdf destiné à l'IA : extrait son texte page par page ; les pages
 * au texte lisible sont envoyées en texte, les autres (scan, police non standard...) en images.
 * Utilisé aussi bien pour les pdf uploadés manuellement par l'utilisateur (discussionClient.js) que
 * pour les pdf du dossier patient lus via function calling (callableFunctions.js).
 * @param {string} pdfSource - URL (ou object URL) du pdf.
 * @returns {Promise<{text: string|null, images: string[], imagePages: number[]}>}
 * `text` : texte des pages lisibles (préfixées par leur numéro si certaines pages sont en images) ;
 * `images` / `imagePages` : rendu et numéros (à partir de 1) des pages illisibles.
 */
async function resolvePdfAttachment(pdfSource) {
    const pdf = await loadPdfDocument(pdfSource);
    const pageTexts = await extractPageTextsFromPdfDocument(pdf);
    const minChars = pageTexts.length > 1 ? MIN_READABLE_PDF_PAGE_CHAR_COUNT : undefined;
    const readablePages = [];
    const imagePages = [];
    pageTexts.forEach((pageText, index) => {
        (isPdfTextReadable(pageText, minChars) ? readablePages : imagePages).push(index + 1);
    });
    console.log('[pdfAttachmentHelper] Pages en texte :', readablePages, '; pages en images :', imagePages);

    if (imagePages.length === 0) {
        return { text: pageTexts.join('\n'), images: [], imagePages };
    }

    const images = await renderPdfPagesAsImageDataUrls(pdf, imagePages);
    const text = readablePages.length === 0
        ? null
        : readablePages.map(pageNum => `--- Page ${pageNum} ---\n${pageTexts[pageNum - 1]}`).join('\n');
    return { text, images, imagePages };
}

/**
 * Convertit le résultat de resolvePdfAttachment en pièces jointes de chat (@see discussionClient.js
 * buildUserMessageContent) : une pièce texte, et une image par page illisible.
 * @param {{text: string|null, images: string[], imagePages: number[]}} resolved
 * @param {string} fileName
 * @returns {Array<{kind: 'text'|'image', name: string, extractedText?: string, dataUrl?: string}>}
 */
function pdfAttachmentsFromResolved(resolved, fileName) {
    const attachments = [];
    if (resolved.text) attachments.push({ kind: 'text', name: fileName, extractedText: resolved.text });
    resolved.images.forEach((dataUrl, index) => {
        attachments.push({ kind: 'image', name: `${fileName} (page ${resolved.imagePages[index]})`, dataUrl });
    });
    return attachments;
}
