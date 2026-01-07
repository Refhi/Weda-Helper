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
    // Charger le fichier README.md
    fetch(chrome.runtime.getURL('README.md'))
        .then(response => response.text())
        .then(markdownText => {
            // Créer un contenu HTML avec CSS intégré
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Documentation - Weda-Helper</title>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
                            line-height: 1.6;
                            color: #24292e;
                            max-width: 900px;
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
                            margin-top: 24px;
                            margin-bottom: 16px;
                        }
                        h3 {
                            font-size: 1.25em;
                            margin-top: 24px;
                            margin-bottom: 16px;
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
                        table {
                            border-collapse: collapse;
                            width: 100%;
                            margin-bottom: 16px;
                        }
                        table, th, td {
                            border: 1px solid #dfe2e5;
                        }
                        th, td {
                            padding: 6px 13px;
                        }
                        tr:nth-child(even) {
                            background-color: #f6f8fa;
                        }
                        /* Ajout pour les sommaires */
                        .table-of-contents li {
                            list-style-type: none;
                            margin-bottom: 5px;
                        }
                        /* Style pour le code bloc */
                        pre {
                            background-color: #f6f8fa;
                            border-radius: 3px;
                            padding: 16px;
                            overflow: auto;
                            font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
                            font-size: 85%;
                            line-height: 1.45;
                        }
                    </style>
                </head>
                <body>
                    <div id="content">
                        ${enhancedMarkdownToHtml(markdownText)}
                    </div>
                    <script>
                        // Script pour rendre les ancres fonctionnelles
                        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                            anchor.addEventListener('click', function (e) {
                                e.preventDefault();
                                
                                const targetId = this.getAttribute('href').substring(1);
                                const targetElement = document.getElementById(targetId);
                                
                                if (targetElement) {
                                    targetElement.scrollIntoView({
                                        behavior: 'smooth'
                                    });
                                }
                            });
                        });
                    </script>
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
            console.error('Erreur lors du chargement du README:', error);
            // En cas d'erreur, ouvrir directement sur GitHub
            chrome.tabs.create({ url: 'https://github.com/Refhi/Weda-Helper/blob/main/README.md' });
        });
});

// Fonction améliorée pour convertir le Markdown en HTML
function enhancedMarkdownToHtml(markdown) {
    // Échapper les caractères HTML
    let html = markdown
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Extraire les sections de code avant tout traitement
    const codeBlocks = [];
    html = html.replace(/```([\s\S]*?)```/g, function (match) {
        const index = codeBlocks.length;
        codeBlocks.push(match);
        return `%%CODE_BLOCK_${index}%%`;
    });

    // Traiter les titres avec ID pour les ancres
    html = html.replace(/^# (.*?)$/gm, function (match, title) {
        const id = title.toLowerCase().replace(/[^\w]+/g, '-');
        return `<h1 id="${id}">${title}</h1>`;
    });

    html = html.replace(/^## (.*?)$/gm, function (match, title) {
        const id = title.toLowerCase().replace(/[^\w]+/g, '-');
        return `<h2 id="${id}">${title}</h2>`;
    });

    html = html.replace(/^### (.*?)$/gm, function (match, title) {
        const id = title.toLowerCase().replace(/[^\w]+/g, '-');
        return `<h3 id="${id}">${title}</h3>`;
    });

    html = html.replace(/^#### (.*?)$/gm, function (match, title) {
        const id = title.toLowerCase().replace(/[^\w]+/g, '-');
        return `<h4 id="${id}">${title}</h4>`;
    });

    // Traiter le sommaire en préservant les espaces d'indentation
    html = html.replace(/^(\s*)- \[(.*?)\]\((.*?)\)$/gm, function(match, indent, text, link) {
        // Utiliser margin-left pour préserver visuellement l'indentation
        const style = indent ? ` style="margin-left: ${indent.length * 10}px;"` : '';
        return `<li${style}><a href="${link}">${text}</a></li>`;
    });

    // Identifier les sections de sommaire
    html = html.replace(/(<li><a href="#.*?<\/li>\n)+/g, function (match) {
        return `<div class="table-of-contents"><ul>\n${match}</ul></div>`;
    });

    // Convertir les liens internes (style GitHub)
    html = html.replace(/\[(.*?)\]\(#(.*?)\)/g, function (match, text, anchor) {
        return `<a href="#${anchor.toLowerCase().replace(/[^\w]+/g, '-')}">${text}</a>`;
    });

    // Convertir les autres liens
    html = html.replace(/\[(.*?)\]\(((?!#).*?)\)/g, '<a href="$2" target="_blank">$1</a>');



    // Convertir les listes normales
    html = html.replace(/^- ((?!\[).*?)$/gm, '<li>$1</li>');
    html = html.replace(/^\* ((?!\[).*?)$/gm, '<li>$1</li>');

    // Gérer les listes
    html = html.replace(/(<li>.*?<\/li>\n)+/g, function (match) {
        if (!match.includes('class="table-of-contents"')) {
            return `<ul>${match}</ul>`;
        }
        return match;
    });

    // Convertir le texte en gras
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Convertir le texte en italique
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // // Convertir les retours à la ligne
    // html = html.replace(/([^\n])\n([^\n])/g, '$1<br>$2');

    // // Convertir les paragraphes (lignes vides)
    // html = html.replace(/\n\n/g, '</p><p>');

    // Réinjecter les blocs de code
    html = html.replace(/%%CODE_BLOCK_(\d+)%%/g, function (match, index) {
        const code = codeBlocks[parseInt(index)]
            .replace(/```(\w*)\n([\s\S]*?)```/g, function (match, language, content) {
                return `<pre><code class="language-${language}">${content}</code></pre>`;
            });
        return code;
    });

    // // Envelopper dans des balises <p> uniquement si nécessaire
    // if (!html.startsWith('<')) {
    //     html = '<p>' + html + '</p>';
    // }

    return html;
}


// Lien vers Tipeee
document.getElementById('tipeeeLink').addEventListener('click', function () {
    // Ouvrir la page Tipeee dans un nouvel onglet
    chrome.tabs.create({ url: 'https://fr.tipeee.com/weda-helper' });
});

// Lien vers la communauté (https://github.com/Refhi/Weda-Helper/discussions)
document.getElementById('communityLink').addEventListener('click', function () {
    // Ouvrir la page de la communauté dans un nouvel onglet
    chrome.tabs.create({ url: 'https://github.com/Refhi/Weda-Helper/discussions' });
});

// Lien vers le Wiki (https://github.com/Refhi/Weda-Helper/wiki)
document.getElementById('wikiLink').addEventListener('click', function () {
    // Ouvrir la page du Wiki dans un nouvel onglet
    chrome.tabs.create({ url: 'https://github.com/Refhi/Weda-Helper/wiki' });
});