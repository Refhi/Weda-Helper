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

// Gestion des alertes par hashtags dans les descriptions d'antécédents
// Applicable uniquement sur la page de vue patient
addTweak('/FolderMedical/PatientViewForm.aspx', '*alertesHashtagsATCD', function () {
    console.log('[alertesDateHashtag] Initialisation des alertes par hashtags');

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

    // Cible le panel des antécédents
    const panelSelector = "#ContentPlaceHolder1_PanelPatient";

    // Fonction utilitaire : calcule la prochaine échéance
    const calculerProchaineEcheance = (dateReference, frequenceEnMois) => {
        // Si pas de fréquence, la date de référence est la date d'échéance
        if (!frequenceEnMois) return dateReference;

        // Ajouter la fréquence UNE FOIS à la date de référence pour obtenir la prochaine occurrence
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

            // Garder toutes les alertes (même niveau null) pour le debug
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
            if (!frequence) continue; // Ignorer si hashtag inconnu

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

            // Garder toutes les alertes (même niveau null) pour le debug
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
                // Colorer uniquement le hashtag #jj/mm/aaaa
                const matchEscaped = item.matchText.replace(/[/]/g, '\\/');
                const regex = new RegExp(`(${matchEscaped})`, 'gi');
                nouveauHTML = nouveauHTML.replace(regex,
                    `<span style="color: ${color}; font-weight: bold;" title="${tooltip}">$1</span>`
                );
            } else {
                // Colorer toute la ligne date + texte + hashtag
                const dateEscaped = item.dateStr.replace(/[/]/g, '\\/');
                const regex = new RegExp(`([^<>]*?${dateEscaped}[^<#]*?#${item.hashtag}(?=\\s|<br|$))`, 'gi');
                nouveauHTML = nouveauHTML.replace(regex,
                    `<span style="color: ${color}; font-weight: bold;" title="${tooltip}">$1</span>`
                );
            }
        });

        return nouveauHTML;
    };

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

            atcdElements.forEach(atcdDiv => { // On parcourt chaque antécédent
                // Cibler spécifiquement les spans avec font-size:x-small qui contiennent les notes/détails
                const detailSpans = atcdDiv.querySelectorAll('span[style*="font-size:x-small"]');
                if (detailSpans.length === 0) return;
                const span = detailSpans[0]; // chaque antécédent n'a qu'un seul span de détails
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
