// // gestion des affichages en cas de mise à jour.
// // variables contenant le message à afficher en cas de premier lancement et de mise à jour
let currentVersion = chrome.runtime.getManifest().version;
function htmlMaker(text) {
    return text.replace(/\n/g, '<br>');
}

var nouveautes = `
<h3>Video de présentation de Weda-Helper 2.9 - Impression instantanée</h3>
<p>Les nouveautés en vidéo : <a href="https://youtu.be/OBx-QGw7K_c" target="_blank">Ouvrir dans un autre onglet pour regarder plus tard</a> ajoutez-la à votre liste de lecture YouTube : <a href="https://youtu.be/OBx-QGw7K_c&list=WL" target="_blank">Ajouter à ma liste de lecture</a></p>
<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; height: auto;">
    <iframe style="position: absolute; top: 0; left: 0; width: 80%; height: 80%;" src="https://www.youtube.com/embed/OBx-QGw7K_c" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

<h3>Ajouts :</h3>
<ul>
    <li><a href="https://github.com/Refhi/Weda-Helper/issues/275" target="_blank">#275</a> - Permet de sélectionner automatiquement le(s) médecin(s)traitant(s) comme destinataire(s) lors de l'envoi d'un courrier (désactivé par défaut)</li>
    <li><a href="https://github.com/Refhi/Weda-Helper/issues/274" target="_blank">#274</a> - Ajout de raccourcis pour l'envoi des courrrier : Ctrl+E et Ctrl+Shift+E par défaut</li>
    <li><a href="https://github.com/Refhi/Weda-Helper/issues/308" target="_blank">#308</a> - Ajout d'un lien vers le log du Companion dans la page des options</li>
    <li><a href="https://github.com/Refhi/Weda-Helper/issues/301" target="_blank">#301</a> - Un clic du milieu sur le W du Menu W ouvre un nouvel onglet vers l'accueil du dossier patient, et non le module en cours.</li>
    <li>Automatisation du contrôle du MT + ouvre un nouvel onglet pour ne pas avoir à patienter. Un message vous indique si cela a fonctionné ou non. Vous pourrez retourner dans le premier onglet si vous souhaitez enregistrer le MT.</li>
    <li>Automatisation partielle de la déclaration de MT : sélectionne automatiquement le patient en cours, pré-coche les cases de consentement. Vous n'avez plus qu'à cliquer sur "Transmettre" pour valider.</li>
    <li><a href="https://github.com/Refhi/Weda-Helper/issues/273" target="_blank">#273</a> - Automatisation de la récupération du MT et de sa mise à jour avec l'annuaire des professionnels de santé. (désactivé par défaut)</li>
    <li><a href="https://github.com/Refhi/Weda-Helper/issues/284" target="_blank">#284</a> - Possibilité d'inverser automatiquement le titre du corps du message et le titre du message lors de la réception d'un courrier (beta, merci de me faire part de vos retours)</li>
</ul>

<h3>Fix :</h3>
<ul>
    <li><a href="https://github.com/Refhi/Weda-Helper/issues/293" target="_blank">#293</a> - Clique automatiquement sur "Continuer sans l'ordonnance numérique" si le message d'erreur est détecté (désactivé par défaut).</li>
    <li><a href="https://github.com/Refhi/Weda-Helper/issues/309" target="_blank">#309</a> - Correction du plantage des FSE lors de l'impression instantanée lorsque le DMP est solllicité en même temps (fonctionne en inhibant l'envoi au DMP le temps de la réalisation de la FSE)</li>
    <li><a href="https://github.com/Refhi/Weda-Helper/issues/303" target="_blank">#303</a> - Correction d'un problème d'affichage des raccourcis claviers lors de l'appuis de Alt prolongé sous MAC. Sous MAC il faut désormais appuyer deux fois de suite sur Alt pour afficher les raccourcis claviers.</li>
    <li><a href="https://github.com/Refhi/Weda-Helper/issues/295" target="_blank">#295</a> - l'affichage automatique des atcd fonctionnent à nouveau</li>
    <li><a href="https://github.com/Refhi/Weda-Helper/issues/315" target="_blank">#315</a> - Amélioration des boutons FSE dégradée et Téléconsultation dans la FSE + ajout de raccourcis claviers</li>
    <li>rétablissement du rafrachissement automatique des messages Mssanté</li>
</ul>

<h3>Refactory :</h3>
<ul>
    <li><a href="https://github.com/Refhi/Weda-Helper/issues/325" target="_blank">#325</a> - Amélioration de la gestion des options</li>
</ul>
`;

nouveautes = htmlMaker(nouveautes);



var firstStartMessage = `
<h1> 👋 Bienvenue sur Weda-Helper !</h1>

👌 Tout devrait fonctionner de base sans configuration, mais vous pouvez personnaliser l'extension dans les options (clic droit sur l'icone W de l'extension puis options).

📌 Je vous conseille de la mettre en favori en cliquant sur la punaise pour la garder visible.

🔧 Je vous encourage également à installer le Companion <a href="https://github.com/Refhi/Weda-Helper-Companion/releases/latest/download/Weda.Companion.exe" target="_blank">disponible ici pour windows</a> et <a href="https://github.com/Refhi/Weda-Helper-Companion/releases/latest/download/Weda.Companion.dmg" target="_blank">ou pour mac</a> pour profiter de fonctionnalités supplémentaires (Impression totale, lien avec le TPE et upload automatisé).

📝 Vous pouvez aussi relire <a href="https://github.com/Refhi/Weda-Helper/" target="_blank">Weda-Helper sur gitHub</a> pour plus de précisions, et y faire des suggestions ou des signalements de bugs. 

📄 Une fois dans Weda, vous pourrez afficher les raccourcis clavier en maintenant Alt (appuyez deux fois rapidement si vous êtes sous MAC).

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

<strong>📄 Maintenez Alt pour afficher la fiche mémo  raccourcis clavier ! (Double appuis rapide sous MAC)</strong> <br><br>

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