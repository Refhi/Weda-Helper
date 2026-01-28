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
    
    const panelSelector = "#ContentPlaceHolder1_PanelPatient";
    
    waitForElement({
        selector: panelSelector,
        callback: function (panels) {
            console.log('[alertesDateHashtag] Panel patient trouvé, recherche des hashtags...');
            
            panels.forEach(panel => {
                // Rechercher tous les antécédents dans le panel
                const atcdElements = panel.querySelectorAll('td div[style*="font-Size:10pt"]');
                console.log('[alertesDateHashtag] Nombre d\'antécédents trouvés:', atcdElements.length);
                
                atcdElements.forEach(atcdDiv => {
                    // Cibler spécifiquement les spans avec font-size:x-small qui contiennent les notes/détails
                    const detailSpans = atcdDiv.querySelectorAll('span[style*="font-size:x-small"]');
                    
                    if (detailSpans.length === 0) {
                        return;
                    }
                    
                    console.log('[alertesDateHashtag] Spans de détails trouvés:', detailSpans.length, 'dans un antécédent', atcdDiv);
                    
                    detailSpans.forEach(span => {
                        console.log('[alertesDateHashtag] Analyse du span:', span);
                        
                        // Utiliser innerHTML et remplacer les <br> par des sauts de ligne pour préserver la structure
                        let texte = span.innerHTML.replace(/<br\s*\/?>/gi, '\n');
                        // Supprimer les balises HTML restantes
                        texte = texte.replace(/<[^>]*>/g, '');
                        console.log('[alertesDateHashtag] Contenu textuel:', texte);
                        console.log('[alertesDateHashtag] Lignes séparées:', texte.split('\n'));
                        
                        // Chercher les dates avec hashtags
                        // Pattern : date suivie de texte optionnel puis hashtag
                        const pattern = /(\d{2}\/\d{2}\/\d{4})[^\n#]*?#([\w]+)/gi;
                        const infosHashtags = [];
                        let match;
                        
                        console.log('[alertesDateHashtag] Début de la recherche avec pattern:', pattern);
                        
                        while ((match = pattern.exec(texte)) !== null) {
                            console.log('[alertesDateHashtag] Match brut trouvé:', match[0], '| Date:', match[1], '| Hashtag:', match[2]);
                            const [fullMatch, dateStr, hashtag] = match;
                            const [day, month, year] = dateStr.split('/');
                            const date = new Date(`${year}-${month}-${day}`);

                            console.log('[alertesDateHashtag] Vérification - Date valide?', !isNaN(date), '- Hashtag lowercase:', hashtag.toLowerCase(), '- Dans config?', HASHTAGS_CONFIG[hashtag.toLowerCase()]);

                            if (!isNaN(date) && HASHTAGS_CONFIG[hashtag.toLowerCase()]) {
                                infosHashtags.push({
                                    date: date,
                                    hashtag: hashtag.toLowerCase(),
                                    texte: dateStr,
                                    fullMatch: fullMatch,
                                    index: match.index
                                });
                                console.log('[alertesDateHashtag] ✓ Hashtag validé et ajouté:', hashtag);
                            } else {
                                console.log('[alertesDateHashtag] ✗ Hashtag rejeté:', hashtag, '- Raison:', !isNaN(date) ? 'pas dans config' : 'date invalide');
                            }
                        }
                        
                        console.log('[alertesDateHashtag] Total hashtags trouvés:', infosHashtags.length);
                        
                        if (infosHashtags.length === 0) {
                            return;
                        }
                        
                        console.log('[alertesDateHashtag] Hashtags trouvés:', infosHashtags.length, '→', infosHashtags.map(h => `${h.texte} #${h.hashtag}`).join(', '));

                        getOption('preAlertATCD', function (preAlertATCD) {
                            preAlertATCD = parseInt(preAlertATCD);
                            
                            // Préparer les remplacements pour tous les hashtags du span
                            const remplacementsAFaire = [];

                            infosHashtags.forEach(info => {
                                // Calculer la prochaine échéance de manière fiable
                                const dureeEnMois = HASHTAGS_CONFIG[info.hashtag];
                                const maintenant = new Date();
                                const maintenant_start = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());

                                // Créer une date de référence normalisée (à minuit)
                                const dateRef = new Date(info.date.getFullYear(), info.date.getMonth(), info.date.getDate());

                                // Calculer la PREMIÈRE échéance théorique après la date de référence
                                // Cela nous permet de détecter les échéances manquées
                                const premiereEcheance = new Date(dateRef);
                                premiereEcheance.setMonth(premiereEcheance.getMonth() + dureeEnMois);

                                // Vérifier s'il y a eu une échéance manquée (la première aurait déjà dû passer)
                                const echeaneMnquee = premiereEcheance < maintenant_start;

                                // Calculer la prochaine échéance en ajoutant les mois jusqu'à dépasser aujourd'hui
                                const prochaineDate = new Date(dateRef);
                                let compteur = 0;

                                while (prochaineDate < maintenant_start && compteur < 1000) {
                                    prochaineDate.setMonth(prochaineDate.getMonth() + dureeEnMois);
                                    compteur++;
                                }

                                if (compteur >= 1000) {
                                    console.log('[alertesDateHashtag] Erreur : trop d\'itérations pour', info.hashtag);
                                    return;
                                }

                                // Calculs de différence en jours
                                const diffJours = Math.floor((prochaineDate - maintenant_start) / (1000 * 60 * 60 * 24));
                                const joursDepuisRef = Math.floor((maintenant_start - dateRef) / (1000 * 60 * 60 * 24));
                                
                                // Seuil warning : à mi-chemin de la durée (ex: 6 mois pour annuel)
                                const seuilWarningJours = Math.floor((dureeEnMois * 30.44) / 2);

                                let niveau = null;
                                
                                // Cas 1 : Il y a une échéance manquée (première date théorique dépassée) → ROUGE
                                if (echeaneMnquee) {
                                    niveau = 'urgent';
                                }
                                // Cas 2 : Prochaine date dépassée → ROUGE
                                else if (prochaineDate < maintenant_start) {
                                    niveau = 'urgent';
                                }
                                // Cas 3 : À moins de (durée/2) avant la prochaine date → ORANGE
                                else if (diffJours <= seuilWarningJours) {
                                    niveau = 'warning';
                                }
                                // Sinon : pas de coloration

                                console.log('[alertesDateHashtag] Calcul pour', info.hashtag, '- Ref:', dateRef.toLocaleDateString('fr-FR'), '- Première:', premiereEcheance.toLocaleDateString('fr-FR'), '- Manquée?', echeaneMnquee, '- Prochaine:', prochaineDate.toLocaleDateString('fr-FR'), '- Jours restants:', diffJours, '- Seuil warning:', seuilWarningJours, '- Niveau:', niveau);
                                
                                if (niveau) {
                                    console.log('[alertesDateHashtag] Alerte hashtag détectée:', info.texte, '#' + info.hashtag, '- Niveau:', niveau, '- Prochaine échéance:', prochaineDate.toLocaleDateString('fr-FR'), '- Jours restants:', diffJours);
                                    
                                    // Déterminer la date à afficher dans le tooltip
                                    // Si une échéance a été manquée, afficher la première manquée
                                    // Sinon, afficher la prochaine
                                    const dateAffichee = echeaneMnquee ? premiereEcheance : prochaineDate;
                                    const dateFormatee = `${dateAffichee.getDate().toString().padStart(2, '0')}/${(dateAffichee.getMonth() + 1).toString().padStart(2, '0')}/${dateAffichee.getFullYear()}`;
                                    
                                    // Calculer les jours pour le tooltip
                                    const joursPourTooltip = echeaneMnquee 
                                        ? Math.floor((dateAffichee - maintenant_start) / (1000 * 60 * 60 * 24))
                                        : diffJours;
                                    
                                    remplacementsAFaire.push({
                                        info: info,
                                        niveau: niveau,
                                        dateFormatee: dateFormatee,
                                        joursPourTooltip: joursPourTooltip,
                                        estEcheanceMnquee: echeaneMnquee
                                    });
                                }
                            });
                            
                            // Appliquer tous les remplacements en une seule passe
                            if (remplacementsAFaire.length > 0 && !span.dataset.hashtagProcessed) {
                                let nouveauHTML = span.innerHTML;
                                
                                remplacementsAFaire.forEach(remplacement => {
                                    const { info, niveau, dateFormatee, joursPourTooltip, estEcheanceMnquee } = remplacement;
                                    
                                    // Colorer toute la ligne qui contient le hashtag
                                    const dateEscaped = info.texte.replace(/[/]/g, '\\/');
                                    const regexLigneComplete = new RegExp(`([^<>]*?${dateEscaped}[^<#]*?#${info.hashtag}(?=\\s|<br|$))`, 'gi');
                                    
                                    nouveauHTML = nouveauHTML.replace(regexLigneComplete, (match) => {
                                        let color = 'inherit';
                                        let weight = 'normal';
                                        
                                        switch (niveau) {
                                            case 'urgent':
                                                color = 'red';
                                                weight = 'bold';
                                                break;
                                            case 'warning':
                                                color = 'orange';
                                                weight = 'bold';
                                                break;
                                            case 'info':
                                                color = 'blue';
                                                break;
                                        }
                                        
                                        // Texte du tooltip
                                        const tooltipText = estEcheanceMnquee
                                            ? `Échéance manquée depuis : ${dateFormatee} (${-joursPourTooltip} jours)`
                                            : `Prochaine échéance : ${dateFormatee} (dans ${joursPourTooltip} jours)`;
                                        
                                        return `<span style="color: ${color}; font-weight: ${weight};" title="${tooltipText}">${match}</span>`;
                                    });
                                });
                                
                                span.innerHTML = nouveauHTML;
                                span.dataset.hashtagProcessed = 'true';
                            }
                        });
                    });
                });
            });
        }
    });
});
