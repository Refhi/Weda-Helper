/**
 * @file upload.js
 * @description Gestion de l'upload automatique de fichiers depuis le Companion.
 * Permet l'upload automatique de documents transmis par Weda-Helper-Companion :
 * - Récupération du dernier fichier depuis le Companion
 * - Upload automatique dans Weda
 * - Nettoyage des flags après traitement
 * 
 * @requires tweaks.js (addTweak)
 * @requires companionLink.js (sendToCompanion)
 */

// Fonctions permettant l'upload automatique d'un fichier transmis par le Companion
addTweak('/FolderMedical/PopUpUploader.aspx', '*hotkeyUpload', function () {
    chrome.storage.local.get('automaticUpload', function (result) { //On vérifie que le flag automaticUpload est bien présent
        if (result.automaticUpload == true) {
            sendToCompanion('latestFile', null, null, function (response) {

                if (!response['data'] || !response['fileName']) {
                    return;
                }

                let byteCharacters = atob(response['data']); //On récupére les charactères à partir du base64
                let byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i); //On en fait un Array d'octets
                }
                let byteArray = new Uint8Array(byteNumbers);

                let blob = new Blob([byteArray], { type: "application/octet-stream" });

                let file = new File([blob], response['fileName']); //On créé un fichier


                let dataTransfer = new DataTransfer(); //On ne peut pas modifier l'input du file directement donc on simule un drag and drop https://dev.to/code_rabbi/programmatically-setting-file-inputs-in-javascript-2p7i
                dataTransfer.items.add(file);

                waitLegacyForElement("input[type=file]", null, 100, function (element) {

                    let fileInput = element;
                    fileInput.files = dataTransfer.files;
                    fileInput.dispatchEvent(new Event('change'));

                    // Ajout d'un timestamp dans le sessionStorage
                    let timestamp = Date.now();
                    sessionStorage.setItem('lastUpload', timestamp);

                });

                // waitForElement({
                //     selector: 'input[type=file]',
                //     callback: function (elements) {
                //         let fileInput = elements[0];
                //         fileInput.files = dataTransfer.files;
                //         fileInput.dispatchEvent(new Event('change'));

                //         // Ajout d'un timestamp dans le sessionStorage
                //         let timestamp = Date.now();
                //         sessionStorage.setItem('lastUpload', timestamp);

                //     }
                // });

            });

        }
        chrome.storage.local.set({ 'automaticUpload': false }, function () { }); //On retir le flag pour ne pas gêner un upload manuel
    });


    // Si le timestamp est présent depuis moins de 5 secondes
    let lastUpload = sessionStorage.getItem('lastUpload');
    if (lastUpload && Date.now() - lastUpload < 5000) {
        console.log('Dernier upload il y a moins de 5 secondes, on ajoute un bouton Valider et archiver');
        let boutonValider = document.getElementById('ButtonValidFileStream');
        if (boutonValider) {
            console.log('ButtonValidFileStream found, ajout des boutons Valider et archiver et Valider et supprimer', boutonValider);
            // Ajout du bouton à côté de selectors[0]
            let deleteButton = document.createElement('button');
            deleteButton.id = 'WHButtonValidAndDelete'
            deleteButton.className = 'button';
            deleteButton.value = 'Valider et mettre à la corbeille';
            deleteButton.innerHTML = 'Valider et mettre à la corbeille';
            deleteButton.type = 'button'; // pour éviter le submit
            deleteButton.style = 'color: #f00 !important'

            let archiveButton = document.createElement('button');
            archiveButton.id = 'WHButtonValidAndArchive';
            archiveButton.className = 'button';
            archiveButton.value = 'Valider et archiver';
            archiveButton.innerHTML = 'Valider et archiver';
            archiveButton.type = 'button'; // pour éviter le submit
            // Insérer le bouton après l'élément trouvé

            boutonValider.parentNode.insertBefore(deleteButton, boutonValider.nextSibling);
            boutonValider.parentNode.insertBefore(archiveButton, boutonValider.nextSibling);
            // Ajout de l'événement en cas de clic
            archiveButton.onclick = function () {
                console.log('[Archivage auto] envoi au companion de la demande d\'archivage');
                sendToCompanion('archiveLastUpload', null, null, function (response) {
                    console.log('[Archivage auto] réponse du companion', response);
                    boutonValider.click();
                });
            };
            deleteButton.onclick = function () {
                console.log('[Archivage auto] envoi au companion de la demande de supression');
                sendToCompanion('trashLastUpload', null, null, function (response) {
                    console.log('[Archivage auto] réponse du companion', response);
                    boutonValider.click();
                });
            };
        };
    }
});