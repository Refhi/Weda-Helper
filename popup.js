document.getElementById('allConsultation').addEventListener('click', function() {
    console.log("clicked");
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "allConsultation"});
    });
    console.log("message sent");
  });