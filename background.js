chrome.commands.onCommand.addListener(function(command) {
  switch (command) {
    case 'push_valider':
    case 'push_annuler':
    case 'print_meds':
    case 'download_document':
    case 'push_enregistrer':
    case 'push_delete':
    case 'shortcut_w':
    case 'shortcut_consult':
    case 'shortcut_certif':
    case 'shortcut_demande':
    case 'shortcut_prescription':
    case 'shortcut_formulaire':
    case 'shortcut_courrier':
    case 'shortcut_fse':
    case 'shortcut_search':
    case 'shortcut_atcd':
    case 'shortcut_carte_vitale':
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: command});
      });
      break;
    default:
      console.log('Unknown command:', command);
  }
});


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
  'secureExchangeUncheckIHEMessage': false,
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