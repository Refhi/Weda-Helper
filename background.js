// Définir les options par défaut. Définie ici pour être accessible de façon globale

/**
 * Configuration des paramètres avancés (v2.9+)
 * Cette variable contient les options de Weda-Helper.
 * Elle est lue pour connaitre les options par défaut, et générer automatiquement options.html
 * 
 * 
 * Structure:
 * - name: Nom de la catégorie d'options
 * - description: Description de la catégorie d'options
 * - type: Type de la catégorie (title)
 * - sections: Liste des sections de la catégorie
 * - options: Liste des options de la catégorie
 *   - name: Nom de l'option
 *   - type: Type de l'option (bool, text, smalltext, html, radio)
 *   - description: Description de l'option
 *   - default: Valeur par défaut de l'option
 *   - subOptions: (optionnel) Liste des sous-options au même format
 */

// var settings = [{
//     "name": "Options Générales",
//     "description": "Des options générales valables partout",
//     "options": [{
//         "name": "TweakImports",
//         "type": "bool",
//         "description": "Activer les modifications pour la fenêtre d'importations (page télécharger des documents).",
//         "default": true
//     }],
//     "sections": []  // d'éventuelles sous-sections, avec la même structure
// }]

const TYPE_BOOL = "bool";
const TYPE_TEXT = "text";
const TYPE_SMALLTEXT = "smalltext";
const TYPE_HTML = "html";
const TYPE_RADIO = "radio";
const TYPE_TITLE = "title";


var advancedDefaultSettings = [{
    "name": "Options générales",
    "description": "Des options générales valables partout",
    "type": TYPE_TITLE,
    "options": [{
        "name": "TweakImports",
        "type": TYPE_BOOL,
        "description": "Activer les modifications pour la fenêtre d'importations (page télécharger des documents).",
        "default": true
    }, {
        "name": "EnableHelp",
        "type": TYPE_BOOL,
        "description": "Affiche l'aide en appuyant sur Alt de manière prolongée.",
        "default": true
    }, {
        "name": "TweakTabSearchPatient",
        "type": TYPE_BOOL,
        "description": "Activer les modifications de la fenêtre recherche patient (navigation facilitée avec la touche Tab).",
        "default": true
    }, {
        "name": "autoSelectPatientCV",
        "type": TYPE_BOOL,
        "description": "Lit automatiquement la carte vitale après insertion (nécessite Weda Connect 3) et sélectionne automatiquement le patient s'il est seul.",
        "default": true
    }, {
        "name": "WarpButtons",
        "type": TYPE_BOOL,
        "description": "Activer les raccourcis claviers sur les popups type DMP/IMTI/ordo numérique etc.",
        "default": true
    }, {
        "name": "MoveHistoriqueToLeft",
        "type": TYPE_BOOL,
        "description": "Ouvrir automatiquement l'historique dans les pages sélectionnées ci-dessous et l'afficher dans une colonne à gauche.",
        "default": true,
        "subOptions": [{
            "name": "AutoOpenHistory_Consultation",
            "type": TYPE_BOOL,
            "description": "Consultation",
            "default": true
        }, {
        // Deprecated, remplacé par l'option de Weda
        //     "name": "MoveHistoriqueToLeft_Consultation",
        //     "type": TYPE_BOOL,
        //     "description": "Consultation",
        //     "default": true
        // }, {
            "name": "MoveHistoriqueToLeft_Certificat",
            "type": TYPE_BOOL,
            "description": "Certificat",
            "default": true
        }, {
            "name": "MoveHistoriqueToLeft_Demande",
            "type": TYPE_BOOL,
            "description": "Demande",
            "default": true
        }, {
            "name": "MoveHistoriqueToLeft_Courrier",
            "type": TYPE_BOOL,
            "description": "Courrier (beta)",
            "default": false
        }, {
            "name": "MoveHistoriqueToLeft_Formulaire",
            "type": TYPE_BOOL,
            "description": "Formulaire",
            "default": false
        }]
    }, {
        "name": "autoFilterLeftHistory",
        "type": TYPE_BOOL,
        "description": "Filtre automatiquement l'historique gauche pour n'afficher que date et titre.",
        "default": false
    }, {
        "name": "autoATCD",
        "type": TYPE_BOOL,
        "description": "Ouvre automatiquement les ATCD.",
        "default": false
    }, {
        "name": "ATCDLeft",
        "type": TYPE_BOOL,
        "description": "Ouvre les ATCD sur la partie gauche de l'écran quand possible (attention l'affichage est un peu approximatif).",
        "default": false
    }, {
        "name": "secureExchangeAutoRefresh",
        "type": TYPE_BOOL,
        "description": "Rafraîchis automatiquement la messagerie sécurisée (vous devez laisser un onglet ouvert).",
        "default": true
    }, {
        "name": "secureExchangeUncheckIHEMessage",
        "type": TYPE_BOOL,
        "description": "Décocher automatiquement le message et le fichier IHE_XDM.zip lors de l'importation d'un message depuis la messagerie sécurisée.",
        "default": false
    }, {
        "name": "autoAATI",
        "type": TYPE_BOOL,
        "description": "Automatise la réalisation des arrêts de travail (lecture CV auto, sélection patient auto, impression auto etc. Nécessite le Companion pour fonctionner totalement).",
        "default": true
    }, {
        "name": "trimCIM10",
        "type": TYPE_BOOL,
        "description": "Nettoie l'arbre des ATCD CIM-10 pour ne garder que les ATCD principaux (on peut toujours les déployer pour les sous-ATCD).",
        "default": true
    }, {
        "name": "sortCIM10",
        "type": TYPE_BOOL,
        "description": "Trie les ATCD CIM-10 par ordre alphabétique.",
        "default": true
    }, {
        "name": "removeBoldPatientFirstName",
        "type": TYPE_BOOL,
        "description": "Met le prénom du patient en non-gras pour plus facilement distinguer le nom de famille.",
        "default": false
    }, {
        "name": "preAlertATCD",
        "type": TYPE_SMALLTEXT,
        "description": "Affiche la date d'alerte de l'antécédent en orange si la date est dans moins de x mois (6 par défaut, 0 pour désactiver).",
        "default": 6
    }, {
        "name": "autoControlMT",
        "type": TYPE_BOOL,
        "description": "Automatise le procédé de vérification du MT.",
        "default": true,
        "subOptions": [{
            "name": "autoMTnewTab",
            "type": TYPE_BOOL,
            "description": "Ouvre un nouvel onglet pour éviter de patienter pendant la récupération des informations.",
            "default": true
        }, {
            "name": "autoMTIncludeAndCheckContact",
            "type": TYPE_BOOL,
            "description": "Intègre automatiquement le MT récupéré dans les contacts et initie la récupération de l'adresse sécurisée. Compatible avec l'option précédente.",
            "default": false
        }]
    }]
}, {
    "name": "Options de consultation",
    "description": "Des options spécifiques aux consultations",
    "type": TYPE_TITLE,
    "options": [{
        "name": "TweakTabConsultation",
        "type": TYPE_BOOL,
        "description": "Activer la navigation entre les champs de texte dans les consultations via Tab et Shift+Tab.",
        "default": true
    }, {
        "name": "FocusOnTitleInConsultation",
        "type": TYPE_BOOL,
        "description": "Mettre le focus dans le champ de titre à l'ouverture d'une nouvelle consultation.",
        "default": false
    }, {
        "name": "ShowExplanatoryText",
        "type": TYPE_BOOL,
        "description": "Affiche le texte d'explication à droite des courbes pédiatriques dans la page des consultations.",
        "default": true
    }, {
        "name": "RemoveTitleSuggestions",
        "type": TYPE_BOOL,
        "description": "Retire le panneau de suggestion dans les Titres (ex. de Consultation).",
        "default": true
    }, {
        "name": "defautDataType",
        "type": TYPE_TEXT,
        "description": "Types de données automatique (vider pour désactiver. Pas d'espaces. Sensible à la Case.) Défaut = TAILLE:cm,Taille:cm,POIDS:kg,Poids:kg,Pc:cm,IMC:p/t²,PAd:mmHg,PAs:mmhg,TAS:mmHg,TAD:mmHg,FC:bpm,Sat:%",
        "default": "TAILLE:cm,Taille:cm,POIDS:kg,Poids:kg,Pc:cm,IMC:p/t²,PAd:mmHg,PAs:mmhg,TAS:mmHg,TAD:mmHg,FC:bpm,Sat:%,Z-IMC:ds"
    }]
}, {
    "name": "Options de prescription",
    "description": "Des options spécifiques aux prescriptions",
    "type": TYPE_TITLE,
    "options": [{
        "name": "TweakTabPrescription",
        "type": TYPE_BOOL,
        "description": "Activer les modifications de la fenêtre recherche médicaments (navigation facilitée avec la touche Tab).",
        "default": true
    }, {
        "name": "KeyPadPrescription",
        "type": TYPE_BOOL,
        "description": "Activer l'utilisation du clavier numérique lors de prescription d'un médicament.",
        "default": true
    }, {
        "name": "autoOpenOrdoType",
        "type": TYPE_BOOL,
        "description": "Ouvre automatiquement la fenêtre des ordonnances-types lors des prescriptions médicamenteuses.",
        "default": false
    }, {
        "name": "AlertOnMedicationInteraction",
        "type": TYPE_BOOL,
        "description": "Affiche un message d'alerte lorsqu'une prescription de médicaments présente une contre-indication absolue.",
        "default": true
    }]
}, {
    "name": "Options d'ordonnance numérique",
    "description": "Des options spécifiques aux ordonnances numériques",
    "type": TYPE_TITLE,
    "options": [{
        "name": "autoSelectTypeOrdoNum",
        "type": TYPE_BOOL,
        "description": "Sélectionner automatiquement le type d'ordonnance numérique selon le contenu de la prescription (biologie, kinésithérapie, infirmier, pédicure, orthoptie, orthophonie, etc.).",
        "default": true
    }, {
        "name": "autoConsentNumPres",
        "type": TYPE_BOOL,
        "description": "Coche automatiquement une case de consentement de l'ordonnance numérique. Attention vous êtes toujours tenu de demander l'autorisation au patient systématiquement.",
        "default": false,
        "subOptions": [{
            "name": "autoConsentNumPres_Oui",
            "type": TYPE_BOOL,
            "description": "Sélectionne \"non\" (si décocoché), \"oui\" si coché.",
            "default": true
        }]
    }, {
        "name": "autoValidateOrdoNum",
        "type": TYPE_BOOL,
        "description": "Valider automatiquement une ordonnance numérique de médicaments lors de l'impression (nécessite d'activer l'option \"Coche automatiquement la case de consentement\" ci-dessus).",
        "default": false
    }, {
        "name": "uncheckDMPIfImagerie",
        "type": TYPE_BOOL,
        "description": "Décoche automatiquement l'ordonnance numérique si \"Imagerie\" est sélectionné dans une Demande.",
        "default": true
    }, {
        "name": "autoContinueWithoutNumPres",
        "type": TYPE_BOOL,
        "description": "Clique automatiquement \"Continuer automatiquement sans ordonnance numérique\" si le message d'erreur s'affiche.",
        "default": false
    }]
}, {
    "name": "Options de cochage/décochage automatique",
    "description": "Pour que le décochage fonctionne, au moins une des deux options doit être activée. Cf. https://secure.weda.fr/FolderSetting/PreferenceForm.aspx pour activer/désactiver l'ensemble",
    "type": TYPE_TITLE,
    "options": [{
        "name": "NumPresPrescription",
        "type": TYPE_BOOL,
        "description": "Cocher/Décocher automatiquement la case « ordonnance numérique » pour les prescriptions de médicaments.",
        "default": false
    }, {
        "name": "NumPresDemande",
        "type": TYPE_BOOL,
        "description": "Cocher/Décocher automatiquement la case « ordonnance numérique » pour les ordonnances de demandes numériques (labo/imagerie/paramédical)",
        "default": false
    }]
}, {
    "name": "Options de recherche médicale",
    "description": "Des options spécifiques à la recherche médicale",
    "type": TYPE_TITLE,
    "options": [{
        "name": "keepMedSearch",
        "type": TYPE_BOOL,
        "description": "Garder la recherche médicale.",
        "default": true
    }, {
        "name": "addMedSearchButtons",
        "type": TYPE_BOOL,
        "description": "Ajouter des boutons de raccourcis pour la recherche de médicaments.",
        "default": true,
        "subOptions": [{
            "name": "boutonRecherche-1",
            "type": TYPE_BOOL,
            "description": "Médicaments",
            "default": true
        }, {
            "name": "boutonRecherche-14",
            "type": TYPE_BOOL,
            "description": "Recherche par produits",
            "default": false
        }, {
            "name": "boutonRecherche-8",
            "type": TYPE_BOOL,
            "description": "Dénomination commune (DCI)",
            "default": true
        }, {
            "name": "boutonRecherche-2",
            "type": TYPE_BOOL,
            "description": "Molécules (principes actifs)",
            "default": true
        }, {
            "name": "boutonRecherche-10",
            "type": TYPE_BOOL,
            "description": "Recherche par U.C.D.",
            "default": false
        }, {
            "name": "boutonRecherche-3",
            "type": TYPE_BOOL,
            "description": "Recherche par A.T.C.",
            "default": false
        }, {
            "name": "boutonRecherche-13",
            "type": TYPE_BOOL,
            "description": "Recherche par Vidal",
            "default": false
        }, {
            "name": "boutonRecherche-4",
            "type": TYPE_BOOL,
            "description": "Indications",
            "default": false
        }, {
            "name": "boutonRecherche-5",
            "type": TYPE_BOOL,
            "description": "Groupe d'indications",
            "default": false
        }, {
            "name": "boutonRecherche-6",
            "type": TYPE_BOOL,
            "description": "Laboratoires",
            "default": false
        }, {
            "name": "boutonRecherche-7",
            "type": TYPE_BOOL,
            "description": "Vos favoris et perso.",
            "default": false
        }, {
            "name": "boutonRecherche-9",
            "type": TYPE_BOOL,
            "description": "Le Top 50",
            "default": false
        }]
    }, {
        "name": "TweakRecetteForm",
        "type": TYPE_BOOL,
        "description": "Appuie automatiquement sur le bouton \"rechercher\" après avoir sélectionné la page des recettes (permet d’afficher les recettes du jour directement en arrivant sur la page).",
        "default": true
    }, {
        "name": "TweakNIR",
        "type": TYPE_BOOL,
        "description": "Ajoute la possibilité de copier le NIR en cliquant dessus sur la page d'accueil.",
        "default": true
    }]
}, {
    "name": "Options de Courrier",
    "description": "Des options spécifiques aux courriers",
    "type": TYPE_TITLE,
    "options": [{
        "name": "autoSelectMT",
        "type": TYPE_BOOL,
        "description": "Sélectionne automatiquement les médecins traitants comme destinataires.",
        "default": false
    }]
}, {
    "name": "Options de FSE",
    "description": "Des options spécifiques aux FSE",
    "type": TYPE_TITLE,
    "options": [{
        "name": "defaultCotation",
        "type": TYPE_BOOL,
        "description": "Activer la cotation par défaut dans la FDS. (Nécessite de mettre une cotation favorite nommée \"Défaut\", et de valider la feuille de soin avec les touches o/n).",
        "default": true
    }, {
        "name": "TweakFSEGestion",
        "type": TYPE_BOOL,
        "description": "Activer le rafraichissement automatique des FSE dans la page de télétransmission. (fonctionnalité en beta).",
        "default": true
    }, {
        "name": "TweakFSECreation",
        "type": TYPE_BOOL,
        "description": "Active les raccourcis clavier de la création de FSE ainsi que la lecture automatique de la carte vitale.",
        "default": true
    }, {
        "name": "TweakFSEDetectMT",
        "type": TYPE_BOOL,
        "description": "Sélectionne automatiquement l'option \"Je suis le médecin traitant\" si vous êtes le médecin traitant du patient.",
        "default": false
    }, {
        "name": "TweakFSEGestionUnique",
        "type": TYPE_BOOL,
        "description": "Cocher automatiquement la case \"Réaliser une FSE en gestion unique\" pour les patients C2S.",
        "default": false
    }, {
        "name": "TweakFSEAccident",
        "type": TYPE_BOOL,
        "description": "Coche automatiquement la case \"Non\" pour un accident de droit commun.",
        "default": false
    }, {
        "name": "TweakSCORDegradee",
        "type": TYPE_BOOL,
        "description": "Sélectionne automatiquement \"Feuille de soins dégradée\" lors de l'importation d'une pièce jointe SCOR.",
        "default": false
    }, {
        "name": "SCORAutoSelectPJ",
        "type": TYPE_BOOL,
        "description": "Sélectionne automatiquement \"Inclure la FSP en SCOR\".",
        "default": true
    }]
}, {
    "name": "Lien avec Weda-Helper-Companion",
    "description": "Options de connexion et d'impression automatique via le Companion",
    "type": TYPE_TITLE,
    "options": [{
        "name": "log vers le companion",
        "type": TYPE_HTML,
        "description": '<a href="URL_DU_LOG_DU_COMPANION" id="companionLogLing" target="_blank">Voir le log du Companion</a>'
    }],
    "sections": [{
        "name": "Options de connexion",
        "type": TYPE_TITLE,
        "options": [{
            "name": "portCompanion",
            "type": TYPE_SMALLTEXT,
            "description": "Port Weda-Helper-Companion (default 4821) cf. https://github.com/Refhi/Weda-Helper-Companion doit être le même ici et dans le Companion.",
            "default": "4821"
        }, {
            "name": "apiKey",
            "type": TYPE_SMALLTEXT,
            "description": "Clé API. Doit être identique à celle du Companion (normalement fait automatiquement lors de la première requête au Companion).",
            "default": "votre clé API par défaut"
        }],
    }, {
        "name": "Options d'impression automatique",
        "type": TYPE_TITLE,
        "options": [{
            "name": "RemoveLocalCompanionPrint",
            "type": TYPE_BOOL,
            "description": "<em><strong>Désactiver</strong></em> l'impression automatique complète via le companion <strong>(décocher pour l'activer)</strong>.",
            "default": true,
            "subOptions": [{
                "name": "instantPrint",
                "type": TYPE_BOOL,
                "description": "Impression instantanée : dès l'envoi de l'impression via le Companion, ouvre un nouvel onglet. Ferme ensuite l'onglet originel quand l'impression est terminée. Utile pour faire DMP et ordonnances numériques sans ralentir le flux de la consultation. Attention les pdfs des impressions ne seront pas immédiatement visible car pas encore terminé au moment du retour vers le dossier patient.",
                "default": false
            }]
        }, {
            "name": "KeepFocus",
            "type": TYPE_BOOL,
            "description": "Active la récupération du focus en cas de vol par l'application d'impression.",
            "default": true
        }, {
            "name": "postPrintBehavior",
            "type": TYPE_RADIO,
            "description": "Comportement après une impression automatique par le Companion.",
            "default": "closePreview",
            // Ici on devrait avoir 'closePreview', 'returnToPatient' et 'doNothing' avec les descriptions associées :
            // "Fermer la fenêtre de prévisualisation", "Retourner au dossier", "Ne rien faire"
            "radioOptions": [{
                "value": "closePreview",
                "description": "Fermer la fenêtre de prévisualisation"
            }, {
                "value": "returnToPatient",
                "description": "Retourner au dossier"
            }, {
                "value": "doNothing",
                "description": "Ne rien faire"
            }]
        }],
    }, {
        "name": "Lien avec le TPE",
        "type": TYPE_TITLE,
        "options": [{
            "name": "RemoveLocalCompanionTPE",
            "type": TYPE_BOOL,
            "description": "<em><strong>Désactiver</strong></em> la communication avec le TPE et l'option TPE dans les fse <strong>(décocher pour l'activer)</strong>.",
            "default": true
        }],
    }]
}];

/**
 * Traverse les options, sous-options et sous-sections d'un ensemble de paramètres et applique une fonction de rappel à chaque option.
 * @param {Array} settings - La liste des catégories de paramètres.
 * @param {Function} callback - La fonction de rappel à appliquer à chaque option.
 */
function traverseOptions(settings, callback) {
    function traverse(options) {
        options.forEach(option => {
            callback(option);
            if (option.subOptions) {
                traverse(option.subOptions);
            }
        });
    }

    function traverseSections(sections) {
        sections.forEach(section => {
            if (section.options) {
                traverse(section.options);
            }
            if (section.sections) {
                traverseSections(section.sections);
            }
        });
    }

    settings.forEach(category => {
        if (category.options) {
            traverse(category.options);
        }
        if (category.sections) {
            traverseSections(category.sections);
        }
    });
}

/**
 * Valide les paramètres avancés en vérifiant que chaque option a les propriétés requises.
 * @param {Array} settings - La liste des catégories de paramètres à valider.
 * @returns {Array} - Une liste des erreurs de validation.
 */
function validateSettings(settings) {
    const errors = [];

    traverseOptions(settings, (option) => {
        if (!option.name || typeof option.name !== 'string') {
            errors.push(`Erreur dans l'option: 'name' est manquant ou n'est pas une chaîne de caractères.`);
        }
        if (!option.type || ![TYPE_BOOL, TYPE_TEXT, TYPE_HTML, TYPE_RADIO, TYPE_SMALLTEXT].includes(option.type)) {
            errors.push(`Erreur dans l'option '${option.name}': 'type' est manquant ou invalide.`);
        }
        if (!option.description || typeof option.description !== 'string') {
            errors.push(`Erreur dans l'option '${option.name}': 'description' est manquant ou n'est pas une chaîne de caractères.`);
        }
        if (option.type !== TYPE_HTML && option.default === undefined) {
            errors.push(`Erreur dans l'option '${option.name}': 'default' est manquant.`);
        }
    });

    return errors;
}

const validationErrors = validateSettings(advancedDefaultSettings);
if (validationErrors.length > 0) {
    console.error("Erreurs de validation des paramètres:", validationErrors);
} else {
    console.log("Tous les paramètres sont valides.");
}


/**
 * Génère les paramètres par défaut à partir des paramètres avancés. (v2.9+, pour des raisons de compatibilité rétroactive)
 * @param {Array} advancedSettings - La liste des catégories de paramètres avancés.
 * @returns {Object} - Un objet contenant les paramètres par défaut.
 */
function generateDefaultSettings(advancedSettings) {
    const defaultSettings = {};

    traverseOptions(advancedSettings, (option) => {
        defaultSettings[option.name] = option.default;
    });

    return defaultSettings;
}

const defaultSettings = generateDefaultSettings(advancedDefaultSettings);
console.log(defaultSettings);



/** Raccourcis claviers par défaut **
 * Une fois appelés, ils sont interprétés dans keyCommands.js
 * via lib/hotkeys.js
 * Ils sont modifiables par l'utilisateurs dans les options, cf. options.js
 * structure:
 * - clé racine = nom du raccourci appelé dans keyCommands.js
 * -> raccourci par défaut
 * -> description
 */ 

var defaultShortcuts = {
    "push_valider": {
        "default": "Alt+V",
        "description": "Appuie Valider"
    },
    "push_annuler": {
        "default": "Alt+A",
        "description": "Appuie Annuler"
    },
    "print_meds": {
        "default": "Ctrl+P",
        "description": "Imprime le document en cours (1er modèle). Nécessite un module complémentaire pour que l'impression soit entièrement automatique. Sinon affiche directement le PDF."
    },
    "print_meds_bis": {
        "default": "Ctrl+Shift+P",
        "description": "Imprime le document en cours (2e modèle)"
    },
    "download_document": {
        "default": "Ctrl+D",
        "description": "Télécharge le PDF du document en cours (1er modèle)"
    },
    "download_document_bis": {
        "default": "Ctrl+Shift+D",
        "description": "Télécharge le PDF du document en cours (2e modèle)"
    },
    "send_document": {
        "default": "Ctrl+E",
        "description": "Envoie le document en cours par MSSanté (1er modèle)"
    },
    "send_document_bis": {
        "default": "Ctrl+Shift+E",
        "description": "Envoie le document en cours par MSSanté (2e modèle)"
    },
    "upload_latest_file": {
        "default": "Ctrl+U",
        "description": "Upload le dernier fichier du dossier envoyé par le Companion",
    },
    "insert_date": {
        "default": "Alt+D",
        "description": "Insère la date du jour dans le champ de texte en cours d'édition",
    },
    "push_enregistrer": {
        "default": "Ctrl+S",
        "description": "Appuie Enregistrer"
    },
    "push_delete": {
        "default": "Alt+S",
        "description": "Appuie Supprimer"
    },
    "shortcut_w": {
        "default": "Alt+W",
        "description": "Appuie sur W"
    },
    "shortcut_consult": {
        "default": "Alt+1",
        "description": "Ouvre ou crée la consultation n°1"
    },
    "shortcut_certif": {
        "default": "Alt+2",
        "description": "Ouvre ou crée le certificat n°1"
    },
    "shortcut_demande": {
        "default": "Alt+3",
        "description": "Ouvre ou crée la demande n°1"
    },
    "shortcut_prescription": {
        "default": "Alt+4",
        "description": "Ouvre ou crée la prescription n°1"
    },
    "shortcut_formulaire": {
        "default": "Alt+F",
        "description": "Ouvre ou crée le formulaire n°1"
    },
    "shortcut_courrier": {
        "default": "Alt+5",
        "description": "Ouvre ou crée courrier n°1"
    },
    "shortcut_fse": {
        "default": "Alt+6",
        "description": "Clique sur FSE"
    },
    "shortcut_carte_vitale": {
        "default": "Alt+C",
        "description": "Lit la carte vitale"
    },
    "shortcut_search": {
        "default": "Alt+R",
        "description": "Ouvre la recherche"
    },
    "shortcut_atcd": {
        "default": "Alt+Z",
        "description": "Ouvre les antécédents"
    }
};

// retour à un chargement systématique, a priori sans impact évident sur le temps de chargement
chrome.storage.local.set({ defaultSettings: defaultSettings, defaultShortcuts: defaultShortcuts, advancedDefaultSettings: advancedDefaultSettings}, function () {
    console.log('[background.js] Les valeurs et raccourcis par défaut ont été enregistrées');
});
