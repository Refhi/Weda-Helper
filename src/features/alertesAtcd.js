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
 * ⚠️ NOTE: Le schéma de validation (alerteSchema) est défini dans background.js
 * et accessible via chrome.storage.local.get('alerteSchema').
 * Cela garantit une seule source de vérité pour la validation des alertes.
 */


const alertesAtcdGlobal = {
  "0000": [
    // Exemple d'alerte
    {
      titre: "Exemple d'alerte", // Titre non utilisé dans les alertes, permet de s'y retrouver
      optionsCible: {
        cible: "atcd", // peut être : "atcd", "etatCivil" et rien d'autre pour l'instant
        coloration: "red", // si non présent, l'antécédent n'est pas coloré. Sinon mettre nom couleur css (ex: "red", "yellow", "blue", etc.)
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
        coloration: "green",
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
        coloration: "green",
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
        coloration: "green",
        icone: "groups",
        texteSurvol: "Un atelier Maladies Cardiovasculaires peut être proposé à ce patient dans le cadre des ETP. Vous pouvez aller dans \"Courrier\" => \"Protocole ETP\" pour l'adressage."
      },
      alerteWeda: {
        icone: "groups",
        typeAlerte: "success",
        texteAlerte: "ETP Maladies CV possible, cf. Antécédents."
      },
      conditions: {
        dateFin: "31/12/2026",
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
 * Utilise le validateur mutualisé depuis alertes-validator.js
 * @param {Object} alertes - L'objet alertesAtcd à valider
 * @returns {Promise<void>}
 */
async function validerStructureAlertes(alertes) {
  const schema = await getAlerteSchema();

  if (!schema) {
    console.warn('⚠️ Schéma de validation non disponible, validation ignorée');
    return;
  }

  for (const [cabinetId, listeAlertes] of Object.entries(alertes)) {
    if (!Array.isArray(listeAlertes)) {
      console.error(`❌ Cabinet ${cabinetId}: les alertes doivent être un tableau`);
      continue;
    }

    // Utiliser la fonction de validation mutualisée
    const validation = validateAlertes(listeAlertes, schema);

    if (!validation.valid) {
      console.error(`❌ Erreurs de validation pour le cabinet ${cabinetId}:`);
      validation.errors.forEach(error => console.error(`  - ${error}`));
    } else {
      console.log(`✅ Cabinet ${cabinetId}: ${listeAlertes.length} alerte(s) valide(s)`);
    }
  }

  console.log('✅ Validation des alertes terminée');
}

// Valider les alertes globales de manière asynchrone
validerStructureAlertes(alertesAtcdGlobal).catch(err => {
  console.error('❌ Erreur lors de la validation des alertes:', err);
});





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

  const patientInfo = (function () {
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

  // Récupération des alertes du cabinet/Pôle depuis alertesAtcd.js
  const cabinetId = await (async function () {
    // On vérifie que l'option alertesAtcdOptionGlobal est true
    const alertesAtcdOptionGlobal = await getOptionPromise('alertesAtcdOptionGlobal');
    if (!alertesAtcdOptionGlobal) return null;
    const cabinetElement = document.querySelector('#LinkButtonUserLog');
    if (!cabinetElement) return null;
    const cabinetInfoLines = cabinetElement.title.split('\n');
    for (let line of cabinetInfoLines) {
      if (line.startsWith('CabinetID : ')) {
        const cabinetId = line.replace('CabinetID : ', '').trim();
        // On en profite pour enregistrer l'info dans le storage local pour d'autres usages
        await chrome.storage.local.set({ currentCabinetId: cabinetId });
        return cabinetId;
      }
    }
    return null;
  })();

  console.log('[alertesAtcd] cabinetId', cabinetId);

  // Récupération des alertes personnalisées de l'utilisateur (JSON direct = tableau d'alertes)
  const alertesPersonnalisees = await (async function () {
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

  // Récupération de toutes les cibles potentielles (spans ATCD)
  const spanElements = Array.from(atcdDiv.querySelectorAll('span'));
  const ciblesPotentielles = spanElements.map(spanElement => ({
    element: spanElement,
    text: spanElement.textContent.toLowerCase(),
    type: 'atcd'
  }));

  console.log(`[alertesAtcd] ${ciblesPotentielles.length} cible(s) ATCD potentielle(s) trouvée(s)`);

  // Récupération de la cible État Civil unique
  const etatCivilDiv = document.querySelector('#ContentPlaceHolder1_EtatCivilUCForm1_LabelPatientNom').parentElement;
  if (etatCivilDiv) {
    ciblesPotentielles.push({
      element: etatCivilDiv,
      text: etatCivilDiv.textContent.toLowerCase(),
      type: 'etatCivil'
    });
    console.log('[alertesAtcd] Cible État Civil trouvée');
  } else {
    console.log('[alertesAtcd] Élément État Civil non trouvé');
  }

  console.log(`[alertesAtcd] ${ciblesPotentielles.length} cible(s) potentielle(s) TOTAL trouvée(s)`);

  // Set pour tracer les alertes ayant déjà envoyé une notification
  const notificationsEnvoyees = new Set();

  // Map pour éviter d'afficher plusieurs fois la même alerte sur le même élément
  const alertesAffichees = new Map();

  // Parcourir chaque alerte et vérifier les conditions de filtrage
  toutesLesAlertes.forEach(alert => {
    // Vérifier que la cible correspond (ou non définie pour rétrocompatibilité = "atcd")
    const cible = alert.optionsCible?.cible || 'atcd';
    
    // Filtrer les cibles potentielles selon le type de cible de l'alerte
    const ciblesFiltrées = ciblesPotentielles.filter(c => c.type === cible);
    
    if (ciblesFiltrées.length === 0) {
      console.log(`[alertesAtcd] ${alert.titre} : Exclue (aucune cible de type "${cible}" disponible)`);
      return;
    }

    // ÉTAPE 1 : Vérifier les dates
    if (alert.conditions?.dateDebut || alert.conditions?.dateFin) {
      const dateActuelle = patientInfo.dateActuelle;
      const parseDate = (dateStr) => {
        if (!dateStr) return null;
        const parts = dateStr.split('/');
        if (parts.length !== 3) return null;
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      };

      const debut = parseDate(alert.conditions.dateDebut);
      const fin = parseDate(alert.conditions.dateFin);

      if (debut && dateActuelle < debut) {
        console.log(`[alertesAtcd] ${alert.titre} : Exclue (date actuelle avant début)`);
        return;
      }
      if (fin && dateActuelle > fin) {
        console.log(`[alertesAtcd] ${alert.titre} : Exclue (date actuelle après fin)`);
        return;
      }
    }

    // ÉTAPE 2 : Vérifier le sexe
    if (alert.conditions?.sexes && patientInfo.sexe !== null) {
      if (alert.conditions.sexes !== 'N' && patientInfo.sexe !== alert.conditions.sexes) {
        console.log(`[alertesAtcd] ${alert.titre} : Exclue (sexe=${patientInfo.sexe}, attendu=${alert.conditions.sexes})`);
        return;
      }
    }

    // ÉTAPE 3 : Vérifier l'âge
    if (alert.conditions?.ageMin !== undefined && alert.conditions?.ageMin !== null && patientInfo.age !== null) {
      if (patientInfo.age < alert.conditions.ageMin) {
        console.log(`[alertesAtcd] ${alert.titre} : Exclue (âge=${patientInfo.age} < min=${alert.conditions.ageMin})`);
        return;
      }
    }
    if (alert.conditions?.ageMax !== undefined && alert.conditions?.ageMax !== null && patientInfo.age !== null) {
      if (patientInfo.age > alert.conditions.ageMax) {
        console.log(`[alertesAtcd] ${alert.titre} : Exclue (âge=${patientInfo.age} > max=${alert.conditions.ageMax})`);
        return;
      }
    }

    // Déterminer si l'alerte provient des alertes globales ou personnalisées
    const estAlerteGlobale = alertesGlobales.includes(alert);

    // Pour les alertes État Civil : validation complète (pas de recherche de mots-clés)
    if (cible === 'etatCivil') {
      console.log(`[alertesAtcd] ${alert.titre} : Validée (État Civil)`);
      
      // Utiliser la première cible disponible pour État Civil
      const cibleCorrespondante = { cible: ciblesFiltrées[0].element, motCle: null };
      appliquerAlerteAuxElements(alert, cibleCorrespondante, estAlerteGlobale, afficherPopup, afficherMarquage, alertesAffichees, notificationsEnvoyees);
      return;
    }

    // Pour les alertes ATCD : vérifier les mots-clés (ÉTAPE 4)
    const motsCles = alert.conditions?.motsCles || [];
    if (motsCles.length === 0) {
      console.log(`[alertesAtcd] ${alert.titre} : Exclue (aucun mot-clé défini)`);
      return;
    }

    let cibleCorrespondante = null;

    // Chercher la première correspondance de mot-clé dans les cibles potentielles
    rechercheMotCle:
    for (const motCle of motsCles) {
      const motCleLower = motCle.toLowerCase();
      for (const ciblePotentielle of ciblesFiltrées) {
        if (ciblePotentielle.text.includes(motCleLower)) {
          const cleElement = ciblePotentielle.element.textContent + alert.titre;
          if (!alertesAffichees.has(cleElement)) {
            cibleCorrespondante = { cible: ciblePotentielle.element, motCle };
            break rechercheMotCle; // Sortir des deux boucles dès la première correspondance trouvée
          }
        }
      }
    }

    if (!cibleCorrespondante) {
      console.log(`[alertesAtcd] ${alert.titre} : Exclue (aucun mot-clé trouvé dans le texte)`);
      return;
    }

    // L'alerte est validée - appliquer les actions
    console.log(`[alertesAtcd] ${alert.titre} : Validée (1 correspondance appliquée)`);

    appliquerAlerteAuxElements(alert, cibleCorrespondante, estAlerteGlobale, afficherPopup, afficherMarquage, alertesAffichees, notificationsEnvoyees);
  });
});

/**
 * Applique une alerte validée à un élément
 * @param {Object} alert - L'alerte validée
 * @param {Object} cibleCorrespondante - L'élément cible
 * @param {boolean} estAlerteGlobale - Si l'alerte vient des alertes globales
 * @param {boolean} afficherPopup - Option pour afficher la popup
 * @param {boolean} afficherMarquage - Option pour afficher le marquage
 * @param {Map} alertesAffichees - Map pour éviter les doublons
 * @param {Set} notificationsEnvoyees - Set des notifications déjà envoyées
 */
function appliquerAlerteAuxElements(alert, cibleCorrespondante, estAlerteGlobale, afficherPopup, afficherMarquage, alertesAffichees, notificationsEnvoyees) {
  // Afficher une notification si alerteWeda est présent avec texteAlerte
  if (alert.alerteWeda && alert.alerteWeda.texteAlerte && !notificationsEnvoyees.has(alert.titre)) {
    const doitAfficherPopup = !estAlerteGlobale || afficherPopup;

    if (doitAfficherPopup) {
      const iconeWeda = alert.alerteWeda.icone || 'warning';
      const typeAlerte = alert.alerteWeda.typeAlerte || 'success';
      const dureeAlerte = alert.alerteWeda.dureeAlerte ? alert.alerteWeda.dureeAlerte * 1000 : 10000;

      sendWedaNotif({
        message: alert.alerteWeda.texteAlerte,
        type: typeAlerte,
        duration: dureeAlerte,
        icon: iconeWeda,
      });
    }

    notificationsEnvoyees.add(alert.titre);
  }

  // Appliquer le marquage visuel sur la cible correspondante (une seule)
  const doitAfficherMarquage = !estAlerteGlobale || afficherMarquage;

  if (doitAfficherMarquage && cibleCorrespondante) {
    const spanElement = cibleCorrespondante.cible;
    const cleElement = spanElement.textContent + alert.titre;
    
    if (!alertesAffichees.has(cleElement)) {
      alertesAffichees.set(cleElement, true);

      // Appliquer la coloration si le flag est activé dans optionsCible
      const coloration = alert.optionsCible?.coloration;
      if (coloration) {
        if (typeof coloration === 'string') {
          spanElement.style.color = coloration;
        } else if (coloration === true) {
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

      // Ajouter une icône de point d'interrogation avec tooltip instantané
      const texteSurvol = alert.optionsCible?.texteSurvol;
      if (texteSurvol) {
        // Créer l'icône de point d'interrogation
        const helpIcon = document.createElement('span');
        helpIcon.className = 'material-icons';
        helpIcon.textContent = 'help_outline';
        helpIcon.style.fontSize = '16px';
        helpIcon.style.verticalAlign = 'middle';
        helpIcon.style.marginLeft = '4px';
        helpIcon.style.cursor = 'pointer';
        helpIcon.style.color = '#1976d2';
        helpIcon.style.position = 'relative';

        // Créer le tooltip
        const tooltip = document.createElement('div');
        tooltip.textContent = texteSurvol;
        tooltip.style.position = 'absolute';
        tooltip.style.left = '100%';
        tooltip.style.bottom = '100%';
        tooltip.style.marginLeft = '8px';
        tooltip.style.marginBottom = '4px';
        tooltip.style.backgroundColor = '#ffffff';
        tooltip.style.color = '#000000';
        tooltip.style.padding = '8px 12px';
        tooltip.style.borderRadius = '4px';
        tooltip.style.border = '1px solid #ccc';
        tooltip.style.fontSize = '13px';
        tooltip.style.fontFamily = 'Arial, sans-serif';
        tooltip.style.maxWidth = '300px';
        tooltip.style.width = 'max-content';
        tooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        tooltip.style.zIndex = '10000';
        tooltip.style.display = 'none';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.whiteSpace = 'normal';
        tooltip.style.lineHeight = '1.4';

        // Ajouter les gestionnaires d'événements pour affichage instantané
        helpIcon.addEventListener('mouseenter', () => {
          tooltip.style.display = 'block';
        });
        
        helpIcon.addEventListener('mouseleave', () => {
          tooltip.style.display = 'none';
        });

        helpIcon.appendChild(tooltip);
        spanElement.appendChild(helpIcon);
      }
    }
  }
}
