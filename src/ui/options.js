/**
 * @file options.js
 * @description Interface de configuration complète de l'extension.
 * Gère l'affichage et la modification de toutes les options (avancées et raccourcis),
 * avec support des sous-options, validation, import/export et recherche.
 * 
 * TODO (Point 5): Refactoriser ce fichier en modules séparés pour améliorer la maintenabilité:
 *   - options-ui.js : Génération de l'interface (traverseOptions, createInput, etc.)
 *   - options-save.js : Logique de sauvegarde (collectCurrentValues, saveOptions)
 *   - options-import-export.js : Import/export JSON
 *   - options-search.js : Fonctionnalité de recherche
 *   - options-init.js : Initialisation et événements
 *   Les charger dynamiquement comme alertes-validator.js et alert-editor-modal.js
 * 
 * @exports traverseOptions - Parcourt les options récursivement
 * @exports generateOptionsPage - Génère l'interface des options
 * @exports saveOptions - Sauvegarde les options modifiées
 * @exports loadOptions - Charge les options depuis le storage
 * 
 * @requires storage.js (getOption)
 * @requires background.js (advancedDefaultSettings, defaultShortcuts)
 * @requires alertes-validator.js (validateProperty, validateAlertes, getAlerteSchema)
 */

// Charger le validateur d'alertes dynamiquement
(function loadValidator() {
  const script = document.createElement('script');
  script.src = '../utils/alertes-validator.js';
  script.onerror = () => console.error('❌ Erreur de chargement du validateur d\'alertes');
  document.head.appendChild(script);
})();

// Charger l'éditeur modal d'alertes dynamiquement
(function loadAlertEditor() {
  const script = document.createElement('script');
  script.src = 'alert-editor-modal.js';
  script.onerror = () => console.error('❌ Erreur de chargement de l\'éditeur d\'alertes');
  document.head.appendChild(script);
})();

// // --------- Page de gestion des options de l'extension----------
// L'ajout et la modification d'options existantes se fait dans le fichier background.js
// => variables advancedDefaultSettings et defaultShortcuts

/**
 * Formate un JSON de manière lisible avec indentation
 * @param {string} jsonString - Chaîne JSON à formater
 * @returns {string} JSON formaté ou chaîne originale en cas d'erreur
 */
function formatJsonPretty(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    return JSON.stringify(parsed, null, 2);
  } catch (e) {
    return jsonString;
  }
}

/**
 * Note: Les fonctions de validation des alertes (validateProperty, validateAlertes)
 * sont maintenant dans src/utils/alertes-validator.js pour être partagées
 * entre options.js et alertesAtcd.js
 * 
 * La fonction openAlertEditorModal() est dans alert-editor-modal.js
 * et sera appelée automatiquement par le bouton "✏️ Assistant"
 */

/**
 * Traverse les options, sous-options et sous-sections d'un ensemble de paramètres et applique une fonction de rappel à chaque option.
 * @param {Array} settings - La liste des catégories de paramètres.
 * @param {Function} callback - La fonction de rappel à appliquer à chaque option.
 * Utilise la variable advancedDefaultSettings présente dans le fichier background.js
 */
function parseSettings(settings, callback) {
  function traverse(options, level, isSubOption = false) {
    options.forEach(option => {
      option.level = level;
      option.isSubOption = isSubOption;
      // console.log(`Option: ${option.name}, Niveau: ${option.level}, Sous-option: ${option.isSubOption}`);
      callback(option);
      if (option.subOptions) {
        traverse(option.subOptions, level + 1, true);
      }
    });
  }

  function traverseSections(sections, level) {
    console.log('traverseSections', sections, level);
    sections.forEach(section => {
      section.level = level;
      section.isSubOption = false;
      // console.log(`Section: ${section.name}, Niveau: ${section.level}`);
      callback(section);
      if (section.options) {
        traverse(section.options, level + 1);
      }
      if (section.sections) {
        traverseSections(section.sections, level + 1);
      }
    });
  }

  settings.forEach(category => {
    category.level = 0;
    category.isSubOption = false;
    // console.log(`Catégorie: ${category.name}, Niveau: ${category.level}`);
    callback(category);
    if (category.options) {
      traverse(category.options, 1);
    }
    if (category.sections) {
      traverseSections(category.sections, 1);
    }
  });
}

// // Options hors raccourcis
// 0 - Gestion de la Beta
// ici nous ajoutons un message spécifique pour les utilisateurs de la version Beta
const isTestVersion = chrome.runtime.id !== 'dbdodecalholckdneehnejnipbgalami'; // ID de la version stable
if (isTestVersion) {
  const betaPlaceholder = document.getElementById('betaPlaceHolder');
  const betaMessage = document.createElement('div');
  betaMessage.style.border = '2px solid red';
  betaMessage.style.padding = '10px';
  betaMessage.style.marginBottom = '15px';
  betaMessage.innerHTML = `
    <strong>⚠️ Vous utilisez une version de test (Beta) de Weda-Helper. Certaines fonctionnalités peuvent être instables ou en cours de développement. Merci de votre compréhension ! ⚠️</strong>
    <br> allez en bas de la page pour pouvoir exporter et importer vos paramètres depuis la version stable si besoin.
  `;
  betaPlaceholder.appendChild(betaMessage);
}

// 1 - génération de la liste d'option à partir de advancedSettings
chrome.storage.local.get('advancedDefaultSettings', function (data) {
  if (data.advancedDefaultSettings) {
    generateOptionsHTML(data.advancedDefaultSettings);
  }
});

function createInput(option) { // gestion des différents types d'input
  // Crée un élément d'entrée en fonction du type d'option
  let inputType = 'input';
  if (['html', 'radio'].includes(option.type)) {
    inputType = 'div';
  } else if (['json', 'true_json'].includes(option.type)) {
    inputType = 'textarea'; // Utiliser un textarea pour les options de type json
  }
  const input = document.createElement(inputType);
  input.id = option.name;

  // Désactiver l'élément si l'option est marquée comme désactivée
  if (option.disabled) {
    input.disabled = true;
  }


  // Récupération de la valeur de l'option (sauvegardée ou par défaut)
  getOptionValue(option).then(optionValue => {
    switch (option.type) {
      case 'bool':
        input.type = 'checkbox';
        input.checked = optionValue;
        break;
      case 'text':
        input.type = 'text';
        input.value = optionValue;
        break;
      case 'json':
        input.classList.add('json-input');
        input.value = displayCategories(optionValue);
        input.style.height = '40px'; // Hauteur par défaut
        input.style.width = '100%';

        // Ajouter les événements focus et blur
        input.addEventListener('focus', function () {
          this.style.height = '400px';
        });

        input.addEventListener('blur', function () {
          this.style.height = '40px';
        });

        break;
      case 'true_json':
        input.classList.add('true-json-input');
        // Pour true_json, afficher directement le JSON sans transformation
        input.value = formatJsonPretty(optionValue);
        input.style.minHeight = '200px';
        input.style.width = '100%';
        input.style.fontFamily = 'monospace';
        input.style.fontSize = '12px';
        input.style.whiteSpace = 'pre';
        input.style.overflowX = 'auto';
        input.style.display = 'none'; // Masqué par défaut
        
        // Validation JSON en temps réel
        input.addEventListener('input', function() {
          try {
            JSON.parse(this.value);
            this.style.borderColor = '';
            this.style.backgroundColor = '';
          } catch (e) {
            this.style.borderColor = 'red';
            this.style.backgroundColor = '#fff0f0';
          }
        });
        break;
      case 'smalltext':
        input.type = 'text';
        input.size = 20;
        input.style.width = 'auto';
        input.value = optionValue;
        break;
      case 'radio':
        input.classList.add('radio-group');
        option.radioOptions.forEach(radioOption => {
          const radioInput = document.createElement('input');
          radioInput.type = 'radio';
          radioInput.name = option.name;
          radioInput.value = radioOption.value;
          radioInput.checked = radioOption.value === optionValue;
          // console.log("je check le bouton radio : ", radioOption.value, "avec la valeur par défaut : ", radioInput.checked);

          const radioLabel = document.createElement('label');
          radioLabel.innerHTML = radioOption.description;
          radioLabel.setAttribute('for', radioOption.value);

          input.appendChild(radioInput);
          input.appendChild(radioLabel);
          input.appendChild(document.createElement('br')); // Ajoute une nouvelle ligne après chaque option
        });
        break;
      case 'html':
        // c'est createLabel qui s'occupe de l'ajout de l'html
        break;
    }
  });

  return input;
}

async function getOptionValue(option) {
  const defautOptionValue = option.default;
  const optionKey = option.name;

  return new Promise((resolve, reject) => {
    chrome.storage.local.get(optionKey, (result) => {
      const savedOptionValue = result[optionKey];
      const valueToReturn = (savedOptionValue !== undefined) ? savedOptionValue : defautOptionValue;
      resolve(valueToReturn);
    });
  });
}

// Afficher le json sous une forme plus lisible, avec un retour à la ligne après chaque [
function displayCategories(jsonStr) {
  let display = '';
  try {
    const categories = JSON.parse(jsonStr);
    categories.forEach(category => {
      // Détecter le format selon la longueur du tableau
      if (category.length === 2) {
        // Ancien format : [nom, [mots-clés]]
        const [name, keywords] = category;
        display += `${name} : ${keywords.join(', ')}\n`;
      } else if (category.length === 5) {
        // Nouveau format alertes : [titre, coloration, alerte, icône, [mots-clés]]
        const [titre, coloration, alerte, matIcon, keywords] = category;
        display += `${titre}, ${coloration}, ${alerte}, ${matIcon} : ${keywords.join(', ')}\n`;
      } else {
        // Format non reconnu, afficher tel quel
        console.warn('Format de catégorie non reconnu:', category);
        display += JSON.stringify(category) + '\n';
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'analyse du JSON:', error);
    alert('Les paramètres pour la gestion des catégories ne sont pas valides, merci de les corriger');
    display = jsonStr;
  }
  console.log(display);
  return display;
}

// Récupérer les données affichées et les convertir en JSON
function getCategoriesFromJsonInput(input) {
  const categories = [];
  const lines = input.value.split('\n');
  let hasError = false; // Flag pour détecter les erreurs

  lines.forEach((line, lineIndex) => {
    if (line.trim()) { // Vérifier que la ligne n'est pas vide
      // Séparer par le dernier ':' pour gérer les titres avec ':'
      const lastColonIndex = line.lastIndexOf(':');
      if (lastColonIndex === -1) {
        console.warn(`Ligne ${lineIndex + 1}: Pas de ':' trouvé, ligne ignorée`);
        alert(`Erreur ligne ${lineIndex + 1}: Pas de ':' trouvé. Format attendu:\n- "nom : mot1, mot2" (ancien format)\n- "titre, true/false, true/false, icône : mot1, mot2" (nouveau format)`);
        hasError = true;
        return; // Pas de ':', ligne invalide
      }

      const beforeColon = line.substring(0, lastColonIndex).trim();
      const afterColon = line.substring(lastColonIndex + 1).trim();

      // Compter les virgules avant les ':'
      const parts = beforeColon.split(',').map(p => p.trim());

      if (parts.length === 1) {
        // Ancien format : "nom : mot1, mot2, mot3"
        const name = parts[0];
        const keywords = afterColon ? afterColon.split(',').map(keyword => keyword.trim()) : [];
        if (name) {
          categories.push([name, keywords]);
        }
      } else if (parts.length === 4) {
        // Nouveau format : "titre, true, false, icône : mot1, mot2, mot3"
        const [titre, coloration, alerte, matIcon] = parts;

        // Validation des booléens
        const colorationLower = coloration.toLowerCase();
        const alerteLower = alerte.toLowerCase();

        if (colorationLower !== 'true' && colorationLower !== 'false') {
          alert(`Erreur ligne ${lineIndex + 1}: Le paramètre de coloration doit être "true" ou "false", valeur trouvée: "${coloration}"`);
          console.error(`Ligne ${lineIndex + 1}: Valeur de coloration invalide: "${coloration}"`);
          hasError = true;
          return;
        }

        if (alerteLower !== 'true' && alerteLower !== 'false') {
          alert(`Erreur ligne ${lineIndex + 1}: Le paramètre d'alerte doit être "true" ou "false", valeur trouvée: "${alerte}"`);
          console.error(`Ligne ${lineIndex + 1}: Valeur d'alerte invalide: "${alerte}"`);
          hasError = true;
          return;
        }

        const keywords = afterColon ? afterColon.split(',').map(keyword => keyword.trim()) : [];
        if (titre) {
          categories.push([
            titre,
            colorationLower === 'true',
            alerteLower === 'true',
            matIcon,
            keywords
          ]);
        }
      } else {
        console.warn(`Ligne ${lineIndex + 1}: Format de ligne non reconnu (${parts.length} parties trouvées avant ':')`);
        alert(`Erreur ligne ${lineIndex + 1}: Format non reconnu. Attendu:\n- "nom : mot1, mot2" (ancien format)\n- "titre, true/false, true/false, icône : mot1, mot2" (nouveau format)`);
        hasError = true;
      }
    }
  });

  // Si une erreur a été détectée, retourner null au lieu d'un tableau vide
  if (hasError) {
    console.error('❌ Validation échouée, aucune donnée ne sera sauvegardée');
    return null;
  }

  console.log(JSON.stringify(categories));
  return categories;
}

function createLabel(option) {
  // Ajouter les styles si pas déjà présents
  if (!document.getElementById('info-tooltip-styles')) {
    const styles = document.createElement('style');
    styles.id = 'info-tooltip-styles';
    styles.textContent = `
      .info-icon {
        cursor: help;
        position: relative;
        margin-left: 5px;
      }
      
      .info-tooltip {
        display: none;
        position: absolute;
        left: 25px;
        top: -5px;
        background: white;
        color: inherit;
        padding: 8px 12px;
        border-radius: 4px;
        width: max-content;
        max-width: 600px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        z-index: 100;
        font-size: 14px;
        line-height: 1.4;
      }
      
      .info-tooltip::before {
        content: '';
        position: absolute;
        left: -4px;
        top: 12px;
        transform: translateY(-50%);
        border-width: 6px;
        border-style: solid;
        border-color: transparent #333 transparent transparent;
      }
      
      .info-icon:hover .info-tooltip {
        display: block;
      }
      
      .default-value-btn {
        margin-left: 10px;
        padding: 2px 8px;
        font-size: 12px;
        background: #ff8888ff;
        border: 1px solid #ccc;
        border-radius: 3px;
        cursor: pointer;
      }
      
      .default-value-btn:hover {
        background: #e0e0e0;
      }`;
    document.head.appendChild(styles);
  }

  const label = document.createElement('span');
  label.innerHTML = option.description;
  label.setAttribute('for', option.name);

  // Pour les options JSON ou true_json ou si longDescription existe, ajouter l'icône d'information
  if (option.longDescription || ['json', 'true_json'].includes(option.type)) {
    const infoIcon = document.createElement('span');
    infoIcon.innerHTML = ' ℹ️';
    infoIcon.className = 'info-icon';
    infoIcon.style.fontFamily = 'Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"';

    const tooltip = document.createElement('div');
    tooltip.className = 'info-tooltip';

    let tooltipContent = '';

    if (option.longDescription) {
      tooltipContent += option.longDescription.replace(/\n/g, '<br>');
    }

    // Si c'est une option JSON, afficher la valeur par défaut formatée
    if (option.type === 'json') {
      tooltipContent += '<br><br><strong>Valeur par défaut :</strong><br>';
      tooltipContent += displayCategories(option.default).replace(/\n/g, '<br>');
    }
    
    // Si c'est une option true_json, afficher la valeur par défaut formatée
    if (option.type === 'true_json') {
      tooltipContent += '<br><br><strong>Valeur par défaut :</strong><br>';
      tooltipContent += '<pre>' + formatJsonPretty(option.default) + '</pre>';
    }

    tooltip.innerHTML = tooltipContent;
    infoIcon.appendChild(tooltip);
    label.appendChild(infoIcon);
  }

  // Ajouter un bouton "Valeur par défaut" pour certains types d'options
  if (['text', 'json', 'smalltext', 'true_json'].includes(option.type)) {
    const defaultBtn = document.createElement('button');
    defaultBtn.textContent = '↻';
    defaultBtn.title = 'Restaurer la valeur par défaut';
    defaultBtn.className = 'default-value-btn';
    defaultBtn.type = 'button'; // Empêcher la soumission du formulaire

    defaultBtn.addEventListener('click', function (e) {
      e.preventDefault();
      const inputElement = document.getElementById(option.name);

      // Demander confirmation à l'utilisateur
      const confirmMessage = `Êtes-vous sûr de vouloir restaurer la valeur par défaut ?`;
      if (!confirm(confirmMessage)) {
        return;
      }

      if (inputElement) {
        if (option.type === 'json') {
          // Pour les options JSON, utiliser displayCategories pour formater
          inputElement.value = displayCategories(option.default);
        } else if (option.type === 'true_json') {
          // Pour les options true_json, formater joliment le JSON
          inputElement.value = formatJsonPretty(option.default);
          // Réinitialiser le style en cas d'erreur précédente
          inputElement.style.borderColor = '';
          inputElement.style.backgroundColor = '';
        } else {
          // Pour les autres types, utiliser directement la valeur par défaut
          inputElement.value = option.default;
        }

        // Déclencher l'événement change si nécessaire
        inputElement.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    label.appendChild(defaultBtn);
  }
  
  // Ajouter des boutons pour les options true_json
  if (option.type === 'true_json') {
    // Bouton 1: Éditer les alertes (interface guidée)
    const editBtn = document.createElement('button');
    editBtn.textContent = '✏️ Éditer';
    editBtn.title = 'Ouvrir l\'interface d\'édition guidée des alertes';
    editBtn.className = 'default-value-btn';
    editBtn.style.background = '#28a745';
    editBtn.style.color = 'white';
    editBtn.type = 'button';
    
    editBtn.addEventListener('click', function(e) {
      e.preventDefault();
      openAlertEditorModal(option.name);
    });
    
    label.appendChild(editBtn);
    
    // Bouton 2: Éditeur avancé (toggle JSON)
    const advancedBtn = document.createElement('button');
    advancedBtn.textContent = '📝 Editeur Avancé';
    advancedBtn.title = 'Afficher/masquer l\'éditeur JSON brut';
    advancedBtn.className = 'default-value-btn';
    advancedBtn.style.background = '#6c757d';
    advancedBtn.style.color = 'white';
    advancedBtn.type = 'button';
    
    advancedBtn.addEventListener('click', function(e) {
      e.preventDefault();
      const textarea = document.getElementById(option.name);
      if (textarea) {
        const isHidden = textarea.style.display === 'none';
        textarea.style.display = isHidden ? 'block' : 'none';
        advancedBtn.textContent = isHidden ? '✖️ Masquer' : '📝 JSON';
      }
    });
    
    label.appendChild(advancedBtn);
    
    // Bouton 3: Étendre au Pôle (GitHub)
    const poleBtn = document.createElement('button');
    poleBtn.textContent = '🌐 Partager au Pôle/Groupement/Cabinet';
    poleBtn.title = 'Partager ces alertes avec votre pôle/cabinet/groupement via GitHub';
    poleBtn.className = 'default-value-btn';
    poleBtn.style.background = '#007bff';
    poleBtn.style.color = 'white';
    poleBtn.type = 'button';
    
    poleBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      
      const confirmMessage = `📋 Diffusion des alertes au Pôle\n\n` +
        `Avant de continuer, assurez-vous que :\n\n` +
        `✅ Vous avez un compte GitHub (gratuit)\n` +
        `✅ Vos alertes sont bien configurées et testées\n` +
        `✅ Elles ne contiennent aucune information confidentielle\n` +
        `✅ Vous avez l'accord de vos pairs du groupement\n` +
        `✅ Vous êtes prêt à les partager publiquement\n\n` +
        `Une demande GitHub s'ouvrira avec le template pré-rempli.\n` +
        `Délai de diffusion : environ 2 semaines.\n\n` +
        `Voulez-vous continuer ?`;
      
      if (!confirm(confirmMessage)) {
        return;
      }
      
      // Récupérer le cabinet ID depuis le storage
      let cabinetId = '0000';
      try {
        const result = await chrome.storage.local.get('currentCabinetId');
        if (result.currentCabinetId) {
          cabinetId = result.currentCabinetId.toString();
        } else {
          throw new Error('CabinetID non trouvé');
        }
      } catch (error) {
        console.warn('Impossible de récupérer le cabinet ID:', error);
        const needConnection = confirm(
          '⚠️ Impossible de récupérer votre numéro de cabinet.\n\n' +
          'Le CabinetID n\'est pas encore enregistré dans le storage.\n\n' +
          'Voulez-vous continuer quand même ?\n' +
          '(Vous devrez saisir manuellement le numéro dans l\'issue GitHub)'
        );
        if (!needConnection) {
          return;
        }
      }
      
      // Récupérer le JSON au moment du clic
      const textarea = document.getElementById(option.name);
      const jsonContent = textarea ? textarea.value : '';
      
      const issueBody = `Bonjour @Refhi,

je souhaite diffuser mes alertes personnalisées à mon Pôle/Cabinet/Groupement, et j'ai bien compris les conditions ci-dessous :
- J'ai testé ces alertes et elles fonctionnent correctement
- Elles ne contiennent aucune information confidentielle
- J'ai l'accord de mes pairs du groupement/cabinet/pôle
- Je comprends qu'elles seront publiques (dans ce ticket et dans le code source)
- Je comprends le délai de diffusion (~2 semaines en moyenne)
- J'ai fait attention à ne pas surcharger les alertes (trop d'info tue l'info !)
- Ces alertes obtiendront le même statut de licence libre que le code source de Weda-Helper.

Voici mes alertes à intégrer à mon Pole/Cabinet/Groupement (CabinetID: ${cabinetId}) :

\`\`\`javascript
${cabinetId}: ${jsonContent}
\`\`\`

`;
      
      // Construire l'URL avec les paramètres correctement encodés
      const params = new URLSearchParams({
        template: 'demande-de-diffusion-d-alertes-au-pole-cabinet-groupement.md',
        title: 'Demande de diffusion de mes alertes à mon cabinet/pôle/groupement',
        labels: 'Alertes à diffuser',
        body: issueBody
      });
      
      const issueUrl = `https://github.com/Refhi/Weda-Helper/issues/new?${params.toString()}`;
      
      // Ouvrir l'URL
      window.open(issueUrl, '_blank');
    });
    
    label.appendChild(poleBtn);
  }

  return label;
}
function createOptionElement(option) { // Création des éléments de l'option
  const optionDiv = document.createElement('div');
  optionDiv.classList.add('option');

  // Ajouter la classe de niveau et l'attribut data-level pour le débogage
  optionDiv.classList.add(`level-${option.level}`);
  optionDiv.setAttribute('data-level', option.level);
  optionDiv.setAttribute('data-is-sub-option', option.isSubOption);
  optionDiv.setAttribute('data-option-name', option.name || 'unnamed');

  // Encapsuler dans une carte pour les niveaux principaux
  if (option.level <= 1 && option.type === 'title') {
    optionDiv.classList.add('option-card');
  }

  if (option.type === 'title') {
    const title = document.createElement(`h${Math.min(6, 1 + option.level)}`);
    title.textContent = option.name;
    optionDiv.appendChild(title);

    if (option.description) {
      const subtitle = document.createElement('p');
      subtitle.innerHTML = option.description.replace(/\n/g, '<br>'); // Remplacer \n par <br>
      subtitle.classList.add('subtitle');
      optionDiv.appendChild(subtitle);
    }
  } else if (option.type === 'radio') {
    const title = document.createElement(`h${Math.min(6, 1 + option.level)}`);
    title.textContent = option.description;
    title.classList.add('radio-title'); // Applique la classe CSS pour limiter la marge en dessous
    optionDiv.appendChild(title);

    const radioInput = createInput(option);
    optionDiv.appendChild(radioInput);
  } else if (option.type === 'json') {
    // Ajouter un retour à la ligne avant l'option
    optionDiv.appendChild(document.createElement('br'));

    const label = createLabel(option);
    optionDiv.appendChild(label);

    const input = createInput(option);
    optionDiv.appendChild(input);
  } else {
    const input = createInput(option);
    optionDiv.appendChild(input);

    const label = createLabel(option);
    optionDiv.appendChild(label);
  }

  return optionDiv;
}

function generateOptionsHTML(settings) {
  const container = document.getElementById('advanced-options');
  container.innerHTML = '';

  parseSettings(settings, option => {
    const optionElement = createOptionElement(option);
    container.appendChild(optionElement);
  });
}


// 2 - Récupérer les valeurs par défaut des raccourcis + gestion des modifications des raccourcis
chrome.storage.local.get('defaultShortcuts', function (result) {
  let defaultShortcuts = result.defaultShortcuts;
  // Les valeurs par défaut sont stockées background.js pour être utilisées dans les options et éviter de dupliquer le code
  chrome.storage.local.get("shortcuts", function (result) {
    var table = document.createElement('table');
    let node = document.getElementById('shortcuts');
    Object.entries(defaultShortcuts).forEach(([key, shortcut]) => {
      // D'abord récupérer les valeurs stockées ou utiliser les valeurs par défaut
      var savedShortcut;
      if (result["shortcuts"]) {
        savedShortcut = result["shortcuts"][key];
      }
      let defaultShortcutValue = shortcut["default"];

      var shortcutElement = document.createElement('tr');
      var description = document.createElement('td');
      description.innerHTML = " " + shortcut["description"];
      var buttonContainer = document.createElement('td');
      var button = document.createElement('button');
      button.innerHTML = savedShortcut ? savedShortcut : defaultShortcutValue;
      button.setAttribute('data-initial-text', button.innerHTML); // Stocker le texte initial
      button.onclick = shortcutClicked;
      button.id = key;
      buttonContainer.appendChild(button);
      shortcutElement.appendChild(buttonContainer);
      shortcutElement.appendChild(description);
      table.appendChild(shortcutElement);

    });
    node.appendChild(document.createElement('br'));
    node.appendChild(table);
  });

  function keyToWord(key) // Fonction pour afficher les symboles de key sous une forme plus simple
  {
    if (key == "⌃")
      return "Ctrl";
    else if (key == "⌥")
      return "Alt";
    else
      return key;
  }

  function shortcutClicked(buttonEvent) {
    // Désactiver la classe 'modifying' sur tous les autres boutons et restaurer leur texte initial
    document.querySelectorAll('button.modifying').forEach(button => {
      button.classList.remove('modifying');
      button.innerHTML = button.getAttribute('data-initial-text'); // Restaurer le texte initial
    });

    // Désactiver tous les écouteurs de touches existants
    hotkeys.unbind('*');

    buttonEvent.target.innerHTML = 'Appuyez sur une touche de fonction ou une combinaison de touches';
    buttonEvent.target.classList.add('modifying');

    hotkeys('*', function (event, handler) { // On écoute toutes les pressions de touche
      function saveShortcut(keys) {
        var shortcut = "";
        for (var i = 0; i < keys.length; i++) {
          var separator = "+";
          if (i == 0) {
            separator = "";
          }
          shortcut = shortcut + separator + keyToWord(keys[i]);
        }
        buttonEvent.target.innerHTML = shortcut;
        buttonEvent.target.classList.remove('modifying');
        chrome.storage.local.get("shortcuts", function (result) {
          var shortcuts = result["shortcuts"];
          shortcuts[buttonEvent.target.id] = shortcut;
          chrome.storage.local.set({ "shortcuts": shortcuts });
        });
        hotkeys.unbind('*');
      }

      function isLetterOrNumber(element) {
        return element.match(/\w{1}/);
      }

      function isfunctionKey(element) {
        return element.match(/f\w{1,2}/);
      }

      event.preventDefault();
      var keys = hotkeys.getPressedKeyString();
      console.log(keys);
      if (keys.length <= 1) { // Une seule touche, on accepte F1 à F19
        if (isfunctionKey(keys[0])) {
          saveShortcut(keys);
        }
      } else { // Si l'on a plus de 2 touches, il faut au moins une lettre ou un chiffre
        if (keys.some(isLetterOrNumber)) {
          saveShortcut(keys);
        }
      }
    });
  }
});

// Fonction mutualisée pour collecter les valeurs des options et raccourcis
function collectCurrentValues(defaultSettings, defaultShortcuts) {
  return new Promise((resolve, reject) => {
    // Récupérer le schéma de validation des alertes
    chrome.storage.local.get('alerteSchema', function(result) {
      const alerteSchema = result.alerteSchema;
      
      var options = Object.keys(defaultSettings);
      var valuesToSave = {};
      let hasValidationError = false; // Flag pour détecter les erreurs de validation

      options.forEach(function (option) {
        let element = document.getElementById(option);
        if (element && element.classList.contains('radio-group')) {
          valuesToSave[option] = getSelectedRadioValue(option);
        } else if (element && element.classList.contains('json-input')) {
          const jsonData = getCategoriesFromJsonInput(element);
          // Si la conversion retourne null, il y a eu une erreur
          if (jsonData === null) {
            console.error('❌ Erreur lors de la validation pour l\'option', option);
            hasValidationError = true;
            return; // On arrête le traitement de cette option
          }
          valuesToSave[option] = JSON.stringify(jsonData);
        } else if (element && element.classList.contains('true-json-input')) {
          // Pour true_json, valider le JSON et le sauvegarder tel quel
          try {
            const parsed = JSON.parse(element.value);
            
            // Validation spécifique pour alertesAtcdOption
            if (option === 'alertesAtcdOption' && alerteSchema) {
              const validation = validateAlertes(parsed, alerteSchema);
              if (!validation.valid) {
                console.error('❌ Validation des alertes échouée:', validation.errors);
                const errorMessage = '❌ Validation des alertes échouée:\n\n' + 
                  validation.errors.slice(0, 10).join('\n') +
                  (validation.errors.length > 10 ? `\n\n... et ${validation.errors.length - 10} autres erreurs` : '');
                alert(errorMessage);
                hasValidationError = true;
                return;
              }
              console.log('✅ Validation des alertes réussie');
            }
            
            valuesToSave[option] = JSON.stringify(parsed); // Minifier pour le stockage
          } catch (e) {
            console.error('❌ JSON invalide pour l\'option', option, ':', e.message);
            alert(`❌ JSON invalide pour "${option}":\n${e.message}`);
            hasValidationError = true;
            return;
          }
        } else if (element) { // Vérifiez si l'élément existe
          var value = element.type === 'checkbox' ? element.checked : element.value;
          valuesToSave[option] = value;
        } else {
          console.log('Aucun élément trouvé avec l\'ID', option);
        }
      });

      // Si une erreur de validation a été détectée, on rejette la promesse
      if (hasValidationError) {
        reject(new Error('Erreurs de validation détectées'));
        return;
      }

      // Ajouter les raccourcis
      var shortcuts = {};
      Object.entries(defaultShortcuts).forEach(([key, shortcut]) => {
        let element = document.getElementById(key);
        if (element) {
          shortcuts[key] = element.innerHTML;
        }
        else {
          console.log('Aucun élément avec l\'ID', key);
        }
      });
      valuesToSave["shortcuts"] = shortcuts;

      resolve(valuesToSave);
    });
  });
}

// 3 - Enregistrement des valeurs dans le stockage local lors du click sur id=save
chrome.storage.local.get(['defaultSettings', 'defaultShortcuts'], function (result) {
  var defaultSettings = result.defaultSettings;
  var defaultShortcuts = result.defaultShortcuts;

  document.getElementById('save').addEventListener('click', function () {
    collectCurrentValues(defaultSettings, defaultShortcuts)
      .then(valuesToSave => {
        chrome.storage.local.set(valuesToSave, function () {
          console.log('✅ Sauvegardé avec succès');
          alert('✅ Les options ont été sauvegardées avec succès');
          console.log(valuesToSave);
        });
      })
      .catch(error => {
        console.error('❌ Erreur:', error);
        alert('❌ Sauvegarde annulée : des erreurs de validation ont été détectées. Veuillez corriger les erreurs et réessayer.');
      });
  });
});

function getSelectedRadioValue(groupId) {
  const radioGroup = document.getElementById(groupId);
  if (radioGroup) {
    const radios = radioGroup.querySelectorAll('input[type="radio"]');
    for (const radio of radios) {
      if (radio.checked) {
        return radio.value;
      }
    }
  }
  return null; // Aucun bouton radio sélectionné
}


// 4 - Récupération du numéro de version de l'extension et affichage dans le titre
function changeTitle() {
  let manifest = chrome.runtime.getManifest();
  let version = manifest.version;
  console.log(version);
  let explanationText = document.getElementById('MainTitle');
  explanationText.textContent = `Weda-Helper version ${version}`;
}

changeTitle();



// 5 - ajoute un bouton pour effacer les valeurs des textes de bienvenue et raz les paramètres
var clearButton = document.createElement('button');
clearButton.textContent = 'Raz textes de bienvenue';
clearButton.addEventListener('click', function () {
  // Effacez les valeurs lorsque le bouton est cliqué
  chrome.storage.local.remove(['lastExtensionVersion', 'firstStart', 'aprilFool', 'promptCompanionMessage'], function () {
    console.log('Les valeurs ont été effacées avec succès');
  });
});

// Ajoutez le bouton à la page
document.body.appendChild(clearButton);


// Ajout d'un bouton pour effacer les raccourcis clavier et donc les remettre par défaut
var clearShortcutsButton = document.createElement('button');
clearShortcutsButton.textContent = 'Raz raccourcis clavier';
clearShortcutsButton.addEventListener('click', function () {
  if (!confirm('Êtes-vous sûr de vouloir réinitialiser les raccourcis clavier ?')) {
    return;
  }
  // Effacez les valeurs lorsque le bouton est cliqué
  chrome.storage.local.get('defaultShortcuts', function (result) {
    let defaultShortcuts = result.defaultShortcuts;
    let shortcutsToReset = {};

    // Remplacer les raccourcis actuels par les valeurs par défaut
    Object.keys(defaultShortcuts).forEach(function (key) {
      shortcutsToReset[key] = defaultShortcuts[key].default;
    });

    // Enregistrer les valeurs mises à jour dans le stockage local de Chrome
    chrome.storage.local.set({ "shortcuts": shortcutsToReset }, function () {
      console.log('Les raccourcis ont été réinitialisés avec succès');
      alert('Les raccourcis ont été réinitialisés avec succès');
      // recharge la page
      location.reload();
    });
  });
});

// Ajout du bouton à l'interface utilisateur
document.body.appendChild(clearShortcutsButton);

// Ajout d'un bouton pour effacer les settings et donc les remettre par défaut
var clearSettingsButton = document.createElement('button');
clearSettingsButton.textContent = 'Raz paramètres';
clearSettingsButton.addEventListener('click', function () {
  // demander confirmation
  if (!confirm('Êtes-vous sûr de vouloir réinitialiser les paramètres ?')) {
    return;
  }
  // Effacez les valeurs lorsque le bouton est cliqué
  chrome.storage.local.get('defaultSettings', function (result) {
    let defaultSettings = result.defaultSettings;

    // Remplacer les settings actuels par les valeurs par défaut
    Object.keys(defaultSettings).forEach(function (key) {
      console.log('Je travaille sur la clé : ', key);
      chrome.storage.local.remove(key, function () {
        console.log('Clé supprimée : ', key);
      });
    });

    alert('Les paramètres ont été réinitialisés avec succès');
    location.reload();
  });
});

// Ajout du bouton à l'interface utilisateur
document.body.appendChild(clearSettingsButton);

// Ajout d'un bouton copiant les paramètres actuels dans le presse-papier
var copySettingsButton = document.createElement('button');
copySettingsButton.textContent = '📋📤Copier/Sauv. param.';
copySettingsButton.addEventListener('click', function () {
  chrome.storage.local.get(['defaultSettings', 'defaultShortcuts'], function (result) {
    collectCurrentValues(result.defaultSettings, result.defaultShortcuts)
      .then(valuesToSave => {
        const settingsStr = JSON.stringify(valuesToSave, null, 2);
        
        // Copie dans le presse-papier
        navigator.clipboard.writeText(settingsStr).then(function () {
          // Création du nom de fichier avec date et heure
          const now = new Date();
          const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
          const timeStr = now.toTimeString().slice(0, 5).replace(':', 'h'); // HHhMM
          const fileName = `WedaHelper_Parametres_${dateStr}_${timeStr}.json`;
          
          // Téléchargement du fichier JSON
          const blob = new Blob([settingsStr], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          alert('Les paramètres ont été copiés dans le presse-papier et téléchargés');
        }, function (err) {
          console.error('Erreur lors de la copie des paramètres : ', err);
          alert('Erreur lors de la copie des paramètres');
        });
      })
      .catch(error => {
        console.error('❌ Erreur lors de la collecte des valeurs:', error);
        alert('❌ Erreur : impossible de copier les paramètres en raison d\'erreurs de validation.');
      });
  });
});
// Ajout du bouton à l'interface utilisateur
document.body.appendChild(copySettingsButton);

// Ajout d'un bouton important les paramètres depuis le presse-papier
var importSettingsButton = document.createElement('button');
importSettingsButton.textContent = '📋📥Coller paramètres';
importSettingsButton.addEventListener('click', function () {
  navigator.clipboard.readText().then(text => {
    if (text) {
      try {
        const settingsObj = JSON.parse(text);
        
        // Demander confirmation avant d'importer
        if (!confirm('Êtes-vous sûr de vouloir importer ces paramètres ? Cela écrasera vos paramètres actuels.')) {
          return;
        }

        // Chaque paramètre est stocké individuellement dans chrome.storage.local
        // avec la clé correspondant au nom du paramètre
        // l’importation écrase les paramètres existants qui ont le même nom
        // mais ne supprime pas les ceux qui ne sont pas présents dans l’importation
        
        chrome.storage.local.set(settingsObj, function () {
          alert('Les paramètres ont été importés avec succès. Attention à reporter la clé API dans le Companion si nécessaire.');
          location.reload();
        });
      } catch (error) {
        console.error('Erreur lors de l\'importation des paramètres : ', error);
        alert('Erreur lors de l\'importation des paramètres : format JSON invalide');
      }
    } else {
      alert('Le presse-papier est vide');
    }
  }).catch(err => {
    console.error('Erreur lors de la lecture du presse-papier : ', err);
    alert('Erreur lors de la lecture du presse-papier. Assurez-vous d\'avoir autorisé l\'accès au presse-papier.');
  });
});
// Ajout du bouton à l'interface utilisateur
document.body.appendChild(importSettingsButton);

// Ajout d'un bouton pour charger les paramètres depuis un fichier
var loadFromFileButton = document.createElement('button');
loadFromFileButton.textContent = '📁📥Charger depuis fichier';
loadFromFileButton.addEventListener('click', function () {
  // Créer un input file invisible
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json';
  fileInput.style.display = 'none';
  
  fileInput.addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        try {
          const settingsObj = JSON.parse(e.target.result);
          
          // Demander confirmation avant d'importer
          if (!confirm(`Êtes-vous sûr de vouloir importer les paramètres depuis "${file.name}" ? Cela écrasera vos paramètres actuels.`)) {
            return;
          }
          
          chrome.storage.local.set(settingsObj, function () {
            alert('Les paramètres ont été importés avec succès depuis le fichier, attention à reporter la clé API dans le Companion si nécessaire.');
            location.reload();
          });
        } catch (error) {
          console.error('Erreur lors de l\'importation des paramètres depuis le fichier : ', error);
          alert('Erreur lors de l\'importation des paramètres : format JSON invalide');
        }
      };
      reader.readAsText(file);
    }
  });
  
  document.body.appendChild(fileInput);
  fileInput.click();
  document.body.removeChild(fileInput);
});
// Ajout du bouton à l'interface utilisateur
document.body.appendChild(loadFromFileButton);




// 6 - Affichage des métriques

function getMetricsForPeriod(periodDays) {
  let startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);
  let startDateStr = 'metrics-' + startDate.toISOString().split('T')[0];

  return new Promise((resolve, reject) => {
    chrome.storage.local.get(null, function (items) {
      let periodMetrics = { clicks: 0, drags: 0, keyStrokes: 0 };
      for (let key in items) {
        if (key.startsWith('metrics-') && key >= startDateStr && key !== 'metrics-globalMetrics') {
          if (periodDays > 365) {
            console.log(key, items[key]);
          }
          periodMetrics.clicks += items[key].clicks || 0;
          periodMetrics.drags += items[key].drags || 0;
          periodMetrics.keyStrokes += items[key].keyStrokes || 0;
        }
      }
      resolve(periodMetrics);
    });
  });
}


Promise.all([
  getMetricsForPeriod(1), // Today
  getMetricsForPeriod(7), // Last 7 days
  getMetricsForPeriod(30), // Last 30 days
  getMetricsForPeriod(365), // Last 365 days
  new Promise((resolve, reject) => { // Since installation
    chrome.storage.local.get(['globalMetrics'], function (result) {
      resolve(result.globalMetrics || { clicks: 0, drags: 0, keyStrokes: 0 });
    });
  })
]).then(([todayMetrics, weekMetrics, monthMetrics, yearMetrics, totalMetrics]) => {
  let metricsElement = document.createElement('table');
  metricsElement.innerHTML = `
    <tr>
      <th></th>
      <th>Clics de souris évités</th>
      <th>Mouvements de souris évités</th>
      <th>Frappes de clavier évitées</th>
    </tr>
    <tr>
      <td>Aujourd'hui</td>
      <td>${todayMetrics.clicks}</td>
      <td>${todayMetrics.drags}</td>
      <td>${todayMetrics.keyStrokes}</td>
    </tr>
    <tr>
      <td>Cette semaine</td>
      <td>${weekMetrics.clicks}</td>
      <td>${weekMetrics.drags}</td>
      <td>${weekMetrics.keyStrokes}</td>
    </tr>
    <tr>
      <td>Ce mois</td>
      <td>${monthMetrics.clicks}</td>
      <td>${monthMetrics.drags}</td>
      <td>${monthMetrics.keyStrokes}</td>
    </tr>
    <tr>
      <td>Cette année</td>
      <td>${yearMetrics.clicks}</td>
      <td>${yearMetrics.drags}</td>
      <td>${yearMetrics.keyStrokes}</td>
    </tr>
    <tr>
      <td>Depuis l'installation</td>
      <td>${totalMetrics.clicks}</td>
      <td>${totalMetrics.drags}</td>
      <td>${totalMetrics.keyStrokes}</td>
    </tr>
  `;

  const metricElement = document.getElementById('metrics');
  metricElement.appendChild(metricsElement);
  // document.body.appendChild(metricsElement);
});


// 7 - Lien vers le log du compagnon
function updateCompanionLogLink() {
  chrome.storage.local.get(['apiKey', 'portCompanion', 'version'], function (result) {
    const apiKey = result.apiKey || '';
    const port = result.portCompanion || '';
    const version = result.version || '';
    const logLink = `http://localhost:${port}/log?apiKey=${encodeURIComponent(apiKey)}&versioncheck=${version}`;
    document.getElementById('companionLogLing').href = logLink;
  });
}

updateCompanionLogLink();