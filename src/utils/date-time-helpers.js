/**
 * @file date-time-helpers.js
 * @description Utilitaires pour la manipulation et conversion de dates et temps.
 * Fournit des fonctions pour convertir des dates tronquées, gérer les délais,
 * et enregistrer des timestamps pour diverses opérations (impression, etc.).
 * 
 * @exports sleep - Fonction de délai asynchrone
 * @exports convertDate - Convertit une date tronquée en format complet
 * @exports setLastPrintDate - Enregistre la date de dernière impression
 */

// Fonction utilitaire pour attendre un certain nombre de millisecondes
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


// Convert a truncated date to a full date
function convertDate(truncatedDate) {
    // on retire les espaces inutiles
    truncatedDate = truncatedDate.trim();
    // Remplacer les séparateurs par des slashes pour uniformiser le traitement
    truncatedDate = truncatedDate.replace(/[\.\s]/g, '/');
    let parts = truncatedDate.split('/');
    let day = parts[0];
    let month = parts[1] || new Date().getMonth() + 1;
    month = month.toString();
    let year = new Date().getFullYear();
    year = year.toString();
    let length = day.length;
    let validDayLengths = [1, 2, 4, 6, 8];

    if (length === 4) {
        // If truncatedDate is 4 digits, assume the first 2 digits are the day and the last 2 digits are the month
        day = truncatedDate.substring(0, 2);
        month = truncatedDate.substring(2, 4);
    } else if (length === 6) {
        // If truncatedDate is 6 digits, assume the first 2 digits are the day, the next 2 digits are the month, and the last 2 digits are the year
        day = truncatedDate.substring(0, 2);
        month = truncatedDate.substring(2, 4);
        const yearSuffix = truncatedDate.substring(4, 6);
        // Gérer les années 19XX et 20XX : si > 50, on suppose 19XX, sinon 20XX
        year = (parseInt(yearSuffix) > 50 ? '19' : '20') + yearSuffix;
    } else if (length === 8) {
        // If truncatedDate is 8 digits, assume the first 2 digits are the day, the next 2 digits are the month, and the last 4 digits are the year
        day = truncatedDate.substring(0, 2);
        month = truncatedDate.substring(2, 4);
        year = truncatedDate.substring(4, 8);
    } else if (!validDayLengths.includes(length)) {
        // If truncatedDate is not a valid length, return it without modification
        console.log('Invalid date format:', truncatedDate);
        return truncatedDate;
    }

    // Validation des valeurs numériques
    const dayNum = parseInt(day);
    const monthNum = parseInt(month);

    // Vérifier que le jour est entre 1 et 31
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
        console.log('Invalid day value:', day);
        return truncatedDate;
    }

    // Vérifier que le mois est entre 1 et 12
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        console.log('Invalid month value:', month);
        return truncatedDate;
    }

    // Add leading zeros using padStart (plus élégant que les conditions)
    day = day.toString().padStart(2, '0');
    month = month.toString().padStart(2, '0');

    return day + '/' + month + '/' + year;
}

/** Lors de l'impression instantanée, la page d'impression navigue parfois
* vers la page d'accueil avant que WH n'ait le temps de fermer l'onglet d'impression.
* Pour éviter ce problème, on enregistre la date de la dernière impression.
* Si cette date est récente, on ferme l'onglet appelant.
* cf. https://github.com/Refhi/Weda-Helper/blob/7c0882e419f689cabb6ec9504a2d85c327082b8b/print.js#L826
* 
**/
function setLastPrintDate() {
    const date = new Date();
    sessionStorage.setItem('lastPrintDate', date.toISOString());
    // console.log('Dernière date d\'impression enregistrée :', date);
}
