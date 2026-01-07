/**
 * @file options.js
 * @description Interface de configuration complète de l'extension.
 * Gère l'affichage et la modification de toutes les options (avancées et raccourcis),
 * avec support des sous-options, validation, import/export et recherche.
 * 
 * @exports traverseOptions - Parcourt les options récursivement
 * @exports generateOptionsPage - Génère l'interface des options
 * @exports saveOptions - Sauvegarde les options modifiées
 * @exports loadOptions - Charge les options depuis le storage
 * 
 * @requires storage.js (getOption)
 * @requires background.js (advancedDefaultSettings, defaultShortcuts)
 */

// // --------- Page de gestion des options de l'extension----------
// L'ajout et la modification d'options existantes se fait dans le fichier background.js
// => variables advancedDefaultSettings et defaultShortcuts
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
  } else if (option.type === 'json') {
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

  // Pour les options JSON ou si longDescription existe, ajouter l'icône d'information
  if (option.longDescription || option.type === 'json') {
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

    tooltip.innerHTML = tooltipContent;
    infoIcon.appendChild(tooltip);
    label.appendChild(infoIcon);
  }

  // Ajouter un bouton "Valeur par défaut" pour certains types d'options
  if (['text', 'json', 'smalltext'].includes(option.type)) {
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

// 3 - Enregistrement des valeurs dans le stockage local lors du click sur id=save
chrome.storage.local.get(['defaultSettings', 'defaultShortcuts'], function (result) {
  var defaultSettings = result.defaultSettings;
  document.getElementById('save').addEventListener('click', function () {
    var options = Object.keys(defaultSettings);
    var valuesToSave = {};
    let hasValidationError = false; // Flag pour détecter les erreurs de validation
    
    options.forEach(function (option) {
      let element = document.getElementById(option);
      if (element.classList.contains('radio-group')) {
        valuesToSave[option] = getSelectedRadioValue(option);
      } else if (element.classList.contains('json-input')) {
        const jsonData = getCategoriesFromJsonInput(element);
        // Si la conversion retourne null, il y a eu une erreur
        if (jsonData === null) {
          console.error('❌ Erreur lors de la validation pour l\'option', option);
          hasValidationError = true;
          return; // On arrête le traitement de cette option
        }
        valuesToSave[option] = JSON.stringify(jsonData);
      } else if (element) { // Vérifiez si l'élément existe
        var value = element.type === 'checkbox' ? element.checked : element.value;
        valuesToSave[option] = value;
      } else {
        console.log('Aucun élément trouvé avec l\'ID', option);
      }
    });

    // Si une erreur de validation a été détectée, on arrête la sauvegarde
    if (hasValidationError) {
      alert('❌ Sauvegarde annulée : des erreurs de validation ont été détectées. Veuillez corriger les erreurs et réessayer.');
      return;
    }

    let defaultShortcuts = result.defaultShortcuts;
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

    chrome.storage.local.set(valuesToSave, function () {
      console.log('✅ Sauvegardé avec succès');
      alert('✅ Les options ont été sauvegardées avec succès');
      console.log(valuesToSave);
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