const buttons = {
    'allConsultation': 'allConsultation',
    'tpetest': 'tpetest',
    // Ajoutez d'autres boutons ici
  };
  
  for (let id in buttons) {
    document.getElementById(id).addEventListener('click', function() {
      console.log(id + " clicked");
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: buttons[id]});
      });
      console.log(buttons[id] + " message sent");
    });
  }