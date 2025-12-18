// Fichier contenant les paramètres d’alerte, initialement pour les ETP.
// Le nombre 4341 correspond à l’ID du cabinet médical dans la base de données.
// Chaque Pôle peut demander à avoir ses propres alertes en envoyant un ticket avec la liste des alertes souhaitées et l’ID du cabinet.
const alertesAtcd = {
  4341: [
    ["mon diabete de la tete au pied", ["diabète type 1", "diabète type 2", "diabète gestationnel", "prédiabète"]],
    ["le diabete parlons en", ["diabète type 1", "diabète type 2", "hémoglobine glyquée élevée", "glycémie à jeun élevée"]],
    ["mon alimentation et moi", ["obésité", "anorexie", "TCA", "diabète", "surpoids", "dénutrition", "boulimie"]],
    ["mon traitement CV (HTA, IDM, cardiopathie, AOMI)", ["HTA", "IDM", "cardiopathie", "AOMI", "insuffisance cardiaque", "arythmie", "AVC"]],
    ["diabetiques", ["diabète compliqué", "neuropathie diabétique", "rétinopathie diabétique", "néphropathie diabétique"]],
    ["pour l'alimentation : obesite, anorexie, TCA, diabete", ["obésité morbide", "anorexie mentale", "boulimie", "diabète mal équilibré", "troubles du comportement alimentaire"]]
  ]
};