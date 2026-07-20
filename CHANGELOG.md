# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Si vous souhaitez voir le détail, cliquez sur les numéros qui vous renverrons vers les tickets correspondants.

# [3.1.0.0] - 
## Ajouts :
- [#627](https://github.com/Refhi/Weda-Helper/issues/627) - Ajout de raccourcis dans x jours pour les dates d'alertes dans les antécédents (3 mois, 6 mois, 1 an, 2 ans, 5 ans)
- [#630](https://github.com/Refhi/Weda-Helper/issues/630) - Ajout d’un système d’extraction de données centralisée, permettant de faciliter certaines options, dont l’historique des facturations dans la page des FSE.
- L’affichage de l’historique des facturations est systématiquement proposé. Il peut être rendu automatique dans les options de Weda-Helper.
- [#629](https://github.com/Refhi/Weda-Helper/issues/629) - Ajout d’un bouton pour importer le contenu d’un post-it directement dans une consultation.

## Retrait de fonctionnalités :
- [#619](https://github.com/Refhi/Weda-Helper/issues/619) - Il existe *déjà* une option dans Weda pour sauvegarder l’affichage préférentiel des documents dans la page de recherche des documents...

## Fix :
- [#625](https://github.com/Refhi/Weda-Helper/issues/625) - Réparation de l’aide qui s’affiche quand on maintient Alt appuyé... encore... ce coup-ci c’est censé fonctionner...
- [#628](https://github.com/Refhi/Weda-Helper/issues/628) - Fix du raccourcis vers les éléments patients depuis les échanges sécurisés (en bas de page après un appuis sur "Importer le message")
- [#620](https://github.com/Refhi/Weda-Helper/issues/620) - L'enregistrement automatique est correctement inhibé quelques secondes lors des saisies utilisateur.

# [3.0.0.4] - Hotfix
## Fix :
- erreurs de lecture de la carte vitale dans les FSE : ajout d’un délai de 200ms pour limiter les messages d’erreur.
- inhibition de la sauvegarde automatique de la consultation si un formulaire est ouvert (évite de perdre les données saisies dans le formulaire). Merci à DocDomi et à Aurélie T. pour le signalement !

# [3.0.0.3] - Weda Helper
## Changement de version :
- changement de numéro de version majeur, mais sans signification autre que la simplification : 2.16.3.2 ça devenait illisible...

## Mise à jour :
- liens vers le site de la communauté temporaire vers celui hebergé par Weda

## Ajouts :
- [#610](https://github.com/Refhi/Weda-Helper/issues/610) - La date du dernier VSM est désormais affichée dans les antécédents (en la récupérant depuis la page d’accueil du patient à la première opportunité).
- [#607](https://github.com/Refhi/Weda-Helper/issues/607) - Ajout d’une icone pour accéder à la vue des traitements depuis la consultation.
- [#606](https://github.com/Refhi/Weda-Helper/issues/606) - Ajout d’un bouton d’impression dans la vue des traitements (permet d’imprimer la vue des traitements en cours, ou de l’exporter en PDF).
- [#612](https://github.com/Refhi/Weda-Helper/issues/612) - Aide au calcul des posologies en mg/kg dans la page de prescription (permet de calculer rapidement la posologie d’un médicament en fonction du poids du patient).
- dans les arrêts de travail "Sorties autorisées" est coché oui par défaut
- [#618](https://github.com/Refhi/Weda-Helper/issues/618) - Le motif par défaut pour les sorties sans restriction d’horaire est désormais personnalisable dans les options de Weda-Helper ou en cliquant sur le bouton 💾 à côté du champ de saisie du motif dans la page de prescription d’arrêt de travail.
- [#620](https://github.com/Refhi/Weda-Helper/issues/620) - Les consultations sont désormais automatiquement enregistrées toutes les 3 minutes si aucune entrée n’est détectée pendant au moins 5 secondes. (permet de limiter les pertes de données en cas de crash du navigateur ou de Weda)
- [#619](https://github.com/Refhi/Weda-Helper/issues/619) - Il est désormais possible de sauvegarder l’affichage préférentiel des documents dans la page de recherche des documents. (via l’icone 💾i)
- [#615](https://github.com/Refhi/Weda-Helper/issues/615) - Ajout d’un outil de calcul du SCORE2 directement depuis la consultation

## Evolution :
- [#586](https://github.com/Refhi/Weda-Helper/issues/586) - le décochage automatique de certains documents dans la messagerie sécurisée est désormais personnalisable (ex. décocher les messages commençant par "NoName_" ou les fichiers commençant par "IHE_XDM.zip" qui sont souvent inutiles).
- [#608](https://github.com/Refhi/Weda-Helper/issues/608) - Lors d’un import automatique de documents, la date du document est désormais conservée si elle est différente de la date du jour (permet de préparer la cohabitation avec les imports automatisés réalisés par Weda directement).

## Fix :
- si un patient est déjà sélectionné lors de l'import d'un document, on ne le sélectionne pas à nouveau
- [#616](https://github.com/Refhi/Weda-Helper/issues/616) - meilleure priorisation de l'écoute du clavier, notamment pour le QuickAccess (évite les conflits avec les autres raccourcis clavier de Weda)
- [#611](https://github.com/Refhi/Weda-Helper/issues/611) - le message d'erreur est désormais bien plus explicite en cas d'option erronée dans les options de Weda-Helper
- [#600](https://github.com/Refhi/Weda-Helper/issues/600) - le mémo raccourcis clavier s'affiche de nouveau correctement au bout d'une seconde d'appuis sur Alt, et ce, pour toutes les plate-formes.
- [#609](https://github.com/Refhi/Weda-Helper/issues/609) - La carte vitale n'est lue automatiquement que sur l'onglet actuellement utilisé.
- fiabilisation de la possibilité d’un clic droit sur l’atcd pour l’éditer directement
- [#614](https://github.com/Refhi/Weda-Helper/issues/614) - Il est de nouveau possible d’aller rapidement dans les atcds et les notes du dossier patient depuis la page des importations de masse

## Dev :
- [#611](https://github.com/Refhi/Weda-Helper/issues/611) - Retrait de la vérification de la présence de virgules avant le : danse les options de catégorisation automatique (inutile et source de bugs)
- addTweak peut désormais être appelé avec un paramètre optionValue pour passer la valeur de l'option directement au callback.


# [2.16.3.2] - fix
## Fix :
- [#596](https://github.com/Refhi/Weda-Helper/issues/596) - Les listes de patients trouvés après une recherche sont de nouveau correctement visée. Règle par exemple l'ouverture automatique d'un patient seul après une recherche ou sur les imports semi-automatiques (merci @Abeldvlpr pour la contribution !)
- [#593](https://github.com/Refhi/Weda-Helper/issues/593) - Clarification du message d'erreur de la page des options en cas de valeur invalide + ajout d'une proposition de réinitialiser l'option problématique.
- [#594](https://github.com/Refhi/Weda-Helper/issues/594) - la sélection automatique "Je suis le médecin traitant" fonctionne de nouveau correctement dans les FSE. (La sélection n'était que visuelle et non répercutée dans la FSE)


# [2.16.2.1] - fix
## Ajouts :
- [#591](https://github.com/Refhi/Weda-Helper/issues/591) - Il est désormais possible d’accéder rapidement au dossier-cible d’un document en cours d’import depuis la messagerie sécurisée

## Fix :
- instauration d’une période réfractaire pour la validation automatique du patient après la lecture de la carte vitale. Utile si on a besoin de dissocier un patient.
- [#581](https://github.com/Refhi/Weda-Helper/issues/581) - ignore désormais le nom du médecin connecté lors de la recherche du nom de l’expéditeur d’un document importé
- [#585](https://github.com/Refhi/Weda-Helper/issues/585) - les alertes via hashtag dans les antécédents fonctionnent également si votre mise en page est un peu particulière (ex. si la police de caractère est en 9 au lieu de 10)
- [#587](https://github.com/Refhi/Weda-Helper/issues/587) - Fix d’un problème de recherche au niveau de la messagerie sécurisée, merci @Abeldvlpr !

# [2.16.1.3] - fix et finalisation du Quick Access
## Finalisation du Quick Access :
- presque toutes les lettres de ciblage sont désormais en place, et les quelques manquantes seront ajoutées dans les prochaines versions.
- j’ai dû travailler par zones de priorité. Si vous constatez des zones où les lettres de ciblage sont mal placées ou manquantes, n’hésitez pas à me le signaler pour que je puisse les ajouter dans les prochaines versions.
- la touche Tabulation peut désormais être utilisée pour sélectionner les lignes à renouveller (par exemple quand on clique sur le bouton de renouvellement d'une prescription, cela simplifie le choix de la ligne)

## Fix :
- [#573](https://github.com/Refhi/Weda-Helper/issues/573) - L’historique des facturations est inhibé lors d’une facturation omnidoc (évite un échec des fses omnidoc)
- Refactorisation du code gérant les FSE
- [#565](https://github.com/Refhi/Weda-Helper/issues/565) - Fix de l'application incorrecte d'une double cotation au moment de la validation de la FSE dans certains cas.
- [#580](https://github.com/Refhi/Weda-Helper/issues/580) - Inhibition de la touche "Entrée" dans certains champs de formulaires (qui, sinon, fait perdre le formulaire)

# [2.16.0] - Quick Access (Beta) ! 🚀
## Qu'est-ce que le "Quick Access" ?
- Appuyez sur Ctrl+K pour afficher des lettres de ciblage.
- Appuyez sur la lettre de ciblage pour accéder rapidement à l'élément correspondant.
## Fonctionnalité en Beta
- Certaines zones ne sont pas encore peuplées correctement, ou les lettres de ciblages se placent incorrectement.

## Fix :
- [#568](https://github.com/Refhi/Weda-Helper/issues/568) - la date de fin d'une alerte spécifiée dans les options de Weda-Helper n'est plus obligatoire.
- [#570](https://github.com/Refhi/Weda-Helper/issues/570) - la recherche des motifs d'arrêt de travail utilise désormais la liste officielle utilisée sur ameli.fr
- [#574](https://github.com/Refhi/Weda-Helper/issues/574) - amélioration du message d'erreur si SumatraPDF n'est pas installé
- [#572](https://github.com/Refhi/Weda-Helper/issues/572) - alt+V permet de nouveau de valider un import dans les échanges sécurisés. Alt+S est utilisable pour lancer la recherche du patient.
- [#575](https://github.com/Refhi/Weda-Helper/issues/575) - dans la page des imports de masse, Ctrl+U clique sur le bouton "Télécharger" directement (préparation d'une prochaine évolution du fonctionnement de Weda et évite une déconnexion forcée)
- [#555](https://github.com/Refhi/Weda-Helper/issues/555) - ajout d’une alerte si le plugin adobe pdf est détecté, ce qui empêche l’impression instantanée des arrêts de travail.

# [2.15.1.2] - fixes et améliorations
## L’historique des facturations dans la page des FSE est désormais ouverte !
- En allant dans les options de Weda-Helper, vous pouvez activer l’affichage de l’historique des facturations dans la page des FSE. Utile pour les facturations qui ne peuvent être faite que une seule fois par période (ex. ALQP003, GL1, etc.).

## Fix :
- [#550](https://github.com/Refhi/Weda-Helper/issues/550) - la cible de alt+V est désormais constante, notamment dans la page des imports sécurisés.
- [#549](https://github.com/Refhi/Weda-Helper/issues/549) - ajout de lumbago dans les motifs d'arrêt de travail rapides.
- les alertes etp sont limitées à l’onglet en cours.
- [#559](https://github.com/Refhi/Weda-Helper/issues/559) - retrait des informations sensibles des logs d’erreurs afin de limiter l’exposition de données personnelles en cas de partage du log lors d’un signalement de bug.
- [#554](https://github.com/Refhi/Weda-Helper/issues/554) - Amélioration du flux de travail lors des imports automatique dans la messagerie sécurisée : devrait être plus fiable.
- [#563](https://github.com/Refhi/Weda-Helper/issues/563) - amélioration des impressions automatiques des arrêts de travail : devrait être plus fiable.
- la mention "AT avec CV | AT sans CV" dans l’accueil du dossier patient ne disparait plus indument après un rafraichissement de la page.
- fix disparition de la pré-alertVSM
- les boutons FSE Téléconsultation et FSE Dégradée n’apparaissent qu’une seule fois dans la page des FSE, même en cas de relecture de la carte vitale.

## Améliorations :
- les alertes basées sur l’état civil sont désormais fonctionnelles (ex. mettre en évidence certaines tranches d’age et de genre).
- [#526](https://github.com/Refhi/Weda-Helper/issues/526) - vous pouvez désormais afficher des alertes dans la description des atcd grace à un # par exemple #annuel après une date affichera une coloration selon la proximité de la date (utile pour les suivis annuels par exemple).
- [#562](https://github.com/Refhi/Weda-Helper/issues/562) - les variable type {variable1} sont également automatiquement supprimées dans les courriers.

# [2.15.0.5] - Bonne année 2026 à toustes ! 🎉🎊

## 🎯 Vos Pôles et Cabinets peuvent désormais créer des alertes personnalisées communes sur les antécédents ! 
- ⚕️ Particulièrement utile pour repérer facilement les patients éligibles à un suivi spécifique comme l'inscription à un atelier ETP.
- 🔬 Si vous avez des protocoles ou études à appliquer auprès de patients avec des antécédents spécifiques, vous pouvez désormais les repérer en un coup d'œil !
- 📧 Vous pouvez demander à étendre vos alertes à tout votre Pôle/Cabinet/Groupement ! Pour ce faire cliquez sur le bouton dédié dans les options.
- 🧪 Testez dès maintenant en ajoutant vos propres mots-clés dans les options de Weda-Helper !
- [#528](https://github.com/Refhi/Weda-Helper/issues/528) - Ajout d'un système d'alerte si un antécédent contient un mot-clé précisé dans les options de Weda-Helper.


## 🔍 La recherche des motifs d'arrêt de travail est désormais grandement simplifiée !
- 🎯 [#527](https://github.com/Refhi/Weda-Helper/issues/527) - Recherche rapide et floue (tolérant aux fautes de frappe) dans les motifs d'arrêt de travail AATI.
- 📋 Les motifs d'arrêt de travail AATI sont désormais classés par ordre alphabétique.


## ✨ Autres ajouts :
- 🖨️ [#532](https://github.com/Refhi/Weda-Helper/issues/532) - L'impression de masse peut être désactivée dans les options (utile si le raccourci vous gêne).
- 💉 [#521](https://github.com/Refhi/Weda-Helper/issues/521) - Ajout de raccourcis pour scanner directement le datamatrix d'un vaccin depuis l'arborescence des vaccins.
- ✅ La case "x ième injection effectuée" se coche automatiquement.
- 🩺 [#534](https://github.com/Refhi/Weda-Helper/issues/534) - Ajout d'un bouton "+1clickVSM" dans la page des antécédents pour créer un VSM en un clic.
- 💰 [#535](https://github.com/Refhi/Weda-Helper/issues/535) - Ajout d'un message d'aide à la cotation pour GL1, GL2 et GL3 dans la page des FSE.
- Vous pouvez désormais copier et coller vos paramètres de Weda-Helper entre différentes installations. Rendez-vous en bas de la page des options pour retrouver les boutons "📋📤Copier/Sauv. param.", "📋📥Coller paramètres" et "📁📥Charger depuis fichier". Attention à la clé API qui sera à reporter dans le Companion.

## 🔧 Corrections :
- 📄 Le bouton "AT sans CV" dans la page d'accueil du dossier patient fonctionne de nouveau correctement.
- 📝 [#504](https://github.com/Refhi/Weda-Helper/issues/504) - Le titre automatique d'un document importé depuis la messagerie sécurisée fonctionne de nouveau correctement si un commentaire est ajouté par l'utilisateur avant l'import.
- 📨 [#505](https://github.com/Refhi/Weda-Helper/issues/505) - Lors des intégrations dans la messagerie sécurisée, le corps du message est correctement pris en compte si le PDF ne contient pas suffisamment de texte (moins de 3 lignes).
- 🔄 [#494](https://github.com/Refhi/Weda-Helper/issues/494) - Tentative de correction d'un problème de persistance intermittente du nom du précédent patient lors de l'importation automatique dans la messagerie sécurisée.
- utiliser le raccourci clavier de Validation dans les prescriptions valide également le texte en cours d’édition (évite de perdre des données si on oublie de sortir du champ avant de valider).
- [#547](https://github.com/Refhi/Weda-Helper/issues/547) - L'envoi au TPE est par défaut réservé aux paiements par CB.


## 🏗️ Refactorisation :
- 🔨 Refactorisation des options
- ajout d’une option d’id pour le waitForElement permettant de multiplier les observateurs sur un même sélecteur sans conflit.

# [2.14] - Correctifs divers et améliorations
## Améliorations :
- [#519](https://github.com/Refhi/Weda-Helper/issues/519) - Ajout d’un champ de recherche pour filtrer les pharmacies dans la sélection de pharmacie lors de la création d’une prescription.
- [#520](https://github.com/Refhi/Weda-Helper/issues/520) - Le champ de date d’expiration du vaccin est désormais automatiquement formaté.

## Fix :
- [#517](https://github.com/Refhi/Weda-Helper/issues/517) - La lecture automatique de la carte vitale fonctionne de nouveau correctement pour les nouvelles installations.

# [2.13.5.1] - Hotfix impressions
## Fix :
- [#511](https://github.com/Refhi/Weda-Helper/issues/511) - Lors d’une impression simple via Ctrl+P, l’onglet ne se ferme plus indument avant que l’impression n’ait été validée. Ajout d’un message incitant à l’installation du Companion et à l’activation des impressions instantanées lors des impressions simples.


# [2.13.5] - Correctifs impressions
## Fix :
- correction d’une faute d’orthographe dans "(Imprime tous les documents du jour)" (merci à @CecilePRLN pour la remarque !)
- [#506](https://github.com/Refhi/Weda-Helper/issues/506) - Les icones imprimante dans les "Documents du cabinet" fonctionnent de nouveau correctement.
- [#493](https://github.com/Refhi/Weda-Helper/issues/493) - Amélioration du flux d’impression : permet de limiter les cas de blocage et de faciliter le débogage.
- [#501](https://github.com/Refhi/Weda-Helper/issues/501) - La navigation par tabulation depuis les champ de suivi vers les saisie de texte n’ignore plus les champs confidentiels.

## Améliorations :
- [#503](https://github.com/Refhi/Weda-Helper/issues/503) - La fenêtre popup de l’extension affiche plus clairement les différents liens, et ajout d’un lien vers le forum de discussion et le wiki.


# [2.13.4]
## Divers :
- amélioration des messages d'onglet pour le suivi des impressions instantanées

## Fix :
- [#490](https://github.com/Refhi/Weda-Helper/issues/490) - Les modèles WeDoc fonctionnent désormais correctement avec l'impression instantanée et le post-traitement (fermeture de l'onglet, envoi MSSanté, etc.)
- [#496](https://github.com/Refhi/Weda-Helper/issues/496) - Ctrl+E permet de nouveau d'imprimer + envoyer par MSSanté si l'option est activée.
- [#481](https://github.com/Refhi/Weda-Helper/issues/481) - Dans la messagerie Sécurisée, les pdfs accompagnés d'un message sont de nouveau évalués correctement.
- l’envoi au DMP lors de l’impression instantanée fonctionne de nouveau correctement. (un id d’élement avait changé dans Weda)
- [#500](https://github.com/Refhi/Weda-Helper/issues/500) - La navigation par tabulation entre les champs de saisie de la consultation est beaucoup plus rapide, et réparée quand on passe sur le champ confidentiel.


# [2.13.3] - Correctifs
## Fix :
- [#491](https://github.com/Refhi/Weda-Helper/issues/491) - Les raccourcis ne créent un nouveau document que si aucun n’existe ou qu’il est appelé depuis le document en cours.


## Nettoyage :
- Suppression de la fonctionnalité "Tout mettre en consultation" dans le popup (obsolète avec les imports automatisés)
- Suppression de la fonctionnalité "Envoyer une notification Weda" dans le popup (inutile, était surtout utile pour le développement)

## Divers :
- [#492](https://github.com/Refhi/Weda-Helper/issues/492) - Ajout d’émojis dans les titres des onglets pour mieux repérer les onglets en cours (impression, envoi MSSanté, etc.)


# [2.13.2.1] - Correctifs
## Fix :
- [#487](https://github.com/Refhi/Weda-Helper/issues/487) - Le bouton "Réinitialiser les auto-imports" n’est plus caché par le "log d’extraction".


# [2.13.2] - Améliorations et correctifs - imports automatisés nettement améliorés !
## Ajouts :
- Lors de la recherche d’un patient, si un unique résultat est trouvé, il est automatiquement validé. ![Recherche patient](./Images/mises%20a%20jour/2.13.2-autopast.gif)
- À côté du champ de recherche, un bouton permet de coller et rechercher un patient/nir présent dans le presse-papiers. ![Coller et rechercher](./Images/mises%20a%20jour/2.13.2-autopaste.png)

## Imports automatisés :
- Les champs de catégorisation automatique sont plus facilement personnalisables ![Personnalisation des champs](./Images/mises%20a%20jour/2.13.2-autocat.png)
- Le constructeur de titre est désormais personnalisable (cf. page des options) ![Personnalisation du titre](./Images/mises%20a%20jour/2.13.2-autotitle.png)
- Un survol du bouton de réinitialisation affiche désormais le log d’extraction (utile pour affiner les mots-clés de catégorisation automatique) ![Log d'extraction](./Images/mises%20a%20jour/2.13.2-logclassement.png)

## Améliorations diverses :
- La page des options est plus ergonomique ![Ergonomie de la page des options](./Images/mises%20a%20jour/2.13.2-ergoOptionPage.png)

## Fix :
- [#468](https://github.com/Refhi/Weda-Helper/issues/468) - l’impression de l’arrêt de travail est plus rapide et se termine correctement.
- [#466](https://github.com/Refhi/Weda-Helper/issues/466) - Les antécédents s'affichent de nouveau à gauche si l'option dédiée est activée. ![Antécédents à gauche](./Images/mises%20a%20jour/2.13.2-leftAtcd.gif)
- [#471](https://github.com/Refhi/Weda-Helper/issues/471) - Ajout du mot "kinésithérapeute" dans les mots-clés de classification automatique des ordonnances numériques.
- [#472](https://github.com/Refhi/Weda-Helper/issues/472) - L’inversion du nom du document importé et du corps du message fonctionne également si il y a plusieures pièces jointes.
- [#478](https://github.com/Refhi/Weda-Helper/issues/478) - Le nom et la date de naissance du patient s’affichent en cas de clic sur "Importer le message" dans les échanges sécurisés. ![Nom et date de naissance du patient](./Images/mises%20a%20jour/2.13.2-destinationName.gif)
- [#479](https://github.com/Refhi/Weda-Helper/issues/479) - La classification automatique s’active également si le "Importer le message" est en 2e position ou plus dans les échanges sécurisés. ![Multi-imports](./Images/mises%20a%20jour/2.13.2-multi-imports.png)


# [2.13.1] - Correctifs
## Fix :
- [#465](https://github.com/Refhi/Weda-Helper/issues/465) - L'historique gauche est de nouveau affiché avec 30% de largeur par défaut au lieu des 50% proposé de base par Weda. (actif si l'historique gauche est activé automatiquement dans les consultations)
- [#459](https://github.com/Refhi/Weda-Helper/issues/459) - Un bouton permet désormais de réinitialiser le classement automatique des documents dans les échanges sécurisés. Cela permet de tester plus facilement différents mots-clés de classification.

### Imports automatisés :
- [#448](https://github.com/Refhi/Weda-Helper/issues/448) - Ignore désormais tout les noms trouvés après le mot-clé "destinataire(s)" dans le dernier tier du document lors de la recherche du médecin addresseur d'un courrier.
- [#452](https://github.com/Refhi/Weda-Helper/issues/452) - Ignore désormais les lignes contenant plusieurs types d'examens (en général quand le centre d'imagerie annonce ses capacités d'examen).
- [#464](https://github.com/Refhi/Weda-Helper/issues/464) - Prend en compte le décochage de l'option Titre Automatique (échanges sécurisés).
- [#464](https://github.com/Refhi/Weda-Helper/issues/464) - Amélioration des messages d'erreurs lors de l'import des échanges sécurisés.


# [2.13] - Gel des demandes de fonctionnalités
## AnnonceS : (les détails de la mise à jour sont après)
Sommaire :
- gel des demandes de fonctionnalités
- mon investissement dans Weda-Helper
- Weda soutiens Weda-Helper !
- … et pour la suite ?  (bonnes nouvelles !)
- nouveau forum de discussion


#### Gel des demandes de fonctionnalités
Bonsoir à toustes,

Weda-Helper est arrivé à une certaine forme de maturité... et le temps nécessaire pour le maintenir commence à augmenter : + de fonctionnalités = + de temps de maintenance.

J'ai donc pris la décision, en accord avec @Abel, de faire une pause dans l'arrivée de nouvelles fonctionnalités. (rassurez-vous les bonnes nouvelles sont en dessous !)

#### Mon investissement dans Weda-Helper
Mais Weda Helper reste bien vivant ! Je me concentrerais sur la résolution de bugs… mais ne serai plus en mesure de donner suite aux demandes de fonctionnalité. (les tickets de demande non liés à des bugs seront systématiquement clos, désolé !)

Je tiens à vous remercier toutes et tous pour votre soutien et votre aide dans le développement de ce projet un peu fou qui a largement dépassé toutes mes prédictions !

Merci encore !

#### Weda soutiens Weda-Helper !
Je viens d'échanger longuement avec Guillaume de Bruc, directeur de Weda, autour du devenir de Weda-Helper et de ma participation à Weda.

L'échange a été chaleureux, constructif, et Guillaume a prêté une oreille très attentive aux apports de Weda-Helper, son accueil par la communauté et les utilisateurs… et à la charge de travail que cela représente pour moi.

J'attends les dernières confirmations de l'équipe, mais le résumé est bref : Weda s'investit dans Weda-Helper !

Les modalités exactes sont en cours de discussion, je vous apporterais plus de précision dès que possible :)


#### … et pour la suite ?

Weda 2 pointe le bout de son nez (si si ! Et ce que j'en ai vu est très prometteur) et j'aurais le plaisir d'être plus intégré au processus de développement en terme d'UI/UX pour avoir cette épure finale qui nous plaît tant (A => B = 1 action, pas 12).

Et Weda Helper "2" ? Eh bien selon l'évolution de Weda 2, Weda-Helper pourrait disparaître car inutile (!) ou devenir (un peu comme maintenant) un terrain d'essai pour de futures fonctionnalités : un environnement où les tests sont très rapides à implémenter, avant déploiement dans Weda 2.

J'espère pouvoir revenir vers vous très vite pour vous préciser la mise en application !

#### Nouveau forum de discussion

Suite à la fermeture du site de la communauté Weda, l'espace de discussion de Weda-Helper est désormais sur github : [Weda-Helper Discussions](https://communaute.weda.fr/discussions-n4y99j90/post/weda-helper-pQfPGckmrhwKBJC), au moins en attendant que Weda puisse mettre en place le prochain espace de la communauté.




## Automatismes :
- [#424](https://github.com/Refhi/Weda-Helper/issues/424) - Suppression automatique des {mots entre accolades} dans les documents générés par formulaire où l'option a été ignorée (ex. "Certificat de santé de {Nom du patient}" devient "Certificat de santé").
- [#421](https://github.com/Refhi/Weda-Helper/issues/421) - Maintient du niveau de scroll lors de l'appuis sur le bouton "Suite" dans l'accueil patient.
- [#422](https://github.com/Refhi/Weda-Helper/issues/422) - La déclaration de MT automatique se fait dans un onglet séparé.
- [#422](https://github.com/Refhi/Weda-Helper/issues/422) - La fenêtre de validation de déclaration du MT se ferme automatiquement.
- [#408](https://github.com/Refhi/Weda-Helper/issues/408) - La fenêtre de prévisualisation de l'arrêt de travail se ferme automatiquement.
- [#409](https://github.com/Refhi/Weda-Helper/issues/409) - On peut désormais éditer un atcd directement depuis la page d'accueil du dossier patient.

## Ajout d'option :
- [#445](https://github.com/Refhi/Weda-Helper/issues/445) - On peut désormais fixer le pourcentage de validation CIM-10 pour le +1clickVSM (par défaut 70%).

## Bugfix :
- [#415](https://github.com/Refhi/Weda-Helper/issues/415) - La clé API n'était plus générée automatiquement depuis quelques versions => de nouveau générée automatiquement.
- [#433](https://github.com/Refhi/Weda-Helper/issues/433) - L'option pour masquer le tableau d'aide était défectueuse.
- [#441](https://github.com/Refhi/Weda-Helper/issues/441) - Fix d'un problème de boucle infinie lors de l'import si l'INS est au format 2550699999999  (34) dans le document importé.
- [#442](https://github.com/Refhi/Weda-Helper/issues/442) - Fix d'un problème d'incompatibilité entre la suppression du panneau de Titre suggerés et l'ouverture automatique de l'historique gauche dans les Consultations.
- [#402](https://github.com/Refhi/Weda-Helper/issues/402) - Le bouton pour changer la durée de tout les traitements en 1 clic ne fonctionnait pas si le traitement était en DCI.
- [#445](https://github.com/Refhi/Weda-Helper/issues/445) - Fix d'un problème où le bouton Valider final ne se cliquait pas automatiquement.
- [#447](https://github.com/Refhi/Weda-Helper/issues/447) - L'import semi-automatique ne fonctionnait pas dans les échanges sécurisés.


## Divers :
- modification du nom de l'option "Extrait automatiquement la classification du document importé." => "Détermine automatiquement la destination du document importé (Consultation/Résultats d'examen/Courrier)."

## Refactory :
- waitForElement et observeDiseappear peuvent désormais être appelées avec des promesses.

## Suppression de fonctionnalités :
- [#449](https://github.com/Refhi/Weda-Helper/issues/449) - Suppression du rafraichissement automatique des FSE qui était dysfonctionnel et non pertinent.


# [2.12.1] - hotfix
## Fix :
- [#436](https://github.com/Refhi/Weda-Helper/issues/436) - Correction d'un débordement de l'affichage pour le +1clickVSM si la colonne de gauche est trop fine.


# [2.12] - *Import automatisé, Impression de masse et Durées de prescription de masse*
## Imports :
- [#419](https://github.com/Refhi/Weda-Helper/pull/419) - **Classification semi-automatique** pour la Messagerie Sécurisée ! Merci à [Abel](https://github.com/Abeldvlpr) pour cette contribution !
- [#389](https://github.com/Refhi/Weda-Helper/issues/389) - La **destination** automatique peut être activée dans les options (par défaut désactivée). 
- [#387](https://github.com/Refhi/Weda-Helper/issues/387) - Le médecin attitré est désormais sélectionné automatiquement lors de l'import par une secrétaire.
- [#381](https://github.com/Refhi/Weda-Helper/issues/381) - Refonte du système de titre automatique (vos retours sont les bienvenus !)

## Raccourcis :
- [#397](https://github.com/Refhi/Weda-Helper/issues/397) - **Impression de masse** : Vous pouvez désormais appeler Ctrl+P (et seulement celui-ci !) pour imprimer TOUS les documents du jour depuis l'accueil du dossier patient. Cela fonctionne surtout si vous avez activé l'impression complète en 1 clic via le Companion. Au passage les onglets affichent l'étape d'impression en cours.
- [#393](https://github.com/Refhi/Weda-Helper/issues/393) - Meilleurs raccourcis pour les documents : Alt+chiffre ouvre le dernier document, et Alt+Maj+chiffre en crée un nouveau (ex. Pour les ordonnances, les prescriptions, les consultations, etc.). Les demandes de nouvelles prescriptions sont mieux prises en compte.

## Automatismes :
- [#390](https://github.com/Refhi/Weda-Helper/issues/390) - La case "Mon patient accepte que je transmette le présent avis d'arrêt de travail pour son compte [...]" se coche automatiquement.
- [#399](https://github.com/Refhi/Weda-Helper/issues/399) - Ajout d'un bouton pour mettre à jour le **VSM en un clic** (vérifie tout de même que le VSM rempli les 70% de nomenclature du ROSP avant de valider).
- [#401](https://github.com/Refhi/Weda-Helper/issues/401) - Ajout de quelques aides pour les cotations de spécialités (APC, APY, APU, MCS)
- [#402](https://github.com/Refhi/Weda-Helper/issues/402) - **Changez la durée de TOUT les traitements en 1 clic !** (en allant dans "Définir la durée de traitement en mois pour tous les médicaments", un nouveau bouton est ajouté qui fera à votre place tout le travail. Prend quelques secondes par ligne.)

## Améliorations diverses :
- [#396](https://github.com/Refhi/Weda-Helper/issues/396) - Il est désormais possible de déclarer un type de **recherche médicamenteuse par défaut** (dans les options).
- Les **descriptions des options sont mieux mises en forme**, ajout d'un exemple détaillé pour les catégories de classement automatique.

## Refactory : (pour les développeurs)
- addTweak prend désormais en charge les options présentes sous forme de str (et pas seullement bool)

## Fix :
- [#394](https://github.com/Refhi/Weda-Helper/issues/394) - Correction d'un bug dans l'historique des cotations (fonction pour l'instant non activable car en attente de la validation de Weda)
- [#428](https://github.com/Refhi/Weda-Helper/issues/428) - La pré-alerte du VSM se déclenchait trop tôt (4 mois après le dernier au lieu de 4 mois avant expiration)
 

# [2.11.3] - Amélioration de l'apparence & Tipeee
## Améliorations :
- la documentation est désormais accessible en cliquant sur l'icone de l'extension
- le lien vers le Tipeee est mis en avant dans les messages de mise à jour et dans l'icone de l'extension
- les boites de dialogue affichées lors des mises à jour sont visuellement améliorées

## Fix :
- [#398](https://github.com/Refhi/Weda-Helper/issues/398) - Correction d'un défaut d'affichage qui entrainait parfois un chevauchement entre la zone de texte des certificats/prescriptions et la liste des documents par défault
- [#400](https://github.com/Refhi/Weda-Helper/issues/400) - L'envoi par MSSanté était inhibé lors de l'usage de Ctrl+(maj)+E si l'impression instantanée était activée

# [2.11.2] - fix
## Fix :
- [#385](https://github.com/Refhi/Weda-Helper/issues/385) - La touche Alt ne met plus le focus sur le menu du navigateur (désactivable dans les options). Cela règle deux problèmes : le focus était perdu lors de l'usage de Alt pour afficher l'aide, et lorsque le Companion tente de rendre le focus au navigateur (via un appuis simulé sur la touche Alt) cela entrainait parfois un focus sur le menu du navigateur.
- [#377](https://github.com/Refhi/Weda-Helper/issues/377) - Ajout d'un message d'erreur plus explicite si le retour du Companion n'est pas détecté en suggerant de vérifier le firewall.
- [#386](https://github.com/Refhi/Weda-Helper/issues/386) - Ajout de logs pour déboguer un problème présent avec le mot-clé "psychologue" qui n'annule pas correctement l'ordonnance numérique.


# [2.11.1] - fix
## Fix :
- [#377](https://github.com/Refhi/Weda-Helper/issues/377) - Les onglets se ferment de façon fiable même en l'absence du DMP (ce fix est à tester, merci de me faire part de vos retours si vous constatez encore des onglets ne se fermant pas)

# [2.11] - À retrouver facilement dans le menu de l'extension si vous n'avez pas le temps de lire maintenant !
## Améliorations :
### Divers :
- 🔍 [#353](https://github.com/Refhi/Weda-Helper/issues/353) - Dans l'import des biologies, Alt+A permet d'afficher l'historique biologique du patient en cours.
- 👨‍⚕️ [#341](https://github.com/Refhi/Weda-Helper/issues/341) - Cliquer sur "médecin traitant : vous déclarer" fait automatiquement la déclaration de MT.
- 💬 amélioration des infos-bulles pour les raccourcis claviers
- 🤖 [#366](https://github.com/Refhi/Weda-Helper/issues/366) - ajout d'un mode "headLess" : possibilité de shunter le message de mise à jour de Weda sur les postes où vous souhaitez automatiser l'ouverture de Weda (désactivé par défaut). Cela ne correspond qu'à des usages très spécifiques, merci de ne pas l'activer sans en comprendre les implications.
- 🩺 [#349](https://github.com/Refhi/Weda-Helper/issues/349) - ajout d'une surveillance du remplissage du VSM : message s'il n'a pas été fait alors qu'une ALD est détectée, ainsi que coloration en orange si on se rapproche des 1 ans puis rouge si elle est dépassée.
- 💉 [#362](https://github.com/Refhi/Weda-Helper/issues/362) - option "vaccins instantanés" : si activée, toute ouverture de dossier patient amène immédiatement sur le scan du datamatrix d'un vaccin, permettant aux vaccineurs en série de gagner du temps (particulièrement pensée pour les pharmaciens). Ce paramètre est facilement accessible depuis la popup de l'extension (clic sur l'icône de l'extension).
- 📅 [#364](https://github.com/Refhi/Weda-Helper/issues/364) - Les dates types 14 novembre 2024 peuvent être reconnues dans les imports (à activer dans les options)
- 👬 une nouvelle version du Companion est disponible ! Elle permet de diriger l'archivage d'un document importé via Ctrl+U vers un dossier spécifique. Vous pouvez le télécharger [ici](https://github.com/Refhi/Weda-Helper-Companion)


### Dans la page des FSE :
- 📜 [#340](https://github.com/Refhi/Weda-Helper/issues/340) - L'historique des facturations est désormais affiché.(désactivé pour l'instant, en attente du feu vert de Weda car c'est pour l'instant trop goumand en ressources)
- 📝 [#338](https://github.com/Refhi/Weda-Helper/issues/338) - Le PDF d'une Dégradée est validé automatiquement
- 💰 [#326](https://github.com/Refhi/Weda-Helper/issues/326) - Aide à la cotation : une infobulle vous avertit de possibles cotations applicables à certaines situation (ex. SHE, MCG, PAV, MHP et RDV), qu'on oublie habituellement tout le temps...

### Prescriptions numériques paramédicales :
- 👣 [#367](https://github.com/Refhi/Weda-Helper/issues/367) - Détecte correcte du mot "Pédicurie"
- 🧠 [#368](https://github.com/Refhi/Weda-Helper/issues/368) - L'ordonnance numérique se désactive si détecte "psychologue"

### Impressions :
- 🖨️ [#369](https://github.com/Refhi/Weda-Helper/issues/369) - Modification de la gestion des impressions instantanées : vous devez accorder l'autorisation à Weda-Helper de gérer les onglets si vous souhaitez l'utiliser. Ça rendra l'impression instantanée plus fiable.
- 🖨️ [#360](https://github.com/Refhi/Weda-Helper/issues/360) - Une option permet de lancer également en plus une impression lors de l'usage de Ctrl+E ou Ctrl+Shift+E





# [2.10.1]
## Améliorations :
- [#356](https://github.com/Refhi/Weda-Helper/issues/356) - mise en oeuvre de la catégorisation automatique avec une gestion des listes de mots-clés à chercher simplifiée
- [#338](https://github.com/Refhi/Weda-Helper/issues/338) - validation automatique de la FSE dégradée
- [#363](https://github.com/Refhi/Weda-Helper/issues/363) - ajout d'une option pour éviter la date automatique dans l'import automatique

## Fix :
- [#361](https://github.com/Refhi/Weda-Helper/issues/361) - ajout de KDE pour les mots-clés de kinésithérapie


# [2.10] - classement assisté !!!
## Ajouts :
- [#327](https://github.com/Refhi/Weda-Helper/pull/327) - Ajout d'une assistance à l'import des documents avec lecture des datamatrix si besoin
- Amélioration de la navigation par tabulation dans l'import des documents. Alt+S permet désormais de supprimer le document en cours.
- [#50](https://github.com/Refhi/Weda-Helper/issues/50) - Ajout d'un raccourcis Ctrl+Shift+S pour lancer le scan de documents
- [#323](https://github.com/Refhi/Weda-Helper/issues/323) - Ctrl+E ou Ctrl+Shift+E pour lancer l'envoi de courrier peut optionnellement lancer l'impression en même temps

## Fix :
- [#339](https://github.com/Refhi/Weda-Helper/issues/339) - Correction du système de recherche automatique de l'addresse MSsanté

# [2.9]
## Ajouts :
- [#275](https://github.com/Refhi/Weda-Helper/issues/275) - Permet de sélectionner automatiquement le(s) médecin(s)traitant(s) comme destinataire(s) lors de l'envoi d'un courrier (désactivé par défaut)
- [#274](https://github.com/Refhi/Weda-Helper/issues/274) - Ajout de raccourcis pour l'envoi des courrrier : Ctrl+E et Ctrl+Shift+E par défaut
- [#308](https://github.com/Refhi/Weda-Helper/issues/308) - Ajout d'un lien vers le log du Companion dans la page des options
- [#301](https://github.com/Refhi/Weda-Helper/issues/301) - Un clic du milieu sur le W du Menu W ouvre un nouvel onglet vers l'accueil du dossier patient, et non le module en cours.
- Automatisation du contrôle du MT + ouvre un nouvel onglet pour ne pas avoir à patienter. Un message vous indique si cela a fonctionné ou non. Vous pourrez retourner dans le premier onglet si vous souhaitez enregistrer le MT.
- Automatisation partielle de la déclaration de MT : sélectionne automatiquement le patient en cours, pré-coche les cases de consentement. Vous n'avez plus qu'à cliquer sur "Transmettre" pour valider.
- [#273](https://github.com/Refhi/Weda-Helper/issues/273) - Automatisation de la récupération du MT et de sa mise à jour avec l'annuaire des professionnels de santé. (désactivé par défaut)
- [#284](https://github.com/Refhi/Weda-Helper/issues/284) - Possibilité d'inverser automatiquement le titre du corps du message et le titre du message lors de la réception d'un courrier (beta, merci de me faire part de vos retours)

## Fix :
- [#293](https://github.com/Refhi/Weda-Helper/issues/293) - Clique automatiquement sur "Continuer sans l'ordonnance numérique" si le message d'erreur est détecté (désactivé par défaut).
- [#309](https://github.com/Refhi/Weda-Helper/issues/309) - Correction du plantage des FSE lors de l'impression instantanée lorsque le DMP est solllicité en même temps (fonctionne en inhibant l'envoi au DMP le temps de la réalisation de la FSE)
- [#303](https://github.com/Refhi/Weda-Helper/issues/303) - Correction d'un problème d'affichage des raccourcis claviers lors de l'appuis de Alt prolongé sous MAC. Sous MAC il faut désormais appuyer deux fois de suite sur Alt pour afficher les raccourcis claviers.
- [#295](https://github.com/Refhi/Weda-Helper/issues/295) - l'affichage automatique des atcd fonctionnent à nouveau
- [#315](https://github.com/Refhi/Weda-Helper/issues/315) - Amélioration des boutons FSE dégradée et Téléconsultation dans la FSE + ajout de raccourcis claviers
- rétablissement du rafrachissement automatique des messages Mssanté

## Refactory :
- [#325](https://github.com/Refhi/Weda-Helper/issues/325) - Amélioration de la gestion des options


# [2.8.0.1] - ajout du message video


# [2.8] - Impression instantanée
## Ajouts :
- [#262](https://github.com/Refhi/Weda-Helper/issues/262) - Affichage des Antécédents dans un volet latéral - désactivé par défaut, à activer dans les options
- [#267](https://github.com/Refhi/Weda-Helper/issues/267) - Possibilité (cf. Options) de cocher "Non" automatiquement pour les ordonances numériques
- [#250](https://github.com/Refhi/Weda-Helper/issues/250) - Cotation automatique : MOP ("DéfautMOP" à mettre dans les cotations favorites)
- [#261](https://github.com/Refhi/Weda-Helper/issues/261) - Ajout d'une pré-alerte dans les antécédents : si la date de l'alerte est dans moins de 6 mois (paramétrable), la date s'affiche en orange + gras au lieu de magenta.
- [#268](https://github.com/Refhi/Weda-Helper/issues/268) - Filtre automatiquement l'historique pour n'afficher que date et titre(désactivé par défaut)
- [#263](https://github.com/Refhi/Weda-Helper/issues/263) - impression instantanée ! (ouvre un nouvel onglet au lancement de l'impression, qui se termine tranquilement dans l'onglet initial, avant d'être fermé après confirmation de l'impression). A n'utiliser que conjointement avec le Companion.
- [#269](https://github.com/Refhi/Weda-Helper/issues/269) - Implémente une fonction pour le développeur de Weda-Helper pour envoyer des notifications via le système de notification de Weda
- [#225](https://github.com/Refhi/Weda-Helper/issues/225) - Sauvegarde automatique de la dernière sélection du choix d'AMC dans les FSE
- [#281](https://github.com/Refhi/Weda-Helper/issues/281) - Coche automatiquement "Présentation d'un feuillet AT" lors de la création d'une FSE si l'assurance "Accident du travail" est sélectionnée
- sélectionne automatiquement "Rien" dans les Pièces justificatives AMO si "Champ de donnée Actes - Pièce Justificative AMO invalide : Erreur de saisie Nature" est détecté
- [#282](https://github.com/Refhi/Weda-Helper/issues/282) - mettre la souris sur "Ordonnance numérique" dans les prescriptions affiche un choix Oui/Non pour sélectionner le "consentement à la consultation de l'ordonnance numérique".
- [#29](https://github.com/Refhi/Weda-Helper-Companion/issues/29) - ajout d'un bouton pour archiver les fichiers envoyés via ctrl+U

## Fix :
- [#265](https://github.com/Refhi/Weda-Helper/issues/265) - tentative de fix des problèmes de navigation par tabulation
- [#276](https://github.com/Refhi/Weda-Helper/issues/276) - les raccourcis n'étaient plus modifiable dans les options
- [#278](https://github.com/Refhi/Weda-Helper/issues/278) - DéfautTC est désormais testé en priorité

## Deprecated :
- uncheckSiImagerie est désormais obsolète, et a été supprimé, merci @Weda :)

# [2.7.2] - fix
- [#260](https://github.com/Refhi/Weda-Helper/issues/260) - ajout d'une discrète bulle info grisée en bas à droite des boutons éligibles
- [#264](https://github.com/Refhi/Weda-Helper/issues/264) - ouverture automatique de l'historique et retrait des éléments surnuméraires
- [#246](https://github.com/Refhi/Weda-Helper/issues/246) - tentative de fix de l'impression des AM - ajout d'une lib pour la manipulation des pdf



# [2.7.1] - hotfix
- l'historique à gauche s'affiche de nouveau automatiquement dans les pages de consultation, demande et courrier


# [2.7] - refactory
## refactory : (c'est à dire maintenance et amélioration du code sans ajout de fonctionnalités)
- deplacement de l'impression dans un fichier à part
- réorganisation, simplification et amélioration de la lisibilité de print.js, ajout de jsdoc
- suppression de lightObserver au profit de waitForElement
- l'url de base est désormais extraite du manifest.json (permet de faciliter les tests et de nettoyer un peu le code)
- séparation du code en plus de fichiers pour plus de lisibilité
## fix :
- [#242](https://github.com/Refhi/Weda-Helper/issues/242) - lors de l'utilisation de raccourcis claviers, plusieurs consultations pouvaient être créées en même temps. Ajout d'un délais réfractaire pour éviter cela.
- [#231](https://github.com/Refhi/Weda-Helper/issues/231) - l'inversion automatique des champs ALD se déclenchait trop facilement
- [#228](https://github.com/Refhi/Weda-Helper/issues/228) - tentative de fix de la mauvaise selection du règlement "Virement" lors des téléconsultations
- suppression de l'ancienne méthode d'anti-throttle
  
## ajouts :
- ajout d'un lien avec Weda pour la désactivation des options de Weda Helper déjà implémentées dans Weda.

# [2.6.2] - 15/09/2024
## fix :
- [#241](https://github.com/Refhi/Weda-Helper/issues/241) - correction de la détection des types de prescription d'ordo numérique

# [2.6.1] - 
## fix :
- [#221](https://github.com/Refhi/Weda-Helper/issues/198) - l'affichage de l'historique à gauche ne fonctionnait plus dans certains cas.
- [#227](https://github.com/Refhi/Weda-Helper/issues/227) - ajout des indicateurs de raccourcis dans Echanges Sécurisés
- [#232](https://github.com/Refhi/Weda-Helper/issues/232) - correction de la détection des types de prescription d'ordo numérique
- 

# [2.6] - 
## ajouts :
- [#162](https://github.com/Refhi/Weda-Helper/issues/162) - Mettre tout les raccourcis claviers lors d'un appuis long de Alt
- [#196](https://github.com/Refhi/Weda-Helper/issues/196) - Accés direct au dossier patient depuis l'agenda via un clic droit
- [#185](https://github.com/Refhi/Weda-Helper/issues/185) - Alt+D insère la date du jour dans n'importe quel champ de texte
- oublié dans la documentation : DéfautTC existe ! (pour les téléconsultations) + sélection automatique du mode "Virement" pour les téléconsultations
- [#217](https://github.com/Refhi/Weda-Helper/issues/217) - DéfautALD est également utilisé pour les accidents du travail
- [#144](https://github.com/Refhi/Weda-Helper/issues/144) - memorisation des choix d'impression pour la FSE + ctrl+P imprime la FSE automatiquement (donc une FSE dégradée peut être validée via 'n/o' => 'n/o' => ctrl+P puis alt+V)
- [#112](https://github.com/Refhi/Weda-Helper/issues/112) - ajout d'options pour limiter le nombre d'atcd affichés en CIM 10 et de les trier par ordre alphabétique
- [#184](https://github.com/Refhi/Weda-Helper/issues/184) - ajout du calcul automatique du Z-score pour les courbes pédiatriques (vous devez créer un suivi nommé "Z-IMC" pour que cela fonctionne) => pour les courbes pédiatriques et le Z-score vous devez cliquer sur "Enregistrer" (Ctrl+S) pour que les valeurs du jour soient prises en compte.
- [#212](https://github.com/Refhi/Weda-Helper/issues/212) : la validation d'un règlement manuel envoie désormais une demande au TPE, et possibilité de saisir manuellement un montant à envoyer dans la popup (ce qui s'affiche quand on clique sur l'icone de Weda Helper).
- Cliquer sur "Basculer en mode prescription bi-zone" déplace aussi le texte présent dans le champ ALD

## fix :
- [#198](https://github.com/Refhi/Weda-Helper/issues/198) - la cotation par défaut fonctionne automatiquement dès que le 2e choix o/n est fait, même à la souris
- [#186](https://github.com/Refhi/Weda-Helper/issues/186) - "n" et "o" dans les fse même quand assurance "maternité" est sélectionnée
- [#208](https://github.com/Refhi/Weda-Helper/issues/208) - Alt+W fonctionne depuis les pages d'accueil
- [#209](https://github.com/Refhi/Weda-Helper/issues/209) - défaultPédia fonctionne désormais pour les ages <1 an
- [#190](https://github.com/Refhi/Weda-Helper/issues/190) - accès facilité aux ATCD et aux notes patients depuis n'importe quelle liste de patients issus d'une recherche : Bouton de droite pour les notes, bouton du milieu pour les ATCD
- [#211](https://github.com/Refhi/Weda-Helper/issues/211) - La cotation DéfaultPédia se déclenchait pour ages < 7 ans au lieu de 6
- [#207](https://github.com/Refhi/Weda-Helper/issues/207) - le mode vertical ne casse plus certaines fonctions d'imports et raccourcis


# [2.5.0] - 17/07/2024
## ajout :
- [#101](https://github.com/Refhi/Weda-Helper/issues/101) - Ajout d'une cotation par défaut selon le mode de la FSE
=> vous pouvez désormais créer une cotation "DéfautALD" dans vos favoris et elle sera automatiquement sélectionnée lors de la création d'une FSE en mode ALD
=> idem pour "DéfautPédia" qui sera automatiquement sélectionnée pour les enfants 0-6 ans
- [#131](https://github.com/Refhi/Weda-Helper/issues/131) - navigation entre champs de texte via Tab et Shift+Tab dans les pages de consultation. Focus possible à l'ouverture d'une consultation dans le champ de titre.
- [#151](https://github.com/Refhi/Weda-Helper/issues/151) - ajout de semelle et orthoplastie dans les mots-clés pour la classification "podologie" automatique
- [#116](https://github.com/Refhi/Weda-Helper/issues/116) - enregistre automatiquement le dernier type de document pour l'envoi au DMP pour les PDF classés comme courrier dans Weda
- [#173](https://github.com/Refhi/Weda-Helper/issues/173) - le bouton "TPE Bis" dans la popup de l'extension envoie 1€ si aucun règlement n'a été récemment demandé. Ce afin de faciliter les tests de liaison avec le Companion/TPE.
- [#119](https://github.com/Refhi/Weda-Helper/issues/119) - ajout d'un bouton pour imprimer directement les pdfs présents dans les "documents du cabinet medical"
- [#123](https://github.com/Refhi/Weda-Helper/issues/123) - mise à jour des textes explicatifs au sujet de la configuration du Companion.
- [#179](https://github.com/Refhi/Weda-Helper/issues/179) - décoche automatiquement la case "ordonnance numérique" si on fait une Demande d'Imagerie
- [#137](https://github.com/Refhi/Weda-Helper/issues/137) - valider automatiquement une ordonnance numérique
- [#99](https://github.com/Refhi/Weda-Helper/issues/99) - sélection automatique du type de document "FSE dégradée" lors de l'import d'une PJ SCOR
- [#182](https://github.com/Refhi/Weda-Helper/issues/182) - affichage d'un message d'alerte en cas de contre-indication médicamenteuse absolue

## fix :
- [#171](https://github.com/Refhi/Weda-Helper/issues/171) - Correction d'un bug dans la fonction "Décocher automatiquement le message et le fichier IHE_XDM.zip lors de l'importation d'un message depuis la messagerie sécurisée" qui décochait le document joint dans certains cas
- Correction de l'option "Cocher automatiquement la case "Réaliser une FSE en gestion unique" pour les patients C2S" qui ne fonctionnait plus
- Amélioration du message de bienvenue et de mise à jour pour y ajouter un ascenseur et la possibilité de le fermer en cliquant à l'exérieur


# [2.4.2] - 01/07/2024
## fix 
- [#168](https://github.com/Refhi/Weda-Helper/issues/168) - Perte curseur lors prescription d'une demande avec l'historique affiché
- le panneau de DMP est de nouveau masqué dans les Courriers lorsqu'historyToLeft est activé

# [2.4.1] - ... - bugfix
## fix de bugs :
- #152 - L'option "Ouvre automatiquement la fenêtre des ordonnances-types lors des prescriptions médicamenteuses" empêchait la rédaction d'un conseil médicamenteux
- #153 - De nouveau superpositions quand ouverture d'un document joint lors d'une consultation
- #154 - La recherche de médicament s'efface lors d'un premier lancement de Weda dans certaines conditions
- #155 - Courbes pédiatriques vont derrière l'iframe de l'history2Left
- #149 - Courbes pédiatriques HS si "Activer la navigation entre les valeurs de suivi avec la touche Tab dans les consultations." est décochée
- #161 - bug bouton impression manquant dans certificat si affichage historique activé

# [2.4] - 28/06/2024
## ajout :
- Décocher automatiquement le message et le fichier IHE_XDM.zip lors de l'importation d'un message depuis la messagerie sécurisée
- Sélection automatique du type d'ordonnance numérique quand il s'agit d'une Demande, et qu'un mot-clé est détecté : (infirmierRegex = /IDE|infirmier|pansement|injection/i; kineRegex = /kiné|kine|kinésithérapie|kinesitherapie|MKDE|kinesitherapeute|kinesithérapeute/i; pedicureRegex = /pédicure|pedicure|podologie|podologique|podologue/i; orthophonieRegex = /orthophonie|orthophonique|orthophoniste/i; let orthoptieRegex = /orthoptie|orthoptique|orthoptiste/i;) => n'hésitez pas à nous demander d'ajouter d'autres mot-clés pertinents.
- 2 raccourcis désormais possibles selon le modèle d'impression preféré, idem pour les téléchargements : Ctrl+P pour l'impression et Ctrl+D pour le téléchargement pour le premier modèle, et Ctrl+Shift+P et Ctrl+Shift+D pour le second modèle.
- détection automatique du Companion s'il est en route, mais n'est pas activé dans les options de Weda-Helper

## fix :
- le focus reste dans le champ de recherche après l'ouverture automatique des prescriptions-types
- blocage du historyToLeft si une fenêtre de prévisualisation est ouverte pour éviter des superpositions
- alt+V fonctionne désormais aussi pour valider l'import de documents
- message [addTweak] plus explicite dans la console
- nette amélioration de la fiabilité des raccourcis claviers
- amélioration de la fonction "historyToLeft" qui est désormais bien plus rapide, et hautomatiquement dimensionnée pour la taille de l'écran
- amélioration du Readme, notamment la partie sur le Companion et les raccourcis claviers

# [2.3] - 2024-05-28
## refactory :
- passage des options par défaut dans le manifest.json pour éviter les doublons
- creation et utilisation prioritaire de 'addTweak' qui simplifie l'ajout de fonctionnalités dans telle ou telle page en fonction de l'option liée. Pour faciliter la lecture du code et la maintenance on l'appelle après chaque ensemble de tableau urls/options/callbacks
- refactory complet de la gestion des impressions et des téléchargements
- Les raccourcis claviers sont désormais directement gérés dans les options ! Vous devrez donc les redéfinir si vous les aviez personnalisés.

## ajout :
- on peut désormais uploader un document en un seul raccourcis clavier ! (par défaut Ctrl+U) Définissez le dossier dans le companion (v1.4+). Ctrl+U enverra automatiquement le dernier fichier créé.
- création d'une fiche-mémo [Fiche Mémo des raccourcis à imprimer](https://github.com/Refhi/Weda-Helper/releases/latest/download/FicheMemo.pdf)

## fix :
- ajout d'une période refractaire pour certains raccourcis claviers pour éviter les activations multiples dans certains cas de figure
- message de bienvenue étendu pour ajouter des liens vers le Companion mac et windows


# [2.2] - 2024-04-20 
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