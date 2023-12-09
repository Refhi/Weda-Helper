# Weda Helper

Extension pour Chrome permettant de faciliter les tâches quotidiennes sur Weda.
La plupart des raccourcis et des fonctionnalités peuvent être activées ou non dans les options du module ou dans les raccourcis.
Entièrement codé par un médecin Eurois, pour lui-même et ses pairs, j'espère qu'elle vous plaira autant qu'à moi au quotidien !
Cf. ci-dessous pour les retours et les contributions.

## Raccourcis claviers

- "Appuie sur Valider" : Alt+V
- "Appuie sur Annuler" : Alt+A
- "Imprime le document en cours" : Ctrl+P (nécessite un module complémentaire installé en local
  pour être totalement fonctionnel)
- "Appuie sur Supprimer" : Alt+S

Chrome limite les raccourcis par défaut. Les suivants doivent donc être
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

## Affichage des raccourcis claviers du menu W
Un appuis sur la touche Alt prolongé (> 1 seconde) affiche un rappel des raccourcis claviers

## Facilitation des imports
Dans la fenêtre d'importation des documents
(https://secure.weda.fr/FolderMedical/UpLoaderForm.aspx), les modifications
suivantes sont effectuées :
- Modification de l'ordre de parcours des tabulations pour permettre des
  intégrations uniquement au clavier (appuyer sur Tab pour passer d'un champ à
  l'autre)
- Agrandissement de la fenêtre de prévisualisation pour faciliter la lecture du
  PDF à importer
- Complétion automatique des dates partielles
- En cliquant sur l'icône de l'extension, le bouton "Tout mettre en consultation" permet de sélectionner d'un coup "Consultation" pour l'ensemble des documents en attente d'importation.

## Facilitation du remplissage des valeurs tensionnelles
Dans la fenêtre de consultation, lorsque l'on remplie une valeur de suivi, la touche tabulation envoie directement vers la case suivante (plus besoin d'appuyer 4 fois)

## Retrait des suggestions des titres de consultation
Dans les fenêtres contenant un Titre, désactive le panneau de suggestion (fenêtres d'ordonnance, consultation, certificat, prescription, formulaire, résultats d'examen).

## Modification du comportement de la tabulation après recherche patient
Permet, après la saisie du nom d'un patient, d'être directement positionné sur son nom, puis de pouvoir naviguer de patient en patient avec la touche Tab (ou maj+Tab pour aller vers le haut)

## Écoute des entrées claviers lors de l'usage de la calculette de prescription
Lors de l'usage de la calculette il devient possible d'utiliser les chiffres du claviers à la place de clics :
- touches numériques (0-10)
- touche "." pour mettre la virgule
- touche "/" pour préparer une fraction de dose
- touche "retour arrière" pour effacer les valeurs numériques

## Écoute des entrées claviers dans la réalisation des FSE
les touches "n" et "o" permettent de sélectionner "non"/"oui" pour accidents de droit commun, puis ALD

## Weda-Helper-Companion
Est un script python, à récupérer sur https://github.com/Refhi/Weda-Helper-Companion qui reçoit des instructions de l'extension Weda-Helper.
Une fois installée, et que les options de l’extension Weda-Helper dans Chrome on été paramétrées, il doit être lancé et laissé en fond de tâche.
Il exécutera les tâches suivantes :
- si une impression dans Weda est déclenchée via ctrl-P, il simule des entrées clavier (9 tabulations + 2 entrées) pour lancer complètement l'impression
- si une FSE est validée via Alt+v et que le paiement carte bancaire est sélectionné, il envoie une demande de règlement au TPE (qui doit également être correctement paramétré)

## Problèmes et limitations connues (qui seront peut-être résolues dans de futures mises à jour):
La touche Alt n'affiche pas l'aide quand le curseur est dans un champ de texte
Les raccourcis claviers se substituent au comportement normal de Chrome, y compris hors de Weda

## Contributions

Les retours constructifs et pull requests sont les bienvenus sur
https://github.com/Refhi/Weda-Helper
