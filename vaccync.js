/*
* cette page permet de gérer les vaccins :
* - récupération des vaccins depuis le DMP ou depuis un dump (scannette, vaccins faits par la pharmacie, ...)
* - mise à jour des vaccins présents dans Weda depuis cette source
* - envoie des vaccins faits dans Weda vers le DMP (mais pas encore au bon format)
*/



// A - Récupération des vaccins depuis le DMP

// 1 - accéder au DMP via https://secure.weda.fr/FolderMedical/DMP/view?PatDk=00000000|000|000|0 (donc en modifiant l'url de la page d'accueil)
// TODO : vérifier s'il n'y a pas déjà du code dans WH pour ça

// 2 - cliquer sur le div dont l'innerText est "  - Historique de vaccinations "
// après un temps de chargement s'affiche un tableau table.narr_table qui contient les vaccins

// 3 - parser le tableau pour récupérer les vaccins

// B - Récupération des vaccins depuis un dump (scannette, pharmacie, ...)

// 1 - récupérer le dump (csv, txt, ...)
// 2 - parser le dump pour récupérer les vaccins

// C - Comparaison et mise à jour des vaccins dans Weda

// 1 - retourner à la page des vaccins dans Weda (page d'accueil puis click sur #ContentPlaceHolder1_ButtonVaccins)

// 2 - parser les vaccins dans un format permettant la comparaison avec ceux du DMP ou du data dump

// 3 - comparer les deux listes de vaccins et afficher les différences

// 4 - ajouter les vaccins manquant dans Weda, nécessite de passer par https://secure.weda.fr/FolderMedical/VaccinForm.aspx (pas besoin de numéro de patient)