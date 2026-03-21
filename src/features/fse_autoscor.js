/**
 * --------------------------------------------------------------
 * Gestion du SCOR automatique
 * --------------------------------------------------------------
 */
addTweak('/vitalzen/gestion.aspx', 'TweakSCORDegradee', function () {
    waitForElement({
        selector: 'mat-select[name=selectedType]',
        callback: function (element) {
            console.log('menu déroulant trouvé, je clique dessus', element);
            element[0].click();
            recordMetrics({ clicks: 1, drags: 1 });
        }
    });

    waitForElement({
        selector: '#mat-select-8-panel mat-option .mat-option-text',
        callback: function (elements) {
            console.log('options trouvées', elements);
            elements[1].click();
            recordMetrics({ clicks: 1, drags: 1 });
        }
    });
});

// Coche automatiquement la case "Inclure la FSP en SCOR" dans la FSE
addTweak('/vitalzen/fse.aspx', 'SCORAutoSelectPJ', function () {
    waitForElement({
        selector: 'span',
        textContent: 'Inclure la FSP en SCOR',
        callback: function (elements) {
            console.log('[SCORAutoSelectPJ] Case SCOR PJ trouvée, je clique dessus si pas déjà cochée', elements[0]);
            // On cherche l'élément qui est coché ou non : c'est le fils 'input' de l'ainé du parent
            let checkbox = elements[0].parentElement.parentElement.querySelector('input');
            if (!checkbox.checked) {
                console.log('[SCORAutoSelectPJ] Case SCOR PJ non cochée, je clique dessus');
                elements[0].click();
                recordMetrics({ clicks: 1, drags: 1 });
            } else {
                console.log('[SCORAutoSelectPJ] Case SCOR PJ déjà cochée');
            }
        }
    });
});


addTweak('/vitalzen/fse.aspx', '*keepPrintDegradeeParameters', function () {
    waitForElement({
        selector: '.mat-slide-toggle-label span',
        textContent: "le patient peut signer",
        callback: function (element) { // on cherche aussi le texte, mais cf. Fin de fonction
            // d'abord rechercher tout les éléments avec comme role="switch"
            let toggles = document.querySelectorAll('[role="switch"]');
            let backgroundToggle;
            let canSignToggle;

            // retourne le texte de l'élément "switch" passé en paramètre
            function textOfToggle(toggle) {
                let parentParent = toggle.parentElement.parentElement;
                let textElement = parentParent.querySelector('span');
                return textElement.innerText;
            }

            toggles.forEach(function (toggle) {
                let textofTheToggle = textOfToggle(toggle);
                if (textofTheToggle === 'Retirer le fond') {
                    backgroundToggle = toggle;
                    console.log('[keepPrintDegradeeParameters] found backgroundToggle', backgroundToggle, ' dont le texte est: ', textofTheToggle);
                } else if (textofTheToggle === 'le patient peut signer') {
                    canSignToggle = toggle;
                    console.log('[keepPrintDegradeeParameters] found canSignToggle', canSignToggle, ' dont le texte est: ', textofTheToggle);
                } else {
                    console.log('[keepPrintDegradeeParameters] found an unknown toggle : ', toggle, ' . With text :', textofTheToggle);
                }
            });


            // surveille les changements de valeur des boutons et les enregistre dans le stockage local
            function addToggleWatcher(toggleElement, storageKey) {
                toggleElement.addEventListener('change', function () {
                    let saveObj = {};
                    saveObj[storageKey] = toggleElement.checked;
                    chrome.storage.local.set(saveObj, function () {
                        console.log(`[${storageKey}] ${storageKey} saved`, toggleElement.checked);
                    });
                });
            }

            // Ajoute un écouteur d'événement pour chaque bouton
            addToggleWatcher(backgroundToggle, 'backgroundToggle');
            addToggleWatcher(canSignToggle, 'canSignToggle');

            // If their state is different from the last time, set them to the last state
            chrome.storage.local.get(['backgroundToggle', 'canSignToggle'], function (result) {
                console.log('[keepPrintDegradeeParameters] Value currently is backgroundToggle : ' + result.backgroundToggle, 'canSignToggle : ' + result.canSignToggle);
                function changeToggleIfDifferent(toggleElement, storageKey) {
                    if (result[storageKey] !== undefined && toggleElement.checked !== result[storageKey]) {
                        toggleElement.click();
                        console.log('[keepPrintDegradeeParameters] ', storageKey, ' set to', result[storageKey]);
                        return true
                    } else {
                        console.log('[keepPrintDegradeeParameters] ', storageKey, ' already set to', result[storageKey]);
                        return false
                    }
                }
                let backGroundToggleIsNotSet = changeToggleIfDifferent(backgroundToggle, 'backgroundToggle');
                let canSignToggleIsNotSet = changeToggleIfDifferent(canSignToggle, 'canSignToggle');
                if (!backGroundToggleIsNotSet && !canSignToggleIsNotSet) {
                    console.log('[keepPrintDegradeeParameters] No toggle was changed, greenLight for printing');
                    let date = new Date();
                    let timestamp = date.getTime();
                    chrome.storage.local.set({ FSEPrintGreenLightTimestamp: timestamp }, function () {
                        console.log('[keepPrintDegradeeParameters] FSEPrintGreenLightTimestamp saved', timestamp);
                    });
                };
            });
        }
    });
});
