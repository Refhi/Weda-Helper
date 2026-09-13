/**
 * TOOL CALLING - Création d'antécédents WEDA
 * 
 * Extrait de <script de 15913 lignes> optimisé pour la création isolée d'antécédents.
 * Version minimaliste: ~500 lignes vs 15913 (97% de réduction).
 * 
 * Ce module permet de créer un SEUL antécédent via le tool calling IA:
 * - Recherche et validation du code CIM-10
 * - Remplissage de la popup WEDA (commentaire, dates, lateralité)
 * - Sauvegarde dans la base WEDA
 * 
 * Dépendances minimales:
 * - DOM WEDA (accessible via selectors)
 * - Gestion d'état simple (pas de multi-onglets)
 * - Logging basique
 */

// ============================================================
// CONFIG & CONSTANTES
// ============================================================

const WEDA_ANTECEDENT_CONFIG = {
    HOST: 'secure.weda.fr',
    TIMEOUT_MS: 15000,
    IDLE_MS: 5000,
};

// Selectors WEDA pour accéder aux champs
const SELECTORS = {
    COMMENT: '#ContentPlaceHolder1_TextBoxAntecedentCommentaire',
    DATE_PONCTUELLE: '#ContentPlaceHolder1_TextBoxAntecedentDatePonctuel',
    LATERALITE: '#ContentPlaceHolder1_DropDownListAntecedentLabelLateralite',
    COLLATERAL: '#ContentPlaceHolder1_DropDownListAntecedentLabelCollateral',
    HERITAGE: '#ContentPlaceHolder1_CheckBoxAntecedentIsHeritage',
    VALID_BTN: '#ContentPlaceHolder1_ButtonValid',
    DELETE_BTN: '#ContentPlaceHolder1_ButtonDelete',
    SEARCH_CIM10: '#ContentPlaceHolder1_TextBoxFind',
    TREE_CIM10: '#ContentPlaceHolder1_ArbreCim10UCForm1_TreeViewCim10',
    ANTECEDENT_PANEL: '#ContentPlaceHolder1_PanelModifyAntecedent',
};

const SECTIONS = {
    MEDICAL: 'medical',
    CHIRURGICAL: 'chirurgical',
    FAMILIAL: 'familial',
};

// ============================================================
// UTILITAIRES DE BASE
// ============================================================

/**
 * Structure minimale d'un antécédent
 */
function createAntecedentItem(data = {}) {
    return {
        code: data.code || '',                    // CIM-10: ex "I10"
        description: data.description || '',      // Texte libre: "Hypertension essentielle"
        comment: data.comment || '',              // Commentaire (peut = description)
        section: data.section || SECTIONS.MEDICAL, // medical|chirurgical|familial
        date: data.date || '',                    // Format YYYY-MM-DD (optionnel)
        lateralite: data.lateralite || '',        // "droit"|"gauche"|"bilateral" (optionnel)
        familyMember: data.familyMember || '',    // "père", "mère", etc si familial
    };
}

/**
 * Attendre qu'un élément soit visible
 */
async function waitForElement(selector, timeoutMs = WEDA_ANTECEDENT_CONFIG.TIMEOUT_MS) {
    const start = Date.now();
    
    while (Date.now() - start < timeoutMs) {
        const el = document.querySelector(selector);
        if (el && isElementVisible(el)) {
            return el;
        }
        await sleep(300);
    }
    
    throw new Error(`Élément introuvable: ${selector}`);
}

/**
 * Vérifier visibilité d'un élément
 */
function isElementVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' 
        && style.visibility !== 'hidden' 
        && el.offsetHeight > 0;
}

/**
 * Dormir N ms
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Normaliser code CIM-10 (ex: "i10" -> "I10")
 */
function normalizeCim10Code(code) {
    if (!code) return '';
    return String(code).toUpperCase().trim();
}

/**
 * Normaliser texte (espaces, casse)
 */
function normalizeText(text) {
    if (!text) return '';
    return String(text)
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase();
}

/**
 * Log simple
 */
function logAntecedent(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, data);
}

// ============================================================
// RECHERCHE CIM-10 WEDA
// ============================================================

/**
 * Rechercher un code CIM-10 dans l'arbre WEDA
 * 
 * ATTENTION: Cette fonction est HAUTEMENT SIMPLIFIÉE
 * Le script original (~300 lignes) gère:
 * - Corrections de codes
 * - Fallbacks sur codes parents
 * - Fuzzy matching
 * - Multiples tentatives
 * 
 * Ici on fait juste le minimaliste:
 * - Taper le code dans la recherche
 * - Attendre les résultats
 * - Retourner le premier match
 */
async function searchCim10InWeda(code, description = '') {
    logAntecedent('info', 'Recherche CIM-10', { code, description });
    
    const normalizedCode = normalizeCim10Code(code);
    if (!normalizedCode) {
        throw new Error('Code CIM-10 vide');
    }

    // Attendre que le champ recherche soit visible
    const searchField = await waitForElement(SELECTORS.SEARCH_CIM10);
    searchField.focus();
    searchField.value = normalizedCode;
    
    // Déclencher événement change pour que WEDA réagisse
    searchField.dispatchEvent(new Event('input', { bubbles: true }));
    searchField.dispatchEvent(new Event('change', { bubbles: true }));

    // Attendre que les résultats s'affichent
    await sleep(1500);

    // Chercher le nœud exact dans l'arbre
    const treeNodes = document.querySelectorAll(`${SELECTORS.TREE_CIM10} span, ${SELECTORS.TREE_CIM10} a`);
    let foundNode = null;

    for (const node of treeNodes) {
        const nodeText = normalizeText(node.textContent);
        const nodeCode = nodeText.split(/\s+/)[0]; // Premier mot = le code généralement

        if (nodeCode === normalizedCode) {
            foundNode = node;
            break;
        }
    }

    if (!foundNode) {
        throw new Error(`CIM-10 introuvable: ${normalizedCode}`);
    }

    // Cliquer sur le résultat pour le sélectionner
    foundNode.click();
    await sleep(800);

    return {
        matchedCode: normalizedCode,
        matchedLabel: foundNode.textContent.trim(),
        searchCode: normalizedCode,
    };
}

// ============================================================
// REMPLISSAGE DE LA POPUP WEDA
// ============================================================

/**
 * Remplir le champ commentaire
 */
async function setWedaComment(text, doc = document) {
    const textarea = doc.querySelector(SELECTORS.COMMENT);
    if (!textarea) {
        throw new Error('Champ commentaire WEDA introuvable');
    }

    textarea.focus();
    textarea.value = String(text || '');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));

    logAntecedent('info', 'Commentaire renseigné', { text: text.slice(0, 100) });
}

/**
 * Remplir la date ponctuelle (format YYYY-MM-DD)
 */
async function setWedaDate(dateStr, doc = document) {
    if (!dateStr) return true; // Optionnel

    const dateField = doc.querySelector(SELECTORS.DATE_PONCTUELLE);
    if (!dateField) {
        logAntecedent('warning', 'Champ date introuvable', {});
        return false;
    }

    // Convertir YYYY-MM-DD en format local si nécessaire
    dateField.focus();
    dateField.value = dateStr;
    dateField.dispatchEvent(new Event('input', { bubbles: true }));
    dateField.dispatchEvent(new Event('change', { bubbles: true }));

    logAntecedent('info', 'Date renseignée', { date: dateStr });
    return true;
}

/**
 * Remplir la latéralité
 */
async function setWedaLateralite(lateraliteValue, doc = document) {
    if (!lateraliteValue) return true; // Optionnel

    const select = doc.querySelector(SELECTORS.LATERALITE);
    if (!select) {
        logAntecedent('warning', 'Champ latéralité introuvable', {});
        return false;
    }

    // Mapper les valeurs possibles
    const optionMap = {
        'droit': '1',
        'gauche': '2',
        'bilateral': '3',
        'droite': '1',
        'gauche': '2',
    };

    const mappedValue = optionMap[normalizeText(lateraliteValue)] || lateraliteValue;

    select.value = mappedValue;
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));

    logAntecedent('info', 'Latéralité renseignée', { value: lateraliteValue });
    return true;
}

/**
 * Remplir la popup d'antécédent WEDA
 */
async function fillWedaAntecedentPopup(item) {
    logAntecedent('info', 'Remplissage popup WEDA', {
        code: item.code,
        description: item.description,
    });

    // Attendre que la popup soit visible
    const commentField = await waitForElement(SELECTORS.COMMENT, WEDA_ANTECEDENT_CONFIG.TIMEOUT_MS);
    const doc = commentField.ownerDocument;

    // Remplir commentaire (OBLIGATOIRE)
    await setWedaComment(item.comment || item.description, doc);

    // Remplir date (OPTIONNEL)
    if (item.date) {
        await setWedaDate(item.date, doc);
    }

    // Remplir latéralité (OPTIONNEL)
    if (item.lateralite) {
        await setWedaLateralite(item.lateralite, doc);
    }

    // Attendre le bouton Valider
    const validBtn = await waitForElement(SELECTORS.VALID_BTN, WEDA_ANTECEDENT_CONFIG.TIMEOUT_MS);

    return validBtn;
}

// ============================================================
// VALIDATION & SAUVEGARDE
// ============================================================

/**
 * Cliquer sur le bouton Valider pour sauvegarder
 */
async function validateWedaAntecedent(validButton, item) {
    logAntecedent('info', 'Validation antécédent WEDA', {
        code: item.code,
        description: item.description,
    });

    validButton.click();

    // Attendre que la popup se ferme
    await sleep(1000);
    const popupStillOpen = document.querySelector(SELECTORS.ANTECEDENT_PANEL);

    if (popupStillOpen) {
        throw new Error('Popup reste ouverte après validation');
    }

    logAntecedent('info', 'Antécédent validé et sauvegardé', {
        code: item.code,
    });

    return true;
}

// ============================================================
// FONCTION PRINCIPALE - ORCHESTRATION
// ============================================================

/**
 * Créer UN antécédent complet
 * 
 * Approche simple et directe:
 * 1. Vérifier qu'on est sur WEDA
 * 2. Chercher le code CIM-10
 * 3. "Dropper" le code (généralement auto via recherche)
 * 4. Remplir les champs (commentaire, date, lateralité)
 * 5. Cliquer Valider
 * 6. Retourner succès/erreur
 */
async function createNewAntecedentInWeda(antecedentData) {
    const item = createAntecedentItem(antecedentData);

    try {
        logAntecedent('info', '=== CRÉATION ANTÉCÉDENT ===', {
            code: item.code,
            description: item.description,
            section: item.section,
        });

        // === ÉTAPE 1: Vérifier qu'on est sur WEDA ===
        if (!window.location.hostname.includes('secure.weda.fr')) {
            throw new Error('Page WEDA non détectée');
        }

        // === ÉTAPE 2: Chercher & sélectionner le CIM-10 ===
        const cim10Result = await searchCim10InWeda(item.code, item.description);
        logAntecedent('info', 'CIM-10 trouvé', cim10Result);

        // === ÉTAPE 3: Attendre que la popup se soit affichée ===
        // (En général, cliquer sur le nœud CIM-10 ouvre automatiquement la popup)
        await sleep(WEDA_ANTECEDENT_CONFIG.IDLE_MS);

        // === ÉTAPE 4: Remplir la popup ===
        const validButton = await fillWedaAntecedentPopup(item);

        // === ÉTAPE 5: Valider & sauvegarder ===
        await validateWedaAntecedent(validButton, item);

        // === SUCCÈS ===
        const result = {
            success: true,
            antecedent: {
                code: item.code,
                description: item.description,
                section: item.section,
            },
            timestamp: new Date().toISOString(),
        };

        logAntecedent('info', '✅ ANTÉCÉDENT CRÉÉ AVEC SUCCÈS', result);
        return result;

    } catch (error) {
        const errorResult = {
            success: false,
            error: error.message,
            code: item.code,
            description: item.description,
            timestamp: new Date().toISOString(),
        };

        logAntecedent('error', '❌ ERREUR CRÉATION ANTÉCÉDENT', errorResult);
        throw error;
    }
}

// ============================================================
// EXPORTS POUR TOOL CALLING
// ============================================================

// Rendre disponible globalement pour le tool calling IA
if (typeof window !== 'undefined') {
    window.createNewAntecedent = {
        create: createNewAntecedentInWeda,
        createItem: createAntecedentItem,
        SECTIONS: SECTIONS,
    };
}

// Export pour Node.js/modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createNewAntecedentInWeda,
        createAntecedentItem,
        SECTIONS,
    };
}
