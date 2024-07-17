# Weda Helper

Extension pour Chrome permettant de faciliter les tâches quotidiennes sur Weda, améliorer l’expérience utilisateur et gagner du temps.

Bien que satisfait de Weda, j'ai trouvé que le nombre de clics pouvait être très nettement diminué en implémentant des raccourcis claviers et quelques automatismes.

Entièrement codé par un médecin Eurois et un médecin Toulousain, pour eux-mêmes et leurs pairs, j'espère qu'elle vous plaira autant qu'à moi au quotidien !

La plupart des raccourcis et des fonctionnalités peuvent être activées ou non dans les options du module ou dans les raccourcis.

Cf. ci-dessous pour les retours et les contributions.

**Table des Matières**
- [Weda Helper](#weda-helper)
  - [Raccourcis claviers](#raccourcis-claviers)
  - [Accueil dossier patient](#accueil-dossier-patient)
  - [Consultations](#consultations)
  - [Prescriptions](#prescriptions)
    - [Écoute des entrées claviers lors de l'usage de la calculette de prescription](#écoute-des-entrées-claviers-lors-de-lusage-de-la-calculette-de-prescription)
    - [Ordonnances-types](#ordonnances-types)
    - [Recherche de médicaments](#recherche-de-médicaments)
    - [Options d'ordonnance numérique](#options-dordonnance-numérique)
  - [Feuilles de soin](#feuilles-de-soin)
  - [Divers](#divers)
    - [Recettes](#recettes)
    - [Messagerie](#messagerie)
    - [AT](#at)
    - [Métrique](#métrique)
    - [Courriers](#courriers)
    - [Documents du cabinet](#documents-du-cabinet)
  - [Facilitation des imports](#facilitation-des-imports)
  - [Weda-Helper-Companion](#weda-helper-companion)
  - [Problèmes et limitations connues (qui seront peut-être résolues dans de futures mises à jour):](#problèmes-et-limitations-connues-qui-seront-peut-être-résolues-dans-de-futures-mises-à-jour)
  - [Contributions](#contributions)
  - [Remerciements](#remerciements)



## Raccourcis claviers
*Toutes vos tâches quotidiennes à portée de clavier*
[Fiche Mémo des raccourcis à imprimer](https://github.com/Refhi/Weda-Helper/blob/main/FicheMemo.pdf)
Ctrl+D	Télécharge le PDF du document en cours (1er modèle)
Ctrl+Shift+D	Télécharge le PDF du document en cours (2e modèle)
Ctrl+P	Imprime le document en cours (1er modèle). Nécessite un module complémentaire pour que l'impression soit entièrement automatique. Sinon affiche directement le PDF.
Ctrl+Shift+P	Imprime le document en cours (2e modèle)
Alt+A	Appuie Annuler
Alt+S	Appuie Supprimer
Ctrl+S	Appuie Enregistrer
Alt+V	Appuie Valider
Alt+Z	Ouvre les antécédents
Alt+C	Lit la carte vitale
Alt+2	Ouvre ou crée le certificat n°1
Alt+1	Ouvre ou crée la consultation n°1
Alt+5	Ouvre ou crée courrier n°1
Alt+3	Ouvre ou crée la demande n°1
Alt+F	Ouvre ou crée le formulaire n°1
Alt+6	Clique sur FSE
Alt+4	Ouvre ou crée la prescription n°1
Alt+R	Ouvre la recherche
Alt+W	Appuie sur W
Ctrl+U	Upload le dernier fichier du dossier envoyé par le Companion

**Chrome limite malheureusement les raccourcis par défaut. Les raccourcis doivent donc être définis manuellement (et entièrement personnalisés) dans chrome://extensions/shortcuts**

- Rappel des raccourcis : Un appui sur la touche Alt prolongé (> 1 seconde) affiche un rappel des principaux raccourcis claviers

## Accueil dossier patient
- Ajout d'icones pour copier automatiquement le NIR dans le presse-papier
- Lecture automatique de la carte vitale et accès direct au dossier médical du patient (s’il est seul sur la carte vitale).
*Cette fonction nécessite le connecteur Weda V3 installé sur votre PC. Demandez son installation à votre technicien.*

## Consultations
- Affichage automatique de l'historique dans une colonne à gauche : ouvre automatiquement un historique simplifié (pas de recettes notamment) dans une colonne à gauche de l'écran, uniquement dans les pages de Consultation, de Courrier, de Certificat, de Formulaire et Demandes.
- Ouverture automatique des antécédents (désactivé par défaut)
- Affichage simplifié des courbes de pédiatrie : dans les pages de consultation, il suffit de survoler "📈" devant "Poids", "Taille", "Pc" ou "IMC" pour afficher les courbes correspondantes (ne s'affiche que pour les âges et genres pertinents). Un clic permet de maintenir la courbe affichée. Un autre clic sur 📈 ou sur la courbe permet de la fermer.
Modification du comportement de la tabulation après recherche patient. Ctrl+P permet de l'imprimer.
- Les questions de suivi sont automatiquement affublées d'un type.
- Permet, après la saisie du nom d'un patient, d'être directement positionné sur son nom, puis de pouvoir naviguer de patient en patient avec la touche Tab (ou maj+Tab pour aller vers le haut)
- Facilitation de la navigation via 'Tab' et 'Shift+Tab' pour naviguer entre les champs de texte et de suivi.
- Retrait des suggestions des titres de consultation : dans les fenêtres contenant un Titre, désactive le panneau de suggestion (fenêtres d'ordonnance, consultation, certificat, prescription, formulaire, résultats d'examen).


## Prescriptions
### Écoute des entrées claviers lors de l'usage de la calculette de prescription
*[1] matin [2] midi [3] soir [4.5] jours*

Lors de l'usage de la calculette il devient possible d'utiliser les chiffres du clavier à la place de clics :
- touches numériques (0-10)
- touche "." pour mettre la virgule
- touche "/" pour préparer une fraction de dose
- touche "retour arrière" pour effacer les valeurs numériques

### Ordonnances-types
- Option pour afficher automatiquement les ordonnances-type à l'ouverture des pages de prescription.

### Recherche de médicaments
- Lors de la recherche d'un médicament le texte est normalement effacé à chaque changement de type de recherche. L'extension maintient le dernier texte recherché.
- Des boutons de type de recherche favori (paramétrable dans les raccourcis) sont affichés. Par défaut "médicament", "DCI" et "recherche par molécule. (A noter qu'il faut enregistrer le panneau d'option pour que seuls les boutons choisis apparaissent. Sinon tous sont affichés.)

### Options d'ordonnance numérique
- Permet d’activer automatiquement par défaut les ordonnances numériques pour les médicaments mais aussi pour les autres prescriptions.
- Permet aussi de cocher automatiquement le consentement des patients. Attention vous êtes toujours tenu de demander l'autorisation au patient systématiquement.
- le type "Biologie" se sélectionne automatiquement lors d'une prescription numérique type "Demande"
- Sélection automatique du type d'ordonnance numérique quand il s'agit d'une Demande, et qu'un mot-clé est détecté (cf. https://github.com/Refhi/Weda-Helper/blob/main/CHANGELOG.md pour le détail des mots-clés)
- "Ordonnance numérique" se décoche automatiquement si on sélection une Demande d'Imagerie.


## Feuilles de soin
*Toute la FSE : [alt+6], [n], [n], [alt+v]*
- les touches "n" et "o" permettent de sélectionner "non"/"oui" pour accidents de droit commun, puis ALD
- les touches "t" et "c" permettent de sélectionner les tiers payants correspondants (AMO et AMC)
- Si elles sont utilisées, utilise une cotation dans vos favoris :
  - la cotation "DéfautPédia" pour les 0-6 ans
  - la cotation "DéfautALD" pour les ALD
  - la cotation "Défaut" pour les autres 
- Lecture automatique de la carte vitale si elle est non lue
- Affichage de boutons directs pour la réalisation de FDS dégradées et téléconsultation
- Option pour cocher automatiquement "accident causé par un tier" ou "gestion unique"
- Sélection automatique de "je suis le médecin traitant" quand c'est le cas et qu'un autre cas de figure est sélectionné


## Divers
### Recettes
- Affiche automatiquement la recette du jour lors de l'ouverture de la page

### Messagerie
- rafraichissement automatique des messages Mssanté. Il vérifiera 30 secondes après le chargement de la page, puis toutes les 15 minutes. Il faut donc mieux laisser un onglet ouvert sur cette page.

### AT
- simplification de la réalisation des arrêts de travail intégrés à Weda (lecture auto CV, selection auto de l'assuré, impression automatique, autofill de la date en cas de sorties libres, fermeture automatique)

### Métrique
- une estimation du nombre d'action est désormais présente dans les options ! (Attention, c'est très approximatif)

### Courriers
- le type de document pour l'envoi au DMP est automatiquemnt sauvegardé d'une fois sur l'autre.

### Documents du cabinet
- ajout d'un bouton permettant l'impression directe d'un PDF



## Facilitation des imports
*Tout les imports au clavier en 4 appuis sur tabulations et un appuis sur Entrée*

Dans la fenêtre d'importation des documents (https://secure.weda.fr/FolderMedical/UpLoaderForm.aspx), les modifications suivantes sont effectuées :
- Modification de l'ordre de parcours des tabulations pour permettre des intégrations uniquement au clavier (appuyer sur Tab pour passer d'un champ à l'autre)
- Agrandissement de la fenêtre de prévisualisation pour faciliter la lecture du PDF à importer
- Complétion automatique des dates partielles
- En cliquant sur l'icône de l'extension, le bouton "Tout mettre en consultation" permet de sélectionner d'un coup "Consultation" pour l'ensemble des documents en attente d'importation.

- On peut désormais utiliser Ctrl+U pour uploader directement dans Weda le document le plus récent présent dans un dossier pré-sélectionné dans le Companion.
- Option pour décocher automatiquement le message et le fichier IHE_XDM.zip lors de l'importation d'un message depuis la messagerie sécurisée


## Weda-Helper-Companion
*Autant pousser l'économie de mouvements jusqu'au bout*
Installez et laisser tourner ce logiciel sur votre ordinateur pour avoir des fonctionnalités supplémentaires :
- impression directe automatique complète
- Envoie le montant à régler à votre TPE

=> Procédures d'installation et de paramétrage sur [le readme du Companion](https://github.com/Refhi/Weda-Helper-Companion)


## Problèmes et limitations connues (qui seront peut-être résolues dans de futures mises à jour):
*C'est là où vos pull requests sont les bienvenus*
- La touche Alt n'affiche pas l'aide quand le curseur est dans un champ de texte

## Contributions

Les retours constructifs, rapport de bug et pull requests sont les bienvenus sur
[https://github.com/Refhi/Weda-Helper](https://github.com/Refhi/Weda-Helper)
Les encouragements sont les bienvenus sur [le site de la communauté](https://communaute.weda.fr/t5/Entraide-Logiciel-Weda/Weda-Helper-et-Weda-Helper-Companion/td-p/2791)

## Remerciements
- à Abel pour ses nombreuses contributions !
- à Weda pour leur super logiciel (j'espère que ces modestes contributions vous inspirerons)
- au Frangin
- à DrFlo pour son soutien et sa contribution aux descriptions des options et à ce Readme qu'il a entièrement remanié (et à certains snipets)
- à Coralie pour les chocolats 😋 !
- à tout les utilisateurs qui ont commenté, suggéré et encouragé Weda-Helper !
- à notre Expert qui est vraiment top (ils se reconnaîtrons)
- et bien sur à ceux qui ont participé € ^^
