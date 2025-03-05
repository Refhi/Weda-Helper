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
    if (instantVaccineAlreadyProcessed()) {return}
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
    if (instantVaccineAlreadyProcessed()) {return}
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
        sessionStorage.setItem('patientRecord', getCurrentPatientId())
    }

    
});

function instantVaccineAlreadyProcessed() {
    const lastPatient = sessionStorage.getItem('patientRecord')
    const currentPatient = getCurrentPatientId()
    console.log('lastPatient', lastPatient, 'currentPatient', currentPatient)
    return lastPatient === currentPatient
}