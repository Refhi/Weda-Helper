# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

# [2.3] - 2024-05-28
## refactory :
- passage des options par défaut dans le manifest.json pour éviter les doublons
- creation et utilisation prioritaire de 'addTweak' qui simplifie l'ajout de fonctionnalités dans telle ou telle page en fonction de l'option liée. Pour faciliter la lecture du code et la maintenance on l'appelle après chaque ensemble de tableau urls/options/callbacks
- refactory complet de la gestion des impressions et des téléchargements

# [2.2] - 2024-04-20 
## fix :
- possibilité d'utiliser "entrée" pour valider une fse
- ajout d'un texte de bienvenue dans la page des options
- inhibition des raccourcis claviers dans la FSE si le focus est dans un champ de texte

## ajout :
- ajout de t et c pour selectionner le tier payant dans les fses (amo et complémentaire)
- possibilité de selectionner automatiquement "non" pour accident par un tier (désactivé par défaut)
- possibilité de cocher automatiquement la case FSE en mode gestion unique pour les C2S (désactivé par défaut)
- selection automatique de "je suis le médecin traitant" si nous sommes le médecin déclaré (utile quand l'option "je suis médecin traitant de substitution" est part défaut)

## divers :
- passage des options par défaut dans le manifest.json pour éviter les doublons
- création d'une fonction "ifOptionAndUrlMatches" pour simplifier les conditions de l'attente des pages

# [2.1] - 2024-04-13
*améliorations arrêt de travail*
## ajout :
- le focus est désormais automatiquement placé sur le champ de titre lors de la création ou l'édition d'un antécédent.
- métrique utilisateur désormais détaillée par jour/semaine/mois/année et globale
 
## fix :
- si l'option "Companion" est inactive, la fenêtre de visualisation de l'arrêt de travail ne se ferme pas.
- amélioration du lien avec le Companion : les arrêts de travail sont maintenant imprimés automatiquement, sinon la fenêtre ouvre automatiquement le menu d'impression.
- pour les arrêts de travail (le service AATI) ajout d'un bouton pour le faire avec ou sans la CV du patient.
- correction d'une coquille dans les options par défaut
- coquille dans les options sur "Formulaire"


# [2.0] - 2024-03-25
## ajout :
- raccourci clavier pour l'affichage/masquage des antécédents
- simplification de la réalisation des arrêts de travail intégrés à Weda (lecture auto CV, selection auto de l'assuré, impression automatique, autofill de la date en cas de sorties libres)
- amélioration du message d'accueil et de mise à jour.
- ajout des formulaires dans les pages pouvant accueillir l'historique à gauche.
- ajoute une métrique ! Vous pouvez désormais voir une estimation du nombre de clics, de mouvements de souris et d'entrées claviers économisées depuis l'installation de la 2.0 et faire un reset sur le bouton dans les options ! (Je tiens à souligner que par nature, ces valeurs ont une part approximative)
- le type de document pour l'envoi au DMP est sauvegardé automatiquement à chaque changement dans la page des Courriers
- <del>Never Gonna Give You Up</del>.

## fix :
- erreur de date et de mise en page dans le changelog

## divers :
- la partie gérant les arrêts de travail a son fichier aati.js dédiée


# [1.9] - 2024-03-12
## divers :
- grosse amélioration du README grace à DrFloW71 ! Merci à lui pour ce rafraichissement !

## ajout :
- le type "Biologie" se sélectionne automatiquement lors d'une prescription numérique type "Demande"
- l'historique peut désormais s'afficher à gauche également dans les pages Courrier (désactivé par défaut), Demande et Certificat. A noter que l'affichage est plus approximatif pour certaines pages. N'hésitez pas à désactiver l'option dans les options si besoin.
- rafraichissement automatique des messages Mssanté. Il vérifiera 30 secondes après le chargement de la page, puis toutes les 15 minutes. Il faut donc mieux laisser un onglet ouvert sur cette page. (beta, faites-moi part de vos retours svp, je n'utilise pas mssante)
- les atcds peuvent de façon optionnelle être affichés automatiquement (off par défaut)
- les questions dans les Consultations se voient automatiquement attribuer une unité (à ajuster dans les options)

## fix :
- fix du champ de recherche de médicament où la rétention du texte se désactivait parfois au DOM refresh
- les options par défaut de boutons de recherche sont désormais limitées à 3
- correction d'une faille de sécurité théorique (très hautement improbable... mais corrigée de principe.)


# [1.8.1] - 2024-02-18
## merge
- plusieurs sources différentes n'étaient pas synchronisées correctement => merge fait...

# [1.8] - 2024-02-17
## ajout :
- option pour ouvrir automatiquement le panneau d'ordos types à l'ouverture des prescriptions médicamenteuses
- ajout des courbes de pédiatrie (il suffit de passer la souris au-dessus de l'icone 📈 dans les consultations. Un clic permet de maintenir la courbe affichée. Un autre clic sur 📈 ou sur la courbe permet de la fermer).
- la page des options affiche désormais clairement le numéro de version dans le titre

## fix :
- la recherche médicamenteuse se lançait automatiquement au chargement de la page de prescription, ce qui faisait perdre une ou deux secondes
- le consentement automatique se coche également dans les pages de Demandes
- le focus était perdu lors de l'apparition de l'historique dans le 1/3 gauche
- l'historique dans le 1/3 gauche disparaissait en cas de ctrl+S ou d'enregistrement
- la détection de l'insersion de la carte vitale a été revue pour être plus universelle

## divers :
- ajout de logs pour préparer le debug de keepmedsearch qui saute parfois ponctuellement


# [1.7] - 2024-02-09
## ajouts :
- la liste des patients suis le défilé de la fenêtre dans les résultats HPRIM
- lecture automatique de la carte vitale à l'insersion (nécessite Weda Connect v3) et ouverture automatique du dossier patient lié si la carte vitale est lue alors qu'il n'existe qu'un seul patient dessus
- affichage automatique de l'historique dans les pages de consultation sur le 1/3 gauche de l'écran

## fix :
- retrait pour de bon du message d'erreur apparaissant parfois après l'impression via le companion ("[focus]...")

## divers :
- lors de la mise à jour vers 1.7, l'option de lecture auto de la carte vitale sera activée pour tout le monde. Elle peut toujours être désactivée dans un second temps.



# [1.6.0] - 2024-01-28
## ajouts :
- ajout du raccourcis ouvrant la page de recherche patient (amélioration au passage de la façon dont l'extension attend l'apparition du premier patient séléctionable)
- ajout du "à" et du "," dans l'écoute clavier du pavé de prescription numérique
- click automatique sur le bouton refresh dans la page de gestion des FSEs
- choix possible des pages où prescription numérique doit s'activer : Demande et/ou Prescription
- choix possible pour le comportement post-impression via le Companion : rien, fermer la prévisu, retourner au dossier patient
- message de bienvenue et d'explication lors de mise à jour avec liens vers communaute.weda.fr et le github

## correctifs :
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

## refactory :
- passage d'une bonne partie des fonctions d'attente vers lightObserver

# [1.5.0] - 2024-01-24
- modification des options : une valeur par défaut est désormais facilement paramétrable
- fix des modification autour des champs de recherche des médicaments
- fermeture automatique de la fenêtre de prévisualisation du PDF après demande d'impression, si le lien avec le companion est actif
- ajout de boutons pour les types de recherches favorites pour la recherche de médicaments.

# [1.4.4] - 2024-01-15
- fix : le tab order des consultations avait tendance à sauter aux refreshs du DOM
- fix : le raccourcis pour bouton valider et annuler ne fonctionnaient pas pour la validation/annulation des liens familiaux
- fix : la lecture de la cv se relançait parfois plusieurs fois de suite. Essai de fix à vérifier.
- ajout d'une mémoire du champ de recherche des médicaments

# [1.4.3] - 2024-01-15
- Recettes : Affiche automatiquement la recette du jour lors de l'ouverture de la page
- Page d'accueil du dossier patient : ajout d'icones pour copier automatiquement le NIR dans le presse-papier


# [1.4] - 2024-01-14
- ajout d'une fonction pour récupérer le focus s'il est volé par le logiciel d'impression
- unification de l'appel à l'API du Companion

# [1.3.1] - 2024-01-04
- correction de la visée de l'iframe pour l'impression des pdf => on vise l'id à la place
- correction d'un bug dans les paramètres d'envoi au TPE

# [1.3] - 2024-01-04
- ajout d'un système de contrôle de version du companion, et d'affichage d'un message d'erreur en cas de nécessité de mise à jour
- ajout d'une impression en direct via le companion, sans validation par pynput de la touche entrée


# [1.2] - 2024-01-01
## Modifié :
- iframe.contentWindow.print() est désormais utilisé pour avancer dans l'impression automatique
- retrait et modification des options correspondantes
- fenêtre des options plus propre


# [1.1] - 2023-12-16
## Ajouté :
- ajout d'un délai optionnel avant le lancement des entrées claviers pour plus de granularité
- ajout d'une option pour le port de Weda-Helper-Companion
- déplacement de keyCommands dans un fichier à part
- ajout de la possibilité d'une cotation par défaut dans la réalisation d'une FSE (attention ne se déclenche que si les questions OUI/NON sont cochées via les appuis clavier "o" et "n")

## Correction :
- correcteur de date plus performant

# [1.0.3] - 2023-12-08

## Ajouté

- Ajout du formatage automatique des dates dans la page d'importations (à nouveau car la fonctionnalité semble fonctionner de façon aléatoire)
- mode cors

# [1.0.2] - 2023-12-09
## Retiré
- Ajout du formatage automatique des dates dans la page d'importations (implémenté par Weda le 8 décembre environ...)

# [1.0.1] - 2023-12-08

## Ajouté

- Ajout du formatage automatique des dates dans la page d'importations


# [1.0] - 2023-12-01
