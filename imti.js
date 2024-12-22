// Contrôle de l'IMTi

// Contrôle automatique du MT :
addTweak('/FolderMedical/PatientViewForm.aspx', 'autoControlMT', function () {
    getOption('autoMTnewTab', function(autoMTnewTab) {
        if (autoMTnewTab === 'true') {
            waitForElement({
                selector: 'a[title="Récupère l\'identité du médecin traitant en interrogeant le téléservice IMTi"]',
                callback: function (elements) {
                    // On ajoute un event listener pour attendre le clic
                    elements[0].addEventListener('click', function () {
                        newPatientTab();
                    });
                }
            });
        }
    });
    
    waitForElement({
        selector: '.dmpVitaleTable',
        callback: async function (elements) {
            let patientInfo = await getPatientInfo(getCurrentPatientId());
            let birthDate = patientInfo['birthDate']; // date au format "1955-06-15T00:00:00"
            let tableauPatientsCV = elements[0];
            let possibleDDN = tableauPatientsCV.querySelectorAll('tbody tr td:nth-child(4)'); // date au format " JJ/MM/AAAA "
            // dans ces éléments recherche celui correspondant à la bonne ddn
            let ddnElements = Array.from(possibleDDN).filter(element => element.textContent.trim() === birthDate.split('T')[0].split('-').reverse().join('/'));
            // Clique sur son parent
            if (ddnElements.length === 1) {
                ddnElements[0].parentElement.click();
                // Attendre l'apparition de l'élément de réponse
                waitForElement({
                    selector: 'dmp-imti-response .flexColStart div span',
                    callback: function (elements) {
                        let nomMT = elements[0].parentElement.innerText.trim();
                        sendWedaNotifAllTabs({
                            message: `Le médecin traitant déclaré est : \"${nomMT}\", allez à l'onglet précédent pour valider.`,
                            type: 'success',
                            icon: 'done',
                        });
                    }
                });
            } else {
                sendWedaNotifAllTabs({
                    message: 'Erreur dans le contrôle automatique du MT, jumeaux présents ?',
                    type: 'undefined',
                    icon: 'help_outline',
                })
            }
        }
    });
});

// Facilite la déclaration du MT
addTweak('/FolderMedical/PatientViewForm.aspx', '*oneClickMT', function () {
    waitForElement({
        selector: '.dmpMtInfo',
        callback: function (elements) {
            let checkBoxes = elements[0].parentElement.querySelectorAll('input[type="checkbox"]');
            checkBoxes.forEach(checkBox => {
                checkBox.click();
            });
        }
    });
});