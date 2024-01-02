// // Différentes petites fonctions ajoutées ou supprimées de Weda
// // Ne justifiant pas la création d'un fichier séparé

// // Fonction pour attendre la présence d'un élément avant de lancer une fonction
function waitForElement(selector, text = null, timeout, callback) {
    var checkInterval = setInterval(function() {
        var elements = document.querySelectorAll(selector);
        for (var i = 0; i < elements.length; i++) {
            if (!text || elements[i].textContent.includes(text)) {
                callback(elements[i]);
                clearInterval(checkInterval);
                clearTimeout(timeoutId);
                return;
            }
        }
    }, 100);

    var timeoutId = setTimeout(function() {
        clearInterval(checkInterval);
        console.log(`Element ${selector} ${text ? 'with text "' + text + '"' : ''} not found after ${timeout} ms`);
    }, timeout);
}

// // Boutons du popup
// Permet de mettre tout les éléments de la page en attente d'import sur "Consultation"
function allConsultation() {
    console.log('setAllImportToConsultation');
    var elements = document.querySelectorAll('[id^="ContentPlaceHolder1_FileStreamClassementsGrid_DropDownListGridFileStreamClassementEvenementType_"]');
    for (var i = 0; i < elements.length; i++) {
        // set the dropdown to "Consultation"
        elements[i].selectedIndex = 0;
        console.log('Element set to Consultation:', elements[i]);
    }
}

// // Gestion de l'affichage de l'aide
// afficher une infobulle à côté des entrées W avec la clé de submenuDict
function tooltipshower() {
    // abort if the focus is out of the window/tab TODO
    if (!document.hasFocus() || document.hidden) {
        return;
    }

    // first force the mouseover status to the element with class="level1 static" and aria-haspopup="ContentPlaceHolder1_MenuNavigate:submenu:2"
    var element = document.querySelector('[class="has-popup static"]');
    if (element) {
        element.dispatchEvent(new MouseEvent('mouseover', {
            view: window,
            bubbles: true,
            cancelable: true
        }));
    }
    // from keyCommands, extract for each key the action
    const entries = Object.entries(keyCommands);
    let submenuDict = {};

    for (const [key, value] of entries) {
        let action = value.action;
        // in the action extract the variable send to submenuW
        if (action.toString().includes('submenuW')) {
            var match = action.toString().match(/submenuW\('(.*)'\)/);
            if (match) {
                var submenu = match[1];
                submenuDict[submenu] = value.key;
            }
        }
    }

    console.log(submenuDict);

    // change the description of each class="level2 dynamic" whom description contain the key of submenuDict to add the corresponding value
    var elements = document.getElementsByClassName('level2 dynamic');
    for (var i = 0; i < elements.length; i++) {
        var element = elements[i];
        var description = element.innerText;
        description = description.replace(/ \(\d+\)$/, '');
        // console.log('description', description);
        if (description in submenuDict) {
            // console.log('description in submenuDict', description);
            // add a tooltip with the key of submenuDict next to the element
            var tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.style.position = 'absolute';
            tooltip.style.top = '0px';
            tooltip.style.left = '100%';
            tooltip.style.padding = '10px';
            tooltip.style.backgroundColor = '#284E98';
            tooltip.style.border = '1px solid black';
            tooltip.style.zIndex = '1000';
            // tooltip.style.color = 'black';
            tooltip.textContent = submenuDict[description];
            element.appendChild(tooltip);
        }
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


// // lien avec Weda-Helper-Companion
// envoi d'instruction au TPE via Weda-Helper-Companion
function sendtpeinstruction(amount) {

    // store the amount in chrome.storage.local
    chrome.storage.local.set({ 'lastTPEamount': amount }, function () {
        console.log('lastTPEamount', amount, 'sauvegardé avec succès');
    });
        
    chrome.storage.local.get(['portCompanion', 'delay_primary', 'RemoveLocalCompanionTPE', 'apiKey'], function (result) {
        const portCompanion = result.portCompanion;
        const removeLocalCompanionTPE = result.RemoveLocalCompanionTPE;
        const delay_primary = result.delay_primary;
        const apiKey = result.apiKey;

        if (!delay_primary || !portCompanion || removeLocalCompanionTPE !== false || !apiKey) {
            console.warn('RemoveLocalCompanionTPE ou portCompanion ou la clé API ne sont pas définis ou RemoveLocalCompanionTPE est !false (valeur actuelle :', removeLocalCompanionTPE, ')');
            return;
        } else if (!(/^\d+$/.test(amount))) {
            console.log('amount', amount, 'n\'est pas un nombre entier');
            return;
        }
        else {
            console.log('sendinstruction', amount + 'c€' + ' to ' + ipTPE + ':' + portTPE);
            console.log('délais avant envoi de l\'instruction au TPE', delay_primary, 'ms');
            setTimeout(() => {
                // La clé API se met en fin d'URL : exemple http://localhost:3000/tpe/1?apiKey=1234567890
                fetch(`http://localhost:${portCompanion}/tpe/${amount}?apiKey=${apiKey}`)
                    .then(response => response.json())
                    .then(data => console.log(data))
                    .catch(error => console.error('Error:', error));
                console.log('Instruction envoyée au TPE');
            }, delay_primary);
        }
    });
}

// envoi du dernier montant au TPE dans Weda-Helper-Companion
function sendLastTPEamount() {
    chrome.storage.local.get('lastTPEamount', function (result) {
        const lastTPEamount = result.lastTPEamount;
        console.log('Envoi du dernier montant demandé au TPE : ' + lastTPEamount + 'c€');
        if (lastTPEamount) {
            console.log('lastTPEamount', lastTPEamount);
            sendtpeinstruction(lastTPEamount);
        }
    });
}

// déclenchement de l'impression dans Weda-Helper-Companion
function sendPrint() {
    chrome.storage.local.get('RemoveLocalCompanionPrint', function (result) {
        const RemoveLocalCompanionPrint = result.RemoveLocalCompanionPrint;
        if (RemoveLocalCompanionPrint !== false) {
            console.log('RemoveLocalCompanionPrint est !false (valeur actuelle :', RemoveLocalCompanionPrint, ')');
            return;
        } else {
            console.log('send Print');
            chrome.storage.local.get(['portCompanion', 'delay_primary', 'apiKey'], function (result) {
                const portCompanion = result.portCompanion;
                const delay_primary = result.delay_primary;
                const apiKey = result.apiKey;
                if (!portCompanion || !delay_primary) {
                    console.warn('RemoveLocalCompanionTPE ou delay_primary ne sont pas définis. Aller à chrome-extension://fnfdbangkcmjacbeaaiongkbacaamnfd/options.html pour les définir');
                    return;
                }
                console.log('délais avant déclenchement de la touche impression', delay_primary, 'ms');
                setTimeout(() => {
                    fetch(`http://localhost:${portCompanion}/print?apiKey=${apiKey}`)
                        .catch(error => console.error('Error:', error));
                    console.log('Print envoyé');
                }, delay_primary);
            });
        }
    });
}


// // Aide au clic
// permet de cliquer sur un élément selon l'attribut onclick
function clickElementByOnclick(onclickValue) {
    var element = document.querySelector(`[onclick*="${onclickValue}"]`);
    console.log('Element:', element);
    if (element) {
        console.log('Clicking element onclickvalue', onclickValue);
        element.click();
        return true;
    } else {
        console.log('Element not found onclickvalue', onclickValue);
        return false;
    }
}


// Vérifie la présence de l'élément avec title="Prénom du patient"
function checkPatientName() {
    waitForElement('[title="Prénom du patient"]', null, 5000, function(patientNameElement) {
        var patientName = patientNameElement.value;
        waitForElement('vz-lecture-cv-widget', null, 5000, function(widgetElement) {
            var spans = widgetElement.getElementsByTagName('span');
            for (var i = 0; i < spans.length; i++) {
                if (spans[i].textContent.includes(patientName)) {
                    console.log('Patient name found');
                    spans[i].click();
                    return true;
                }
            }
            console.log('Patient name not found');
            return false;
        });
    });
}



// // Ecoutes d'évènements
// Vérifie que la fenêtre est active et que le focus est sur la page
window.addEventListener('blur', function () {
    console.log('Window lost focus (blur)');
    mouseoutW();
});
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        console.log('Window lost focus (hidden)');
        mouseoutW();
    };
});


// Ecoute les instructions du script de fond au sujet de la popup
const actions = {
    'allConsultation': allConsultation,
    'tpebis': () => sendLastTPEamount()
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action in actions) {
        console.log(request.action + ' demandé');
        actions[request.action]();
    }
});

// Ecoute l'appuis de la touches Alt pour afficher l'aide
var tooltipTimeout;
document.addEventListener('keydown', function (event) {
    if (event.key === 'Alt') {
        tooltipTimeout = setTimeout(function () {
            tooltipshower();
        }, 500);
    }
});
document.addEventListener('keyup', function (event) {
    if (event.key === 'Alt') {
        clearTimeout(tooltipTimeout);
        mouseoutW();
    }
});


// // Change certains éléments selon l'URL les options
// [Page de Consultation] Modifie l'ordre de tabulation des valeurs de suivi
chrome.storage.local.get('TweakTabConsultation', function (result) {
    function changeTabOrder() {
        var elements = document.querySelectorAll('[id^="ContentPlaceHolder1_SuivisGrid_EditBoxGridSuiviReponse_"]');
        // change the taborder starting with 0 for elements[0] and incrementing by 1 for each element
        for (var i = 0; i < elements.length; i++) {
            elements[i].tabIndex = i + 1;
        }
    }
    if (result.TweakTabConsultation !== false) {
        if (window.location.href.startsWith('https://secure.weda.fr/FolderMedical/ConsultationForm.aspx')) {
            changeTabOrder();
            console.log('ConsultationFormTabOrderer started');
        }
    }
});



// // Retrait des suggestions de titre
chrome.storage.local.get('RemoveTitleSuggestions', function (result) {
    function RemoveTitleSuggestions() {
        console.log('RemoveTitleSuggestions started');
        var elements = document.getElementById('DivGlossaireReponse');
        if (elements) {
            elements.remove();
        }
    }
    if (result.RemoveTitleSuggestions !== false) {
        // vérifie que l'on est sur une page soufrant du problème
        if (window.location.href.startsWith('https://secure.weda.fr/FolderMedical/')
            && window.location.href.includes('Form.aspx')
            && !window.location.href.startsWith('https://secure.weda.fr/FolderMedical/PatientViewForm.aspx')
            && !window.location.href.startsWith('https://secure.weda.fr/FolderMedical/UpLoaderForm.aspx')) {

            // Créer un observateur de mutations pour surveiller les modifications du DOM
            var titleremoverTimeout;
            var observer = new MutationObserver(function (mutations) {
                mutations.forEach(function (mutation) {
                    if (titleremoverTimeout) {
                        clearTimeout(titleremoverTimeout);
                    }
                    titleremoverTimeout = setTimeout(RemoveTitleSuggestions, 400);
                });
            });

            // Configurer l'observateur pour surveiller tout le document
            var config = { childList: true, subtree: true };
            observer.observe(document, config);

            RemoveTitleSuggestions();
        }
    }
});



// // Ajoute l'écoute du clavier pour faciliter les prescription
if (window.location.href.startsWith('https://secure.weda.fr/FolderMedical/PrescriptionForm.aspx')) {
    console.log('numpader started');
    // Make a dictionnary with keystrokes and their corresponding actions
    var index = {
        '0': 'SetQuantite(0);',
        '1': 'SetQuantite(1);',
        '2': 'SetQuantite(2);',
        '3': 'SetQuantite(3);',
        '4': 'SetQuantite(4);',
        '5': 'SetQuantite(5);',
        '6': 'SetQuantite(6);',
        '7': 'SetQuantite(7);',
        '8': 'SetQuantite(8);',
        '9': 'SetQuantite(9);',
        '/': 'SetQuantite(\'/\');',
        '.': 'SetQuantite(\',\');',
        'Backspace': 'AnnulerQuantite();',
    };

    // detect the press of keys in index, and click the corresponding element with clickElementByonclick
    document.addEventListener('keydown', function (event) {
        console.log('event.key', event.key);
        if (event.key in index) {
            console.log('key pressed:', event.key);
            clickElementByOnclick(index[event.key]);
        }
    });
}



// TODO : ajouter d'autres fenêtres d'information
// TODO : basculer l'écoute du clavier sur keydown et keyup