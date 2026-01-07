

/**
 * Récupère la valeur d'une ou plusieurs options depuis le stockage local de Chrome.
 * Si une option n'est pas trouvée, elle utilise la valeur par défaut des paramètres.
 * @see getOptionPromise pour une version utilisant les Promesses
 *
 * @param {string|string[]} optionNames - Le nom de l'option ou un tableau de noms d'options à récupérer.
 * @param {function} callback - La fonction de rappel à exécuter avec les valeurs des options récupérées.
 *
 * @example <caption>Récupération d'une seule option</caption>
 * getOption('trimCIM10', function (trimCIM10) {
 *     console.log('Valeur de trimCIM10:', trimCIM10);
 * });
 *
 * @example <caption>Récupération de plusieurs options</caption>
 * getOption(['RemoveLocalCompanionPrint', 'postPrintBehavior'], function ([RemoveLocalCompanionPrint, postPrintBehavior]) {
 *     console.log('Valeur de RemoveLocalCompanionPrint:', RemoveLocalCompanionPrint);
 *     console.log('Valeur de postPrintBehavior:', postPrintBehavior);
 * });
 * 
 * 
 */
function getOption(optionNames, callback) {
    getOptionValues(optionNames, callback);
}


/**
 * version de getOption utilisant les Promesses
 * @see getOption pour une version utilisant les callbacks 
 */
function getOptionPromise(optionNames) {
    return new Promise((resolve, reject) => {
        getOptionValues(optionNames, resolve);
    });
}


function getOptionValues(optionNames, callback) {
    let isInputArray = Array.isArray(optionNames);

    if (!isInputArray) {
        optionNames = [optionNames];
    }

    // Nouvelle version: attend via Promise avant de lire le storage
    waitForWeda({ logWait: optionNames }).then(() => {
        chrome.storage.local.get([...optionNames, 'defaultSettings'], function (result) {
            let options = [];
            for (let optionName of optionNames) {
                let optionValue;
                if (!WedaOverloadOptions) {
                    // console.log('[getOption] WedaOverloadOptions est vide, et de valeur ', WedaOverloadOptions);
                }
                if (WedaOverloadOptions && Object.keys(WedaOverloadOptions).length > 0 && WedaOverloadOptions[optionName] !== undefined) {
                    optionValue = WedaOverloadOptions[optionName];
                } else if (result[optionName] !== undefined) {
                    optionValue = result[optionName];
                } else {
                    optionValue = result.defaultSettings[optionName];
                }
                options.push(optionValue);
            }
            callback(isInputArray ? options : options[0]);
        });
    });
}

/**
 * Récupère la valeur par défaut d'une ou plusieurs options depuis le stockage local de Chrome.
 * Fonctionne avec callback ou promesse selon le mode de sollicitation.
 *
 * @param {string|string[]} optionNames - Le nom de l'option ou un tableau de noms d'options à récupérer.
 * @param {function} [callback] - La fonction de rappel optionnelle à exécuter avec les valeurs par défaut récupérées.
 * @returns {Promise|undefined} - Retourne une promesse si aucun callback n'est fourni, sinon undefined.
 *
 * @example <caption>Récupération avec callback</caption>
 * getDefaultOption('trimCIM10', function (defaultValue) {
 *     console.log('Valeur par défaut de trimCIM10:', defaultValue);
 * });
 *
 * @example <caption>Récupération avec async/await</caption>
 * const defaultValue = await getDefaultOption('trimCIM10');
 * console.log('Valeur par défaut:', defaultValue);
 *
 * @example <caption>Récupération de plusieurs options avec promesse</caption>
 * const [default1, default2] = await getDefaultOption(['option1', 'option2']);
 */
function getDefaultOption(optionNames, callback) {
    // Si aucun callback n'est fourni, retourner une promesse
    if (!callback) {
        return new Promise((resolve) => {
            getDefaultOption(optionNames, resolve);
        });
    }

    let isInputArray = Array.isArray(optionNames);

    if (!isInputArray) {
        optionNames = [optionNames];
    }

    chrome.storage.local.get('defaultSettings', function (result) {
        let options = [];
        for (let optionName of optionNames) {
            let optionValue;
            if (result.defaultSettings && result.defaultSettings[optionName] !== undefined) {
                optionValue = result.defaultSettings[optionName];
            } else {
                console.warn(`[getDefaultOption] Valeur par défaut non trouvée pour "${optionName}"`);
                optionValue = undefined;
            }
            options.push(optionValue);
        }
        callback(isInputArray ? options : options[0]);
    });
}