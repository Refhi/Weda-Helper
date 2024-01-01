document.addEventListener('DOMContentLoaded', function () {
  var options = [
    'TweakImports',
    'TweakTabConsultation',
    'RemoveTitleSuggestions',
    'EnableHelp',
    'TweakTabSearchPatient',
    'TweakTabPrescription',
    'RemoveLocalCompanionPrint',
    'delay_primary',
    'RemoveLocalCompanionTPE',
    'portCompanion',
    'defaultCotation'
  ];

  var defautsTextValues = {
    'delay_primary': '0.02',
    'portCompanion': '3000'
  };

  options.forEach(function (option) {
    // Récupérer les valeurs sauvegardées du stockage de Chrome
    chrome.storage.sync.get(option, function (result) {
      console.log(option, result);
      var element = document.getElementById(option);
      if (element.type === 'checkbox') {
        if (result[option] !== undefined) element.checked = result[option];
        else {
          element.checked = true;
          chrome.storage.sync.set({ [option]: true }, function () {
            console.log(option, 'sauvegardé avec succès avec la valeur par défaut', true);
          });
        }
      } else if (element.type === 'text') {
        if (result[option] !== undefined) element.value = result[option];
        else {
          for (var key in defautsTextValues) {
            if (key === option) {
              element.value = defautsTextValues[key];
              chrome.storage.sync.set({ [option]: defautsTextValues[key] }, function () {
                console.log(option, 'sauvegardé avec succès avec la valeur par défaut', defautsTextValues[key]);
              });
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

      // check that values in defautsTextValues entered are valid : they must be not be more than 10 times the default value nor less than 0.1 times the default value
      for (var key in defautsTextValues) {
        if (key === option && option.includes('delay')) {
          console.log("working on option " +option + " key " + key + " with value " + value);
          if (isNaN(value) || value > 100 * defautsTextValues[key] || value < 0.01 * defautsTextValues[key]) {
            alert('Veuillez entrer une valeur entre 0.01 et 100 fois la valeur par défaut');
            isValid = false;
            return;
          }
        }
      }


      valuesToSave[option] = value;
    });

    if (isValid) {
      chrome.storage.sync.set(valuesToSave, function () {
        console.log('Sauvegardé avec succès');
        alert('Les options ont été sauvegardées avec succès');
      });
    }
  });
});