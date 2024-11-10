const buttons = {
  'allConsultation': 'allConsultation',
  'tpebis': 'tpebis',
  // Ajoutez d'autres boutons ici
  'sendWedaNotif': 'sendWedaNotif',
  'sendCustomAmount': 'sendCustomAmount',
};

for (let id in buttons) {
  document.getElementById(id).addEventListener('click', function() {
      console.log(id + " clicked");
      if (id === 'sendCustomAmount') {
          let customAmount = document.getElementById('customAmount').value;
          if (customAmount) {
              chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                  chrome.tabs.sendMessage(tabs[0].id, {action: buttons[id], amount: customAmount});
              });
              console.log(buttons[id] + " message sent with amount: " + customAmount);
          } else if (id === 'sendWedaNotif') {
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {action: buttons[id]});
            });
          } else {
              console.log("No amount entered");
          }
      } else {
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
              chrome.tabs.sendMessage(tabs[0].id, {action: buttons[id]});
          });
          console.log(buttons[id] + " message sent");
      }
  });
}

