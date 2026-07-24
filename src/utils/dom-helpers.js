/**
 * @file dom-helpers.js
 * @description Fonctions d'aide pour la manipulation DOM et contournement CSP.
 * Fournit des utilitaires pour cliquer sur des éléments protégés par CSP
 * en passant par des scripts injectés dans le contexte de la page.
 * 
 * @exports startClicScript - Initialise le script de clic CSP
 * @exports clicCSPLockedElement - Clique sur un élément protégé par CSP
 * @exports clickElementByOnclick - Clique via l'attribut onclick
 * @exports getConnectedDoctorName - Récupère le nom du médecin actuellement connecté
 * 
 * @requires metrics.js (recordMetrics)
 */

// Clic sur certains éléments où le CSP bloque le clic quand on est en isolated
// Passe par un script injecté pour contourner le problème

// Initialise d'abord clickElement.js
function startClicScript() {
    var scriptClicElements = document.createElement('script');
    scriptClicElements.src = chrome.runtime.getURL('FW_scripts/clickElement.js');
    (document.head || document.documentElement).appendChild(scriptClicElements);
}
startClicScript();

function clicCSPLockedElement(elementSelector, iframeSelector = null) {
    console.log('Clic sur élément bloqué par CSP :', elementSelector);
    const event = new CustomEvent('clicElement', { detail: { elementSelector, iframeSelector } });
    document.dispatchEvent(event);
}



/**
 * Récupère le nom du médecin actuellement connecté
 * @returns {string|null} - Le nom du médecin connecté, ou null si non trouvé
 */
function getConnectedDoctorName() {
    // Essayer d'abord avec LabelUserLog
    const labelUserLog = document.getElementById('LabelUserLog');
    if (labelUserLog && labelUserLog.innerText) {
        return labelUserLog.innerText.trim();
    }

    // Sinon essayer avec LinkButtonUserLog
    const linkButtonUserLog = document.getElementById('LinkButtonUserLog');
    if (linkButtonUserLog && linkButtonUserLog.innerText) {
        // Extraire juste la première ligne (le nom)
        const lines = linkButtonUserLog.innerText.split('\n');
        if (lines.length > 0) {
            return lines[0].trim();
        }
    }

    return null;
}


// // Aide au clic // TODO à évaluer
// permet de cliquer sur un élément selon l'attribut onclick
function clickElementByOnclick(onclickValue) {
    var element = document.querySelector(`[onclick*="${onclickValue}"]`);
    console.log('Element:', element);
    if (element) {
        console.log('Clicking element onclickvalue', onclickValue);
        element.click();
        recordMetrics({ clicks: 1, drags: 1 });
        return true;
    } else {
        console.log('Element not found onclickvalue', onclickValue);
        return false;
    }
}