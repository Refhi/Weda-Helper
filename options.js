document.getElementById('save').addEventListener('click', function() {
    var option1 = document.getElementById('option1').value;
    chrome.storage.sync.set({option1: option1}, function() {
      console.log('Sauvegardé avec succès');
    });
  });