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
    html = html.replace(/^## (.*?)$/gm, '<h3>$1</h3>'); // on met max h3 pour éviter les gros titre
    html = html.replace(/^# (.*?)$/gm, '<h3>$1</h3>');

    // Convertir les images AVANT les liens (important pour éviter les conflits)
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, function (match, alt, src) {
        // Convertir le chemin relatif en URL d'extension
        let extensionUrl;
        if (src.startsWith('./')) {
            // Enlever le './' du début et convertir les espaces encodés
            let cleanPath = src.substring(2).replace(/%20/g, ' ');
            extensionUrl = chrome.runtime.getURL(cleanPath);
        } else {
            extensionUrl = src;
        }
        return `<img src="${extensionUrl}" alt="${alt}" style="max-width: 100%; height: auto; border: 1px solid #ccc; border-radius: 5px; margin: 10px 0;">`;
    });

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
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
    <!-- Section 1: Titre et bannière principale -->
    <div style="text-align: center; background-color: #e3f2fd; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
        <h2 style="color: #1565c0;"><strong>👋 Bienvenue sur Weda-Helper !</strong></h2>
        <p style="color: #555;">Votre assistant pour améliorer votre expérience avec Weda</p>
    </div>

    <!-- Section 2: Installation et épinglage -->
    <div style="background-color: #e8f5e9; padding: 15px; border-radius: 10px; margin-bottom: 15px; display: flex; align-items: center;">
        <div style="flex-grow: 1;">
            <h3 style="margin-top: 0; margin-bottom: 8px; color: #2e7d32;"><strong>📌 Pour bien démarrer</strong></h3>
            <p style="color: #555; margin: 0 0 8px 0;">Pour une utilisation optimale de Weda-Helper :</p>
            <ul style="color: #555; margin: 0; padding-left: 25px;">
                <li>Épinglez l'extension en cliquant sur la punaise dans la barre d'extensions</li>
                <li>Maintenez la touche <strong>Alt</strong> enfoncée dans Weda pour voir les raccourcis clavier (double appuis sous MAC)</li>
                <li>Explorez les options en cliquant sur l'icône de l'extension puis sur ⚙️</li>
                <li>Appuyez sur ℹ️ pour accéder au manuel</li>
            </ul>
        </div>
        <div style="margin-left: 15px; flex-shrink: 0;">
            <img src="${chrome.runtime.getURL('Images/tutoPinExtension.png')}" alt="Comment épingler l'extension" style="max-width: 120px; height: auto; border: 1px solid #ccc; border-radius: 5px;">
        </div>
    </div>
    <!-- Section 3: Weda Companion -->
    <div style="background-color: #e0f2f1; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #00796b;"><strong>🔧 Weda-Helper Companion</strong></h3>
        <p style="color: #555;">Je vous encourage à installer le Companion pour profiter de fonctionnalités supplémentaires :</p>
        <ul style="color: #555; margin-bottom: 15px;">
            <li>Impression totale des documents</li>
            <li>Lien avec le TPE</li>
            <li>Upload automatisé de fichiers</li>
        </ul>
        <div style="display: flex; gap: 15px; margin-top: 10px;">
            <a href="https://github.com/Refhi/Weda-Helper-Companion/releases/latest/download/Weda.Companion.exe" target="_blank" style="display: inline-block; padding: 8px 15px; background-color: #00796b; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">💻 Télécharger pour Windows</a>
            <a href="https://github.com/Refhi/Weda-Helper-Companion/releases/latest/download/Weda.Companion.dmg" target="_blank" style="display: inline-block; padding: 8px 15px; background-color: #00796b; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">🍎 Télécharger pour Mac</a>
        </div>
    </div>

    <!-- Section 4: Trucs et astuces -->
    <div style="background-color: #fff8e1; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #ff8f00;"><strong>💡 Astuces</strong></h3>
        <ul style="color: #555;">
            <li>Une fois dans Weda, affichez les raccourcis clavier en maintenant <strong>Alt</strong> (appuyez deux fois rapidement sous Mac)</li>
            <li>Consultez les options de l'extension pour personnaliser votre expérience</li>
            <li>Explorez le <a href="https://github.com/Refhi/Weda-Helper-Companion/" target="_blank" style="color: #ff8f00; text-decoration: underline;">Companion</a> pour des fonctionnalités avancées</li>
        </ul>
    </div>

    <!-- Section 5: Support et communauté -->
    <div style="background-color: #fbe9e7; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #d84315;"><strong>💬 Support et communauté</strong></h3>
        <p style="color: #555;">Vous avez des questions ou des suggestions ?</p>
        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">
            <a href="https://github.com/Refhi/Weda-Helper/" target="_blank" style="display: inline-flex; align-items: center; padding: 8px 15px; background-color: #f5f5f5; color: #333; text-decoration: none; border-radius: 5px; border: 1px solid #ddd;">
                <span style="margin-right: 5px;">📝</span> Documentation GitHub
            </a>
            <a href="https://github.com/Refhi/Weda-Helper/discussions" target="_blank" style="display: inline-flex; align-items: center; padding: 8px 15px; background-color: #f5f5f5; color: #333; text-decoration: none; border-radius: 5px; border: 1px solid #ddd;">
                <span style="margin-right: 5px;">💖</span> Communauté Weda
            </a>
        </div>
    </div>
    
    <!-- Section 6: Tipeee (Nouvelle section séparée) -->
    <div style="display: flex; align-items: center; background-color: #fff9e6; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
        <span style="font-size: 2.5em; margin-right: 20px;">💰</span> 
        <div style="flex-grow: 1;">
            <strong style="font-size: 1.1em; display: block; margin-bottom: 10px;">Soutenez le développement sur Tipeee !</strong> 
            <p style="margin-bottom: 10px; color: #555;">Votre soutien permet de continuer à améliorer cet outil et à développer de nouvelles fonctionnalités.</p>
            <a href="https://fr.tipeee.com/weda-helper" target="_blank">
                <img src="${chrome.runtime.getURL('Images/logoTipeee.png')}" alt="Soutenez-moi sur Tipeee" style="height: 60px; width: auto; border: none;">
            </a>
        </div>
    </div>

    <!-- Section 7: Signature -->
    <div style="text-align: center; padding: 10px; color: #777;">
        <p><strong>Merci d'utiliser Weda-Helper !</strong></p>
        <p>Bon courage,</p>
        <p>Le développeur de Weda-Helper</p>
    </div>
</div>
`;

// firstStartMessage = htmlMaker(firstStartMessage)


var updateMessageTemplate = `
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
    <!-- Section 1: Titre et bannière principale -->
    <div style="text-align: center; background-color: #f0f8ff; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
        <h2 style="color: #2c3e50;"><strong>✨ Weda-Helper vient d'être mis à jour en version ${currentVersion} !</strong></h2>
    </div>

    <!-- Section 2 & 3: Tipeee et Configuration côte à côte -->
    <div style="display: flex; gap: 15px; margin-bottom: 20px; align-items: stretch;">
        <!-- Section 2: Tipeee et support -->
        <div style="flex: 1; background-color: #fff9e6; padding: 15px; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: space-between;">
            <div style="text-align: center; width: 100%;">
                <strong style="font-size: 1.1em; display: block; margin-bottom: 10px;">Soutenez le développement de Weda-Helper sur Tipeee !</strong> 
                <p style="margin-bottom: 10px; color: #555;">Si Weda-Helper épargne votre temps et vous aide à mieux coter, pensez à me soutenir !</p>
            </div>
            <a href="https://fr.tipeee.com/weda-helper" target="_blank">
                <img src="${chrome.runtime.getURL('Images/logoTipeee.png')}" alt="Soutenez-moi sur Tipeee" style="height: 60px; width: auto; border: none;">
            </a>
        </div>

        <!-- Section 3: Options et configuration -->
        <div style="flex: 1; background-color: #e8f5e9; padding: 15px; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: space-between;">
            <div style="text-align: center; width: 100%;">
                <h3 style="margin-top: 0; color: #2e7d32;"><strong>🔧 Configuration et paramètres</strong></h3>
                <p style="color: #555;">Parcourez les <strong>options ⚙️</strong>, le <strong>Changelog 📋</strong>, et la <strong>Documentation ℹ️</strong> pour explorer toutes les possibilités. <br><br> Pour y accéder, cliquez en haut à droite de votre navigateur : </p>
            </div>
            <div style="margin-top: 10px; font-size: 2em;">
                🧩 ➜ 🆆 ➜ ⚙️ / 📋 / ℹ️
            </div>
        </div>
    </div>

    <!-- Section 4: Nouveautés (Changelog) -->
    <div style="background-color: #ffffff; padding: 15px; border-radius: 10px; border: 1px solid #e0e0e0;">
        <h3 style="color: #1565c0; margin-top: 0;"><strong>🌟 Nouveautés et améliorations</strong></h3>
        <div style="overflow-y: auto; padding: 10px; background-color: #f5f5f5; border-radius: 5px;">
            NOUVEAUTES_PLACEHOLDER
        </div>

        <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
            <p>📝 Suggestions et rapports de bug : 
            <a href="https://github.com/Refhi/Weda-Helper/" target="_blank" style="color: #1565c0; text-decoration: none;">Weda-Helper sur GitHub</a></p>
            
            <p>💖 Vos encouragements sont appréciés : 
            <a href="https://github.com/Refhi/Weda-Helper/discussions" target="_blank" style="color: #1565c0; text-decoration: none;">Communauté Weda</a></p>
            
            <p><strong>Bon courage !</strong></p>
            <p><strong>Les développeurs de Weda-Helper</strong></p>
        </div>
    </div>
</div>
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
