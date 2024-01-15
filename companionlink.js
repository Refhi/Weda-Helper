// // lien avec Weda-Helper-Companion
function sendToCompanion(urlCommand, blob = null) {
    chrome.storage.local.get(['portCompanion', 'apiKey'], function (result) {
        const portCompanion = result.portCompanion;
        const apiKey = result.apiKey;
        if (!portCompanion || !apiKey) {
            console.warn('portCompanion ou la clé API ne sont pas définis');
            return;
        }
        let versionToCheck = "1.2";
        let urlWithParam = `http://localhost:${portCompanion}/${urlCommand}` +
                  `?apiKey=${apiKey}` +
                  `&versioncheck=${versionToCheck}`;
        let fetchOptions = blob ? {
            method: 'POST',
            headers: {
                'Content-Type': 'application/pdf',
            },
            body: blob,
        } : {};

        let errortype = "[" + urlCommand + "]";

        fetch(urlWithParam, fetchOptions)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    console.warn(errortype + ' Error:', data.error);
                    alert(errortype + ' Erreur : ' + data.error);
                } else {
                    console.log(data);
                }
            })
            .catch(error => {
                console.warn(errortype + ' Impossible de joindre Weda-Helper-Companion : est-il bien paramétré et démarré ? Erreur:', error);
                alert(errortype + ' Impossible de joindre Weda-Helper-Companion : est-il bien paramétré et démarré ? Erreur: ' + error);
            });
    });
}

// envoi d'instruction au TPE via Weda-Helper-Companion
function sendtpeinstruction(amount) {
    // store the amount in chrome.storage.local
    chrome.storage.local.set({ 'lastTPEamount': amount }, function () {
        console.log('lastTPEamount', amount, 'sauvegardé avec succès');
    });
        
    chrome.storage.local.get(['RemoveLocalCompanionTPE'], function (result) {
        const removeLocalCompanionTPE = result.RemoveLocalCompanionTPE;

        if (removeLocalCompanionTPE !== false) {
            console.warn('RemoveLocalCompanionTPE ou portCompanion ou la clé API ne sont pas définis ou RemoveLocalCompanionTPE est !false (valeur actuelle :', removeLocalCompanionTPE, ')');
            return;
        } else if (!(/^\d+$/.test(amount))) {
            console.log('amount', amount, 'n\'est pas un nombre entier');
            return;
        }
        else {
            console.log('sendinstruction', amount + 'c€' + ' to TPE');
            sendToCompanion(`tpe/${amount}`);
            console.log('Instruction envoyée au TPE');
        }
    });
}

// envoi du dernier montant au TPE dans Weda-Helper-Companion
function sendLastTPEamount() {
    chrome.storage.local.get('lastTPEamount', function (result) {
        const lastTPEamount = result.lastTPEamount;
        console.log('Envoi du dernier montant demandé au TPE : ' + lastTPEamount + 'c€');
        if (lastTPEamount) {
            console.log('lastTPEamount', lastTPEamount);
            sendtpeinstruction(lastTPEamount);
        }
    });
}

// déclenchement de l'impression dans Weda-Helper-Companion
function sendPrint() {
    chrome.storage.local.get('RemoveLocalCompanionPrint', function (result) {
        const RemoveLocalCompanionPrint = result.RemoveLocalCompanionPrint;
        if (RemoveLocalCompanionPrint !== false) {
            console.log('RemoveLocalCompanionPrint est !false (valeur actuelle :', RemoveLocalCompanionPrint, ')');
            return;
        } else {
            console.log('send Print');
            function watchForFocusLoss() {
                function getFocus() {
                    console.log('[getFocus] je tente de récupérer le focus');
                    sendToCompanion(`focus`);
                }
                chrome.storage.local.get(['KeepFocus'], function(result) {
                    if (result.KeepFocus !== false) {
                        console.log('KeepFocus activé');
                        window.addEventListener('blur', getFocus);
                        document.addEventListener('visibilitychange', getFocus);

                        setTimeout(() => {
                            window.removeEventListener('blur', getFocus);
                            document.removeEventListener('visibilitychange', getFocus);
                        }, 2000); // 2 sec paraît le bon compromis
                    }
                });
            }

            

            // Obtenez l'élément iframe par son ID
            let iframe = document.getElementById('ContentPlaceHolder1_ViewPdfDocumentUCForm1_iFrameViewFile');
            console.log('iframe', iframe);

            // Obtenez l'URL du document dans l'iframe
            let intervalId = setInterval(() => {
                url = iframe.contentWindow.location.href;
                console.log('url', url);
            
                if (url !== 'about:blank') {
                    clearInterval(intervalId);
                    fetch(iframe.contentWindow.location.href)
                        .then(response => response.blob())
                        .then(blob => {
                            sendToCompanion(`print`, blob);
                            watchForFocusLoss();
                        })
                        .catch(error => console.error('Error:', error));

                }
            }, 100);
            
            setTimeout(() => {
                clearInterval(intervalId);
            }, 5000);
        }
    });
}