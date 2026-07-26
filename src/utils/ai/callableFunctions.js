/**
 * Fonction de test appelable par le modèle (function/tool calling).
 * Renvoie simplement une confirmation d'appel avec les arguments reçus.
 */
function testFunction(args) {
    return `fonction appellée correctement + arguments : ${JSON.stringify(args)}`;
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
                description: "Fonction de test : renvoie une confirmation d'appel avec les arguments fournis.",
                parameters: {
                    type: "object",
                    properties: {
                        message: {
                            type: "string",
                            description: "Un message ou argument quelconque à transmettre à la fonction de test."
                        }
                    },
                    required: []
                }
            }
        },
        execute: testFunction
    }
};


