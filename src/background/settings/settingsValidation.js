
/**
 * Traverse les options, sous-options et sous-sections d'un ensemble de paramètres et applique une fonction de rappel à chaque option.
 * @param {Array} settings - La liste des catégories de paramètres.
 * @param {Function} callback - La fonction de rappel à appliquer à chaque option.
 */
function traverseOptions(settings, callback) {
    function traverse(options) {
        options.forEach(option => {
            callback(option);
            if (option.subOptions) {
                traverse(option.subOptions);
            }
        });
    }

    function traverseSections(sections) {
        sections.forEach(section => {
            if (section.options) {
                traverse(section.options);
            }
            if (section.sections) {
                traverseSections(section.sections);
            }
        });
    }

    settings.forEach(category => {
        if (category.options) {
            traverse(category.options);
        }
        if (category.sections) {
            traverseSections(category.sections);
        }
    });
}

/**
 * Valide les paramètres avancés en vérifiant que chaque option a les propriétés requises.
 * @param {Array} settings - La liste des catégories de paramètres à valider.
 * @returns {Array} - Une liste des erreurs de validation.
 */
function validateSettings(settings) {
    const errors = [];

    traverseOptions(settings, (option) => {
        if (!option.name || typeof option.name !== 'string') {
            errors.push(`Erreur dans l'option: 'name' est manquant ou n'est pas une chaîne de caractères.`);
        }
        if (!option.type || ![TYPE_BOOL, TYPE_TEXT, TYPE_HTML, TYPE_RADIO, TYPE_SMALLTEXT, TYPE_JSON, TYPE_TITLE].includes(option.type)) {
            errors.push(`Erreur dans l'option '${option.name}': 'type' est manquant ou invalide.`);
        }
        if (!option.description || typeof option.description !== 'string') {
            errors.push(`Erreur dans l'option '${option.name}': 'description' est manquant ou n'est pas une chaîne de caractères.`);
        }
        // Les TYPE_TITLE et TYPE_HTML n'ont pas besoin de valeur par défaut
        if (option.type !== TYPE_HTML && option.type !== TYPE_TITLE && option.default === undefined) {
            errors.push(`Erreur dans l'option '${option.name}': 'default' est manquant.`);
        }
    });

    return errors;
}

const validationErrors = validateSettings(advancedDefaultSettings);
if (validationErrors.length > 0) {
    console.error("Erreurs de validation des paramètres:", validationErrors);
} else {
    console.log("Tous les paramètres sont valides.");
}


/**
 * Génère les paramètres par défaut à partir des paramètres avancés. (v2.9+, pour des raisons de compatibilité rétroactive)
 * @param {Array} advancedSettings - La liste des catégories de paramètres avancés.
 * @returns {Object} - Un objet contenant les paramètres par défaut.
 */
function generateDefaultSettings(advancedSettings) {
    const defaultSettings = {};

    traverseOptions(advancedSettings, (option) => {
        defaultSettings[option.name] = option.default;
    });

    return defaultSettings;
}

const defaultSettings = generateDefaultSettings(advancedDefaultSettings);
console.log(defaultSettings);