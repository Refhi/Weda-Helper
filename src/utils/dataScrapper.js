/**
 * @file dataScrapper.js
 * @description S’occupe de récupérer les données de Weda pour les présenter à d’autres modules de façon structurée.
 * 
*/


// ─── Constantes ──────────────────────────────────────────────────────────────

/** Map pour stocker la correspondance initiales → nom complet du praticien */
const initialsToAuthorMap = new Map();

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
        consultations:     { button: null,                         ..._DAILY, loadedCheck: "Consultation", legacy: _DAILY_LEGACY},   // ouvert par défaut
        resultatsExamens:  { button: '#ButtonResultatExamen',      ..._DAILY, loadedCheck: "Résultat", legacy: _DAILY_LEGACY },
        courriers:         { button: '#ButtonCourrier',            ..._DAILY, loadedCheck: "Courrier", legacy: _DAILY_LEGACY },
        arretsTravail:     { button: '#ButtonAT',                  ..._DAILY, loadedCheck: "A.T.", legacy: _DAILY_LEGACY },
        vaccins:           { button: '#ButtonVaccins',             ..._DAILY, loadedCheck: "Vaccins et rappels", legacy: _DAILY_LEGACY},
        charts:            { button: '#ButtonChart',               mainContainer: '#UpdatePanelVisuDocument', parser: parseCharts, loadedCheck: chartsLoadedCheck }, // Attention iframe...
        documents:         { button: '#ButtonDocumentJointAction', loadedCheck: "Recherche des documents", mainContainer: '#UpdatePanelVisuDocument'},
        grossesse:         { button: '#ButtonPregnant',            loadedCheck: "Grossesse", mainContainer: usualMainContainer, subContainer: usualSubContainer },
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
async function recoverData({
    fullPage = false, // De base on ne va vérifier que les 10 derniers subContainers chargés par défaut. N'est probablement pas possible pour charts et vaccins
    categories = ["consultations"], // Ce qui est chargé par défaut est la catégorie "consultations".
    includeLegacy = false, // Récupère en plus les journées importées d'un ancien logiciel, quand la catégorie le permet
    debug = false, // Affiche l'iframe en plein écran et ne la supprime pas à la fin pour faciliter le debug
} = {}) {
    // Préparation de l'objet de données à retourner
    const data = {};

    // Création d’une iframe dont on attend le chargement complet puis dont on récupère le document pour y chercher les données
    const urlToLoad = await constructPatientHistoryUrl();
    const iframe = await makeIframeForPatientHistory(urlToLoad, debug);
    let iframeDocument = iframe.contentDocument || iframe.contentWindow.document;

    // On affiche l'historique complet si demandé
    if (fullPage) {await loadFullPage(iframeDocument)}

    // On récupère les données pour chaque catégorie demandée
    for (const category of categories) {
        const categorySelectors = SELECTORS.categories[category];
        if (!categorySelectors) {
            console.warn(`[dataScrapper] Catégorie inconnue : ${category}`);
            continue;
        }
        iframeDocument = iframe.contentDocument || iframe.contentWindow.document; // Indispensable car le document semble changer dans certains cas après un clic
        // On appuie sur le bouton pour charger la catégorie si nécessaire
        if (categorySelectors.button) {
            const button = iframeDocument.querySelector(categorySelectors.button);
            if (button) {
                console.log(`[dataScrapper] Bouton cliqué pour la catégorie : ${category}`, button);
                button.click();
                await categoryLoadingComplete(iframe, category);
            } else {
                console.warn(`[dataScrapper] Bouton introuvable pour la catégorie : ${category}`);
            }
        }
        
        data[category] = recoverMainViewData(iframeDocument, categorySelectors, includeLegacy, category);
    }

    // Nettoyage : supprimer l'iframe si on n'est pas en mode debug
    if (!debug) {iframe.remove()}

    return data;
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

    let maxRetryCount = 10; // 10 * 50ms = 500ms max pour que l'élément de chargement apparaisse
    let retryCount = 0;
    while (!progessElementIsVisible() && retryCount < maxRetryCount) {
        await sleep(50); // On attend que l'élément de chargement apparaisse
        console.log('[dataScrapper] Attente de l\'affichage du chargement', raisonAttente);
        retryCount++;
    }
    if (retryCount === maxRetryCount) {
        console.warn('[dataScrapper] Timeout lors de l\'attente de l\'affichage du chargement', raisonAttente);
        return;
    }
    console.log('[dataScrapper] Chargement détecté, attente de la fin', raisonAttente);

    maxRetryCount = 200; // 200 * 50ms = 10s max
    retryCount = 0;
    while (progessElementIsVisible() && retryCount < maxRetryCount) {
        await sleep(50); // On attend que l'élément de chargement disparaisse
        console.log('[dataScrapper] Attente de la fin du chargement', raisonAttente);
        retryCount++;
    }
    if (retryCount === maxRetryCount) {
        console.warn('[dataScrapper] Timeout lors de l\'attente de la fin du chargement', raisonAttente);
        return;
    }

    console.log('[dataScrapper] Chargement terminé', raisonAttente);

    return new Promise(resolve => setTimeout(resolve, 100)); // On attend un peu pour être sûr que le DOM est stable
}

async function categoryLoadingComplete(iframe, category) {
    const categorySelectors = SELECTORS.categories[category];
    console.log(`[dataScrapper] Attente du chargement de la catégorie ${category}`, `de loadedCheck : ${categorySelectors.loadedCheck}`);
    if (!categorySelectors) {
        console.warn(`[dataScrapper] Catégorie inconnue : ${category}`);
        return;
    }
    if (!categorySelectors.button) {
        console.log(`[dataScrapper] Catégorie ${category} ouverte par défaut, pas besoin d'attendre le chargement`);
        return;
    }

    // Selon son type, loadedCheck est soit un texte à chercher dans #LabelCommandAffiche,
    // soit une fonction personnalisée recevant l'iframe et retournant un booléen
    const isLoaded = typeof categorySelectors.loadedCheck === 'function'
        ? () => categorySelectors.loadedCheck(iframe)
        : () => {
            const titleElement = iframe.contentDocument.querySelector("#LabelCommandAffiche");
            return !!(titleElement && titleElement.textContent.includes(categorySelectors.loadedCheck));
          };

    let maxRetryCount = 200; // 200 * 50ms = 10s max
    let retryCount = 0;
    while (retryCount < maxRetryCount) {
        if (isLoaded()) {
            console.log(`[dataScrapper] Chargement de la catégorie ${category} terminé`);
            break;
        }
        await sleep(50);
        retryCount++;
    }
    if (retryCount === maxRetryCount) {
        console.warn(`[dataScrapper] Timeout lors de l'attente du chargement de la catégorie ${category}`);
    }

    return
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
 * 
 */
async function makeIframeForPatientHistory(url, debug = false) {
    return new Promise((resolve, reject) => {
        const iframe = document.createElement('iframe');
        if (debug) {
            iframe.style.position = 'fixed';
            iframe.style.top = '2vh';
            iframe.style.left = '2vw';
            iframe.style.width = '96vw';
            iframe.style.height = '96vh';
            iframe.style.zIndex = 999;
            iframe.style.border = '3px solid red';
            iframe.style.display = 'block';
        } else {
            iframe.style.display = 'none';
        }
        iframe.src = url;
        iframe.onload = () => resolve(iframe);
        iframe.onerror = (err) => reject(err);
        iframe.id = 'dataScrapperIframe';
        document.body.appendChild(iframe);
    });
}


/**
 * Constructeur d'url pour la page d'historique patient
 */
async function constructPatientHistoryUrl() {
    // On récupère l'url grace à l'api patient :
    const patientId = getCurrentPatientId();
    const patientInfo = await getPatientInfo(patientId);
    
    // Extraire les paramètres URL depuis patientFileUrl
    const patientFileUrl = patientInfo.patientFileUrl;
    const patientFileUrlParts = patientFileUrl.split('?');
    const patientFileUrlParams = patientFileUrlParts[1];
    
    // Construire l'URL de la page d'historique
    const urlToLoad = `${baseUrl}/FolderMedical/PopUpHistoriqueForm.aspx?${patientFileUrlParams}`;

    console.log(`[dataScrapper] URL de la page d'historique : ${urlToLoad}`);

    return urlToLoad;
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
    const get = suffix => {
        const el = container.querySelector(`[id$="${suffix}"]`);
        const text = el?.textContent.trim();
        return text || null;
    };

    const medecinTraitantEl = container.querySelector('[id$="LabelMedecinTraitant"]');
    const medecinTraitant = medecinTraitantEl ? {
        nom: medecinTraitantEl.textContent.trim() || null,
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
 * Parse le bloc "Antécédents" du patient, organisé en sections (Médicaux, Chirurgicaux, Gynécologiques, etc.)
 * Chaque section commence par un div.st > .sm contenant le titre de la section.
 * @param {HTMLElement} container - Le mainContainer de la catégorie antecedents
 * @returns {Array<Object>} Liste des sections avec leurs items en texte brut nettoyé
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
            currentSection = { titre: (titleEl || child).textContent.trim(), items: [] };
        } else {
            if (!currentSection) {
                currentSection = { titre: "Général", items: [] };
            }
            const text = extractRawBlockText(child);
            if (text) {
                currentSection.items.push(text);
            }
        }
    }
    if (currentSection && currentSection.items.length > 0) {
        sections.push(currentSection);
    }

    return sections;
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

    return { rawLines: extractRawBlockText(suiviEl).split('\n') };
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
            return categorySelectors.parser(mainContainer);
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
    const initialsElement = container.querySelector(SELECTORS.dayContainer.initials);
    const initials = initialsElement?.textContent.trim() || null;
    
    // Documents : tous les divs name="dhX" sauf dh10 (pièces jointes)
    const documentDivs = container.querySelectorAll(SELECTORS.dayContainer.documents);
    const documents = Array.from(documentDivs).map(div => parseDocument(div)).filter(doc => doc !== null);
    
    // Pièces jointes : div name="dh10"
    const attachmentsDiv = container.querySelector(SELECTORS.dayContainer.attachmentsDiv);
    const attachments = attachmentsDiv ? parseAttachments(attachmentsDiv) : [];
    
    // Détermination du nom complet du praticien
    let authorName = null;
    
    // 1. Chercher le premier document avec un author complet
    const docWithAuthor = documents.find(doc => doc.author);
    if (docWithAuthor) {
        authorName = docWithAuthor.author;
        // Mettre à jour la correspondance initiales → nom
        if (initials) {
            initialsToAuthorMap.set(initials, authorName);
        }
    } else if (initials && initialsToAuthorMap.has(initials)) {
        // 2. Utiliser la correspondance existante
        authorName = initialsToAuthorMap.get(initials);
    }
    
    // Supprimer le champ author de tous les documents (on le garde uniquement au niveau du conteneur)
    documents.forEach(doc => delete doc.author);
    
    return {
        date: dateElement?.textContent.trim() || null,
        author: authorName,
        documents,
        attachments
    };
}

/**
 * Parse un document individuel (consultation, prescription, etc.)
 * @param {HTMLElement} div - Élément div[name="dhX"]
 * @returns {Object|null} Données du document ou null si vide
 */
function parseDocument(div) {
    // Détecter les recettes par leur structure spécifique (.pjm avec table.stxrec)
    const pjmDiv = div.querySelector(SELECTORS.document.pjm);
    if (pjmDiv && pjmDiv.querySelector(SELECTORS.document.recetteTable)) {
        return parseRecette(div);
    }
    
    const sstDiv = div.querySelector(SELECTORS.document.content);
    if (!sstDiv) return null;
    
    // Type depuis la classe d'icône
    const iconElement = sstDiv.querySelector(SELECTORS.document.icon);
    const typeClass = iconElement?.className || '';
    const type = typeClass.replace('img16', '').toLowerCase();
        
    // Métadonnées
    const titleElement = sstDiv.querySelector(SELECTORS.document.title);
    const title = titleElement?.textContent.trim() || null;
    const authorElement = sstDiv.querySelector(SELECTORS.document.signature);
    const author = authorElement?.textContent.trim() || null;
    
    // Contenu textuel
    const contentDivs = div.querySelectorAll(SELECTORS.document.text);
    const content = Array.from(contentDivs).map(el => el.textContent.trim()).filter(text => text.length > 0);
    
    return {
        type,
        title,
        author,
        content: content.length > 0 ? content : null,
    };
}

/**
 * Parse spécifiquement une recette
 * @param {HTMLElement} div - Élément div[name="dhX"] d'une recette
 * @returns {Object} Données de la recette structurées
 */
function parseRecette(div) {
    const pjmDiv = div.querySelector(SELECTORS.document.pjm);
    if (!pjmDiv) return null;
    
    // Les tables avec class="stxrec" contiennent les données structurées
    const tables = pjmDiv.querySelectorAll(SELECTORS.document.recetteTable);
    
    let recetteData = null;
    let fdsData = [];
    let noemieData = [];
    
    // Première table : résumé de la recette (Date, Désignation, Actes, Montant)
    if (tables[0]) {
        const rows = tables[0].querySelectorAll(SELECTORS.recette.row);
        if (rows.length > 0) {
            const cells = rows[0].querySelectorAll('td');
            if (cells.length >= 4) {
                recetteData = {
                    date: cells[0].textContent.trim(),
                    designation: cells[1].textContent.trim(),
                    actes: cells[2].textContent.trim(),
                    montant: cells[3].textContent.trim()
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
    
    // Récupération de l'auteur si présent (pour la Map)
    const authorElement = pjmDiv.querySelector(SELECTORS.document.signature);
    const author = authorElement?.textContent.trim() || null;
    
    return {
        type: 'recette',
        author, // Sera supprimé par parseDayContainer, mais utilisé pour la Map
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
        const description = div.querySelector(SELECTORS.attachments.description)?.textContent.trim() || null;
        
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
 * phase de test, on insère un bouton pour lancer la récupération des données et les afficher dans la console
 */
addTweak('*', '*dataScrapper', function () {
    addTestButton("Récupérer données", async () => {
        const data = await recoverData({
            fullPage: false,
            categories: ["etatCivil", "antecedents", "contacts", "consultations", "resultatsExamens", "courriers", "arretsTravail", "vaccins", "charts", "documents", "grossesse"],
            debug: true,
            includeLegacy: true
        });
        console.log("[dataScrapper] Données récupérées :", data);
        showRecoveredData(data);
    });
});

function addTestButton(label, onClick) {
    const button = document.createElement("button");
    button.textContent = label;
    button.style.position = "fixed";
    button.style.bottom = "10px";
    button.style.right = "10px";
    button.style.zIndex = 1000;
    button.addEventListener("click", onClick);
    document.body.appendChild(button);
}

function showRecoveredData(data) {
    const pre = document.createElement("pre");
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