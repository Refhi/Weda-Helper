/**
 * @file alertesAtcd.js
 * @description Système d'alertes personnalisées basées sur les antécédents.
 * Affiche des alertes contextuelles (ETP, protocoles) selon les ATCD du patient.
 * Chaque cabinet/pôle peut avoir ses propres alertes configurées.
 * 
 * Format des alertes :
 * ["Titre", coloration (true/false), prioritaire (true/false), "icône", ["mots", "clés"]]
 * 
 * @requires tweaks.js (addTweak)
 * @requires storage.js (getOption)
 * @requires dom-oberver.js (waitForElement)
 */

// Fichier contenant les paramètres d'alerte, initialement pour les ETP.
// Le nombre 4341 correspond à l'ID du cabinet médical dans la base de données.
// Chaque Pôle peut demander à avoir ses propres alertes en envoyant un ticket avec la liste des alertes souhaitées et l'ID du cabinet.
// Merci de respecter la structure des alertes ci-dessous pour en faciliter l'intégration.

// Structure d'une alerte :
// {
//   titre: "Titre de l'alerte",
//   coloration: true/false (si true, l'antécedent est colorée),
//   alerte: true/false (si true, alerte affichée en priorité),
//   matIcon: "nom_de_l_icone_material",
//   longDescription: "Description détaillée de l'alerte",
//   motsCles: ["liste", "de", "mots", "clés"] (peut être vide [])
// }


/**
 * Schéma définissant les caractéristiques des champs d'une alerte.
 * Utilisé pour le constructeur d'alerte dans les options et pour la validation.
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
        required: false,
        description: 'Cible de l\'alerte',
        enum: ['atcd', 'etatCivil'],
        default: 'atcd'
      },
      coloration: {
        type: ['boolean', 'string'],
        required: false,
        description: 'Coloration de la cible (false ou nom de couleur CSS)',
        default: false
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


const alertesAtcdGlobal = {
  1000: [
    // Exemple d'alerte
    {
      titre: "Exemple d'alerte", // Titre non utilisé dans les alertes, permet de s'y retrouver
      optionsCible: {
        cible: "atcd", // peut être : "atcd", "etatCivil" et rien d'autre pour l'instant
        coloration: false, // si false, l'antécédent n'est pas coloré. Sinon mettre nom couleur css (ex: "red", "yellow", "blue", etc.)
        icone: "warning", // icône Material à afficher à côté de l'antécédent
        texteSurvol: "..." // Le texte affiché lors du survol de la cible
      },
      alerteWeda: { // Configuration de l'alerte WEDA (si présent avec texteAlerte, l'alerte sera affichée)
        icone: "info", // L'icône Material affichée dans l'alerte
        typeAlerte: "success", // success / fail / undefined (success met en vert, undefined en bleu, fail en rouge sans limite de temps)
        dureeAlerte: 10, // Durée d'affichage de l'alerte en secondes (0 = jusqu'à fermeture manuelle)
        texteAlerte: "..." // Texte de la notification (obligatoire pour afficher l'alerte)
      },
      conditions: {
        ageMin: 0,
        ageMax: 10,
        sexes: "N", // "M", "F", "N" (N = neutre)
        dateDebut: "01/01/2000", // format DD/MM/YYYY
        dateFin: "31/12/2099", // format DD/MM/YYYY
        motsCles: ["exemple", "test"]
      }
    }
  ],
  4341: [
    {
      titre: "Atelier diabète",
      optionsCible: {
        cible: "atcd",
        coloration: true,
        icone: "groups",
        texteSurvol: "Un atelier Diabète peut être proposé à ce patient dans le cadre des ETP. Vous pouvez aller dans \"Courrier\" => \"Protocole ETP\" pour l'adressage."
      },
      alerteWeda: {
        icone: "groups",
        typeAlerte: "success",
        texteAlerte: "ETP Diabète possible, cf. Antécédents."
      },
      conditions: {
        ageMin: 18,
        ageMax: 99,
        sexes: "N",
        dateFin: "31/03/2026",
        motsCles: ["diabète"]
      }
    },
    {
      titre: "Atelier alimentation",
      optionsCible: {
        cible: "atcd",
        coloration: true,
        icone: "groups",
        texteSurvol: "Un atelier Alimentation peut être proposé à ce patient dans le cadre des ETP. Vous pouvez aller dans \"Courrier\" => \"Protocole ETP\" pour l'adressage."
      },
      alerteWeda: {
        icone: "groups",
        typeAlerte: "success"
      },
      conditions: {
        dateFin: "31/12/2099",
        motsCles: [
          "obésité",
          "obésité morbide",
          "surpoids",
          "anorexie",
          "anorexie mentale",
          "boulimie",
          "TCA",
          "troubles du comportement alimentaire",
          "dénutrition"
        ]
      }
    },
    {
      titre: "Atelier traitement CV",
      optionsCible: {
        cible: "atcd",
        coloration: true,
        icone: "groups",
        texteSurvol: "Un atelier Maladies Cardiovasculaires peut être proposé à ce patient dans le cadre des ETP. Vous pouvez aller dans \"Courrier\" => \"Protocole ETP\" pour l'adressage."
      },
      alerteWeda: {
        icone: "groups",
        typeAlerte: "success",
        texteAlerte: "ETP Maladies CV possible, cf. Antécédents."
      },
      conditions: {
        motsCles: [
          "HTA",
          "hypertension artérielle",
          "infarctus du myocarde",
          "cardiopathie",
          "AOMI",
          "insuffisance cardiaque",
          "arythmie",
          "fibrilation",
          "angor",
          "accident ischémique transitoire",
          "AVC",
          "accident vasculaire cérébral",
          "coronaropathie"
        ]
      }
    }
  ]
};



/**
 * Vérifie la structure des alertes et affiche des avertissements en console en cas de problème
 * @param {Object} alertes - L'objet alertesAtcd à valider
 */
function validerStructureAlertes(alertes) {
  for (const [cabinetId, listeAlertes] of Object.entries(alertes)) {
    if (!Array.isArray(listeAlertes)) {
      console.error(`❌ Cabinet ${cabinetId}: les alertes doivent être un tableau`);
      continue;
    }

    listeAlertes.forEach((alerte, index) => {
      const position = `Cabinet ${cabinetId}, Alerte #${index + 1}`;

      // Vérifier que c'est un objet
      if (typeof alerte !== 'object' || alerte === null) {
        console.error(`❌ ${position}: l'alerte doit être un objet`);
        return;
      }

      // Vérifier le champ obligatoire "titre"
      if (!('titre' in alerte)) {
        console.error(`❌ ${position}: champ obligatoire "titre" manquant`);
        return;
      }
      
      if (typeof alerte.titre !== 'string') {
        console.error(`❌ ${position}: "titre" doit être une chaîne de caractères`);
      }

      // Vérifier optionsCible si présent
      if (alerte.optionsCible !== undefined) {
        if (typeof alerte.optionsCible !== 'object' || alerte.optionsCible === null) {
          console.error(`❌ ${position} (${alerte.titre}): "optionsCible" doit être un objet`);
        } else {
          const { cible, coloration, icone, texteSurvol } = alerte.optionsCible;
          
          if (cible !== undefined && typeof cible !== 'string') {
            console.error(`❌ ${position} (${alerte.titre}): optionsCible.cible doit être une chaîne de caractères`);
          } else if (cible !== undefined && !['atcd', 'etatCivil'].includes(cible)) {
            console.error(`❌ ${position} (${alerte.titre}): optionsCible.cible ne peut être que "atcd" ou "etatCivil" (pour l'instant)`);
          }
          
          if (coloration !== undefined && typeof coloration !== 'boolean' && typeof coloration !== 'string') {
            console.error(`❌ ${position} (${alerte.titre}): optionsCible.coloration doit être un booléen ou une chaîne (couleur CSS)`);
          }
          
          if (icone !== undefined && typeof icone !== 'string') {
            console.error(`❌ ${position} (${alerte.titre}): optionsCible.icone doit être une chaîne de caractères`);
          }
          
          if (texteSurvol !== undefined && typeof texteSurvol !== 'string') {
            console.error(`❌ ${position} (${alerte.titre}): optionsCible.texteSurvol doit être une chaîne de caractères`);
          }
        }
      }

      // Vérifier alerteWeda si présent
      if (alerte.alerteWeda !== undefined) {
        if (typeof alerte.alerteWeda !== 'object' || alerte.alerteWeda === null) {
          console.error(`❌ ${position} (${alerte.titre}): "alerteWeda" doit être un objet`);
        } else {
          const { icone, typeAlerte, dureeAlerte, texteAlerte } = alerte.alerteWeda;
          
          if (icone !== undefined && typeof icone !== 'string') {
            console.error(`❌ ${position} (${alerte.titre}): alerteWeda.icone doit être une chaîne de caractères`);
          }
          
          if (typeAlerte !== undefined && typeof typeAlerte !== 'string') {
            console.error(`❌ ${position} (${alerte.titre}): alerteWeda.typeAlerte doit être une chaîne de caractères`);
          }
          
          if (dureeAlerte !== undefined && typeof dureeAlerte !== 'number') {
            console.error(`❌ ${position} (${alerte.titre}): alerteWeda.dureeAlerte doit être un nombre`);
          }
          
          if (texteAlerte !== undefined && typeof texteAlerte !== 'string') {
            console.error(`❌ ${position} (${alerte.titre}): alerteWeda.texteAlerte doit être une chaîne de caractères`);
          }
        }
      }

      // Vérifier conditions si présent
      if (alerte.conditions !== undefined) {
        if (typeof alerte.conditions !== 'object' || alerte.conditions === null) {
          console.error(`❌ ${position} (${alerte.titre}): "conditions" doit être un objet`);
        } else {
          const { ageMin, ageMax, sexes, dateDebut, dateFin, motsCles } = alerte.conditions;
          
          if (ageMin !== undefined && ageMin !== null && typeof ageMin !== 'number') {
            console.error(`❌ ${position} (${alerte.titre}): conditions.ageMin doit être un nombre ou null`);
          }
          
          if (ageMax !== undefined && ageMax !== null && typeof ageMax !== 'number') {
            console.error(`❌ ${position} (${alerte.titre}): conditions.ageMax doit être un nombre ou null`);
          }
          
          if (sexes !== undefined && sexes !== null && typeof sexes !== 'string') {
            console.error(`❌ ${position} (${alerte.titre}): conditions.sexes doit être une chaîne de caractères ou null`);
          } else if (typeof sexes === 'string' && !['F', 'M', 'N'].includes(sexes)) {
            console.error(`❌ ${position} (${alerte.titre}): conditions.sexes doit être "F", "M" ou "N"`);
          }
          
          if (dateDebut !== undefined && dateDebut !== null && typeof dateDebut !== 'string') {
            console.error(`❌ ${position} (${alerte.titre}): conditions.dateDebut doit être une chaîne de caractères (format DD/MM/YYYY) ou null`);
          }
          
          if (dateFin !== undefined && dateFin !== null && typeof dateFin !== 'string') {
            console.error(`❌ ${position} (${alerte.titre}): conditions.dateFin doit être une chaîne de caractères (format DD/MM/YYYY) ou null`);
          }
          
          if (motsCles !== undefined && !Array.isArray(motsCles)) {
            console.error(`❌ ${position} (${alerte.titre}): conditions.motsCles doit être un tableau`);
          } else if (Array.isArray(motsCles)) {
            motsCles.forEach((mot, i) => {
              if (typeof mot !== 'string') {
                console.error(`❌ ${position} (${alerte.titre}): conditions.motsCles[${i}] doit être une chaîne de caractères`);
              }
            });
          }
        }
      }
    });
  }

  console.log('✅ Validation des alertes terminée');
}

validerStructureAlertes(alertesAtcdGlobal);

// Test en environnement Node.js
if (typeof require !== 'undefined' && require.main === module) {
  // afficher l'ensemble de la structure pour vérification visuelle avec coloration
  console.dir(alertesAtcdGlobal, { depth: null, colors: true });
  return;
}



// Gestion des alertes Antécédents
// Cette partie charge les alertes configurées dans alertesAtcd.js pour le cabinet
// et affiche des alertes contextuelles selon les ATCD du patient
addTweak('/FolderMedical/PatientViewForm.aspx', 'alertesAtcdOption', async function () {
    const panelSelector = "#ContentPlaceHolder1_PanelPatient"
    const panelElement = document.querySelector(panelSelector);
    if (!panelElement) return;
    const atcdDiv = Array.from(panelElement.querySelectorAll('div')).find(div => div.title === "Cliquez ici pour modifier le volet médical du patient");
    if (!atcdDiv) return;

    // Récupération des informations patient via l'API
    const patientId = getCurrentPatientId();
    const patientApiData = patientId ? await getPatientInfo(patientId) : null;
    
    const patientInfo = (function() {
        let age = null;
        let sexe = null;
        
        if (patientApiData) {
            // Récupérer le sexe depuis l'API
            sexe = patientApiData.sex; // "M" ou "F"
            
            // Calculer l'âge depuis la date de naissance
            if (patientApiData.birthDate) {
                const birthDate = new Date(patientApiData.birthDate);
                const today = new Date();
                age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }
            }
        }
        
        // Date actuelle
        const dateActuelle = new Date();
        
        console.log('[alertesAtcd] Infos patient - Age:', age, 'Sexe:', sexe, 'Date:', dateActuelle.toLocaleDateString('fr-FR'));
        return { age, sexe, dateActuelle };
    })();

    // Fonction pour vérifier si les conditions d'une alerte sont remplies
    function verifierConditions(conditions) {
        if (!conditions) return true;
        
        // Vérifier ageMin et ageMax
        if (conditions.ageMin !== undefined && conditions.ageMin !== null && patientInfo.age !== null) {
            if (patientInfo.age < conditions.ageMin) {
                console.log('[alertesAtcd] Condition ageMin non remplie:', patientInfo.age, '<', conditions.ageMin);
                return false;
            }
        }
        
        if (conditions.ageMax !== undefined && conditions.ageMax !== null && patientInfo.age !== null) {
            if (patientInfo.age > conditions.ageMax) {
                console.log('[alertesAtcd] Condition ageMax non remplie:', patientInfo.age, '>', conditions.ageMax);
                return false;
            }
        }
        
        // Vérifier sexes
        if (conditions.sexes && patientInfo.sexe !== null) {
            // Gestion spéciale pour 'N' (neutre) qui accepte tous les sexes
            if (conditions.sexes !== 'N' && patientInfo.sexe !== conditions.sexes) {
                console.log('[alertesAtcd] Condition sexes non remplie:', patientInfo.sexe, '!=', conditions.sexes);
                return false;
            }
        }
        
        // Vérifier dateDebut et dateFin
        if (conditions.dateDebut || conditions.dateFin) {
            const dateActuelle = patientInfo.dateActuelle;
            
            // Parser les dates au format DD/MM/YYYY
            const parseDate = (dateStr) => {
                if (!dateStr) return null;
                const parts = dateStr.split('/');
                if (parts.length !== 3) return null;
                return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            };
            
            const debut = parseDate(conditions.dateDebut);
            const fin = parseDate(conditions.dateFin);
            
            if (debut && dateActuelle < debut) {
                console.log('[alertesAtcd] Condition dateDebut non remplie: date actuelle avant début');
                return false;
            }
            if (fin && dateActuelle > fin) {
                console.log('[alertesAtcd] Condition dateFin non remplie: date actuelle après fin');
                return false;
            }
        }
        
        return true;
    }

    // Récupération des alertes du cabinet/Pôle depuis alertesAtcd.js
    const cabinetId = await (async function() {
        // On vérifie que l'option alertesAtcdOptionGlobal est true
        const alertesAtcdOptionGlobal = await getOptionPromise('alertesAtcdOptionGlobal');
        if (!alertesAtcdOptionGlobal) return null;
        const cabinetElement = document.querySelector('#LinkButtonUserLog');
        if (!cabinetElement) return null;
        const cabinetInfoLines = cabinetElement.title.split('\n');
        for (let line of cabinetInfoLines) {
            if (line.startsWith('CabinetID : ')) {
                return line.replace('CabinetID : ', '').trim();
            }
        }
        return null;
    })();
    
    console.log('[alertesAtcd] cabinetId', cabinetId);
    
    // Récupération des alertes personnalisées de l'utilisateur (JSON direct = tableau d'alertes)
    const alertesPersonnalisees = await (async function() {
        try {
            const alertesAtcdOptionValue = await getOptionPromise('alertesAtcdOption');
            if (!alertesAtcdOptionValue) return [];
            
            // Parser le JSON - doit être directement un tableau d'alertes
            const alertesParsed = JSON.parse(alertesAtcdOptionValue);
            
            if (Array.isArray(alertesParsed)) {
                return alertesParsed;
            } else {
                console.warn('[alertesAtcd] Format inattendu pour alertesAtcdOption, tableau attendu');
                return [];
            }
        } catch (error) {
            console.error('[alertesAtcd] Erreur lors du parsing des alertes personnalisées:', error);
            return [];
        }
    })();
    
    // Récupération des alertes globales du cabinet
    const alertesGlobales = [];
    if (cabinetId && typeof alertesAtcdGlobal !== 'undefined' && alertesAtcdGlobal[cabinetId]) {
        alertesGlobales.push(...alertesAtcdGlobal[cabinetId]);
    }
    
    // Fusion des alertes : les alertes personnalisées en premier, puis les globales
    // Cela permet aux alertes personnalisées d'avoir la priorité si nécessaire
    let toutesLesAlertes = [...alertesPersonnalisees, ...alertesGlobales];
    
    console.log('[alertesAtcd] Alertes personnalisées:', alertesPersonnalisees.length);
    console.log('[alertesAtcd] Alertes du cabinet:', alertesGlobales.length);
    console.log('[alertesAtcd] Total des alertes actives', toutesLesAlertes.length);

    if (toutesLesAlertes.length === 0) {
        console.log('[alertesAtcd] Aucune alerte configurée');
        return;
    }

    // Récupération des options de sous-affichage
    const afficherPopup = await getOptionPromise('alertesAtcdOptionGlobalPopup');
    const afficherMarquage = await getOptionPromise('alertesAtcdOptionGlobalLocalMarking');
    
    console.log('[alertesAtcd] Options d\'affichage - Popup:', afficherPopup, 'Marquage:', afficherMarquage);

    // Liste de tous les span du panel
    const spanElements = atcdDiv.querySelectorAll('span');
    
    // Map pour éviter d'afficher plusieurs fois la même alerte sur le même élément
    const alertesAffichees = new Map();
    
    // Set pour tracer les alertes ayant déjà envoyé une notification
    const notificationsEnvoyees = new Set();

    spanElements.forEach(spanElement => {
        const spanText = spanElement.textContent.toLowerCase();
        
        // Vérifier chaque alerte
        toutesLesAlertes.forEach(alert => {
            // Vérifier que la cible est "atcd" (ou non définie pour rétrocompatibilité)
            const cible = alert.optionsCible?.cible;
            if (cible && cible !== 'atcd') {
                return; // Cette alerte ne s'applique pas aux antécédents
            }

            // Vérifier les conditions (âge, sexe, période)
            if (!verifierConditions(alert.conditions)) {
                return; // Les conditions ne sont pas remplies
            }

            // Récupérer les mots-clés depuis conditions
            const motsCles = alert.conditions?.motsCles || [];
            
            motsCles.forEach(motCle => {
                const motCleLower = motCle.toLowerCase();
                if (spanText.includes(motCleLower)) {
                    console.log('[alertesAtcd] Alerte validée pour :', alert.titre, 'avec les caractéristiques', alert, 'mot-clé trouvé:', motCle);                    
                    // Clé unique pour éviter les doublons
                    const cleElement = spanElement.textContent + alert.titre;
                    if (alertesAffichees.has(cleElement)) return;
                    alertesAffichees.set(cleElement, true);

                    // Déterminer si l'alerte provient des alertes globales ou personnalisées
                    const estAlerteGlobale = alertesGlobales.includes(alert);
                    
                    // Afficher une notification si alerteWeda est présent avec texteAlerte
                    // ET si cette alerte n'a pas déjà envoyé de notification
                    // ET si l'option popup est activée (ou si c'est une alerte personnalisée)
                    if (alert.alerteWeda && alert.alerteWeda.texteAlerte && !notificationsEnvoyees.has(alert.titre)) {
                        const doitAfficherPopup = !estAlerteGlobale || afficherPopup;
                        
                        if (doitAfficherPopup) {
                            const iconeWeda = alert.alerteWeda.icone || 'warning';
                            const typeAlerte = alert.alerteWeda.typeAlerte || 'success';
                            const dureeAlerte = alert.alerteWeda.dureeAlerte ? alert.alerteWeda.dureeAlerte * 1000 : 10000;
                            
                            console.log('[alertesAtcd] Envoi de la notification pour l\'alerte:', alert.titre, 'mot-clé:', motCle, "icône:", iconeWeda);
                            sendWedaNotifAllTabs({
                                message: alert.alerteWeda.texteAlerte,
                                type: typeAlerte,
                                duration: dureeAlerte,
                                icon: iconeWeda,
                            });
                        }
                        
                        // Marquer cette alerte comme ayant envoyé une notification
                        notificationsEnvoyees.add(alert.titre);
                    }

                    // Appliquer le marquage visuel si l'option est activée (ou si c'est une alerte personnalisée)
                    const doitAfficherMarquage = !estAlerteGlobale || afficherMarquage;
                    
                    if (doitAfficherMarquage) {
                        // Appliquer la coloration si le flag est activé dans optionsCible
                        const coloration = alert.optionsCible?.coloration;
                        if (coloration) {
                            if (typeof coloration === 'string') {
                                // Si c'est une couleur CSS spécifique
                                spanElement.style.color = coloration;
                            } else if (coloration === true) {
                                // Si c'est un booléen true, utiliser vert par défaut
                                spanElement.style.color = 'green';
                            }
                            spanElement.style.fontWeight = 'bold';
                        }

                        // Ajouter une icône si définie dans optionsCible
                        const icone = alert.optionsCible?.icone;
                        if (icone) {
                            const iconElement = document.createElement('span');
                            iconElement.className = 'material-icons';
                            iconElement.textContent = icone;
                            iconElement.style.fontSize = '16px';
                            iconElement.style.verticalAlign = 'middle';
                            iconElement.style.marginLeft = '4px';
                            spanElement.appendChild(iconElement);
                        }

                        // Ajouter un tooltip avec texteSurvol
                        const texteSurvol = alert.optionsCible?.texteSurvol;
                        if (texteSurvol) {
                            spanElement.title = texteSurvol;
                        }
                    }
                }
            });
        });
    });
});
