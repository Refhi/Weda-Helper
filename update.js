// // gestion des affichages en cas de mise à jour.
// // variables contenant le message à afficher en cas de premier lancement et de mise à jour
let currentVersion = chrome.runtime.getManifest().version;
function htmlMaker(text) {
    return text.replace(/\n/g, '<br>');
}

var nouveautes = `
# [2.3] - 2024-05-28

<strong>🔍 Peu de modifications visibles pour vous</strong>, mais beaucoup de travail en coulisses pour améliorer la stabilité et la maintenabilité du code.
💡 Le plus gros changement est la refonte de la gestion des impressions et des téléchargements, qui devrait être plus fiable et plus rapide.
⚙️ Les raccourcis claviers sont désormais directement gérés dans les options ! Vous devrez donc les redéfinir si vous les aviez personnalisés.


## refactory :
✅ passage des options par défaut dans le manifest.json pour éviter les doublons
✅ creation et utilisation prioritaire de 'addTweak' qui simplifie l'ajout de fonctionnalités dans telle ou telle page en fonction de l'option liée. Pour faciliter la lecture du code et la maintenance on l'appelle après chaque ensemble de tableau urls/options/callbacks
✅ refactory complet de la gestion des impressions et des téléchargements
✅ Les raccourcis claviers sont désormais directement gérés dans les options ! Vous devrez donc les redéfinir si vous les aviez personnalisés.

## ajout :
🆕 on peut désormais uploader un document en un seul raccourcis clavier ! (par défaut Ctrl+U) Définissez le dossier dans le companion (v1.4+). Ctrl+U enverra automatiquement le dernier fichier créé. (nécessite le Companion v1.4+)
🆕 création d'une fiche-mémo <a href="https://github.com/Refhi/Weda-Helper/releases/latest/download/FicheMemo.pdf" target="_blank">disponible ici</a> pour vous aider à vous familiariser avec les raccourcis claviers et les fonctionnalités de Weda-Helper

# Companion v1.4.2 !
🆕 ajout de la possibilité de définir le dossier d'upload automatique
🆕 ajout d'une interface graphique
🆕 retrait de la console noire qui s'ouvrait à chaque lancement, remplacée par un "W" dans la barre des tâches
🆕 une version Mac !
=> par ici pour les détails et les téléchargements : <a href="https://github.com/Refhi/Weda-Helper-Companion" target="_blank">Weda-Helper Companion</a>
🆕 installation très grandement simplifiée (récupération clé API automatique, réglages par défaut immédiatements fonctionnels, etc.)

`

nouveautes = htmlMaker(nouveautes)



var firstStartMessage = `
<h1> 👋 Bienvenue sur Weda-Helper !</h1>

👌 Tout devrait fonctionner de base sans configuration, mais vous pouvez personnaliser l'extension dans les options (clic droit sur l'icone W de l'extension puis options).

📌 Je vous conseille de la mettre en favori en cliquant sur la punaise pour la garder visible.

🔧 Je vous encourage également à installer le Companion <a href="https://github.com/Refhi/Weda-Helper-Companion/releases/latest/download/Weda.Companion.exe" target="_blank">disponible ici pour windows</a> et <a href="https://github.com/Refhi/Weda-Helper-Companion/releases/latest/download/Weda.Companion.dmg" target="_blank">ou pour mac</a> pour profiter de fonctionnalités supplémentaires (Impression totale, lien avec le TPE et upload automatisé).

📝 Vous pouvez aussi relire <a href="https://github.com/Refhi/Weda-Helper/" target="_blank">Weda-Helper sur gitHub</a> pour plus de précisions, et y faire des suggestions ou des signalements de bugs. 

💖 Et bien sûr m'encourager sur le <a href="https://communaute.weda.fr/t5/Entraide-Logiciel-Weda/Weda-Helper-et-Weda-Helper-Companion/m-p/2998" target="_blank">Site de la communauté de weda</a>

💰 Si vous le souhaitez vous pouvez également participer à mes frais de développement (écran, abonnement copilot, etc.) via <a href="https://www.paypal.com/paypalme/refhi" target="_blank">Paypal</a> ("entre proches")

Merci d'utiliser Weda-Helper !

Bon courage,

Le dev de Weda-Helper

P.S. 🔍 Pour aller plus loin n'oubliez pas de voir les fonction du <a href="https://github.com/Refhi/Weda-Helper-Companion/" target="_blank">Companion</a>`;
firstStartMessage = htmlMaker(firstStartMessage)


var updateMessage = `
<strong>👋 Bonjour !</strong>

<strong>✨ Weda-Helper vient d'être mis à jour en version ${currentVersion} !

🔧 Je vous conseille d'aller faire un tour dans les options pour vérifier les nouveaux paramètres : bouton de droite sur l'icone de l'extension puis option.

🚀 Si vous ne l'avez pas encore, n'hésitez pas à tester le Companion : <a href="https://github.com/Refhi/Weda-Helper-Companion/releases/latest/download/Weda.Companion.exe" target="_blank">disponible ici pour windows</a> et <a href="https://github.com/Refhi/Weda-Helper-Companion/releases/latest/download/Weda.Companion.dmg" target="_blank">ou pour mac</a> pour profiter de fonctionnalités supplémentaires (Impression totale, lien avec le TPE et upload automatisé).</strong>

<strong>🌟 Voici les nouveautés et les améliorations :</strong>
${nouveautes}


📝 Les suggestions et les rapports de bug c'est toujours par là : <a href="https://github.com/Refhi/Weda-Helper/" target="_blank">Weda-Helper sur gitHub</a>

💖 Et les encouragements toujours par ici :-)  <a href="https://communaute.weda.fr/t5/Entraide-Logiciel-Weda/Weda-Helper-et-Weda-Helper-Companion/m-p/2998" target="_blank">Site de la communauté de weda</a>

<span style="font-size: 3em;">💰</span> Si vous le souhaitez vous pouvez également participer à mes frais de développement (écran, abonnement copilot, etc.) via <a href="https://www.paypal.com/paypalme/refhi" target="_blank">Paypal</a> ("entre proches")

Bon courage,

Les devs de Weda-Helper
`;

updateMessage = htmlMaker(updateMessage)

function showPopup(text) {
    function createOverlay() {
        let overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.top = 0;
        overlay.style.left = 0;
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        overlay.style.zIndex = 1000;
        return overlay;
    }

    function createBox() {
        let box = document.createElement('div');
        box.style.backgroundColor = 'white';
        box.style.padding = '20px';
        box.style.borderRadius = '10px';
        box.style.color = 'black';
        box.style.maxWidth = '80%';
        return box;
    }

    function createText(text) {
        let textElement = document.createElement('p');
        textElement.innerHTML = text;
        return textElement;
    }

    function createButton(overlay) {
        let button = document.createElement('button');
        button.textContent = 'J\'ai compris';
        button.style.backgroundColor = '#4CAF50';
        button.style.color = 'white';
        button.style.padding = '0.5em 1em';
        button.style.border = 'none';
        button.style.borderRadius = '4px';
        button.style.cursor = 'pointer';
        button.addEventListener('click', function() {
            document.body.removeChild(overlay);
        });
        return button;
    }


    let overlay = createOverlay();
    let box = createBox();
    let textElement = createText(text);
    let button = createButton(overlay);

    box.appendChild(textElement);
    box.appendChild(button);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
}


// Lancement du message en cas de premier lancement ou de mise à jour
chrome.storage.local.get(['lastExtensionVersion', 'firstStart'], function(result) {
    if (result.lastExtensionVersion !== currentVersion) {
        // If the last version is different from the current version, there was an update
        showPopup(updateMessage);
        chrome.storage.local.set({lastExtensionVersion: currentVersion});
    }
    
    if (!result.firstStart) {
        // If there's no last version, this is the first launch
        showPopup(firstStartMessage);
        // Set firstStart to true
        chrome.storage.local.set({firstStart: true});
    }
});