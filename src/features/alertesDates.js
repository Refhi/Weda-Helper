/**
 * @file alertesDates.js
 * @description Système d'alertes basées sur les dates dans les antécédents.
 * Gère deux types d'alertes :
 * 1. Alertes Weda natives (via le champ "Date d'alerte")
 * 2. Alertes par hashtags dans les descriptions (#annuel, #mensuel, #bimensuel, #1an, etc.)
 * 
 * @requires tweaks.js (addTweak)
 * @requires storage.js (getOption)
 * @requires dom-oberver.js (waitForElement)
 * @requires date-time-helpers.js (fonctions de calcul de dates)
 */

// ============================================================================
// Configuration et fonctions utilitaires communes
// ============================================================================

// Configuration des hashtags et leurs durées associées (en mois)
const HASHTAGS_CONFIG = {
    'mensuel': { duree: 1, description: '1 mois' },
    '1mois': { duree: 1, description: '1 mois' },
    '2mois': { duree: 2, description: '2 mois' },
    'trimestriel': { duree: 3, description: '3 mois' },
    '3mois': { duree: 3, description: '3 mois' },
    'semestriel': { duree: 6, description: '6 mois' },
    '6mois': { duree: 6, description: '6 mois' },
    'annuel': { duree: 12, description: '1 an' },
    '1an': { duree: 12, description: '1 an' },
    '2ans': { duree: 24, description: '2 ans' },
    '3ans': { duree: 36, description: '3 ans' },
    '4ans': { duree: 48, description: '4 ans' },
    '5ans': { duree: 60, description: '5 ans' },
    '10ans': { duree: 120, description: '10 ans' }
};

// Générer la liste des suggestions pour l'auto-complétion
const HASHTAGS_SUGGESTIONS = Object.keys(HASHTAGS_CONFIG).map(key => ({
    hashtag: `#${key}`,
    description: HASHTAGS_CONFIG[key].description,
    duree: HASHTAGS_CONFIG[key].duree
}));


// Fonction utilitaire : calcule la prochaine échéance
const calculerProchaineEcheance = (dateReference, frequenceEnMois) => {
    if (!frequenceEnMois) return dateReference;
    let prochaineDate = new Date(dateReference);
    prochaineDate.setHours(0, 0, 0, 0);
    prochaineDate.setMonth(prochaineDate.getMonth() + frequenceEnMois);
    return prochaineDate;
};

// Fonction d'extraction : Hashtags avec date en dur (#jj/mm/aaaa)
const extraireDatesDirectes = (texte, aujourdhui, seuilPreAlertJours) => {
    const alertes = [];
    const pattern = /#(\d{2}\/\d{2}\/\d{4})/gi;

    for (const match of texte.matchAll(pattern)) {
        const [fullMatch, dateStr] = match;
        const [jj, mm, aaaa] = dateStr.split('/');
        const dateEcheance = new Date(`${aaaa}-${mm}-${jj}`);
        if (isNaN(dateEcheance)) continue;

        const prochaineDate = calculerProchaineEcheance(dateEcheance, null);
        if (!prochaineDate) continue;

        const diffJours = Math.floor((prochaineDate - aujourdhui) / (1000 * 60 * 60 * 24));
        let niveau = null;

        if (prochaineDate < aujourdhui) {
            niveau = 'urgent';
        } else if (diffJours <= seuilPreAlertJours) {
            niveau = 'warning';
        }

        alertes.push({
            type: 'dateDirecte',
            matchText: fullMatch,
            prochaineDate,
            diffJours,
            niveau
        });
    }

    return alertes;
};

// Fonction d'extraction : Date pré-# + hashtag de fréquence (jj/mm/aaaa #frequence)
const extraireDatesAvecFrequence = (texte, aujourdhui, hashtagsConfig) => {
    const alertes = [];
    const pattern = /(\d{2}\/\d{2}\/\d{4})[^\n#]*?#(\w+)/gi;

    for (const match of texte.matchAll(pattern)) {
        const [fullMatch, dateStr, hashtagBrut] = match;
        const [jj, mm, aaaa] = dateStr.split('/');
        const dateReference = new Date(`${aaaa}-${mm}-${jj}`);
        if (isNaN(dateReference)) continue;

        const hashtag = hashtagBrut.toLowerCase();
        const config = hashtagsConfig[hashtag];
        if (!config) continue;

        const frequence = config.duree;
        const prochaineDate = calculerProchaineEcheance(dateReference, frequence);
        if (!prochaineDate) continue;

        const diffJours = Math.floor((prochaineDate - aujourdhui) / (1000 * 60 * 60 * 24));
        const seuilWarning = Math.floor((frequence * 30.44) / 2);
        let niveau = null;

        if (prochaineDate < aujourdhui) {
            niveau = 'urgent';
        } else if (diffJours <= seuilWarning) {
            niveau = 'warning';
        }

        alertes.push({
            type: 'dateFrequence',
            dateStr,
            hashtag,
            prochaineDate,
            diffJours,
            niveau
        });
    }

    return alertes;
};

// Fonction de coloration : applique les styles aux hashtags détectés
const appliquerColoration = (html, alertes) => {
    let nouveauHTML = html;

    alertes.forEach((item) => {
        const color = item.niveau === 'urgent' ? 'red' : 'orange';
        const dateFormatee = `${item.prochaineDate.getDate().toString().padStart(2, '0')}/${(item.prochaineDate.getMonth() + 1).toString().padStart(2, '0')}/${item.prochaineDate.getFullYear()}`;
        const tooltip = item.diffJours < 0
            ? `Échéance dépassée : ${dateFormatee} (${-item.diffJours} jours)`
            : `Prochaine échéance : ${dateFormatee} (dans ${item.diffJours} jours)`;

        if (item.type === 'dateDirecte') {
            const matchEscaped = item.matchText.replace(/[/]/g, '\\/');
            const regex = new RegExp(`(${matchEscaped})`, 'gi');
            nouveauHTML = nouveauHTML.replace(regex,
                `<span style="color: ${color}; font-weight: bold;" title="${tooltip}">$1</span>`
            );
        } else {
            const dateEscaped = item.dateStr.replace(/[/]/g, '\\/');
            const regex = new RegExp(`(${dateEscaped})`, 'gi');
            nouveauHTML = nouveauHTML.replace(regex,
                `<span style="color: ${color}; font-weight: bold;" title="${tooltip}">$1</span>`
            );
        }
    });

    return nouveauHTML;
};

// ============================================================================
// Gestion des alertes Weda natives
// ============================================================================

// Gestion des alertes Weda natives (champ "Date d'alerte")
// Applicable sur les pages d'accueil et de vue patient
addTweak(['/FolderMedical/FindPatientForm.aspx', '/FolderMedical/PatientViewForm.aspx'], '*preAlertATCD', function () {
    console.log('[alertesDates] Initialisation des alertes de dates Weda natives');

    waitForElement({
        selector: '[title="Date d\'alerte"]',
        callback: function (elements) {
            console.log('[alertesDatesNative] Traitement de', elements.length / 2, 'alerte(s) Weda native(s)', elements);

            elements.forEach(alertElement => {
                // Le texte est au format "Alerte : DD/MM/YYYY."
                alertElement.textContent = alertElement.textContent.replace('.', '');
                let alertDateText = alertElement.textContent.split(' : ')[1];

                if (!alertDateText) {
                    return;
                }

                // Vérifier le format de date
                const datePattern = /^\d{2}\/\d{2}\/\d{4}$/;
                if (!datePattern.test(alertDateText)) {
                    console.log('[alertesDatesNative] Format de date invalide:', alertDateText);
                    return;
                }

                // Conversion de la date
                let [day, month, year] = alertDateText.split('/');
                let alertDate = new Date(`${year}-${month}-${day}`);

                if (isNaN(alertDate)) {
                    console.log('[alertesDatesNative] Date invalide:', alertDateText);
                    return;
                }

                let today = new Date();

                getOption('preAlertATCD', function (preAlertATCD) {
                    preAlertATCD = parseInt(preAlertATCD);
                    let datePreAlerte = new Date();
                    datePreAlerte.setMonth(today.getMonth() + preAlertATCD);

                    const diffJours = Math.ceil((alertDate - today) / (1000 * 60 * 60 * 24));

                    // Weda colore automatiquement en rouge les dates dépassées ou urgentes
                    // On se concentre uniquement sur la pré-alerte (orange)
                    if (alertDate > today && alertDate <= datePreAlerte) {
                        console.log('[alertesDatesNative] Pré-alerte détectée:', alertDateText, '- Jours restants:', diffJours);
                        alertElement.style.color = 'orange';
                        alertElement.style.fontWeight = 'bold';
                    }
                });
            });
        }
    });
});

// ============================================================================
// Gestion des alertes par hashtags dans les antécédents
// ============================================================================

// Applicable uniquement sur la page de vue patient
addTweak('/FolderMedical/PatientViewForm.aspx', '*alertesHashtagsATCD', function () {
    console.log('[alertesDateHashtag] Initialisation des alertes par hashtags');

    // Cible le panel des antécédents
    const panelSelector = "#ContentPlaceHolder1_PanelPatient";

    waitForElement({
        selector: panelSelector,
        callback: async function (panels) {
            console.log('[alertesDateHashtag] Panel patient trouvé, recherche des hashtags...');
            const panel = panels[0];
            const atcdElements = panel.querySelectorAll('td div[style*="font-Size:10pt"]');
            console.log('[alertesDateHashtag] Nombre d\'antécédents trouvés:', atcdElements.length);

            const preAlertATCD = parseInt(await getOptionPromise('preAlertATCD'));
            const seuilPreAlertJours = Math.floor(preAlertATCD * 30.44);
            const aujourdhui = new Date();
            aujourdhui.setHours(0, 0, 0, 0);

            atcdElements.forEach(atcdDiv => {
                // Cibler spécifiquement les spans avec font-size:x-small qui contiennent les notes/détails
                const detailSpans = atcdDiv.querySelectorAll('span[style*="font-size:x-small"]');
                if (detailSpans.length === 0) return;
                const span = detailSpans[0];
                if (span.dataset.hashtagProcessed) return;

                // Utiliser innerHTML et remplacer les <br> par des sauts de ligne pour préserver la structure
                const texte = span.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');

                // Extraire les alertes des deux types
                const alertesDatesDirectes = extraireDatesDirectes(texte, aujourdhui, seuilPreAlertJours);
                const alertesDatesFrequence = extraireDatesAvecFrequence(texte, aujourdhui, HASHTAGS_CONFIG);
                const hashtagsDetectes = [...alertesDatesDirectes, ...alertesDatesFrequence];

                if (hashtagsDetectes.length === 0) return;

                console.log('[alertesDateHashtag] Alertes détectées:', hashtagsDetectes.length, hashtagsDetectes);

                // Filtrer pour ne garder que les alertes avec un niveau défini (urgent ou warning)
                const alertesAColorer = hashtagsDetectes.filter(alerte => alerte.niveau !== null);
                if (alertesAColorer.length === 0) return;

                console.log('[alertesDateHashtag] Alertes à colorer:', alertesAColorer.length);

                // Appliquer la coloration
                span.innerHTML = appliquerColoration(span.innerHTML, alertesAColorer);
                span.dataset.hashtagProcessed = 'true';
            });
        }
    });
});

// ============================================================================
// Gestion des alertes de dates dans les éléments de suivis
// ============================================================================

// Applicable sur la page de consultation
addTweak('/FolderMedical/ConsultationForm.aspx', '*alertesDatesSuivis', function () {
    console.log('[alertesDatesSuivis] Initialisation des alertes de dates dans les suivis');

    // Fonction de traitement des éléments de suivi
    const traiterElementsSuivis = async () => {
        // Rechercher tous les labels de suivi avec le pattern ContentPlaceHolder1_SuivisGrid_LabelGridSuiviHistorique_*
        const labelsSuivis = document.querySelectorAll('[id^="ContentPlaceHolder1_SuivisGrid_LabelGridSuiviHistorique_"]');

        if (labelsSuivis.length === 0) {
            console.log('[alertesDatesSuivis] Aucun élément de suivi trouvé');
            return;
        }

        console.log('[alertesDatesSuivis] Nombre d\'éléments de suivi trouvés:', labelsSuivis.length);

        const preAlertATCD = parseInt(await getOptionPromise('preAlertATCD'));
        const seuilPreAlertJours = Math.floor(preAlertATCD * 30.44);
        const aujourdhui = new Date();
        aujourdhui.setHours(0, 0, 0, 0);

        labelsSuivis.forEach(label => {
            if (label.dataset.hashtagProcessed) return;

            // Structure: <span><table><tbody><tr><td>date</td><td>texte suivi</td><td>vide</td></tr>...
            // On cible les lignes du tableau qui contiennent les suivis
            const lignesSuivi = label.querySelectorAll('table tbody tr');
            
            if (lignesSuivi.length === 0) return;

            lignesSuivi.forEach(ligne => {
                // Chaque ligne a 3 td: [date, texte, vide]
                const cellules = ligne.querySelectorAll('td');
                if (cellules.length < 2) return;

                const dateCell = cellules[0]; // Format: "DD/MM/YYYY :"
                const texteCell = cellules[1]; // Contient le texte du suivi avec potentiellement des hashtags
                
                if (dateCell.dataset.hashtagProcessed) return;

                const texte = texteCell.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');
                
                // Extraire la date de la première cellule pour l'utiliser comme date de référence
                const dateMatch = dateCell.textContent.match(/(\d{2}\/\d{2}\/\d{4})/);
                const dateSuivi = dateMatch ? dateMatch[1] : null;

                // Extraire les alertes des deux types
                const alertesDatesDirectes = extraireDatesDirectes(texte, aujourdhui, seuilPreAlertJours);
                const alertesDatesFrequence = dateSuivi 
                    ? extraireDatesAvecFrequence(`${dateSuivi} ${texte}`, aujourdhui, HASHTAGS_CONFIG)
                    : [];
                const hashtagsDetectes = [...alertesDatesDirectes, ...alertesDatesFrequence];

                if (hashtagsDetectes.length === 0) return;

                console.log('[alertesDatesSuivis] Alertes détectées dans suivi:', hashtagsDetectes.length, hashtagsDetectes);

                // Filtrer pour ne garder que les alertes avec un niveau défini (urgent ou warning)
                const alertesAColorer = hashtagsDetectes.filter(alerte => alerte.niveau !== null);
                if (alertesAColorer.length === 0) return;

                console.log('[alertesDatesSuivis] Alertes à colorer dans suivi:', alertesAColorer.length, alertesAColorer);

                // Appliquer la coloration sur la cellule de date
                // On détermine la couleur la plus prioritaire (rouge > orange)
                const hasUrgent = alertesAColorer.some(alerte => alerte.niveau === 'urgent');
                const color = hasUrgent ? 'red' : 'orange';
                
                // Créer le tooltip avec toutes les alertes
                const tooltipLines = alertesAColorer.map(item => {
                    const dateFormatee = `${item.prochaineDate.getDate().toString().padStart(2, '0')}/${(item.prochaineDate.getMonth() + 1).toString().padStart(2, '0')}/${item.prochaineDate.getFullYear()}`;
                    return item.diffJours < 0
                        ? `Échéance dépassée : ${dateFormatee} (${-item.diffJours} jours)`
                        : `Prochaine échéance : ${dateFormatee} (dans ${item.diffJours} jours)`;
                });
                const tooltip = tooltipLines.join('\n');
                
                dateCell.style.color = color;
                dateCell.style.fontWeight = 'bold';
                dateCell.title = tooltip;
                dateCell.dataset.hashtagProcessed = 'true';
            });

            label.dataset.hashtagProcessed = 'true';
        });
    };

    // Traiter les éléments au chargement initial
    waitForElement({
        selector: '[id^="ContentPlaceHolder1_SuivisGrid_LabelGridSuiviHistorique_"]',
        callback: traiterElementsSuivis
    });

    // Observer les changements dynamiques (ajout de nouveaux suivis)
    const observer = new MutationObserver((mutations) => {
        let nouveauxSuivisDetectes = false;
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) { // Element node
                    // Vérifier si le nœud ajouté ou ses enfants contiennent des éléments de suivi
                    const suivis = node.querySelectorAll ? node.querySelectorAll('[id^="ContentPlaceHolder1_SuivisGrid_LabelGridSuiviHistorique_"]') : [];
                    if (suivis.length > 0 || (node.id && node.id.startsWith('ContentPlaceHolder1_SuivisGrid_LabelGridSuiviHistorique_'))) {
                        nouveauxSuivisDetectes = true;
                    }
                }
            });
        });

        if (nouveauxSuivisDetectes) {
            console.log('[alertesDatesSuivis] Nouveaux suivis détectés, traitement...');
            traiterElementsSuivis();
        }
    });

    // Observer le conteneur principal
    const conteneur = document.body;
    if (conteneur) {
        observer.observe(conteneur, {
            childList: true,
            subtree: true
        });
    }
});

// ============================================================================
// Auto-complétion des hashtags de fréquence
// ============================================================================

// Applicable sur les pages de consultation et d'ajout d'antécédent
addTweak(['/FolderMedical/ConsultationForm.aspx', '/FolderMedical/AntecedentForm.aspx'], '*autoCompleteHashtags', function () {
    console.log('[autoCompleteHashtags] Initialisation de l\'auto-complétion des hashtags');

    let autocompleteMenu = null;
    let currentInput = null;
    let hashtagPosition = -1;
    let selectedIndex = -1;

    // Créer le menu d'auto-complétion
    function createAutocompleteMenu() {
        const container = document.createElement('div');
        container.id = 'hashtag-autocomplete-container';
        container.style.cssText = `
            position: absolute;
            z-index: 10000;
            display: none;
        `;
        
        // Icône d'aide
        const helpIcon = document.createElement('div');
        helpIcon.className = 'hashtag-help-icon';
        helpIcon.innerHTML = '#?';
        helpIcon.style.cssText = `
            position: absolute;
            top: 0;
            left: -30px;
            width: 24px;
            height: 24px;
            background-color: #0066cc;
            color: white;
            border-radius: 50%;
            text-align: center;
            line-height: 24px;
            font-size: 13px;
            font-weight: bold;
            cursor: help;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;
        
        // Texte d'aide (affiché au survol)
        const helpText = document.createElement('div');
        helpText.className = 'hashtag-help-text';
        helpText.innerHTML = `
            <strong style="margin-bottom: 8px; display: block; font-size: 13px;">Rappels automatiques avec hashtags</strong>
            
            <div style="margin-bottom: 8px; font-size: 11px;">
                Tapez <strong>#</strong> suivi d'une durée ou d’une date pour insérer une coloration automatique
                de la ligne.
            </div>
            
            <div style="margin-bottom: 4px;"><strong>Exemples :</strong></div>
            <div style="padding-left: 10px; line-height: 1.6; font-size: 11px; margin-bottom: 8px;">
                • <strong>28/01/2026 - #mensuel</strong> :<br>
                    alerte dès qu’on s’approche du 28/02/2026 <br>
                • <strong>monofilament #28/02/2026</strong> :<br>
                    alerte quand on s’approche du 28/02/2026
            </div>
                        
            <div style="padding: 6px; background: #f0f8ff; border-radius: 4px; font-size: 10px; margin-bottom: 8px;">
                <strong>💡 dans les items de suivis :</strong> La date de référence est celle de l'enregistrement
            </div>
            
            <div style="padding-top: 8px; border-top: 1px solid #e0e0e0; font-size: 10px; color: #666;">
                Navigation : ↑↓ pour sélectionner, Entrée pour valider<br>
                Possible pour les champs de suivi et le commentaire d'antécédent.
            </div>
        `;
        helpText.style.cssText = `
            display: none;
            position: absolute;
            top: 0;
            left: -360px;
            width: 300px;
            background: white;
            border: 1px solid #0066cc;
            border-radius: 6px;
            padding: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.5;
            color: #333;
            z-index: 10001;
        `;
        
        // Événements de survol
        helpIcon.addEventListener('mouseenter', () => {
            helpText.style.display = 'block';
        });
        helpIcon.addEventListener('mouseleave', () => {
            helpText.style.display = 'none';
        });
        
        // Menu des suggestions
        const menu = document.createElement('div');
        menu.id = 'hashtag-autocomplete-menu';
        menu.style.cssText = `
            position: relative;
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            max-height: 250px;
            overflow-y: auto;
            font-family: Arial, sans-serif;
            font-size: 13px;
        `;
        
        container.appendChild(helpText);
        container.appendChild(helpIcon);
        container.appendChild(menu);
        document.body.appendChild(container);
        
        return container;
    }

    // Afficher le menu avec les suggestions
    function showAutocomplete(input, searchTerm = '') {
        if (!autocompleteMenu) {
            autocompleteMenu = createAutocompleteMenu();
        }

        // Filtrer les suggestions selon le terme de recherche
        const filtered = searchTerm 
            ? HASHTAGS_SUGGESTIONS.filter(s => s.hashtag.toLowerCase().includes(searchTerm.toLowerCase()))
            : HASHTAGS_SUGGESTIONS;

        if (filtered.length === 0) {
            hideAutocomplete();
            return;
        }

        // Réinitialiser l'index de sélection
        selectedIndex = -1;

        // Construire le contenu du menu
        const menu = autocompleteMenu.querySelector('#hashtag-autocomplete-menu');
        menu.innerHTML = '';
        menu.dataset.filteredSuggestions = JSON.stringify(filtered);
        
        filtered.forEach((suggestion, index) => {
            const item = document.createElement('div');
            item.className = 'hashtag-item';
            item.dataset.index = index;
            item.style.cssText = `
                padding: 8px 12px;
                cursor: pointer;
                border-bottom: 1px solid #f0f0f0;
            `;
            item.innerHTML = `
                <strong style="color: #0066cc;">${suggestion.hashtag}</strong>
                <span style="color: #666; margin-left: 8px;">(${suggestion.description})</span>
            `;
            
            // Survol
            item.addEventListener('mouseenter', () => {
                selectItem(index);
            });

            // Sélection
            item.addEventListener('click', () => {
                insertHashtag(input, suggestion.hashtag);
                hideAutocomplete();
            });

            menu.appendChild(item);
        });

        // Positionner le conteneur sous le curseur
        const rect = input.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        autocompleteMenu.style.left = `${rect.left + scrollLeft}px`;
        autocompleteMenu.style.top = `${rect.bottom + scrollTop}px`;
        menu.style.minWidth = `${rect.width}px`;
        autocompleteMenu.style.display = 'block';
        
        currentInput = input;
    }

    // Sélectionner un item par son index
    function selectItem(index) {
        if (!autocompleteMenu) return;
        
        const menu = autocompleteMenu.querySelector('#hashtag-autocomplete-menu');
        if (!menu) return;
        const items = menu.querySelectorAll('.hashtag-item');
        items.forEach((item, i) => {
            if (i === index) {
                item.style.backgroundColor = '#e6f2ff';
                selectedIndex = index;
                // Scroll pour rendre l'item visible
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.style.backgroundColor = 'white';
            }
        });
    }

    // Cacher le menu
    function hideAutocomplete() {
        if (autocompleteMenu) {
            autocompleteMenu.style.display = 'none';
        }
        currentInput = null;
        hashtagPosition = -1;
        selectedIndex = -1;
    }

    // Insérer le hashtag dans le champ
    function insertHashtag(input, hashtag) {
        const text = input.value;
        const cursorPos = input.selectionStart;
        
        // Trouver le début du hashtag (le #)
        let hashStart = cursorPos - 1;
        while (hashStart >= 0 && text[hashStart] !== '#') {
            hashStart--;
        }

        if (hashStart >= 0 && text[hashStart] === '#') {
            // Remplacer depuis le # jusqu'à la position actuelle
            const newText = text.substring(0, hashStart) + hashtag + text.substring(cursorPos);
            input.value = newText;
            
            // Placer le curseur après le hashtag
            const newCursorPos = hashStart + hashtag.length;
            input.setSelectionRange(newCursorPos, newCursorPos);
            input.focus();
        }
    }

    // Gérer les événements sur les champs
    function attachAutocomplete(input) {
        if (input.dataset.autocompleteAttached) return;
        input.dataset.autocompleteAttached = 'true';

        // Détecter la frappe
        input.addEventListener('input', (e) => {
            const text = input.value;
            const cursorPos = input.selectionStart;
            
            // Vérifier si on vient de taper un #
            if (text[cursorPos - 1] === '#') {
                hashtagPosition = cursorPos - 1;
                showAutocomplete(input, '');
            } else if (hashtagPosition >= 0) {
                // On est en train de taper après un #
                const textAfterHash = text.substring(hashtagPosition + 1, cursorPos);
                
                // Si on a un espace ou autre caractère, on arrête l'auto-complétion
                if (textAfterHash.includes(' ') || textAfterHash.includes('\n')) {
                    hideAutocomplete();
                } else {
                    showAutocomplete(input, textAfterHash);
                }
            }
        });

        // Gérer la navigation au clavier
        input.addEventListener('keydown', (e) => {
            if (!autocompleteMenu || autocompleteMenu.style.display !== 'block') return;
            
            const menu = autocompleteMenu.querySelector('#hashtag-autocomplete-menu');
            const filtered = menu && menu.dataset.filteredSuggestions 
                ? JSON.parse(menu.dataset.filteredSuggestions)
                : [];
            
            switch(e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    selectedIndex = selectedIndex < filtered.length - 1 ? selectedIndex + 1 : 0;
                    selectItem(selectedIndex);
                    break;
                    
                case 'ArrowUp':
                    e.preventDefault();
                    selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : filtered.length - 1;
                    selectItem(selectedIndex);
                    break;
                    
                case 'Enter':
                    if (selectedIndex >= 0 && selectedIndex < filtered.length) {
                        e.preventDefault();
                        insertHashtag(input, filtered[selectedIndex].hashtag);
                        hideAutocomplete();
                    }
                    break;
                    
                case 'Escape':
                    e.preventDefault();
                    hideAutocomplete();
                    break;
            }
        });

        // Fermer le menu si on clique en dehors
        input.addEventListener('blur', () => {
            // Petit délai pour permettre le clic sur un item
            setTimeout(() => {
                if (document.activeElement !== input) {
                    hideAutocomplete();
                }
            }, 200);
        });
    }

    // Observer et attacher l'auto-complétion aux champs
    function observeAndAttach() {
        // Champs de suivi (ConsultationForm)
        const suiviInputs = document.querySelectorAll('[id^="ContentPlaceHolder1_SuivisGrid_EditBoxGridSuiviReponse_"]');
        suiviInputs.forEach(attachAutocomplete);

        // Champ de commentaire d'antécédent (AntecedentForm)
        const atcdInput = document.getElementById('ContentPlaceHolder1_TextBoxAntecedentCommentaire');
        if (atcdInput) {
            attachAutocomplete(atcdInput);
        }
    }

    // Observer au chargement
    observeAndAttach();

    // Observer les changements dynamiques
    const observer = new MutationObserver(() => {
        observeAndAttach();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});
