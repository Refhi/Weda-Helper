// Ce fichier gère les mises à jour des valeurs d'options pour les utilisateurs existants.
// Ces fonctions s'exécutent une seule fois par utilisateur avant la date limite
// Attention à utiliser un updateId unique pour chaque mise à jour

// cf. @autoAddToOption dans utils.js


autoAddToOption({
    updateId: 'cotation-gl-jan-2026',
    optionName: 'cotationHelper2',
    valuesToAdd: ['GL1', 'GL2', 'GL3'],
    deadline: '2026-02-28'
});