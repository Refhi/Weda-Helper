// Fonction permettant d'imprimer selon les options choisies
function printIfOption(modelNumber = 0) {
    getOption('RemoveLocalCompanionPrint', function (RemoveLocalCompanionPrint) {
        if (!RemoveLocalCompanionPrint) {
            startPrinting('companion', modelNumber);
        } else {
            startPrinting('print', modelNumber);
        }
    });
}

// Définition de la fonction startPrinting
function startPrinting(handlingType, modelNumber = null) {
    // TODO :
    // - sortir les sous-fonctions de startPrinting
    // - renommer en printkkchose
    console.log('startPrinting activé');
    let courbe = window.location.href.startsWith(
        'https://secure.weda.fr/FolderMedical/ConsultationForm.aspx'
    );
    let isFSE = window.location.href.startsWith('https://secure.weda.fr/vitalzen/fse.aspx');
    let whatToPrint = courbe ? 'courbe' : (isFSE ? 'fse' : modelNumber);
    processPrintSequence(handlingType, whatToPrint);

    function urlFromImage() { // à renommer, par exemple fetchPdfUrlFromImageData
        var pdfUrl = document.querySelector('img[data-pdf-url]');
        if (pdfUrl) {
            console.log('[urlFromImage] pdf Url détecté :', pdfUrl);
            let url = pdfUrl.getAttribute('data-pdf-url');
            return url;
        } else {
            console.log('[urlFromImage] pdfUrl non détecté');
            return null;
        }
    }

    function makeIframe() { // à renommer makeHiddenIframe
        // Crée un nouvel élément iframe pour l'impression
        let printFrame = document.createElement('iframe');
        printFrame.name = 'print_frame';
        printFrame.width = '0';
        printFrame.height = '0';
        printFrame.style.display = 'none';
        document.body.appendChild(printFrame);
        return printFrame;
    }

    async function downloadBlob(url) {
        console.log('fetchPDF', url);
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            return blob;
        } catch (error) {
            console.error('Error:', error);
        }
    }


    function loadAndPrintIframe(iframe, url) {
        // Définit une fonction à exécuter lorsque l'iframe est chargée
        iframe.onload = function () {
            let win = window.frames['print_frame'];
            win.focus();
            win.print();
        };

        // Vérifie l'origine de l'URL
        let urlObject = new URL(url);
        if (urlObject.origin === 'https://secure.weda.fr') {
            console.log('url origin ok', urlObject.origin);
            iframe.src = url;
        } else {
            // Log en cas d'URL non fiable
            console.error('Untrusted URL:', url);
        }
    }

    // déclenche le téléchargement direct d'une url
    function download(url) {
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

    function clickPrinterNumber(modelNumber = 0) { // TODO -> clickPrintModelNumber
        var elements = document.querySelectorAll('[onclick*="ctl00$ContentPlaceHolder1$MenuPrint"][class*="popout-dynamic level2"]');
        console.log('Voici les modeles d impression trouvés', elements);
        if (elements[modelNumber]) {
            console.log('clicking on model number', modelNumber, elements[modelNumber]);
            elements[modelNumber].click();
            return true;
        } else {
            return false;
        }
    }

    async function grabIframeWhenLoaded(selector) {
        return new Promise((resolve, reject) => {
            // Dans le cas d'une FSE, l'iframe est déjà présent dans le DOM car
            // on appelle cette fonction alors que l'iframe est déjà chargée
            if (isFSE) {
                let iframe = document.querySelector(selector);
                resolve(iframe);
                return;
            }


            waitForElement({
                selector: selector,
                justOnce: true,
                callback: (newElements) => {
                    // Assuming the first new element is the iframe we're interested in
                    let iframe = newElements[0];
                    resolve(iframe);
                },
            });

        });
    }

    function grabUrlFromIframe(iframe) {
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


    function postPrintAction() {
        console.log('postPrintAction activé');
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
        if (isFSE) {
            console.log('FSE detected, je tente de fermer la fenêtre');
            closeFSEPrintWindow();
        } else {
            let closebutton = {
                'doNothing': null,
                'closePreview': 'ContentPlaceHolder1_ViewPdfDocumentUCForm1_ButtonCloseStay',
                'returnToPatient': 'ContentPlaceHolder1_ViewPdfDocumentUCForm1_ButtonClose',
            }
            getOption('postPrintBehavior', function (postPrintBehavior) {
                console.log('postPrintBehavior is ', postPrintBehavior, 'id to look for ', closebutton[postPrintBehavior])
                let buttonToClick = document.getElementById(closebutton[postPrintBehavior]);
                if (buttonToClick) {
                    console.log('clicking on', buttonToClick)
                    buttonToClick.click();
                    recordMetrics({ clicks: 1, drags: 1 });
                }
            });
        }
    }


    // TODO : évaluer :
    // async function processPrintSequence(handlingType, modelNumber, courbe) {
    //     // vérification du type de demande
    //     const handlingTypes = ['print', 'download', 'companion'];
    //     if (!handlingTypes.includes(handlingType)) {
    //         console.error('[processPrintSequence] Type non reconnu :', handlingType);
    //         return;
    //     }

    //     recordMetrics({ clicks: 3, drags: 4 });

    //     // deux grands cas de figure : impression d'une courbe ou d'un document
    //     if (courbe) {
    //         let url = urlFromImage();
    //         if (!url) {
    //             console.log('[processPrintSequence] URL non trouvée');
    //             return;
    //         }
    //         if (handlingType === 'print') {
    //             let iframe = makeIframe();
    //             loadAndPrintIframe(iframe, url);
    //         } else if (handlingType === 'companion') {
    //             downloadBlob(url)
    //                 .then(blob => { sendToCompanion('print', blob); });
    //         } else if (handlingType === 'download') {
    //             download(url);
    //         }
    //     } else { // cas d'un document
    //         // il faut d'abord cliquer sur le modèle d'impression pertinent
    //         clickPrinterNumber(modelNumber);
    //         // ensuite attendre que l'iframe soit chargé
    //         iframe = await grabIframeWhenLoaded();
    //         // On se contente de lancer l'impression si on a demandé l'impression
    //         if (handlingType === 'print') {
    //             iframe.contentWindow.print();
    //             return;
    //         } 
    //         // sinon on récupère l'URL du document (ce qui prend parfois quelques centaines de ms)
    //         url = await grabUrlFromIframe(iframe);
    //         if (handlingType === 'companion') {
    //             const blob = await downloadBlob(url);
    //             sendToCompanion('print', blob, postPrintAction);
    //         } else if (handlingType === 'download') {
    //             download(url);
    //             postPrintAction();
    //         }
    //     }
    // }

    function processPrintSequence(handlingType, whatToPrint) {
        // vérification du type de demande
        const handlingTypes = ['print', 'download', 'companion'];
        if (!handlingTypes.includes(handlingType)) {
            console.error('[processPrintSequence] Type non reconnu :', handlingType);
            return;
        }

        recordMetrics({ clicks: 3, drags: 4 });

        // deux grands cas de figure : impression d'une courbe ou d'un document
        if (whatToPrint === 'courbe') {
            let url = urlFromImage();
            if (!url) {
                console.log('[processPrintSequence] URL non trouvée');
                return;
            }
            if (handlingType === 'print') {
                let iframe = makeIframe();
                loadAndPrintIframe(iframe, url);
            } else if (handlingType === 'companion') {
                downloadBlob(url)
                    .then(blob => { sendToCompanion('print', blob); });
            } else if (handlingType === 'download') {
                download(url);
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
                            printIframeWhenAvailable("iframe");
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


        } else {
            let modelNumber = whatToPrint // cas d'un document
            // il faut d'abord cliquer sur le modèle d'impression pertinent
            clickPrinterNumber(modelNumber);
            // ensuite attendre que l'iframe soit chargé
            printIframeWhenAvailable("#ContentPlaceHolder1_ViewPdfDocumentUCForm1_iFrameViewFile");
        }
    }

    function printIframeWhenAvailable(selector) {
        // TODO : plutôt passer par des await
        grabIframeWhenLoaded(selector)
            .then(iframe => {
                console.log('iframe trouvée :', iframe);
                // On se contente de lancer l'impression si on a demandé l'impression
                if (handlingType === 'print') {
                    iframe.contentWindow.print();
                    return;
                } else {
                    // sinon on récupère l'URL du document (ce qui prend parfois quelques centaines de ms)
                    return grabUrlFromIframe(iframe);
                }
            })
            .then(url => {
                if (handlingType === 'companion') {
                    downloadBlob(url)
                        .then(blob => {
                            sendToCompanion('print', blob,
                                postPrintAction);
                        });
                } else if (handlingType === 'download') {
                    download(url);
                    postPrintAction();
                }
            });
    }
}
