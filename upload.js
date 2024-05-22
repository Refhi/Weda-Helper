// Fonctions permettant l'upload automatique d'un fichier transmis par le Companion
if (window.location.href.startsWith('https://secure.weda.fr/FolderMedical/PopUpUploader.aspx')) {

    chrome.storage.local.get('automaticUpload', function (result) { //On vérifie que le flag automaticUpload est bien présent
        if (result.automaticUpload !== false) {
            
            sendToCompanion('latestFile').then(response => {
                
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

                let file = new File([blob],response['fileName']); //On créé un fichier
                
                
                let dataTransfer = new DataTransfer(); //On ne peut pas modifier l'input du file directement donc on simule un drag and drop https://dev.to/code_rabbi/programmatically-setting-file-inputs-in-javascript-2p7i
                dataTransfer.items.add(file);

                let fileInput = window.document.querySelector('input[type="file"]'); 
                fileInput.files = dataTransfer.files;
                fileInput.dispatchEvent(new Event('change'));
            }).catch(error => {
                //TODO
            });
            
        }
        chrome.storage.local.set({ 'automaticUpload': false }, function () {}); //On retir le flag pour ne pas gêner un upload manuel
    });
    
}