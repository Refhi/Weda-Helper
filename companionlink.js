// // lien avec Weda-Helper-Companion
// Cette partie s'occupe d'envoyer les instructions, quelles qu'elles soient à Weda-Helper-Companion.
// Donc le montant tpe et l'impression.
// TODO : évaluer la pertinence de buttonToClick
function sendToCompanion(urlCommand, blob = null, callback = null) {
    getOption(['portCompanion', 'apiKey'], function ([portCompanion, apiKey]) {
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
                    console.log('retour de Weda-Helper-Companion :', data);
                }
            })
            .catch(error => {
                console.warn(errortype + ' Impossible de joindre Weda-Helper-Companion : est-il bien paramétré et démarré ? Erreur:', error);
                if (!errortype.includes('[focus]')) {
                    alert(errortype + ' Impossible de joindre Weda-Helper-Companion : est-il bien paramétré et démarré ? Erreur: ' + error);
                }
            })
            .finally(() => {
                if (callback) {
                    callback();
                }
                console.log('Impression via companion terminée');
            });
    });
}

// envoi d'instruction au TPE via Weda-Helper-Companion
function sendtpeinstruction(amount) {
    // store the amount in chrome.storage.local
    chrome.storage.local.set({ 'lastTPEamount': amount }, function () {
        console.log('lastTPEamount', amount, 'sauvegardé avec succès');
    });
    
    // Ici c'est pas vraiment l'ajout d'un tweak, mais on l'utilise par simplicité
    addTweak('*', '!RemoveLocalCompanionTPE', function () {
        if (!(/^\d+$/.test(amount))) {
            console.log('amount', amount, 'n\'est pas un nombre entier');
            return;
        }
        else {
            console.log('sendinstruction', amount + 'c€' + ' to TPE');
            sendToCompanion(`tpe/${amount}`);
            console.log('Instruction envoyée au TPE');
            const keyStrokes = amount.toString().length;
            recordMetrics({ keyStrokes: keyStrokes });
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
            const keyStrokes = lastTPEamount.toString().length;
            recordMetrics({ keyStrokes: keyStrokes });
        }
    });
}

function fetchPDF(url, callback) {
    console.log('fetchPDF', url);
    fetch(url)
    .then(response => response.blob())
    .then(blob => {
        callback(blob);
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

function watchForFocusLoss() {
    function getFocus() {
        console.log('[getFocus] je tente de récupérer le focus');
        sendToCompanion(`focus`);
    }
    getOption('KeepFocus', function (KeepFocus) {
        if (KeepFocus) {
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

// déclenchement de l'impression dans Weda-Helper-Companion
function sendPrint(buttonToClick) {
    addTweak('*', '!RemoveLocalCompanionPrint', function () {
        console.log('send Print');

        // Obtenez l'élément iframe par son ID
        let iframe = document.getElementById('ContentPlaceHolder1_ViewPdfDocumentUCForm1_iFrameViewFile');
        console.log('iframe', iframe);

        // Obtenez l'URL du document dans l'iframe
        let intervalId = setInterval(() => {
            let url = iframe.contentWindow.location.href;
            console.log('url', url);
        
            if (url !== 'about:blank') {
                clearInterval(intervalId);
                recordMetrics({clicks: 3, drags: 4});
                fetchPDF(url, function(blob) {
                    sendToCompanion(`print`, blob, function() {
                        buttonToClick.click();
                        watchForFocusLoss();
                    });

                });
            }
        }, 100);
        
        setTimeout(() => {
            clearInterval(intervalId);
        }, 5000);
    });
}