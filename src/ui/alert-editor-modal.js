/**
 * @file alert-editor-modal.js
 * @description Interface modale pour éditer les alertes personnalisées de manière guidée
 * 
 * @requires alertes-validator.js (pour la validation)
 * @requires chrome.storage.local (pour récupérer alerteSchema)
 */

/**
 * Liste des icônes Material Icons couramment utilisées
 */
const COMMON_MATERIAL_ICONS = [
  { value: '', label: 'Aucune icône' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Attention' },
  { value: 'error', label: 'Erreur' },
  { value: 'check_circle', label: 'Succès' },
  { value: 'notifications', label: 'Notification' },
  { value: 'campaign', label: 'Annonce' },
  { value: 'priority_high', label: 'Priorité haute' },
  { value: 'report_problem', label: 'Problème' },
  { value: 'dangerous', label: 'Danger' },
  { value: 'health_and_safety', label: 'Santé et sécurité' },
  { value: 'medical_services', label: 'Services médicaux' },
  { value: 'medication', label: 'Médicament' },
  { value: 'vaccines', label: 'Vaccins' },
  { value: 'bloodtype', label: 'Groupe sanguin' },
  { value: 'healing', label: 'Guérison' },
  { value: 'favorite', label: 'Favori' },
  { value: 'local_hospital', label: 'Hôpital' },
  { value: 'emergency', label: 'Urgence' },
  { value: 'coronavirus', label: 'Coronavirus' },
  { value: 'sick', label: 'Malade' },
  { value: 'elderly', label: 'Personne âgée' },
  { value: 'pregnant_woman', label: 'Grossesse' },
  { value: 'child_care', label: 'Pédiatrie' },
  { value: 'monitor_heart', label: 'Cardiologie' },
  { value: 'psychology', label: 'Psychologie' },
  { value: 'visibility', label: 'Ophtalmologie' },
  { value: 'hearing', label: 'Audiologie' },
  { value: 'restaurant', label: 'Nutrition' },
  { value: 'groups', label: 'Groupe' },
  { value: 'person', label: 'Personne' },
  { value: 'calendar_today', label: 'Calendrier' },
  { value: 'schedule', label: 'Horaire' },
  { value: 'assignment', label: 'Document' },
  { value: 'description', label: 'Description' },
  { value: 'note', label: 'Note' },
  { value: 'bookmark', label: 'Signet' },
  { value: 'star', label: 'Étoile' },
  { value: 'flag', label: 'Drapeau' },
  { value: 'label', label: 'Étiquette' },
  { value: 'lightbulb', label: 'Idée' },
  { value: 'tips_and_updates', label: 'Conseils' },
  { value: 'help', label: 'Aide' },
  { value: 'support', label: 'Support' }
];

/**
 * Liste des couleurs disponibles pour la coloration
 */
const AVAILABLE_COLORS = [
  { value: '', label: 'Aucune couleur', color: 'transparent', border: '#ddd' },
  { value: 'green', label: 'Vert', color: '#28a745', textColor: 'white' },
  { value: 'red', label: 'Rouge', color: '#dc3545', textColor: 'white' },
  { value: 'orange', label: 'Orange', color: '#fd7e14', textColor: 'white' },
  { value: 'blue', label: 'Bleu', color: '#007bff', textColor: 'white' },
  { value: 'yellow', label: 'Jaune', color: '#ffc107', textColor: 'black' },
  { value: 'purple', label: 'Violet', color: '#6f42c1', textColor: 'white' },
  { value: 'pink', label: 'Rose', color: '#e83e8c', textColor: 'white' },
  { value: 'cyan', label: 'Cyan', color: '#17a2b8', textColor: 'white' },
  { value: 'teal', label: 'Sarcelle', color: '#20c997', textColor: 'white' },
  { value: 'indigo', label: 'Indigo', color: '#6610f2', textColor: 'white' },
  { value: 'lime', label: 'Vert citron', color: '#cddc39', textColor: 'black' },
  { value: 'amber', label: 'Ambré', color: '#ffa726', textColor: 'black' },
  { value: 'brown', label: 'Marron', color: '#795548', textColor: 'white' },
  { value: 'grey', label: 'Gris', color: '#6c757d', textColor: 'white' },
  { value: 'darkred', label: 'Rouge foncé', color: '#8b0000', textColor: 'white' },
  { value: 'darkgreen', label: 'Vert foncé', color: '#006400', textColor: 'white' },
  { value: 'navy', label: 'Bleu marine', color: '#000080', textColor: 'white' },
  { value: 'gold', label: 'Or', color: '#ffd700', textColor: 'black' }
];

/**
 * Génère le HTML pour un select de cible personnalisé
 * @param {string} name - Nom du champ
 * @param {string} currentValue - Valeur actuelle
 * @param {string} id - ID de l'élément
 * @param {Array} availableCibles - Liste des cibles disponibles depuis le schéma
 */
function createCibleSelect(name, currentValue, id, availableCibles) {
  const selectedCible = availableCibles.find(c => c.value === currentValue) || availableCibles[0];
  
  const options = availableCibles.map(cible => 
    `<div class="cible-option" data-value="${cible.value}" ${currentValue === cible.value ? 'data-selected="true"' : ''}>
      <span class="cible-label">${cible.label}</span>
    </div>`
  ).join('');
  
  return `
    <div class="custom-cible-select" data-name="${name}" id="${id}Container">
      <input type="hidden" name="${name}" value="${selectedCible.value}" id="${id}" />
      <div class="cible-select-button" id="${id}Button">
        <span class="cible-label">${selectedCible.label}</span>
        <span class="dropdown-arrow">▼</span>
      </div>
      <div class="cible-dropdown" id="${id}Dropdown">
        ${options}
      </div>
    </div>
  `;
}

/**
 * Génère le HTML pour un select d'icône personnalisé avec prévisualisation
 */
function createIconSelect(name, currentValue, id) {
  const selectedIcon = COMMON_MATERIAL_ICONS.find(icon => icon.value === currentValue) || COMMON_MATERIAL_ICONS[0];
  
  const options = COMMON_MATERIAL_ICONS.map(icon => 
    `<div class="icon-option" data-value="${icon.value}" ${currentValue === icon.value ? 'data-selected="true"' : ''}>
      <span class="material-icons">${icon.value || 'block'}</span>
      <span class="icon-label">${icon.label}</span>
    </div>`
  ).join('');
  
  return `
    <div class="custom-icon-select" data-name="${name}" id="${id}Container">
      <input type="hidden" name="${name}" value="${selectedIcon.value}" id="${id}" />
      <div class="icon-select-button" id="${id}Button">
        <span class="material-icons">${selectedIcon.value || 'block'}</span>
        <span class="icon-label">${selectedIcon.label}</span>
        <span class="dropdown-arrow">▼</span>
      </div>
      <div class="icon-dropdown" id="${id}Dropdown">
        ${options}
      </div>
    </div>
  `;
}

/**
 * Génère le HTML pour un select de couleur personnalisé avec prévisualisation
 */
function createColorSelect(name, currentValue, id) {
  // Normaliser la valeur en string
  let normalizedValue = String(currentValue);
  
  const selectedColor = AVAILABLE_COLORS.find(color => color.value === normalizedValue) || AVAILABLE_COLORS[0];
  
  const options = AVAILABLE_COLORS.map(color => {
    return `<div class="color-option" data-value="${color.value}" ${normalizedValue === color.value ? 'data-selected="true"' : ''}>
      <span class="color-preview" style="background-color: ${color.color}; border: 1px solid ${color.border || '#ddd'};"></span>
      <span class="color-label">${color.label}</span>
    </div>`;
  }).join('');
  
  return `
    <div class="custom-color-select" data-name="${name}" id="${id}Container">
      <input type="hidden" name="${name}" value="${selectedColor.value}" id="${id}" />
      <div class="color-select-button" id="${id}Button">
        <span class="color-preview" style="background-color: ${selectedColor.color}; border: 1px solid ${selectedColor.border || '#ddd'};"></span>
        <span class="color-label">${selectedColor.label}</span>
        <span class="dropdown-arrow">▼</span>
      </div>
      <div class="color-dropdown" id="${id}Dropdown">
        ${options}
      </div>
    </div>
  `;
}

/**
 * Crée et affiche la modale d'édition des alertes
 * @param {string} optionName - Nom de l'option (ex: 'alertesAtcdOption')
 */
async function openAlertEditorModal(optionName) {
  const inputElement = document.getElementById(optionName);
  if (!inputElement) {
    alert('❌ Élément non trouvé');
    return;
  }

  // Parser le JSON actuel
  let alertes = [];
  try {
    const currentValue = inputElement.value.trim();
    if (currentValue) {
      alertes = JSON.parse(currentValue);
      if (!Array.isArray(alertes)) {
        alertes = [];
      }
    }
  } catch (e) {
    console.error('Erreur de parsing JSON:', e);
    alertes = [];
  }

  // Récupérer le schéma pour avoir les valeurs par défaut
  const schema = await getAlerteSchema();
  if (!schema) {
    alert('⚠️ Schéma de validation non disponible');
    return;
  }

  // Créer la modale
  const modal = createModalElement();
  document.body.appendChild(modal);

  // Afficher la liste des alertes
  renderAlertesList(modal, alertes, schema, optionName, inputElement);
}

/**
 * Crée l'élément DOM de la modale
 * @returns {HTMLElement}
 */
function createModalElement() {
  const overlay = document.createElement('div');
  overlay.className = 'alert-editor-overlay';
  overlay.innerHTML = `
    <div class="alert-editor-modal">
      <div class="alert-editor-header">
        <h2>✏️ Assistant d'édition des alertes</h2>
        <button class="alert-editor-close" title="Fermer">✕</button>
      </div>
      <div class="alert-editor-content">
        <div class="alert-editor-list-panel">
          <h3>Alertes configurées</h3>
          <div class="alert-editor-list"></div>
          <button class="alert-editor-add-btn">➕ Nouvelle alerte</button>
        </div>
        <div class="alert-editor-form-panel">
          <h3>Édition</h3>
          <div class="alert-editor-form"></div>
        </div>
      </div>
      <div class="alert-editor-footer">
        <button class="alert-editor-cancel">Annuler</button>
        <button class="alert-editor-save">💾 Appliquer les modifications</button>
      </div>
    </div>
  `;

  // Ajouter les styles
  addModalStyles();

  // Gestionnaires de fermeture
  overlay.querySelector('.alert-editor-close').onclick = () => overlay.remove();
  overlay.querySelector('.alert-editor-cancel').onclick = () => overlay.remove();
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };

  return overlay;
}

/**
 * Affiche la liste des alertes dans le panneau de gauche
 */
function renderAlertesList(modal, alertes, schema, optionName, inputElement) {
  const listContainer = modal.querySelector('.alert-editor-list');
  listContainer.innerHTML = '';

  if (alertes.length === 0) {
    listContainer.innerHTML = '<p class="alert-editor-empty">Aucune alerte configurée</p>';
  } else {
    alertes.forEach((alerte, index) => {
      const item = document.createElement('div');
      item.className = 'alert-editor-list-item';
      
      // Prévisualisation de l'icône et de la couleur
      const icone = alerte.optionsCible?.icone || '';
      const coloration = alerte.optionsCible?.coloration || '';
      const titre = alerte.titre || 'Sans titre';
      
      const titreStyle = coloration ? `color: ${coloration};` : '';
      const iconeHtml = icone ? `<span class="material-icons" style="font-size: 16px; vertical-align: middle; margin-left: 4px; ${coloration ? `color: ${coloration};` : ''}">${icone}</span>` : '';
      
      item.innerHTML = `
        <div class="alert-item-content">
          <strong style="${titreStyle}">${titre}${iconeHtml}</strong>
          <span class="alert-item-keywords">${(alerte.conditions?.motsCles || []).slice(0, 3).join(', ')}${(alerte.conditions?.motsCles?.length > 3) ? '...' : ''}</span>
        </div>
        <div class="alert-item-actions">
          <button class="alert-item-edit" data-index="${index}" title="Éditer">✏️</button>
          <button class="alert-item-delete" data-index="${index}" title="Supprimer">🗑️</button>
        </div>
      `;
      listContainer.appendChild(item);

      // Éditer
      item.querySelector('.alert-item-edit').onclick = () => {
        renderAlerteForm(modal, alertes, index, schema, optionName, inputElement);
      };

      // Supprimer
      item.querySelector('.alert-item-delete').onclick = () => {
        if (confirm(`Supprimer l'alerte "${alerte.titre}" ?`)) {
          alertes.splice(index, 1);
          renderAlertesList(modal, alertes, schema, optionName, inputElement);
          renderAlerteForm(modal, alertes, null, schema, optionName, inputElement);
        }
      };
    });
  }

  // Bouton ajouter
  modal.querySelector('.alert-editor-add-btn').onclick = () => {
    renderAlerteForm(modal, alertes, -1, schema, optionName, inputElement);
  };

  // Bouton sauvegarder
  modal.querySelector('.alert-editor-save').onclick = () => {
    console.log('💾 Sauvegarde des alertes:', alertes);
    inputElement.value = JSON.stringify(alertes, null, 2);
    console.log('✅ Valeur du champ mise à jour:', inputElement.value);
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    inputElement.dispatchEvent(new Event('change', { bubbles: true }));
    modal.remove();
    alert('✅ Modifications appliquées au JSON');
  };
}

/**
 * Affiche le formulaire d'édition d'une alerte
 */
function renderAlerteForm(modal, alertes, index, schema, optionName, inputElement) {
  const formContainer = modal.querySelector('.alert-editor-form');
  const isNew = index === -1;
  const alerte = isNew ? createDefaultAlerte(schema) : { ...alertes[index] };

  formContainer.innerHTML = `
    <form class="alert-form" id="alertForm">
      <fieldset>
        <legend>🏷️ Identification</legend>
        <label>
          Titre de l'alerte <span style="color: #d32f2f;" title="Champ obligatoire">*</span>
          <input type="text" name="titre" value="${alerte.titre || ''}" required placeholder="Ex: Diabète Type 2">
        </label>
      </fieldset>

      <fieldset>
        <legend>🎯 Cible visuelle</legend>
        <label>
          Cible (Colore un antécédent ou l'état civil)
          ${createCibleSelect('cible', alerte.optionsCible?.cible || 'atcd', 'cibleInput', getCiblesFromSchema(schema))}
        </label>
        <label>
          Coloration
          ${createColorSelect('coloration', alerte.optionsCible?.coloration ?? '', 'colorationInput')}
        </label>
        <label>
          Icône Affichée à côté de la cible
          ${createIconSelect('icone', alerte.optionsCible?.icone || 'info', 'iconeInput')}
        </label>
        <label>
          Texte au survol de la cible
          <textarea name="texteSurvol" rows="2" placeholder="Texte affiché au survol de l'antécédent">${alerte.optionsCible?.texteSurvol || ''}</textarea>
        </label>
      </fieldset>

      <fieldset>
        <legend>🔔 Notification Weda (rectangle de couleur en bas à droite)</legend>
        <label>
          Texte de la notification
          <input type="text" name="texteAlerte" value="${alerte.alerteWeda?.texteAlerte || ''}" placeholder="Laissez vide pour ne pas afficher de notification">
        </label>
        <label>
          Type d'alerte
          <select name="typeAlerte">
            <option value="" ${!alerte.alerteWeda?.typeAlerte || alerte.alerteWeda?.typeAlerte === 'undefined' ? 'selected' : ''}>Non défini (défaut)</option>
            <option value="success" ${alerte.alerteWeda?.typeAlerte === 'success' ? 'selected' : ''}>Succès (vert)</option>
            <option value="fail" ${alerte.alerteWeda?.typeAlerte === 'fail' ? 'selected' : ''}>Attention (rouge, permanent)</option>
          </select>
        </label>
        <label>
          Durée (secondes, 0 pour laisser par défaut)
          <input type="number" name="dureeAlerte" value="${alerte.alerteWeda?.dureeAlerte ?? 10}" min="0" max="60" placeholder="0 = par défaut">
        </label>
        <label>
          Icône notification
          ${createIconSelect('iconeAlerte', alerte.alerteWeda?.icone || 'info', 'iconeAlerteInput')}
        </label>
      </fieldset>

      <fieldset>
        <legend>⚙️ Conditions de déclenchement</legend>
        <div class="form-row">
          <label>
            Âge minimum
            <input type="number" name="ageMin" value="${alerte.conditions?.ageMin ?? ''}" min="0" max="300" placeholder="Laissez vide si pas de limite">
          </label>
          <label>
            Âge maximum
            <input type="number" name="ageMax" value="${alerte.conditions?.ageMax ?? ''}" min="0" max="300" placeholder="Laissez vide si pas de limite">
          </label>
        </div>
        <label>
          Sexe
          <select name="sexes">
            <option value="" ${!alerte.conditions?.sexes ? 'selected' : ''}>Non défini (tous)</option>
            <option value="M" ${alerte.conditions?.sexes === 'M' ? 'selected' : ''}>Masculin</option>
            <option value="F" ${alerte.conditions?.sexes === 'F' ? 'selected' : ''}>Féminin</option>
          </select>
        </label>
        <div class="form-row">
          <label>
            Date de début (DD/MM/YYYY)
            <input type="text" name="dateDebut" value="${alerte.conditions?.dateDebut || ''}" placeholder="01/01/2024" pattern="\\d{2}/\\d{2}/\\d{4}">
          </label>
          <label>
            Date de fin (DD/MM/YYYY)
            <input type="text" name="dateFin" value="${alerte.conditions?.dateFin || ''}" placeholder="31/12/2025" pattern="\\d{2}/\\d{2}/\\d{4}">
          </label>
        </div>
        <label>
          Mots-clés (un par ligne) *
          <textarea name="motsCles" rows="4" required placeholder="diabète&#10;diabète type 2&#10;DT2">${(alerte.conditions?.motsCles || []).join('\n')}</textarea>
          <small>L'alerte se déclenchera si l'un de ces mots est trouvé dans les antécédents</small>
        </label>
      </fieldset>

      <div class="form-actions">
        <button type="button" class="btn-secondary" id="btnCancel">Fermer</button>
      </div>
    </form>
  `;

  // Gestionnaires pour les dropdowns personnalisés (icônes et couleurs) avec navigation clavier
  function setupCustomSelect(containerId, optionClass, dataArray, isColorSelect = false) {
    const container = formContainer.querySelector(`#${containerId}Container`);
    if (!container) return;

    const button = container.querySelector(`#${containerId}Button`);
    const dropdown = container.querySelector(`[id$="Dropdown"]`);
    const input = container.querySelector(`#${containerId}`);
    const options = Array.from(dropdown.querySelectorAll(`.${optionClass}`));
    let focusedIndex = options.findIndex(opt => opt.hasAttribute('data-selected'));

    // Toggle dropdown
    button.onclick = (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('show');
      if (dropdown.classList.contains('show') && focusedIndex >= 0) {
        options[focusedIndex].scrollIntoView({ block: 'nearest' });
      }
    };

    // Navigation au clavier
    button.onkeydown = (e) => {
      if (!dropdown.classList.contains('show') && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter')) {
        e.preventDefault();
        dropdown.classList.add('show');
        if (focusedIndex >= 0) {
          options[focusedIndex].scrollIntoView({ block: 'nearest' });
        }
        return;
      }

      if (dropdown.classList.contains('show')) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          focusedIndex = (focusedIndex + 1) % options.length;
          options[focusedIndex].scrollIntoView({ block: 'nearest' });
          highlightOption(focusedIndex);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          focusedIndex = (focusedIndex - 1 + options.length) % options.length;
          options[focusedIndex].scrollIntoView({ block: 'nearest' });
          highlightOption(focusedIndex);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (focusedIndex >= 0) {
            options[focusedIndex].click();
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          dropdown.classList.remove('show');
        }
      }
    };

    function highlightOption(index) {
      options.forEach((opt, i) => {
        if (i === index) {
          opt.style.outline = '2px solid #007bff';
          opt.style.outlineOffset = '-2px';
        } else {
          opt.style.outline = '';
        }
      });
    }

    // Sélection d'une option
    options.forEach((option, index) => {
      option.onclick = () => {
        const value = option.dataset.value;
        console.log(`🎨 [${containerId}] Sélection d'une option:`, { value, type: typeof value });
        let item;
        
        if (isColorSelect) {
          item = dataArray.find(c => String(c.value) === String(value));
          console.log(`🎨 [${containerId}] Item trouvé:`, item);
          input.value = value;
          console.log(`🎨 [${containerId}] Input.value après mise à jour:`, input.value, '(type:', typeof input.value, ')');
          console.log(`🎨 [${containerId}] Input.name:`, input.name, 'Input.id:', input.id);
          
          // Mettre à jour uniquement le color-preview du bouton
          button.querySelector('.color-preview').style.backgroundColor = item.color;
          button.querySelector('.color-preview').style.borderColor = item.border || '#ddd';
          button.querySelector('.color-label').textContent = item.label;
        } else if (containerId === 'cibleInput') {
          // Gestion spécifique pour la cible
          item = dataArray.find(c => c.value === value);
          console.log(`🎯 [${containerId}] Cible sélectionnée:`, item);
          input.value = value;
          console.log(`🎯 [${containerId}] Input.value après mise à jour:`, input.value);
          
          // Mettre à jour le bouton
          button.querySelector('.cible-label').textContent = item.label;
        } else {
          item = dataArray.find(i => i.value === value);
          console.log(`🎯 [${containerId}] Icône sélectionnée:`, item);
          input.value = value;
          console.log(`🎯 [${containerId}] Input.value après mise à jour:`, input.value);
          
          // Mettre à jour le bouton
          button.querySelector('.material-icons').textContent = value;
          button.querySelector('.icon-label').textContent = item.label;
        }
        
        // Mettre à jour la sélection visuelle
        options.forEach(opt => opt.removeAttribute('data-selected'));
        option.setAttribute('data-selected', 'true');
        focusedIndex = index;
        highlightOption(-1); // Retirer le highlight
        
        // Déclencher un événement change pour l'auto-save
        input.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Fermer le dropdown
        dropdown.classList.remove('show');
      };
    });

    // Fermer le dropdown en cliquant ailleurs
    document.addEventListener('click', (e) => {
      if (!container.contains(e.target)) {
        dropdown.classList.remove('show');
        highlightOption(-1);
      }
    });

    // Rendre le bouton focusable
    button.setAttribute('tabindex', '0');
  }

  setupCustomSelect('iconeInput', 'icon-option', COMMON_MATERIAL_ICONS, false);
  setupCustomSelect('iconeAlerteInput', 'icon-option', COMMON_MATERIAL_ICONS, false);
  setupCustomSelect('colorationInput', 'color-option', AVAILABLE_COLORS, true);
  setupCustomSelect('cibleInput', 'cible-option', getCiblesFromSchema(schema), false);

  // Gestionnaire d'annulation
  formContainer.querySelector('#btnCancel').onclick = () => {
    formContainer.innerHTML = '<p class="alert-editor-empty">Sélectionnez une alerte ou créez-en une nouvelle</p>';
  };

  // Fonction pour construire l'objet alerte depuis le formulaire
  function buildAlerteFromForm() {
    const form = formContainer.querySelector('#alertForm');
    const formData = new FormData(form);
    
    const cibleValue = document.getElementById('cibleInput')?.value || 'atcd';
    const colorationValue = document.getElementById('colorationInput')?.value || '';
    const iconeValue = document.getElementById('iconeInput')?.value || '';
    const iconeAlerteValue = document.getElementById('iconeAlerteInput')?.value || '';
    const typeAlerteValue = formData.get('typeAlerte');
    const sexesValue = formData.get('sexes');
    
    const nouvelleAlerte = {
      titre: formData.get('titre'),
      optionsCible: {
        cible: cibleValue,
        ...(colorationValue && { coloration: colorationValue }),
        ...(iconeValue && { icone: iconeValue }),
        texteSurvol: formData.get('texteSurvol')
      },
      alerteWeda: {
        ...(iconeAlerteValue && { icone: iconeAlerteValue }),
        ...(typeAlerteValue && typeAlerteValue !== 'undefined' && { typeAlerte: typeAlerteValue }),
        dureeAlerte: parseInt(formData.get('dureeAlerte')),
        texteAlerte: formData.get('texteAlerte')
      },
      conditions: {
        ageMin: formData.get('ageMin') ? parseInt(formData.get('ageMin')) : null,
        ageMax: formData.get('ageMax') ? parseInt(formData.get('ageMax')) : null,
        ...(sexesValue && { sexes: sexesValue }),
        dateDebut: formData.get('dateDebut') || null,
        dateFin: formData.get('dateFin') || null,
        motsCles: formData.get('motsCles').split('\n').map(s => s.trim()).filter(s => s)
      }
    };
    
    // Nettoyer les valeurs vides
    if (!nouvelleAlerte.optionsCible.texteSurvol) delete nouvelleAlerte.optionsCible.texteSurvol;
    if (!nouvelleAlerte.alerteWeda.texteAlerte) delete nouvelleAlerte.alerteWeda.texteAlerte;
    
    return nouvelleAlerte;
  }
  
  // Fonction pour mettre à jour l'alerte dans le tableau
  function updateAlerte() {
    const form = formContainer.querySelector('#alertForm');
    if (!form) return;
    
    // Valider et marquer les champs invalides en rouge
    const isValid = form.checkValidity();
    
    // Marquer tous les champs requis, avec pattern ou contraintes numériques
    const fieldsToValidate = form.querySelectorAll('[required], [pattern], [type="number"]');
    fieldsToValidate.forEach(field => {
      if (!field.validity.valid) {
        field.style.borderColor = '#dc3545';
        field.style.borderWidth = '2px';
      } else {
        field.style.borderColor = '';
        field.style.borderWidth = '';
      }
    });
    
    if (!isValid) return;
    
    const nouvelleAlerte = buildAlerteFromForm();
    
    if (isNew) {
      // Ajouter la nouvelle alerte si elle n'existe pas encore
      if (alertes.length === 0 || alertes[alertes.length - 1] !== alerte) {
        alertes.push(nouvelleAlerte);
        console.log('🆕 Nouvelle alerte ajoutée:', nouvelleAlerte);
      } else {
        alertes[alertes.length - 1] = nouvelleAlerte;
      }
    } else {
      // Mettre à jour l'alerte existante
      alertes[index] = nouvelleAlerte;
      console.log('✏️ Alerte mise à jour:', nouvelleAlerte);
    }
    
    // Rafraîchir la liste
    renderAlertesList(modal, alertes, schema, optionName, inputElement);
  }
  
  // Écouter les changements sur tous les champs du formulaire
  const form = formContainer.querySelector('#alertForm');
  form.addEventListener('input', updateAlerte);
  form.addEventListener('change', updateAlerte);
  
  // Si c'est une nouvelle alerte, l'ajouter immédiatement
  if (isNew) {
    updateAlerte();
  }
}

/**
 * Crée une alerte vide avec valeurs par défaut
 */
function createDefaultAlerte(schema) {
  return {
    titre: '',
    optionsCible: {
      cible: 'atcd',
      texteSurvol: ''
    },
    alerteWeda: {
      dureeAlerte: 10,
      texteAlerte: ''
    },
    conditions: {
      ageMin: null,
      ageMax: null,
      dateDebut: null,
      dateFin: null,
      motsCles: []
    }
  };
}

/**
 * Extrait la liste des cibles disponibles depuis le schéma
 * @param {Object} schema - Schéma de validation
 * @returns {Array} Liste des cibles avec label
 */
function getCiblesFromSchema(schema) {
  const cibles = schema?.optionsCible?.properties?.cible?.enum || ['atcd'];
  
  // Mapping des cibles vers des labels
  const labelMap = {
    'atcd': 'Antécédent',
    'etatCivil': 'État civil',
    'allergie': 'Allergie',
    'traitement': 'Traitement'
  };
  
  return cibles.map(value => ({
    value: value,
    label: labelMap[value] || value
  }));
}

/**
 * Ajoute les styles CSS pour la modale
 */
function addModalStyles() {
  if (document.getElementById('alert-editor-styles')) return;

  const styles = document.createElement('style');
  styles.id = 'alert-editor-styles';
  styles.textContent = `
    .alert-editor-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 20px;
    }

    .alert-editor-modal {
      background: white;
      border-radius: 8px;
      width: 95%;
      max-width: 1200px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    .alert-editor-header {
      padding: 20px;
      border-bottom: 2px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .alert-editor-header h2 {
      margin: 0;
      color: #333;
    }

    .alert-editor-close {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
      padding: 5px 10px;
    }

    .alert-editor-close:hover {
      color: #000;
    }

    .alert-editor-content {
      flex: 1;
      overflow: hidden;
      display: flex;
      gap: 20px;
      padding: 20px;
    }

    .alert-editor-list-panel {
      width: 300px;
      display: flex;
      flex-direction: column;
      border-right: 1px solid #e0e0e0;
      padding-right: 20px;
    }

    .alert-editor-list-panel h3 {
      margin-top: 0;
    }

    .alert-editor-list {
      flex: 1;
      overflow-y: auto;
      margin-bottom: 10px;
    }

    .alert-editor-list-item {
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f9f9f9;
    }

    .alert-item-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .alert-item-keywords {
      font-size: 12px;
      color: #666;
    }

    .alert-item-actions {
      display: flex;
      gap: 5px;
    }

    .alert-item-edit, .alert-item-delete {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 16px;
      padding: 5px;
    }

    .alert-item-edit:hover {
      transform: scale(1.2);
    }

    .alert-item-delete:hover {
      transform: scale(1.2);
      filter: brightness(0.8);
    }

    .alert-editor-add-btn {
      padding: 10px;
      background: #28a745;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }

    .alert-editor-add-btn:hover {
      background: #218838;
    }

    .alert-editor-form-panel {
      flex: 1;
      overflow-y: auto;
    }

    .alert-editor-form-panel h3 {
      margin-top: 0;
      position: sticky;
      top: 0;
      background: white;
      padding-bottom: 10px;
    }

    .alert-form fieldset {
      margin-bottom: 20px;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 15px;
    }

    .custom-icon-select {
      position: relative;
      width: 100%;
    }

    .custom-color-select {
      position: relative;
      width: 100%;
    }

    .custom-cible-select {
      position: relative;
      width: 100%;
    }

    .icon-select-button, .color-select-button, .cible-select-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      cursor: pointer;
      transition: all 0.2s;
    }

    .icon-select-button:hover, .color-select-button:hover, .cible-select-button:hover {
      border-color: #007bff;
      box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
    }

    .icon-select-button:focus, .color-select-button:focus, .cible-select-button:focus {
      outline: 2px solid #007bff;
      outline-offset: 2px;
    }

    .icon-select-button .material-icons {
      font-size: 24px;
      color: #007bff;
    }

    .icon-select-button .icon-label, .color-select-button .color-label, .cible-select-button .cible-label {
      flex: 1;
      font-size: 14px;
    }

    .color-preview {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      display: inline-block;
    }

    .dropdown-arrow {
      font-size: 12px;
      color: inherit;
      opacity: 0.7;
      transition: transform 0.2s;
    }

    .icon-dropdown, .color-dropdown, .cible-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      max-height: 300px;
      overflow-y: auto;
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 1000;
      display: none;
      margin-top: 4px;
    }

    .icon-dropdown.show, .color-dropdown.show, .cible-dropdown.show {
      display: block;
    }

    .icon-option, .color-option, .cible-option {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .icon-option:hover, .color-option:hover, .cible-option:hover {
      background: #f8f9fa;
    }

    .icon-option[data-selected="true"], .cible-option[data-selected="true"] {
      background: #e7f3ff;
    }

    .color-option[data-selected="true"] {
      box-shadow: inset 0 0 0 2px rgba(0, 123, 255, 0.5);
    }

    .icon-option .material-icons {
      font-size: 24px;
      color: #007bff;
      min-width: 24px;
    }

    .icon-option .icon-label, .color-option .color-label, .cible-option .cible-label {
      font-size: 14px;
      flex: 1;
    }

    .alert-form legend {
      font-weight: bold;
      color: #555;
      padding: 0 10px;
    }

    .alert-form label {
      display: block;
      margin-bottom: 15px;
      font-weight: 500;
    }

    .alert-form input[type="text"],
    .alert-form input[type="number"],
    .alert-form select,
    .alert-form textarea {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-top: 5px;
      font-family: inherit;
    }

    .alert-form small {
      display: block;
      color: #666;
      margin-top: 4px;
      font-size: 12px;
    }

    .alert-form small a {
      color: #007bff;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }

    .form-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      margin-top: 20px;
      padding: 15px;
      border-top: 1px solid #e0e0e0;
      position: sticky;
      bottom: 0;
      background: white;
      z-index: 10;
      box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
    }

    .btn-primary, .btn-secondary {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-primary:hover {
      background: #0056b3;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #545b62;
    }

    .alert-editor-empty {
      text-align: center;
      color: #999;
      padding: 40px 20px;
    }

    .alert-editor-footer {
      padding: 15px 20px;
      border-top: 2px solid #e0e0e0;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    .alert-editor-cancel, .alert-editor-save {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }

    .alert-editor-cancel {
      background: #6c757d;
      color: white;
    }

    .alert-editor-cancel:hover {
      background: #545b62;
    }

    .alert-editor-save {
      background: #28a745;
      color: white;
    }

    .alert-editor-save:hover {
      background: #218838;
    }
  `;
  document.head.appendChild(styles);
}
