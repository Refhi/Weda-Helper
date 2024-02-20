# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

## [1.8] - 2024-02-17
# ajout :
- option pour ouvrir automatiquement le panneau d'ordos types à l'ouverture des prescriptions médicamenteuses
- ajout des courbes de pédiatrie (il suffit de passer la souris au-dessus de l'icone 📈 dans les consultations. Un clic permet de maintenir la courbe affichée. Un autre clic sur 📈 ou sur la courbe permet de la fermer).

# fix :
- la recherche médicamenteuse se lançait automatiquement au chargement de la page de prescription, ce qui faisait perdre une ou deux secondes
- le consentement automatique se coche également dans les pages de Demandes
- le focus était perdu lors de l'apparition de l'historique dans le 1/3 gauche
- l'historique dans le 1/3 gauche disparaissait en cas de ctrl+S ou d'enregistrement


## [1.7] - 2024-02-09
# ajouts :
- la liste des patients suis le défilé de la fenêtre dans les résultats HPRIM
- lecture automatique de la carte vitale à l'insersion (nécessite Weda Connect v3) et ouverture automatique du dossier patient lié si la carte vitale est lue alors qu'il n'existe qu'un seul patient dessus
- affichage automatique de l'historique dans les pages de consultation sur le 1/3 gauche de l'écran

# fix :
- retrait pour de bon du message d'erreur apparaissant parfois après l'impression via le companion ("[focus]...")

# divers :
- lors de la mise à jour vers 1.7, l'option de lecture auto de la carte vitale sera activée pour tout le monde. Elle peut toujours être désactivée dans un second temps.



## [1.6.0] - 2024-01-28
# ajouts :
- ajout du raccourcis ouvrant la page de recherche patient (amélioration au passage de la façon dont l'extension attend l'apparition du premier patient séléctionable)
- ajout du "à" et du "," dans l'écoute clavier du pavé de prescription numérique
- click automatique sur le bouton refresh dans la page de gestion des FSEs
- choix possible des pages où prescription numérique doit s'activer : Demande et/ou Prescription
- choix possible pour le comportement post-impression via le Companion : rien, fermer la prévisu, retourner au dossier patient
- message de bienvenue et d'explication lors de mise à jour avec liens vers communaute.weda.fr et le github

# correctifs :
- modification de la façon dont est géré la facturation par défaut. Il sélectionne désormais la facturation nommée "Défaut" dans les favoris. Il n'est plus nécessaire d'utiliser la touche de tabulation pour valider la cotation par défaut.
- tentative de fix sur les boutons rajoutés de téléconsultation et dégradé dans la FSE
- fix d'un bug dans le chargement du maintient de la recherche dans les prescriptions
- fix d'un problème dans la page des FSE où il n'était plus possible de taper une cotation avec N ou O sous peine de reselectionner la valeur par defaut
- fix des boutons "téléconsultation" et "dégradé" apparaissant après un échec de lecture de carte vitale
- fix du panneaux de favoris qui se fermait lors des prescriptions
- retrait du "-"=> " " de l'analyse du prénom du patient
- retrait du message d'erreur du Companion si c'est issu d'un problème de [focus]
- l'icone de copie du NIR/secu disparaissait lorsqu'on cliquait sur certains éléments
- fix : l'envoi vers le DMP était inhibé lors d'une impression automatisée complète via le Companion
- l'impression pouvait parfois se lancer deux fois

# refactory :
- passage d'une bonne partie des fonctions d'attente vers lightObserver

## [1.5.0] - 2024-01-24
- modification des options : une valeur par défaut est désormais facilement paramétrable
- fix des modification autour des champs de recherche des médicaments
- fermeture automatique de la fenêtre de prévisualisation du PDF après demande d'impression, si le lien avec le companion est actif
- ajout de boutons pour les types de recherches favorites pour la recherche de médicaments.

## [1.4.4] - 2024-01-15
- fix : le tab order des consultations avait tendance à sauter aux refreshs du DOM
- fix : le raccourcis pour bouton valider et annuler ne fonctionnaient pas pour la validation/annulation des liens familiaux
- fix : la lecture de la cv se relançait parfois plusieurs fois de suite. Essai de fix à vérifier.
- ajout d'une mémoire du champ de recherche des médicaments

## [1.4.3] - 2024-01-15
- Recettes : Affiche automatiquement la recette du jour lors de l'ouverture de la page
- Page d'accueil du dossier patient : ajout d'icones pour copier automatiquement le NIR dans le presse-papier


## [1.4] - 2024-01-14
- ajout d'une fonction pour récupérer le focus s'il est volé par le logiciel d'impression
- unification de l'appel à l'API du Companion

## [1.3.1] - 2024-01-04
- correction de la visée de l'iframe pour l'impression des pdf => on vise l'id à la place
- correction d'un bug dans les paramètres d'envoi au TPE

## [1.3] - 2024-01-04
- ajout d'un système de contrôle de version du companion, et d'affichage d'un message d'erreur en cas de nécessité de mise à jour
- ajout d'une impression en direct via le companion, sans validation par pynput de la touche entrée


## [1.2] - 2024-01-01
### Modifié :
- iframe.contentWindow.print() est désormais utilisé pour avancer dans l'impression automatique
- retrait et modification des options correspondantes
- fenêtre des options plus propre


## [1.1] - 2023-12-16
### Ajouté :
- ajout d'un délai optionnel avant le lancement des entrées claviers pour plus de granularité
- ajout d'une option pour le port de Weda-Helper-Companion
- déplacement de keyCommands dans un fichier à part
- ajout de la possibilité d'une cotation par défaut dans la réalisation d'une FSE (attention ne se déclenche que si les questions OUI/NON sont cochées via les appuis clavier "o" et "n")

### Correction :
- correcteur de date plus performant

## [1.0.3] - 2023-12-08

### Ajouté

- Ajout du formatage automatique des dates dans la page d'importations (à nouveau car la fonctionnalité semble fonctionner de façon aléatoire)
- mode cors

## [1.0.2] - 2023-12-09
### Retiré
- Ajout du formatage automatique des dates dans la page d'importations (implémenté par Weda le 8 décembre environ...)

## [1.0.1] - 2023-12-08

### Ajouté

- Ajout du formatage automatique des dates dans la page d'importations


## [1.0] - 2023-12-01
