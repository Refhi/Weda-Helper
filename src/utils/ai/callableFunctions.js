/**
 * Fonction de test appelable par le modèle (function/tool calling).
 * Renvoie simplement une confirmation d'appel avec les arguments reçus.
 */
function testFunction({ testMessage = "aucun message fourni" } = {}) {
    console.log(`[testFunction] Appelée avec argument:`, testMessage);
    return {
        status: "success",
        message: "Fonction de test exécutée avec succès",
        receivedArgument: testMessage,
        timestamp: new Date().toISOString()
    };
}

/**
 * Liste des catégories reconnues par dataScrapper (voir recoverData dans dataScrapper.js).
 */
const DATA_SCRAPPER_CATEGORIES = [
    "consultations",
    "resultatsExamens",
    "courriers",
    "arretsTravail",
    "vaccins",
    "charts",
    "documents",
    "grossesse",
    "etatCivil",
    "antecedents",
    "contacts"
];

// Cache partagé (promesse unique) de l'index de recherche CIM-10 (voir rechercherCim10 ci-dessous).
let _cim10IndexPromise = null;

/**
 * ressources/cim10.parquet : base CIM-10 FR PMSI (~19 075 lignes, dont ~18 778 codes exploitables de type "category" ;
 * les ~297 lignes restantes sont des regroupements "chapter"/"block" non assignables à un patient).
 * Colonnes disponibles (seules "code", "label", "type" et "synonymes" sont chargées ici) :
 *   - code (string)              ex. "A00.0"
 *   - label (string)             libellé officiel du diagnostic, ex. "À Vibrio cholerae 01, biovar cholerae"
 *   - type (string)              "chapter" | "block" | "category" (seul "category" est un diagnostic assignable)
 *   - synonymes (liste de string) variantes/termes courants associés au code, également indexés pour la recherche
 *   - depth, lft, rgt, path, inclusion_note, exclusion_note, exclusion_codes, keywords (non chargées ici)
 * Charge et met en cache (une seule fois par content script) un index de recherche floue Fuse.js sur label+synonymes.
 */
async function chargerIndexCim10() {
    if (!_cim10IndexPromise) {
        _cim10IndexPromise = (async () => {
            const { parquetReadObjects } = await import(chrome.runtime.getURL('lib/hyparquet/index.js'));
            const file = await fetch(chrome.runtime.getURL('ressources/cim10.parquet')).then(r => r.arrayBuffer());
            const rows = await parquetReadObjects({ file, columns: ['code', 'label', 'type', 'synonymes'] });
            // Seuls les codes "category" sont de véritables diagnostics assignables (chapter/block sont des regroupements).
            const codes = rows.filter(r => r.type === 'category');
            const fuse = new Fuse(codes, {
                keys: [
                    { name: 'label', weight: 0.7 },
                    { name: 'synonymes', weight: 0.3 }
                ],
                threshold: 0.4,
                ignoreLocation: true,
                includeScore: true
            });
            console.log(`[callableFunctions] Base CIM-10 chargée : ${codes.length} codes indexés.`);
            return fuse;
        })();
    }
    return _cim10IndexPromise;
}

/**
 * Fonction appelable par le modèle pour rechercher des codes CIM-10 correspondant à un ou plusieurs termes
 * (recherche floue sur le libellé officiel et les synonymes). Accepte `terme` (unique, rétrocompat) et/ou `termes`
 * (lot) afin d'éviter un aller-retour tool-call par diagnostic quand plusieurs codes sont à chercher d'un coup.
 * Ne modifie rien dans Weda : c'est à l'IA d'examiner les résultats retournés et de choisir le code le plus
 * pertinent avant d'appeler traiterAntecedents (action='ajouter'), ou de se rabattre sur un antécédent libre si aucun résultat ne
 * correspond réellement au diagnostic voulu (éviter la sur-précision, ex. ne pas choisir un germe précis non
 * mentionné par l'utilisateur).
 */
async function rechercherCim10({ terme, termes, limite = 20 } = {}) {
    const termesAChercher = [...new Set([...(Array.isArray(termes) ? termes : []), terme].filter(Boolean))];
    console.log(`[rechercherCim10] Appelée avec:`, { termesAChercher, limite });
    if (!termesAChercher.length) return { error: "Aucun terme de recherche fourni (utiliser 'terme' ou 'termes')." };
    try {
        const fuse = await chargerIndexCim10();
        const resultatsParTerme = termesAChercher.map(t => ({
            terme: t,
            resultats: fuse.search(t, { limit: limite }).map(r => ({ code: r.item.code, label: r.item.label, score: r.score }))
        }));
        // Un seul terme demandé : renvoie directement la liste des résultats (rétrocompat avec l'ancien format).
        return termesAChercher.length === 1 ? resultatsParTerme[0].resultats : resultatsParTerme;
    } catch (e) {
        console.error("[rechercherCim10] Erreur lors de la recherche :", e);
        return { error: `Erreur lors de la recherche CIM-10 : ${e.message || e}` };
    }
}

/**
 * Parcourt le résultat de recoverData et remplace, pour chaque pièce jointe dont l'URL a été
 * résolue (attachment.url, voir resolveAttachmentFileIds), le champ url par le texte extrait du
 * pdf (attachment.pdfText), ou par des images de ses pages (attachment.images) si le pdf est un
 * scan sans texte lisible (@see resolvePdfAttachment, pdfAttachmentHelper.js) : le modèle reçoit
 * directement le contenu du document, comme si l'utilisateur le lui avait fourni et confirmé,
 * plutôt qu'un simple lien à rappeler.
 * @param {Object} data - Résultat de recoverData, potentiellement enrichi d'attachment.url
 */
async function lirePiecesJointesPdf(data) {
    for (const categoryData of Object.values(data)) {
        if (!Array.isArray(categoryData)) continue;
        for (const day of categoryData) {
            for (const attachment of day.attachments || []) {
                if (!attachment.url) continue;
                try {
                    const resolved = await resolvePdfAttachment(attachment.url);
                    if (resolved.kind === 'text') attachment.pdfText = resolved.text;
                    else attachment.images = resolved.images;
                } catch (e) {
                    console.error(`[recoverPatientData] Erreur lors de la lecture du pdf (fileId=${attachment.fileId}) :`, e);
                    attachment.pdfText = null;
                } finally {
                    delete attachment.url;
                }
            }
        }
    }
}

/**
 * Retrouve, dans un résultat de recoverData, la pièce jointe portant le fileId donné.
 * @param {Object} data
 * @param {string} fileId
 * @returns {Object|null}
 */
function trouverAttachmentParFileId(data, fileId) {
    for (const categoryData of Object.values(data)) {
        if (!Array.isArray(categoryData)) continue;
        for (const day of categoryData) {
            const attachment = (day.attachments || []).find(a => a.fileId === fileId);
            if (attachment) return attachment;
        }
    }
    return null;
}

/**
 * Contexte (categories/dateRange/patientId) nécessaire pour retrouver un fileId donné dans
 * l'iframe de scraping, indexé par fileId. Alimenté à chaque recoverPatientData, consommé par
 * lireDocumentJoint : le modèle n'a ainsi plus besoin de re-fournir categories/dateRange pour lire
 * un document repéré lors d'un appel précédent, un simple fileId suffit.
 */
const _attachmentContextByFileId = new Map();

/**
 * Enregistre, pour chaque pièce jointe trouvée dans le résultat, le contexte d'appel ayant permis
 * de la trouver (voir _attachmentContextByFileId).
 * @param {Object} data - Résultat de recoverData
 * @param {{categories: string[], dateRange: Array, patientId: string|null}} context
 */
function enregistrerContextePiecesJointes(data, context) {
    for (const categoryData of Object.values(data)) {
        if (!Array.isArray(categoryData)) continue;
        for (const day of categoryData) {
            for (const attachment of day.attachments || []) {
                if (attachment.fileId) _attachmentContextByFileId.set(attachment.fileId, context);
            }
        }
    }
}

/**
 * Fonction appelable par le modèle pour récupérer les données de l'historique du patient
 * actuellement ouvert dans Weda (consultations, résultats d'examens, antécédents, etc.).
 * S'appuie sur recoverData (voir dataScrapper.js). Cette fonction n'est jamais invoquée depuis le
 * document offpage (qui ne charge pas dataScrapper.js) : seul son `definition` y est lu, pour
 * construire la liste des tools envoyée au modèle (@see offscreenChatEngine.js).
 */
async function recoverPatientData({
    categories = ["consultations"],
    dateRange = [],
    antecedentsType,
    antecedentsChampDate,
    antecedentsDateRange = []
} = {}, patientId = null) {
    // Une plage d'au plus un mois tient dans les 10 dernières entrées chargées par défaut ; au-delà (ou sans plage), tout l'historique est chargé.
    const { start, end } = resolveDateRange(dateRange);
    const limiteUnMois = new Date(end || Date.now());
    limiteUnMois.setHours(0, 0, 0, 0);
    limiteUnMois.setMonth(limiteUnMois.getMonth() - 1);
    const fullPage = !(start && start >= limiteUnMois);
    console.log(`[recoverPatientData] Appelée avec:`, { categories, fullPage, dateRange, antecedentsType, antecedentsChampDate, antecedentsDateRange, patientId });
    try {
        const data = await recoverData({ categories, fullPage, dateRange, debug: false, patientId });
        enregistrerContextePiecesJointes(data, { categories, dateRange, patientId });
        if (data?.antecedents && (antecedentsType || antecedentsChampDate)) {
            data.antecedents = filtrerAntecedents(data.antecedents, {
                type: antecedentsType,
                champDate: antecedentsChampDate,
                dateRange: antecedentsDateRange
            });
        }
        return data;
    } catch (e) {
        console.error("[recoverPatientData] Erreur lors de la récupération des données :", e);
        return { error: `Erreur lors de la récupération des données : ${e.message || e}` };
    }
}

/**
 * Parcourt toutes les iframes présentes dans la page actuelle et renvoie les URLs ressemblant à
 * un pdf (src ou, si accessible, l'URL réellement chargée dans l'iframe une fois le pdf ouvert).
 */
function trouverUrlsPdfDansIframes() {
    const urls = new Set();
    for (const iframe of document.querySelectorAll('iframe')) {
        let url = null;
        try {
            url = iframe.contentWindow?.location?.href;
        } catch (e) { /* iframe cross-origin, inaccessible */ }
        if (!url || url === 'about:blank') url = iframe.src;
        // Le src ne contient pas toujours "pdf" (ex. BinaryData.aspx?id=...) : on se base aussi
        // sur l'id/nom de l'iframe, utilisé par Weda pour ses viewers de pdf.
        const ressembleAUnPdf = /pdf|binarydata|downloadattachment/i.test(url || '')
            || /viewpdfdocumentucform|iframeviewfile/i.test(iframe.id || '');
        if (url && url !== 'about:blank' && ressembleAUnPdf) urls.add(url);
    }
    return [...urls];
}

/**
 * Recherche et lit le contenu de tous les pdf trouvés dans les iframes de la page actuelle
 * (PopUpViewBinaryForm.aspx, ouverte manuellement par l'utilisateur pour visualiser une pièce
 * jointe hors du scraping habituel de recoverPatientData).
 */
async function lirePdfDepuisIframesPage() {
    const urls = trouverUrlsPdfDansIframes();
    console.log(`[pageContext] Recherche de pdf dans les iframes de la page :`, urls);
    if (!urls.length) return { error: "Aucune iframe contenant un pdf n'a été trouvée sur la page actuelle." };

    const resultats = [];
    for (const url of urls) {
        try {
            const resolved = await resolvePdfAttachment(url);
            resultats.push(resolved.kind === 'text' ? { url, pdfText: resolved.text } : { url, images: resolved.images });
        } catch (e) {
            console.error(`[pageContext] Erreur lors de la lecture du pdf (url=${url}) :`, e);
            resultats.push({ url, error: `Erreur lors de la lecture du document : ${e.message || e}` });
        }
    }
    return resultats.length === 1 ? resultats[0] : resultats;
}

/**
 * Extrait, depuis la page HprimForm.aspx (résultat de biologie importé), le tableau structuré des
 * valeurs (#ContentPlaceHolder1_LabelHprimDataStructure) sous forme de lignes {libelle, valeur,
 * unite, min, max}. Se rabat sur le texte brut du compte-rendu (#ContentPlaceHolder1_DivDataHprim)
 * si le tableau est absent ou vide.
 */
function lireResultatsHprim() {
    const table = document.querySelector('#ContentPlaceHolder1_LabelHprimDataStructure table');
    if (table) {
        const lignes = [...table.querySelectorAll('tr')]
            .slice(1) // première ligne = en-têtes (Libellé, Valeur, Unité, Mininum, Maximum)
            .map(tr => {
                const tds = tr.querySelectorAll('td');
                return {
                    libelle: tds[1]?.innerText.trim(),
                    valeur: tds[2]?.innerText.trim(),
                    unite: tds[3]?.innerText.trim(),
                    min: tds[4]?.innerText.trim(),
                    max: tds[5]?.innerText.trim()
                };
            })
            .filter(ligne => ligne.libelle);
        if (lignes.length) return { resultats: lignes };
    }

    const texteBrut = document.querySelector('#ContentPlaceHolder1_DivDataHprim')?.innerText?.trim();
    if (texteBrut) return { compteRendu: texteBrut };

    return { error: "Aucun résultat d'analyse (tableau ou compte-rendu) n'a été trouvé sur la page actuelle." };
}

/**
 * Fonction appelable par le modèle pour récupérer des informations contextuelles propres à la
 * page Weda actuellement affichée (en dehors du dossier patient classique consultable via
 * recoverPatientData), lorsque son contenu dépend de l'URL en cours :
 * - PopUpViewBinaryForm.aspx (visualisation manuelle d'une pièce jointe) : lecture des pdf trouvés
 *   dans les iframes de la page.
 * - HprimForm.aspx (résultat de biologie importé) : tableau structuré des valeurs ou, à défaut,
 *   texte brut du compte-rendu.
 */
async function pageContext() {
    const url = window.location.href;
    console.log(`[pageContext] Appelée, url actuelle :`, url);
    if (url.includes('/FolderMedical/PopUpViewBinaryForm.aspx')) return await lirePdfDepuisIframesPage();
    if (url.includes('/FolderMedical/HprimForm.aspx')) return lireResultatsHprim();
    return { error: "Aucune information contextuelle disponible pour la page actuelle." };
}

/**
 * Fonction appelable par le modèle pour lire le contenu (texte) d'une ou plusieurs pièces jointes
 * pdf déjà repérées via un appel précédent à recoverPatientData (champ attachment.fileId).
 * `fileId` accepte indifféremment une chaîne unique ou un tableau, pour lire plusieurs documents
 * en un seul appel plutôt que d'enchâiner plusieurs appels successifs. Retrouve seule la
 * catégorie/plage de dates de chaque fileId via _attachmentContextByFileId (regroupés par
 * contexte identique pour ne rejouer recoverData qu'une fois par groupe).
 */
async function lireDocumentsJoints({ fileId } = {}, patientId = null) {
    // Accepte fileId en tant que string (simple ou comma-separated) ou array
    let fileIds = fileId;
    if (typeof fileId === 'string') {
        fileIds = fileId.split(',').map(id => id.trim()).filter(Boolean);
    }
    const fileIdsAChercher = [...new Set((Array.isArray(fileIds) ? fileIds : [fileIds]).filter(Boolean))];
    console.log(`[lireDocumentsJoints] Appelée avec:`, { fileIdsAChercher, patientId });
    if (!fileIdsAChercher.length) return { error: "fileId requis." };

    // Regroupe les fileId partageant le même contexte (categories/dateRange/patientId) pour ne
    // rejouer recoverData qu'une fois par groupe plutôt qu'une fois par fileId.
    const groupesParContexte = new Map();
    const resultatsParFileId = {};

    // Pour chaque fileId à chercher, on récupère son contexte et on le regroupe par contexte identique.
    // Cela permet de ne pas appeler recoverData plusieurs fois pour des fileId partageant le même contexte.
    for (const id of fileIdsAChercher) {
        const context = _attachmentContextByFileId.get(id);
        if (!context) {
            resultatsParFileId[id] = { fileId: id, error: `fileId "${id}" inconnu : appelez d'abord recoverPatientData pour le repérer.` };
            continue;
        }
        const cleContexte = JSON.stringify([context.categories, context.dateRange, patientId || context.patientId]);
        if (!groupesParContexte.has(cleContexte)) groupesParContexte.set(cleContexte, { context, fileIds: [] });
        groupesParContexte.get(cleContexte).fileIds.push(id);
    }
    console.log(`[lireDocumentsJoints] Groupes par contexte:`, groupesParContexte);

    for (const { context, fileIds: idsDuGroupe } of groupesParContexte.values()) {
        console.log(`[lireDocumentsJoints] Traitement du groupe avec contexte:`, context, `et fileIds:`, idsDuGroupe);
        try {
            const data = await recoverData({
                categories: context.categories,
                dateRange: context.dateRange,
                debug: false,
                patientId: patientId || context.patientId,
                resolveAttachmentFileIds: idsDuGroupe,
            });
            console.log(`[lireDocumentsJoints] Données récupérées pour le groupe:`, data, `avec fileIds:`, idsDuGroupe);
            await lirePiecesJointesPdf(data);

            for (const id of idsDuGroupe) {
                const attachment = trouverAttachmentParFileId(data, id);
                console.log(`[lireDocumentsJoints] Attachment trouvé pour fileId "${id}":`, attachment);
                if (!attachment) {
                    console.warn(`[lireDocumentsJoints] Aucun attachment trouvé pour fileId "${id}".`);
                    resultatsParFileId[id] = { fileId: id, error: `Document introuvable pour fileId "${id}" (a-t-il disparu depuis le précédent appel ?).` };
                } else if (attachment.images?.length) {
                    console.log(`[lireDocumentsJoints] Attachment pour fileId "${id}" contient des images:`, attachment.images);
                    resultatsParFileId[id] = { fileId: id, name: attachment.name, images: attachment.images };
                } else if (!attachment.pdfText) {
                    console.log(`[lireDocumentsJoints] Attachment pour fileId "${id}" ne contient pas de texte PDF.`);
                    resultatsParFileId[id] = { fileId: id, name: attachment.name, error: `Impossible de récupérer le contenu du document "${attachment.name}" (fileId "${id}") : la résolution de son URL a échoué (voir la console du navigateur pour le détail).` };
                } else {
                    console.log(`[lireDocumentsJoints] Attachment pour fileId "${id}" contient du texte PDF.`);
                    resultatsParFileId[id] = { fileId: id, name: attachment.name, pdfText: attachment.pdfText };
                }
            }
        } catch (e) {
            console.error("[lireDocumentsJoints] Erreur lors de la lecture des documents :", e);
            for (const id of idsDuGroupe) {
                resultatsParFileId[id] = { fileId: id, error: `Erreur lors de la lecture du document : ${e.message || e}` };
            }
        }
    }

    const resultats = fileIdsAChercher.map(id => resultatsParFileId[id]);
    console.log(`[lireDocumentsJoints] Résultats finaux pour les fileIds recherchés:`, resultats);
    return resultats.length === 1 ? resultats[0] : resultats;
}

/**
 * Registre des fonctions disponibles pour le modèle, source unique de vérité pour tout nouveau
 * tool :
 * - `definition` : la description au format attendu par l'API OpenAI (tools)
 * - `execute` : l'implémentation JS réellement appelée (nécessite le DOM de la page Weda, donc
 *   uniquement exécutée côté content script)
 */
const availableFunctions = {
    // Simple fonction de test pour vérifier que le system de function calling fonctionne correctement.
    testFunction: {
        definition: {
            type: "function",
            function: {
                name: "testFunction",
                description: "Fonction de test pour vérifier que le system de function calling fonctionne correctement. Utilise uniquement pour les tests.",
                parameters: {
                    type: "object",
                    properties: {
                        testMessage: {
                            type: "string",
                            description: "Un message texte simple à tester. Exemple: 'Bonjour depuis le modèle'"
                        }
                    },
                    required: [
                        "testMessage"
                    ]
                }
            }
        },
        execute: testFunction
    },
    recoverPatientData: {
        definition: {
            type: "function",
            function: {
                name: "recoverPatientData",
                description: "Récupère les données de l'historique du patient actuellement ouvert dans Weda (consultations, résultats d'examens, courriers, arrêts de travail, vaccins, courbes de suivi, documents, grossesse, état civil, antécédents, contacts). Utile pour répondre à des questions sur le dossier du patient en cours. Pour la catégorie 'antecedents', antecedentsType/antecedentsChampDate/antecedentsDateRange permettent de filtrer par type (libre/codifié) et/ou par plage de dates sur un champ précis (début, fin, ponctuelle, alerte).",
                parameters: {
                    type: "object",
                    properties: {
                        categories: {
                            type: "array",
                            description: "Categories of data to retrieve. The name is in etatCivil",
                            items: {
                                type: "string",
                                enum: DATA_SCRAPPER_CATEGORIES
                            }
                        },
                        dateRange: {
                            type: "array",
                            description: "Date range filter for relative or absolute dates. For relative ranges, use [number, unit] like [7, \"days\"], [1, \"month\"], or [1, \"year\"] to get the last N days/months/years. For absolute dates, use [\"dd/mm/yyyy\", \"dd/mm/yyyy\"] format. A range of one month or less loads only recent entries (fast); longer ranges load entire history (slower). Prefer short ranges when possible.",
                            items: { type: ["string", "number"] }
                        },
                        antecedentsType: {
                            type: "string",
                            enum: ["libre", "codifie"],
                            description: "Optional filter on antecedents (categories must include 'antecedents') based on their type: 'libre' (free entry, without CIM-10 code) or 'codifie' (with a CIM-10 code). If absent, all types are returned."
                        },
                        antecedentsChampDate: {
                            type: "string",
                            enum: ["debut", "fin", "ponctuelle", "alerte"],
                            description: "Specify which date field of the antecedents to apply antecedentsDateRange to (Début, Fin, date Ponctuelle ou date d'Alerte). Required for antecedentsDateRange to take effect."
                        },
                        antecedentsDateRange: {
                            type: "array",
                            description: "Specify an optional date range filter for antecedents, applied to the field designated by antecedentsChampDate: [startDate, endDate] in the format 'dd/mm/yyyy'. Each bound is optional.",
                            items: { type: "string" }
                        }
                    },
                    required: []
                }
            }
        },
        execute: (args, patientId) => recoverPatientData(args, patientId)
    },
    lireDocumentJoint: {
        definition: {
            type: "function",
            function: {
                name: "lireDocumentJoint",
                description: "Lit le contenu d'une ou plusieurs pièces jointes (pdf) du dossier patient, repérées par leur fileId (champ attachment.fileId renvoyé par un appel précédent à recoverPatientData). Ne fournir QUE le/les fileId : la catégorie et la plage de dates d'origine sont retrouvées automatiquement. Renvoie {fileId, name, pdfText} si le texte du pdf est lisible, ou {fileId, name, images} (pages du document transmises séparément au chat sous forme d'images, pour un pdf scanné/illisible) sinon (ou {fileId, error} si le fileId est inconnu, appeler recoverPatientData avant), groupé dans un tableau si plusieurs fileId demandés.",
                parameters: {
                    type: "object",
                    properties: {
                        fileId: {
                            description: "A single fileId (string) or multiple fileId separated by commas in a string, e.g., '893222115' or '893222115,893222126,893222140'.",
                            type: "string"
                        }
                    },
                    required: ["fileId"]
                }
            }
        },
        execute: ({ fileId } = {}, patientId) => lireDocumentsJoints({ fileId }, patientId)
    },
    pageContext: {
        definition: {
            type: "function",
            function: {
                name: "pageContext",
                description: "Récupère des informations contextuelles propres à la page Weda actuellement affichée, en dehors du dossier patient classique consultable via recoverPatientData. Le contenu renvoyé dépend de l'URL en cours : sur une page de visualisation manuelle d'une pièce jointe (PopUpViewBinaryForm.aspx), lit le(s) pdf trouvé(s) dans les iframes de la page et renvoie {url, pdfText} (ou un tableau si plusieurs) ; sur une page de résultat de biologie importé (HprimForm.aspx), renvoie soit {resultats: [{libelle, valeur, unite, min, max}, ...]} si un tableau structuré est disponible, soit {compteRendu} (texte brut) sinon. Renvoie {error} si l'URL actuelle n'est pas prise en charge.",
                parameters: {
                    type: "object",
                    properties: {},
                    required: []
                }
            }
        },
        execute: () => pageContext()
    },
    rechercherCim10: {
        definition: {
            type: "function",
            function: {
                name: "rechercherCim10",
                description: "Recherche des codes CIM-10 (diagnostics) correspondant à un ou plusieurs termes, par recherche floue sur le libellé officiel et les synonymes. Utiliser 'termes' (tableau) pour chercher plusieurs diagnostics en un seul appel plutôt que d'enchaîner plusieurs appels successifs. Renvoie jusqu'à 'limite' résultats {code, label, score} par terme (résultats groupés par terme si 'termes' contient plusieurs entrées). IMPORTANT : à appeler systématiquement avant traiterAntecedents (action='ajouter') avec searchType='CIM10' ; examiner les résultats et choisir le code le plus pertinent et le moins spécifique que nécessaire (ex. préférer un code 'sans précision' si l'utilisateur n'a donné aucun détail complémentaire). Si aucun résultat ne correspond réellement au diagnostic voulu, se rabattre sur un antécédent libre (action='ajouter' sans searchType).",
                parameters: {
                    type: "object",
                    properties: {
                        terme: {
                            type: "string",
                            description: "Terme médical unique à rechercher, ex. 'pneumonie'. Préférer 'termes' si plusieurs diagnostics sont à chercher."
                        },
                        termes: {
                            type: "array",
                            items: { type: "string" },
                            description: "Liste de termes médicaux à rechercher en un seul appel, ex. ['pneumonie', 'diabète type 2']."
                        },
                        limite: {
                            type: "integer",
                            description: "Nombre maximal de résultats à renvoyer par terme (défaut 20)."
                        }
                    }
                }
            }
        },
        execute: ({ terme, termes, limite } = {}) => rechercherCim10({ terme, termes, limite })
    },
    traiterAntecedents: {
        definition: {
            type: "function",
            function: {
                name: "traiterAntecedents",
                description: "Ajoute, modifie et/ou supprime un ou plusieurs antécédents du dossier du patient actuellement ouvert dans Weda, en une seule instruction. Chaque opération est traitée séquentiellement, dans l'ordre fourni. IMPORTANT : appeler au préalable recoverPatientData avec categories=['antecedents'] pour connaître les onglets/noms exacts existants et éviter les doublons ; pour action='ajouter' avec searchType='CIM10', appeler d'abord rechercherCim10 et fournir dans 'nom' le CODE exact choisi parmi ses résultats (pas un libellé libre). Les opérations 'modifier'/'supprimer' déclenchent chacune leur propre confirmation utilisateur avant application. Renvoie un tableau de résultats {action, nomCible, success, message}, dans le même ordre que les opérations fournies. Doit OBLIGATOIREMENT être appelé pour toute action sur des antécédents.",
                parameters: {
                    type: "object",
                    properties: {
                        operations: {
                            type: "array",
                            description: "Liste ordonnée d'une ou plusieurs opérations à exécuter séquentiellement.",
                            items: {
                                type: "object",
                                properties: {
                                    action: {
                                        type: "string",
                                        enum: ["ajouter", "modifier", "supprimer"],
                                        description: "Type d'opération à effectuer."
                                    },
                                    nomCible: {
                                        type: "string",
                                        description: "Requis pour 'modifier'/'supprimer' : nom (ou début du nom) de l'antécédent existant ciblé."
                                    },
                                    data: {
                                        type: "object",
                                        description: "Requis pour 'ajouter'/'modifier' (ignoré pour 'supprimer'). Pour 'ajouter' : searchType ('CIM10'/'allergieMolecule'/'allergiePrinceps', absent = antécédent libre), nom (saisie libre, terme de recherche, ou code CIM-10 exact selon searchType). Pour 'modifier' : seuls les champs fournis sont modifiés. Propriétés communes : onglet (libellé exact de l'onglet cible, ex. 'ANTÉCÉDENTS GYNECOLOGIQUES'), commentaire, dateDebut/dateFin/datePonctuelle/dateAlerte (jj/mm/aaaa), couleur (hexadécimal), validation ('1'=Confirmé,'2'=Hypothétique,'3'=Non confirmé,'4'=Exclu,'5'=Désactivé), lateralite ('0'=non spécifié,'1'=Droite,'2'=Gauche,'3'=D + G), tri (ordre numérique), isImportant, isHeritage, isPrive, isExclureVsm (booléens).",
                                        properties: {
                                            searchType: { type: "string", enum: ["CIM10", "allergieMolecule", "allergiePrinceps"] },
                                            nom: { type: "string" },
                                            onglet: { type: "string" },
                                            commentaire: { type: "string" },
                                            dateDebut: { type: "string" },
                                            dateFin: { type: "string" },
                                            datePonctuelle: { type: "string" },
                                            dateAlerte: { type: "string" },
                                            couleur: { type: "string" },
                                            validation: { type: "string", enum: ["1", "2", "3", "4", "5"] },
                                            lateralite: { type: "string", enum: ["0", "1", "2", "3"] },
                                            tri: { type: "string" },
                                            isImportant: { type: "boolean" },
                                            isHeritage: { type: "boolean" },
                                            isPrive: { type: "boolean" },
                                            isExclureVsm: { type: "boolean" }
                                        }
                                    }
                                },
                                required: ["action"]
                            }
                        }
                    },
                    required: ["operations"]
                }
            }
        },
        // Référence indirecte : traiterAntecedentsBatch n'existe que côté content script (dataInserterATCD.js),
        // pas dans la page offscreen qui ne fait que lire les `definition` de ce registre.
        execute: ({ operations = [] } = {}) => traiterAntecedentsBatch(operations)
    },
    insertWedaDocument: {
        definition: {
            type: "function",
            function: {
                name: "insertWedaDocument",
                description: "Crée un nouveau document (consultation, certificat, demande ou courrier) pour le patient actuellement ouvert dans Weda, via un iframe caché, puis l'enregistre. Utile pour rédiger rapidement un document à partir d'un contenu fourni par l'utilisateur.",
                parameters: {
                    type: "object",
                    properties: {
                        target: {
                            type: "string",
                            enum: ["toConsultation", "toCertificat", "toDemande", "toCourrier"],
                            description: "Type de document à créer."
                        },
                        title: {
                            type: "string",
                            description: "Titre du document (champ 'Titre'). Optionnel."
                        },
                        subtitle: {
                            type: "string",
                            description: "Sous-titre du document (champ 'Titre du document'). Optionnel."
                        },
                        content: {
                            type: "string",
                            description: "Contenu texte principal qui sera inséré dans le corps du document. Doit impérativement être fourni."
                        }
                    },
                    required: ["target", "content"]
                }
            }
        },
        // Référence indirecte : insertData n'existe que côté content script (dataInserter.js).
        execute: ({ target, title, subtitle, content } = {}) => insertData(target, { title, subtitle, content })
    },
    submitPdfParserFields: {
        definition: {
            type: "function",
            function: {
                name: "submitPdfParserFields",
                description: "Renvoie les champs demandés par une complétion automatique du PDF Parser, déduits du texte du document fourni dans le message. À n'appeler QUE en réponse à une telle demande explicite, jamais spontanément. Les champs documentTitle, destinationClass et documentType ne sont demandés que si le mode complet est activé, et doivent alors respecter les valeurs autorisées indiquées dans le message.",
                parameters: {
                    type: "object",
                    properties: {
                        documentDate: { type: "string", description: "Date du document, au format JJ/MM/AAAA. Laisser vide si introuvable." },
                        dateOfBirth: { type: "string", description: "Date de naissance du patient, au format JJ/MM/AAAA. Laisser vide si introuvable." },
                        nameMatches: {
                            type: "array",
                            items: { type: "string" },
                            description: "Nom complet (nom et prénom) du patient. Tableau vide si introuvable."
                        },
                        documentCommentaire: { type: "string", description: "Bref commentaire (1 à 2 phrases) résumant le contenu du document. Laisser vide si non pertinent." },
                        documentTitle: { type: "string", description: "Titre complet du document, tel qu'il doit apparaître dans le dossier patient." },
                        destinationClass: { type: "string", enum: ["1", "2", "3"], description: "Destination du classement : '1' pour Consultation, '2' pour Résultats d'examens, '3' pour Courrier." },
                        documentType: { type: "string", description: "Classification du document, parmi les valeurs autorisées indiquées dans le message." }
                    },
                    required: []
                }
            }
        },
        // Référence indirecte : resolvePendingPdfParserFields n'existe que côté content script (pdfParserAIExtraction.js).
        execute: (args) => resolvePendingPdfParserFields(args)
    }
};




