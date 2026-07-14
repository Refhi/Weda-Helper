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

    // Sous-types des "consultations" (filtrés par classe d’icone)
    consultationTypes: {
        consultation:      '.img16Consultation',
        certificat:        '.img16Certificat',
        demande:           '.img16Demande',
        prescription:      '.img16Prescription',
        formulaire:        '.img16Formulaire',
        recette:           '.img16Recette',
        piecesJointes:     '.pjm div table',
    },
};




// ───────────────────────────────────────────────────────────────────────────────
/**
 * Récupère toutes les données de l'historique patient
 * @returns {Array<Object>} Tableau d'objets représentant chaque journée
 */
function recoverData() { // TODO : pour l'instant orienté CONSULTATION
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
    // Exemple de structure retournée :
    /*
    [
        {
            date: "12/03/2024",
            category: "Consultation",
            authorInitials: "AB",
            documents: [
                {
                    type: "consultation",
                    id: "12345",
                    title: "Consultation générale",
                }
            ]
        },
        {
            date: "11/03/2024",
            category: "Prescription",
            authorInitials: "CD",
            documents: [
                {
                    type: "prescription",
                    id: "67890",
                    title: "Prescription de médicaments",
                }
            ]
        }
    ]
    */
}

/**
 * Parse un conteneur journalier pour extraire date, auteur et documents
 * @param {HTMLElement} container - Élément .sc
 * @returns {Object} Données structurées de la journée
 */
function parseDayContainer(container) {
    // Extraction des métadonnées de la journée (header table)
    const dateElement = container.querySelector(SELECTORS.categories.consultations.date);
    const initialsElement = container.querySelector('.sp'); // Initiales dans le header
    const initials = initialsElement?.textContent.trim() || null;
    
    // Documents : tous les divs name="dhX" sauf dh10 (pièces jointes)
    const documentDivs = container.querySelectorAll('[name^="dh"]:not([name="dh10"])');
    const documents = Array.from(documentDivs).map(div => parseDocument(div)).filter(doc => doc !== null);
    
    // Pièces jointes : div name="dh10"
    const attachmentsDiv = container.querySelector('[name="dh10"] .pjm');
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
    const sstDiv = div.querySelector('.sst');
    if (!sstDiv) return null;
    
    // Type depuis la classe d'icône
    const iconElement = sstDiv.querySelector('[class^="img16"]');
    const typeClass = iconElement?.className || '';
    const type = typeClass.replace('img16', '').toLowerCase();
    
    // Parsing spécifique pour les recettes
    if (type === 'recette') {
        return parseRecette(div);
    }
        
    // Métadonnées
    const titleElement = sstDiv.querySelector('.document-title');
    const title = titleElement?.textContent.trim() || null;
    const authorElement = sstDiv.querySelector('.document-signature .sign');
    const author = authorElement?.textContent.trim() || null;
    
    // Contenu textuel (.stx, .sst2 pour sections)
    const contentDivs = div.querySelectorAll('.stx');
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
 * @returns {Object} Données de la recette
 */
function parseRecette(div) {
    const sstDiv = div.querySelector('.sst');
    
    // Pour les recettes, chercher le titre et l'auteur
    const titleElement = sstDiv?.querySelector('.document-title');
    const title = titleElement?.textContent.trim() || null;
    const authorElement = sstDiv?.querySelector('.document-signature .sign');
    const author = authorElement?.textContent.trim() || null;
    
    // Chercher le contenu dans différentes structures possibles
    const contentDivs = div.querySelectorAll('.stx, .sst2');
    const content = Array.from(contentDivs).map(el => el.textContent.trim()).filter(text => text.length > 0);
    
    // Chercher également dans les tables si présentes
    const tables = div.querySelectorAll('table');
    if (tables.length > 0) {
        tables.forEach(table => {
            const text = table.textContent.trim();
            if (text.length > 0) {
                content.push(text);
            }
        });
    }
    
    return {
        type: 'recette',
        title,
        author,
        content: content.length > 0 ? content : null,
    };
}

/**
 * Parse les pièces jointes d'une journée
 * @param {HTMLElement} pjmDiv - Élément .pjm
 * @returns {Array<Object>} Liste des pièces jointes
 */
function parseAttachments(pjmDiv) {
    const attachmentDivs = pjmDiv.querySelectorAll('.bufi');
    
    return Array.from(attachmentDivs).map(div => {
        const titleElement = div.querySelector('.buft span[title^="Visualiser"]');
        const fileType = titleElement?.className.replace('img', '').toLowerCase() || 'unknown';
        const fileName = titleElement?.nextSibling?.textContent.trim() || null;
        
        // ID de fichier depuis le onclick
        const viewLink = div.querySelector('[onclick*="OpenViewBinaryFormLC"]');
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
addTweak('/FolderMedical/PopUpHistoriqueForm.aspx', '*dataScrapper', function () {
    addTestButton("Récupérer données", () => {
        const data = recoverData();
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