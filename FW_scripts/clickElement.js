console.log("[clickElement.js]");


function clickElement(elementSelector, iframeSelector = null) {
    console.log("[clickElement.js] elementSelector", elementSelector, "iframeSelector", iframeSelector);
    let targetElement;
    let targetDocument;

    targetDocument = document.querySelector(iframeSelector).contentWindow.document;
    if (!targetDocument) {
        targetDocument = document;
    }
    console.log("[clickElement.js] targetDocument", targetDocument);

    if (targetDocument) {
        targetElement = targetDocument.querySelector(elementSelector);
    }

    if (targetElement) {
        targetElement.click();
    }

    console.log("[clickElement.js] j'ai tenté de cliquer sur l'élément", targetElement, "dans le document", targetDocument);
}


// Ajout d'un écouteur pour les événements personnalisés
document.addEventListener('clicElement', function(event) {
    const { elementSelector, iframeSelector } = event.detail;
    clickElement(elementSelector, iframeSelector);
});