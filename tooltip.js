// // Gestion de l'affichage de l'aide
// afficher une infobulle à côté des entrées W avec la clé de submenuDict
function tooltipshower() {
    // vérifier que la fenêtre est active et que le focus est sur la page
    if (!document.hasFocus() || document.hidden) {
        return;
    }

    // simuler un survol de W
    var element = document.querySelector('[class="has-popup static"]');
    if (element) {
        element.dispatchEvent(new MouseEvent('mouseover', {
            view: window,
            bubbles: true,
            cancelable: true
        }));
    }
    chrome.storage.local.get(["defaultShortcuts", "shortcuts"], function (result) {
        const { shortcuts, defaultShortcuts } = result;
        let submenuDict = {};
        let submenuDictAll = {};

        Object.entries(keyCommands).forEach(([key, action]) => {
            const match = action.toString().match(/submenuW\('(.*)'\)/);
            if (match) {
                const submenu = match[1];
                submenuDict[submenu] = shortcutDefaut(shortcuts, defaultShortcuts, key);
            }
            submenuDictAll[key] = {
                raccourci: shortcutDefaut(shortcuts, defaultShortcuts, key),
                description: defaultShortcuts[key].description
            };
        });

        // Ajouts manuels
        Object.assign(submenuDictAll, {
            "ouinonfse": { raccourci: 'n/o', description: "Valide oui/non dans les FSE" },
            "pavnumordo": { raccourci: "pavé num. /'à'", description: "Permet d’utiliser les touches 0 à 9 et « à » pour faire les prescriptions de médicaments." }
        });

        updateElementsWithTooltips(submenuDict);
        displayShortcutsList(submenuDictAll);
    });


    function updateElementsWithTooltips(submenuDict) {
        document.querySelectorAll('.level2.dynamic').forEach(element => {
            const description = element.innerText.replace(/ \(\d+\)$/, '');
            if (submenuDict[description]) {
                const tooltip = createTooltip(submenuDict[description]);
                element.appendChild(tooltip);
            }
        });
    }

    function createTooltip(text) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        Object.assign(tooltip.style, {
            position: 'absolute',
            top: '0px',
            left: '100%',
            padding: '10px',
            backgroundColor: '#284E98',
            border: '1px solid black',
            zIndex: '1000',
        });
        tooltip.textContent = text;
        return tooltip;
    }

    function displayShortcutsList(submenuDictAll) {
        const shortcutsList = document.createElement('div');
        shortcutsList.className = 'tooltip';
        Object.assign(shortcutsList.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: '1001',
            backgroundColor: '#ffffff',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
            border: '1px solid #e0e0e0',
            fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
            color: '#333',
            fontSize: '14px',
        });
        shortcutsList.innerHTML = buildTableHTML(submenuDictAll);
        document.body.appendChild(shortcutsList);
    }

    function buildTableHTML(submenuDictAll) {
        let tableHTML = '<table><tr><th style="text-align:right;">Raccourci&nbsp;</th><th style="text-align:left">&nbsp;Description</th></tr>';
        Object.entries(submenuDictAll).forEach(([_, { raccourci, description }]) => {
            tableHTML += `<tr><td style="text-align:right;">${raccourci}&nbsp;</td><td style="text-align:left">&nbsp;${description}</td></tr>`;
        });
        return tableHTML + '</table>';
    }
}

// retirer l'infobulle d'aide et relacher W
function mouseoutW() {
    // Supprimer les tooltips
    var tooltips = document.querySelectorAll('div.tooltip');
    tooltips.forEach(function (tooltip) {
        tooltip.remove();
    });
    // relacher W
    var element = document.querySelector('[class="has-popup static"]');
    if (element) {
        element.dispatchEvent(new MouseEvent('mouseout', {
            view: window,
            bubbles: true,
            cancelable: true
        }));
    }

}

// TODO à séparer la logique IOS et Windows
// addTweak('*', '*Tooltip', function () {

//     let lastAltPressTime = 0;

//     document.addEventListener('keydown', function(event) {
//         if (event.altKey) { //Permet détection de Alt sur Windows et sur Mac, parfois renvoyé comme ⌥ par le clavier
//             const currentTime = new Date().getTime();
        
//             if (currentTime - lastAltPressTime < 1000) {
//                 lastAltPressTime = 0; // Reset after detecting double press
//                 if (document.querySelectorAll('div.tooltip').length == 0)
//                 {
//                     tooltipshower();
//                 }
//                 else {
//                     mouseoutW();
//                 }
                
//             } else {
//                 lastAltPressTime = currentTime; // Update last press time
//             }
//         }
//     });
// });