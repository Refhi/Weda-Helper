const buttons = {
    'allConsultation': 'allConsultation',
    'tpebis': 'tpebis',
    // Ajoutez d'autres boutons ici
    'sendWedaNotif': 'sendWedaNotif',
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
            } else if (id === 'sendWedaNotif') {
                chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: buttons[id] });
                });
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
                        ${simpleMarkdownToHtml(markdownText)}
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