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
        traverse(option.subOptions, level, true);
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
  }
  const input = document.createElement(inputType);
  input.id = option.name;

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


function createLabel(option) {
  const label = document.createElement('span');
  label.innerHTML = option.description; // Utilisez innerHTML pour insérer du HTML
  label.setAttribute('for', option.name);
  return label;
}

function createOptionElement(option) { // Création des éléments de l'option
  const optionDiv = document.createElement('div');
  optionDiv.classList.add('option');

  if (option.type === 'title') {
    const title = document.createElement(`h${Math.min(6, 1 + option.level)}`);
    title.textContent = option.name;
    optionDiv.appendChild(title);

    if (option.description) {
      const subtitle = document.createElement('p');
      subtitle.textContent = option.description;
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
  } else {
    const input = createInput(option);
    optionDiv.appendChild(input);

    const label = createLabel(option);
    optionDiv.appendChild(label);

    if (option.isSubOption) {
      optionDiv.classList.add('sub-option');
    }
  }

  return optionDiv;
}

function generateOptionsHTML(settings) {
  const container = document.getElementById('advanced-options'); // Assurez-vous d'avoir un conteneur pour insérer les options
  container.innerHTML = ''; // Réinitialisez le conteneur avant d'ajouter de nouveaux éléments

  let lastParentOption = null;

  parseSettings(settings, option => {
    const optionElement = createOptionElement(option);
    if (option.isSubOption) {
      lastParentOption.appendChild(optionElement);
    } else {
      container.appendChild(optionElement);
      lastParentOption = optionElement;
    }
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
    options.forEach(function (option) {
      let element = document.getElementById(option);
      if (element.classList.contains('radio-group')) {
        valuesToSave[option] = getSelectedRadioValue(option);
      } else if (element) { // Vérifiez si l'élément existe
        var value = element.type === 'checkbox' ? element.checked : element.value;
        valuesToSave[option] = value;
      } else {
        console.log('Aucun élément trouvé avec l\'ID', option);
      }
    });

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
      console.log('Sauvegardé avec succès');
      alert('Les options ont été sauvegardées avec succès');
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