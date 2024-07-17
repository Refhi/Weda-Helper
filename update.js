// // gestion des affichages en cas de mise à jour.
// // variables contenant le message à afficher en cas de premier lancement et de mise à jour
let currentVersion = chrome.runtime.getManifest().version;
function htmlMaker(text) {
    return text.replace(/\n/g, '<br>');
}

var nouveautes = `
<ul>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/101">#101</a> - Ajout d'une cotation par défaut selon le mode de la FSE
    <ul>
      <li>vous pouvez désormais créer une cotation "DéfautALD" dans vos favoris et elle sera automatiquement sélectionnée lors de la création d'une FSE en mode ALD</li>
      <li>idem pour "DéfautPédia" qui sera automatiquement sélectionnée pour les enfants 0-6 ans</li>
    </ul>
  </li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/131">#131</a> - navigation entre champs de texte via Tab et Shift+Tab dans les pages de consultation. Focus possible à l'ouverture d'une consultation dans le champ de titre.</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/151">#151</a> - ajout de semelle et orthoplastie dans les mots-clés pour la classification "podologie" automatique</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/116">#116</a> - enregistre automatiquement le dernier type de document pour l'envoi au DMP pour les PDF classés comme courrier dans Weda</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/173">#173</a> - le bouton "TPE Bis" dans la popup de l'extension envoie 1€ si aucun règlement n'a été récemment demandé. Ce afin de faciliter les tests de liaison avec le Companion/TPE.</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/119">#119</a> - ajout d'un bouton pour imprimer directement les pdfs présents dans les "documents du cabinet medical"</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/123">#123</a> - mise à jour des textes explicatifs au sujet de la configuration du Companion.</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/179">#179</a> - décoche automatiquement la case "ordonnance numérique" si on fait une Demande d'Imagerie</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/137">#137</a> - valider automatiquement une ordonnance numérique</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/99">#99</a> - sélection automatique du type de document "FSE dégradée" lors de l'import d'une PJ SCOR</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/182">#182</a> - affichage d'un message d'alerte en cas de contre-indication médicamenteuse absolue</li>
</ul>
<h2>fix :</h2>
<ul>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/171">#171</a> - Correction d'un bug dans la fonction "Décocher automatiquement le message et le fichier IHE_XDM.zip lors de l'importation d'un message depuis la messagerie sécurisée" qui décochait le document joint dans certains cas</li>
  <li>Correction de l'option "Cocher automatiquement la case "Réaliser une FSE en gestion unique" pour les patients C2S" qui ne fonctionnait plus</li>
  <li>Amélioration du message de bienvenue et de mise à jour pour y ajouter un ascenseur et la possibilité de le fermer en cliquant à l'exérieur</li>
</ul>
`

nouveautes = htmlMaker(nouveautes)



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
<strong>👋 Bonjour !</strong>

<strong>✨ Weda-Helper vient d'être mis à jour en version ${currentVersion} !

🔧 Je vous conseille d'aller faire un tour dans les options pour vérifier les nouveaux paramètres : bouton de droite sur l'icone de l'extension puis option.

🚀 Si vous ne l'avez pas encore, n'hésitez pas à tester le Companion : <a href="https://github.com/Refhi/Weda-Helper-Companion/releases/latest/download/Weda.Companion.exe" target="_blank">disponible ici pour windows</a> et <a href="https://github.com/Refhi/Weda-Helper-Companion/releases/latest/download/Weda.Companion.dmg" target="_blank">ou pour mac</a> pour profiter de fonctionnalités supplémentaires (Impression totale, lien avec le TPE et upload automatisé).</strong>

<a href="https://github.com/Refhi/Weda-Helper/blob/main/FicheMemo.pdf" target="_blank">📄 et à télécharger la Fiche mémo</a> pour les raccourcis clavier.

<strong>🌟 Voici les nouveautés et les améliorations :</strong>
${nouveautes}


📝 Les suggestions et les rapports de bug c'est toujours par là : <a href="https://github.com/Refhi/Weda-Helper/" target="_blank">Weda-Helper sur gitHub</a>

💖 Et les encouragements toujours par ici :-)  <a href="https://communaute.weda.fr/t5/Entraide-Logiciel-Weda/Weda-Helper-et-Weda-Helper-Companion/m-p/2998" target="_blank">Site de la communauté de weda</a>

<span style="font-size: 3em;">💰</span> Si vous le souhaitez vous pouvez également participer à mes frais de développement (écran, abonnement copilot, etc.) via <a href="https://www.paypal.com/paypalme/refhi" target="_blank">Paypal</a> ("entre proches")

Bon courage,

Les devs de Weda-Helper
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