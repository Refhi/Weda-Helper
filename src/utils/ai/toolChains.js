/**
 * @file toolChains.js
 * @description Chaînes d'outils (workflows) : le moteur déroule des étapes dans l'ordre, à partir d'un point d'entrée
 * qui est soit un tool call du modèle (`definition` exposée), soit un lancement depuis le code (@see demarrerChaine,
 * chatApi.lancerChaine). Deux types d'étapes :
 *  - 'mecanique' : exécutée par le moteur via runTool, sans passer par le modèle ;
 *  - 'jugement'  : le modèle décide, mais seuls les outils de l'étape sont exposés (tool_choice forcé).
 * Un outil d'étape peut être un nom du registre (@see availableFunctions) ou un outil local { definition, executer }
 * exécuté par le moteur lui-même, qui sert à recueillir une sortie structurée du modèle dans `ctx`.
 * Chargé avec openAiClient.js, qui pilote la boucle (@see handleToolCalls) ; dans l'offpage, les outils s'exécutent
 * dans l'onglet via runTool (@see executeToolCallOnTab). Les chaînes elles-mêmes sont décrites dans toolChainsDefinitions.js
 * (champs d'une chaîne et de ses étapes documentés en tête de ce fichier).
 */

/**
 * Définitions envoyées par défaut au modèle : les outils du registre (hors outils `interne`, réservés aux chaînes)
 * et les points d'entrée des chaînes.
 */
function listerDefinitionsOutils() {
    return [
        ...Object.values(availableFunctions).filter(f => !f.interne).map(f => f.definition),
        ...Object.values(toolChains).map(c => c.definition).filter(Boolean)
    ];
}

function estChaine(nom) {
    return Object.hasOwn(toolChains, nom);
}

/** Faux appel de l'outil d'entrée d'une chaîne lancée depuis le code : traité comme un appel du modèle (@see handleToolCalls). */
function messageAppelChaine({ nom, entree = {} }) {
    return {
        role: 'assistant',
        content: null,
        tool_calls: [{ id: `chaine-${crypto.randomUUID()}`, type: 'function', function: { name: nom, arguments: JSON.stringify(entree) } }]
    };
}

/** Étape de jugement en attente du modèle, ou undefined si la chaîne est nulle ou terminée. */
function etapeCourante(chaine) {
    return chaine ? toolChains[chaine.nom].etapes[chaine.index] : undefined;
}

function nomOutilEtape(outil) {
    return typeof outil === 'string' ? outil : outil.definition.function.name;
}

/** Indique si l'outil appelé est l'un de ceux de l'étape de jugement en cours de la chaîne. */
function viseEtapeCourante(chaine, nomOutil) {
    return !!etapeCourante(chaine)?.outils.some(outil => nomOutilEtape(outil) === nomOutil);
}

/** Texte à renvoyer au modèle, avec les résultats d'étapes à lui transmettre (images comprises, @see buildToolResultContent). */
function composerContenu(texte, transmis) {
    if (!transmis.length) return texte;
    return { consigne: texte ?? "Étapes terminées.", donnees: transmis.length === 1 ? transmis[0] : transmis };
}

/**
 * Exécute les étapes mécaniques à partir de chaine.index jusqu'à la prochaine étape de jugement, la fin ou un arrêt.
 * Chaque étape est signalée via onToolCall, comme un appel d'outil ordinaire.
 * @returns {Promise<{arret: string|null, transmis: Array}>} message d'arrêt (échec ou sortie() non nulle) et résultats à transmettre
 */
async function executerEtapesMecaniques(chaine, runTool, onToolCall, signal) {
    const { etapes } = toolChains[chaine.nom];
    const transmis = [];
    while (chaine.index < etapes.length) {
        const etape = etapes[chaine.index];
        if (etape.si && !etape.si(chaine.ctx)) {
            chaine.index++;
            continue;
        }
        if (etape.type !== 'mecanique') break;
        if (signal?.aborted) throw new DOMException('Chaîne interrompue', 'AbortError');
        const args = etape.args(chaine.ctx);
        const id = `chaine-${chaine.nom}-${etape.id}-${crypto.randomUUID()}`;
        onToolCall?.({ id, name: etape.outil, args, status: 'start' });
        const resultat = await runTool(etape.outil, args).catch(e => ({ error: e.message || String(e) }));
        if (resultat?.error) {
            const message = `Chaîne ${chaine.nom} interrompue à l'étape ${etape.id} (${etape.outil}) : ${resultat.error}`;
            onToolCall?.({ id, name: etape.outil, args, status: 'error', error: message });
            return { arret: message, transmis };
        }
        onToolCall?.({ id, name: etape.outil, args, status: 'success', result: resultat });
        if (etape.transmettre) transmis.push(resultat);
        chaine.index++;
        const arret = etape.sortie?.(resultat, chaine.ctx);
        if (arret) return { arret, transmis };
    }
    return { arret: null, transmis };
}

async function poursuivreChaine(chaine, runTool, onToolCall, signal) {
    const { arret, transmis } = await executerEtapesMecaniques(chaine, runTool, onToolCall, signal);
    if (arret) return { chaine: null, contenu: arret };
    const etape = etapeCourante(chaine);
    const texte = etape ? etape.consigne(chaine.ctx) : toolChains[chaine.nom].conclusion ?? null;
    const contenu = composerContenu(texte, transmis);
    if (etape) return { chaine, contenu };

    // Chaîne terminée : suite(ctx) peut en enchaîner une autre ({ chaine, entree }), dont la consigne prolonge la réponse.
    const suivante = await toolChains[chaine.nom].suite?.(chaine.ctx);
    if (!suivante) return { chaine: null, contenu };
    const demarrage = await demarrerChaine(suivante.chaine, suivante.entree || {}, runTool, onToolCall, signal);
    const contenuSuite = typeof contenu === 'string' && typeof demarrage.contenu === 'string'
        ? `${contenu}\n\n${demarrage.contenu}`
        : demarrage.contenu;
    return { chaine: demarrage.chaine, contenu: contenuSuite };
}

/**
 * Démarre la chaîne : exécute les étapes mécaniques consécutives, puis renvoie
 *  - `contenu` : texte du tool message répondant au tool_call d'entrée (consigne de l'étape de jugement, ou message d'arrêt) ;
 *  - `chaine`  : état { nom, index, ctx, essais } à porter dans la récursion d'openAiClient, ou null si terminée.
 */
async function demarrerChaine(nom, entree, runTool, onToolCall, signal) {
    const chaine = { nom, index: 0, essais: 0, ctx: { entree } };
    toolChains[nom].init?.(chaine.ctx);
    const resultat = await poursuivreChaine(chaine, runTool, onToolCall, signal);
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
    const choixReserves = ['auto', 'none', 'required'];
    return {
        tools: etape.outils.map(outil => typeof outil === 'string' ? availableFunctions[outil].definition : outil.definition),
        toolChoice: choixReserves.includes(choix) ? choix : { type: "function", function: { name: choix } }
    };
}

/**
 * Traite un appel du modèle visant l'étape de jugement courante : le vérifie, l'exécute (localement pour un outil local),
 * et, si l'outil clôt l'étape, passe à la suite.
 * @returns {Promise<{refus: string, chaine: object|null}|{resultat: *, chaine: object|null, suite: *, progres: boolean}>}
 * `refus` : appel non exécuté, à renvoyer au modèle (la chaîne est abandonnée si le nombre d'essais est épuisé).
 * `suite` : consigne de l'étape suivante (ou conclusion), à joindre au résultat ; `progres` : l'étape est terminée.
 */
async function traiterAppelEtape(chaine, nomOutil, args, runTool, onToolCall, signal) {
    const etape = etapeCourante(chaine);
    const refus = etape.verifier?.(args, chaine.ctx, nomOutil);
    if (refus) {
        chaine.essais++;
        if (chaine.essais < (etape.maxEssais ?? 1)) return { refus, chaine };
        return { refus: `${refus} Nombre d'essais épuisé : chaîne abandonnée, informe l'utilisateur de l'échec.`, chaine: null };
    }

    const outil = etape.outils.find(o => nomOutilEtape(o) === nomOutil);
    const resultat = typeof outil === 'string' ? await runTool(nomOutil, args) : outil.executer(args, chaine.ctx);
    etape.apresAppel?.(nomOutil, args, resultat, chaine.ctx);
    if (etape.termine && !etape.termine.includes(nomOutil)) {
        return { resultat, chaine, suite: null, progres: false };
    }

    chaine.index++;
    chaine.essais = 0;
    const suite = await poursuivreChaine(chaine, runTool, onToolCall, signal);
    return { resultat, chaine: suite.chaine, suite: suite.contenu, progres: true };
}
