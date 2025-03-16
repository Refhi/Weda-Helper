// // gestion des affichages en cas de mise à jour.
// // variables contenant le message à afficher en cas de premier lancement et de mise à jour
let currentVersion = chrome.runtime.getManifest().version;
function htmlMaker(text) {
    return text.replace(/\n/g, '<br>');
}

// Fonction simple pour convertir le Markdown en HTML
function simpleMarkdownToHtml(markdown) {
    // Échapper les caractères HTML
    let html = markdown
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Convertir les en-têtes
    html = html.replace(/^###### (.*?)$/gm, '<h6>$1</h6>');
    html = html.replace(/^##### (.*?)$/gm, '<h5>$1</h5>');
    html = html.replace(/^#### (.*?)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');

    // Convertir les listes
    html = html.replace(/^\* (.*?)$/gm, '<li>$1</li>');
    html = html.replace(/^- (.*?)$/gm, '<li>$1</li>');

    // Convertir les paragraphes (lignes vides)
    html = html.replace(/\n\n/g, '</p><p>');

    // Convertir les liens
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

    // Convertir le texte en gras
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Convertir le texte en italique
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Envelopper dans des balises <p>
    html = '<p>' + html + '</p>';

    // Gérer les listes
    html = html.replace(/<li>(.+?)<\/li>/g, function (match) {
        return '<ul>' + match + '</ul>';
    }).replace(/<\/ul><ul>/g, '');

    return html;
}


// Fonction pour extraire les nouveautés du CHANGELOG.md
function extractChangelogContent() {
    return fetch(chrome.runtime.getURL('CHANGELOG.md'))
        .then(response => response.text())
        .then(markdownText => {
            // Rechercher les titres de niveau 1 (# Titre)
            const h1Pattern = /^# .+$/gm;
            const h1Matches = [...markdownText.matchAll(h1Pattern)];
            console.log(h1Matches);
            
            // S'il y a moins de 3 titres de niveau 1, utiliser un message par défaut
            if (h1Matches.length < 3) {
                return `<h3>Version ${currentVersion}</h3><p>Consultez le changelog complet pour plus de détails.</p>`;
            }
            
            // Extraire les indices des 2e et 3e titres de niveau 1
            const secondH1Index = h1Matches[1].index;
            const thirdH1Index = h1Matches[2].index;
            
            // Extraire le contenu entre le 2e et le 3e titre de niveau 1
            const changelogSection = markdownText.substring(secondH1Index, thirdH1Index).trim();
            
            // Convertir le markdown en HTML
            return simpleMarkdownToHtml(changelogSection);
        })
        .catch(error => {
            console.error('Erreur lors de l\'extraction du changelog:', error);
            return `<h3>Version ${currentVersion}</h3><p>Consultez le changelog complet pour plus de détails.</p>`;
        });
}


// Initialiser les nouveautés avec un placeholder, qui sera remplacé plus tard
var nouveautes = `<h3>Chargement des nouveautés...</h3>`;



var firstStartMessage = `
<h1> 👋 Bienvenue sur Weda-Helper !</h1>

👌 Tout devrait fonctionner de base sans configuration, mais vous pouvez personnaliser l'extension dans les options (clic droit sur l'icone W de l'extension puis options).

📌 Je vous conseille de la mettre en favori en cliquant sur la punaise pour la garder visible.

🔧 Je vous encourage également à installer le Companion <a href="https://github.com/Refhi/Weda-Helper-Companion/releases/latest/download/Weda.Companion.exe" target="_blank">disponible ici pour windows</a> et <a href="https://github.com/Refhi/Weda-Helper-Companion/releases/latest/download/Weda.Companion.dmg" target="_blank">ou pour mac</a> pour profiter de fonctionnalités supplémentaires (Impression totale, lien avec le TPE et upload automatisé).

📝 Vous pouvez aussi relire <a href="https://github.com/Refhi/Weda-Helper/" target="_blank">Weda-Helper sur gitHub</a> pour plus de précisions, et y faire des suggestions ou des signalements de bugs. 

📄 Une fois dans Weda, vous pourrez afficher les raccourcis clavier en maintenant Alt (appuyez deux fois rapidement si vous êtes sous MAC).

💖 Et bien sûr m'encourager sur le <a href="https://communaute.weda.fr/t5/Entraide-Logiciel-Weda/Weda-Helper-et-Weda-Helper-Companion/m-p/2998" target="_blank">Site de la communauté de weda</a>

💰 Si vous le souhaitez vous pouvez également participer à mes frais de développement (écran, abonnement copilot, etc.) via <a href="https://fr.tipeee.com/weda-helper" target="_blank">Tipee</a>

Merci d'utiliser Weda-Helper !

Bon courage,

Le dev de Weda-Helper

P.S. 🔍 Pour aller plus loin n'oubliez pas de voir les fonction du <a href="https://github.com/Refhi/Weda-Helper-Companion/" target="_blank">Companion</a>`;
firstStartMessage = htmlMaker(firstStartMessage)


var updateMessageTemplate = `
<strong>👋 Bonjour !</strong><br><br>

<strong>✨ Weda-Helper vient d'être mis à jour en version ${currentVersion} !</strong><br><br>

<strong>🔧 Je vous conseille d'aller faire un tour dans les options pour vérifier les nouveaux paramètres : cliquez sur l'icone de l'extension puis sur ⚙️</strong><br><br>

<strong>🌟 Voici les nouveautés et les améliorations :</strong><br>
NOUVEAUTES_PLACEHOLDER<br><br>

📝 Les suggestions et les rapports de bug c'est toujours par là : 
<a href="https://github.com/Refhi/Weda-Helper/" target="_blank">Weda-Helper sur gitHub</a><br><br>

💖 Et les encouragements toujours par ici :-)  
<a href="https://communaute.weda.fr/t5/Entraide-Logiciel-Weda/Weda-Helper-et-Weda-Helper-Companion/m-p/2998" target="_blank">Site de la communauté de weda</a><br><br>

<span style="font-size: 3em;">💰</span> 
<strong>Si vous le souhaitez vous pouvez également participer à mes frais de développement (écran, abonnement copilot, etc.) via</strong> 
<a href="https://fr.tipeee.com/weda-helper" target="_blank">Tipeee</a> 
<strong></strong><br><br>

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
    // Charger d'abord le contenu du changelog
    extractChangelogContent().then(changelogContent => {
        // Mettre à jour la variable nouveautes avec le contenu extrait
        nouveautes = changelogContent;
        
        // Insérer les nouveautés dans le message de mise à jour
        var updateMessage = updateMessageTemplate.replace('NOUVEAUTES_PLACEHOLDER', nouveautes);
        
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
});
