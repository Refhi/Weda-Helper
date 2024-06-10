// Définir les options par défaut. Définie ici pour être accessible de façon globale
var defaultSettings = {
  'TweakImports': true,
  'TweakTabConsultation': true,
  'RemoveTitleSuggestions': true,
  'EnableHelp': true,
  'TweakTabSearchPatient': true,
  'TweakTabPrescription': true,
  'RemoveLocalCompanionPrint': true,
  'RemoveLocalCompanionTPE': true,
  'KeepFocus': true,
  'portCompanion': '4821',
  'defaultCotation': true,
  'apiKey': 'votre clé API par défaut',
  'keepMedSearch': true,
  'addMedSearchButtons': true,
  'boutonRecherche-1': true,
  'boutonRecherche-2': true,
  'boutonRecherche-3': false,
  'boutonRecherche-4': false,
  'boutonRecherche-5': false,
  'boutonRecherche-6': false,
  'boutonRecherche-7': false,
  'boutonRecherche-8': true,
  'boutonRecherche-9': false,
  'boutonRecherche-10': false,
  // "boutonRecherche-11", // n'existe pas !
  // "boutonRecherche-12", // n'existe pas !
  'boutonRecherche-13': false,
  'boutonRecherche-14': false,
  'TweakRecetteForm': true,
  'TweakNIR': true,
  'KeyPadPrescription': true,
  'TweakFSEGestion': true,
  'TweakFSECreation': true,
  'TweakFSEDetectMT' : false,
  'TweakFSEGestionUnique': false,
  'TweakFSEAccident': false,
  'autoSelectPatientCV': true,
  'WarpButtons': true,
  'autoConsentNumPres': false,
  'NumPresPrescription': false,
  'NumPresDemande': false,
  'postPrintBehavior': 'closePreview', // boutons radio
  'MoveHistoriqueToLeft': true,
  'MoveHistoriqueToLeft_Consultation': true,
  'MoveHistoriqueToLeft_Certificat': true,
  'MoveHistoriqueToLeft_Demande': true,
  'MoveHistoriqueToLeft_Courrier': false,
  'ShowExplanatoryText': true,
  'autoOpenOrdoType': false,
  'defautDataType': 'TAILLE:cm,Taille:cm,POIDS:kg,Poids:kg,Pc:cm,IMC:p/t²,PAd:mmHg,PAs:mmhg,TAS:mmHg,TAD:mmHg,FC:bpm,Sat:%',
  'autoATCD': false,
  'secureExchangeAutoRefresh': true,
  'autoAATI': true,
};

// chrome.runtime.onInstalled.addListener((details) => { // Cette partie ne semble pas fonctionner correctement
// Donc on passe plutôt par la comparaison des version, qui est déjà gérée de façon fiable dans update.js
chrome.storage.local.get(['lastExtensionVersion', 'firstStart'], function(result) {
  let currentVersion = chrome.runtime.getManifest().version;
  console.log('[background.js] Version actuelle :', currentVersion, 'Dernière version enregistrée :', result.lastExtensionVersion);
  if (result.lastExtensionVersion !== currentVersion) {
    // Enregistrer les valeurs par défaut dans le stockage
    chrome.storage.local.set({defaultSettings: defaultSettings}, function() {
      console.log('[background.js] Les valeurs par défaut ont été enregistrées');
    });
  }
  // TODO : à évaluer : est-ce que ça limite vraiment la charge ?
});
