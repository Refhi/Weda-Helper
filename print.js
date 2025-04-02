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

            // Types de prise en charge spécifiques // TODO à implémenter
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
    const { handlingType, whatToPrint, massPrint, sendAfterPrint, postPrintBehavior, modelNumber, instantPrint } = printConfig;
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
        if (instantPrint) {
            postPrintBehavior = 'closePreview'; 
            // L'appel au DMP se fera manuellement après l'impression
            tabAndPrintHandler(sendAfterPrint);
        }
    
        if (sendAfterPrint) {
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
                    clickPrintModelNumber(modelNumber, true);
                }, 500);
            });
        }

        // 5. Gestion de l'impression de masse :
        //       si massPrint est activé, on doit inhiber l'ouverture d'un nouvel onglet au lancement de l'impression,
        //       et fermer l'onglet en cours à la fin de l'impression
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
 * Déclenche l'ouverure d'un nouvel onglet sur l'accueil du patient dans l'onglet actuel.
 * Fermé l'onglet initial une fois l'impression terminée.
 * Cette fonction ne doit être appelée que si l'instantPrint est True dans les options.
 * 
 * @async
 * @function tabAndPrintHandler
 */
async function tabAndPrintHandler(mustSend = false) {
    console.log('newTabPrintAndCloseOriginal activé');
    // Ouvre un nouvel onglet avec l'URL du dossier du patient actuel
    await newPatientTab();
    await companionPrintDone();
    if (!mustSend) {
        closeWindow();
    } else {
        // L'onglet ne pourra être fermé que depuis l'accueil du dossier patient car Send ne laisse pas d'autre opportunité
        // On lance une boucle qui réinitialise lastPrintDate toutes les 100ms pendant 10 secondes
        // pour maximiser les chances que l'autre onglet détecte l'impression
        console.log('[tabAndPrintHandler] démarrage de la boucle de réinitialisation de lastPrintDate');
        const startTime = Date.now();
        const interval = setInterval(() => {
            if (Date.now() - startTime > 10000) {
                // Après 10 secondes, on arrête la boucle
                clearInterval(interval);
                console.log('[tabAndPrintHandler] fin de la boucle de réinitialisation de lastPrintDate');
                return;
            }

            console.log('[tabAndPrintHandler] réinitialisation de lastPrintDate');
            setLastPrintDate();
        }, 100);
    }
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
addTweak('/FolderMedical/PatientViewForm.aspx', PRINTALLFUNCTION, function () {
    // Là on considère qu'on travaille dans un nouvel onglet :
    // on parcours la liste d'ids présents dans le session storage.
    // on va cliquer sur l'élément modifier correspondant, et le supprimer
    // de la liste.

    let idsToPrint = JSON.parse(localStorage.getItem('printAllIds'));
    console.log('idsToPrint', idsToPrint);
    let idToPrint = idsToPrint[0];
    idsToPrint.shift(); // Supprimer l'id de la liste
    localStorage.setItem('printAllIds', JSON.stringify(idsToPrint));
    console.log('idToPrint', idToPrint);
    if (!idToPrint) {
        return; // On a tout imprimé
    }
    
    // Ajout d'un timestamp dans le sessionStorage pour indiquer que ce tab doit imprimer
    sessionStorage.setItem('thisTabMustBePrinted', Date.now().toString());
    
    idToPrint = document.querySelector(`#${idToPrint}`);
    if (idToPrint) {
        idToPrint.click();
        console.log('idToPrint clicked', idToPrint);
    } else {
        // S'il manque l'id, on est probablement sur un élements qui nécessite l'historique mixte pour s'afficher
        const mixtHistoryButton = document.querySelector('#ContentPlaceHolder1_ButtonShowAllLastEvenement');
        if (mixtHistoryButton) {
            mixtHistoryButton.click();
            console.log('mixtHistoryButton clicked', mixtHistoryButton);
            waitForElement({
                selector: `#${idToPrint}`,
                justOnce: true,
                callback: (newElements) => {
                    console.log('idToPrint clicked', newElements[0]);
                    newElements[0].click();
                }
            });
        } else {
            console.error('Aucun élément à imprimer trouvé');
            sessionStorage.removeItem('thisTabMustBePrinted'); // Nettoyer le storage si on ne trouve rien
            return;
        }
    }
});

addTweak(["/FolderMedical/CertificatForm.aspx", "/FolderMedical/DemandeForm.aspx", "/FolderMedical/PrescriptionForm.aspx", "/FolderMedical/CourrierForm.aspx"], PRINTALLFUNCTION, function () {
    // On est maintenant dans un des éléments à imprimer.
    // Vérifier si le contrôle thisTabMustBePrinted existe et est récent
    const printTimestamp = sessionStorage.getItem('thisTabMustBePrinted');
    
    if (printTimestamp && (Date.now() - parseInt(printTimestamp) < 20000)) {
        // La page doit être imprimée car elle a été ouverte par printAll il y a moins de 20 secondes
        console.log('Impression automatique via printAll détectée');
        handlePrint('print', 0);
    }
    
    // Nettoyer le sessionStorage dans tous les cas
    sessionStorage.removeItem('thisTabMustBePrinted');
});

function startPrintAll() {
    // Lister tout les éléments modifier du jour
    let elementsModifier = listAllTodaysDocs();
    console.log('elementsModifier', elementsModifier);

    // Stocker les ids de ces éléments dans le session storage
    let ids = Array.from(elementsModifier).map(element => {
        return element.id;
    });
    console.log('ids', ids);
    localStorage.setItem('printAllIds', JSON.stringify(ids));
    // On va ouvrir un nouvel onglet pour chaque élément grace à newPatientTab
    let index = 0;
    function openNextTab() {
        if (index < ids.length) {
            let id = ids[index];
            console.log('id', id);
            newPatientTab(id).then(() => {
                index++;
                openNextTab();
            });
        } else {
            console.log('Tous les onglets ont été ouverts');
        }
    }
    openNextTab();
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
        console.log(`Liens trouvés dans le conteneur ${index+1}:`, links.length);
        
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
        
        console.log(`Éléments "Modifier" valides dans le conteneur ${index+1}:`, elementsModifier.length);
        allElementsModifier = allElementsModifier.concat(elementsModifier);
    });
    
    console.log('Total des éléments "Modifier" trouvés:', allElementsModifier.length);
    return allElementsModifier;
}