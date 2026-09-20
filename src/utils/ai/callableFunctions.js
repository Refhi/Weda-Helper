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
 * Fonction appelable par le modèle pour rechercher des codes CIM-10 correspondant à un terme (recherche floue sur
 * le libellé officiel et les synonymes). Ne modifie rien dans Weda : c'est à l'IA d'examiner les résultats retournés
 * et de choisir le code le plus pertinent avant d'appeler insertAntecedent, ou de se rabattre sur un antécédent
 * libre si aucun résultat ne correspond réellement au diagnostic voulu (éviter la sur-précision, ex. ne pas choisir
 * un germe précis non mentionné par l'utilisateur).
 */
async function rechercherCim10({ terme, limite = 20 } = {}) {
    console.log(`[rechercherCim10] Appelée avec:`, { terme, limite });
    if (!terme) return { error: "Aucun terme de recherche fourni." };
    try {
        const fuse = await chargerIndexCim10();
        const resultats = fuse.search(terme, { limit: limite });
        return resultats.map(r => ({ code: r.item.code, label: r.item.label, score: r.score }));
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
    dateRange = []
} = {}) {
    console.log(`[recoverPatientData] Appelée avec:`, { categories, fullPage, dateRange });
    try {
        const data = await recoverData({ categories, fullPage, dateRange, debug: false });
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
                            description: "Si true, charge l'intégralité de l'historique au lieu des 10 dernières entrées par défaut, et inclut alors automatiquement les journées importées d'un ancien logiciel."
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
    },
    rechercherCim10: {
        definition: {
            type: "function",
            function: {
                name: "rechercherCim10",
                description: "Recherche des codes CIM-10 (diagnostics) correspondant à un terme, par recherche floue sur le libellé officiel et les synonymes. Renvoie jusqu'à 20 résultats {code, label, score}. IMPORTANT : à appeler systématiquement avant insertAntecedent avec searchType='CIM10' ; examiner les résultats et choisir le code le plus pertinent et le moins spécifique que nécessaire (ex. préférer un code 'sans précision' si l'utilisateur n'a donné aucun détail complémentaire). Si aucun résultat ne correspond réellement au diagnostic voulu, se rabattre sur un antécédent libre (insertAntecedent sans searchType).",
                parameters: {
                    type: "object",
                    properties: {
                        terme: {
                            type: "string",
                            description: "Terme médical à rechercher, ex. 'pneumonie'."
                        },
                        limite: {
                            type: "integer",
                            description: "Nombre maximal de résultats à renvoyer (défaut 20)."
                        }
                    },
                    required: ["terme"]
                }
            }
        },
        execute: ({ terme, limite } = {}) => rechercherCim10({ terme, limite })
    },
    insertAntecedent: {
        definition: {
            type: "function",
            function: {
                name: "insertAntecedent",
                description: "Ajoute un nouvel antécédent (libre, ou issu d'une recherche CIM-10/allergie/médicament) au dossier du patient actuellement ouvert dans Weda. Ouvre et remplit le panneau de saisie puis valide. IMPORTANT : appeler au préalable recoverPatientData avec categories=['antecedents'] pour connaître les onglets disponibles et éviter les doublons avec des antécédents déjà présents. Pour searchType='CIM10', appeler d'abord rechercherCim10 et fournir dans 'nom' le CODE exact choisi parmi ses résultats (pas un libellé libre) ; si aucun résultat n'est pertinent, omettre searchType pour créer un antécédent libre à la place.",
                parameters: {
                    type: "object",
                    properties: {
                        searchType: {
                            type: "string",
                            enum: ["CIM10", "allergieMolecule", "allergiePrinceps"],
                            description: "Modalité de recherche à utiliser. Si absent, un antécédent libre est créé (le champ 'nom' est alors utilisé tel quel)."
                        },
                        nom: {
                            type: "string",
                            description: "Nom de l'antécédent (saisie libre), ou terme à rechercher si searchType est 'allergieMolecule'/'allergiePrinceps'. Pour searchType='CIM10', doit être le code exact obtenu via rechercherCim10 (ex. 'J18.9')."
                        },
                        onglet: {
                            type: "string",
                            description: "Titre ou catégorie de l'onglet cible (ex. 'ANTÉCÉDENTS MÉDICAUX'). Si absent, le premier onglet autorisé est utilisé."
                        },
                        commentaire: { type: "string", description: "Commentaire libre associé à l'antécédent." },
                        dateDebut: { type: "string", description: "Date de début au format jj/mm/aaaa." },
                        dateFin: { type: "string", description: "Date de fin au format jj/mm/aaaa." },
                        datePonctuelle: { type: "string", description: "Date ponctuelle au format jj/mm/aaaa." },
                        dateAlerte: { type: "string", description: "Date d'alerte au format jj/mm/aaaa." },
                        couleur: { type: "string", description: "Couleur de l'antécédent au format hexadécimal, ex. '#0099ff'." },
                        validation: {
                            type: "string",
                            enum: ["1", "2", "3", "4", "5"],
                            description: "Statut de validation : 1=Confirmé, 2=Hypothétique, 3=Non confirmé, 4=Exclu, 5=Désactivé."
                        },
                        lateralite: {
                            type: "string",
                            enum: ["0", "1", "2", "3"],
                            description: "Latéralité : 0=non spécifié, 1=Droite, 2=Gauche, 3=D + G."
                        },
                        tri: { type: "string", description: "Ordre de tri (valeur numérique, plus petit = plus haut dans la liste)." },
                        isImportant: { type: "boolean", description: "Affiche l'antécédent en gras." },
                        isHeritage: { type: "boolean", description: "Marque l'antécédent comme héréditaire (visible sur les ayants-droits)." },
                        isPrive: { type: "boolean", description: "Rend l'antécédent privé, visible uniquement par son créateur." },
                        isExclureVsm: { type: "boolean", description: "Exclut l'antécédent du VSM." }
                    },
                    required: []
                }
            }
        },
        // Référence indirecte : insertAntecedent n'existe que côté content script (dataInserterATCD.js),
        // pas dans la page offscreen qui ne fait que lire les `definition` de ce registre.
        execute: (args) => insertAntecedent(args)
    },
    modifierAntecedent: {
        definition: {
            type: "function",
            function: {
                name: "modifierAntecedent",
                description: "Modifie un antécédent déjà existant dans le dossier du patient, retrouvé par son nom. Demande une confirmation à l'utilisateur en détaillant les champs qui vont changer avant d'appliquer les modifications. IMPORTANT : appeler au préalable recoverPatientData avec categories=['antecedents'] pour connaître le nom exact et l'état actuel de l'antécédent ciblé.",
                parameters: {
                    type: "object",
                    properties: {
                        nomCible: {
                            type: "string",
                            description: "Nom (ou début du nom) de l'antécédent existant à modifier."
                        },
                        data: {
                            type: "object",
                            description: "Champs à modifier, mêmes propriétés que insertAntecedent (onglet, commentaire, dateDebut, dateFin, datePonctuelle, dateAlerte, couleur, validation, lateralite, tri, isImportant, isHeritage, isPrive, isExclureVsm). Seuls les champs fournis sont modifiés. 'onglet' doit être le libellé exact de l'onglet cible (ex. 'ANTÉCÉDENTS GYNECOLOGIQUES')."
                        }
                    },
                    required: ["nomCible"]
                }
            }
        },
        execute: ({ nomCible, data = {} } = {}) => modifierAntecedent(nomCible, data)
    },
    supprimerAntecedent: {
        definition: {
            type: "function",
            function: {
                name: "supprimerAntecedent",
                description: "Supprime définitivement un antécédent existant dans le dossier du patient, retrouvé par son nom. Demande une confirmation à l'utilisateur avant suppression. IMPORTANT : appeler au préalable recoverPatientData avec categories=['antecedents'] pour vérifier le nom exact de l'antécédent à supprimer.",
                parameters: {
                    type: "object",
                    properties: {
                        nomCible: {
                            type: "string",
                            description: "Nom (ou début du nom) de l'antécédent existant à supprimer. Un appel par antécédent."
                        }
                    },
                    required: ["nomCible"]
                }
            }
        },
        execute: ({ nomCible } = {}) => supprimerAntecedent(nomCible)
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
                            description: "Contenu texte à insérer dans la zone de saisie du document."
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


