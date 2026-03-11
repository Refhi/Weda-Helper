/**
 * @file aati.js
 * @description Automatisation des Arrêts de Travail (AATI).
 * Gère l'automatisation complète du processus AATI :
 * - Bouton "AT sans CV" pour shunter la lecture CV
 * - Sélection automatique du patient depuis la CV
 * - Remplissage automatique des dates
 * - Auto-consentement
 * - Recherche rapide des motifs d'arrêt avec Fuse.js
 * - Tri des sous-catégories
 * 
 * @requires tweaks.js (addTweak)
 * @requires storage.js (getOption)
 * @requires lib/fuse.js (recherche floue)
 * @requires metrics.js (recordMetrics)
 */

// Arrêts de travail automatisés
// Ajout d'un 2e bouton à côté de AT nommé "AT sans CV" pour shunter la lecture automatique de la carte vitale
addTweak('/FolderMedical/PatientViewForm.aspx', 'autoAATI', function () {
    let selecteurBoutonAT = '[title="Transmettre un avis d\'arrêt de travail via le téléservice AATi"]';
    function processButton(elements) {
        // remplace le texte "AT" par "AT avec CV | AT sans CV"
        elements[0].textContent = 'AT avec CV | AT sans CV';

        // ajoute sur la partie droite de l'élément un event listener pour le click qui met dans le local storage la valeur "timestampAATIsansCV" au moment du click
        elements[0].addEventListener('click', function (e) {
            // Récupère la largeur de l'élément
            let boutonWidth = elements[0].offsetWidth;

            // Récupère la position du clic relative à l'élément
            let clickPosition = e.clientX - elements[0].getBoundingClientRect().left;

            // Si le clic est sur la moitié droite de l'élément
            if (clickPosition > boutonWidth / 2) {
                console.log('Clic sur AT sans CV détecté au timestamp', Date.now());
                // Stocke le timestamp actuel dans le stockage local avec la clé "timestampAATIsansCV"
                chrome.storage.local.set({ timestampAATIsansCV: Date.now() });
            }
        });
    }

    waitForElement({ selector: selecteurBoutonAT, justOnce: false, callback: processButton });
});



addTweak('/FolderMedical/Aati.aspx', 'autoAATI', function () {
    let selecteurBoutonCV = '#mat-dialog-1 > ng-component > div:nth-child(2) > div.footer.weda-row.weda-main-align-around.weda-cross-align-center.ng-star-inserted > button:nth-child(1)'
    let selecteurBoutonEntreeManuelle = '#mat-dialog-1 > ng-component > div:nth-child(2) > div.footer.weda-row.weda-main-align-around.weda-cross-align-center.ng-star-inserted > button:nth-child(2)'
    let boutonEnvoyerEntreeManuelle = '#mat-dialog-2 > ng-component > div:nth-child(2) > div.footer.weda-row.weda-main-align-around.weda-cross-align-center > button.mat-focus-indicator.color-purple-bold.mat-raised-button.mat-button-base'
    let selecteurSortieNonLimites = '#form1 > div:nth-child(10) > div > dmp-aati-form > div > div:nth-child(2) > div.ml10 > div > div.frameContent > dmp-aati-leave-permission > div.flexColStart.mt10 > div.flexColStart.mt10.ng-star-inserted > div.flexColStart.pt3.ng-star-inserted > div.flexRow.mt5 > input'
    let selectorExitButton = '.frameback.dmtiForm.ng-star-inserted .imgfixe a'

    // lors de la réalisation d’un arrêt de travail, on considère que le premier patient est le bon
    function clickPremierPatientCV() {
        console.log('clickPremierPatientCV déclenché');
        var boutonPremierPatientCV = document.querySelector('[title="Déclarer l\'AT pour ce bénéficiaire."]');
        if (boutonPremierPatientCV) {
            boutonPremierPatientCV.click();
            recordMetrics({ clicks: 1, drags: 1 });
        }
    }

    function fillDateSorties() {
        var sortieNonLimites = document.querySelector(selecteurSortieNonLimites);
        if (sortieNonLimites) {
            console.log('sortieNonLimites', sortieNonLimites, 'found');
            // Get the current date
            let currentDate = new Date();
            // Format the date as dd/mm/yyyy
            let day = String(currentDate.getDate()).padStart(2, '0');
            let month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Months are 0-based in JavaScript
            let year = currentDate.getFullYear();
            let formattedDate = day + '/' + month + '/' + year;
            sortieNonLimites.value = formattedDate;

            // Create a new 'compositionend' event
            let event = new Event('compositionend', {
                bubbles: true,
                cancelable: true
            });

            // Dispatch the event
            console.log('sortieNonLimites', sortieNonLimites, 'dispatching event', event);
            recordMetrics({ keyStroke: 10 });
            sortieNonLimites.dispatchEvent(event); // indispensable sinon la date n'est pas prise en compte
        }
    }

    // arrivé dans la page AATI, le workflow change si on a cliqué sur la partie "AT sans CV"
    // par défaut on considère un arrêt de travail avec CV
    function clickProperButton(elements) {
        console.log('clickProperButton déclenché');
        chrome.storage.local.get(['timestampAATIsansCV'], function (result) {
            if (Date.now() - result.timestampAATIsansCV < 5000) {
                console.log('timestampAATIsansCV', result.timestampAATIsansCV, 'is less than 10 seconds ago donc je dois cliquer sur le bouton "AT sans CV"');
                let boutonSansCV = document.querySelector(selecteurBoutonEntreeManuelle);
                console.log('boutonSansCV', boutonSansCV);
                if (boutonSansCV) {
                    boutonSansCV.click();
                }
            } else {
                console.log('timestampAATIsansCV', result.timestampAATIsansCV, 'is more than 10 seconds ago donc je dois cliquer sur le bouton "AT avec CV"');
                elements[0].click();
            }
        });
    }

    // appuie sur le bouton adéquat selon le type d'arrêt de travail
    waitForElement({
        selector: selecteurBoutonCV,
        callback: async function (elements) {
            clickProperButton(elements);
            // appuie sur le bouton "Envoyer" de la saisie manuelle si on est dans ce mode
            console.log('waitForElement pour boutonEnvoyerEntreeManuelle déclenché');
            waitLegacyForElement("#mat-dialog-2 button span.mat-button-wrapper", "Envoyer", 5000, function (elements) {
                console.log('trouvé boutonEnvoyerEntreeManuelle', elements);
                recordMetrics({ clicks: 1, drags: 1 });
                elements.click();
            });
        },
        justOnce: true
    });



    // guette la liste des patients présents sur la carte vitale pour cliquer sur le premier patient
    waitForElement({
        selector: '[title="Déclarer l\'AT pour ce bénéficiaire."]',
        callback: clickPremierPatientCV,
        justOnce: true
    });

    // ajoute la date du jour dans le champ "Sortie non limitée" s’il apparait
    waitForElement({
        selector: selecteurSortieNonLimites,
        callback: fillDateSorties,
        justOnce: true
    });

    // on surveille le bouton de sortie pour le cliquer automatiquement
    waitForElement({
        selector: selectorExitButton,
        callback: async function (elements) {
            console.log('selectorExitButton', elements);
            // on enregistre le timestamp de sortie dans le local storage
            await chrome.storage.local.set({ autoAATIexit: Date.now() });
            console.log('autoAATIexit set to', Date.now());
            setTimeout(function () {
                elements[0].click();
            }, 1000); // ce délais permet de s’assurer que le pdf ait bien été généré, sinon il n’est pas affiché à l’étape suivante sur les connexions lentes
            recordMetrics({ clicks: 1, drags: 1 });
        },
        justOnce: true
    });
});

// Envoi de la page 3 (la seule page visible) de l'arrêt de travail à Companion
// depuis la page de prévisualisation de l'arrêt de travail
addTweak('/BinaryData.aspx', "*sendDocToCompanion", async function () {
    console.log("[sendDocToCompanion] called");
    // récupération des valeurs et options importantes
    const autoAATIexitTimestamp = await chrome.storage.local.get(['autoAATIexit']);
    const isRecentExit = Date.now() - autoAATIexitTimestamp.autoAATIexit < 10000;
    const companionPrintEnabled = !(await getOptionPromise('RemoveLocalCompanionPrint'));
    console.log('[sendDocToCompanion] variables : autoAATIexit', autoAATIexitTimestamp.autoAATIexit, 'isRecentExit', isRecentExit, 'companionPrintEnabled', companionPrintEnabled);
    // tout d’abord on vérifie qu’on a bien un arrêt de travail récent
    if (!isRecentExit) {
        console.log('autoAATIexit is not recent, skipping Companion print');
        return;
    }
    // ensuite on vérifie que l’option Companion print est activée, sinon on utilise la méthode classique window.print()
    if (!companionPrintEnabled) {
        console.log("Companion print is disabled, simple window.print() will be used");
        window.print();
        return;
    }

    console.log('autoAATIexit is recent and Companion print is enabled, proceeding with Companion print');
    // réinitialisation de la valeur autoAATIexit
    await chrome.storage.local.set({ autoAATIexit: 0 });

    // l’url de la page est censée être la page 3 de l'arrêt de travail, on va l'envoyer à Companion
    let url = window.location.href;
    const pdfBlob = await fetchBlobFromUrl(url);
    sendToCompanion('print', pdfBlob, function (response) {
        console.log('The blob has been successfully transferred to Companion.');
        recordMetrics({ clicks: 3, drags: 3 });
        setTimeout(function () {
            window.close();
        }, 1000);
    })
});



// Cochage automatique de " Mon patient accepte que je transmette le présent avis d'arrêt de travail pour son compte et [...]"
addTweak('/FolderMedical/Aati.aspx', 'aatiTermsExcerpt', function () {
    // La checkbox est le fils du frère ainé de .aatiTermsExcerpt
    const selecteurCheckbox = '.aatiTermsExcerpt';
    const checkBox = document.querySelector(selecteurCheckbox).previousElementSibling.querySelector('input');
    if (!checkBox) {
        console.error('Checkbox not found');
        return;
    }

    if (checkBox.checked) {
        console.log('Checkbox already checked');
        return;
    }

    console.log("[aatiTermsExcerpt] checkBox d'auto-accord", checkBox);

    checkBox.checked = true;
    checkBox.dispatchEvent(new Event('change'));

    sendWedaNotifAllTabs({
        message: "La case 'Mon patient accepte que je transmette [...] a été cochée automatiquement. Allez dans les options de Weda-Helper si vous souhaitez désactiver cette fonctionnalité.",
        type: 'success',
        icon: 'check'
    });

    recordMetrics({ clicks: 1, drags: 1 });
});


addTweak('/FolderMedical/Aati.aspx', 'autoAATI', function () {
    // Cette partie tente de récupérer les différents motifs d'arrêt de travail.
    async function extractAATIMotifs() {
        const selecteurCategories = '.flexColumn select.entry';
        const selecteurSousCategories = '.flexColumn select.entry.ml10';

        const selectCategories = document.querySelector(selecteurCategories);

        if (!selectCategories) {
            console.error('[AATI] Sélecteurs de catégories non trouvés');
            return;
        }

        const motifsAATI = {};
        let categories = selectCategories.querySelectorAll('option');

        // Dans certains cas, categories peut être vide si la liste n'est pas encore chargée, on surveille pendant 20 secondes
        let attempts = 0;
        const maxAttempts = 100; // 20 secondes à 500ms d'intervalle
        while (categories.length === 0 && attempts < maxAttempts) {
            // console.log(`[AATI] Liste des catégories vide, tentative ${attempts + 1}/${maxAttempts}...`);
            await sleep(500);
            categories = selectCategories.querySelectorAll('option');
            attempts++;
        }

        if (categories.length === 0) {
            console.error('[AATI] Impossible de charger la liste des catégories après 20 secondes d\'attente');
            return;
        }


        console.log(`[AATI] Extraction de ${categories.length} catégories...`);

        for (let i = 0; i < categories.length; i++) {
            const categorie = categories[i];
            const categorieValue = categorie.value;
            const categorieLabel = categorie.textContent.trim();

            // Sélectionner la catégorie
            selectCategories.value = categorieValue;
            selectCategories.dispatchEvent(new Event('change', { bubbles: true }));

            // Attendre que le contenu du select des sous-catégories soit mis à jour
            await new Promise(resolve => setTimeout(resolve, 100));

            // Extraire les sous-catégories
            const selectSousCategories = document.querySelector(selecteurSousCategories);
            const sousCategories = selectSousCategories.querySelectorAll('option');
            const sousCategoriesData = [];

            for (let j = 0; j < sousCategories.length; j++) {
                const sousCategorie = sousCategories[j];
                sousCategoriesData.push({
                    value: sousCategorie.value,
                    label: sousCategorie.textContent.trim(),
                    title: sousCategorie.getAttribute('title') || ''
                });
            }

            motifsAATI[categorieValue] = {
                label: categorieLabel,
                sousCategories: sousCategoriesData
            };

            console.log(`[AATI] Catégorie "${categorieLabel}" : ${sousCategoriesData.length} sous-catégories`);
        }

        console.log('[AATI] Extraction terminée:', motifsAATI);

        // Stocker les données dans le localStorage Chrome pour une utilisation future
        await chrome.storage.local.set({
            motifsAATI: motifsAATI,
            motifsAATITimestamp: Date.now()
        });
        console.log('[AATI] Données stockées dans chrome.storage.local avec timestamp');


        return motifsAATI;
    }

    waitForElement({
        selector: '.flexColumn > div:first-child > select.entry',
        callback: async function () {
            setTimeout(async () => {
                const result = await chrome.storage.local.get(['motifsAATI', 'motifsAATITimestamp']);
                const dataAge = Date.now() - (result.motifsAATITimestamp || 0);
                const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 jours en millisecondes

                if (result.motifsAATI && dataAge < maxAge && Object.keys(result.motifsAATI).length > 0) {
                    console.log(`[AATI] motifsAATI présents (âge: ${Math.floor(dataAge / (24 * 60 * 60 * 1000))} jours), extraction sautée.`, result.motifsAATI);
                    return;
                }
                console.log('[AATI] Données absentes ou trop anciennes, extraction lancée.');
                sendWedaNotifAllTabs({
                    message: "Extraction des motifs d'arrêt de travail AATI en cours... (a lieu une seule fois toutes les semaines pour faciliter la recherche de motifs rapide)",
                });

                extractAATIMotifs();
            }, 500);
        },
        justOnce: true,
        triggerOnInit: true
    });
});

// Ajout d'un champ de recherche rapide pour les motifs d'arrêt de travail
addTweak('/FolderMedical/Aati.aspx', 'speedSearchAATI', function () {
    const selecteurCategories = '.flexColumn select.entry';
    const selecteurSousCategories = '.flexColumn select.entry.ml10';

    // Import des données AATI (synonymes + motifs officiels) depuis le fichier JSON embarqué
    const donneesAATIPromise = fetch(chrome.runtime.getURL('src/features/AATI_synonymes_donnees.json'))
        .then(response => response.json())
        .catch(err => {
            console.error('[AATI Search] Erreur lors du chargement de AATI_synonymes_donnees.json :', err);
            return null;
        });

    // Fonction pour enrichir le terme de recherche avec les synonymes issus du JSON officiel AATI
    async function enrichirRecherche(searchTerm) {
        const termsToSearch = [searchTerm];
        const normalizedTerm = searchTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        // Ne pas enrichir pour des termes trop courts (évite les faux positifs)
        if (normalizedTerm.length < 3) return termsToSearch;

        const donneesAATI = await donneesAATIPromise;
        if (!donneesAATI || !donneesAATI.motifs || !donneesAATI.motifs.listeMotifs) {
            console.warn('[AATI Search] Données JSON non disponibles pour l\'enrichissement');
            return termsToSearch;
        }

        for (const motif of donneesAATI.motifs.listeMotifs) {
            // Collecter tous les termes candidats de ce motif (ref, libelle, acronymes, refSynonymes)
            const normalize = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const acronymesArr = (motif.acronymes || '').split(',').map(s => s.trim()).filter(Boolean);
            const synonymesArr = (motif.refSynonymes || '').split(',').map(s => s.trim()).filter(Boolean);
            const candidats = [
                normalize(motif.ref),
                normalize(motif.libelle),
                ...acronymesArr.map(normalize),
                ...synonymesArr.map(normalize)
            ].filter(Boolean);

            // Si le terme de recherche correspond à l'un des candidats, enrichir avec tous les synonymes du motif
            const normalizedWords = normalizedTerm.split(/\s+/).filter(w => w.length >= 3);
            const correspond = candidats.some(c => {
                if (c.length < 3) return false;
                // Le candidat contient le terme recherché (ex: "fracture cheville" contient "fracture")
                if (c.includes(normalizedTerm)) return true;
                // Chaque mot du terme recherché doit être un mot entier dans le candidat
                return normalizedWords.every(word =>
                    new RegExp(`\\b${word}\\b`).test(c) || c === word
                );
            });
        }

        return [...new Set(termsToSearch)]; // Supprimer les doublons
    }

    // Fonction pour rechercher dans les motifs et retourner les 5 meilleurs résultats
    async function searchMotifs(searchTerm) {
        if (!searchTerm || searchTerm.trim().length < 2) {
            return [];
        }

        // Récupérer les motifs depuis le storage
        const result = await chrome.storage.local.get(['motifsAATI']);
        if (!result.motifsAATI) {
            console.log('[AATI Search] Aucun motif disponible');
            return [];
        }

        const motifs = result.motifsAATI;

        // Transformer les données pour Fuse.js
        const searchableData = [];
        for (const [categorieValue, categorieData] of Object.entries(motifs)) {
            for (const sousCategorie of categorieData.sousCategories) {
                searchableData.push({
                    categorieValue: categorieValue,
                    categorieLabel: categorieData.label,
                    sousCategorieValue: sousCategorie.value,
                    sousCategorieLabel: sousCategorie.label,
                    searchText: `${sousCategorie.label} ${sousCategorie.title}`
                });
            }
        }

        // Enrichir la recherche avec les synonymes
        const enrichedTerms = await enrichirRecherche(searchTerm);
        console.log('[AATI Search] Termes enrichis:', enrichedTerms);

        // Configuration de Fuse.js
        const fuseOptions = {
            keys: ['searchText', 'sousCategorieLabel', 'categorieLabel'],
            threshold: 0.4,
            ignoreLocation: true,
            minMatchCharLength: 2,
            includeScore: true,
            useExtendedSearch: false
        };

        const fuse = new Fuse(searchableData, fuseOptions);
        const allResults = new Map();

        for (const term of enrichedTerms) {
            // Décomposer le terme en mots individuels (>= 2 caractères)
            const words = term.trim().split(/\s+/).filter(w => w.length >= 2);

            if (words.length <= 1) {
                // Recherche simple si un seul mot
                fuse.search(term).forEach(r => {
                    const key = `${r.item.categorieValue}-${r.item.sousCategorieValue}`;
                    if (!allResults.has(key) || allResults.get(key).score > r.score) {
                        allResults.set(key, r);
                    }
                });
            } else {
                // Recherche multi-mots : chaque mot doit matcher, on combine les scores
                const resultsByWord = words.map(word => {
                    const res = fuse.search(word);
                    const map = new Map();
                    res.forEach(r => {
                        const key = `${r.item.categorieValue}-${r.item.sousCategorieValue}`;
                        map.set(key, r.score);
                    });
                    return map;
                });

                // Intersecter : ne garder que les items qui matchent TOUS les mots
                const [firstMap, ...restMaps] = resultsByWord;
                firstMap.forEach((score, key) => {
                    const allMatch = restMaps.every(m => m.has(key));
                    if (allMatch) {
                        // Score combiné = moyenne des scores de chaque mot
                        const totalScore = restMaps.reduce((sum, m) => sum + m.get(key), score);
                        const combinedScore = totalScore / words.length;

                        // Bonus si le dernier mot est un préfixe du label (ex: "ch" dans "cheville")
                        const lastWord = words[words.length - 1];
                        const item = searchableData.find(d =>
                            `${d.categorieValue}-${d.sousCategorieValue}` === key
                        );
                        const normalize = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                        const labelNorm = normalize(item?.searchText || '');
                        const prefixBonus = labelNorm.split(/\s+/).some(w => w.startsWith(lastWord)) ? 0.8 : 1.0;

                        const finalScore = combinedScore * prefixBonus;

                        if (!allResults.has(key) || allResults.get(key).score > finalScore) {
                            allResults.set(key, { item, score: finalScore });
                        }
                    }
                });
            }
        }

        const sortedResults = Array.from(allResults.values()).sort((a, b) => a.score - b.score);

        const topMatches = sortedResults.slice(0, 5).map(result => ({
            categorieValue: result.item.categorieValue,
            categorieLabel: result.item.categorieLabel,
            sousCategorieValue: result.item.sousCategorieValue,
            sousCategorieLabel: result.item.sousCategorieLabel,
            score: result.score
        }));

        console.log('[AATI Search] Top 5 résultats:', topMatches);
        return topMatches;
    }
    // Fonction pour sélectionner un motif
    function selectMotif(categorieValue, sousCategorieValue) {
        const selectCategories = document.querySelector(selecteurCategories);

        if (!selectCategories) {
            console.error('[AATI Search] Sélecteurs non trouvés');
            return false;
        }

        // Sélectionner la catégorie
        selectCategories.value = categorieValue;
        selectCategories.dispatchEvent(new Event('change', { bubbles: true }));

        // Attendre un court instant puis sélectionner la sous-catégorie
        setTimeout(() => {
            const selectSousCategories = document.querySelector(selecteurSousCategories);
            selectSousCategories.value = sousCategorieValue;
            selectSousCategories.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('[AATI Search] Sélection effectuée');
        }, 150);

        return true;
    }

    // Créer et insérer le champ de recherche
    waitForElement({
        selector: '#form1 > div.flex-box > div > dmp-aati-form > div > div:nth-child(2) > div.flexColStart > div:nth-child(1) > div.frameContent > div.flexColStart.mt10 > div.chapter.mt10',
        callback: function () {
            const selectCategories = document.querySelector(selecteurCategories);
            if (!selectCategories) return;

            // Vérifier si le champ existe déjà
            if (document.getElementById('aati-quick-search')) return;

            // Créer le conteneur du champ de recherche
            const searchContainer = document.createElement('div');
            searchContainer.style.cssText = 'margin-bottom: 10px; padding: 10px; background: #f0f8ff; border-radius: 5px; border: 2px solid #4a90e2;';

            const searchLabel = document.createElement('label');
            searchLabel.textContent = '🔍 Recherche rapide de motif : ';
            searchLabel.title = 'Recherche rapide et floue (essaye d\'être tolérant aux fautes de frappe) parmi les motifs d\'arrêt de travail AATI. Utilise également des synonymes médicaux.';
            searchLabel.style.cssText = 'font-weight: bold; margin-right: 10px; color: #333;';

            const searchInput = document.createElement('input');
            searchInput.id = 'aati-quick-search';
            searchInput.type = 'text';
            searchInput.placeholder = 'Ex: fracture cote, grippe, lombalgie, poumon...';
            searchInput.style.cssText = 'width: 400px; padding: 8px; font-size: 14px; border: 1px solid #ccc; border-radius: 4px;';
            searchInput.tabIndex = 1;

            const resultsContainer = document.createElement('div');
            resultsContainer.id = 'aati-search-results';
            resultsContainer.style.cssText = 'margin-top: 10px;';

            // Gestionnaire de recherche avec debounce
            let searchTimeout;
            searchInput.addEventListener('input', async function (e) {
                clearTimeout(searchTimeout);
                const searchTerm = e.target.value;

                if (searchTerm.trim().length < 2) {
                    resultsContainer.innerHTML = '';
                    return;
                }

                resultsContainer.innerHTML = '<span style="color: #999; font-style: italic;">⏳ Recherche...</span>';

                searchTimeout = setTimeout(async () => {
                    const matches = await searchMotifs(searchTerm);

                    if (matches.length > 0) {
                        // Créer la liste des résultats
                        resultsContainer.innerHTML = '';

                        matches.forEach((match, index) => {
                            const resultItem = document.createElement('div');
                            resultItem.tabIndex = 2 + index;
                            resultItem.style.cssText = `
                                padding: 8px 12px;
                                margin: 5px 0;
                                background: ${index === 0 ? '#d4edda' : '#ffffff'};
                                border: 2px solid ${index === 0 ? '#28a745' : '#ccc'};
                                border-radius: 4px;
                                cursor: pointer;
                                transition: all 0.2s;
                                font-size: 13px;
                            `;

                            resultItem.innerHTML = `
                                <strong>${index === 0 ? '✓ ' : ''}${match.sousCategorieLabel}</strong>
                                <span style="color: #666; font-size: 11px; margin-left: 10px;">(${match.categorieLabel})</span>
                            `;

                            // Effet hover
                            resultItem.addEventListener('mouseenter', function () {
                                this.style.background = '#e3f2fd';
                                this.style.borderColor = '#4a90e2';
                            });

                            resultItem.addEventListener('mouseleave', function () {
                                this.style.background = index === 0 ? '#d4edda' : '#ffffff';
                                this.style.borderColor = index === 0 ? '#28a745' : '#ccc';
                            });

                            // Effet focus (pour navigation clavier)
                            resultItem.addEventListener('focus', function () {
                                this.style.background = '#e3f2fd';
                                this.style.borderColor = '#4a90e2';
                                this.style.outline = '3px solid #4a90e2';
                            });

                            resultItem.addEventListener('blur', function () {
                                const isSelected = this.querySelector('strong').textContent.startsWith('✓');
                                this.style.background = isSelected ? '#d4edda' : '#ffffff';
                                this.style.borderColor = isSelected ? '#28a745' : '#ccc';
                                this.style.outline = 'none';
                            });

                            // Gestionnaire de clic et touche Entrée
                            const selectThisMotif = function () {
                                selectMotif(match.categorieValue, match.sousCategorieValue);
                                recordMetrics({ clicks: 2, drags: 2 });

                                // Mise à jour visuelle
                                resultsContainer.querySelectorAll('div').forEach(div => {
                                    div.style.background = '#ffffff';
                                    div.style.borderColor = '#ccc';
                                    div.querySelector('strong').textContent = div.querySelector('strong').textContent.replace('✓ ', '');
                                });
                                resultItem.style.background = '#d4edda';
                                resultItem.style.borderColor = '#28a745';
                                resultItem.querySelector('strong').textContent = '✓ ' + match.sousCategorieLabel;
                            };

                            resultItem.addEventListener('click', selectThisMotif);

                            resultItem.addEventListener('keydown', function (e) {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    selectThisMotif();
                                }
                            });

                            resultsContainer.appendChild(resultItem);
                        });

                        // Sélectionner automatiquement le premier résultat
                        selectMotif(matches[0].categorieValue, matches[0].sousCategorieValue);
                        recordMetrics({ clicks: 2, drags: 2 });

                    } else {
                        resultsContainer.innerHTML = '<span style="color: #dc3545; font-style: italic;">✗ Aucun résultat</span>';
                    }
                }, 300); // Debounce de 300ms
            });

            // Assembler les éléments
            searchContainer.appendChild(searchLabel);
            searchContainer.appendChild(searchInput);
            searchContainer.appendChild(resultsContainer);

            // Insérer avant les sélecteurs de catégories
            const flexColumn = selectCategories.closest('.flexColumn');
            if (flexColumn && flexColumn.parentElement) {
                flexColumn.parentElement.insertBefore(searchContainer, flexColumn);
                console.log('[AATI Search] Champ de recherche ajouté');

                // Auto-focus sur le champ de recherche
                setTimeout(() => searchInput.focus(), 200);
            }
        },
        justOnce: true,
        triggerOnInit: true
    });
});


addTweak('/FolderMedical/Aati.aspx', '*aatiSortMotifsAlphabetically', function () {
    const selecteurCategories = '.flexColumn select.entry';
    const selecteurSousCategories = '.flexColumn select.entry.ml10';

    // Fonction de tri des sous-catégories
    function trierSousCategories(selectSousCategories) {
        // Sauvegarder la valeur actuellement sélectionnée
        const selectedValue = selectSousCategories.value;

        // Extraire et trier les options
        const optionsArray = Array.from(selectSousCategories.options);
        optionsArray.sort((a, b) => a.text.localeCompare(b.text));

        // Méthode non-destructive : retirer les options une par une
        while (selectSousCategories.options.length > 0) {
            selectSousCategories.remove(0);
        }

        // Réajouter les options triées
        optionsArray.forEach(option => selectSousCategories.add(option));

        // Restaurer la valeur sélectionnée si elle existe toujours
        if (selectedValue && Array.from(selectSousCategories.options).some(opt => opt.value === selectedValue)) {
            selectSousCategories.value = selectedValue;
        }

        console.log('[aatiSortMotifsAlphabetically] Sous-catégories triées alphabétiquement');
    }

    // Observer les changements du select des sous-catégories (ajout initial)
    waitForElement({
        selector: selecteurSousCategories,
        callback: function (elements) {
            trierSousCategories(elements[0]);
        },
        justOnce: false
    });

    // Observer les changements du select des catégories pour retrier après changement
    waitForElement({
        selector: selecteurCategories,
        callback: function (elements) {
            const selectCategories = elements[0];

            selectCategories.addEventListener('change', function () {
                // Attendre que les sous-catégories soient rechargées
                setTimeout(() => {
                    const selectSousCategories = document.querySelector(selecteurSousCategories);
                    if (selectSousCategories && selectSousCategories.options.length > 0) {
                        trierSousCategories(selectSousCategories);
                    }
                }, 200); // Délai pour laisser le temps au DOM de se mettre à jour
            });
        },
        justOnce: true
    });
});