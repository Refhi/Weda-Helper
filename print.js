/**
 * Fonction d'entrée pour l'impression ou le téléchargement.
 * Les arguments dépendent du raccourci clavier utilisé :
 * - `ctrl+P` => Impression, si pertinent du modèle 0
 * - `ctrl+shift+P` => Impression, si pertinent du modèle 1
 * - `ctrl+D` => Téléchargement, si pertinent du modèle 0
 * - `ctrl+shift+D` => Téléchargement, si pertinent du modèle 1
 * - `ctrl+E` => Impression et envoi, si pertinent du modèle 0
 * - `ctrl+shift+E` => Impression et envoi, si pertinent du modèle 1
 *
 * @param {Object} config - Configuration de l'impression
 * @param {string} config.printType - Type d'action à effectuer, soit "print" pour impression, soit "download" pour téléchargement.
 * @param {number} [config.modelNumber=0] - Numéro du modèle à utiliser, par défaut 0.
 * @param {boolean} [config.massPrint=false] - Indique si on est en mode impression multiple, par défaut false.
 * @param {boolean} [config.sendAfterPrint=false] - Indique si le document doit être envoyé après impression, par défaut false.
 * 
 * @example
 * // Impression simple du modèle 0
 * handlePrint({ printType: 'print' });
 * 
 * @example
 * // Impression du modèle 1
 * handlePrint({ printType: 'print', modelNumber: 1 });
 * 
 * @example
 * // Téléchargement du modèle 0
 * handlePrint({ printType: 'download' });
 * 
 * @example
 * // Impression et envoi du modèle 0
 * handlePrint({ printType: 'print', sendAfterPrint: true });
 */
async function handlePrint({ printType, modelNumber = 0, massPrint = false, sendAfterPrint = false } = {}) {
    try {
        // Récupération des options
        const [RemoveLocalCompanionPrint, postPrintBehavior, instantPrint] =
            await getOptionPromise(['RemoveLocalCompanionPrint', 'postPrintBehavior', 'instantPrint']);

        // Création d'un objet de configuration pour centraliser les paramètres
        const printConfig = {
            // Type d'impression (impression, téléchargement, companion)
            handlingType: deduceHandlingType(printType, RemoveLocalCompanionPrint),

            // Type de contenu (courbe, FSE, modèle)
            whatToPrint: deduceWhatToPrint(),

            // Types de prise en charge spécifiques
            massPrint: massPrint,
            sendAfterPrint: sendAfterPrint,

            // // Comportement après impression (avec priorité à forcedPostPrintBehavior)
            postPrintBehavior: postPrintBehavior,

            // Numéro du modèle d'impression
            modelNumber: modelNumber,

            // Impression instantanée (uniquement si companion est activé)
            instantPrint: instantPrint && !RemoveLocalCompanionPrint
        };

        // Validation de la configuration
        if (!validatePrintConfig(printConfig)) {
            console.error('Configuration d\'impression invalide:', printConfig);
            return;
        }
        console.debug('Configuration de l\'impression:', printConfig);

        // Démarrage du processus d'impression avec la configuration complète
        await startPrinting(printConfig);

        // Exemple de printConfig : { handlingType: 'print', whatToPrint: 'model', massPrint: false, sendAfterPrint: false, postPrintBehavior: 'doNothing', modelNumber: 0, instantPrint: false }


    } catch (error) {
        console.error('Erreur lors de l\'initialisation de l\'impression:', error);
    }
}


/**
 * Valide les paramètres de configuration pour l'impression ou le téléchargement.
 * 
 * @param {Object} printConfig - Configuration de l'impression
 * @param {string} printConfig.handlingType - Type de traitement ('print', 'download', 'companion')
 * @param {string} printConfig.whatToPrint - Type de contenu ('courbe', 'fse', 'model')
 * @param {string} printConfig.postPrintBehavior - Comportement post-impression ('doNothing', 'closePreview', 'returnToPatient', 'send')
 * @param {number} printConfig.modelNumber - Numéro du modèle (obligatoire si whatToPrint='model')
 * @returns {boolean} - True si la configuration est valide, sinon false
 */
function validatePrintConfig(printConfig) {
    // Validation des types de traitement
    const handlingTypes = ['print', 'download', 'companion'];
    if (!handlingTypes.includes(printConfig.handlingType)) {
        console.error('[validatePrintConfig] Type de traitement non reconnu:', printConfig.handlingType);
        return false;
    }

    // Validation des types de contenu
    const whatToPrintTypes = ['courbe', 'fse', 'model'];
    if (!whatToPrintTypes.includes(printConfig.whatToPrint)) {
        console.error('[validatePrintConfig] Type de contenu non reconnu:', printConfig.whatToPrint);
        return false;
    }

    // Validation des comportements post-impression
    const postPrintBehaviors = ['doNothing', 'closePreview', 'returnToPatient', 'send'];
    if (printConfig.postPrintBehavior && !postPrintBehaviors.includes(printConfig.postPrintBehavior)) {
        console.error('[validatePrintConfig] Comportement post-impression non reconnu:', printConfig.postPrintBehavior);
        return false;
    }

    // Validation du numéro de modèle (uniquement si on imprime un modèle)
    if (printConfig.whatToPrint === 'model' && (isNaN(printConfig.modelNumber) || printConfig.modelNumber < 0)) {
        console.error('[validatePrintConfig] Numéro de modèle non valide:', printConfig.modelNumber);
        return false;
    }

    return true;
}



/**
 * Détermine le type de demande d'impression ou de téléchargement.
 */
function deduceHandlingType(printType, RemoveLocalCompanionPrint) {
    if (printType === 'print') {
        return RemoveLocalCompanionPrint ? 'print' : 'companion';
    } else if (printType === 'download') {
        return 'download';
    } else {
        throw new Error('Type de demande non valide');
    }
}

/**
 * Déduit le type de contenu à imprimer ou télécharger en fonction de l'URL actuelle.
 */
function deduceWhatToPrint() {
    // Dictionnaire des scénarios
    const scenarios = {
        'courbe': () => window.location.href.startsWith(`${baseUrl}/FolderMedical/ConsultationForm.aspx`),
        'fse': () => window.location.href.startsWith(`${baseUrl}/vitalzen/fse.aspx`),
        'model': () => true // Par défaut, si aucun autre scénario ne correspond
    };

    // Itérer sur les scénarios pour trouver celui qui correspond
    for (const [scenario, condition] of Object.entries(scenarios)) {
        if (condition()) {
            return scenario;
        }
    }

    // Si aucun scénario ne correspond, retourner null
    return null;
}

/**
 * Récupère l'URL du PDF à partir des données présentes dans l'image.
 * Utile pour récupérer le PDF d'une courbe.
 *
 * @returns {string|null} - L'URL du PDF ou null si non détecté.
 */
function fetchPdfUrlFromImageData() {
    var pdfUrl = document.querySelector('img[data-pdf-url]');
    if (pdfUrl) {
        console.log('[fetchPdfUrlFromImageData] pdf Url détecté :', pdfUrl);
        let url = pdfUrl.getAttribute('data-pdf-url');
        return url;
    } else {
        console.log('[fetchPdfUrlFromImageData] pdfUrl non détecté');
        return null;
    }
}


/**
 * Crée et ajoute un iframe caché pour faciliter l'impression.
 *
 * @returns {HTMLIFrameElement} - L'iframe caché créé.
 */
function createEmptyHiddenIframe() {
    // Crée un nouvel élément iframe pour l'impression
    let hiddenFrame = document.createElement('iframe');
    hiddenFrame.name = 'print_frame';
    hiddenFrame.width = '0';
    hiddenFrame.height = '0';
    hiddenFrame.style.display = 'none';
    document.body.appendChild(hiddenFrame);
    return hiddenFrame;
}

/**
 * Télécharge un blob à partir d'une URL.
 *
 * @param {string} url - L'URL du fichier à télécharger.
 * @returns {Promise<Blob|null>} - Une promesse qui se résout avec le blob téléchargé ou null en cas d'erreur.
 */
async function fetchBlobFromUrl(url) {
    console.log('fetchPDF', url);
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return blob;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

/**
 * Charge une URL dans un iframe et affiche la boîte de dialogue d'impression lorsque l'iframe est chargée.
 *
 * @param {HTMLIFrameElement} iframe - L'iframe dans laquelle charger l'URL. Normalement énérée par `createEmptyHiddenIframe`.
 * @param {string} url - L'URL du pdf à charger dans l'iframe.
 */
function loadUrlAndShowPrintDialog(iframe, url) {
    // Définit une fonction à exécuter lorsque l'iframe est chargée
    iframe.onload = function () {
        let win = window.frames['print_frame'];
        win.focus();
        win.print();
    };

    // Vérifie l'origine de l'URL
    let urlObject = new URL(url);
    if (urlObject.origin === baseUrl) {
        console.log('url origin ok', urlObject.origin);
        iframe.src = url; // C'est ici que l'URL est chargée
    } else {
        // Log en cas d'URL non fiable
        console.error('Untrusted URL:', url);
    }
}

/**
 * Force le téléchargement direct d'un fichier à partir d'une URL.
 *
 * @param {string} url - L'URL du fichier à télécharger.
 */
function triggerDirectDownload(url) {
    // On va contourner les restrictions de téléchargement en créant un élément 'a' caché
    // Ce dernier, quand cliqué, va déclencher le téléchargement du fichier via son attribut 'download'
    // Cela permet de télécharger le fichier sans modifier le manifest
    var link = document.createElement('a');
    link.href = url;
    link.download = ''; // Pour forcer le téléchargement
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click(); // Cela déclenche le téléchargement
    document.body.removeChild(link); // Suppression de l'élément 'a' après le téléchargement
}


/**
 * Clique sur un modèle d'impression spécifique basé sur son numéro.
 *
 * @param {number} [modelNumber=0] - Le numéro du modèle d'impression à cliquer. Par défaut, 0.
 * @returns {boolean} - Retourne true si le modèle d'impression a été trouvé et cliqué, sinon false.
 */
function clickPrintModelNumber(modelNumber = 0, send = false) {
    var elements = document.querySelectorAll('[onclick*="ctl00$ContentPlaceHolder1$MenuPrint"][class*="popout-dynamic level2"]');
    console.log('Voici les modeles d impression trouvés', elements);
    if (elements[modelNumber]) {
        console.log('clicking on model number', modelNumber, elements[modelNumber]);


        if (send) {
            setTimeout(function () {
                var childElements = document.querySelectorAll('.level3');
                console.log('Voici les éléments enfants trouvés', childElements);
                var sendElement = Array.from(childElements).find(function (el) {
                    return el.innerText.trim() === "Envoyer";
                });
                if (sendElement) {
                    console.log('clicking on send element', sendElement);
                    sendElement.click();
                }
            }, 500); // Attendre un peu pour que les éléments enfants soient chargés
        } else {
            elements[modelNumber].click();
        }

        return true;
    } else {
        return false;
    }
}

/**
 * Attend que l'iframe soit chargé avant de le retourner.
 *
 * @param {string} selector - Le sélecteur CSS de l'iframe à attendre.
 * @returns {Promise<HTMLIFrameElement>} - Une promesse qui se résout avec l'iframe chargé.
 */
async function awaitIframeLoad(iframeSelector, whatToPrint) {
    return new Promise((resolve, reject) => {
        // Dans le cas d'une FSE, l'iframe est déjà présent dans le DOM car
        // on appelle cette fonction alors que l'iframe est déjà chargée
        if (whatToPrint === 'fse') {
            let iframe = document.querySelector(iframeSelector);
            resolve(iframe);
            return;
        }

        waitForElement({
            selector: iframeSelector,
            justOnce: true,
            callback: (newElements) => {
                // Supposons que le premier nouvel élément est l'iframe qui nous intéresse
                let iframe = newElements[0];
                resolve(iframe);
            },
        });
    });
}


/**
 * Attend que l'URL de l'iframe change de 'about:blank' à une autre URL, puis retourne cette URL.
 *
 * @param {HTMLIFrameElement} iframe - L'iframe dont l'URL doit être surveillée.
 * @returns {Promise<string>} - Une promesse qui se résout avec l'URL de l'iframe lorsque celle-ci change de 'about:blank'.
 * @throws {Error} - Rejette la promesse si l'URL de l'iframe ne change pas dans les 5 secondes.
 */
function awaitIframeUrl(iframe) {
    return new Promise((resolve, reject) => {
        let intervalId = setInterval(() => {
            let url = iframe.contentWindow.location.href;
            console.log('url', url);

            if (url !== 'about:blank') {
                clearInterval(intervalId);
                resolve(url);
            }
        }, 100);

        setTimeout(() => {
            clearInterval(intervalId);
            reject(new Error('Timeout while waiting for iframe URL'));
        }, 5000);
    });
}


/**
 * Effectue une action après l'impression en fonction du comportement spécifié.
 *
 * @param {string} postPrintBehavior - Le comportement à adopter après l'impression. 
 * Peut être 'doNothing', 'closePreview', ou 'returnToPatient'.
 */
function postPrintAction(postPrintBehavior, whatToPrint) {
    console.log('postPrintAction activé');

    /**
     * Ferme la fenêtre d'impression FSE.
     */
    function closeFSEPrintWindow() {
        // Puis fermer la fenêtre
        boutons = document.querySelectorAll('span.mat-button-wrapper');
        let boutonFermer = Array.from(boutons).find(bouton => bouton.innerText === 'Fermer');
        if (boutonFermer) {
            console.log('boutonFermer', boutonFermer);
            boutonFermer.click();
        }
    }

    // cas d'une FSE
    if (whatToPrint === 'fse') {
        console.log('FSE detected, je tente de fermer la fenêtre');
        closeFSEPrintWindow();
    } else {
        let closebutton = {
            'doNothing': null,
            'closePreview': 'ContentPlaceHolder1_ViewPdfDocumentUCForm1_ButtonCloseStay',
            'returnToPatient': 'ContentPlaceHolder1_ViewPdfDocumentUCForm1_ButtonClose',
        }
        console.log('postPrintBehavior is ', postPrintBehavior, 'id to look for ', closebutton[postPrintBehavior])
        let buttonToClick = document.getElementById(closebutton[postPrintBehavior]);
        if (buttonToClick) {
            console.log('clicking on', buttonToClick)
            buttonToClick.click();
            recordMetrics({ clicks: 1, drags: 1 });
        }
    }
}

/**
 * Gère l'impression ou le téléchargement d'un document à partir d'un iframe.
 *
 * @param {string} selector - Le sélecteur CSS de l'iframe à traiter.
 * @param {string} handlingType - Le type de traitement à effectuer. Peut être 'print', 'companion', ou 'download'.
 * @param {string} whatToPrint - Le type de contenu à imprimer ou télécharger. Peut être 'courbe', 'fse', ou 'model'.
 * @param {string} postPrintBehavior - Le comportement à adopter après l'impression. Peut être 'doNothing', 'closePreview', ou 'returnToPatient'.
 */
async function printIframeWhenAvailable(selector, handlingType, whatToPrint, postPrintBehavior) {
    try {
        // Attendre que l'iframe soit chargée
        const iframe = await awaitIframeLoad(selector, whatToPrint);
        console.log('iframe trouvée :', iframe);

        if (handlingType === 'print') {
            // Imprimer le contenu de l'iframe
            iframe.contentWindow.print();
            return null; // Pas besoin de retourner quoi que ce soit
        } else {
            // Attendre l'URL de l'iframe
            const url = await awaitIframeUrl(iframe);
            if (url) {
                if (handlingType === 'companion') {
                    // Récupérer un blob à partir de l'URL et l'envoyer à une fonction compagnon
                    const blob = await fetchBlobFromUrl(url);
                    sendToCompanion('print', blob);
                } else if (handlingType === 'download') {
                    // Déclencher un téléchargement direct de l'URL
                    triggerDirectDownload(url);
                    setLastPrintDate(); // Utilisé dans le cadre d'instantPrint
                }
            }
            return { postPrintBehavior, whatToPrint };
        }
    } catch (error) {
        // Afficher un message d'erreur en cas de problème
        console.error('Erreur lors de l\'impression ou du téléchargement :', error);
    }
}


/**
 * Démarre le processus d'impression ou de téléchargement en fonction de la configuration fournie.
 *
 * @param {Object} printConfig - Configuration complète de l'impression
 * @param {string} printConfig.handlingType - Type de traitement ('print', 'download', 'companion')
 * @param {string} printConfig.whatToPrint - Type de contenu ('courbe', 'fse', 'model')
 * @param {string} printConfig.postPrintBehavior - Comportement post-impression ('doNothing', 'closePreview', 'returnToPatient', 'send')
 * @param {number} printConfig.modelNumber - Numéro du modèle (requis pour whatToPrint='model')
 * @param {boolean} [printConfig.instantPrint=false] - Active l'impression instantanée
 * @param {boolean} [printConfig.massPrint=false] - Indique si on est en mode impression multiple
 * @param {boolean} [printConfig.sendAfterPrint=false] - Indique si le document doit être envoyé après impression
 */
async function startPrinting(printConfig) {
    console.log('startPrinting activé');

    // Exemple de printConfig : { handlingType: 'print', whatToPrint: 'model', massPrint: false, sendAfterPrint: false, postPrintBehavior: 'doNothing', modelNumber: 0, instantPrint: false }
    // Extraction des propriétés de la configuration
    let { handlingType, whatToPrint, massPrint, sendAfterPrint, postPrintBehavior, modelNumber, instantPrint } = printConfig;
    recordMetrics({ clicks: 3, drags: 4 });

    // trois grands cas de figure : impression d'une courbe, d'une fse ou d'un document
    if (whatToPrint === 'courbe') {
        let url = fetchPdfUrlFromImageData();
        if (!url) {
            console.log('[processPrintSequence] URL non trouvée');
            return;
        }
        if (handlingType === 'print') {
            let iframe = createEmptyHiddenIframe();
            loadUrlAndShowPrintDialog(iframe, url);
        } else if (handlingType === 'companion') {
            fetchBlobFromUrl(url)
                .then(blob => { sendToCompanion('print', blob); });
        } else if (handlingType === 'download') {
            triggerDirectDownload(url);
        }
    } else if (whatToPrint === 'fse') {
        console.log('printing FSE');
        // Cherche l'élément avec class 'mat-button-wrapper' et texte 'Imprimer'
        let boutons = document.querySelectorAll('span.mat-button-wrapper');
        let boutonImprimer = Array.from(boutons).find(bouton => bouton.innerText === 'Imprimer');
        boutonImprimer.click();

        // D'abord attendre le feu vert pour l'impression. On doit attendre que le timestamp contenu dans le storage FSEPrintGreenLightTimestamp date de moins de 10 secondes
        function waitForFSEPrintGreenLight() {
            const startTime = Date.now(); // Enregistre le moment du début            
            function checkConditionAndRetry() {
                chrome.storage.local.get('FSEPrintGreenLightTimestamp', function (result) {
                    console.log('FSEPrintGreenLightTimestamp', result.FSEPrintGreenLightTimestamp);
                    if (Date.now() - result.FSEPrintGreenLightTimestamp < 10000) {
                        console.log('FSEPrintGreenLightTimestamp is less than 10 seconds ago, je lance l\'impression');
                        // Quand l'iframe est chargée, lancer l'impression
                        printIframeWhenAvailable("iframe", handlingType, whatToPrint, postPrintBehavior)
                            .then((result) => {
                                if (result) {
                                    postPrintAction(result.postPrintBehavior, whatToPrint);
                                }
                            });

                    } else if (Date.now() - startTime > 10000) {
                        console.log('Timeout while waiting for FSEPrintGreenLightTimestamp');
                        return
                    } else {
                        console.log('FSEPrintGreenLightTimestamp is more than 10 seconds ago, je réessaie dans 100ms');
                        setTimeout(checkConditionAndRetry, 100); // Rappelle checkConditionAndRetry après 100 ms
                    }
                });
            }

            checkConditionAndRetry(); // Appel initial pour démarrer la vérification
        }
        waitForFSEPrintGreenLight();


    }
    // cas des modèles d'impression
    else {
        // 1. Configuration du comportement post-impression
        if (instantPrint && !massPrint) {
            console.log('[startPrinting] instantPrint activé');
            postPrintBehavior = 'closePreview';
            // L'appel au DMP se fera manuellement après l'impression
            tabAndPrintHandler(sendAfterPrint, massPrint);
        }

        if (massPrint) {
            console.log('[startPrinting] massPrint activé');
            // On fait presque comme pour l'instanPrint, mais tabAndPrintHandler n'ouvre pas de nouvel onglet
            postPrintBehavior = 'closePreview';
            tabAndPrintHandler(sendAfterPrint, massPrint);
        }


        if (sendAfterPrint) {
            console.log('[startPrinting] sendAfterPrint activé');
            // Fermer la prévisualisation pour permettre l'envoi au DMP puis l'envoi du document
            postPrintBehavior = 'closePreview';
        }

        // 2. Processus d'impression principal
        // Sélectionner le modèle d'impression
        clickPrintModelNumber(modelNumber);

        // Préparer et exécuter l'impression
        const result = await printIframeWhenAvailable(
            "#ContentPlaceHolder1_ViewPdfDocumentUCForm1_iFrameViewFile",
            handlingType,
            whatToPrint,
            postPrintBehavior
        );

        // Arrêter si l'impression a échoué
        if (!result) { return; }

        // Exécuter l'action post-impression configurée
        postPrintAction(postPrintBehavior, whatToPrint);

        // 3. Gestion de l'envoi au DMP (si nécessaire)
        // Vérifier si l'envoi au DMP est requis et possible
        const DMPSendButton = document.querySelector('#ContentPlaceHolder1_DocVersionUserControl_PanelPrescriptionDmp span.mat-button-wrapper');
        const DMPCheckBox = document.querySelector('#ContentPlaceHolder1_DocVersionUserControl_PanelPrescriptionDmp #mat-checkbox-1-input');
        const DMPManuel = (instantPrint || sendAfterPrint) && DMPCheckBox && DMPCheckBox.checked && DMPSendButton;

        // Arrêter si l'envoi au DMP n'est pas applicable
        if (!DMPManuel) { return; }

        // Envoyer au DMP
        console.log('[startPrinting] Je dois envoyer manuellement au DMP', DMPSendButton);
        DMPSendButton.click();

        // 4. Gestion de l'envoi du document après DMP (si demandé)
        if (sendAfterPrint) {
            waitForDMPCompletion(() => {
                console.log('[startPrinting] Envoi du document au DMP terminé, je clique sur le bouton Envoyer');
                setTimeout(() => {
                    clickPrintModelNumber(modelNumber, true); // C'est Weda qui renvoie vers l'accueil après l'envoi
                }, 500);
            });
        }

    }
}

function waitForDMPCompletion(callback) {
    console.log('waitForDMPCompletion activé');
    waitForElement({
        selector: 'svg circle',
        justOnce: true,
        callback: function (circles) {
            let circle = circles[0];
            console.log('circle', circle);
            observeDiseapearance(circle, callback);
        }
    });
}


// **
// * Gestion de l'impression instantanée : Ouvre un nouvel onglet sur l'url de base dès l'impression.
// * Ensuite, une fois l'impression terminée avec succès, on ferme l'onglet originel via un window.close()
// * Le succès de l'impression est déterminé par la mise à jour de la clé 'lastPrintDate' dans le local storage.
// */

function watchForClose() {
    setTimeout(() => {
        sendWedaNotifAllTabs({
            message: "[Weda-Helper] l\'onglet initiateur de l\'impression instantanée n\'a pas pu être fermé automatiquement. Problème d'autorisation ou vous êtes sur l'onglet qui devrait se fermer.",
            type: 'undefined',
            icon: 'print'
        });
        console.warn("[watchForClose] l\'onglet initiateur de l\'impression instantanée n\'a pas pu être fermé automatiquement. Problème d'autorisation ou vous êtes sur l'onglet qui devrait se fermer.");
    }, 15000);
}


/**
 * Attend la fin de l'impression par l'application compagnon
 * Retourne une promesse qui se résout lorsque l'impression est terminée avec succès
 * ou qui est rejetée lorsque le délai est dépassé
 * 
 * @param {number} [delay=20000] - Délai maximum d'attente en ms avant d'abandonner
 * @returns {Promise<void>} - Promesse qui se résout à la fin de l'impression ou se rejette en cas d'échec
 */
function companionPrintDone(delay = 20000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const interval = setInterval(() => {
            const lastPrintDate = sessionStorage.getItem('lastPrintDate');

            if (lastPrintDate) {
                const printTime = Date.parse(lastPrintDate);
                if (Date.now() - printTime < 5000) {
                    clearInterval(interval);
                    sendWedaNotifAllTabs({
                        message: 'L\'impression Instantanée terminée avec succès.',
                        type: 'success',
                        icon: 'print',
                        duration: 2000
                    });
                    resolve();
                }
            }

            if (Date.now() - startTime > delay) {
                clearInterval(interval);
                sendWedaNotifAllTabs({
                    message: 'L\'impression Instantanée a échoué. Allez dans l\'onglet ayant lancé l\'impression pour vérifier.',
                    type: 'undefined',
                    icon: 'print'
                });
                reject(new Error('Délai d\'attente dépassé pour l\'impression'));
            }
        }, 100);
    });
}

function closeWindow() {
    console.log('closeWindow activé');
    // Si l'envoi au DMP est décoché, on ferme l'onglet directement
    if (!sendToDMPisSelected()) {
        console.log('[InstantPrint] envoi au DMP non sélectionné, je ferme la fenêtre');
        closeCurrentTab();
    }
    // Sinon on surveille que l'envoi au DMP soit terminé via la surveillance
    // de l'élément avec role="progressbar"
    waitForElement({
        selector: '[role="progressbar"]',
        justOnce: true,
        callback: function () {
            console.log('[InstantPrint] progress bar detected, attente de sa disparition');
            document.title = "Envoi DMP en cours";
            // Inhibition du lastPrintDate pour limiter les risques de fermeture d'un autre onglet
            sessionStorage.removeItem('lastPrintDate');
            let startTime = Date.now();
            let interval = setInterval(function () {
                let progressBarElement = document.querySelector('[role="progressbar"]');
                console.log('[InstantPrint] progressBarElement', progressBarElement);
                // Ajout d'une valeur dans la session de la date de dernière présence de la barre de progression
                if (progressBarElement) {
                    sessionStorage.setItem('lastProgressBarDate', new Date().toISOString());
                }
                // je suppose que dans certains cas, la progressBarElement persiste jusqu'au changement de page
                // et sa disparition ne permet pas de détecter la fin de l'impression.
                // Solution : ajouter une condition au chargement d'une nouvelle page dans la même session en
                // vérifiant la date de la dernière impression => cf. plus bas
                if (!progressBarElement) {
                    console.log('[InstantPrint] progress bar disparue, je ferme la fenêtre');
                    clearInterval(interval);
                    // window.close();
                    closeCurrentTab();
                    // Normalement la fenêtre est fermée. Mais si jamais elle ne l'est pas, on le signale
                    watchForClose();
                } else if (Date.now() - startTime > 40000) {
                    clearInterval(interval);
                    sendWedaNotifAllTabs({
                        message: '[Weda-Helper] Erreur DMP: La barre de progression n\'a pas disparu après 40 secondes. Merci de vérifier l\'onglet qui a initié l\'impression instantanée.',
                        type: 'fail',
                        icon: 'print'
                    });
                }
            }, 50);
        }
    });
}


function sendToDMPisSelected() {
    const selecteurCaseDMP = '#mat-checkbox-1-input';
    const caseDMP = document.querySelector(selecteurCaseDMP);
    return caseDMP && caseDMP.checked;
}

/**
 * Gère l'impression dans un nouvel onglet puis la fermeture de l'onglet original.
 * Cette fonction coordonne le processus d'impression instantanée.
 * 
 * @async
 * @param {boolean} [mustSend=false] - Indique si le document doit être envoyé après impression
 * @returns {Promise<void>} - Promesse résolue quand l'opération est terminée
 */
async function tabAndPrintHandler(mustSend = false, massPrint = false) {
    console.log('[tabAndPrintHandler] Démarrage du processus d\'impression instantanée');

    try {
        // 1. Ouverture d'un nouvel onglet sur le dossier patient
        if (!massPrint) {
            await newPatientTab();
        }
        document.title = "Impression démarrée";

        // 2. Attente de la confirmation d'impression par le Companion
        await companionPrintDone();
        document.title = "Impression terminée";

        // 3. Action post-impression selon le mode
        if (mustSend) {
            // Mode envoi : on maintient l'onglet ouvert et on signale l'impression
            document.title = "Envoi MSSanté en cours";
            await handleSendAfterPrintFlags();
        } else {
            // Mode impression simple : on ferme l'onglet original en attendant l'éventuelle complétion de l'envoi au DMP
            closeWindow();
        }

        console.log('[tabAndPrintHandler] Processus d\'impression instantanée terminé avec succès');
    } catch (error) {
        console.error('[tabAndPrintHandler] Erreur durant le processus d\'impression instantanée:', error);
        sendWedaNotifAllTabs({
            message: 'L\'impression instantanée a rencontré un problème.',
            type: 'fail',
            icon: 'print'
        });
    }
}

/**
 * Configure les drapeaux de signalisation pour le mode "envoi après impression"
 * 
 * @async
 * @returns {Promise<void>}
 */
async function handleSendAfterPrintFlags() {
    console.log('[handleSendAfterPrintFlags] Configuration des drapeaux d\'envoi');

    // On signale périodiquement que l'impression est réussie
    // pour que l'onglet patient puisse détecter l'événement
    const FLAG_REFRESH_INTERVAL = 100; // ms
    const MAX_WAIT_TIME = 10000; // 10 secondes

    return new Promise((resolve) => {
        const startTime = Date.now();
        const interval = setInterval(() => {
            // Arrêt après le délai maximum
            if (Date.now() - startTime > MAX_WAIT_TIME) {
                clearInterval(interval);
                console.log('[handleSendAfterPrintFlags] Fin du rafraîchissement des drapeaux');
                resolve();
                return;
            }

            // Rafraîchir le drapeau d'impression pour maintenir sa "fraîcheur"
            setLastPrintDate();

        }, FLAG_REFRESH_INTERVAL);
    });
}




// Rattrapage de la fermeture de l'onglet
// => Parfois la progressBar reste affichée après l'impression, ce qui empêche la fermeture de la fenêtre
// => On doit donc se rattraper après le chargement d'une nouvelle page dans la même session
addTweak('/FolderMedical/PatientViewForm.aspx', 'instantPrint', function () {
    const DELAY = 5000;
    console.log('[InstantPrint] debug démarré suite retour à dossier patient');
    // Vérifie si une impression ne vient pas de se finir en vérifiant lastProgressBarDate et lastPrintDate
    let lastPrintDate = sessionStorage.getItem('lastPrintDate');
    console.log('[InstantPrint] délais depuis la dernère impression', lastPrintDate ? Date.now() - Date.parse(lastPrintDate) : 'jamais');
    let lastProgressBarDate = sessionStorage.getItem('lastProgressBarDate');
    let currentTime = Date.now();
    let isRecentProgressBar = lastProgressBarDate && currentTime - Date.parse(lastProgressBarDate) < DELAY;
    let isRecentPrint = lastPrintDate && currentTime - Date.parse(lastPrintDate) < DELAY;
    console.log('[InstantPrint] debug : isRecentProgressBar', isRecentProgressBar, 'isRecentPrint', isRecentPrint);
    // Si la barre de progression a disparu il y a moins de 5 secondes
    if (isRecentProgressBar || isRecentPrint) {
        // console.log('[InstantPrint] impression récente détectée, je ferme la fenêtre');
        // sendWedaNotifAllTabs({
        //     message: 'Debug: impression récente détectée, je ferme la fenêtre',
        //     type: 'success',
        //     icon: 'bug_report'
        // });
        // Réinitialise les valeurs de session pour limiter le risque qu'un autre onglet ne soit induement fermé
        sessionStorage.removeItem('lastPrintDate');
        sessionStorage.removeItem('lastProgressBarDate');
        if (!document.hasFocus()) {
            closeCurrentTab();
        } else {
            console.log('[InstantPrint] window has focus, je ne ferme pas');
        }
    }
});



/** Impression de l'ensemble des documents du jour
 * passe forcément par les tabs
 */
const PRINTALLFUNCTION = '*printAll';

// Ajout d'un store pour les tâches associées aux onglets
const tabTaskStore = {
    tasks: {},

    // Associe une tâche à un onglet
    assignTask: function (tabId, task) {
        this.tasks[tabId] = task;
        // Stockage persistant dans localStorage
        localStorage.setItem('tabTasks', JSON.stringify(this.tasks));
        console.log(`Tâche assignée à l'onglet ${tabId}:`, task);
    },

    // Récupère la tâche associée à un onglet
    getTask: function (tabId) {
        // Synchroniser d'abord depuis localStorage
        this.loadFromStorage();
        return this.tasks[tabId] || null;
    },

    // Supprime la tâche d'un onglet
    removeTask: function (tabId) {
        if (this.tasks[tabId]) {
            delete this.tasks[tabId];
            localStorage.setItem('tabTasks', JSON.stringify(this.tasks));
            console.log(`Tâche supprimée pour l'onglet ${tabId}`);
        }
    },

    // Charge les tâches depuis le localStorage
    loadFromStorage: function () {
        const storedTasks = localStorage.getItem('tabTasks');
        console.log('storedTasks', storedTasks);
        if (storedTasks) {
            try {
                this.tasks = JSON.parse(storedTasks);
            } catch (e) {
                console.error('Erreur lors du chargement des tâches:', e);
                this.tasks = {};
            }
        }
        // Purge des tâches trop anciennes
        this.purgeOldTasks();
    },
    
    // Purge les tâches qui sont trop anciennes
    purgeOldTasks: function (maxAgeMs = 300000) { // Par défaut: 5 minutes
        const now = Date.now();
        let purgedCount = 0;
        
        // Parcourir toutes les tâches
        for (const tabId in this.tasks) {
            const task = this.tasks[tabId];
            // Vérifier si la tâche a un timestamp created et s'il est trop ancien
            if (task.created && (now - task.created > maxAgeMs)) {
                delete this.tasks[tabId];
                purgedCount++;
            }
        }
        
        // Si au moins une tâche a été purgée, mettre à jour le localStorage
        if (purgedCount > 0) {
            localStorage.setItem('tabTasks', JSON.stringify(this.tasks));
            console.log(`${purgedCount} tâches anciennes ont été purgées (> ${maxAgeMs/60000} minutes)`);
        }
        
        return purgedCount;
    }
};


// Ajout d'une icone d'imprimange pour lancer startPrintAll sans forcément passer par Ctrl+P
addTweak('/FolderMedical/PatientViewForm.aspx', PRINTALLFUNCTION, async function () {
    const elementTitreConsultation = document.querySelector('#ContentPlaceHolder1_DivScrollHistorique .sm');
    console.log('[PRINTALLFUNCTION] elementTitreConsultation', elementTitreConsultation);
    // on vérifie que la date (le innerText de son frère ainé) est bien d'aujourd'hui (son innerText est au format "dd/MM/yyyy")
    const dateElement = elementTitreConsultation.previousElementSibling;
    // Extraire la date selon le format français "dd/MM/yyyy"
    const dateStr = dateElement.innerText;
    const [day, month, year] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day); // Format JavaScript: année, mois (0-11), jour
    const today = new Date();
    // Comparer uniquement année/mois/jour sans les heures
    const isToday = date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate();

    if (isToday) {
        // On récupère le raccourcis pour l'impression
        const raccourcis = await getShortcuts(['print_meds']);
        const raccourcisImpression = raccourcis["print_meds"];
        console.log('[PRINTALLFUNCTION] raccourcisImpression', raccourcisImpression);

        // On crée un bouton d'impression simple à côté du titre
        const printButton = document.createElement('span');
        printButton.innerHTML = ' 🖨️ <small style="font-size:80%;color:#666">(Imprime tout les documents du jour)</small>';
        // Le curseur devient une main au survol
        printButton.style.cursor = 'pointer';
        printButton.title = "Weda-Helper - Imprimez tous les documents du jour en cliquant ici ou avec le raccourci : " + raccourcisImpression;

        // Ajout de l'événement de clic
        printButton.addEventListener('click', async () => {
            console.log('[PRINTALLFUNCTION] Impression de tous les documents du jour');
            await startPrintAll();
            console.log('[PRINTALLFUNCTION] Impression de tous les documents du jour terminée');
        });

        // Ajout directement après elementTitreConsultation
        elementTitreConsultation.appendChild(printButton);
    }
});


// 1 - On va d'abord se mettre en mode historique mixte, lister tous les éléments imprimables du jour,
//     et ouvrir un nouvel onglet pour chaque élément
async function startPrintAll() {
    // D'abord se mettre en mode historique mixte pour être sur de tout imprimer, dont les courriers
    await goToHistoriqueMixte();

    // Lister tout les éléments modifier du jour
    let elementsModifier = listAllTodaysDocs();
    console.log('elementsModifier', elementsModifier);

    // Lister les ids de ces éléments
    let ids = Array.from(elementsModifier).map(element => {
        return element.id;
    });
    console.log('ids', ids);

    // On va ouvrir un nouvel onglet pour chaque élément grace à newPatientTab
    let index = 0;
    async function openNextTab() {
        if (index < ids.length) {
            const id = ids[index];
            console.log(`Création d'un onglet pour le document ${id}, index ${index}`);

            try {
                // Création du nouvel onglet et récupération de ses informations
                const tabInfo = await newPatientTab(true);
                // Associer le document à imprimer à cet onglet
                tabTaskStore.assignTask(tabInfo.id, {
                    type: 'printDocument',
                    documentId: id,
                    created: Date.now(),
                    index: index
                });
                index++;
                await openNextTab();
            } catch (error) {
                console.error(`Erreur lors de la création de l'onglet pour ${id}:`, error);
            }
        } else {
            console.log('Tous les onglets ont été ouverts');
        }
    }
    await openNextTab();
}


// 2 - On va maintenant imprimer chaque élément un par un
addTweak('/FolderMedical/PatientViewForm.aspx', PRINTALLFUNCTION, function () {
    // Récupérer l'ID de l'onglet courant pour vérifier si une tâche lui est assignée
    handleTabsFeature({
        action: 'getCurrentTab',
        info: 'Récupération de l\'onglet courant pour impression multiple'
    }).then(async (tabInfo) => {
        if (!tabInfo || !tabInfo.id) {
            console.log('Impossible de déterminer l\'ID de l\'onglet courant');
            return;
        }

        const tabId = tabInfo.id;
        const task = tabTaskStore.getTask(tabId);
        console.log('Tâche d\'impression trouvée pour l\'onglet:', tabId, task);

        // Vérifier si cet onglet a une tâche d'impression assignée
        if (!task || task.type !== 'printDocument') {
            console.log('Aucune tâche d\'impression assignée à cet onglet', tabId);
            return;
        }

        console.log(`Tâche d'impression trouvée pour l'onglet ${tabId}:`, task);
        const documentId = task.documentId;

        // Marquer cette tâche comme en cours de traitement
        tabTaskStore.assignTask(tabId, {
            ...task,
            status: 'processing',
            processingStarted: Date.now()
        });

        // Ajouter un timestamp dans le sessionStorage pour indiquer que ce tab doit imprimer
        sessionStorage.setItem('thisTabMustBePrinted', Date.now().toString());

        // Rechercher l'élément à imprimer
        let toPrintElement = document.querySelector(`#${documentId}`);
        if (toPrintElement) {
            console.log(`Élément à imprimer trouvé (#${documentId}), clic en cours...`);
            toPrintElement.click();
        } else {
            // S'il manque l'id, on active l'historique mixte pour le trouver
            console.log(`Élément #${documentId} non trouvé, activation de l'historique mixte...`);

            try {
                // Utilisation de goToHistoriqueMixte au lieu d'un clic manuel
                await goToHistoriqueMixte();

                // Recherche à nouveau après l'activation de l'historique mixte
                toPrintElement = document.querySelector(`#${documentId}`);
                if (toPrintElement) {
                    console.log(`Élément trouvé après activation de l'historique mixte (#${documentId}), clic en cours...`);
                    toPrintElement.click();
                } else {
                    console.error(`Élément introuvable même après activation de l'historique mixte (#${documentId})`);
                    sessionStorage.removeItem('thisTabMustBePrinted');
                    tabTaskStore.assignTask(tabId, {
                        ...task,
                        status: 'failed',
                        error: 'Élément introuvable même après activation de l\'historique mixte'
                    });
                }
            } catch (error) {
                console.error(`Erreur lors de l'activation de l'historique mixte:`, error);
                sessionStorage.removeItem('thisTabMustBePrinted');
                tabTaskStore.assignTask(tabId, {
                    ...task,
                    status: 'failed',
                    error: 'Erreur lors de l\'activation de l\'historique mixte: ' + error.message
                });
            }
        }
    }).catch(error => {
        console.error('Erreur lors de la récupération de l\'ID de l\'onglet:', error);
        sessionStorage.removeItem('thisTabMustBePrinted');
    });
});

// 3 - On est maintenant dans un des éléments à imprimer => on le traite
addTweak(["/FolderMedical/CertificatForm.aspx", "/FolderMedical/DemandeForm.aspx", "/FolderMedical/PrescriptionForm.aspx", "/FolderMedical/CourrierForm.aspx"], PRINTALLFUNCTION, function () {
    // On est maintenant dans un des éléments à imprimer.
    // Vérifier si le contrôle thisTabMustBePrinted existe et est récent
    const printTimestamp = sessionStorage.getItem('thisTabMustBePrinted');

    if (printTimestamp && (Date.now() - parseInt(printTimestamp) < 20000)) {
        // La page doit être imprimée car elle a été ouverte par printAll il y a moins de 20 secondes
        console.log('Impression automatique via printAll détectée');
        // On ajoute un timeout pour laisser le temps à la page de se charger
        setTimeout(() => {
            handlePrint({ printType: 'print', modelNumber: 0, massPrint: true });
        }, 1000);
    }

    // Nettoyer le sessionStorage dans tous les cas
    sessionStorage.removeItem('thisTabMustBePrinted');
});




// On attends que l'historique mixte soit chargé en surveillant le texte du label
async function waitForUpdateProgressToHide() {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const maxWaitTime = 10000; // 10 secondes maximum d'attente

        function checkHistoryLabel() {
            // Vérifier si le temps d'attente maximum est dépassé
            if (Date.now() - startTime > maxWaitTime) {
                console.warn('Timeout: l\'historique mixte n\'a pas été chargé après 10 secondes');
                resolve(); // On continue malgré tout
                return;
            }

            // Récupérer le label qui indique l'état de l'historique
            const historyLabel = document.querySelector('#ContentPlaceHolder1_LabelCommandAffiche');

            // Si le label indique "Historique mixte", c'est que le chargement est terminé
            if (historyLabel && historyLabel.innerText === 'Historique mixte') {
                console.log('L\'historique mixte est chargé');
                resolve(); // On peut continuer
                return;
            }

            // L'historique n'est pas encore chargé, on vérifie à nouveau après un court délai
            setTimeout(checkHistoryLabel, 100);
        }

        // Démarrer la vérification
        checkHistoryLabel();
    });
}

function listAllTodaysDocs() {
    // On va d'abord chercher tous les conteneurs du jour
    let containers = document.querySelectorAll('td[title="Cliquez sur la date pour ouvrir."]')
    // Parmi eux, on cherche ceux contenant la date du jour en innerText au format jj/mm/aaaa
    let today = new Date();
    let todayString = today.toLocaleDateString('fr-FR');
    console.log('todayString', todayString);

    // Trouver tous les marqueurs de conteneur du jour
    let todayContainerMarkers = Array.from(containers).filter(container =>
        container.innerText.includes(todayString)
    );
    console.log('Nombre de conteneurs trouvés pour aujourd\'hui:', todayContainerMarkers.length);

    if (todayContainerMarkers.length === 0) {
        console.error('Aucun conteneur trouvé pour aujourd\'hui');
        return [];
    }

    // Récupérer tous les div.sc correspondants
    let todayContainers = todayContainerMarkers.map(marker =>
        marker.closest('div.sc')
    ).filter(container => container !== null);

    console.log('Conteneurs valides:', todayContainers.length);

    // Accumuler tous les éléments "Modifier" de tous les conteneurs
    let allElementsModifier = [];

    todayContainers.forEach((container, index) => {
        // Chercher les liens "Modifier" dans ce conteneur
        let links = container.querySelectorAll('div.soc');
        console.log(`Liens trouvés dans le conteneur ${index + 1}:`, links.length);

        let elementsModifier = Array.from(links).filter(link =>
            link.innerText.includes('Modifier')
        );

        // Filtrer les éléments selon les types de documents voulus
        const toInclude = ['Certificat', 'Demande', 'Prescription', 'Courrier'];
        elementsModifier = elementsModifier.filter(link => {
            let parent = link.parentElement;
            let brotherOfParent = parent.previousElementSibling;

            if (!brotherOfParent) {
                console.log('Élément sans frère précédent:', link);
                return false;
            }

            // Vérifier dans le texte du frère aîné
            let text = brotherOfParent.innerText || '';

            // Vérifier également dans les attributs des spans enfants
            let spans = brotherOfParent.querySelectorAll('span');
            let hasMatchingSpan = false;

            spans.forEach(span => {
                let className = span.className || '';
                let title = span.getAttribute('title') || '';

                toInclude.forEach(type => {
                    if (className.includes('img16' + type) || title.includes(type)) {
                        hasMatchingSpan = true;
                    }
                });
            });

            let include = toInclude.some(type => text.includes(type)) || hasMatchingSpan;
            return include;
        });

        console.log(`Éléments "Modifier" valides dans le conteneur ${index + 1}:`, elementsModifier.length);
        allElementsModifier = allElementsModifier.concat(elementsModifier);
    });

    console.log('Total des éléments "Modifier" trouvés:', allElementsModifier.length);
    return allElementsModifier;
}

async function goToHistoriqueMixte() {
    console.log('goToHistoriqueMixte activé');
    const mixtHistoryText = document.querySelector('#ContentPlaceHolder1_LabelCommandAffiche');
    if (mixtHistoryText.innerText !== 'Historique mixte') {
        const mixtHistoryButton = document.querySelector('#ContentPlaceHolder1_ButtonShowAllLastEvenement');
        if (mixtHistoryButton) { mixtHistoryButton.click(); }

        // Attendre que la progression soit cachée avec un timeout de 10 secondes
        await waitForUpdateProgressToHide();
    }
}