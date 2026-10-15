/**
 * @file toolChainsDefinitions.js
 * @description Définitions des chaînes d'outils (@see toolChains.js pour le moteur qui les déroule). Seule `toolChains`
 * est exposée : les constantes et helpers propres aux chaînes restent locaux à cette fonction.
 *
 * Champs d'une chaîne : definition (null = lancement depuis le code uniquement), init(ctx), etapes, conclusion,
 * suite(ctx) (async, appelée à la fin normale de la chaîne : renvoie { chaine, entree } pour en enchaîner une autre, ou null).
 * La chaîne suivante ne démarre qu'après la réponse en texte du modèle à la chaîne terminée (@see openAiClient.js).
 * Champs communs à toutes les étapes : id, type, si(ctx) (étape ignorée si faux).
 * Étape mécanique : outil, args(ctx), sortie(resultat, ctx) (renvoie un message d'arrêt, ou null), transmettre
 * (le résultat est joint tel quel à la réponse faite au modèle).
 * Étape de jugement : outils, toolChoice, consigne(ctx), verifier(args, ctx, nomOutil) (renvoie un refus, ou null),
 * maxEssais, termine (outils dont l'appel clôt l'étape, défaut : tous), apresAppel(nomOutil, args, resultat, ctx)
  * (appelé après chaque appel d'outil accepté, y compris celui qui clôt l'étape).
 */

const toolChains = (() => {
    const CATEGORIES_DOCUMENTS = ["consultations", "resultatsExamens", "courriers", "arretsTravail", "documents"];

    /** Antécédents sans les champs vides, pour alléger le contexte envoyé au modèle. */
    function compacterAntecedents(sections = []) {
        return sections.map(section => ({
            onglet: section.titre,
            items: section.items.map(item => {
                const dates = Object.fromEntries(Object.entries(item.dates || {}).filter(([, valeur]) => valeur));
                return { titre: item.titre, ...(item.cim10Code ? { code: item.cim10Code } : {}), ...dates, ...(item.description ? { description: item.description } : {}) };
            })
        }));
    }

    /** rechercherCim10 renvoie une simple liste (sans groupes par terme) quand un seul terme est demandé. */
    function grouperResultatsCim10(res, termes) {
        return termes.length === 1 ? [{ terme: termes[0], resultats: res }] : res;
    }

    function normaliserTerme(terme) {
        return String(terme ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    }

    /** Mémorise dans ctx.codesValides tous les codes d'un résultat de rechercherCim10 (liste simple ou groupée). */
    function enregistrerCodes(ctx, res, termes = []) {
        ctx.codesValides ??= new Set();
        ctx.termesRecherches ??= new Set();
        ctx.rechercheCim10Faite = true;
        termes.forEach(terme => ctx.termesRecherches.add(normaliserTerme(terme)));
        const lignes = Array.isArray(res) ? res.flatMap(r => r.resultats ?? r) : [];
        lignes.forEach(ligne => ligne.code && ctx.codesValides.add(ligne.code));
    }

    const etapeLireAntecedents = {
        id: 'lireAntecedents',
        type: 'mecanique',
        outil: 'recoverPatientData',
        args: () => ({ categories: ['antecedents'] }),
        sortie: (res, ctx) => {
            ctx.antecedents = res.antecedents || [];
            return null;
        }
    };

    /** Recherche CIM-10 des termes de ctx.termesCim10, ignorée s'il n'y en a pas. */
    const etapeChercherCodes = {
        id: 'chercherCodes',
        type: 'mecanique',
        outil: 'rechercherCim10',
        si: ctx => ctx.termesCim10?.length > 0,
        args: ctx => ({ termes: ctx.termesCim10, limite: 8 }),
        sortie: (res, ctx) => {
            ctx.candidats = grouperResultatsCim10(res, ctx.termesCim10)
                .map(g => ({ terme: g.terme, candidats: g.resultats.map(({ code, label }) => ({ code, label })) }));
            enregistrerCodes(ctx, res, ctx.termesCim10);
            return null;
        }
    };

    const REGLES_ANTECEDENTS = "Règles : n'ajoute pas ce qui existe déjà ; tout antécédent s'ajoute par défaut en CIM-10 (searchType 'CIM10') avec un code issu "
        + "d'une recherche, le moins spécifique que nécessaire ; l'antécédent libre (sans searchType) n'est permis qu'après une recherche CIM-10 dont aucun "
        + "résultat ne convient (et dans ce cas nom = exactement le terme recherché) ; une allergie n'est JAMAIS un antécédent libre ni CIM-10 : searchType "
        + "'allergieMolecule' (nom de molécule) ou 'allergiePrinceps' (si ça ressemble à un nom commercial), nom = uniquement le nom du médicament ; "
        + "pour 'modifier'/'supprimer', nomCible est le titre exact d'un antécédent existant.";

    /** Contrôle les opérations de traiterAntecedents : codes CIM-10 issus d'une recherche, cibles existantes, actions permises. */
    function verifierOperationsAntecedents(args, ctx, nomOutil) {
        if (nomOutil !== 'traiterAntecedents') return null;
        if (!Array.isArray(args?.operations)) return "'operations' doit être un tableau. Refais l'appel.";
        const titres = (ctx.antecedents || []).flatMap(section => section.items.map(item => item.titre.toLowerCase()));
        const invalides = args.operations.flatMap(operation => {
            const { action, nomCible, data } = operation || {};
            if (action === 'ajouter') {
                if (data?.searchType === 'CIM10') return ctx.codesValides?.has(data.nom) ? [] : [{ operation, motif: "code CIM-10 absent des résultats de recherche" }];
                if (!data?.searchType) {
                    if (!ctx.rechercheCim10Faite) return [{ operation, motif: "antécédent libre refusé : l'ajout se fait par défaut en CIM-10, cherche d'abord un code avec rechercherCim10" }];
                    if (!ctx.termesRecherches?.has(normaliserTerme(data?.nom))) return [{ operation, motif: "antécédent libre refusé : aucune recherche CIM-10 n'a été faite pour ce libellé (nom doit être exactement le terme recherché). Une allergie s'ajoute avec searchType 'allergieMolecule' ou 'allergiePrinceps', jamais en libre" }];
                }
                return [];
            }
            if (action === 'modifier' || action === 'supprimer') {
                return nomCible && titres.some(titre => titre.startsWith(nomCible.toLowerCase())) ? [] : [{ operation, motif: "nomCible ne correspond à aucun antécédent existant" }];
            }
            return [{ operation, motif: "action non permise ici (seulement ajouter, modifier ou supprimer)" }];
        });
        return invalides.length ? `Opérations refusées : ${JSON.stringify(invalides)}. Refais l'appel.` : null;
    }

    /** Étape finale des chaînes d'antécédents : recherche CIM-10 possible tant que traiterAntecedents n'est pas appelé. */
    const etapeAppliquerAntecedents = {
        type: 'jugement',
        outils: ['rechercherCim10', 'traiterAntecedents'],
        termine: ['traiterAntecedents'],
        toolChoice: 'required',
        verifier: verifierOperationsAntecedents,
        apresAppel: (nomOutil, _args, resultat, ctx) => { if (nomOutil === 'rechercherCim10') enregistrerCodes(ctx, resultat, [...(_args?.termes || []), _args?.terme].filter(Boolean)); },
        maxEssais: 2
    };

    return {
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
                    sortie: (res, ctx) => {
                        const groupes = grouperResultatsCim10(res, ctx.libres);
                        ctx.candidats = groupes.map(g => ({ titre: g.terme, candidats: g.resultats.map(({ code, label }) => ({ code, label })) }));
                        ctx.codesParTitre = Object.fromEntries(groupes.map(g => [g.terme, new Set(g.resultats.map(r => r.code))]));
                        return null;
                    }
                },
                {
                    id: 'choisirCodes',
                    type: 'jugement',
                    outils: ['traiterAntecedents'],
                    toolChoice: 'traiterAntecedents', // forcé pour cette étape seulement
                    consigne: ctx => `Étapes préparatoires terminées : ${ctx.libres.length} antécédent(s) libre(s) lu(s) et codes CIM-10 candidats recherchés.\n`
                        + `Pour chaque antécédent, choisis le code le plus pertinent et le moins spécifique que nécessaire parmi SES candidats `
                        + `(ne pas préciser un germe ou un détail non mentionné), puis appelle traiterAntecedents UNE seule fois, avec une opération `
                        + `{action:'convertirCim10', nomCible: <titre exact de l'antécédent>, data:{nom: <code choisi>}} par antécédent. `
                        + `Ignore les antécédents dont aucun candidat ne convient réellement (operations vide si aucun).\n`
                        + JSON.stringify(ctx.candidats),
                    // Erreur renvoyée au modèle dans l'étape elle-même, sans tour perdu : le code doit provenir des candidats de cet antécédent.
                    verifier: (args, ctx) => {
                        const operations = Array.isArray(args?.operations) ? args.operations : null;
                        if (!operations) return "'operations' doit être un tableau. Refais l'appel.";
                        const invalides = operations.filter(o => o?.action !== 'convertirCim10' || !ctx.codesParTitre[o.nomCible]?.has(o.data?.nom));
                        return invalides.length
                            ? `Opérations refusées (seule l'action 'convertirCim10' est permise ici, avec un nomCible de la liste et un code parmi les candidats de cet antécédent) : ${JSON.stringify(invalides)}. Refais l'appel.`
                            : null;
                    },
                    maxEssais: 2
                }
            ]
        },

        modifierAntecedents: {
            definition: {
                type: "function",
                function: {
                    name: "modifierAntecedents",
                    description: "Ajoute, modifie ou supprime des antécédents ou allergies du patient actuel, d'après la demande de l'utilisateur. Un appel suffit : la lecture des antécédents existants et la vérification des codes CIM-10 sont automatiques. Les antécédents sont ajoutés en CIM-10 par défaut. Pour convertir des antécédents libres en CIM-10, utiliser convertirAntecedentsCim10.",
                    parameters: {
                        type: "object",
                        properties: {
                            termesCim10: { type: "array", items: { type: "string" }, description: "Diagnostics à ajouter (codés en CIM-10 par défaut) : les codes candidats sont recherchés d'avance. À renseigner dès qu'un ajout est demandé." }
                        }
                    }
                }
            },
            init: ctx => { ctx.termesCim10 = [...new Set((ctx.entree.termesCim10 || []).filter(Boolean))]; },
            etapes: [
                etapeLireAntecedents,
                etapeChercherCodes,
                {
                    ...etapeAppliquerAntecedents,
                    id: 'appliquer',
                    consigne: ctx => `Antécédents actuels du patient : ${JSON.stringify(compacterAntecedents(ctx.antecedents))}\n`
                        + (ctx.candidats ? `Codes CIM-10 candidats : ${JSON.stringify(ctx.candidats)}\n` : '')
                        + `Réalise maintenant la demande de l'utilisateur en appelant traiterAntecedents UNE seule fois (opérations dans l'ordre). `
                        + `Si tu as besoin d'un code CIM-10 qui n'a pas été recherché, appelle d'abord rechercherCim10. ${REGLES_ANTECEDENTS}`
                }
            ]
        },

        mettreAJourAntecedentsDepuisDocument: {
            conclusion: "Mise à jour des antécédents terminée. Indique brièvement ce qui a été ajouté, modifié ou supprimé dans les antécédents (ou qu'aucun changement n'était nécessaire).",
            definition: {
                type: "function",
                function: {
                    name: "mettreAJourAntecedentsDepuisDocument",
                    description: "Reporte dans les antécédents du patient actuel les éléments d'un document ou compte-rendu présent dans la conversation (message de l'utilisateur) : compare avec les antécédents existants, puis ajoute et met à jour le nécessaire. Aucun argument.",
                    parameters: { type: "object", properties: {} }
                }
            },
            etapes: [
                etapeLireAntecedents,
                {
                    id: 'extraire',
                    type: 'jugement',
                    outils: [{
                        definition: {
                            type: "function",
                            function: {
                                name: "proposerElementsAntecedents",
                                description: "Enregistre les éléments du document à refléter dans les antécédents (sans rien modifier). Liste vide si rien n'est à changer.",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        elements: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    action: { type: "string", enum: ["ajouter", "modifier", "supprimer"] },
                                                    libelle: { type: "string", description: "Intitulé de l'antécédent concerné." },
                                                    nomCible: { type: "string", description: "Pour modifier/supprimer : titre exact de l'antécédent existant." },
                                                    termeCim10: { type: "string", description: "Pour tout antécédent/diagnostic à ajouter (y compris chirurgie, facteur de risque, antécédent familial) : terme médical en français courant (ex. 'polypose naso-sinusienne'), JAMAIS un code CIM-10 : les codes sont trouvés automatiquement par la recherche, ne les devine pas. À privilégier systématiquement. Absent uniquement pour une allergie." },
                                                    allergie: { type: "string", enum: ["allergieMolecule", "allergiePrinceps"], description: "Pour une allergie à ajouter : allergieMolecule (nom de molécule) ou allergiePrinceps (si ça ressemble à un nom commercial). Ne pas renseigner termeCim10 dans ce cas." },
                                                    commentaire: { type: "string" }
                                                },
                                                required: ["action", "libelle"]
                                            }
                                        }
                                    },
                                    required: ["elements"]
                                }
                            }
                        },
                        executer: (args, ctx) => {
                            ctx.elements = args.elements;
                            ctx.termesCim10 = [...new Set(ctx.elements.map(e => e.termeCim10).filter(Boolean))];
                            return { status: "enregistre", nombre: ctx.elements.length };
                        }
                    }],
                    toolChoice: 'proposerElementsAntecedents',
                    consigne: ctx => `Antécédents actuels du patient : ${JSON.stringify(compacterAntecedents(ctx.antecedents))}\n`
                        + `Relis attentivement le document fourni par l'utilisateur dans la conversation et repère tout ce qui relève des antécédents : `
                        + `diagnostics, pathologies chroniques, interventions chirurgicales, facteurs de risque, antécédents familiaux, allergies et intolérances, `
                        + `ainsi que toute évolution d'un antécédent déjà connu (guérison, aggravation, nouvelle date). Compare avec les antécédents actuels, puis `
                        + `appelle proposerElementsAntecedents UNE fois avec ce qui doit être ajouté, modifié ou supprimé (pas ce qui est déjà à jour). `
                        + `Cet appel est obligatoire : si rien n'est à changer, appelle-le avec une liste vide.`,
                    verifier: args => {
                        if (!Array.isArray(args?.elements)) return "'elements' doit être un tableau. Refais l'appel.";
                        const codes = args.elements.map(e => e?.termeCim10).filter(terme => /^[A-Z]\d{2}(\.\d+)?$/i.test(String(terme ?? '').trim()));
                        return codes.length
                            ? `termeCim10 doit être un terme médical en toutes lettres, pas un code (${codes.join(', ')}) : les codes sont recherchés automatiquement ensuite. Refais l'appel.`
                            : null;
                    },
                    maxEssais: 2
                },
                etapeChercherCodes,
                {
                    ...etapeAppliquerAntecedents,
                    id: 'appliquer',
                    si: ctx => ctx.elements?.length > 0,
                    consigne: ctx => `Éléments retenus : ${JSON.stringify(ctx.elements)}\n`
                        + (ctx.candidats ? `Codes CIM-10 candidats : ${JSON.stringify(ctx.candidats)}\n` : '')
                        + `Applique-les en appelant traiterAntecedents UNE seule fois (opérations dans l'ordre). ${REGLES_ANTECEDENTS}`
                }
            ]
        },

        lireDocumentsDuDossier: {
            definition: {
                type: "function",
                function: {
                    name: "lireDocumentsDuDossier",
                    description: "Lit le contenu de documents joints (pdf, courriers, résultats...) du dossier du patient actuel. Un appel suffit : liste des documents, choix de ceux qui sont utiles, puis lecture, sont automatiques. À utiliser dès qu'une réponse nécessite le contenu d'un document.",
                    parameters: {
                        type: "object",
                        properties: {
                            categories: { type: "array", items: { type: "string", enum: CATEGORIES_DOCUMENTS }, description: "Catégories où chercher les documents (défaut : toutes celles qui contiennent des pièces jointes)." },
                            dateRange: { type: "array", items: { type: "string" }, description: "Même format que recoverPatientData : [\"7\", \"days\"] ou [\"dd/mm/yyyy\", \"dd/mm/yyyy\"]. Préférer une plage courte." }
                        }
                    }
                }
            },
            conclusion: "Documents lus. Réponds maintenant à la demande de l'utilisateur à partir de leur contenu.",
            etapes: [
                {
                    id: 'listerDocuments',
                    type: 'mecanique',
                    outil: 'recoverPatientData',
                    args: ctx => ({ categories: ctx.entree.categories?.length ? ctx.entree.categories : CATEGORIES_DOCUMENTS, dateRange: ctx.entree.dateRange || [] }),
                    sortie: (res, ctx) => {
                        ctx.documents = Object.entries(res).flatMap(([categorie, entrees]) => !Array.isArray(entrees) ? [] : entrees.flatMap(entree => [
                            ...(entree.fileId ? [{ fileId: entree.fileId, nom: entree.fileName || entree.name, date: entree.date, categorie }] : []),
                            ...(entree.attachments || []).filter(a => a.fileId).map(a => ({
                                fileId: a.fileId, nom: a.name, type: a.type, date: entree.date, categorie, ...(a.description ? { description: a.description } : {})
                            }))
                        ]));
                        return ctx.documents.length ? null : "Aucun document joint trouvé pour ces critères.";
                    }
                },
                {
                    id: 'choisirDocuments',
                    type: 'jugement',
                    outils: [{
                        definition: {
                            type: "function",
                            function: {
                                name: "choisirDocuments",
                                description: "Choisit les documents à lire, parmi la liste fournie.",
                                parameters: {
                                    type: "object",
                                    properties: { fileIds: { type: "array", items: { type: "string" }, description: "fileId des documents à lire (le moins possible)." } },
                                    required: ["fileIds"]
                                }
                            }
                        },
                        executer: (args, ctx) => {
                            ctx.fileIds = [...new Set(args.fileIds)];
                            return { status: "enregistre", nombre: ctx.fileIds.length };
                        }
                    }],
                    toolChoice: 'choisirDocuments',
                    consigne: ctx => `Documents du dossier : ${JSON.stringify(ctx.documents)}\n`
                        + `Choisis, en appelant choisirDocuments, les seuls documents utiles à la demande de l'utilisateur (du plus pertinent au moins pertinent).`,
                    verifier: (args, ctx) => {
                        const ids = Array.isArray(args?.fileIds) ? args.fileIds : [];
                        const connus = new Set(ctx.documents.map(d => d.fileId));
                        if (!ids.length) return "Aucun fileId fourni. Refais l'appel avec au moins un fileId de la liste.";
                        const inconnus = ids.filter(id => !connus.has(id));
                        return inconnus.length ? `fileId absents de la liste : ${JSON.stringify(inconnus)}. Refais l'appel.` : null;
                    },
                    maxEssais: 2
                },
                {
                    id: 'lireDocuments',
                    type: 'mecanique',
                    outil: 'lireDocumentJoint',
                    args: ctx => ({ fileId: ctx.fileIds.join(',') }),
                    transmettre: true
                }
            ]
        },

        redigerDocument: {
            definition: {
                type: "function",
                function: {
                    name: "redigerDocument",
                    description: "Crée un document (consultation, certificat, demande ou courrier) pour le patient actuel, à partir de sa demande et, si utile, de son dossier. Un appel suffit : la lecture du dossier et l'enregistrement du document sont automatiques.",
                    parameters: {
                        type: "object",
                        properties: {
                            target: { type: "string", enum: ["toConsultation", "toCertificat", "toDemande", "toCourrier"], description: "Type de document à créer." },
                            categories: { type: "array", items: { type: "string", enum: ["consultations", "resultatsExamens", "courriers", "arretsTravail", "vaccins", "antecedents", "etatCivil", "contacts"] }, description: "Catégories du dossier à lire pour rédiger (défaut : antecedents et consultations). Tableau vide si le contenu est déjà fourni par l'utilisateur." },
                            dateRange: { type: "array", items: { type: "string" }, description: "Même format que recoverPatientData. Préférer une plage courte." }
                        },
                        required: ["target"]
                    }
                }
            },
            etapes: [
                {
                    id: 'lireDossier',
                    type: 'mecanique',
                    outil: 'recoverPatientData',
                    si: ctx => ctx.entree.categories?.length !== 0,
                    args: ctx => ({ categories: ctx.entree.categories || ['antecedents', 'consultations'], dateRange: ctx.entree.dateRange || [] }),
                    transmettre: true
                },
                {
                    id: 'rediger',
                    type: 'jugement',
                    outils: ['insertWedaDocument'],
                    toolChoice: 'insertWedaDocument',
                    consigne: ctx => `Rédige le document demandé (target: ${ctx.entree.target}) à partir de la demande de l'utilisateur et des données du dossier éventuellement jointes, `
                        + `puis appelle insertWedaDocument UNE fois (target, title, subtitle, content). N'invente aucune information absente du dossier.`,
                    verifier: (args, ctx) => {
                        if (args?.target !== ctx.entree.target) return `target doit valoir "${ctx.entree.target}". Refais l'appel.`;
                        return typeof args.content === 'string' && args.content.trim() ? null : "content est obligatoire. Refais l'appel.";
                    },
                    maxEssais: 2
                }
            ]
        },

        // Lancement depuis le code uniquement (PDF Parser, bouton "Résumé IA") : impose l'appel de renseignerDocument.
        completerDocument: {
            definition: null,
            conclusion: "Document renseigné. Résume en quelques lignes au praticien ce que tu as retenu du document (titre, date, classification, commentaire).",
            etapes: [
                {
                    id: 'renseigner',
                    type: 'jugement',
                    outils: ['renseignerDocument'],
                    toolChoice: 'renseignerDocument',
                    consigne: () => "Appelle maintenant renseignerDocument avec les informations demandées.",
                    apresAppel: (_nomOutil, _args, resultat, ctx) => { ctx.resultat = resultat; }
                }
            ],
            suite: async ctx => !ctx.resultat?.error && await getOptionPromise('verifierEtMettreAJourAntecedents')
                ? { chaine: 'mettreAJourAntecedentsDepuisDocument' }
                : null
        }
    };

})();
