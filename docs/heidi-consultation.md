# Transcription Heidi en consultation

Dans **Options → Assistant IA**, activez **Accès à Heidi** et **Transcription Heidi en consultation**, puis rechargez l’onglet Weda. Pour recevoir des propositions après le transfert, activez également **Analyser automatiquement la transcription après le transfert** et configurez l’assistant IA. Les prompts des courriers au spécialiste et des demandes d’imagerie se modifient dans cette même rubrique.

1. Ouvrez le dossier et sa consultation dans Weda, ainsi que la vue des sessions dans Heidi. Le microphone doit être utilisable dans Heidi.
2. Dans la consultation Weda, appuyez sur **Alt+Maj+F8** ou cliquez sur **Démarrer Heidi**. Weda-Helper crée une nouvelle session. Si plusieurs onglets Heidi sont ouverts, choisissez-en un dans le panneau et relancez le démarrage.
3. Appuyez sur **Alt+Maj+F9** ou cliquez sur **Arrêter et transférer**. Après la fin du traitement par Heidi, le texte s’ajoute au champ principal de la consultation, à la suite du texte déjà saisi.
4. Ouvrez **Voir les propositions** pour relire les extraits de transcription. **Préparer l’ajout dans Weda** ouvre le formulaire natif d’antécédent libre à valider. Les éléments qui relèvent d’un onglet sans ajout libre adapté, notamment les allergies, restent à saisir dans Weda. **Rédiger le brouillon** génère le document demandé dans une fenêtre où vous pouvez le corriger et le copier vers le formulaire Weda approprié.

Pour choisir vos touches, ouvrez **Options → Assistant IA → Raccourcis Heidi**. Cliquez sur le raccourci de démarrage ou d’arrêt, puis appuyez sur la touche souhaitée (F1 à F19, PageUp ou PageDown) ou sur une combinaison. Le choix est enregistré immédiatement. Rechargez la consultation Weda pour l’utiliser. Si vous utilisez aussi le connecteur Heidi/Weda Tampermonkey, gardez des touches distinctes.

La session Heidi, l’onglet, le patient et l’éditeur Weda sont vérifiés avant le transfert. Gardez la consultation ouverte jusqu’à la fin. Si le transfert perd sa session ou si vous quittez la consultation, vérifiez l’enregistrement dans Heidi. Si Heidi traite encore le texte, vous pouvez réessayer le transfert depuis la même consultation. La sauvegarde automatique de Weda-Helper attend la fin de l’opération ou la fermeture de la fenêtre de relecture.

L’analyse utilise le profil IA actif, qui reçoit la transcription et les antécédents utilisés pour la comparaison. Si le profil est distant, ces données sont envoyées au serveur configuré. Les propositions et brouillons restent dans l’onglet Weda et hors de l’historique du chat. Le transfert remplit l’éditeur de consultation. Pour les propositions, l’enregistrement de l’antécédent se fait dans le formulaire natif et les documents restent des brouillons à relire.

## Vérification

Lancez `node tests/heidi-consultation.browser.cjs` avec Playwright et Chromium installés. `PLAYWRIGHT_MODULE` peut pointer vers une installation existante de Playwright. Le scénario charge l’extension dans un profil séparé, avec des pages Heidi/Weda fictives et une API IA locale simulée.

Pour le contrôle sur les services authentifiés, utilisez une session et un dossier de démonstration. Vérifiez notamment l’accès au microphone, le marqueur de fin de transcription, le contenu du champ principal et la validation dans le formulaire d’antécédent.
