document.addEventListener('DOMContentLoaded', function () {
  var defaultValues = {
    'TweakImports': true,
    'TweakTabConsultation': true,
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
    'TweakFSEAccident': false,
    'autoSelectPatientCV': true,
    'WarpButtons': true,
    'autoConsentNumPres': false,
    'NumPresPrescription': false,
    'NumPresDemande': false,
    'postPrintBehavior': 'closePreview', // boutons radio
    'MoveHistoriqueToLeft': true,
    'MoveHistoriqueToLeft_Consultation': true,
    'MoveHistoriqueToLeft_Certificat': true,
    'MoveHistoriqueToLeft_Demande': true,
    'MoveHistoriqueToLeft_Courrier': false,
    'ShowExplanatoryText': true,
    'autoOpenOrdoType': false,
    'defautDataType': 'TAILLE:cm,Taille:cm,POIDS:kg,Poids:kg,Pc:cm,IMC:p/t²,PAd:mmHg,PAs:mmhg,TAS:mmHg,TAD:mmHg,FC:bpm,Sat:%',
    'autoATCD': false,
    'secureExchangeAutoRefresh': true,
    'autoAATI': true,
  };

  var options = Object.keys(defaultValues);


  options.forEach(function (option) {
    // // D'abord récupérer les valeurs stockées ou utiliser les valeurs par défaut
    chrome.storage.local.get(option, function (result) {
      let savedOptionValue = result[option];
      let defautOptionValue = defaultValues[option];


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

});


// ajoute un bouton pour effacer les valeurs des textes de bienvenue
var clearButton = document.createElement('button');
clearButton.textContent = 'Raz textes de bienvenue';
clearButton.addEventListener('click', function() {
  // Effacez les valeurs lorsque le bouton est cliqué
  chrome.storage.local.remove(['lastExtensionVersion', 'firstStart', 'aprilFool'], function() {
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