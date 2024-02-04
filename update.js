// // gestion des affichages en cas de mise à jour.
// // variables contenant le message à afficher en cas de premier lancement et de mise à jour
let currentVersion = chrome.runtime.getManifest().version;
function htmlMaker(text) {
    return text.replace(/\n/g, '<br>');
}

var nouveautes = `# Important : si vous voulez que la cotation par défaut se fasse toujours il vous faut créer un favori nommé "Défaut"

# ajouts :
- ajout du raccourcis ouvrant la page de recherche patient (amélioration au passage de la façon dont l'extension attend l'apparition du premier patient séléctionable)
- ajout du "à" et du "," dans l'écoute clavier du pavé de prescription numérique
- click automatique sur le bouton refresh dans la page de gestion des FSEs
- choix possible des pages où prescription numérique doit s'activer : Demande et/ou Prescription
- choix possible pour le comportement post-impression via le Companion : rien, fermer la prévisu, retourner au dossier patient

# correctifs :
- modification de la façon dont est géré la facturation par défaut. Il sélectionne désormais la facturation nommée "Défaut" dans les favoris. Il n'est plus nécessaire d'utiliser la touche de tabulation pour valider la cotation par défaut.
- tentative de fix sur les boutons rajoutés de téléconsultation et dégradé dans la FSE
- fix d'un bug dans le chargement du maintient de la recherche dans les prescriptions
- fix d'un problème dans la page des FSE où il n'était plus possible de taper une cotation avec N ou O sous peine de reselectionner la valeur par defaut
- fix des boutons "téléconsultation" et "dégradé" apparaissant après un échec de lecture de carte vitale
- fix du panneaux de favoris qui se fermait lors des prescriptions
- retrait du "-"=> " " de l'analyse du prénom du patient
- retrait du message d'erreur du Companion si c'est issu d'un problème de [focus]
- l'icone de copie du NIR/secu disparaissait lorsqu'on cliquait sur certains éléments
- fix : l'envoi vers le DMP était inhibé lors d'une impression automatisée complète via le Companion

# refactory :
- passage d'une bonne partie des fonctions d'attente vers lightObserver`

nouveautes = htmlMaker(nouveautes)



var firstStartMessage = `
Bienvenue sur Weda-Helper !

Pour commencer, vous devez configurer l'extension. Pour cela, cliquez sur l'icône puzzle en haut à droite de votre navigateur.

Je vous conseille de la mettre en favori en cliquant sur la punaise pour la garder visible.

Pour qu'elle fonctionne au mieux :
- allez dans les options (bouton de droite sur l'icone de l'extension puis option), vérfiez vos choix puis sauvegardez.
- définissez les raccourcis clavier dans chrome (idem mais cliquez sur gérer les extensions)

Vous pouvez aussi relire <a href="https://github.com/Refhi/Weda-Helper/" target="_blank">Weda-Helper sur gitHub</a> pour plus de précisions, et y faire des suggestions ou des signalements de bugs. 

Et bien sûr m'encourager sur le <a href="https://https://communaute.weda.fr/t5/Entraide-Logiciel-Weda/Weda-Helper-et-Weda-Helper-Companion/m-p/2998#M681" target="_blank">Site de la communauté de weda</a>

Merci d'utiliser Weda-Helper !

Bon courage,

Le dev de Weda-Helper

P.S. Pour aller plus loin n'oubliez pas de voir les fonction du <a href="https://github.com/Refhi/Weda-Helper-Companion/" target="_blank">Companion</a>`;
firstStartMessage = htmlMaker(firstStartMessage)


var updateMessage = `
Bonjour !

Weda-Helper vient d'être mis à jour en version ${currentVersion}.

Je vous conseille d'aller faire un tour dans les options pour vérifier les nouveaux paramètres. (bouton de droite sur l'icone de l'extension puis option))

Voici les nouveautés et les améliorations :
${nouveautes}


Les suggestions et les rapports de bug c'est toujours par là : <a href="https://github.com/Refhi/Weda-Helper/" target="_blank">Weda-Helper sur gitHub</a>

Et les encouragements toujours par ici :-)  <a href="https://https://communaute.weda.fr/t5/Entraide-Logiciel-Weda/Weda-Helper-et-Weda-Helper-Companion/m-p/2998#M681" target="_blank">Site de la communauté de weda</a>

Bon courage,

Le dev de Weda-Helper
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
        button.style.marginTop = '20px';
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