/**
 * Adaptations requises par certains modèles ou familles de modèles.
 * Les clés correspondent au nom exact du modèle ou au préfixe de sa famille.
 */
const MODEL_SPECIFIC_ARG_CHANGE_RULES = {
    'gpt-5-mini': {
        argRenaming: ['max_tokens', 'max_completion_tokens'],
        argRemoval: ['top_p'],
        valueChange: ['temperature', 1],
    },
    // Pour un modèle sans vision, ajouter `supportsVision: false` à sa règle :
    // ses parts d'image seront remplacées par un message explicatif avant l'appel API.
    'qwen3.5-9b-medreasoning-dt-i1': {
        supportsVision: false,
    },
};

function getModelSpecificArgChangeRule(model) {
    if (!model) return null;
    const ruleName = Object.keys(MODEL_SPECIFIC_ARG_CHANGE_RULES)
        .filter(name => model === name || model.startsWith(`${name}-`))
        .sort((a, b) => b.length - a.length)[0];
    return ruleName ? MODEL_SPECIFIC_ARG_CHANGE_RULES[ruleName] : null;
}

/**
 * Applique les adaptations configurées pour le modèle (correspondance exacte ou préfixe daté).
 * @param {string} model
 * @param {Record<string, *>} args
 */
function applyModelSpecificArgChanges(model, args) {
    if (!model || !args || typeof args !== 'object') return args;

    const rule = getModelSpecificArgChangeRule(model);
    if (!rule) return args;
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

/**
 * Remplace les parts d'image dans une copie des messages pour les modèles sans vision.
 * L'historique de conversation reste ainsi intact pour un changement ultérieur de modèle.
 * @param {string} model
 * @param {Array<object>} messages
 * @returns {Array<object>}
 */
function replaceUnsupportedModelImages(model, messages) {
    if (!model || !Array.isArray(messages) || getModelSpecificArgChangeRule(model)?.supportsVision !== false) {
        return messages;
    }

    const explanation = `[Image non analysée : le modèle "${model}" ne prend pas en charge l’analyse d’images (vision).]`;
    return messages.map(message => {
        if (!Array.isArray(message?.content)) return message;
        return {
            ...message,
            content: message.content.map(part =>
                ['image_url', 'image', 'input_image'].includes(part?.type)
                    ? { type: 'text', text: explanation }
                    : part
            )
        };
    });
}
