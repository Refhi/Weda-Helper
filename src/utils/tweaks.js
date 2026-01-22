/**
 * @file tweaks.js
 * @description Système de gestion des modifications (tweaks) conditionnelles.
 * Permet d'activer des fonctionnalités spécifiques selon l'URL de la page
 * et les options de configuration de l'utilisateur.
 * 
 * @exports addTweak - Enregistre un tweak conditionnel
 * 
 * @requires storage.js (getOption)
 * @requires dom-oberver.js (waitForWeda)
 * @requires configs.js (baseUrl)
 */

/**
 * Ajoute une modification (tweak) en fonction de l'URL et des options spécifiées.
 *
 * @param {string|string[]} path - Le chemin ou les chemins auxquels la modification doit s'appliquer. Peut être une chaîne ou un tableau de chaînes.
 * @param {string|Array<{option: string, callback: function}>} option - 
 * L'option ou les options à vérifier. Peut être une chaîne ou un tableau d'objets contenant une option et un callback.
 * Si l'option commence par '!', elle est considérée comme négative. Si elle commence par '*', le callback est toujours exécuté.
 * @param {function} callback - La fonction à exécuter si l'option est activée. Ignorée si l'option est un array contenant des options/callback .
 * @example addTweak('/FolderGestion/RecetteForm.aspx', 'TweakRecetteForm', function () {console.log('TweakRecetteForm activé');});
 */
function addTweak(path, option, callback) {
    // console.log(`[addTweak] ${path} - ${option} registered`);
    async function executeOption(option, callback, invert = false, mandatory = false) {
        // console.log(`[addTweak] ${option} avec inversion ${invert} et mandatory ${mandatory}`);
        // on attend le retour de weda (avec un timeout)
        await waitForWeda({ logWait: option });

        if (mandatory) {
            console.log(`[addTweak] ${option} activé`);
            callback();
        } else {
            getOption(option, function (optionValue) {
                // Considérer comme true si:
                // - optionValue est true (booléen)
                // - optionValue est une chaîne non vide
                // Et appliquer l'inversion si nécessaire
                const isActive = (optionValue === true || (typeof optionValue === 'string' && optionValue !== ''));
                if ((isActive && !invert) || (!isActive && invert)) {
                    console.log(`[addTweak] ${option} activé`);
                    callback();
                }
            });
        }
    }

    // Construire l'URL complète en utilisant baseUrl
    const fullUrl = (path) => `${baseUrl}${path}`;

    // on vérifie que l'url correspond à une de celles passées en paramètre
    let urlMatches;
    if (path === '*') {
        urlMatches = true; // Si l'URL est '*', on considère que ça correspond toujours
    } else {
        urlMatches = Array.isArray(path)
            ? path.some(p => window.location.href.startsWith(fullUrl(p)))
            : window.location.href.startsWith(fullUrl(path));
    }

    if (urlMatches) {
        // Convertir l'option en tableau si ce n'est pas déjà le cas
        if (!Array.isArray(option)) {
            option = [{ option, callback }];
        }
        if (Array.isArray(option) && option.length > 0) {
            // Si un tableau d'options et de callbacks est passé, on les utilise tous
            // permet de ne pas avoir à écrire plusieurs fois la même condition
            option.forEach(({ option, callback }) => {
                // permet de gérer les options en négatif
                let invert = false;
                if (option.startsWith('!')) {
                    option = option.slice(1);
                    invert = true;
                }

                let mandatory = false;
                if (option.startsWith('*')) {
                    option = option.slice(1);
                    mandatory = true;
                }
                executeOption(option, callback, invert, mandatory);
            });
        }
    }
}