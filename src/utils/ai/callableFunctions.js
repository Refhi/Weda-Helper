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
 * Fonction appelable par le modèle pour récupérer les données de l'historique du patient
 * actuellement ouvert dans Weda (consultations, résultats d'examens, antécédents, etc.).
 * S'appuie sur recoverData (voir dataScrapper.js). Cette fonction n'est jamais invoquée depuis le
 * document offpage (qui ne charge pas dataScrapper.js) : seul son `definition` y est lu, pour
 * construire la liste des tools envoyée au modèle (@see offscreenChatEngine.js).
 */
async function recoverPatientData({
    categories = ["consultations"],
    fullPage = false,
    dateRange = [],
    antecedentsType,
    antecedentsChampDate,
    antecedentsDateRange = []
} = {}, patientId = null) {
    console.log(`[recoverPatientData] Appelée avec:`, { categories, fullPage, dateRange, antecedentsType, antecedentsChampDate, antecedentsDateRange, patientId });
    try {
        const data = await recoverData({ categories, fullPage, dateRange, debug: false, patientId });
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
                            description: "Catégories de données à récupérer. Le nom est dans etatCivil",
                            items: {
                                type: "string",
                                enum: DATA_SCRAPPER_CATEGORIES
                            }
                        },
                        fullPage: {
                            type: "boolean",
                            description: "Si true, charge l'intégralité de l'historique au lieu des 10 dernières entrées par défaut, et inclut alors automatiquement les journées importées d'un ancien logiciel."
                        },
                        dateRange: {
                            type: "array",
                            description: "Filtre optionnel sur une plage de dates : [dateDebut, dateFin] au format 'jj/mm/aaaa'. Chaque borne est facultative.",
                            items: { type: "string" }
                        },
                        antecedentsType: {
                            type: "string",
                            enum: ["libre", "codifie"],
                            description: "Filtre optionnel sur les antécédents (categories doit inclure 'antecedents') selon leur type : 'libre' (saisie libre, sans code CIM-10) ou 'codifie' (avec un code CIM-10). Si absent, tous les types sont renvoyés."
                        },
                        antecedentsChampDate: {
                            type: "string",
                            enum: ["debut", "fin", "ponctuelle", "alerte"],
                            description: "Champ de date des antécédents sur lequel appliquer antecedentsDateRange (Début, Fin, date Ponctuelle ou date d'Alerte). Requis pour que antecedentsDateRange ait un effet."
                        },
                        antecedentsDateRange: {
                            type: "array",
                            description: "Filtre optionnel sur une plage de dates des antécédents, appliqué au champ désigné par antecedentsChampDate : [dateDebut, dateFin] au format 'jj/mm/aaaa'. Chaque borne est facultative.",
                            items: { type: "string" }
                        }
                    },
                    required: []
                }
            }
        },
        execute: (args, patientId) => recoverPatientData(args, patientId)
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
                description: "Ajoute, modifie et/ou supprime un ou plusieurs antécédents du dossier du patient actuellement ouvert dans Weda, en une seule instruction. Chaque opération est traitée séquentiellement, dans l'ordre fourni. IMPORTANT : appeler au préalable recoverPatientData avec categories=['antecedents'] pour connaître les onglets/noms exacts existants et éviter les doublons ; pour action='ajouter' avec searchType='CIM10', appeler d'abord rechercherCim10 et fournir dans 'nom' le CODE exact choisi parmi ses résultats (pas un libellé libre). Les opérations 'modifier'/'supprimer' déclenchent chacune leur propre confirmation utilisateur avant application. Renvoie un tableau de résultats {action, nomCible, success, message}, dans le même ordre que les opérations fournies.",
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
                description: "Renvoie les champs demandés par une complétion automatique du PDF Parser (documentDate, dateOfBirth, nameMatches, documentCommentaire) déduits du texte du document fourni dans le message. À n'appeler QUE en réponse à une telle demande explicite, jamais spontanément.",
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
                        documentCommentaire: { type: "string", description: "Bref commentaire (1 à 2 phrases) résumant le contenu du document. Laisser vide si non pertinent." }
                    },
                    required: []
                }
            }
        },
        // Référence indirecte : resolvePendingPdfParserFields n'existe que côté content script (pdfParserAIExtraction.js).
        execute: (args) => resolvePendingPdfParserFields(args)
    }
};


