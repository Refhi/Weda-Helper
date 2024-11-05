// fichier de Fonction Weda de notification

// ce fichier doit être static car le navigateur
// ne veut pas utiliser des fichiers en one-line

// let weda = window.weda || {}; => neutralisé car déjà défini dans FWData.js

// récupère la valeur présente dans le chrome storage local "notifToSend"


// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//     if (request.action === "showNotification") {
//         weda.actions.showNotification(request.notifToSend);
//         sendResponse({status: "Notification displayed"});
//     }
// });


let defautMessage = {
    message: "Notification de test", // message displayed
    icon: "home", // mat icon used for the notification
    type: "success", // color (success / fail / undefined)
    extra: "{}", // extra data (json)
    duration: 5000 // duration of the notification
};

function showNotification(notifToSend = defautMessage) {
    console.log("[showNotification] la valeur locale est", notifToSend);
    weda.actions.showNotification({
        message: notifToSend.message, // message displayed
        icon: notifToSend.icon, // mat icon used for the notification
        type: notifToSend.type, // color (success / fail / undefined)
        extra: notifToSend.extra, // extra data (json)
        duration: notifToSend.duration // duration of the notification
    });
}

// Ajout d'un écouteur pour les événements personnalisés
document.addEventListener('showNotification', function(event) {
    let notifToSend = event.detail;
    showNotification(notifToSend);
});