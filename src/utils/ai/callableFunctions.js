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

/**
 * Fonction appelable par le modèle pour récupérer les données de l'historique du patient
 * actuellement ouvert dans Weda (consultations, résultats d'examens, antécédents, etc.).
 * S'appuie sur recoverData (voir dataScrapper.js).
 */
async function recoverPatientData({
    categories = ["consultations"],
    fullPage = false,
    dateRange = []
} = {}) {
    console.log(`[recoverPatientData] Appelée avec:`, { categories, fullPage, includeLegacy, dateRange });
    try {
        const data = await recoverData({ categories, fullPage, includeLegacy, dateRange, debug: false });
        return data;
    } catch (e) {
        console.error("[recoverPatientData] Erreur lors de la récupération des données :", e);
        return { error: `Erreur lors de la récupération des données : ${e.message || e}` };
    }
}

/**
 * Registre des fonctions disponibles pour le modèle :
 * - `definition` : la description au format attendu par l'API OpenAI (tools)
 * - `execute` : l'implémentation JS réellement appelée
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
                description: "Récupère les données de l'historique du patient actuellement ouvert dans Weda (consultations, résultats d'examens, courriers, arrêts de travail, vaccins, courbes de suivi, documents, grossesse, état civil, antécédents, contacts). Utile pour répondre à des questions sur le dossier du patient en cours.",
                parameters: {
                    type: "object",
                    properties: {
                        categories: {
                            type: "array",
                            description: "Catégories de données à récupérer. Le nom est dans etatCivil",
                            items: {
                                type: "string",
                                enum: DATA_SCRAPPER_CATEGORIES
                            }
                        },
                        fullPage: {
                            type: "boolean",
                            description: "Si true, charge l'intégralité de l'historique au lieu des 10 dernières entrées par défaut."
                        },
                        dateRange: {
                            type: "array",
                            description: "Filtre optionnel sur une plage de dates : [dateDebut, dateFin] au format 'jj/mm/aaaa'. Chaque borne est facultative.",
                            items: { type: "string" }
                        }
                    },
                    required: []
                }
            }
        },
        execute: recoverPatientData
    }
};


