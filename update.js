// // gestion des affichages en cas de mise à jour.
// // variables contenant le message à afficher en cas de premier lancement et de mise à jour
let currentVersion = chrome.runtime.getManifest().version;
function htmlMaker(text) {
    return text.replace(/\n/g, '<br>');
}

var nouveautes = `
<ul>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/162">#162</a> - Mettre tout les raccourcis claviers lors d'un appuis long de Alt</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/196">#196</a> - Accés direct au dossier patient depuis l'agenda via un clic droit</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/185">#185</a> - Alt+D insère la date du jour dans n'importe quel champ de texte</li>
  <li>oublié dans la documentation : DéfautTC existe ! (pour les téléconsultations) + sélection automatique du mode "Virement" pour les téléconsultations</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/217">#217</a> - DéfautALD est également utilisé pour les accidents du travail</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/144">#144</a> - memorisation des choix d'impression pour la FSE + ctrl+P imprime la FSE automatiquement (donc une FSE dégradée peut être validée via 'n/o' => 'n/o' => ctrl+P puis alt+V)</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/112">#112</a> - ajout d'options pour limiter le nombre d'atcd affichés en CIM 10 et de les trier par ordre alphabétique</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/184">#184</a> - ajout du calcul automatique du Z-score pour les courbes pédiatriques (vous devez créer un suivi nommé "Z-IMC" pour que cela fonctionne) => pour les courbes pédiatriques et le Z-score vous devez cliquer sur "Enregistrer" (Ctrl+S) pour que les valeurs du jour soient prises en compte.</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/212">#212</a> - la validation d'un règlement manuel envoie désormais une demande au TPE, et possibilité de saisir manuellement un montant à envoyer dans la popup (ce qui s'affiche quand on clique sur l'icone de Weda Helper).</li>
  <li>Cliquer sur "Basculer en mode prescription bi-zone" déplace aussi le texte présent dans le champ ALD</li>
</ul>
<h2>fix :</h2>
<ul>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/198">#198</a> - la cotation par défaut fonctionne automatiquement dès que le 2e choix o/n est fait, même à la souris</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/186">#186</a> - "n" et "o" dans les fse même quand assurance "maternité" est sélectionnée</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/208">#208</a> - Alt+W fonctionne depuis les pages d'accueil</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/209">#209</a> - défaultPédia fonctionne désormais pour les ages <1 an</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/190">#190</a> - accès facilité aux ATCD et aux notes patients depuis n'importe quelle liste de patients issus d'une recherche : Bouton de droite pour les notes, bouton du milieu pour les ATCD</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/211">#211</a> - La cotation DéfaultPédia se déclenchait pour ages < 7 ans au lieu de 6</li>
  <li><a href="https://github.com/Refhi/Weda-Helper/issues/207">#207</a> - le mode vertical ne casse plus certaines fonctions d'imports et raccourcis</li>
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