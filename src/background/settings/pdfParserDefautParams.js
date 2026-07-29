
// Définition de catégories par défaut pour le PDF Parser
const PdfParserAutoCategoryDefaut = JSON.stringify([
    // Niveau 1 de spécificité : la présence du mot-clé signe directement le type de document sans ambiguïté
    ["LABORATOIRE/BIO", ["BIOCEANE", "LABORATOIRE"]],
    ["Arrêt de travail", ["avis d'arrêt de travail"]],
    ["CRO/CRH", ["Compte Rendu Opératoire", "Compte Rendu Hospitalier", "Compte Rendu d'Hospitalisation", "COMPTE RENDU OPERATOIRE"]],
    ["Consultation", ["COMPTE-RENDU DE CONSULTATION"]],
    ["PARAMEDICAL", ["BILAN ORTHOPTIQUE"]],
    // Niveau 2 de spécificité : des mots plus ambivalents, mais qui,
    // parcouru dans l'ordre devraient permettre de déterminer le type de document
    ["Courrier", ["Chère Consœur", "chère consoeur", "Cher confrère", "chère amie", "cher ami", "Cherconfrére", "Chèreconsoeur", "Chèreconsœur"]],
    ["IMAGERIE", ["imagerie", "radiographie", "scanner", "IRM", "radiologie", "mammographie"]],
    ["Arrêt de travail", ["arrêt de travail", "congé maladie"]],
    ["Biologie", ["biologie", "analyse sanguine"]],
    ["Bon de transport", ["bon de transport", "transport médical"]],
    ["Certificat", ["certificat", "attestation"]],
    ["ECG", ["ecg", "électrocardiogramme"]],
    ["EFR", ["exploration fonctionnelle respiratoire"]],
    ["LABORATOIRE/BIO", ["laboratoire"]],
    ["MT", ["Déclaration de Médecin Traitant", "déclaration médecin traitant"]],
    ["PARAMEDICAL", ["paramédical", "soins"]],
    ["SPECIALISTE", ["spécialiste", "consultation spécialisée"]],
    ["Consultation", ["consultation", "visite médicale"]],
    // Niveau 3 de spécificité : des mots plus génériques, qui peuvent être présents dans plusieurs types de documents
    ["Ordonnance", ["ordonnance", "prescription", "60-3937"]], // 60-3937 est le cerfa des bizones
    ["Compte Rendu", ["compte rendu", "compte-rendu", "automesure"]],
    ["PHOTOS", [""]],
    ["Administratif", ["*"]],
]);

const PdfParserAutoSpecialite = JSON.stringify([
    // Spécialités médicales avec mots-clés associés
    ["Urgences", ["Compte rendu des Urgences"]],
    ["Médecine Interne", ["Médecine Interne"]],
    ["Orthopédie", ["Orthopédie", "Orthopédique", "Traumatologie"]],
    ["Gynécologie", ["Gynécologie", "Obstétrique", "Gynéco"]],
    ["Cardiologie", ["Cardiologie", "Cardio", "Cardiovasculaire"]],
    ["Neurologie", ["Neurologie", "Neuro", "Neurochirurgie"]],
    ["Pédiatrie", ["Pédiatrie", "Pédiatre"]],
    ["Radiologie", ["Radiologie", "Radio", "mammographie"]],
    ["Ophtalmologie", ["Ophtalmologie", "Ophtalmo", "Oculaire"]],
    ["Pneumologie", ["Pneumologie", "Pneumo", "Respiratoire", "Pulmonaire"]],
    ["Dermatologie", ["Dermatologie", "Dermato", "Cutané"]],
    ["Vasculaire", ["Vasculaire"]],
    ["Thoracique", ["Thoracique"]],
    ["Urologie", ["Urologie", "Uro"]],
    ["Rhumatologie", ["Rhumatologie", "Rhumato"]],
    ["Endocrinologie", ["Endocrinologie", "Endocrino", "Diabète", "Diabétologie"]],
    ["Gastro-entérologie", ["Gastro-entérologie", "Gastro", "Digestif"]],
    ["Hématologie", ["Hématologie", "Hémato"]],
    ["Néphrologie", ["Néphrologie", "Néphro", "Rénale"]],
    ["Oncologie", ["Oncologie", "Onco", "Cancer"]],
    ["Psychiatrie", ["Psychiatrie", "Psy", "Psychologie"]],
    ["Stomatologie", ["Stomatologie", "Stomato", "Maxillo-facial"]],
    ["Addictologie", ["Addictologie", "Addiction"]],
    ["ORL", ["ORL", "Otologie", "Rhinologie", "Laryngologie", "Otorhinolaryngologie"]],
    ["Allergologie", ["Allergologie", "Allergie", "Allergique"]],
    ["Gériatrie", ["Gériatrie", "Gérontologie", "Personnes âgées"]],
    ["Anesthésiologie", ["Anesthésiologie", "Anesthésie", "Réanimation"]],
    ["Urgences", ["Urgences", "Service d'Urgence"]],
    ["Chirurgie", ["Chirurgie", "Chirurgical", "Opération"]],
]);

const PdfParserAutoImagerie = JSON.stringify([
    // Types d'imagerie avec mots-clés associés
    ["scanner", ["scanner", "TDM", "tomodensitométrie"]],
    ["échographie", ["échographie", "écho", "doppler", "échodoppler"]],
    ["radiographie", ["radiographie", "radio", "rx"]],
    ["mammographie", ["mammographie", "mammo"]],
    ["scintigraphie", ["scintigraphie", "scinti"]],
    ["ostéodensitométrie", ["ostéodensitométrie", "densitométrie osseuse"]],
    ["IRM", ["IRM", "imagerie par résonance magnétique"]]
]);

const PdfParserAutoRegion = JSON.stringify([
    // Régions anatomiques avec mots-clés associés
    ["thoracique", ["thorax", "thoracique", "pulmonaire", "poumon"]],
    ["abdominal", ["abdomen", "abdominal", "abdominale"]],
    ["crânien", ["crâne", "crânien", "cérébral", "cerveau", "tête", "tete", "crane", "cranien", "cerebral"]],
    ["rachis", ["rachis", "colonne vertébrale", "lombaire", "cervical", "dorsal", "vertèbre", "colonne vertebrale", "vertebre"]],
    ["genou", ["genou", "fémoro-tibial", "femoro-tibial"]],
    ["hanche", ["hanche", "coxo-fémoral", "coxo-femoral"]],
    ["épaule", ["épaule", "epaule", "scapulo-huméral", "scapulo-humeral"]],
    ["poignet", ["poignet", "radio-carpien"]],
    ["coude", ["coude"]],
    ["cheville", ["cheville", "tibio-tarsien"]],
    ["pied", ["pied", "tarsien"]],
    ["main", ["main", "métacarpien", "metacarpien"]],
    ["bassin", ["bassin", "pelvien"]],
    ["sinus", ["sinus", "facial"]],
    ["artère", ["artère", "artériel", "aorte", "carotide", "fémorale", "artere", "arteriel", "femorale"]],
    ["cardiaque", ["cardiaque", "cœur", "coronaire", "coeur"]],
    ["mammographie", ["mammographie"]]
]);

// champ permettant la personnalisation des titres
// en principe il va générer un titre différent selon la catégorisation prévue.
// en l'absence de correspondance, il renvoie seulement le titre de la catégorie
const titleCreator = JSON.stringify([
    ["LABORATOIRE/BIO", ["Bilan biologique"]],
    ["Arrêt de travail", ["Avis d'arrêt de travail"]],
    ["Consultation", ["Cons. [specialite] - [doctorName] - [lieu]"]],
    ["Courrier", ["Cons. [specialite] - [doctorName] - [lieu]"]],
    ["IMAGERIE", ["[imagerie] - [region]"]],
    ["CRO/CRH", ["[typeCR] - [specialite] - [doctorName] - [lieu]"]],
    ["Compte-rendu", ["[typeCR] - [specialite] - [doctorName] - [lieu]"]],
    ["*", ["[category] - [specialite] - [doctorName] - [lieu]"]]
]);

// Définition des règles de classification de destination pour le PDF Parser
const PdfParserAutoDestinationClass = JSON.stringify([
    // Niveau 1 : Mots-clés absolus pour les consultations
    ["1", ["consultation du", "examen clinique", "anamnèse", "consultation"]],

    // Niveau 1 : Mots-clés absolus pour les résultats d'examens
    ["2", ["Résultats d'examen", "Résultats d'analyse", "valeurs? de référence"]],

    // Niveau 1 : Mots-clés absolus pour les courriers
    ["3", ["Je vous remercie de m'avoir adressé", "Je reçois", "courrier", "lettre"]],

    // Niveau 2 : Mots-clés probables pour les consultations (moins spécifiques)
    ["1", ["consultation", "prise en charge", "visite médicale", "Motif"]],

    // Niveau 2 : Mots-clés probables pour les résultats d'examens
    ["2", ["examen", "résultat", "biologie", "bilan", "analyse", "laboratoire", "scanner", "imagerie", "radiographie", "échographie", "irm", "tdm", "tep", "doppler", "mammographie", "scintigraphie", "echodoppler", "renseignements cliniques", "technique", "conclusion"]],

    // Niveau 2 : Mots-clés probables pour les courriers
    ["3", ["correspondance", "avis", "compte rendu", "compte-rendu", "CR. consult", "adressé par", "adressée pour", "adressée par", "adressée pour", "Cher Confrère", "chère consoeur", "chère consœur", "nous a consulté", "nous a été adressé", "information destinée", "spécialiste"]],
    ["1", ["*"]]  // Par défaut, tout est une consultation
]);

const PdfParserAutoLieu = JSON.stringify([
    // Établissements de santé avec mots-clés associés
    ["Cabinet", ["Cabinet médical", "Cabinet de radiologie"]],
    ["CHU", ["Centre Hospitalier Universitaire"]],
    ["CH", ["Centre Hospitalier de", "Hôpital de", "Hôpital"]],
    ["Clinique", ["Clinique", "Polyclinique", "-Chef de clinique"]],
    ["Centre", ["Centre médical", "Centre de radiologie", "Centre d'imagerie"]],
    ["Cabinet", ["Cabinet"]],
    ["CHU", ["CHU"]]
]);

const PdfParserAutoTypeCR = JSON.stringify([
    // Types de compte-rendu avec mots-clés associés
    ["hospitalisation", ["CRH", "compte rendu d'hospitalisation"]],
    ["consultation", ["Consultation", "consultation"]],
    ["hospitalisation", ["Hospitalisation"]],
    ["examen", ["Compte rendu d'examen", "CR d'examen", "compte-rendu d'examen"]],
    ["opération", ["Compte rendu opératoire", "CRO", "opération"]]
]);

const customFieldsDefault1 = JSON.stringify([
]);

const customFieldsDefault2 = JSON.stringify([
]);

const customFieldsDefault3 = JSON.stringify([
]);