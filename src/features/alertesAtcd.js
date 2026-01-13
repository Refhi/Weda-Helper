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


const alertesAtcdGlobal = {
  1000: [
    // Exemple d'alerte
    {
      titre: "Exemple d'alerte", // Titre non utilisé dans les alertes, permet de s'y retrouver
      optionsCible: {
        cible: "atcd", // peut être : "atcd", "etatcivil" et rien d’autre pour l'instant
        coloration: false, // si false, l'antécédent n'est pas coloré. Sinon mettre nom couleur css (ex: "red", "yellow", "blue", etc.)
        icone: "warning", // icône Material à afficher à côté de l'antécédent
        texteSurvol: "..." // Le texte affiché lors du survol de la cible
      },
      alerteWeda: { // Configuration de l'alerte WEDA
        icone: "info", // L'icône Material affichée dans l'alerte
        typeAlerte: "success", // success / fail / undefined (success met en vert, undefined en bleu, fail en rouge sans limite de temps)
        dureeAlerte: 10, // Durée d'affichage de l'alerte en secondes (0 = jusqu'à fermeture manuelle)
        texteAlerte: "...",
        prioritaire: false,  // ou estPrioritaire
        descriptionDetaillee: "..."  // optionnel, détails étendus
      },
      conditions: {
        trancheAge: null,
        sexes: null,
        periodeDates: null,
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
        icone: "groups"
      },
      alerteWeda: {
        icone: "groups",
        typeAlerte: "success",
        texteAlerte: "ETP Diabète possible, cf. Antécédents.",
        prioritaire: true,
        descriptionDetaillee: "Un atelier Diabète peut être proposé à ce patient dans le cadre des ETP. Vous pouvez aller dans \"Courrier\" => \"Protocole ETP\" pour l'adressage."
      },
      conditions: {
        trancheAge: [18, 99],
        sexes: ["M", "F"],
        periodeDates: null,
        motsCles: ["diabète"]
      }
    },
    {
      titre: "Atelier alimentation",
      optionsCible: {
        cible: "atcd",
        coloration: true,
        icone: "groups"
      },
      alerteWeda: {
        icone: "groups",
        typeAlerte: "success",
        prioritaire: false,
        descriptionDetaillee: "Un atelier Alimentation peut être proposé à ce patient dans le cadre des ETP. Vous pouvez aller dans \"Courrier\" => \"Protocole ETP\" pour l'adressage."
      },
      conditions: {
        periodeDates: [null, "31/12/2099"],
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
        icone: "groups"
      },
      alerteWeda: {
        icone: "groups",
        typeAlerte: "success",
        prioritaire: true,
        descriptionDetaillee: "Un atelier Maladies Cardiovasculaires peut être proposé à ce patient dans le cadre des ETP. Vous pouvez aller dans \"Courrier\" => \"Protocole ETP\" pour l'adressage."
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
          } else if (cible !== undefined && !['atcd', 'etatcivil'].includes(cible)) {
            console.error(`❌ ${position} (${alerte.titre}): optionsCible.cible ne peut être que "atcd" ou "etatcivil" (pour l'instant)`);
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
          const { icone, typeAlerte, dureeAlerte, texteAlerte, prioritaire, estPrioritaire, descriptionDetaillee } = alerte.alerteWeda;
          
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
          
          if (prioritaire !== undefined && typeof prioritaire !== 'boolean') {
            console.error(`❌ ${position} (${alerte.titre}): alerteWeda.prioritaire doit être un booléen`);
          }
          
          if (estPrioritaire !== undefined && typeof estPrioritaire !== 'boolean') {
            console.error(`❌ ${position} (${alerte.titre}): alerteWeda.estPrioritaire doit être un booléen`);
          }
          
          if (descriptionDetaillee !== undefined && typeof descriptionDetaillee !== 'string') {
            console.error(`❌ ${position} (${alerte.titre}): alerteWeda.descriptionDetaillee doit être une chaîne de caractères`);
          }
        }
      }

      // Vérifier conditions si présent
      if (alerte.conditions !== undefined) {
        if (typeof alerte.conditions !== 'object' || alerte.conditions === null) {
          console.error(`❌ ${position} (${alerte.titre}): "conditions" doit être un objet`);
        } else {
          const { trancheAge, sexes, periodeDates, motsCles } = alerte.conditions;
          
          if (trancheAge !== undefined && trancheAge !== null && !Array.isArray(trancheAge)) {
            console.error(`❌ ${position} (${alerte.titre}): conditions.trancheAge doit être un tableau ou null`);
          } else if (Array.isArray(trancheAge) && trancheAge.length !== 2) {
            console.error(`❌ ${position} (${alerte.titre}): conditions.trancheAge doit contenir exactement 2 éléments [min, max]`);
          }
          
          if (sexes !== undefined && sexes !== null && !Array.isArray(sexes)) {
            console.error(`❌ ${position} (${alerte.titre}): conditions.sexes doit être un tableau ou null`);
          } else if (Array.isArray(sexes)) {
            sexes.forEach((sex, i) => {
              if (typeof sex !== 'string') {
                console.error(`❌ ${position} (${alerte.titre}): conditions.sexes[${i}] doit être une chaîne de caractères`);
              }
            });
          }
          
          if (periodeDates !== undefined && periodeDates !== null && !Array.isArray(periodeDates)) {
            console.error(`❌ ${position} (${alerte.titre}): conditions.periodeDates doit être un tableau ou null`);
          } else if (Array.isArray(periodeDates) && periodeDates.length !== 2) {
            console.error(`❌ ${position} (${alerte.titre}): conditions.periodeDates doit contenir exactement 2 éléments [début, fin]`);
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

  // console.log('✅ Validation des alertes terminée');
}

validerStructureAlertes(alertesAtcdGlobal);

// Test en environnement Node.js
if (typeof require !== 'undefined' && require.main === module) {
  // afficher l'ensemble de la structure pour vérification visuelle avec coloration
  console.dir(alertesAtcdGlobal, { depth: null, colors: true });
}