# Weda Helper

Extension pour Chrome permettant de faciliter les tâches quotidiennes sur Weda.

Bien que satisfait de Weda, j'ai trouvé que le nombre de clics pouvait être très nettement diminué en implémentant des raccourcis claviers et quelques automatismes.

Entièrement codé par un médecin Eurois, pour lui-même et ses pairs, j'espère qu'elle vous plaira autant qu'à moi au quotidien !

La plupart des raccourcis et des fonctionnalités peuvent être activées ou non dans les options du module ou dans les raccourcis.

Cf. ci-dessous pour les retours et les contributions.

# Table des Matières

1. [Weda Helper](#weda-helper)
2. [Raccourcis Claviers](#raccourcis-claviers)
3. [Affichage des Raccourcis Claviers du Menu W](#affichage-des-raccourcis-claviers-du-menu-w)
4. [Facilitation des Imports](#facilitation-des-imports)
5. [Facilitation du Remplissage des Valeurs Tensionnelles](#facilitation-du-remplissage-des-valeurs-tensionnelles)
6. [Consultations](#Consultations)
7. [Modification du Comportement de la Tabulation Après Recherche Patient](#modification-du-comportement-de-la-tabulation-après-recherche-patient)
8. [Écoute des Entrées Claviers Lors de l'Usage de la Calculette de Prescription](#écoute-des-entrées-claviers-lors-de-lusage-de-la-calculette-de-prescription)
9. [Recherche de médicaments](#Recherche-de-médicaments)
10. [FSE : Entrées clavier, cotation par défaut et envoi automatique au TPE](#fse-entrées-clavier-cotation-par-défaut-et-envoi-automatique-au-tpe)
11. [Weda-Helper-Companion](#weda-helper-companion)
12. [Problèmes et Limitations Connues](#problèmes-et-limitations-connues-qui-seront-peut-être-résolues-dans-de-futures-mises-à-jour)
13. [Contributions](#contributions)


## Raccourcis claviers
*Toutes vos tâches quotidiennes à portée de clavier*
- "Appuie sur Valider" : Alt+V
- "Appuie sur Annuler" : Alt+A
- "Imprime le document en cours" : Ctrl+P (nécessite le [Weda-Helper-Companion](#weda-helper-companion) pour être totalement fonctionnel)
- "Appuie sur Supprimer" : Alt+S

Chrome limite malheureusement les raccourcis par défaut. Les suivants doivent donc être
définis manuellement dans chrome://extensions/shortcuts :

- "Appuie sur Enregistrer" : Ctrl+S
- "Appuie sur W" : Alt+W
- "Ouvre ou crée la consultation n°1" : Alt+1
- "Ouvre ou crée le certificat n°1" : Alt+2
- "Ouvre ou crée la demande n°1" : Alt+3
- "Ouvre ou crée la prescription n°1" : Alt+4
- "Ouvre ou crée le formulaire n°1" : Alt+F
- "Ouvre ou crée le courrier n°1" : Alt+5
- "Clique sur FSE" : Alt+6
- "Lit la carte vitale" : Alt+C

## Affichage des raccourcis claviers du menu W
*Comment je fais ça déjà ?*

Un appuis sur la touche Alt prolongé (> 1 seconde) affiche un rappel des principaux raccourcis claviers

## Facilitation des imports
*Tout les imports au clavier en 4 appuis sur tabulations et un appuis sur Entrée*

Dans la fenêtre d'importation des documents (https://secure.weda.fr/FolderMedical/UpLoaderForm.aspx), les modifications suivantes sont effectuées :
- Modification de l'ordre de parcours des tabulations pour permettre des intégrations uniquement au clavier (appuyer sur Tab pour passer d'un champ à l'autre)
- Agrandissement de la fenêtre de prévisualisation pour faciliter la lecture du PDF à importer
- Complétion automatique des dates partielles
- En cliquant sur l'icône de l'extension, le bouton "Tout mettre en consultation" permet de sélectionner d'un coup "Consultation" pour l'ensemble des documents en attente d'importation.

## Facilitation du remplissage des valeurs tensionnelles
*'Poids' 75 [tab] 'TAS' 150 [tab] 'TAD' 80*

Dans la fenêtre de consultation, lorsque l'on remplie une valeur de suivi, la touche tabulation envoie directement vers la case suivante (plus besoin d'appuyer 4 fois)

## Consultations
*Parceque le vert flashy c'est sooo 2015*
### Retrait des suggestions des titres de consultation
Dans les fenêtres contenant un Titre, désactive le panneau de suggestion (fenêtres d'ordonnance, consultation, certificat, prescription, formulaire, résultats d'examen).

### Affichage automatique de l'historique dans une colonne à gauche
Ouvre automatiquement un historique simplifié (pas de recettes notamment) dans une colonne à gauche de l'écran, uniquement dans les pages de consultation.

### Ajout des courbes de pédiatrie
il suffit de passer la souris au-dessus de l'icone 📈 dans les consultations. Un clic permet de maintenir la courbe affichée. Un autre clic sur 📈 ou sur la courbe permet de la fermer.

## Modification du comportement de la tabulation après recherche patient
*DESMAUX Nathalie [Entrée] [Entrée]*

Permet, après la saisie du nom d'un patient, d'être directement positionné sur son nom, puis de pouvoir naviguer de patient en patient avec la touche Tab (ou maj+Tab pour aller vers le haut)

## Écoute des entrées claviers lors de l'usage de la calculette de prescription
*[1] matin [2] midi [3] soir [4.5] jours*

Lors de l'usage de la calculette il devient possible d'utiliser les chiffres du claviers à la place de clics :
- touches numériques (0-10)
- touche "." pour mettre la virgule
- touche "/" pour préparer une fraction de dose
- touche "retour arrière" pour effacer les valeurs numériques

## Recherche de médicaments
- Lors de la recherche d'un médicament le texte est normalement effacé à chaque changement de type de recherche. L'extension maintient le dernier texte recherché.
- Des boutons de type de recherche favori (paramétrable dans les raccourcis) sont affichés. Par défaut "médicament", "DCI" et "recherche par molécule. (A noter qu'il faut enregistrer le panneau d'option pour que seuls les boutons choisis apparaissent. Sinon tous sont affichés.)



## FSE : Entrées clavier, cotation par défaut +/- envoi automatique au TPE
*Toute la FSE : [alt+6], [n], [n], [alt+v]*

- les touches "n" et "o" permettent de sélectionner "non"/"oui" pour accidents de droit commun, puis ALD
- si elles sont utilisées, entre automatiquement la cotation par défaut (Une de vos cotations favorite doit être nommée 'Défaut')
- Lecture automatique de la carte vitale si elle est non lue
- Affichage de boutons directs pour la réalisation de FDS dégradées et téléconsultation (fonctionnalité en alpha)

## Divers :
Recettes : Affiche automatiquement la recette du jour lors de l'ouverture de la page
Page d'accueil du dossier patient : ajout d'icones pour copier automatiquement le NIR dans le presse-papier

## Weda-Helper-Companion
*Autant pousser l'économie de mouvements jusqu'au bout*

Est à récupérer [sous forme d'un script python](https://github.com/Refhi/Weda-Helper-Companion) [ou sous forme d'executable](https://github.com/Refhi/Weda-Helper-Companion/releases/latest/download/companion.exe) qui reçoit des instructions de l'extension Weda-Helper.
Une fois installée, et que les options de l’extension Weda-Helper dans Chrome on été paramétrées, il doit être lancé et laissé en fond de tâche.
Il exécutera les tâches suivantes :
- si une impression dans Weda est déclenchée via ctrl-P, il lance complètement l'impression. (si cette option est désactivée, ctrl+P amène jusqu'à la dernière validation de l'impression) et ferme la fenêtre de prévisualisation (optionnel).
- si une FSE est validée via Alt+v et que le paiement carte bancaire est sélectionné, il envoie une demande de règlement au TPE (qui doit également être correctement paramétré à l'aide de votre installateur de TPE)

## Problèmes et limitations connues (qui seront peut-être résolues dans de futures mises à jour):
*C'est là où vos pull requests sont les bienvenus*

La touche Alt n'affiche pas l'aide quand le curseur est dans un champ de texte
Les raccourcis claviers se substituent au comportement normal de Chrome, y compris hors de Weda
Adobe reader, lors d'une impression déclenchée par Ctrl+P vole parfois le focus de Chrome.

## Contributions

Les retours constructifs et pull requests sont les bienvenus sur
https://github.com/Refhi/Weda-Helper
