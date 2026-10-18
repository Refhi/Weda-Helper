/**
 * @file popup.js
 * @description Interface principale de la popup de l'extension.
 * Gère l'affichage, les interactions et la communication avec le script de fond
 * pour les actions rapides (TPE, scan vaccin, métriques, etc.).
 * 
 * @exports updateUI - Met à jour l'interface de la popup
 * @exports sendMessage - Envoie un message au script de fond
 * 
 * @requires popupFunctions.js
 * @requires storage.js (getOption)
 */

const buttons = {
    'tpebis': 'tpebis',
    'sendCustomAmount': 'sendCustomAmount',
};

for (let id in buttons) {
    document.getElementById(id).addEventListener('click', function () {
        console.log(id + " clicked");
        if (id === 'sendCustomAmount') {
            let customAmount = document.getElementById('customAmount').value;
            if (customAmount) {
                chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: buttons[id], amount: customAmount });
                });
                console.log(buttons[id] + " message sent with amount: " + customAmount);
            } else {
                console.log("No amount entered");
            }
        } else {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                chrome.tabs.sendMessage(tabs[0].id, { action: buttons[id] });
            });
            console.log(buttons[id] + " message sent");
        }
    });
}

// Gestion du slider pour l'option instantVaccine
document.addEventListener('DOMContentLoaded', async function () {
    // Récupérer l'état actuel de l'option depuis le stockage
    chrome.storage.local.get('instantVaccine', function (data) {
        // Définir l'état initial du slider basé sur la valeur stockée
        document.getElementById('instantVaccineSlider').checked = data.instantVaccine || false;
    });


    // Surveiller les changements du slider
    document.getElementById('instantVaccineSlider').addEventListener('change', function () {
        // Mettre à jour la valeur dans le storage quand le slider change
        const isEnabled = this.checked;
        chrome.storage.local.set({ 'instantVaccine': isEnabled }, function () {
            console.log('Option instantVaccine mise à jour : ' + isEnabled);
        });
    });
});


// Lien vers les options
document.getElementById('optionsLink').addEventListener('click', function () {
    chrome.runtime.openOptionsPage();
});





// Lien vers le changelog
document.getElementById('changelogLink').addEventListener('click', function () {
    // Charger le fichier CHANGELOG.md
    fetch(chrome.runtime.getURL('CHANGELOG.md'))
        .then(response => response.text())
        .then(markdownText => {
            // Créer un contenu HTML avec CSS intégré
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Changelog - Weda-Helper</title>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
                            line-height: 1.6;
                            color: #24292e;
                            max-width: 800px;
                            margin: 0 auto;
                            padding: 20px;
                        }
                        h1 {
                            border-bottom: 1px solid #eaecef;
                            padding-bottom: 0.3em;
                            font-size: 2em;
                        }
                        h2 {
                            border-bottom: 1px solid #eaecef;
                            padding-bottom: 0.3em;
                            font-size: 1.5em;
                        }
                        h3 {
                            font-size: 1.25em;
                        }
                        a {
                            color: #0366d6;
                            text-decoration: none;
                        }
                        a:hover {
                            text-decoration: underline;
                        }
                        ul {
                            padding-left: 2em;
                        }
                        li {
                            margin: 0.25em 0;
                        }
                        p {
                            margin-top: 0;
                            margin-bottom: 16px;
                        }
                        code {
                            background-color: rgba(27, 31, 35, 0.05);
                            border-radius: 3px;
                            font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
                            font-size: 85%;
                            padding: 0.2em 0.4em;
                        }
                    </style>
                </head>
                <body>
                    <div id="content">
                        ${enhancedMarkdownToHtml(markdownText)}
                    </div>
                </body>
                </html>
            `;

            // Créer un objet URL pour le blob HTML
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const blobURL = URL.createObjectURL(blob);

            // Ouvrir la page générée dans un nouvel onglet
            chrome.tabs.create({ url: blobURL });
        })
        .catch(error => {
            console.error('Erreur lors du chargement du changelog:', error);
            // En cas d'erreur, ouvrir directement le fichier Markdown
            chrome.tabs.create({ url: chrome.runtime.getURL('CHANGELOG.md') });
        });
});

// Lien vers le README
document.getElementById('readmeLink').addEventListener('click', function () {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/ui/markdownViewer.html?file=README.md') });
});

// Lien vers Tipeee
document.getElementById('tipeeeLink').addEventListener('click', function () {
    // Ouvrir la page Tipeee dans un nouvel onglet
    chrome.tabs.create({ url: 'https://fr.tipeee.com/weda-helper' });
});

// Lien vers la communauté (https://communaute.weda.fr/discussions-n4y99j90/post/weda-helper-pQfPGckmrhwKBJC)
document.getElementById('communityLink').addEventListener('click', function () {
    // Ouvrir la page de la communauté dans un nouvel onglet
    chrome.tabs.create({ url: 'https://communaute.weda.fr/discussions-n4y99j90/post/weda-helper-pQfPGckmrhwKBJC' });
});

// Lien vers le Wiki (https://github.com/Refhi/Weda-Helper/wiki)
document.getElementById('wikiLink').addEventListener('click', function () {
    // Ouvrir la page du Wiki dans un nouvel onglet
    chrome.tabs.create({ url: 'https://github.com/Refhi/Weda-Helper/wiki' });
});

// Lien vers le signalement de bugs (https://github.com/Refhi/Weda-Helper/issues)
document.getElementById('bugReportLink').addEventListener('click', function () {
    // Ouvrir la page de signalement de bugs dans un nouvel onglet
    chrome.tabs.create({ url: 'https://github.com/Refhi/Weda-Helper/issues' });
});