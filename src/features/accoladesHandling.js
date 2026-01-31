/**
 * @file src/features/accoladesHandling.js
 * @description Gère la suppression des textes entre accolades dans les différents éditeurs de texte.
 */

const urlsToWorkOn = [
    "/FolderMedical/CertificatForm.aspx",
    "/FolderMedical/DemandeForm.aspx",
    "/FolderMedical/CourrierForm.aspx"

];

// Suppression dans les prescriptions des textes entre {} : ex "{test}" => ""
addTweak(urlsToWorkOn, '*removeBrackets', function () {
    // Sélectionner toutes les iframes qui commencent par CE_ContentPlaceHolder1_Editor
    let iframes = document.querySelectorAll("iframe[id^='CE_ContentPlaceHolder1_Editor']");

    if (iframes.length === 0) {
        console.log('[removeBrackets] aucune iframe trouvée');
        return;
    }

    // Parcourir toutes les iframes trouvées et appliquer la fonction
    iframes.forEach(removeBracketsFromIframe);

    // On va également recommencer aux DOM refresh
    afterMutations({
        delay: 100,
        callBackId: 'removeBrackets',
        callback: function () {
            iframes = document.querySelectorAll("iframe[id^='CE_ContentPlaceHolder1_Editor']");
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
