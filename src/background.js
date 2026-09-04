// Définir les options par défaut. Définie ici pour être accessible de façon globale

// Ordre important : les fichiers de "settings/" dépendent les uns des autres (dictionnaires
// PDF Parser et alertes utilisés par advancedDefaultSettings, lui-même utilisé par la
// validation et la génération de defaultSettings). tabsHandler/permissionsHandler n'ont pas
// de contrainte d'ordre stricte entre eux (les fonctions qu'ils s'échangent ne sont appelées
// que de façon asynchrone, après le chargement complet du service worker).
importScripts(
    'background/settings/pdfParserDefautParams.js',
    'background/settings/noemieDefautParams.js',
    'background/settings/alertesParams.js',
    'background/settings/settingsDefinitions.js',
    'background/settings/settingsValidation.js',
    'background/shortcutsDefinitions.js',
    'background/tabsHandler.js',
    'background/permissionsHandler.js',
    'background/offscreenHandler.js'
);



// chargement des valeurs par défaut dans le stockage local de l'extension
chrome.storage.local.set({
    defaultSettings: defaultSettings,
    defaultShortcuts: defaultShortcuts,
    advancedDefaultSettings: advancedDefaultSettings,
    alerteSchema: alerteSchema  // Schéma de validation des alertes
}, function () {
    console.log('[background.js] Les valeurs et raccourcis par défaut ont été enregistrées');
});