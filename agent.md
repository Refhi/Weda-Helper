# Guide Agent - Weda Helper

*Guide complet pour les agents (Claude) travaillant sur Weda-Helper*

## 🎯 Vue d'ensemble du projet

**Weda-Helper** est une extension Chrome qui automatise et facilite les tâches quotidiennes sur **Weda** (un logiciel médical français). Développée par et pour des médecins, l'extension fournit des raccourcis clavier, des automatismes, et des améliorations UX pour gagner du temps.

- **Type** : Extension Chrome (Manifest V3), cf. manifest.json
- **Langage** : JavaScript (ES6+)

### Points clés
- Aucune destruction/modification sans validation utilisateur explicite
- Les données restent sous le contrôle de l'utilisateur (IA locale de préférence)

---

## 📁 Structure du projet

Vérifier les 20 premières lignes de chaque fichier mentionnés dans manifest.json pour une vue à jour du projet.

---

## 🔑 Concept central : `addTweak()`

La fonction `addTweak()` est le **cœur du système**. Elle:
1. Vérifie si l'URL correspond à un pattern spécifique
2. Vérifie si une option est activée par l'utilisateur
3. Exécute une fonction de callback si les conditions sont remplies

### Syntaxe

```javascript
addTweak(path, option, callback)
```

#### Paramètres

| Paramètre | Type | Description |
|-----------|------|-------------|
| `path` | `string \| string[]` | Chemin(s) URL (relatif à baseUrl). `'*'` = toutes les pages |
| `option` | `string \| array` | Nom de l'option ou tableau `[{option, callback}]` |
| `callback` | `function` | Fonction à exécuter si l'option est active |

### Cas d'usage simples

#### Cas 1 : Une fonctionnalité sur une page spécifique

```javascript
addTweak('/FolderGestion/RecetteForm.aspx', 'TweakRecetteForm', function () {
  console.log('Afficher la recette du jour');
  // Code du tweak ici
});
```

#### Cas 2 : Plusieurs options/callbacks sur une même page

```javascript
addTweak('/FolderConsultation/Consultation.aspx', [
  {
    option: 'HistoriqueAuto',
    callback: function () {
      console.log('Ouvrir historique automatiquement');
    }
  },
  {
    option: 'TabNavigation',
    callback: function () {
      console.log('Modifier navigation Tab/Shift+Tab');
    }
  }
]);
```

#### Cas 3 : Plusieurs pages pour une même fonctionnalité

```javascript
addTweak([
  '/FolderConsultation/Consultation.aspx',
  '/FolderCourrier/Courrier.aspx',
  '/FolderCertificate/Certificate.aspx'
], 'HistoriqueAuto', function () {
  afficherHistorique();
});
```

#### Cas 4 : Option négative (fonction si option DÉSACTIVÉE)

```javascript
addTweak('/FolderConsultation/Consultation.aspx', '!AutoSave', function () {
  console.log('AutoSave est désactivé → ne pas sauvegarder');
});
```

#### Cas 5 : Callback obligatoire (sans vérification d'option)

```javascript
addTweak('*', '*AutoSave', function () {
  console.log('Code qui s\'exécute sur toutes les pages sans vérification');
});
```

### Points importants

- **Attente Weda** : `addTweak()` attend automatiquement que Weda soit chargé via `waitForWeda()`
- **Constantes** : Éviter les constantes globales.
- **Reçoit la valeur** : Le callback reçoit la valeur de l'option : `function (optionValue) { ... }`
- **Logs** : Chaque activation est loggée (cf. console browser)

---

## 🛠️ Comment ajouter une nouvelle option

### Étape 1 : Ajouter l'option dans `background.js`

```javascript
// src/background.js
const DEFAULT_OPTIONS = {
  // ... options existantes ...
  'MonNouvelleOption': true,  // ou false selon le défaut souhaité
};
```

### Étape 2 : Implémenter le tweak dans la feature correspondante

**Exemple** : Ajouter une option dans `consultation.js`

```javascript
// src/features/consultation.js

addTweak('/FolderConsultation/Consultation.aspx', 'MonNouvelleOption', function () {
  console.log('[MonNouvelleOption] Activation du tweak');
  
  // Code de la fonctionnalité
  montreFonctionnalite();
});

function montreFonctionnalite() {
  // Implémentation ici
}
```

### Étape 3 : Ajouter à l'interface options (optionnel)

Modifier `src/ui/options.html` et `src/background/optionsInit.js` pour permettre à l'utilisateur de configurer l'option via la page d'options.

### Exemple complet

```javascript
// Activation simple
addTweak('/FolderConsultation/Consultation.aspx', 'AfficherBMI', function () {
  afficherBMI();
});

function afficherBMI() {
  const poids = document.querySelector('[data-poids]');
  const taille = document.querySelector('[data-taille]');
  
  if (poids && taille) {
    const bmi = (poids.value / (taille.value * taille.value)) * 10000;
    console.log(`BMI: ${bmi.toFixed(1)}`);
  }
}
```

---

## 📚 Utilitaires essentiels

### 1. **Storage & Options** (`storage.js`)

```javascript
// Récupérer une option
getOption('MonOption', function (value) {
  console.log(value);
});

// Récupérer plusieurs options
getOption(['Opt1', 'Opt2'], function (values) {
  console.log(values.Opt1, values.Opt2);
});

// Sauvegarder une option
chrome.storage.local.set({ 'MonOption': true });
```

### 2. **DOM Observer** (`dom-oberver.js`)

```javascript
// Attendre un élément
waitForElement('#monElement', function (element) {
  element.addEventListener('click', function () {
    console.log('Cliqué');
  });
});

// Attendre que Weda soit chargé
await waitForWeda({ logWait: 'MonOption' });

// Observer les mutations
afterMutations('.consultation-container', function (mutations) {
  console.log('Mutation détectée');
});

// Observer la disparition
observeDisappearance('#modal', function () {
  console.log('Modal fermée');
});
```

### 3. **Date/Heure** (`date-time-helpers.js`)

```javascript
// Date du jour au format "JJ/MM/AAAA"
getCurrentDate();

// Parser une date partielle "0512" → "05/12/2025"
formatPartialDate('0512');

// Ajouter des jours à une date
addDaysToDate(new Date(), 7);
```

### 4. **DOM Helpers** (`dom-helpers.js`)

```javascript
// Cliquer programmatiquement
clickElement(element);

// Modifier la valeur d'un input
setInputValue(inputElement, 'nouvelleValeur');

// Trouver les enfants
findAllChildren(parent, selector);
```

### 5. **Données** (`dataScrapper.js`)

```javascript
// Extraire les données du dossier patient
const patientData = scrapPatientData();
console.log(patientData.nom, patientData.prenom);

// Insérer des données automatiquement
insertDataIntoConsultation(data);
```

---

## 🎨 Bonnes pratiques de code

### ✅ À faire

1. **Utiliser `addTweak()` pour tout**
   ```javascript
   addTweak('/path', 'MonOption', function () {
     faireQuelquechose();
   });
   ```

2. **Nommer clairement les variables et fonctions**
   ```javascript
   // ✅ Bon
   const patientsWithDiabetes = filterPatients('diabète');
   
   // ❌ Mauvais
   const pts = filterPatients('diabète');
   ```

3. **Utiliser les utilitaires existants**
   ```javascript
   // ✅ Bon - utilise waitForElement
   waitForElement('#prescription-button', function (btn) {
     btn.addEventListener('click', handlePrescription);
   });
   
   // ❌ Mauvais - polling manual
   const btn = setInterval(() => {
     if (document.querySelector('#prescription-button')) {
       // ...
     }
   }, 100);
   ```

4. **Préférer les doubles quotes**
   ```javascript
   const message = "Bienvenue";  // ✅
   const message = 'Bienvenue'; // ❌
   ```

5. **Logs lisibles et préfixés**
   ```javascript
   console.log("[MonFeature] Action effectuée");
   console.log("[MonFeature] Erreur:", error);
   ```

6. **Permissions optionnelles** (préférer dans `optional_permissions`)
   ```json
   "optional_permissions": [
     "tabs",
     "scripting"
   ]
   ```

### ❌ À éviter

1. **Code trop long ou imbriqué** → Découper en fonctions
2. **Global scope pollution** → Utiliser des IIFE ou des namespaces
3. **DOM queries répétées** → Mettre en cache les références
4. **SetTimeout/polling** → Préférer observers et events
5. **Permissions trop larges** → Minimiser à ce qui est nécessaire
6. **Essentialiser le code** → rester KISS
7. Une fonctionnalité de + de 30 lignes = un fichier.js dédié.
8. Privilégier le stockage temporaire : variable => éventuellement sessionStorage => éventuellement chrome local storage.

---

## 🔄 Workflow de contribution

### 1. Créer une issue/PR liée

```bash
# Exemple
# Issue #763: Ajouter surveillance auto des bios entrantes
# PR liée: Référence #763 dans la PR
```

### 2. Implémenter en suivant CONTRIBUTING.md

- Créer une branche `feature/xxx` ou `fix/xxx`
- Code propre avec double quotes
- Utiliser `addTweak()` maximalement
- Tester la fonctionnalité manuellement sur Weda

### 3. Commits clairs

```bash
git commit -m "Ajouter surveillance auto des bios entrantes

- Vérifier l'historique des bios entrantes
- Afficher une alerte si nouvelle bio
- Intégré avec addTweak

Fixes #763"
```

### 4. PR et revue

- Inclure un changelog dans la PR
- Être prêt aux retours
- Tests manuels validés

---

## 🧪 Tester la fonctionnalité

### Local

1. **Charger l'extension en dev mode**
   - `chrome://extensions`
   - Activer "Mode développeur"
   - "Charger l'extension non empaquetée" → `/home/refhi/Documents/gitSync/Weda-Helper`

2. **Accéder à Weda**
   - https://secure.weda.fr/

3. **Ouvrir la console** (F12)
   - Les logs `[addTweak]` confirmez l'activation
   - Les logs `[MonFeature]` vérifiez le fonctionnement

4. **Options de l'extension**
   - Clic droit sur l'icône → Options
   - Vérifier que l'option est bien présente et active

---

## 🐛 Debugging

### Logs de base

```javascript
// Dans addTweak - voir si ça s'active
console.log("[MonFeature] Activé");

// Dans le callback
function maFonction() {
  console.log("[MonFeature] maFonction appelée");
  console.log("[MonFeature] element:", element);
}
```

### Vérifier l'URL

```javascript
// Si le tweak ne s'active pas, vérifier l'URL
console.log(window.location.href);
// → Doit commencer par https://secure.weda.fr/FolderConsultation/Consultation.aspx
```

### Vérifier l'option

```javascript
// Depuis la console du browser
chrome.storage.local.get(null, (all) => console.log(all));
// Vérifier que 'MonOption' existe et vaut true
```

### Vérifier waitForWeda

```javascript
// Si waitForWeda timeout, Weda n'est pas chargé
// Vérifier qu'on est bien sur secure.weda.fr
// Vérifier qu'une page de Weda a chargé (pas une 404)
```

---

## 📝 Exemple complet d'une feature

**Objectif** : Ajouter une option "AfficherDateLastVSM" pour afficher la date du dernier VSM dans les antécédents.

### 1. `background.js`
```javascript
const DEFAULT_OPTIONS = {
  // ...
  'AfficherDateLastVSM': true,
};
```

### 2. `src/features/antecedent.js`
```javascript
// À la fin du fichier
addTweak('/FolderAntecedent/Antecedent.aspx', 'AfficherDateLastVSM', function () {
  afficherDateLastVSM();
});

function afficherDateLastVSM() {
  console.log("[AfficherDateLastVSM] Activation");
  
  waitForElement('.vsmHistory', function (vsmHistory) {
    // vsmHistory contient "Dernier VSM: 2026-01-15"
    const dateText = vsmHistory.textContent;
    const dateMatch = dateText.match(/(\d{4}-\d{2}-\d{2})/);
    
    if (dateMatch) {
      const date = dateMatch[1];
      const badge = document.createElement('span');
      badge.className = 'vsm-badge';
      badge.textContent = `📅 ${date}`;
      badge.style.cssText = 'background: #e0e0e0; padding: 4px 8px; border-radius: 3px; margin-left: 8px;';
      
      vsmHistory.appendChild(badge);
      console.log("[AfficherDateLastVSM] Badge ajouté: " + date);
    }
  });
}
```

### 3. Test
- Charger l'extension en dev mode
- Aller dans antécédents d'un patient
- Vérifier que le badge apparaît
- Désactiver l'option → le badge disparaît
- Logs console : `[AfficherDateLastVSM] Activation` ✅

---

## 🚀 Ressources et liens

| Ressource | Lien |
|-----------|------|
| **GitHub du projet** | https://github.com/Refhi/Weda-Helper |
| **CONTRIBUTING** | Voir CONTRIBUTING.md |
| **Changelog** | Voir CHANGELOG.md |
| **Documentation IA** | Voir docs/IA-distante-wiki.md |
| **Communauté Weda** | https://communaute.weda.fr/ |

---

## 🎓 Checklist pour les agents

Avant de toucher du code :

- [ ] Lire ce guide `agent.md` (vous êtes ici ✅)
- [ ] Lire `CONTRIBUTING.md` pour la philosophie
- [ ] Lire `README.md` pour comprendre les features
- [ ] Localiser le fichier feature ou util concerné
- [ ] Vérifier l'URL cible pour le tweak
- [ ] Vérifier qu'une option existe (ou la créer dans `background.js`)
- [ ] Utiliser `waitForElement()` ou `afterMutations()` si besoin d'attendre le DOM
- [ ] Préférer les utilitaires existants dans `utils/`
- [ ] Tester localement avant de soumettre
- [ ] Logs préfixés `[MonFeature]` dans la console

---

## 📞 Questions fréquentes

**Q: Dois-je créer une nouvelle option pour chaque fonction?**  
A: Oui, pour permettre à l'utilisateur de contrôler chaque fonctionnalité. Une option = un comportement optionnel.

**Q: Comment appeler une fonction d'un autre fichier?**  
A: Les fonctions doivent être déclarées dans le scope global (ne pas les enfermer dans une IIFE). Elles seront accessibles après que tous les scripts content soient chargés (voir manifest.json).

**Q: Quelle est la différence entre `addTweak()` et `waitForElement()`?**  
A: `addTweak()` gère le matching d'URL + l'option utilisateur. `waitForElement()` attend juste qu'un élément existe. Utilisez les deux ensemble.

**Q: Comment tester une option spécifique?**  
A: Dans la console du browser:
```javascript
chrome.storage.local.set({ 'MonOption': false }, () => {
  window.location.reload();
});
```


*Dernière mise à jour : 2026-11-18*
