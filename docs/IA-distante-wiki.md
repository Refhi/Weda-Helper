# Avant-propos

## ⚠️ ATTENTION ⚠️

Si vous connectez un serveur IA distant à Weda-Helper, vous êtes directement responsable de l'envoi de ces données (médicales et nominatives) à un serveur distant.

Les développeurs de Weda-Helper ne peuvent être tenus responsables de l'usage que vous en ferez.
Vous ne devez déployer cette fonctionnalité QUE si vous avez rempli l'ensemble de vos obligations médicales et juridiques permettant l'usage d'un LLM distant et que vous en comprenez les implications.

Voici un résumé NON EXHAUSTIF des prérequis pour autoriser cet usage :

- Le serveur auquel vous allez connecter l'extension DOIT être agréé « HDS » (Hébergement de Données de Santé).
- Vous devez avoir signé avec l'hébergeur un contrat d'hébergement de données de santé (HDS) **et** un contrat de sous-traitance RGPD (art. 28).
- Vous devez vérifier que les données restent dans l'UE et ne servent pas à entraîner les modèles.
- Vous devez informer vos patients de l'usage du modèle distant.
- Vous devez tenir un registre des traitements (art. 30 RGPD) et réaliser une analyse d'impact (AIPD, art. 35 RGPD), probablement requise pour des données de santé traitées par une nouvelle technologie.

**cf. (de façon non exhaustive) :**

**RGPD, art. 13-14 (information des personnes).** _Tout traitement de données personnelles impose d'informer la personne : finalité, base légale, destinataires, sous-traitants, durée de conservation, droits, et transferts hors UE le cas échéant. Un LLM distant, même hébergé chez un HDS, est un sous-traitant (art. 28) et doit figurer parmi les destinataires. Il faut un contrat de sous-traitance._

**Code de la santé publique, art. L.1111-8.** _L'hébergement de données de santé doit se faire chez un hébergeur certifié HDS. L'information du patient sur l'hébergement est traditionnellement attendue, et la certification HDS ne dispense pas de l'information RGPD._

**Loi bioéthique de 2021, art. L.4001-3 du CSP (par prudence).** _Lorsqu'un traitement algorithmique de données massives (IA) sert à un acte de prévention, de diagnostic ou de soin, le professionnel doit s'assurer que le patient en a été informé, ainsi que des modalités de ce traitement. Il doit aussi pouvoir en expliquer le fonctionnement. Le texte vise surtout les dispositifs médicaux à visée diagnostique ou thérapeutique. Pour un simple assistant de rédaction ou de synthèse, son application est discutée, mais informer le patient reste la position prudente._

**Règlement européen sur l'IA (AI Act).** _Il ajoute des obligations de transparence et de supervision humaine, selon la classification du système. Elles pèsent surtout sur le fournisseur, mais le professionnel qui déploie l'outil peut aussi être concerné._

**Contrôle humain.** Le médecin reste responsable de tout ce que l'IA écrit et **doit** relire avant validation. L'outil peut halluciner !

**Secret médical.** _Le transfert à un sous-traitant est admis dans le cadre HDS, mais la transparence envers le patient reste la bonne pratique._

**Droit d'opposition (art. 21 RGPD).** _Le patient peut s'opposer, et il est recommandé de respecter ce refus._

**Ces informations ne remplacent pas un conseil juridique** (CNIL, Ordre des médecins, juriste).

### Exemple de mention d'information patient

> Ce cabinet utilise un outil d'aide à la rédaction fondé sur l'intelligence artificielle, hébergé chez [hébergeur] (certifié HDS, données traitées dans l'UE). Vos données ne servent pas à entraîner le modèle. Le médecin relit et valide tout contenu. Vous pouvez vous opposer à cet usage en le signalant à votre médecin.

# En résumé

Si vous n'êtes pas certain de ce que vous faites, passez votre chemin.
(oui, c'est dur, mais ne prenez pas de risque)

# Services proposant le statut HDS

- OVH (dans leur offre « HDS »)
- Azure
- Il en existe forcément d'autres, n'hésitez pas à nous tenir informés si vous en trouvez.

## Azure propose une offre compatible : vérifiez sa certification HDS

### 1. Ouvrir un compte Azure
Allez sur azure.microsoft.com/free et créez votre compte. Dans portal.azure.com > Abonnements, vérifiez que l'abonnement est actif et notez son Subscription ID. Les crédits offerts servent à payer les appels ; ils ne donnent pas automatiquement de quota.

### 2. Créer le projet en France Central
Ouvrez ai.azure.com > Create new project > Advanced options. Choisissez votre abonnement, un groupe dédié et France Central. Nommez le projet, puis cliquez Create. Azure crée aussi la ressource Foundry : notez son nom exact.

### 3. Déployer un premier modèle NON CONFORME
Dans https://ai.azure.com/, cliquez sur « Afficher les déploiements » puis « Déployer un modèle de base », tapez « gpt-5-mini » dans le champ de recherche, puis « Déployer » > « Paramètres par défaut ».
Retournez sur l'accueil, puis notez la clé API, le point de terminaison OpenAI et le nom du modèle, que vous reporterez dans les options de Weda-Helper.

⚠️ Ce premier modèle est non-HDS : il ne doit servir qu'à des dossiers-tests, **sans aucune donnée réelle**.

### 4. Déployer un modèle conforme HDS (sous réserve que vous ayez signé le contrat HDS avec Azure)
Vous pouvez déployer gpt-6-luna (pour les petites tâches) et gpt-6-sol (pour les grosses tâches) en sélectionnant « Zone de données standard ». Vérifiez que cette zone garantit un traitement dans l'UE, ainsi que les conditions de rétention des données (surveillance des abus) et d'entraînement des modèles.
Si un message d'erreur de quota apparaît, réessayez plus tard (un ou deux jours après) ou demandez une augmentation de quota.

## FAQ

- « C'est vraiment HDS, Azure ? » : à vous de vérifier :)
- « Comment je teste si ça marche ? » : cliquez sur la bulle du client en bas à droite, et tapez « test ».
