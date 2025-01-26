/**
 * @file patientLink.js
 * @description Ce fichier contient des fonctions et des utilitaires pour gérer les liens et les informations des patients
 * dans l'extension Chrome. Il inclut des fonctions pour récupérer les informations des patients via l'API de Weda,
 * ajouter des raccourcis pour accéder aux antécédents et aux notes des patients, et observer les éléments du DOM
 * pour appliquer ces fonctionnalités.
 */



// Lien avec l'API de Weda (/api/patients/[numeropatient])
// Exemple pour Mme DESMAUX (un dossier de démonstration) :
// /api/patients/65407357 qui retourne un objet JSON
// par exemple :
// getPatientInfo(65407357)
//     .then(data => {
//         let name = data.birthName;
//         console.log('getPatientInfo ok, name:', name);
//     });
// Le json contiens les éléments suivants :
// {
//     "id": 65407357,
//     "patientFileUrl": "/FolderMedical/PatientViewForm.aspx?PatDk=[numéro du patient]|0|0|0&crypt=[clé selon la session]",]",
//     "medicalOfficeId": 4341,
//     "createdDate": "2023-09-15T00:00:00",
//     "lastModifiedDate": "2023-09-15T09:12:07.527",
//     "prefix": "Mme",
//     "sex": "F",
//     "birthName": "DESMAUX",
//     "lastName": "DESMAUX",
//     "firstNames": "NATHALIE",
//     "preferredBirthFirstName": "NATHALIE",
//     "preferredFirstName": "NATHALIE",
//     "isLunarBirthDate": false,
//     "birthDate": "1955-06-15T00:00:00",
//     "lunarBirthDate": null,
//     "dateOfBirth": {
//       "date": "15/06/1955",
//       "isLunar": false
//     },
//     "birthPlace": "inconnu",
//     "birthPlaceInsee": "99999",
//     "familyStatus": null,
//     "zip": "27670",
//     "city": "ST OUEN DU TILLEUL",
//     "profession": null,
//     "professionFreeForm": "",
//     "nir": "2550699999999",
//     "nirCle": "34",
//     "birthRank": "1",
//     "nationality": null,
//     "isDeceased": false,
//     "deathDate": null,
//     "deathCause": null,
//     "refDoctorUserId": 37637,
//     "refDoctorStart": "2024-05-19T00:00:00",
//     "refDoctorEnd": null,
//     "recordNumber": "",
//     "appointmentTag": null,
//     "prematurity": {
//       "isPremature": false,
//       "weeks": 0,
//       "days": 0
//     },
//     "refDoctorNote": null,
//     "consent": {
//       "consentSharingWithinStructure": false,
//       "consentSharingWithDmp": 0,
//       "mspVisitData": null
//     }
// }



// Fonction pour récupérer les informations du patient
async function getPatientInfo(patientId) {
    return fetch(`${baseUrl}/api/patients/${patientId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .catch(error => console.error('There has been a problem with your fetch operation:', error));
}

// Fonction pour récupérer l'Id du patient en cours depuis l'url de la page en cours
function getCurrentPatientId() {
    let patientId = window.location.search.match(/PatDk=(\d+)/);
    if (patientId) {
        return patientId[1];
    }
    return null;
}


// // Ajout d'un accès simplifié dans un onglet dédié aux antécédents, depuis n'importe
// quelle page affichant une liste de patient après recherche
// Ainsi que dans les pages de biologie où 
let urls = [
    '/FolderMedical/FindPatientForm.aspx',
    '/FolderMedical/UpLoaderForm.aspx',
    '/FolderMedical/WedaEchanges/',
    '/FolderMedical/HprimForm.aspx'
];

addTweak(urls, '*addATCDShortcut', function () {
    let patientsSelector =
        '[id^="ContentPlaceHolder1_FindPatientUcForm1_PatientsGrid_LinkButtonPatientGetNomPrenom_"], ' +
        '[id^="ContentPlaceHolder1_FindPatientUcForm2_PatientsGrid_LinkButtonPatientGetNomPrenom_"]' // mode vertical dans les imports

    async function addPatientUrlParams(element, patientFileNumber) {
        let patientInfo = await getPatientInfo(patientFileNumber);
        console.log('patientInfo', patientInfo);
        let patientFileUrl = patientInfo.patientFileUrl;
        let patientFileUrlParts = patientFileUrl.split('?');
        let patientFileUrlParams = patientFileUrlParts[1];
        console.log('patientFileUrlParams', patientFileUrlParams);
        // Ajoute l'information dans une propriété UrlParams
        element.UrlParams = patientFileUrlParams;
        // console.log('ajout de ', patientFileUrlParams, 'à', element, 'ce qui donne ', element.UrlParams);
    }

    function openPatientNotes(element) {
        const baseUrlNote = `${baseUrl}/FolderMedical/PopUpRappel.aspx?`;
        let patientFileUrlParams = element.UrlParams;
        let url = baseUrlNote + patientFileUrlParams;
        recordMetrics({ clicks: 2, drags: 2 });
        window.open(url, '_blank');
    }

    function openPatientATCD(element) {
        const baseUrlATCD = `${baseUrl}/FolderMedical/AntecedentForm.aspx?`;
        let patientFileUrlParams = element.UrlParams;
        let url = baseUrlATCD + patientFileUrlParams;
        recordMetrics({ clicks: 2, drags: 2 });
        window.open(url, '_blank');
    }

    function addHintOverlay(element) {
        element.title = '[Weda-Helper] Clic droit pour ajouter une note, ctrl+clic (ou clic du milieu) pour gérer les antécédents';
    }


    function processFoundPatientList(elements = null) {
        if (!elements) {
            elements = document.querySelectorAll(patientsSelector);
        }
        elements.forEach(element => {
            let title = element.title;
            let parts = title.split('|');
            let patientFileNumber = parts[0]; // Prendre le premier élément
            if (parseInt(patientFileNumber, 10) === 0) {
                // console.log('Ne fonctionne pas pour Archimed');
                return;
            }
            // console.log('patientFileNumber', patientFileNumber);
            addPatientUrlParams(element, patientFileNumber);
            addATCDShortcut(element);
        });
    }

    function addATCDShortcut(element) {
        // Trouver l'élément parent pour les pages HPRIM, sinon l'élément lui-même
        let target
        if (window.location.href.startsWith(`${baseUrl}/FolderMedical/HprimForm.aspx`)) {
            target = element.parentElement.parentElement;
        } else {
            target = element;
        }

        addHintOverlay(target);


        // Gestion du clic droit
        target.addEventListener('contextmenu', function (event) {
            event.preventDefault(); // Empêche le menu contextuel de s'ouvrir
            openPatientNotes(element);
        });

        // Gestion du clic du milieu
        target.addEventListener('mousedown', function (event) {
            if (event.button === 1 || (event.ctrlKey && event.button === 0)) { // Bouton du milieu ou Ctrl+clic gauche
                // retirer l'élément href pour éviter l'ouverture d'un nouvel onglet
                let href = element.getAttribute('href');
                element.removeAttribute('href');
                event.preventDefault(); // Empêche le comportement par défaut (comme ouvrir un lien dans un nouvel onglet)
                console.log('Clic du milieu sur', event.target);
                openPatientATCD(element);

                // Rétablir l'attribut href après un délai
                setTimeout(() => {
                    element.setAttribute('href', href);
                }, 500);
            }
        });
    }
    // Pour tout les endroits où une liste de patient est issue d'un champ de recherche
    waitForElement({ selector: patientsSelector, callback: processFoundPatientList });

    // Puis la gestion des ATCD dans les pages de biologie et messagerie sécurisée
    let selecteurHprimEtMessagesSecurises =
        '[title="Ouvrir le dossier patient dans un autre onglet"], ' + // Dans la messagerie sécurisée
        '[title="Ouvrir la fiche patient dans un onglet"]'; // Dans HPRIM
    function ProcessHprimEtMessagesSecurises() {
        let elements = document.querySelectorAll(selecteurHprimEtMessagesSecurises);
        console.log('ProcessHprimEtMS', elements);
        elements.forEach(element => {
            let href = element.getAttribute('href');
            if (href) {
                let patientFileNumber = href.match(/PatDk=(\d+)/)[1];
                addPatientUrlParams(element, patientFileNumber);
                addATCDShortcut(element);
            }
        });
    }

    waitForElement({
        selector: selecteurHprimEtMessagesSecurises,
        callback: ProcessHprimEtMessagesSecurises
    });

});


/**
 * Ouvre un nouvel onglet avec l'URL du dossier du patient actuel.
 * 
 * @async
 * @function newPatientTab
 */
async function newPatientTab() {
    let patientInfo = await getPatientInfo(getCurrentPatientId());
    let urlPatient = patientInfo['patientFileUrl'];
    window.open(urlPatient);
}