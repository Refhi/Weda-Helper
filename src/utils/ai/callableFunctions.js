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
    insertAntecedent: {
        definition: {
            type: "function",
            function: {
                name: "insertAntecedent",
                description: "Ajoute un nouvel antécédent (libre, ou issu d'une recherche CIM-10/allergie/médicament) au dossier du patient actuellement ouvert dans Weda. Ouvre et remplit le panneau de saisie puis valide. IMPORTANT : appeler au préalable recoverPatientData avec categories=['antecedents'] pour connaître les onglets disponibles et éviter les doublons avec des antécédents déjà présents.",
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
                            description: "Nom de l'antécédent (saisie libre), ou terme à rechercher si searchType est fourni."
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
    }
};


