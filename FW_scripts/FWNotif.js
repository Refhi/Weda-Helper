// fichier de Fonction Weda de notification

// ce fichier doit être static car le navigateur
// ne veut pas utiliser des fichiers en one-line

// let weda = window.weda || {}; => neutralisé car déjà défini dans FWData.js

weda.actions.showNotification({
    message: "Notification de test", // message displayed
    icon: "home", // mat icon used for the notification
    type: "success", // color (success / fail / undefined)
    extra: {}, // extra data (json)
    duration: 5000 // duration of the notification
});