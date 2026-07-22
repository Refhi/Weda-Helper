/**
 * @file dataInserter.js
 * @description Pendant de dataScrapper.js : s'occupe d'enregistrer des données à différents
 * endroits de Weda, chaque cible étant gérée par une fonction dédiée
 *
 * Convention pour chaque fonction de cible (ex: insertToConsultation) :
 *   - signature async (target, options) => ({ success, error, details })
 *   - réutilise les helpers partagés ci-dessous plutôt que de dupliquer la logique
 *     iframe / attente / postback
 *
 */


// ─── Registre des cibles ─────────────────────────────────────────────────────

/**
 * Une entrée par cible d'insertion. Sert de point d'entrée unique (insertData) tout en gardant
 * une fonction dédiée et lisible par cible.
 * Clé   : identifiant de la cible (utilisé par les appelants, ex: features/*.js)
 * Valeur: fonction async (data, options) => résultat structuré (voir insertData)
 */
const INSERT_TARGETS = {
    toConsultation: insertToConsultation,
};


// ─── Point d'entrée ──────────────────────────────────────────────────────────

/**
 * Point d'entrée unique pour toute insertion de données dans Weda.
 * Délègue à la fonction dédiée de la cible demandée (voir INSERT_TARGETS).
 *
 * @param {string} target - Clé de la cible (voir INSERT_TARGETS)
 * @param {Object} data - Données à insérer, propres à la cible
 * @param {Object} [options] - Options communes (ex: debug pour garder l'iframe visible)
 * @returns {Promise<{success: boolean, target: string, error: string|null, details: *}>}
 */
async function insertData(target, data, options = {}) {
    const insertFn = INSERT_TARGETS[target];
    if (!insertFn) {
        console.warn(`[dataInserter] Cible d'insertion inconnue : ${target}`);
        return { success: false, target, error: `Cible inconnue : ${target}`, details: null };
    }

    try {
        const details = await insertFn(data, options);
        return { success: true, target, error: null, details };
    } catch (error) {
        console.error(`[dataInserter] Échec de l'insertion pour la cible "${target}" :`, error);
        return { success: false, target, error: error.message || String(error), details: null };
    }
}


// ─── Helpers partagés ────────────────────────────────────────────────────────
/**
 * Ouvre la création d'un nouveau document depuis le menu principal Weda (niveau 1 "W"),
 * en cherchant l'entrée de niveau 2 dont le texte commence par menuLabel, puis en cliquant
 * le premier élément de niveau 3 pertinent (hors entrées de blackList) si nécessaire.
 * @param {Document} iframeDocument - Document dans lequel chercher le menu
 * @param {string} menuLabel - Début du texte de l'entrée de niveau 2 à ouvrir (ex: "Consultation")
 * @param {string[]} [blackList] - Libellés de niveau 3 à ignorer (actions non pertinentes)
 * @returns {boolean} true si le menu de niveau 2 a été trouvé et cliqué
 * 
 * @see submenuW qui as une logique similaire volontairement non mutualisée
 * 
 */
function openNewDocumentFromMenu(iframeDocument, menuLabel, blackList = []) {
    const baseMenuLvl1 = iframeDocument.getElementsByClassName('level1 static')[0];
    if (!baseMenuLvl1) {
        return false;
    }

    const level2Element = Array.from(baseMenuLvl1.querySelectorAll('a.level2'))
        .find(a => a.textContent.trim().startsWith(menuLabel));
    if (!level2Element) {
        return false;
    }

    let level3Elements = level2Element.parentElement?.querySelectorAll('a.level3') || [];
    level3Elements = Array.from(level3Elements).filter(el => !blackList.includes(el.textContent.trim()));

    // Ici on veut explicitement créer un NOUVEAU document.
    level2Element.click();

    // Dans certains contextes, le clic niveau 2 n'est pas pris: fallback sur le premier niveau 3 utile.
    if (level3Elements.length > 0) {
        const firstSpan = level3Elements[0].querySelector('span');
        const isCurrent = !!firstSpan?.title?.includes('Vous êtes actuellement positionné sur ce document');
        if (!isCurrent) {
            level3Elements[0].click();
        }
    }

    return true;
}

/**
 * Construit un titre de document horodaté (ex: "Post-it 22/07/2026 14:32").
 * @param {string} prefix - Préfixe du titre
 * @returns {string}
 */
function buildTimestampedTitle(prefix) {
    const now = new Date();
    const date = now.toLocaleDateString('fr-FR');
    const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${prefix} ${date} ${time}`;
}


// ─── Fonctions dédiées par cible ─────────────────────────────────────────────

/**
 * Enregistre un contenu texte dans une NOUVELLE consultation pour le patient courant, via un
 * iframe caché naviguant sur la page d'accueil patient puis ouvrant une consultation par le menu.
 *
 * @param {{content: string}} data - Données à insérer (content: texte à placer dans la consultation)
 * @param {{debug?: boolean}} [options] - debug: si true, garde l'iframe visible et ne la supprime pas
 * @returns {Promise<{titre: string}>} Détails de l'insertion réalisée
 */
async function insertToConsultation({ content }, { debug = false } = {}) {
    if (!content) {
        throw new Error('Contenu vide, insertion annulée.');
    }

    const blackListMenuConsultation = [
        'Courrier à établir',
        'Demande laboratoire',
        'Demande imagerie',
        'Demande paramédicale',
        'Renouvellement'
    ];

    let consultationIframe = null;
    try {
        const homeUrl = await getCurrentPatientPageUrl('/FolderMedical/PatientViewForm.aspx');
        consultationIframe = await createHiddenIframe(homeUrl, debug, 'WedaHelperPostItConsultationIframe');

        const getConsultationDoc = () => consultationIframe.contentDocument || consultationIframe.contentWindow?.document;

        await waitForElementInDocument(getConsultationDoc, '.level1.static', 12000, 100);

        const openedFromMenu = openNewDocumentFromMenu(getConsultationDoc(), 'Consultation', blackListMenuConsultation);
        if (!openedFromMenu) {
            console.warn('[insertToConsultation] Impossible d\'ouvrir la consultation via menu.');
        }

        const titreConsultation = buildTimestampedTitle('Post-it');
        const titleInput = await waitForElementInDocument(getConsultationDoc, '#TextBoxDocumentTitre');
        titleInput.value = titreConsultation;
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
        titleInput.dispatchEvent(new Event('change', { bubbles: true }));

        const editorIframe = await waitForElementInDocument(
            getConsultationDoc,
            "iframe[id^='CE_ContentPlaceHolder1_EditorConsultation'][id$='_ID_Frame'], #CE_ContentPlaceHolder1_EvenementInformationFiltreUCForm1_EditorZoneUserTextInEvement_ID_Frame"
        );
        await waitForElementInDocument(
            () => editorIframe.contentDocument || editorIframe.contentWindow?.document,
            'body'
        );

        await sleep(200); // Attendre un peu pour que l'iframe soit bien chargée
        const editorBody = consultationIframe.contentDocument.querySelector("iframe[id^='CE_ContentPlaceHolder1_EditorConsultation'][id$='_ID_Frame']").contentDocument.body;

        editorBody.innerText = content;
        editorBody.dispatchEvent(new Event('input', { bubbles: true }));
        editorBody.dispatchEvent(new Event('change', { bubbles: true }));

        const saveButton = await waitForElementInDocument(getConsultationDoc, '#ButtonSave');
        saveButton.click();
        await sleep(500); // Attendre un peu pour que l'enregistrement se fasse

        recordMetrics({ clicks: 4, keyStrokes: 2, drags: 1 });

        return { titre: titreConsultation };
    } finally {
        if (consultationIframe && !debug) {
            consultationIframe.remove();
        }
    }
}
// TODO: une fonction par cible, ex: async function insertPostItToConsultation(data, options) {}
