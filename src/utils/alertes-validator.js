/**
 * @file alertes-validator.js
 * @description Fonctions de validation des alertes personnalisées
 * Utilisé à la fois dans options.js et alertesAtcd.js pour une validation cohérente
 * 
 * @requires chrome.storage.local (pour récupérer alerteSchema)
 */

/**
 * Valide une valeur selon un schéma de propriété
 * @param {any} value - Valeur à valider
 * @param {Object} propSchema - Schéma de la propriété
 * @param {string} path - Chemin de la propriété (pour les messages d'erreur)
 * @returns {Array<string>} Liste des erreurs (vide si valide)
 */
function validateProperty(value, propSchema, path) {
  const errors = [];
  
  // Vérifier si la propriété est requise
  if (propSchema.required && (value === undefined || value === null)) {
    errors.push(`${path}: champ requis manquant`);
    return errors;
  }
  
  // Si la valeur est null/undefined et non requise, c'est OK
  if (value === undefined || value === null) {
    return errors;
  }
  
  // Vérifier le type
  const types = Array.isArray(propSchema.type) ? propSchema.type : [propSchema.type];
  let typeValid = false;
  
  for (const expectedType of types) {
    if (expectedType === 'array' && Array.isArray(value)) {
      typeValid = true;
      // Valider les éléments du tableau si itemType est défini
      if (propSchema.itemType) {
        value.forEach((item, index) => {
          const itemType = typeof item;
          if (itemType !== propSchema.itemType) {
            errors.push(`${path}[${index}]: type incorrect (attendu: ${propSchema.itemType}, reçu: ${itemType})`);
          }
        });
      }
      break;
    } else if (expectedType === 'object' && typeof value === 'object' && !Array.isArray(value)) {
      typeValid = true;
      // Valider les propriétés de l'objet si properties est défini
      if (propSchema.properties) {
        for (const [propName, propDef] of Object.entries(propSchema.properties)) {
          const subErrors = validateProperty(value[propName], propDef, `${path}.${propName}`);
          errors.push(...subErrors);
        }
      }
      break;
    } else if (typeof value === expectedType) {
      typeValid = true;
      break;
    }
  }
  
  if (!typeValid) {
    const typeStr = types.join(' ou ');
    errors.push(`${path}: type incorrect (attendu: ${typeStr}, reçu: ${typeof value})`);
    return errors;
  }
  
  // Vérifier les valeurs enum si définies
  if (propSchema.enum && !propSchema.enum.includes(value)) {
    errors.push(`${path}: valeur non autorisée (attendu: ${propSchema.enum.join(', ')}, reçu: ${value})`);
  }
  
  // Vérifier les contraintes numériques
  if (typeof value === 'number') {
    if (propSchema.min !== undefined && value < propSchema.min) {
      errors.push(`${path}: valeur trop petite (min: ${propSchema.min}, reçu: ${value})`);
    }
    if (propSchema.max !== undefined && value > propSchema.max) {
      errors.push(`${path}: valeur trop grande (max: ${propSchema.max}, reçu: ${value})`);
    }
  }
  
  // Vérifier le format des dates
  if (propSchema.format === 'date' && typeof value === 'string') {
    const datePattern = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!datePattern.test(value)) {
      errors.push(`${path}: format de date invalide (attendu: DD/MM/YYYY, reçu: ${value})`);
    }
  }
  
  return errors;
}

/**
 * Valide un tableau d'alertes selon alerteSchema
 * @param {Array} alertes - Tableau d'alertes à valider
 * @param {Object} schema - Schéma de validation
 * @returns {Object} { valid: boolean, errors: Array<string> }
 */
function validateAlertes(alertes, schema) {
  const errors = [];
  
  if (!Array.isArray(alertes)) {
    return { valid: false, errors: ['Le JSON doit être un tableau d\'alertes'] };
  }
  
  alertes.forEach((alerte, index) => {
    const alertePath = `Alerte #${index + 1}`;
    
    if (typeof alerte !== 'object' || alerte === null) {
      errors.push(`${alertePath}: doit être un objet`);
      return;
    }
    
    // Valider chaque propriété selon le schéma
    for (const [propName, propSchema] of Object.entries(schema)) {
      const propErrors = validateProperty(alerte[propName], propSchema, `${alertePath}.${propName}`);
      errors.push(...propErrors);
    }
  });
  
  return { valid: errors.length === 0, errors };
}

/**
 * Récupère le schéma de validation depuis chrome.storage.local
 * @returns {Promise<Object|null>} Le schéma de validation ou null si non disponible
 */
async function getAlerteSchema() {
  return new Promise(resolve => {
    chrome.storage.local.get('alerteSchema', result => {
      resolve(result.alerteSchema || null);
    });
  });
}

/**
 * Valide un tableau d'alertes en récupérant automatiquement le schéma
 * @param {Array} alertes - Tableau d'alertes à valider
 * @returns {Promise<Object>} { valid: boolean, errors: Array<string> }
 */
async function validateAlertesWithSchema(alertes) {
  const schema = await getAlerteSchema();
  
  if (!schema) {
    return { valid: false, errors: ['Schéma de validation non disponible'] };
  }
  
  return validateAlertes(alertes, schema);
}
