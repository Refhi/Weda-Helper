/**
 * @file chatSlashCommands.js
 * @description Commandes "/" tapables dans le champ de saisie du chat IA (@see discussionClient.js).
 * Fichier volontairement indépendant du reste du chat : il ne connaît rien du DOM ni de l'offpage,
 * et reçoit un objet "context" fournissant les actions concrètes (fermer le chat, réinitialiser,
 * envoyer un prompt...), à charge pour l'appelant de les implémenter.
 */

const CHAT_SLASH_COMMANDS = {
    quit: {
        description: "Ferme la fenêtre de chat.",
        run: (context) => context.closeChatWindow()
    },
    clear: {
        description: "Réinitialise la conversation (identique au bouton ↺).",
        run: (context) => context.resetConversation()
    },
    stop: {
        description: "Arrête la génération en cours (identique au bouton Stop).",
        run: (context) => context.stopGeneration()
    },
    poisson: {
        description: "Demande une blague à l'IA.",
        run: (context) => context.sendUserPrompt("Raconte-moi une blague, si possible une bonne blague de poisson d'avril.")
    },
    help: {
        description: "Affiche l'aide sur les commandes et raccourcis disponibles.",
        run: (context) => context.showHelp(CHAT_SLASH_COMMANDS)
    }
};

/**
 * Tente d'interpréter le texte saisi comme une commande "/...". Renvoie true si le texte a été
 * traité comme une commande (reconnue ou non, y compris un raccourci /0 à /9 non configuré), false
 * s'il s'agit d'un message normal à transmettre tel quel au modèle.
 * @param {string} rawText
 * @param {{
 *   closeChatWindow: () => void,
 *   resetConversation: () => void,
 *   stopGeneration: () => void,
 *   sendUserPrompt: (text: string) => void,
 *   triggerShortcut: (index: number) => boolean,
 *   showSystemNotice: (text: string) => void,
 *   showHelp: (commands: typeof CHAT_SLASH_COMMANDS) => void
 * }} context
 * @returns {boolean}
 */
function tryHandleChatSlashCommand(rawText, context) {
    const trimmed = rawText.trim();
    if (!trimmed.startsWith('/')) return false;

    const [commandName, ...restWords] = trimmed.slice(1).split(/\s+/).filter(Boolean);
    if (!commandName) return false;

    // /0 à /9 déclenchent directement le raccourci de prompt configuré au même index.
    if (/^[0-9]$/.test(commandName)) {
        const shortcutIndex = Number(commandName);
        if (!context.triggerShortcut(shortcutIndex)) {
            context.showSystemNotice(`Le raccourci /${shortcutIndex} n'est pas configuré (texte vide dans les options).`);
        }
        return true;
    }

    const command = CHAT_SLASH_COMMANDS[commandName.toLowerCase()];
    if (!command) {
        context.showSystemNotice(`Commande inconnue : /${commandName}. Tapez /help pour la liste des commandes.`);
        return true;
    }

    command.run(context, restWords.join(' '));
    return true;
}
