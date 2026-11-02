# Transcription Heidi dans l'assistant Weda-Helper

Cette intégration répond à [l'issue #727](https://github.com/Refhi/Weda-Helper/issues/727).
Elle ne nécessite ni le connecteur Tampermonkey ni une clé API Heidi.

## Utilisation

1. Dans les options de Weda-Helper, rubrique **Assistant IA**, cliquer sur
   **Activer l'accès à Heidi** et accepter l'autorisation Chrome.
2. Ouvrir la session de consultation souhaitée sur `https://scribe.heidihealth.com/`.
3. Depuis le chat Weda-Helper, demander par exemple : « Lis la transcription Heidi
   et prépare un courrier au cardiologue en tenant compte des antécédents. »
4. L'assistant appelle `pageContext` et peut compléter avec `recoverPatientData`.
   Vérifier que la session Heidi correspond au patient Weda et relire le résultat.

Le bouton **Désactiver l'accès à Heidi** bloque les lectures suivantes et retire
l'autorisation spécifique au site. Le contenu déjà présent dans une conversation
reste dans son historique habituel.

## Contrat de l'outil

- `pageContext()` conserve la priorité des contextes PDF et Hprim existants.
  Depuis les autres pages Weda, il tente de lire la session Heidi ouverte.
- `pageContext({source: "heidi"})` lit Heidi quelle que soit la page Weda.
- `pageContext({source: "weda"})` se limite aux contextes Weda existants.
- S'il y a plusieurs onglets Heidi, l'outil renvoie uniquement leurs `tabId` et
  titres, sans lire leur contenu. Après le choix de l'utilisateur, appeler
  `pageContext({source: "heidi", tabId: 123})`.
- Le résultat comprend `source`, `sessionId`, `url`, `transcript` (texte brut avec
  horodatages), `note` (si affichée au départ) et `avertissement`.
- Chaque texte est limité à 60 000 caractères ; `transcriptTruncated` et
  `noteTruncated` signalent explicitement une coupure. `transcriptWarning` signale
  une transcription indisponible, même lorsqu'une note est lisible.
- Un changement de session Heidi ou de page Weda pendant la lecture invalide le
  résultat. Un onglet en veille, fermé, en chargement ou non autorisé donne une
  erreur avec une action à effectuer.

## Fonctionnement et limites

L'accès est facultatif et désactivé par défaut. Seules les permissions optionnelles
`scripting` et `https://scribe.heidihealth.com/*` sont demandées ; la permission
globale `tabs` n'est pas nécessaire. Le service worker lit le DOM de la session
ouverte à chaque appel, dans le monde isolé de l'extension. Il n'interroge aucune
API privée et ne conserve ni cache ni journal du contenu Heidi.

Si le panneau de transcription est démonté, la lecture ouvre brièvement l'onglet
**Transcription**, puis rétablit l'onglet précédent, sauf navigation de l'utilisateur
entre-temps. Elle ne touche pas à l'enregistrement, à la génération ni au presse-papiers.
Les sélecteurs `data-testid` sont issus du scraper Heidi du connecteur existant ;
une évolution du site peut nécessiter leur adaptation. Seul le contenu chargé par
Heidi est accessible, sans récupération de sessions archivées ni d'audio.

Le rapprochement d'identité entre Heidi et Weda n'est pas automatique. Le résultat
porte cet avertissement. Les données lues sont transmises au serveur IA choisi
par l'utilisateur via le circuit de conversation existant, comme le dossier Weda.

## Vérification

Lancer `node --test tests/heidi-page-context.test.cjs` pour le routage, les permissions,
la sélection des onglets et les erreurs. Les tests navigateur utilisent uniquement
des sessions fictives et un navigateur séparé :
`node tests/heidi-page-context.browser.cjs` (Playwright et Chromium requis).
`PLAYWRIGHT_MODULE` permet d'indiquer un module Playwright installé ailleurs ;
`PLAYWRIGHT_CHANNEL` choisit le navigateur des tests DOM (par exemple `msedge`),
et `PLAYWRIGHT_EXTENSION_EXECUTABLE` un Chromium de test pour charger les extensions.

Une vérification manuelle sur une session Heidi de démonstration reste nécessaire
avant diffusion : activation/refus/révocation, transcription depuis une note,
restauration de l'onglet, plusieurs sessions et contextes PDF/Hprim existants.
