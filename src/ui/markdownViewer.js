// Affiche un fichier markdown de l'extension (paramètre ?file=, limité aux fichiers autorisés).
const ALLOWED_FILES = ['README.md', 'docs/IA-distante-wiki.md'];

// Fonction améliorée pour convertir le Markdown en HTML
function enhancedMarkdownToHtml(markdown, { paragraphs = false } = {}) {
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

    if (paragraphs) {
        html = html.replace(/^&gt; ?(.*)$/gm, '<blockquote>$1</blockquote>');
        html = html.replace(/<\/blockquote>\n<blockquote>/g, '<br>');
        html = html.replace(/^ *\d+\. (.*)$/gm, '<li>$1</li>');
    }

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
    if (paragraphs) html = html.replace(/(^|[\s(])_(.+?)_(?=[\s).,;:]|$)/gm, '$1<em>$2</em>');

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

    if (paragraphs) {
        html = html.split(/\n{2,}/).map(block => /^\s*<(h\d|ul|ol|li|blockquote|pre|div|table)\b/.test(block) || !block.trim() ? block : `<p>${block.trim().replace(/\n/g, '<br>')}</p>`).join('\n');
    }

    // // Envelopper dans des balises <p> uniquement si nécessaire
    // if (!html.startsWith('<')) {
    //     html = '<p>' + html + '</p>';
    // }

    return html;
}

const file = new URLSearchParams(location.search).get('file');
if (!ALLOWED_FILES.includes(file)) {
    document.getElementById('content').textContent = 'Fichier non autorisé.';
} else {
    fetch(chrome.runtime.getURL(file))
        .then(response => response.text())
        .then(markdownText => {
            document.getElementById('content').innerHTML = enhancedMarkdownToHtml(markdownText, { paragraphs: file !== 'README.md' });
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
        })
        .catch(error => {
            console.error('Erreur lors du chargement de la documentation :', error);
            document.getElementById('content').textContent = 'Impossible de charger la documentation.';
        });
}
