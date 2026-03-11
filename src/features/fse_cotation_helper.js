/**
 * @file fse_cotation_helper.js
 * @description Aide à la cotation dans la page FSE.
 * Analyse le contexte clinique (âge du patient, situation MT, cotations en cours,
 * historique de facturation) et propose des suggestions de cotations via notifications.
 *
 * @requires tweaks.js (addTweak)
 * @requires storage.js (getOptionPromise)
 * @requires notifications.js (sendWedaNotif)
 * @requires fse.js (patientAgeInFSE, estMTdeclareOuReferent, loggedInUser)
 * @requires fse_history.js (getHiddenBillingData)
 */

addTweak('/vitalzen/fse.aspx', 'cotationHelper2', function () {
    let isFirstDetection = true;
    waitForElement({
        selector: '[vz-acte]',
        justOnce: false,
        callback: function (element) {
            if (isFirstDetection) {
                watchForMtSituationChange();
                isFirstDetection = false;
                console.log('Première détection de vz-acte');
            } else {
                checkPossibleHelp();
            }
        }
    });
});

function watchForMtSituationChange() {
    let mtSituationList = document.querySelector('vz-orientation select');
    mtSituationList.addEventListener('change', function () {
        checkPossibleHelp();
    });
}

function greenLightRefractoryPeriodCotationHelper(customKey = '') {
    const BASE_KEY = 'cotationHelperLastMtCheckChange';
    const REFRACTORY_KEY = customKey ? `${BASE_KEY}_${customKey}` : BASE_KEY;
    const REFRACTORY_PERIOD = 5000; // ms
    const now = Date.now();
    const lastCheck = sessionStorage.getItem(REFRACTORY_KEY) || 0;
    const timeDiff = now - lastCheck;
    console.log('Test refractaire : ', now, lastCheck, timeDiff);

    if (timeDiff > REFRACTORY_PERIOD) {
        sessionStorage.setItem(REFRACTORY_KEY, now);
        return true;
    }
    return false;
}


/**
 * Vérifie si une aide à la cotation peut être proposée.
 * Analyse l'âge du patient, la situation MT, et l'historique de facturation
 * pour suggérer automatiquement des cotations appropriées.
 * 
 * @async
 * @returns {Promise<void>}
 */
async function checkPossibleHelp() {
    const cotationContext = {
        cotation: getActualCotation(), // retourne un array de cotation
        mtSituation: getActualMTSituation(),
        patientAge: patientAgeInFSE(),
        hour: new Date().getHours(),
        dayOfWeek: new Date().getDay(), // Sunday = 0, Monday = 1, etc.
        billingData: getHiddenBillingData()
    };

    let wishedTestList = await getOptionPromise('cotationHelper2');
    // La liste est au format "MCG, SHE, MHP, RDV, MOP, PAV"
    wishedTestList = wishedTestList.split(',').map(item => item.trim());
    console.log('wishedTestList', wishedTestList);

    cotationHelper.forEach(helper => {
        // Si la cotationHelper n'est pas un tableau, on le transforme en tableau
        if (!Array.isArray(helper.cotation)) { helper.cotation = [helper.cotation]; }
        let testIsWishedForThisCotation = helper.cotation.some(cotation => wishedTestList.includes(cotation));
        let testPassed = helper.test(cotationContext);
        console.log('Test de cotationHelper', helper.titre, 'est souhaité :', testIsWishedForThisCotation, 'est passé :', testPassed);
        if (testIsWishedForThisCotation && testPassed) {
            if (!greenLightRefractoryPeriodCotationHelper(helper.titre)) {
                return;
            }
            console.log('cotationHelper trouvé', helper);
            sendWedaNotif(
                {
                    message: helper.conseil + ' ' + (helper.link ? 'En savoir plus : ' + helper.link : ''),
                    type: 'undefined',
                    icon: 'info',
                    duration: 10000
                },
            )

        }
    });
}

const cotationHelper = [
    {
        titre: 'Cotation MCG',
        cotation: 'MCG',
        test: function (context) {
            return context.mtSituation.includes('08') && context.cotation.includes('G');
        },
        conseil: 'Cette situation peut peut-être bénéficier de la cotation MCG',
        link: 'https://omniprat.org/fiches-pratiques/consultations-visites/majoration-de-coordination-generaliste/'
    }, {
        titre: 'Cotation SHE',
        cotation: 'SHE',
        test: function (context) {
            // La cotation doit contenir SNP ou MRT
            let isProperCotation = context.cotation.some(cot => cot.includes('SNP') || cot.includes('MRT'));
            // L'heure doit être 19, 20 ou 21h
            let isProperHour = [19, 20, 21].includes(context.hour);
            return isProperCotation && isProperHour;
        },
        conseil: 'Cette situation peut peut-être bénéficier de la cotation SHE',
        link: 'https://www.hauts-de-france.ars.sante.fr/le-service-dacces-aux-soins-sas-1'
    }, {
        titre: 'Cotation MHP',
        cotation: 'MHP',
        test: function (context) {
            // Doit être aux horaires de PDSA : donc samedi 12+ heure ou soir 20+ heure
            let isProperHour = (context.dayOfWeek === 6 && context.hour >= 12) || context.hour >= 20;
            // La cotation doit contenir G et ne pas contenir SNP
            let isProperCotation = context.cotation.includes('G') && !context.cotation.includes('SNP');
            return isProperHour && isProperCotation;
        },
        conseil: 'Cette situation peut peut-être bénéficier de la cotation MHP',
        link: 'https://www.ameli.fr/medecin/exercice-liberal/facturation-remuneration/consultations-actes/tarifs/tarifs-conventionnels-medecins-generalistes-specialistes'
    }, {
        titre: 'cotation RDV',
        cotation: 'RDV',
        test: function (context) {
            // les ages doivent être : 18-25 ans ; 45-50 ans ; 60-65 ans ou 70-75 ans, cf. https://www.ameli.fr/medecin/sante-prevention/bilan-prevention-ages-cles
            let isProperAge = [[18, 25], [45, 50], [60, 65], [70, 75]].some(ageRange => context.patientAge >= ageRange[0] && context.patientAge <= ageRange[1]);
            // Il ne doit pas y avoir de cotation RDV dans les 7 dernières années. Comme l'affichage est limité à 7 ans, c'est implicitement vérifié
            let isProperBillingData = !context.billingData.some(billing => billing.Actes.includes('RDV'));
            return isProperAge && isProperBillingData;
        },
        conseil: "Le patient est peut-être éligible à la réalisation du Plan Personnalisé de Prévention, donc à la cotation RDV. Cumulable à 70% avec JKHD001 ou DEQP003. FDS à part si couplé avec un G.",
        link: 'https://omniprat.org/fiches-pratiques/bilan-de-prevention/'
    }, {
        titre: 'cotation MOP',
        cotation: ['MOP'],
        test: function (context) {
            let ageOK = patientAgeInFSE() >= 80;
            let isMT = estMTdeclareOuReferent(loggedInUser());
            let noMopSelected = !context.cotation.includes('MOP');
            return ageOK && !isMT && noMopSelected;
        },
        conseil: "Le patient a plus de 80 ans et vous n'êtes pas le médecin traitant. Pensez à ajouter la cotation MOP",
        link: "https://omniprat.org/fiches-pratiques/consultations-visites/majoration-personne-agee-mpa/"
    }, {
        titre: 'cotation PAV oubliée',
        cotation: ['PAV'],
        test: function (context) {
            if (totalAmount() < 120) {
                return false;
            }
            // Ensuite on regarde si PAV est déjà présent dans les cotations
            return !context.cotation.includes('PAV');
        },
        conseil: "Le montant total des actes est supérieur ou égal à 120€. Pensez à ajouter la cotation PAV, sauf cas d'exclusion.",
        link: "https://www.ameli.fr/assure/remboursements/reste-charge/forfait-24-euros"
    }, {
        titre: 'cotation PAV mal placée',
        cotation: 'PAV',
        test: function (context) {
            if (totalAmount() < 120) {
                return false;
            }
            // Ensuite on vérifie si le PAV est bien en dernière position
            let pavLast = context.cotation[context.cotation.length - 1] === 'PAV';
            let pavIsPresent = context.cotation.includes('PAV');
            return pavIsPresent && !pavLast
        },
        conseil: "La cotation PAV doit être en dernière position.",
        link: "https://www.ameli.fr/assure/remboursements/reste-charge/forfait"
    }, {
        titre: 'alerte cotation APC/APY/APU',
        cotation: ['APC', 'APY', 'APU'],
        test: function (context) {
            // On vérifie d'abord si une cotation APC/APY/APU est présente dans la cotation actuelle
            let hasAPCotation = context.cotation.some(cot =>
                cot.includes('APC') || cot.includes('APY') || cot.includes('APU')
            );

            if (!hasAPCotation) {
                return false; // Pas de cotation APC/APY/APU, pas d'alerte nécessaire
            }

            // On va vérifier si l'historique de facturation contient n'importe quelle cotation dans les 4 mois précédents
            let now = new Date();
            let fourMonthsAgo = new Date();
            fourMonthsAgo.setMonth(now.getMonth() - 4);

            // Cherche si une consultation quelconque a été réalisée dans les 4 derniers mois
            let recentConsultation = context.billingData.some(billing => {
                let billingDate = new Date(billing.Date.split('/').reverse().join('-'));
                return billingDate >= fourMonthsAgo; // Vérifie si une facturation a été faite, quelle qu'elle soit
            });

            return recentConsultation; // Retourne vrai si une consultation récente a été trouvée
        },
        conseil: "Attention : vous avez déjà vu ce patient au cours des 4 derniers mois. La cotation APC/APY/APU ne peut être utilisée que pour un patient non vu depuis plus de 4 mois.",
        link: "https://www.ameli.fr/medecin/exercice-liberal/facturation-remuneration/consultations-actes/tarifs/tarifs-conventionnels-medecins-generalistes-specialistes"
    }, {
        titre: 'rappel cotation MCS',
        cotation: ['MCS'],
        test: function (context) {
            // Vérifie si une consultation CS ou CNP est présente dans la cotation actuelle
            let hasCSorCNP = context.cotation.some(cot => 
                cot.includes('CS') || cot.includes('CNP')
            );
            
            // Vérifie si le MCS est absent
            let hasMCS = context.cotation.some(cot => cot.includes('MCS'));
            
            // Si la cotation contient CS ou CNP mais pas MCS, on retourne true
            return hasCSorCNP && !hasMCS;
        },
        conseil: "N'oubliez pas d'ajouter la majoration MCS si vous êtes le spécialiste correspondant. Elle est applicable avec les cotations CS et CNP.",
        link: "https://www.ameli.fr/medecin/exercice-liberal/facturation-remuneration/consultations-actes/tarifs/tarifs-conventionnels-medecins-generalistes-specialistes"
    }, {
        titre: 'rappel cotation gl',
        cotation: ['GL1', 'GL2', 'GL3'],
        test: function (context) { // dès que l’âge est >= 80 ans et que c’est le médecin traitant
            let ageOK = patientAgeInFSE() >= 80;
            let isMT = estMTdeclareOuReferent(loggedInUser());
            let hasGL = context.cotation.some(cot => cot.includes('GL1') || cot.includes('GL2') || cot.includes('GL3'));
            return ageOK && isMT && !hasGL;
        },
        conseil: "Le patient a plus de 80 ans et vous êtes le médecin traitant. Vous pouvez côter GL1 (sortie d’hospit < 45 jours), GL2 (déprescription suite cs. Pharma), ou GL3 (dossier APA). 1/an chaque, maximum.",
        link: "https://www.fmfpro.org/les-nouveautes-conventionnelles-tarifaires-du-1er-janvier-2026/"
    }
];

function totalAmount() {
    let possibleTotalAmountElements = document.querySelectorAll('.ng-star-inserted');
    // On cherche un élément qui contient un texte sur le format " Total : 169.15"
    let totalAmountElement = Array.from(possibleTotalAmountElements).find(element => element.textContent.includes(' Total : '));
    if (!totalAmountElement) {
        return false;
    }
    let totalAmount = parseFloat(totalAmountElement.textContent.match(/\d+\.\d+/)[0]);
    console.log('Total amount', totalAmount);
    return totalAmount;
}

function getActualCotation() {
    let actes = document.querySelectorAll('[vz-acte]');
    let cotationArray = [];
    actes.forEach(acte => {
        let acteText = acte.querySelector('.acteCell input.mat-input-element');
        if (acteText && acteText.value.trim() !== '') {
            cotationArray.push(acteText.value.trim());
        }
    });
    return cotationArray;
}

function getActualMTSituation() {
    let mtSituationList = document.querySelector('vz-orientation select');
    return mtSituationList.value;
}

const mtSituationOptions = {
    "03": "Je suis le médecin traitant",
    "11": "Orienté par le MT",
    "12": "Orienté par un Médecin autre que le MT",
    "04": "Nouveau Médecin Traitant",
    "05": "Médecin Traitant de substitution",
    "06": "Généraliste récemment installé",
    "07": "Médecin installé en zone sous Médicalisée",
    "08": "Hors résidence",
    "09": "Accès direct spécifique",
    "10": "Hors accès direct spécifique",
    "13": "Non respect du parcours de soin",
    "01": "Exclusion du parcours de soin",
    "02": "Urgence"
};
