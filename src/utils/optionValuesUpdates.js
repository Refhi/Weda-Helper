/**
 * @file optionValuesUpdates.js
 * @description Définition des mises à jour d'options à appliquer automatiquement.
 * Ce fichier contient les appels à autoAddToOption pour mettre à jour
 * les options des utilisateurs existants lors des nouvelles versions.
 * 
 * @requires option-updater.js (autoAddToOption)
 * 
 * @example
 * // Ajouter des cotations lors d'une mise à jour
 * autoAddToOption({
 *     updateId: 'cotation-jan-2026',
 *     optionName: 'cotationHelper2',
 *     valuesToAdd: ['GL1', 'GL2'],
 *     deadline: '2026-02-01'
 * });
 */

// Ce fichier gère les mises à jour des valeurs d'options pour les utilisateurs existants.
// Ces fonctions s'exécutent une seule fois par utilisateur avant la date limite
// Attention à utiliser un updateId unique pour chaque mise à jour


autoAddToOption({
    updateId: 'cotation-gl-jan-2026',
    optionName: 'cotationHelper2',
    valuesToAdd: ['GL1', 'GL2', 'GL3'],
    deadline: '2026-02-28'
});