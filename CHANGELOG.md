# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

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
