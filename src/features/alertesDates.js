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

// Configuration des hashtags et leurs durées associées
const HASHTAGS_CONFIG = {
    'quinquennal': 60,
    '5ans': 60,
    'quadriannual': 48,
    '4ans': 48,
    'triennal': 36,
    '3ans': 36,
    'biennal': 24,
    '2ans': 24,
    'annuel': 12,
    '1an': 12,
    'semestriel': 6,
    '6mois': 6,
    'trimestriel': 3,
    '3mois': 3,
    'bimensuel': 2,
    '2mois': 2,
    'mensuel': 1,
    '1mois': 1
};


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
        const frequence = hashtagsConfig[hashtag];
        if (!frequence) continue;

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

