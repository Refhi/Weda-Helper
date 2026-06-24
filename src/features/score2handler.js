/**
 * @file score2handler.js
 * @description Ce fichier contient le nécessaire pour calculer le SCORE2
 *
 * l'ensemble du code est basé sur le code R original de l'implémentation du SCORE2, disponible sur le site officiel de RISK-SCORES-CVD
 * il a été traduit en JavaScript pour être utilisé dans un environnement web.
 *
 * la validitée de l'implémentation a été vérifiée en comparant les résultats obtenus avec ceux du code R original sur un ensemble de données de test.
 *
 * @see https://rdrr.io/cran/RiskScorescvd/src/R/11_SCORE2_func.R
 */

/**
 * Calcule le score SCORE2 / SCORE2-OP
 *
 * @param {string} riskRegion - "Low", "Moderate", "High", ou "Very high"
 * @param {number} age        - âge en années
 * @param {string} gender     - "male" ou "female"
 * @param {number} smoker     - 1 = oui, 0 = non
 * @param {number} systolicBp - pression artérielle systolique (mmHg)
 * @param {number} diabetes   - 1 = oui, 0 = non
 * @param {number} totalChol  - cholestérol total (mmol/L)
 * @param {number} totalHdl   - HDL (mmol/L)
 * @param {boolean} classify  - si true, retourne la catégorie texte ; sinon le score numérique
 * @returns {number|string}   - score (%) arrondi à 1 décimale, ou catégorie de risque
 */
function SCORE2(riskRegion, age, gender, smoker, systolicBp, diabetes, totalChol, totalHdl, classify) {

  // --- Paramètres de recalibration ---
  let scale1, scale2;

  if (age < 70) {
    const key = `${riskRegion}_${gender}`;
    const params = {
      "Low_male":       [-0.5699, 0.7476],
      "Low_female":     [-0.7380, 0.7019],
      "Moderate_male":  [-0.1565, 0.8009],
      "Moderate_female":[-0.3143, 0.7701],
      "High_male":      [ 0.3207, 0.9360],
      "High_female":    [ 0.5710, 0.9369],
      "Very high_male": [ 0.5836, 0.8294],
      "Very high_female":[ 0.9412, 0.8329],
    };
    if (!params[key]) { console.warn("Risk region specification required!"); return NaN; }
    [scale1, scale2] = params[key];
  } else {
    const key = `${riskRegion}_${gender}`;
    const params = {
      "Low_male":       [-0.34, 1.19],
      "Low_female":     [-0.52, 1.01],
      "Moderate_male":  [ 0.01, 1.25],
      "Moderate_female":[-0.10, 1.10],
      "High_male":      [ 0.08, 1.15],
      "High_female":    [ 0.38, 1.09],
      "Very high_male": [ 0.05, 0.70],
      "Very high_female":[ 0.38, 0.69],
    };
    if (!params[key]) { console.warn("Risk region specification required!"); return NaN; }
    [scale1, scale2] = params[key];
  }

  // --- Calcul du score brut ---
  let x;

  if (gender === "male" && age < 70) {
    const xx = 0.3742 * (age - 60) / 5
      + 0.6012 * smoker
      + 0.2777 * (systolicBp - 120) / 20
      + 0.6457 * diabetes
      + 0.1458 * (totalChol - 6) / 1
      + (-0.2698) * (totalHdl - 1.3) / 0.5
      + (-0.0755) * (age - 60) / 5 * smoker
      + (-0.0255) * (age - 60) / 5 * (systolicBp - 120) / 20
      + (-0.0281) * (age - 60) / 5 * (totalChol - 6) / 1
      + 0.0426 * (age - 60) / 5 * (totalHdl - 1.3) / 0.5
      + (-0.0983) * (age - 60) / 5 * diabetes;

    const xx2 = 1 - Math.pow(0.9605, Math.exp(xx));
    const xx3 = 1 - Math.exp(-Math.exp(scale1 + scale2 * Math.log(-Math.log(1 - xx2))));
    x = Math.round(xx3 * 100 * 10) / 10;
  }

  else if (gender === "female" && age < 70) {
    const xx = 0.4648 * (age - 60) / 5
      + 0.7744 * smoker
      + 0.3131 * (systolicBp - 120) / 20
      + 0.8096 * diabetes
      + 0.1002 * (totalChol - 6) / 1
      + (-0.2606) * (totalHdl - 1.3) / 0.5
      + (-0.1088) * (age - 60) / 5 * smoker
      + (-0.0277) * (age - 60) / 5 * (systolicBp - 120) / 20
      + (-0.0226) * (age - 60) / 5 * (totalChol - 6) / 1
      + 0.0613 * (age - 60) / 5 * (totalHdl - 1.3) / 0.5
      + (-0.1272) * (age - 60) / 5 * diabetes;

    const xx2 = 1 - Math.pow(0.9776, Math.exp(xx));
    const xx3 = 1 - Math.exp(-Math.exp(scale1 + scale2 * Math.log(-Math.log(1 - xx2))));
    x = Math.round(xx3 * 100 * 10) / 10;
  }

  else if (gender === "male" && age >= 70) {
    const xx = 0.0634 * (age - 73)
      + 0.4245 * diabetes
      + 0.3524 * smoker
      + 0.0094 * (systolicBp - 150)
      + 0.0850 * (totalChol - 6)
      + (-0.3564) * (totalHdl - 1.4)
      + (-0.0174) * (age - 73) * diabetes
      + (-0.0247) * (age - 73) * smoker
      + (-0.0005) * (age - 73) * (systolicBp - 150)
      + 0.0073 * (age - 73) * (totalChol - 6)
      + 0.0091 * (age - 73) * (totalHdl - 1.4);

    const xx2 = 1 - Math.pow(0.7576, Math.exp(xx - 0.0929));
    const xx3 = 1 - Math.exp(-Math.exp(scale1 + scale2 * Math.log(-Math.log(1 - xx2))));
    x = Math.round(xx3 * 100 * 10) / 10;
  }

  else if (gender === "female" && age >= 70) {
    const xx = 0.0789 * (age - 73)
      + 0.6010 * diabetes
      + 0.4921 * smoker
      + 0.0102 * (systolicBp - 150)
      + 0.0605 * (totalChol - 6)
      + (-0.3040) * (totalHdl - 1.4)
      + (-0.0107) * (age - 73) * diabetes
      + (-0.0255) * (age - 73) * smoker
      + (-0.0004) * (age - 73) * (systolicBp - 150)
      + (-0.0009) * (age - 73) * (totalChol - 6)
      + 0.0154 * (age - 73) * (totalHdl - 1.4);

    const xx2 = 1 - Math.pow(0.8082, Math.exp(xx - 0.229));
    const xx3 = 1 - Math.exp(-Math.exp(scale1 + scale2 * Math.log(-Math.log(1 - xx2))));
    x = Math.round(xx3 * 100 * 10) / 10;
  }

  // --- Classification ---
  let riskClass;
  if (isNaN(x) || x === undefined) {
    riskClass = null;
  } else if (age < 50) {
    if (x < 2.5)            riskClass = "Low risk";
    else if (x < 7.5)       riskClass = "Moderate risk";
    else                    riskClass = "High risk";
  } else if (age <= 69) {
    if (x < 5)              riskClass = "Low risk";
    else if (x < 10)        riskClass = "Moderate risk";
    else                    riskClass = "High risk";
  } else {
    if (x < 7.5)            riskClass = "Low risk";
    else if (x < 15)        riskClass = "Moderate risk";
    else                    riskClass = "High risk";
  }

  return classify ? riskClass : x;
}