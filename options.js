// // --------- Page de gestion des options de l'extension----------

/**
 * Traverse les options, sous-options et sous-sections d'un ensemble de paramètres et applique une fonction de rappel à chaque option.
 * @param {Array} settings - La liste des catégories de paramètres.
 * @param {Function} callback - La fonction de rappel à appliquer à chaque option.
 * /!\ cette fonction est en doublon : elle est aussi présente dans background.js
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

// // Options hors raccourcis
// 1 - génération de la liste d'option à partir de advancedSettings
chrome.storage.local.get('advancedDefaultSettings', function (data) {
    if (data.advancedDefaultSettings) {
        generateOptionsHTML(data.advancedDefaultSettings);
    }
});

function createInput(option) {
  let input;
  switch (option.type) {
      case 'bool':
          input = document.createElement('input');
          input.type = 'checkbox';
          input.id = option.name;
          input.checked = option.default;
          break;
      case 'text':
          input = document.createElement('input');
          input.type = 'text';
          input.id = option.name;
          input.value = option.default;
          break;
      case 'radio':
          input = document.createElement('input');
          input.type = 'radio';
          input.id = option.name;
          input.value = option.default;
          break;
      case 'html':
          input = document.createElement('div');
          input.innerHTML = option.description;
          break;
  }
  return input;
}

function createOptionElement(option) {
  const optionDiv = document.createElement('div');
  optionDiv.classList.add('option');

  const label = document.createElement('label');
  label.innerHTML = option.description; // Utilisez innerHTML pour insérer du HTML
  label.setAttribute('for', option.name);
  optionDiv.appendChild(label);

  const input = createInput(option);
  optionDiv.appendChild(input);

  if (option.subOptions) {
      const subOptionsDiv = document.createElement('div');
      subOptionsDiv.classList.add('sub-options');

      option.subOptions.forEach(subOption => {
          const subOptionDiv = document.createElement('div');
          subOptionDiv.classList.add('sub-option');

          const subLabel = document.createElement('label');
          subLabel.innerHTML = subOption.description; // Utilisez innerHTML pour insérer du HTML
          subLabel.setAttribute('for', subOption.name);
          subOptionDiv.appendChild(subLabel);

          const subInput = createInput(subOption);
          subOptionDiv.appendChild(subInput);

          subOptionsDiv.appendChild(subOptionDiv);
      });

      optionDiv.appendChild(subOptionsDiv);
  }

  return optionDiv;
}

function generateOptionsHTML(settings) {
  const container = document.getElementById('advanced-options'); // Assurez-vous d'avoir un conteneur pour insérer les options

  settings.forEach(category => {
      const categoryDiv = document.createElement('div');
      categoryDiv.classList.add('category');

      const categoryTitle = document.createElement('h2');
      categoryTitle.textContent = category.name;
      categoryDiv.appendChild(categoryTitle);

      const categoryDescription = document.createElement('p');
      categoryDescription.textContent = category.description;
      categoryDiv.appendChild(categoryDescription);

      traverseOptions([category], option => {
          const optionElement = createOptionElement(option);
          categoryDiv.appendChild(optionElement);
      });

      container.appendChild(categoryDiv);
  });
}


// 2 - Récupérer les valeurs par défaut du stockage et mettre à jour les éléments de la page
chrome.storage.local.get(['defaultSettings', 'defaultShortcuts'], function(result) {
  // Les valeurs par défaut sont stockées background.js pour être utilisées dans les options et éviter de dupliquer le code

  let defaultSettings = result.defaultSettings;
  let defaultShortcuts = result.defaultShortcuts;
  console.log("[option.js] valeurs par défaut chargées : ", defaultSettings); // Affiche les valeurs par défaut
  var options = Object.keys(defaultSettings);

  chrome.storage.local.get("shortcuts", function(result) {
    var table = document.createElement('table');
    let node = document.getElementById('shortcuts');
    Object.entries(defaultShortcuts).forEach(([key, shortcut]) => {
    // D'abord récupérer les valeurs stockées ou utiliser les valeurs par défaut
      var savedShortcut;
      if(result["shortcuts"]) {
        savedShortcut = result["shortcuts"][key];
      }
      let defaultShortcutValue = shortcut["default"];

      var shortcutElement = document.createElement('tr');
      var description = document.createElement('td');
      description.innerHTML = " " + shortcut["description"];
      var buttonContainer = document.createElement('td');
      var button = document.createElement('button');
      button.innerHTML = savedShortcut ? savedShortcut:defaultShortcutValue;
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
  // Désactiver la classe 'modifying' sur tous les autres boutons
  document.querySelectorAll('button.modifying').forEach(button => {
    button.classList.remove('modifying');
  });

  // Désactiver tous les écouteurs de touches existants
  hotkeys.unbind('*');

  buttonEvent.target.classList.add('modifying');
  hotkeys('*', function(event, handler) { // On écoute toutes les pressions de touche
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
      chrome.storage.local.get("shortcuts", function(result) {
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

var options = Object.keys(defaultSettings);
  options.forEach(function (option) {
    // // D'abord récupérer les valeurs stockées ou utiliser les valeurs par défaut
    chrome.storage.local.get(option, function (result) {
      let savedOptionValue = result[option];
      let defautOptionValue = defaultSettings[option];


      // ici on gère les boutons radio
      var elements = document.querySelectorAll('input[name="' + option + '"]');
      if (elements) {
        elements.forEach(element => {
          if (savedOptionValue === undefined && defautOptionValue === element.id) {
            element.checked = true;
          } else if (savedOptionValue === element.id) {
            element.checked = savedOptionValue === element.id;
          }
        });
      }



      var element = document.getElementById(option);
      if (element) {
        if (element.type === 'checkbox') {
          // Utiliser la valeur sauvegardée si elle existe, sinon utiliser la valeur par défaut
          element.checked = savedOptionValue !== undefined ? savedOptionValue : defautOptionValue;
        } else if (element.type === 'text') {
          if (option === 'apiKey') {
            // Get the current value of the API key
            chrome.storage.local.get([option], function(result) {
              // If the API key is not already defined
              if (!savedOptionValue) {
                // Generate a random API key
                var apiKey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                element.value = apiKey;

                // Save the new API key
                chrome.storage.local.set({ [option]: apiKey }, function () {
                  console.log(option, 'successfully saved with a random value', apiKey);
                });
              } else {
                // Use the saved value if it exists, otherwise use the default value
                element.value = savedOptionValue
              }
            });
          } else {
          // Utiliser la valeur sauvegardée si elle existe, sinon utiliser la valeur par défaut
          element.value = savedOptionValue !== undefined ? savedOptionValue : defautOptionValue;
          }
        }
      }
    });
  });



  // Enregistrement des valeurs dans le stockage local lors du click sur id=save
  document.getElementById('save').addEventListener('click', function () {
    var valuesToSave = {};
    options.forEach(function (option) {
      // d'abord les boutons radio
      let radioStatusElement = document.querySelector('input[name="' + option + '"]:checked');
      if (radioStatusElement) {
        valuesToSave[option] = radioStatusElement.id;
      }



      // puis le reste
      let element = document.getElementById(option);
      if (element) { // Vérifiez si l'élément existe
        var value = element.type === 'checkbox' ? element.checked : element.value;
        valuesToSave[option] = value;
      } else {
        console.log('Aucun élément trouvé avec l\'ID', option);
      }
      
    });

  var shortcuts={};
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


  function changeTitle() {
    let manifest = chrome.runtime.getManifest();
    let version = manifest.version;
    console.log(version);
    let explanationText = document.getElementById('MainTitle');
    explanationText.textContent = `Weda-Helper version ${version}`;
  }

  changeTitle();

  // ajoute un bouton pour effacer les valeurs des textes de bienvenue
  var clearButton = document.createElement('button');
  clearButton.textContent = 'Raz textes de bienvenue';
  clearButton.addEventListener('click', function() {
    // Effacez les valeurs lorsque le bouton est cliqué
    chrome.storage.local.remove(['lastExtensionVersion', 'firstStart', 'aprilFool', 'promptCompanionMessage'], function() {
      console.log('Les valeurs ont été effacées avec succès');
    });
  });

  // Ajoutez le bouton à la page
  document.body.appendChild(clearButton);

  // // affiche une info en fin de page avec les métriques utilisateur stockées
  // fonctions suivantes désactivées car elles sont présentes à des fins de test uniquement
  // // effacer les métriques
  // function clearMetrics() {
  //   // Clear all existing metrics
  //   chrome.storage.local.clear(() => {
  //     console.log('All existing metrics cleared');
  //   });
  // }

  // // Add a button for clearing metrics
  // let clearMetricsButton = document.createElement('button');
  // clearMetricsButton.textContent = 'Effacer toutes les métriques';
  // clearMetricsButton.addEventListener('click', clearMetrics);
  // document.body.appendChild(clearMetricsButton);



  function getMetricsForPeriod(periodDays) {
    let startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    let startDateStr = 'metrics-' + startDate.toISOString().split('T')[0];

    return new Promise((resolve, reject) => {
      chrome.storage.local.get(null, function(items) {
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
      chrome.storage.local.get(['globalMetrics'], function(result) {
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
    // prompt all metrics stored : add a button which calls getMetricsForPeriod("All")
    let allMetricsButton = document.createElement('button');
    allMetricsButton.textContent = 'Voir toutes les métriques dans la console';
    allMetricsButton.addEventListener('click', function() {
      getMetricsForPeriod(400).then(allMetrics => {
        console.log('All Time metrics:', allMetrics);
      });
    });
    metricsElement.appendChild(allMetricsButton);



    

    document.body.appendChild(metricsElement);
  });





  // affiche l'easter egg du 1er avril
  chrome.storage.local.get(['aprilFool'], function(result) {
    let aprilFoolDays = [1,2,3];
    let aprilFoolMonth = 3;
    let currentDay = new Date().getDate();
    let currentMonth = new Date().getMonth();


    // Easter egg pour le premier avril :) A usage unique.
    if (!result.aprilFool && currentMonth === aprilFoolMonth && aprilFoolDays.includes(currentDay)) {
      console.log('April fool');
      // Création du bouton
      let aprilFoolButton = document.createElement('button');
      aprilFoolButton.innerHTML = "Vous avez trouvé l'🥚 !";
      aprilFoolButton.style.backgroundColor = "#4CAF50";
      aprilFoolButton.style.color = "white";
      aprilFoolButton.style.padding = "0.5em 1em";
      aprilFoolButton.style.border = "none";
      aprilFoolButton.style.borderRadius = "4px";
      aprilFoolButton.style.cursor = "pointer";
      aprilFoolButton.onclick = function() {
          window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '_blank');
          chrome.storage.local.set({aprilFool: true});
      };
      // Ajout du bouton à la page
      document.body.appendChild(aprilFoolButton);
    }
  });
});


function updateCompanionLogLink() {
  chrome.storage.local.get(['apiKey', 'portCompanion', 'version'], function(result) {
    const apiKey = result.apiKey || '';
    const port = result.portCompanion || '';
    const version = result.version || '';
    const logLink = `http://localhost:${port}/log?apiKey=${encodeURIComponent(apiKey)}&versioncheck=${version}`;
    document.getElementById('companionLogLing').href = logLink;
  });
}

updateCompanionLogLink();