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
    'ipTPE',
    'portTPE'
  ];

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
          if (option === 'ipTPE') {
            element.value = 'localhost';
            chrome.storage.sync.set({ [option]: 'localhost' }, function () {
              console.log(option, 'sauvegardé avec succès avec la valeur par défaut', 'localhost');
            });
          } else if (option === 'portTPE') {
            element.value = '5000';
            chrome.storage.sync.set({ [option]: '5000' }, function () {
              console.log(option, 'sauvegardé avec succès avec la valeur par défaut', '5000');
            });
          } else {
            element.value = '';
            chrome.storage.sync.set({ [option]: '' }, function () {
              console.log(option, 'sauvegardé avec succès avec la valeur par défaut', '');
            });
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

      if (option === 'ipTPE' && !ipRegex.test(value) && value !== 'localhost') {
        alert('Veuillez entrer une adresse IP valide');
        isValid = false;
        return;
      }

      if (option === 'portTPE' && (!portRegex.test(value) || value < 1 || value > 65535)) {
        alert('Veuillez entrer un numéro de port valide');
        isValid = false;
        return;
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