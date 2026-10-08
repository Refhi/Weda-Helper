/**
 * Modifications des arguments API requises par certains modèles ou familles de modèles.
 * Les clés correspondent aux noms transmis dans l'objet JSON de Chat Completions.
 */
const MODEL_SPECIFIC_ARG_CHANGE_RULES = {
    'gpt-5-mini': {
        argRenaming: ['max_tokens', 'max_completion_tokens'],
        argRemoval: ['top_p'],
        valueChange: ['temperature', 1],
    },
};

/**
 * Applique les adaptations configurées pour le modèle (correspondance exacte ou préfixe daté).
 * @param {string} model
 * @param {Record<string, *>} args
 */
function applyModelSpecificArgChanges(model, args) {
    if (!model || !args || typeof args !== 'object') return args;

    const ruleName = Object.keys(MODEL_SPECIFIC_ARG_CHANGE_RULES)
        .filter(name => model === name || model.startsWith(`${name}-`))
        .sort((a, b) => b.length - a.length)[0];
    if (!ruleName) return args;

    const rule = MODEL_SPECIFIC_ARG_CHANGE_RULES[ruleName];
    if (Array.isArray(rule.argRenaming)) {
        const renames = Array.isArray(rule.argRenaming[0]) ? rule.argRenaming : [rule.argRenaming];
        for (const [oldName, newName] of renames) {
            if (oldName in args) {
                args[newName] = args[oldName];
                delete args[oldName];
            }
        }
    }
    if (Array.isArray(rule.argRemoval)) {
        for (const name of rule.argRemoval) {
            delete args[name];
        }
    }
    if (Array.isArray(rule.valueChange)) {
        const changes = Array.isArray(rule.valueChange[0]) ? rule.valueChange : [rule.valueChange];
        for (const [name, value] of changes) {
            args[name] = value;
        }
    }

    return args;
}
