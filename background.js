// Définir les options par défaut. Définie ici pour être accessible de façon globale
var defaultSettings = {
    'TweakImports': true,
    'TweakTabConsultation': true,
    'FocusOnTitleInConsultation': false,
    'RemoveTitleSuggestions': true,
    'EnableHelp': true,
    'TweakTabSearchPatient': true,
    'TweakTabPrescription': true,
    'RemoveLocalCompanionPrint': true,
    'RemoveLocalCompanionTPE': true,
    'KeepFocus': true,
    'portCompanion': '4821',
    'defaultCotation': true,
    'apiKey': 'votre clé API par défaut',
    'keepMedSearch': true,
    'addMedSearchButtons': true,
    'boutonRecherche-1': true,
    'boutonRecherche-2': true,
    'boutonRecherche-3': false,
    'boutonRecherche-4': false,
    'boutonRecherche-5': false,
    'boutonRecherche-6': false,
    'boutonRecherche-7': false,
    'boutonRecherche-8': true,
    'boutonRecherche-9': false,
    'boutonRecherche-10': false,
    // "boutonRecherche-11", // n'existe pas !
    // "boutonRecherche-12", // n'existe pas !
    'boutonRecherche-13': false,
    'boutonRecherche-14': false,
    'TweakRecetteForm': true,
    'TweakNIR': true,
    'KeyPadPrescription': true,
    'TweakFSEGestion': true,
    'TweakFSECreation': true,
    'TweakFSEDetectMT': false,
    'TweakFSEGestionUnique': false,
    'TweakFSEAccident': false,
    'TweakSCORDegradee': false,
    'SCORAutoSelectPJ': true,
    'autoSelectPatientCV': true,
    'WarpButtons': true,
    'autoSelectTypeOrdoNum': true,
    'autoConsentNumPres': false,
    'autoConsentNumPres_Oui': true,
    'autoValidateOrdoNum': false,
    'NumPresPrescription': false,
    'NumPresDemande': false,
    'uncheckDMPIfImagerie': true,
    'postPrintBehavior': 'closePreview', // boutons radio
    'MoveHistoriqueToLeft': true,
    'MoveHistoriqueToLeft_Consultation': true, // Depreciated depuis 2.7.1 (reprise de cette partie par Weda)
    'MoveHistoriqueToLeft_Certificat': true,
    'MoveHistoriqueToLeft_Demande': true,
    'MoveHistoriqueToLeft_Courrier': false,
    'MoveHistoriqueToLeft_Formulaire': false,
    'ATCDLeft': false,
    'AutoOpenHistory_Consultation': true, // introduit depuis 2.7.1
    'ShowExplanatoryText': true,
    'autoOpenOrdoType': false,
    'AlertOnMedicationInteraction': true,
    'defautDataType': 'TAILLE:cm,Taille:cm,POIDS:kg,Poids:kg,Pc:cm,IMC:p/t²,PAd:mmHg,PAs:mmhg,TAS:mmHg,TAD:mmHg,FC:bpm,Sat:%, Z-IMC:ds',
    'autoATCD': false,
    'secureExchangeAutoRefresh': true,
    'secureExchangeUncheckIHEMessage': false,
    'autoAATI': true,
    'trimCIM10': true,
    'sortCIM10': true,
    'removeBoldPatientFirstName': false,
    'preAlertATCD': 6,
    'autoControlMT': true,
    'autoMTnewTab': true,
    'autoMTIncludeAndCheckContact': false,
    'autoFilterLeftHistory': false,
    'instantPrint': false,
    'autoContinueWithoutNumPres': false,
    'autoSelectMT': false,
};


/**
 * La structure de données `advancedDefaultSettings` contient les paramètres par défaut pour diverses options de Weda Helper.
 * Elle est organisée en plusieurs catégories principales, chacune contenant des options spécifiques.
 * Chaque option est définie par un objet avec les propriétés suivantes :
 * - `defaultvalue` : La valeur par défaut de l'option.
 * - `description` : Une description textuelle de l'option.
 * - `type` (optionnel) : Le type de champ pour l'option (text, radio, etc.). Par défaut, le type est `checkbox`.
 * - `subOptions` (optionnel) : Un objet contenant des sous-options, si applicable. A visée esthétique et de lisibilité.
 * 
 * Cette variable est utilisée :
 * - pour définir les options par défaut dans le stockage local de l'extension.
 * - pour générer la page des options de l'extension.
 * 
 * Il est possible de mettre des catégories et sous-catégories pour mieux organiser les options, car
 * seules les clés ayant 'defaultvalue' seront prises en compte, peu importe leur niveau de profondeur.
 * Les autres servent à améliorer la lisibilité et à générer la page des options.
 * On peut rajouter des éléments html qui seront insérés dans la page des options en utilisant la clé 'html'.
 * 
 */
var advancedDefaultSettings = {
    'Options générales': {
        'TweakImports': {
            'defaultvalue': true,
            'description': 'Activer les modifications pour la fenêtre d\'importations (page télécharger des documents).'
        },
        'EnableHelp': {
            'defaultvalue': true,
            'description': 'Affiche l\'aide en appuyant sur Alt de manière prolongée.'
        },
        'TweakTabSearchPatient': {
            'defaultvalue': true,
            'description': 'Activer les modifications de la fenêtre recherche patient (navigation facilitée avec la touche Tab).'
        },
        'autoSelectPatientCV': {
            'defaultvalue': true,
            'description': 'Lit automatiquement la carte vitale après insertion (nécessite Weda Connect 3) et sélectionne automatiquement le patient s\'il est seul.'
        },
        'WarpButtons': {
            'defaultvalue': true,
            'description': 'Activer les raccourcis claviers sur les popups type DMP/IMTI/ordo numérique etc.'
        },
        'MoveHistoriqueToLeft': {
            'defaultvalue': true,
            'description': 'Ouvrir automatiquement l\'historique dans les pages sélectionnées ci-dessous et l\'afficher dans une colonne à gauche.',
            'subOptions': {
                'AutoOpenHistory_Consultation': {
                    'defaultvalue': true,
                    'description': 'Consultation',
                },
                'MoveHistoriqueToLeft_Certificat': {
                    'defaultvalue': true,
                    'description': 'Certificat',
                },
                'MoveHistoriqueToLeft_Demande': {
                    'defaultvalue': true,
                    'description': 'Demande',
                },
                'MoveHistoriqueToLeft_Courrier': {
                    'defaultvalue': false,
                    'description': 'Courrier (beta)',
                },
                'MoveHistoriqueToLeft_Formulaire': {
                    'defaultvalue': false,
                    'description': 'Formulaire',
                },
            },
        },
        'autoFilterLeftHistory': {
            'defaultvalue': true,
            'description': 'Filtre automatiquement l\'historique gauche pour n\'afficher que date et titre.'
        },
        'autoATCD': {
            'defaultvalue': true,
            'description': 'Ouvre automatiquement les ATCD.'
        },
        'ATCDLeft': {
            'defaultvalue': true,
            'description': 'Ouvre les ATCD sur la partie gauche de l\'écran quand possible (attention l\'affichage est un peu approximatif).'
        },
        'secureExchangeAutoRefresh': {
            'defaultvalue': true,
            'description': 'Rafraîchis automatiquement la messagerie sécurisée (vous devez laisser un onglet ouvert).'
        },
        'secureExchangeUncheckIHEMessage': {
            'defaultvalue': true,
            'description': 'Décocher automatiquement le message et le fichier IHE_XDM.zip lors de l\'importation d\'un message depuis la messagerie sécurisée.'
        },
        'autoAATI': {
            'defaultvalue': true,
            'description': 'Automatise la réalisation des arrêts de travail (lecture CV auto, sélection patient auto, impression auto etc. Nécessite le Companion pour fonctionner totalement).'
        },
        'trimCIM10': {
            'defaultvalue': true,
            'description': 'Nettoie l\'arbre des ATCD CIM-10 pour ne garder que les ATCD principaux (on peut toujours les déployer pour les sous-ATCD).'
        },
        'removeBoldPatientFirstName': {
            'defaultvalue': true,
            'description': 'Met le prénom du patient en non-gras pour plus facilement distinguer le nom de famille.'
        },
        'preAlertATCD': {
            'defaultvalue': 6,
            'description': 'Affiche la date d\'alerte de l\'antécédent en orange si la date est dans moins de x mois (6 par défaut, 0 pour désactiver).',
            'type': 'text'
        },
        'autoControlMT': {
            'defaultvalue': true,
            'description': 'Automatise le procédé de vérification du MT.',
            'subOptions': {
                'autoMTnewTab': {
                    'defaultvalue': true,
                    'description': 'Ouvre un nouvel onglet pour éviter de patienter pendant la récupération des informations.',
                },
                'autoMTIncludeAndCheckContact': {
                    'defaultvalue': true,
                    'description': 'Intègre automatiquement le MT récupéré dans les contacts et initie la récupération de l\'adresse sécurisée. Compatible avec l\'option précédente.',
                }
            }
        },
    },
    'Options de consultation': {
        'TweakTabConsultation': {
            'defaultvalue': true,
            'description': 'Activer la navigation entre les champs de texte dans les consultations via Tab et Shift+Tab.'
        },
        'FocusOnTitleInConsultation': {
            'defaultvalue': false,
            'description': 'Mettre le focus dans le champ de titre à l\'ouverture d\'une nouvelle consultation.'
        },
        'ShowExplanatoryText': {
            'defaultvalue': true,
            'description': 'Affiche le texte d\'explication à droite des courbes pédiatriques dans la page des consultations.'
        },
        'RemoveTitleSuggestions': {
            'defaultvalue': true,
            'description': 'Retire le panneau de suggestion dans les Titres (ex. de Consultation).'
        },
        'defautDataType': {
            'defaultvalue': 'TAILLE:cm,Taille:cm,POIDS:kg,Poids:kg,Pc:cm,IMC:p/t²,PAd:mmHg,PAs:mmhg,TAS:mmHg,TAD:mmHg,FC:bpm,Sat:%',
            'description': 'Types de données automatique (vider pour désactiver. Pas d\'espaces. Sensible à la Case.) Défaut = TAILLE:cm,Taille:cm,POIDS:kg,Poids:kg,Pc:cm,IMC:p/t²,PAd:mmHg,PAs:mmhg,TAS:mmHg,TAD:mmHg,FC:bpm,Sat:%',
            'type': 'text'
        }
    },
    'Options de prescription': {
        'TweakTabPrescription': {
            'defaultvalue': true,
            'description': 'Activer les modifications de la fenêtre recherche médicaments (navigation facilitée avec la touche Tab).'
        },
        'KeyPadPrescription': {
            'defaultvalue': true,
            'description': 'Activer l’utilisation du clavier numérique lors de prescription d\'un médicament.'
        },
        'autoOpenOrdoType': {
            'defaultvalue': true,
            'description': 'Ouvre automatiquement la fenêtre des ordonnances-types lors des prescriptions médicamenteuses.'
        },
        'AlertOnMedicationInteraction': {
            'defaultvalue': true,
            'description': 'Affiche un message d\'alerte lorsqu\'une prescription de médicaments présente une contre-indication absolue.'
        }
    },
    'Options d\'ordonnance numérique': {
        'autoSelectTypeOrdoNum': {
            'defaultvalue': true,
            'description': 'Sélectionner automatiquement le type d\'ordonnance numérique selon le contenu de la prescription (biologie, kinésithérapie, infirmier, pédicure, orthoptie, orthophonie, etc.).'
        },
        'autoConsentNumPres': {
            'defaultvalue': true,
            'description': 'Coche automatiquement une case de consentement de l\'ordonnance numérique. Attention vous êtes toujours tenu de demander l\'autorisation au patient systématiquement.',
            'subOptions': {
                'autoConsentNumPres_Oui': {
                    'defaultvalue': true,
                    'description': 'Sélectionne "non" (si décocoché), "oui" si coché.',
                }
            }
        },
        'autoValidateOrdoNum': {
            'defaultvalue': true,
            'description': 'Valider automatiquement une ordonnance numérique de médicaments lors de l\'impression (nécessite d\'activer l\'option "Coche automatiquement la case de consentement" ci-dessus).'
        },
        'uncheckDMPIfImagerie': {
            'defaultvalue': true,
            'description': 'Décoche automatiquement l\'ordonnance numérique si "Imagerie" est sélectionné dans une Demande.'
        },
        'autoContinueWithoutNumPres': {
            'defaultvalue': true,
            'description': 'Clique automatiquement "Continuer automatiquement sans ordonnance numérique" si le message d\'erreur s\'affiche.'
        }
    },
    'Options de cochage/décochage automatique': {
        'pour que le décochage fonctionne, au moins une des deux options doit être activée. Cf. https://secure.weda.fr/FolderSetting/PreferenceForm.aspx pour activer/désactiver l\'ensemble': {
            'NumPresPrescription': {
                'defaultvalue': false,
                'description': 'Cocher/Décocher automatiquement la case « ordonnance numérique » pour les prescriptions de médicaments.'
            },
            'NumPresDemande': {
                'defaultvalue': false,
                'description': 'Cocher/Décocher automatiquement la case « ordonnance numérique » pour les ordonnances de demandes numériques (labo/imagerie/paramédical)'
            }
        }
    },
    'Options de recherche médicale': {
        'keepMedSearch': {
            'defaultvalue': true,
            'description': 'Garder la recherche médicale.'
        },
        'addMedSearchButtons': {
            'defaultvalue': true,
            'description': 'Ajouter des boutons de raccourcis pour la recherche de médicaments.',
            'subOptions': {
                'boutonRecherche-1': {
                    'defaultvalue': true,
                    'description': 'Médicaments',
                },
                'boutonRecherche-14': {
                    'defaultvalue': true,
                    'description': 'Recherche par produits',
                },
                'boutonRecherche-8': {
                    'defaultvalue': true,
                    'description': 'Dénomination commune (DCI)',
                },
                'boutonRecherche-2': {
                    'defaultvalue': true,
                    'description': 'Molécules (principes actifs)',
                },
                'boutonRecherche-10': {
                    'defaultvalue': true,
                    'description': 'Recherche par U.C.D.',
                },
                'boutonRecherche-3': {
                    'defaultvalue': true,
                    'description': 'Recherche par A.T.C.',
                },
                'boutonRecherche-13': {
                    'defaultvalue': true,
                    'description': 'Recherche par Vidal',
                },
                'boutonRecherche-4': {
                    'defaultvalue': true,
                    'description': 'Indications',
                },
                'boutonRecherche-5': {
                    'defaultvalue': true,
                    'description': 'Groupe d\'indications',
                },
                'boutonRecherche-6': {
                    'defaultvalue': true,
                    'description': 'Laboratoires',
                },
                'boutonRecherche-7': {
                    'defaultvalue': true,
                    'description': 'Vos favoris et perso.',
                },
                'boutonRecherche-9': {
                    'defaultvalue': true,
                    'description': 'Le Top 50',
                }
            }
        },
        'TweakRecetteForm': {
            'defaultvalue': false,
            'description': 'Appuie automatiquement sur le bouton "rechercher" après avoir sélectionné la page des recettes (permet d’afficher les recettes du jour directement en arrivant sur la page).'
        },
        'TweakNIR': {
            'defaultvalue': true,
            'description': 'Ajoute la possibilité de copier le NIR en cliquant dessus sur la page d’accueil.'
        }
    },
    'Options de Courrier': {
        'autoSelectMT': {
            'defaultvalue': true,
            'description': 'Sélectionne automatiquement les médecins traitants comme destinataires.'
        }
    },
    'Options de FSE': {
        'defaultCotation': {
            'defaultvalue': true,
            'description': 'Activer la cotation par défaut dans la FDS. (Nécessite de mettre une cotation favorite nommée "Défaut", et de valider la feuille de soin avec les touches o/n).'
        },
        'TweakFSEGestion': {
            'defaultvalue': true,
            'description': 'Activer le rafraichissement automatique des FSE dans la page de télétransmission. (fonctionnalité en beta).'
        },
        'TweakFSECreation': {
            'defaultvalue': true,
            'description': 'Active les raccourcis clavier de la création de FSE ainsi que la lecture automatique de la carte vitale.'
        },
        'TweakFSEDetectMT': {
            'defaultvalue': false,
            'description': 'Sélectionne automatiquement l\'option "Je suis le médecin traitant" si vous êtes le médecin traitant du patient.'
        },
        'TweakFSEGestionUnique': {
            'defaultvalue': false,
            'description': 'Cocher automatiquement la case "Réaliser une FSE en gestion unique" pour les patients C2S.'
        },
        'TweakFSEAccident': {
            'defaultvalue': false,
            'description': 'Coche automatiquement la case "Non" pour un accident de droit commun.'
        },
        'TweakSCORDegradee': {
            'defaultvalue': false,
            'description': 'Sélectionne automatiquement "Feuille de soins dégradée" lors de l\'importation d\'une pièce jointe SCOR.'
        },
        'SCORAutoSelectPJ': {
            'defaultvalue': true,
            'description': 'Sélectionne automatiquement "Inclure la FSP en SCOR".'
        }
    },
    'Lien avec Weda-Helper-Companion': {
        'log vers le companion': {
            'html': '<a href="URL_DU_LOG_DU_COMPANION" id="companionLogLing" target="_blank">Voir le log du Companion</a>'
        },
        'Options de connexion': {
            'portCompanion': {
                'defaultvalue': '4821',
                'description': 'Port Weda-Helper-Companion (default 4821) cf. https://github.com/Refhi/Weda-Helper-Companion doit être le même ici et dans le Companion.',
                'type': 'text'
            },
            'apiKey': {
                'defaultvalue': 'votre clé API par défaut',
                'description': 'Clé API. Doit être identique à celle du Companion (normalement fait automatiquement lors de la première requête au Companion).',
                'type': 'text'
            }
        },
        'Options d\'impression automatique': {
            'RemoveLocalCompanionPrint': {
                'defaultvalue': true,
                'description': '<em><strong>Désactiver</strong></em> l\'impression automatique complète via le companion <strong>(décocher pour l\'activer)</strong>.',
                'subOptions': {
                    'instantPrint': {
                        'defaultvalue': false,
                        'description': 'Impression instantanée : dès l\'envoi de l\'impression via le Companion, ouvre un nouvel onglet. Ferme ensuite l\'onglet originel quand l\'impression est terminée. Utile pour faire DMP et ordonnances numériques sans ralentir le flux de la consultation. Attention les pdfs des impressions ne seront pas immédiatement visible car pas encore terminé au moment du retour vers le dossier patient.'
                    },
                }
            },

            'KeepFocus': {
                'defaultvalue': true,
                'description': 'Active la récupération du focus en cas de vol par l\'application d\'impression.'
            },
            'Après une impression automatique par le Companion': {
                'postPrintBehavior': {
                    'defaultvalue': 'closePreview',
                    'description': 'Comportement après une impression automatique par le Companion.',
                    'type': 'radio',
                    'options': ['Ne rien faire', 'Fermer la fenêtre de prévisualisation', 'Retourner au dossier']
                }
            }
        },
        'Lien avec le TPE': {
            'RemoveLocalCompanionTPE': {
                'defaultvalue': true,
                'description': '<em><strong>Désactiver</strong></em> la communication avec le TPE et l\'option TPE dans les fse <strong>(décocher pour l\'activer)</strong>.'
            }
        }
    }
};

// TODO : ajouter un système de contrôle automatique pour vérifier les doublons et les erreurs de syntaxe dans les clés
// TODO : vérifier que advancedDefaultSettings est bien utilisé dans les options et peut remplacer defaultSettings
// TODO : vérifier qu'on a bien toutes les clés de defaultSettings dans advancedDefaultSettings

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
chrome.storage.local.set({ defaultSettings: defaultSettings, defaultShortcuts: defaultShortcuts }, function () {
    console.log('[background.js] Les valeurs et raccourcis par défaut ont été enregistrées');
});
