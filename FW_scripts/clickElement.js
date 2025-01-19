console.log("[clickElement.js]");


function clickElement(elementSelector) {
    console.log("[clickElemen.js] elementSelector", elementSelector);
    let el = document.querySelector(elementSelector);
    if (el) {
        el.click();
    }
}


// Ajout d'un écouteur pour les événements personnalisés
document.addEventListener('clicElement', function(event) {
    let elementToClic = event.detail;
    clickElement(elementToClic);
});