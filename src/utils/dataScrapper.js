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

const SELECTORS = {
    /**
     * Une entrée par catégorie :
     *   button    — sélecteur du bouton de navigation (null = ouvert par défaut)
     *   container — sélecteur du grand ensemble de données
     *   date      — sélecteur de la date dans le container (null si absent)
     *   author    — sélecteur de l'auteur dans le container (null si absent)
     */
    categories: {
        consultations:     { button: null,                         ..._DAILY },   // ouvert par défaut
        resultatsExamens:  { button: '#ButtonResultatExamen',      ..._DAILY },
        courriers:         { button: '#ButtonCourrier',            ..._DAILY },
        arretsTravail:     { button: '#ButtonAT',                  ..._DAILY },
        vaccins:           { button: '#ButtonVaccins',             ..._DAILY },
        charts:            { button: '#ButtonChart',               mainContainer: '#UpdatePanelVisuDocument'}, // Attention iframe...
        documents:         { button: '#ButtonDocumentJointAction', mainContainer: '#UpdatePanelVisuDocument'},
        grossesse:         { button: '#ButtonPregnant',            mainContainer: usualMainContainer, subContainer: usualSubContainer },
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
        item:              '.bufi',
        titleContainer:    '.buft',
        visualizeLink:     'span[title^="Visualiser"]',
        viewLink:          '[onclick*="OpenViewBinaryFormLC"]',
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
} = {}) {
    // On crée une iframe pour charger la page d'historique patient et récupérer les données
    const urlToLoad = await constructPatientHistoryUrl();
    const iframe = await makeIframeForPatientHistory(urlToLoad);

    // Attendre que le chargement initial soit terminé
    await loadingIsComplete(iframe);

    // On récupère les données de l'iframe
    const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
    const data = {};

    for (const category of categories) {
        const categorySelectors = SELECTORS.categories[category];
        if (!categorySelectors) {
            console.warn(`[dataScrapper] Catégorie inconnue : ${category}`);
            continue;
        }
        // On appuie sur le bouton pour charger la catégorie si nécessaire
        if (categorySelectors.button) {
            const button = iframeDocument.querySelector(categorySelectors.button);
            if (button) {
                button.click();
                await loadingIsComplete(iframe);
            } else {
                console.warn(`[dataScrapper] Bouton introuvable pour la catégorie : ${category}`);
            }
        }
        
        data[category] = recoverMainViewData(mainContainer, subContainer); //TODO : à affiner
    }

    // Nettoyage : supprimer l'iframe
    iframe.remove();
    
    return data;
}

/**
 * Attend que l'animation de chargement soit terminée dans l'iframe
 * @param {HTMLIFrameElement} iframe - L'iframe contenant la page d'historique
 * @returns {Promise<void>}
 */
async function loadingIsComplete(iframe) {
    const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
    const progressElement = iframeDocument.querySelector('#UpdateProgress2');
    
    if (!progressElement) {
        console.warn('[dataScrapper] Élément UpdateProgress2 introuvable');
        return;
    }

    return new Promise((resolve) => {
        // Si déjà caché, on résout immédiatement
        const isHidden = () => {
            const style = window.getComputedStyle(progressElement);
            return style.display === 'none' || progressElement.getAttribute('aria-hidden') === 'true';
        };

        if (isHidden()) {
            resolve();
            return;
        }

        // Sinon, on observe les changements
        const observer = new MutationObserver(() => {
            if (isHidden()) {
                observer.disconnect();
                resolve();
            }
        });

        observer.observe(progressElement, {
            attributes: true,
            attributeFilter: ['style', 'aria-hidden']
        });

        // Timeout de sécurité après 30 secondes
        setTimeout(() => {
            observer.disconnect();
            console.warn('[dataScrapper] Timeout lors de l\'attente du chargement');
            resolve();
        }, 30000);
    });
}

/**
 * Creation d'une iframe cachée pour charger la page d'historique patient et récupérer les données
 * 
 */
async function makeIframeForPatientHistory(url) {
    return new Promise((resolve, reject) => {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        iframe.onload = () => resolve(iframe);
        iframe.onerror = (err) => reject(err);
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
 * Récupère toutes les données de l'historique patient
 * @returns {Array<Object>} Tableau d'objets représentant chaque journée
 */
function recoverMainViewData() {
    // Réinitialisation de la Map de correspondance initiales → nom
    initialsToAuthorMap.clear();
    
    // Récupération du conteneur principal
    const mainContainer = document.querySelector(SELECTORS.categories.consultations.mainContainer);
    if (!mainContainer) {
        console.error("Main container not found");
        return [];
    }

    // Chaque .sc = une journée avec potentiellement plusieurs documents
    const dayContainers = mainContainer.querySelectorAll(SELECTORS.categories.consultations.subContainer);
    
    return Array.from(dayContainers).map(container => parseDayContainer(container));
}

/**
 * Parse un conteneur journalier pour extraire date, auteur et documents
 * @param {HTMLElement} container - Élément .sc
 * @returns {Object} Données structurées de la journée
 */
function parseDayContainer(container) {
    // Extraction des métadonnées de la journée (header table)
    const dateElement = container.querySelector(SELECTORS.categories.consultations.date);
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
        const titleElement = div.querySelector(`${SELECTORS.attachments.titleContainer} ${SELECTORS.attachments.visualizeLink}`);
        const fileType = titleElement?.className.replace('img', '').toLowerCase() || 'unknown';
        const fileName = titleElement?.nextSibling?.textContent.trim() || null;
        
        // ID de fichier depuis le onclick
        const viewLink = div.querySelector(SELECTORS.attachments.viewLink);
        const onclickAttr = viewLink?.getAttribute('onclick') || '';
        const fileIdMatch = onclickAttr.match(/Fil=(\d+)/);
        const fileId = fileIdMatch ? fileIdMatch[1] : null;
        
        return {
            type: fileType,
            name: fileName,
            id: fileId
        };
    });
}











// ───────────────────────────────────────────────────────────────────────────────
/** 
 * phase de test, on insère un bouton pour lancer la récupération des données et les afficher dans la console
 */
addTweak('*', '*dataScrapper', function () {
    addTestButton("Récupérer données", async () => {
        const data = await recoverData();
        console.log("[dataScrapper] Données récupérées :", data);
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