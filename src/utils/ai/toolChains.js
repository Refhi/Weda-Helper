/**
 * @file toolChains.js
 * @description Chaînes d'outils (workflows) : le modèle ne déclenche qu'UN outil d'entrée, puis le moteur
 * déroule les étapes dans l'ordre. Deux types d'étapes :
 *  - 'mecanique' : exécutée par le moteur via runTool, sans passer par le modèle ;
 *  - 'jugement'  : le modèle décide, mais seuls les outils de l'étape sont exposés (tool_choice forcé).
 * Chargé dans l'offpage (avec openAiClient.js), car il pilote la boucle ; les outils, eux, s'exécutent
 * dans l'onglet via runTool (@see executeToolCallOnTab).
 */

const toolChains = {
    convertirAntecedentsCim10: {
        // Seul élément exposé au modèle : il ne voit que ce point d'entrée, pas la mécanique.
        definition: {
            type: "function",
            function: {
                name: "convertirAntecedentsCim10",
                description: "Convertit en antécédents codés CIM-10 les antécédents libres du patient actuel. Un appel suffit : les étapes suivantes sont guidées automatiquement.",
                parameters: {
                    type: "object",
                    properties: {
                        nomsCibles: { type: "array", items: { type: "string" }, description: "Optionnel : limiter la conversion à ces antécédents libres." }
                    }
                }
            }
        },

        etapes: [
            {
                id: 'lireAntecedents',
                type: 'mecanique',
                outil: 'recoverPatientData',
                args: () => ({ categories: ['antecedents'], antecedentsType: 'libre' }),
                // ctx = { entree, resultats }. Renvoie un message d'arrêt, ou null pour continuer.
                sortie: (res, ctx) => {
                    const cibles = ctx.entree.nomsCibles;
                    ctx.libres = (res.antecedents || [])
                        .flatMap(s => s.items.map(i => ({ titre: i.titre, onglet: s.titre })))
                        .filter(a => !cibles?.length || cibles.some(n => a.titre.toLowerCase().startsWith(n.toLowerCase())));
                    return ctx.libres.length ? null : "Aucun antécédent libre à convertir.";
                }
            },
            {
                id: 'chercherCodes',
                type: 'mecanique',
                outil: 'rechercherCim10',
                args: ctx => ({ termes: ctx.libres.map(a => a.titre), limite: 8 }),
                // Compacte pour ne pas gonfler le contexte : { titre, candidats:[{code,label}] }.
                sortie: (res, ctx) => {
                    const groupes = Array.isArray(res) && res[0]?.terme ? res : [{ terme: ctx.libres[0].titre, resultats: res }];
                    ctx.candidats = groupes.map(g => ({ titre: g.terme, candidats: g.resultats.map(({ code, label }) => ({ code, label })) }));
                    ctx.codesValides = new Set(groupes.flatMap(g => g.resultats.map(r => r.code)));
                    return null;
                }
            },
            {
                id: 'choisirCodes',
                type: 'jugement',
                tools: ['traiterAntecedents'],
                toolChoice: 'traiterAntecedents', // forcé pour cette étape seulement, puis retour à "auto"
                consigne: ctx => `Pour chaque antécédent libre ci-dessous, choisis le code CIM-10 le plus pertinent et le moins spécifique `
                    + `que nécessaire parmi ses candidats, puis appelle traiterAntecedents UNE fois, avec une opération `
                    + `'convertirCim10' par antécédent ({nomCible, data:{nom: code}}). Ignore ceux sans candidat réellement adapté.\n`
                    + JSON.stringify(ctx.candidats),
                // Remplace l'ancien prérequis par une vérification dans l'étape : erreur renvoyée au modèle, sans tour perdu.
                verifier: (args, ctx) => {
                    const hors = (args.operations || []).filter(o => o.action !== 'convertirCim10' || !ctx.codesValides.has(o.data?.nom));
                    return hors.length ? `Opérations refusées (code absent des candidats ou action invalide) : ${JSON.stringify(hors)}. Refais l'appel.` : null;
                },
                // Étape terminée dès qu'un appel passe `verifier` ; on peut alors laisser le modèle conclure.
                maxEssais: 2
            }
        ]
    }
};

/**
 * Démarre la chaîne : exécute les étapes mécaniques consécutives, puis renvoie
 *  - `contenu` : texte du tool message à placer en réponse au tool_call d'entrée (résumé des étapes faites) ;
 *  - `chaine`  : état { nom, index, ctx, essais } à porter dans la récursion d'openAiClient, ou null si terminée.
 */
async function demarrerChaine(nom, entree, runTool, onToolCall) { /* boucle sur etapes mécaniques */ }

/**
 * Politique de la prochaine requête au modèle pour une chaîne en cours.
 * @returns {{ tools: object[], toolChoice: object|string, consigne: string }} — { tools: tous, toolChoice: 'auto' } si pas de chaîne
 */
function politiqueEtape(chaine) { /* filtre availableFunctions sur etape.tools + tool_choice function forcé */ }

/**
 * Après l'exécution des tool calls d'une étape de jugement : vérifie (`verifier`), avance ou fait réessayer,
 * puis enchaîne les éventuelles étapes mécaniques suivantes. Renvoie la chaîne mise à jour (ou null).
 */
async function avancerChaine(chaine, appels, runTool, onToolCall) { /* … */ }