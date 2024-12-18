// // gestion des affichages en cas de mise à jour.
// // variables contenant le message à afficher en cas de premier lancement et de mise à jour
let currentVersion = chrome.runtime.getManifest().version;
function htmlMaker(text) {
    return text.replace(/\n/g, '<br>');
}

var nouveautes = `
<h3>Video de présentation de Weda-Helper 2.8 - Impression instantanée</h3>
<p>Les nouveautés en vidéo : <a href="https://www.youtube.com/watch?v=wDDN18AbgUk" target="_blank">Ouvrir dans un autre onglet pour regarder plus tard</a> ajoutez-la à votre liste de lecture YouTube : <a href="https://www.youtube.com/watch?v=wDDN18AbgUk&list=WL" target="_blank">Ajouter à ma liste de lecture</a></p>
<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; height: auto;">
    <iframe style="position: absolute; top: 0; left: 0; width: 80%; height: 80%;" src="https://www.youtube.com/embed/wDDN18AbgUk" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>
`;

nouveautes = htmlMaker(nouveautes);



var firstStartMessage = `
<h1> 👋 Bienvenue sur Weda-Helper !</h1>

👌 Tout devrait fonctionner de base sans configuration, mais vous pouvez personnaliser l'extension dans les options (clic droit sur l'icone W de l'extension puis options).

📌 Je vous conseille de la mettre en favori en cliquant sur la punaise pour la garder visible.

🔧 Je vous encourage également à installer le Companion <a href="https://github.com/Refhi/Weda-Helper-Companion/releases/latest/download/Weda.Companion.exe" target="_blank">disponible ici pour windows</a> et <a href="https://github.com/Refhi/Weda-Helper-Companion/releases/latest/download/Weda.Companion.dmg" target="_blank">ou pour mac</a> pour profiter de fonctionnalités supplémentaires (Impression totale, lien avec le TPE et upload automatisé).

📝 Vous pouvez aussi relire <a href="https://github.com/Refhi/Weda-Helper/" target="_blank">Weda-Helper sur gitHub</a> pour plus de précisions, et y faire des suggestions ou des signalements de bugs. 

<a href="https://github.com/Refhi/Weda-Helper/blob/main/FicheMemo.pdf" target="_blank">📄 Fiche mémo</a> pour les raccourcis clavier.

💖 Et bien sûr m'encourager sur le <a href="https://communaute.weda.fr/t5/Entraide-Logiciel-Weda/Weda-Helper-et-Weda-Helper-Companion/m-p/2998" target="_blank">Site de la communauté de weda</a>

💰 Si vous le souhaitez vous pouvez également participer à mes frais de développement (écran, abonnement copilot, etc.) via <a href="https://www.paypal.com/paypalme/refhi" target="_blank">Paypal</a> ("entre proches")

Merci d'utiliser Weda-Helper !

Bon courage,

Le dev de Weda-Helper

P.S. 🔍 Pour aller plus loin n'oubliez pas de voir les fonction du <a href="https://github.com/Refhi/Weda-Helper-Companion/" target="_blank">Companion</a>`;
firstStartMessage = htmlMaker(firstStartMessage)


var updateMessage = `
<strong>👋 Bonjour !</strong><br><br>

<strong>✨ Weda-Helper vient d'être mis à jour en version ${currentVersion} !</strong><br><br>

<strong>🔧 Je vous conseille d'aller faire un tour dans les options pour vérifier les nouveaux paramètres : bouton de droite sur l'icone de l'extension puis option.</strong><br><br>

<strong>🚀 Si vous ne l'avez pas encore, n'hésitez pas à tester le Companion :</strong> 
<a href="https://github.com/Refhi/Weda-Helper-Companion/releases/latest/download/Weda.Companion.exe" target="_blank">disponible ici pour windows</a> 
<strong>et</strong> 
<a href="https://github.com/Refhi/Weda-Helper-Companion/releases/latest/download/Weda.Companion.dmg" target="_blank">ou pour mac</a> 
<strong>pour profiter de fonctionnalités supplémentaires (Impression totale, lien avec le TPE et upload automatisé).</strong><br><br>

<strong>📄 Vous pouvez maintenir Alt pour afficher la fiche mémo !</strong> <br><br>

<strong>🌟 Voici les nouveautés et les améliorations :</strong><br>
${nouveautes}<br><br>

📝 Les suggestions et les rapports de bug c'est toujours par là : 
<a href="https://github.com/Refhi/Weda-Helper/" target="_blank">Weda-Helper sur gitHub</a><br><br>

💖 Et les encouragements toujours par ici :-)  
<a href="https://communaute.weda.fr/t5/Entraide-Logiciel-Weda/Weda-Helper-et-Weda-Helper-Companion/m-p/2998" target="_blank">Site de la communauté de weda</a><br><br>

<span style="font-size: 3em;">💰</span> 
<strong>Si vous le souhaitez vous pouvez également participer à mes frais de développement (écran, abonnement copilot, etc.) via</strong> 
<a href="https://www.paypal.com/paypalme/refhi" target="_blank">Paypal</a> 
<strong>("entre proches")</strong><br><br>

<strong>Bon courage,</strong><br><br>

<strong>Les devs de Weda-Helper</strong>
`;

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
        // Ajout d'un écouteur d'événements pour fermer l'overlay si l'utilisateur clique en dehors de la boîte
        overlay.addEventListener('click', function (event) {
            if (event.target === overlay) {
                document.body.removeChild(overlay);
            }
        });
        return overlay;
    }

    function createBox() {
        let box = document.createElement('div');
        box.style.backgroundColor = 'white';
        box.style.padding = '20px';
        box.style.borderRadius = '10px';
        box.style.color = 'black';
        box.style.maxWidth = '80%';
        box.style.maxHeight = '80%';
        box.style.display = 'flex';
        box.style.flexDirection = 'column';
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
        button.addEventListener('click', function () {
            document.body.removeChild(overlay);
        });
        return button;
    }

    function createTextContainer() {
        let textContainer = document.createElement('div');
        textContainer.style.overflowY = 'auto';
        textContainer.style.marginBottom = '20px';
        textContainer.style.flexGrow = 1;
        return textContainer;
    }

    let overlay = createOverlay();
    let box = createBox();
    let textElement = createText(text);
    let button = createButton(overlay);
    let textContainer = createTextContainer();

    textContainer.appendChild(textElement); // Ajoutez le texte au conteneur de texte
    textContainer.appendChild(button); // Ajoutez le bouton à la fin du conteneur de texte
    box.appendChild(textContainer); // Ajoutez le conteneur de texte à la boîte
    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

// Lancement du message en cas de premier lancement ou de mise à jour
chrome.storage.local.get(['lastExtensionVersion', 'firstStart'], function (result) {
    if (result.lastExtensionVersion !== currentVersion) {
        // If the last version is different from the current version, there was an update
        showPopup(updateMessage);
        chrome.storage.local.set({ lastExtensionVersion: currentVersion });
    }

    if (!result.firstStart) {
        // If there's no last version, this is the first launch
        showPopup(firstStartMessage);
        // Set firstStart to true
        chrome.storage.local.set({ firstStart: true });
    }
});