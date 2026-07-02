# Weda Helper

*Du temps pour vos patients, pas pour votre écran !*

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
    - [Ordonnances](#ordonnances)
    - [Demandes](#demandes)
    - [Recherche de médicaments](#recherche-de-médicaments)
    - [Options d'ordonnance numérique](#options-dordonnance-numérique)
    - [Mise en forme :](#mise-en-forme-)
  - [Feuilles de soin](#feuilles-de-soin)
  - [Divers](#divers)
    - [Recettes](#recettes)
    - [Messagerie](#messagerie)
    - [AT](#at)
    - [Métrique](#métrique)
    - [Courriers](#courriers)
    - [Documents du cabinet](#documents-du-cabinet)
    - [Agenda](#agenda)
    - [Antécédents :](#antécédents-)
    - [Navigation :](#navigation-)
    - [Setup "headless"](#setup-headless)
    - [Vaccination "instantanée" :](#vaccination-instantanée-)
  - [Facilitation des imports](#facilitation-des-imports)
  - [Weda-Helper-Companion](#weda-helper-companion)
  - [Problèmes et limitations connues (qui seront peut-être résolues dans de futures mises à jour):](#problèmes-et-limitations-connues-qui-seront-peut-être-résolues-dans-de-futures-mises-à-jour)
  - [Contributions](#contributions)
  - [Remerciements](#remerciements)



## Raccourcis claviers
*Toutes vos tâches quotidiennes à portée de clavier*
=> Un appui sur la touche Alt prolongé (> 1 seconde) affiche un rappel des raccourcis claviers
[Fiche Mémo des raccourcis à imprimer](https://github.com/Refhi/Weda-Helper/blob/main/docs/FicheMemo.pdf)
- Ctrl+D	Télécharge le PDF du document en cours (1er modèle)
- Ctrl+Shift+D	Télécharge le PDF du document en cours (2e modèle)
- Ctrl+P	Imprime le document en cours (1er modèle). Nécessite un module complémentaire pour que l'impression soit entièrement automatique.
=> permet aussi l'impression de l'ensemble des documents du jour depuis la page d'accueil (ne fonctionne que si l'impression automatique est activée)
- Sinon affiche directement le PDF.
- Ctrl+Shift+P	Imprime le document en cours (2e modèle)
- Ctrl+E Envoie le courrier en cours (1er modèle)
- Ctrl+Shift+E	Envoie le courrier en cours (2e modèle)
- Alt+A	Appuie Annuler (ou affiche l'historique des biologies dans la fenêtre des imports)
- Alt+S	Appuie Supprimer
- Alt+D	Insère la date du jour
- Ctrl+S	Appuie Enregistrer
- Ctrl+Shift+S Déclenche le scan d'un document
- Alt+V	Appuie Valider
- Alt+Z	Ouvre les antécédents
- Alt+C	Lit la carte vitale
- Alt+1	Ouvre ou crée la consultation n°1 (+Maj pour créer un(e) nouveau/elle)
- Alt+2	Ouvre ou crée le certificat n°1 (+Maj pour créer un(e) nouveau/elle)
- Alt+3	Ouvre ou crée la demande n°1 (+Maj pour créer un(e) nouveau/elle)
- Alt+4	Ouvre ou crée la prescription n°1 (+Maj pour créer un(e) nouveau/elle)
- Alt+5	Ouvre ou crée courrier n°1 (+Maj pour créer un(e) nouveau/elle)
- Alt+6	Clique sur FSE
- Alt+F	Ouvre ou crée le formulaire n°1 (+Maj pour créer un(e) nouveau/elle)
- Alt+R	Ouvre la recherche
- Alt+W	Appuie sur W
- Ctrl+U	Upload le dernier fichier du dossier envoyé par le Companion
- Ctrl+K ouvre le mode "Quick Access" qui permet d’accéder à un grand nombre d’éléments de la page. Appuyez sur Echap pour en sortir, ou retour arrière pour revenir en arrière.

## Accueil dossier patient
- Ajout d'icones pour copier automatiquement le NIR dans le presse-papier
- Lecture automatique de la carte vitale et accès direct au dossier médical du patient (s’il est seul sur la carte vitale).
*Cette fonction nécessite le connecteur Weda V3 installé sur votre PC. Demandez son installation à votre technicien.*
- Automatisation de la récupération du MT et de sa mise à jour avec l'annuaire des professionnels de santé.
- Automatisation de la déclaration de médecin traitant en un clic.
- Automatisation du contrôle du MT + ouvre un nouvel onglet pour ne pas avoir à patienter. Un message vous indique si cela a fonctionné ou non. Vous pourrez retourner dans le premier onglet si vous souhaitez enregistrer le MT.
- Automatisation partielle de la déclaration de MT : sélectionne automatiquement le patient en cours, pré-coche les cases de consentement. Vous n'avez plus qu'à cliquer sur "Transmettre" pour valider.
- Alerte en cas de retard ou d'absence du VSM et ajout d'un bouton pour le réaliser en un clic. (ne fonctionne que si 70%+ est en CIM-10)
- Recherche d'un patient grâce au contenu du presse-papiers en un clic.
- Bouton "AT sans CV" pour créer un arrêt de travail sans lecture de carte vitale.
- Un bouton pour sauvegarder l’affichage préférentiel des documents dans la page de recherche des documents (via l’icone 💾).

## Consultations
- Affichage automatique de l'historique dans une colonne à gauche : ouvre automatiquement un historique simplifié (pas de recettes notamment) dans une colonne à gauche de l'écran, uniquement dans les pages de Consultation, de Courrier, de Certificat, de Formulaire et Demandes.
- Ouverture automatique des antécédents (désactivé par défaut)
- Filtre automatiquement l'historique pour n'afficher que date et titre (désactivé par défaut)
- Affichage simplifié des courbes de pédiatrie : dans les pages de consultation, il suffit de survoler "📈" devant "Poids", "Taille", "Pc" ou "IMC" pour afficher les courbes correspondantes (ne s'affiche que pour les âges et genres pertinents). Un clic permet de maintenir la courbe affichée. Un autre clic sur 📈 ou sur la courbe permet de la fermer. Ctrl+P permet de l'imprimer.
- Le Z-score de l'IMC est automatiquement calculé si un IMC est présent. Nécessite un champ "Z-IMC" dans les questions de suivi.
=> pour les courbes pédiatriques et le Z-score vous devez cliquer sur "Enregistrer" (Ctrl+S) pour que les valeurs du jour soient prises en compte.
(source : https://banco.podia.com/calculette-imc-z-score, Conceptrice - Caroline CARRIERE-JULIA qui a donné son accord de principe, et propriétaire APOP - représentée par Dr Véronique Nègre. Toutes les deux ont donné leur accord, je les en remercie chaleureusement)
- Modification du comportement de la tabulation après recherche patient. 
- Les questions de suivi sont automatiquement affublées d'un type.
- Permet, après la saisie du nom d'un patient, d'être directement positionné sur son nom, puis de pouvoir naviguer de patient en patient avec la touche Tab (ou maj+Tab pour aller vers le haut)
- Facilitation de la navigation via 'Tab' et 'Shift+Tab' pour naviguer entre les champs de texte et de suivi.
- Retrait des suggestions des titres de consultation : dans les fenêtres contenant un Titre, désactive le panneau de suggestion (fenêtres d'ordonnance, consultation, certificat, prescription, formulaire, résultats d'examen).
- Ajout d’un raccourci vers la vue des traitements depuis la consultation
- Enregistrement automatique des consultations toutes les 3 minutes si aucune entrée n’est détectée pendant au moins 5 secondes. (permet de limiter les pertes de données en cas de crash du navigateur ou de Weda)


## Prescriptions
### Écoute des entrées claviers lors de l'usage de la calculette de prescription
*[1] matin [2] midi [3] soir [4.5] jours*

Lors de l'usage de la calculette il devient possible d'utiliser les chiffres du clavier à la place de clics :
- touches numériques (0-10)
- touche "." pour mettre la virgule
- touche "/" pour préparer une fraction de dose
- touche "retour arrière" pour effacer les valeurs numériques

### Ordonnances
- Option pour afficher automatiquement les ordonnances-type à l'ouverture des pages de prescription.
- Un champ de filtre est ajouté pour rechercher rapidement une pharmacie.

### Demandes
- Cliquer sur "Basculer en mode prescription bi-zone" déplace aussi le texte présent dans le champ ALD

### Recherche de médicaments
- Lors de la recherche d'un médicament le texte est normalement effacé à chaque changement de type de recherche. L'extension maintient le dernier texte recherché.
- Des boutons de type de recherche favori (paramétrable dans les options) sont affichés. Par défaut "médicament", "DCI" et "recherche par molécule. (A noter qu'il faut enregistrer le panneau d'option pour que seuls les boutons choisis apparaissent. Sinon tous sont affichés.)
- Il est possible de déclarer un type de **recherche médicamenteuse par défaut** (dans les options).

### Options d'ordonnance numérique
- Permet d’activer automatiquement par défaut les ordonnances numériques pour les médicaments mais aussi pour les autres prescriptions.
- Permet aussi de cocher automatiquement le consentement des patients ("Oui" ou "Non"). Attention vous êtes toujours tenu de demander l'autorisation au patient systématiquement.
- le type "Biologie" se sélectionne automatiquement lors d'une prescription numérique type "Demande"
- Sélection automatique du type d'ordonnance numérique quand il s'agit d'une Demande, et qu'un mot-clé est détecté (cf. https://github.com/Refhi/Weda-Helper/blob/main/CHANGELOG.md pour le détail des mots-clés)
- mettre la souris sur "Ordonnance numérique" dans les prescriptions affiche un choix Oui/Non pour sélectionner le "consentement à la consultation de l'ordonnance numérique". Utile dans le cadre de l'impression automatisée.
- Clique automatiquement sur "Continuer sans l'ordonnance numérique" si le message d'erreur est détecté (désactivé par défaut).
- ajout d’un champ de filtre pour rechercher rapidement une pharmacie lors de la sélection de pharmacie dans la création d’une prescription.

### Mise en forme :
- Suppression automatique des {mots entre accolades} dans les documents générés par formulaire où l'option a été ignorée (ex. "Certificat de santé de {Nom du patient}" devient "Certificat de santé").
- dans les prescriptions médicamenteuses, changement de l'ensemble de la durée de traitement en 1 seul clic (prend quelques secondes par ligne de prescription).

## Feuilles de soin
*Toute la FSE : [alt+6], [n], [n], [alt+v]*
- les touches "n" et "o" permettent de sélectionner "non"/"oui" pour accidents de droit commun, puis ALD
- les touches "t" et "c" permettent de sélectionner les tiers payants correspondants (AMO et AMC)
- Si elles sont utilisées, utilise une cotation dans vos favoris :
  - la cotation "DéfautPédia" pour les 0-6 ans
  - la cotation "DéfautALD" pour les ALD et les Accidents de travail
  - la cotation "DéfautTC" pour les téléconsultations
  - la cotation "DéfautMOP" pour les patients de 80+ ans dont vous n'êtes pas le MT
  - la cotation "Défaut" pour les autres
- Lecture automatique de la carte vitale si elle est non lue
- Affichage de boutons directs pour la réalisation de FDS dégradées et téléconsultation
- Option pour cocher automatiquement "accident causé par un tier" ou "gestion unique"
- Sélection automatique de "je suis le médecin traitant" quand c'est le cas et qu'un autre cas de figure est sélectionné
- Ctrl+P imprime la FDS dans le cas des FSE dégradées
- Mémorisation des derniers choix ("ne peux signer" et "Retirer le fond")
- Coche automatiquement "Présentation d'un feuillet AT" si l'assurance "Accident du travail" est sélectionnée
- option pour automatiquement cocher "Inclure la FSP en SCOR" si la FSE est dégradée (activée par défaut)
- sélectionne automatiquement "Rien" dans les Pièces justificatives AMO si "Champ de donnée Actes - Pièce Justificative AMO invalide : Erreur de saisie Nature" est détecté
- maintient le choix du mode de prise en charge AMC
- affichage de l'historique des cotations sur 5 ans (filtré ou non par cotations courantes), utile pour surveiller les cotations à ne faire qu'une fois tout les ans par exemple.
- assistance à la cotation : Ajout d'une infobulle pour avertir de possibles cotations applicables à certaines situation (ex. SHE, MCG, PAV, MHP et RDV), qu'on oublie habituellement tout le temps...
- validation automatique des FSE dégradées en SCOR


## Divers
### Recettes
- Affiche automatiquement la recette du jour lors de l'ouverture de la page

### Messagerie
- rafraichissement automatique des messages Mssanté. Il vérifiera 30 secondes après le chargement de la page, puis toutes les 15 minutes. Il vaut donc mieux laisser un onglet ouvert sur cette page.

### AT
- simplification de la réalisation des arrêts de travail intégrés à Weda (lecture auto CV, selection auto de l'assuré, impression automatique, autofill de la date en cas de sorties libres, fermeture automatique). Attention le plugin Adobe Acrobat Reader doit être désactivé pour que l'impression automatique fonctionne ici.
- La case "Mon patient accepte que je transmette le présent avis d'arrêt de travail pour son compte [...]" se coche automatiquement.
- Ajout d’un champ de recherche de motif d’arrêt de travail (tolérant aux fautes de frappe et aux acronymes courants).
- Classement des motifs d’arrêt de travail par ordre alphabétique.
- Sorties autorisées cochées par défaut pour les arrêts de travail (désactivable dans les options)
- Motif pour les sorties libres personnalisable dans les options de Weda-Helper


### Métrique
- une estimation du nombre d'action est désormais présente dans les options ! (Attention, c'est très approximatif)

### Courriers
- le type de document pour l'envoi au DMP est automatiquemnt sauvegardé d'une fois sur l'autre.
- Permet de sélectionner automatiquement le(s) médecin(s)traitant(s) comme destinataire(s) lors de l'envoi d'un courrier (désactivé par défaut)

### Documents du cabinet
- ajout d'un bouton permettant l'impression directe d'un PDF

### Agenda
- ouverture du dossier patient directement depuis l'agenda via un clic droit sur le rendez-vous

### Accès facilité aux ATCD et aux notes depuis les recherches patients
- accès facilité aux ATCD et aux notes patients depuis n'importe quelle liste de patients issus d'une recherche : Bouton de droite pour les notes, bouton du milieu (ou ctrl+clic) pour les ATCD

### Antécédents :
- ajout d'options pour limiter le nombre d'atcd affichés en CIM 10 et de les trier par ordre alphabétique
- implémentation d'une pré-alerte : si la date de l'alerte est dans moins de 6 mois (paramétrable), l'alerte est affichée en orange
- système d'alerte si un antécédent contient un mot-clé précisé dans les options (utile pour mettre en lumière les patients éligibles à un suivi spécifique comme l'inscription à un ETP).
- bouton "+1clickVSM" pour créer un VSM en un clic depuis la page des antécédents.

### Navigation :
- Un clic du milieu sur le W du Menu W ouvre un nouvel onglet vers l'accueil du dossier patient, et non le module en cours.
- Maintient du niveau de scroll lors de l'appuis sur le bouton "Suite" dans l'accueil patient.

### Setup "headless"
- possibilité de shunter le message de mise à jour de Weda sur les postes où vous souhaitez automatiser l'ouverture de Weda (désactivé par défaut). Cela ne correspond qu'à des usages très spécifiques, merci de ne pas l'activer sans en comprendre les implications.

### Vaccination "instantanée" :
- si activée, toute ouverture de dossier patient amène immédiatement sur le scan du datamatrix d'un vaccin, permettant aux vaccineurs en série de gagner du temps (particulièrement pensée pour les pharmaciens). Ce paramètre est facilement accessible depuis la popup de l'extension (clic sur l'icône de l'extension).
- le champ de date d’expiration du vaccin est automatiquement formatté (ex. "0512" devient "05/12/2025")
- raccourcis pour scanner directement le datamatrix d'un vaccin depuis l'arborescence des vaccins.
- la case "x ième injection effectuée" se coche automatiquement.




## Facilitation des imports
*Tout les imports au clavier en 4 appuis sur tabulations et un appuis sur Entrée*

Dans la fenêtre d'importation des documents (https://secure.weda.fr/FolderMedical/UpLoaderForm.aspx), les modifications suivantes sont effectuées :
- Modification de l'ordre de parcours des tabulations pour permettre des intégrations uniquement au clavier (appuyer sur Tab pour passer d'un champ à l'autre)
- Agrandissement de la fenêtre de prévisualisation pour faciliter la lecture du PDF à importer
- Complétion automatique des dates partielles
- En cliquant sur l'icône de l'extension, le bouton "Tout mettre en consultation" permet de sélectionner d'un coup "Consultation" pour l'ensemble des documents en attente d'importation.
- recherche automatique du patient, synthèse d'un titre, détection automatique de la date
- Classification automatique des documents (titre, destination, type de document, médecin destinataire, etc.) dans les imports de masse et dans la messagerie sécurisée (Merci Abel !)

- On peut désormais utiliser Ctrl+U pour uploader directement dans Weda le document le plus récent présent dans un dossier pré-sélectionné dans le Companion. Un nouveau bouton permet d'archiver si souhaité le document après l'upload.
- Option pour décocher automatiquement le message et le fichier IHE_XDM.zip lors de l'importation d'un message depuis la messagerie sécurisée
- Possibilité d'inverser automatiquement le titre du corps du message et le titre du message lors de la réception d'un courrier (beta, merci de me faire part de vos retours)


## Weda-Helper-Companion
*Autant pousser l'économie de mouvements jusqu'au bout*
Installez et laisser tourner ce logiciel sur votre ordinateur pour avoir des fonctionnalités supplémentaires :
- impression directe automatique complète et instantanée (grace à l'option "Impression Instantanée" dans les options de l'extension)
- Envoie le montant à régler à votre TPE (quand on valide une FSE - via alt+v - ou un règlement manuel)
- un lien vers le journal d'activité du Companion est présent dans la page des options de Weda-Helper
=> Procédures d'installation et de paramétrage sur [le readme du Companion](https://github.com/Refhi/Weda-Helper-Companion)
- pensez à vérifier votre firewall s'il ne fonctionne pas ou si des messages type "Impossible de joindre Weda-Helper-Companion : est-il bien paramétré et démarré ?" apparaissent. Cf. [Guide de dépannage sur le firewall windows](https://github.com/Refhi/Weda-Helper/issues/377#issuecomment-2716796999)


## Problèmes et limitations connues (qui seront peut-être résolues dans de futures mises à jour):
*C'est là où vos pull requests sont les bienvenus*
- La touche Alt n'affiche pas l'aide quand le curseur est dans un champ de texte

## Contributions

Les retours constructifs, rapport de bug et pull requests sont les bienvenus sur
[https://github.com/Refhi/Weda-Helper](https://github.com/Refhi/Weda-Helper)
Les encouragements sont les bienvenus sur [le site de la communauté](https://communaute.weda.fr/discussions-n4y99j90/post/weda-helper-pQfPGckmrhwKBJC/Weda-Helper-et-Weda-Helper-Companion/td-p/2791)

*Annonce en date du 30/04/2025* : à compter d'aujourd'hui l'extension est considérée comme "fonctionnellement complète". Je ne prévois donc plus d'ajout de nouvelles fonctionnalités jusqu'à Weda 2, mais je continuerai à corriger les bugs et à faire des mises à jour de sécurité si nécessaire. Je vous remercie pour votre soutien et vos contributions !

## Remerciements
- à Abel pour ses nombreuses contributions !
- à Weda pour leur super logiciel (j'espère que ces modestes contributions vous inspirerons)
- au Frangin
- à DrFlo pour son soutien et sa contribution aux descriptions des options et à ce Readme qu'il a entièrement remanié (et à certains snipets)
- à Coralie pour les chocolats 😋 !
- à tout les utilisateurs qui ont commenté, suggéré et encouragé Weda-Helper !
- à notre Expert qui est vraiment top (ils se reconnaîtrons)
- et bien sur à ceux qui ont participé € ^^
