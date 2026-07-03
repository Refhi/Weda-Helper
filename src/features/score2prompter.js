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
addTweak('/FolderMedical/ConsultationForm.aspx', '*autoScore2', function () {
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
            score2Button.title = 'Calculer le SCORE2 (Weda-Helper)';
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
                await calculateScore2();
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
                    "Low": "Faible risque : Belgique, Danemark, France, Israël, Luxembourg, Norvège, Espagne, Suisse, Pays-Bas et Royaume-Uni",
                    "Moderate": "Risque modéré : Autriche, Chypre, Finlande, Allemagne, Grèce, Islande, Irlande, Italie, Malte, Portugal, Saint-Marin, Slovénie et Suède",
                    "High": "Risque élevé : Albanie, Bosnie-Herzégovine, Croatie, Estonie, Hongrie, Kazakhstan, Pologne, Slovaquie et Turquie",
                    "Very high": "Risque très élevé : Algérie, Arménie, Azerbaïdjan, Biélorussie, Bulgarie, Égypte, Géorgie, Kirghizistan, Lettonie, Liban, Libye, Lituanie, Monténégro, Maroc, République de Moldova, Roumanie, Fédération de Russie, Serbie, Syrie, TFYR (Macédoine), Tunisie, Ukraine et Ouzbékistan"
                },
                description: 'Région de risque pour le calcul du SCORE2 (Low, Moderate, High, Very high)'
            },
            age: {
                possibleValues: [40, 89],
            },
            gender: {
                possibleValues: ['male', 'female'],
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

        // Demander les valeurs manquantes à l'utilisateur
        const allValuesProvided = await promptMissingValues(SCORE2_PARAMS);
        if (!allValuesProvided) {
            console.log('[autoScore2] Calcul annulé - valeurs manquantes');
            return; // Sortir si l'utilisateur annule
        }

        console.log('[autoScore2] Toutes les valeurs sont disponibles :', SCORE2_PARAMS);

        console.log('[autoScore2] Toutes les valeurs sont disponibles, calcul en cours...');


        // TODO: Calculer le score2
        // TODO: Afficher le score2 dans le champ de texte correspondant
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
     * Demande à l'utilisateur les valeurs manquantes via une boîte de dialogue custom
     * Regroupe tous les champs manquants dans un seul formulaire
     */
    async function promptMissingValues(params) {
        console.log('[autoScore2] Vérification des valeurs manquantes');
        
        const missingParams = [];
        
        // Identifier les paramètres sans valeur
        for (const [paramName, paramConfig] of Object.entries(params)) {
            // Skip classify (pas une vraie valeur à remplir)
            if (paramName === 'classify') continue;
            
            // Vérifier si la valeur est définie et valide
            if (paramConfig.value === undefined || paramConfig.value === null || paramConfig.value === '') {
                missingParams.push(paramName);
            }
        }
        
        if (missingParams.length === 0) {
            console.log('[autoScore2] ✓ Toutes les valeurs sont présentes');
            return true;
        }
        
        console.log('[autoScore2] Valeurs manquantes :', missingParams);
        
        // Créer et afficher le modal
        const result = await showMissingValuesModal(missingParams, params);
        
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
                background: #2196F3;
                color: white;
                padding: 16px 20px;
                font-size: 18px;
                font-weight: bold;
            `;
            header.textContent = `⚕️ Calcul SCORE2 - Valeurs manquantes (${missingParams.length})`;
            
            // Body (scrollable)
            const body = document.createElement('div');
            body.style.cssText = `
                padding: 20px;
                overflow-y: auto;
                flex: 1;
            `;
            
            // Générer les champs pour chaque paramètre manquant
            const fields = {};
            missingParams.forEach(paramName => {
                const paramConfig = params[paramName];
                const fieldContainer = createFieldForParam(paramName, paramConfig);
                body.appendChild(fieldContainer);
                
                // Stocker la référence au champ input/select
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
        
        // Informations complémentaires
        const info = document.createElement('div');
        info.style.cssText = `
            font-size: 12px;
            color: #666;
            margin-bottom: 10px;
            line-height: 1.4;
        `;
        
        let infoText = '';
        
        // Keywords recherchés
        if (paramConfig.itemsKeywords) {
            infoText += `🔍 Mots-clés cherchés : ${paramConfig.itemsKeywords.join(', ')}\n`;
        }
        
        // Unité attendue
        if (paramConfig.unit) {
            infoText += `📏 Unité : ${paramConfig.unit}`;
            if (paramConfig.conversion) {
                infoText += ` (conversion depuis ${paramConfig.conversion.from} possible)`;
            }
            infoText += '\n';
        }
        
        // Range ou valeurs possibles
        if (Array.isArray(paramConfig.possibleValues)) {
            if (paramConfig.possibleValues.length === 2 && 
                typeof paramConfig.possibleValues[0] === 'number') {
                infoText += `📊 Valeur attendue : ${paramConfig.possibleValues[0]} - ${paramConfig.possibleValues[1]}`;
            }
        }
        
        info.textContent = infoText;
        info.style.whiteSpace = 'pre-line';
        
        // Champ de saisie
        let inputElement;
        
        // Boutons radio pour les choix multiples avec simplifiedValues
        if (paramConfig.simplifiedValues) {
            const radioContainer = document.createElement('div');
            radioContainer.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 12px;
            `;
            
            const radioGroup = `radio_${paramName}_${Date.now()}`;
            let isFirst = true;
            
            // Créer un bouton radio pour chaque option
            for (const [value, description] of Object.entries(paramConfig.simplifiedValues)) {
                const radioWrapper = document.createElement('label');
                radioWrapper.style.cssText = `
                    display: flex;
                    align-items: flex-start;
                    cursor: pointer;
                    padding: 10px;
                    border: 1px solid ${isFirst ? '#2196F3' : '#ddd'};
                    border-radius: 4px;
                    transition: background-color 0.2s;
                    background-color: ${isFirst ? '#e3f2fd' : 'white'};
                `;
                radioWrapper.onmouseover = () => radioWrapper.style.backgroundColor = '#f5f5f5';
                radioWrapper.onmouseout = () => {
                    if (!radioWrapper.querySelector('input').checked) {
                        radioWrapper.style.backgroundColor = 'white';
                    }
                };
                
                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = radioGroup;
                radio.value = value;
                radio.checked = isFirst; // Cocher le premier par défaut
                radio.style.cssText = `
                    margin-right: 10px;
                    margin-top: 3px;
                    flex-shrink: 0;
                `;
                
                // Gestion du changement de sélection
                radio.onchange = () => {
                    // Retirer le fond de tous les wrappers
                    radioContainer.querySelectorAll('label').forEach(label => {
                        label.style.backgroundColor = 'white';
                        label.style.borderColor = '#ddd';
                    });
                    // Mettre en évidence le sélectionné
                    if (radio.checked) {
                        radioWrapper.style.backgroundColor = '#e3f2fd';
                        radioWrapper.style.borderColor = '#2196F3';
                    }
                };
                
                const textContent = document.createElement('div');
                textContent.style.cssText = `
                    flex: 1;
                    font-size: 14px;
                    line-height: 1.4;
                `;
                textContent.textContent = description;
                
                radioWrapper.appendChild(radio);
                radioWrapper.appendChild(textContent);
                radioContainer.appendChild(radioWrapper);
                
                // Stocker le premier radio comme inputElement pour la validation
                if (isFirst) {
                    inputElement = radio;
                    isFirst = false;
                }
            }
            
            container.appendChild(label);
            if (infoText) {
                container.appendChild(info);
            }
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
            
            container.appendChild(label);
            if (infoText) {
                container.appendChild(info);
            }
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
            if (infoText) {
                container.appendChild(info);
            }
            container.appendChild(inputElement);
        }
        
        return container;
    }
});