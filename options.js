document.addEventListener('DOMContentLoaded', function () {
  var options = [
    'TweakImports',
    'TweakTabConsultation',
    'RemoveTitleSuggestions',
    'EnableHelp',
    'TweakTabSearchPatient',
    'TweakTabPrescription',
    'RemoveLocalCompanionPrint',
    'RemoveLocalCompanionTPE',
    'KeepFocus',
    'portCompanion',
    'defaultCotation',
    'apiKey'
  ];

  var defautsTextValues = {
    'portCompanion': '4821'
  };

  options.forEach(function (option) {
    // Récupérer les valeurs sauvegardées du stockage de Chrome
    chrome.storage.local.get(option, function (result) {
      console.log(option, result);
      var element = document.getElementById(option);
      if (element.type === 'checkbox') {
        if (result[option] !== undefined) element.checked = result[option];
        else {
          element.checked = true;
          chrome.storage.local.set({ [option]: true }, function () {
            console.log(option, 'sauvegardé avec succès avec la valeur par défaut', true);
          });
        }
      } else if (element.type === 'text') {
        if (result[option] !== undefined) element.value = result[option];        
          else {
            if (option === 'apiKey') {
              // Générer une clé API aléatoire
              var apiKey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
              element.value = apiKey;
              chrome.storage.local.set({ [option]: apiKey }, function () {
                console.log(option, 'sauvegardé avec succès une valeur aléatoire', apiKey);
              });
            } else {
              for (var key in defautsTextValues) {
                if (key === option) {
                  element.value = defautsTextValues[key];
                  chrome.storage.local.set({ [option]: defautsTextValues[key] }, function () {
                    console.log(option, 'sauvegardé avec succès avec la valeur par défaut', defautsTextValues[key]);
                  });
                }
              }
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
      var value = element.type === 'checkbox' ? element.checked : element.value;

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
      });
    }
  });
});