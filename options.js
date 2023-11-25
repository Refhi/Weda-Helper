document.addEventListener('DOMContentLoaded', function() {
  // Récupérer les valeurs sauvegardées du stockage de Chrome
  chrome.storage.sync.get(['TweakImports', 'TweakTabConsultation'], function(items) {
    if (items.TweakImports === undefined && items.TweakTabConsultation === undefined) {
      // Si les valeurs n'ont pas été définies, les définir sur true
      chrome.storage.sync.set({TweakImports: true, TweakTabConsultation: true}, function() {
        console.log('Valeurs par défaut définies');
      });
    }
    document.getElementById('TweakImports').checked = items.TweakImports !== undefined ? items.TweakImports : true;
    document.getElementById('TweakTabConsultation').checked = items.TweakTabConsultation !== undefined ? items.TweakTabConsultation : true;
  });

  document.getElementById('save').addEventListener('click', function() {
    var TweakImports = document.getElementById('TweakImports').checked;
    var TweakTabConsultation = document.getElementById('TweakTabConsultation').checked;
    chrome.storage.sync.set({TweakImports: TweakImports, TweakTabConsultation: TweakTabConsultation}, function() {
      console.log('Options saved');
      alert('Options saved');
    });
  });
});