/**
 * Fonction de test appelable par le modèle (function/tool calling).
 * Renvoie simplement une confirmation d'appel avec les arguments reçus.
 */
function testFunction({ testMessage = "aucun message fourni" } = {}) {
    console.log(`[testFunction] Appelée avec argument:`, testMessage);
    return {
        status: "success",
        message: "Fonction de test exécutée avec succès",
        receivedArgument: testMessage,
        timestamp: new Date().toISOString()
    };
}

/**
 * Registre des fonctions disponibles pour le modèle :
 * - `definition` : la description au format attendu par l'API OpenAI (tools)
 * - `execute` : l'implémentation JS réellement appelée
 */
const availableFunctions = {
    testFunction: {
        definition: {
            type: "function",
            function: {
                name: "testFunction",
                description: "Fonction de test pour vérifier que le system de function calling fonctionne correctement. Utilise uniquement pour les tests.",
                parameters: {
                    type: "object",
                    properties: {
                        testMessage: {
                            type: "string",
                            description: "Un message texte simple à tester. Exemple: 'Bonjour depuis le modèle'"
                        }
                    },
                    required: [
                        "testMessage"
                    ]
                }
            }
        },
        execute: testFunction
    }
};


