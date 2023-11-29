document.addEventListener('DOMContentLoaded', function() {
  var options = ['TweakImports', 'TweakTabConsultation', 'RemoveTitleSuggestions', 'EnableHelp', 'TweakTabSearchPatient', 'TweakTabPrescription'];

  options.forEach(function(option) {
    // Récupérer les valeurs sauvegardées du stockage de Chrome
    chrome.storage.sync.get(option, function(result) {
      console.log(option,result);
      if (result[option] !== undefined) document.getElementById(option).checked = result[option];
      else {
        document.getElementById(option).checked = true;
        chrome.storage.sync.set({[option]: true}, function() {
          console.log(option, 'sauvegardé avec succès avec la valeur par défault', true);
        });
      }
    });
  });

  document.getElementById('save').addEventListener('click', function() {
    var valuesToSave = {};
    options.forEach(function(option) {
      valuesToSave[option] = document.getElementById(option).checked;
    });
    chrome.storage.sync.set(valuesToSave, function() {
      console.log('Sauvegardé avec succès');
      alert('Les options ont été sauvegardées avec succès');
    });
  });
});