/**
 * Permet de faciliter la vaccination pour les vaccineurs de masse.
 * Il permet d'ouvrir automatiquement la partie "scan du datamatrix" dès l'ouverture
 * du dossier patient.
 * Afin de limiter les risques d'inconfort il ne s'actionne qu'à la première ouverture du dossier
 * et ne se relancera que si un autre dossier patient a été ouvert.
 * 
 */

const instantVaccineOption = 'instantVaccine'


addTweak('/FolderMedical/PatientViewForm.aspx', instantVaccineOption, function () {
    if (instantVaccineAlreadyProcessed()) { return }
    // On repère le bouton de vaccination
    let possibleVaccineButton = document.querySelectorAll('a.level2')
    // On recherche le texte " Vaccination et rappel"
    let vaccineButton = Array.from(possibleVaccineButton).find(e => e.innerText.includes("Vaccination et rappel"))
    // Si on ne le trouve pas on ne fait rien
    if (!vaccineButton) {
        return
    }
    // On clique dessus
    vaccineButton.click()
});

// La suite se passe sur une autre page
addTweak('/FolderMedical/VaccinForm.aspx', instantVaccineOption, function () {
    if (instantVaccineAlreadyProcessed()) { return }
    // Pour accéder à la page d'enregistrement de la vaccination
    let vaccineButton = document.querySelector('#ContentPlaceHolder1_ButtonNewSerieVaccin')
    if (vaccineButton) {
        vaccineButton.click()
    }

    // Pour valider la lecture du datamatrix
    let datamatrixButton = document.querySelector('#ContentPlaceHolder1_btnScanDatamatrix')
    if (datamatrixButton) {
        datamatrixButton.click()
        // On enregistre le patient actuel pour ne pas relancer le processus
        setCurrentPatientAsProcessed()
    }


});

// On fait une fonction similaire pour les raccourcis lors de l’ajout rapide d’une vaccination
// depuis la page de l’arborescence des vaccins
addTweak('/FolderMedical/VaccinForm.aspx', '*quickVaccineShortcut', function () {
    // tout d’abord on ajoute les boutons de raccourcis sur les boutons existants
    const existingAddVaccineButtons = document.querySelectorAll('.buttonheader')
    existingAddVaccineButtons.forEach(buttonHeader => {
        const button = buttonHeader.parentElement
        const quickButton = document.createElement('button')
        quickButton.innerText = '📷 Scan Datamatrix'
        quickButton.style.marginLeft = '10px'
        quickButton.className = 'buttonheader'
        quickButton.addEventListener('click', function (event) {
            event.preventDefault()
            // On met un marqueur pour indiquer qu'on est en mode ajout rapide
            sessionStorage.setItem('quickVaccineAdd', 'true')
            // on clique sur le bouton existant pour ouvrir le formulaire d'ajout
            clicCSPLockedElement('#' + button.id)
        })
        button.parentElement.insertBefore(quickButton, button.nextSibling)
    })
})

// Une fois sur la page d’ajout de vaccination on vérifie si on est en mode ajout rapide
addTweak('/FolderMedical/VaccinForm.aspx', '*quickVaccineProcess', function () {
    const isQuickAdd = sessionStorage.getItem('quickVaccineAdd')
    if (isQuickAdd === 'true') {
        // On clique sur le bouton de scan du datamatrix
        const datamatrixButton = document.querySelector('#ContentPlaceHolder1_btnScanDatamatrix')
        if (datamatrixButton) {
            // On enlève le marqueur
            sessionStorage.removeItem('quickVaccineAdd')
            datamatrixButton.click()
        }
    }
})

function instantVaccineAlreadyProcessed() {
    const lastPatient = sessionStorage.getItem('patientRecord')
    const currentPatient = getCurrentPatientId()
    console.log('lastPatient', lastPatient, 'currentPatient', currentPatient)
    return lastPatient === currentPatient
}

function setCurrentPatientAsProcessed() {
    const currentPatient = getCurrentPatientId()
    sessionStorage.setItem('patientRecord', currentPatient)
}


// autoformatage du champ de date
addTweak('/FolderMedical/VaccinForm.aspx', "*autoFormatDateVaccineField", function () {
    waitForElement({
        selector: '#ContentPlaceHolder1_TextBoxVaccinExpirationDate',
        justOnce: false,
        triggerOnInit: true,
        callback: function (elem) {
            // Ajout d'un écouteur d'événement pour le formatage automatique à la sortie du champ
            elem[0].addEventListener('blur', function (event) {
                let value = elem[0].value;
                let formattedValue = convertDate(value);
                if (formattedValue !== value) {
                    elem[0].value = formattedValue;
                }
            });
        }
    });
});