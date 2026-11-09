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
    toCertificat: insertToCertificat,
    toDemande: insertToDemande,
    toCourrier: insertToCourrier,
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
    // options.debug = true; // Décommenter pour garder l'iframe visible et faciliter le debug

    const insertFn = INSERT_TARGETS[target];
    console.log(`[dataInserter] Insertion vers "${target}" avec options:`, options, 'et données:', data);
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
    return true;
}

/**
 * Renseigne un champ (input ou body d'iframe) avec une valeur et déclenche les événements
 * attendus par Weda. Si `target` est un sélecteur, attend son apparition dans `getDoc()`.
 * N'écrit rien si `value` est vide/absent.
 * @param {() => Document} getDoc - Document dans lequel chercher le sélecteur
 * @param {string|Element} target - Sélecteur CSS ou élément déjà résolu
 * @param {string} value - Valeur à assigner
 * @param {string} [prop] - Propriété à assigner ('value' pour un input, 'innerText' pour un body)
 * @returns {Promise<Element|null>} L'élément renseigné, ou null si `value` était vide
 */
async function fillField(getDoc, target, value, prop = 'value') {
    if (!value) {
        return null;
    }

    const element = typeof target === 'string' ? await waitForElementInDocument(getDoc, target) : target;
    element[prop] = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return element;
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
 * Logique commune à toutes les cibles : ouvre un iframe caché sur la page d'accueil patient,
 * crée un nouveau document via le menu, renseigne titre / sous-titre / contenu, sauvegarde puis
 * nettoie l'iframe.
 *
 * @param {{title?: string, subtitle?: string, content: string}} data - Titre (#TextBoxEvenementTitre),
 *   sous-titre (#TextBoxDocumentTitre) et contenu à insérer dans l'éditeur de texte de la cible
 * @param {{debug?: boolean, patientId?: string|null, homeUrl?: string|null}} options
 * @param {{menuLabel: string, editorSelector: string, iframeName: string}} targetConfig
 * @returns {Promise<{titre: string|null, sousTitre: string|null}>}
 */
async function insertToDocument({ title, subtitle, content }, { debug = false, patientId = null, homeUrl = null } = {}, targetConfig) {
    if (!content) {
        throw new Error('Contenu vide, insertion annulée.');
    }

    // Libellés de niveau 3 non pertinents pour une création de document, communs à toutes les cibles.
    const blackListMenu = [
        'Courrier à établir',
        'Demande laboratoire',
        'Demande imagerie',
        'Demande paramédicale',
        'Renouvellement'
    ];

    const { menuLabel, editorSelector, iframeName } = targetConfig;

    let workIframe = null;
    try {
        homeUrl = homeUrl ?? await getCurrentPatientPageUrl('/FolderMedical/PatientViewForm.aspx', patientId);
        workIframe = await createHiddenIframe(homeUrl, debug, iframeName);

        const getDoc = () => workIframe.contentDocument || workIframe.contentWindow?.document;

        await waitForElementInDocument(getDoc, '.level1.static', 12000, 100);

        const openedFromMenu = openNewDocumentFromMenu(getDoc(), menuLabel, blackListMenu);
        if (!openedFromMenu) {
            console.warn('[dataInserter] Impossible d\'ouvrir le document via menu.');
        }

        let titleInput = null;
        if (title) {
            titleInput = await fillField(getDoc, '#TextBoxEvenementTitre', title);
        }

        let subtitleInput = null;
        if (subtitle) {
            subtitleInput = await fillField(getDoc, '#TextBoxDocumentTitre', subtitle);
        }

        const editorIframe = await waitForElementInDocument(getDoc, editorSelector);
        await waitForElementInDocument(
            () => editorIframe.contentDocument || editorIframe.contentWindow?.document,
            'body'
        );

        await sleep(200); // Attendre un peu pour que l'iframe soit bien chargée
        const editorBody = (editorIframe.contentDocument || editorIframe.contentWindow?.document).body;

        await fillField(getDoc, editorBody, content, 'innerText');

        const saveButton = await waitForElementInDocument(getDoc, '#ButtonSave');
        saveButton.click();
        await sleep(500); // Attendre un peu pour que l'enregistrement se fasse

        recordMetrics({ clicks: 4, keyStrokes: 2, drags: 1 });

        return { titre: titleInput?.value ?? null, sousTitre: subtitleInput?.value ?? null };
    } finally {
        if (workIframe && !debug) {
            workIframe.remove();
        }
    }
}

/**
 * Enregistre un contenu texte dans une NOUVELLE consultation pour le patient courant.
 * @see insertToDocument
 */
async function insertToConsultation(data, options) {
    return insertToDocument(data, options, {
        menuLabel: 'Consultation',
        editorSelector: "iframe[id^='CE_ContentPlaceHolder1_EditorConsultation'][id$='_ID_Frame'], #CE_ContentPlaceHolder1_EvenementInformationFiltreUCForm1_EditorZoneUserTextInEvement_ID_Frame",
        iframeName: 'WedaHelperConsultationIframe',
    });
}

/**
 * Enregistre un contenu texte dans un NOUVEAU certificat pour le patient courant.
 * TODO: vérifier le libellé exact du menu niveau 2 ("Certificat").
 * @see insertToDocument
 */
async function insertToCertificat(data, options) {
    return insertToDocument(data, options, {
        menuLabel: 'Certificat',
        editorSelector: '#CE_ContentPlaceHolder1_EditorCertificat_ID_Frame',
        iframeName: 'WedaHelperCertificatIframe',
    });
}

/**
 * Enregistre un contenu texte dans une NOUVELLE demande pour le patient courant.
 * TODO: le menu "Demande" propose plusieurs sous-types (laboratoire, imagerie, paramédical...),
 * il faudra probablement passer le sous-type voulu en paramètre plutôt que de prendre le 1er
 * élément niveau 3 par défaut (voir openNewDocumentFromMenu).
 * TODO: gérer le cas ALD, qui utilise un 2e éditeur (#CE_ContentPlaceHolder1_EditorPrescriptionBizone_ID_Frame),
 * non pris en charge ici pour rester simple.
 * @see insertToDocument
 */
async function insertToDemande(data, options) {
    return insertToDocument(data, options, {
        menuLabel: 'Demande',
        editorSelector: '#CE_ContentPlaceHolder1_EditorPrescription_ID_Frame',
        iframeName: 'WedaHelperDemandeIframe',
    });
}

/**
 * Enregistre un contenu texte dans un NOUVEAU courrier pour le patient courant.
 * TODO: vérifier le libellé exact du menu niveau 2 ("Courrier"). Le destinataire n'est pas géré ici.
 * @see insertToDocument
 */
async function insertToCourrier(data, options) {
    return insertToDocument(data, options, {
        menuLabel: 'Courrier',
        editorSelector: '#CE_ContentPlaceHolder1_EditorCourrier_ID_Frame',
        iframeName: 'WedaHelperCourrierIframe',
    });
}


// ─── Panneau de test / debug ─────────────────────────────────────────────────

/**
 * Affiche un panneau permettant de tester rapidement insertData avec n'importe quelle cible,
 * en gardant l'iframe de travail visible (debug: true).
 */
function showDataInserterTestPanel() {
    const existingPanel = document.getElementById('dataInserterTestPanel');
    if (existingPanel) {
        existingPanel.remove();
        return;
    }

    const panel = document.createElement('div');
    panel.id = 'dataInserterTestPanel';
    panel.style.position = 'fixed';
    panel.style.bottom = '10px';
    panel.style.right = '150px';
    panel.style.zIndex = 1000;
    panel.style.backgroundColor = 'white';
    panel.style.border = '1px solid black';
    panel.style.padding = '10px';
    panel.style.maxHeight = '90vh';
    panel.style.overflow = 'auto';
    panel.style.font = '12px sans-serif';

    panel.innerHTML = `
        <label style="display:block;">target :
            <select id="dip-target">
                <option value="toConsultation">toConsultation</option>
                <option value="toCertificat">toCertificat</option>
                <option value="toDemande">toDemande</option>
                <option value="toCourrier">toCourrier</option>
            </select>
        </label>
        <label style="display:block;">title : <input type="text" id="dip-title" style="width:180px;"></label>
        <label style="display:block;">subtitle : <input type="text" id="dip-subtitle" style="width:180px;"></label>
        <label style="display:block;">content : <textarea id="dip-content" style="width:180px;" rows="4"></textarea></label>
        <label style="display:block;"><input type="checkbox" id="dip-debug" checked> debug (garde l'iframe visible)</label>
        <hr>
        <button id="dip-run">Insérer</button>
        <button id="dip-close">Fermer</button>
    `;

    document.body.appendChild(panel);

    panel.querySelector('#dip-close').addEventListener('click', () => {
        panel.remove();
    });

    panel.querySelector('#dip-run').addEventListener('click', async () => {
        const target = panel.querySelector('#dip-target').value;
        const title = panel.querySelector('#dip-title').value.trim();
        const subtitle = panel.querySelector('#dip-subtitle').value.trim();
        const content = panel.querySelector('#dip-content').value;
        const debug = panel.querySelector('#dip-debug').checked;

        const result = await insertData(target, { title, subtitle, content }, { debug });
        console.log('[dataInserter] Résultat du test :', result);
    });
}

addTweak('*', 'boutonTestDataInserter', function () {
    addTestButton('Test dataInserter', () => showDataInserterTestPanel(), 1);
});
