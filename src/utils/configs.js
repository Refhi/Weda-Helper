// Récupère l'url de base définie dans le manifest.json
const manifest = chrome.runtime.getManifest();
const url_star = manifest.content_scripts.flatMap(script => script.matches)[0]; // *://secure.weda.fr/*
const baseUrl = url_star.replace('*', 'https').replace('/*', '');


// WedaOverloadOptions est un objet qui contient les options de Weda. Il contient les mêmes clés que les différentes options de l'extension.
// La valeur de ces clés écrase l'option du même nom dans l'extension.
// Weda peut donc, à dessein, forcer l'activation ou la neutralisation d'une option.
// C'est plutôt pensé pour neutraliser une option qui vient d'être implémentée par Weda.
let WedaOverloadOptions = {};
let gotDataFromWeda = false;


// initialise les options provenant de Weda
var script = document.createElement('script');
script.src = chrome.runtime.getURL('FW_scripts/FWData.js');
(document.head || document.documentElement).appendChild(script);
// certaines pages ne reçoivent pas les données de Weda, donc on la shunte
if (window.location.href.includes("BinaryData.aspx")) {
    gotDataFromWeda = true;
} else {
    window.addEventListener("message", function (event) {
        if (event.source === window && event.data.type === "FROM_PAGE") {
            WedaOverloadOptions = event.data.payload.wedaHelper;
            gotDataFromWeda = true;
            if (WedaOverloadOptions == undefined) {
                WedaOverloadOptions = false;
            }

            // Modification de la clé MoveHistoriqueToLeft_Consultation  à true pour les tests
            // WedaOverloadOptions.MoveHistoriqueToLeft_Consultation = true;

            console.log('WedahelperOverload', WedaOverloadOptions);
        }
    });
}

// Afficher la nouvelle URL
console.log("[WH] baseUrl = ", baseUrl); // https://secure.weda.fr en général