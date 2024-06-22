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
  - [Facilitation des imports](#facilitation-des-imports)
  - [Weda-Helper-Companion](#weda-helper-companion)
    - [Impression directe automatique ](#impression-directe-automatique)
    - [Installation de Weda Helper Companion](#installation-de-weda-helper-companion)
    - [Lancer le Companion automatiquement au démarrage de Windows](#lancer-le-companion-automatiquement-au-démarrage-de-windows)
    - [Activation du lien avec votre TPE](#activation-du-lien-avec-votre-tpe)
    - [Pour les geeks](#pour-les-geeks)
  - [Problèmes et limitations connues (qui seront peut-être résolues dans de futures mises à jour):](#problèmes-et-limitations-connues-qui-seront-peut-être-résolues-dans-de-futures-mises-à-jour)
  - [Contributions](#contributions)
  - [Remerciements](#remerciements)



## Raccourcis claviers
*Toutes vos tâches quotidiennes à portée de clavier*
- Imprime le document en cours (Suggestion : Ctrl+P) (attention, nécessite le module [Weda-Helper-Companion](#weda-helper-companion) pour que l'impression soit entièrement automatique. Sinon affiche directement le PDF.)
- Appuie Annuler (Suggestion : Alt+A)
- Appuie Supprimer (Suggestion : Alt+S)
- Appuie Enregistrer (Suggestion : Ctrl+S)
- Appuie Valider (Suggestion : Alt+V)
- Lit la carte vitale (Suggestion : Alt+C)
- Ouvre ou crée le certificat n°1 (Suggestion : Alt+2)
- Ouvre ou crée la consultation n°1 (Suggestion : Alt+1)
- Ouvre ou crée courrier n°1 (Suggestion : Alt+5)
- Ouvre ou crée la demande n°1 (Suggestion : Alt+3)
- Ouvre ou crée le formulaire n°1 (Suggestion : Alt+F)
- Clique sur FSE (Suggestion : Alt+6)
- Ouvre ou crée la prescription n°1 (Suggestion : Alt+4)
- Ouvre la recherche (Suggestion : Alt+R)
- Appuie sur W (Suggestion : Alt+W)
- Affiche/masque les antécédents (Suggestion : Alt+Z)

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
- Facilitation du remplissage des valeurs tensionnelles (ex. *'Poids' 75 [tab] 'TAS' 150 [tab] 'TAD' 80*) : dans la fenêtre de consultation, lorsque l'on rempli une valeur de suivi, la touche tabulation envoie directement vers la case suivante (plus besoin d'appuyer 4 fois)
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


## Feuilles de soin
*Toute la FSE : [alt+6], [n], [n], [alt+v]*
- les touches "n" et "o" permettent de sélectionner "non"/"oui" pour accidents de droit commun, puis ALD
- les touches "t" et "c" permettent de sélectionner les tiers payants correspondants (AMO et AMC)
- Si elles sont utilisées, entre automatiquement la cotation par défaut (Une de vos cotations favorites doit être nommée 'Défaut')
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



## Facilitation des imports
*Tout les imports au clavier en 4 appuis sur tabulations et un appuis sur Entrée*

Dans la fenêtre d'importation des documents (https://secure.weda.fr/FolderMedical/UpLoaderForm.aspx), les modifications suivantes sont effectuées :
- Modification de l'ordre de parcours des tabulations pour permettre des intégrations uniquement au clavier (appuyer sur Tab pour passer d'un champ à l'autre)
- Agrandissement de la fenêtre de prévisualisation pour faciliter la lecture du PDF à importer
- Complétion automatique des dates partielles
- En cliquant sur l'icône de l'extension, le bouton "Tout mettre en consultation" permet de sélectionner d'un coup "Consultation" pour l'ensemble des documents en attente d'importation.

On peut désormais utiliser Ctrl+U pour uploader directement dans Weda le document le plus récent présent dans un dossier pré-sélectionné dans le Companion.


## Weda-Helper-Companion
*Autant pousser l'économie de mouvements jusqu'au bout*
Installez et laisser tourner ce logiciel sur votre ordinateur pour avoir des fonctionnalités supplémentaires. Une fois installé, et les options de l’extension Weda-Helper dans Chrome paramétrées, il doit être lancé et laissé en fond de tâche. Il exécutera les tâches suivantes :
### Impression directe automatique 
Si une impression dans Weda est déclenchée via raccourci clavier (ctrl-P par exemple), il lance complètement l'impression. (si cette option est désactivée, ctrl+P amène jusqu'à la dernière validation de l'impression) et ferme la fenêtre de prévisualisation avec retour possible aux prescriptions ou au dossier patient directement (à paramétrer au choix dans les options de Weda Helper).
Envoie le montant à régler à votre TPE
Si une FSE est validée via raccourcis clavier  (Alt+v par exemple) et que le paiement carte bancaire est sélectionné, le Companion envoie une demande de règlement au TPE avec le solde à régler (TPE à paramétrer avec l'aide de votre installateur de TPE)
### Installation de Weda Helper Companion
Télécharger le fichier exécutable [companion.exe](https://github.com/Refhi/Weda-Helper-Companion/releases/latest/download/companion.exe) dans le dossier de votre choix, et le démarrer.
ATTENTION ! Votre navigateur Chrome peut bloquer le téléchargement. Si c’est le cas suivez la procédure suivante :
Cliquez sur le menu Chrome puis sur Téléchargement. Vous pouvez aussi utiliser le raccourci clavier Ctrl + J.
Cliquez sur le bouton Converser le fichier dangereux sous le fichier bloqué.
Confirmez l'opération en cliquant sur Conserver quand même.

Windows aussi va probablement afficher un message de prudence concernant les risques d'exécution d'un programme extérieur. Je vous rassure : le programme a été fait sans aucun virus/malware/etc... Mais n'hésitez pas à passer un coup d'antivirus pour vous rassurer avant d'autoriser l'exception (vous aurez peut-être besoin de cliquer sur "plus de renseignements" sous Windows 11)
Puis suivre les instructions pour l’installation en quelques secondes puis aller dans le dossier d’installation et ouvrez le fichier conf.ini (avec un éditeur de texte comme wordpad) pour le configurer selon les instructions incluses.
### Lancer le Companion automatiquement au démarrage de Windows
Vous pouvez placer un raccourcis dans le dossier "démarrage" de votre session pour que le Companion se lance automatiquement au démarrage (Win+R, puis taper shell:startup, puis coller le raccourcis du Companion dans le dossier démarrage)
### Activation du lien avec votre TPE
Pour le lien avec le TPE, appelez votre fournisseur et demandez lui d’activer le mode caisse (protocole caisse ou kk). Puis il faut trouver l’adresse IP du TPE (dans les paramètres du TPE ou de votre box internet) et son port (en général 5000 pour VERIFONE et 8888 pour INGENICO).
Ces informations sont à rentrer dans le fichier conf.ini qui se trouve dans le dossier d’installation du Companion.
### Pour les geeks
Vous pouvez directement récupérer companion.py (et le module tpe.py) et l'executer de la même façon (avec une limitation : le vol de focus ne peut être contré que via l'exe)


## Problèmes et limitations connues (qui seront peut-être résolues dans de futures mises à jour):
*C'est là où vos pull requests sont les bienvenus*

- La touche Alt n'affiche pas l'aide quand le curseur est dans un champ de texte
- Les raccourcis claviers se substituent au comportement normal de Chrome, y compris hors de Weda
Adobe reader, lors d'une impression déclenchée par Ctrl+P vole parfois le focus de Chrome.

## Contributions

Les retours constructifs, rapport de bug et pull requests sont les bienvenus sur
[https://github.com/Refhi/Weda-Helper](https://github.com/Refhi/Weda-Helper)
Les encouragements sont les bienvenus sur [le site de la communauté](https://communaute.weda.fr/t5/Entraide-Logiciel-Weda/Weda-Helper-et-Weda-Helper-Companion/td-p/2791)

## Remerciements
- à Weda pour leur super logiciel (j'espère que ces modestes contributions vous inspirerons)
- au Frangin
- à DrFlo pour son soutien et sa contribution aux descriptions des options et à ce Readme qu'il a entièrement remanié (et à certains snipets)
- à Coralie pour les chocolats 😋 !
- à tout les utilisateurs qui ont commenté, suggéré et encouragé Weda-Helper !
- à notre Expert qui est vraiment top (ils se reconnaîtrons)
- et bien sur à ceux qui ont participé € ^^
