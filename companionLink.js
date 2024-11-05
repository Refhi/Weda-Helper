// // lien avec Weda-Helper-Companion
// Cette partie s'occupe d'envoyer les instructions, quelles qu'elles soient, à Weda-Helper-Companion.
// Donc le montant tpe et l'impression.
// Vérifie également la présence du Companion et propose de l'activer si les options sont désactivées.
function sendToCompanion(urlCommand, blob = null, callback = null, callbackWithData = null, testing = false) {
    let isSuccess = true;
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
                if (!errortype.includes('[focus]') && !errortype.includes('tpe')) {
                    alert(errortype + ' Impossible de joindre Weda-Helper-Companion : est-il bien paramétré et démarré ? Erreur: ' + error);
                }
                isSuccess = false;
            })
            .finally(() => {
                if (!testing) {
                    if (urlCommand === 'print') {
                        watchForFocusLoss();
                    }
                    if (callback) {
                        callback();
                    }

                    console.log('Impression réussie avec le companion = ', isSuccess);
                    if (isSuccess) {
                        
                        // Inscrire dans le stockage local la date de la dernière impression
                        const date = new Date();
                        chrome.storage.local.set({ 'lastPrintDate': date.toISOString() }, function () {
                            console.log('Dernière date d\'impression enregistrée :', date);
                        });
                    }
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

// // vérification de la présence du Companion
function testCompanion() {
    function askLinkActivation() {
        chrome.storage.local.get('promptCompanionMessage', function (result) {
            if (result.promptCompanionMessage !== false) {
                // Demander à l'utilisateur s'il souhaite activer RemoveLocalCompanionPrint
                const choixUtilisateur = confirm("[Weda Helper] : Le Companion est bien détecté, mais les options de lien sont désactivées. Cliquez sur ok pour activer l'impression automatique ou allez dans les options de Weda Helper pour le TPE. Cliquez sur annuler pour ignorer définitivement ce message.");

                if (choixUtilisateur) {
                    // Si l'utilisateur confirme, activer RemoveLocalCompanionPrint
                    chrome.storage.local.set({ 'RemoveLocalCompanionPrint': false });
                    alert("Le lien avec l'imprimate a été activé. Pensez à définir acrobat reader ou équivalent comme lecteur par défaut. Vous pouvez désactiver cette fonctionnalité dans les options de Weda Helper");
                } else {
                    // Si l'utilisateur refuse, ne rien faire ou afficher un message
                    console.log("L'utilisateur a choisi de ne pas activer RemoveLocalCompanionPrint.");
                    chrome.storage.local.set({ 'promptCompanionMessage': false });
                }
            } else {
                console.log("Le message de demande d'activation du lien avec le Companion a déjà été affiché.");
            }
        });
    }

    setTimeout(() =>
        sendToCompanion('', null, (isPresent) => {
            if (isPresent) {
                console.log('Companion présent');
                getOption(['RemoveLocalCompanionPrint', 'RemoveLocalCompanionTPE'], function ([RemoveLocalCompanionPrint, RemoveLocalCompanionTPE]) {
                    console.log('Remove Companion print =', RemoveLocalCompanionPrint)
                    console.log('Remove Companion TPE =', RemoveLocalCompanionTPE)
                    if (RemoveLocalCompanionPrint && RemoveLocalCompanionTPE) {
                        console.log('Companion présent, mais options désactivées');
                        // Afficher un message proposant d'activer le lien pour l'impression
                        askLinkActivation();
                    } else {
                        console.log('Companion présent, et au moins une option de lien activée');
                    }
                });
            } else {
                console.log('Companion non présent');
            }
        }, null, true)
        , 1000); // vérification de la présence du Companion après 1s
}
testCompanion();