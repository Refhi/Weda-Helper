/**
 * @file companionLink.js
 * @description Communication avec l'application Weda-Helper-Companion.
 * Gère l'envoi d'instructions au Companion (impression, paiement TPE),
 * la vérification de sa présence et la gestion de la clé API.
 * 
 * @exports generateApiKey - Génère une clé API aléatoire
 * @exports sendToCompanion - Envoie une commande au Companion
 * @exports sendtpeinstruction - Envoie un montant au TPE
 * @exports resendTPELastAmount - Renvoie le dernier montant TPE
 * @exports getFocus - Récupère le focus fenêtre
 * 
 * @requires storage.js (getOption)
 * @requires notifications.js (sendWedaNotif)
 */

// // lien avec Weda-Helper-Companion
// Cette partie s'occupe d'envoyer les instructions, quelles qu'elles soient, à Weda-Helper-Companion.
// Donc le montant tpe et l'impression.
// Vérifie également la présence du Companion et propose de l'activer si les options sont désactivées.

// Défini le numéro de version dans le storage local
chrome.storage.local.set({ 'version': '1.2' });

// Initialise la clé API
chrome.storage.local.get('apiKey', function (result) {
    console.log('Clé API récupérée :', result.apiKey);
    if (!result.apiKey) {
        console.log('Aucune clé API trouvée, génération d\'une nouvelle clé...');
        const apiKey = generateApiKey(32);
        chrome.storage.local.set({ 'apiKey': apiKey }, function () {
            console.log('Clé API générée et stockée :', apiKey);
        });
    }
    
    if (result.apiKey === "votre clé API par défaut") {
        const messageDejaEnvoye = localStorage.getItem('messageDejaEnvoye');
        if (!messageDejaEnvoye) {            
            // Envoi un message ok/annuler à l'utilisateur pour lui demander s'il veut générer une nouvelle clé
            const choixUtilisateur = confirm("[Weda Helper] : Vous utilisez la clé API par défaut. Cliquez sur ok pour générer une nouvelle clé (recommandé) ou annuler pour ignorer ce message. Si vous générez une nouvelle clé, pensez à la reporter dans le Companion. Ce message n'apparaîtra qu'une fois.");
            localStorage.setItem('messageDejaEnvoye', 'true');
            if (choixUtilisateur) {
                // Si l'utilisateur confirme, générer une nouvelle clé
                const newApiKey = generateApiKey(32);
                chrome.storage.local.set({ 'apiKey': newApiKey }, function () {
                    console.log('Nouvelle clé API générée et stockée :', newApiKey);
                    alert("Nouvelle clé API générée : " + newApiKey + ". Pensez à la reporter dans le Companion.");
                });
            } else {
                // Si l'utilisateur refuse, ne rien faire ou afficher un message
                console.log("L'utilisateur a choisi de ne pas générer de nouvelle clé API.");
            }
        }
    }
});

/**
 * Génère une clé API aléatoire composée de caractères alphanumériques.
 * Utilisée pour sécuriser la communication entre l'extension et le Companion.
 * 
 * @param {number} length - Longueur de la clé API à générer
 * @returns {string} - Clé API générée
 * 
 * @example
 * const apiKey = generateApiKey(32);
 * // Retourne une chaîne de 32 caractères aléatoires
 */
function generateApiKey(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let apiKey = '';
    for (let i = 0; i < length; i++) {
        apiKey += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return apiKey;
}

/**
 * Envoie une commande au Weda-Helper-Companion via HTTP.
 * Gère l'envoi d'instructions variées : impression, TPE, focus, etc.
 * 
 * @param {string} urlCommand - Commande à envoyer ('print', 'tpe/{amount}', 'focus', 'latestFile', etc.)
 * @param {Blob|null} [blob=null] - Blob à envoyer (pour l'impression de PDF)
 * @param {Function|null} [callback=null] - Fonction appelée après l'envoi (sans paramètre)
 * @param {Function|null} [callbackWithData=null] - Fonction appelée avec les données de réponse du Companion
 * @param {boolean} [testing=false] - Mode test pour vérifier la présence du Companion
 * 
 * @example
 * // Envoi d'un PDF à l'impression
 * sendToCompanion('print', pdfBlob, () => console.log('Envoyé'));
 * 
 * @example
 * // Test de présence du Companion
 * sendToCompanion('', null, (isPresent) => console.log(isPresent), null, true);
 */
function sendToCompanion(urlCommand, blob = null, callback = null, callbackWithData = null, testing = false) {
    let isSuccess = true;
    getOption(['portCompanion', 'apiKey', 'version'], function ([portCompanion, apiKey, version]) {
        let versionToCheck = version;
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
                    // alert(errortype + ' Erreur : ' + data.error);
                    sendWedaNotifAllTabs({
                        message: 'Erreur générique Companion : ' + error,
                        type: 'fail',
                        icon: 'bug_report'
                    })
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
                    // console.log('testing error', error);
                    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                        callback(false);
                        return;
                    } else {
                        callback(true);
                        return;
                    }
                }
                console.warn(errortype + ' Impossible de joindre Weda-Helper-Companion : est-il bien paramétré et démarré ? Erreur:', error, 'Problème de Firewall ?');
                if (!errortype.includes('[focus]') && !errortype.includes('tpe')) {
                    // alert(errortype + ' Impossible de joindre Weda-Helper-Companion : est-il bien paramétré et démarré ? Erreur: ' + error);
                    sendWedaNotifAllTabs({
                        message: 'Impossible de joindre Weda-Helper-Companion : est-il bien paramétré et démarré ? Erreur: ' + error + 'Problème de Firewall ?',
                        type: 'fail',
                        icon: 'bug_report'
                    })
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
                        setLastPrintDate(); // utilisé dans le cadre d'instantPrint et l'impression des AATI
                    }
                }
            });
    });
}

/**
 * Envoie un montant au Terminal de Paiement Électronique (TPE) via le Companion.
 * Le montant est exprimé en centimes d'euros et est sauvegardé pour réutilisation.
 * 
 * @param {number|string} amount - Montant en centimes d'euros à envoyer au TPE
 * 
 * @example
 * // Envoi de 25,50€ au TPE
 * sendtpeinstruction(2550);
 */
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

/**
 * Renvoie le dernier montant utilisé au TPE.
 * Si aucun montant n'a été enregistré, envoie 1€ par défaut pour test.
 * 
 * @example
 * sendLastTPEamount(); // Renvoie le dernier montant sauvegardé
 */
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


/**
 * Surveille la perte de focus de la fenêtre et tente de le récupérer automatiquement.
 * Utilisé après impression pour ramener l'utilisateur sur Weda.
 * L'écoute est active pendant 2 secondes après l'appel.
 * 
 * @example
 * watchForFocusLoss(); // Active la surveillance du focus pendant 2s
 */
function watchForFocusLoss() {
    /**
     * Récupère le focus de la fenêtre en envoyant une commande au Companion.
     * @inner
     */
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

/**
 * Vérifie la présence du Companion et propose d'activer les fonctionnalités si détecté.
 * Teste la connexion après 1 seconde et affiche un message si le Companion est présent
 * mais que les options de liaison sont désactivées.
 * 
 * @example
 * testCompanion(); // Lancé automatiquement au chargement du script
 */
function testCompanion() {
    /**
     * Demande à l'utilisateur s'il souhaite activer le lien avec le Companion.
     * Affiche une confirmation pour activer l'impression automatique.
     * @inner
     */
    function askLinkActivation() {
        chrome.storage.local.get('promptCompanionMessage', function (result) {
            if (result.promptCompanionMessage !== false) {
                // Demander à l'utilisateur s'il souhaite activer RemoveLocalCompanionPrint
                const choixUtilisateur = confirm("[Weda Helper] : Le Companion est bien détecté, mais les options de lien sont désactivées. Cliquez sur ok pour activer l'impression automatique ou allez dans les options de Weda Helper pour le TPE. Cliquez sur annuler pour ignorer définitivement ce message.");

                if (choixUtilisateur) {
                    // Si l'utilisateur confirme, activer RemoveLocalCompanionPrint
                    chrome.storage.local.set({ 'RemoveLocalCompanionPrint': false });
                    // alert("Le lien avec l'imprimate a été activé. Pensez à définir acrobat reader ou équivalent comme lecteur par défaut. Vous pouvez désactiver cette fonctionnalité dans les options de Weda Helper");
                    sendWedaNotifAllTabs({
                        message: "Le lien avec l'imprimante a été activé. Pensez à installer SumatraPDF ou à définir acrobat reader comme lecteur par défaut. Vous pouvez gérer cette fonctionnalité dans les options de Weda Helper",
                        type: 'success',
                        icon: 'print'
                    })
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