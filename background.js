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
//         "longDescription": "description longue, si besoin, s'affiche dans une popup en survolant le point d'exclamation",
//         "default": true,
//         "disabled": true,  // option désactivée, mais visible. Facultatif
//         "subOptions": [{
//             // structure identique pour les sous-options
//         }]
//     }],
//     "sections": []  // d'éventuelles sous-sections, avec la même structure
// }]

const TYPE_BOOL = "bool";
const TYPE_TEXT = "text";
const TYPE_JSON = "json";
const TYPE_SMALLTEXT = "smalltext";
const TYPE_HTML = "html";
const TYPE_RADIO = "radio";
const TYPE_TITLE = "title";

const PdfParserAutoCategoryDefaut = JSON.stringify([
    // Niveau 1 de spécificité : la présence du mot-clé signe directement le type de document sans ambiguïté
    ["LABORATOIRE/BIO", ["BIOCEANE", "LABORATOIRE"]],
    ["Arrêt de travail", ["avis d’arrêt de travail"]],
    ["CRO/CRH", ["Compte Rendu Opératoire", "Compte Rendu Hospitalier", "Compte Rendu d'Hospitalisation", "COMPTE RENDU OPERATOIRE"]],
    ["Consultation", ["COMPTE-RENDU DE CONSULTATION"]],
    ["PARAMEDICAL", ["BILAN ORTHOPTIQUE"]],
    // Niveau 2 de spécificité : des mots plus ambivalents, mais qui,
    // parcouru dans l'ordre devraient permettre de déterminer le type de document
    ["Courrier", ["Chère Consœur", "chère consoeur", "Cher confrère", "chère amie", "cher ami", "Cherconfrére", "Chèreconsoeur", "Chèreconsœur"]],
    ["IMAGERIE", ["imagerie", "radiographie", "scanner", "IRM", "radiologie"]],
    ["Administratif", []],
    ["Arrêt de travail", ["arrêt de travail", "congé maladie"]],
    ["Biologie", ["biologie", "analyse sanguine"]],
    ["Bon de transport", ["bon de transport", "transport médical"]],
    ["Certificat", ["certificat", "attestation"]],
    ["ECG", ["ecg", "électrocardiogramme"]],
    ["EFR", ["exploration fonctionnelle respiratoire"]],
    ["LABORATOIRE/BIO", ["laboratoire"]],
    ["MT", ["Déclaration de Médecin Traitant", "déclaration médecin traitant"]],
    ["PARAMEDICAL", ["paramédical", "soins"]],
    ["SPECIALISTE", ["spécialiste", "consultation spécialisée"]],
    ["Consultation", ["consultation", "visite médicale"]],
    ["Ordonnance", ["ordonnance", "prescription", "60-3937"]], // 60-3937 est le cerfa des bizones
    // Niveau 3 de spécificité : des mots plus génériques, qui peuvent être présents dans plusieurs types de documents
    ["Compte Rendu", ["compte rendu", "compte-rendu", "automesure"]],
]);


var advancedDefaultSettings = [{
    "name": "Options générales",
    "description": "Des options générales valables partout",
    "type": TYPE_TITLE,
    "options": [{
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
        "name": "preAlertVSM",
        "type": TYPE_SMALLTEXT,
        "description": "Alerte si le VSM est échu (rouge) ou bientôt échu (orange).",
        "longDescription": "Affiche la date d'alerte de la VSM en orange si la date est dans moins de x mois (6 par défaut, -1 pour désactiver), puis en rouge une fois l'année dépassée.",
        "default": 4
    }],
    "sections": [{
        "name": "Médecin Traitant",
        "description": "Permet d'automatiser certaines tâches liées au médecin traitant.",
        "type": TYPE_TITLE,
        "options": [{
            "name": "autoControlMT",
            "type": TYPE_BOOL,
            "description": "Automatise le procédé de vérification du MT.",
            "default": true,
            "subOptions": [{
                "name": "autoMTnewTab",
                "type": TYPE_BOOL,
                "description": "Ouvre un nouvel onglet pour éviter de patienter pendant la récupération des informations.",
                "default": false
            }, {
                "name": "autoMTIncludeAndCheckContact",
                "type": TYPE_BOOL,
                "description": "Ajoute un lien pour qu'ajouter le MT récupéré initie la récupération de l'adresse sécurisée. Compatible avec l'option précédente.",
                "default": true
            }, {
                "name": "oneClickMT",
                "type": TYPE_BOOL,
                "description": "Permet de faire la déclaration de MT en un clic.",
                "default": true
            }]
        }],
    }, {
        "name": "Weda Echanges",
        "type": TYPE_TITLE,
        "options": [{
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
            "name": "swapTitrePJetCorpsMessage",
            "type": TYPE_BOOL,
            "description": "Permuter le titre du corps du message et de la pièce jointe dans la messagerie sécurisée.",
            "default": false
        }]
    }, {
        "name": "Options d'importation",
        "type": TYPE_TITLE,
        "options": [{
            "name": "TweakImports",
            "type": TYPE_BOOL,
            "description": "Activer les modifications pour la fenêtre d'importations (page télécharger des documents). : modification de l'odre des tabulations et agrandissement de la fenêtre de visualisation des documents.",
            "default": true
        }, {
            "name": "autoPdfParser",
            "type": TYPE_BOOL,
            "description": "Analyse automatiquement les pdfs en attente d'import et essaie d'en extraire les informations (date, nom patient, etc.).",
            "longDescription": "Pour les PDFs scannés il est recommandé d'avoir une OCR de qualité. Pour les geeks vous pouvez regarder https://github.com/Refhi/pdf_ocr_pdf (fonctionne bien mais nécessite pas mal de compétences pour l'installer). Pour l'instant ne fonctionne que dans https://secure.weda.fr/FolderMedical/UpLoaderForm.aspx (la fenêtre d'imports de masse).",
            "default": true,
            "subOptions": [{
                "name": "PdfParserAutoTitle",
                "type": TYPE_BOOL,
                "description": "Crée automatiquement un titre pour les documents importés.",
                "default": true
            }, {
                "name": "PdfParserAutoCategoryDict",
                "type": TYPE_JSON,
                "description": "=> Catégorise les documents importés dans les catégories",
                "longDescription": "selon : les, mots-clés donnés. Parcours la liste et valide la première catégorie qui correspond. Vous pouvez lister plusieurs fois la même catégorie à différents niveaux avec différents mots-clés. La liste par défaut est donnée pour exemple. Vous devez initialiser la votre depuis la fenêtre des imports avec la petite icone ⚙️.",
                "default": PdfParserAutoCategoryDefaut
            }, {
                "name": "PdfParserAutoDate",
                "type": TYPE_BOOL,
                "description": "Extrait automatiquement la date du document importé.",
                "default": true,
            }, {
                "name": "PdfParserDateAlphabetique",
                "type": TYPE_BOOL,
                "description": "Recherche également les dates type 15 novembre 2021.",
                "default": false,
                "longDescription": "Cette option est utile si vous recevez des courriers avec des dates à ce format, mais peut interférer avec les addresses si elles contiennent une date",
            }]
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
        "description": "⤷ Types de données automatique (vider pour désactiver. Pas d'espaces. Sensible à la Case.) Défaut = TAILLE:cm,Taille:cm,POIDS:kg,Poids:kg,Pc:cm,IMC:p/t²,PAd:mmHg,PAs:mmhg,TAS:mmHg,TAD:mmHg,FC:bpm,Sat:%",
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
        "default": true
    }, {
        "name": "NumPresDemande",
        "type": TYPE_BOOL,
        "description": "Cocher/Décocher automatiquement la case « ordonnance numérique » pour les ordonnances de demandes numériques (labo/imagerie/paramédical)",
        "default": true
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
        "description": "Activer les cotations par défaut dans la FDS, comme 'Défaut'",
        "longDescription": "Nécessite de mettre une cotation favorite nommée 'Défaut', 'DéfautPédia', 'DéfautMOP', 'DéfautALD', 'DéfautTC",
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
    }, {
        "name": "autoValidateSCOR",
        "type": TYPE_BOOL,
        "description": "Valide automatiquement l'inclusion du PDF de la FSE dégradée",
        "default": false
    }, {
        "name": "showBillingHistory",
        "type": TYPE_BOOL,
        "description": "[En attente du feu vert de Weda] Affiche l'historique des facturations dans la page de télétransmission.",
        "default": false,
        "disabled": true,
        "subOptions": [{
            "name": "billingDataFilter",
            "type": TYPE_TEXT,
            "description": "Filtre les données affichées dans l'historique des facturations",
            "longDescription": "Filtre les données affichées dans l'historique des facturations  en excluant les cotations notées. Ex. (G, GS, VL). IK correspond à n'importe quel nombre d'IK (ex. IK filtre aussi bien 9IK que 1IK ou IK).",
            "default": "G,GS,VG+MD+IK, VGS+MD+IK, VG+MD, VGS+MD, COD, GS+MEG, G+MEG"
        }]
    }, {
        "name": "cotationHelper",
        "type": TYPE_BOOL,
        "description": "Propose des cotations supplémentaires selon le contexte (SHE, MCG, etc.).",
        "longDescription": "Nous sommes parfois confronté à des cotations modificatrices très faciles à oublier en fonction du contexte. Cette petite aide vous permettra peut-être d'en rattraper certaines. Par exemple s'il détecte que vous êtes en train de faire des consultations aux horaires du SAS, il vous suggerera d'ajouter la cotation SHE. Si vous voyez un patient hors résidence, il vous proposera la cotation MCG. A chaque fois un clic sur la cotation vous permettra de consulter la source parlant de cette cotation.",
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
                "description": "Impression instantanée",
                "longDescription": "dès l'envoi de l'impression via le Companion, ouvre un nouvel onglet. Ferme ensuite l'onglet originel quand l'impression est terminée. Utile pour faire DMP et ordonnances numériques sans ralentir le flux de la consultation. Attention les pdfs des impressions ne seront pas immédiatement visible car pas encore terminé au moment du retour vers le dossier patient.",
                "default": false
            }, {
                "name": "sendAndPrint",
                "type": TYPE_BOOL,
                "description": "Imprimer le courrier avant de l'envoyer lors de l'usage de Ctrl+E ou Ctrl+Shift+E ",
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
            "default": "returnToPatient",
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
}, {
    "name": "Options avancées",
    "description": "Ces options servent des usages très spécifiques, possiblement seulement utile pour les développeurs.",
    "type": TYPE_TITLE,
    "options": [{
        "name": "headLessSetup",
        "type": TYPE_BOOL,
        "description": "shunte le message de mise à jour de Weda sur les postes où vous souhaitez automatiser l'ouverture de Weda (désactivé par défaut). Cela ne correspond qu'à des usages très spécifiques, merci de ne pas l'activer sans en comprendre les implications.",
        "default": false
    },{
        "name": "initTabPermissionTests",
        "type": TYPE_BOOL,
        "description": "Affiche l'interface de test des permissions des onglets.",
        "default": false
    }],
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
        if (!option.type || ![TYPE_BOOL, TYPE_TEXT, TYPE_HTML, TYPE_RADIO, TYPE_SMALLTEXT, TYPE_JSON].includes(option.type)) {
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
        "description": "Appuie Annuler ou affiche l'historique des biologies dans la fenêtre d'importations"
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
    "twain_scan": {
        "default": "Ctrl+Shift+S",
        "description": "Lance le scanneur de document",
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
chrome.storage.local.set({ defaultSettings: defaultSettings, defaultShortcuts: defaultShortcuts, advancedDefaultSettings: advancedDefaultSettings }, function () {
    console.log('[background.js] Les valeurs et raccourcis par défaut ont été enregistrées');
});



// --------------- gestion des permissions optionnelles ---------------

// Système de gestion centralisée des messages pour les permissions et opérations
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Vérification du format attendu de la requête
    if (!request || typeof request !== 'object') {
        console.error("Format de requête invalide:", request);
        sendResponse({ success: false, error: "Format de requête invalide" });
        return true;
    }

    // Si ce n'est pas une commande pour notre gestionnaire, on ignore
    if (request.action !== 'optionalPermissionHandler') {
        return false;
    }

    // Vérification que command est présent et valide
    if (!request.command || typeof request.command !== 'string') {
        console.error("Format de commande invalide:", request.command);
        sendResponse({ success: false, error: "Format de commande invalide" });
        return true;
    }

    // Vérification que options est un objet (peut être vide)
    if (request.options !== undefined && typeof request.options !== 'object') {
        console.error("Format d'options invalide:", request.options);
        sendResponse({ success: false, error: "Format d'options invalide" });
        return true;
    }

    // Traitement asynchrone
    console.log("[Optionnal Permissions] Traitement de la commande:", request.command);
    (async () => {
        const result = await handlePermissionCommand(request.command, request.options, sender || {});
        sendResponse(result);
    })();

    // Retourner true pour indiquer que la réponse sera envoyée de manière asynchrone
    return true;
});

/**
 * Gère les commandes liées aux permissions et aux onglets
 * @param {string} command - Commande à exécuter:
 *   - 'checkPermission': Vérifie si une permission est accordée
 *   - 'requestPermission': Demande une permission à l'utilisateur
 *   - 'resetPermission': Retire une permission précédemment accordée
 *   - 'tabsFeature': Exécute une action sur les onglets (create, getActiveTab, getCurrentTab, reload, close)
 *   - 'closeCurrentTab': Ferme l'onglet actuel
 * @param {Object} options - Options pour la commande
 * @returns {Promise<Object>} - Résultat de la commande
 */
async function handlePermissionCommand(command, options, sender) {
    console.log("handlePermissionCommand", command, options);
    try {
        let result;

        switch (command) {
            case 'checkPermission':
                result = { hasPermission: await checkPermission(options.permission) };
                break;

            case 'requestPermission':
                result = { granted: await requestPermission(options.permission) };
                break;

            case 'resetPermission':
                result = { reset: await resetPermission(options.permission) };
                break;

            case 'tabsFeature':
                result = { success: true, result: await handleTabsFeature(options, sender) };
                break;

            case 'closeCurrentTab':
                result = { success: true, result: await closeCurrentTab(options?.info) };
                break;

            default:
                result = { success: false, error: "Commande non reconnue" };
        }

        return result;
    } catch (error) {
        console.error("Erreur lors du traitement de la commande:", error);
        return { success: false, error: error.message };
    }
}



/**
 * Demande une permission optionnelle à l'utilisateur
 * @param {string|string[]} permission - La permission ou tableau de permissions à demander
 * @returns {Promise<boolean>} - Une promesse qui se résout avec true si accordée, false sinon
 */
function requestPermission(permission) {
    // Convertir une seule permission en tableau si nécessaire
    const permissions = Array.isArray(permission) ? permission : [permission];

    return new Promise((resolve) => {
        chrome.permissions.request({
            permissions: permissions
        }, function (granted) {
            if (granted) {
                console.log(`L'autorisation ${permissions.join(', ')} a été accordée`);
                resolve(true);
            } else {
                console.log(`L'autorisation ${permissions.join(', ')} a été refusée`);
                resolve(false);
            }
        });
    });
}

/**
 * Réinitialise les permissions optionnelles
 * @param {string|string[]} permission - La permission ou tableau de permissions à réinitialiser
 * @returns {Promise<boolean>} - Une promesse qui se résout avec true si réinitialisée, false sinon
 */
function resetPermission(permission) {
    // Convertir une seule permission en tableau si nécessaire
    const permissions = Array.isArray(permission) ? permission : [permission];
    console.log("resetPermission", permissions);
    if (permissions.length === 0) {
        console.log("Aucune permission à réinitialiser");
        return Promise.resolve(false);
    }

    return new Promise((resolve) => {
        chrome.permissions.remove({
            permissions: permissions
        }, function (removed) {
            if (removed) {
                console.log(`L'autorisation ${permissions.join(', ')} a été réinitialisée`);
                resolve(true);
            } else {
                console.log(`L'autorisation ${permissions.join(', ')} n'a pas pu être réinitialisée`);
                resolve(false);
            }
        });
    });
}


/**
 * Vérifie si une permission optionnelle est déjà accordée
 * @param {string|string[]|null} permission - La permission ou tableau de permissions à vérifier
 *                                          - Si null, 'All' ou '*', vérifie toutes les permissions
 * @returns {Promise<boolean|Object>} - Une promesse qui se résout avec true/false si une permission spécifique,
 *                                      ou un objet avec toutes les permissions si demandé
 */
async function checkPermission(permission) {
    console.log("checkPermission", permission);

    // Si on demande toutes les permissions
    if (permission === null || permission === 'All' || permission === '*') {
        return new Promise((resolve) => {
            chrome.permissions.getAll((permissions) => {
                console.log("Toutes les permissions:", permissions);
                resolve(permissions);
            });
        });
    }

    // Convertir une seule permission en tableau si nécessaire
    const permissionsList = Array.isArray(permission) ? permission : [permission];

    console.log("permissionsList", permissionsList);

    return new Promise((resolve) => {
        chrome.permissions.contains({
            permissions: permissionsList
        }, function (hasPermission) {
            console.log("hasPermission", hasPermission);
            if (hasPermission) {
                console.log(`L'autorisation ${permissionsList.join(', ')} est déjà accordée`);
                resolve(true);
            } else {
                console.log(`L'autorisation ${permissionsList.join(', ')} n'est pas accordée`);
                resolve(false);
            }
        });
    });
}


/**
 * Gère les fonctionnalités liées aux onglets, vérifie et demande les permissions nécessaires
 * @param {string} action - L'action à effectuer sur les onglets
 * @param {Object} [options={}] - Options pour l'action spécifiée : create, update, query, getCurrentTab, reload, close, capture, insertCSS
 * @returns {Promise<boolean|Object>} - Résultat de l'action ou statut de la permission
 */
async function handleTabsFeature({ action, options = {}, info = "" } = {}, sender = {}) {
    // Vérifier si la permission tabs est déjà accordée
    const hasPermission = await checkPermission('tabs');

    // Si la permission n'est pas accordée, la demander
    if (!hasPermission) {
        let granted = await requestPermissionWithConfirmation('tabs');
        if (!granted) {
            return false;
        }
    }

    // Permission accordée, exécuter l'action demandée
    // Note : toutes les actions ont été préparées, mais Weda-Helper ne les utilise pas toutes
    try {
        switch (action) {
            case 'create':
                // Créer un nouvel onglet
                return new Promise(resolve => {
                    chrome.tabs.create(options, tab => resolve(tab));
                });

            case 'update':
                // Mettre à jour un onglet (options doit contenir tabId)
                return new Promise(resolve => {
                    const { tabId, ...updateOptions } = options;
                    chrome.tabs.update(tabId || null, updateOptions, tab => resolve(tab));
                });

            case 'query':
                // Rechercher des onglets selon des critères
                return new Promise(resolve => {
                    chrome.tabs.query(options, tabs => resolve(tabs));
                });

            case 'getCurrentTab':
                // Obtenir l'onglet où s'exécute le script (contexte actuel)
                return new Promise(resolve => {
                    chrome.tabs.get(sender.tab.id, tab => {
                        if (chrome.runtime.lastError) {
                            console.error("Erreur lors de l'obtention de l'onglet:", chrome.runtime.lastError.message);
                            resolve(null);
                        } else {
                            resolve(tab);
                        }
                    });
                });

            case 'getActiveTab':
                // Obtenir l'onglet actif (celui qui a le focus)
                return new Promise(resolve => {
                    chrome.tabs.query({ active: true, currentWindow: true }, tabs => resolve(tabs[0]));
                });

            case 'reload':
                // Recharger un onglet
                return new Promise(resolve => {
                    chrome.tabs.reload(options.tabId, options.reloadOptions || {}, () => {
                        if (chrome.runtime.lastError) {
                            resolve(false);
                        } else {
                            resolve(true);
                        }
                    });
                });

            case 'close':
                // Fermer un ou plusieurs onglets
                if (!options.tabId && !options.tabIds) {
                    throw new Error("Aucun ID d'onglet spécifié pour la fermeture");
                }
                return new Promise(resolve => {
                    const tabIds = Array.isArray(options.tabIds) ? options.tabIds : [options.tabId];
                    chrome.tabs.remove(tabIds, () => resolve(true));
                });

            case 'closeCurrentTab':
                // Fermer l'onglet courant (si ce n'est pas l'onglet actif)
                return closeCurrentTab(sender);

            case 'capture':
                // Capturer le contenu visuel d'un onglet
                return new Promise(resolve => {
                    chrome.tabs.captureVisibleTab(options.windowId || null, options.captureOptions || {}, dataUrl => {
                        resolve(dataUrl);
                    });
                });

            case 'insertCSS':
                // Injecter du CSS dans un onglet
                return new Promise(resolve => {
                    chrome.tabs.insertCSS(
                        options.tabId || null,
                        options.details || { code: options.code },
                        () => resolve(true)
                    );
                });

            default:
                throw new Error(`Action non reconnue: ${action}`);
        }
    } catch (error) {
        console.error(`Erreur lors de l'exécution de l'action ${action} sur les onglets:`, error);
        return false;
    }
}


/**
 * Ferme l'onglet courant si ce n'est pas l'onglet actif
 * @param {string} info - Information sur la raison de la fermeture
 * @returns {Promise<boolean>} - Résultat de l'opération de fermeture
 */
async function closeCurrentTab(sender) {
    console.log("[closeCurrentTab] Tentative de fermeture de l'onglet courant");

    try {
        // Récupérer l'onglet où s'exécute le script
        const currentTab = sender.tab;
        if (!currentTab) {
            console.log("[closeCurrentTab] Impossible d'obtenir l'onglet courant");
            return false;
        }

        // Récupérer l'onglet actif
        const activeTab = await handleTabsFeature({ action: 'getActiveTab' });
        if (!activeTab) {
            console.log("[closeCurrentTab] Impossible d'obtenir l'onglet actif");
            return false;
        }

        // Comparer les IDs des onglets
        if (currentTab.id === activeTab.id) {
            console.log("[closeCurrentTab] Fermeture annulée : tentative de fermer l'onglet actif");
            return false;
        }

        // Si ce n'est pas l'onglet actif, on peut le fermer
        const result = await handleTabsFeature({
            action: 'close',
            options: { tabId: currentTab.id },
        });

        return result;
    } catch (error) {
        console.error("[closeCurrentTab] Erreur lors de la fermeture de l'onglet:", error);
        return false;
    }
}

