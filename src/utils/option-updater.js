/**
 * @file option-updater.js
 * @description Système de mise à jour automatique des options utilisateur.
 * Permet d'ajouter ou de modifier automatiquement des valeurs d'options
 * pour les utilisateurs existants, avec gestion de dates limites et tracking.
 * 
 * @exports autoAddToOption - Met à jour automatiquement une option
 * 
 * @requires storage.js (getOptionPromise, getDefaultOption)
 * @requires notifications.js (sendWedaNotif)
 */

/**
 * Ajoute automatiquement des valeurs à une option si la date limite n'est pas dépassée
 * et si l'opération n'a pas déjà été effectuée.
 * 
 * @param {Object} options - Options de configuration
 * @param {string} options.updateId - Identifiant unique de cette mise à jour (ex: "cotation-jan-2026")
 * @param {string} options.optionName - Nom de l'option à modifier
 * @param {string|string[]} [options.valuesToAdd] - Valeur(s) à ajouter (requis si resetToDefault est false)
 * @param {string} options.deadline - Date limite au format ISO (ex: '2026-02-01')
 * @param {boolean} [options.resetToDefault=false] - Si true, réinitialise l'option à sa valeur par défaut
 * 
 * @returns {Promise<boolean>} - Retourne true si l'opération a été effectuée, false sinon
 * 
 * @example
 * // Ajouter des valeurs à une liste (détection automatique du type)
 * await autoAddToOption({
 *     updateId: 'cotation-jan-2026',
 *     optionName: 'cotationHelper2',
 *     valuesToAdd: ['GL1', 'GL2', 'GL3'],
 *     deadline: '2026-02-01'
 * });
 * 
 * @example
 * // Réinitialiser une option à sa valeur par défaut
 * await autoAddToOption({
 *     updateId: 'reset-cotation-mars-2026',
 *     optionName: 'cotationHelper2',
 *     deadline: '2026-03-01',
 *     resetToDefault: true
 * });
 * 
 * @example
 * // Remplacer complètement une valeur booléenne
 * await autoAddToOption({
 *     updateId: 'activation-feature-x',
 *     optionName: 'myBoolOption',
 *     valuesToAdd: true,
 *     deadline: '2026-02-01'
 * });
 */
async function autoAddToOption({
    updateId,
    optionName,
    valuesToAdd,
    deadline,
    resetToDefault = false
}) {
    // Validation des paramètres obligatoires
    if (!updateId) {
        console.error(`[autoAddToOption] Erreur: updateId est obligatoire`);
        return false;
    }
    
    if (!optionName) {
        console.error(`[autoAddToOption] Erreur: optionName est obligatoire`);
        return false;
    }
    
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const trackingKey = `autoAddToOption_${updateId}`;
    const logPrefix = `autoAddOption:${updateId}`;
    
    // Validation des paramètres
    if (!resetToDefault && (valuesToAdd === undefined || valuesToAdd === null)) {
        console.error(`[${logPrefix}] Erreur: valuesToAdd est requis si resetToDefault n'est pas activé`);
        return false;
    }
    
    if (resetToDefault && valuesToAdd !== undefined) {
        console.warn(`[${logPrefix}] Attention: valuesToAdd est ignoré quand resetToDefault est activé`);
    }
    
    // Log de démarrage
    console.log(`[${logPrefix}] Démarrage pour l'option "${optionName}"`);
    
    // Vérifier si on est avant la date limite
    if (now >= deadlineDate) {
        console.log(`[${logPrefix}] Date limite dépassée (${deadline}), pas d'ajout automatique`);
        return false;
    }
    
    // Vérifier si le contrôle a déjà été effectué
    const alreadyDone = await getOptionPromise(trackingKey);
    if (alreadyDone) {
        console.log(`[${logPrefix}] Opération déjà effectuée précédemment`);
        return false;
    }
    
    // Cas de réinitialisation à la valeur par défaut
    if (resetToDefault) {
        const defaultValue = await getDefaultOption(optionName);
        
        if (defaultValue !== undefined) {
            const currentValue = await getOptionPromise(optionName);
            
            return new Promise((resolve) => {
                chrome.storage.local.set({ 
                    [optionName]: defaultValue,
                    [trackingKey]: true 
                }, function() {
                    console.log(`[${logPrefix}] Réinitialisation | Avant: "${currentValue}" | Après: "${defaultValue}"`);
                    sendWedaNotif({
                        message: `L'option "${optionName}" a été réinitialisée à sa valeur par défaut.`,
                        icon: 'refresh',
                        type: 'success',
                        duration: 8000
                    });
                    resolve(true);
                });
            });
        } else {
            console.warn(`[${logPrefix}] Valeur par défaut non trouvée`);
            return false;
        }
    }
    
    // Récupérer la valeur par défaut pour déterminer le type
    const defaultValue = await getDefaultOption(optionName);
    
    // Détecter le type d'option automatiquement
    let optionType = 'unknown';
    let isList = false;
    let isBoolean = false;
    let isJSON = false;
    
    if (defaultValue !== undefined) {
        if (typeof defaultValue === 'boolean') {
            optionType = 'bool';
            isBoolean = true;
        } else if (typeof defaultValue === 'string') {
            // Tenter de parser en JSON pour détecter les types JSON
            try {
                JSON.parse(defaultValue);
                optionType = 'json';
                isJSON = true;
            } catch {
                // Si ce n'est pas du JSON, vérifier si c'est une liste séparée par des virgules
                if (defaultValue.includes(',')) {
                    optionType = 'text-list';
                    isList = true;
                } else {
                    optionType = 'text';
                    isList = false;
                }
            }
        }
    }
    
    console.log(`[${logPrefix}] Type détecté: ${optionType}`);
    
    // Récupérer la valeur actuelle de l'option
    let currentValue = await getOptionPromise(optionName);
    if (currentValue === undefined || currentValue === null) {
        currentValue = isList ? '' : (isBoolean ? false : '');
    }
    
    let newValue;
    let modified = false;
    let addedValues = [];
    
    if (isBoolean) {
        // Type booléen : remplacer directement
        newValue = valuesToAdd;
        modified = (newValue !== currentValue);
        if (modified) {
            addedValues = [newValue.toString()];
        }
        } else if (isJSON) {
        // Type JSON : parser, merger et re-stringifier
        try {
            let currentData = currentValue ? JSON.parse(currentValue) : [];
            const valuesToAddArray = Array.isArray(valuesToAdd) ? valuesToAdd : [valuesToAdd];
            
            if (Array.isArray(currentData)) {
                valuesToAddArray.forEach(val => {
                    // Pour les tableaux à deux dimensions [clé, [valeurs]], vérifier si la clé existe déjà
                    if (Array.isArray(val) && val.length >= 2 && Array.isArray(val[1])) {
                        const key = val[0];
                        const newValues = val[1];
                        const existingIndex = currentData.findIndex(item => 
                            Array.isArray(item) && item.length >= 1 && item[0] === key
                        );
                        
                        if (existingIndex === -1) {
                            // La clé n'existe pas, on ajoute l'entrée complète
                            currentData.push(val);
                            addedValues.push(val);
                            modified = true;
                            console.log(`[${logPrefix}] Clé "${key}" ajoutée avec valeurs:`, newValues);
                        } else {
                            // La clé existe, on fusionne les valeurs
                            const existingEntry = currentData[existingIndex];
                            const existingValues = Array.isArray(existingEntry[1]) ? existingEntry[1] : [];
                            const valuesToMerge = [];
                            
                            newValues.forEach(newVal => {
                                if (!existingValues.includes(newVal)) {
                                    existingValues.push(newVal);
                                    valuesToMerge.push(newVal);
                                    modified = true;
                                }
                            });
                            
                            if (valuesToMerge.length > 0) {
                                currentData[existingIndex] = [key, existingValues];
                                addedValues.push([key, valuesToMerge]);
                                console.log(`[${logPrefix}] Clé "${key}" existe, valeurs ajoutées:`, valuesToMerge);
                            } else {
                                console.log(`[${logPrefix}] Clé "${key}" existe avec toutes les valeurs déjà présentes`);
                            }
                        }
                    } else {
                        // Pour les valeurs simples (non-tableaux), utiliser includes()
                        if (!currentData.includes(val)) {
                            currentData.push(val);
                            addedValues.push(val);
                            modified = true;
                        }
                    }
                });
                newValue = JSON.stringify(currentData);
            } else {
                console.warn(`[${logPrefix}] Structure JSON non gérée, modification impossible`);
                return false;
            }
        } catch (error) {
            console.error(`[${logPrefix}] Erreur lors du parsing JSON:`, error);
            return false;
        }
    } else if (isList) {
        // Type liste séparée par virgules
        let currentList = currentValue ? 
            currentValue.split(',').map(item => item.trim()).filter(item => item !== '') : 
            [];
        
        const valuesToAddArray = Array.isArray(valuesToAdd) ? valuesToAdd : [valuesToAdd];
        
        valuesToAddArray.forEach(val => {
            if (!currentList.includes(val)) {
                currentList.push(val);
                addedValues.push(val);
                modified = true;
            }
        });
        
        newValue = currentList.join(', ');
    } else {
        // Type texte simple : vérifier si c'est une liste ou une valeur unique
        if (defaultValue && defaultValue.includes(',')) {
            // C'est une liste séparée par des virgules
            let currentList = currentValue ? 
                currentValue.split(',').map(item => item.trim()).filter(item => item !== '') : 
                [];
            
            const valuesToAddArray = Array.isArray(valuesToAdd) ? valuesToAdd : [valuesToAdd];
            
            valuesToAddArray.forEach(val => {
                if (!currentList.includes(val)) {
                    currentList.push(val);
                    addedValues.push(val);
                    modified = true;
                }
            });
            
            newValue = currentList.join(', ');
        } else {
            // Valeur texte simple : remplacer complètement
            const values = Array.isArray(valuesToAdd) ? valuesToAdd : [valuesToAdd];
            newValue = values.length > 0 ? values[0] : '';
            modified = (newValue !== currentValue);
            if (modified) {
                addedValues = [newValue];
            }
        }
    }
    
    // Sauvegarder si des modifications ont été faites
    if (modified) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ 
                [optionName]: newValue,
                [trackingKey]: true 
            }, function() {
                const addedStr = addedValues.join(', ');
                const typeLabel = isBoolean ? 'booléen' : (isJSON ? 'JSON' : (isList ? 'liste' : 'texte'));
                console.log(`[${logPrefix}] Modification effectuée (${typeLabel}) | Avant: "${currentValue}" | Ajouté: "${addedStr}" | Après: "${newValue}"`);
                
                const actionWord = isBoolean ? 'défini' : (isList || isJSON ? 'ajouté(s)' : 'défini');
                sendWedaNotif({
                    message: `Mise à jour automatique de "${optionName}": ${addedStr} ${actionWord}.`,
                    icon: 'info',
                    type: 'success',
                    duration: 8000
                });
                resolve(true);
            });
        });
    } else {
        // Marquer comme fait même si rien n'a été modifié
        return new Promise((resolve) => {
            chrome.storage.local.set({ [trackingKey]: true }, function() {
                console.log(`[${logPrefix}] Aucune modification | Valeur actuelle: "${currentValue}"`);
                resolve(false);
            });
        });
    }
}



