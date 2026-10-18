/**
 * @file discussionClient.js
 * @description Interface du chat IA (widget, bulles, pièces jointes...). L'historique de
 * conversation et l'orchestration des appels au modèle vivent dans le document offpage
 * (@see offscreen/offscreenChatEngine.js), qui survit aux rechargements de page — ce fichier ne
 * conserve donc aucun état de conversation lui-même : il envoie les messages utilisateur via
 * offscreenBridge.js et affiche les événements reçus en retour (chunks, appels de fonction...).
 */
let publishedChatApi = null;
const chatApiWaiters = [];
function whenChatApiReady() {
    if (publishedChatApi) return Promise.resolve(publishedChatApi);
    return new Promise(resolve => chatApiWaiters.push(resolve));
}
function publishChatApi(api) {
    publishedChatApi = api;
    chatApiWaiters.splice(0).forEach(resolve => resolve(api));
}

/**
 * Insertion du chat en bas à droite de la page.
 */
async function addAIChatClient() {
    // Éviter les doublons si déjà injecté
    if (document.getElementById('wedaHelper-chat-widget')) return;

    /**
     * Identifiant du patient courant, déterminé une seule fois à l'initialisation du chat (le
     * patient affiché ne change pas une fois la page chargée). Sert de clé de conversation côté
     * offpage (@see offscreen/offscreenChatEngine.js), partagée entre tous les onglets ouverts sur
     * ce même patient. `let` plutôt que `const` : modifiable via switchToPatient (@see plus bas et
     * la commande /patient), utilisé notamment par le PDF Parser pour rattacher la complétion IA
     * au bon dossier patient une fois celui-ci identifié.
     */
    let chatPatientId = getCurrentPatientId();

    injectChatWidgetStyles();

    const widget = createChatWidgetElement();
    document.body.appendChild(widget);

    // --- Logique du chat ---
    // Modèle actuellement sélectionné pour les appels, parmi tous les modèles détectés (getAiParams().availableModels,
    // tous ports actifs confondus). Initialisé au modèle résolu au démarrage (préféré si trouvé, sinon premier disponible),
    // puis mis à jour par l'état de l'offpage (voir handleOffscreenMessage, cas 'stateSync') s'il diffère.
    let selectedModel = (await getAiParams()).defaultModel;
    function getCurrentModel() {
        return selectedModel;
    }


    /**
     * État de la génération en cours (bulles DOM à mettre à jour au fil des événements reçus de
     * l'offpage), ou null en dehors de toute génération. Alimenté par la soumission du formulaire,
     * consommé par handleOffscreenMessage.
     */
    let activeGeneration = null;

    // Passe à true après le premier rendu complet de l'historique (stateSync) : évite qu'un resync
    // ultérieur (déclenché à chaque reconnexion du port, ex: réveil du service worker toutes les
    // ~30s) n'efface les notices système et bulles de réflexion, absentes de l'historique persisté.
    let hasRenderedInitialState = false;

    // Historique des messages tapés par l'utilisateur (repris de l'historique offpage au chargement,
    // puis complété à chaque envoi) : sert à la navigation ↑/↓ dans le champ de saisie et à /set
    // sans texte explicite (reprend alors le dernier message).
    let promptHistory = [];
    // Index courant de navigation dans promptHistory (null = pas en cours de navigation).
    let promptHistoryIndex = null;
    let promptHistoryDraft = ''; // texte en cours de saisie, sauvegardé avant de naviguer dans l'historique


    const chatWindow = widget.querySelector('#wedaHelper-chat-window');
    const chatHeader = widget.querySelector('#wedaHelper-chat-header');
    const chatToggle = widget.querySelector('#wedaHelper-chat-toggle');
    const closeChat = widget.querySelector('#wedaHelper-close-chat');
    const chatForm = widget.querySelector('#wedaHelper-chat-form');
    const chatInput = widget.querySelector('#wedaHelper-chat-input');
    const chatSubmitButton = widget.querySelector('#wedaHelper-chat-submit');
    const chatStopButton = widget.querySelector('#wedaHelper-chat-stop');
    const chatMessages = widget.querySelector('#wedaHelper-chat-messages');
    const infoButton = widget.querySelector('#wedaHelper-info-chat');
    const infoPopover = widget.querySelector('#wedaHelper-info-popover');
    const resetButton = widget.querySelector('#wedaHelper-reset-chat');
    const externalWarning = widget.querySelector('#wedaHelper-external-warning');
    const headerTitle = widget.querySelector('#wedaHelper-header-title');
    const headerModel = widget.querySelector('#wedaHelper-header-model');
    const inputResizeHandle = widget.querySelector('#wedaHelper-input-resize-handle');

    // Ancrage automatique en bas de la conversation : désactivé si l'utilisateur remonte
    // manuellement pour relire un échange, réactivé dès qu'il revient près du bas.
    let stickToBottom = true;
    const STICK_TO_BOTTOM_THRESHOLD = 40; // px de tolérance pour considérer qu'on est "en bas"
    function isNearBottom() {
        return chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight <= STICK_TO_BOTTOM_THRESHOLD;
    }
    chatMessages.addEventListener('scroll', () => {
        stickToBottom = isNearBottom();
    });
    function scrollChatToBottom(force = false) {
        if (force || stickToBottom) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
            stickToBottom = true;
        }
    }
    const fileInput = widget.querySelector('#wedaHelper-file-input');
    const attachFileButton = widget.querySelector('#wedaHelper-attach-file');
    const attachmentsPreview = widget.querySelector('#wedaHelper-attachments-preview');
    const shortcutsPanel = widget.querySelector('#wedaHelper-chat-shortcuts');
    const copyMessageButton = widget.querySelector('#wedaHelper-copy-message-btn');
    const toolResultButton = widget.querySelector('#wedaHelper-tool-result-btn');
    const toolResultPopover = widget.querySelector('#wedaHelper-tool-result-popover');
    const shortcutTooltip = widget.querySelector('#wedaHelper-shortcut-tooltip');
    const markdownRenderer = typeof markdownit === 'function'
        ? markdownit({ html: false, linkify: true, breaks: true })
        : null;
    const domPurifyApi = (typeof DOMPurify !== 'undefined' && typeof DOMPurify.sanitize === 'function')
        ? DOMPurify
        : null;

    console.info('[discussionClient] Markdown pipeline init', {
        markdownitAvailable: !!markdownRenderer,
        domPurifyAvailable: !!domPurifyApi
    });

    setupChatWidgetLayout({ widget, chatWindow, chatHeader, chatToggle, chatInput, inputResizeHandle });

    // --- Gestion des pièces jointes (documents/images envoyés au modèle) ---
    // Extensions/types traités comme du texte brut (extrait puis injecté dans le message,
    // aucune conversion n'est nécessaire côté modèle).
    const ATTACHMENT_TEXT_EXTENSIONS = ['.txt', '.md', '.csv', '.log', '.json'];

    /** Pièces jointes en attente d'envoi avec le prochain message utilisateur. */
    let pendingAttachments = [];

    /**
     * Lit un fichier joint et renvoie la ou les pièces jointes utilisables dans le contenu du
     * message (un fichier peut produire plusieurs pièces jointes, ex: PDF scanné → une image par page) :
     * - image : encodée en data URL (format 'image_url' de l'API, nécessite un modèle vision côté serveur)
     * - PDF : texte extrait, ou pages rendues en images si non lisible (@see resolvePdfAttachment, pdfAttachmentHelper.js)
     * - texte brut (.txt, .md, .csv, .log, .json) : lu tel quel
     * @param {File} file
     * @returns {Promise<Array<{kind: 'image'|'text', name: string, dataUrl?: string, extractedText?: string}>>}
     */
    async function readAttachmentFile(file) {
        const lowerName = file.name.toLowerCase();

        if (file.type.startsWith('image/')) {
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(reader.error || new Error('Lecture du fichier image échouée'));
                reader.readAsDataURL(file);
            });
            return [{ kind: 'image', name: file.name, dataUrl }];
        }

        if (lowerName.endsWith('.pdf') || file.type === 'application/pdf') {
            const objectUrl = URL.createObjectURL(file);
            try {
                return pdfAttachmentsFromResolved(await resolvePdfAttachment(objectUrl), file.name);
            } finally {
                URL.revokeObjectURL(objectUrl);
            }
        }

        if (ATTACHMENT_TEXT_EXTENSIONS.some(ext => lowerName.endsWith(ext)) || file.type.startsWith('text/')) {
            const extractedText = await file.text();
            return [{ kind: 'text', name: file.name, extractedText }];
        }

        throw new Error(`Type de fichier non supporté pour "${file.name}" (formats acceptés : PDF, image, texte).`);
    }

    /** Reconstruit l'affichage des puces de pièces jointes en attente d'envoi. */
    function renderAttachmentsPreview() {
        attachmentsPreview.innerHTML = '';
        pendingAttachments.forEach((att, index) => {
            const chip = document.createElement('div');
            chip.classList.add('wedaHelper-attachment-chip');
            const icon = att.kind === 'image' ? '🖼️' : '📄';
            chip.innerHTML = `<span title="${att.name}">${icon} ${att.name}</span>`;
            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.textContent = '×';
            removeButton.title = 'Retirer cette pièce jointe';
            removeButton.addEventListener('click', () => {
                pendingAttachments.splice(index, 1);
                renderAttachmentsPreview();
            });
            chip.appendChild(removeButton);
            attachmentsPreview.appendChild(chip);
        });
        attachmentsPreview.classList.toggle('visible', pendingAttachments.length > 0);
    }

    attachFileButton.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async () => {
        const files = Array.from(fileInput.files || []);
        fileInput.value = ''; // permet de resélectionner le même fichier ensuite
        for (const file of files) {
            try {
                const attachments = await readAttachmentFile(file);
                pendingAttachments.push(...attachments);
            } catch (error) {
                console.warn('[discussionClient] Échec de lecture de la pièce jointe', error);
                const errorBubble = appendMessage('bot', `⚠️ ${error.message}`);
                errorBubble.classList.remove('bot');
                errorBubble.classList.add('tool-call', 'error');
            }
        }
        renderAttachmentsPreview();
    });

    /**
     * Construit le contenu du message utilisateur à partir du texte saisi et des pièces jointes en
     * attente : renvoie une simple chaîne si aucune image n'est jointe (compatibilité maximale),
     * ou un tableau de parts au format "vision" OpenAI ({type: 'text'|'image_url'}) sinon.
     * @param {string} userText
     * @param {Array} attachments
     * @returns {string|Array}
     */
    function buildUserMessageContent(userText, attachments) {
        let textContent = userText;
        for (const att of attachments) {
            if (att.kind === 'text') {
                textContent += `\n\n--- Fichier joint : ${att.name} ---\n${att.extractedText}\n--- Fin du fichier ${att.name} ---`;
            }
        }

        const images = attachments.filter(att => att.kind === 'image');
        if (images.length === 0) return textContent;

        return [
            { type: 'text', text: textContent },
            ...images.map(att => ({ type: 'image_url', image_url: { url: att.dataUrl } }))
        ];
    }


    /**
     * Fonction utilitaire pour construire le contenu HTML de la popover d'informations sur l'état du chat.
     * Relit systématiquement getAiParams() pour refléter les derniers réglages (aucune valeur mise en cache ici).
     */
    async function buildInfoContent() {
        const aiParams = await getAiParams();
        const functionsList = Object.entries(availableFunctions).map(([name, fn]) => {
            const description = fn.definition?.function?.description || '';
            return `<li><strong>${name}</strong>${description ? ' — ' + description : ''}</li>`;
        }).join('');

        const hasModelsList = (aiParams.availableModels?.length || 0) > 0;
        const modelOptions = (aiParams.availableModels || [])
            .filter((m, idx, arr) => arr.findIndex(other => other.model === m.model) === idx) // dédoublonnage
            .map(m => `<option value="${m.model}" ${m.model === selectedModel ? 'selected' : ''}>${m.model}</option>`)
            .join('');

        const useSecond = !!(await getOptionPromise('IAassistantUseSecondProfile'));
        const [url1, url2, model2Pref] = await getOptionPromise(['IAassistantBaseUrl', 'IAassistantBaseUrl2', 'IAassistantModelName2']);
        const [model1Pref] = await getOptionPromise(['IAassistantModelName']);
        const profiles = [
            { num: 1, active: !useSecond, url: url1, model: !useSecond ? selectedModel : model1Pref, key: 'IAassistantModelName' },
            { num: 2, active: useSecond, url: url2, model: useSecond ? selectedModel : model2Pref, key: 'IAassistantModelName2' },
        ];
        const serverSections = profiles.map(p => `
            <div class="wedaHelper-server-section${p.active ? ' active' : ''}">
                <h4>Serveur ${p.num}${p.active ? ' (actif)' : ''}</h4>
                <input ${p.active ? 'id="wedaHelper-model-select" list="wedaHelper-model-options"' : `class="wedaHelper-model-other" data-key="${p.key}"`} value="${p.model || ''}" placeholder="Nom du modèle / déploiement" />
                ${p.active && hasModelsList ? `<datalist id="wedaHelper-model-options">${modelOptions}</datalist>` : ''}
                <pre>${(p.url || '').trim()}</pre>
            </div>`).join('');

        // Toujours une liste déroulante éditable (saisie libre) : certains serveurs (ex: Azure
        // OpenAI) renvoient sur `/models` le catalogue complet plutôt que les seuls déploiements
        // configurés, dont le nom (ex: nom de déploiement) peut donc ne pas y figurer.
        return `
            <button id="wedaHelper-disable-connector" type="button">Désactiver l'Assistant Local</button>
            <h4>Modèle <span title="La liste suggérée peut ne pas correspondre aux modèles réellement déployés (ex: Azure OpenAI expose tout son catalogue, pas vos déploiements). En cas d'échec, tapez manuellement le nom exact du modèle/déploiement.">⚠️</span></h4>
            ${serverSections}
            <h4>Tool Calling</h4>
            <pre>Max. Tool Calling = ${aiParams.MAX_TOOL_CALL_DEPTH}, cf. options Weda-Helper</pre>
            <h4>Prompt système</h4>
            <pre>${aiParams.basicSystemPrompt || '(aucun)'}</pre>
            <h4>Fonctions appelables</h4>
            <ul>${functionsList || '<li>(aucune)</li>'}</ul>
        `;
    }

    resetButton.addEventListener('click', resetConversation);

    // Bascule entre les deux profils serveur/modèle (options IAassistant*2).
    const profileToggle = widget.querySelector('#wedaHelper-profile-toggle');
    async function refreshProfileToggle() {
        const useSecond = await getOptionPromise('IAassistantUseSecondProfile');
        profileToggle.querySelector('.knob').textContent = useSecond ? '2' : '1';
        profileToggle.setAttribute('aria-checked', String(!!useSecond));
        profileToggle.classList.toggle('second', !!useSecond);
    }
    profileToggle.addEventListener('click', async () => {
        const useSecond = await getOptionPromise('IAassistantUseSecondProfile');
        await setActiveAiProfile(!useSecond);
        selectedModel = (await getAiParams()).defaultModel;
        refreshHeaderModel();
        sendOffscreenMessage({ type: 'setModel', patientId: chatPatientId, model: selectedModel });
        infoPopover.classList.remove('open');
        await refreshProfileToggle();
        await updateExternalWarning();
    });
    refreshProfileToggle();

    /** Affiche le "!" jaune d'avertissement RGPD/HDS uniquement si l'URL configurée n'est pas locale. */
    async function updateExternalWarning() {
        let isExternal = false;
        let externalProviderName = '';
        try {
            const { hostname } = new URL((await getAiParams()).baseUrl);
            isExternal = !['localhost', '127.0.0.1', '[::1]'].includes(hostname);
            // Domaine principal (ex: "xxx.openai.azure.com" -> "azure.com"), hôte complet pour une adresse IP
            const labels = hostname.split('.');
            externalProviderName = /^[\d.]+$/.test(hostname) || labels.length <= 2 ? hostname : labels.slice(-2).join('.');
        } catch (error) {
            isExternal = false;
        }
        externalWarning.classList.toggle('visible', isExternal);
        headerTitle.textContent = isExternal ? `Assistant ${externalProviderName} (Beta)` : 'Assistant Local (Beta)';
    }
    updateExternalWarning();

    /** Affiche à droite du toggle le nom du modèle actuellement utilisé. */
    function refreshHeaderModel() {
        const model = getCurrentModel() || '';
        headerModel.textContent = model;
        headerModel.title = model;
    }
    refreshHeaderModel();

    /** Réinitialise la conversation en cours (utilisé par le bouton ↺ et la commande /clear). */
    function resetConversation() {
        sendOffscreenMessage({ type: 'resetChat', patientId: chatPatientId });
        pendingAttachments = [];
        renderAttachmentsPreview();
        chatMessages.innerHTML = '';
        infoPopover.classList.remove('open');
    }

    // Callback appelé une seule fois, après que le prochain 'stateSync' pour le patient ciblé par
    // switchToPatient ait été appliqué (@see handleOffscreenMessage 'stateSync') : permet à un
    // appelant externe (ex: pdfParserAIExtraction.js) d'attendre la fin de la resynchronisation
    // avant d'envoyer un prompt, pour éviter qu'il ne soit effacé par un stateSync arrivant après coup.
    let onNextStateSyncRendered = null;

    /** Ramène « pas de patient » (null, undefined, '', 0, '0') à null, sinon l'id en chaîne. */
    function normalizePatientId(patientId) {
        const asString = String(patientId ?? '').trim();
        return (!asString || /^0+$/.test(asString)) ? null : asString;
    }

    /**
     * Change le patient associé à la conversation courante (commande /patient, ou appelé
     * directement via l'API publiée par publishChatApi) : la conversation offpage étant indexée
     * par patientId, changer d'id revient à basculer sur une conversation différente (nouvelle ou
     * déjà existante si un autre onglet discute déjà avec ce patient).
     * Un id vide (null, undefined, '', 0 ou '0') désigne le « patient 0 » : retour sur la
     * conversation non nominative de base (clé 'default' côté offpage).
     * @param {string|number|null} newPatientId
     * @param {() => void} [onSynced] - Rappelé une fois le prochain stateSync pour ce patient appliqué.
     * @returns {boolean} false si c'est déjà le patient en cours (onSynced n'est alors jamais appelé).
     */
    function switchToPatient(newPatientId, onSynced) {
        const targetPatientId = normalizePatientId(newPatientId);
        if (targetPatientId === chatPatientId) return false;
        chatPatientId = targetPatientId;
        pendingAttachments = [];
        renderAttachmentsPreview();
        chatMessages.innerHTML = '';
        infoPopover.classList.remove('open');
        hasRenderedInitialState = false;
        onNextStateSyncRendered = onSynced || null;
        sendOffscreenMessage({ type: 'subscribe', patientId: chatPatientId });
        sendOffscreenMessage({ type: 'requestState', patientId: chatPatientId });
        return true;
    }

    /**
     * Reconstruit l'affichage à partir de l'historique conversationnel renvoyé par l'offpage (voir
     * 'stateSync'), suite à un rechargement de page : seuls les tours user/assistant sont rejoués
     * (le détail du raisonnement et des appels de fonction d'origine n'est pas conservé par l'offpage).
     * @param {Array} history
     */
    function renderHistoryFromState(history) {
        chatMessages.innerHTML = '';
        promptHistory = [];
        history.forEach(entry => {
            const textParts = Array.isArray(entry.content)
                ? entry.content.filter(part => part.type === 'text').map(part => part.text).join('\n')
                : entry.content;
            if (!textParts) return;
            const msgDiv = appendMessage(entry.role === 'user' ? 'user' : 'bot', textParts);
            if (entry.role !== 'user') renderMarkdownInBubble(msgDiv, textParts);
            else promptHistory.push(textParts);
        });
    }

    // S'abonne auprès du background au patient courant, pour recevoir les diffusions (broadcast)
    // destinées à tous les onglets ouverts sur ce patient (@see background/offscreenHandler.js), et
    // demande l'état actuel de la conversation (peut déjà exister si un autre onglet a discuté avec
    // le même patient, ou si cette page a été rechargée) afin de reconstruire l'affichage (la
    // réponse 'stateSync' est traitée par handleOffscreenMessage). Rejoué à chaque reconnexion du
    // port (@see onOffscreenReconnect dans offscreenBridge.js) : le service worker de background
    // perd en mémoire cet abonnement à chaque redémarrage (~30s d'inactivité), il faut donc le
    // refaire dès que la reconnexion aboutit, sans attendre une action de l'utilisateur.
    onOffscreenReconnect(() => {
        sendOffscreenMessage({ type: 'subscribe', patientId: chatPatientId });
        sendOffscreenMessage({ type: 'requestState', patientId: chatPatientId });
    });
    scrollChatToBottom(true); // ouverture du chat : toujours ancré en bas

    // Le textarea insère un saut de ligne par défaut sur Entrée : on force la soumission,
    // sauf si Shift est maintenu (pour permettre les messages multi-lignes).
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            chatForm.requestSubmit();
            return;
        }
        // Navigation ↑/↓ dans l'historique des prompts envoyés, uniquement quand le curseur est en
        // tout début (↑) ou toute fin (↓) du texte, pour ne pas gêner l'édition multi-lignes.
        const atStart = chatInput.selectionStart === 0 && chatInput.selectionEnd === 0;
        const atEnd = chatInput.selectionStart === chatInput.value.length && chatInput.selectionEnd === chatInput.value.length;
        if (e.key === 'ArrowUp' && atStart && promptHistory.length) {
            e.preventDefault();
            if (promptHistoryIndex === null) {
                promptHistoryDraft = chatInput.value;
                promptHistoryIndex = promptHistory.length;
            }
            if (promptHistoryIndex > 0) {
                promptHistoryIndex--;
                chatInput.value = promptHistory[promptHistoryIndex];
                chatInput.setSelectionRange(0, 0);
            }
        } else if (e.key === 'ArrowDown' && atEnd && promptHistoryIndex !== null) {
            e.preventDefault();
            if (promptHistoryIndex < promptHistory.length - 1) {
                promptHistoryIndex++;
                chatInput.value = promptHistory[promptHistoryIndex];
            } else {
                promptHistoryIndex = null;
                chatInput.value = promptHistoryDraft;
            }
            chatInput.setSelectionRange(chatInput.value.length, chatInput.value.length);
        }
    });

    // gestion de l'affichage de la popover d'informations sur l'état du chat
    infoButton.addEventListener('click', async () => {
        const isPopoverOpen = infoPopover.classList.contains('open');
        if (isPopoverOpen) {
            infoPopover.classList.remove('open');
        } else {
            // Relance la recherche des modèles disponibles quand on ouvre la popover
            await recheckServerAvailability().catch(e => console.warn('[discussionClient] Erreur lors du re-check serveur :', e));

            infoPopover.innerHTML = await buildInfoContent();
            infoPopover.classList.add('open');
            bindInfoPopoverActions();
        }
    });

    function bindInfoPopoverActions() {
        const modelSelect = infoPopover.querySelector('#wedaHelper-model-select');
        if (modelSelect) {
            modelSelect.addEventListener('change', async () => {
                selectedModel = modelSelect.value;
                refreshHeaderModel();
                chrome.storage.local.set({ [await getActiveModelNameKey()]: selectedModel }); // enregistre le choix comme modèle préféré du profil actif
                sendOffscreenMessage({ type: 'setModel', patientId: chatPatientId, model: selectedModel });
                infoPopover.innerHTML = await buildInfoContent();
                bindInfoPopoverActions();
            });
        }

        infoPopover.querySelectorAll('.wedaHelper-model-other').forEach(input => {
            input.addEventListener('change', () => {
                chrome.storage.local.set({ [input.dataset.key]: input.value.trim() || 'auto' });
            });
        });

        const disableConnectorButton = infoPopover.querySelector('#wedaHelper-disable-connector');
        if (disableConnectorButton) {
            disableConnectorButton.addEventListener('click', () => {
                const confirmed = window.confirm("Voulez-vous vraiment désactiver le connecteur IA ? Vous pourrez le réactiver depuis les options avancées de Weda-Helper.");
                if (!confirmed) return;

                chrome.storage.local.set({ enableIAassistant: false }, () => {
                    infoPopover.classList.remove('open');
                    widget.remove();
                });
            });
        }
    }

    /**
     * Positionne la colonne de raccourcis à cheval du bord gauche de la fenêtre de chat (moitié dans,
     * moitié dehors), verticalement centrée : appelée en boucle (requestAnimationFrame) tant que le
     * chat est ouvert, pour suivre le déplacement/redimensionnement de la fenêtre sans dupliquer sa
     * logique de drag/resize.
     */
    function syncShortcutsPanelPosition() {
        const rect = chatWindow.getBoundingClientRect();
        const buttonWidth = 32;
        shortcutsPanel.style.left = `${Math.max(4, rect.left - buttonWidth / 2)}px`;
        shortcutsPanel.style.top = `${rect.top}px`;
        shortcutsPanel.style.right = 'auto';
        shortcutsPanel.style.bottom = 'auto';
        shortcutsPanel.style.height = `${rect.height}px`;
        shortcutsPanel.style.justifyContent = 'center';
    }

    let shortcutsSyncRafId = null;
    function startShortcutsSyncLoop() {
        function loop() {
            syncShortcutsPanelPosition();
            shortcutsSyncRafId = requestAnimationFrame(loop);
        }
        loop();
    }
    function stopShortcutsSyncLoop() {
        if (shortcutsSyncRafId) cancelAnimationFrame(shortcutsSyncRafId);
        shortcutsSyncRafId = null;
    }

    /**
     * Construit les boutons ronds de raccourcis à partir des 10 prompts paramétrés dans les options
     * (@see aiParams.promptShortcuts, réglages "IAassistantPromptShortcut0" à "9"). Un bouton affiche
     * juste son numéro au repos, le texte complet du prompt en tooltip ; les emplacements vides ne
     * sont pas affichés.
     */
    async function renderShortcutButtons() {
        const { promptShortcuts } = await getAiParams();
        shortcutsPanel.innerHTML = '';
        (promptShortcuts || []).forEach((promptText, index) => {
            if (!promptText?.trim()) return;
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = String(index);
            // Recharge le texte au survol plutôt que de fermer sur la valeur capturée au rendu,
            // pour refléter un raccourci modifié entre-temps depuis un autre onglet/les options.
            button.addEventListener('mouseenter', async () => {
                const { promptShortcuts: freshShortcuts } = await getAiParams();
                shortcutTooltip.textContent = freshShortcuts?.[index] ?? promptText;
                const buttonRect = button.getBoundingClientRect();
                shortcutTooltip.style.top = `${buttonRect.top}px`;
                shortcutTooltip.style.left = `${buttonRect.right + 8}px`;
                shortcutTooltip.style.display = 'block';
            });
            button.addEventListener('mouseleave', () => {
                shortcutTooltip.style.display = 'none';
            });
            button.addEventListener('click', () => runPromptShortcut(index));
            shortcutsPanel.appendChild(button);
        });
    }
    renderShortcutButtons();

    // La tooltip peut rester affichée à tort (ex. mouseleave manqué) ; un clic dessus la masque.
    shortcutTooltip.addEventListener('click', () => {
        shortcutTooltip.style.display = 'none';
    });

    /**
     * Envoie le prompt configuré pour le raccourci d'index donné (utilisé par les boutons ronds et
     * les commandes /0 à /9). Renvoie false si l'emplacement est vide ou une génération est en cours.
     * Envoie directement via submitUserMessage plutôt que chatForm.requestSubmit() : ce dernier
     * échoue silencieusement quand il est appelé alors qu'un submit est déjà en cours de traitement
     * (cas de la commande /1, déclenchée depuis le handler 'submit' du formulaire).
     * @param {number} index
     * @returns {Promise<boolean>}
     */
    async function runPromptShortcut(index) {
        const { promptShortcuts } = await getAiParams();
        const promptText = promptShortcuts?.[index];
        if (!promptText?.trim() || activeGeneration) return false;
        const attachmentsForThisMessage = pendingAttachments;
        pendingAttachments = [];
        renderAttachmentsPreview();
        submitUserMessage(promptText, attachmentsForThisMessage);
        return true;
    }


    let isOpen = false;
    function toggleChat() {
        isOpen = !isOpen;
        if (isOpen) {
            chatWindow.classList.add('open');
            updateExternalWarning(); // l'URL a pu être modifiée dans les options depuis le dernier affichage
            chatToggle.style.display = 'none';
            chatInput.focus();
            shortcutsPanel.classList.add('open');
            startShortcutsSyncLoop();
        } else {
            chatWindow.classList.remove('open');
            chatToggle.style.display = 'flex';
            shortcutsPanel.classList.remove('open');
            stopShortcutsSyncLoop();
        }
    }

    chatToggle.addEventListener('click', toggleChat);
    closeChat.addEventListener('click', toggleChat);

    // Ferme le chat avec Echap, comme la plupart des fenêtres flottantes.
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && isOpen) {
            toggleChat();
        }
    });

    // --- Copie d'une bulle au survol ---
    // Un seul bouton flottant suit la bulle survolée plutôt que d'en injecter un par bulle : plusieurs
    // bulles voient leur contenu remplacé directement (textContent/innerHTML) au fil du streaming,
    // ce qui aurait effacé un bouton enfant à chaque mise à jour.
    let hoveredBubbleForCopy = null;
    let hideCopyButtonTimeoutId = null;
    function positionCopyButtonOverBubble(bubble) {
        const rect = bubble.getBoundingClientRect();
        // Ancré en bas à droite de la bulle : reste toujours cliquable même si la bulle dépasse en haut de la fenêtre.
        copyMessageButton.style.top = `${rect.bottom - 24}px`;
        copyMessageButton.style.left = `${rect.right - 24}px`;
        toolResultButton.style.top = copyMessageButton.style.top;
        toolResultButton.style.left = `${rect.right - 48}px`;
    }
    function showCopyButtonForBubble(bubble) {
        clearTimeout(hideCopyButtonTimeoutId);
        hoveredBubbleForCopy = bubble;
        positionCopyButtonOverBubble(bubble);
        copyMessageButton.style.display = 'flex';
        // Le "?" n'existe que pour les bulles d'appel de fonction dont le résultat est connu.
        toolResultButton.style.display = bubble.toolResultText !== undefined ? 'flex' : 'none';
    }
    function scheduleHideCopyButton() {
        clearTimeout(hideCopyButtonTimeoutId);
        // Léger délai pour laisser le temps au pointeur d'atteindre le bouton sans qu'il disparaisse.
        hideCopyButtonTimeoutId = setTimeout(() => {
            copyMessageButton.style.display = 'none';
            toolResultButton.style.display = 'none';
            toolResultPopover.style.display = 'none';
            hoveredBubbleForCopy = null;
        }, 200);
    }

    // Popover du résultat d'un appel de fonction, affiché au survol du "?".
    let hideToolResultPopoverTimeoutId = null;
    function scheduleHideToolResultPopover() {
        clearTimeout(hideToolResultPopoverTimeoutId);
        hideToolResultPopoverTimeoutId = setTimeout(() => { toolResultPopover.style.display = 'none'; }, 200);
    }
    toolResultButton.addEventListener('mouseenter', () => {
        clearTimeout(hideCopyButtonTimeoutId);
        clearTimeout(hideToolResultPopoverTimeoutId);
        if (!hoveredBubbleForCopy || hoveredBubbleForCopy.toolResultText === undefined) return;
        toolResultPopover.textContent = hoveredBubbleForCopy.toolResultText;
        toolResultPopover.style.display = 'block';
        const buttonRect = toolResultButton.getBoundingClientRect();
        const popoverRect = toolResultPopover.getBoundingClientRect();
        const top = buttonRect.top - popoverRect.height - 4;
        toolResultPopover.style.top = `${top >= 8 ? top : buttonRect.bottom + 4}px`;
        toolResultPopover.style.left = `${Math.max(8, buttonRect.right - popoverRect.width)}px`;
    });
    toolResultButton.addEventListener('mouseleave', () => {
        scheduleHideCopyButton();
        scheduleHideToolResultPopover();
    });
    toolResultPopover.addEventListener('mouseenter', () => {
        clearTimeout(hideCopyButtonTimeoutId);
        clearTimeout(hideToolResultPopoverTimeoutId);
    });
    toolResultPopover.addEventListener('mouseleave', () => {
        scheduleHideCopyButton();
        scheduleHideToolResultPopover();
    });
    chatMessages.addEventListener('mouseover', (event) => {
        const bubble = event.target.closest('.message');
        if (!bubble) return;
        if (bubble === hoveredBubbleForCopy) { clearTimeout(hideCopyButtonTimeoutId); return; }
        showCopyButtonForBubble(bubble);
    });
    chatMessages.addEventListener('mouseout', (event) => {
        const leavingBubble = event.target.closest('.message');
        if (!leavingBubble) return;
        // Ne masque pas si on se dirige vers un autre élément de la même bulle ou vers le bouton lui-même.
        if (event.relatedTarget && (leavingBubble.contains(event.relatedTarget) || event.relatedTarget === copyMessageButton || event.relatedTarget === toolResultButton)) return;
        scheduleHideCopyButton();
    });
    copyMessageButton.addEventListener('mouseenter', () => clearTimeout(hideCopyButtonTimeoutId));
    copyMessageButton.addEventListener('mouseleave', scheduleHideCopyButton);
    copyMessageButton.addEventListener('click', () => {
        if (!hoveredBubbleForCopy) return;
        
        // Copie avec mise en forme (HTML) si le markdown a été rendu, sinon copie du texte brut
        const isMarkdownRendered = hoveredBubbleForCopy.classList.contains('markdown-rendered');
        
        if (isMarkdownRendered) {
            // Copie l'HTML rendu avec mise en forme
            const htmlToCopy = hoveredBubbleForCopy.innerHTML;
            const plainTextToCopy = hoveredBubbleForCopy.textContent;
            
            const blob = new Blob([htmlToCopy], { type: 'text/html' });
            const data = [new ClipboardItem({ 'text/html': blob, 'text/plain': new Blob([plainTextToCopy], { type: 'text/plain' }) })];
            
            navigator.clipboard.write(data).then(() => {
                copyMessageButton.textContent = '✅';
                setTimeout(() => { copyMessageButton.textContent = '📋'; }, 1000);
            }).catch(error => {
                console.warn('[discussionClient] Copie formatée du message impossible, fallback sur texte brut', error);
                // Fallback sur copie texte brut
                navigator.clipboard.writeText(plainTextToCopy).then(() => {
                    copyMessageButton.textContent = '✅';
                    setTimeout(() => { copyMessageButton.textContent = '📋'; }, 1000);
                }).catch(err => console.warn('[discussionClient] Copie du message impossible', err));
            });
        } else {
            // Copie du texte brut si pas de mise en forme
            const textToCopy = hoveredBubbleForCopy.textContent;
            navigator.clipboard.writeText(textToCopy).then(() => {
                copyMessageButton.textContent = '✅';
                setTimeout(() => { copyMessageButton.textContent = '📋'; }, 1000);
            }).catch(error => console.warn('[discussionClient] Copie du message impossible', error));
        }
    });

    function appendMessage(role, text) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', role === 'user' ? 'user' : 'bot');
        msgDiv.textContent = text;
        chatMessages.appendChild(msgDiv);
        // Un message de l'utilisateur force le réancrage en bas ; un message du bot respecte le décollage manuel.
        scrollChatToBottom(role === 'user');
        return msgDiv;
    }

    /**
     * Rend du markdown en HTML sécurisé dans une bulle bot déjà existante.
     * Le markdown source est conservé dans des data-attributes pour la persistance/relecture.
     * @param {HTMLElement} bubble
     * @param {string} markdownText
     * @returns {boolean}
     */
    function renderMarkdownInBubble(bubble, markdownText) {
        if (!markdownRenderer || !domPurifyApi || typeof markdownText !== 'string') {
            console.warn('[discussionClient] Markdown pipeline indisponible, rendu texte brut conservé', {
                markdownitAvailable: !!markdownRenderer,
                domPurifyAvailable: !!domPurifyApi,
                isStringInput: typeof markdownText === 'string'
            });
            return false;
        }

        try {
            const rawHtml = markdownRenderer.render(markdownText);
            // console.info('[discussionClient] Markdown converti en HTML', {
            //     markdownLength: markdownText.length,
            //     htmlLength: rawHtml.length,
            //     containsTable: /<table[\s>]/i.test(rawHtml)
            // });
            const sanitizedHtml = domPurifyApi.sanitize(rawHtml, { USE_PROFILES: { html: true } });
            // console.info('[discussionClient] HTML sanitise via DOMPurify', {
            //     htmlBeforeSanitizeLength: rawHtml.length,
            //     htmlAfterSanitizeLength: sanitizedHtml.length,
            //     removedCharacters: rawHtml.length - sanitizedHtml.length
            // });
            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = sanitizedHtml;

            tempContainer.querySelectorAll('a').forEach(link => {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            });

            bubble.innerHTML = tempContainer.innerHTML;
            bubble.classList.add('markdown-rendered');
            bubble.dataset.messageFormat = 'markdown';
            bubble.dataset.markdownSource = markdownText;
            // console.info('[discussionClient] Bulle assistant rendue en markdown sanitise', {
            //     linksCount: tempContainer.querySelectorAll('a').length,
            //     tablesCount: tempContainer.querySelectorAll('table').length
            // });
            return true;
        } catch (error) {
            console.warn('[discussionClient] Échec du rendu markdown, retour en texte brut.', error);
            return false;
        }
    }

    /**
     * Vérifie la disponibilité de l'API du modèle d'IA local à l'ouverture du chat. Si le
     * serveur n'est pas détecté, affiche un message d'avertissement avec un lien vers le wiki
     * expliquant comment installer une IA locale.
     */
    async function checkAiApiAvailability() {
        const isAvailable = await testAiApiConnection();
        if (isAvailable) return;

        const { baseUrl } = await getAiParams();

        const warningBubble = appendMessage('bot', '');
        warningBubble.classList.remove('bot');
        warningBubble.classList.add('tool-call', 'error');
        warningBubble.innerHTML = `⚠️ Aucune IA détectée à l'adresse ${baseUrl}. Consultez le <a href="https://github.com/Refhi/Weda-Helper/wiki/Installation-d'une-IA-sur-votre-poste,-pour-que-Weda%E2%80%90Helper-s'en-saisisse" target="_blank" rel="noopener noreferrer">wiki d'installation d'une IA locale</a> pour configurer l'assistant. Cliquez sur le ? bleu pour le désactiver.`;
    }
    checkAiApiAvailability();

    /**
     * S'assure qu'un état de génération existe pour afficher les événements reçus de l'offpage :
     * en principe créé par la soumission du formulaire, mais peut aussi être initialisé "à la volée"
     * si un autre onglet ouvert sur le même patient est à l'origine de la génération en cours.
     * @returns {object}
     */
    function ensureActiveGeneration() {
        if (activeGeneration) return activeGeneration;
        const loadingMsg = appendMessage('bot', "L'IA réfléchit...");
        loadingMsg.classList.add('loading');
        chatSubmitButton.style.display = 'none';
        chatStopButton.classList.add('visible');
        activeGeneration = {
            loadingMsg,
            reasoningMsg: null,
            contentStarted: false,
            lastFinishReason: null,
            contextWarningShown: false,
            toolCallBubbles: new Map(), // id -> élément DOM du feedback d'appel de fonction
            accumulatedContent: ''      // texte markdown brut accumulé, rendu à chaque chunk
        };
        return activeGeneration;
    }

    /** Termine l'état de génération courant : réactive le bouton d'envoi, masque le bouton Stop. */
    function endActiveGeneration() {
        activeGeneration = null;
        chatStopButton.classList.remove('visible');
        chatSubmitButton.style.display = '';
    }

    /**
     * Traite les messages reçus de l'offpage (@see offscreen/offscreenChatEngine.js) : fragments de
     * réponse en streaming, événements d'appel de fonction, fin de génération, erreurs et
     * synchronisation d'état. Ignore les messages concernant un autre patient (ex: un autre onglet
     * ouvert sur un patient différent, l'offpage étant partagé entre tous les onglets).
     * @param {object} message
     */
    /**
     * Applique un fragment de réponse en streaming (reasoning/contenu) à l'état de génération
     * courant. Factorisé pour être rejoué tel quel lors d'un rattrapage d'état (stateSync).
     * @param {object} gen
     * @param {{contentDelta?: string, reasoningDelta?: string, finishReason?: string}} chunk
     */
    function applyAssistantChunk(gen, { contentDelta, reasoningDelta, finishReason }) {
        if (finishReason) gen.lastFinishReason = finishReason;

        if (reasoningDelta) {
            if (!gen.reasoningMsg) {
                gen.reasoningMsg = appendMessage('bot', '');
                gen.reasoningMsg.classList.remove('bot');
                gen.reasoningMsg.classList.add('reasoning');
                // Le message de "réflexion" doit apparaître avant la réponse en cours
                chatMessages.insertBefore(gen.reasoningMsg, gen.loadingMsg);
            }
            gen.reasoningMsg.textContent += reasoningDelta;
            scrollChatToBottom();
        }
        if (contentDelta) {
            if (!gen.contentStarted) {
                gen.contentStarted = true;
                gen.accumulatedContent = '';
                gen.loadingMsg.textContent = '';
                gen.loadingMsg.classList.remove('loading');
            }
            gen.accumulatedContent += contentDelta;
            if (!renderMarkdownInBubble(gen.loadingMsg, gen.accumulatedContent)) {
                gen.loadingMsg.textContent = gen.accumulatedContent;
            }
            scrollChatToBottom();
        }
    }

    /**
     * Compte récursivement les data URL trouvées dans les tableaux `images` d'un résultat de tool
     * call (@see resolvePdfAttachment, pdfAttachmentHelper.js), pour afficher une puce 🖼️ par image
     * sur la bulle de résultat, comme pour une pièce jointe envoyée par l'utilisateur.
     * @param {*} value
     * @returns {number}
     */
    function countImagesInResult(value) {
        if (Array.isArray(value)) return value.reduce((total, item) => total + countImagesInResult(item), 0);
        if (value && typeof value === 'object') {
            if (Array.isArray(value.images)) return value.images.length;
            return Object.values(value).reduce((total, item) => total + countImagesInResult(item), 0);
        }
        return 0;
    }

    /**
     * Applique un événement d'appel de fonction (début/succès/erreur) à l'état de génération
     * courant. Factorisé pour être rejoué tel quel lors d'un rattrapage d'état (stateSync).
     * @param {object} gen
     * @param {{id: string, name: string, args: object, status: string, result?: *, error?: string}} event
     */
    function applyToolCallEvent(gen, { id, name, args, status, result, error }) {
        // Une nouvelle étape de raisonnement pourra suivre cet appel : on force une nouvelle bulle.
        gen.reasoningMsg = null;

        if (status === 'start') {
            // Le texte déjà écrit par le modèle avant cet appel reste dans sa bulle, figée à sa place : la suite
            // (outils, puis réponse suivante) s'affiche en dessous au lieu de l'écraser ou de s'y accumuler.
            if (gen.contentStarted) {
                gen.loadingMsg = appendMessage('bot', '');
                gen.loadingMsg.classList.add('loading');
                gen.contentStarted = false;
                gen.accumulatedContent = '';
            }
            const bubble = appendMessage('bot', `🔧 Appel de la fonction "${name}"...`);
            bubble.classList.remove('bot');
            bubble.classList.add('tool-call', 'pending');
            bubble.title = `${name}(${JSON.stringify(args ?? {}, null, 2)})`;
            chatMessages.insertBefore(bubble, gen.loadingMsg);
            gen.toolCallBubbles.set(id, bubble);
            return;
        }

        const bubble = gen.toolCallBubbles.get(id);
        if (!bubble) return;

        bubble.classList.remove('pending');
        if (status === 'success') {
            // Affiche une puce 🖼️ par image trouvée dans le résultat (ex: pages de pdf scanné rendues
            // en images par resolvePdfAttachment), comme pour une pièce jointe envoyée par l'utilisateur.
            const imageCount = countImagesInResult(result);
            const imageLabel = imageCount ? ` ${'🖼️'.repeat(Math.min(imageCount, 5))}${imageCount > 5 ? ` (+${imageCount - 5})` : ''}` : '';
            bubble.textContent = `✅ Résultat reçu de "${name}"${imageLabel}`;
            // Les data URL d'images sont remplacées par une simple icône pour garder un aperçu lisible.
            bubble.toolResultText = typeof result === 'string'
                ? result
                : JSON.stringify(result, (key, value) => (typeof value === 'string' && value.startsWith('data:image/') ? '🖼️' : value), 2);
        } else if (status === 'error') {
            bubble.classList.add('error');
            bubble.textContent = `❌ Échec de l'appel à "${name}"`;
            bubble.toolResultText = String(error);
        }
        if (hoveredBubbleForCopy === bubble) showCopyButtonForBubble(bubble);
        scrollChatToBottom();
    }

    function handleOffscreenMessage(message) {
        if (message.patientId !== chatPatientId && message.type !== 'toolCallRequest') return;

        switch (message.type) {
            case 'stateSync':
                selectedModel = message.selectedModel || selectedModel;
                refreshHeaderModel();
                // Ne reconstruit l'affichage qu'une seule fois (premier chargement / changement de
                // patient) : les resyncs suivants (reconnexion du port) ne doivent pas effacer les
                // notices système et bulles de réflexion déjà affichées, absentes de l'historique persisté.
                if (!hasRenderedInitialState) {
                    hasRenderedInitialState = true;
                    renderHistoryFromState(message.history || []);
                }
                if (onNextStateSyncRendered) {
                    const callback = onNextStateSyncRendered;
                    onNextStateSyncRendered = null;
                    callback();
                }
                if (message.liveGeneration) {
                    // Une génération est déjà en cours (lancée depuis un autre onglet) : on rejoue son
                    // instantané pour rattraper immédiatement l'affichage, sans attendre le prochain événement.
                    const gen = ensureActiveGeneration();
                    for (const toolCall of message.liveGeneration.toolCalls) applyToolCallEvent(gen, toolCall);
                    if (message.liveGeneration.reasoning) applyAssistantChunk(gen, { reasoningDelta: message.liveGeneration.reasoning });
                    if (message.liveGeneration.content) applyAssistantChunk(gen, { contentDelta: message.liveGeneration.content });
                }
                break;

            case 'generationBusy': {
                const gen = ensureActiveGeneration();
                gen.loadingMsg.textContent = '⚠️ Une génération est déjà en cours pour ce patient depuis un autre onglet : patientez qu’elle se termine.';
                gen.loadingMsg.classList.remove('loading');
                gen.loadingMsg.classList.add('tool-call', 'error');
                endActiveGeneration();
                break;
            }

            case 'assistantWarning': {
                const gen = ensureActiveGeneration();
                const { type, estimatedTokens, limit, ratio } = message.warning || {};
                if (type !== 'context_limit' || gen.contextWarningShown) break;
                gen.contextWarningShown = true;
                const warningBubble = appendMessage('bot', `⚠️ Le contexte estimé de la conversation (~${estimatedTokens} tokens) approche ou dépasse la limite configurée (${limit} tokens, ${Math.round(ratio * 100)}%). Les échanges avec les outils peuvent être tronqués par le serveur : pensez à augmenter la taille du contexte dans votre fournisseur de modèle et/ou réinitialiser la conversation si les réponses deviennent incohérentes. Pensez à mettre à jour les options de Weda-Helper si vous changez la limite de contexte côté serveur.`);
                warningBubble.classList.remove('bot');
                warningBubble.classList.add('tool-call', 'error');
                chatMessages.insertBefore(warningBubble, gen.loadingMsg);
                scrollChatToBottom();
                break;
            }

            case 'assistantChunk':
                applyAssistantChunk(ensureActiveGeneration(), message);
                break;

            case 'toolCallEvent':
                applyToolCallEvent(ensureActiveGeneration(), message);
                break;

            case 'assistantEmpty': {
                // Le modèle s'est arrêté (souvent après une phase de réflexion) sans produire de réponse finale
                const gen = ensureActiveGeneration();
                const finishReason = message.finishReason;
                let reason;
                if (finishReason === 'length') {
                    reason = "la limite de tokens (maxTokens) a été atteinte avant la fin de sa réflexion — augmentez maxTokens ou raccourcissez le prompt système/l'historique.";
                } else if (finishReason === 'content_filter') {
                    reason = "la réponse a été bloquée par un filtre de contenu côté serveur.";
                } else if (finishReason) {
                    reason = `le serveur a renvoyé un arrêt inhabituel (finish_reason = "${finishReason}"), consultez les logs du serveur hébergeant le LLM pour plus de détails.`;
                } else {
                    reason = "aucune raison d'arrêt n'a été transmise par le serveur (connexion interrompue ?), consultez les logs du serveur hébergeant le LLM pour plus de détails.";
                }
                gen.loadingMsg.textContent = `⚠️ Le modèle n'a renvoyé aucune réponse : ${reason}`;
                gen.loadingMsg.classList.remove('loading');
                gen.loadingMsg.classList.add('tool-call', 'error');
                console.warn("[discussionClient] Réponse vide reçue du modèle.", { finishReason });

                if (gen.reasoningMsg) {
                    gen.reasoningMsg.title = "La réflexion s'est arrêtée sans aboutir à une réponse.";
                    gen.reasoningMsg.classList.add('error');
                }
                endActiveGeneration();
                break;
            }

            case 'assistantDone': {
                // Réponse finale reçue : on l'affiche
                const gen = ensureActiveGeneration();
                gen.loadingMsg.textContent = message.content;
                gen.loadingMsg.classList.remove('loading');
                // En streaming, le texte est affiché brut pour éviter les artefacts; on applique
                // le rendu markdown sécurisé une fois la réponse complète reçue.
                renderMarkdownInBubble(gen.loadingMsg, message.content);

                if (message.finishReason === 'stop') {
                    gen.loadingMsg.title = 'Réponse complète';
                } else if (message.finishReason === 'length') {
                    gen.loadingMsg.title = 'Réponse probablement tronquée (limite de tokens atteinte)';
                    const truncatedNotice = appendMessage('bot', '✂️ Cette réponse a été tronquée : la limite de tokens (maxTokens) a été atteinte avant que le modèle ait terminé.');
                    truncatedNotice.classList.remove('bot');
                    truncatedNotice.classList.add('tool-call', 'error');
                    console.warn("[discussionClient] Réponse tronquée : limite de tokens atteinte.", { finishReason: message.finishReason });
                }
                endActiveGeneration();
                break;
            }

            case 'assistantAborted': {
                // Arrêt volontaire via le bouton Stop : le contenu partiel déjà reçu est conservé comme
                // réponse finale de l'assistant, plutôt que d'afficher une erreur.
                const gen = ensureActiveGeneration();
                gen.loadingMsg.classList.remove('loading');
                if (!renderMarkdownInBubble(gen.loadingMsg, message.content)) {
                    gen.loadingMsg.textContent = message.content;
                }
                gen.loadingMsg.title = 'Génération interrompue par l’utilisateur';
                endActiveGeneration();
                break;
            }

            case 'assistantError': {
                // Gestion des erreurs lors de l'appel au modèle (ex: serveur inaccessible, timeout, erreur interne du modèle...)
                const gen = ensureActiveGeneration();
                gen.loadingMsg.textContent = "❌ Erreur : " + message.error;
                gen.loadingMsg.classList.remove('loading');
                gen.loadingMsg.classList.add('tool-call', 'error');
                console.error("[discussionClient] Erreur lors de l'appel au modèle :", message.error);
                endActiveGeneration();
                break;
            }

            default:
                console.warn('[discussionClient] Message offpage de type inconnu ignoré :', message);
        }
    }

    onOffscreenMessage(handleOffscreenMessage);

    chatStopButton.addEventListener('click', stopGeneration);

    /** Arrête la génération en cours (utilisé par le bouton Stop et la commande /stop). */
    function stopGeneration() {
        sendOffscreenMessage({ type: 'stopGeneration', patientId: chatPatientId });
    }

    /** Affiche une bulle neutre d'information système (retour des commandes /...). */
    function showSystemNotice(text) {
        const notice = appendMessage('bot', text);
        notice.classList.remove('bot');
        notice.classList.add('tool-call');
    }

    /** Affiche la liste des commandes / disponibles ainsi que les raccourcis de prompts configurés. */
    async function showHelpMessage(commands) {
        const { promptShortcuts } = await getAiParams();
        const commandsList = Object.entries(commands)
            .map(([name, cmd]) => `• /${name} — ${cmd.description}`)
            .join('\n');
        const configuredShortcuts = (promptShortcuts || [])
            .map((text, index) => (text?.trim() ? `• /${index} — ${text.slice(0, 60)}${text.length > 60 ? '…' : ''}` : null))
            .filter(Boolean)
            .join('\n');
        showSystemNotice(`Commandes disponibles :\n${commandsList}\n\nRaccourcis de prompts configurés :\n${configuredShortcuts || '(aucun)'}`);
    }

    // Contexte fourni à chatSlashCommands.js (@see tryHandleChatSlashCommand) : ce fichier indépendant
    // ne connaît rien du DOM, seulement ces callbacks.
    const slashCommandContext = {
        closeChatWindow: () => { if (isOpen) toggleChat(); },
        resetConversation,
        stopGeneration,
        sendUserPrompt: (text) => submitUserMessage(text, []),
        triggerShortcut: (index) => runPromptShortcut(index),
        showSystemNotice,
        showHelp: showHelpMessage,
        switchPatient: (arg) => {
            if (!arg) { showSystemNotice('Usage : /patient <identifiant patient> (0 pour la conversation non nominative)' +                         ` (conversation attachée à : ${chatPatientId ?? 0} ; patientId utilisé par les tool calls : ${resolveCurrentPatientId()})`); return; }
                        showSystemNotice(`Commande /patient reçue (argument : "${arg}", conversation attachée à : ${chatPatientId ?? 0} ; patientId utilisé par les tool calls : ${resolveCurrentPatientId()}).`);
            const switched = switchToPatient(arg);
            showSystemNotice(switched
                ? (normalizePatientId(arg) ? `Conversation associée au patient ${arg}.` : 'Retour à la conversation non nominative.')
                : `Aucun changement : déjà sur le patient ${arg}.`);
        },
        // Enregistre un raccourci de prompt : /set <index> [texte]. Sans texte, reprend le dernier
        // message envoyé (promptHistory) — pratique pour transformer à la volée un message qu'on vient
        // d'envoyer en raccourci permanent.
        setShortcut: async (arg) => {
            const [indexText, ...rest] = arg.trim().split(/\s+/).filter(Boolean);
            const index = Number(indexText);
            if (!Number.isInteger(index) || index < 0 || index > 9) {
                showSystemNotice('Usage : /set <index 0-9> [texte du prompt] (sans texte, reprend le dernier message envoyé).');
                return;
            }
            const promptText = rest.length ? rest.join(' ') : promptHistory[promptHistory.length - 1];
            if (!promptText?.trim()) {
                showSystemNotice('Aucun texte fourni et aucun dernier message envoyé à utiliser.');
                return;
            }
            await setStorageOption({ [`IAassistantPromptShortcut${index}`]: promptText });
            renderShortcutButtons();
            showSystemNotice(`Raccourci /${index} enregistré : ${promptText.slice(0, 60)}${promptText.length > 60 ? '…' : ''}`);
        },
        // Supprime un raccourci de prompt : /del <index>.
        deleteShortcut: async (arg) => {
            const index = Number(arg.trim());
            if (!Number.isInteger(index) || index < 0 || index > 9) {
                showSystemNotice('Usage : /del <index 0-9>.');
                return;
            }
            const { promptShortcuts } = await getAiParams();
            if (!promptShortcuts?.[index]?.trim()) {
                showSystemNotice(`Le raccourci /${index} est déjà vide.`);
                return;
            }
            await setStorageOption({ [`IAassistantPromptShortcut${index}`]: '' });
            renderShortcutButtons();
            showSystemNotice(`Raccourci /${index} supprimé.`);
        }
    };

    /**
     * Envoie effectivement un message utilisateur (bulle + génération) : factorisé pour être appelé
     * aussi bien depuis la soumission normale du formulaire que depuis une commande / (ex: /poisson).
     * @param {string} userText
     * @param {Array} attachmentsForThisMessage
     * @param {{chaine?: {nom: string, entree?: object}}} [options] chaîne d'outils à démarrer avant la première requête (@see toolChains.js)
     */
    function submitUserMessage(userText, attachmentsForThisMessage = [], { chaine } = {}) {
        promptHistory.push(userText);
        promptHistoryIndex = null;
        const attachmentsLabel = attachmentsForThisMessage.length
            ? '\n\n' + attachmentsForThisMessage.map(att => `${att.kind === 'image' ? '🖼️' : '📄'} ${att.name}`).join('\n')
            : '';
        appendMessage('user', userText + attachmentsLabel);
        chatInput.value = ''; // réinitialise le champ de saisie

        ensureActiveGeneration();
        sendOffscreenMessage({
            type: 'userMessage',
            patientId: chatPatientId,
            model: getCurrentModel(),
            content: buildUserMessageContent(userText, attachmentsForThisMessage),
            chaine
        });
    }

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const userText = chatInput.value.trim();
        if (!userText) return;

        if (await tryHandleChatSlashCommand(userText, slashCommandContext)) {
            chatInput.value = '';
            return;
        }

        // Les pièces jointes en attente (voir readAttachmentFile/buildUserMessageContent) sont
        // consommées ici : le texte affiché à l'utilisateur reste simple, mais le contenu envoyé
        // au modèle inclut le texte extrait des documents et/ou les images en data URL.
        const attachmentsForThisMessage = pendingAttachments;
        pendingAttachments = [];
        renderAttachmentsPreview();
        submitUserMessage(userText, attachmentsForThisMessage);
    });

    // Publie le pont utilisable par d'autres scripts (ex: pdfParserAIExtraction.js) pour lancer une chaîne d'outils
    // avec un prompt "comme si l'utilisateur l'avait tapé" (visible dans le chat, réponse via tool call) et
    // rattacher la conversation au bon patient une fois celui-ci identifié.
    publishChatApi({
        // Lance une chaîne d'outils (@see toolChains.js) avec ce prompt (et d'éventuelles pièces jointes déjà prêtes,
        // @see pdfAttachmentsFromResolved), comme si le modèle en avait appelé le point d'entrée.
        lancerChaine: (nom, entree, text, attachments = []) => submitUserMessage(text, attachments, { chaine: { nom, entree } }),
        // Renvoie une Promise résolue une fois le prochain stateSync appliqué (ou immédiatement si
        // aucun changement n'était nécessaire) : permet à l'appelant (ex: pdfParserAIExtraction.js)
        // d'attendre la resynchronisation avant d'envoyer un prompt, pour éviter qu'il ne soit
        // effacé par un stateSync arrivant après coup (@see switchToPatient).
        switchToPatient: (newPatientId) => new Promise((resolve) => {
            const switched = switchToPatient(newPatientId, () => resolve(true));
            if (!switched) resolve(false);
        }),
        resetConversation,
        stop: stopGeneration,
        open: () => { if (!isOpen) toggleChat(); }
    });
}


addTweak('*', 'enableIAassistant', function () {
    const urlBlacklist = [
        '/FolderMedical/PopUpUploader.aspx',
    ];
    if (urlBlacklist.some(urlPart => window.location.href.includes(urlPart))) {
        // On considère que l'IA n'est pas pertinente sur ces pages
        return;
    }
    // On attend que Weda soit prêt avant d'injecter le chat, pour éviter les conflits avec le chargement de la page.
    waitForWeda({ logWait: 'enableIAassistant' }).then(() => {
        addAIChatClient();
    });
});