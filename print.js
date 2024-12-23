/**
 * Fonction d'entrée pour l'impression ou le téléchargement.
 * Les arguments dépendent du raccourci clavier utilisé :
 * - `ctrl+P` => Impression, si pertinent du modèle 0
 * - `ctrl+shift+P` => Impression, si pertinent du modèle 1
 * - `ctrl+D` => Téléchargement, si pertinent du modèle 0
 * - `ctrl+shift+D` => Téléchargement, si pertinent du modèle 1
 *
 * @param {string} printType - Le type d'action à effectuer, soit "print" pour impression, soit "download" pour téléchargement.
 * @param {number} [modelNumber=0] - Le numéro du modèle à utiliser, par défaut 0.
 *
 * @example
 * // Impression du modèle 0 (si pertinent)
 * handlePrint('print', 0);
 *
 * @example
 * // Téléchargement du modèle 1 (si pertinent)
 * handlePrint('download', 1);
 */
function handlePrint(printType, modelNumber = 0) {
    // D'abord récupération de l'ensemble des options pertinentes dans les options.
    getOption(['RemoveLocalCompanionPrint', 'postPrintBehavior', 'instantPrint'], function ([RemoveLocalCompanionPrint, postPrintBehavior, instantPrint]) {
        // De quel type d'"impression" s'agit-il ? (impression, téléchargement, companion)
        const handlingType = deduceHandlingType(printType, RemoveLocalCompanionPrint);
        // Qu'imprime-t-on ? (courbe, FSE ou modèle)
        const whatToPrint = deduceWhatToPrint();
        // Est-ce qu'instantPrint est activé ? (nécessite que RemoveLocalCompanionPrint soit false)
        instantPrint = instantPrint && !RemoveLocalCompanionPrint;
        // On lance le processus d'impression
        startPrinting(handlingType, whatToPrint, postPrintBehavior, modelNumber, instantPrint);
    });
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
            setTimeout(function() {
                var childElements = document.querySelectorAll('.level3');
                console.log('Voici les éléments enfants trouvés', childElements);
                var sendElement = Array.from(childElements).find(function(el) {
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
 * Démarre le processus d'impression ou de téléchargement en fonction des paramètres fournis.
 *
 * @param {string} handlingType - Le type de traitement à effectuer : 'print', 'download', 'companion'.
 * @param {string} whatToPrint - Le type de contenu à imprimer ou télécharger : 'courbe', 'fse', ou un numéro de modèle.
 * @param {string} postPrintBehavior - Le comportement à adopter après l'impression : 'doNothing', 'closePreview', 'returnToPatient'.
 * @param {number} modelNumber - Le numéro du modèle à utiliser, généralement 0 ou 1, parfois plus.
 */
async function startPrinting(handlingType, whatToPrint, postPrintBehavior, modelNumber, instantPrint) {
    console.log('startPrinting activé');
    // Check if the parameters are correct
    const handlingTypes = ['print', 'download', 'companion'];
    if (!handlingTypes.includes(handlingType)) {
        console.error('[startPrinting] Type non reconnu :', handlingType);
        return;
    }
    const whatToPrintTypes = ['courbe', 'fse', 'model'];
    if (!whatToPrintTypes.includes(whatToPrint)) {
        console.error('[startPrinting] Type non reconnu :', whatToPrint);
        return;
    }
    const postPrintBehaviors = ['doNothing', 'closePreview', 'returnToPatient'];
    if (!postPrintBehaviors.includes(postPrintBehavior)) {
        console.error('[startPrinting] Comportement non reconnu :', postPrintBehavior);
        return;
    }
    if (whatToPrint === 'model' && isNaN(modelNumber)) {
        console.error('[startPrinting] Numéro de modèle non valide :', modelNumber);
        return;
    }



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


    } else { // sinon, c'est un modèle d'impression        
        if (instantPrint) {
            postPrintBehavior = 'returnToPatient'; // On doit mettre 'returnToPatient' pour que l'envoi au DMP soit fait
            // Appel de tabAndPrintHandler pour ouvrir un nouvel onglet avec le patient en cours
            // gérer les notifications de succès ou d'échec
            // et fermer l'onglet actuel une fois l'impression terminée
            tabAndPrintHandler();
        }

        // il faut d'abord cliquer sur le modèle d'impression pertinent
        clickPrintModelNumber(modelNumber);
        // ensuite attendre que l'iframe soit chargé
        printIframeWhenAvailable("#ContentPlaceHolder1_ViewPdfDocumentUCForm1_iFrameViewFile", handlingType, whatToPrint, postPrintBehavior)
            .then((result) => {
                if (result) {
                    if (instantPrint) {
                        // Attendre que la FSE soit fermée pour fermer l'onglet
                        waitForNoFSE(function () {
                            postPrintAction(result.postPrintBehavior, whatToPrint);
                        });
                    } else {
                        postPrintAction(result.postPrintBehavior, result.whatToPrint);
                    }
                }
            });
    }
}


// **
// * Gestion de l'impression instantanée : Ouvre un nouvel onglet sur l'url de base dès l'impression.
// * Ensuite, une fois l'impression terminée avec succès, on ferme l'onglet originel via un window.close()
// * Le succès de l'impression est déterminé par la mise à jour de la clé 'lastPrintDate' dans le local storage.
// */

function watchForClose() {
    setTimeout(() => {
        sendWedaNotifAllTabs({
            message: '[Weda-Helper] l\'onglet initiateur de l\'impression instantanée n\'a pas pu être fermé automatiquement. Veuillez le fermer manuellement. Cela arrive si l\'onglet initiateur n\'a pas été ouvert par Weda Helper.',
            type: 'undefined',
            icon: 'print'
        });
    }, 15000);
}

function waitForNoFSE(callback) {
    const interval = setInterval(() => {
        // Vérifiez si la FSE est fermée
        chrome.storage.local.get('FSEActiveTimestamp', function(result) {
            let lastActiveTimestamp = result.FSEActiveTimestamp;
            let currentTime = Date.now();
            // Si le timestamp de la FSE n'a pas été mis à jour depuis plus de 5 secondes, considérez-la comme fermée
            let difference = currentTime - lastActiveTimestamp;
            if (difference > 2000) {
                console.log('[waitForNoFSE] FSE inactive, ok pour le callback');
                clearInterval(interval);
                callback();
                watchForClose();
            } else {
                console.log('[waitForNoFSE] FSE active, j\attends qu\'aucune FSE ne soit active avant de poursuivre');
            }
        });
    }, 1000); // Vérifiez toutes les secondes
}

function companionPrintDone(callback, delay = 20000) {
    let startTime = Date.now();
    let interval = setInterval(function () {
        let lastPrintDate = sessionStorage.getItem('lastPrintDate');
        // console.log('lastPrintDate', lastPrintDate);
        if (lastPrintDate) {
            let printTime = Date.parse(lastPrintDate);
            if (Date.now() - printTime < 5000) {
                clearInterval(interval);
                sendWedaNotifAllTabs({
                    message: 'L\'impression Instantanée terminée avec succès.',
                    type: 'success',
                    icon: 'print',
                    duration: 2000
                });
                callback();
            }
        }

        if (Date.now() - startTime > delay) {
            clearInterval(interval);
            sendWedaNotifAllTabs({
                message: 'L\'impression Instantanée a échoué. Allez dans l\'onglet ayant lancé l\'impression pour vérifier.',
                type: 'undefined',
                icon: 'print'
            });
        }
    }, 100);
}

function closeWindow() {
    // D'abord attendre l'apparition de l'élément avec role="progressbar"
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
                    window.close();
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

/**
 * Déclenche l'ouverure d'un nouvel onglet sur l'accueil du patient dans l'onglet actuel.
 * Fermé l'onglet initial une fois l'impression terminée.
 * Cette fonction ne doit être appelée que si l'instantPrint est True dans les options.
 * 
 * @async
 * @function tabAndPrintHandler
 */
async function tabAndPrintHandler() { 
    console.log('newTabPrintAndCloseOriginal activé');
    // Ouvre un nouvel onglet avec l'URL du dossier du patient actuel
    await newPatientTab();
    companionPrintDone(closeWindow);
}




// Rattrapage de la fermeture de l'onglet
// => Parfois la progressBar reste affichée après l'impression, ce qui empêche la fermeture de la fenêtre
// => On doit donc se rattraper après le chargement d'une nouvelle page dans la même session
addTweak('/FolderMedical/PatientViewForm.aspx', 'instantPrint', function () {
    console.log('[InstantPrint] debug démarré suite retour à dossier patient');
    // Vérifie si une impression ne vient pas de se finir en vérifiant lastProgressBarDate et lastPrintDate
    let lastPrintDate = sessionStorage.getItem('lastPrintDate');
    let lastProgressBarDate = sessionStorage.getItem('lastProgressBarDate');
    let currentTime = Date.now();
    let isRecentProgressBar = lastProgressBarDate && currentTime - Date.parse(lastProgressBarDate) < 5000;
    let isRecentPrint = lastPrintDate && currentTime - Date.parse(lastPrintDate) < 5000;
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
            window.close();
        } else {
            console.log('[InstantPrint] window has focus, je ne ferme pas');
        }
    }
});