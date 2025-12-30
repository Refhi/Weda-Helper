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

    waitForElement({ selector: selecteurBoutonAT, justOnce: true, callback: processButton });
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
            }, 500); // essai avec un délai de 500ms
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
        const categories = selectCategories.querySelectorAll('option');

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

                if (result.motifsAATI && dataAge < maxAge) {
                    console.log(`[AATI] motifsAATI présents (âge: ${Math.floor(dataAge / (24 * 60 * 60 * 1000))} jours), extraction sautée.`);
                    return;
                }
                console.log('[AATI] Données absentes ou trop anciennes, extraction lancée.');
                sendWedaNotifAllTabs({
                    message: "Extraction des motifs d'arrêt de travail AATI en cours... (a lieu une seule fois toutes les semaines pour faciliter la recherche de motifs rapide)",
                });

                extractAATIMotifs();
            }, 500);
        },
        justOnce: true
    });
});

// Ajout d'un champ de recherche rapide pour les motifs d'arrêt de travail
addTweak('/FolderMedical/Aati.aspx', 'autoAATI', function () {
    const selecteurCategories = '.flexColumn select.entry';
    const selecteurSousCategories = '.flexColumn select.entry.ml10';

    // Fonction pour normaliser une chaîne (supprime accents, met en minuscule)
    function normalizeString(str) {
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    }

    // Fonction de recherche floue - calcule un score de correspondance
    function fuzzyMatch(needle, haystack) {
        needle = normalizeString(needle);
        haystack = normalizeString(haystack);

        // Si correspondance exacte
        if (haystack.includes(needle)) {
            return 1000 - haystack.indexOf(needle); // Priorité aux matches au début
        }

        // Recherche avec mots séparés
        const needleWords = needle.split(/\s+/).filter(w => w.length > 0);
        let score = 0;

        for (const word of needleWords) {
            if (haystack.includes(word)) {
                score += 100;
            } else {
                // Recherche fuzzy lettre par lettre
                let lastIndex = -1;
                let consecutiveMatches = 0;
                let wordScore = 0;

                for (const char of word) {
                    const index = haystack.indexOf(char, lastIndex + 1);
                    if (index > lastIndex) {
                        consecutiveMatches++;
                        wordScore += consecutiveMatches * 2; // Bonus pour lettres consécutives
                        lastIndex = index;
                    } else {
                        consecutiveMatches = 0;
                    }
                }

                if (wordScore > 0) {
                    score += wordScore;
                }
            }
        }

        return score;
    }

    // Fonction pour rechercher dans les motifs
    async function searchMotifs(searchTerm) {
        if (!searchTerm || searchTerm.trim().length < 2) {
            return null;
        }

        // Récupérer les motifs depuis le storage
        const result = await chrome.storage.local.get(['motifsAATI']);
        if (!result.motifsAATI) {
            console.log('[AATI Search] Aucun motif disponible');
            return null;
        }

        const motifs = result.motifsAATI;
        let bestMatch = null;
        let bestScore = 0;

        // Parcourir toutes les catégories et sous-catégories
        for (const [categorieValue, categorieData] of Object.entries(motifs)) {
            for (const sousCategorie of categorieData.sousCategories) {
                // Rechercher dans le label et le title
                const searchText = `${sousCategorie.label} ${sousCategorie.title}`;
                const score = fuzzyMatch(searchTerm, searchText);

                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = {
                        categorieValue: categorieValue,
                        categorieLabel: categorieData.label,
                        sousCategorieValue: sousCategorie.value,
                        sousCategorieLabel: sousCategorie.label,
                        score: score
                    };
                }
            }
        }

        console.log('[AATI Search] Meilleur résultat:', bestMatch);
        return bestMatch;
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
            searchLabel.style.cssText = 'font-weight: bold; margin-right: 10px; color: #333;';

            const searchInput = document.createElement('input');
            searchInput.id = 'aati-quick-search';
            searchInput.type = 'text';
            searchInput.placeholder = 'Ex: fracture cote, grippe, lombalgie...';
            searchInput.style.cssText = 'width: 400px; padding: 8px; font-size: 14px; border: 1px solid #ccc; border-radius: 4px;';

            const resultInfo = document.createElement('span');
            resultInfo.id = 'aati-search-result';
            resultInfo.style.cssText = 'margin-left: 15px; font-size: 12px; color: #666; font-style: italic;';

            // Gestionnaire de recherche avec debounce
            let searchTimeout;
            searchInput.addEventListener('input', async function (e) {
                clearTimeout(searchTimeout);
                const searchTerm = e.target.value;

                if (searchTerm.trim().length < 2) {
                    resultInfo.textContent = '';
                    return;
                }

                resultInfo.textContent = '⏳ Recherche...';
                resultInfo.style.color = '#999';

                searchTimeout = setTimeout(async () => {
                    const match = await searchMotifs(searchTerm);

                    if (match && match.score > 0) {
                        resultInfo.textContent = `✓ Trouvé: ${match.sousCategorieLabel}`;
                        resultInfo.style.color = '#28a745';
                        selectMotif(match.categorieValue, match.sousCategorieValue);
                        recordMetrics({ clicks: 2, drags: 2 });
                    } else {
                        resultInfo.textContent = '✗ Aucun résultat';
                        resultInfo.style.color = '#dc3545';
                    }
                }, 300); // Debounce de 300ms
            });

            // Assembler les éléments
            searchContainer.appendChild(searchLabel);
            searchContainer.appendChild(searchInput);
            searchContainer.appendChild(resultInfo);

            // Insérer avant les sélecteurs de catégories
            const flexColumn = selectCategories.closest('.flexColumn');
            if (flexColumn && flexColumn.parentElement) {
                flexColumn.parentElement.insertBefore(searchContainer, flexColumn);
                console.log('[AATI Search] Champ de recherche ajouté');

                // Auto-focus sur le champ de recherche
                setTimeout(() => searchInput.focus(), 200);
            }
        },
        justOnce: true
    });
});