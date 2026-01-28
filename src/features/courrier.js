/**
 * @file courrier.js
 * @description Fonctionnalités pour la page de courrier.
 * Gère les améliorations de l'interface de courrier :
 * - Sélection automatique du médecin traitant comme destinataire
 * - Coche automatique comme destinataire principal
 * 
 * @requires tweaks.js (addTweak)
 * @requires dom-oberver.js (waitForElement)
 * @requires metrics.js (recordMetrics)
 */

// Coche automatiquement le médecin traitant comme destinataire et destinataire principal
addTweak("/FolderMedical/CourrierForm.aspx", "autoSelectMT", function () {
    function listDestinataires() {
        var destinataires = document.querySelectorAll("label[for^='ContentPlaceHolder1_PatientContactsGrid_CheckBoxContactPatient_']");
        // console.log("[autoSelectMT] destinataires trouvés", destinataires);
        return destinataires;
    }

    // Parmis les destinataires, on cherche ceux qui sont les médecins traitants, où le texte est dans les balises <b>
    function findMTs() {
        var destinataires = listDestinataires();
        var mts = Array.from(destinataires).filter(function (dest) {
            return dest.querySelector("b");
        }).map(function (mt) {
            var forAttr = mt.getAttribute('for');
            var number = forAttr.split('_').pop();
            return number;
        });
        // console.log("[autoSelectMT] Numéros des médecins traitants trouvés", mts);
        return mts;
    }

    function checkMTs() {
        var mts = findMTs();
        mts.forEach(function (mt, index) {
            document.querySelector(selectorDestinataire + mt).click();
            if (index === 0) {
                document.querySelector(selectorMainDestinataire + mt).click();
            }
        });
    }

    // Ensuite on va cocher les cases correspondantes
    let selectorDestinataire = '#ContentPlaceHolder1_PatientContactsGrid_CheckBoxContactPatient_';
    let selectorMainDestinataire = '#ContentPlaceHolder1_PatientContactsGrid_CheckBoxContactPatientPrincipal_';



    setTimeout(checkMTs, 1000);
});