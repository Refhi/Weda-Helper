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
  4341: [
    {
      titre: "Atelier diabète",
      coloration: true,
      alerte: true,
      matIcon: "diversity_3",
      longDescription: "Un atelier Diabète peut être proposé à ce patient dans le cadre des ETP. Vous pouvez aller dans les conseils de prescription ou imprimer un Flyer depuis les documents du cabinet",
      motsCles: ["diabète"]
    },
    {
      titre: "Atelier alimentation",
      coloration: true,
      alerte: false,
      matIcon: "diversity_3",
      longDescription: "Un atelier Alimentation peut être proposé à ce patient dans le cadre des ETP. Vous pouvez aller dans les conseils de prescription ou imprimer un Flyer depuis les documents du cabinet",
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
    },
    {
      titre: "Atelier traitement CV",
      coloration: true,
      alerte: true,
      matIcon: "diversity_3",
      longDescription: "Un atelier Maladies Cardiovasculaires peut être proposé à ce patient dans le cadre des ETP. Vous pouvez aller dans les conseils de prescription ou imprimer un Flyer depuis les documents du cabinet",
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
  ]
};



/**
 * Vérifie la structure des alertes et affiche des avertissements en console en cas de problème
 * @param {Object} alertes - L'objet alertesAtcd à valider
 */
function validerStructureAlertes(alertes) {
  const champsObligatoires = ['titre', 'coloration', 'alerte', 'matIcon', 'longDescription', 'motsCles'];
  
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
      
      // Vérifier tous les champs obligatoires
      champsObligatoires.forEach(champ => {
        if (!(champ in alerte)) {
          console.error(`❌ ${position} (${alerte.titre || 'sans titre'}): champ manquant "${champ}"`);
        }
      });
      
      // Vérifier les types
      if (alerte.titre !== undefined && typeof alerte.titre !== 'string') {
        console.error(`❌ ${position}: "titre" doit être une chaîne de caractères`);
      }
      
      if (alerte.coloration !== undefined && typeof alerte.coloration !== 'boolean') {
        console.error(`❌ ${position} (${alerte.titre}): "coloration" doit être un booléen (true/false)`);
      }
      
      if (alerte.alerte !== undefined && typeof alerte.alerte !== 'boolean') {
        console.error(`❌ ${position} (${alerte.titre}): "alerte" doit être un booléen (true/false)`);
      }
      
      if (alerte.matIcon !== undefined && typeof alerte.matIcon !== 'string') {
        console.error(`❌ ${position} (${alerte.titre}): "matIcon" doit être une chaîne de caractères`);
      }
      
      if (alerte.longDescription !== undefined && typeof alerte.longDescription !== 'string') {
        console.error(`❌ ${position} (${alerte.titre}): "longDescription" doit être une chaîne de caractères`);
      }
      
      if (alerte.motsCles !== undefined && !Array.isArray(alerte.motsCles)) {
        console.error(`❌ ${position} (${alerte.titre}): "motsCles" doit être un tableau`);
      } else if (alerte.motsCles) {
        // Vérifier que tous les mots-clés sont des chaînes
        alerte.motsCles.forEach((mot, i) => {
          if (typeof mot !== 'string') {
            console.error(`❌ ${position} (${alerte.titre}): motsCles[${i}] doit être une chaîne de caractères`);
          }
        });
      }
    });
  }
  
  // console.log('✅ Validation des alertes terminée');
}

validerStructureAlertes(alertesAtcdGlobal);