

// // Lien avec les notifications de Weda
// Exemple de load de notification
let notifToSend = {
    message: "Notification de test 2", // message displayed
    icon: "home", // mat icon used for the notification
    type: "success", // color (success / fail / undefined)
    extra: "{}", // extra data (json)
    duration: 5000 // duration of the notification
};

// On démarre le script d'écoute, qui doit tourner à part dans FWNotif.js
// Il écoutera les évènements pour afficher les notifications
function startNotifScript() {
    let script = document.createElement('script');
    script.src = chrome.runtime.getURL('FW_scripts/FWNotif.js?test=true');
    // console.log(script) // Error in event handler: TypeError: console.log(...) is not a function
    (document.head || document.documentElement).appendChild(script);
}

startNotifScript();


/**
 * Envoi simplifié d'une notification Weda.
 * Appelé via la fonction ou l'envoi d'un onMessage.
 * 
 * Il est en général préférable d'utiliser la fonction sendWedaNotif() qui est plus simple à utiliser.
 * 
 * @param {Object} options - Options de la notification.
 * @param {string} [options.message="Notification de test"] - Message affiché dans la notification.
 * @param {string} [options.icon="home"] - Icône utilisée pour la notification (mat icon).
 * @param {string} [options.type="success"] - Type de notification (success / fail / undefined). /!\ 'fail' entraîne une notification qui ne tient pas compte de 'duration'. C'est volontaire (confirmé par Weda le 28/11/24, pour faciliter les captures d'écran)
 * @param {string} [options.extra="{}"] - Données supplémentaires (JSON).
 * @param {number} [options.duration=5000] - Durée de la notification en millisecondes.
 */
function sendWedaNotif({
    message = "Notification de test",
    icon = "home",
    type = "success",
    extra = "{}",
    duration = 5000,
    action = null
} = {}) {
    // Vérifie si chaque option est vide et assigne la valeur par défaut si nécessaire
    message = message || "Notification de test";
    icon = icon || "home";
    type = type || "success";
    extra = extra || "{}";
    duration = duration || 5000;

    const notifToSend = {
        message: `[Weda-Helper] ${message}`,
        icon,
        type,
        extra,
        duration
    };

    console.log('Notification envoyée :', notifToSend);

    if (action) {
        confirmationPopup(action);
    }


    const event = new CustomEvent('showNotification', { detail: notifToSend });
    document.dispatchEvent(event);
    // Rendre la notification cliquable si elle contient une URL
    setTimeout(() => { addUrlLink(); }, 100);
}

/**
 * Affiche une popup de confirmation personnalisée et exécute l'action associée lorsque l'utilisateur clique sur "Oui"
 * @param {Object} action - L'action à exécuter {'requestPermission': 'permission_name'}
 */
function confirmationPopup(action) {
    // Vérifier si l'action est une demande de permission
    if (action.requestPermission) {
        const permission = action.requestPermission;

        // Créer les éléments de la popup
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        const popup = document.createElement('div');
        popup.style.cssText = `
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            max-width: 400px;
            width: 100%;
        `;

        // En-tête
        const title = document.createElement('h3');
        title.textContent = 'Autorisation requise';
        title.style.cssText = `
            margin-top: 0;
            color: #333;
            font-size: 18px;
        `;

        // Message
        const message = document.createElement('p');
        message.textContent = `Weda-Helper a besoin d'accéder aux onglets pour cette fonctionnalité. Voulez-vous autoriser ? Chrome vous demandera votre permission pour "Consulter l'historique de navigation". (Weda-Helper n'utilise cette permission que pour la gestion des onglets ne consulte pas l'historique). Vous pouvez révoquer cette autorisation à tout moment dans les paramètres de Chrome.`;
        message.style.cssText = `
            margin-bottom: 20px;
            color: #555;
        `;

        // Conteneur de boutons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        `;

        // Bouton Non
        const noButton = document.createElement('button');
        noButton.textContent = 'Non';
        noButton.style.cssText = `
            padding: 8px 16px;
            background-color: #f1f1f1;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            color: #333;
        `;

        // Bouton Oui
        const yesButton = document.createElement('button');
        yesButton.textContent = 'Oui';
        yesButton.style.cssText = `
            padding: 8px 16px;
            background-color: #4285f4;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            color: white;
        `;

        // Fonction pour fermer la popup
        const closePopup = () => {
            document.body.removeChild(overlay);
        };

        // Événements des boutons
        noButton.addEventListener('click', () => {
            closePopup();
            console.log(`Permission ${permission} refusée par l'utilisateur`);
        });

        yesButton.addEventListener('click', () => {
            // Exécuter l'action de demande de permission - C'est un vrai geste utilisateur ici
            closePopup();

            // Demande la permission spécifiée
            let granted = requestPermission(permission);
            if (granted) {
                // Permission accordée
                sendWedaNotifAllTabs({
                    message: "Accès accordé avec succès!",
                    icon: 'success',
                    duration: 5000
                });

                // Déclenche un événement pour informer le reste de l'application
                const permissionEvent = new CustomEvent('permissionGranted', {
                    detail: { permission: permission }
                });
                document.dispatchEvent(permissionEvent);
            } else {
                // Permission refusée par Chrome
                sendWedaNotifAllTabs({
                    message: `L'autorisation a été refusée. Certaines fonctionnalités ne seront pas disponibles.`,
                    icon: 'warning',
                    duration: 8000
                });
            }
        });

        // Assembler la popup
        buttonContainer.appendChild(noButton);
        buttonContainer.appendChild(yesButton);
        popup.appendChild(title);
        popup.appendChild(message);
        popup.appendChild(buttonContainer);
        overlay.appendChild(popup);

        // Ajouter au DOM
        document.body.appendChild(overlay);
    } else {
        console.warn('Action non reconnue dans confirmationPopup:', action);
    }
}

function addUrlLink() {
    let NotifPopupElement = document.querySelector('weda-notification-container p.ng-star-inserted');
    if (!NotifPopupElement) {
        console.warn('NotifPopupElement not found');
        return;
    }
    // Cherche dans le innerText une éventuelle URL
    console.log('Notification popup:', NotifPopupElement.innerText);
    let url = NotifPopupElement.innerText.match(/(https?:\/\/[^\s]+)/);
    if (url) {
        // Rend la popup cliquable
        NotifPopupElement.style.cursor = 'pointer';
        console.log('URL trouvée dans la notification :', url[0]);
        NotifPopupElement.addEventListener('click', () => {
            window.open(url[0], '_blank');
        });
    }
}



/**
 * Envoie une notification Weda à tous les onglets en utilisant le stockage local de Chrome.
 * Cette fonction stocke les options de notification avec un identifiant unique basé sur l'horodatage,
 * ce qui déclenche ensuite l'affichage de la notification dans tous les onglets grâce au listener
 * chrome.storage.onChanged.
 * 
 * @async
 * @function sendWedaNotifAllTabs
 * @param {Object} options - Les options de la notification à envoyer.
 * @param {string} [options.message="Notification de test"] - Le message à afficher dans la notification.
 * @param {string} [options.icon="home"] - L'icône Material Design à utiliser pour la notification.
 * @param {string} [options.type="success"] - Le type de notification ('success', 'fail', ou undefined pour neutre).
 * @param {string} [options.extra="{}"] - Données supplémentaires au format JSON.
 * @param {number} [options.duration=5000] - Durée d'affichage de la notification en millisecondes.
 * @param {Object} [options.action] - Action optionnelle à exécuter (ex: demande de permission).
 * 
 * @example
 * // Envoi d'une notification simple
 * const notifId = await sendWedaNotifAllTabs({
 *     message: "Opération réussie",
 *     type: "success",
 *     duration: 3000
 * });
 * 
 * @example
 * // Envoi d'une notification avec gestion d'erreur
 * try {
 *     await sendWedaNotifAllTabs({
 *         message: "Erreur lors du traitement",
 *         type: "fail",
 *         icon: "error"
 *     });
 * } catch (error) {
 *     console.error('Échec de l\'envoi de la notification:', error);
 * }
 * 
 * @see {@link sendWedaNotif} Pour envoyer une notification uniquement dans l'onglet actuel.
 */
async function sendWedaNotifAllTabs(options) {
    // Ajoute un identifiant unique basé sur l'horodatage actuel
    options.id = Date.now();
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({ 'wedaNotifOptions': options }, function () {
            if (chrome.runtime.lastError) {
                console.error('Erreur lors du stockage des options de notification :', chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
            } else {
                console.log('Options de notification stockées avec ID:', options.id);
                resolve(options.id);
            }
        });
    });
}

chrome.storage.onChanged.addListener(function (changes, namespace) {
    if (namespace === 'local' && changes.wedaNotifOptions) {
        const options = changes.wedaNotifOptions.newValue;
        sendWedaNotif(options);
    }
});


// // envoi une notif après 5 secondes
// setTimeout(() => {
//     sendWedaNotifAllTabs({
//         message: 'Notification de test custom2',
// //        icon: 'home',
//         type: 'fail',
// //        extra: '{}',
// //        duration: 5000
//     });
// }, 5000);