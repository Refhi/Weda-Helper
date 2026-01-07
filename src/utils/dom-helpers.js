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