/**
 * @file headlessSetup.js
 * @description Configuration spécifique pour un setup headless.
 * Gère le contournement de la page de mise à jour de Chrome
 * pour un poste dédié à l'importation automatique des HPRIM.
 * 
 * @requires tweaks.js (addTweak)
 * @requires optionalPermissions.js (closeCurrentTab)
 */

// Gestion d'un setup assez spécifique : headless
// Je l'utilise pour un poste dédié à l'importation des hprim, et qui est censé s'ouvrir automatiquement
// Weda. Je suis confronté à la situation des mise à jour de chrome qui bloquent le setup sur une page de mise à jour

addTweak('/AccueilUserMessageForm.aspx', 'headLessSetup', function () {
    // Appuie sur le bouton <input type="submit" name="ButtonValider" value="Accéder à WEDA" id="ButtonValider" class="button valid" style="width:130px;">
    waitForElement({
        selector: '#ButtonValider',
        triggerOnInit: true,
        callback: function (elements) {
            elements[0].click();
            console.log('Button clicked on AccueilUserMessageForm page');
        }
    });
});