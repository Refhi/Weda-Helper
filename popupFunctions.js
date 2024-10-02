// // Boutons du popup
// Celui pour renvoyer le dernier paiement TPE est dans fse.js
// Permet de mettre tout les éléments de la page en attente d'import sur "Consultation"
function allConsultation() {
    console.log('setAllImportToConsultation');
    var elements = document.querySelectorAll('[id^="ContentPlaceHolder1_FileStreamClassementsGrid_DropDownListGridFileStreamClassementEvenementType_"]');
    for (var i = 0; i < elements.length; i++) {
        // set the dropdown to "Consultation"
        elements[i].selectedIndex = 0;
        console.log('Element set to Consultation:', elements[i]);
        recordMetrics({ clicks: 2, drags: 2 });
    }
}

// Ecoute les instructions du script de fond au sujet de la popup
const actions = {
    'allConsultation': allConsultation,
    'tpebis': () => sendLastTPEamount(),
    'sendCustomAmount': (amount) => sendtpeinstruction(amount) // Ajout de l'action sendCustomAmount

};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action in actions) {
        console.log(request.action + ' demandé');
        if (request.action === 'sendCustomAmount' && request.amount !== undefined) {
            let amount = request.amount;
            // First the amount must contain only digits and exactly one or zero comma or dot
            let amountCheck = amount.replace(/[^0-9,.]/g, '');
            if (amountCheck.length !== amount.length) {
                console.log('Amount', amount, 'is not valid');
                console.warn('Amount', amount, 'is not valid');
                return;
            }
            if (amount.match(/[,.]/g) && amount.match(/[,.]/g).length > 1) {
                console.log('Amount', amount, 'is not valid');
                console.warn('Amount', amount, 'is not valid');
                return;
            }
            let splitedAmount = amount.split(/,|\./);
            let amountUnits = splitedAmount[0];
            let amountDecimals = splitedAmount[1] || '00';
            if (amountDecimals.length === 1) {
                amountDecimals += '0'; // Ajoute un zéro si la partie décimale a une seule position
            } else if (amountDecimals.length > 2) {
                amountDecimals = amountDecimals.slice(0, 2); // Coupe la partie décimale à 2 positions
            }
            amount = parseInt(amountUnits + amountDecimals, 10);
            console.warn('[debug] pause');
            actions[request.action](amount); // Appel avec le montant personnalisé
        } else {
            actions[request.action]();
        }
    }
});
