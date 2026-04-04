/**
 * @file forms.js
 * @description Tweaks spécifiques à la page FormulaireForm.aspx.
 *
 * @requires tweaks.js (addTweak)
 * @requires dom-oberver.js (waitForElement)
 */

// Inhibe l'événement 'input' sur les champs ForText* (id^="ForText", class="entry")
// Ces champs ont un listener Weda en phase bubble qui déclenche une action indésirable.
// On l'intercepte en phase de capture avant qu'il n'atteigne les listeners de la page.
addTweak('/FolderMedical/FormulaireForm.aspx', '*InhibitForTextInputEvent', function () {
    waitForElement({
        selector: 'input[id^="ForText"]',
        justOnce: false,
        triggerOnInit: true,
        callback: function () {
            const inputs = document.querySelectorAll('input[id^="ForText"]');
            inputs.forEach(function (input) {
                // Enter ne déclenche pas 'input' mais peut soumettre le formulaire ou déclencher onclick
                input.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        console.log('[forms.js] InhibitForTextInputEvent : Enter keydown stopped on', e.target);
                    }
                }, true);
            });
        }
    });
});
