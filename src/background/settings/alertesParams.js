
/**
 * Configuration par défaut des alertes antécédents personnalisées
 * Format conforme à alerteSchema (voir alertesAtcd.js)
 * ⚠️ EXEMPLES UNIQUEMENT - À personnaliser selon vos besoins
 */

/**
 * Schéma de validation pour les alertes personnalisées
 * Définit la structure attendue pour chaque alerte
 */
const alerteSchema = {
    titre: {
        type: 'string',
        required: true,
        description: 'Titre de l\'alerte (non affiché, sert à s\'y retrouver)'
    },
    optionsCible: {
        type: 'object',
        required: false,
        description: 'Options d\'affichage de la cible (antécédent ou état civil)',
        properties: {
            cible: {
                type: 'string',
                required: true,
                description: 'Cible de l\'alerte',
                enum: ['atcd', 'etatCivil'],
                default: 'atcd'
            },
            coloration: {
                type: 'string',
                required: false,
                description: 'Coloration de la cible (nom de couleur CSS). Omettre la propriété pour aucune coloration. "true" ou "green" pour vert.',
                default: undefined
            },
            icone: {
                type: 'string',
                required: false,
                description: 'Icône Material à afficher',
                default: 'info'
            },
            texteSurvol: {
                type: 'string',
                required: false,
                description: 'Texte affiché au survol de la cible',
                default: ''
            }
        }
    },
    alerteWeda: {
        type: 'object',
        required: false,
        description: 'Configuration de l\'alerte WEDA (notification)',
        properties: {
            icone: {
                type: 'string',
                required: false,
                description: 'Icône Material de l\'alerte',
                default: 'info'
            },
            typeAlerte: {
                type: 'string',
                required: false,
                description: 'Type d\'alerte visuelle',
                enum: ['success', 'fail', 'undefined'],
                default: undefined
            },
            dureeAlerte: {
                type: 'number',
                required: false,
                description: 'Durée d\'affichage en secondes (0 = jusqu\'à fermeture manuelle)',
                default: 10,
                min: 0
            },
            texteAlerte: {
                type: 'string',
                required: false,
                description: 'Texte de la notification (obligatoire pour afficher l\'alerte)',
                default: ''
            }
        }
    },
    conditions: {
        type: 'object',
        required: false,
        description: 'Conditions de déclenchement de l\'alerte',
        properties: {
            ageMin: {
                type: 'number',
                required: false,
                description: 'Âge minimum',
                default: null
            },
            ageMax: {
                type: 'number',
                required: false,
                description: 'Âge maximum',
                default: null
            },
            sexes: {
                type: 'string',
                required: false,
                description: 'Sexes concernés',
                enum: ['F', 'M', 'N'],
                default: null
            },
            dateDebut: {
                type: 'string',
                required: false,
                description: 'Date de début de validité (format DD/MM/YYYY)',
                format: 'date',
                default: null
            },
            dateFin: {
                type: 'string',
                required: false,
                description: 'Date de fin de validité (format DD/MM/YYYY)',
                format: 'date',
                default: null
            },
            motsCles: {
                type: 'array',
                required: false,
                description: 'Mots-clés à rechercher dans les antécédents',
                itemType: 'string',
                default: []
            }
        }
    }
};

const alertesAtcdOptionDefault = JSON.stringify([
    {
        titre: "Alerte standard exemple",
        optionsCible: {
            cible: "atcd",
            coloration: "green",
            icone: "info",
            texteSurvol: "Ceci est un exemple d'alerte standard pouvant être mis en place par Weda-Helper. Le système d’alerte colore l'antécédent, ajoute une icone, un texte explicatif au survol de la souris et peut même afficher une popup. Vous pouvez les personnaliser dans les options de Weda-Helper section \"Antécédents\". Cette alerte de démonstration demeurera active jusqu'au 10/02/2026. Vous pouvez diffuser des alertes globales pour votre cabinet/pôle/groupement WEDA en ouvrant une demande depuis les options. Utile pour faire vivre vos protocoles internes !",
        },
        conditions: {
            dateFin: "10/02/2026",
            motsCles: ["tabagisme", "hypertension"]
        }
    },
    {
        titre: "Alerte avec coloration CSS personnalisée",
        optionsCible: {
            cible: "atcd",
            coloration: "orange",
            icone: "warning",
            texteSurvol: "Exemple d'alerte avec coloration CSS personnalisée (orange)"
        },
        alerteWeda: {
            icone: "warning",
            typeAlerte: "success",
            dureeAlerte: 10,
            texteAlerte: "Attention : antécédent important détecté"
        },
        conditions: {
            ageMin: 18,
            ageMax: 65,
            dateFin: "31/12/2020",
            sexes: "N",
            motsCles: ["exemple1", "test1"]
        }
    },
    {
        titre: "Alerte état civil avec conditions d'âge et sexe",
        optionsCible: {
            cible: "etatCivil",
            coloration: "lightblue",
            icone: "person",
            texteSurvol: "Alerte spécifique pour les femmes de plus de 50 ans"
        },
        alerteWeda: {
            icone: "info",
            typeAlerte: "success",
            dureeAlerte: 15,
            texteAlerte: "Protocole de dépistage disponible"
        },
        conditions: {
            ageMin: 50,
            dateFin: "31/12/2020",
            sexes: "F",
            motsCles: ["exemple2", "test2"]
        }
    },
    {
        titre: "Alerte critique sans limite de temps",
        optionsCible: {
            cible: "atcd",
            coloration: "red",
            icone: "error",
            texteSurvol: "Alerte critique nécessitant une attention immédiate"
        },
        alerteWeda: {
            icone: "error",
            typeAlerte: "fail",
            dureeAlerte: 0,
            texteAlerte: "⚠️ Attention : contre-indication absolue détectée"
        },
        conditions: {
            dateFin: "31/12/2020",
            motsCles: ["exemple3", "test3"]
        }
    },
    {
        titre: "Alerte temporaire avec période de validité",
        optionsCible: {
            cible: "atcd",
            coloration: "yellow",
            icone: "schedule",
            texteSurvol: "Alerte active seulement pendant une période définie"
        },
        alerteWeda: {
            icone: "schedule",
            typeAlerte: "undefined",
            dureeAlerte: 8,
            texteAlerte: "Campagne de prévention en cours"
        },
        conditions: {
            dateDebut: "01/01/2026",
            dateFin: "31/12/2026",
            motsCles: ["exemple4", "test4"]
        }
    },
    {
        titre: "Alerte simple sans notification",
        optionsCible: {
            cible: "atcd",
            coloration: "yellow",
            icone: "lightbulb",
            texteSurvol: "Cette alerte colore l'antécédent mais n'affiche pas de notification"
        },
        conditions: {
            dateFin: "31/12/2020",
            motsCles: ["exemple5", "test5"]
        }
    },
    {
        titre: "Alerte pédiatrique spécifique",
        optionsCible: {
            cible: "atcd",
            coloration: "pink",
            icone: "child_care",
            texteSurvol: "Protocole pédiatrique disponible"
        },
        alerteWeda: {
            icone: "child_care",
            typeAlerte: "success",
            dureeAlerte: 12,
            texteAlerte: "Suivi pédiatrique recommandé - voir protocole"
        },
        conditions: {
            ageMax: 18,
            sexes: "N",
            dateFin: "31/12/2020",
            motsCles: ["exemple6", "test6"]
        }
    }
]);
