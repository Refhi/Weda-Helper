/**
 * @file score2prompter.js
 * @description Ce fichier contient le nécessaire pour calculer le SCORE2
 * @depend src/utils/score2handler.js
 * @depend src/utils/patientInfo.js
 * @depend src/utils/suiviItems.js
 * @depend src/utils/waitForElement.js
 * @depend src/utils/addTweak.js
 * @depend src/utils/getCurrentPatientId.js
 * 
 */
addTweak('/FolderMedical/ConsultationForm.aspx', 'autoScore2', function () {
    waitForElement({
        selector: '#ContentPlaceHolder1_ButtonSuiviPreference',
        triggerOnInit: true,
        callback: function (elements) {
            const suiviPrefButton = elements[0];
            console.log('[autoScore2] Bouton de préférences détecté, ajout du bouton SCORE2');        

            
            // Créer le nouveau bouton SCORE2
            const score2Button = document.createElement('input');
            score2Button.type = 'button';
            score2Button.value = 'SCORE2';
            score2Button.id = 'WedaHelper_ButtonScore2';
            score2Button.className = 'buttonheader';
            score2Button.title = 'Calculer le SCORE2 (Weda-Helper). Récupère automatiquement les valeurs disponibles (items de suivi, antécédents, résultats d\'examens) et vous demande de compléter le reste. Aller dans les options de Weda-Helper pour désactiver ce bouton si nécessaire.';
            score2Button.style.width = 'auto';
            score2Button.style.cssFloat = 'right';

            // Réduire la largeur du bouton existant selon la place restante
            suiviPrefButton.style.width = 'auto';
            suiviPrefButton.style.cssFloat = 'left';
            
            // Insérer le bouton après celui des préférences
            suiviPrefButton.parentNode.insertBefore(score2Button, suiviPrefButton.nextSibling);
            
            // Ajouter un br pour éviter les problèmes de float
            const clearDiv = document.createElement('div');
            clearDiv.style.clear = 'both';
            score2Button.parentNode.insertBefore(clearDiv, score2Button.nextSibling);
            
            // Attacher l'événement de clic
            score2Button.addEventListener('click', async function() {
                console.log('[autoScore2] Bouton SCORE2 cliqué, début du calcul');
                const titreInitial = score2Button.title;
                score2Button.value = '⏳ SCORE2...';
                score2Button.disabled = true;
                try {
                    await calculateScore2();
                } finally {
                    score2Button.value = 'SCORE2';
                    score2Button.title = titreInitial;
                    score2Button.disabled = false;
                }
            });
            
            console.log('[autoScore2] Bouton SCORE2 ajouté avec succès');
        }
    });

    /**
     * Fonction principale de calcul du SCORE2
     */
    async function calculateScore2() {
        /**
         * Configuration détaillée des paramètres SCORE2    
         * possibleValues : tableau des valeurs possibles pour chaque paramètre
         * unit : unité de mesure pour le paramètre (si applicable)
         * itemsKeywords : mots-clés pour rapprocher les items de suivi avec ce paramètre
         * conversion : objet définissant la conversion d'unités si nécessaire (from, factor)
         * description : description du paramètre, utilisé pour le prompt si la valeur est manquante
         */
        const SCORE2_PARAMS = {
            riskRegion: {
                possibleValues : ['Low', 'Moderate', 'High', 'Very high'],
                simplifiedValues: {
                    "Low": "Faible",
                    "Moderate": "Modéré",
                    "High": "Élevé",
                    "Very high": "Très élevé"
                },
                detailValues: {
                    "Low": "Belgique, Danemark, France, Israël, Luxembourg, Norvège, Espagne, Suisse, Pays-Bas, Royaume-Uni",
                    "Moderate": "Autriche, Chypre, Finlande, Allemagne, Grèce, Islande, Irlande, Italie, Malte, Portugal, Saint-Marin, Slovénie, Suède",
                    "High": "Albanie, Bosnie-Herzégovine, Croatie, Estonie, Hongrie, Kazakhstan, Pologne, Slovaquie, Turquie",
                    "Very high": "Algérie, Arménie, Azerbaïdjan, Biélorussie, Bulgarie, Égypte, Géorgie, Lettonie, Liban, Libye, Lituanie, Monténégro, Maroc, Moldova, Roumanie, Russie, Serbie, Syrie, Macédoine, Tunisie, Ukraine, Ouzbékistan"
                },
                description: 'Région de risque',
                value: 'Low'
            },
            age: {
                possibleValues: [40, 89],
                description: 'Âge du patient'
            },
            gender: {
                possibleValues: ['male', 'female'],
                simplifiedValues: {
                    'male': 'Homme',
                    'female': 'Femme'
                },
                description: 'Sexe du patient'
            },
            smoker: {
                possibleValues: [0, 1],
                itemsKeywords: ['tabac', 'fumeur'],
                simplifiedValues: {
                    0: 'Non-fumeur',
                    1: 'Fumeur'
                },
                description: 'Statut tabagique du patient'
            },
            systolicBp: {
                possibleValues: [30, 350],
                unit: 'mmHg',
                itemsKeywords: ['PAS', 'tension systolique', 'TAS'],
                description: 'Pression artérielle systolique du patient'
            },
            diabetes: {
                possibleValues: [0, 1],
                itemsKeywords: ['diabète', 'DT2'],
                simplifiedValues: {
                    0: 'Non-diabétique',
                    1: 'Diabétique'
                },
                description: 'Patient diabétique ou non'
            },
            totalChol: {
                possibleValues: [0, 15],
                unit: 'mmol/L',
                itemsKeywords: ['cholestérol total', 'CT'],
                conversion: { from: 'g/L', factor: 2.586 },
                description: 'Cholestérol total du patient'
            },
            totalHdl: {
                possibleValues: [0, 15],
                unit: 'mmol/L',
                itemsKeywords: ['HDL', 'HDL-C'],
                conversion: { from: 'g/L', factor: 2.586 },
                description: 'Cholestérol HDL du patient'
            },
            classify: {
                value: false
            }
        };

        // Récupération des valeurs nécessaires
        const patientInfo = await getPatientInfo(getCurrentPatientId());
        
        // Age
        SCORE2_PARAMS.age.value = getPatientAge(patientInfo);

        // Genre
        SCORE2_PARAMS.gender.value = getPatientGender(patientInfo);

        // Gestion de toutes les autres valeurs via les items de suivi
        const suiviItems = getSuiviItems();
        console.log('[autoScore2] Suivi items récupérés :', suiviItems);

        // Rapprochement des items de suivi avec les paramètres SCORE2
        matchSuiviItemsToParams(suiviItems, SCORE2_PARAMS);
        console.log('[autoScore2] Paramètres après rapprochement :', SCORE2_PARAMS);

        // Complément des valeurs encore manquantes via l'historique du patient (dataScrapper)
        try {
            await fillMissingValuesFromHistory(SCORE2_PARAMS);
        } catch (error) {
            console.warn('[autoScore2] Échec de la récupération de l\'historique patient, poursuite sans ces données', error);
        }
        console.log('[autoScore2] Paramètres après complément par l\'historique :', SCORE2_PARAMS);

        // Demander les valeurs manquantes à l'utilisateur
        const allValuesProvided = await promptMissingValues(SCORE2_PARAMS);
        if (!allValuesProvided) {
            console.log('[autoScore2] Calcul annulé - valeurs manquantes');
            return; // Sortir si l'utilisateur annule
        }

        console.log('[autoScore2] Toutes les valeurs sont disponibles :', SCORE2_PARAMS);

        console.log('[autoScore2] Toutes les valeurs sont disponibles, calcul en cours...');


        // Calculer le score2
        const score2Result = SCORE2(
            SCORE2_PARAMS.riskRegion.value,
            SCORE2_PARAMS.age.value,
            SCORE2_PARAMS.gender.value,
            SCORE2_PARAMS.smoker.value,
            SCORE2_PARAMS.systolicBp.value,
            SCORE2_PARAMS.diabetes.value,
            SCORE2_PARAMS.totalChol.value,
            SCORE2_PARAMS.totalHdl.value,
            SCORE2_PARAMS.classify.value
        );
        console.log('[autoScore2] Résultat du calcul SCORE2 :', score2Result, "%");
        
        // Afficher le résultat dans un modal
        showScore2ResultModal(score2Result, SCORE2_PARAMS);
    }

    // Fonctions utilitaires
    function getPatientAge(patientInfo) {
        const ddn = patientInfo.dateOfBirth.date;
        const [day, month, year] = ddn.split('/').map(Number);
        const DDN = new Date(year, month - 1, day);
        const today = new Date();
        let age = today.getFullYear() - DDN.getFullYear();
        const birthdayThisYear = new Date(today.getFullYear(), DDN.getMonth(), DDN.getDate());
        if (today < birthdayThisYear) {
            age--;
        }
        return age;
    }

    function getPatientGender(patientInfo) {
        const gender = patientInfo.sex;
        return gender === 'F' ? 'female' : 'male';
    }

    function getSuiviItems() {
        const items = [];
        let index = 0;
        while (true) {
            const itemElement = document.querySelector(`#ContentPlaceHolder1_SuivisGrid_EditBoxGridSuiviReponse_${index}`);
            if (!itemElement) break;
            
            const unitElement = document.querySelector(`#ContentPlaceHolder1_SuivisGrid_EditBoxGridSuiviUnit_${index}`);
            const labelElement = document.querySelector(`#ContentPlaceHolder1_SuivisGrid_LabelGridSuiviQuestion_${index}`);
            
            let value = itemElement.value;
            let unit = unitElement ? unitElement.value : null;
            let label = labelElement ? labelElement.textContent.trim() : '';
            
            // Si la valeur principale est vide, chercher dans l'historique
            if (!value || !value.trim()) {
                const historiqueElement = document.querySelector(`#ContentPlaceHolder1_SuivisGrid_LabelGridSuiviHistorique_${index}`);
                if (historiqueElement) {
                    const firstHistoryRow = historiqueElement.querySelector('table tbody tr');
                    if (firstHistoryRow) {
                        const tds = firstHistoryRow.querySelectorAll('td');
                        if (tds.length >= 2) {
                            value = tds[1].textContent.trim();
                            if ((!unit || !unit.trim()) && tds.length >= 3) {
                                unit = tds[2].textContent.trim() || null;
                            }
                        }
                    }
                }
            }
            
            items.push({
                label: label,
                value: value,
                unit: unit
            });
            index++;
        }
        return items;
    }

    /**
     * Rapproche les items de suivi avec les paramètres SCORE2 ayant des itemsKeywords
     */
    function matchSuiviItemsToParams(suiviItems, params) {
        console.log('[autoScore2] Début du rapprochement des items de suivi');
        
        for (const [paramName, paramConfig] of Object.entries(params)) {
            if (!paramConfig.itemsKeywords) continue;
            
            console.log(`[autoScore2] Recherche de correspondance pour "${paramName}" avec keywords:`, paramConfig.itemsKeywords);
            
            const matchedItem = suiviItems.find(item => {
                const labelLower = item.label.toLowerCase();
                return paramConfig.itemsKeywords.some(keyword => 
                    labelLower.includes(keyword.toLowerCase())
                );
            });
            
            if (matchedItem && matchedItem.value) {
                let finalValue = parseFloat(matchedItem.value.replace(',', '.'));
                let finalUnit = matchedItem.unit;
                
                // Gestion de la conversion d'unité si nécessaire
                if (paramConfig.conversion && finalUnit) {
                    const unitLower = finalUnit.toLowerCase().trim();
                    const conversionFromLower = paramConfig.conversion.from.toLowerCase().trim();
                    
                    if (unitLower === conversionFromLower) {
                        console.log(`[autoScore2] Conversion de ${finalValue} ${finalUnit} vers ${paramConfig.unit}`);
                        finalValue = finalValue * paramConfig.conversion.factor;
                        finalUnit = paramConfig.unit;
                    }
                }
                
                // Vérification de l'unité attendue
                if (paramConfig.unit && finalUnit && finalUnit.toLowerCase() !== paramConfig.unit.toLowerCase()) {
                    console.warn(`[autoScore2] Unité inattendue pour "${paramName}": trouvé "${finalUnit}", attendu "${paramConfig.unit}"`);
                }
                
                // Assigner la valeur
                paramConfig.value = finalValue;
                paramConfig.foundUnit = finalUnit;
                
                console.log(`[autoScore2] ✓ "${paramName}" = ${finalValue} ${finalUnit || ''} (depuis "${matchedItem.label}")`);
            } else {
                console.log(`[autoScore2] ✗ Aucune correspondance trouvée pour "${paramName}"`);
            }
        }
        
        return params;
    }

    /**
     * Indique si un paramètre SCORE2 n'a pas encore de valeur renseignée.
     */
    function isParamMissing(paramConfig) {
        return paramConfig.value === undefined || paramConfig.value === null || paramConfig.value === '';
    }

    /**
     * Convertit une date au format "JJ/MM/AAAA" en objet Date (minuit), ou null si invalide/absente.
     */
    function parseFrenchDate(dateStr) {
        const match = dateStr?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (!match) return null;
        const [, day, month, year] = match;
        return new Date(Number(year), Number(month) - 1, Number(day));
    }

    /**
     * Un antécédent est considéré comme toujours actif si sa date de fin est absente,
     * ou si elle n'est pas encore dépassée.
     */
    function isAntecedentStillActive(dateFin) {
        const fin = parseFrenchDate(dateFin);
        return !fin || fin >= new Date();
    }

    /**
     * Normalise un texte pour une recherche de mot-clé robuste : accents supprimés,
     * ponctuation neutralisée en espaces, casse uniforme.
     */
    function normalizeForKeywordMatch(text) {
        return normalizeBioLabelKey(text).replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
    }

    /**
     * Vérifie qu'un mot-clé (potentiellement composé de plusieurs mots) est bien présent
     * dans un texte, en bordure de mots (insensible aux accents/casse/ponctuation).
     */
    function textMatchesKeyword(text, keyword) {
        const normalizedText = ` ${normalizeForKeywordMatch(text)} `;
        const normalizedKeyword = ` ${normalizeForKeywordMatch(keyword)} `;
        return normalizedText.includes(normalizedKeyword);
    }

    /**
     * Cherche, parmi les données "antecedents" du dataScrapper, un antécédent encore actif
     * dont le titre correspond à l'un des mots-clés donnés. Les sections dont le titre
     * contient "familial"/"familiaux" sont ignorées (antécédents familiaux, non personnels).
     * @param {Array<Object>} antecedentsData - Données de la catégorie "antecedents" (recoverData)
     * @param {Array<string>} keywords - Mots-clés à rechercher dans le titre de l'antécédent
     * @returns {Object|null} L'antécédent trouvé, ou null
     */
    function findActiveAntecedent(antecedentsData, keywords) {
        for (const section of antecedentsData || []) {
            if (textMatchesKeyword(section.titre || '', 'familial') || textMatchesKeyword(section.titre || '', 'familiaux')) {
                continue;
            }
            for (const item of section.items || []) {
                if (!item.titre) continue;
                const matches = keywords.some(keyword => textMatchesKeyword(item.titre, keyword));
                if (matches && isAntecedentStillActive(item.dates?.fin)) {
                    return item;
                }
            }
        }
        return null;
    }

    /**
     * Cherche, parmi les données "resultatsExamens" du dataScrapper, la première valeur
     * numérique d'une analyse dont le libellé correspond à l'un des mots-clés donnés
     * (le résultat le plus récent en premier). Un filtre optionnel sur l'unité peut être fourni.
     * @param {Array<Object>} resultatsExamensData - Données de la catégorie "resultatsExamens"
     * @param {Array<string>} keywords - Mots-clés à rechercher dans le libellé de l'analyse
     * @param {Function} [unitFilter] - Fonction (unite) => boolean, pour restreindre l'unité acceptée
     * @returns {number|null} La valeur numérique trouvée, ou null
     */
    function findBioValue(resultatsExamensData, keywords, unitFilter = null) {
        for (const day of resultatsExamensData || []) {
            for (const doc of day.documents || []) {
                if (!doc.resultatsBio) continue;
                for (const [label, entries] of Object.entries(doc.resultatsBio)) {
                    if (!keywords.some(keyword => textMatchesKeyword(label, keyword))) continue;
                    for (const entry of entries) {
                        if (entry.valeurNombre === null || entry.valeurNombre === undefined) continue;
                        if (unitFilter && !unitFilter(entry.unite)) continue;
                        return entry.valeurNombre;
                    }
                }
            }
        }
        return null;
    }

    /**
     * Complète les paramètres SCORE2 encore manquants (diabète, tabac, cholestérol total,
     * cholestérol HDL, pression artérielle systolique) en consultant l'historique du patient
     * (antécédents et résultats d'examens) via le dataScrapper. Ne remplace jamais une valeur
     * déjà renseignée par matchSuiviItemsToParams : ne comble que ce qui manque encore.
     * @param {Object} params - SCORE2_PARAMS
     */
    async function fillMissingValuesFromHistory(params) {
        const needsAntecedents = isParamMissing(params.diabetes) || isParamMissing(params.smoker);
        const needsResultatsExamens = isParamMissing(params.totalChol) || isParamMissing(params.totalHdl) || isParamMissing(params.systolicBp);

        if (!needsAntecedents && !needsResultatsExamens) {
            console.log('[autoScore2] Aucune valeur manquante à compléter via l\'historique du patient');
            return;
        }

        console.log('[autoScore2] Récupération de l\'historique du patient (antécédents / résultats d\'examens) pour compléter les valeurs manquantes');
        const historyData = await recoverData({
            fullPage: false,
            categories: ["antecedents", "resultatsExamens"],
        });

        if (needsAntecedents) {
            if (isParamMissing(params.diabetes)) {
                const diabeteAtcd = findActiveAntecedent(historyData.antecedents, ['diabete']);
                if (diabeteAtcd) {
                    params.diabetes.value = 1;
                    console.log(`[autoScore2] ✓ "diabetes" = 1 (antécédent actif trouvé : "${diabeteAtcd.titre}")`);
                } else {
                    params.diabetes.value = 0;
                    console.log('[autoScore2] ✓ "diabetes" = 0 (aucun antécédent actif trouvé, considéré comme non-diabétique)');
                }
            }
            if (isParamMissing(params.smoker)) {
                const tabacAtcd = findActiveAntecedent(historyData.antecedents, ['tabac', 'tabagisme']);
                if (tabacAtcd) {
                    params.smoker.value = 1;
                    console.log(`[autoScore2] ✓ "smoker" = 1 (antécédent actif trouvé : "${tabacAtcd.titre}")`);
                } else {
                    params.smoker.value = 0;
                    console.log('[autoScore2] ✓ "smoker" = 0 (aucun antécédent actif trouvé, considéré comme non-fumeur)');
                }
            }
        }

        if (needsResultatsExamens) {
            const isMmolL = unite => (unite || '').trim().toLowerCase() === 'mmol/l';

            if (isParamMissing(params.totalChol)) {
                const value = findBioValue(historyData.resultatsExamens, ['Cholesterol Total', 'Cholestérol Total', 'Cho. Total'], isMmolL);
                if (value !== null) {
                    params.totalChol.value = value;
                    params.totalChol.foundUnit = 'mmol/L';
                    console.log(`[autoScore2] ✓ "totalChol" = ${value} mmol/L (résultats d'examens)`);
                }
            }
            if (isParamMissing(params.totalHdl)) {
                const value = findBioValue(historyData.resultatsExamens, ['HDL'], isMmolL);
                if (value !== null) {
                    params.totalHdl.value = value;
                    params.totalHdl.foundUnit = 'mmol/L';
                    console.log(`[autoScore2] ✓ "totalHdl" = ${value} mmol/L (résultats d'examens)`);
                }
            }
            if (isParamMissing(params.systolicBp)) {
                const value = findBioValue(historyData.resultatsExamens, ['TAS']);
                if (value !== null) {
                    params.systolicBp.value = value;
                    console.log(`[autoScore2] ✓ "systolicBp" = ${value} (résultats d'examens)`);
                }
            }
        }
    }

    /**
     * Permet à l'utilisateur de vérifier/modifier toutes les valeurs avant le calcul
     * Affiche systématiquement le formulaire, pré-rempli avec les valeurs déjà récupérées
     */
    async function promptMissingValues(params) {
        console.log('[autoScore2] Affichage du formulaire de vérification des valeurs');
        
        const allParams = [];
        
        // Lister tous les paramètres (sauf classify)
        for (const [paramName, paramConfig] of Object.entries(params)) {
            if (paramName === 'classify') continue;
            allParams.push(paramName);
        }
        
        // Créer et afficher le modal avec toutes les valeurs (pré-remplies si disponibles)
        const result = await showMissingValuesModal(allParams, params);
        
        if (result === null) {
            console.log('[autoScore2] ✗ Calcul annulé par l\'utilisateur');
            return false;
        }
        
        // Assigner les valeurs récupérées
        for (const [paramName, value] of Object.entries(result)) {
            params[paramName].value = value;
        }
        
        console.log('[autoScore2] ✓ Toutes les valeurs ont été renseignées');
        return true;
    }
    
    /**
     * Affiche un modal custom pour demander les valeurs manquantes
     */
    function showMissingValuesModal(missingParams, params) {
        return new Promise((resolve) => {
            // Créer l'overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            // Créer le modal
            const modal = document.createElement('div');
            modal.style.cssText = `
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                max-width: 480px;
                max-height: 70vh;
                width: 90%;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            `;
            
            // Header
            const header = document.createElement('div');
            header.style.cssText = `
                background: #2196F3;
                color: white;
                padding: 16px 20px;
                font-size: 18px;
                font-weight: bold;
            `;
            const missingCount = missingParams.filter(p => params[p].value === undefined || params[p].value === null || params[p].value === '').length;
            header.textContent = `⚕️ Calcul SCORE2 - Vérification des valeurs${missingCount > 0 ? ` (${missingCount} manquante${missingCount > 1 ? 's' : ''})` : ''}`;        
            
            // Body (scrollable)
            const body = document.createElement('div');
            body.style.cssText = `
                padding: 20px;
                overflow-y: auto;
                flex: 1;
            `;
            
            // Générer les champs : manquants en premier (légèrement en rouge), puis les autres
            const fields = {};
            const isMissing = p => params[p].value === undefined || params[p].value === null || params[p].value === '';
            const sorted = [...missingParams].sort((a, b) => isMissing(b) - isMissing(a));

            sorted.forEach(paramName => {
                const paramConfig = params[paramName];
                const fieldContainer = createFieldForParam(paramName, paramConfig);
                if (isMissing(paramName)) {
                    fieldContainer.style.background = '#fff5f5';
                    fieldContainer.style.borderLeft = '3px solid #e57373';
                    fieldContainer.style.paddingLeft = '10px';
                    fieldContainer.style.borderRadius = '4px';
                }
                body.appendChild(fieldContainer);

                const inputElement = fieldContainer.querySelector('input, select');
                if (inputElement) {
                    fields[paramName] = inputElement;
                }
            });
            
            // Footer avec boutons
            const footer = document.createElement('div');
            footer.style.cssText = `
                padding: 16px 20px;
                border-top: 1px solid #e0e0e0;
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                background: #f5f5f5;
            `;
            
            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Annuler';
            cancelButton.style.cssText = `
                padding: 8px 20px;
                border: 1px solid #ccc;
                background: white;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            `;
            cancelButton.onmouseover = () => cancelButton.style.background = '#f0f0f0';
            cancelButton.onmouseout = () => cancelButton.style.background = 'white';
            
            const validateButton = document.createElement('button');
            validateButton.textContent = 'Valider et calculer';
            validateButton.style.cssText = `
                padding: 8px 20px;
                border: none;
                background: #4CAF50;
                color: white;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
            `;
            validateButton.onmouseover = () => validateButton.style.background = '#45a049';
            validateButton.onmouseout = () => validateButton.style.background = '#4CAF50';
            
            // Événements des boutons
            cancelButton.onclick = () => {
                document.body.removeChild(overlay);
                resolve(null);
            };
            
            validateButton.onclick = () => {
                // Valider et récupérer les valeurs
                const values = {};
                let isValid = true;
                
                for (const [paramName, inputElement] of Object.entries(fields)) {
                    const paramConfig = params[paramName];
                    let value;
                    
                    // Gérer les boutons radio
                    if (inputElement.type === 'radio') {
                        const radioGroup = inputElement.name;
                        const checkedRadio = document.querySelector(`input[name="${radioGroup}"]:checked`);
                        
                        if (!checkedRadio) {
                            alert(`❌ Le champ "${paramConfig.description || paramName}" est requis.`);
                            inputElement.focus();
                            isValid = false;
                            break;
                        }
                        
                        value = checkedRadio.value;
                        
                        // Convertir en nombre si c'est un nombre
                        if (!isNaN(value) && value !== '') {
                            value = parseFloat(value);
                        }
                        
                        values[paramName] = value;
                    }
                    // Gérer les selects et inputs
                    else {
                        value = inputElement.value;
                        
                        if (!value || value.trim() === '') {
                            alert(`❌ Le champ "${paramConfig.description || paramName}" est requis.`);
                            inputElement.focus();
                            isValid = false;
                            break;
                        }
                        
                        // Valider selon le type
                        if (inputElement.tagName === 'SELECT') {
                            values[paramName] = value;
                        } else {
                            // Pour les inputs numériques
                            const numValue = parseFloat(value.replace(',', '.'));
                            if (isNaN(numValue)) {
                                alert(`❌ "${paramConfig.description || paramName}" doit être un nombre valide.`);
                                inputElement.focus();
                                isValid = false;
                                break;
                            }
                            
                            // Vérifier les limites pour les ranges
                            const possibleValues = paramConfig.possibleValues;
                            if (Array.isArray(possibleValues) && possibleValues.length === 2 &&
                                typeof possibleValues[0] === 'number') {
                                const [min, max] = possibleValues;
                                if (numValue < min || numValue > max) {
                                    alert(`❌ "${paramConfig.description || paramName}" doit être entre ${min} et ${max}.`);
                                    inputElement.focus();
                                    isValid = false;
                                    break;
                                }
                            }
                            
                            values[paramName] = numValue;
                        }
                    }
                }
                
                if (isValid) {
                    document.body.removeChild(overlay);
                    resolve(values);
                }
            };
            
            // Permettre la validation avec Entrée sur le dernier champ
            const lastField = Object.values(fields)[Object.values(fields).length - 1];
            if (lastField) {
                lastField.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        validateButton.click();
                    }
                });
            }
            
            // Assembler le modal
            footer.appendChild(cancelButton);
            footer.appendChild(validateButton);
            modal.appendChild(header);
            modal.appendChild(body);
            modal.appendChild(footer);
            overlay.appendChild(modal);
            
            // Ajouter au DOM
            document.body.appendChild(overlay);
            
            // Focus sur le premier champ
            const firstField = Object.values(fields)[0];
            if (firstField) {
                setTimeout(() => firstField.focus(), 100);
            }
        });
    }
    
    /**
     * Crée un champ de saisie pour un paramètre spécifique
     */
    function createFieldForParam(paramName, paramConfig) {
        const container = document.createElement('div');
        container.style.cssText = `
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px solid #e0e0e0;
        `;
        
        // Label principal
        const label = document.createElement('div');
        label.style.cssText = `
            font-weight: bold;
            font-size: 15px;
            margin-bottom: 8px;
            color: #333;
        `;
        label.textContent = paramConfig.description || paramName;
        
        // Informations secondaires (cachées derrière un ?)
        let infoText = '';
        if (paramConfig.itemsKeywords) {
            infoText += `🔍 Mots-clés recherchés dans les items de suivi (colonne de droite de la consultation) : ${paramConfig.itemsKeywords.join(', ')}\nPour un remplissage automatique, créez un item dont le libellé contient un de ces mots-clés.`;
        }
        if (paramConfig.unit) {
            infoText += `📏 Unité : ${paramConfig.unit}`;
            if (paramConfig.conversion) {
                infoText += ` (conversion depuis ${paramConfig.conversion.from} possible)`;
            }
            infoText += '\n';
        }
        if (Array.isArray(paramConfig.possibleValues) && paramConfig.possibleValues.length === 2 &&
                typeof paramConfig.possibleValues[0] === 'number') {
            infoText += `📊 Valeur attendue : ${paramConfig.possibleValues[0]} - ${paramConfig.possibleValues[1]}`;
        }

        // Bouton ? + tooltip caché
        const infoWrapper = document.createElement('span');
        infoWrapper.style.cssText = 'position: relative; display: inline-block; margin-left: 6px; vertical-align: middle;';

        const infoBtn = document.createElement('span');
        infoBtn.textContent = '?';
        infoBtn.style.cssText = `
            display: inline-flex; align-items: center; justify-content: center;
            width: 16px; height: 16px; border-radius: 50%;
            background: #2196F3; color: white; font-size: 11px; font-weight: bold;
            cursor: pointer; user-select: none;
        `;

        const tooltip = document.createElement('div');
        tooltip.style.cssText = `
            display: none;
            position: fixed;
            background: #333; color: #eee;
            font-size: 12px; line-height: 1.5;
            padding: 8px 10px; border-radius: 6px;
            white-space: pre-line; z-index: 20000;
            min-width: 220px; max-width: 320px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        `;
        tooltip.textContent = infoText || 'Aucune information complémentaire';

        const positionFloatingTooltip = (anchorEl, tooltipEl) => {
            const spacing = 8;
            const anchorRect = anchorEl.getBoundingClientRect();
            const tooltipRect = tooltipEl.getBoundingClientRect();

            let left = anchorRect.right + spacing;
            let top = anchorRect.top - 4;

            if (left + tooltipRect.width > window.innerWidth - spacing) {
                left = Math.max(spacing, anchorRect.left - tooltipRect.width - spacing);
            }

            if (top + tooltipRect.height > window.innerHeight - spacing) {
                top = Math.max(spacing, window.innerHeight - tooltipRect.height - spacing);
            }

            if (top < spacing) {
                top = spacing;
            }

            tooltipEl.style.left = `${left}px`;
            tooltipEl.style.top = `${top}px`;
        };

        const showTooltip = () => {
            if (tooltip.parentNode !== document.body) {
                document.body.appendChild(tooltip);
            }
            tooltip.style.display = 'block';
            positionFloatingTooltip(infoBtn, tooltip);
        };

        const hideTooltip = () => {
            tooltip.style.display = 'none';
        };

        infoBtn.addEventListener('mouseenter', showTooltip);
        infoBtn.addEventListener('mouseleave', hideTooltip);
        infoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (tooltip.style.display === 'none') {
                showTooltip();
            } else {
                hideTooltip();
            }
        });

        infoWrapper.appendChild(infoBtn);
        infoWrapper.appendChild(tooltip);

        // Ajouter le ? à la suite du label
        label.appendChild(infoWrapper);
        
        // Champ de saisie
        let inputElement;
        
        // Boutons radio pour les choix multiples avec simplifiedValues
        if (paramConfig.simplifiedValues) {
            const entries = Object.entries(paramConfig.simplifiedValues);
            const isBinary = entries.length === 2;
            const radioGroup = `radio_${paramName}_${Date.now()}`;
            const existingValue = paramConfig.value !== undefined && paramConfig.value !== null && paramConfig.value !== '' ? String(paramConfig.value) : null;

            const radioContainer = document.createElement('div');
            radioContainer.style.cssText = isBinary
                ? 'display: flex; flex-direction: row; gap: 8px;'
                : 'display: flex; flex-direction: column; gap: 8px;';

            let isFirst = true;

            for (const [value, description] of entries) {
                const isSelected = existingValue !== null ? value === existingValue : isFirst;

                const radioWrapper = document.createElement('label');
                radioWrapper.style.cssText = `
                    display: flex; align-items: center; cursor: pointer;
                    padding: ${isBinary ? '6px 12px' : '8px 10px'};
                    border: 1px solid ${isSelected ? '#2196F3' : '#ddd'};
                    border-radius: 4px;
                    background-color: ${isSelected ? '#e3f2fd' : 'white'};
                    ${isBinary ? 'flex: 1; justify-content: center;' : ''}
                    font-size: 14px; line-height: 1.3;
                `;
                radioWrapper.onmouseover = () => { if (!radioWrapper.querySelector('input').checked) radioWrapper.style.backgroundColor = '#f5f5f5'; };
                radioWrapper.onmouseout = () => { if (!radioWrapper.querySelector('input').checked) radioWrapper.style.backgroundColor = 'white'; };

                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = radioGroup;
                radio.value = value;
                radio.checked = isSelected;
                radio.style.cssText = 'margin-right: 6px; flex-shrink: 0;';

                radio.onchange = () => {
                    radioContainer.querySelectorAll('label').forEach(lbl => {
                        lbl.style.backgroundColor = 'white';
                        lbl.style.borderColor = '#ddd';
                    });
                    if (radio.checked) {
                        radioWrapper.style.backgroundColor = '#e3f2fd';
                        radioWrapper.style.borderColor = '#2196F3';
                    }
                };

                const textSpan = document.createElement('span');

                if (!isBinary && paramConfig.detailValues && paramConfig.detailValues[value]) {
                    // Afficher le label court + ? pour le détail
                    textSpan.textContent = value;

                    const detailWrapper = document.createElement('span');
                    detailWrapper.style.cssText = 'position: relative; display: inline-block; margin-left: 6px; vertical-align: middle;';

                    const detailBtn = document.createElement('span');
                    detailBtn.textContent = '?';
                    detailBtn.style.cssText = `
                        display: inline-flex; align-items: center; justify-content: center;
                        width: 14px; height: 14px; border-radius: 50%;
                        background: #2196F3; color: white; font-size: 10px; font-weight: bold;
                        cursor: pointer; user-select: none;
                    `;

                    const detailTooltip = document.createElement('div');
                    detailTooltip.style.cssText = `
                        display: none; position: fixed;
                        background: #333; color: #eee;
                        font-size: 11px; line-height: 1.4;
                        padding: 6px 8px; border-radius: 6px;
                        white-space: pre-line; z-index: 20000;
                        min-width: 200px; max-width: 300px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    `;
                    detailTooltip.textContent = paramConfig.detailValues[value];

                    const showDetailTooltip = () => {
                        if (detailTooltip.parentNode !== document.body) {
                            document.body.appendChild(detailTooltip);
                        }
                        detailTooltip.style.display = 'block';
                        positionFloatingTooltip(detailBtn, detailTooltip);
                    };

                    const hideDetailTooltip = () => {
                        detailTooltip.style.display = 'none';
                    };

                    detailBtn.addEventListener('mouseenter', showDetailTooltip);
                    detailBtn.addEventListener('mouseleave', hideDetailTooltip);
                    detailBtn.addEventListener('click', (e) => {
                        e.preventDefault(); e.stopPropagation();
                        if (detailTooltip.style.display === 'none') {
                            showDetailTooltip();
                        } else {
                            hideDetailTooltip();
                        }
                    });

                    detailWrapper.appendChild(detailBtn);
                    detailWrapper.appendChild(detailTooltip);
                    textSpan.appendChild(detailWrapper);
                } else {
                    textSpan.textContent = description;
                }

                radioWrapper.appendChild(radio);
                radioWrapper.appendChild(textSpan);
                radioContainer.appendChild(radioWrapper);

                if (isFirst) inputElement = radio;
                isFirst = false;
            }

            container.appendChild(label);
            container.appendChild(radioContainer);
        }
        // Select pour les choix multiples sans simplifiedValues (strings)
        else if (Array.isArray(paramConfig.possibleValues) && 
            typeof paramConfig.possibleValues[0] === 'string') {
            
            inputElement = document.createElement('select');
            inputElement.style.cssText = `
                width: 100%;
                padding: 8px;
                border: 1px solid #ccc;
                border-radius: 4px;
                font-size: 14px;
            `;
            
            // Option par défaut
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = '-- Sélectionner --';
            inputElement.appendChild(defaultOption);
            
            // Options
            paramConfig.possibleValues.forEach(val => {
                const option = document.createElement('option');
                option.value = val;
                option.textContent = val;
                inputElement.appendChild(option);
            });
            
            // Pré-sélectionner la valeur existante
            if (paramConfig.value !== undefined && paramConfig.value !== null && paramConfig.value !== '') {
                inputElement.value = String(paramConfig.value);
            }
            
            container.appendChild(label);
            container.appendChild(inputElement);
        } 
        // Input pour les valeurs numériques
        else {
            inputElement = document.createElement('input');
            inputElement.type = 'text';
            inputElement.style.cssText = `
                width: 100%;
                padding: 8px;
                border: 1px solid #ccc;
                border-radius: 4px;
                font-size: 14px;
                box-sizing: border-box;
            `;
            
            // Pré-remplir avec la valeur existante si disponible
            if (paramConfig.value !== undefined && paramConfig.value !== null && paramConfig.value !== '') {
                inputElement.value = String(paramConfig.value);
            }
            
            // Placeholder selon le type
            if (paramConfig.possibleValues[0] === 0 && paramConfig.possibleValues[1] === 1) {
                inputElement.placeholder = 'Entrez 0 (non) ou 1 (oui)';
            } else if (typeof paramConfig.possibleValues[0] === 'number') {
                const [min, max] = paramConfig.possibleValues;
                inputElement.placeholder = `Entre ${min} et ${max}`;
                if (paramConfig.unit) {
                    inputElement.placeholder += ` ${paramConfig.unit}`;
                }
            }
            
            container.appendChild(label);
            container.appendChild(inputElement);
        }
        
        return container;
    }
    
    /**
     * Met en forme la valeur d'un paramètre SCORE2 pour affichage/copie (libellé simplifié,
     * conversion Homme/Femme, arrondi + unité pour les valeurs numériques).
     * @param {string} key - Clé du paramètre (ex: 'gender', 'totalChol')
     * @param {Object} paramConfig - Configuration du paramètre (SCORE2_PARAMS[key])
     * @returns {string} Valeur formatée pour affichage
     */
    function formatScore2ParamDisplayValue(key, paramConfig) {
        let displayValue = paramConfig.value;

        if (paramConfig.simplifiedValues && paramConfig.simplifiedValues[displayValue]) {
            displayValue = paramConfig.simplifiedValues[displayValue];
        } else if (key === 'gender') {
            displayValue = displayValue === 'male' ? 'Homme' : 'Femme';
        } else if (typeof displayValue === 'number' && paramConfig.unit) {
            displayValue = `${displayValue.toFixed(2)} ${paramConfig.unit}`;
        } else if (typeof displayValue === 'number') {
            displayValue = displayValue.toFixed(2);
        }

        return displayValue;
    }

    /**
     * Construit le texte à copier dans le presse-papier : date/heure de réalisation,
     * résultat du SCORE2 et paramètres utilisés pour le calcul.
     * @param {number} score2Result - Résultat du calcul SCORE2 (%)
     * @param {Object} params - SCORE2_PARAMS
     * @param {Array<{key: string, label: string}>} paramsToDisplay - Paramètres à inclure
     * @returns {string} Texte prêt à être copié
     */
    function buildScore2ClipboardText(score2Result, params, paramsToDisplay) {
        const maintenant = new Date();
        const pad = n => String(n).padStart(2, '0');
        const dateStr = `${pad(maintenant.getDate())}/${pad(maintenant.getMonth() + 1)}/${maintenant.getFullYear()}`;
        const heureStr = `${pad(maintenant.getHours())}:${pad(maintenant.getMinutes())}`;

        const riskCategory = getScore2RiskCategory(params.age.value, score2Result);

        const lignes = [
            `SCORE2 - réalisé le ${dateStr} à ${heureStr}`,
            `Risque cardiovasculaire à 10 ans : ${score2Result.toFixed(1)} % (${riskCategory.message})`,
            '',
        ];

        paramsToDisplay.forEach(({ key, label }) => {
            lignes.push(`${label} : ${formatScore2ParamDisplayValue(key, params[key])}`);
        });

        return lignes.join('\n');
    }

    /**
     * Détermine la catégorie de risque SCORE2 (couleur + message) selon l'âge et le résultat,
     * conformément aux seuils des recommandations ESC 2021.
     * @see https://academic.oup.com/eurheartj/article/42/34/3227/6358713
     * @param {number} age - Âge du patient
     * @param {number} score2Result - Résultat du calcul SCORE2 (%)
     * @returns {{ color: string, background: string, message: string }}
     */
    function getScore2RiskCategory(age, score2Result) {
        let lowThreshold, highThreshold;
        if (age < 50) {
            lowThreshold = 2.5;
            highThreshold = 7.5;
        } else if (age < 70) {
            lowThreshold = 5;
            highThreshold = 10;
        } else {
            lowThreshold = 7.5;
            highThreshold = 15;
        }

        if (score2Result >= highThreshold) {
            return { color: '#c62828', background: '#ffebee', message: 'Risque très élevé' };
        } else if (score2Result >= lowThreshold) {
            return { color: '#e65100', background: '#fff3e0', message: 'Risque élevé' };
        } else {
            return { color: '#2e7d32', background: '#e8f5e9', message: 'Risque faible à modéré' };
        }
    }

    /**
     * Affiche le résultat du calcul SCORE2 dans un modal
     */
    function showScore2ResultModal(score2Result, params) {
        // Créer l'overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        // Créer le modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            max-width: 600px;
            max-height: 80vh;
            width: 90%;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        `;
        
        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            background: #4CAF50;
            color: white;
            padding: 16px 20px;
            font-size: 18px;
            font-weight: bold;
        `;
        header.textContent = '⚕️ Résultat SCORE2';
        
        // Body (scrollable)
        const body = document.createElement('div');
        body.style.cssText = `
            padding: 20px;
            overflow-y: auto;
            flex: 1;
        `;
        
        // Affichage du résultat principal
        const resultContainer = document.createElement('div');
        resultContainer.style.cssText = `
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: #f0f8ff;
            border-radius: 8px;
            border: 2px solid #2196F3;
        `;
        
        const resultLabel = document.createElement('div');
        resultLabel.style.cssText = `
            font-size: 16px;
            color: #666;
            margin-bottom: 10px;
        `;
        resultLabel.textContent = 'Risque cardiovasculaire à 10 ans :';
        
        const resultValue = document.createElement('div');
        resultValue.style.cssText = `
            font-size: 48px;
            font-weight: bold;
            color: #2196F3;
        `;
        resultValue.textContent = `${score2Result.toFixed(1)} %`;

        // Catégorisation du risque (couleur + message) selon l'âge et le résultat
        const riskCategory = getScore2RiskCategory(params.age.value, score2Result);

        const riskBadge = document.createElement('div');
        riskBadge.style.cssText = `
            margin-top: 12px;
            display: inline-block;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 15px;
            font-weight: bold;
            color: ${riskCategory.color};
            background: ${riskCategory.background};
            border: 1px solid ${riskCategory.color};
        `;
        riskBadge.textContent = riskCategory.message;

        const biblioLink = document.createElement('div');
        biblioLink.style.cssText = `
            margin-top: 10px;
            font-size: 12px;
        `;
        const biblioAnchor = document.createElement('a');
        biblioAnchor.href = 'https://academic.oup.com/eurheartj/article/42/34/3227/6358713';
        biblioAnchor.target = '_blank';
        biblioAnchor.rel = 'noopener noreferrer';
        biblioAnchor.textContent = '📖 Biblio (recommandations ESC 2021)';
        biblioAnchor.style.cssText = `
            color: #1976D2;
            text-decoration: none;
        `;
        biblioLink.appendChild(biblioAnchor);
        
        resultContainer.appendChild(resultLabel);
        resultContainer.appendChild(resultValue);
        resultContainer.appendChild(riskBadge);
        resultContainer.appendChild(biblioLink);
        body.appendChild(resultContainer);
        
        // Affichage des paramètres utilisés
        const paramsTitle = document.createElement('div');
        paramsTitle.style.cssText = `
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 15px;
            color: #333;
        `;
        paramsTitle.textContent = '📋 Paramètres utilisés pour le calcul :';
        body.appendChild(paramsTitle);
        
        const paramsContainer = document.createElement('div');
        paramsContainer.style.cssText = `
            display: grid;
            gap: 10px;
        `;
        
        // Liste des paramètres à afficher (sauf classify)
        const paramsToDisplay = [
            { key: 'riskRegion', label: 'Région de risque' },
            { key: 'age', label: 'Âge' },
            { key: 'gender', label: 'Sexe' },
            { key: 'smoker', label: 'Tabagisme' },
            { key: 'systolicBp', label: 'Pression artérielle systolique' },
            { key: 'diabetes', label: 'Diabète' },
            { key: 'totalChol', label: 'Cholestérol total' },
            { key: 'totalHdl', label: 'Cholestérol HDL' }
        ];
        
        paramsToDisplay.forEach(({ key, label }) => {
            const paramConfig = params[key];
            const displayValue = formatScore2ParamDisplayValue(key, paramConfig);
            
            const paramRow = document.createElement('div');
            paramRow.style.cssText = `
                display: flex;
                justify-content: space-between;
                padding: 10px;
                background: #f9f9f9;
                border-radius: 4px;
                font-size: 14px;
            `;
            
            const paramLabel = document.createElement('span');
            paramLabel.style.cssText = `
                font-weight: 500;
                color: #555;
            `;
            paramLabel.textContent = label + ' :';
            
            const paramValue = document.createElement('span');
            paramValue.style.cssText = `
                color: #333;
            `;
            paramValue.textContent = displayValue;
            
            paramRow.appendChild(paramLabel);
            paramRow.appendChild(paramValue);
            paramsContainer.appendChild(paramRow);
        });
        
        body.appendChild(paramsContainer);
        
        // Footer avec bouton de fermeture
        const footer = document.createElement('div');
        footer.style.cssText = `
            padding: 16px 20px;
            border-top: 1px solid #e0e0e0;
            display: flex;
            justify-content: center;
            gap: 12px;
            background: #f5f5f5;
        `;
        
        const copyButton = document.createElement('button');
        copyButton.textContent = '📋 Copier le résultat';
        copyButton.style.cssText = `
            padding: 10px 30px;
            border: none;
            background: #4CAF50;
            color: white;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
        `;
        copyButton.onmouseover = () => copyButton.style.background = '#43a047';
        copyButton.onmouseout = () => copyButton.style.background = '#4CAF50';

        copyButton.onclick = () => {
            const texteACopier = buildScore2ClipboardText(score2Result, params, paramsToDisplay);
            navigator.clipboard.writeText(texteACopier).then(() => {
                const texteOriginal = copyButton.textContent;
                copyButton.textContent = '✓ Copié !';
                setTimeout(() => { copyButton.textContent = texteOriginal; }, 1500);
            }).catch(error => {
                console.error('[autoScore2] Échec de la copie dans le presse-papier', error);
                alert("Impossible de copier le résultat dans le presse-papier.");
            });
        };

        const closeButton = document.createElement('button');
        closeButton.textContent = 'Fermer';
        closeButton.style.cssText = `
            padding: 10px 30px;
            border: none;
            background: #2196F3;
            color: white;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
        `;
        closeButton.onmouseover = () => closeButton.style.background = '#1976D2';
        closeButton.onmouseout = () => closeButton.style.background = '#2196F3';
        
        closeButton.onclick = () => {
            document.body.removeChild(overlay);
        };
        
        // Permettre la fermeture avec Échap
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        // Assembler le modal
        footer.appendChild(copyButton);
        footer.appendChild(closeButton);
        modal.appendChild(header);
        modal.appendChild(body);
        modal.appendChild(footer);
        overlay.appendChild(modal);
        
        // Ajouter au DOM
        document.body.appendChild(overlay);
        
        // Focus sur le bouton de fermeture
        setTimeout(() => closeButton.focus(), 100);
    }
});