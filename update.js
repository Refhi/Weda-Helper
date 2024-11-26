// // gestion des affichages en cas de mise à jour.
// // variables contenant le message à afficher en cas de premier lancement et de mise à jour
let currentVersion = chrome.runtime.getManifest().version;
function htmlMaker(text) {
    return text.replace(/\n/g, '<br>');
}

var nouveautes = `
<h3>Version 2.8 - Impression instantanée</h3>
<h4>Ajouts :</h4>
<ul>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/262">#262</a> - Affichage des Antécédents dans un volet latéral - désactivé par défaut, à activer dans les options</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/267">#267</a> - Possibilité (cf. Options) de cocher "Non" automatiquement pour les ordonnances numériques</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/250">#250</a> - Cotation automatique : MOP ("DéfautMOP" à mettre dans les cotations favorites)</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/261">#261</a> - Ajout d'une pré-alerte dans les antécédents : si la date de l'alerte est dans moins de 6 mois (paramétrable), la date s'affiche en orange + gras au lieu de magenta.</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/268">#268</a> - Filtre automatiquement l'historique pour n'afficher que date et titre (désactivé par défaut)</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/263">#263</a> - Impression instantanée ! (ouvre un nouvel onglet au lancement de l'impression, qui se termine tranquillement dans l'onglet initial, avant d'être fermé après confirmation de l'impression). À utiliser conjointement avec le Companion.</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/269">#269</a> - Implémente une fonction pour le développeur de Weda-Helper pour envoyer des notifications via le système de notification de Weda</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/225">#225</a> - Sauvegarde automatique de la dernière sélection du choix d'AMC dans les FSE</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/281">#281</a> - Coche automatiquement "Présentation d'un feuillet AT" lors de la création d'une FSE si l'assurance "Accident du travail" est sélectionnée</li>
  <li>Sélectionne automatiquement "Rien" dans les Pièces justificatives AMO si "Champ de donnée Actes - Pièce Justificative AMO invalide : Erreur de saisie Nature" est détecté</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/282">#282</a> - Mettre la souris sur "Ordonnance numérique" dans les prescriptions affiche un choix Oui/Non pour sélectionner le "consentement à la consultation de l'ordonnance numérique".</li>
  <li><a href="https://github.com/Refhi/Weda-Helper-Companion/issues/29">#29</a> - Ajout d'un bouton pour archiver les fichiers envoyés via Ctrl+U</li>
</ul>

<h4>Fix :</h4>
<ul>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/265">#265</a> - Tentative de correction des problèmes de navigation par tabulation</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/276">#276</a> - Les raccourcis n'étaient plus modifiables dans les options</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/278">#278</a> - DéfautTC est désormais testé en priorité</li>
</ul>

<h4>Deprecated :</h4>
<ul>
  <li>uncheckSiImagerie est désormais obsolète, et a été supprimé, merci @Weda :)</li>
</ul>

<h3>Version 2.7.2 - Fix</h3>
<ul>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/260">#260</a> - Ajout d'une discrète bulle info grisée en bas à droite des boutons éligibles</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/264">#264</a> - Ouverture automatique de l'historique et retrait des éléments surnuméraires</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/246">#246</a> - Tentative de correction de l'impression des AM - ajout d'une lib pour la manipulation des PDF</li>
</ul>
`;

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