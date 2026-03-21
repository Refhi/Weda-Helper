/**
 * Retourne la configuration du Quick Access
 * hélas très granulaire et spécifique à chaque élément, pour
 * que les cibles soient réellement pertinentes
 * @returns 
 */


// ============================================================================
// CONFIGURATION
// ============================================================================

function returnQuickAccessConfig() {
    /**
     * Configuration du Quick Access
     * Un Item correspond à un élément présent dans le DOM :
     * 
     * 'ceci_est_un_item': {     // ID de l'item, utilisé pour la navigation dans les niveaux
     *   selector: 'a.mon-lien', // sélecteur CSS pour trouver l'élément dans le DOM
     *   hotkey: 'c',            // lettre de raccourci (de préférence null pour génération automatique)
     *   onTap: 'mouseover',     // action à exécuter au tap (cf. executeAction)
     *   onDouble: 'clic',       // action à exécuter au double-tap (optionnel, cf. executeAction)
     *   subItems: {             // sous-éléments (optionnel, pour les items non-terminaux). Générés une seule fois puis mis en cache.
     *     'sous_item_1': { ... },
     *     'sous_item_2': { ... }
     *     },
     *   inlineSubTooltips: true // (optionnel) L'item n'affiche pas son propre tooltip, mais ses sous-items affichent
     *                           // la combinaison de touches parent+enfant (ex: "SI", "SL", "SW").
     *                           // Les hotkeys des sous-items sont générées automatiquement si absentes.
     *                           // La navigation reste inchangée : l'utilisateur appuie d'abord sur la hotkey du parent,
     *                           // puis sur celle du sous-item.
     *   priorityLvl: true       // (optionnel) Si au moins un item du niveau actuel a priorityLvl: true,
     *                           // tous les autres items sans priorityLvl: true sont inhibés (pas de tooltip,
     *                           // pas de raccourci). Utile quand une fenêtre est au premier plan et ne doit
     *                           // pas être perturbée par les raccourcis sous-jacents.
     *   }
     * 
     * Nomenclature : (à des fin de commentaire uniquement)
     * - un item de REGROUPEMENT est un item sans onTap ni onDoubleTap
     * - un item TERMINAL est un item sans subItems
     * - un item ACTION est un item avec une action onTap ou onDoubleTap, qu'il ait ou non des subItems
     */
    /** --------------------------------------------------------------------------------
    *                Configuration spécifique à la page d’accueil
    * ----------------------------------------------------------------------------------
    */
    // ================= Bandeau supérieur de la page d’accueil =================
    const urlPatternsBandeau = ['/FolderMedical/PatientViewForm.aspx', '/FolderTools/BiblioForm.aspx'];
    const bandeauSuperieurConfig = {
        _urlPatterns: urlPatternsBandeau,
        'large_top_menu': {
            selector: 'table.bandeau',
            subItems: {
                'recherche_patient_input': {
                    selector: '#TextBoxFindPatient',
                    onTap: function (element) {
                        element.focus();
                        element.select();
                    }
                },
                'coller_presse_papiers': {
                    selector: 'span[title="Coller le contenu du presse-papiers"]',
                    onTap: 'clic'
                },
                'aide': {
                    selector: '#ImageAide',
                    onTap: 'clic'
                },
                'vidal': {
                    selector: '#ImageVidal',
                    onTap: 'clic'
                },
                'vidal_recos': {
                    selector: '#ImageRoco',
                    onTap: 'clic'
                },
                'expert_weda': {
                    selector: '#ImageButtonExpertWeda',
                    onTap: 'clic'
                },
                'negatoscope': {
                    selector: '#ImageNegatoscope',
                    onTap: 'clic'
                },
                'messagerie': {
                    selector: '.messagerieWidget',
                    onTap: 'clic'
                },
                'postits': {
                    selector: '#postitWidget_divContainer',
                    onTap: 'clic'
                },
                'lecture_cps': {
                    selector: 'vz-lecture-cps-widget button[mat-raised-button]',
                    onTap: 'clic'
                },
                'idomed': {
                    selector: '#idomed_icon img[alt="idomed"]',
                    onTap: 'clic'
                },
                'resultats_icon': {
                    selector: 'resultats-icon div.icon',
                    onTap: 'clic'
                },
                'weda_connect': {
                    selector: 'weda-connect-update-invite div.icon',
                    onTap: 'clic'
                },
                'deconnexion': {
                    selector: '.imgDeconnexion',
                    onTap: 'clic'
                }
            }
        }
    };

    // ================= Eléments principaux du Bandeau supérieur =================
    const menuHorizontalConfig = {
        _urlPatterns: urlPatternsBandeau,
        'medical': {
            selector: '#nav-menu > li > a.nav-icon__link--doctor',
            hotkey: 'm',
            onTap: function (element, state) { horizontalMenuPseudoMouseover(element, state); },
            onDoubleTap: 'clic',
            subItems: function (element) {
                const submenu = element.parentElement.querySelector('.nav-menu__submenu--level1');
                return submenu ? generateHorizMenuSubItems(submenu, 'medical') : {};
            }
        },

        'applicatifs': {
            selector: '#nav-menu > li > a.nav-icon__link--tools',
            hotkey: 'p',
            onTap: function (element, state) { horizontalMenuPseudoMouseover(element, state); },
            onDoubleTap: 'clic',
            subItems: function (element) {
                const submenu = element.parentElement.querySelector('.nav-menu__submenu--level1');
                return submenu ? generateHorizMenuSubItems(submenu, 'applicatifs') : {};
            }
        },

        'gestion': {
            selector: '#nav-menu > li > a.nav-icon__link--safe-open',
            hotkey: 'g',
            onTap: function (element, state) { horizontalMenuPseudoMouseover(element, state); },
            onDoubleTap: 'clic',
            subItems: function (element) {
                const submenu = element.parentElement.querySelector('.nav-menu__submenu--level1');
                return submenu ? generateHorizMenuSubItems(submenu, 'gestion') : {};
            }
        },

        'parametres': {
            selector: '#nav-menu > li > a.nav-icon__link--mixing-desk',
            hotkey: 'e',
            onTap: function (element, state) { horizontalMenuPseudoMouseover(element, state); },
            onDoubleTap: 'clic',
            subItems: function (element) {
                const submenu = element.parentElement.querySelector('.nav-menu__submenu--level1');
                return submenu ? generateHorizMenuSubItems(submenu, 'parametres') : {};
            }
        }
    };

    // ================= Menu vertical gauche (sidebar) de la page d’accueil =================
    const sidebarConfig = {
        _urlPatterns: urlPatternsBandeau,
        'menu_vertical_gauche': {
            selector: ".menu-sidebar",
            onTap: null,
            onDoubleTap: null,
            inlineSubTooltips: true,
            subItems: {
                // Menu W - Navigation événements
                'menu_w_sidebar': {
                    selector: '#ContentPlaceHolder1_MenuNavigate > ul.level1 > li > a.level1',
                    onTap: function (element, state) { WMenuPseudoMouseover(element, state); },
                    onDoubleTap: 'clic',
                    subItems: function (element) {
                        const parentLi = element.parentElement;
                        const submenu = parentLi?.querySelector('ul.level2.dynamic');
                        return submenu ? generateWMenuSubItems(submenu, 'menu_w_sidebar') : {};
                    }
                },

                // Fiche patient
                'modifier_patient': {
                    selector: '#ContentPlaceHolder1_ButtonModifierPatient',
                    onTap: 'clic'
                },

                // Carte Vitale
                'cv_sidebar': {
                    selector: '.cv',
                    onTap: 'clic'
                },

                // Menu périphériques (scanner, doctolib, DMP, omnidoc)
                'peripheriques': {
                    selector: '#ContentPlaceHolder1_DivMenuPeripherique',
                    onTap: function (element, state) { peripheriquesPseudoMouseover(element, state); },
                    onDoubleTap: 'clic',
                    subItems: function (element) {
                        const submenu = element.querySelector('#ContentPlaceHolder1_MenuPeripherique ul.level2.dynamic');
                        return submenu ? generateWMenuSubItems(submenu, 'peripheriques') : {};
                    }
                },

                // Recherche patient
                'recherche_sidebar': {
                    selector: '.imgChercher',
                    onTap: 'clic'
                },

                // Ajouter patient
                'ajouter_patient': {
                    selector: '.imgAddNewPatient',
                    onTap: 'clic'
                },

                // Documents
                'consultations': {
                    selector: '#ContentPlaceHolder1_ButtonConsultation',
                    onTap: 'clic'
                },

                'resultats_examen': {
                    selector: '#ContentPlaceHolder1_ButtonResultatExamen',
                    onTap: 'clic'
                },

                'courriers': {
                    selector: '#ContentPlaceHolder1_ButtonCourrier',
                    onTap: 'clic'
                },

                'vaccins': {
                    selector: '#ContentPlaceHolder1_ButtonVaccins',
                    onTap: 'clic'
                },

                'traitements': {
                    selector: '#ContentPlaceHolder1_ButtonPanneauxSynthetique',
                    onTap: 'clic'
                },

                'graphiques': {
                    selector: '#ContentPlaceHolder1_ButtonChart',
                    onTap: 'clic'
                },

                'documents_joints': {
                    selector: '#ButtonDocumentJointAction',
                    onTap: function (element, state) { documentsJointsPseudoMouseover(element, state); },
                    onDoubleTap: 'clic',
                    subItems: function (element) {
                        const submenu = document.querySelector('#DivMenuDocumentJoint table');
                        return submenu ? generateDocumentsJointsSubItems(submenu, 'documents_joints') : {};
                    }
                },

                'grossesse': {
                    selector: '#ContentPlaceHolder1_ButtonPregnant',
                    onTap: 'clic'
                },

                'arrets_travail': {
                    selector: '#ContentPlaceHolder1_ButtonAT',
                    onTap: 'clic'
                },

                // Menu impression
                'impression': {
                    selector: '#ContentPlaceHolder1_MenuPrint > ul.level1.static',
                    onTap: function (element, state) { impressionPseudoMouseover(element, state); },
                    onDoubleTap: 'clic',
                    subItems: function (element) {
                        const submenu = element.querySelector('ul.level2.dynamic');
                        return submenu ? generateWMenuSubItems(submenu, 'impression') : {};
                    }
                },

                // Recherche prescriptions
                'recherche_prescriptions': {
                    selector: '#ContentPlaceHolder1_ButtonHasStat',
                    onTap: 'clic'
                },

                // Séquenceur
                'sequenceur': {
                    selector: '#ContentPlaceHolder1_ButtonSequenceur',
                    onTap: 'clic'
                }
            }
        }
    };

    // ================= éléments internes page d’accueil =====================
    const internalElementsConfig = {
        _urlPatterns: urlPatternsBandeau,
        /** Éléments internes - Items terminaux
         * Cette partie gère les éléments avec lesquels l'utilisateur peut interagir à la souris.
         * 
         * cf. @generateInternalSubItems pour la logique de génération des subItems de ces éléments internes
         * 
         */
        'panel_patient': {
            selector: '#ContentPlaceHolder1_PanelPatient',
            inlineSubTooltips: true,
            subItems: function (element) {
                return generateInternalSubItems(element);
            }
        },
        '+1click_vsm': {
            selector: '#oneClickVSMButton',
            onTap: 'clic'
        },
        'documents_joints_meta_top_bar': {
            selector: '#ContentPlaceHolder1_PanelVisuDocument tr',
            subItems: function (element) {
                return generateInternalSubItems(element);
            }
        },
        'documents_joints_meta_etiquettes': {
            selector: '#ContentPlaceHolder1_PanelStatEtiquette',
            subItems: function (element) {
                const subItems = {};

                // Cibler spécifiquement les étiquettes et leurs éléments interactifs
                const etiquettes = element.querySelectorAll('.eti');

                etiquettes.forEach((eti, index) => {
                    // Pour chaque étiquette, on crée un sous-item pour la checkbox et la croix
                    const checkbox = eti.querySelector('input[type="checkbox"]');
                    const cross = eti.querySelector('.cross');

                    if (checkbox) { // Pour l'instant c'est bugé : ces items sont bizarrement hidden
                        subItems[checkbox.id] = {
                            selector: `#${checkbox.id}`,
                            onTap: 'clic'
                        };
                    }

                    if (cross) {
                        // Créer un id unique pour la croix, basée sur l'id de la checkbox
                        cross.id = `cross_${checkbox.id}`;
                        subItems[cross.id] = {
                            selector: `#${cross.id}`,
                            onTap: 'clic'
                        };
                    }
                });

                // Ajouter aussi les autres éléments interactifs génériques
                const otherItems = generateInternalSubItems(element);
                if (otherItems) {
                    Object.assign(subItems, otherItems);
                }

                const subItemObject = Object.keys(subItems).length > 0 ? subItems : null;
                console.log(`[QuickAccess] SubItems générés pour documents_joints_meta_etiquettes`, subItemObject);
                return subItemObject;
            }
        },
        'documents_joints_meta_bouton_suite_dossier': {
            selector: '#ContentPlaceHolder1_HistoriqueUCForm1_LinkButtonSuiteWeda',
            onTap: 'clic',
        },
        'documents_joints_corps': { // Niveau 1 : le panneau contenant toutes les cs
            selector: '#ContentPlaceHolder1_HistoriqueUCForm1_UpdatePanelLiteralAfficheWeda',
            inlineSubTooltips: true,
            subItems: function (element) {
                return generateConsultationHistorySubItems(element, 'documents_joints_corps');
            }
        },
        'copilot_vidal': {
            selector: '.copilot-vidal-project',
            subItems: function (element) {
                return generateInternalSubItems(element);
            }
        }
    };

    /**
     * ----------------------------------------------------------------------------------
     *               Pages de consultation
     * ----------------------------------------------------------------------------------
     */
    const urlPatternsConsultation = ['/FolderMedical/ConsultationForm.aspx'];
    // =============== Les iframes =============================
    const iframeTextZonesConfig = {
        _urlPatterns: urlPatternsConsultation,
        // -------- pour la page des consultation ------------
        'consultation_iframe_text_config_area_1': {
            selector: '#ContentPlaceHolder1_divZone1',
            subItems: function (element) {
                return generateInternalSubItems(element);
            }
        },
        'consultation_iframe_text_area_1': {
            selector: '#ContentPlaceHolder1_divZone1 iframe >> body',
            onTap: 'focus',
        },
        'consultation_iframe_text_config_area_2': {
            selector: '#ContentPlaceHolder1_divZone2',
            subItems: function (element) {
                return generateInternalSubItems(element);
            }
        },
        'consultation_iframe_text_area_2': {
            selector: '#ContentPlaceHolder1_divZone2 iframe >> body',
            onTap: 'focus',
        },
        'consultation_iframe_text_config_area_3': {
            selector: '#ContentPlaceHolder1_divZone3',
            subItems: function (element) {
                return generateInternalSubItems(element);
            }
        },
        'consultation_iframe_text_area_3': {
            selector: '#ContentPlaceHolder1_divZone3 iframe >> body',
            onTap: 'focus',
        },
        'consultation_iframe_text_config_area_4': {
            selector: '#ContentPlaceHolder1_divZone4',
            subItems: function (element) {
                return generateInternalSubItems(element);
            }
        },
        'consultation_iframe_text_area_4': {
            selector: '#ContentPlaceHolder1_divZone4 iframe >> body',
            onTap: 'focus',
        },
        'consultation_iframe_text_config_area_5': {
            selector: '#ContentPlaceHolder1_PanelEvenementZone5',
            subItems: function (element) {
                return generateInternalSubItems(element);
            }
        },
        'consultation_iframe_text_area_5': {
            selector: '#ContentPlaceHolder1_PanelEvenementZone5 iframe >> body',
            onTap: 'focus',
        },
        // ---------------- et pour les autres  ---------------
        'zone_texte_iframe_certif': { // Certif
            selector: '#CE_ContentPlaceHolder1_EditorCertificat_ID_Frame >> body',
            onTap: 'focus',
        },
        'zone_texte_iframe_prescription': { // Prescription
            selector: '#CE_ContentPlaceHolder1_EditorPrescription_ID_Frame >> body',
            onTap: 'focus',
        }
    }

    // ============== Les grandes zones (titres, items, etc.) =================
    const generalZonesConfig = {
        _urlPatterns: urlPatternsConsultation,
        'suivi_preferences': {
            selector: '#ContentPlaceHolder1_ButtonSuiviPreference',
            onTap: 'clic'
        },
        'zone_items': {
            selector: '#ContentPlaceHolder1_PanelBlocagePatientSuiviVisible',
            inlineSubTooltips: true,
            subItems: function (element) {
                return generateMultipleSelectorSubItems({
                    parentElement: element,
                    selector: '[id^="ContentPlaceHolder1_SuivisGrid_EditBoxGridSuiviReponse_"]',
                    onTap: 'focus'
                });
            }
        },
        'zone_cim10': {
            selector: '#ContentPlaceHolder1_UpdatePanelDiagnosticsGrid',
            subItems: function (element) {
                return generateInternalSubItems(element);
            }
        }
    }

    /**
     * ----------------------------------------------------------------------------------
     *              Pages de certificats
     * ----------------------------------------------------------------------------------
     */
    const textZoneIframeConfigCertificat = {
        _urlPatterns: ['/FolderMedical/CertificatForm.aspx'],
        'certificat_iframe_text_area': {
            selector: '#CE_ContentPlaceHolder1_EditorCertificat_ID_Frame >> body',
            onTap: 'focus',
        }
    }

    /**
     * ----------------------------------------------------------------------------------
     *             Pages de Demandes
     * ----------------------------------------------------------------------------------
     */
    const textZoneIframeConfigDemande = {
        _urlPatterns: ['/FolderMedical/DemandeForm.aspx'],
        'demande_iframe_text_area': {
            selector: '#CE_ContentPlaceHolder1_EditorPrescription_ID_Frame >> body',
            onTap: 'focus',
        },
        'demande_iframe_text_area_ALD': {
            selector: '#CE_ContentPlaceHolder1_EditorPrescriptionBizone_ID_Frame >> body',
            onTap: 'focus',
        }
    }

    /**
     * ----------------------------------------------------------------------------------
     *            Pages de prescriptions médicamenteuses
     * ----------------------------------------------------------------------------------
     */
    const prescriptionMedicamenteuseConfig = {
        _urlPatterns: ['/FolderMedical/PrescriptionForm.aspx'],
        'zone_texte_poids': {
            selector: '#ContentPlaceHolder1_TextBoxPatientPoids',
            onTap: 'focus'
        },
        'zone_texte_taille': {
            selector: '#ContentPlaceHolder1_TextBoxPatientTaille',
            onTap: 'focus'
        },
        'zone_resultats_recherche_medicaments': {
            selector: '#ContentPlaceHolder1_BaseVidalUcForm1_UpdatePanelVidal',
            inlineSubTooltips: true,
            subItems: function (element) {
                return generateMultipleSelectorSubItems({
                    parentElement: element,
                    selector: '[id^="ContentPlaceHolder1_BaseVidalUcForm1_VidalPacksGrid_LinkButtonVidalPacksGridName_"]',
                    onTap: 'clic',
                });
            }
        },
        'zone_resultats_recherche_medicaments_fav': {
            selector: '#ContentPlaceHolder1_BaseVidalUcForm1_UpdatePanelVidal',
            inlineSubTooltips: true,
            subItems: function (element) {
                return generateMultipleSelectorSubItems({
                    parentElement: element,
                    selector: '[id^="ContentPlaceHolder1_BaseVidalUcForm1_VidalPacksGrid_LinkButtonVidalPacksGridPosologieType_"]',
                    onTap: 'clic',
                });
            }
        },

        'zone_options_recherche_medicaments': {
            selector: '#ContentPlaceHolder1_BaseVidalUcForm1_UpdatePanelVidal table',
            inlineSubTooltips: true,
            subItems: function (element) {
                return generateInternalSubItems(element);
            }
        }
    };


    /**
     * ----------------------------------------------------------------------------------
     *             Pages de courriers
     * ----------------------------------------------------------------------------------
     */
    const textZoneIframeConfigCourrier = {
        _urlPatterns: ['/FolderMedical/CourrierForm.aspx'],
        'courrier_iframe_text_area': {
            selector: '#CE_ContentPlaceHolder1_EditorCourrier_ID_Frame >> body',
            onTap: 'focus',
        }
    }

    /**
     * ----------------------------------------------------------------------------------
     *            Pages de FSE - TODO
     * ----------------------------------------------------------------------------------
     */


    /**
     * ----------------------------------------------------------------------------------
     * transversalité : éléments présents à la fois en consultation et en hospitalisation, ou éléments génériques présents sur plusieurs pages
     * ----------------------------------------------------------------------------------
     */

    // =============== modèles de documents ==================
    const documentTemplatesConfig = {
        'search_certificat_template': {
            selector: '#ContentPlaceHolder1_BaseGlossaireUCForm1_TextBoxContient',
            onTap: 'focus',
        },
        'certificat_templates': {
            inlineSubTooltips: true,
            selector: '#ContentPlaceHolder1_BaseGlossaireUCForm1_TreeViewGlossaire',
            subItems:
                function (element) {
                    return generateMultipleSelectorSubItems({
                        parentElement: element,
                        selector: '#ContentPlaceHolder1_BaseGlossaireUCForm1_TreeViewGlossaire > table [id^="ContentPlaceHolder1_BaseGlossaireUCForm1_TreeViewGlossairet"]',
                        onTap: 'clic',
                        inlineSubTooltips: true,
                        subItemsGenerator: function (folderElement) {
                            // Le <div id="...Nodes"> contenant les sous-modèles est le sibling immédiat de la table
                            const nodesDiv = folderElement.closest('table').nextElementSibling;
                            // On vérifie que ce sibling est bien un élément type div
                            if (!nodesDiv || nodesDiv.tagName !== 'DIV') return {};
                            return generateMultipleSelectorSubItems({
                                parentElement: nodesDiv,
                                selector: '[id^="ContentPlaceHolder1_BaseGlossaireUCForm1_TreeViewGlossairet"]',
                                onTap: 'clic'
                            });
                        }
                    });
                }
        },
        'prescription_top_templace_bar': {
            selector: '#ContentPlaceHolder1_PanelGlossaire > div > table > tbody > tr:nth-child(1) > td > table > tbody > tr',
            subItems: function (element) {
                return generateInternalSubItems(element);
            }
        },
        'prescription_types_template_labo': {
            selector: '#ContentPlaceHolder1_BaseGlossaireUCForm1_ButtonDemandeAnalyseType',
            onTap: 'clic'
        },
        'prescription_types_template_img': {
            selector: '#ContentPlaceHolder1_BaseGlossaireUCForm1_ButtonDemandeRadioType',
            onTap: 'clic'
        },
        'prescription_types_template_para': {
            selector: '#ContentPlaceHolder1_BaseGlossaireUCForm1_ButtonDemandeKineType',
            onTap: 'clic'
        },
        'toClick_template': { // Les modèles où on clique pour remplir certains champs pré-définis
            selector: '#ContentPlaceHolder1_BaseGlossaireUCForm1_DivQuestionnaire',
            inlineSubTooltips: true,
            priorityLvl: true,
            subItems: function (element) {
                return generateMultipleSelectorSubItems({
                    parentElement: element,
                    selector: '#ContentPlaceHolder1_BaseGlossaireUCForm1_DivQuestionnaire tr td',
                    onTap: 'clic'
                });
            }
        }
    }

    // =============== Titres et sous-titres =================
    const mainTextZonesConfig = {
        'zone_titre': {
            selector: '#ContentPlaceHolder1_EvenementUcForm1_DivCadreEvenement',
            subItems: function (element) {
                return generateInternalSubItems(element);
            }
        },
        'titre_input': {
            selector: '#TextBoxEvenementTitre',
            onTap: 'focus'
        },
        'sous_titre_input': {
            selector: '#TextBoxDocumentTitre',
            onTap: 'focus'
        }
    }

    // =============== Boutons atcd et historique =================
    const atcdHistoriqueConfig = {
        'atcd_link': {
            selector: '#ContentPlaceHolder1_EvenementUcForm1_LinkButtonShowAntecedent',
            onTap: 'clic',
        },
        'historique_link': {
            selector: '#ContentPlaceHolder1_EvenementUcForm1_LinkButtonShowHistoriqueFrame',
            onTap: 'clic',
        }
    }

    // =============== iframes communes à plusieurs pages ==================
    const iframeConfig = {
        'consultation_history_iframe': {
            selector: '#ContentPlaceHolder1_PanelHistoriqueConsultationFrame iframe >> #HistoriqueUCForm1_UpdatePanelLiteralAfficheWeda',
            subItems: function (element) {
                // Utiliser la fonction partagée avec le préfixe iframe pour les sélecteurs
                return generateConsultationHistorySubItems(
                    element,
                    'consultation_iframe',
                    '#ContentPlaceHolder1_PanelHistoriqueConsultationFrame iframe >> '
                );
            }
        },
        'weda_helper_iframe': { // L'historique affiché via WH
            selector: '#WedaHelperIframe >> #HistoriqueUCForm1_UpdatePanelLiteralAfficheWeda',
            subItems: function (element) {
                return generateConsultationHistorySubItems(
                    element,
                    'weda_helper_iframe',
                    '#WedaHelperIframe >> '
                );
            }
        },
        'consultation_iframe_sidebar': {
            selector: '#ContentPlaceHolder1_PanelHistoriqueConsultationFrame iframe >> .cadreicon',
            subItems: {
                // Documents
                'Consultations': {
                    selector: '#ContentPlaceHolder1_PanelHistoriqueConsultationFrame iframe >> #ButtonConsultation',
                    onTap: 'clic'
                },
                'resultats_examen': {
                    selector: '#ContentPlaceHolder1_PanelHistoriqueConsultationFrame iframe >> #ButtonResultatExamen',
                    onTap: 'clic'
                },
                'courriers': {
                    selector: '#ContentPlaceHolder1_PanelHistoriqueConsultationFrame iframe >> #ButtonCourrier',
                    onTap: 'clic'
                },
                'vaccins': {
                    selector: '#ContentPlaceHolder1_PanelHistoriqueConsultationFrame iframe >> #ButtonVaccins',
                    onTap: 'clic'
                },
                'visugraphiques': {
                    selector: '#ContentPlaceHolder1_PanelHistoriqueConsultationFrame iframe >> .imgChart',
                    onTap: 'clic'
                },
                'grossesse': {
                    selector: '#ContentPlaceHolder1_PanelHistoriqueConsultationFrame iframe >> #ButtonPregnant',
                    onTap: 'clic'
                },
                'arretTravail': {
                    selector: '#ContentPlaceHolder1_PanelHistoriqueConsultationFrame iframe >> .imgAT',
                    onTap: 'clic'
                }
            }
        },
        'other_iframe_sidebar': { // L'historique affiché via WH
            selector: '#WedaHelperIframe >> .cadreicon',
            inlineSubTooltips: true,
            subItems: {
                // Documents
                'Consultations': {
                    selector: '#WedaHelperIframe >> #ButtonConsultation',
                    onTap: 'clic'
                },
                'resultats_examen': {
                    selector: '#WedaHelperIframe >> #ButtonResultatExamen',
                    onTap: 'clic'
                },
                'courriers': {
                    selector: '#WedaHelperIframe >> #ButtonCourrier',
                    onTap: 'clic'
                },
                'vaccins': {
                    selector: '#WedaHelperIframe >> #ButtonVaccins',
                    onTap: 'clic'
                },
                'visugraphiques': {
                    selector: '#WedaHelperIframe >> .imgChart',
                    onTap: 'clic'
                },
                'grossesse': {
                    selector: '#WedaHelperIframe >> #ButtonPregnant',
                    onTap: 'clic'
                },
                'arretTravail': {
                    selector: '#WedaHelperIframe >> .imgAT',
                    onTap: 'clic'
                }
            }
        }
    }

    // =============== icones communes commes W, renouvellement, print etc. ==================
    const menuIconsLeft = {
        'menuW': {
            selector: '#ContentPlaceHolder1_EvenementUcForm1_MenuNavigate a.level1',
            onTap: function (element, state) { WMenuPseudoMouseover(element, state); },
            onDoubleTap: 'clic',
            subItems: function (element) {
                console.log(`[QuickAccess] Génération des subItems pour menuW`, element);
                const submenu = element.parentElement.querySelector('ul.level2.dynamic');
                console.log(`[QuickAccess] Génération des subItems pour menuW`, submenu);
                return submenu ? generateWMenuSubItems(submenu, 'menuW') : {};
            }
        },
        'historique_popup': {
            selector: '#ContentPlaceHolder1_EvenementUcForm1_DivHistorique',
            onTap: 'clic'
        },
        'duplicata_ordo': {
            selector: '#ContentPlaceHolder1_ButtonDuplicata',
            onTap: 'clic'
        },
        'impression': {
            selector: '#ContentPlaceHolder1_MenuPrint li.has-popup',
            onTap: 'mouseover',
            subItems: function (element) {
                const submenu = element.querySelector('ul.level2.dynamic');
                return submenu ? generateImpressionSubItems(submenu, 'impression') : {};
            }
        },
        'suivi_specifique': {
            selector: '#ContentPlaceHolder1_ButtonSuivi',
            onTap: 'clic'
        },
        // ------------------ pour les prescriptions ------------------
        'bouton_bizone': {
            selector: '#ContentPlaceHolder1_ButtonBizone',
            onTap: 'clic'
        },
        'champ_date_atmp': {
            selector: '#ContentPlaceHolder1_TextBoxAccidentArretTravailDateDebut',
            onTap: 'focus'
        },
        'coche_atmp': {
            selector: '#ContentPlaceHolder1_CheckBoxAT',
            onTap: 'clic'
        },
        // ----------------- pour les médicaments -------------------
        'templates_medicaments': {
            selector: '#ContentPlaceHolder1_ButtonPrescritionType',
            onTap: 'clic'
        }
    }

    // ================= Configuration finale avec filtrage =================
    const allConfigs = [
        bandeauSuperieurConfig,
        menuHorizontalConfig,
        sidebarConfig,
        internalElementsConfig,
        iframeConfig,
        iframeTextZonesConfig,
        menuIconsLeft,
        generalZonesConfig,
        documentTemplatesConfig,
        mainTextZonesConfig,
        atcdHistoriqueConfig,
        textZoneIframeConfigCertificat,
        textZoneIframeConfigDemande,
        prescriptionMedicamenteuseConfig,
        textZoneIframeConfigCourrier
    ];

    const quickAccessConfig = {};

    // Filtrer les configurations selon l'URL actuelle
    const currentUrl = window.location.pathname;
    for (const configGroup of allConfigs) {
        const urlPatterns = configGroup._urlPatterns;

        // Si pas de restriction (_urlPatterns null/undefined) ou si l'URL correspond
        if (!urlPatterns || matchesUrlPatterns(currentUrl, urlPatterns)) {
            // Copier tous les items sauf _urlPatterns
            for (const [key, value] of Object.entries(configGroup)) {
                if (key !== '_urlPatterns') {
                    quickAccessConfig[key] = value;
                }
            }
        }
    }

    return quickAccessConfig;
}