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
    'defaultCotation': 'GS',
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
  };

  var options = Object.keys(defaultValues);


  options.forEach(function (option) {
    // Récupérer les valeurs sauvegardées du stockage de Chrome
    chrome.storage.local.get(option, function (result) {
      var element = document.getElementById(option);
      if (element) {
        if (element.type === 'checkbox') {
          // Utiliser la valeur sauvegardée si elle existe, sinon utiliser la valeur par défaut
          element.checked = result[option] !== undefined ? result[option] : defaultValues[option];
        } else if (element.type === 'text') {
          if (option === 'apiKey') {
            // Get the current value of the API key
            chrome.storage.local.get([option], function(result) {
              // If the API key is not already defined
              if (!result[option]) {
                // Generate a random API key
                var apiKey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                element.value = apiKey;

                // Save the new API key
                chrome.storage.local.set({ [option]: apiKey }, function () {
                  console.log(option, 'successfully saved with a random value', apiKey);
                });
              } else {
                // Use the saved value if it exists, otherwise use the default value
                element.value = result[option]
              }
            });
          } else {
          // Utiliser la valeur sauvegardée si elle existe, sinon utiliser la valeur par défaut
          element.value = result[option] !== undefined ? result[option] : defaultValues[option];
          }
        }
      }
    });
  });




  document.getElementById('save').addEventListener('click', function () {
    var valuesToSave = {};
    var ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    var portRegex = /^[0-9]{1,5}$/;
    var isValid = true;

    options.forEach(function (option) {
      var element = document.getElementById(option);
      if (element) { // Vérifiez si l'élément existe
        var value = element.type === 'checkbox' ? element.checked : element.value;
      } else {
        console.log('Aucun élément trouvé avec l\'ID', option);
      }

      var letterRegex = /^([A-Z0-9]{1,7})?$/;
      if (option === 'defaultCotation' && !letterRegex.test(value)) {
        alert('defaultCotation doit être composé uniquement de lettres majuscules et ne doit pas contenir plus de 7 lettres, ou être une chaîne vide');
        isValid = false;
        return;
      }
      valuesToSave[option] = value;
    });

    if (isValid) {
      chrome.storage.local.set(valuesToSave, function () {
        console.log('Sauvegardé avec succès');
        alert('Les options ont été sauvegardées avec succès');
        console.log(valuesToSave);
      });
    }
  });
});