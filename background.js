// Définir les options par défaut. Définie ici pour être accessible de façon globale
var defaultSettings = {
  'TweakImports': true,
  'TweakTabConsultation': true,
  'FocusOnTitleInConsultation': false,
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
  'TweakSCORDegradee': false,
  'autoSelectPatientCV': true,
  'WarpButtons': true,
  'autoSelectTypeOrdoNum': true,
  'autoConsentNumPres': false,
  'autoValidateOrdoNum': false,
  'NumPresPrescription': false,
  'NumPresDemande': false,
  'uncheckDMPIfImagerie': true,
  'postPrintBehavior': 'closePreview', // boutons radio
  'MoveHistoriqueToLeft': true,
  'MoveHistoriqueToLeft_Consultation': true,
  'MoveHistoriqueToLeft_Certificat': true,
  'MoveHistoriqueToLeft_Demande': true,
  'MoveHistoriqueToLeft_Courrier': false,
  'MoveHistoriqueToLeft_Formulaire': false,
  'ShowExplanatoryText': true,
  'autoOpenOrdoType': false,
  'AlertOnMedicationInteraction': true,
  'defautDataType': 'TAILLE:cm,Taille:cm,POIDS:kg,Poids:kg,Pc:cm,IMC:p/t²,PAd:mmHg,PAs:mmhg,TAS:mmHg,TAD:mmHg,FC:bpm,Sat:%',
  'autoATCD': false,
  'secureExchangeAutoRefresh': true,
  'secureExchangeUncheckIHEMessage': false,
  'autoAATI': true,
};

var defaultShortcuts = {
  "push_valider": {
        "default": "Alt+V",
        "description": "Appuie Valider"
    },
    "push_annuler": {
        "default": "Alt+A",
        "description": "Appuie Annuler"
    },
    "print_meds": {
        "default": "Ctrl+P",
        "description": "Imprime le document en cours (1er modèle). Nécessite un module complémentaire pour que l'impression soit entièrement automatique. Sinon affiche directement le PDF."
    },
    "print_meds_bis": {
        "default": "Ctrl+Shift+P",
        "description": "Imprime le document en cours (2e modèle)"
    },
    "download_document": {
        "default": "Ctrl+D",
        "description": "Télécharge le PDF du document en cours (1er modèle)"
    },
    "download_document_bis": {
        "default": "Ctrl+Shift+D",
        "description": "Télécharge le PDF du document en cours (2e modèle)"
    },
    "upload_latest_file":{
        "default": "Ctrl+U",
        "description": "Upload le dernier fichier du dossier envoyé par le Companion",
    },
    "push_enregistrer": {
        "default": "Ctrl+S",
        "description": "Appuie Enregistrer"
    },
    "push_delete": {
        "default": "Alt+S",
        "description": "Appuie Supprimer"
    },
    "shortcut_w": {
        "default": "Alt+W",
        "description": "Appuie sur W"
    },
    "shortcut_consult": {
        "default": "Alt+1",
        "description": "Ouvre ou crée la consultation n°1"
    },
    "shortcut_certif": {
        "default": "Alt+2",
        "description": "Ouvre ou crée le certificat n°1"
    },
    "shortcut_demande": {
        "default": "Alt+3",
        "description": "Ouvre ou crée la demande n°1"
    },
    "shortcut_prescription": {
        "default": "Alt+4",
        "description": "Ouvre ou crée la prescription n°1"
    },
    "shortcut_formulaire": {
        "default": "Alt+F",
        "description": "Ouvre ou crée le formulaire n°1"
    },
    "shortcut_courrier": {
        "default": "Alt+5",
        "description": "Ouvre ou crée courrier n°1"
    },
    "shortcut_fse": {
        "default": "Alt+6",
        "description": "Clique sur FSE"
    },
    "shortcut_carte_vitale": {
        "default": "Alt+C",
        "description": "Lit la carte vitale"
    },
    "shortcut_search": {
        "default": "Alt+R",
        "description": "Ouvre la recherche"
    },
    "shortcut_atcd": {
        "default": "Alt+Z",
        "description": "Ouvre les antécédents"
    }
};

// retour à un chargement systématique, a priori sans impact évident sur le temps de chargement
chrome.storage.local.set({defaultSettings: defaultSettings, defaultShortcuts: defaultShortcuts}, function() {
    console.log('[background.js] Les valeurs et raccourcis par défaut ont été enregistrées');
});
