/**
 * @file toolChains.js
 * @description Chaînes d'outils (workflows) : le modèle ne déclenche qu'UN outil d'entrée, puis le moteur
 * déroule les étapes dans l'ordre. Deux types d'étapes :
 *  - 'mecanique' : exécutée par le moteur via runTool, sans passer par le modèle ;
 *  - 'jugement'  : le modèle décide, mais seuls les outils de l'étape sont exposés (tool_choice forcé).
 * Chargé avec openAiClient.js, qui pilote la boucle (@see handleToolCalls) ; dans l'offpage, les outils s'exécutent
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
                // ctx = { entree, ... } partagé entre les étapes. Renvoie un message d'arrêt, ou null pour continuer.
                sortie: (res, ctx) => {
                    const cibles = ctx.entree.nomsCibles;
                    const titres = (res.antecedents || [])
                        .flatMap(section => section.items.map(item => item.titre))
                        .filter(titre => !cibles?.length || cibles.some(nom => titre.toLowerCase().startsWith(nom.toLowerCase())));
                    ctx.libres = [...new Set(titres)];
                    return ctx.libres.length ? null : "Aucun antécédent libre à convertir.";
                }
            },
            {
                id: 'chercherCodes',
                type: 'mecanique',
                outil: 'rechercherCim10',
                args: ctx => ({ termes: ctx.libres, limite: 8 }),
                // rechercherCim10 renvoie une simple liste (sans groupes par terme) quand un seul terme est demandé.
                sortie: (res, ctx) => {
                    const groupes = ctx.libres.length === 1 ? [{ terme: ctx.libres[0], resultats: res }] : res;
                    ctx.candidats = groupes.map(g => ({ titre: g.terme, candidats: g.resultats.map(({ code, label }) => ({ code, label })) }));
                    ctx.codesParTitre = Object.fromEntries(groupes.map(g => [g.terme, new Set(g.resultats.map(r => r.code))]));
                    return null;
                }
            },
            {
                id: 'choisirCodes',
                type: 'jugement',
                tools: ['appliquerConversionsCim10'],
                toolChoice: 'appliquerConversionsCim10', // forcé pour cette étape seulement
                consigne: ctx => `Étapes préparatoires terminées : ${ctx.libres.length} antécédent(s) libre(s) lu(s) et codes CIM-10 candidats recherchés.\n`
                    + `Pour chaque antécédent, choisis le code le plus pertinent et le moins spécifique que nécessaire parmi SES candidats `
                    + `(ne pas préciser un germe ou un détail non mentionné), puis appelle appliquerConversionsCim10 UNE seule fois. `
                    + `Ignore les antécédents dont aucun candidat ne convient réellement (liste vide si aucun).\n`
                    + JSON.stringify(ctx.candidats),
                // Erreur renvoyée au modèle dans l'étape elle-même, sans tour perdu : le code doit provenir des candidats de cet antécédent.
                verifier: (args, ctx) => {
                    const conversions = Array.isArray(args?.conversions) ? args.conversions : null;
                    if (!conversions) return "'conversions' doit être un tableau. Refais l'appel.";
                    const invalides = conversions.filter(c => !ctx.codesParTitre[c?.nomCible]?.has(c?.code));
                    return invalides.length
                        ? `Conversions refusées (nomCible absent de la liste ou code absent des candidats de cet antécédent) : ${JSON.stringify(invalides)}. Refais l'appel.`
                        : null;
                },
                maxEssais: 2
            }
        ]
    }
};

const TOOL_CHOICES_RESERVES = ['auto', 'none', 'required'];

/**
 * Définitions envoyées par défaut au modèle : les outils du registre (hors étapes internes de chaîne) et les points
 * d'entrée des chaînes.
 */
function listerDefinitionsOutils() {
    return [
        ...Object.values(availableFunctions).filter(f => !f.interne).map(f => f.definition),
        ...Object.values(toolChains).map(c => c.definition)
    ];
}

function estChaine(nom) {
    return Object.hasOwn(toolChains, nom);
}

/** Étape de jugement en attente du modèle, ou undefined si la chaîne est nulle ou terminée. */
function etapeCourante(chaine) {
    return chaine ? toolChains[chaine.nom].etapes[chaine.index] : undefined;
}

/**
 * Exécute les étapes mécaniques à partir de chaine.index jusqu'à la prochaine étape de jugement, la fin ou un arrêt.
 * Chaque étape est signalée via onToolCall, comme un appel d'outil ordinaire.
 * @returns {Promise<string|null>} message d'arrêt (échec ou sortie() non nulle), sinon null
 */
async function executerEtapesMecaniques(chaine, runTool, onToolCall, signal) {
    const { etapes } = toolChains[chaine.nom];
    while (etapes[chaine.index]?.type === 'mecanique') {
        const etape = etapes[chaine.index];
        if (signal?.aborted) throw new DOMException('Chaîne interrompue', 'AbortError');
        const args = etape.args(chaine.ctx);
        const id = `chaine-${chaine.nom}-${etape.id}-${crypto.randomUUID()}`;
        onToolCall?.({ id, name: etape.outil, args, status: 'start' });
        const resultat = await runTool(etape.outil, args).catch(e => ({ error: e.message || String(e) }));
        if (resultat?.error) {
            const message = `Chaîne ${chaine.nom} interrompue à l'étape ${etape.id} (${etape.outil}) : ${resultat.error}`;
            onToolCall?.({ id, name: etape.outil, args, status: 'error', error: message });
            return message;
        }
        onToolCall?.({ id, name: etape.outil, args, status: 'success', result: resultat });
        chaine.index++;
        const arret = etape.sortie?.(resultat, chaine.ctx);
        if (arret) return arret;
    }
    return null;
}

async function poursuivreChaine(chaine, runTool, onToolCall, signal) {
    const arret = await executerEtapesMecaniques(chaine, runTool, onToolCall, signal);
    if (arret) return { chaine: null, contenu: arret };
    const etape = etapeCourante(chaine);
    return etape ? { chaine, contenu: etape.consigne(chaine.ctx) } : { chaine: null, contenu: null };
}

/**
 * Démarre la chaîne : exécute les étapes mécaniques consécutives, puis renvoie
 *  - `contenu` : texte du tool message répondant au tool_call d'entrée (consigne de l'étape de jugement, ou message d'arrêt) ;
 *  - `chaine`  : état { nom, index, ctx, essais } à porter dans la récursion d'openAiClient, ou null si terminée.
 */
async function demarrerChaine(nom, entree, runTool, onToolCall, signal) {
    const resultat = await poursuivreChaine({ nom, index: 0, essais: 0, ctx: { entree } }, runTool, onToolCall, signal);
    return { ...resultat, contenu: resultat.contenu ?? "Chaîne terminée." };
}

/**
 * Politique de la prochaine requête au modèle pour une chaîne en cours : seuls les outils de l'étape sont exposés,
 * éventuellement avec tool_choice forcé. Renvoie null si aucune chaîne n'est en cours (requête ordinaire).
 * @returns {{ tools: object[], toolChoice: object|string }|null}
 */
function politiqueEtape(chaine) {
    const etape = etapeCourante(chaine);
    if (!etape) return null;
    const choix = etape.toolChoice || 'auto';
    return {
        tools: etape.tools.map(nom => availableFunctions[nom].definition),
        toolChoice: TOOL_CHOICES_RESERVES.includes(choix) ? choix : { type: "function", function: { name: choix } }
    };
}

/**
 * Contrôle un appel du modèle avant exécution quand il vise l'étape de jugement courante.
 * @returns {{ refus: string, chaine: object|null }|null} null si l'appel peut être exécuté ; sinon le refus à renvoyer
 * au modèle et la chaîne à poursuivre (null si le nombre d'essais est épuisé).
 */
function verifierAppelChaine(chaine, nomOutil, args) {
    const etape = etapeCourante(chaine);
    if (!etape?.tools.includes(nomOutil)) return null;
    const refus = etape.verifier?.(args, chaine.ctx);
    if (!refus) return null;
    chaine.essais++;
    if (chaine.essais < (etape.maxEssais ?? 1)) return { refus, chaine };
    return { refus: `${refus} Nombre d'essais épuisé : chaîne abandonnée, informe l'utilisateur de l'échec.`, chaine: null };
}

/**
 * Après l'exécution réussie d'un appel de l'étape de jugement : passe à l'étape suivante et enchaîne les éventuelles
 * étapes mécaniques. Renvoie { chaine, contenu } (contenu : suite à transmettre au modèle, ou null si la chaîne est terminée).
 */
async function avancerChaine(chaine, runTool, onToolCall, signal) {
    chaine.index++;
    chaine.essais = 0;
    return poursuivreChaine(chaine, runTool, onToolCall, signal);
}
