/**
 * @file src/features/accoladesHandling.js
 * @description Gère la suppression des textes entre accolades dans les différents éditeurs de texte.
 */

const urlsToWorkOn = [
    "/FolderMedical/CertificatForm.aspx",
    "/FolderMedical/DemandeForm.aspx",
    "/FolderMedical/CourrierForm.aspx",
    "/FolderMedical/PrescriptionForm.aspx"

];


// Suppression dans les prescriptions des textes entre {} : ex "{test}" => ""
addTweak(urlsToWorkOn, '*removeBrackets', function () {
    // Sélecteur pour les iframes d'éditeurs de texte
    const editorIframesSelector = "iframe[id^='CE_ContentPlaceHolder1_Editor'], #CE_ContentPlaceHolder1_PrescriptionSaisieLibre_EditorLibre_ID_Frame";

    // Sélectionner toutes les iframes d'éditeurs
    let iframes = document.querySelectorAll(editorIframesSelector);

    if (iframes.length !== 0) {
        console.log(`[removeBrackets] ${iframes.length} iframes trouvées, traitement en cours`);
        iframes.forEach(removeBracketsFromIframe);
    }

    console.log('[removeBrackets] traitement initial terminé, ajout de l\'observateur de mutations');

    // On va également recommencer aux DOM refresh
    afterMutations({
        delay: 100,
        callBackId: 'removeBrackets',
        callback: function () {
            console.log('[removeBrackets] DOM modifié, re-vérification des iframes');
            iframes = document.querySelectorAll(editorIframesSelector);
            iframes.forEach(removeBracketsFromIframe);
        }
    });
});


// Fonction pour supprimer les textes entre accolades dans une iframe
function removeBracketsFromIframe(iframe) {
    try {
        // Accéder au document de l'iframe
        const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;

        // Vérifier que le corps du document est disponible
        if (!iframeDocument.body) {
            console.log(`[removeBracketsFromIframe] corps du document non disponible pour l'iframe ${iframe.id}`);
            return;
        }

        // Cette fonction sera exécutée une fois que l'iframe est chargée
        function processIframeContent() {
            // Rechercher dans le contenu HTML
            const bodyContent = iframeDocument.body.innerHTML;

            // Si on trouve des textes entre accolades
            if (bodyContent.match(/\{.*?\}/g)) {
                // Remplacer les textes entre accolades par une chaîne vide
                const newContent = bodyContent.replace(/\{.*?\}/g, '');

                // Mettre à jour le contenu de l'iframe
                iframeDocument.body.innerHTML = newContent;

                console.log(`[removeBracketsFromIframe] texte modifié dans l'iframe ${iframe.id}`);

                // Si l'iframe utilise un éditeur WYSIWYG qui stocke le contenu ailleurs
                // (comme dans un champ caché), essayons de le mettre à jour aussi
                const hiddenFields = iframeDocument.querySelectorAll('input[type="hidden"]');
                hiddenFields.forEach(field => {
                    if (field.value && field.value.match(/\{.*?\}/g)) {
                        field.value = field.value.replace(/\{.*?\}/g, '');
                    }
                });

                console.log(`[removeBracketsFromIframe] champs cachés mis à jour dans l'iframe ${iframe.id}`);

            } else {
                console.log(`[removeBracketsFromIframe] aucun texte entre accolades trouvé dans l'iframe ${iframe.id}`);
            }
        }

        // Si l'iframe est déjà chargée, traiter immédiatement
        if (iframe.contentWindow.document.readyState === 'complete') {
            processIframeContent();
        } else {
            // Sinon, attendre que l'iframe soit chargée
            console.log(`[removeBracketsFromIframe] ajout d'un écouteur d'événement pour l'iframe ${iframe.id}`);
            iframe.addEventListener('load', processIframeContent);
        }

    } catch (e) {
        console.error(`[removeBracketsFromIframe] erreur d'accès à l'iframe ${iframe.id}:`, e);
    }
}
