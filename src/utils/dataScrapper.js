/**
 * @file dataScrapper.js
 * @description S’occupe de récupérer les données de Weda pour les présenter à d’autres modules de façon structurée.
 * 
*/


// ─── Constantes ──────────────────────────────────────────────────────────────

/** Map pour stocker la correspondance initiales → nom complet du praticien (valable pour la catégorie en cours de traitement) */
const initialsToAuthorMap = new Map();

/**
 * Clé de stockage chrome.storage.local pour la correspondance initiales → nom complet.
 * Cette correspondance est persistée d'une session à l'autre, car les initiales seules ne
 * suffisent pas à retrouver l'auteur d'un document "nu" (ex: une recette) qui ne fournirait
 * pas lui-même le nom complet, si aucun autre document de la même journée ne le fournit.
 */
const INITIALS_AUTHOR_MAP_STORAGE_KEY = 'dataScrapperInitialsToAuthorMap';

/** Cache mémoire de la correspondance persistée, chargé depuis chrome.storage.local */
let persistentInitialsToAuthorMap = {};

/**
 * Charge la correspondance initiales → auteur précédemment persistée dans chrome.storage.local.
 * @returns {Promise<void>}
 */
async function loadPersistentInitialsToAuthorMap() {
    return new Promise(resolve => {
        chrome.storage.local.get([INITIALS_AUTHOR_MAP_STORAGE_KEY], result => {
            persistentInitialsToAuthorMap = result[INITIALS_AUTHOR_MAP_STORAGE_KEY] || {};
            resolve();
        });
    });
}

/**
 * Enregistre une correspondance initiales → auteur dans le cache mémoire et dans
 * chrome.storage.local, afin qu'elle puisse être réutilisée même en l'absence de référence
 * dans la journée/catégorie en cours (ex: recette isolée sans autre document signé).
 *
 * Si les mêmes initiales sont un jour associées à un auteur différent (cas de deux
 * praticiens partageant les mêmes initiales), la correspondance est marquée `ambiguous:true`
 * plutôt que d'être silencieusement écrasée : elle reste utilisable comme dernière estimation
 * connue, mais les consommateurs sont avertis (log + flag) que l'attribution n'est pas fiable.
 * @param {string} initials - Initiales du praticien
 * @param {{author: string, author_prenom: string|null, author_nom: string|null}} authorInfo
 */
function rememberInitialsToAuthor(initials, authorInfo) {
    if (!initials || !authorInfo?.author) return;

    const existing = persistentInitialsToAuthorMap[initials];
    const isConflict = existing && existing.author !== authorInfo.author;
    if (existing?.author === authorInfo.author && !!existing.ambiguous === false) return; // déjà à jour, rien à persister

    if (isConflict) {
        console.warn(`[dataScrapper] Initiales "${initials}" associées à plusieurs auteurs différents : "${existing.author}" puis "${authorInfo.author}". Correspondance marquée ambiguë.`);
    }

    persistentInitialsToAuthorMap[initials] = { ...authorInfo, ambiguous: isConflict };
    chrome.storage.local.set({ [INITIALS_AUTHOR_MAP_STORAGE_KEY]: persistentInitialsToAuthorMap });
}

/** Sélecteurs CSS centralisés — à mettre à jour si Weda change son DOM */
const usualMainContainer = "#HistoriqueUCForm1_UpdatePanelLiteralAfficheWeda";
const usualSubContainer  = ".sc";
// Sélecteurs partagés par les catégories à containeurs journaliers
const _DAILY = {
    mainContainer: usualMainContainer,
    subContainer:  usualSubContainer,
    date:      "[title='Cliquez sur la date pour ouvrir.']",
    author:    ".sign",
};

/**
 * Sélecteurs pour les journées « importées » d'un ancien logiciel.
 * Ces journées ne sont pas placées dans le panneau habituel (usualMainContainer),
 * mais directement dans le tableau englobant .historique-view-form, avec une
 * profondeur d'un cran de moins (pas de div#UpdatePanelLiteralAfficheWeda intermédiaire) :
 *   normal  : td > div#UpdatePanelLiteralAfficheWeda > div > .sc
 *   legacy  : td > div > .sc
 * La date n'a ni onclick ni title (non cliquable) mais garde un style inline distinctif.
 */
const _DAILY_LEGACY = {
    mainContainer: ".historique-view-form",
    subContainer:  ":scope > tbody > tr > td > div > " + usualSubContainer,
    date:      'table.st td[style="font-size:14px;"]',
    author:    _DAILY.author, // présent uniquement sur certains documents (le format récent-copié-collé)
};

const SELECTORS = {
    /**
     * Une entrée par catégorie :
     *   button    — sélecteur du bouton de navigation (null = ouvert par défaut)
     *   container — sélecteur du grand ensemble de données
     *   date      — sélecteur de la date dans le container (null si absent)
     *   author    — sélecteur de l'auteur dans le container (null si absent)
     */
    categories: {
        consultations:     { button: '#ButtonConsultation',        ..._DAILY, loadedCheck: "Consultation", legacy: _DAILY_LEGACY},
        resultatsExamens:  { button: '#ButtonResultatExamen',      ..._DAILY, loadedCheck: "Résultat", legacy: _DAILY_LEGACY },
        courriers:         { button: '#ButtonCourrier',            ..._DAILY, loadedCheck: "Courrier", legacy: _DAILY_LEGACY },
        arretsTravail:     { button: '#ButtonAT',                  ..._DAILY, loadedCheck: "A.T.", legacy: _DAILY_LEGACY },
        vaccins:           { button: '#ButtonVaccins',             mainContainer: usualMainContainer, parser: parseVaccins, loadedCheck: "Vaccins et rappels", legacy: _DAILY_LEGACY },
        charts:            { button: '#ButtonChart',               mainContainer: '#UpdatePanelVisuDocument', parser: parseCharts, loadedCheck: chartsLoadedCheck }, // Attention iframe...
        documents:         { button: '#ButtonDocumentJointAction', loadedCheck: "Recherche des documents", mainContainer: '#UpdatePanelVisuDocument', parser: parseDocuments },
        grossesse:         { button: '#ButtonPregnant',            loadedCheck: "Grossesse", mainContainer: usualMainContainer, parser: parseGrossesse },
        // Catégories non-journalières
        etatCivil:         { button: null, mainContainer: "#EtatCivilUCForm1_FramePatient", parser: parseEtatCivil },
        antecedents:       { button: null, mainContainer: "#PanelPatient > div:nth-child(5)", parser: parseAntecedents },
        contacts:          { button: null, mainContainer: "#PanelPatient > div:nth-child(4)", parser: parseContacts },
    },

    // Sélecteurs internes aux conteneurs journaliers
    dayContainer: {
        initials:          '.sp',
        documents:         '[name^="dh"]:not([name="dh10"])',
        attachmentsDiv:    '[name="dh10"] .pjm',
    },

    // Sélecteurs pour les documents individuels
    document: {
        pjm:               '.pjm',
        recetteTable:      'table.stxrec',
        content:           '.sst',
        icon:              '[class^="img16"]',
        title:             '.document-title',
        signature:         '.sign',
        text:              '.stx',
    },

    // Sélecteurs pour les pièces jointes
    attachments: {
        item:              '.bufi, .pja',
        titleContainer:    '.buft',
        visualizeLink:     'span[title^="Visualiser"]',
        viewLink:          '[onclick*="OpenViewBinaryFormLC"]',
        description:       '.cfc',
    },

    // Sélecteurs pour les recettes
    recette: {
        row:               'tr:not(.labelil)',
        iconFse:           'img16Fse',
        iconNoemie:        'img16Noemie',
    },
};




// ───────────────────────────────────────────────────────────────────────────────
/**
 * Récupère les données d'historique patient depuis Weda, par catégories.
 *
 * Retourne un objet structuré facile à parser
 * 
 * @example
 * const data = await recoverData({
 *     fullPage: true,                              // Charge l'intégralité de la page d'historique (au lieu des 10 par défaut de Weda), et inclut alors automatiquement les journées importées d'un ancien logiciel
 *     categories: ["consultations", "etatCivil"],  // Liste des catégories à récupérer (par défaut : ["consultations"])
 *     dateRange: ["01/01/2021", "31/12/2026"],     // Filtre les résultats sur une plage de dates (voir resolveDateRange)
 *     debug: false,                                // Laisse l'iframe de récupération affichée en fin d'appel
 * });
 * console.log(data);
 *
 * @argument categories ["consultations", "resultatsExamens", "courriers", "arretsTravail", "vaccins", "charts", "documents", "grossesse", "etatCivil", "antecedents", "contacts"]
 * @argument dateRange Tableau de 0, 1 ou 2 dates (objet Date ou texte "jj/mm/aaaa"), voir resolveDateRange
 * 
 */
async function recoverData({
    fullPage = false, // De base on ne va vérifier que les 10 derniers subContainers chargés par défaut. N'est probablement pas possible pour charts et vaccins
    categories = ["consultations"], // Ce qui est chargé par défaut est la catégorie "consultations".
    dateRange = [], // Filtre les résultats sur une plage de dates : [debut, fin], chaque borne étant facultative
    debug = false, // Affiche l'iframe en plein écran et ne la supprime pas à la fin pour faciliter le debug
} = {}) {
    // Les journées importées d'un ancien logiciel ne sont récupérées qu'en mode fullPage : ce
    // n'est plus un paramètre exposé séparément, pour éviter toute combinaison incohérente.
    const includeLegacy = fullPage;
    // Préparation de l'objet de données à retourner
    const data = {};

    // Résolution de la plage de dates demandée (bornes converties en objets Date, ou null si absentes)
    const resolvedDateRange = resolveDateRange(dateRange);

    // Chargement de la correspondance initiales → auteur persistée d'une session à l'autre
    await loadPersistentInitialsToAuthorMap();

    // Création d’une iframe dont on attend le chargement complet puis dont on récupère le document pour y chercher les données
    const urlToLoad = await constructPatientHistoryUrl();
    const iframe = await createHiddenIframe(urlToLoad, debug, 'dataScrapperIframe');
    let iframeDocument = iframe.contentDocument || iframe.contentWindow.document;

    // On récupère les données pour chaque catégorie demandée
    for (const category of categories) {
        const categorySelectors = SELECTORS.categories[category];
        if (!categorySelectors) {
            console.warn(`[dataScrapper] Catégorie inconnue : ${category}`);
            continue;
        }
        iframeDocument = iframe.contentDocument || iframe.contentWindow.document; // Indispensable car le document semble changer dans certains cas après un clic
        // On appuie sur le bouton pour charger la catégorie si nécessaire (sauf si déjà affichée par défaut)
        const isAlreadyLoaded = isCategoryLoaded(iframe, category);
        if (categorySelectors.button && !isAlreadyLoaded) {
            const button = iframeDocument.querySelector(categorySelectors.button);
            if (button) {
                console.log(`[dataScrapper] Bouton cliqué pour la catégorie : ${category}`, button);
                button.click();
                await loadingIsComplete(iframe, `chargement UI après clic catégorie ${category}`);
                await categoryLoadingComplete(iframe, category);
                console.log(`[dataScrapper] Données chargées pour la catégorie : ${category}`);
            } else {
                console.warn(`[dataScrapper] Bouton introuvable pour la catégorie : ${category}`);
            }
        }

        // Cas particulier de la catégorie "documents" : Weda applique son propre filtre de dates
        // (champs TextBoxDate1/TextBoxDate2) indépendamment de notre filtrage a posteriori. Si la
        // plage affichée ne couvre pas la plage demandée, il faut l'élargir avant de parser.
        if (category === 'documents') {
            iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
            await ensureDocumentsDateRangeCovers(iframe, resolvedDateRange);
        }

        // Le mode fullPage doit être appliqué une fois la catégorie courante affichée,
        // car Weda revient souvent à une vue partielle après changement de catégorie.
        if (fullPage) {
            iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
            await loadFullPage(iframeDocument);
            console.log(`[dataScrapper] Page complète chargée pour la catégorie : ${category}`);
            await sleep(100); // On attend un peu pour que le DOM soit stable
        }

        // Le document peut être remplacé après un postback ASP.NET : on le relit juste avant le parse.
        iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
        data[category] = recoverMainViewData(iframeDocument, categorySelectors, includeLegacy, category);

        // Filtrage a posteriori sur la plage de dates demandée (retire les entrées non pertinentes)
        data[category] = filterCategoryDataByDateRange(data[category], resolvedDateRange, category);
    }

    // Nettoyage : supprimer l'iframe si on n'est pas en mode debug
    if (!debug) {iframe.remove()}

    console.log('[dataScrapper] Données récupérées pour les catégories :', Object.keys(data), data);

    return data;
}

/**
 * Convertit une date en objet Date à partir d'un texte au format "jj/mm/aaaa", ou la renvoie
 * telle quelle si c'est déjà un objet Date. Retourne null si vide/invalide.
 * @param {string|Date|null|undefined} value
 * @returns {Date|null}
 */
function parseFrenchDate(value) {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    const match = String(value).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;
    const [, day, month, year] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return isNaN(date.getTime()) ? null : date;
}

/**
 * Formate un objet Date au format "jj/mm/aaaa" utilisé par Weda.
 * @param {Date} date
 * @returns {string}
 */
function formatFrenchDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Résout un argument dateRange (voir recoverData) en un objet {start, end} de type Date|null.
 * Accepte 0, 1 ou 2 éléments (objets Date ou texte "jj/mm/aaaa", chaîne vide ou absent = pas de
 * borne). La borne de fin est ramenée à 23:59:59.999 pour être inclusive sur toute la journée.
 * @param {Array<string|Date>} dateRange
 * @returns {{start: Date|null, end: Date|null}}
 */
function resolveDateRange(dateRange) {
    const [startRaw, endRaw] = Array.isArray(dateRange) ? dateRange : [];
    const start = parseFrenchDate(startRaw);
    const end = parseFrenchDate(endRaw);
    if (end) end.setHours(23, 59, 59, 999);
    return { start, end };
}

/**
 * Vérifie si une date texte ("jj/mm/aaaa") est comprise dans la plage résolue. Une date non
 * parsable est conservée (on ne filtre pas silencieusement des données dont on ne comprend pas
 * le format).
 * @param {string|null|undefined} dateStr
 * @param {{start: Date|null, end: Date|null}} range
 * @returns {boolean}
 */
function isDateStringInRange(dateStr, range) {
    if (!range || (!range.start && !range.end)) return true;
    const date = parseFrenchDate(dateStr);
    if (!date) return true;
    if (range.start && date < range.start) return false;
    if (range.end && date > range.end) return false;
    return true;
}

/**
 * Filtre les données d'une catégorie selon la plage de dates résolue.
 * - Cas général (journées, vaccins, documents) : le résultat est un tableau d'entrées portant
 *   chacune un champ "date" au premier niveau, on filtre directement dessus.
 * - "charts" : le résultat est un objet {dates, parametres} où les dates sont des colonnes
 *   partagées par tous les paramètres ; il faut filtrer les colonnes (dates + valeurs
 *   correspondantes) plutôt que de traiter un tableau d'entrées.
 * - "grossesse" : chaque suivi n'a pas de champ "date" exploitable au premier niveau, mais une
 *   grossesse est pertinente pour toute la période [datePresumeeDebut, datePresumeeDebut + 1 an]
 *   (suivi post-partum inclus) : on la garde dès que cette période chevauche la plage demandée.
 * - Catégories sans date exploitable et sans notion de période (etatCivil, antecedents,
 *   contacts) : laissées telles quelles, ce ne sont pas des événements datés unitaires.
 * @param {*} categoryData - Résultat retourné par recoverMainViewData pour une catégorie
 * @param {{start: Date|null, end: Date|null}} range
 * @param {string} category - Nom de la catégorie (clé de SELECTORS.categories)
 * @returns {*} Données filtrées (ou inchangées si non applicable)
 */
function filterCategoryDataByDateRange(categoryData, range, category) {
    if (!range || (!range.start && !range.end)) return categoryData;

    if (category === 'charts') return filterChartsByDateRange(categoryData, range);
    if (category === 'grossesse') return filterGrossesseByDateRange(categoryData, range);

    if (!Array.isArray(categoryData)) return categoryData;
    return categoryData.filter(entry => isDateStringInRange(entry?.date, range));
}

/**
 * Filtre les données de la catégorie "charts" en ne conservant que les colonnes (dates et
 * valeurs associées de chaque paramètre) comprises dans la plage demandée.
 * @param {{dates: Array<string>, parametres: Array<{nom: string, valeurs: Array}>}|*} categoryData
 * @param {{start: Date|null, end: Date|null}} range
 * @returns {*} Données filtrées, ou categoryData inchangé si la structure n'est pas celle attendue
 */
function filterChartsByDateRange(categoryData, range) {
    if (!categoryData || !Array.isArray(categoryData.dates)) return categoryData;

    const keepIndexes = categoryData.dates
        .map((date, index) => ({ date, index }))
        .filter(({ date }) => isDateStringInRange(date, range))
        .map(({ index }) => index);

    return {
        dates: keepIndexes.map(index => categoryData.dates[index]),
        parametres: (categoryData.parametres || []).map(parametre => ({
            nom: parametre.nom,
            valeurs: keepIndexes.map(index => parametre.valeurs[index]),
        })),
    };
}

/**
 * Filtre les données de la catégorie "grossesse" : un suivi de grossesse est conservé dès que
 * la plage demandée chevauche la période [datePresumeeDebut, datePresumeeDebut + 1 an], la
 * grossesse restant pertinente jusqu'à un an après son début (suivi post-partum compris).
 * Un suivi sans datePresumeeDebut exploitable est conservé par précaution.
 * @param {Array<Object>|*} categoryData
 * @param {{start: Date|null, end: Date|null}} range
 * @returns {*} Données filtrées, ou categoryData inchangé si ce n'est pas un tableau
 */
function filterGrossesseByDateRange(categoryData, range) {
    if (!Array.isArray(categoryData)) return categoryData;

    return categoryData.filter(entry => {
        const debut = parseFrenchDate(entry?.datePresumeeDebut);
        if (!debut) return true;

        const finPeriodePertinente = new Date(debut);
        finPeriodePertinente.setFullYear(finPeriodePertinente.getFullYear() + 1);

        const grossesseApresPlage = range.end && debut > range.end;
        const grossesseAvantPlage = range.start && finPeriodePertinente < range.start;
        return !grossesseApresPlage && !grossesseAvantPlage;
    });
}

/**
 * S'assure que les champs de filtre de dates propres à Weda pour la catégorie "documents"
 * (#HistoriqueUCForm1_TextBoxDate1 / #HistoriqueUCForm1_TextBoxDate2) couvrent bien la plage de
 * dates demandée. Si ce n'est pas le cas, élargit les champs puis relance la recherche via
 * #HistoriqueUCForm1_ButtonFindPieceJointe.
 * @param {HTMLIFrameElement} iframe
 * @param {{start: Date|null, end: Date|null}} range
 * @returns {Promise<void>}
 */
async function ensureDocumentsDateRangeCovers(iframe, range) {
    console.log('[dataScrapper] Vérification du filtre de dates Weda pour la catégorie documents', range);
    // Sans plage demandée, on considère tout de même qu'il faut couvrir l'intégralité de
    // l'historique (01/01/1900 à aujourd'hui), Weda limitant sinon les documents affichés.
    const effectiveRange = {
        start: range?.start || parseFrenchDate('01/01/1900'),
        end: range?.end || new Date(),
    };

    const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
    const dateField1 = iframeDocument.querySelector('#HistoriqueUCForm1_TextBoxDate1');
    const dateField2 = iframeDocument.querySelector('#HistoriqueUCForm1_TextBoxDate2');
    if (!dateField1 || !dateField2) {
        console.warn('[dataScrapper] Champs de filtre de dates introuvables pour la catégorie documents');
        return;
    }

    const currentStart = parseFrenchDate(dateField1.value);
    const currentEnd = parseFrenchDate(dateField2.value);
    const covers =
        currentStart && currentStart <= effectiveRange.start &&
        currentEnd && currentEnd >= effectiveRange.end;
    if (covers) return;

    console.log('[dataScrapper] Élargissement du filtre de dates Weda pour la catégorie documents', { currentStart: dateField1.value, currentEnd: dateField2.value, effectiveRange });

    dateField1.value = formatFrenchDate(effectiveRange.start);
    dateField1.dispatchEvent(new Event('change', { bubbles: true }));

    dateField2.value = formatFrenchDate(effectiveRange.end);
    dateField2.dispatchEvent(new Event('change', { bubbles: true }));

    const findButton = iframeDocument.querySelector('#HistoriqueUCForm1_ButtonFindPieceJointe');
    if (!findButton) {
        console.warn('[dataScrapper] Bouton de recherche des documents introuvable (#HistoriqueUCForm1_ButtonFindPieceJointe)');
        return;
    }
    findButton.click();
    await loadingIsComplete(iframe, 'élargissement du filtre de dates des documents');
}

async function loadFullPage(iframeDocument) {
    clicCSPLockedElement('#HistoriqueUCForm1_LinkButtonSuiteWeda', "#dataScrapperIframe");
    await loadingIsComplete(iframeDocument.defaultView.frameElement, "Chargement full page");
}

/**
 * Attend que l'animation de chargement soit terminée dans l'iframe
 * @param {HTMLIFrameElement} iframe - L'iframe contenant la page d'historique
 * @returns {Promise<void>}
 */
async function loadingIsComplete(iframe, raisonAttente = "N/A") {
    const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
    const progressSelector = '#UpdateProgress2'
    function progessElementIsVisible() {
        const progressElement = iframeDocument.querySelector(progressSelector);
        return progressElement && progressElement.getAttribute('aria-hidden') !== 'true';
    }

    console.log('[dataScrapper] Début de l\'attente du chargement', raisonAttente);
    console.log('[dataScrapper] Progress element visible ?', progessElementIsVisible());

    const apparu = await waitUntil(progessElementIsVisible, {
        maxRetry: 10, // 10 * 50ms = 500ms max pour que l'élément de chargement apparaisse
        label: `affichage du chargement (${raisonAttente})`,
    });
    if (!apparu) return;
    console.log('[dataScrapper] Chargement détecté, attente de la fin', raisonAttente);

    const termine = await waitUntil(() => !progessElementIsVisible(), {
        maxRetry: 200, // 200 * 50ms = 10s max
        label: `fin du chargement (${raisonAttente})`,
    });
    if (!termine) return;

    console.log('[dataScrapper] Chargement terminé', raisonAttente);

    return new Promise(resolve => setTimeout(resolve, 100)); // On attend un peu pour être sûr que le DOM est stable
}

/**
 * Attend qu'une condition devienne vraie, en la testant à intervalles réguliers.
 * (voir waitUntil dans iframeHelpers.js)
 */

/**
 * Vérifie, de façon instantanée (sans attente), si la catégorie donnée est déjà
 * chargée/affichée dans l'iframe. Selon la catégorie, loadedCheck est soit un texte à
 * chercher dans #LabelCommandAffiche, soit une fonction personnalisée recevant l'iframe
 * et retournant un booléen.
 * @param {HTMLIFrameElement} iframe - L'iframe contenant la page d'historique
 * @param {string} category - Nom de la catégorie (clé de SELECTORS.categories)
 * @returns {boolean} true si la catégorie est déjà chargée
 */
function isCategoryLoaded(iframe, category) {
    const categorySelectors = SELECTORS.categories[category];
    if (!categorySelectors) {
        console.warn(`[dataScrapper] Catégorie inconnue : ${category}`);
        return false;
    }

    if (typeof categorySelectors.loadedCheck === 'function') {
        return categorySelectors.loadedCheck(iframe);
    }

    const titleElement = iframe.contentDocument.querySelector("#LabelCommandAffiche");
    return !!(titleElement && titleElement.textContent.includes(categorySelectors.loadedCheck));
}

async function categoryLoadingComplete(iframe, category) {
    const categorySelectors = SELECTORS.categories[category];
    console.log(`[dataScrapper] Attente du chargement de la catégorie ${category}`, `de loadedCheck : ${categorySelectors?.loadedCheck}`);
    if (!categorySelectors) {
        console.warn(`[dataScrapper] Catégorie inconnue : ${category}`);
        return;
    }

    const chargee = await waitUntil(() => isCategoryLoaded(iframe, category), {
        maxRetry: 200, // 200 * 50ms = 10s max
        label: `chargement de la catégorie ${category}`,
    });
    if (chargee) {
        console.log(`[dataScrapper] Chargement de la catégorie ${category} terminé`);
    }
}

/**
 * Vérifie si les données de la catégorie "charts" (Graphiques et tableaux) sont chargées,
 * en cherchant la présence de .suivicollection dans le sous-iframe imbriqué.
 * @param {HTMLIFrameElement} iframe - L'iframe contenant la page d'historique
 * @returns {boolean} true si les données de suivi sont détectées
 */
function chartsLoadedCheck(iframe) {
    const mainContainer = iframe.contentDocument.querySelector(SELECTORS.categories.charts.mainContainer);
    const nestedIframe = mainContainer?.querySelector('iframe');
    const nestedDoc = nestedIframe?.contentDocument || nestedIframe?.contentWindow?.document;
    return !!nestedDoc?.querySelector('.suivicollection');
}

/**
 * Creation d'une iframe cachée pour charger la page d'historique patient et récupérer les données
 * (voir createHiddenIframe dans iframeHelpers.js)
 */


/**
 * Constructeur d'url pour la page d'historique patient (voir getCurrentPatientPageUrl dans patientLink.js)
 */
async function constructPatientHistoryUrl() {
    const urlToLoad = await getCurrentPatientPageUrl('/FolderMedical/PopUpHistoriqueForm.aspx');
    console.log(`[dataScrapper] URL de la page d'historique : ${urlToLoad}`);
    return urlToLoad;
}

/**
 * Récupère le texte nettoyé (trim) d'un élément, ou de l'élément trouvé par un sélecteur
 * à l'intérieur de root. Retourne null si l'élément est absent ou son texte vide.
 * @param {HTMLElement} root - Élément racine dans lequel chercher (ou l'élément lui-même si selector est omis)
 * @param {string} [selector] - Sélecteur CSS de l'élément cible, relatif à root
 * @returns {string|null} Texte trouvé, ou null
 */
function textOf(root, selector) {
    const el = selector ? root?.querySelector(selector) : root;
    return el?.textContent.trim() || null;
}

/**
 * Nettoie un nom d'auteur brut et le décompose en prénom / nom.
 * Les noms bruts extraits de Weda ont typiquement la forme :
 *   "Dr. Prenom NOM : Généraliste"
 *   "Mme Prenom NOM : Infirmier salarié"
 *   "Dr. Prenom NOM : Généraliste"
 * On retire donc :
 *   - le titre de civilité éventuel en tête ("Dr.", "Pr.", "Mme", "M", "Melle")
 *   - la fonction/spécialité éventuelle en fin (après " : ")
 * Le nom de famille est déduit des mots consécutifs en fin de chaîne écrits en
 * majuscules (ex: "NOM COMPOSE ENDEUX"), le reste formant le prénom.
 * @param {string|null} rawName - Nom brut potentiellement préfixé d'un titre et suffixé d'une fonction
 * @returns {{author: string|null, author_prenom: string|null, author_nom: string|null}}
 */
function cleanAuthorName(rawName) {
    if (!rawName) return { author: null, author_prenom: null, author_nom: null };

    // On retire la fonction/spécialité éventuelle après " : "
    let name = rawName.split(':')[0].trim();
    // On retire le titre de civilité éventuel en tête
    name = name.replace(/^(Dr|Pr|Mme|M|Melle)\.?\s+/i, '').trim();

    if (!name) return { author: null, author_prenom: null, author_nom: null };

    // Le nom de famille est composé des mots consécutifs en majuscules en fin de chaîne
    const words = name.split(/\s+/);
    let nomWordsCount = 0;
    for (let i = words.length - 1; i >= 0; i--) {
        const word = words[i];
        if (word === word.toUpperCase() && /[A-ZÀ-Ý]/.test(word)) {
            nomWordsCount++;
        } else {
            break;
        }
    }

    const author_nom = nomWordsCount > 0 ? words.slice(words.length - nomWordsCount).join(' ') : null;
    const author_prenom = nomWordsCount < words.length ? words.slice(0, words.length - nomWordsCount).join(' ') : null;

    return { author: name, author_prenom, author_nom };
}

/**
 * Extrait le texte d'un bloc en évitant que le contenu de balises adjacentes (spans, td, etc.)
 * ne soit accolé sans séparateur (ex: "DESMAUX" + "NATHALIE" => "DESMAUXNATHALIE").
 * On travaille sur un clone pour ne pas modifier le DOM d'origine, car l'iframe étant cachée
 * (display:none), innerText ne fonctionne pas (nécessite un layout calculé).
 * Utilisé comme filet de sécurité pour les sous-parties trop complexes à structurer finement.
 * @param {HTMLElement} element - L'élément dont on veut extraire le texte
 * @returns {string} Texte extrait, avec des retours à la ligne entre les blocs et un espace entre les éléments en ligne
 */
function extractRawBlockText(element) {
    const clone = element.cloneNode(true);

    // Les <br> deviennent des retours à la ligne explicites
    clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));

    // Balises de type "bloc" : on sépare par un retour à la ligne, sinon par un simple espace
    const blockTags = new Set(['DIV', 'TR', 'TABLE', 'TBODY', 'P', 'LI', 'UL', 'OL']);
    clone.querySelectorAll('*').forEach(el => {
        const separator = blockTags.has(el.tagName) ? '\n' : ' ';
        el.insertAdjacentText('afterend', separator);
    });

    return clone.textContent
        .split('\n')
        .map(line => line.replace(/[ \t\u00A0]+/g, ' ').trim())
        .filter(line => line.length > 0)
        .join('\n');
}

/**
 * Parse le bloc "État civil" du patient
 * @param {HTMLElement} container - Le mainContainer de la catégorie etatCivil
 * @returns {Object} Données structurées de l'état civil
 */
function parseEtatCivil(container) {
    const get = suffix => textOf(container, `[id$="${suffix}"]`);

    const medecinTraitantEl = container.querySelector('[id$="LabelMedecinTraitant"]');
    const medecinTraitant = medecinTraitantEl ? {
        nom: textOf(medecinTraitantEl),
        dateDebutContrat: (medecinTraitantEl.getAttribute('title') || '').match(/Date de début de contrat\s*:\s*([\d/]+)/)?.[1] || null,
    } : null;

    // Adresses et moyens de communication : structure trop variable pour être finement typée,
    // on récupère chaque ligne (tr) sous forme de texte brut nettoyé.
    const coordonnees = Array.from(container.querySelectorAll('.table-address-comunication tr'))
        .map(row => extractRawBlockText(row))
        .filter(text => text.length > 0);

    return {
        identite: {
            civilite: get('LabelPatientCivilite'),
            nom: get('LabelPatientNom'),
            prenom: get('LabelPatientPrenom'),
            nomNaissance: get('LabelNomPrenomUtilise'),
            prenomNaissance: get('LabelPatientJeuneFille'),
            dateNaissance: get('LabelPatientDateNaissance'),
            age: get('LabelPatientAge'),
            lieuNaissance: get('LabelPatientLieuNaissance'),
        },
        securiteSociale: {
            numero: get('LabelPatientSecuriteSocial'),
            regimeCode: get('LabelCarteVitalRegime'),
            regimeOrganisme: get('LabelCarteVitalOrganisme'),
        },
        medecinTraitant,
        coordonnees,
        infosDiverses: get('LabelInfoDiverses'),
        annotationsPerso: get('LabelUserPatientAnnotation'),
    };
}

/**
 * Parse le bloc "Contacts" du patient (praticiens du cabinet et correspondants externes)
 * @param {HTMLElement} container - Le mainContainer de la catégorie contacts
 * @returns {Array<Object>} Liste des contacts
 */
function parseContacts(container) {
    const block = container.querySelector('.sc') || container;
    const entryDivs = Array.from(block.children).filter(el => el.tagName === 'DIV' && !el.classList.contains('st'));

    return entryDivs.map(div => {
        const title = div.getAttribute('title') || null;
        let type = 'correspondant_avec_lien';
        if (title?.startsWith('P.S. du cabinet')) {
            type = 'praticien_cabinet';
        } else if (title?.startsWith('Correspondant sans lien WEDA')) {
            type = 'correspondant_sans_lien';
        }
        return {
            type,
            info: title,
            texte: extractRawBlockText(div),
        };
    });
}

/**
 * Extrait la première date suivant un libellé (ex: "Alerte : 11/07/2031").
 * @param {string} text
 * @param {string} label
 * @returns {string|null}
 */
function extractAntecedentDate(text, label) {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`${escapedLabel}\\s*:\\s*(\\d{2}\\/\\d{2}\\/\\d{4})`, 'i');
    return text.match(regex)?.[1] || null;
}

/**
 * Extrait la première date "ponctuelle" (date isolée non rattachée à Début/Fin/Alerte).
 * @param {string} text
 * @param {{debut: string|null, fin: string|null, alerte: string|null}} datesConnues
 * @returns {string|null}
 */
function extractAntecedentDatePonctuelle(text, datesConnues) {
    const allDates = Array.from(text.matchAll(/\b(\d{2}\/\d{2}\/\d{4})\b/g)).map(match => match[1]);
    const excluded = new Set([datesConnues.debut, datesConnues.fin, datesConnues.alerte].filter(Boolean));
    const ponctuelle = allDates.find(date => !excluded.has(date));
    return ponctuelle || null;
}

/**
 * Nettoie le titre d'antécédent depuis la première ligne textuelle.
 * @param {string} firstLine
 * @returns {string|null}
 */
function cleanAntecedentTitle(firstLine) {
    if (!firstLine) return null;

    let title = firstLine
        .replace(/\(\s*(Début|Fin|Alerte)\s*(le)?\s*:\s*\d{2}\/\d{2}\/\d{4}\s*\)/gi, '')
        .replace(/\[[^\]]+\]/g, '')
        .replace(/\b(Début|Fin|Alerte)\s*:\s*\d{2}\/\d{2}\/\d{4}\.?/gi, '')
        .replace(/\b(Lat[eé]ralit[eé])\s*:\s*[^.]+/gi, '')
        .trim();

    // Cas fréquents: "rubrique : nom de l'atcd"
    if (title.includes(':')) {
        const parts = title.split(':').map(part => part.trim()).filter(Boolean);
        if (parts.length > 1) {
            const candidate = parts[parts.length - 1];
            if (/[A-Za-zÀ-ÿ]/.test(candidate) && !/^\d{2}\/\d{2}\/\d{4}/.test(candidate)) {
                title = candidate;
            }
        }
    }

    title = title.replace(/[\s.]+$/g, '').trim();
    return title || null;
}

/**
 * Parse une entrée d'antécédent en structure exploitable (sans conserver de doublon brut).
 * @param {string} text
 * @returns {Object}
 */
function parseAntecedentItem(text) {
    const lines = (text || '')
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);
    const firstLine = lines[0] || null;
    const fullText = lines.join(' ');

    const cim10Code = firstLine?.match(/\[([^\]]+)\]/)?.[1] || null;
    const debut = extractAntecedentDate(fullText, 'Début');
    const fin = extractAntecedentDate(fullText, 'Fin');
    const alerte = extractAntecedentDate(fullText, 'Alerte');
    const ponctuelle = extractAntecedentDatePonctuelle(fullText, { debut, fin, alerte });

    const descriptionLines = lines.slice(1).filter(line => !/\b(Début|Fin|Alerte)\s*:/.test(line));
    const description = descriptionLines.length > 0 ? descriptionLines.join('\n') : null;

    return {
        titre: cleanAntecedentTitle(firstLine),
        cim10Code,
        dates: {
            debut,
            fin,
            ponctuelle,
            alerte,
        },
        description,
    };
}

/**
 * Parse le bloc "Antécédents" du patient, organisé en sections (Médicaux, Chirurgicaux, Gynécologiques, etc.)
 * Chaque section commence par un div.st > .sm contenant le titre de la section.
 * @param {HTMLElement} container - Le mainContainer de la catégorie antecedents
 * @returns {Array<Object>} Liste des sections avec items structurés (sans doublons de données)
 */
function parseAntecedents(container) {
    const block = container.querySelector('.sc') || container;
    const children = Array.from(block.children);

    const sections = [];
    let currentSection = null;

    for (const child of children) {
        if (child.classList.contains('st')) {
            if (currentSection && currentSection.items.length > 0) {
                sections.push(currentSection);
            }
            const titleEl = child.querySelector('.sm');
            currentSection = {
                titre: (titleEl || child).textContent.trim(),
                items: [],
            };
        } else {
            if (!currentSection) {
                currentSection = {
                    titre: "Général",
                    items: [],
                };
            }
            const text = extractRawBlockText(child);
            if (text) {
                currentSection.items.push(parseAntecedentItem(text));
            }
        }
    }
    if (currentSection && currentSection.items.length > 0) {
        sections.push(currentSection);
    }

    return sections;
}

/**
 * Extrait l'identifiant d'événement (Eve) et de fichier (Fil) depuis un attribut onclick
 * de type OpenViewBinaryForm('Eve=xxx&Fil=yyy&...', '...')
 * @param {string} onclickAttr - Le contenu de l'attribut onclick
 * @returns {{eventId: string|null, fileId: string|null}}
 */
function extractDocMetaFromOnclick(onclickAttr) {
    const eventId = onclickAttr?.match(/Eve=(\d+)/)?.[1] || null;
    const fileId = onclickAttr?.match(/Fil=(\d+)/)?.[1] || null;
    return { eventId, fileId };
}

/**
 * Extrait le nom de fichier (depuis l'action "Supprimer") et le statut DMP
 * (présent = span, envoyable = lien <a>) depuis le tableau d'actions d'un document.
 * @param {HTMLElement} actionsTable - Le petit tableau contenant Renommer/Supprimer/We/DMP
 * @returns {{fileName: string|null, dmp: 'present'|'sendable'|null}}
 */
function extractDocActions(actionsTable) {
    if (!actionsTable) return { fileName: null, dmp: null };
    const supprimerDiv = actionsTable.querySelector('[onclick^="Dec("]');
    const fileName = supprimerDiv?.getAttribute('onclick')?.match(/Dec\([^,]*,\s*'([^']+)'/)?.[1] || null;
    const dmpSpan = actionsTable.querySelector('span[id^="DMPPJ"]');
    const dmpLink = actionsTable.querySelector('a[id^="DMPPJ"]');
    const dmp = dmpSpan ? 'present' : (dmpLink ? 'sendable' : null);
    return { fileName, dmp };
}

/**
 * Parse le bloc "Documents" (pièces jointes de la catégorie "documents"), qui peut être
 * affiché par Weda sous deux formes différentes selon le mode d'affichage choisi par
 * l'utilisateur :
 *   - vue carte   : div.pjm > div.pja (une carte par document)
 *   - vue tableau : table.fs-table > tr.grid-item_tr (une ligne par document)
 * @param {HTMLElement} container - Le mainContainer de la catégorie documents
 * @returns {Array<Object>} Liste des documents, au format unifié
 */
function parseDocuments(container) {
    const tableView = container.querySelector('table.fs-table');
    if (tableView) {
        return parseDocumentsTableView(tableView);
    }
    const cardView = container.querySelector('.pjm');
    if (cardView) {
        return parseDocumentsCardView(cardView);
    }
    console.warn("[dataScrapper] Vue documents non reconnue, dump brut en secours");
    return { rawLines: extractRawBlockText(container).split('\n') };
}

/**
 * Parse la vue tableau (table.fs-table) de la catégorie documents
 * @param {HTMLElement} table - L'élément table.fs-table
 * @returns {Array<Object>} Liste des documents
 */
function parseDocumentsTableView(table) {
    const rows = table.querySelectorAll(':scope > tbody > tr.grid-item_tr');
    return Array.from(rows).map(row => {
        const cells = row.querySelectorAll(':scope > td');
        const date = textOf(cells[0]);
        const category = textOf(cells[1]);
        const type = cells[2]?.getAttribute('title')?.trim() || textOf(cells[2]);
        const description = cells[3]?.getAttribute('title')?.trim() || textOf(cells[3]);
        const isExternal = !!cells[4]?.querySelector('span[title="Document externe"]');
        const { eventId, fileId } = extractDocMetaFromOnclick(cells[0]?.getAttribute('onclick'));
        const actionsTable = cells[5]?.querySelector('table');
        const { fileName, dmp } = extractDocActions(actionsTable);
        return { date, category, type, description: description || null, isExternal, eventId, fileId, fileName, dmp };
    }).filter(doc => doc.date || doc.fileId);
}

/**
 * Parse la vue carte (div.pjm > div.pja) de la catégorie documents
 * @param {HTMLElement} pjmDiv - L'élément div.pjm
 * @returns {Array<Object>} Liste des documents
 */
function parseDocumentsCardView(pjmDiv) {
    const items = pjmDiv.querySelectorAll(':scope > .pja');
    return Array.from(items).map(item => {
        const infoTable = item.querySelector('table.pjii');
        const rows = infoTable?.querySelectorAll(':scope > tbody > tr') || [];
        const date = textOf(rows[0]);
        const category = textOf(rows[2]);
        const type = textOf(rows[3], 'span');
        const isExternal = !!item.querySelector('span[title="Document externe"]');
        const { eventId, fileId } = extractDocMetaFromOnclick(infoTable?.getAttribute('onclick'));
        const actionsTable = item.querySelectorAll('table')[1] || null;
        const { fileName, dmp } = extractDocActions(actionsTable);
        const description = textOf(item, ':scope > .cfc');
        return { date, category, type, description, isExternal, eventId, fileId, fileName, dmp };
    });
}


/**
 * Parse le bloc "Grossesse" du patient (un .sc par suivi de grossesse).
 * Note : les calendriers de semaines (tableaux de dates par S.A.) et leur légende ne sont
 * pas extraits, ces données étant recalculables à partir des dates déjà récupérées.
 * @param {HTMLElement} container - Le mainContainer de la catégorie grossesse
 * @returns {Array<Object>} Liste des suivis de grossesse structurés
 */
function parseGrossesse(container) {
    const suiviContainers = container.querySelectorAll(usualSubContainer);
    return Array.from(suiviContainers).map(parseSuiviGrossesse);
}

/**
 * Parse un suivi de grossesse individuel
 * @param {HTMLElement} suivi - Élément .sc d'un suivi de grossesse
 * @returns {Object} Données structurées du suivi
 */
function parseSuiviGrossesse(suivi) {
    // Ligne d'en-tête : icône, statut (+ terme "S.A." si en cours), initiales de l'auteur
    const headerCells = Array.from(suivi.querySelectorAll('table.st tr td'));
    const statutText = textOf(headerCells[1]);
    const terme = headerCells.length === 4 ? textOf(headerCells[2]) : null;
    const auteurInitiales = textOf(headerCells[headerCells.length - 1]);

    const enCours = statutText === "Grossesse en cours";
    const dateFinTheorique = !enCours ? statutText?.match(/Fin théorique le\s*:\s*([\d/]+)/)?.[1] || null : null;

    // Informations clé/valeur (dernières règles, dates présumées, etc.) et commentaires libres
    // associés (ex: "La patiente a moins de deux enfants à charge...")
    const informations = {};
    const commentairesEffectifs = [];
    suivi.querySelectorAll('.stx > .information').forEach(div => {
        const spans = div.querySelectorAll(':scope > span');
        if (spans.length === 2) {
            const label = spans[0].textContent.trim().replace(/\s*:\s*$/, '');
            informations[label] = spans[1].textContent.trim();
        } else {
            const text = div.textContent.trim();
            if (text) commentairesEffectifs.push(text);
        }
    });

    // Tableau des congés (identifié par son icône dédiée), positionné en superposition
    const congesTable = Array.from(suivi.querySelectorAll('.stx table')).find(t => t.querySelector('.img16Conges'));
    let conges = null;
    if (congesTable) {
        const rows = Array.from(congesTable.querySelectorAll('tr')).slice(1); // 1ère ligne = titre/icône
        const debutCongePrenatal = rows.find(r => r.textContent.includes('Début de congé prénatal'))
            ?.querySelectorAll('td')[1]?.textContent.trim() || null;
        const finCongePostnatal = rows.find(r => r.textContent.includes('Fin de congé postnatal'))
            ?.querySelectorAll('td')[1]?.textContent.trim() || null;
        const commentaires = rows
            .filter(r => !r.textContent.includes('Début de congé prénatal') && !r.textContent.includes('Fin de congé postnatal'))
            .map(r => extractRawBlockText(r))
            .filter(Boolean);
        conges = { debutCongePrenatal, finCongePostnatal, commentaires: commentaires.length > 0 ? commentaires : null };
    }

    // Commentaire libre saisi par le praticien
    const commentaire = textOf(suivi, '.stx > .comment');

    // Ligne de bas de bloc : "Saisie le DATE par NOM"
    const saisieDiv = Array.from(suivi.querySelectorAll('.stx > div')).find(d => d.textContent.trim().startsWith('Saisie le'));
    const saisieMatch = saisieDiv?.textContent.trim().match(/Saisie le\s*([\d/]+)\s*par\s*(.+)/);

    return {
        statut: enCours ? "en_cours" : "termine",
        dateFinTheorique,
        terme,
        auteurInitiales,
        dernieresRegles: informations["Dernières règles"] || null,
        datePresumeeDebut: informations["Date présumée de début de grossesse"] || null,
        datePresumeeFin: informations["Date présumée de fin de grossesse"] || null,
        dateAccouchementReference: informations["Date d'accouchement de référence Sécurité Sociale"] || null,
        commentairesEffectifs: commentairesEffectifs.length > 0 ? commentairesEffectifs : null,
        conges,
        commentaire,
        saisieLe: saisieMatch?.[1] || null,
        ...cleanAuthorName(saisieMatch?.[2]?.trim()),
    };
}


/**
 * Parse le bloc "Vaccins et rappels" du patient.
 * Les séries normales (vaccins/rappels courants) sont organisées en div.sc, avec un div.st
 * (titre de série + bouton "supprimer toute la série") suivi d'un ou plusieurs div[name^="dh"]
 * contenant chacun une entrée (vaccin ou rappel). On aplatit ces séries en une simple liste
 * d'entrées, chacune portant sa propre date au premier niveau et le nom de la série en tag
 * ("serie"), plutôt que de regrouper les entrées par série.
 * Les entrées importées d'un ancien logiciel (div.sc[name="divwc"]) ne sont pas dans ce
 * mainContainer : elles se trouvent dans le conteneur "legacy" partagé avec les autres
 * catégories journalières (categorySelectors.legacy), disponible uniquement si includeLegacy.
 * Elles sont ajoutées à la même liste plate, avec un flag imported:true.
 * @param {HTMLElement} container - Le mainContainer de la catégorie vaccins
 * @param {Document} doc - Le document dans lequel chercher le conteneur legacy
 * @param {boolean} includeLegacy - Si true, récupère aussi les entrées importées d'un ancien logiciel
 * @param {Object} categorySelectors - Les sélecteurs de la catégorie (SELECTORS.categories.vaccins)
 * @returns {Array<Object>} Liste plate des entrées de vaccins/rappels
 */
function parseVaccins(container, doc, includeLegacy = false, categorySelectors = null) {
    const scDivs = container.querySelectorAll(usualSubContainer);
    const entries = Array.from(scDivs).flatMap(parseVaccinSerie);

    if (includeLegacy && categorySelectors?.legacy) {
        const legacyContainer = doc.querySelector(categorySelectors.legacy.mainContainer);
        if (legacyContainer) {
            const legacyDivs = legacyContainer.querySelectorAll(categorySelectors.legacy.subContainer);
            const legacyEntries = Array.from(legacyDivs).map(parseVaccinLegacyEntry);
            console.log(`[dataScrapper] ${legacyEntries.length} entrée(s) de vaccin importée(s) d'un ancien logiciel détectée(s)`);
            entries.push(...legacyEntries);
        }
    }

    return entries;
}

/**
 * Parse une série de vaccins/rappels (ex: "DTP", "DÉPISTAGES") et retourne ses entrées
 * aplaties, chacune taguée avec le nom de la série.
 * @param {HTMLElement} scDiv - Élément .sc représentant la série
 * @returns {Array<Object>} Entrées de la série, chacune avec un champ "serie"
 */
function parseVaccinSerie(scDiv) {
    const serie = textOf(scDiv, ':scope > .st table td');
    const entryWrappers = scDiv.querySelectorAll(':scope > div[name^="dh"]');
    return Array.from(entryWrappers)
        .map(wrapper => parseVaccinEntry(wrapper.querySelector(':scope > div')))
        .filter(Boolean)
        .map(entry => ({ serie, ...entry }));
}

/**
 * Parse une entrée individuelle (vaccin injecté ou rappel programmé) au sein d'une série
 * @param {HTMLElement} entryDiv - Le div contenant l'entrée (celui portant onmouseover="Vac(...)")
 * @returns {Object|null} Données structurées de l'entrée, ou null si absent
 */
function parseVaccinEntry(entryDiv) {
    if (!entryDiv) return null;

    const iconSpan = entryDiv.querySelector('.stt [class^="img16"]');
    const isRappel = iconSpan?.getAttribute('title') === 'Rappel';
    const type = isRappel ? 'rappel' : 'vaccin';

    // Cellule de titre : ex "repevax  24/11/2025" ou "CCR pour le 01/09/2023  Effectué"
    const titleCell = entryDiv.querySelector('.stt td');
    const effectueDansTitre = !!titleCell?.querySelector('.rouge');
    const titleText = (titleCell?.textContent || '').replace(/\s+/g, ' ').replace('Effectué', '').trim();
    const date = titleText.match(/(\d{2}\/\d{2}\/\d{4})/)?.[1] || null;
    const label = titleText
        .replace(/\d{2}\/\d{2}\/\d{4}/, '')
        .replace(/pour le\s*$/i, '')
        .replace(/\s+/g, ' ')
        .trim() || null;

    let injection = null, effectue = effectueDansTitre, lot = null, expiration = null, author = null, resultat = null;
    entryDiv.querySelectorAll(':scope > .stx').forEach(div => {
        const lsSpan = div.querySelector('.ls');
        if (lsSpan) {
            author = lsSpan.textContent.trim().replace(/^Auteur de l'alerte\s*:\s*/, '').trim();
            return;
        }

        const text = div.textContent.trim();
        if (text.startsWith('N° lot')) lot = text.replace(/^N° lot\s*:\s*/, '').trim();
        else if (text.startsWith("Date d'expiration")) expiration = text.replace(/^Date d'expiration\s*:\s*/, '').trim();
        else if (text.startsWith("Auteur de l'alerte")) author = text.replace(/^Auteur de l'alerte\s*:\s*/, '').trim();
        else if (/injection/i.test(text)) {
            effectue = effectue || !!div.querySelector('.rouge');
            injection = text.replace('Effectué', '').trim();
        }
        else if (text) resultat = text;
    });

    return { date, type, label, effectue, injection, lot, expiration, ...cleanAuthorName(author), resultat };
}

/**
 * Parse une entrée importée d'un ancien logiciel (div.sc[name="divwc"])
 * @param {HTMLElement} div - Élément .sc portant l'attribut name="divwc"
 * @returns {Object} Entrée aplatie, au même format que parseVaccinEntry
 */
function parseVaccinLegacyEntry(div) {
    const cells = div.querySelectorAll(':scope > table.st td');
    const date = textOf(cells[1]);

    const stxDivs = Array.from(div.querySelectorAll(':scope > .stx'));
    const produit = stxDivs.find(d => !d.textContent.includes('Injection n°') && !d.textContent.includes('prochaine injection'))
        ?.textContent.trim() || null;
    const injection = stxDivs.find(d => d.textContent.includes('Injection n°'))?.textContent.trim() || null;
    const prochaineInjection = stxDivs.find(d => d.textContent.includes('prochaine injection'))
        ?.querySelector('b')?.textContent.trim() || null;

    return {
        date,
        type: 'vaccin',
        serie: produit,
        label: produit,
        effectue: true,
        injection,
        lot: null,
        expiration: null,
        ...cleanAuthorName(textOf(cells[3])),
        resultat: null,
        prochaineInjection,
        imported: true,
    };
}

/**
 * Parse le bloc "Graphiques et tableaux" (suivi de courbes/valeurs, ex: poids, tension, etc.)
 * Les données réellement affichées dépendent des choix de l'utilisateur dans l'interface Weda
 * (mode tableau + unités + sélection des données dans le menu déroulant). Si aucune donnée
 * n'est trouvée, on avertit l'utilisateur pour qu'il configure l'affichage en conséquence.
 * @param {HTMLElement} container - Le mainContainer de la catégorie charts
 * @returns {Array<Object>|Object} Données de suivi, ou tableau vide si non configuré
 */
function parseCharts(container) {
    let suiviEl = container.querySelector('.suivicollection');

    // Les graphiques/tableaux peuvent être affichés dans un iframe imbriqué
    if (!suiviEl) {
        const nestedIframe = container.querySelector('iframe');
        const nestedDoc = nestedIframe?.contentDocument || nestedIframe?.contentWindow?.document;
        suiviEl = nestedDoc?.querySelector('.suivicollection') || null;
    }

    if (!suiviEl) {
        sendWedaNotif({
            message: "Aucune donnée de suivi trouvée. Dans « Graphiques et tableaux », sélectionnez le mode tableau, affichez les unités et choisissez les données souhaitées dans le menu déroulant. Le choix des éléments affichés peut être affiné depuis « Consultation » > « Définition des groupes ».",
            type: "fail",
            duration: 10000,
        });
        return [];
    }

    const table = suiviEl.querySelector('table');
    const rows = Array.from(table?.querySelectorAll(':scope > tbody > tr') || []);
    if (rows.length === 0) {
        console.warn("[dataScrapper] Table de suivi vide ou non reconnue, dump brut en secours");
        return { rawLines: extractRawBlockText(suiviEl).split('\n') };
    }

    // 1ère ligne : dates des colonnes. La 1ère cellule contient les contrôles d'ajout
    // de colonne (champ + bouton "+"), on l'ignore.
    const headerCells = Array.from(rows[0].querySelectorAll(':scope > td')).slice(1);
    const dates = headerCells.map(td => td.textContent.trim());

    // Lignes suivantes : 1ère cellule = libellé du paramètre, cellules suivantes = valeurs
    // (un <input> par date, avec la valeur dans value et l'unité dans title). L'unité est
    // stockée par cellule et non par ligne, car elle peut changer d'une date à l'autre
    // pour un même paramètre (ex: mmol/L puis mg/L).
    const parametres = rows.slice(1).map(row => {
        const cells = Array.from(row.querySelectorAll(':scope > td'));
        const nom = cells[0]?.textContent.trim() || null;
        const valeurs = cells.slice(1).map(td => {
            const input = td.querySelector('input');
            if (!input) return null;
            const valeur = input.value?.trim() || null;
            const unite = input.title?.trim() || null;
            if (!valeur) return null;
            return { valeur, unite };
        });
        return { nom, valeurs };
    }).filter(param => param.nom);

    return { dates, parametres };
}

/**
 * Récupère toutes les données de l'historique patient pour une catégorie donnée
 * @param {Document} doc - Le document (ou iframeDocument) dans lequel chercher
 * @param {Object} categorySelectors - Les sélecteurs de la catégorie (SELECTORS.categories[category])
 * @returns {Array<Object>} Tableau d'objets représentant chaque journée
 */
function recoverMainViewData(doc, categorySelectors, includeLegacy = false, category = "unknown") {
    // Réinitialisation de la Map de correspondance initiales → nom
    initialsToAuthorMap.clear();
    
    // Récupération du conteneur principal
    const mainContainer = doc.querySelector(categorySelectors.mainContainer);
    if (!mainContainer) {
        console.error("Main container not found");
        return [];
    }

    // Catégories non-journalières : chacune a son propre parser dédié
    if (!categorySelectors.subContainer) {
        if (categorySelectors.parser) {
            return categorySelectors.parser(mainContainer, doc, includeLegacy, categorySelectors);
        }
        console.warn("[dataScrapper] Aucun parser défini pour cette catégorie non-journalière, dump brut en secours", category);
        return { rawLines: extractRawBlockText(mainContainer).split('\n') };
    }

    // Chaque .sc = une journée avec potentiellement plusieurs documents
    const dayContainers = mainContainer.querySelectorAll(categorySelectors.subContainer);
    const results = Array.from(dayContainers).map(container => parseDayContainer(container, categorySelectors));

    // Certaines catégories peuvent contenir en plus des journées importées d'un ancien
    // logiciel, situées hors du panneau habituel. On ne les récupère que si demandé.
    if (includeLegacy && categorySelectors.legacy) {
        const legacyContainer = doc.querySelector(categorySelectors.legacy.mainContainer);
        if (legacyContainer) {
            const legacyDayContainers = legacyContainer.querySelectorAll(categorySelectors.legacy.subContainer);
            const legacyResults = Array.from(legacyDayContainers).map(container =>
                parseDayContainer(container, categorySelectors.legacy)
            );
            console.log(`[dataScrapper] ${legacyResults.length} journée(s) importée(s) d'un ancien logiciel détectée(s)`);
            results.push(...legacyResults.map(result => ({ ...result, imported: true })));
        }
    }

    return results;
}

/**
 * Parse un conteneur journalier pour extraire date, auteur et documents
 * @param {HTMLElement} container - Élément .sc
 * @param {Object} categorySelectors - Les sélecteurs de la catégorie (pour le sélecteur de date notamment)
 * @returns {Object} Données structurées de la journée
 */
function parseDayContainer(container, categorySelectors) {
    // Extraction des métadonnées de la journée (header table)
    const dateElement = container.querySelector(categorySelectors.date);
    const initials = textOf(container, SELECTORS.dayContainer.initials);

    // Documents : tous les divs name="dhX" sauf dh10 (pièces jointes)
    // Un même div peut contenir plusieurs recettes (ex: double facturation le même jour),
    // parseDocument retourne alors un tableau qu'il faut aplatir.
    const documentDivs = container.querySelectorAll(SELECTORS.dayContainer.documents);
    const documents = Array.from(documentDivs)
        .flatMap(div => parseDocument(div))
        .filter(doc => doc !== null);
    
    // Pièces jointes : div name="dh10"
    const attachmentsDiv = container.querySelector(SELECTORS.dayContainer.attachmentsDiv);
    const attachments = attachmentsDiv ? parseAttachments(attachmentsDiv) : [];
    
    // Détermination du nom complet du praticien
    let authorInfo = { author: null, author_prenom: null, author_nom: null };

    // 1. Chercher le premier document avec un author complet
    const docWithAuthor = documents.find(doc => doc.author);
    if (docWithAuthor) {
        authorInfo = { author: docWithAuthor.author, author_prenom: docWithAuthor.author_prenom, author_nom: docWithAuthor.author_nom };
        // Mettre à jour la correspondance initiales → nom (en mémoire pour la catégorie en
        // cours, et de façon persistante pour les futures sessions/catégories)
        if (initials) {
            initialsToAuthorMap.set(initials, authorInfo);
            rememberInitialsToAuthor(initials, authorInfo);
        }
    } else if (initials && initialsToAuthorMap.has(initials)) {
        // 2. Utiliser la correspondance existante (déjà rencontrée dans cette catégorie)
        authorInfo = initialsToAuthorMap.get(initials);
    } else if (initials && persistentInitialsToAuthorMap[initials]) {
        // 3. Utiliser la correspondance persistée d'une session précédente
        const persisted = persistentInitialsToAuthorMap[initials];
        if (persisted.ambiguous) {
            console.warn(`[dataScrapper] Attribution incertaine pour les initiales "${initials}" : plusieurs auteurs différents ont déjà été vus pour ces initiales. Dernière estimation utilisée : "${persisted.author}".`);
        }
        authorInfo = { author: persisted.author, author_prenom: persisted.author_prenom, author_nom: persisted.author_nom };
    }
    
    // Supprimer les champs d'auteur de tous les documents (on les garde uniquement au niveau du conteneur)
    documents.forEach(doc => { delete doc.author; delete doc.author_prenom; delete doc.author_nom; });
    
    return {
        date: dateElement?.textContent.trim() || null,
        ...authorInfo,
        documents,
        attachments
    };
}

/**
 * Extrait une valeur de type "Label : valeur" depuis un tableau de lignes.
 * @param {Array<string>} lines
 * @param {string} label
 * @returns {string|null}
 */
function extractLabeledValue(lines, label) {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^${escapedLabel}\\s*:\\s*(.+)$`, 'i');
    const line = lines.find(l => regex.test(l));
    return line ? line.replace(regex, '$1').trim() : null;
}

/**
 * Normalise un libellé d'analyse pour permettre une recherche robuste
 * (insensible aux accents, à la casse et aux espaces multiples).
 * @param {string|null} label
 * @returns {string}
 */
function normalizeBioLabelKey(label) {
    return (label || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
}

/**
 * Convertit une valeur texte en nombre si possible (ex: "12.8", "247,19").
 * @param {string|null} raw
 * @returns {number|null}
 */
function toBioNumber(raw) {
    if (!raw) return null;
    const normalized = raw.replace(',', '.').replace(/\s+/g, '');
    const value = Number(normalized);
    return Number.isFinite(value) ? value : null;
}

/**
 * Extrait les analyses biologiques depuis le tableau HPRIM (table.hprimgrid).
 * Retourne une structure indexée uniquement par libellé.
 * La structuration n'est faite que si un tableau avec en-têtes attendus est détecté
 * (au minimum: Libellé, Valeur, Unité).
 * @param {HTMLElement} documentDiv - Le bloc document (div[name="dhX"])
 * @returns {Object<string, Array<Object>>|null}
 */
function parseBiologyResults(documentDiv) {
    const tables = documentDiv.querySelectorAll('table.hprimgrid');
    const byLibelle = {};
    let hasValidHeader = false;

    tables.forEach(table => {
        const rows = Array.from(table.querySelectorAll(':scope > tbody > tr, :scope > tr'));
        if (rows.length === 0) return;

        const headerCells = Array.from(rows[0].querySelectorAll(':scope > td'))
            .map(td => normalizeBioLabelKey(textOf(td)));
        const hasExpectedColumns =
            headerCells.length >= 3 &&
            headerCells[0] === 'LIBELLE' &&
            headerCells[1] === 'VALEUR' &&
            headerCells[2] === 'UNITE';

        if (!hasExpectedColumns) return;

        hasValidHeader = true;
        const dataRows = rows.slice(1); // 1ère ligne = en-têtes (Libellé, Valeur, Unité, Min, Max)

        dataRows.forEach(row => {
            const cells = row.querySelectorAll(':scope > td');
            if (cells.length < 2) return;

            const libelle = textOf(cells[0]);
            const valeur = textOf(cells[1]);
            if (!libelle || !valeur) return;

            const unite = textOf(cells[2]);
            const minimum = textOf(cells[3]);
            const maximum = textOf(cells[4]);
            const horsNormes = Array.from(cells).some(cell => /color\s*:\s*#CE0000/i.test(cell.getAttribute('style') || ''));

            const analyse = {
                valeur,
                valeurNombre: toBioNumber(valeur),
                unite,
                minimum,
                maximum,
                minimumNombre: toBioNumber(minimum),
                maximumNombre: toBioNumber(maximum),
                horsNormes,
            };

            if (!byLibelle[libelle]) {
                byLibelle[libelle] = [];
            }

            const isDuplicate = byLibelle[libelle].some(existing =>
                existing.valeur === analyse.valeur &&
                existing.unite === analyse.unite &&
                existing.minimum === analyse.minimum &&
                existing.maximum === analyse.maximum
            );
            if (!isDuplicate) {
                byLibelle[libelle].push(analyse);
            }
        });
    });

    if (!hasValidHeader || Object.keys(byLibelle).length === 0) return null;
    return byLibelle;
}

/**
 * Parse le contenu textuel d'un "Arrêt de travail" en champs structurés.
 * @param {Array<string>} lines - Lignes textuelles du bloc .stx
 * @returns {Object|null}
 */
function parseArretTravailFields(lines) {
    if (!Array.isArray(lines) || lines.length === 0) return null;

    const debut = extractLabeledValue(lines, 'Début');
    const typeArret = extractLabeledValue(lines, 'Type');
    const arretMode = extractLabeledValue(lines, 'Arrêt de travail');
    const dureeRaw = extractLabeledValue(lines, 'Durée');
    const fin = extractLabeledValue(lines, 'Fin');

    const motifLine = lines.find(line => /^Motif\s*:/i.test(line));
    const motifCode = motifLine?.match(/code\s*([^\)\]]+)/i)?.[1]?.trim() || null;
    const motif = extractLabeledValue(lines, 'Motif');

    const transmissionLine = lines.find(line => /Arrêt transmis via AATi/i.test(line)) || null;
    const identifiantAATi = transmissionLine?.match(/identifiant\s*:\s*([A-Z0-9-]+)/i)?.[1] || null;

    const enRapportATMP = lines.find(line => /En rapport avec un accident de travail, maladie professionnelle/i.test(line)) || null;
    const dureeJours = dureeRaw?.match(/(\d+)/)?.[1] ? parseInt(dureeRaw.match(/(\d+)/)[1], 10) : null;

    return {
        debut,
        type: typeArret,
        mode: arretMode,
        enRapportAccidentTravailMP: !!enRapportATMP,
        enRapportAccidentTravailMPDetail: enRapportATMP,
        duree: dureeRaw,
        dureeJours,
        fin,
        motifCode,
        motif,
        identifiantAATi,
        transmission: transmissionLine,
    };
}

/**
 * Parse un document individuel (consultation, prescription, etc.)
 * @param {HTMLElement} div - Élément div[name="dhX"]
 * @returns {Array<Object|null>} Tableau de documents (généralement un seul élément, mais un
 *   même div peut contenir plusieurs recettes, ex: double facturation le même jour)
 */
function parseDocument(div) {
    // Détecter les recettes par leur structure spécifique (.pjm avec table.stxrec).
    // Un même div[name="dhX"] peut contenir plusieurs .pjm (plusieurs recettes).
    const pjmDivs = Array.from(div.querySelectorAll(SELECTORS.document.pjm))
        .filter(pjmDiv => pjmDiv.querySelector(SELECTORS.document.recetteTable));
    if (pjmDivs.length > 0) {
        return pjmDivs.map(pjmDiv => parseRecette(pjmDiv));
    }
    
    const sstDiv = div.querySelector(SELECTORS.document.content);
    if (!sstDiv) return [null];
    
    // Type depuis la classe d'icône
    const iconElement = sstDiv.querySelector(SELECTORS.document.icon);
    const typeClass = iconElement?.className || '';
    const type = typeClass.replace('img16', '').toLowerCase();
        
    // Métadonnées
    const title = textOf(sstDiv, SELECTORS.document.title);
    
    // Contenu textuel
    const contentDivs = div.querySelectorAll(SELECTORS.document.text);
    const content = Array.from(contentDivs)
        .map(el => extractRawBlockText(el))
        .filter(text => text.length > 0);

    const parsedDocument = {
        type,
        title,
        ...cleanAuthorName(textOf(sstDiv, SELECTORS.document.signature)),
        content: content.length > 0 ? content : null,
    };

    if (type === 'arrettravail') {
        const arretLines = content
            .flatMap(block => block.split('\n'))
            .map(line => line.trim())
            .filter(Boolean);
        parsedDocument.arretTravail = parseArretTravailFields(arretLines);
    }

    if (type === 'resultatexamen') {
        const structuredBioResults = parseBiologyResults(div);
        if (structuredBioResults) {
            parsedDocument.resultatsBio = structuredBioResults;
        } else {
            parsedDocument.rawContent = parsedDocument.content;
        }
        delete parsedDocument.content;
    }

    return [parsedDocument];
}

/**
 * Parse spécifiquement une recette
 * @param {HTMLElement} pjmDiv - Élément .pjm d'une recette individuelle
 * @returns {Object} Données de la recette structurées
 */
function parseRecette(pjmDiv) {
    if (!pjmDiv) return null;
    
    // Les tables avec class="stxrec" contiennent les données structurées
    const tables = pjmDiv.querySelectorAll(SELECTORS.document.recetteTable);
    
    let recetteData = null;
    let fdsData = [];
    let noemieData = [];
    
    // Première table : résumé de la recette (Date, Désignation, Actes, Montant, Mode)
    if (tables[0]) {
        const rows = tables[0].querySelectorAll(SELECTORS.recette.row);
        if (rows.length > 0) {
            const cells = rows[0].querySelectorAll('td');
            if (cells.length >= 4) {
                recetteData = {
                    date: cells[0].textContent.trim(),
                    designation: cells[1].textContent.trim(),
                    actes: cells[2].textContent.trim(),
                    montant: cells[3].textContent.trim(),
                    mode: cells[4].textContent.trim()
                };
            }
        }
    }
    
    // Deuxième table : détails FSE et NOEMIE
    if (tables[1]) {
        const rows = tables[1].querySelectorAll(SELECTORS.recette.row);
        
        rows.forEach(row => {
            const iconSpan = row.querySelector(SELECTORS.document.icon);
            const cells = row.querySelectorAll('td');
            
            if (!iconSpan || cells.length < 2) return;
            
            const iconClass = iconSpan.className;
            
            // Ligne FSE (F.S.E.)
            if (iconClass.includes(SELECTORS.recette.iconFse)) {
                if (cells.length >= 10) {
                    fdsData.push({
                        date: cells[1].textContent.trim(),
                        numero: cells[2].textContent.trim(),
                        beneficiaire: cells[3].textContent.trim(),
                        actes: cells[4].textContent.trim(),
                        total: cells[5].textContent.trim(),
                        amo: cells[6].textContent.trim(),
                        amc: cells[7].textContent.trim(),
                        tm: cells[8].textContent.trim(),
                        rc: cells[9].textContent.trim()
                    });
                }
            }
            // Ligne NOEMIE
            else if (iconClass.includes(SELECTORS.recette.iconNoemie)) {
                if (cells.length >= 8) {
                    noemieData.push({
                        date: cells[1].textContent.trim(),
                        amo: cells[6].textContent.trim(),
                        amc: cells[7].textContent.trim()
                    });
                }
            }
        });
    }
    
    return {
        type: 'recette',
        ...cleanAuthorName(textOf(pjmDiv, SELECTORS.document.signature)), // Sera supprimé par parseDayContainer, mais utilisé pour la Map
        recette: recetteData,
        fds: fdsData.length > 0 ? fdsData : null,
        noemie: noemieData.length > 0 ? noemieData : null
    };
}

/**
 * Parse les pièces jointes d'une journée
 * @param {HTMLElement} pjmDiv - Élément .pjm
 * @returns {Array<Object>} Liste des pièces jointes
 */
function parseAttachments(pjmDiv) {
    const attachmentDivs = pjmDiv.querySelectorAll(SELECTORS.attachments.item);
    
    return Array.from(attachmentDivs).map(div => {
        // Cas ".bufi" : pièce jointe déjà "digérée" par Weda (affichage résumé avec icône dédiée)
        const titleElement = div.querySelector(`${SELECTORS.attachments.titleContainer} ${SELECTORS.attachments.visualizeLink}`);
        let fileType, fileName, category = null, viewLink;
        if (titleElement) {
            fileType = titleElement.className.replace('img', '').toLowerCase();
            fileName = titleElement.nextSibling?.textContent.trim() || null;
            viewLink = div.querySelector(SELECTORS.attachments.viewLink);
        } else {
            // Cas ".pja" : pièce jointe brute (icône trombone + libellé + catégorie optionnelle en italique)
            viewLink = div.querySelector(SELECTORS.attachments.viewLink);
            // 1ère ligne = icône, 2e ligne = libellé/nom, 3e ligne (optionnelle) = catégorie
            const textRows = Array.from(viewLink?.querySelectorAll('tr') || [])
                .map(tr => tr.querySelector('td')?.textContent.trim())
                .filter(Boolean);
            fileName = textRows[0] || null;
            category = textRows[1] || null;
            fileType = fileName?.includes('.') ? fileName.split('.').pop().toLowerCase() : 'unknown';
        }
        
        // ID de fichier depuis le onclick => pour l’instant non utilisé
        // const onclickAttr = viewLink?.getAttribute('onclick') || '';
        // const fileIdMatch = onclickAttr.match(/Fil=(\d+)/);
        // const fileId = fileIdMatch ? fileIdMatch[1] : null;
        
        // Description libre éventuellement ajoutée sur la pièce jointe (uniquement présente sur les ".pja")
        const description = textOf(div, SELECTORS.attachments.description);
        
        return {
            type: fileType,
            name: fileName,
            // id: fileId,
            ...(category ? { category } : {}),
            ...(description ? { description } : {})
        };
    });
}











// ───────────────────────────────────────────────────────────────────────────────
/** 
 * phase de test, on insère un bouton unique qui ouvre une interface de test permettant
 * de choisir la/les catégorie(s) à récupérer ainsi que les options (fullPage, includeLegacy, debug)
 */
addTweak('*', 'dataScrapperDebugger', function () {
    addTestButton("Test dataScrapper", () => showDataScrapperTestPanel());
});

const DATA_SCRAPPER_DEBUG_CATEGORIES = [
    "etatCivil",
    "antecedents",
    "contacts",
    "consultations",
    "resultatsExamens",
    "courriers",
    "arretsTravail",
    "vaccins",
    "charts",
    "documents",
    "grossesse"
];

/**
 * Affiche un panneau de test permettant de choisir les catégories à récupérer ainsi que
 * les options de recoverData (fullPage, includeLegacy, debug), puis de lancer la récupération.
 */
function showDataScrapperTestPanel() {
    const existingPanel = document.getElementById('dataScrapperTestPanel');
    if (existingPanel) {
        existingPanel.remove();
        return;
    }

    const panel = document.createElement("div");
    panel.id = 'dataScrapperTestPanel';
    panel.style.position = "fixed";
    panel.style.bottom = "10px";
    panel.style.right = "10px";
    panel.style.zIndex = 1000;
    panel.style.backgroundColor = "white";
    panel.style.border = "1px solid black";
    panel.style.padding = "10px";
    panel.style.maxHeight = "90vh";
    panel.style.overflow = "auto";
    panel.style.font = "12px sans-serif";

    const optionsHtml = `
        <label style="display:block;"><input type="checkbox" id="dsp-fullPage"> fullPage (inclut automatiquement les journées importées d'un ancien logiciel)</label>
        <label style="display:block;"><input type="checkbox" id="dsp-debug" checked> debug</label>
        <label style="display:block;">dateRange début : <input type="text" id="dsp-dateStart" placeholder="jj/mm/aaaa" style="width:90px;"></label>
        <label style="display:block;">dateRange fin : <input type="text" id="dsp-dateEnd" placeholder="jj/mm/aaaa" style="width:90px;"></label>
        <hr>
    `;

    const categoriesHtml = DATA_SCRAPPER_DEBUG_CATEGORIES
        .map(category => `<label style="display:block;"><input type="checkbox" class="dsp-category" value="${category}" ${category === 'consultations' ? 'checked' : ''}> ${category}</label>`)
        .join('');

    panel.innerHTML = `
        ${optionsHtml}
        <label style="display:block;"><input type="checkbox" id="dsp-selectAll"> Toutes les catégories</label>
        ${categoriesHtml}
        <hr>
        <button id="dsp-run">Récupérer</button>
        <button id="dsp-close">Fermer</button>
    `;

    document.body.appendChild(panel);

    panel.querySelector('#dsp-selectAll').addEventListener('change', (e) => {
        panel.querySelectorAll('.dsp-category').forEach(cb => { cb.checked = e.target.checked; });
    });

    panel.querySelector('#dsp-close').addEventListener('click', () => {
        panel.remove();
        document.getElementById('dataScrapperIframe')?.remove();
        document.getElementById('dataScrapperResultPre')?.remove();
    });

    panel.querySelector('#dsp-run').addEventListener('click', () => {
        const categories = Array.from(panel.querySelectorAll('.dsp-category:checked')).map(cb => cb.value);
        if (categories.length === 0) {
            sendWedaNotif({ message: "Sélectionnez au moins une catégorie", type: "fail" });
            return;
        }
        const fullPage = panel.querySelector('#dsp-fullPage').checked;
        const debug = panel.querySelector('#dsp-debug').checked;
        const dateRange = [
            panel.querySelector('#dsp-dateStart').value.trim(),
            panel.querySelector('#dsp-dateEnd').value.trim(),
        ];
        runDebugRecoverData(categories, categories.join(', '), { fullPage, debug, dateRange });
    });
}

async function runDebugRecoverData(categories, label, { fullPage = true, debug = true, dateRange = [] } = {}) {
    const data = await recoverData({
        fullPage,
        categories,
        debug,
        dateRange
    });
    console.log(`[dataScrapper] Données récupérées (${label}) :`, data);
    showRecoveredData(data);
}

function addTestButton(label, onClick, index = 0) {
    const button = document.createElement("button");
    button.textContent = label;
    button.style.position = "fixed";
    button.style.bottom = `${10 + (index * 36)}px`;
    button.style.right = "10px";
    button.style.zIndex = 1000;
    button.addEventListener("click", onClick);
    document.body.appendChild(button);
}

function showRecoveredData(data) {
    const pre = document.createElement("pre");
    pre.id = 'dataScrapperResultPre';
    pre.textContent = JSON.stringify(data, null, 2);
    pre.style.position = "fixed";
    pre.style.top = "10px";
    pre.style.left = "10px";
    pre.style.width = "80vw";
    pre.style.height = "80vh";
    pre.style.overflow = "auto";
    pre.style.backgroundColor = "white";
    pre.style.border = "1px solid black";
    pre.style.zIndex = 1000; // Assurez-vous que le pré est au-dessus des autres éléments
    document.body.appendChild(pre);

    // si on clique sur le pré, on le supprime
    pre.addEventListener("click", () => {
        pre.remove();
    });
}