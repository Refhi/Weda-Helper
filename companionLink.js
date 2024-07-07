// // lien avec Weda-Helper-Companion
// Cette partie s'occupe d'envoyer les instructions, quelles qu'elles soient, à Weda-Helper-Companion.
// Donc le montant tpe et l'impression.
function sendToCompanion(urlCommand, blob = null, callback = null, callbackWithData = null, testing = false) {
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
                    if (callbackWithData) {
                        callbackWithData(data);
                    }
                    console.log('retour de Weda-Helper-Companion :', data);
                }
                if (testing) {
                    callback(true);
                    return;
                }
            })
            .catch(error => {
                if (testing) {
                    console.log('testing error', error);
                    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                        callback(false);
                        return;
                    } else {
                        callback(true);
                        return;
                    }
                }
                console.warn(errortype + ' Impossible de joindre Weda-Helper-Companion : est-il bien paramétré et démarré ? Erreur:', error);
                if (!errortype.includes('[focus]')) {
                    alert(errortype + ' Impossible de joindre Weda-Helper-Companion : est-il bien paramétré et démarré ? Erreur: ' + error);
                }
            })
            .finally(() => {
                if (!testing) {
                    if (urlCommand === 'print') {
                        watchForFocusLoss();
                    }
                    if (callback) {
                        callback();
                    }
                    console.log('Impression via companion terminée');
                }
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
        } else {
            console.log('Pas de montant précédent pour le TPE, j\'en envoie 1€ par défaut pour tester');
            sendtpeinstruction(100);
        }
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

