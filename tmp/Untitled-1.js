// ==UserScript==
// @name         Antécédents CIM-10 WEDA avec LM Studio AVEC colorisation
// @namespace    http://tampermonkey.net/
// @version      6.2.6
// @description  Sur la page Antécédents patient WEDA, la touche Inser/Insert exporte les antécédents non codés vers LM Studio local, récupère le résultat CIM10, réimporte dans WEDA puis colorise via règles locales. Bouton dédié pour coloriser seulement. :)
// @match        https://secure.weda.fr/*
// @all-frames   true
// @run-at       document-idle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_openInTab
// @grant        GM_addValueChangeListener
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @grant        window.close
// @connect      localhost
// @connect      127.0.0.1
// ==/UserScript==

(function () {
    'use strict';

    /************************************************************
     * CONFIGURATION
     ************************************************************/

    const VERSION_AUTO_ATCD_CIM10_LMSTUDIO = '6.2.6-LMstudio-avec-colorisation';

    const HOST_WEDA = 'secure.weda.fr';
    const HOST_HEIDI = 'scribe.heidihealth.com';
    const HEIDI_URL = 'https://scribe.heidihealth.com/';
    const LMSTUDIO_API_BASE_URL = 'http://localhost:1234/v1';
    const LMSTUDIO_CHAT_COMPLETIONS_URL = `${LMSTUDIO_API_BASE_URL}/chat/completions`;
    const LMSTUDIO_MODELS_URL = `${LMSTUDIO_API_BASE_URL}/models`;
    const LMSTUDIO_MODEL = '';
    const LMSTUDIO_REQUEST_TIMEOUT_MS = 600000;
    const LMSTUDIO_TEMPERATURE = 0;
    const LMSTUDIO_MAX_TOKENS = 12000;
    const LMSTUDIO_MAX_PROMPT_LENGTH = 90000;
    const LMSTUDIO_RETRY_MAX_TOKENS = 6000;
    const LMSTUDIO_RETRY_MAX_PROMPT_LENGTH = 45000;

    const KEY_JOB = 'auto_atcd_cim10_lmstudio_job_v1';
    const KEY_LAST_REPORT = 'auto_atcd_cim10_lmstudio_last_report_v1';
    const KEY_WORKER_LOCK = 'auto_atcd_cim10_lmstudio_worker_lock_v1';
    const KEY_WORKER_OPEN_LOCK = 'auto_atcd_cim10_lmstudio_worker_open_lock_v1';
    const KEY_HEIDI_OPEN_LOCK = 'auto_atcd_cim10_lmstudio_heidi_open_lock_v1';
    const KEY_IMPORT_WAKE = 'auto_atcd_cim10_lmstudio_import_wake_v1';
    const KEY_IMPORT_LOGS = 'auto_atcd_cim10_lmstudio_import_logs_v1';
    const KEY_IMPORT_LOG_ENABLED = 'auto_atcd_cim10_lmstudio_import_log_enabled_v1';
    const KEY_COLOR_ONLY_LAST_REPORT = 'auto_atcd_cim10_lmstudio_color_only_last_report_v1';
    const KEY_WEDA_LAUNCHER_PANEL_POSITION = 'auto_atcd_cim10_lmstudio_launcher_panel_position_v1';
    const LOCALSTORAGE_BATCH_REPORT_KEY = 'auto_atcd_cim10_lmstudio_batch_last_report_v1';
    const LOCALSTORAGE_CIM10_BATCH_CLICK_CONTEXT = 'auto_atcd_cim10_lmstudio_batch_click_context_v1';
    const LOCALSTORAGE_BATCH_SOURCE_CLOSE_KEY = 'auto_atcd_cim10_lmstudio_batch_source_close_v1';

    const SESSION_TAB_ID = 'auto_atcd_cim10_lmstudio_tab_id_v1';
    const SESSION_WORKER_JOB_ID = 'auto_atcd_cim10_lmstudio_worker_job_id_v1';
    const SESSION_HEIDI_JOB_ID = 'auto_atcd_cim10_lmstudio_heidi_job_id_v1';
    const SESSION_HEIDI_JOB_HASH_SEEN_AT = 'auto_atcd_cim10_lmstudio_heidi_job_hash_seen_at_v1';

    const WORKER_HASH_PREFIX = 'AUTO_ATCD_CIM10_LMSTUDIO_WORKER=';
    const HEIDI_HASH_PREFIX = 'AUTO_ATCD_CIM10_LMSTUDIO_HEIDI=';
    const WEDA_IMPORT_IFRAME_ID = 'auto-atcd-cim10-lmstudio-weda-import-frame';
    const WEDA_IMPORT_IFRAME_FLAG = 'AUTO_ATCD_CIM10_LMSTUDIO_IFRAME=1';
    const WEDA_IMPORT_IFRAME_ENABLED = false;

    const LOG_PREFIX = '[AUTO-ATCD-CIM10-LMSTUDIO]';
    const MAX_QUALITY_REIMPORT_PASSES = 6;
    const MAX_QUALITY_STALLED_PASSES = 2;
    const QUALITY_FULL_RETRY_DELAY_MS = 5000;
    const MAX_QUALITY_FULL_RETRIES = 2;
    const IMPORT_STALL_WARNING_MS = 60000;
    const IMPORT_STALL_RECOVERY_MS = 120000;
    const MAX_IMPORT_STALL_RECOVERIES = 8;
    const MAX_COLOR_ONLY_PASSES = 300;
    const COLOR_ONLY_TIMEOUT_MS = 180000;
    const MAX_IMPORT_STALL_RECOVERIES_PER_INDEX = 2;
    const WEDA_FOREGROUND_RESCUE_AFTER_MS = 30000;
    const WEDA_FOREGROUND_RESCUE_COOLDOWN_MS = 60000;
    const MAX_WEDA_FOREGROUND_RESCUES = 4;
    const HEIDI_IMPORT_WAKE_INTERVAL_MS = 10000;
    const HEIDI_IMPORT_START_CLOSE_TIMEOUT_MS = 45000;
    const HEIDI_WORKER_OPEN_LOCK_MS = 15000;
    const HEIDI_WORKER_OPENED_GRACE_MS = 30000;
    const IMPORT_DIAGNOSTIC_TRACE_ENABLED = false;
    const IMPORT_DIAGNOSTIC_BLOCK_LIMIT = 12;
    const MAX_IMPORT_LOGS = 80;
    const IMPORT_LOG_EXPORT_LIMIT = 40;
    const IMPORT_LOG_STRING_LIMIT = 260;
    const IMPORT_LOG_MESSAGE_LIMIT = 220;
    const IMPORT_LOG_STACK_LIMIT = 220;
    const IMPORT_LOG_ARRAY_LIMIT = 5;
    const IMPORT_LOG_OBJECT_KEY_LIMIT = 16;
    const IMPORT_LOG_DEDUP_MS = 120000;
    const HEIDI_RESULT_STABLE_MS = 7000;
    const HEIDI_FORCE_VISIBLE_RESULT_AFTER_MS = 20000;
    const HEIDI_UNPARSED_RESULT_WARNING_MS = 60000;
    const HEIDI_UNPARSED_RESULT_ERROR_MS = 120000;
    const HEIDI_UNPARSED_STABLE_MS = 20000;
    const HEIDI_ASK_AI_EDITOR_TIMEOUT_MS = 45000;
    const EXTRACTING_WEDA_STALE_MS = 12000;
    const HEIDI_WORKER_JOB_GRACE_MS = 15000;
    const HEIDI_WORKERS_OPEN_IN_BACKGROUND = true;
    const WEDA_WORKERS_OPEN_IN_BACKGROUND = false;
    const DUPLICATE_FUZZY_COMMENT_MIN_RATIO = 0.5;
    const DUPLICATE_FUZZY_COMMENT_MIN_COMMON_TOKENS = 2;
    const DUPLICATE_HIGH_COMMENT_MIN_RATIO = 0.9;

    const POSTBACK_ANTECEDENTS_WEDA = 'ctl00$ContentPlaceHolder1$ButtonGotoAntecedent';
    const POSTBACK_SEARCH_CIM10_WEDA = 'ctl00$ContentPlaceHolder1$TextBoxFind';

    const SELECTOR_PATIENT_PANEL = '#ContentPlaceHolder1_PanelPatient';
    const SELECTOR_WEDA_ANTECEDENT_UPDATE_PANEL = '#ContentPlaceHolder1_UpdatePanelAntecedent';
    const SELECTOR_WEDA_GOTO_ANTECEDENTS = '[onclick*="ButtonGotoAntecedent"]';
    const SELECTOR_WEDA_SOURCE_PATHOLOGIE_ANTECEDENTS = '#ContentPlaceHolder1_UpdatePanelAntecedent > div > table:nth-child(18) > tbody > tr > td:nth-child(2)';
    const WEDA_SOURCE_PATHOLOGIE_ANTECEDENTS_POSTBACK_ID = '185186';
    const SECTION_SOURCE_PATHOLOGIE_ANTECEDENTS = 'source_pathologie_antecedents';

    const SELECTOR_WEDA_CIM10_SEARCH = '#ContentPlaceHolder1_TextBoxFind';
    const SELECTOR_WEDA_CIM10_TREE = '#ContentPlaceHolder1_ArbreCim10UCForm1_TreeViewCim10';
    const SELECTOR_WEDA_COMMENT = '#ContentPlaceHolder1_TextBoxAntecedentCommentaire';
    const SELECTOR_WEDA_DATE_PONCTUELLE = '#ContentPlaceHolder1_TextBoxAntecedentDatePonctuel';
    const SELECTOR_WEDA_LATERALITE = '#ContentPlaceHolder1_DropDownListAntecedentLabelLateralite';
    const SELECTOR_WEDA_COLLATERAL = '#ContentPlaceHolder1_DropDownListAntecedentLabelCollateral';
    const SELECTOR_WEDA_HERITAGE = '#ContentPlaceHolder1_CheckBoxAntecedentIsHeritage';
    const SELECTOR_WEDA_VALID = '#ContentPlaceHolder1_ButtonValid';
    const SELECTOR_WEDA_DELETE = '#ContentPlaceHolder1_ButtonDelete';
    const SELECTOR_WEDA_DELETE_DOUBLON = '#ContentPlaceHolder1_LinkButtonDeleteDoublon';
    const SELECTOR_WEDA_ANTECEDENT_PANEL = '#ContentPlaceHolder1_PanelModifyAntecedent';
    const SELECTOR_WEDA_COLOR_BUTTON_EXACT = '#ContentPlaceHolder1_PanelModifyAntecedent > table > tbody > tr:nth-child(2) > td:nth-child(2) > table > tbody > tr:nth-child(3) > td:nth-child(2) > table > tbody > tr > td:nth-child(5) > table > tbody > tr > td:nth-child(2) > img';
    const SELECTOR_WEDA_COLOR_GRID = '#ContentPlaceHolder1_LabelColorGrid';
    const SELECTOR_WEDA_COLOR_FIELD = '#ContentPlaceHolder1_TextBoxGlossaireCouleur';
    const SELECTOR_WEDA_COLOR_PREVIEW = '#ContentPlaceHolder1_divShowSelected';
    const SELECTOR_WEDA_NO_KNOWN_ALLERGY = 'img[onclick*="PostBackPasAllergieConnu"], img[title*="Pas d"][title*="allergie"], img[src*="noallergy"]';
    const WEDA_EMPTY_ALLERGY_CATEGORY_RULES = [
        {
            label: 'Allergies',
            headerSelector: '#ContentPlaceHolder1_UpdatePanelAntecedent > div > table:nth-child(1) > tbody > tr > td:nth-child(1) > div > div',
            buttonSelector: '#ContentPlaceHolder1_UpdatePanelAntecedent > div > table:nth-child(1) > tbody > tr > td:nth-child(4) > div > img',
            postBackArgument: '124920'
        },
        {
            label: 'Allergie',
            headerSelector: '#ContentPlaceHolder1_UpdatePanelAntecedent > div > table:nth-child(9) > tbody > tr > td:nth-child(1) > div > div',
            buttonSelector: '#ContentPlaceHolder1_UpdatePanelAntecedent > div > table:nth-child(9) > tbody > tr > td:nth-child(4) > div > img',
            postBackArgument: '185900'
        },
        {
            label: 'Allergies Médicamenteuses',
            headerSelector: '#ContentPlaceHolder1_UpdatePanelAntecedent > div > table:nth-child(11) > tbody > tr > td:nth-child(1) > div > div',
            buttonSelector: '#ContentPlaceHolder1_UpdatePanelAntecedent > div > table:nth-child(11) > tbody > tr > td:nth-child(4) > div > img',
            postBackArgument: '124484'
        }
    ];

    const WEDA_ANTECEDENT_DELETE_EXACT_NAMES = [
        'divers : Caisse :'
    ];
    const MAX_WEDA_ANTECEDENT_DELETE_PASSES = 5;
    const MAX_WEDA_COMMENT_DATE_REPAIR_PASSES = 25;

    const SELECTOR_HEIDI_NEW_SESSION = 'button[data-testid="sessions-panel-action-new-session"]';
    const SELECTOR_HEIDI_RESULT = '#ask-ai-content';

    const SELECTORS_HEIDI_ASK_AI_EDITOR = [
        '[data-testid="ask-ai-input-block-editor"] [contenteditable="true"]',
        '#template-block-editor-content [contenteditable="true"]',
        '.ask-ai-input [contenteditable="true"]',
        'div.prose-mirror-container [contenteditable="true"]',
        '[contenteditable="true"].tiptap.ProseMirror',
        '[contenteditable="true"]'
    ];

    const REGEX_CODE_HEIDI = /\[{1,2}\s*([A-Z][A-Z0-9]{0,3}(?:\.[A-Z0-9]+)?(?:-[A-Z][A-Z0-9]{0,3}(?:\.[A-Z0-9]+)?)?|ERREUR CIM10)\s*\]{1,2}/i;
    const REGEX_CODE_ATCD_TECHNIQUE = /^[A-Z][A-Z0-9]{0,3}(?:\.[A-Z0-9]+)?(?:-[A-Z][A-Z0-9]{0,3}(?:\.[A-Z0-9]+)?)?$/i;

    const ATCD_PRIORITY_VALUES = new Set(['PRIO_ROUGE', 'PRIO_ORANGE', 'PRIO_BLEU']);

    const DEFAULT_CODED_COLOR_PRIORITY = 'NO_COLOR';

const AUTO_ATCD_COLOR_KEYWORDS = {
    version: "2026-06-01-v3-mg-premier-recours",

    priorityOrder: [
        "PRIO_ROUGE",
        "PRIO_VIOLET",
        "PRIO_ORANGE",
        "PRIO_JAUNE",
        "NO_COLOR"
    ],

    colorConfig: {
        PRIO_ROUGE: {
            label: "Rouge",
            cssColor: "#D32F2F",
            wedaColorName: "ROUGE"
        },
        PRIO_VIOLET: {
            label: "Violet",
            cssColor: "#CC66FF",
            wedaColorName: "VIOLET"
        },
        PRIO_ORANGE: {
            label: "Orange",
            cssColor: "#F57C00",
            wedaColorName: "ORANGE"
        },
        PRIO_JAUNE: {
            label: "Jaune",
            cssColor: "#FBC02D",
            wedaColorName: "JAUNE"
        },
        NO_COLOR: {
            label: "Blanc / sans priorité",
            cssColor: "#FFFFFF",
            wedaColorName: "BLANC"
        }
    },

    /************************************************************
     * PRIO_ROUGE
     * Antécédents majeurs, graves, à risque vital ou fortement
     * structurants pour le pronostic.
     ************************************************************/
    PRIO_ROUGE: {
        label: "Grave / majeur / risque vital",
        terms: [
            /***********************
             * CANCER / HÉMATOLOGIE MALIGNE
             ***********************/
            "cancer",
            "neoplasie",
            "neoplasme",
            "tumeur maligne",
            "tumeur infiltrante",
            "tumeur invasive",
            "tumeur metastatique",
            "malignite",
            "carcinome",
            "adenocarcinome",
            "carcinome epidermoide",
            "carcinome basocellulaire metastatique",
            "carcinome spinocellulaire metastatique",
            "sarcome",
            "melanome malin",
            "melanome metastatique",
            "lymphome",
            "lymphome hodgkinien",
            "maladie de hodgkin",
            "lymphome non hodgkinien",
            "leucemie",
            "leucemie aigue",
            "leucemie chronique",
            "leucemie myeloide",
            "leucemie lymphoide",
            "myelome",
            "myelome multiple",
            "plasmocytome",
            "macroglobulinemie de waldenstrom",
            "glioblastome",
            "gliome malin",
            "astrocytome malin",
            "metastase",
            "metastases",
            "metastatique",
            "carcinose",
            "carcinose peritoneale",
            "recidive cancer",
            "cancer generalise",
            "chimiotherapie",
            "radiotherapie",
            "curietherapie",
            "immunotherapie anticancereuse",
            "hormonotherapie anticancereuse",
            "soins palliatifs cancer",
            "cancer colorectal",
            "cancer colon",
            "cancer rectum",
            "cancer sein",
            "cancer prostate",
            "cancer poumon",
            "cancer bronchique",
            "cancer pancreas",
            "cancer foie",
            "carcinome hepatocellulaire",
            "cancer estomac",
            "cancer oesophage",
            "cancer rein",
            "cancer vessie",
            "cancer ovaire",
            "cancer uterus",
            "cancer endometre",
            "cancer col uterin",
            "cancer vulve",
            "cancer testicule",
            "cancer thyroide",
            "cancer orl",
            "cancer larynx",
            "cancer pharynx",
            "cancer cavum",
            "cancer langue",
            "cancer peau",
            "tumeur cerebrale",
            "tumeur cerveau",
            "tumeur maligne cerebrale",
            "myelodysplasie",
            "syndrome myelodysplasique",
            "polyglobulie de vaquez",
            "thrombocytemie essentielle",
            "syndrome myeloproliferatif",

            /***********************
             * CARDIOVASCULAIRE GRAVE
             ***********************/
            "infarctus",
            "infarctus du myocarde",
            "syndrome coronarien aigu",
            "angor instable",
            "angine de poitrine instable",
            "crise cardiaque",
            "attaque cardiaque",
            "cardiopathie ischemique severe",
            "coronaropathie severe",
            "tronc commun coronaire",
            "occlusion coronaire",
            "angioplastie coronaire recente",
            "stent coronaire recent",
            "pontage coronarien",
            "pontage aorto coronarien",
            "triple pontage",
            "arret cardiaque",
            "mort subite recuperee",
            "mort subite ressuscitee",
            "reanimation cardiaque",
            "choc cardiogenique",
            "insuffisance cardiaque",
            "insuffisance cardiaque severe",
            "insuffisance cardiaque systolique",
            "insuffisance cardiaque avec fevg alteree",
            "decompensation cardiaque",
            "oap",
            "oedeme aigu pulmonaire",
            "cardiomyopathie",
            "cardiomyopathie dilatee",
            "cardiomyopathie hypertrophique",
            "cardiomyopathie restrictive",
            "cardiomyopathie arythmogene",
            "cardiopathie dilatee",
            "fevg alteree",
            "fevg basse",
            "fevg inferieure a 40",
            "fevg < 40",
            "valvulopathie severe",
            "retrecissement aortique serre",
            "stenose aortique serree",
            "insuffisance mitrale severe",
            "insuffisance aortique severe",
            "insuffisance tricuspide severe",
            "dissection aortique",
            "dissection de l aorte",
            "anevrisme aorte",
            "anevrisme aortique",
            "anevrysme aortique",
            "anevrisme abdominal volumineux",
            "anevrisme thoracique",
            "rupture anevrisme",
            "aorte operee",
            "endocardite",
            "endocardite infectieuse",
            "myocardite severe",
            "pericardite constrictive",
            "tamponnade",
            "hypertension pulmonaire severe",
            "htap severe",
            "arythmie ventriculaire severe",
            "tachycardie ventriculaire",
            "fibrillation ventriculaire",
            "torsade de pointe",
            "qt long symptomatique",

            /***********************
             * AVC / NEUROVASCULAIRE = ROUGE
             ***********************/
            "avc",
            "accident vasculaire cerebral",
            "accident cerebral",
            "accident neurologique vasculaire",
            "ait",
            "accident ischemique transitoire",
            "accident ischemique cerebral transitoire",
            "ischemie cerebrale",
            "ischemie transitoire",
            "infarctus cerebral",
            "infarctus cerebelleux",
            "infarctus lacunaire",
            "lacune cerebrale symptomatique",
            "avc ischemique",
            "avc hemorragique",
            "hemorragie cerebrale",
            "hemorragie intracerebrale",
            "hemorragie intracranienne",
            "hemorragie meningee",
            "hemorragie sous arachnoidienne",
            "anevrisme cerebral rompu",
            "rupture anevrisme cerebral",
            "attaque cerebrale",
            "attaque neurologique",
            "petit avc",
            "mini avc",
            "caillot au cerveau",
            "thrombose arterielle cerebrale",
            "thrombose veineuse cerebrale",
            "thrombose sinus veineux cerebral",
            "dissection carotidienne avec avc",
            "dissection vertebrale avec avc",
            "stenose carotidienne symptomatique",
            "sequelles avc",
            "sequelles d avc",
            "avc sequellaire",
            "hemiplegie post avc",
            "hemiparesie post avc",
            "aphasie post avc",
            "dysarthrie post avc",
            "troubles cognitifs post avc",
            "trouble de deglutition post avc",
            "thrombectomie",
            "trombolyse",
            "trombolyse avc",

            /***********************
             * NEUROLOGIE GRAVE
             ***********************/
            "epilepsie severe",
            "etat de mal epileptique",
            "convulsions severes",
            "sla",
            "sclerose laterale amyotrophique",
            "maladie du motoneurone",
            "myasthenie",
            "myasthenie grave",
            "myopathie severe",
            "dystrophie musculaire",
            "paraplegie",
            "tetraplegie",
            "quadriplegie",
            "traumatisme cranien grave",
            "tc grave",
            "hematome sous dural",
            "hematome extradural",
            "hematome intracranien",
            "demence severe",
            "alzheimer severe",
            "maladie d alzheimer severe",
            "demence a corps de lewy severe",
            "demence frontotemporale severe",
            "hydrocephalie",
            "coma",
            "encephalopathie severe",

            /***********************
             * THROMBOEMBOLIQUE GRAVE
             * TVP/phlébite seules = ORANGE, pas rouge.
             ***********************/
            "embolie pulmonaire",
            "ep massive",
            "ep bilaterale",
            "embolie pulmonaire massive",
            "embolie pulmonaire bilaterale",
            "embolie pulmonaire grave",
            "embolie pulmonaire avec choc",
            "caillot dans le poumon",
            "hypertension pulmonaire post embolique",
            "coeur pulmonaire chronique post embolique",
            "thrombophilie majeure",
            "syndrome des antiphospholipides",
            "sapl",
            "deficit proteine c",
            "deficit proteine s",
            "deficit antithrombine",
            "facteur v leiden homozygote",
            "mutation facteur v leiden homozygote",

            /***********************
             * RESPIRATOIRE GRAVE
             ***********************/
            "insuffisance respiratoire chronique",
            "irc respiratoire",
            "oxygenotherapie",
            "oxygene a domicile",
            "old",
            "vni",
            "ventilation non invasive",
            "tracheotomie",
            "canule tracheale",
            "bpco severe",
            "emphyseme severe",
            "fibrose pulmonaire",
            "fibrose pulmonaire idiopathique",
            "pneumopathie interstitielle diffuse",
            "pid severe",
            "mucoviscidose",
            "asthme severe",
            "asthme aigu grave",
            "pneumonectomie",
            "lobectomie pulmonaire pour cancer",
            "insuffisance respiratoire restrictive severe",
            "silicose severe",
            "asbestose severe",

            /***********************
             * RÉNAL / UROLOGIQUE GRAVE
             ***********************/
            "insuffisance renale chronique severe",
            "irc severe",
            "irc stade 4",
            "irc stade 5",
            "maladie renale chronique stade 4",
            "maladie renale chronique stade 5",
            "dialyse",
            "hemodialyse",
            "dialyse peritoneale",
            "rein artificiel",
            "greffe renale",
            "transplantation renale",
            "greffe du rein",
            "nephrectomie bilaterale",
            "rein unique avec insuffisance renale",
            "syndrome nephrotique severe",
            "glomerulonephrite rapidement progressive",
            "nephropathie severe",
            "polykystose renale severe",
            "cancer rein",
            "cancer vessie infiltrant",
            "cancer vessie invasif",

            /***********************
             * HÉPATO-DIGESTIF GRAVE
             ***********************/
            "cirrhose",
            "cirrhose alcoolique",
            "cirrhose biliaire",
            "cirrhose decompensee",
            "ascite",
            "varices oesophagiennes",
            "rupture de varices oesophagiennes",
            "encephalopathie hepatique",
            "insuffisance hepatique",
            "hepatite fulminante",
            "hypertension portale",
            "greffe foie",
            "greffe du foie",
            "transplantation hepatique",
            "pancreatite chronique severe",
            "pancreatite aigue grave",
            "necrose pancreatique",
            "crohn severe",
            "maladie de crohn severe",
            "rch severe",
            "rectocolite hemorragique severe",
            "colectomie totale",
            "stomie digestive definitive",
            "ileostomie definitive",
            "colostomie definitive",
            "syndrome de grele court",
            "ischemie mesenterique",
            "infarctus mesenterique",

            /***********************
             * INFECTIEUX / IMMUNITAIRE GRAVE
             ***********************/
            "vih",
            "sida",
            "infection vih",
            "tuberculose active",
            "bk actif",
            "septicemie",
            "sepsis severe",
            "choc septique",
            "meningite bacterienne",
            "meningite pneumocoque",
            "meningite meningocoque",
            "encephalite",
            "osteite chronique",
            "osteomyelite chronique",
            "infection osteoarticulaire chronique",
            "prothese infectee",
            "infection prothese",
            "immunodepression severe",
            "deficit immunitaire severe",
            "deficit immunitaire primitif",
            "asplenie",
            "splenectomie",
            "rate enlevee",
            "plus de rate",
            "drepanocytose majeure",
            "drepanocytose homozygote",
            "paludisme grave",

            /***********************
             * ENDOCRINO-MÉTABOLIQUE GRAVE
             ***********************/
            "diabete complique",
            "diabete avec nephropathie",
            "diabete avec retinopathie",
            "diabete avec neuropathie",
            "diabete avec arteriopathie",
            "diabete avec pied diabetique",
            "pied diabetique",
            "mal perforant plantaire",
            "amputation diabetique",
            "acidocetose diabetique",
            "coma diabetique",
            "hypoglycemies severes",
            "diabete type 1 complique",
            "insuffisance surrenalienne",
            "maladie d addison",
            "crise addisonienne",
            "thyrotoxicose",
            "hyperthyroidie severe",
            "pheochromocytome",
            "obesite morbide avec complications",
            "syndrome de cushing severe",

            /***********************
             * PSYCHIATRIE / ADDICTOLOGIE GRAVE
             ***********************/
            "tentative de suicide",
            "atcd ts",
            "antecedent ts",
            "suicide",
            "idees suicidaires severes",
            "hospitalisation psychiatrie",
            "hospitalisation sous contrainte",
            "schizophrenie",
            "trouble schizoaffectif",
            "psychose chronique",
            "bouffee delirante",
            "delire chronique",
            "hallucinations chroniques",
            "trouble bipolaire",
            "melancolie",
            "depression severe",
            "depression melancolique",
            "anorexie mentale severe",
            "trouble alimentaire severe",
            "alcoolisme severe",
            "alcoolodependance severe",
            "delirium tremens",
            "sevrage alcool complique",
            "toxicomanie severe",
            "overdose",

            /***********************
             * OBSTÉTRIQUE GRAVE
             ***********************/
            "preeclampsie severe",
            "eclampsie",
            "hellp syndrome",
            "hemorragie de la delivrance severe",
            "mort foetale in utero",
            "mfiu",
            "embolie amniotique",
            "rupture uterine",
            "grossesse extra uterine rompue",
            "geu rompue"
        ],

        exactWords: [
            "avc",
            "ait",
            "idm",
            "sca",
            "chc",
            "lam",
            "llc",
            "lmc",
            "lnh",
            "oap",
            "htap",
            "sla",
            "sapl"
        ],

        cim10Regex: [
            "\\bC[0-9]{2}(?:\\.[0-9A-Z]+)?\\b",
            "\\bD0[0-9](?:\\.[0-9A-Z]+)?\\b",
            "\\bI21(?:\\.[0-9A-Z]+)?\\b",
            "\\bI22(?:\\.[0-9A-Z]+)?\\b",
            "\\bI26(?:\\.[0-9A-Z]+)?\\b",
            "\\bI46(?:\\.[0-9A-Z]+)?\\b",
            "\\bI50(?:\\.[0-9A-Z]+)?\\b",
            "\\bI6[0-9](?:\\.[0-9A-Z]+)?\\b",
            "\\bG45(?:\\.[0-9A-Z]+)?\\b",
            "\\bI71(?:\\.[0-9A-Z]+)?\\b",
            "\\bN18\\.4\\b",
            "\\bN18\\.5\\b",
            "\\bN18\\.6\\b",
            "\\bB20(?:\\.[0-9A-Z]+)?\\b",
            "\\bB21(?:\\.[0-9A-Z]+)?\\b",
            "\\bB22(?:\\.[0-9A-Z]+)?\\b",
            "\\bB23(?:\\.[0-9A-Z]+)?\\b",
            "\\bB24\\b",
            "\\bK72(?:\\.[0-9A-Z]+)?\\b",
            "\\bK74(?:\\.[0-9A-Z]+)?\\b",
            "\\bF20(?:\\.[0-9A-Z]+)?\\b",
            "\\bF31(?:\\.[0-9A-Z]+)?\\b",
            "\\bX6[0-9](?:\\.[0-9A-Z]+)?\\b",
            "\\bX7[0-9](?:\\.[0-9A-Z]+)?\\b",
            "\\bX80(?:\\.[0-9A-Z]+)?\\b",
            "\\bX81(?:\\.[0-9A-Z]+)?\\b",
            "\\bX82(?:\\.[0-9A-Z]+)?\\b",
            "\\bX83(?:\\.[0-9A-Z]+)?\\b",
            "\\bX84(?:\\.[0-9A-Z]+)?\\b"
        ]
    },

    /************************************************************
     * PRIO_VIOLET
     * Vigilance pratique immédiate : prescription, geste, anesthésie,
     * terrain, matériel, iatrogénie.
     ************************************************************/
    PRIO_VIOLET: {
        label: "Vigilance pratique immédiate",
        terms: [
            /***********************
             * ALLERGIES GRAVES OU UTILES À LA PRESCRIPTION
             ***********************/
            "allergie penicilline",
            "allergie amoxicilline",
            "allergie augmentin",
            "allergie beta lactamine",
            "allergie betalactamine",
            "allergie cephalosporine",
            "allergie ceftriaxone",
            "allergie cefixime",
            "allergie cefpodoxime",
            "allergie cefotaxime",
            "allergie cefuroxime",
            "allergie macrolide",
            "allergie azithromycine",
            "allergie clarithromycine",
            "allergie pristinamycine",
            "allergie quinolone",
            "allergie fluoroquinolone",
            "allergie ciprofloxacine",
            "allergie levofloxacine",
            "allergie ofloxacine",
            "allergie ains",
            "allergie anti inflammatoire",
            "allergie aspirine",
            "allergie ibuprofene",
            "allergie ketoprofene",
            "allergie naproxene",
            "allergie diclofenac",
            "allergie iode",
            "allergie produit de contraste",
            "allergie contraste",
            "allergie gadolinium",
            "allergie morphine",
            "allergie codeine",
            "allergie tramadol",
            "allergie oxycodone",
            "allergie sulfamide",
            "allergie sulfonamide",
            "allergie latex",
            "allergie anesthesique",
            "allergie anesthesie",
            "allergie curare",
            "allergie vaccinale",
            "allergie alimentaire severe",
            "allergie arachide",
            "allergie fruits a coque",
            "allergie medicamenteuse",
            "anaphylaxie",
            "choc anaphylactique",
            "oedeme de quincke",
            "angioedeme",
            "urticaire geante",
            "toxidermie",
            "syndrome de lyell",
            "stevens johnson",
            "syndrome stevens johnson",
            "dress syndrome",
            "allergie grave",
            "a failli mourir avec",
            "gonfle avec",
            "etouffe avec",

            /***********************
             * ANTICOAGULANTS / ANTIAGRÉGANTS / HÉMORRAGIE
             ***********************/
            "anticoagulant",
            "anticoagulation",
            "anticoagulation au long cours",
            "avk",
            "warfarine",
            "coumadine",
            "fluindione",
            "previscan",
            "acenocoumarol",
            "sintrom",
            "aod",
            "naco",
            "rivaroxaban",
            "xarelto",
            "apixaban",
            "eliquis",
            "dabigatran",
            "pradaxa",
            "edoxaban",
            "lixiana",
            "heparine au long cours",
            "fondaparinux",
            "antiagregant",
            "anti agregant",
            "clopidogrel",
            "plavix",
            "prasugrel",
            "efient",
            "ticagrelor",
            "brilique",
            "double antiagregation",
            "double anti agregation",
            "dapt",
            "hemophilie",
            "maladie de willebrand",
            "thrombopenie severe",
            "purpura thrombopenique",
            "trouble coagulation",
            "coagulopathie",
            "saigne facilement",
            "sang trop liquide",
            "fluidifiant du sang",
            "hemorragie sous anticoagulant",
            "hemorragie digestive sous anticoagulant",

            /***********************
             * DISPOSITIFS / MATÉRIEL CRITIQUE
             ***********************/
            "pacemaker",
            "pace maker",
            "stimulateur cardiaque",
            "pile cardiaque",
            "boitier cardiaque",
            "defibrillateur implantable",
            "dai",
            "resynchronisation cardiaque",
            "crt",
            "valve mecanique",
            "valve cardiaque mecanique",
            "valve aortique mecanique",
            "valve mitrale mecanique",
            "prothese valvulaire",
            "valve biologique",
            "stent coronaire",
            "chambre implantable",
            "port a cath",
            "port-a-cath",
            "pac chimiotherapie",
            "picc line",
            "catheter central",
            "cath central",
            "neurostimulateur",
            "pompe intrathecale",
            "pompe a insuline",
            "implant cochleaire",
            "valve de derivation",
            "derivation ventriculo peritoneale",
            "dvp",
            "shunt",
            "materiel osteosynthese infecte",
            "prothese articulaire infectee",
            "sonde double j",
            "sonde jj",
            "filtre cave",

            /***********************
             * GROSSESSE / ALLAITEMENT / PMA
             ***********************/
            "grossesse",
            "enceinte",
            "femme enceinte",
            "attend un bebe",
            "bebe en route",
            "allaitement",
            "allaite",
            "fiv",
            "pma",
            "stimulation ovarienne",
            "grossesse a risque",

            /***********************
             * IMMUNODÉPRESSION / TRAITEMENTS À RISQUE
             ***********************/
            "immunodeprime",
            "immunodepression",
            "immunosuppression",
            "immunosuppresseur",
            "immunodepresseur",
            "corticoides au long cours",
            "corticotherapie prolongee",
            "prednisone au long cours",
            "biotherapie",
            "anti tnf",
            "anti-tnf",
            "adalimumab",
            "humira",
            "infliximab",
            "remicade",
            "etanercept",
            "enbrel",
            "golimumab",
            "simponi",
            "certolizumab",
            "cimzia",
            "tocilizumab",
            "roactemra",
            "rituximab",
            "mabthera",
            "secukinumab",
            "cosentyx",
            "ustekinumab",
            "stelara",
            "ixekizumab",
            "taltz",
            "dupilumab",
            "dupixent",
            "omalizumab",
            "xolair",
            "methotrexate",
            "azathioprine",
            "imurel",
            "mycophenolate",
            "cellcept",
            "ciclosporine",
            "cyclosporine",
            "tacrolimus",
            "everolimus",
            "sirolimus",
            "chimiotherapie en cours",
            "traitement immunosuppresseur",
            "traitement immunodepresseur",
            "jaki",
            "anti jak",
            "baricitinib",
            "tofacitinib",
            "upadacitinib",

            /***********************
             * ADAPTATION POSOLOGIQUE / TERRAIN FRAGILE
             ***********************/
            "dfg inferieur a 30",
            "dfg < 30",
            "clairance inferieure a 30",
            "clairance < 30",
            "clairance basse",
            "insuffisance renale avec adaptation",
            "insuffisance hepatique avec adaptation",
            "cirrhose avec adaptation",
            "personne agee fragile",
            "fragilite geriatrique",
            "denutrition severe",
            "chutes repetees",
            "risque de chute eleve",

            /***********************
             * ANESTHÉSIE / ACTES / TRANSFUSION
             ***********************/
            "intubation difficile",
            "allergie anesthesie",
            "allergie anesthesique",
            "complication anesthesique",
            "hyperthermie maligne",
            "nvpo severe",
            "nausees vomissements post operatoires severes",
            "refus transfusion",
            "temoin de jehovah",
            "risque hemorragique",
            "difficulte intubation",
            "voie aerienne difficile",

            /***********************
             * STOMIES / SOINS TECHNIQUES
             ***********************/
            "stomie",
            "colostomie",
            "ileostomie",
            "urostomie",
            "poche digestive",
            "poche a selles",
            "sonde urinaire a demeure",
            "sad",
            "cystostomie",
            "nephrostomie",
            "gastrostomie",
            "gpe",
            "jejunostomie",
            "tracheotomie",
            "oxygenotherapie",
            "vni",
            "ppc",
            "cpap",
            "dialyse",
            "nutrition enterale",
            "nutrition parenterale",
            "picc line",
            "chambre implantable"
        ],

        exactWords: [
            "avk",
            "aod",
            "naco",
            "dai",
            "crt",
            "dvp",
            "sad",
            "gpe",
            "vni",
            "ppc",
            "cpap",
            "jaki"
        ],

        cim10Regex: [
            "\\bT78\\.2\\b",
            "\\bT78\\.3\\b",
            "\\bZ88(?:\\.[0-9A-Z]+)?\\b",
            "\\bZ91\\.0\\b",
            "\\bZ95(?:\\.[0-9A-Z]+)?\\b",
            "\\bZ93(?:\\.[0-9A-Z]+)?\\b",
            "\\bZ94(?:\\.[0-9A-Z]+)?\\b",
            "\\bZ99(?:\\.[0-9A-Z]+)?\\b"
        ]
    },

    /************************************************************
     * PRIO_ORANGE
     * Pathologies chroniques importantes, structurantes ou qui
     * modifient régulièrement le suivi MG.
     ************************************************************/
    PRIO_ORANGE: {
        label: "Chronique important / structurant",
        terms: [
            /***********************
             * CARDIO-VASCULAIRE COURANT STRUCTURANT
             ***********************/
            "hta",
            "hypertension arterielle",
            "hypertension",
            "tension arterielle",
            "pa elevee",
            "dyslipidemie",
            "hypercholesterolemie",
            "hypertriglyceridemie",
            "cholesterol",
            "triglycerides",
            "cardiopathie",
            "cardiopathie ischemique stable",
            "coronaropathie stable",
            "angor stable",
            "angine de poitrine stable",
            "stent coronaire ancien",
            "angioplastie coronaire ancienne",
            "fibrillation atriale",
            "flutter",
            "trouble du rythme",
            "arythmie",
            "coeur irregulier",
            "tachycardie supraventriculaire",
            "bav",
            "bloc auriculo ventriculaire",
            "bloc de branche",
            "bloc de branche gauche",
            "bloc de branche droit",
            "extrasystoles frequentes",
            "arteriopathie",
            "aomi",
            "arteriopathie obliterante",
            "claudication intermittente",
            "stenose carotidienne",
            "anevrisme non complique",
            "insuffisance veineuse severe",
            "ulcere veineux",
            "maladie variqueuse severe",
            "lymphoedeme chronique",

            /***********************
             * TVP / PHLÉBITE = ORANGE
             ***********************/
            "phlebite",
            "phlebite ancienne",
            "phlebite membre inferieur",
            "phlebite jambe",
            "phlebite mollet",
            "phlebite femorale",
            "phlebite poplitee",
            "phlebite superficielle",
            "thrombose veineuse",
            "thrombose veineuse profonde",
            "tvp",
            "tvp ancienne",
            "tvp membre inferieur",
            "tvp jambe",
            "tvp mollet",
            "tvp femorale",
            "tvp poplitee",
            "maladie thromboembolique veineuse",
            "mtev",
            "caillot dans la jambe",
            "caillot veineux",
            "thrombose surale",
            "thrombose femorale",
            "thrombose poplitee",
            "thrombose iliaque",
            "thrombose porte",
            "thrombose veineuse porte",

            /***********************
             * DIABÈTE / MÉTABOLIQUE
             ***********************/
            "diabete",
            "diabete type 1",
            "diabete type 2",
            "diabete insulinodependant",
            "diabete non insulinodependant",
            "insuline",
            "prediabete",
            "intolerance au glucose",
            "syndrome metabolique",
            "obesite",
            "obesite morbide",
            "surpoids important",
            "goutte",
            "hyperuricemie",
            "acide urique",
            "steatose hepatique metabolique",
            "nash",
            "foie gras",
            "hyperferritinemie metabolique",

            /***********************
             * RESPIRATOIRE CHRONIQUE
             ***********************/
            "asthme",
            "asthme persistant",
            "bpco",
            "bronchopneumopathie chronique obstructive",
            "emphyseme",
            "bronchite chronique",
            "bronches fragiles",
            "ddb",
            "dilatation des bronches",
            "bronchectasies",
            "apnee du sommeil",
            "apnees du sommeil",
            "sas",
            "saos",
            "rhinite allergique severe",
            "pneumopathie interstitielle",
            "fibrose debutante",
            "sarcoidose pulmonaire",

            /***********************
             * RHUMATO / INFLAMMATOIRE / OSTÉO-ARTICULAIRE
             ***********************/
            "polyarthrite rhumatoide",
            "polyarthrite",
            "spondylarthrite",
            "spondyloarthrite",
            "rhumatisme psoriasique",
            "psoriasis articulaire",
            "rhumatisme inflammatoire",
            "lupus",
            "lupus erythemateux dissemine",
            "sclerodermie",
            "connectivite",
            "syndrome de sjogren",
            "gougerot sjogren",
            "vascularite",
            "granulomatose avec polyangeite",
            "maladie de behcet",
            "pseudopolyarthrite rhizomelique",
            "maladie de horton",
            "arterite temporale",
            "fibromyalgie",
            "osteoporose",
            "fracture osteoporotique",
            "tassement vertebral",
            "arthrose severe",
            "coxarthrose",
            "gonarthrose",
            "canal lombaire etroit",
            "hernie discale operee",
            "sciatique chronique invalidante",
            "polyarthrose invalidante",

            /***********************
             * DIGESTIF / HÉPATOLOGIE CHRONIQUE
             ***********************/
            "maladie de crohn",
            "crohn",
            "rectocolite hemorragique",
            "rch",
            "mici",
            "maladie coeliaque",
            "coeliaque",
            "pancreatite chronique",
            "hepatite b chronique",
            "hepatite c chronique",
            "hepatopathie chronique",
            "steatose hepatique",
            "rgo severe",
            "reflux gastro oesophagien severe",
            "oesophagite severe",
            "barrett",
            "endobrachyoesophage",
            "ulcere gastrique recidivant",
            "ulcere duodenal recidivant",
            "diverticulose compliquee",
            "colite chronique",
            "maladie diverticulaire compliquee",

            /***********************
             * ENDOCRINO
             ***********************/
            "hypothyroidie",
            "hyperthyroidie",
            "basedow",
            "hashimoto",
            "thyroidite",
            "nodule thyroidien surveille",
            "goitre",
            "hyperparathyroidie",
            "hypoparathyroidie",
            "adenome hypophysaire",
            "prolactinome",
            "acromegalie",
            "diabete insipide",
            "sopk",
            "syndrome des ovaires polykystiques",

            /***********************
             * NÉPHRO-UROLOGIE CHRONIQUE
             ***********************/
            "insuffisance renale chronique",
            "maladie renale chronique",
            "albuminurie",
            "proteinurie",
            "nephropathie",
            "rein unique",
            "lithiase renale recidivante",
            "colique nephretique recidivante",
            "calculs renaux recidivants",
            "hypertrophie benigne prostate severe",
            "adenome prostate severe",
            "retention urinaire",
            "incontinence urinaire severe",
            "vessie neurologique",
            "infections urinaires recidivantes",
            "cystites recidivantes",
            "pyelonephrite recidivante",
            "reflux vesico ureteral",
            "stenose uretrale",

            /***********************
             * NEUROLOGIE CHRONIQUE
             ***********************/
            "epilepsie",
            "migraine severe",
            "migraine chronique",
            "cephalees chroniques",
            "maladie de parkinson",
            "parkinson",
            "tremblement essentiel",
            "sclerose en plaques",
            "neuropathie peripherique",
            "polynevrite",
            "neuropathie diabetique",
            "nevralgie trijumeau",
            "algie vasculaire de la face",
            "syndrome jambes sans repos severe",
            "trouble cognitif leger",
            "neuropathie alcoolique",
            "nevralgie post zostérienne",
            "nevralgie post zosterienne",

            /***********************
             * PSYCHIATRIE FRÉQUENTE
             ***********************/
            "depression",
            "episode depressif",
            "depression recurrente",
            "syndrome depressif",
            "trouble anxieux",
            "anxiete generalisee",
            "attaque de panique",
            "trouble panique",
            "toc",
            "trouble obsessionnel compulsif",
            "tdah",
            "trouble du spectre autistique",
            "autisme",
            "trouble bipolaire stabilise",
            "burn out",
            "alcoolodependance",
            "addiction alcool",
            "sevrage alcool",
            "tabagisme actif important",
            "cannabis quotidien",
            "toxicomanie ancienne",
            "trouble du comportement alimentaire",
            "boulimie",
            "hyperphagie boulimique",

            /***********************
             * GYNÉCO / OBSTÉTRIQUE STRUCTURANTE
             ***********************/
            "endometriose",
            "adenomyose",
            "fibrome symptomatique",
            "fibrome uterin symptomatique",
            "kyste ovarien recidivant",
            "menopause precoce",
            "antecedent preeclampsie",
            "diabete gestationnel",
            "cesariennes multiples",
            "fausses couches repetees",
            "fcs repetees",
            "infertilite",
            "sterilite",

            /***********************
             * CHIRURGIES MAJEURES / ANATOMIE MODIFIÉE
             ***********************/
            "prothese totale hanche",
            "prothese totale genou",
            "arthrodese",
            "laminectomie",
            "chirurgie rachis",
            "colectomie",
            "gastrectomie",
            "bypass gastrique",
            "sleeve",
            "chirurgie bariatrique",
            "hysterectomie",
            "prostatectomie",
            "nephrectomie",
            "thyroidectomie totale",
            "mastectomie",
            "lobectomie pulmonaire",
            "amputation",
            "splenectomie",
            "pancreatectomie",
            "oesophagectomie"
        ],

        exactWords: [
            "hta",
            "fa",
            "bav",
            "aomi",
            "tvp",
            "mtev",
            "dt1",
            "dt2",
            "bpco",
            "ddb",
            "sas",
            "saos",
            "pr",
            "spa",
            "ppr",
            "rch",
            "mici",
            "nash",
            "irc",
            "mrc",
            "sep",
            "toc",
            "tdah",
            "sopk"
        ],

        cim10Regex: [
            "\\bI10(?:\\.[0-9A-Z]+)?\\b",
            "\\bI11(?:\\.[0-9A-Z]+)?\\b",
            "\\bI12(?:\\.[0-9A-Z]+)?\\b",
            "\\bI13(?:\\.[0-9A-Z]+)?\\b",
            "\\bI15(?:\\.[0-9A-Z]+)?\\b",
            "\\bI48(?:\\.[0-9A-Z]+)?\\b",
            "\\bI80(?:\\.[0-9A-Z]+)?\\b",
            "\\bI82(?:\\.[0-9A-Z]+)?\\b",
            "\\bE1[0-4](?:\\.[0-9A-Z]+)?\\b",
            "\\bE66(?:\\.[0-9A-Z]+)?\\b",
            "\\bE78(?:\\.[0-9A-Z]+)?\\b",
            "\\bJ44(?:\\.[0-9A-Z]+)?\\b",
            "\\bJ45(?:\\.[0-9A-Z]+)?\\b",
            "\\bG20(?:\\.[0-9A-Z]+)?\\b",
            "\\bG35(?:\\.[0-9A-Z]+)?\\b",
            "\\bG40(?:\\.[0-9A-Z]+)?\\b",
            "\\bK50(?:\\.[0-9A-Z]+)?\\b",
            "\\bK51(?:\\.[0-9A-Z]+)?\\b",
            "\\bM05(?:\\.[0-9A-Z]+)?\\b",
            "\\bM06(?:\\.[0-9A-Z]+)?\\b",
            "\\bM45(?:\\.[0-9A-Z]+)?\\b",
            "\\bF32(?:\\.[0-9A-Z]+)?\\b",
            "\\bF33(?:\\.[0-9A-Z]+)?\\b",
            "\\bF41(?:\\.[0-9A-Z]+)?\\b"
        ]
    },

    /************************************************************
     * PRIO_JAUNE
     * Utile au suivi ou à la prise en charge future, sans être
     * un antécédent majeur.
     ************************************************************/
    PRIO_JAUNE: {
        label: "Utile au suivi / contexte médical pertinent",
        terms: [
            /***********************
             * FACTEURS DE RISQUE / PRÉVENTION
             ***********************/
            "tabac ancien",
            "ancien fumeur",
            "sevrage tabagique",
            "tabagisme sevre",
            "alcool sevre",
            "alcool ancien",
            "sedentarite",
            "surpoids",
            "antecedent familial cardiovasculaire",
            "antecedent familial cancer",
            "antecedent familial diabete",
            "antecedent familial hta",
            "terrain familial cardiovasculaire",
            "terrain familial cancer",
            "mort subite familiale",
            "brca",
            "brca1",
            "brca2",
            "syndrome de lynch",
            "lynch",
            "polypose familiale",
            "polypose adenomateuse familiale",
            "hemochromatose familiale",

            /***********************
             * GYNÉCO UTILE AU SUIVI
             ***********************/
            "conisation",
            "dysplasie col uterin",
            "cin 1",
            "cin 2",
            "cin 3",
            "hpv",
            "papillomavirus",
            "frottis anormal",
            "fcv anormal",
            "diu",
            "sterilet",
            "implant contraceptif",
            "menopause precoce",
            "antecedent geu",
            "grossesse extra uterine",
            "fausse couche repetee",
            "fcs repetee",
            "endometriose legere mais symptomatique",

            /***********************
             * UROLOGIE / NÉPHRO UTILE MAIS NON SÉVÈRE
             ***********************/
            "hypertrophie benigne prostate",
            "adenome prostate",
            "hbp simple",
            "calcul renal",
            "calculs renaux",
            "colique nephretique",
            "lithiase renale",
            "rein unique sans insuffisance renale",
            "infection urinaire recidivante simple",
            "cystites a repetition",
            "incontinence urinaire moderee",
            "prostatite chronique",

            /***********************
             * DIGESTIF UTILE
             ***********************/
            "rgo chronique",
            "reflux chronique",
            "hernie hiatale symptomatique",
            "colon irritable severe",
            "intestin irritable severe",
            "constipation chronique",
            "hemorroides recidivantes",
            "fissure anale chronique",
            "lithiase biliaire symptomatique",
            "diverticulose connue",
            "polype colique",
            "adenome colique",
            "antecedent polype colique",

            /***********************
             * OPHTALMO / ORL UTILE
             ***********************/
            "glaucome",
            "dmla",
            "retinopathie",
            "myopie forte",
            "surdite appareillee",
            "surdité appareillee",
            "implant cochleaire",
            "vertiges recidivants",
            "vppb recidivant",
            "acouphenes invalidants",
            "apnee du sommeil non appareillee",
            "polypose nasosinusienne",

            /***********************
             * DERMATO UTILE
             ***********************/
            "psoriasis",
            "eczema chronique",
            "urticaire chronique",
            "rosacee",
            "hidrosadenite",
            "maladie de verneuil",
            "naevus atypique",
            "nevus atypique",
            "keratose actinique",
            "carcinome basocellulaire",
            "carcinome spinocellulaire",
            "melanome in situ",

            /***********************
             * INFECTIEUX UTILE
             ***********************/
            "zona ophtalmique",
            "zona recidivant",
            "herpes recidivant",
            "ist recidivante",
            "chlamydia recidivant",
            "gonocoque recidivant",
            "syphilis traitee",
            "tuberculose ancienne traitee",
            "hepatite a ancienne",
            "hepatite b guerie",
            "hepatite c guerie",
            "infection hpv",
            "condylomes recidivants",

            /***********************
             * TRAUMATOLOGIE UTILE
             ***********************/
            "fracture col femur",
            "fracture vertebrale",
            "fracture tassement vertebral",
            "fracture de fragilite",
            "fracture basse energie",
            "fractures repetees",
            "rupture ligament croise",
            "ligament croise opere",
            "lca opere",
            "meniscectomie",
            "luxation recidivante",
            "entorses recidivantes",
            "rupture coiffe rotateurs",
            "prothese epaule",
            "prothese cheville",

            /***********************
             * CHIRURGIE NON MAJEURE MAIS UTILE
             ***********************/
            "cholecystectomie compliquee",
            "cicatrice cheloide",
            "eventration",
            "hernie recidivante",
            "chirurgie sinus recidivante",
            "chirurgie varices recidivantes",
            "chirurgie endometriose",
            "chirurgie incontinence",
            "bandelette urinaire",
            "sling urinaire",
            "chirurgie bariatrique ancienne sans complication",

            /***********************
             * TROUBLES CHRONIQUES PEU GRAVES MAIS UTILES
             ***********************/
            "migraine",
            "migraine avec aura",
            "lombalgie chronique",
            "cervicalgie chronique",
            "tendinite chronique",
            "epicondylite chronique",
            "syndrome canal carpien non opere",
            "aponevrosite plantaire chronique",
            "nevralgie cervico brachiale",
            "sciatique ancienne",
            "fibromyalgie legere",
            "syndrome douloureux chronique",

            /***********************
             * ENDOCRINO / CARENCE UTILE
             ***********************/
            "carence martiale chronique",
            "anemie ferriprive chronique",
            "carence b12",
            "carence vitamine b12",
            "carence vitamine d recurrente",
            "osteopenie",
            "hyperprolactinemie",
            "nodule thyroidien benin surveille"
        ],

        exactWords: [
            "hpv",
            "diu",
            "vppb",
            "hbp",
            "lca"
        ],

        cim10Regex: [
            "\\bZ80(?:\\.[0-9A-Z]+)?\\b",
            "\\bZ82(?:\\.[0-9A-Z]+)?\\b",
            "\\bZ83(?:\\.[0-9A-Z]+)?\\b",
            "\\bN87(?:\\.[0-9A-Z]+)?\\b",
            "\\bB97\\.7\\b",
            "\\bN40(?:\\.[0-9A-Z]+)?\\b",
            "\\bN20(?:\\.[0-9A-Z]+)?\\b",
            "\\bK21(?:\\.[0-9A-Z]+)?\\b",
            "\\bH40(?:\\.[0-9A-Z]+)?\\b",
            "\\bH35(?:\\.[0-9A-Z]+)?\\b"
        ]
    },

    /************************************************************
     * NO_COLOR
     * Antécédents reconnus mais sans priorité utile.
     * Colorisation blanche.
     ************************************************************/
    NO_COLOR: {
        label: "Blanc / sans priorité",
        cssColor: "#FFFFFF",
        wedaColorName: "BLANC",
        terms: [
            /***********************
             * MENTIONS VIDES / NON INFORMATIVES
             ***********************/
            "ras",
            "aucun antecedent",
            "pas d antecedent",
            "neant",
            "non renseigne",
            "non renseignee",
            "bilan normal",
            "surveillance",
            "controle",
            "antecedent non precise",
            "atcd non precise",

            /***********************
             * INFECTIONS AIGUËS ANCIENNES SIMPLES
             ***********************/
            "varicelle",
            "rougeole",
            "oreillons",
            "rubeole",
            "mononucleose",
            "grippe",
            "angine simple",
            "bronchite simple",
            "pneumonie ancienne simple",
            "gastro enterite",
            "covid ancien simple",
            "infection urinaire ancienne simple",
            "cystite ancienne simple",
            "pyelonephrite ancienne simple",
            "zona ancien simple",

            /***********************
             * CHIRURGIES SIMPLES SANS SUIVI PARTICULIER
             ***********************/
            "appendicectomie",
            "appendice enleve",
            "amygdalectomie",
            "amygdales enlevees",
            "vegetations",
            "adenoidectomie",
            "circoncision",
            "kyste sebace opere",
            "lipome retire",
            "grain de beaute retire",
            "kyste pilonidal opere sans recidive",
            "hernie inguinale operee simple",
            "hernie ombilicale operee simple",
            "canal carpien opere sans sequelle",
            "varices operees sans recidive",
            "stripping sans recidive",
            "cataracte operee simple",
            "ivg",
            "curetage simple",
            "vasectomie",
            "ligature trompes",

            /***********************
             * TRAUMATOLOGIE SIMPLE ANCIENNE
             ***********************/
            "fracture ancienne simple",
            "fracture doigt",
            "fracture orteil",
            "fracture clavicule ancienne simple",
            "fracture poignet ancienne simple",
            "fracture cheville ancienne simple",
            "entorse ancienne simple",
            "plaie suturee ancienne",
            "points de suture ancien",
            "brulure ancienne simple",
            "contusion ancienne",
            "ecchymose",
            "petite plaie",
            "platre ancien sans sequelle",

            /***********************
             * SYMPTÔMES ISOLÉS NON DIAGNOSTIQUES
             ***********************/
            "douleur",
            "fatigue",
            "malaise",
            "cephalee isolee",
            "lombalgie simple",
            "cervicalgie simple",
            "constipation ponctuelle",
            "diarrhee ponctuelle",
            "rhume",

            /***********************
             * DERMATOLOGIE MINEURE
             ***********************/
            "verrue",
            "mycose simple",
            "onychomycose simple",
            "eczema ponctuel",
            "urticaire ponctuelle",
            "acne ancienne simple",

            /***********************
             * ALLERGIE / INTOLÉRANCE NON EXPLOITABLE
             ***********************/
            "allergie inconnue non documentee",
            "intolerance digestive legere",
            "intolerance non precisee"
        ]
    },

    /************************************************************
     * TERMES DE NÉGATION
     * À utiliser dans une fenêtre de quelques mots avant le mot-clé.
     ************************************************************/
    negationTerms: [
        "pas de",
        "pas d",
        "absence de",
        "absence d",
        "sans",
        "aucun",
        "aucune",
        "n a pas",
        "ne presente pas",
        "non retrouve",
        "non retrouvee",
        "non connu",
        "non connue",
        "ecarte",
        "ecartee",
        "exclu",
        "exclue",
        "depistage negatif",
        "test negatif",
        "serologie negative",
        "bilan negatif",
        "recherche negative",
        "vih negatif",
        "hepatite negative",
        "pas d allergie connue",
        "aucune allergie connue",
        "allergies non connues",
        "allergie non connue"
    ],

    /************************************************************
     * TERMES FAMILIAUX
     ************************************************************/
    familyTerms: [
        "pere",
        "mere",
        "frere",
        "soeur",
        "fils",
        "fille",
        "enfant",
        "parent",
        "grand pere",
        "grand mere",
        "grand parent",
        "oncle",
        "tante",
        "cousin",
        "cousine",
        "famille",
        "familial",
        "familiale",
        "antecedent familial",
        "atcd familial",
        "terrain familial"
    ],

    familialHighRiskTerms: [
        "brca",
        "brca1",
        "brca2",
        "lynch",
        "syndrome de lynch",
        "polypose familiale",
        "polypose adenomateuse familiale",
        "mort subite familiale",
        "cardiomyopathie familiale",
        "qt long familial",
        "maladie de marfan",
        "marfan",
        "ehlers danlos vasculaire",
        "drepanocytose familiale",
        "hemochromatose familiale"
    ],

    /************************************************************
     * AMPLIFICATEURS DE GRAVITÉ
     ************************************************************/
    severityAmplifiers: [
        "severe",
        "grave",
        "complique",
        "compliquee",
        "recidivant",
        "recidivante",
        "recurrent",
        "recurrente",
        "chronique severe",
        "decompense",
        "decompensee",
        "hospitalisation",
        "reanimation",
        "soins intensifs",
        "coma",
        "choc",
        "insuffisance",
        "stade 4",
        "stade 5",
        "metastatique",
        "bilateral",
        "bilaterale",
        "multiple",
        "multiples",
        "invalidant",
        "invalidante",
        "definitif",
        "definitive",
        "avec sequelles",
        "sequellaire"
    ],

    /************************************************************
     * RÈGLES DE PLAFONNEMENT CONSEILLÉES
     ************************************************************/
    caps: {
        familyDefaultMax: "PRIO_JAUNE",
        familyCancerMax: "PRIO_ORANGE",
        familyHighRiskMax: "PRIO_ORANGE",
        simpleOldTraumaMax: "NO_COLOR",
        simpleOldSurgeryMax: "NO_COLOR",
        noColorCssColor: "#FFFFFF",
        noColorWedaColorName: "BLANC"
    }
};

    const COLOR_DEFS = {
        PRIO_ROUGE: {
            label: 'Rouge',
            css: '#d32f2f',
            names: ['rouge', 'red', 'ecarlate', 'vermeil'],
            rgbs: [[211, 47, 47], [255, 0, 0], [192, 0, 0], [255, 204, 204]]
        },
        PRIO_VIOLET: {
            label: 'Violet',
            css: '#cc66ff',
            names: ['violet', 'purple', 'mauve', 'pourpre'],
            rgbs: [[204, 102, 255], [102, 51, 204], [123, 31, 162], [128, 0, 128], [102, 0, 153]]
        },
        PRIO_ORANGE: {
            label: 'Orange',
            css: '#f57c00',
            names: ['orange', 'ambre'],
            rgbs: [[245, 124, 0], [255, 128, 0], [255, 165, 0], [255, 224, 178]]
        },
        PRIO_JAUNE: {
            label: 'Jaune',
            css: '#fbc02d',
            names: ['jaune', 'yellow'],
            rgbs: [[251, 192, 45], [255, 255, 0], [255, 230, 0], [255, 255, 153], [255, 255, 204]]
        },
        NO_COLOR: {
            label: 'Blanc',
            css: '#ffffff',
            names: ['blanc', 'white', 'aucune couleur', 'sans couleur', 'no color'],
            rgbs: [[255, 255, 255], [250, 250, 250], [245, 245, 245]]
        },
        PRIO_BLANC: {
            label: 'Blanc',
            css: '#ffffff',
            names: ['blanc', 'white', 'aucune couleur', 'sans couleur'],
            rgbs: [[255, 255, 255], [250, 250, 250], [245, 245, 245]]
        }
    };

    const WEDA_PRIORITY_COLOR_TARGETS = {
        PRIO_ROUGE: {
            label: 'rouge',
            preferredHex: '#ffcccc',
            nameRegex: /\b(red|rouge|rose)\b/
        },
        PRIO_VIOLET: {
            label: 'violet',
            preferredHex: '#cc66ff',
            nameRegex: /\b(violet|purple|mauve|pourpre)\b/
        },
        PRIO_ORANGE: {
            label: 'orange',
            preferredHex: '#ffe0b2',
            nameRegex: /\b(orange|abricot|saumon)\b/
        },
        PRIO_JAUNE: {
            label: 'jaune',
            preferredHex: '#ffff99',
            nameRegex: /\b(yellow|jaune)\b/
        },
        NO_COLOR: {
            label: 'blanc',
            preferredHex: '#ffffff',
            nameRegex: /\b(white|blanc|aucune couleur|sans couleur|no color)\b/
        },
        PRIO_BLANC: {
            label: 'blanc',
            preferredHex: '#ffffff',
            nameRegex: /\b(white|blanc|aucune couleur|sans couleur)\b/
        }
    };

    const PRIORITY_RANK = {
        NO_COLOR: 0,
        PRIO_BLANC: 0,
        PRIO_JAUNE: 1,
        PRIO_ORANGE: 2,
        PRIO_VIOLET: 3,
        PRIO_ROUGE: 4
    };

    let compiledAtcdColorRules = null;
    let atcdColorNegationTerms = [];
    let atcdColorFamilyTerms = [];
    let atcdColorFamilialHighRiskTerms = [];
    let atcdColorFamilyCancerTerms = [];
    let atcdColorSeverityAmplifiers = [];
    let atcdColorWeakOrIgnoreTerms = [];
    let atcdColorNoColorTerms = [];

    const HEIDI_ASK_AI_PROMPT = `Rôle : médecin généraliste en France.

Tu dois analyser les antécédents WEDA fournis et produire un résultat structuré pour import automatique CIM-10 dans WEDA.

SOURCE UNIQUE

Utilise uniquement les antécédents fournis.
Ne jamais inventer un diagnostic, une date, une latéralité, un membre de la famille, une chirurgie ou un code CIM-10.
Ne jamais ajouter de commentaire explicatif.
Ne jamais proposer de conduite à tenir.
Ne jamais ajouter d’introduction ou de conclusion.
Ne jamais recopier les consignes du prompt.

OBJECTIF

Pour chaque antécédent non codé :
1. Identifier s’il s’agit d’un antécédent médical, chirurgical ou familial.
2. Choisir le code CIM-10 français le plus adapté.
3. Garder un intitulé clair, court et médicalement exploitable.
4. Extraire les remarques utiles si elles sont explicitement présentes.
5. Extraire la latéralité si elle est explicitement présente.
6. Extraire la date si elle est explicitement présente.

FORMAT DE SORTIE STRICT

Répondre uniquement avec ce format :

BEGIN_ATCD
TYPE|Intitulé|Code CIM-10|Remarques|Latéralité|Date
END_ATCD

Aucun autre texte.
Aucune phrase avant BEGIN_ATCD.
Aucune phrase après END_ATCD.
Aucun commentaire.
Aucune explication.
Aucune liste à puces.
Aucun tableau Markdown.
Ne jamais utiliser de crochets autour du code CIM-10.
Ne jamais écrire [[code]].
Ne jamais écrire [code].
Le code CIM-10 doit être écrit seul dans le champ Code CIM-10.

TYPE

Utiliser exactement un seul des types suivants :

M = antécédent médical personnel.
C = antécédent chirurgical personnel.
F = antécédent familial.

Ne jamais utiliser d’autre type.

FORMAT DES CHAMPS

Chaque ligne doit contenir 6 champs séparés par le caractère |.

Format attendu :
TYPE|Intitulé|Code CIM-10|Remarques|Latéralité|Date

Si une information est absente, laisser le champ vide.
Ne jamais écrire “non précisé”.
Ne jamais écrire “inconnu”.
Ne jamais écrire “aucun”.
Conserver les 6 champs, même si le champ Date est vide.

CATÉGORIES

ANTÉCÉDENTS MÉDICAUX PERSONNELS → TYPE M

Inclure :
maladies, diagnostics, infections anciennes, traumatismes, fractures, plaies, facteurs de risque, pathologies chroniques, pathologies personnelles, antécédents médicaux non chirurgicaux.

Les fractures, plaies, sutures, plâtres, infections anciennes et traumatismes simples sont médicaux, sauf vraie intervention chirurgicale clairement indiquée.

ANTÉCÉDENTS CHIRURGICAUX PERSONNELS → TYPE C

Inclure uniquement les vraies interventions personnelles ou actes invasifs structurants.

Ne pas classer en chirurgical un simple plâtre, une suture simple ou une fracture non opérée.

ANTÉCÉDENTS FAMILIAUX → TYPE F

Classer en familial dès qu’un membre de la famille est mentionné.

Membres familiaux :
père, mère, frère, sœur, soeur, fils, fille, enfant, parent, grand-père, grand-mère, oncle, tante, cousin, cousine, famille.

Format de l’intitulé familial :
Membre: pathologie


RÈGLES DE CLASSEMENT

Si pathologie personnelle + vraie intervention explicite :
séparer en deux lignes si les deux informations sont clairement présentes.

Si doute entre médical et chirurgical :
choisir médical, sauf si une vraie intervention est explicitement mentionnée.

Si doute entre personnel et familial :
choisir familial dès qu’un membre de la famille est mentionné.

Ne jamais créer une allergie.
Ne jamais créer un traitement.
Ne jamais créer une vaccination.
Ne jamais créer un vaccin.
Ne jamais créer une ALD.
Ne jamais créer un mode de vie.
Ne jamais créer un facteur social.

INTITULÉ

L’intitulé doit être clair, court et médical.
Développer les abréviations si le sens est clair :
HTA → Hypertension artérielle
TVP → Thrombose veineuse profonde
AVC → Accident vasculaire cérébral
AIT → Accident ischémique transitoire
IDM → Infarctus du myocarde
BPCO → Bronchopneumopathie chronique obstructive
SAOS → Syndrome d’apnées obstructives du sommeil

Ne pas inventer un développement si l’abréviation est ambiguë.

CODE CIM-10

Choisir un code CIM-10 français adapté.
Utiliser un code suffisamment précis si possible.
Si le code exact est incertain, choisir un code parent cohérent.
Ne jamais écrire ERREUR CIM10.
Ne jamais laisser le champ Code CIM-10 vide si l’antécédent est conservé.
Ne jamais mettre de crochets autour du code.

REMARQUES

Mettre uniquement les détails explicitement présents et utiles.
Ne pas répéter l’intitulé dans les remarques.
Ne pas inventer de remarque.

LATÉRALITÉ

Utiliser uniquement :
droite
gauche
bilatérale

Si aucune latéralité explicite :
laisser vide.

DATES

Format de date obligatoire :
JJ/MM/AAAA

Si seule l’année est connue :
01/01/AAAA

Si mois + année sont connus :
01/MM/AAAA

Ne jamais inventer une date.
Si aucune date n’est disponible :
laisser vide.

CONTRAINTES DE SORTIE

Répondre uniquement entre BEGIN_ATCD et END_ATCD.
Chaque antécédent sur une seule ligne.
Ne jamais mettre de ligne vide entre les antécédents.
Ne jamais ajouter de commentaire.
Ne jamais ajouter d’explication.
Ne jamais écrire les noms des rubriques WEDA.
Ne jamais écrire ANTÉCÉDENTS MÉDICAUX, ANTÉCÉDENTS CHIRURGICAUX ou ANTÉCÉDENTS FAMILIAUX.
Ne jamais utiliser de Markdown.
Ne jamais numéroter les lignes.
Ne jamais commencer une ligne par un tiret.

Si aucun antécédent exploitable n’est trouvé :
BEGIN_ATCD
END_ATCD`;

    /************************************************************
     * OUTILS
     ************************************************************/

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    function nowIso() {
        try { return new Date().toISOString(); } catch (_) { return String(Date.now()); }
    }

    function nowMs() {
        return Date.now();
    }

    function log(...args) {
        console.log(LOG_PREFIX, ...args);
    }

    function warn(...args) {
        console.warn(LOG_PREFIX, ...args);
    }

    function getOrCreateTabId() {
        try {
            let id = sessionStorage.getItem(SESSION_TAB_ID);
            if (!id) {
                id = 'tab_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
                sessionStorage.setItem(SESSION_TAB_ID, id);
            }
            return id;
        } catch (_) {
            return 'tab_fallback_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
        }
    }

    const TAB_ID = getOrCreateTabId();

    let heidiAutoFinalizeLastText = '';
    let heidiAutoFinalizeLastChangedAt = 0;
    let heidiVisibleLastText = '';
    let heidiVisibleLastChangedAt = 0;
    let heidiWatcherRunnerBlockedLogKey = '';
    let heidiWatcherPreviousResultLogKey = '';
    let heidiWatcherUnparsedLogKey = '';
    let cachedLmStudioModelId = '';

    function isWeda() {
        return location.hostname === HOST_WEDA;
    }

    function isHeidi() {
        return location.hostname === HOST_HEIDI;
    }

    function isTopLevelWindow() {
        try {
            return window.self === window.top;
        } catch (_) {
            return true;
        }
    }

    function gmGetJson(key, fallback = null) {
        try {
            const raw = GM_getValue(key, null);
            if (raw === null || raw === undefined || raw === '') return fallback;
            if (typeof raw === 'object') return raw;
            return JSON.parse(raw);
        } catch (e) {
            warn('Lecture GM impossible', key, e);
            return fallback;
        }
    }

    function gmSetJson(key, value) {
        try {
            GM_setValue(key, JSON.stringify(value));
        } catch (e) {
            warn('Écriture GM impossible', key, e);
        }
    }

    function parseGmJsonValue(value, fallback = null) {
        try {
            if (value === null || value === undefined || value === '') return fallback;
            if (typeof value === 'object') return value;
            return JSON.parse(value);
        } catch (_) {
            return fallback;
        }
    }

    function getJob() {
        return gmGetJson(KEY_JOB, null);
    }

    function dispatchLocalStorageBridgeEvent(key, value) {
        try {
            window.dispatchEvent(new StorageEvent('storage', {
                key,
                oldValue: null,
                newValue: value,
                url: location.href,
                storageArea: localStorage
            }));
            return true;
        } catch (_) {
            try {
                const event = new Event('storage');
                Object.defineProperty(event, 'key', { value: key });
                Object.defineProperty(event, 'newValue', { value });
                Object.defineProperty(event, 'url', { value: location.href });
                window.dispatchEvent(event);
                return true;
            } catch (_) {
                return false;
            }
        }
    }

    function setJob(job) {
        gmSetJson(KEY_JOB, job);
        gmSetJson(KEY_LAST_REPORT, job);
        publishBatchBridgeReport(job);
        log('Job', job);

        if (isImportLogEnabled() && job && job.status) {
            const duplicateCounts = getDuplicateSkipCounts(job);
            logImportEvent('info', 'job_status', 'État du job : ' + job.status, {
                jobId: job.id || '',
                status: job.status,
                itemCount: job.itemCount || 0,
                importIndex: job.importIndex || 0,
                parsedCount: Array.isArray(job.parsedAtcd) ? job.parsedAtcd.length : 0,
                importedCount: Array.isArray(job.imported) ? job.imported.length : 0,
                duplicatesSkippedCount: duplicateCounts.regular,
                duplicatesSkippedTotalCount: duplicateCounts.total,
                duplicatesSkippedQualityRepairCount: duplicateCounts.qualityRepair,
                errorCount: Array.isArray(job.errors) ? job.errors.length : 0
            });
        }
    }

    function publishBatchBridgeReport(job) {
        if (!isWeda() || !job || !job.status) return null;

        const expectedPatientId = getExpectedJobPatDk(job);
        const currentPatientId = getCurrentWedaPatDk();
        const duplicateCounts = getDuplicateSkipCounts(job);
        const importedQualityRepairCount = Array.isArray(job.imported)
            ? job.imported.filter(entry => entry && entry.qualityRepair).length
            : Number(job.importedQualityRepairCount || 0);

        const report = {
            ...job,
            batchId: job.batchId || '',
            patientId: job.batchPatientId || job.sourcePatientId || job.patientId || extractWedaPatDkFromUrl(job.wedaImportUrl || job.patientUrl || '') || '',
            patientName: job.batchPatientName || job.patientName || '',
            expectedPatientId,
            currentPatientId,
            bridgeTabOwnsJob: isThisWedaWorkerForJob(job) || (job.sourceWedaTabId === TAB_ID),
            bridgeTabCanImport: canThisTabRunWedaImport(job),
            bridgeTabPatientMatches: !!(expectedPatientId && currentPatientId && sameWedaPatDk(expectedPatientId, currentPatientId)),
            ts: nowMs(),
            bridgeSource: 'antecedents-cim10-weda-LMstudio-avec-colorisation',
            bridgeVersion: VERSION_AUTO_ATCD_CIM10_LMSTUDIO,
            bridgeTabId: TAB_ID,
            bridgeUrl: location.href,
            errorCount: Array.isArray(job.errors) ? job.errors.length : Number(job.errorCount || 0),
            parsedCount: Array.isArray(job.parsedAtcd) ? job.parsedAtcd.length : Number(job.parsedCount || 0),
            importedCount: Array.isArray(job.imported) ? job.imported.length : Number(job.importedCount || 0),
            duplicatesSkippedCount: duplicateCounts.regular,
            duplicatesSkippedTotalCount: duplicateCounts.total,
            duplicatesSkippedQualityRepairCount: duplicateCounts.qualityRepair,
            importedQualityRepairCount,
            targetedReimportCount: importedQualityRepairCount + duplicateCounts.qualityRepair,
        };

        try {
            const payload = JSON.stringify(report);
            localStorage.setItem(LOCALSTORAGE_BATCH_REPORT_KEY, payload);
            dispatchLocalStorageBridgeEvent(LOCALSTORAGE_BATCH_REPORT_KEY, payload);
        } catch (_) {}

        return report;
    }

    function publishBatchSourceCloseSignal(job, reason = '') {
        if (!isWeda() || !job || !job.batchId || !job.batchPatientId) return null;

        const signal = {
            batchId: job.batchId || '',
            patientId: job.batchPatientId || '',
            patientName: job.batchPatientName || '',
            jobId: job.id || '',
            status: job.status || '',
            reason: reason || '',
            sourceWedaTabId: job.sourceWedaTabId || '',
            wedaWorkerTabId: job.wedaWorkerTabId || '',
            closingWedaWorkerTabId: TAB_ID,
            ts: nowMs(),
            url: location.href
        };

        try {
            const payload = JSON.stringify(signal);
            localStorage.setItem(LOCALSTORAGE_BATCH_SOURCE_CLOSE_KEY, payload);
            dispatchLocalStorageBridgeEvent(LOCALSTORAGE_BATCH_SOURCE_CLOSE_KEY, payload);
        } catch (_) {}

        return signal;
    }

    function recoverStaleWedaExtraction(job, source = '') {
        if (!job || job.status !== 'EXTRACTING_WEDA') return null;
        if (job.sourceWedaTabId && job.sourceWedaTabId !== TAB_ID) return null;
        if (job.extractingWedaTabId === TAB_ID && window.__AUTO_ATCD_CIM10_LMSTUDIO_WEDA_EXTRACT_RUNNING__) return null;

        const updatedAtMs = Date.parse(job.updatedAt || job.createdAt || '');
        if (updatedAtMs && nowMs() - updatedAtMs < EXTRACTING_WEDA_STALE_MS) return null;

        job.status = 'EXTRACT_WEDA';
        job.updatedAt = nowIso();
        job.extractionRecoveredAt = nowIso();
        job.extractionRecoveredBy = source || 'watchdog';
        setJob(job);

        logImportEvent('warning', 'extract_weda_recovery', 'Extraction WEDA bloquée avant appel LM Studio : relance automatique.', {
            jobId: job.id || '',
            source,
            staleForMs: updatedAtMs ? nowMs() - updatedAtMs : null,
            url: location.href
        });

        return job;
    }

    function clearJob() {
        try { GM_deleteValue(KEY_JOB); } catch (_) {}
    }

    function makeJobId() {
        return 'atcd_cim10_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
    }

    function normalizeSpaces(text) {
        return String(text || '')
            .replace(/\u00a0/g, ' ')
            .replace(/[ \t]+/g, ' ')
            .replace(/\s+\n/g, '\n')
            .replace(/\n\s+/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    function normalizeForMatch(text) {
        return String(text || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/œ/g, 'oe')
            .replace(/æ/g, 'ae')
            .replace(/[’']/g, ' ')
            .replace(/[-_/]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function escapeHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function escapeRegex(text) {
        return String(text || '').replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
    }

    function ownerWin(el) {
        return (el && el.ownerDocument && el.ownerDocument.defaultView) || window;
    }

    function isVisible(el) {
        if (!el) return false;
        const win = ownerWin(el);
        const style = win.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }

    async function waitFor(fn, timeoutMs = 10000, intervalMs = 250) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            try {
                const result = fn();
                if (result) return result;
            } catch (_) {}
            await sleep(intervalMs);
        }
        return null;
    }

    function isEditableTarget(target) {
        if (!target) return false;
        const el = target.nodeType === 1 ? target : target.parentElement;
        if (!el) return false;
        return !!el.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""], [role="textbox"]');
    }

    function showBadge(message, options = {}) {
        try {
            const id = 'auto-atcd-cim10-lmstudio-badge';
            const old = document.getElementById(id);
            if (old) old.remove();

            const badge = document.createElement('div');
            badge.id = id;
            badge.textContent = message;
            badge.style.position = 'fixed';
            badge.style.left = '14px';
            badge.style.bottom = '14px';
            badge.style.zIndex = '2147483647';
            badge.style.background = options.error ? '#7a1020' : '#12395f';
            badge.style.color = '#ffffff';
            badge.style.fontWeight = '700';
            badge.style.fontSize = '14px';
            badge.style.fontFamily = 'Arial, sans-serif';
            badge.style.lineHeight = '1.35';
            badge.style.padding = '10px 12px';
            badge.style.borderRadius = '8px';
            badge.style.boxShadow = '0 4px 14px rgba(0,0,0,0.25)';
            badge.style.maxWidth = '620px';
            badge.style.whiteSpace = 'pre-wrap';
            badge.style.pointerEvents = 'none';
            document.documentElement.appendChild(badge);

            const duration = options.duration === undefined ? 6000 : options.duration;
            if (duration > 0) {
                setTimeout(() => {
                    try { badge.remove(); } catch (_) {}
                }, duration);
            }
        } catch (_) {}
    }

    /************************************************************
     * JOURNAL D'IMPORT
     ************************************************************/

    function isImportLogEnabled() {
        return gmGetJson(KEY_IMPORT_LOG_ENABLED, false) === true;
    }

    function setImportLogEnabled(enabled) {
        gmSetJson(KEY_IMPORT_LOG_ENABLED, !!enabled);
        showBadge(
            enabled
                ? 'Bouton journal maintenu visible.\nRaccourci : Ctrl+Alt+L'
                : 'Bouton journal en mode automatique.\nSeules les erreurs et alertes utiles restent enregistrées.',
            { duration: 5000 }
        );
        injectImportLogButtonIfUseful();
        return !!enabled;
    }

    function normalizeImportLogLevel(level) {
        const normalized = String(level || 'info').toLowerCase();
        return normalized === 'warn' ? 'warning' : normalized;
    }

    function isUsefulImportWarningPhase(phase) {
        const name = String(phase || '');
        return /^(open_weda_|extract_weda_dom_missing|extract_weda_recovery|delete_unwanted_atcd|patient_identity_mismatch)/.test(name)
            || /^(heidi$|heidi_retry|heidi_empty_payload|heidi_unparsed_result|heidi_runner_blocked|heidi_runner_takeover|heidi_force_finalize_visible_result|parse_heidi_result)/.test(name)
            || /^(worker_lock|worker_tab_takeover|import_error|import_progress_repaired|import_stall_recovery|import_stall_skip_to_quality|import_stall_force_quality|import_stall_recovery_failed|import_flow_recovery_scheduled|import_done_with_errors)/.test(name)
            || /^(quality_control|quality_control_stalled|quality_control_failed|quality_control_unrecoverable|quality_reimport_error|quality_full_retry)/.test(name)
            || /^(cim10_code_correction|cim10_category_fallback)/.test(name)
            || /^(comment_date_repair_conflict|comment_date_repair_failed)/.test(name)
            || /^(weda_duplicate_cleanup|weda_duplicate_cleanup_failed)/.test(name)
            || /^(weda_color|weda_color_failed)/.test(name)
            || /^(weda_no_known_allergy|weda_no_known_allergy_failed)/.test(name)
            || /^post_import_missing$/.test(name)
            || /^fill_popup_date$/.test(name)
            || /^familial_fields$/.test(name)
            || /^drop_weda_retry$/.test(name);
    }

    function shouldKeepImportLogEvent(level, phase) {
        const normalizedLevel = normalizeImportLogLevel(level);
        if (normalizedLevel === 'error') return true;
        if (normalizedLevel !== 'warning') return false;
        return isUsefulImportWarningPhase(phase);
    }

    function shouldKeepImportLogEntry(entry) {
        return !!(entry && shouldKeepImportLogEvent(entry.level, entry.phase));
    }

    function getImportLogs() {
        const logs = gmGetJson(KEY_IMPORT_LOGS, []);
        return Array.isArray(logs)
            ? logs.filter(shouldKeepImportLogEntry)
            : [];
    }

    function setImportLogs(logs) {
        const filtered = (Array.isArray(logs) ? logs : [])
            .filter(shouldKeepImportLogEntry);
        gmSetJson(KEY_IMPORT_LOGS, filtered.slice(-MAX_IMPORT_LOGS));
    }

    function clearImportLogs() {
        try { GM_deleteValue(KEY_IMPORT_LOGS); } catch (_) {}
        showBadge('Journal d’import effacé.', { duration: 4000 });
        refreshImportLogPanelIfOpen();
        injectImportLogButtonIfUseful();
        return true;
    }

    function summarizeImportItem(item) {
        if (!item) return null;

        return {
            type: item.type || '',
            section: item.section || '',
            label: item.label || sectionLabel(item.section),
            description: item.description || '',
            code: item.code || '',
            familyMember: item.familyMember || '',
            lateralite: item.lateralite || '',
            date: item.date || '',
            remarks: item.remarks ? compactLogValue(item.remarks, 0) : ''
        };
    }

    function getDuplicateSkipCounts(job) {
        const duplicates = Array.isArray(job && job.duplicatesSkipped) ? job.duplicatesSkipped : [];
        const total = duplicates.length || Number(job && job.duplicatesSkippedTotalCount || job && job.duplicatesSkippedCount || 0);
        const qualityRepair = duplicates.length
            ? duplicates.filter(entry => entry && entry.qualityRepair).length
            : Number(job && job.duplicatesSkippedQualityRepairCount || 0);
        const regular = Math.max(0, total - qualityRepair);

        return { total, regular, qualityRepair };
    }

    function compactLogValue(value, depth = 0) {
        if (value == null) return value;
        if (typeof value === 'string') return value.length > IMPORT_LOG_STRING_LIMIT ? value.slice(0, IMPORT_LOG_STRING_LIMIT) + '...' : value;
        if (typeof value === 'number' || typeof value === 'boolean') return value;
        if (typeof value === 'function') return '[function]';
        if (depth > 2) return '[object]';

        if (Array.isArray(value)) {
            const sample = value.slice(0, IMPORT_LOG_ARRAY_LIMIT).map(item => compactLogValue(item, depth + 1));
            if (value.length > sample.length) sample.push(`... +${value.length - sample.length}`);
            return sample;
        }

        if (typeof Element !== 'undefined' && value instanceof Element) {
            return {
                tag: String(value.tagName || '').toLowerCase(),
                id: value.id || '',
                className: String(value.className || '').slice(0, 160),
                title: value.getAttribute ? String(value.getAttribute('title') || '').slice(0, 160) : ''
            };
        }

        if (typeof value === 'object') {
            const out = {};
            let kept = 0;
            Object.keys(value).forEach(key => {
                if (kept >= IMPORT_LOG_OBJECT_KEY_LIMIT) return;
                if (/^(el|element|anchor|hand|target|validButton|body|html|document|window|raw|text|payload|heidiPayload|heidiResultText|extractedText)$/i.test(key)) return;
                out[key] = compactLogValue(value[key], depth + 1);
                kept += 1;
            });
            return out;
        }

        return String(value);
    }

    function summarizeImportLogJob(job) {
        if (!job || typeof job !== 'object') return null;
        const expectedPatientId = getExpectedJobPatDk(job);
        const currentTabPatientId = isWeda() ? getCurrentWedaPatDk() : '';
        const currentTabIsWorkerForJob = isThisWedaWorkerForJob(job);
        const currentTabIsSourceForJob = !!(isWeda() && job.sourceWedaTabId === TAB_ID);
        const currentTabOwnsJob = currentTabIsWorkerForJob || currentTabIsSourceForJob;
        const currentTabPatientMatches = !!(expectedPatientId && currentTabPatientId && sameWedaPatDk(expectedPatientId, currentTabPatientId));
        const currentTabPatientMismatch = !!(expectedPatientId && currentTabPatientId && !sameWedaPatDk(expectedPatientId, currentTabPatientId));
        const duplicateCounts = getDuplicateSkipCounts(job);
        const importedQualityRepairCount = Array.isArray(job.imported)
            ? job.imported.filter(entry => entry && entry.qualityRepair).length
            : Number(job.importedQualityRepairCount || 0);

        return {
            id: job.id || '',
            status: job.status || '',
            batchId: job.batchId || '',
            patientId: job.batchPatientId || job.sourcePatientId || '',
            expectedPatientId,
            currentPatientId: currentTabPatientId,
            currentTabPatientId,
            currentTabOwnsJob,
            currentTabIsWorkerForJob,
            currentTabIsSourceForJob,
            currentTabCanImport: canThisTabRunWedaImport(job),
            currentTabPatientMatches,
            currentTabPatientMismatch,
            sourceWedaTabId: job.sourceWedaTabId || '',
            wedaWorkerTabId: job.wedaWorkerTabId || '',
            thisTabId: TAB_ID,
            importIndex: Number(job.importIndex || 0),
            parsedCount: Array.isArray(job.parsedAtcd) ? job.parsedAtcd.length : Number(job.parsedCount || 0),
            importedCount: Array.isArray(job.imported) ? job.imported.length : Number(job.importedCount || 0),
            duplicatesSkippedCount: duplicateCounts.regular,
            duplicatesSkippedTotalCount: duplicateCounts.total,
            duplicatesSkippedQualityRepairCount: duplicateCounts.qualityRepair,
            importedQualityRepairCount,
            targetedReimportCount: importedQualityRepairCount + duplicateCounts.qualityRepair,
            skippedCount: Array.isArray(job.skipped) ? job.skipped.length : Number(job.skippedCount || 0),
            errorCount: Array.isArray(job.errors) ? job.errors.length : Number(job.errorCount || 0),
            qualityFullRetryCount: Number(job.qualityFullRetryCount || 0),
            qualityControlPasses: Number(job.qualityControlPasses || 0),
            qualityControlResolvedByTargetedReimport: !!job.qualityControlResolvedByTargetedReimport,
            updatedAt: job.updatedAt || ''
        };
    }

    function summarizeQualityEntryForLog(entry) {
        if (!entry || typeof entry !== 'object') return null;
        return {
            key: entry.key || '',
            item: summarizeImportItem(entry.item),
            expectedCodes: entry.expectedCodes || [],
            block: entry.block ? summarizeDiagnosticBlock(entry.block) : null,
            diagnostic: entry.diagnostic ? compactLogValue(entry.diagnostic, 1) : null
        };
    }

    function summarizeQualityReportForLog(report) {
        if (!report || typeof report !== 'object') return null;
        return {
            at: report.at || '',
            expectedCount: Number(report.expectedCount || 0),
            foundCount: Number(report.foundCount || 0),
            missingCount: Number(report.missingCount || 0),
            blockCount: Number(report.blockCount || 0),
            noControleQualityBlockCount: Number(report.noControleQualityBlockCount || 0),
            familialNoControleBlockCount: Number(report.familialNoControleBlockCount || 0),
            missing: Array.isArray(report.missing)
                ? report.missing.slice(0, IMPORT_LOG_ARRAY_LIMIT).map(summarizeQualityEntryForLog)
                : [],
            foundSample: Array.isArray(report.found)
                ? report.found.slice(0, 3).map(summarizeQualityEntryForLog)
                : []
        };
    }

    function summarizeImportLogDetails(details = {}) {
        const raw = details && typeof details === 'object' && !Array.isArray(details)
            ? details
            : { value: details };
        let job = getJob();
        const out = {
            job: summarizeImportLogJob(job)
        };

        [
            'jobId',
            'status',
            'source',
            'reason',
            'phase',
            'familyMember',
            'familyMemberKind',
            'familyMemberBranch',
            'date',
            'selector',
            'dateField',
            'allergyCategories',
            'fallbackValue',
            'batchId',
            'patientId',
            'currentPatientId',
            'expectedPatientId',
            'importIndex',
            'parsedCount',
            'importedCount',
            'duplicatesSkippedCount',
            'duplicatesSkippedTotalCount',
            'duplicatesSkippedQualityRepairCount',
            'importedQualityRepairCount',
            'targetedReimportCount',
            'skippedCount',
            'skippedFamilialAlreadyCodedCount',
            'historicalErrorCount',
            'missingCount',
            'expectedCount',
            'foundCount',
            'pass',
            'passes',
            'maxPasses',
            'stalledPasses',
            'elapsedMs',
            'stalledForMs',
            'recoveryCount',
            'filename',
            'lineno',
            'colno',
            'message',
        ].forEach(key => {
            if (raw[key] !== undefined) out[key] = compactLogValue(raw[key], 0);
        });

        if (raw.item) out.item = summarizeImportItem(raw.item);
        if (raw.currentItem) out.currentItem = summarizeImportItem(raw.currentItem);
        if (raw.skippedItem) out.skippedItem = summarizeImportItem(raw.skippedItem);
        if (raw.items) out.itemsSample = Array.isArray(raw.items) ? raw.items.slice(0, 3).map(summarizeImportItem) : compactLogValue(raw.items);
        if (raw.missingSummary) out.missingSummary = raw.missingSummary;
        if (raw.selectedOption) out.selectedOption = compactLogValue(raw.selectedOption, 1);
        if (raw.candidates) out.candidates = compactLogValue(raw.candidates, 1);
        if (raw.availableOptions) out.availableOptions = compactLogValue(raw.availableOptions, 1);
        if (raw.selectCandidates) out.selectCandidates = compactLogValue(raw.selectCandidates, 1);
        if (raw.select) out.select = compactLogValue(raw.select, 1);

        const quality = raw.qualityReport || raw.report;
        if (quality && typeof quality === 'object' && ('expectedCount' in quality || 'missingCount' in quality || 'foundCount' in quality)) {
            out.qualityReport = summarizeQualityReportForLog(quality);
        }

        if (raw.cim10) out.cim10 = compactLogValue(raw.cim10, 1);
        if (raw.progress) out.progress = compactLogValue(raw.progress, 1);
        if (raw.dom) out.dom = compactLogValue(raw.dom, 1);
        if (raw.guard) out.guard = compactLogValue(raw.guard, 1);
        if (raw.lock) out.lock = compactLogValue(raw.lock, 1);
        if (raw.stack) out.stackTop = summarizeStackForImportLog(raw.stack);

        if (raw.error !== undefined) out.error = compactLogValue(raw.error, 0);
        if (raw.value !== undefined) out.value = compactLogValue(raw.value, 0);

        return out;
    }

    function summarizeStackForImportLog(stack) {
        const lines = String(stack || '')
            .split(/\r?\n/)
            .map(line => normalizeSpaces(line))
            .filter(Boolean)
            .filter(line => !/node_modules|zone\.js|jquery|FWNotif\.js/i.test(line))
            .slice(0, 2);

        const summary = lines.join(' | ');
        return summary.length > IMPORT_LOG_STACK_LIMIT ? summary.slice(0, IMPORT_LOG_STACK_LIMIT) + '...' : summary;
    }

    function compactImportLogMessage(message) {
        const raw = normalizeSpaces(String(message || ''));
        return raw.length > IMPORT_LOG_MESSAGE_LIMIT ? raw.slice(0, IMPORT_LOG_MESSAGE_LIMIT) + '...' : raw;
    }

    function getImportLogPage() {
        return String(location.hostname || '') + String(location.pathname || '');
    }

    function getImportLogFingerprint(entry) {
        const item = entry.item || {};
        return [
            entry.level || '',
            entry.phase || '',
            entry.jobId || '',
            entry.importIndex === undefined ? '' : String(entry.importIndex),
            item.code || '',
            item.description || '',
            entry.message || ''
        ].join('|');
    }

    function logImportEvent(level, phase, message, details = {}) {
        const normalizedLevel = normalizeImportLogLevel(level);
        if (!shouldKeepImportLogEvent(normalizedLevel, phase)) return null;

        const job = getJob();
        const rawDetails = details && typeof details === 'object' ? details : {};
        const item = rawDetails.item || rawDetails.atcd || null;

        const entry = {
            at: nowIso(),
            lastAt: '',
            level: normalizedLevel,
            phase: String(phase || ''),
            message: compactImportLogMessage(message),
            host: location.hostname,
            page: getImportLogPage(),
            tab: String(TAB_ID || '').slice(-8),
            jobId: (rawDetails.jobId || (job && job.id) || ''),
            importIndex: rawDetails.importIndex !== undefined ? rawDetails.importIndex : (job && job.importIndex !== undefined ? job.importIndex : ''),
            item: summarizeImportItem(item),
            details: summarizeImportLogDetails(details),
            repeat: 1
        };
        entry.fp = getImportLogFingerprint(entry);

        const logs = getImportLogs();
        const last = logs[logs.length - 1];
        const lastAtMs = last && last.at ? Date.parse(last.lastAt || last.at) : 0;
        if (last && last.fp === entry.fp && lastAtMs && nowMs() - lastAtMs < IMPORT_LOG_DEDUP_MS) {
            last.repeat = Number(last.repeat || 1) + 1;
            last.lastAt = entry.at;
            setImportLogs(logs);
            refreshImportLogPanelIfOpen();
            injectImportLogButtonIfUseful();
            return last;
        }

        logs.push(entry);
        setImportLogs(logs);

        if (isImportLogEnabled() || normalizedLevel === 'error' || normalizedLevel === 'warning') {
            const consoleFn = normalizedLevel === 'error' ? console.error : (normalizedLevel === 'warning' ? console.warn : console.log);
            consoleFn(LOG_PREFIX, 'IMPORT_LOG', entry);
        }

        refreshImportLogPanelIfOpen();
        injectImportLogButtonIfUseful();
        return entry;
    }

    function logImportDiagnostic(phase, message, details = {}) {
        if (!IMPORT_DIAGNOSTIC_TRACE_ENABLED) return null;

        return logImportEvent('info', 'diag_' + String(phase || 'trace'), message, details);
    }

    function getImportLogStats() {
        const logs = getImportLogs();
        return {
            total: logs.length,
            errors: logs.filter(entry => entry.level === 'error').length,
            warnings: logs.filter(entry => entry.level === 'warning').length
        };
    }

    function copyTextToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
        }

        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            document.documentElement.appendChild(textarea);
            textarea.focus();
            textarea.select();
            const ok = document.execCommand('copy');
            textarea.remove();
            return Promise.resolve(!!ok);
        } catch (_) {
            return Promise.resolve(false);
        }
    }

    function formatImportLogLine(entry) {
        const item = entry.item || {};
        const member = item.familyMember ? ` | ${item.familyMember}` : '';
        const code = item.code ? ` [${item.code}]` : '';
        const desc = item.description ? ` | ${item.description}${code}` : '';
        const repeat = Number(entry.repeat || 1) > 1 ? ` | x${entry.repeat}` : '';
        return `${entry.at}${entry.lastAt ? ' -> ' + entry.lastAt : ''} | ${entry.level.toUpperCase()} | ${entry.phase}${member}${desc}${repeat} | ${entry.message}`;
    }

    function compactImportLogEntryForExport(entry) {
        const item = entry.item || {};
        const details = entry.details || {};
        const ctx = {};

        [
            'status',
            'reason',
            'message',
            'date',
            'selector',
            'dateField',
            'source',
            'expectedPatientId',
            'currentPatientId',
            'patientId',
            'batchId',
            'parsedCount',
            'importedCount',
            'duplicatesSkippedCount',
            'duplicatesSkippedTotalCount',
            'duplicatesSkippedQualityRepairCount',
            'importedQualityRepairCount',
            'targetedReimportCount',
            'skippedCount',
            'missingCount',
            'missingSummary',
            'expectedCount',
            'foundCount',
            'stalledForMs',
            'recoveryCount',
            'pass',
            'passes',
            'maxPasses'
        ].forEach(key => {
            if (details[key] !== undefined && details[key] !== '') ctx[key] = details[key];
        });

        if (details.progress) {
            ctx.progress = {
                status: details.progress.status || '',
                importIndex: details.progress.importIndex,
                parsedCount: details.progress.parsedCount,
                importedCount: details.progress.importedCount,
                errorCount: details.progress.errorCount,
                stalledForMs: details.progress.stalledForMs
            };
        }

        if (details.qualityReport) {
            ctx.quality = {
                expected: details.qualityReport.expectedCount,
                found: details.qualityReport.foundCount,
                missing: details.qualityReport.missingCount
            };
        }

        if (details.filename) {
            ctx.origin = [
                String(details.filename || '').split('/').slice(-2).join('/'),
                details.lineno ? `L${details.lineno}` : ''
            ].filter(Boolean).join(':');
        }

        if (details.error !== undefined) ctx.error = details.error;

        return {
            at: entry.at,
            lastAt: entry.lastAt || undefined,
            repeat: Number(entry.repeat || 1),
            level: entry.level,
            phase: entry.phase,
            page: entry.page || entry.host || '',
            jobId: entry.jobId || '',
            importIndex: entry.importIndex,
            item: item.description ? {
                section: item.section || '',
                familyMember: item.familyMember || '',
                description: item.description || '',
                code: item.code || ''
            } : undefined,
            message: entry.message,
            ctx
        };
    }

    function getImportLogEntryMs(entry) {
        const ms = Date.parse(String(entry && entry.at ? entry.at : ''));
        return Number.isFinite(ms) ? ms : 0;
    }

    function getJobBoundaryMsForLogScope(job) {
        if (!job || typeof job !== 'object') return 0;

        const candidates = [
            job.createdAt,
            job.startedAt,
            job.startedAtIso
        ];

        for (const value of candidates) {
            const ms = Date.parse(String(value || ''));
            if (Number.isFinite(ms) && ms > 0) return ms;
        }

        const idMatch = String(job.id || '').match(/atcd_cim10_(\d{10,})_/);
        if (idMatch) {
            const ms = Number(idMatch[1]);
            if (Number.isFinite(ms) && ms > 0) return ms;
        }

        const updatedMs = Date.parse(String(job.updatedAt || ''));
        if (Number.isFinite(updatedMs) && updatedMs > 0) return updatedMs;

        return 0;
    }

    function scopeImportLogsForCompactExport(allLogs, report, options = {}) {
        const logs = Array.isArray(allLogs) ? allLogs : [];
        if (options && options.allJobs) {
            return {
                scope: 'all_jobs',
                logs,
                reason: 'manual_all_jobs'
            };
        }

        const jobId = String(report && report.id ? report.id : '');
        if (jobId) {
            const sameJob = logs.filter(entry => String(entry && entry.jobId ? entry.jobId : '') === jobId);
            if (sameJob.length) {
                return {
                    scope: 'job',
                    logs: sameJob,
                    reason: 'job_id'
                };
            }
        }

        const boundaryMs = getJobBoundaryMsForLogScope(report);
        if (boundaryMs) {
            const sinceJob = logs.filter(entry => {
                const entryMs = getImportLogEntryMs(entry);
                return entryMs && entryMs >= boundaryMs - 5000;
            });
            if (sinceJob.length) {
                return {
                    scope: 'job_window',
                    logs: sinceJob,
                    reason: 'job_time'
                };
            }
        }

        return {
            scope: jobId ? 'all_jobs_fallback' : 'all_jobs',
            logs,
            reason: jobId ? 'no_matching_job_log' : 'no_current_job'
        };
    }

    function buildCompactImportLogExport(logs = getImportLogs(), options = {}) {
        const allLogs = Array.isArray(logs) ? logs : getImportLogs();
        const currentJob = getJob();
        const lastReport = currentJob || gmGetJson(KEY_LAST_REPORT, null) || null;
        const scoped = scopeImportLogsForCompactExport(allLogs, lastReport, options);
        const list = scoped.logs.slice(-IMPORT_LOG_EXPORT_LIMIT);
        const header = {
            kind: 'AUTO_ATCD_CIM10_LMSTUDIO_DEBUG_LOG_COMPACT',
            version: VERSION_AUTO_ATCD_CIM10_LMSTUDIO,
            exportedAt: nowIso(),
            count: list.length,
            totalStored: getImportLogs().length,
            scopedStored: scoped.logs.length,
            scope: scoped.scope,
            scopeReason: scoped.reason,
            job: summarizeImportLogJob(lastReport)
        };

        return [
            JSON.stringify(header),
            '---',
            list.map(formatImportLogLine).join('\n'),
            '--- JSON compact ---',
            JSON.stringify(list.map(compactImportLogEntryForExport))
        ].join('\n');
    }

    function summarizeJobError(errorEntry) {
        if (!errorEntry) return 'Erreur inconnue';
        if (typeof errorEntry === 'string') return errorEntry;

        const item = errorEntry.item || {};
        const itemText = item.description
            ? `${item.familyMember ? item.familyMember + ': ' : ''}${item.description}${item.code ? ' [' + item.code + ']' : ''}`
            : '';
        const message = String(errorEntry.message || errorEntry.error || errorEntry.reason || 'Erreur non détaillée');

        return itemText ? `${itemText} : ${message}` : message;
    }

    function summarizeJobErrors(errors, limit = 3) {
        const list = Array.isArray(errors) ? errors : [];
        const lines = list.slice(-limit).map((entry, index) => `${index + 1}. ${summarizeJobError(entry)}`);
        const remaining = Math.max(0, list.length - lines.length);
        if (remaining > 0) lines.unshift(`... ${remaining} erreur(s) plus ancienne(s)`);
        return lines.join('\n');
    }

    function errorToLogMessage(error) {
        if (!error) return 'Erreur inconnue';
        if (typeof error === 'string') return error;
        if (error.message) return String(error.message);
        if (error.reason) return errorToLogMessage(error.reason);
        return String(error);
    }

    function isTerminalJobStatus(status) {
        const normalized = String(status || '').toUpperCase();
        return normalized === 'DONE' || normalized.startsWith('DONE_');
    }

    function createImportRunToken() {
        return `${TAB_ID}_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    }

    function supersedeActiveImportRun(reason = '') {
        window.__AUTO_ATCD_CIM10_LMSTUDIO_IMPORT_RUN_TOKEN__ = `superseded_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
        window.__AUTO_ATCD_CIM10_LMSTUDIO_IMPORT_SUPERSEDE_REASON__ = reason;
        window.__AUTO_ATCD_CIM10_LMSTUDIO_IMPORT_RUNNING__ = false;
    }

    function assertImportRunActive(runToken) {
        if (!runToken) return;
        if (window.__AUTO_ATCD_CIM10_LMSTUDIO_IMPORT_RUN_TOKEN__ !== runToken) {
            throw new Error('Import WEDA repris automatiquement : arrêt de l’ancienne boucle.');
        }
    }

    function isSupersededImportError(error) {
        const message = errorToLogMessage(error);
        return /ancienne boucle|repris automatiquement|superseded/i.test(message);
    }

    let wedaBackgroundExecutionShimInstalled = false;
    let wedaBackgroundExecutionShimRestore = [];

    function overrideRuntimeProperty(target, property, descriptor) {
        if (!target || !property) return false;

        let ownDescriptor = null;
        try { ownDescriptor = Object.getOwnPropertyDescriptor(target, property); } catch (_) {}

        try {
            Object.defineProperty(target, property, {
                configurable: true,
                ...descriptor
            });

            wedaBackgroundExecutionShimRestore.push(() => {
                try {
                    if (ownDescriptor) Object.defineProperty(target, property, ownDescriptor);
                    else delete target[property];
                } catch (_) {}
            });
            return true;
        } catch (_) {
            return false;
        }
    }

    function installWedaBackgroundExecutionShim(job, reason = '') {
        if (!isWeda() || wedaBackgroundExecutionShimInstalled) return false;

        wedaBackgroundExecutionShimInstalled = true;
        wedaBackgroundExecutionShimRestore = [];

        const visibleDescriptor = { get: () => 'visible' };
        const hiddenDescriptor = { get: () => false };
        const hasFocusDescriptor = { value: () => true };

        overrideRuntimeProperty(Document.prototype, 'visibilityState', visibleDescriptor);
        overrideRuntimeProperty(Document.prototype, 'hidden', hiddenDescriptor);
        overrideRuntimeProperty(document, 'visibilityState', visibleDescriptor);
        overrideRuntimeProperty(document, 'hidden', hiddenDescriptor);
        overrideRuntimeProperty(Document.prototype, 'hasFocus', hasFocusDescriptor);
        overrideRuntimeProperty(document, 'hasFocus', hasFocusDescriptor);

        try { document.dispatchEvent(new Event('visibilitychange')); } catch (_) {}
        try { window.dispatchEvent(new Event('focus')); } catch (_) {}

        logImportEvent(
            wedaBackgroundExecutionShimRestore.length ? 'info' : 'warning',
            'weda_background_runtime',
            wedaBackgroundExecutionShimRestore.length
                ? 'Worker WEDA maintenu actif en arrière-plan sans ouvrir d’onglet visible.'
                : 'Impossible de maintenir le worker WEDA actif en arrière-plan.',
            {
                jobId: job && job.id,
                reason
            }
        );

        return true;
    }

    function restoreWedaBackgroundExecutionShim(reason = '') {
        if (!wedaBackgroundExecutionShimInstalled) return false;

        const restoreFns = wedaBackgroundExecutionShimRestore.slice().reverse();
        wedaBackgroundExecutionShimInstalled = false;
        wedaBackgroundExecutionShimRestore = [];
        restoreFns.forEach(fn => {
            try { fn(); } catch (_) {}
        });

        if (reason) {
            try { document.dispatchEvent(new Event('visibilitychange')); } catch (_) {}
        }
        return true;
    }

    function getCurrentImportItemFromJob(job) {
        if (!job || !Array.isArray(job.parsedAtcd)) return null;
        const index = Number(job.importIndex || 0);
        return job.parsedAtcd[index] || null;
    }

    function getJobProgressSnapshot(job) {
        const parsedCount = Array.isArray(job && job.parsedAtcd) ? job.parsedAtcd.length : 0;
        const importIndex = Number(job && job.importIndex !== undefined ? job.importIndex : 0);
        const updatedAtMs = Date.parse(job && job.updatedAt ? job.updatedAt : '');

        return {
            jobId: job && job.id || '',
            status: job && job.status || '',
            importIndex,
            parsedCount,
            importedCount: Array.isArray(job && job.imported) ? job.imported.length : 0,
            errorCount: Array.isArray(job && job.errors) ? job.errors.length : 0,
            skippedCount: Array.isArray(job && job.skipped) ? job.skipped.length : 0,
            stallRecoveryCount: Number(job && job.stallRecoveryCount || 0),
            updatedAt: job && job.updatedAt || '',
            currentItemStartedAt: job && job.currentItemStartedAt || '',
            stalledForMs: updatedAtMs ? Math.max(0, nowMs() - updatedAtMs) : null,
            currentItem: getCurrentImportItemFromJob(job),
            runningFlag: !!window.__AUTO_ATCD_CIM10_LMSTUDIO_IMPORT_RUNNING__,
            workerLock: gmGetJson(KEY_WORKER_LOCK, null),
            workerJobIdForThisTab: getWorkerJobIdForThisTab()
        };
    }

    function logWorkflowError(phase, error, details = {}) {
        const message = errorToLogMessage(error);
        const activeJob = details.job || getJob() || null;

        if ((!activeJob || isTerminalJobStatus(activeJob.status)) && !details.force) {
            return message;
        }

        try {
            logImportEvent('error', phase, message, {
                ...details,
                job: getJobProgressSnapshot(activeJob),
                stack: error && error.stack ? String(error.stack).slice(0, 2500) : ''
            });
        } catch (_) {}

        return message;
    }

    function runWatchedAsync(phase, fn, details = {}) {
        try {
            const result = fn();
            if (result && typeof result.catch === 'function') {
                result.catch(error => logWorkflowError(phase, error, details));
            }
            return result;
        } catch (error) {
            logWorkflowError(phase, error, details);
            return null;
        }
    }

    function shouldIgnoreGlobalNoise(message, filename = '') {
        const text = String(message || '');
        const source = String(filename || '');

        if (/ResizeObserver loop (completed with undelivered notifications|limit exceeded)/i.test(text)) return true;
        if (/weda is not defined/i.test(text) && source.startsWith('chrome-extension://')) return true;
        if (/showNotification/i.test(text) && /FWNotif\.js/i.test(source)) return true;
        if (/Cannot read properties of undefined \(reading 'showNotification'\)/i.test(text)) return true;
        if (/Cannot read properties of undefined \(reading '_behaviors'\)/i.test(text) && /ScriptResource\.axd/i.test(source)) return true;
        if (/editor1\.FocusDocument is not a function/i.test(text)) return true;
        if (/selectZone is not defined/i.test(text)) return true;
        if (/^Erreur JavaScript globale$/i.test(text)) return true;

        return false;
    }

    function installGlobalErrorLogger() {
        if (window.__AUTO_ATCD_CIM10_LMSTUDIO_GLOBAL_ERROR_LOGGER__) return;
        window.__AUTO_ATCD_CIM10_LMSTUDIO_GLOBAL_ERROR_LOGGER__ = true;

        window.addEventListener('error', event => {
            const message = errorToLogMessage(event.error || event.message || 'Erreur JavaScript globale');
            if (shouldIgnoreGlobalNoise(message, event.filename || '')) return;

            logWorkflowError('global_error', event.error || event.message || 'Erreur JavaScript globale', {
                filename: event.filename || '',
                lineno: event.lineno || 0,
                colno: event.colno || 0
            });
        }, true);

        window.addEventListener('unhandledrejection', event => {
            const message = errorToLogMessage(event.reason || 'Promesse asynchrone rejetée sans capture');
            if (shouldIgnoreGlobalNoise(message, '')) return;

            logWorkflowError('unhandled_rejection', event.reason || 'Promesse asynchrone rejetée sans capture', {});
        }, true);
    }

    function checkWedaImportStall(job) {
        if (!job || job.status !== 'IMPORT_WEDA') return;

        const updatedAtMs = Date.parse(job.updatedAt || job.createdAt || '');
        if (!updatedAtMs) return;

        const stalledForMs = nowMs() - updatedAtMs;
        if (stalledForMs < IMPORT_STALL_WARNING_MS) return false;

        const bucket = Math.floor(stalledForMs / 60000);
        const key = [job.id || '', job.importIndex || 0, bucket].join('|');
        if (window.__AUTO_ATCD_CIM10_LMSTUDIO_LAST_STALL_LOG_KEY__ !== key) {
            window.__AUTO_ATCD_CIM10_LMSTUDIO_LAST_STALL_LOG_KEY__ = key;

            logImportEvent('warning', 'import_stall_watchdog', 'Import WEDA sans progression détectée.', {
                jobId: job.id || '',
                stalledForMs,
                recoveryAfterMs: IMPORT_STALL_RECOVERY_MS,
                progress: getJobProgressSnapshot(job)
            });
        }

        if (stalledForMs >= IMPORT_STALL_RECOVERY_MS) {
            return recoverStalledWedaImport(job, stalledForMs);
        }

        return false;
    }

    function recoverStalledWedaImport(job, stalledForMs) {
        if (!job || job.status !== 'IMPORT_WEDA') return false;
        if (!canThisTabRunWedaImport(job)) return false;

        const parsedCount = Array.isArray(job.parsedAtcd) ? job.parsedAtcd.length : 0;
        const currentIndex = Number(job.importIndex || 0);
        const recoveryCount = Number(job.stallRecoveryCount || 0);

        if (recoveryCount >= MAX_IMPORT_STALL_RECOVERIES) {
            if (parsedCount > 0 && currentIndex < parsedCount) {
                supersedeActiveImportRun('stall_force_quality_control');
                releaseWorkerLock(job);

                job.status = 'IMPORT_WEDA';
                job.importIndex = parsedCount;
                job.stallRecoveryCount = recoveryCount + 1;
                job.wedaWorkerTabId = TAB_ID;
                job.updatedAt = nowIso();
                setJob(job);

                logImportEvent('warning', 'import_stall_force_quality', 'Reprises automatiques maximales atteintes : passage direct au contrôle qualité final.', {
                    jobId: job.id || '',
                    stalledForMs,
                    maxRecoveries: MAX_IMPORT_STALL_RECOVERIES,
                    previousImportIndex: currentIndex,
                    nextImportIndex: parsedCount,
                    progress: getJobProgressSnapshot(job)
                });

                setTimeout(() => {
                    runWatchedAsync('weda_import_force_quality_async', () => handleWedaImportJob(), { job: getJob() || job });
                }, 700);

                return true;
            }

            logImportEvent('error', 'import_stall_recovery_failed', 'Import WEDA bloqué malgré plusieurs reprises automatiques.', {
                jobId: job.id || '',
                stalledForMs,
                maxRecoveries: MAX_IMPORT_STALL_RECOVERIES,
                progress: getJobProgressSnapshot(job)
            });
            return false;
        }

        const byIndex = job.stallRecoveriesByIndex && typeof job.stallRecoveriesByIndex === 'object'
            ? job.stallRecoveriesByIndex
            : {};
        const indexKey = String(currentIndex);
        const recoveriesForIndex = Number(byIndex[indexKey] || 0) + 1;
        byIndex[indexKey] = recoveriesForIndex;

        let nextIndex = currentIndex;
        let skippedItem = null;

        if (
            parsedCount > 0 &&
            currentIndex < parsedCount &&
            recoveriesForIndex > MAX_IMPORT_STALL_RECOVERIES_PER_INDEX
        ) {
            skippedItem = job.parsedAtcd[currentIndex] || null;
            nextIndex = currentIndex + 1;
            job.stallSkipped = Array.isArray(job.stallSkipped) ? job.stallSkipped : [];
            job.stallSkipped.push({
                at: nowIso(),
                importIndex: currentIndex,
                item: skippedItem,
                reason: 'stalled_repeatedly_before_quality_control'
            });
        }

        supersedeActiveImportRun('stall_recovery');
        releaseWorkerLock(job);

        job.status = 'IMPORT_WEDA';
        job.importIndex = nextIndex;
        job.stallRecoveryCount = recoveryCount + 1;
        job.stallRecoveriesByIndex = byIndex;
        job.wedaWorkerTabId = TAB_ID;
        job.updatedAt = nowIso();
        setJob(job);

        logImportEvent('warning', skippedItem ? 'import_stall_skip_to_quality' : 'import_stall_recovery', skippedItem
            ? 'Antécédent bloquant mis de côté pour le contrôle qualité final.'
            : 'Reprise automatique de l’import WEDA dans le même onglet.', {
            jobId: job.id || '',
            stalledForMs,
            recoveryCount: job.stallRecoveryCount,
            importIndex: currentIndex,
            nextImportIndex: nextIndex,
            skippedItem,
            progress: getJobProgressSnapshot(job)
        });

        setTimeout(() => {
            runWatchedAsync('weda_import_recovery_async', () => handleWedaImportJob(), { job: getJob() || job });
        }, 700);

        return true;
    }

    function renderImportLogPanelContent(panel) {
        if (!panel) return;

        const logs = getImportLogs().slice().reverse();
        const stats = getImportLogStats();
        const enabled = isImportLogEnabled();

        const rows = logs.length
            ? logs.map(entry => {
                const item = entry.item || {};
                const color = entry.level === 'error' ? '#b3261e' : (entry.level === 'warning' ? '#9a6700' : '#185abc');
                const detailsText = JSON.stringify(entry.details || {}, null, 2);

                return (
                    '<div style="border:1px solid #d0d7de;border-radius:8px;margin:8px 0;padding:10px;background:#fff">' +
                        '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
                            '<strong style="color:' + color + '">' + escapeHtml(entry.level.toUpperCase()) + '</strong>' +
                            '<span style="font-family:Consolas,monospace;font-size:12px;color:#57606a">' + escapeHtml(entry.at) + '</span>' +
                            '<span style="font-weight:700">' + escapeHtml(entry.phase) + '</span>' +
                        '</div>' +
                        '<div style="margin-top:6px">' + escapeHtml(entry.message) + '</div>' +
                        (item.description ? '<div style="margin-top:6px;background:#f6f8fa;padding:7px;border-radius:6px">' +
                            '<strong>' + escapeHtml(item.label || sectionLabel(item.section)) + '</strong><br>' +
                            (item.familyMember ? 'Membre : ' + escapeHtml(item.familyMember) + '<br>' : '') +
                            escapeHtml(item.description) + (item.code ? ' [' + escapeHtml(item.code) + ']' : '') +
                        '</div>' : '') +
                        '<details style="margin-top:6px">' +
                            '<summary style="cursor:pointer;color:#185abc">Détails techniques</summary>' +
                            '<pre style="white-space:pre-wrap;background:#f6f8fa;padding:8px;border-radius:6px;max-height:220px;overflow:auto">' + escapeHtml(detailsText) + '</pre>' +
                        '</details>' +
                    '</div>'
                );
            }).join('')
            : '<div style="padding:12px;background:#f6f8fa;border-radius:8px">Aucune erreur ni alerte enregistrée.</div>';

        panel.innerHTML =
            '<div style="position:sticky;top:0;background:#12395f;color:#fff;padding:12px 14px;display:flex;gap:8px;align-items:center;z-index:1">' +
                '<strong style="flex:1">Journal import ATCD CIM10</strong>' +
                '<button type="button" data-action="toggle" style="border:0;border-radius:6px;padding:7px 10px;cursor:pointer">' + (enabled ? 'Bouton auto' : 'Garder visible') + '</button>' +
                '<button type="button" data-action="copy" style="border:0;border-radius:6px;padding:7px 10px;cursor:pointer">Copier</button>' +
                '<button type="button" data-action="clear" style="border:0;border-radius:6px;padding:7px 10px;cursor:pointer">Effacer</button>' +
                '<button type="button" data-action="close" style="border:0;border-radius:6px;padding:7px 10px;cursor:pointer">Fermer</button>' +
            '</div>' +
            '<div style="padding:14px">' +
                '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:10px">' +
                    '<div style="background:#f6f8fa;border:1px solid #d0d7de;border-radius:8px;padding:8px"><div style="color:#57606a">Contenu</div><strong>Erreurs + alertes</strong></div>' +
                    '<div style="background:#f6f8fa;border:1px solid #d0d7de;border-radius:8px;padding:8px"><div style="color:#57606a">Total</div><strong>' + stats.total + '</strong></div>' +
                    '<div style="background:#f6f8fa;border:1px solid #d0d7de;border-radius:8px;padding:8px"><div style="color:#57606a">Erreurs</div><strong style="color:#b3261e">' + stats.errors + '</strong></div>' +
                    '<div style="background:#f6f8fa;border:1px solid #d0d7de;border-radius:8px;padding:8px"><div style="color:#57606a">Alertes</div><strong style="color:#9a6700">' + stats.warnings + '</strong></div>' +
                '</div>' +
                '<div style="font-size:12px;color:#57606a;margin-bottom:10px">Raccourci : Ctrl+Alt+L. Le journal conserve les erreurs et les alertes vraiment utiles au debug, avec export compact.</div>' +
                rows +
            '</div>';
    }

    function refreshImportLogPanelIfOpen() {
        try {
            const panel = document.getElementById('auto-atcd-cim10-lmstudio-log-panel');
            if (panel) renderImportLogPanelContent(panel);
        } catch (_) {}
    }

    function removeImportLogUi() {
        try {
            const button = document.getElementById('auto-atcd-cim10-lmstudio-log-button');
            if (button) button.remove();
        } catch (_) {}

        try {
            const panel = document.getElementById('auto-atcd-cim10-lmstudio-log-panel');
            if (panel) panel.remove();
        } catch (_) {}
    }

    function canShowImportLogUiHere() {
        return isWeda() && isAntecedentPageWeda();
    }

    function showImportLogPanel() {
        if (!canShowImportLogUiHere()) {
            removeImportLogUi();
            return null;
        }

        let panel = document.getElementById('auto-atcd-cim10-lmstudio-log-panel');
        if (panel) {
            refreshImportLogPanelIfOpen();
            return panel;
        }

        panel = document.createElement('div');
        panel.id = 'auto-atcd-cim10-lmstudio-log-panel';
        panel.style.position = 'fixed';
        panel.style.inset = '22px 22px auto auto';
        panel.style.width = 'min(900px, calc(100vw - 44px))';
        panel.style.maxHeight = 'calc(100vh - 44px)';
        panel.style.overflow = 'auto';
        panel.style.zIndex = '2147483647';
        panel.style.background = '#ffffff';
        panel.style.color = '#1f2328';
        panel.style.border = '1px solid #d0d7de';
        panel.style.borderRadius = '10px';
        panel.style.boxShadow = '0 14px 42px rgba(0,0,0,0.28)';
        panel.style.font = '13px Arial, sans-serif';

        panel.addEventListener('click', async event => {
            const button = event.target && event.target.closest ? event.target.closest('button[data-action]') : null;
            if (!button) return;

            const action = button.getAttribute('data-action');

            if (action === 'close') {
                panel.remove();
                return;
            }

            if (action === 'toggle') {
                setImportLogEnabled(!isImportLogEnabled());
                refreshImportLogPanelIfOpen();
                return;
            }

            if (action === 'clear') {
                clearImportLogs();
                return;
            }

            if (action === 'copy') {
                const logs = getImportLogs();
                const text = buildCompactImportLogExport(logs);
                const ok = await copyTextToClipboard(text);
                showBadge(ok ? 'Journal compact copié.' : 'Copie du journal impossible.', { error: !ok, duration: 4000 });
            }
        }, true);

        document.documentElement.appendChild(panel);
        renderImportLogPanelContent(panel);
        return panel;
    }

    function injectImportLogButtonIfUseful() {
        try {
            const existing = document.getElementById('auto-atcd-cim10-lmstudio-log-button');
            if (!canShowImportLogUiHere()) {
                removeImportLogUi();
                return;
            }

            const stats = getImportLogStats();

            if (existing) {
                existing.textContent = stats.errors > 0
                    ? `Logs ATCD (${stats.errors})`
                    : (stats.warnings > 0 ? `Logs ATCD (${stats.warnings})` : 'Logs ATCD');
                existing.style.background = stats.errors > 0 ? '#7a1020' : (stats.warnings > 0 ? '#9a6700' : '#3b2f00');
                return;
            }

            const btn = document.createElement('button');
            btn.id = 'auto-atcd-cim10-lmstudio-log-button';
            btn.type = 'button';
            btn.textContent = stats.errors > 0
                ? `Logs ATCD (${stats.errors})`
                : (stats.warnings > 0 ? `Logs ATCD (${stats.warnings})` : 'Logs ATCD');
            btn.title = 'Afficher le journal d’import ATCD CIM10. Raccourci : Ctrl+Alt+L';
            btn.style.position = 'fixed';
            btn.style.right = '14px';
            btn.style.bottom = '62px';
            btn.style.zIndex = '2147483647';
            btn.style.background = stats.errors > 0 ? '#7a1020' : (stats.warnings > 0 ? '#9a6700' : '#3b2f00');
            btn.style.color = '#ffffff';
            btn.style.border = '0';
            btn.style.borderRadius = '8px';
            btn.style.padding = '9px 11px';
            btn.style.fontWeight = '700';
            btn.style.fontSize = '13px';
            btn.style.fontFamily = 'Arial, sans-serif';
            btn.style.cursor = 'pointer';
            btn.style.boxShadow = '0 4px 14px rgba(0,0,0,0.25)';
            btn.addEventListener('click', () => showImportLogPanel(), true);
            document.documentElement.appendChild(btn);
        } catch (_) {}
    }

    function installImportLogShortcut() {
        window.addEventListener('keydown', event => {
            if (event.repeat) return;
            if (!event.ctrlKey || !event.altKey) return;
            if (String(event.key || '').toLowerCase() !== 'l') return;
            if (!canShowImportLogUiHere()) {
                removeImportLogUi();
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            if (!isImportLogEnabled()) setImportLogEnabled(true);
            showImportLogPanel();
        }, true);
    }

    function dispatchMouse(el, type, extra = {}) {
        if (!el) return false;
        const win = ownerWin(el);
        const rect = el.getBoundingClientRect();
        const x = extra.clientX || Math.max(1, Math.round(rect.left + rect.width / 2));
        const y = extra.clientY || Math.max(1, Math.round(rect.top + rect.height / 2));

        try {
            const ev = new win.MouseEvent(type, {
                bubbles: true,
                cancelable: true,
                view: win,
                clientX: x,
                clientY: y,
                screenX: x,
                screenY: y,
                button: 0,
                buttons: type === 'mouseup' || type === 'click' ? 0 : 1
            });
            el.dispatchEvent(ev);
            return ev;
        } catch (_) {
            return false;
        }
    }

    function dispatchDrag(el, type) {
        if (!el) return false;
        const win = ownerWin(el);
        const rect = el.getBoundingClientRect();
        const x = Math.max(1, Math.round(rect.left + rect.width / 2));
        const y = Math.max(1, Math.round(rect.top + rect.height / 2));

        try {
            let ev;
            if (typeof win.DragEvent === 'function') {
                ev = new win.DragEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
            } else {
                ev = new win.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
            }
            el.dispatchEvent(ev);
            return ev;
        } catch (_) {
            return false;
        }
    }

    function clickElement(el) {
        if (!el) return false;
        try { el.scrollIntoView({ block: 'center', inline: 'center' }); } catch (_) {}
        dispatchMouse(el, 'mouseover');
        dispatchMouse(el, 'mousemove');
        dispatchMouse(el, 'mousedown');
        dispatchMouse(el, 'mouseup');
        dispatchMouse(el, 'click');
        try { el.click(); } catch (_) {}
        return true;
    }

    function setNativeValue(el, value) {
        if (!el) return false;
        const proto = Object.getPrototypeOf(el);
        const descriptor = proto ? Object.getOwnPropertyDescriptor(proto, 'value') : null;
        if (descriptor && descriptor.set) descriptor.set.call(el, value);
        else el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
    }

    function callPostBack(target, argument = '') {
        const postBack = (typeof unsafeWindow !== 'undefined' && unsafeWindow.__doPostBack) || window.__doPostBack;
        if (typeof postBack === 'function') {
            postBack(target, argument);
            return true;
        }
        return false;
    }

    async function waitForWedaIdle(timeoutMs = 12000) {
        await sleep(150);

        await waitFor(() => {
            try {
                const sys = (typeof unsafeWindow !== 'undefined' && unsafeWindow.Sys) || window.Sys;
                const prm = sys && sys.WebForms && sys.WebForms.PageRequestManager && sys.WebForms.PageRequestManager.getInstance
                    ? sys.WebForms.PageRequestManager.getInstance()
                    : null;
                if (prm && typeof prm.get_isInAsyncPostBack === 'function' && prm.get_isInAsyncPostBack()) return false;
            } catch (_) {}
            return true;
        }, timeoutMs, 250);

        await sleep(300);
        return true;
    }

    function getAccessibleDocumentsDeep(initialDoc) {
        const docs = [];
        const seen = new Set();

        function addDoc(doc) {
            if (!doc || seen.has(doc)) return;
            seen.add(doc);
            docs.push(doc);
        }

        addDoc(initialDoc);
        addDoc(document);

        try {
            if (window.top && window.top.document) addDoc(window.top.document);
        } catch (_) {}

        for (let i = 0; i < docs.length; i++) {
            const doc = docs[i];
            try {
                const iframes = Array.from(doc.querySelectorAll('iframe, frame'));
                for (const fr of iframes) {
                    try {
                        if (fr.contentDocument) addDoc(fr.contentDocument);
                    } catch (_) {}
                }
            } catch (_) {}
        }

        return docs;
    }

    function queryElementsDeep(selector, initialDoc) {
        const elements = [];
        const seen = new Set();

        for (const doc of getAccessibleDocumentsDeep(initialDoc)) {
            try {
                Array.from(doc.querySelectorAll(selector)).forEach(el => {
                    if (seen.has(el)) return;
                    seen.add(el);
                    elements.push(el);
                });
            } catch (_) {}
        }

        return elements;
    }

    function findElementDeep(selector, initialDoc) {
        const docs = getAccessibleDocumentsDeep(initialDoc);

        for (const doc of docs) {
            try {
                const el = doc.querySelector(selector);
                if (el) return el;
            } catch (_) {}
        }

        return null;
    }

    function openTabSafe(url, active = true, options = {}) {
        const openActive = options.active !== undefined ? !!options.active : !!active;
        const insert = options.insert !== undefined ? !!options.insert : !!openActive;
        const setParent = options.setParent !== undefined ? !!options.setParent : true;

        try {
            GM_openInTab(url, { active: openActive, insert, setParent });
            return true;
        } catch (e) {
            warn('GM_openInTab objet impossible', e);
        }

        try {
            GM_openInTab(url, openActive);
            return true;
        } catch (e) {
            warn('GM_openInTab simple impossible', e);
        }

        try {
            window.open(url, '_blank');
            return true;
        } catch (e) {
            warn('window.open impossible', e);
        }

        return false;
    }

    function extractWedaPatDkFromUrl(value) {
        const text = String(value || '');
        if (!text) return '';

        try {
            const parsed = new URL(text, location.href);
            const patDk = parsed.searchParams.get('PatDk') || '';
            if (patDk) return normalizeSpaces(patDk);
        } catch (_) {}

        const match = text.match(/[?&]PatDk=([^&#]+)/i);
        if (!match) return '';

        try {
            return normalizeSpaces(decodeURIComponent(String(match[1] || '').replace(/\+/g, ' ')));
        } catch (_) {
            return normalizeSpaces(match[1] || '');
        }
    }

    function normalizeWedaPatDk(value) {
        return normalizeSpaces(String(value || ''));
    }

    function sameWedaPatDk(expected, actual) {
        const left = normalizeWedaPatDk(expected);
        const right = normalizeWedaPatDk(actual);
        if (!left || !right) return false;
        if (left === right) return true;
        return left.split('|')[0] === right.split('|')[0];
    }

    function getCurrentWedaPatDk() {
        return extractWedaPatDkFromUrl(location.href);
    }

    function getExpectedJobPatDk(job) {
        if (!job) return '';
        return normalizeWedaPatDk(
            job.batchPatientId ||
            job.sourcePatientId ||
            job.expectedPatientId ||
            extractWedaPatDkFromUrl(job.wedaImportUrl || '') ||
            extractWedaPatDkFromUrl(job.patientUrl || '')
        );
    }

    function buildPatientIdentityGuard(job) {
        const expectedPatDk = getExpectedJobPatDk(job);
        const currentPatDk = getCurrentWedaPatDk();
        const ok = !!expectedPatDk && !!currentPatDk && sameWedaPatDk(expectedPatDk, currentPatDk);
        let reason = '';

        if (!ok) {
            if (!expectedPatDk) reason = 'expected_patient_unknown';
            else if (!currentPatDk) reason = 'current_patient_unknown';
            else reason = 'patient_mismatch';
        }

        return {
            ok,
            expectedPatDk,
            currentPatDk,
            url: location.href,
            reason
        };
    }

    function createPatientIdentityMismatchError(job, phase = '', item = null) {
        const guard = buildPatientIdentityGuard(job);
        if (guard.ok) return null;

        let message = '';
        if (guard.reason === 'expected_patient_unknown') {
            message = `Sécurité patient : patient attendu introuvable pour ce job, import WEDA bloqué.`;
        } else if (guard.reason === 'current_patient_unknown') {
            message = `Sécurité patient : PatDk courant introuvable avant import WEDA (attendu ${guard.expectedPatDk || 'inconnu'}).`;
        } else {
            message = `Sécurité patient : import bloqué, PatDk courant ${guard.currentPatDk} différent du patient attendu ${guard.expectedPatDk}.`;
        }

        const error = new Error(message);
        error.patientIdentityMismatch = true;
        error.guard = guard;
        error.phase = phase || 'patient_identity_guard';
        error.item = item || null;
        return error;
    }

    function assertPatientIdentityMatchesJob(job, phase = '', item = null) {
        const error = createPatientIdentityMismatchError(job, phase, item);
        if (error) throw error;
        return true;
    }

    function failPatientIdentityMismatch(job, error) {
        const latest = getJob() || job || {};
        const guard = error && error.guard ? error.guard : buildPatientIdentityGuard(latest);
        const phase = error && error.phase ? error.phase : 'patient_identity_guard';
        const item = error && error.item ? error.item : getCurrentImportItemFromJob(latest);
        const message = error && error.message ? String(error.message) : 'Sécurité patient : import bloqué pour éviter une écriture sur le mauvais patient.';

        latest.status = 'ERROR_PATIENT_MISMATCH';
        latest.updatedAt = nowIso();
        latest.wedaWorkerTabId = TAB_ID;
        latest.patientIdentityGuard = guard;
        latest.errors = Array.isArray(latest.errors) ? latest.errors : [];
        latest.errors.push({
            at: nowIso(),
            phase: 'patient_identity_mismatch',
            sourcePhase: phase,
            item,
            message,
            guard
        });
        setJob(latest);

        logImportEvent('error', 'patient_identity_mismatch', message, {
            jobId: latest.id || '',
            phase,
            item,
            guard
        });

        showBadge(
            `Import WEDA bloqué par sécurité patient.\nAttendu : ${guard.expectedPatDk || '-'}\nOnglet courant : ${guard.currentPatDk || '-'}\nAucun antécédent n’a été ajouté.`,
            { error: true, duration: 30000 }
        );

        return latest;
    }

    /************************************************************
     * LOCK / WORKER WEDA UNIQUE
     ************************************************************/

    function getWorkerJobIdFromHash() {
        const hash = String(location.hash || '').replace(/^#/, '');
        if (!hash.includes(WORKER_HASH_PREFIX)) return '';

        const parts = hash.split(/[&]/);
        for (const part of parts) {
            if (part.startsWith(WORKER_HASH_PREFIX)) {
                return decodeURIComponent(part.slice(WORKER_HASH_PREFIX.length));
            }
        }

        return '';
    }

    function rememberWorkerJobIdFromHash() {
        if (!isWeda()) return '';
        const id = getWorkerJobIdFromHash();
        if (id) {
            window.__AUTO_ATCD_CIM10_LMSTUDIO_FRAME_WORKER_JOB_ID__ = id;
            if (isTopLevelWindow()) {
                try { sessionStorage.setItem(SESSION_WORKER_JOB_ID, id); } catch (_) {}
            }
        }
        return id;
    }

    function getWorkerJobIdForThisTab() {
        const fromHash = rememberWorkerJobIdFromHash();
        if (fromHash) return fromHash;
        if (window.__AUTO_ATCD_CIM10_LMSTUDIO_FRAME_WORKER_JOB_ID__) return window.__AUTO_ATCD_CIM10_LMSTUDIO_FRAME_WORKER_JOB_ID__;
        if (!isTopLevelWindow()) return '';
        try { return sessionStorage.getItem(SESSION_WORKER_JOB_ID) || ''; } catch (_) { return ''; }
    }

    function clearWorkerJobIdForThisTab() {
        try { window.__AUTO_ATCD_CIM10_LMSTUDIO_FRAME_WORKER_JOB_ID__ = ''; } catch (_) {}
        if (isTopLevelWindow()) {
            try { sessionStorage.removeItem(SESSION_WORKER_JOB_ID); } catch (_) {}
        }

        try {
            if (isWeda() && getWorkerJobIdFromHash()) {
                const cleanUrl = String(location.href || '').split('#')[0];
                window.history.replaceState(window.history.state, document.title, cleanUrl);
            }
        } catch (_) {}
    }

    function getHeidiJobIdFromHash() {
        const hash = String(location.hash || '').replace(/^#/, '');
        if (!hash.includes(HEIDI_HASH_PREFIX)) return '';

        const parts = hash.split(/[&]/);
        for (const part of parts) {
            if (part.startsWith(HEIDI_HASH_PREFIX)) {
                return decodeURIComponent(part.slice(HEIDI_HASH_PREFIX.length));
            }
        }

        return '';
    }

    function rememberHeidiJobIdFromHash() {
        if (!isHeidi()) return '';
        const id = getHeidiJobIdFromHash();
        if (id && isTopLevelWindow()) {
            try {
                const previous = sessionStorage.getItem(SESSION_HEIDI_JOB_ID) || '';
                sessionStorage.setItem(SESSION_HEIDI_JOB_ID, id);
                if (previous !== id || !sessionStorage.getItem(SESSION_HEIDI_JOB_HASH_SEEN_AT)) {
                    sessionStorage.setItem(SESSION_HEIDI_JOB_HASH_SEEN_AT, String(nowMs()));
                }
            } catch (_) {}
        }
        return id;
    }

    function getHeidiJobIdForThisTab() {
        const fromHash = rememberHeidiJobIdFromHash();
        if (fromHash) return fromHash;
        if (!isTopLevelWindow()) return '';
        try { return sessionStorage.getItem(SESSION_HEIDI_JOB_ID) || ''; } catch (_) { return ''; }
    }

    function clearHeidiJobIdForThisTab() {
        if (isTopLevelWindow()) {
            try { sessionStorage.removeItem(SESSION_HEIDI_JOB_ID); } catch (_) {}
            try { sessionStorage.removeItem(SESSION_HEIDI_JOB_HASH_SEEN_AT); } catch (_) {}
        }

        try {
            if (isHeidi() && getHeidiJobIdFromHash()) {
                const cleanUrl = String(location.href || '').split('#')[0];
                window.history.replaceState(window.history.state, document.title, cleanUrl);
            }
        } catch (_) {}
    }

    function isScriptedHeidiWorkerTab() {
        return !!getHeidiJobIdForThisTab();
    }

    function getHeidiJobHashSeenAgeMs() {
        if (!isTopLevelWindow()) return Number.POSITIVE_INFINITY;
        try {
            const raw = sessionStorage.getItem(SESSION_HEIDI_JOB_HASH_SEEN_AT) || '';
            const at = Number(raw || 0);
            return at > 0 ? Math.max(0, nowMs() - at) : Number.POSITIVE_INFINITY;
        } catch (_) {
            return Number.POSITIVE_INFINITY;
        }
    }

    function isThisHeidiWorkerForJob(job) {
        const heidiJobId = getHeidiJobIdForThisTab();
        if (!heidiJobId) return true;
        return !!(job && job.id === heidiJobId);
    }

    function shouldCloseScriptedHeidiWorker(job) {
        const heidiJobId = getHeidiJobIdForThisTab();
        if (!heidiJobId) return false;
        if (window.__AUTO_ATCD_CIM10_LMSTUDIO_HEIDI_FINALIZE_RUNNING__) return false;

        if (!job || job.id !== heidiJobId) {
            return getHeidiJobHashSeenAgeMs() >= HEIDI_WORKER_JOB_GRACE_MS;
        }

        const status = String(job.status || '').toUpperCase();
        return status === 'IMPORT_WEDA' || isTerminalJobStatus(status);
    }

    function closeCurrentScriptedHeidiWorkerIfDoneOrMismatched(job, reason = '') {
        if (!isHeidi() || !shouldCloseScriptedHeidiWorker(job)) return false;

        logImportEvent('info', 'heidi_worker_closing', 'Fermeture du worker Heidi demandée par son état.', {
            reason,
            heidiJobId: getHeidiJobIdForThisTab(),
            hashAgeMs: getHeidiJobHashSeenAgeMs(),
            jobId: job && job.id || '',
            status: job && job.status || ''
        });

        closeCurrentHeidiTabSoon(
            reason === 'mismatch'
                ? 'Cet onglet Heidi appartient à un ancien job.\nFermeture du worker…'
                : 'Heidi a transmis le relais.\nFermeture du worker…',
            { unloadIfBlocked: true }
        );
        return true;
    }

    function getActiveWorkerJobForThisTab() {
        const workerJobId = getWorkerJobIdForThisTab();
        if (!workerJobId) return null;

        const job = getJob();
        if (!job || job.id !== workerJobId || isTerminalJobStatus(job.status)) {
            clearWorkerJobIdForThisTab();
            return null;
        }

        return job;
    }

    function buildWedaWorkerUrl(url, jobId) {
        const base = String(url || 'https://secure.weda.fr/').split('#')[0];
        return base + '#' + WORKER_HASH_PREFIX + encodeURIComponent(jobId);
    }

    function buildHeidiWorkerUrl(url, jobId) {
        const base = String(url || HEIDI_URL).split('#')[0];
        return base + '#' + HEIDI_HASH_PREFIX + encodeURIComponent(jobId);
    }

    function isThisWedaWorkerForJob(job) {
        if (!isWeda() || !job || !job.id) return false;
        return getWorkerJobIdForThisTab() === job.id;
    }

    function canSourceWedaTabRunImport(job) {
        if (!isWeda() || !job || !job.id) return false;
        if (!job.batchId || !job.sourceWedaTabId || job.sourceWedaTabId !== TAB_ID) return false;
        if (WEDA_IMPORT_IFRAME_ENABLED && isBatchSourceWorkerTopWindow()) return false;

        const expectedPatDk = getExpectedJobPatDk(job);
        const currentPatDk = getCurrentWedaPatDk();
        if (!expectedPatDk || !currentPatDk || !sameWedaPatDk(expectedPatDk, currentPatDk)) return false;

        return isAntecedentUrlWeda() || /\/foldermedical\/patientviewform\.aspx/i.test(location.pathname);
    }

    function canThisTabRunWedaImport(job) {
        if (!isWeda() || !job || !job.id) return false;
        return isThisWedaWorkerForJob(job) || canSourceWedaTabRunImport(job);
    }

    function shouldImportInSourceWedaTab(job) {
        return !!(job && job.id && job.batchId && job.sourceWedaTabId);
    }

    function shouldImportInSilentWedaFrame(job) {
        return !!(
            WEDA_IMPORT_IFRAME_ENABLED &&
            job &&
            job.id &&
            job.batchId &&
            job.sourceWedaTabId &&
            (job.wedaImportUrl || job.patientUrl)
        );
    }

    function acquireWorkerLock(job) {
        if (!job || !job.id) return false;

        const lock = gmGetJson(KEY_WORKER_LOCK, null);
        const now = nowMs();

        if (
            lock &&
            lock.jobId === job.id &&
            lock.tabId &&
            lock.tabId !== TAB_ID &&
            Number(lock.expiresAt || 0) > now
        ) {
            return false;
        }

        gmSetJson(KEY_WORKER_LOCK, {
            jobId: job.id,
            tabId: TAB_ID,
            acquiredAt: now,
            expiresAt: now + 45000
        });

        return true;
    }

    function renewWorkerLock(job) {
        if (!job || !job.id) return false;

        const lock = gmGetJson(KEY_WORKER_LOCK, null);
        if (!lock || lock.jobId !== job.id || lock.tabId !== TAB_ID) return false;

        lock.expiresAt = nowMs() + 45000;
        gmSetJson(KEY_WORKER_LOCK, lock);
        return true;
    }

    function releaseWorkerLock(job) {
        try {
            const lock = gmGetJson(KEY_WORKER_LOCK, null);
            if (lock && job && lock.jobId === job.id && lock.tabId === TAB_ID) {
                GM_deleteValue(KEY_WORKER_LOCK);
            }
        } catch (_) {}
    }

    function getHeidiWorkerOpenLock() {
        return gmGetJson(KEY_HEIDI_OPEN_LOCK, null);
    }

    function heidiWorkerOpenLockIsActiveForJob(job, lock = null) {
        if (!job || !job.id) return false;
        const currentLock = lock || getHeidiWorkerOpenLock();
        return !!(
            currentLock &&
            currentLock.jobId === job.id &&
            Number(currentLock.expiresAt || 0) > nowMs()
        );
    }

    function hasActiveHeidiWorkerOrOpening(job) {
        if (!job || !job.id) return false;

        if (heidiWorkerOpenLockIsActiveForJob(job)) return true;
        if (job.heidiRunnerTabId && Number(job.heidiRunnerExpiresAt || 0) > nowMs()) return true;

        const openedAtMs = Date.parse(job.heidiWorkerOpenedAt || '');
        if (
            job.heidiWorkerJobId === job.id &&
            Number.isFinite(openedAtMs) &&
            nowMs() - openedAtMs < HEIDI_WORKER_OPENED_GRACE_MS
        ) {
            return true;
        }

        return false;
    }

    async function acquireHeidiWorkerOpenLock(job) {
        if (!job || !job.id) return false;

        const existing = getHeidiWorkerOpenLock();
        if (heidiWorkerOpenLockIsActiveForJob(job, existing)) return false;

        const token = `${TAB_ID}_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
        const now = nowMs();

        gmSetJson(KEY_HEIDI_OPEN_LOCK, {
            jobId: job.id,
            tabId: TAB_ID,
            token,
            acquiredAt: now,
            expiresAt: now + HEIDI_WORKER_OPEN_LOCK_MS
        });

        await sleep(250);

        const confirmed = getHeidiWorkerOpenLock();
        return !!(
            confirmed &&
            confirmed.jobId === job.id &&
            confirmed.tabId === TAB_ID &&
            confirmed.token === token
        );
    }

    function releaseHeidiWorkerOpenLock(job) {
        try {
            const lock = getHeidiWorkerOpenLock();
            if (lock && job && lock.jobId === job.id && lock.tabId === TAB_ID) {
                GM_deleteValue(KEY_HEIDI_OPEN_LOCK);
            }
        } catch (_) {}
    }

    function markHeidiWorkerOpened(job) {
        const latest = getJob() || job;
        if (!latest || latest.id !== job.id) return latest || job;

        latest.heidiWorkerJobId = job.id;
        latest.heidiWorkerOpenedAt = nowIso();
        latest.heidiWorkerOpenedByTabId = TAB_ID;
        latest.updatedAt = nowIso();
        setJob(latest);
        return latest;
    }

    async function openHeidiWorkerForJob(job) {
        return runLmStudioForJob(job, 'weda');
    }

    function closeCurrentWedaWorkerTab(job) {
        if (!isThisWedaWorkerForJob(job)) return false;

        const unloadIfBlocked = isTopLevelWindow();
        window.__AUTO_ATCD_CIM10_LMSTUDIO_WEDA_CLOSING__ = true;
        clearWorkerJobIdForThisTab();
        publishBatchBridgeReport({
            ...(job || {}),
            wedaWorkerClosingAt: nowIso(),
            wedaWorkerClosingTabId: TAB_ID
        });
        publishBatchSourceCloseSignal(job, 'weda_import_worker_closing');
        showBadge('Import terminé.\nFermeture de l’onglet WEDA worker…', { duration: 2500 });

        if (!isTopLevelWindow()) {
            setTimeout(() => {
                try {
                    if (window.frameElement && window.frameElement.parentNode) {
                        window.frameElement.parentNode.removeChild(window.frameElement);
                    }
                } catch (_) {}
            }, 250);
            return true;
        }

        try { window.close(); } catch (_) {}
        try { unsafeWindow.close(); } catch (_) {}
        setTimeout(() => {
            try { window.close(); } catch (_) {}
            try { unsafeWindow.close(); } catch (_) {}
            if (unloadIfBlocked) {
                setTimeout(() => {
                    try { window.location.replace('about:blank'); } catch (_) {}
                }, 1200);
            }
        }, 250);
        return true;
    }

    function isCurrentBatchSourceImportHost(job) {
        if (!isWeda() || !isTopLevelWindow() || !isBatchSourceWorkerTopWindow()) return false;
        if (!job || !job.id) return false;
        if (job.sourceWedaTabId && job.sourceWedaTabId !== TAB_ID) return false;
        return canSourceWedaTabRunImport(job);
    }

    function closeCurrentBatchSourceWedaTab(job, reason = 'source_weda_import_done') {
        if (!isCurrentBatchSourceImportHost(job)) return false;

        const unloadIfBlocked = isBatchSourceWorkerTopWindow();
        window.__AUTO_ATCD_CIM10_LMSTUDIO_WEDA_CLOSING__ = true;
        const closingJob = {
            ...(job || {}),
            wedaWorkerClosingAt: nowIso(),
            wedaWorkerClosingTabId: TAB_ID
        };
        publishBatchBridgeReport(closingJob);
        publishBatchSourceCloseSignal(closingJob, reason);
        showBadge('Import terminé.\nFermeture de l’onglet WEDA source…', { duration: 2500 });

        try { window.close(); } catch (_) {}
        try { unsafeWindow.close(); } catch (_) {}
        setTimeout(() => {
            try { window.close(); } catch (_) {}
            try { unsafeWindow.close(); } catch (_) {}
            if (unloadIfBlocked) {
                setTimeout(() => {
                    try { window.location.replace('about:blank'); } catch (_) {}
                }, 1200);
            }
        }, 250);
        return true;
    }

    function closeCurrentWedaImportHostTab(job, reason = 'weda_import_done') {
        if (closeCurrentWedaWorkerTab(job)) return true;
        return closeCurrentBatchSourceWedaTab(job, reason);
    }

    function closeCurrentHeidiTabSoon(message = 'Résultat transmis à WEDA.\nFermeture de l’onglet Heidi…', options = {}) {
        if (!isHeidi()) return;
        if (window.__AUTO_ATCD_CIM10_LMSTUDIO_HEIDI_CLOSING__) return;

        window.__AUTO_ATCD_CIM10_LMSTUDIO_HEIDI_CLOSING__ = true;
        const delayMs = Number(options.delayMs || 2500);
        const unloadIfBlocked = options.unloadIfBlocked !== undefined ? !!options.unloadIfBlocked : isScriptedHeidiWorkerTab();

        showBadge(message, { duration: Math.max(2500, delayMs) });
        if (unloadIfBlocked) {
            try { window.close(); } catch (_) {}
            try { unsafeWindow.close(); } catch (_) {}
        }
        setTimeout(() => {
            try { window.close(); } catch (_) {}
            try { unsafeWindow.close(); } catch (_) {}
            if (unloadIfBlocked) {
                setTimeout(() => {
                    try { clearHeidiJobIdForThisTab(); } catch (_) {}
                    try { window.location.replace('about:blank'); } catch (_) {}
                }, 1200);
            }
        }, delayMs);
    }

    function isWedaImportStartedForJob(job) {
        if (!job || !job.id) return false;

        const latest = getJob();
        const lastReport = gmGetJson(KEY_LAST_REPORT, null);
        const lock = gmGetJson(KEY_WORKER_LOCK, null);

        if (lock && lock.jobId === job.id && Number(lock.expiresAt || 0) > nowMs()) return true;
        if (latest && latest.id === job.id && latest.status === 'IMPORT_WEDA' && latest.wedaWorkerTabId) return true;
        if (latest && latest.id === job.id && Array.isArray(latest.imported) && latest.imported.length > 0) return true;
        if (lastReport && lastReport.id === job.id && isTerminalJobStatus(lastReport.status)) return true;

        return false;
    }

    function getWedaImportProgressSignature(report) {
        if (!report || !report.id) return '';

        return [
            report.status || '',
            report.importIndex === undefined ? '' : String(report.importIndex),
            Array.isArray(report.imported) ? report.imported.length : Number(report.importedCount || 0),
            Array.isArray(report.errors) ? report.errors.length : Number(report.errorCount || 0),
            report.currentItemStartedAt || '',
            report.doneAt || '',
            report.updatedAt || ''
        ].join('|');
    }

    function requestSilentWedaImportNudge(job, reason = '') {
        if (!job || !job.id || job.status !== 'IMPORT_WEDA') return false;

        const latest = getJob() || job;
        if (!latest || latest.id !== job.id || latest.status !== 'IMPORT_WEDA') return false;

        const count = Number(latest.wedaForegroundRescueCount || 0);
        if (count >= MAX_WEDA_FOREGROUND_RESCUES) return false;

        const lastAtMs = latest.wedaForegroundRescueLastAt ? Date.parse(latest.wedaForegroundRescueLastAt) : 0;
        if (lastAtMs && nowMs() - lastAtMs < WEDA_FOREGROUND_RESCUE_COOLDOWN_MS) return false;

        latest.wedaForegroundRescueCount = count + 1;
        latest.wedaForegroundRescueLastAt = nowIso();
        latest.wedaForegroundRescueLastReason = reason || '';
        setJob(latest);
        publishWedaImportWake(latest, `silent_nudge_${reason || 'stalled'}`);

        logImportEvent('warning', 'weda_silent_nudge', 'Import WEDA sans progression : réveil silencieux demandé, sans ouverture d’onglet actif.', {
            jobId: latest.id,
            reason,
            nudgeCount: latest.wedaForegroundRescueCount,
            progress: getJobProgressSnapshot(latest)
        });

        showBadge(
            'WEDA semble gelé en arrière-plan.\n' +
            'Réveil silencieux demandé, sans ouvrir d’onglet actif…',
            { error: true, duration: 12000 }
        );

        return true;
    }

    async function closeCurrentHeidiTabAfterWedaImportStarts(job) {
        if (!isHeidi() || !job || !job.id) return false;

        showBadge('Résultat transmis à WEDA.\nFermeture dès que le worker WEDA répond…', { duration: 7000 });

        const startedAt = nowMs();
        let lastWakeAt = 0;
        const maxWaitMs = HEIDI_IMPORT_START_CLOSE_TIMEOUT_MS;

        while (nowMs() - startedAt < maxWaitMs) {
            const latest = getLatestImportReportForJob(job) || job;

            if (latest && latest.id === job.id && isWedaImportTerminalStatus(latest.status)) {
                closeCurrentHeidiTabSoon('Import WEDA terminé.\nFermeture de l’onglet Heidi…');
                return true;
            }

            if (latest && latest.id === job.id && latest.status === 'IMPORT_WEDA' && nowMs() - lastWakeAt >= HEIDI_IMPORT_WAKE_INTERVAL_MS) {
                lastWakeAt = nowMs();
                publishWedaImportWake(latest, 'heidi_handoff_waiting_start');
            }

            if (
                isWedaImportStartedForJob(job) ||
                (
                    latest &&
                    latest.id === job.id &&
                    latest.status === 'IMPORT_WEDA' &&
                    (latest.wedaWorkerTabId || latest.wedaWorkerOpenedAt)
                )
            ) {
                closeCurrentHeidiTabSoon('Import WEDA démarré.\nFermeture de Heidi pour libérer Chrome…');
                return true;
            }

            await sleep(1500);
        }

        showBadge(
            'Import WEDA transmis.\n' +
            'Fermeture de Heidi pour éviter de surcharger Chrome.',
            { duration: 7000 }
        );
        closeCurrentHeidiTabSoon('Import WEDA transmis.\nFermeture de Heidi pour libérer Chrome…');
        return false;
    }

    function getWedaWorkerOpenLock() {
        return gmGetJson(KEY_WORKER_OPEN_LOCK, null);
    }

    function wedaWorkerOpenLockIsActiveForJob(job, lock = null) {
        if (!job || !job.id) return false;
        const currentLock = lock || getWedaWorkerOpenLock();
        return !!(
            currentLock &&
            currentLock.jobId === job.id &&
            Number(currentLock.expiresAt || 0) > nowMs()
        );
    }

    function hasActiveWedaWorkerOrOpening(job) {
        if (!job || !job.id) return false;

        const workerLock = gmGetJson(KEY_WORKER_LOCK, null);
        if (workerLock && workerLock.jobId === job.id && Number(workerLock.expiresAt || 0) > nowMs()) return true;
        if (wedaWorkerOpenLockIsActiveForJob(job)) return true;
        if (job.wedaWorkerTabId) return true;
        if (job.wedaWorkerOpenedAt) return true;

        return false;
    }

    function isWedaImportTerminalStatus(status) {
        const normalized = String(status || '').toUpperCase();
        return isTerminalJobStatus(normalized) || normalized.startsWith('ERROR');
    }

    function getLatestImportReportForJob(job) {
        if (!job || !job.id) return null;

        const current = getJob();
        if (current && current.id === job.id) return current;

        const lastReport = gmGetJson(KEY_LAST_REPORT, null);
        if (lastReport && lastReport.id === job.id) return lastReport;

        return null;
    }

    function isWedaImportTerminalForJob(job) {
        const report = getLatestImportReportForJob(job);
        return !!(report && report.id === job.id && isWedaImportTerminalStatus(report.status));
    }

    async function acquireWedaWorkerOpenLock(job) {
        if (!job || !job.id) return false;

        const existing = getWedaWorkerOpenLock();
        if (wedaWorkerOpenLockIsActiveForJob(job, existing)) return false;

        const token = `${TAB_ID}_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
        const now = nowMs();

        gmSetJson(KEY_WORKER_OPEN_LOCK, {
            jobId: job.id,
            tabId: TAB_ID,
            token,
            acquiredAt: now,
            expiresAt: now + 60000
        });

        await sleep(250);

        const confirmed = getWedaWorkerOpenLock();
        return !!(
            confirmed &&
            confirmed.jobId === job.id &&
            confirmed.tabId === TAB_ID &&
            confirmed.token === token
        );
    }

    function releaseWedaWorkerOpenLock(job) {
        try {
            const lock = getWedaWorkerOpenLock();
            if (lock && job && lock.jobId === job.id && lock.tabId === TAB_ID) {
                GM_deleteValue(KEY_WORKER_OPEN_LOCK);
            }
        } catch (_) {}
    }

    function markWedaWorkerOpened(job) {
        const latest = getJob() || job;
        if (!latest || latest.id !== job.id) return latest || job;

        latest.wedaWorkerOpenedAt = nowIso();
        latest.wedaWorkerOpenedByTabId = TAB_ID;
        latest.updatedAt = nowIso();
        setJob(latest);
        return latest;
    }

    function heidiRunnerIsActiveForOtherTab(job) {
        if (!job || !job.heidiRunnerTabId || job.heidiRunnerTabId === TAB_ID) return false;
        return Number(job.heidiRunnerExpiresAt || 0) > nowMs();
    }

    function claimHeidiRunner(job, source = '') {
        if (!job || !job.id) return false;

        const latest = getJob() || job;
        if (latest.id !== job.id) return false;
        if (heidiRunnerIsActiveForOtherTab(latest)) return false;

        latest.heidiRunnerTabId = TAB_ID;
        latest.heidiRunnerClaimedAt = latest.heidiRunnerClaimedAt || nowIso();
        latest.heidiRunnerSource = source || latest.heidiRunnerSource || '';
        latest.heidiRunnerExpiresAt = nowMs() + 180000;
        latest.updatedAt = nowIso();
        setJob(latest);
        try {
            const lock = getHeidiWorkerOpenLock();
            if (lock && lock.jobId === latest.id) GM_deleteValue(KEY_HEIDI_OPEN_LOCK);
        } catch (_) {}
        return true;
    }

    function renewHeidiRunner(job) {
        if (!job || !job.id || job.heidiRunnerTabId !== TAB_ID) return false;

        job.heidiRunnerExpiresAt = nowMs() + 180000;
        job.updatedAt = nowIso();
        setJob(job);
        return true;
    }

    /************************************************************
     * DÉTECTION WEDA
     ************************************************************/

    function isPatientAccueilWeda() {
        return isWeda()
            && /\/foldermedical\/patientviewform\.aspx/i.test(location.pathname)
            && /(?:\?|&)PatDk=/i.test(location.search)
            && !!document.querySelector(SELECTOR_PATIENT_PANEL);
    }

    function isAntecedentUrlWeda() {
        return isWeda() && /\/foldermedical\/antecedentform\.aspx/i.test(location.pathname);
    }

    function isAntecedentLauncherPageWeda() {
        return isWeda()
            && /\/foldermedical\/antecedentform\.aspx$/i.test(location.pathname)
            && /(?:\?|&)PatDk=/i.test(location.search);
    }

    function getWedaAntecedentRoot() {
        return findElementDeep(SELECTOR_WEDA_ANTECEDENT_UPDATE_PANEL) || null;
    }

    async function waitForWedaAntecedentRoot(timeoutMs = 20000) {
        const existing = getWedaAntecedentRoot();
        if (existing) return existing;
        return await waitFor(() => getWedaAntecedentRoot(), timeoutMs, 500);
    }

    function isAntecedentPageWeda() {
        return isWeda() && (isAntecedentUrlWeda() || !!getWedaAntecedentRoot());
    }

    /************************************************************
     * BOUTONS FLOTTANTS
     ************************************************************/

    function clampWedaLauncherPanelPosition(panel, left, top) {
        const margin = 8;
        const rect = panel && panel.getBoundingClientRect ? panel.getBoundingClientRect() : { width: 260, height: 90 };
        const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
        const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);
        return {
            left: Math.min(Math.max(margin, Math.round(left)), maxLeft),
            top: Math.min(Math.max(margin, Math.round(top)), maxTop)
        };
    }

    function applyWedaLauncherPanelPosition(panel, position = null) {
        if (!panel) return;
        const saved = position || gmGetJson(KEY_WEDA_LAUNCHER_PANEL_POSITION, null);
        if (saved && Number.isFinite(Number(saved.left)) && Number.isFinite(Number(saved.top))) {
            const clamped = clampWedaLauncherPanelPosition(panel, Number(saved.left), Number(saved.top));
            panel.style.left = `${clamped.left}px`;
            panel.style.top = `${clamped.top}px`;
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
            return;
        }

        panel.style.left = 'auto';
        panel.style.top = 'auto';
        panel.style.right = '14px';
        panel.style.bottom = '14px';
    }

    function persistWedaLauncherPanelPosition(panel) {
        if (!panel || !panel.getBoundingClientRect) return;
        const rect = panel.getBoundingClientRect();
        const clamped = clampWedaLauncherPanelPosition(panel, rect.left, rect.top);
        gmSetJson(KEY_WEDA_LAUNCHER_PANEL_POSITION, clamped);
        applyWedaLauncherPanelPosition(panel, clamped);
    }

    function styleWedaLauncherButton(btn, variant = 'primary') {
        btn.type = 'button';
        btn.style.border = '0';
        btn.style.borderRadius = '7px';
        btn.style.padding = '9px 10px';
        btn.style.fontWeight = '700';
        btn.style.fontSize = '12px';
        btn.style.fontFamily = 'Arial, sans-serif';
        btn.style.cursor = 'pointer';
        btn.style.whiteSpace = 'nowrap';
        btn.style.textAlign = 'center';
        btn.style.boxShadow = 'inset 0 -1px 0 rgba(0,0,0,0.14)';
        if (variant === 'secondary') {
            btn.style.background = '#f59e0b';
            btn.style.color = '#111827';
        } else {
            btn.style.background = '#12395f';
            btn.style.color = '#ffffff';
        }
    }

    function installWedaLauncherPanelDrag(panel, handle) {
        if (!panel || !handle || panel.__AUTO_ATCD_CIM10_LMSTUDIO_DRAG_INSTALLED__) return;
        panel.__AUTO_ATCD_CIM10_LMSTUDIO_DRAG_INSTALLED__ = true;

        let dragging = false;
        let pointerId = null;
        let offsetX = 0;
        let offsetY = 0;

        handle.addEventListener('pointerdown', event => {
            if (event.button !== undefined && event.button !== 0) return;
            const rect = panel.getBoundingClientRect();
            dragging = true;
            pointerId = event.pointerId;
            offsetX = event.clientX - rect.left;
            offsetY = event.clientY - rect.top;
            panel.style.left = `${Math.round(rect.left)}px`;
            panel.style.top = `${Math.round(rect.top)}px`;
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
            try { handle.setPointerCapture(pointerId); } catch (_) {}
            event.preventDefault();
            event.stopPropagation();
        }, true);

        handle.addEventListener('pointermove', event => {
            if (!dragging || (pointerId !== null && event.pointerId !== pointerId)) return;
            const next = clampWedaLauncherPanelPosition(panel, event.clientX - offsetX, event.clientY - offsetY);
            panel.style.left = `${next.left}px`;
            panel.style.top = `${next.top}px`;
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
            event.preventDefault();
            event.stopPropagation();
        }, true);

        function stopDrag(event) {
            if (!dragging || (pointerId !== null && event.pointerId !== pointerId)) return;
            dragging = false;
            try { handle.releasePointerCapture(pointerId); } catch (_) {}
            pointerId = null;
            persistWedaLauncherPanelPosition(panel);
            event.preventDefault();
            event.stopPropagation();
        }

        handle.addEventListener('pointerup', stopDrag, true);
        handle.addEventListener('pointercancel', stopDrag, true);
        window.addEventListener('resize', () => applyWedaLauncherPanelPosition(panel), false);
    }

    function injectWedaButtonIfUseful() {
        if (!isWeda()) return;

        const panelId = 'auto-atcd-cim10-lmstudio-launcher-panel-avec-colorisation';
        const mainButtonId = 'auto-atcd-cim10-lmstudio-launcher-avec-colorisation';
        const colorOnlyButtonId = 'auto-atcd-cim10-lmstudio-color-only-launcher';
        const existingPanel = document.getElementById(panelId);
        const legacyButton = document.getElementById(mainButtonId);

        if (!isAntecedentLauncherPageWeda()) {
            if (existingPanel) existingPanel.remove();
            if (legacyButton && (!existingPanel || !existingPanel.contains(legacyButton))) legacyButton.remove();
            return;
        }

        if (existingPanel) return;
        if (legacyButton) legacyButton.remove();

        const panel = document.createElement('div');
        panel.id = panelId;
        panel.style.position = 'fixed';
        panel.style.zIndex = '2147483647';
        panel.style.width = '236px';
        panel.style.background = '#ffffff';
        panel.style.color = '#111827';
        panel.style.border = '1px solid #cbd5e1';
        panel.style.borderRadius = '8px';
        panel.style.boxShadow = '0 10px 28px rgba(15,23,42,0.28)';
        panel.style.font = '12px Arial, sans-serif';
        panel.style.overflow = 'hidden';

        const handle = document.createElement('div');
        handle.textContent = `ATCD CIM-10 ${VERSION_AUTO_ATCD_CIM10_LMSTUDIO.replace(/-avec-colorisation$/, '')}`;
        handle.title = 'Déplacer';
        handle.style.background = '#0f172a';
        handle.style.color = '#ffffff';
        handle.style.fontWeight = '700';
        handle.style.padding = '7px 9px';
        handle.style.cursor = 'move';
        handle.style.userSelect = 'none';
        handle.style.touchAction = 'none';
        handle.style.letterSpacing = '0';

        const body = document.createElement('div');
        body.style.display = 'grid';
        body.style.gridTemplateColumns = '1fr';
        body.style.gap = '7px';
        body.style.padding = '8px';

        const mainBtn = document.createElement('button');
        mainBtn.id = mainButtonId;
        mainBtn.textContent = 'LM Studio CIM10 + couleur';
        mainBtn.title = 'Exporter les antécédents WEDA non codés vers LM Studio local, importer les CIM-10 puis coloriser localement. Raccourci : touche Inser / Insert';
        styleWedaLauncherButton(mainBtn, 'primary');
        mainBtn.addEventListener('click', () => startAtcdCim10ExportFromWeda('button'), true);

        const colorOnlyBtn = document.createElement('button');
        colorOnlyBtn.id = colorOnlyButtonId;
        colorOnlyBtn.textContent = 'Coloriser seulement';
        colorOnlyBtn.title = 'Coloriser les antécédents CIM-10 déjà présents dans WEDA, sans lancer LM Studio ni coder de nouveaux antécédents.';
        styleWedaLauncherButton(colorOnlyBtn, 'secondary');
        colorOnlyBtn.addEventListener('click', () => {
            runWatchedAsync('weda_color_only_button_async', () => startWedaColorOnly('button'), { source: 'button' });
        }, true);

        body.appendChild(mainBtn);
        body.appendChild(colorOnlyBtn);
        panel.appendChild(handle);
        panel.appendChild(body);

        document.documentElement.appendChild(panel);
        applyWedaLauncherPanelPosition(panel);
        installWedaLauncherPanelDrag(panel, handle);
    }

    function injectHeidiImportButtonIfUseful() {
        if (!isHeidi()) return;

        const existing = document.getElementById('auto-atcd-cim10-lmstudio-heidi-import');
        const resultText = getHeidiAskAiText();
        const hasResult = looksLikeHeidiCim10Result(resultText);

        if (!hasResult) {
            if (existing) existing.remove();
            return;
        }

        if (existing) return;

        const btn = document.createElement('button');
        btn.id = 'auto-atcd-cim10-lmstudio-heidi-import';
        btn.type = 'button';
        btn.textContent = 'Importer résultat vers WEDA';
        btn.title = 'Récupérer le résultat CIM10 Heidi affiché et lancer l’import WEDA';
        btn.style.position = 'fixed';
        btn.style.right = '14px';
        btn.style.bottom = '14px';
        btn.style.zIndex = '2147483647';
        btn.style.background = '#12395f';
        btn.style.color = '#ffffff';
        btn.style.border = '0';
        btn.style.borderRadius = '8px';
        btn.style.padding = '10px 12px';
        btn.style.fontWeight = '700';
        btn.style.fontSize = '13px';
        btn.style.fontFamily = 'Arial, sans-serif';
        btn.style.cursor = 'pointer';
        btn.style.boxShadow = '0 4px 14px rgba(0,0,0,0.25)';
        btn.addEventListener('click', () => {
            runWatchedAsync('heidi_button_force_import_async', () => forceImportFromHeidiResult('button'), { job: getJob() });
        }, true);
        document.documentElement.appendChild(btn);
    }

    /************************************************************
     * OUVERTURE PAGE ANTÉCÉDENTS
     ************************************************************/

    function clickGotoAntecedentsWeda() {
        const clickable = document.querySelector(SELECTOR_WEDA_GOTO_ANTECEDENTS);

        if (clickable) {
            clickElement(clickable);
            return true;
        }

        return callPostBack(POSTBACK_ANTECEDENTS_WEDA, '');
    }

    async function waitForAntecedentPageAndExtract() {
        const job = getJob();
        if (!job || job.sourceWedaTabId !== TAB_ID) return;

        const found = await waitFor(() => isAntecedentPageWeda() && getWedaAntecedentRoot(), 20000, 500);

        if (!found) {
            job.status = 'ERROR';
            job.updatedAt = nowIso();
            job.errors = Array.isArray(job.errors) ? job.errors : [];
            job.errors.push('La page Antécédents WEDA ne s’est pas chargée après le clic.');
            setJob(job);

            showBadge('Erreur : la page Antécédents WEDA ne s’est pas chargée.', { error: true, duration: 10000 });
            return;
        }

        showBadge('Page Antécédents détectée.\nExtraction en cours…', { duration: 5000 });
        injectWedaButtonIfUseful();
        await handleWedaJob();
    }

    /************************************************************
     * LANCEMENT WEDA → LM STUDIO
     ************************************************************/

    function readFreshBatchClickContext() {
        if (!isWeda()) return null;

        try {
            const raw = localStorage.getItem(LOCALSTORAGE_CIM10_BATCH_CLICK_CONTEXT);
            const context = raw ? JSON.parse(raw) : null;
            if (!context || !context.batchId || !context.patientId) return null;

            const ageMs = nowMs() - Number(context.ts || 0);
            if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > 120000) return null;

            const contextUrl = String(context.url || '').split('#')[0];
            const currentUrl = String(location.href || '').split('#')[0];
            if (contextUrl && currentUrl && contextUrl !== currentUrl) return null;

            return context;
        } catch (_) {
            return null;
        }
    }

    function startAtcdCim10ExportFromWeda(source = 'manual') {
        if (!isAntecedentLauncherPageWeda()) {
            showBadge('À lancer uniquement depuis la page Antécédents du patient WEDA.', { error: true, duration: 8000 });
            return;
        }

        const activeWorkerJob = getActiveWorkerJobForThisTab();
        if (activeWorkerJob && activeWorkerJob.status !== 'IMPORT_WEDA') {
            clearWorkerJobIdForThisTab();
        } else if (activeWorkerJob) {
            showBadge('Cet onglet est un worker d’import.\nLance le script depuis un onglet WEDA patient normal.', { error: true, duration: 8000 });
            return;
        }

        try { GM_deleteValue(KEY_WORKER_LOCK); } catch (_) {}
        try { GM_deleteValue(KEY_WORKER_OPEN_LOCK); } catch (_) {}
        try { GM_deleteValue(KEY_HEIDI_OPEN_LOCK); } catch (_) {}

        const batchContext = readFreshBatchClickContext();
        const sourcePatientId = extractWedaPatDkFromUrl(location.href) || (batchContext ? batchContext.patientId : '');
        const job = {
            id: makeJobId(),
            version: VERSION_AUTO_ATCD_CIM10_LMSTUDIO,
            createdAt: nowIso(),
            updatedAt: nowIso(),
            source,
            batchId: batchContext ? batchContext.batchId : '',
            batchPatientId: batchContext ? batchContext.patientId : '',
            batchPatientName: batchContext ? batchContext.patientName || '' : '',
            batchClickTs: batchContext ? Number(batchContext.ts || 0) : 0,
            sourcePatientId,
            expectedPatientId: batchContext ? batchContext.patientId : sourcePatientId,
            sourceWedaTabId: TAB_ID,
            heidiRunnerTabId: '',
            heidiRunnerExpiresAt: 0,
            wedaWorkerTabId: '',
            status: isAntecedentPageWeda() ? 'EXTRACT_WEDA' : 'WAITING_WEDA_ANTECEDENT_PAGE',
            patientUrl: location.href,
            wedaImportUrl: isAntecedentPageWeda() ? location.href : '',
            extractedText: '',
            heidiPayload: '',
            heidiResultText: '',
            parsedAtcd: [],
            importIndex: 0,
            imported: [],
            skipped: [],
            errors: []
        };

        setJob(job);
        logImportEvent('info', 'start', 'Lancement export ATCD CIM10 depuis WEDA.', {
            jobId: job.id,
            source,
            batchId: job.batchId,
            batchPatientId: job.batchPatientId,
            status: job.status,
            url: location.href
        });

        if (isAntecedentPageWeda()) {
            showBadge('Extraction des antécédents WEDA non codés CIM10…', { duration: 5000 });
            setTimeout(() => handleWedaJob(), 300);
            return;
        }

        showBadge('Ouverture du volet Antécédents WEDA…', { duration: 7000 });

        const clicked = clickGotoAntecedentsWeda();

        if (!clicked) {
            job.status = 'ERROR';
            job.updatedAt = nowIso();
            job.errors.push('Impossible de cliquer sur ButtonGotoAntecedent ou de lancer __doPostBack.');
            setJob(job);
            logImportEvent('error', 'open_weda_antecedents', 'Impossible d’ouvrir le volet Antécédents WEDA.', {
                jobId: job.id,
                error: job.errors[job.errors.length - 1]
            });
            showBadge('Impossible d’ouvrir le volet Antécédents WEDA.', { error: true, duration: 10000 });
            return;
        }

        setTimeout(() => waitForAntecedentPageAndExtract(), 700);
    }

    /************************************************************
     * EXTRACTION WEDA
     ************************************************************/

    function isPathologieAntecedentsSourceSection(sectionKey) {
        return sectionKey === SECTION_SOURCE_PATHOLOGIE_ANTECEDENTS;
    }

    function isPathologieAntecedentsSourceText(text) {
        const n = normalizeForMatch(text);
        return /^pathologie\b/.test(n) && /\bantecedents?\b/.test(n);
    }

    function isPathologieAntecedentsSourceHeader(el) {
        if (!el || !el.getAttribute) return false;

        const onclick = String(el.getAttribute('onclick') || '');
        if (onclick.includes(WEDA_SOURCE_PATHOLOGIE_ANTECEDENTS_POSTBACK_ID)) return true;

        const text = normalizeSpaces([
            getHeaderMainLabel(el),
            getOwnText(el),
            el.innerText || el.textContent || '',
            el.getAttribute('title') || ''
        ].join(' '));

        return isPathologieAntecedentsSourceText(text);
    }

    function mapWedaSection(sectionText) {
        const n = normalizeForMatch(sectionText);

        if (isPathologieAntecedentsSourceText(sectionText)) return SECTION_SOURCE_PATHOLOGIE_ANTECEDENTS;

        if (/^antecedents personnels\b/.test(n)) return 'medical';
        if (/^problemes en cours\b/.test(n)) return 'medical';
        if (/^pathologie\b/.test(n)) return 'medical';
        if (/^facteurs de risque complementaire\b/.test(n)) return 'medical';

        if (/^atcd\s+medicaux\b/.test(n)) return 'medical';
        if (/antecedents? medicaux/.test(n)) return 'medical';

        if (/^atcd\s+chirurgicaux\b/.test(n)) return 'chirurgical';
        if (/antecedents? gyneco/.test(n) || /gyneco obstetricaux/.test(n)) return 'chirurgical';
        if (/antecedents? chirurgicaux/.test(n)) return 'chirurgical';

        if (/^atcd\s+familiaux\b/.test(n)) return 'familial';
        if (/^familiaux\b/.test(n)) return 'familial';
        if (/antecedents? familiaux/.test(n)) return 'familial';

        return null;
    }

    function sectionLabel(sectionKey) {
        if (sectionKey === 'medical') return 'ANTÉCÉDENTS MÉDICAUX';
        if (sectionKey === 'chirurgical') return 'ANTÉCÉDENTS CHIRURGICAUX';
        if (sectionKey === 'familial') return 'ANTÉCÉDENTS FAMILIAUX';
        if (isPathologieAntecedentsSourceSection(sectionKey)) return 'PATHOLOGIE [ANTÉCÉDENTS] À RECLASSER';
        return 'AUTRES';
    }

    function getHeaderMainLabel(el) {
        if (!el) return '';
        try {
            const clone = el.cloneNode(true);
            clone.querySelectorAll('.smna').forEach(x => x.remove());
            return normalizeSpaces((clone.innerText || clone.textContent || '').replace(/\[[^\]]+\]/g, ''));
        } catch (_) {
            return normalizeSpaces((el.innerText || el.textContent || '').replace(/\[[^\]]+\]/g, ''));
        }
    }

    function getOwnText(el) {
        if (!el) return '';
        try {
            return normalizeSpaces(Array.from(el.childNodes)
                .filter(node => node.nodeType === 3)
                .map(node => node.nodeValue || '')
                .join(' '));
        } catch (_) {
            return '';
        }
    }

    function looksLikeWedaSectionHeader(el) {
        if (!el || !isVisible(el)) return false;

        const mainLabel = getHeaderMainLabel(el);
        const ownText = getOwnText(el);
        const text = normalizeSpaces(el.innerText || el.textContent || '');
        const fullText = normalizeSpaces(`${mainLabel} ${ownText} ${text} ${el.getAttribute('title') || ''}`);

        if (!fullText) return false;
        if (fullText.length > 320) return false;

        const n = normalizeForMatch(fullText);
        const className = String(el.className || '').toLowerCase();
        const style = String(el.getAttribute('style') || '').toLowerCase();

        if (mapWedaSection(fullText)) return true;
        if (/\[[^\]]+\]/.test(fullText) && /antecedents|pathologie|problemes en cours|facteurs de risque|familiaux|gyneco/.test(n)) return true;
        if (/background/.test(style) && /antecedents|pathologie|problemes en cours|facteurs de risque|familiaux|gyneco/.test(n)) return true;
        if (/header|title|titre|st|rubrique|groupe|antecedent|sma|sm/.test(className) && /antecedents|pathologie|problemes en cours|facteurs de risque|familiaux|gyneco/.test(n)) return true;

        return false;
    }

    function detectSectionHeader(el) {
        if (!looksLikeWedaSectionHeader(el)) return null;
        const mainLabel = getHeaderMainLabel(el);
        const ownText = getOwnText(el);
        const text = normalizeSpaces(el.innerText || el.textContent || '');
        const title = normalizeSpaces(el.getAttribute('title') || '');
        const mapped = mapWedaSection(`${mainLabel} ${ownText} ${text} ${title}`);
        if (mapped) return mapped;
        return '__other__';
    }

    function isNoControleIcon(el) {
        if (!el || !el.classList) return false;
        const className = String(el.className || '');
        const title = String(el.getAttribute('title') || '');
        const nTitle = normalizeForMatch(title);

        return className.includes('imgAtcdNoControle')
            || /non pris en compte dans la securisation/.test(nTitle);
    }

    function isPathologieIcon(el) {
        if (!el || !el.getAttribute) return false;
        const className = String(el.className || '');
        const title = String(el.getAttribute('title') || '');
        const nTitle = normalizeForMatch(title);

        return className.includes('imgPathologie')
            || /^pathologie\b/.test(nTitle);
    }

    function elementHasPathologieIcon(el) {
        if (!el) return false;
        if (isPathologieIcon(el)) return true;

        try {
            return Array.from(el.querySelectorAll ? el.querySelectorAll('.imgPathologie, [title]') : [])
                .some(candidate => isPathologieIcon(candidate));
        } catch (_) {
            return false;
        }
    }

    function isStructuredWedaCim10CodeSpan(el) {
        if (!el || !el.getAttribute) return false;
        const title = normalizeForMatch(el.getAttribute('title') || '');
        if (title !== 'code cim10') return false;
        return extractCim10CodesFromText(el.innerText || el.textContent || '').length > 0;
    }

    function extractStructuredWedaCim10CodesFromElement(el) {
        const codes = [];

        function addFrom(node) {
            if (!isStructuredWedaCim10CodeSpan(node)) return;
            extractCim10CodesFromText(node.innerText || node.textContent || '').forEach(code => {
                const normalized = normalizeCim10Code(code);
                if (normalized && !codes.includes(normalized)) codes.push(normalized);
            });
        }

        addFrom(el);

        try {
            Array.from(el && el.querySelectorAll ? el.querySelectorAll('[title]') : [])
                .forEach(addFrom);
        } catch (_) {}

        return codes;
    }

    function getCandidateContainersNearNoControleIcon(icon, outerContainer) {
        const candidates = [];
        const seen = new Set();

        function add(el) {
            if (!el || seen.has(el)) return;
            seen.add(el);
            candidates.push(el);
        }

        add(icon && icon.parentElement);
        add(icon && icon.parentElement && icon.parentElement.parentElement);
        add(icon && icon.closest && icon.closest('tr'));
        add(icon && icon.closest && icon.closest('li'));

        let p = icon && icon.parentElement;
        let depth = 0;
        while (p && depth < 5) {
            add(p);
            if (outerContainer && p === outerContainer) break;
            p = p.parentElement;
            depth += 1;
        }

        add(outerContainer);
        return candidates.filter(Boolean);
    }

    function extractStructuredWedaCim10CodesNearNoControleIcon(icon, outerContainer) {
        const codes = [];

        for (const candidate of getCandidateContainersNearNoControleIcon(icon, outerContainer)) {
            const text = normalizeSpaces(candidate.innerText || candidate.textContent || '');
            if (!text || text.length > 1600) continue;

            extractStructuredWedaCim10CodesFromElement(candidate).forEach(code => {
                const normalized = normalizeCim10Code(code);
                if (normalized && !codes.includes(normalized)) codes.push(normalized);
            });

            if (codes.length) break;
        }

        return codes;
    }

    function findBestTextContainerForIcon(icon) {
        const candidates = [];
        const seen = new Set();

        function addCandidate(el) {
            if (!el || seen.has(el)) return;
            seen.add(el);
            candidates.push(el);
        }

        addCandidate(icon.closest('tr'));
        addCandidate(icon.closest('table'));
        addCandidate(icon.closest('li'));
        addCandidate(icon.closest('div'));

        let p = icon.parentElement;
        let depth = 0;
        while (p && depth < 8) {
            addCandidate(p);
            p = p.parentElement;
            depth++;
        }

        for (const candidate of candidates) {
            if (!candidate) continue;
            const text = normalizeSpaces(candidate.innerText || candidate.textContent || '');
            if (text && text.length >= 2 && text.length <= 2500) return candidate;
        }

        return icon.parentElement || icon;
    }

    function cleanWedaAntecedentText(rawText, sectionKey) {
        let text = normalizeSpaces(rawText);
        if (!text) return '';

        let lines = text
            .split('\n')
            .map(line => normalizeSpaces(line))
            .filter(Boolean);

        lines = lines.filter(line => {
            const n = normalizeForMatch(line);
            if (!n) return false;
            if (/^\d+$/.test(n)) return false;
            if (/^k$/.test(n)) return false;
            if (/^non pris en compte dans la securisation$/.test(n)) return false;
            if (/^\[atcd\]\s*(medicaux|chirurgicaux|familiaux)$/.test(n)) return false;
            if (/^aucun antecedent familial\s*:\s*non$/.test(n)) return false;
            if (/^aucun antecedent\s*:\s*non$/.test(n)) return false;
            return true;
        });

        text = normalizeSpaces(lines.join('\n'));
        if (!text) return '';

        const n = normalizeForMatch(text);
        if (/^pas d antecedent connu a ce jour/.test(n)) return '';
        if (/^pas d antecedent familial connu a ce jour/.test(n)) return '';
        if (/^aucun antecedent identifie/.test(n)) return '';

        if (sectionKey === 'familial') {
            text = text
                .replace(/\s*-\s*/g, '- ')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
        }

        return text;
    }

    function addExtractedNoControleItemFromIcon(icon, section, sourceLabel, state) {
        if (!isNoControleIcon(icon)) return false;
        if (!section) return false;

        const container = findBestTextContainerForIcon(icon);
        if (!container || state.seenContainers.has(container)) return false;
        state.seenContainers.add(container);

        if (section === 'familial') {
            const existingCim10Codes = extractStructuredWedaCim10CodesNearNoControleIcon(icon, container);
            if (existingCim10Codes.length) {
                state.skippedFamilialAlreadyCoded.push({
                    codes: existingCim10Codes,
                    text: normalizeSpaces(container.innerText || container.textContent || '').slice(0, 260)
                });
                return false;
            }
        }

        const rawText = container.innerText || container.textContent || '';
        const cleaned = cleanWedaAntecedentText(rawText, section);
        if (!cleaned) return false;

        const dedupeKey = section + '|' + normalizeForMatch(cleaned);
        if (state.seenTexts.has(dedupeKey)) return false;
        state.seenTexts.add(dedupeKey);

        state.items.push({
            section,
            label: sectionLabel(section),
            sourceLabel,
            sourceOnly: isPathologieAntecedentsSourceSection(section),
            text: cleaned
        });

        return true;
    }

    function findPathologieAntecedentsSourceHeaders(root) {
        const headers = [];
        const seen = new Set();

        function add(el) {
            if (!el || seen.has(el)) return;
            if (!isVisible(el)) return;
            if (!isPathologieAntecedentsSourceHeader(el)) return;
            seen.add(el);
            headers.push(el);
        }

        try { add(root.querySelector(SELECTOR_WEDA_SOURCE_PATHOLOGIE_ANTECEDENTS)); } catch (_) {}

        try {
            root.querySelectorAll(`[onclick*="${WEDA_SOURCE_PATHOLOGIE_ANTECEDENTS_POSTBACK_ID}"]`).forEach(add);
        } catch (_) {}

        try {
            root.querySelectorAll('.sma, .sta, td, div').forEach(el => {
                const text = normalizeSpaces(`${el.innerText || el.textContent || ''} ${el.getAttribute ? el.getAttribute('title') || '' : ''}`);
                if (text.length <= 260 && isPathologieAntecedentsSourceText(text)) add(el);
            });
        } catch (_) {}

        return headers;
    }

    function addPathologieAntecedentsSourceItems(root, state) {
        const headers = findPathologieAntecedentsSourceHeaders(root);

        for (const header of headers) {
            const sourceLabel = 'Pathologie [Antécédents]';
            const headerText = normalizeSpaces(header.innerText || header.textContent || '');

            if (headerText && headerText.length <= 220) {
                state.detectedHeaders.push({
                    section: SECTION_SOURCE_PATHOLOGIE_ANTECEDENTS,
                    sourceLabel,
                    text: headerText,
                    sourceOnly: true
                });
            }

            const containers = getWedaAllergyCategoryContentContainers(header);
            for (const container of containers) {
                const icons = [];
                if (isNoControleIcon(container)) icons.push(container);
                try { container.querySelectorAll('*').forEach(el => { if (isNoControleIcon(el)) icons.push(el); }); } catch (_) {}

                for (const icon of icons) {
                    addExtractedNoControleItemFromIcon(
                        icon,
                        SECTION_SOURCE_PATHOLOGIE_ANTECEDENTS,
                        sourceLabel,
                        state
                    );
                }
            }
        }
    }

    function extractNonCodedAntecedentsFromWeda() {
        const root = getWedaAntecedentRoot() || document.body;
        const allElements = Array.from(root.querySelectorAll('*'));

        const state = {
            items: [],
            seenContainers: new Set(),
            seenTexts: new Set(),
            detectedHeaders: [],
            skippedFamilialAlreadyCoded: []
        };

        let currentSection = null;
        let currentSourceLabel = '';

        for (const el of allElements) {
            const detectedSection = detectSectionHeader(el);

            if (detectedSection) {
                currentSection = detectedSection === '__other__' ? null : detectedSection;
                currentSourceLabel = currentSection ? getHeaderMainLabel(el) : '';

                const headerText = normalizeSpaces(el.innerText || el.textContent || '');
                if (headerText && headerText.length <= 220) {
                    state.detectedHeaders.push({
                        section: currentSection,
                        sourceLabel: currentSourceLabel,
                        text: headerText,
                        sourceOnly: isPathologieAntecedentsSourceSection(currentSection)
                    });
                }
            }

            addExtractedNoControleItemFromIcon(el, currentSection, currentSourceLabel, state);
        }

        addPathologieAntecedentsSourceItems(root, state);

        return {
            items: state.items,
            debug: {
                url: location.href,
                iconCountByClass: root.querySelectorAll('.imgAtcdNoControle').length,
                iconCountByTitle: root.querySelectorAll('[title*="Non pris"], [title*="sécurisation"], [title*="securisation"]').length,
                pathologieAntecedentsSourceHeaderCount: findPathologieAntecedentsSourceHeaders(root).length,
                detectedHeaders: state.detectedHeaders,
                skippedFamilialAlreadyCodedCount: state.skippedFamilialAlreadyCoded.length,
                skippedFamilialAlreadyCoded: state.skippedFamilialAlreadyCoded.slice(0, 8)
            }
        };
    }

    function formatExtractedAntecedents(items) {
        const groups = { medical: [], chirurgical: [], familial: [], [SECTION_SOURCE_PATHOLOGIE_ANTECEDENTS]: [] };

        for (const item of items) {
            if (groups[item.section]) groups[item.section].push(item);
        }

        const parts = [];

        for (const section of ['medical', 'chirurgical', 'familial']) {
            parts.push(sectionLabel(section));

            if (!groups[section].length) {
                parts.push('Aucun antécédent non codé identifié.');
            } else {
                groups[section].forEach((item, index) => {
                    const source = item.sourceLabel ? `Catégorie WEDA source : ${item.sourceLabel}\n` : '';
                    parts.push(`${index + 1}. ${source}${item.text}`);
                });
            }

            parts.push('');
        }

        if (groups[SECTION_SOURCE_PATHOLOGIE_ANTECEDENTS].length) {
            parts.push(sectionLabel(SECTION_SOURCE_PATHOLOGIE_ANTECEDENTS));
            parts.push('Ces lignes proviennent de la rubrique WEDA Pathologie [Antécédents]. Les reclasser uniquement selon le contenu médical en M, C ou F.');

            groups[SECTION_SOURCE_PATHOLOGIE_ANTECEDENTS].forEach((item, index) => {
                const source = item.sourceLabel ? `Catégorie WEDA source : ${item.sourceLabel}\n` : '';
                parts.push(`${index + 1}. ${source}${item.text}`);
            });

            parts.push('');
        }

        return normalizeSpaces(parts.join('\n'));
    }

    function normalizeWedaAntecedentDeleteName(text) {
        return normalizeForMatch(text)
            .replace(/\s*:\s*/g, ' : ')
            .replace(/\bnon pris en compte dans la securisation\b/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function getWedaAntecedentDeleteTargets() {
        return WEDA_ANTECEDENT_DELETE_EXACT_NAMES
            .map(normalizeWedaAntecedentDeleteName)
            .filter(Boolean);
    }

    function getMatchedWedaAntecedentDeleteName(text) {
        const targets = getWedaAntecedentDeleteTargets();
        if (!targets.length) return '';

        const normalizedWhole = normalizeWedaAntecedentDeleteName(text);
        if (targets.includes(normalizedWhole)) return normalizedWhole;

        const lines = String(text || '')
            .split(/\r?\n/)
            .map(line => normalizeWedaAntecedentDeleteName(line))
            .filter(Boolean);

        return lines.find(line => targets.includes(line)) || '';
    }

    function isWedaAutoUiElement(el) {
        try {
            return !!(
                el &&
                el.closest &&
                el.closest('#auto-atcd-cim10-lmstudio-badge, #auto-atcd-cim10-lmstudio-log-button, #auto-atcd-cim10-lmstudio-log-panel, #auto-atcd-cim10-lmstudio-launcher-panel-avec-colorisation')
            );
        } catch (_) {
            return false;
        }
    }

    function isClickableWedaAntecedentElement(el) {
        if (!el) return false;

        try {
            if (el.matches('a[href], button, input[type="button"], input[type="submit"], [onclick], [role="button"], [role="link"]')) {
                return true;
            }
        } catch (_) {}

        try {
            const cursor = ownerWin(el).getComputedStyle(el).cursor;
            if (cursor === 'pointer') return true;
        } catch (_) {}

        return false;
    }

    function getWedaAntecedentSelectableTarget(el, root) {
        let p = el;
        let depth = 0;

        while (p && p !== root && p !== document.body && depth < 8) {
            if (isClickableWedaAntecedentElement(p)) return p;
            p = p.parentElement;
            depth += 1;
        }

        try {
            const row = el.closest && el.closest('tr, li, [role="row"]');
            if (row && root && root.contains(row)) return row;
        } catch (_) {}

        return null;
    }

    function getVisibleWedaDeleteButton(initialDoc) {
        const button = findElementDeep(SELECTOR_WEDA_DELETE, initialDoc);
        if (!button || !isVisible(button)) return null;
        if (button.disabled) return null;
        return button;
    }

    function getVisibleWedaDuplicateCleanupButton(initialDoc) {
        const button = findElementDeep(SELECTOR_WEDA_DELETE_DOUBLON, initialDoc);
        if (!button || !isVisible(button)) return null;
        if (button.disabled) return null;
        return button;
    }

    async function clickWedaDuplicateCleanupIfPresent(job, reason = '') {
        const report = {
            reason: reason || '',
            present: false,
            clicked: false,
            text: '',
            error: ''
        };

        if (!isAntecedentPageWeda()) return report;

        const button = getVisibleWedaDuplicateCleanupButton();
        if (!button) return report;

        report.present = true;
        report.text = normalizeSpaces(button.innerText || button.textContent || button.value || '');

        try {
            showBadge('Suppression WEDA des antécédents en doublon…', { duration: 7000 });
            const clicked = clickElement(button);
            report.clicked = !!clicked;

            if (!clicked) {
                report.error = 'Clic impossible sur le bouton WEDA de suppression des doublons.';
                logImportEvent('warning', 'weda_duplicate_cleanup_failed', report.error, {
                    jobId: job && job.id || '',
                    report
                });
                return report;
            }

            await waitForWedaIdle(20000);
            await sleep(1500);

            logImportEvent('warning', 'weda_duplicate_cleanup', 'Bouton WEDA de suppression des antécédents en doublon activé.', {
                jobId: job && job.id || '',
                report
            });
        } catch (e) {
            report.error = String(e && e.message ? e.message : e);
            logImportEvent('warning', 'weda_duplicate_cleanup_failed', 'Erreur pendant la suppression WEDA des doublons.', {
                jobId: job && job.id || '',
                report
            });
        }

        return report;
    }

    function getEmptyAllergyCategoryLabel(el) {
        const text = normalizeSpaces(el ? (el.innerText || el.textContent || '') : '');
        if (!text || text.length > 350) return '';
        const normalized = normalizeForMatch(text);
        if (!normalized) return '';

        if (!/\ballerg/.test(normalized)) return '';
        if (!/\b(non droppable|vous ne pouvez pas dropper)\b/.test(normalized) && !(el.querySelector && el.querySelector('.imgForbidden'))) {
            return '';
        }

        if (/\ballergies?\s+medicamenteuses?\b/.test(normalized)) return 'Allergies Médicamenteuses';
        if (/\ballergies?\b/.test(normalized)) return /^allergie\b/.test(normalized) ? 'Allergie' : 'Allergies';

        return '';
    }

    function findNoKnownAllergyButtonNearHeader(header) {
        if (!header) return null;

        const containers = [];
        const seen = new Set();

        function add(el) {
            if (!el || seen.has(el)) return;
            seen.add(el);
            containers.push(el);
        }

        try { add(header.closest('tr')); } catch (_) {}
        try { add(header.closest('table')); } catch (_) {}
        add(header.parentElement);

        for (const container of containers) {
            try {
                const candidates = Array.from(container.querySelectorAll(SELECTOR_WEDA_NO_KNOWN_ALLERGY));
                const visible = candidates.find(candidate => isVisible(candidate) && !candidate.disabled);
                if (visible) return visible;
            } catch (_) {}
        }

        return null;
    }

    function getWedaAntecedentTopLevelTable(el) {
        if (!el || !el.closest) return null;

        try {
            const panel = getWedaAntecedentRoot();
            const directParent = panel && (panel.querySelector(':scope > div') || panel);
            if (directParent) {
                let node = el;
                while (node && node !== panel && node !== directParent) {
                    if (String(node.tagName || '').toLowerCase() === 'table' && node.parentElement === directParent) {
                        return node;
                    }
                    node = node.parentElement;
                }
            }
        } catch (_) {}

        try {
            const table = el.closest(`${SELECTOR_WEDA_ANTECEDENT_UPDATE_PANEL} > div > table`);
            if (table) return table;
        } catch (_) {}

        try {
            const panel = getWedaAntecedentRoot();
            const tables = panel ? Array.from(panel.querySelectorAll(':scope > div > table')) : [];
            return tables.find(table => table && table.contains(el)) || null;
        } catch (_) {}

        try {
            return el.closest('table');
        } catch (_) {
            return null;
        }
    }

    function tableContainsWedaCategoryHeader(table) {
        if (!table) return false;

        try {
            return Array.from(table.querySelectorAll('.smna')).some(el => isVisible(el));
        } catch (_) {
            return false;
        }
    }

    function getWedaAllergyCategoryContentContainers(header, button = null) {
        if (!header) return [];

        let startTable = getWedaAntecedentTopLevelTable(header);

        try {
            if (button && !startTable) {
                const headerTables = Array.from(header.ownerDocument.querySelectorAll('table'))
                    .filter(table => table && table.contains(header) && table.contains(button));
                const shared = headerTables.sort((a, b) => a.querySelectorAll('*').length - b.querySelectorAll('*').length)[0];
                if (shared) startTable = shared;
            }
        } catch (_) {}

        if (!startTable) {
            try { startTable = header.closest('table'); } catch (_) {}
        }

        const containers = [];
        if (startTable) {
            containers.push(startTable);

            let sibling = startTable.nextElementSibling;
            while (sibling) {
                if (String(sibling.tagName || '').toLowerCase() === 'table') {
                    if (tableContainsWedaCategoryHeader(sibling)) break;
                    containers.push(sibling);
                }
                sibling = sibling.nextElementSibling;
            }
        }

        if (!containers.length && header.parentElement) containers.push(header.parentElement);
        return containers;
    }

    function getWedaAllergyContainerMeaningfulText(container, header = null, label = '') {
        if (!container) return '';

        let text = '';
        try {
            const clone = container.cloneNode(true);
            clone.querySelectorAll('.smna, .smno, .imgForbidden, script, style, noscript, input, select, textarea, button').forEach(el => el.remove());
            clone.querySelectorAll(SELECTOR_WEDA_NO_KNOWN_ALLERGY).forEach(el => {
                const parent = el && el.parentElement;
                if (parent && normalizeSpaces(parent.innerText || parent.textContent || '').length < 120) parent.remove();
                else el.remove();
            });
            text = normalizeSpaces(clone.innerText || clone.textContent || '');
        } catch (_) {
            text = normalizeSpaces(container.innerText || container.textContent || '');
        }

        const headerText = normalizeSpaces(header ? (header.innerText || header.textContent || '') : '');

        if (headerText) text = text.split(headerText).join(' ');
        if (label) text = text.split(label).join(' ');

        const normalized = normalizeForMatch(text)
            .replace(/\b(?:pas\s+d|pas\s+de|aucune)\s+allergies?\s+connue?s?(?:\s+a\s+ce\s+jour)?\b/g, ' ')
            .replace(/\b(?:pas\s+dallergie|pas\s+dallergies)\s+connue?s?(?:\s+a\s+ce\s+jour)?\b/g, ' ')
            .replace(/\btype\s+de\s+l\s+onglet\s+antecedents?\b/g, ' ')
            .replace(/\btype de l onglet\b/g, ' ')
            .replace(/\bantecedents?\b/g, ' ')
            .replace(/\bpathologie\b/g, ' ')
            .replace(/\ballergies?\s+medicamenteuses?\b/g, ' ')
            .replace(/\ballergies?\b/g, ' ')
            .replace(/\bvous ne pouvez pas dropper dans cette zone\b/g, ' ')
            .replace(/\b(?:vous|ne|pouvez|pas|dropper|dans|cette|zone)\b/g, ' ')
            .replace(/\bnon droppable\b/g, ' ')
            .replace(/\bpostbackpasallergieconnu\b/g, ' ')
            .replace(/\b[a-z]\b/g, ' ')
            .replace(/\bajouter l information\b/g, ' ')
            .replace(/\bajouter\b/g, ' ')
            .replace(/\binformation\b/g, ' ')
            .replace(/\bordre de tri de l antecedent dans l onglet\b/g, ' ')
            .replace(/\binformations\b/g, ' ')
            .replace(/\bnon pris en compte dans la securisation\b/g, ' ')
            .replace(/\b\d+\b/g, ' ')
            .replace(/[()[\]{}:;,.!]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        return normalized;
    }

    function isNoKnownAllergyUiElement(el) {
        if (!el || !el.getAttribute) return false;

        const attrs = normalizeForMatch([
            el.getAttribute('onclick') || '',
            el.getAttribute('title') || '',
            el.getAttribute('alt') || '',
            el.getAttribute('src') || '',
            el.className || ''
        ].join(' '));

        return /postbackpasallergieconnu|pas\s+d\s+allergie|pas\s+de\s+allergie|noallergy/.test(attrs);
    }

    function hasWedaAllergyEntryMarker(container, header = null, label = '') {
        if (!container || !container.querySelectorAll) return false;

        const meaningfulText = getWedaAllergyContainerMeaningfulText(container, header, label);
        if (!meaningfulText) return false;

        try {
            const markers = Array.from(container.querySelectorAll('[onclick*="ModifyAtcd("], .imgAtcdNoControle, .imgAtcdDivers'));
            return markers.some(marker => {
                if (!marker || isNoKnownAllergyUiElement(marker)) return false;
                const onclick = marker.getAttribute ? String(marker.getAttribute('onclick') || '') : '';
                if (/ModifyAtcd\s*\(/i.test(onclick)) return true;
                if (String(marker.className || '').includes('imgAtcdNoControle')) return true;
                return false;
            });
        } catch (_) {
            return false;
        }
    }

    function getWedaAllergyCategoryMeaningfulText(header, button = null, label = '') {
        const containers = getWedaAllergyCategoryContentContainers(header, button);
        if (!containers.length) return '';

        return containers
            .map(container => getWedaAllergyContainerMeaningfulText(container, header, label))
            .filter(Boolean)
            .join(' ');
    }

    function wedaAllergyContainerLooksLikeEntry(container, header = null, label = '') {
        if (!container || !isVisible(container)) return false;

        if (hasWedaAllergyEntryMarker(container, header, label)) return true;

        return !!getWedaAllergyContainerMeaningfulText(container, header, label);
    }

    function wedaAllergyCategoryAlreadyHasEntry(header, button = null, label = '') {
        const containers = getWedaAllergyCategoryContentContainers(header, button);
        if (!containers.length) return false;

        return containers.some(container => wedaAllergyContainerLooksLikeEntry(container, header, label));
    }

    function summarizeWedaAllergyCategoryState(header, button = null, label = '') {
        const containers = getWedaAllergyCategoryContentContainers(header, button);
        const entryContainers = containers.filter(container => wedaAllergyContainerLooksLikeEntry(container, header, label));

        return {
            label: label || getEmptyAllergyCategoryLabel(header) || '',
            hasEntry: entryContainers.length > 0,
            containerCount: containers.length,
            entryCount: entryContainers.length,
            meaningfulSamples: containers.slice(0, 3).map(container => getWedaAllergyContainerMeaningfulText(container, header, label)).filter(Boolean),
            entrySamples: entryContainers.slice(0, 3).map(container => {
                const text = normalizeSpaces(container.innerText || container.textContent || '');
                return text.length > 220 ? `${text.slice(0, 219)}…` : text;
            })
        };
    }

    function collectWedaAllergyCategoryStates() {
        const states = [];
        const inspected = new Set();

        for (const rule of WEDA_EMPTY_ALLERGY_CATEGORY_RULES) {
            const headers = queryElementsDeep(rule.headerSelector);
            for (const header of headers) {
                if (!header || inspected.has(header) || isWedaAutoUiElement(header) || !isVisible(header)) continue;
                const label = getMatchingEmptyAllergyCategoryLabel(header, rule.label);
                if (!label) continue;
                inspected.add(header);

                const doc = header.ownerDocument || document;
                let button = null;
                try { button = doc.querySelector(rule.buttonSelector); } catch (_) {}
                if (!button) button = findNoKnownAllergyButtonNearHeader(header);
                states.push(summarizeWedaAllergyCategoryState(header, button, label));
            }
        }

        return states;
    }

    function textLooksLikeNoKnownAllergyEntry(text) {
        const normalized = normalizeForMatch(text);
        return /\b(?:pas\s+d|pas\s+de|aucune)\s+allergies?\s+connue?s?\b/.test(normalized);
    }

    function stripNoKnownAllergyText(text) {
        return normalizeForMatch(text)
            .replace(/\b(?:pas\s+d|pas\s+de|aucune)\s+allergies?\s+connue?s?(?:\s+a\s+ce\s+jour)?\b/g, ' ')
            .replace(/\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/g, ' ')
            .replace(/\b\d{1,2}\s+\d{1,2}\s+\d{2,4}\b/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function wedaAllergyCategoryHasKnownAllergyEntry(header, button = null, label = '') {
        const text = getWedaAllergyCategoryMeaningfulText(header, button, label);
        if (!text) return false;
        return !!stripNoKnownAllergyText(text);
    }

    function textLooksLikeKnownAllergyLine(text) {
        const stripped = stripNoKnownAllergyText(text);
        if (!stripped) return false;
        return /\ballergies?\s*[:]\s*\S+/.test(stripped)
            || /\ballergies?\s+\S+/.test(stripped)
            || /\bterrain\s+allergique\b/.test(stripped);
    }

    function hasAnyKnownAllergyLineInWedaAntecedents() {
        const roots = queryElementsDeep(SELECTOR_WEDA_ANTECEDENT_UPDATE_PANEL);
        if (!roots.length) roots.push(document.body);

        for (const root of roots) {
            if (!root) continue;

            const elements = [];
            try {
                Array.from(root.querySelectorAll('span, div, td, tr, table')).forEach(el => elements.push(el));
            } catch (_) {}

            for (const el of elements) {
                if (!el || isWedaAutoUiElement(el) || !isVisible(el)) continue;
                if (el.querySelector && el.querySelector('.smna, .smno, .imgForbidden')) continue;

                const text = normalizeSpaces([
                    el.innerText,
                    el.textContent,
                    el.getAttribute && el.getAttribute('title')
                ].filter(Boolean).join(' '));

                if (!text || text.length > 500) continue;
                if (textLooksLikeKnownAllergyLine(text)) return true;
            }
        }

        return false;
    }

    function hasAnyKnownAllergyEntryInConfiguredCategories() {
        const inspected = new Set();

        function inspect(header, button, label) {
            if (!header || inspected.has(header)) return false;
            inspected.add(header);
            return wedaAllergyCategoryHasKnownAllergyEntry(header, button, label);
        }

        for (const rule of WEDA_EMPTY_ALLERGY_CATEGORY_RULES) {
            const headers = queryElementsDeep(rule.headerSelector);
            for (const header of headers) {
                if (!header || isWedaAutoUiElement(header) || !isVisible(header)) continue;
                const label = getMatchingEmptyAllergyCategoryLabel(header, rule.label);
                if (!label) continue;

                const doc = header.ownerDocument || document;
                let button = null;
                try { button = doc.querySelector(rule.buttonSelector); } catch (_) {}
                if (!button) button = findNoKnownAllergyButtonNearHeader(header);

                if (inspect(header, button, label)) return true;
            }
        }

        const roots = queryElementsDeep(SELECTOR_WEDA_ANTECEDENT_UPDATE_PANEL);
        if (!roots.length) roots.push(document.body);

        for (const root of roots) {
            if (!root) continue;
            const headers = Array.from(root.querySelectorAll('.smna, div'));
            for (const header of headers) {
                if (!header || inspected.has(header) || isWedaAutoUiElement(header) || !isVisible(header)) continue;
                const label = getMatchingEmptyAllergyCategoryLabel(header);
                if (!label) continue;
                const button = findNoKnownAllergyButtonNearHeader(header);
                if (inspect(header, button, label)) return true;
            }
        }

        return false;
    }

    function hasVisibleWedaNoKnownAllergyEntry() {
        const roots = queryElementsDeep(SELECTOR_WEDA_ANTECEDENT_UPDATE_PANEL);
        if (!roots.length) roots.push(document.body);

        for (const root of roots) {
            if (!root) continue;

            const elements = [root];
            try {
                Array.from(root.querySelectorAll('div, span, td, tr, li, a, label')).forEach(el => elements.push(el));
            } catch (_) {}

            for (const el of elements) {
                if (!el || isWedaAutoUiElement(el) || !isVisible(el)) continue;
                const text = normalizeSpaces(el.innerText || el.textContent || '');
                if (!text || text.length > 260) continue;
                if (textLooksLikeNoKnownAllergyEntry(text)) return true;
            }
        }

        return false;
    }

    function getMatchingEmptyAllergyCategoryLabel(header, expectedLabel = '') {
        const label = getEmptyAllergyCategoryLabel(header);
        if (!label) return '';

        if (!expectedLabel) return label;
        return normalizeForMatch(label) === normalizeForMatch(expectedLabel) ? label : '';
    }

    function buildNoKnownAllergyCandidate(header, button, label, source = '') {
        return {
            label,
            header,
            headerText: normalizeSpaces(header.innerText || header.textContent || '').slice(0, 260),
            button,
            onclick: button.getAttribute ? String(button.getAttribute('onclick') || '') : '',
            target: describeWedaDomElement(button),
            source
        };
    }

    function getNoKnownAllergyCandidateKey(candidate) {
        const labelKey = normalizeForMatch(candidate && candidate.label || '');
        if (labelKey) return labelKey;

        const target = candidate && candidate.target || {};
        const buttonKey = candidate && candidate.onclick
            ? candidate.onclick
            : [
                target.id || '',
                target.tag || '',
                target.className || '',
                target.title || '',
                target.alt || ''
            ].join('|');

        return [
            candidate && candidate.label || '',
            buttonKey
        ].join('|');
    }

    function findConfiguredEmptyAllergyCategoryNoKnownAllergyCandidates() {
        const candidates = [];

        for (const rule of WEDA_EMPTY_ALLERGY_CATEGORY_RULES) {
            const headers = queryElementsDeep(rule.headerSelector);

            for (const header of headers) {
                if (!header || isWedaAutoUiElement(header) || !isVisible(header)) continue;

                const label = getMatchingEmptyAllergyCategoryLabel(header, rule.label);
                if (!label) continue;

                const doc = header.ownerDocument || document;
                let button = null;
                try { button = doc.querySelector(rule.buttonSelector); } catch (_) {}
                if (!button) button = findNoKnownAllergyButtonNearHeader(header);
                if (!button || !isVisible(button) || button.disabled) continue;
                if (wedaAllergyCategoryAlreadyHasEntry(header, button, label)) continue;

                const onclick = button.getAttribute ? String(button.getAttribute('onclick') || '') : '';
                if (rule.postBackArgument && !onclick.includes(rule.postBackArgument)) continue;

                candidates.push(buildNoKnownAllergyCandidate(header, button, label, 'configured_selector'));
            }
        }

        return candidates;
    }

    function findEmptyAllergyCategoryNoKnownAllergyCandidates() {
        const roots = queryElementsDeep(SELECTOR_WEDA_ANTECEDENT_UPDATE_PANEL);
        if (!roots.length) roots.push(document.body);

        const candidates = findConfiguredEmptyAllergyCategoryNoKnownAllergyCandidates();
        const seen = new Set();

        for (const root of roots) {
            if (!root) continue;

            const headers = Array.from(root.querySelectorAll('.smna, div'));
            for (const header of headers) {
                if (!header || seen.has(header) || isWedaAutoUiElement(header)) continue;
                seen.add(header);
                if (!isVisible(header)) continue;

                const label = getMatchingEmptyAllergyCategoryLabel(header);
                if (!label) continue;

                const button = findNoKnownAllergyButtonNearHeader(header);
                if (!button) continue;
                if (wedaAllergyCategoryAlreadyHasEntry(header, button, label)) continue;

                candidates.push(buildNoKnownAllergyCandidate(header, button, label, 'generic_scan'));
            }
        }

        const unique = [];
        const keys = new Set();
        for (const candidate of candidates) {
            const key = getNoKnownAllergyCandidateKey(candidate);
            if (keys.has(key)) continue;
            keys.add(key);
            unique.push(candidate);
        }

        return unique;
    }

    async function clickNoKnownAllergyForEmptyCategories(job, reason = '') {
        const report = {
            reason: reason || '',
            presentCount: 0,
            clickedCount: 0,
            attempts: []
        };

        if (!isAntecedentPageWeda()) return report;

        const clickedKeys = new Set();

        const maxPasses = Math.max(1, WEDA_EMPTY_ALLERGY_CATEGORY_RULES.length);

        for (let pass = 0; pass < maxPasses; pass += 1) {
            const candidates = findEmptyAllergyCategoryNoKnownAllergyCandidates()
                .filter(candidate => {
                    const key = getNoKnownAllergyCandidateKey(candidate);
                    return !clickedKeys.has(key);
                });

            if (!candidates.length) break;

            report.presentCount += candidates.length;
            const candidate = candidates[0];
            const key = getNoKnownAllergyCandidateKey(candidate);
            clickedKeys.add(key);

            const attempt = {
                pass: pass + 1,
                label: candidate.label,
                headerText: candidate.headerText,
                onclick: candidate.onclick,
                source: candidate.source,
                target: candidate.target,
                clicked: false,
                skipped: false,
                meaningfulTextBeforeClick: '',
                error: ''
            };
            report.attempts.push(attempt);

            try {
                attempt.meaningfulTextBeforeClick = getWedaAllergyCategoryMeaningfulText(candidate.header, candidate.button, candidate.label).slice(0, 260);
                if (wedaAllergyCategoryAlreadyHasEntry(candidate.header, candidate.button, candidate.label)) {
                    attempt.skipped = true;
                    attempt.error = 'Rubrique Allergies non vide : bouton Pas d’allergie connue non activé.';
                    logImportEvent('warning', 'weda_no_known_allergy_blocked', attempt.error, {
                        jobId: job && job.id || '',
                        attempt
                    });
                    continue;
                }

                showBadge(`Ajout WEDA : pas d’allergie connue\n${candidate.label}`, { duration: 7000 });
                const clicked = clickElement(candidate.button);
                attempt.clicked = !!clicked;

                if (!clicked) {
                    attempt.error = 'Clic impossible sur le bouton Pas d’allergie connue.';
                    logImportEvent('warning', 'weda_no_known_allergy_failed', attempt.error, {
                        jobId: job && job.id || '',
                        attempt
                    });
                    continue;
                }

                report.clickedCount += 1;
                await waitForWedaIdle(20000);
                await sleep(1200);
            } catch (e) {
                attempt.error = String(e && e.message ? e.message : e);
                logImportEvent('warning', 'weda_no_known_allergy_failed', 'Erreur pendant l’ajout Pas d’allergie connue.', {
                    jobId: job && job.id || '',
                    attempt
                });
            }
        }

        if (report.clickedCount > 0) {
            logImportEvent('warning', 'weda_no_known_allergy', `${report.clickedCount} rubrique(s) allergies vide(s) marquée(s) sans allergie connue.`, {
                jobId: job && job.id || '',
                report
            });
        }

        return report;
    }

    function jobHasCheckedNoKnownAllergyBeforeImport(job) {
        return !!(job && (
            job.noKnownAllergyBeforeImportCheckedAt ||
            job.noKnownAllergyBeforeImport ||
            job.noKnownAllergyAfterImport
        ));
    }

    async function clickNoKnownAllergyOnceBeforeImport(job, runToken) {
        const startedAt = nowIso();
        const report = {
            reason: 'before_import_once',
            checkedAt: startedAt,
            skipped: false,
            skipReason: '',
            presentCount: 0,
            clickedCount: 0,
            attempts: [],
            allergyCategories: []
        };

        let latest = getJob() || job;
        if (!latest) {
            report.skipped = true;
            report.skipReason = 'job_missing';
            return report;
        }

        if (jobHasCheckedNoKnownAllergyBeforeImport(latest)) {
            report.skipped = true;
            report.skipReason = 'already_checked_for_job';
            return report;
        }

        latest.noKnownAllergyBeforeImportCheckedAt = startedAt;
        latest.noKnownAllergyBeforeImport = report;
        latest.updatedAt = nowIso();
        latest.wedaWorkerTabId = TAB_ID;
        setJob(latest);

        if (Number(latest.importIndex || 0) > 0) {
            report.skipped = true;
            report.skipReason = 'import_already_started';
            latest.noKnownAllergyBeforeImport = report;
            latest.updatedAt = nowIso();
            setJob(latest);
            return report;
        }

        assertImportRunActive(runToken);
        await waitForWedaIdle(20000);
        await sleep(1500);
        report.allergyCategories = collectWedaAllergyCategoryStates();

        if (hasVisibleWedaNoKnownAllergyEntry()) {
            report.skipped = true;
            report.skipReason = 'no_known_allergy_already_visible';
            latest = getJob() || latest;
            latest.noKnownAllergyBeforeImportCheckedAt = startedAt;
            latest.noKnownAllergyBeforeImport = report;
            latest.updatedAt = nowIso();
            latest.wedaWorkerTabId = TAB_ID;
            setJob(latest);
            return report;
        }

        assertImportRunActive(runToken);
        const clickReport = await clickNoKnownAllergyForEmptyCategories(latest, 'before_import_once');
        Object.assign(report, clickReport, {
            reason: 'before_import_once',
            checkedAt: startedAt,
            skipped: !clickReport.clickedCount,
            skipReason: clickReport.clickedCount ? '' : 'no_empty_allergy_category_candidate',
            allergyCategories: collectWedaAllergyCategoryStates()
        });

        latest = getJob() || latest;
        latest.noKnownAllergyBeforeImportCheckedAt = startedAt;
        latest.noKnownAllergyBeforeImport = report;
        latest.updatedAt = nowIso();
        latest.wedaWorkerTabId = TAB_ID;
        setJob(latest);

        return report;
    }

    async function clickNoKnownAllergyBeforeTerminalNoItems(job, reason = '') {
        const latest = getJob() || job;
        if (!latest || !isAntecedentPageWeda()) return null;

        const report = await clickNoKnownAllergyOnceBeforeImport(latest, '');
        const refreshed = getJob() || latest;
        refreshed.noKnownAllergyBeforeTerminalNoItems = Object.assign({}, report, {
            terminalReason: reason || 'no_items_before_terminal'
        });
        refreshed.updatedAt = nowIso();
        setJob(refreshed);

        if (report && report.clickedCount > 0) {
            logImportEvent('warning', 'weda_no_known_allergy_no_items', 'Pas d’allergie connue ajouté avant fermeture car aucun antécédent n’est à importer.', {
                jobId: refreshed.id || '',
                reason: reason || '',
                report
            });
        }

        return report;
    }

    function findWedaAntecedentDeleteCandidate() {
        const roots = queryElementsDeep(SELECTOR_WEDA_ANTECEDENT_UPDATE_PANEL);
        if (!roots.length) roots.push(document.body);

        const candidates = [];
        const seen = new Set();

        for (const root of roots) {
            if (!root) continue;

            const elements = Array.from(root.querySelectorAll('a[href], [onclick], tr, li, td, span, div, label'));
            for (const el of elements) {
                if (!el || seen.has(el) || isWedaAutoUiElement(el)) continue;
                seen.add(el);

                try {
                    if (el.matches(SELECTOR_WEDA_DELETE) || el.closest(SELECTOR_WEDA_DELETE)) continue;
                } catch (_) {}

                if (!isVisible(el)) continue;

                const text = normalizeSpaces([
                    el.innerText,
                    el.textContent,
                    el.value,
                    el.getAttribute && el.getAttribute('title')
                ].filter(Boolean).join('\n'));

                if (!text || text.length > 900) continue;

                const matchedName = getMatchedWedaAntecedentDeleteName(text);
                if (!matchedName) continue;

                const target = getWedaAntecedentSelectableTarget(el, root);
                if (!target) continue;

                const directClickable = isClickableWedaAntecedentElement(el) || isClickableWedaAntecedentElement(target);
                const row = el.closest ? el.closest('tr, li, [role="row"]') : null;

                candidates.push({
                    el,
                    target,
                    root,
                    doc: el.ownerDocument || document,
                    matchedName,
                    text,
                    directClickable,
                    score:
                        (directClickable ? 0 : 20) +
                        (row ? 5 : 15) +
                        Math.min(text.length, 900)
                });
            }
        }

        candidates.sort((a, b) => a.score - b.score);
        return candidates[0] || null;
    }

    function getWedaSelectedControlText(initialDoc) {
        const values = [];

        for (const control of queryElementsDeep('input, textarea, select', initialDoc)) {
            if (!control || !isVisible(control)) continue;

            const type = String(control.getAttribute('type') || '').toLowerCase();
            if (['hidden', 'submit', 'button', 'image', 'reset'].includes(type)) continue;

            if (String(control.tagName || '').toLowerCase() === 'select') {
                const selected = Array.from(control.selectedOptions || [])
                    .map(option => `${option.textContent || ''} ${option.value || ''}`)
                    .join(' ');
                if (selected) values.push(selected);
                continue;
            }

            if (control.value) values.push(control.value);
        }

        return normalizeSpaces(values.join('\n'));
    }

    function wedaSelectedControlsMatchUnwantedAntecedent(initialDoc) {
        const text = getWedaSelectedControlText(initialDoc);
        const normalized = normalizeForMatch(text);
        return !!(
            getMatchedWedaAntecedentDeleteName(text) ||
            (/\bdivers\b/.test(normalized) && /\bcaisse\b/.test(normalized))
        );
    }

    function clickElementWithAutoConfirm(el) {
        if (!el) return false;

        const replacements = [];

        function replaceConfirm(win) {
            if (!win || typeof win.confirm !== 'function') return;
            if (replacements.some(entry => entry.win === win)) return;
            replacements.push({ win, confirm: win.confirm });
            win.confirm = () => true;
        }

        try { replaceConfirm(ownerWin(el)); } catch (_) {}
        try { replaceConfirm(window); } catch (_) {}
        try {
            if (typeof unsafeWindow !== 'undefined') replaceConfirm(unsafeWindow);
        } catch (_) {}

        try {
            try { el.scrollIntoView({ block: 'center', inline: 'center' }); } catch (_) {}
            el.click();
            return true;
        } catch (_) {
            return false;
        } finally {
            for (const entry of replacements) {
                try { entry.win.confirm = entry.confirm; } catch (_) {}
            }
        }
    }

    async function deleteConfiguredWedaAntecedentsBeforeExtraction(job) {
        const report = {
            targetNames: WEDA_ANTECEDENT_DELETE_EXACT_NAMES.slice(),
            deletedCount: 0,
            attempts: []
        };

        if (!isAntecedentPageWeda()) return report;

        for (let pass = 0; pass < MAX_WEDA_ANTECEDENT_DELETE_PASSES; pass += 1) {
            const candidate = findWedaAntecedentDeleteCandidate();
            if (!candidate) break;

            const deleteWasVisibleBeforeSelection = !!getVisibleWedaDeleteButton(candidate.doc);
            const attempt = {
                pass: pass + 1,
                matchedName: candidate.matchedName,
                text: candidate.text.slice(0, 240),
                target: describeWedaDomElement(candidate.target),
                directClickable: !!candidate.directClickable,
                deleted: false,
                error: ''
            };
            report.attempts.push(attempt);

            showBadge('Suppression de l’antécédent parasite : divers : Caisse :', { duration: 7000 });
            clickElement(candidate.target);
            await waitForWedaIdle(10000);
            await sleep(600);

            const deleteButton = await waitFor(() => getVisibleWedaDeleteButton(candidate.doc), 8000, 250);
            if (!deleteButton) {
                attempt.error = 'Bouton Supprimer WEDA introuvable après sélection.';
                logImportEvent('warning', 'delete_unwanted_atcd', attempt.error, {
                    jobId: job && job.id || '',
                    attempt
                });
                break;
            }

            const selectedControlsMatch = wedaSelectedControlsMatchUnwantedAntecedent(candidate.doc);
            if (deleteWasVisibleBeforeSelection && !selectedControlsMatch && !candidate.directClickable) {
                attempt.error = 'Suppression bloquée : la sélection active ne confirme pas l’antécédent divers : Caisse :.';
                logImportEvent('warning', 'delete_unwanted_atcd_guard', attempt.error, {
                    jobId: job && job.id || '',
                    attempt,
                    selectedControlText: getWedaSelectedControlText(candidate.doc).slice(0, 300)
                });
                break;
            }

            const clicked = clickElementWithAutoConfirm(deleteButton);
            if (!clicked) {
                attempt.error = 'Clic sur le bouton Supprimer impossible.';
                logImportEvent('warning', 'delete_unwanted_atcd', attempt.error, {
                    jobId: job && job.id || '',
                    attempt
                });
                break;
            }

            await waitForWedaIdle(15000);
            await sleep(1200);

            const removed = await waitFor(() => !findWedaAntecedentDeleteCandidate(), 10000, 500);
            attempt.deleted = !!removed;

            if (!removed) {
                attempt.error = 'L’antécédent parasite est encore visible après suppression.';
                logImportEvent('warning', 'delete_unwanted_atcd_still_visible', attempt.error, {
                    jobId: job && job.id || '',
                    attempt
                });
                break;
            }

            report.deletedCount += 1;
        }

        return report;
    }

    function getWedaCommentDateRepairCandidateKey(candidate) {
        if (!candidate) return '';
        return [
            candidate.date || '',
            normalizeForMatch(candidate.text || '').slice(0, 240),
            describeWedaDomElement(candidate.target) && JSON.stringify(describeWedaDomElement(candidate.target))
        ].filter(Boolean).join('|');
    }

    function findWedaCommentDateRepairCandidate(excludedKeys = new Set()) {
        const roots = queryElementsDeep(SELECTOR_WEDA_ANTECEDENT_UPDATE_PANEL);
        if (!roots.length) roots.push(document.body);

        const candidates = [];
        const seen = new Set();

        for (const root of roots) {
            if (!root) continue;

            const elements = Array.from(root.querySelectorAll('a[href], [onclick], tr, li, td, span, div, label'));
            for (const el of elements) {
                if (!el || seen.has(el) || isWedaAutoUiElement(el)) continue;
                seen.add(el);

                try {
                    if (el.matches(SELECTOR_WEDA_DELETE) || el.closest(SELECTOR_WEDA_DELETE)) continue;
                    if (el.matches(SELECTOR_WEDA_VALID) || el.closest(SELECTOR_WEDA_VALID)) continue;
                    if (el.matches(SELECTOR_WEDA_COMMENT) || el.closest(SELECTOR_WEDA_COMMENT)) continue;
                } catch (_) {}

                if (!isVisible(el)) continue;

                const text = normalizeSpaces([
                    el.innerText,
                    el.textContent,
                    el.value,
                    el.getAttribute && el.getAttribute('title')
                ].filter(Boolean).join('\n'));

                if (!text || text.length > 1600) continue;

                const repair = getWedaCommentDateLineRepair(text);
                if (!repair.date || !repair.removedCount) continue;

                const target = getWedaAntecedentSelectableTarget(el, root);
                if (!target) continue;

                const directClickable = isClickableWedaAntecedentElement(el) || isClickableWedaAntecedentElement(target);
                const row = el.closest ? el.closest('tr, li, [role="row"]') : null;
                const candidate = {
                    el,
                    target,
                    root,
                    doc: el.ownerDocument || document,
                    text,
                    date: repair.date,
                    directClickable,
                    score:
                        (directClickable ? 0 : 20) +
                        (row ? 5 : 15) +
                        Math.min(text.length, 1600)
                };
                const key = getWedaCommentDateRepairCandidateKey(candidate);
                if (key && excludedKeys.has(key)) continue;
                candidates.push(candidate);
            }
        }

        candidates.sort((a, b) => a.score - b.score);
        return candidates[0] || null;
    }

    async function repairWedaCommentDateLinesOnPage(job, reason = '') {
        const report = {
            reason: reason || '',
            repairedCount: 0,
            skippedCount: 0,
            attempts: []
        };

        if (!isAntecedentPageWeda()) return report;

        const excludedKeys = new Set();

        for (let pass = 0; pass < MAX_WEDA_COMMENT_DATE_REPAIR_PASSES; pass += 1) {
            const candidate = findWedaCommentDateRepairCandidate(excludedKeys);
            if (!candidate) break;

            const key = getWedaCommentDateRepairCandidateKey(candidate);
            if (key) excludedKeys.add(key);

            const attempt = {
                pass: pass + 1,
                text: candidate.text.slice(0, 260),
                dateFromList: candidate.date,
                target: describeWedaDomElement(candidate.target),
                repaired: false,
                skipped: false,
                error: ''
            };
            report.attempts.push(attempt);

            showBadge('Nettoyage date en commentaire WEDA…', { duration: 5000 });
            clickElement(candidate.target);
            await waitForWedaIdle(10000);
            await sleep(700);

            const textarea = await waitForWedaAntecedentPopup(5000);
            if (!textarea) {
                attempt.skipped = true;
                attempt.error = 'Champ commentaire WEDA introuvable après sélection.';
                report.skippedCount += 1;
                logImportEvent('warning', 'comment_date_repair_failed', attempt.error, {
                    jobId: job && job.id || '',
                    attempt
                });
                continue;
            }

            const doc = textarea.ownerDocument || candidate.doc || document;
            const currentComment = String(textarea.value || '');
            const repair = getWedaCommentDateLineRepair(currentComment);

            if (!repair.date || !repair.removedCount) {
                attempt.skipped = true;
                attempt.error = 'La ligne Date n’est pas présente dans le commentaire sélectionné.';
                report.skippedCount += 1;
                continue;
            }

            const dateInput = doc.querySelector(SELECTOR_WEDA_DATE_PONCTUELLE) || findElementDeep(SELECTOR_WEDA_DATE_PONCTUELLE, doc);
            if (!dateInput) {
                attempt.skipped = true;
                attempt.error = 'Champ date ponctuelle WEDA introuvable.';
                report.skippedCount += 1;
                logImportEvent('warning', 'comment_date_repair_failed', attempt.error, {
                    jobId: job && job.id || '',
                    attempt
                });
                continue;
            }

            const targetDate = repair.date;
            const existingDate = normalizeWedaDateValue(dateInput.value || '');
            attempt.date = targetDate;
            attempt.existingDate = existingDate;
            attempt.removedCount = repair.removedCount;

            if (existingDate && existingDate !== targetDate) {
                attempt.skipped = true;
                attempt.error = `Date ponctuelle WEDA déjà différente (${existingDate}) : commentaire laissé intact.`;
                report.skippedCount += 1;
                logImportEvent('warning', 'comment_date_repair_conflict', attempt.error, {
                    jobId: job && job.id || '',
                    attempt
                });
                continue;
            }

            const dateOk = setWedaDatePonctuelle(targetDate, doc);
            if (!dateOk) {
                attempt.skipped = true;
                attempt.error = 'Impossible de renseigner le champ date ponctuelle WEDA.';
                report.skippedCount += 1;
                logImportEvent('warning', 'comment_date_repair_failed', attempt.error, {
                    jobId: job && job.id || '',
                    attempt
                });
                continue;
            }

            setNativeValue(textarea, repair.cleanedComment);

            const validButton = await waitFor(() => {
                const btn = doc.querySelector(SELECTOR_WEDA_VALID) || findElementDeep(SELECTOR_WEDA_VALID, doc);
                return btn && isVisible(btn) && !btn.disabled ? btn : null;
            }, 8000, 250);

            if (!validButton) {
                attempt.skipped = true;
                attempt.error = 'Bouton Valider WEDA introuvable après correction date/commentaire.';
                report.skippedCount += 1;
                logImportEvent('warning', 'comment_date_repair_failed', attempt.error, {
                    jobId: job && job.id || '',
                    attempt
                });
                continue;
            }

            clickElement(validButton);
            await waitForWedaIdle(15000);
            await sleep(1000);
            await waitForWedaAntecedentPopupClosed(7000);

            attempt.repaired = true;
            report.repairedCount += 1;
        }

        if (report.repairedCount > 0) {
            logImportEvent('info', 'comment_date_repair', `${report.repairedCount} antécédent(s) corrigé(s) : date déplacée du commentaire vers le champ date.`, {
                jobId: job && job.id || '',
                reason,
                repairedCount: report.repairedCount,
                skippedCount: report.skippedCount
            });
        }

        return report;
    }

    function buildHeidiPayload(extractedText) {
        return normalizeSpaces(
            `ANTÉCÉDENTS WEDA À CODER EN CIM-10

${extractedText}

---

INSTRUCTIONS POUR LM STUDIO

${HEIDI_ASK_AI_PROMPT}`
        );
    }

    function truncateLmStudioPrompt(text, maxLength = LMSTUDIO_MAX_PROMPT_LENGTH) {
        const normalized = normalizeSpaces(text);
        if (normalized.length <= maxLength) return normalized;

        const headLength = Math.floor(maxLength * 0.65);
        const tailLength = maxLength - headLength;
        return normalizeSpaces([
            normalized.slice(0, headLength),
            '[... contenu tronqué par le script pour LM Studio local : début et fin conservés ...]',
            normalized.slice(-tailLength)
        ].join('\n\n'));
    }

    async function runLmStudioForJob(job, source = 'weda') {
        if (!isWeda()) return false;

        let latest = getJob() || job;
        if (!latest || !job || latest.id !== job.id || latest.status !== 'PENDING_LMSTUDIO') return false;

        if (!claimHeidiRunner(latest, `lmstudio_${source || 'weda'}`)) {
            showBadge('LM Studio est déjà en cours pour ce job dans un autre onglet.', { duration: 6000 });
            return false;
        }

        latest = getJob() || latest;
        const lmStudioPayload = normalizeSpaces(latest.lmStudioPayload || latest.heidiPayload || latest.extractedText || '');
        if (!lmStudioPayload) {
            latest.status = 'EXTRACT_WEDA';
            latest.heidiRunnerTabId = '';
            latest.heidiRunnerExpiresAt = 0;
            latest.updatedAt = nowIso();
            latest.errors = Array.isArray(latest.errors) ? latest.errors : [];
            latest.errors.push({
                at: nowIso(),
                phase: 'lmstudio_empty_payload',
                message: 'Prompt LM Studio vide : retour à l’extraction WEDA.'
            });
            setJob(latest);
            logImportEvent('warning', 'lmstudio_empty_payload', 'Prompt LM Studio vide : extraction WEDA relancée.', {
                jobId: latest.id || '',
                itemCount: Array.isArray(latest.items) ? latest.items.length : Number(latest.itemCount || 0)
            });
            return false;
        }

        latest.status = 'RUNNING_LMSTUDIO';
        latest.lmStudioRunnerTabId = TAB_ID;
        latest.lmStudioRunStartedAt = nowIso();
        latest.lmStudioPromptLength = lmStudioPayload.length;
        latest.heidiRunnerTabId = TAB_ID;
        latest.heidiRunnerSource = `lmstudio_${source || 'weda'}`;
        latest.heidiRunnerExpiresAt = nowMs() + LMSTUDIO_REQUEST_TIMEOUT_MS + 60000;
        latest.updatedAt = nowIso();
        setJob(latest);

        logImportEvent('info', 'lmstudio', 'Envoi du prompt vers LM Studio local.', {
            jobId: latest.id,
            payloadLength: lmStudioPayload.length,
            apiUrl: LMSTUDIO_CHAT_COMPLETIONS_URL
        });
        showBadge('LM Studio : analyse CIM-10 en cours…', { duration: 8000 });

        try {
            const model = await getLmStudioModelId();
            renewHeidiRunner(getJob() || latest);

            let response = null;
            try {
                response = await requestLmStudioCim10Completion(lmStudioPayload, latest, model);
            } catch (error) {
                if (!isLmStudioContextLimitError(error)) throw error;

                logImportEvent('warning', 'lmstudio_retry_compact_prompt', 'LM Studio signale une limite de contexte : nouvel essai avec prompt compact.', {
                    jobId: latest.id,
                    model,
                    message: error && error.message ? error.message : String(error),
                    retryPromptLength: LMSTUDIO_RETRY_MAX_PROMPT_LENGTH,
                    retryMaxTokens: LMSTUDIO_RETRY_MAX_TOKENS
                });
                showBadge('LM Studio : contexte trop long, nouvel essai avec prompt compact…', { duration: 8000 });
                response = await requestLmStudioCim10Completion(lmStudioPayload, latest, model, {
                    maxPromptLength: LMSTUDIO_RETRY_MAX_PROMPT_LENGTH,
                    maxTokens: LMSTUDIO_RETRY_MAX_TOKENS,
                    retry: true
                });
            }
            const resultText = extractLmStudioAnswer(response);
            if (!resultText) {
                throw new Error('réponse LM Studio vide');
            }

            latest = getJob() || latest;
            if (!latest || latest.id !== job.id || latest.status !== 'RUNNING_LMSTUDIO') {
                logImportEvent('warning', 'lmstudio_result_ignored', 'Réponse LM Studio ignorée : le job actif a changé.', {
                    jobId: job.id,
                    currentJobId: latest && latest.id || '',
                    currentStatus: latest && latest.status || ''
                });
                return false;
            }

            latest.lmStudioModel = model;
            latest.lmStudioResultAt = nowIso();
            latest.lmStudioResultText = resultText;
            latest.heidiResultText = resultText;
            latest.updatedAt = nowIso();
            setJob(latest);

            logImportEvent(looksLikeHeidiCim10Result(resultText) ? 'info' : 'warning', 'lmstudio_result', 'Réponse LM Studio reçue.', {
                jobId: latest.id,
                model,
                resultLength: resultText.length,
                parsedPreviewCount: parseHeidiResultToItems(resultText).items.length
            });

            await finalizeHeidiResultAndOpenWeda(resultText, `lmstudio_${source || 'weda'}`, { forceRunner: true });
            return true;
        } catch (error) {
            const message = String(error && error.message ? error.message : error || 'Erreur LM Studio inconnue.');
            latest = getJob() || latest || job || {};

            if (latest && latest.id === job.id) {
                latest.status = 'ERROR';
                latest.updatedAt = nowIso();
                latest.heidiRunnerTabId = '';
                latest.heidiRunnerExpiresAt = 0;
                latest.lmStudioLastError = message;
                latest.errors = Array.isArray(latest.errors) ? latest.errors : [];
                latest.errors.push({
                    at: nowIso(),
                    phase: 'lmstudio',
                    message
                });
                setJob(latest);
            }

            logImportEvent('error', 'lmstudio', 'Erreur pendant l’appel à LM Studio local.', {
                jobId: job && job.id || '',
                message
            });
            showBadge('LM Studio local indisponible ou réponse non exploitable.\n' + message, { error: true, duration: 14000 });
            warn('Erreur LM Studio', error);
            return false;
        }
    }

    async function getLmStudioModelId() {
        if (LMSTUDIO_MODEL) return LMSTUDIO_MODEL;
        if (cachedLmStudioModelId) return cachedLmStudioModelId;

        try {
            const response = await gmJsonRequest({
                method: 'GET',
                url: LMSTUDIO_MODELS_URL,
                timeout: 12000
            });
            const models = Array.isArray(response && response.data) ? response.data : [];
            const firstModel = models.find(model => model && model.id);
            if (firstModel && firstModel.id) {
                cachedLmStudioModelId = String(firstModel.id);
                logImportEvent('info', 'lmstudio_model', 'Modèle LM Studio détecté automatiquement.', {
                    model: cachedLmStudioModelId,
                    modelCount: models.length
                });
                return cachedLmStudioModelId;
            }

            logImportEvent('warning', 'lmstudio_model', 'Aucun modèle listé par LM Studio : utilisation du nom générique local-model.', {
                modelCount: models.length
            });
        } catch (error) {
            logImportEvent('warning', 'lmstudio_model', 'Détection du modèle LM Studio impossible : utilisation du nom générique local-model.', {
                message: error && error.message ? error.message : String(error)
            });
        }

        cachedLmStudioModelId = 'local-model';
        return cachedLmStudioModelId;
    }

    function isLmStudioContextLimitError(error) {
        const message = String(error && error.message ? error.message : error || '');
        return /context|token|max_tokens|maximum context|too many|trop long|400/i.test(message);
    }

    async function requestLmStudioCim10Completion(promptText, job, model, options = {}) {
        const maxPromptLength = Number(options.maxPromptLength || LMSTUDIO_MAX_PROMPT_LENGTH);
        const maxTokens = Number(options.maxTokens || LMSTUDIO_MAX_TOKENS);
        const userPrompt = truncateLmStudioPrompt(promptText, maxPromptLength);
        const payload = {
            model,
            temperature: LMSTUDIO_TEMPERATURE,
            max_tokens: maxTokens,
            stream: false,
            messages: [
                {
                    role: 'system',
                    content: 'Tu es un assistant médical de codage CIM-10 pour WEDA. Respecte strictement le format demandé et ne réponds avec aucun texte hors résultat structuré.'
                },
                {
                    role: 'user',
                    content: userPrompt
                }
            ]
        };

        logImportEvent('info', 'lmstudio_request', 'Requête LM Studio préparée.', {
            jobId: job && job.id || '',
            model,
            promptLength: userPrompt.length,
            maxTokens,
            temperature: LMSTUDIO_TEMPERATURE,
            retry: Boolean(options.retry)
        });

        return gmJsonRequest({
            method: 'POST',
            url: LMSTUDIO_CHAT_COMPLETIONS_URL,
            timeout: LMSTUDIO_REQUEST_TIMEOUT_MS,
            headers: {
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(payload)
        });
    }

    function extractLmStudioAnswer(response) {
        const choices = Array.isArray(response && response.choices) ? response.choices : [];
        const firstChoice = choices[0] || {};
        const message = firstChoice.message || {};
        const content = typeof message.content === 'string' ? message.content : firstChoice.text || '';
        return normalizeSpaces(content);
    }

    function gmJsonRequest(options) {
        return new Promise((resolve, reject) => {
            if (typeof GM_xmlhttpRequest !== 'function') {
                reject(new Error('GM_xmlhttpRequest indisponible : vérifiez les permissions Tampermonkey du script'));
                return;
            }

            GM_xmlhttpRequest({
                method: options.method || 'GET',
                url: options.url,
                headers: options.headers || {},
                data: options.data,
                timeout: options.timeout || LMSTUDIO_REQUEST_TIMEOUT_MS,
                onload: response => {
                    const status = Number(response.status || 0);
                    const body = response.responseText || '';

                    if (status < 200 || status >= 300) {
                        reject(new Error(`LM Studio HTTP ${status || '?'} : ${body.slice(0, 500)}`));
                        return;
                    }

                    try {
                        resolve(body ? JSON.parse(body) : {});
                    } catch (error) {
                        reject(new Error(`réponse LM Studio non JSON : ${error.message}`));
                    }
                },
                onerror: () => reject(new Error('connexion à LM Studio impossible')),
                ontimeout: () => reject(new Error('délai dépassé pendant l’appel à LM Studio')),
                onabort: () => reject(new Error('appel à LM Studio annulé'))
            });
        });
    }

    async function handleWedaJob() {
        if (!isWeda()) return;

        let job = getJob();
        if (!job) return;
        if (job.sourceWedaTabId && job.sourceWedaTabId !== TAB_ID) return;

        if (job.status === 'EXTRACTING_WEDA') {
            job = recoverStaleWedaExtraction(job, 'handle_weda_job') || job;
        }

        if (job.status === 'WAITING_WEDA_ANTECEDENT_PAGE' && isAntecedentPageWeda()) {
            job.status = 'EXTRACT_WEDA';
            job.updatedAt = nowIso();
            job.sourceWedaTabId = TAB_ID;
            job.wedaImportUrl = location.href;
            job.sourcePatientId = job.sourcePatientId || getCurrentWedaPatDk();
            job.expectedPatientId = job.expectedPatientId || job.batchPatientId || job.sourcePatientId || '';
            setJob(job);
        }

        if (job.status !== 'EXTRACT_WEDA') return;
        if (window.__AUTO_ATCD_CIM10_LMSTUDIO_WEDA_EXTRACT_RUNNING__) return;

        window.__AUTO_ATCD_CIM10_LMSTUDIO_WEDA_EXTRACT_RUNNING__ = true;

        try {
            const antecedentRoot = await waitForWedaAntecedentRoot(20000);
            if (!antecedentRoot) {
                job.status = 'ERROR';
                job.updatedAt = nowIso();
                job.errors = Array.isArray(job.errors) ? job.errors : [];
                job.errors.push('La structure Antécédents WEDA n’est pas détectée sur AntecedentForm.aspx.');
                setJob(job);

                logImportEvent('error', 'extract_weda_dom_missing', 'Page Antécédents ouverte, mais structure WEDA introuvable avant appel LM Studio.', {
                    jobId: job.id,
                    url: location.href,
                    isAntecedentUrl: isAntecedentUrlWeda(),
                    updatePanelAntecedent: !!getWedaAntecedentRoot()
                });
                showBadge('Page Antécédents détectée, mais contenu WEDA non chargé.\nLM Studio non lancé pour éviter une extraction vide.', { error: true, duration: 12000 });
                return;
            }

            job.status = 'EXTRACTING_WEDA';
            job.extractingWedaTabId = TAB_ID;
            job.updatedAt = nowIso();
            setJob(job);

            await sleep(800);

            const deletionReport = await deleteConfiguredWedaAntecedentsBeforeExtraction(job);
            if (deletionReport.deletedCount > 0) {
                showBadge(`${deletionReport.deletedCount} antécédent parasite supprimé avant LM Studio.`, { duration: 6000 });
                await sleep(900);
            }

            const commentDateRepairReport = await repairWedaCommentDateLinesOnPage(job, 'before_extraction');
            if (commentDateRepairReport.repairedCount > 0) {
                job.commentDateRepairBeforeExtraction = commentDateRepairReport;
                job.updatedAt = nowIso();
                setJob(job);
                showBadge(`${commentDateRepairReport.repairedCount} date(s) déplacée(s) du commentaire vers le champ date.`, { duration: 6000 });
                await sleep(900);
            }

            showBadge('Lecture des antécédents non codés WEDA…', { duration: 5000 });

            const extraction = extractNonCodedAntecedentsFromWeda();
            const items = extraction.items;
            const extractedText = formatExtractedAntecedents(items);
            const heidiPayload = buildHeidiPayload(extractedText);

            job.updatedAt = nowIso();
            job.extractedAt = nowIso();
            job.sourceWedaTabId = TAB_ID;
            job.wedaImportUrl = location.href;
            job.sourcePatientId = job.sourcePatientId || getCurrentWedaPatDk();
            job.expectedPatientId = job.expectedPatientId || job.batchPatientId || job.sourcePatientId || '';
            job.itemCount = items.length;
            job.items = items;
            job.debug = extraction.debug;
            job.deletedAntecedentsBeforeExtraction = deletionReport;
            job.commentDateRepairBeforeExtraction = commentDateRepairReport;
            job.extractedText = extractedText;
            job.heidiPayload = heidiPayload;
            job.lmStudioPayload = heidiPayload;

            if (!items.length) {
                await clickNoKnownAllergyBeforeTerminalNoItems(job, 'extract_weda_no_items');
                job = getJob() || job;
                job.status = 'DONE_NO_ITEMS';
                job.doneAt = nowIso();
                setJob(job);
                logImportEvent('warning', 'extract_weda', 'Aucun antécédent non codé CIM10 exploitable trouvé dans WEDA.', {
                    jobId: job.id,
                    noKnownAllergyBeforeTerminalNoItems: job.noKnownAllergyBeforeTerminalNoItems || null,
                    debug: extraction.debug
                });
                showBadge(
                    'Aucun antécédent non codé CIM10 exploitable trouvé.\n' +
                    'Diagnostic : icônes trouvées = ' + extraction.debug.iconCountByClass +
                    ', rubriques détectées = ' + extraction.debug.detectedHeaders.length + '.',
                    { error: true, duration: 12000 }
                );
                return;
            }

            job.status = 'PENDING_LMSTUDIO';
            setJob(job);
            logImportEvent('info', 'extract_weda', `${items.length} bloc(s) d’antécédents non codés récupéré(s).`, {
                jobId: job.id,
                itemCount: items.length,
                skippedFamilialAlreadyCodedCount: extraction.debug.skippedFamilialAlreadyCodedCount || 0,
                items: items.map(summarizeImportItem)
            });

            showBadge(`${items.length} bloc(s) d’antécédents non codés récupéré(s).\nAnalyse LM Studio local en cours…`, { duration: 8000 });
            const opened = await openHeidiWorkerForJob(job);
            if (!opened) {
                showBadge('LM Studio est déjà en cours pour ce job.\nAucune nouvelle analyse lancée.', { duration: 6000 });
            }
        } finally {
            window.__AUTO_ATCD_CIM10_LMSTUDIO_WEDA_EXTRACT_RUNNING__ = false;
        }
    }

    /************************************************************
     * COMPATIBILITÉ INTERNE AVEC LE PARSEUR HISTORIQUE HEIDI
     * Le script LM Studio ne matche plus Heidi et n'ouvre plus d'onglet Heidi.
     ************************************************************/

    function elementText(el) {
        return normalizeSpaces(el ? (el.innerText || el.textContent || '') : '');
    }

    function findClickableByText(regex, options = {}) {
        const exclude = options.exclude || null;
        const candidates = Array.from(document.querySelectorAll('button, [role="button"], a, div, span'));

        for (const el of candidates) {
            if (!isVisible(el)) continue;
            const text = elementText(el);
            if (!text) continue;
            if (exclude && exclude.test(text)) continue;
            if (regex.test(text)) return el.closest('button, [role="button"], a') || el;
        }

        return null;
    }

    async function heidiClickNewSessionIfAvailable() {
        const btn = await waitFor(() => {
            const direct = document.querySelector(SELECTOR_HEIDI_NEW_SESSION);
            if (direct && isVisible(direct)) return direct;
            return findClickableByText(/nouvelle session|new session/i);
        }, 7000, 300);

        if (btn) {
            showBadge('Heidi : création d’une nouvelle session…', { duration: 5000 });
            clickElement(btn);
            await sleep(1800);
            return true;
        }

        return false;
    }

    function findHeidiAskAiEditor() {
        for (const selector of SELECTORS_HEIDI_ASK_AI_EDITOR) {
            const elements = Array.from(document.querySelectorAll(selector));
            const visible = elements.filter(isVisible);
            if (!visible.length) continue;

            visible.sort((a, b) => {
                const ra = a.getBoundingClientRect();
                const rb = b.getBoundingClientRect();

                const aIsAsk = !!a.closest('[data-testid="ask-ai-input-block-editor"], .ask-ai-input');
                const bIsAsk = !!b.closest('[data-testid="ask-ai-input-block-editor"], .ask-ai-input');

                if (aIsAsk && !bIsAsk) return -1;
                if (!aIsAsk && bIsAsk) return 1;

                return (rb.width * rb.height) - (ra.width * ra.height);
            });

            return visible[0];
        }

        return null;
    }

    function findHeidiAskAiOpener() {
        return findClickableByText(/ask\s*ai|demander\s+a\s+l'?ia|demander\s+à\s+l'?ia|poser\s+une\s+question|assistant\s+ia/i, {
            exclude: /nouvelle session|new session/i
        });
    }

    function getHeidiAskAiEditorDiagnostics() {
        const selectors = {};
        for (const selector of SELECTORS_HEIDI_ASK_AI_EDITOR) {
            try {
                const all = Array.from(document.querySelectorAll(selector));
                selectors[selector] = {
                    count: all.length,
                    visible: all.filter(isVisible).length
                };
            } catch (_) {
                selectors[selector] = { count: 0, visible: 0 };
            }
        }

        return {
            url: location.href,
            title: document.title || '',
            bodyTextSample: normalizeSpaces(document.body ? (document.body.innerText || document.body.textContent || '') : '').slice(0, 500),
            contenteditableCount: document.querySelectorAll('[contenteditable="true"]').length,
            visibleContenteditableCount: Array.from(document.querySelectorAll('[contenteditable="true"]')).filter(isVisible).length,
            selectors,
            askAiOpenerFound: !!findHeidiAskAiOpener(),
            newSessionFound: !!document.querySelector(SELECTOR_HEIDI_NEW_SESSION)
        };
    }

    async function waitForHeidiAskAiEditorReady(timeoutMs = HEIDI_ASK_AI_EDITOR_TIMEOUT_MS) {
        let openerClicked = false;

        return await waitFor(() => {
            const editor = findHeidiAskAiEditor();
            if (editor) return editor;

            if (!openerClicked) {
                const opener = findHeidiAskAiOpener();
                if (opener && isVisible(opener)) {
                    openerClicked = true;
                    clickElement(opener);
                }
            }

            return null;
        }, timeoutMs, 500);
    }

    function textToHtmlParagraphs(text) {
        const lines = String(text || '').split('\n');

        return lines.map(line => {
            const trimmed = line.replace(/\s+$/g, '');
            if (!trimmed) return '<p><br></p>';
            return '<p>' + escapeHtml(trimmed) + '</p>';
        }).join('');
    }

    function insertTextIntoContenteditable(editor, text) {
        if (!editor) return false;

        editor.focus();

        let inserted = false;

        try {
            document.execCommand('selectAll', false, null);
            inserted = document.execCommand('insertText', false, text);
        } catch (_) {
            inserted = false;
        }

        const currentText = normalizeSpaces(editor.innerText || editor.textContent || '');
        const firstMeaningfulLine = String(text || '').split('\n').map(s => s.trim()).find(Boolean) || '';

        if (!inserted || (firstMeaningfulLine && !currentText.includes(firstMeaningfulLine.slice(0, 40)))) {
            try {
                editor.innerHTML = textToHtmlParagraphs(text);
                inserted = true;
            } catch (_) {
                try {
                    editor.textContent = text;
                    inserted = true;
                } catch (_) {
                    inserted = false;
                }
            }
        }

        try {
            editor.dispatchEvent(new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                inputType: 'insertText',
                data: text
            }));
        } catch (_) {
            editor.dispatchEvent(new Event('input', { bubbles: true }));
        }

        editor.dispatchEvent(new Event('change', { bubbles: true }));
        editor.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: ' ' }));
        editor.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: ' ' }));

        return inserted;
    }

    function findHeidiAskAiSubmitButton(editor) {
        const containers = [];

        function add(el) {
            if (el && !containers.includes(el)) containers.push(el);
        }

        if (editor) {
            add(editor.closest('.ask-ai-input'));
            add(editor.closest('[data-testid="ask-ai-input-block-editor"]'));
            let p = editor.parentElement;
            let depth = 0;
            while (p && depth < 8) {
                add(p);
                p = p.parentElement;
                depth++;
            }
        }

        add(document.querySelector('.ask-ai-input'));
        add(document.querySelector('[data-testid="ask-ai-input-block-editor"]')?.parentElement);
        add(document);

        for (const container of containers) {
            if (!container) continue;

            const buttons = Array.from(container.querySelectorAll('button[type="button"], button'))
                .filter(btn => isVisible(btn) && !btn.disabled && !btn.getAttribute('disabled'));

            if (!buttons.length) continue;

            const arrowButton = buttons.find(btn =>
                btn.querySelector('svg.lucide-arrow-up')
                || /arrow-up|lucide-arrow-up/.test(String(btn.innerHTML || ''))
            );

            if (arrowButton) return arrowButton;

            const primaryButton = buttons.find(btn => {
                const className = String(btn.className || '');
                return /background-button-primary|bg-background-button-primary|primary/.test(className);
            });

            if (primaryButton) return primaryButton;

            return buttons[buttons.length - 1];
        }

        return null;
    }

    function getHeidiAskAiText() {
        const direct = document.querySelector(SELECTOR_HEIDI_RESULT);
        const directText = normalizeSpaces(direct ? (direct.innerText || direct.textContent || '') : '');

        if (looksLikeHeidiCim10ResultRaw(directText)) {
            return directText;
        }

        const selectors = [
            '#ask-ai-content [contenteditable="false"]',
            '[data-testid="ask-ai-block-editor"] [contenteditable="false"]',
            '#template-block-editor-content [contenteditable="false"]',
            'div.tiptap.ProseMirror[contenteditable="false"]',
            '[contenteditable="false"].ProseMirror',
            '[contenteditable="false"]'
        ];

        const candidates = [];

        for (const selector of selectors) {
            try {
                const els = Array.from(document.querySelectorAll(selector));
                for (const el of els) {
                    if (!isVisible(el)) continue;
                    const text = normalizeSpaces(el.innerText || el.textContent || '');
                    if (!text) continue;
                    candidates.push({ el, text, score: scoreHeidiResultCandidate(text) });
                }
            } catch (_) {}
        }

        candidates.sort((a, b) => b.score - a.score || b.text.length - a.text.length);

        if (candidates.length && candidates[0].score > 0) {
            return candidates[0].text;
        }

        return directText;
    }

    function scoreHeidiResultCandidate(text) {
        let score = 0;
        const t = normalizeSpaces(text);
        const parsed = parseHeidiResultToItems(t);

        if (parsed.items.length) score += 10 + parsed.items.length * 4;
        if (/^[MCF]\|/m.test(t)) score += 3;

        return score;
    }

    function looksLikeHeidiCim10ResultRaw(text) {
        return parseHeidiResultToItems(text).items.length > 0;
    }

    function looksLikeHeidiCim10Result(text) {
        return looksLikeHeidiCim10ResultRaw(text);
    }

    function isStableHeidiResultForAutoFinalize(text) {
        const resultText = normalizeSpaces(text || '');
        const now = Date.now();

        if (!resultText || !looksLikeHeidiCim10Result(resultText)) {
            heidiAutoFinalizeLastText = '';
            heidiAutoFinalizeLastChangedAt = now;
            return false;
        }

        if (resultText !== heidiAutoFinalizeLastText) {
            heidiAutoFinalizeLastText = resultText;
            heidiAutoFinalizeLastChangedAt = now;
            return false;
        }

        return now - heidiAutoFinalizeLastChangedAt >= HEIDI_RESULT_STABLE_MS;
    }

    function observeHeidiVisibleText(text) {
        const resultText = normalizeSpaces(text || '');
        const now = Date.now();

        if (!resultText) {
            heidiVisibleLastText = '';
            heidiVisibleLastChangedAt = now;
            return { text: '', stable: false, ageMs: 0 };
        }

        if (resultText !== heidiVisibleLastText) {
            heidiVisibleLastText = resultText;
            heidiVisibleLastChangedAt = now;
            return { text: resultText, stable: false, ageMs: 0 };
        }

        const ageMs = Math.max(0, now - heidiVisibleLastChangedAt);
        return {
            text: resultText,
            stable: ageMs >= HEIDI_RESULT_STABLE_MS,
            ageMs
        };
    }

    function getJobHeidiRunAgeMs(job) {
        const raw = job && (job.heidiRunStartedAt || job.updatedAt || job.createdAt);
        const parsed = raw ? Date.parse(raw) : NaN;
        return Number.isFinite(parsed) ? Math.max(0, nowMs() - parsed) : 0;
    }

    function getHeidiRunnerRemainingMs(job) {
        if (!heidiRunnerIsActiveForOtherTab(job)) return 0;
        return Math.max(0, Number(job.heidiRunnerExpiresAt || 0) - nowMs());
    }

    function isHeidiGenerationLikelyActive() {
        const selectors = [
            '[aria-busy="true"]',
            '[data-loading="true"]',
            '.animate-spin',
            'svg.animate-spin',
            'button[aria-label*="Stop"]',
            'button[aria-label*="stop"]'
        ];

        for (const selector of selectors) {
            try {
                const el = document.querySelector(selector);
                if (el && isVisible(el)) return true;
            } catch (_) {}
        }

        const bodyText = normalizeForMatch(document.body ? (document.body.innerText || document.body.textContent || '') : '');
        return /stop generating|generating|thinking|generation en cours|arreter la generation/.test(bodyText);
    }

    function looksLikePotentialHeidiAnswerText(text) {
        const raw = normalizeSpaces(text || '');
        if (raw.length < 30) return false;
        if (looksLikeHeidiCim10Result(raw)) return true;
        if (REGEX_CODE_HEIDI.test(raw)) return true;

        const n = normalizeForMatch(raw);
        return /\b(cim\s*10|antecedent|medical|chirurgical|familial|diagnostic|code)\b/.test(n);
    }

    function signatureHeidiVisibleText(text) {
        const raw = normalizeSpaces(text || '');
        let hash = 0;
        for (let i = 0; i < raw.length; i++) {
            hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
        }
        return `${raw.length}:${hash}`;
    }

    function isPreviousVisibleResultForJob(job, resultText) {
        if (!job || !job.heidiPreviousResultSignature) return false;
        return signatureHeidiVisibleText(resultText) === job.heidiPreviousResultSignature;
    }

    function logPreviousHeidiResultOnce(job, source) {
        const key = `${job && job.id || ''}:${source}:previous_visible_result`;
        if (!key || key === heidiWatcherPreviousResultLogKey) return;
        heidiWatcherPreviousResultLogKey = key;

        logImportEvent('warning', 'heidi_previous_result_visible', 'Heidi affiche encore le résultat précédent : finalisation automatique différée.', {
            jobId: job && job.id || '',
            source,
            heidiRunAgeMs: getJobHeidiRunAgeMs(job)
        });
    }

    function canFinalizeVisibleHeidiJob(job) {
        if (!job) return false;
        const status = String(job.status || '');
        if (status === 'ERROR') return true;
        if (status !== 'RUNNING_LMSTUDIO') return false;
        return !!job.heidiPromptSubmittedAt;
    }

    function logHeidiRunnerBlockedOnce(job, source) {
        const key = `${job && job.id || ''}:${job && job.heidiRunnerTabId || ''}:${source}`;
        if (!key || key === heidiWatcherRunnerBlockedLogKey) return;
        heidiWatcherRunnerBlockedLogKey = key;

        logImportEvent('warning', 'heidi_runner_blocked', 'Résultat Heidi visible, mais un autre onglet Heidi possède encore le verrou.', {
            jobId: job && job.id || '',
            source,
            currentTabId: TAB_ID,
            runnerTabId: job && job.heidiRunnerTabId || '',
            runnerRemainingMs: getHeidiRunnerRemainingMs(job),
            heidiRunAgeMs: getJobHeidiRunAgeMs(job)
        });
    }

    function finalizeStableHeidiResultFromVisibleText(job, resultText, source = 'heidi_watcher') {
        if (!canFinalizeVisibleHeidiJob(job) || !looksLikeHeidiCim10Result(resultText)) return false;
        if (!isThisHeidiWorkerForJob(job)) {
            closeCurrentScriptedHeidiWorkerIfDoneOrMismatched(job, 'mismatch');
            return false;
        }
        if (isPreviousVisibleResultForJob(job, resultText)) {
            logPreviousHeidiResultOnce(job, source);
            return false;
        }

        const otherRunnerActive = heidiRunnerIsActiveForOtherTab(job);
        const forceRunner = otherRunnerActive && getJobHeidiRunAgeMs(job) >= HEIDI_FORCE_VISIBLE_RESULT_AFTER_MS;

        if (otherRunnerActive && !forceRunner) {
            logHeidiRunnerBlockedOnce(job, source);
            if (isScriptedHeidiWorkerTab()) {
                closeCurrentHeidiTabSoon('Un autre onglet Heidi possède déjà le verrou.\nFermeture de ce doublon…', {
                    unloadIfBlocked: true,
                    delayMs: 4000
                });
            }
            return false;
        }

        if (!otherRunnerActive && job.heidiRunnerTabId === TAB_ID) {
            renewHeidiRunner(job);
        } else if (!otherRunnerActive && !claimHeidiRunner(job, source)) {
            logHeidiRunnerBlockedOnce(getJob() || job, source);
            return false;
        }

        if (forceRunner) {
            logImportEvent('warning', 'heidi_force_finalize_visible_result', 'Résultat Heidi stable récupéré malgré un verrou d’onglet Heidi désynchronisé.', {
                jobId: job.id,
                source,
                currentTabId: TAB_ID,
                previousRunnerTabId: job.heidiRunnerTabId || '',
                runnerRemainingMs: getHeidiRunnerRemainingMs(job),
                heidiRunAgeMs: getJobHeidiRunAgeMs(job)
            });
        }

        showBadge('Résultat Heidi CIM10 stabilisé.\nLancement automatique de l’import WEDA…', { duration: 8000 });
        runWatchedAsync(
            'heidi_visible_result_finalize_async',
            () => finalizeHeidiResultAndOpenWeda(resultText, source, { forceRunner }),
            { job: getJob() || job }
        );
        return true;
    }

    function maybeMarkUnparsedHeidiResult(job, visible, source = 'heidi_watcher') {
        if (!job || job.status !== 'RUNNING_LMSTUDIO') return false;
        if (!visible || !visible.stable || looksLikeHeidiCim10Result(visible.text)) return false;
        if (!looksLikePotentialHeidiAnswerText(visible.text)) return false;
        if (isHeidiGenerationLikelyActive()) return false;

        const runAgeMs = getJobHeidiRunAgeMs(job);
        if (runAgeMs < HEIDI_UNPARSED_RESULT_WARNING_MS || visible.ageMs < HEIDI_UNPARSED_STABLE_MS) return false;

        const key = `${job.id}:${source}:${Math.floor(runAgeMs / 30000)}`;
        if (key !== heidiWatcherUnparsedLogKey) {
            heidiWatcherUnparsedLogKey = key;
            logImportEvent('warning', 'heidi_unparsed_result_wait', 'Résultat Heidi stable détecté, mais pas encore exploitable au format CIM10 technique.', {
                jobId: job.id,
                source,
                heidiRunAgeMs: runAgeMs,
                stableAgeMs: visible.ageMs,
                textLength: visible.text.length,
                preview: visible.text.slice(0, 1200)
            });
        }

        if (runAgeMs < HEIDI_UNPARSED_RESULT_ERROR_MS) return false;

        const latest = getJob() || job;
        if (!latest || latest.id !== job.id || latest.status !== 'RUNNING_LMSTUDIO') return false;

        const message = 'Résultat Heidi visible mais aucun format CIM10 technique exploitable détecté.';
        latest.status = 'ERROR';
        latest.updatedAt = nowIso();
        latest.heidiResultText = visible.text;
        latest.heidiResultSource = `${source}_unparsed`;
        latest.heidiRunnerTabId = TAB_ID;
        latest.heidiRunnerExpiresAt = nowMs() + 180000;
        latest.errors = Array.isArray(latest.errors) ? latest.errors : [];
        latest.errors.push({
            at: nowIso(),
            phase: 'heidi_unparsed_result',
            message,
            textPreview: visible.text.slice(0, 1800)
        });
        setJob(latest);

        logImportEvent('error', 'heidi_unparsed_result', message, {
            jobId: latest.id,
            source,
            heidiRunAgeMs: runAgeMs,
            stableAgeMs: visible.ageMs,
            textLength: visible.text.length,
            preview: visible.text.slice(0, 1800)
        });

        showBadge(
            'Résultat Heidi détecté, mais le format CIM10 n’est pas exploitable.\n' +
            'Le patient sera marqué en erreur au lieu de rester bloqué.',
            { error: true, duration: 14000 }
        );
        return true;
    }

    async function waitForHeidiResult(previousText) {
        const start = Date.now();
        let lastText = '';
        let lastChange = Date.now();

        while (Date.now() - start < 180000) {
            const text = getHeidiAskAiText();

            if (text && text !== lastText) {
                lastText = text;
                lastChange = Date.now();
            }

            if (text && text !== previousText && looksLikeHeidiCim10Result(text) && Date.now() - lastChange > HEIDI_RESULT_STABLE_MS) {
                return text;
            }

            await sleep(600);
        }

        return null;
    }

    async function heidiPasteAskAiAndSubmit(text, onSubmitted = null) {
        const editor = await waitForHeidiAskAiEditorReady();
        if (!editor) {
            const error = new Error('Zone Ask AI Heidi introuvable.');
            error.heidiAskAiEditorMissing = true;
            error.diagnostic = getHeidiAskAiEditorDiagnostics();
            throw error;
        }

        const previousResultText = getHeidiAskAiText();

        showBadge('Heidi : collage des antécédents et du prompt dans Ask AI…', { duration: 6000 });

        const pasted = insertTextIntoContenteditable(editor, text);
        await sleep(800);

        if (!pasted) throw new Error('Impossible de coller le texte dans Ask AI Heidi.');

        const button = await waitFor(() => findHeidiAskAiSubmitButton(editor), 10000, 300);
        if (!button) throw new Error('Bouton de validation Ask AI Heidi introuvable.');

        showBadge('Heidi : validation de la demande CIM10…', { duration: 6000 });

        const clicked = clickElement(button);
        await sleep(1500);

        if (!clicked) throw new Error('Impossible de cliquer sur le bouton de validation Ask AI Heidi.');

        if (typeof onSubmitted === 'function') {
            try { onSubmitted(); } catch (e) { warn('Callback soumission Heidi impossible', e); }
        }

        showBadge('Heidi analyse les antécédents.\nAttente du résultat CIM10…', { duration: 12000 });

        return await waitForHeidiResult(previousResultText);
    }

    /************************************************************
     * PARSING HEIDI
     ************************************************************/

    function nettoyerSortieHeidiAntecedents(texte) {
        if (!texte) return '';

        let t = String(texte)
            .replace(/\r/g, '\n')
            .replace(/\u00A0/g, ' ')
            .replace(/[ \t]+$/gm, '')
            .trim();

        t = t
            .replace(/\[\[([A-Z][A-Z0-9]{0,3}(?:\.[A-Z0-9]+)?(?:-[A-Z][A-Z0-9]{0,3}(?:\.[A-Z0-9]+)?)?)\]\]/gi, '$1')
            .replace(/\[([A-Z][A-Z0-9]{0,3}(?:\.[A-Z0-9]+)?(?:-[A-Z][A-Z0-9]{0,3}(?:\.[A-Z0-9]+)?)?)\]/gi, '$1');

        return t;
    }

    function normalizeHeidiTechnicalResultText(text) {
        return nettoyerSortieHeidiAntecedents(text)
            // Heidi peut parfois coller deux lignes techniques pendant le rendu.
            .replace(/(PRIO_(?:ROUGE|ORANGE|BLEU))([MCF]\|)/gi, '$1\n$2')
            .replace(/([^A-Za-zÀ-ÖØ-öø-ÿ\n])([MCF]\|)/g, '$1\n$2')
            .replace(/(^|\n)\s*([MCF]\|)/g, '$1$2');
    }

    function splitHeidiTechnicalCandidateLines(text) {
        return normalizeHeidiTechnicalResultText(text)
            .split(/\n+/)
            .map(line => normalizeSpaces(line))
            .filter(Boolean);
    }

    function extractDateToken(text) {
        const raw = normalizeSpaces(text);
        if (!raw) return { date: '', cleaned: raw };

        const fullDate = raw.match(/\b(0*[0-3]?\d)[\/.-](0*[01]?\d)[\/.-]((?:19|20)\d{2})\b/);
        if (fullDate) {
            const date = normalizeWedaDateValue(`${Number(fullDate[1])}/${Number(fullDate[2])}/${fullDate[3]}`);
            if (!date) return { date: '', cleaned: raw };

            return {
                date,
                cleaned: normalizeSpaces(raw.replace(fullDate[0], '').replace(/^[,;\s]+|[,;\s]+$/g, ''))
            };
        }

        const year = raw.match(/\b((?:19|20)\d{2})\b/);
        if (year) {
            return {
                date: `01/01/${year[1]}`,
                cleaned: normalizeSpaces(raw.replace(year[0], '').replace(/^[,;\s]+|[,;\s]+$/g, ''))
            };
        }

        return { date: '', cleaned: raw };
    }

    function cleanRemarkToken(text) {
        return normalizeSpaces(String(text || '')
            .replace(/^[,;:\s]+|[,;:\s]+$/g, '')
            .replace(/\b(remarque|remarques|précision|precisions?)\s*:\s*/i, '')
        );
    }

    function restoreProtectedFamilyMemberLabel(label) {
        return normalizeSpaces(label)
            .replace(/Grand-pere/g, 'Grand-père')
            .replace(/Grand-mere/g, 'Grand-mère')
            .replace(/Demi-frere/g, 'Demi-frère')
            .replace(/Demi-soeur/g, 'Demi-sœur')
            .replace(/Beau-pere/g, 'Beau-père')
            .replace(/Belle-mere/g, 'Belle-mère')
            .replace(/Beau-fils/g, 'Beau-fils')
            .replace(/Belle-fille/g, 'Belle-fille')
            .replace(/Petit-fils/g, 'Petit-fils')
            .replace(/Petite-fille/g, 'Petite-fille');
    }

    function familyBranchSuffix(baseLabel, branch) {
        if (!branch) return baseLabel;
        const feminine = /\bmère\b|\bfille\b|\bsœur\b|\bsoeur\b|\btante\b|\bcousine\b|\bnièce\b|\bniece\b/i.test(baseLabel);
        if (branch === 'paternel') return `${baseLabel} ${feminine ? 'paternelle' : 'paternel'}`;
        if (branch === 'maternel') return `${baseLabel} ${feminine ? 'maternelle' : 'maternel'}`;
        return baseLabel;
    }

    function expandFamilyMemberGroupLabel(label) {
        const raw = normalizeSpaces(label);
        const n = normalizeForMatch(raw);
        if (!n) return [];

        const branch = /\b(paternel|paternelle|paternels|paternelles|cote paternel|cote paternelle)\b/.test(n)
            ? 'paternel'
            : (/\b(maternel|maternelle|maternels|maternelles|cote maternel|cote maternelle)\b/.test(n) ? 'maternel' : '');

        if (/^parents$/.test(n) || /^(pere mere|mere pere)$/.test(n)) {
            return ['Père', 'Mère'];
        }

        if (/^grands?\s+parents?/.test(n) || /^(grand pere grand mere|grand mere grand pere)/.test(n)) {
            return [
                familyBranchSuffix('Grand-père', branch),
                familyBranchSuffix('Grand-mère', branch)
            ];
        }

        if (/^(fratrie|freres?\s+soeurs?|soeurs?\s+freres?)$/.test(n)) {
            return ['Frère', 'Sœur'];
        }

        return [];
    }

    function dedupeFamilyMemberLabels(members) {
        const seen = new Set();
        const out = [];

        for (const member of members || []) {
            const cleaned = normalizeSpaces(member);
            if (!cleaned) continue;
            const key = normalizeForMatch(cleaned);
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(cleaned);
        }

        return out;
    }

    function splitFamilyMemberLabel(label) {
        const raw = normalizeSpaces(label);
        if (!raw) return [''];

        const expandedRaw = expandFamilyMemberGroupLabel(raw);
        if (expandedRaw.length) return expandedRaw;

        const protectedLabel = raw
            .replace(/\bgrand[\s-]+p[eè]re\b/gi, 'Grand-pere')
            .replace(/\bgrand[\s-]+m[eè]re\b/gi, 'Grand-mere')
            .replace(/\bdemi[\s-]+fr[eè]re\b/gi, 'Demi-frere')
            .replace(/\bdemi[\s-]+s[œoe]ur\b/gi, 'Demi-soeur')
            .replace(/\bbeau[\s-]+p[eè]re\b/gi, 'Beau-pere')
            .replace(/\bbelle[\s-]+m[eè]re\b/gi, 'Belle-mere')
            .replace(/\bbeau[\s-]+fils\b/gi, 'Beau-fils')
            .replace(/\bbelle[\s-]+fille\b/gi, 'Belle-fille')
            .replace(/\bpetit[\s-]+fils\b/gi, 'Petit-fils')
            .replace(/\bpetite[\s-]+fille\b/gi, 'Petite-fille');

        const members = protectedLabel
            .split(/\s*(?:,|;|\/|\bet\b|\+|&)\s*/i)
            .flatMap(part => {
                const restored = restoreProtectedFamilyMemberLabel(part);
                const expanded = expandFamilyMemberGroupLabel(restored);
                return expanded.length ? expanded : [restored];
            })
            .filter(Boolean);

        const deduped = dedupeFamilyMemberLabels(members);
        return deduped.length ? deduped : [raw];
    }

    function buildParsedAtcdItem(currentSection, rawLine, details, code, familyMemberOverride = null) {
        const normalizedDetails = {
            ...details,
            familyMember: familyMemberOverride === null ? details.familyMember : familyMemberOverride
        };

        return {
            type: currentSection === 'medical' ? 'M' : (currentSection === 'chirurgical' ? 'C' : 'F'),
            section: currentSection,
            label: sectionLabel(currentSection),
            raw: rawLine,
            description: normalizedDetails.description,
            heidiLabel: normalizedDetails.description,
            familyMember: normalizedDetails.familyMember,
            code,
            date: normalizedDetails.date,
            year: normalizedDetails.year,
            lateralite: normalizedDetails.lateralite,
            remarks: normalizedDetails.remarks,
            notes: normalizedDetails.remarks,
            comment: buildWedaComment(normalizedDetails)
        };
    }

    function shouldSkipParsedAtcdItem(item) {
        if (!item) return false;

        const text = normalizeForMatch([
            item.raw || '',
            item.description || '',
            item.remarks || '',
            item.familyMember || '',
            item.comment || ''
        ].join(' '));
        const code = normalizeCim10Code(item.code || '');

        if (/\bcaisse\b/.test(text)) return true;
        if (/^Z67(?:\.|$)/.test(code)) return true;
        if (/^U11(?:\.|$)/.test(code)) return true;
        if (/\b(vaccin|vaccination|vaccinee|vaccines|immunisation)\b/.test(text) || /\brappel\s+(vaccinal|vaccin|covid)\b/.test(text)) return true;

        return item.section === 'familial'
            && code === 'Z00.0'
            && (
                /\bmembre\s+de\s+la\s+famille\s+non\s+specifie\b/.test(text)
                || /\bautre\s+examen\s+medical\s+general\b/.test(text)
            );
    }

    function getParsedAtcdSkipReason(item) {
        if (!item) return 'Antécédent ignoré';

        const text = normalizeForMatch([
            item.raw || '',
            item.description || '',
            item.remarks || '',
            item.familyMember || '',
            item.comment || ''
        ].join(' '));
        const code = normalizeCim10Code(item.code || '');

        if (/\bcaisse\b/.test(text)) return 'Antécédent parasite ignoré (caisse)';
        if (/^Z67(?:\.|$)/.test(code)) return 'Groupe sanguin/Rhésus ignoré : non importable comme antécédent WEDA';
        if (/^U11(?:\.|$)/.test(code) || /\b(vaccin|vaccination|vaccinee|vaccines|immunisation)\b/.test(text) || /\brappel\s+(vaccinal|vaccin|covid)\b/.test(text)) {
            return 'Vaccination ignorée : non importable comme antécédent CIM-10 WEDA';
        }

        return 'Antécédent parasite ignoré';
    }

    function getAtcdDedupeKey(item) {
        if (item.section === 'familial') {
            return [
                item.section,
                normalizeForMatch(item.familyMember || ''),
                normalizeForMatch(item.description || ''),
                normalizeCim10Code(item.code || ''),
                normalizeForMatch(item.date || ''),
                normalizeForMatch(item.remarks || '')
            ].join('|');
        }

        return [
            item.section,
            normalizeForMatch(item.description || ''),
            normalizeCim10Code(item.code || ''),
            normalizeForMatch(item.date || ''),
            normalizeForMatch(item.remarks || '')
        ].join('|');
    }

    function parseExtraDetails(afterCode, description) {
        const parts = String(afterCode || '')
            .split(',')
            .map(p => normalizeSpaces(p))
            .filter(Boolean);

        let date = '';
        let lateralite = '';
        const remarkParts = [];

        for (const part of parts) {
            const dateInfo = extractDateToken(part);
            let remaining = dateInfo.cleaned;

            if (dateInfo.date && !date) {
                date = dateInfo.date;
            }

            const lat = detectLateralite(remaining);
            if (lat && !lateralite) {
                lateralite = lat;
                remaining = stripLateraliteFromEnd(remaining);
                remaining = remaining
                    .replace(/\b(droite?|gauche|d|g|bilat[ée]ral[e]?|d\s*\+\s*g|g\s*\+\s*d)\b/gi, '')
                    .replace(/^[,;:\s]+|[,;:\s]+$/g, '');
            }

            remaining = cleanRemarkToken(remaining);

            if (remaining && !/^(droite?|gauche|d|g|bilat[ée]ral[e]?|d\s*\+\s*g|g\s*\+\s*d)$/i.test(remaining)) {
                remarkParts.push(remaining);
            }
        }

        if (!lateralite) {
            lateralite = detectLateralite(description);
        }

        const descDate = extractDateToken(description);
        if (descDate.date && !date) {
            date = descDate.date;
        }

        return {
            remarks: normalizeSpaces(remarkParts.join(', ')),
            lateralite: sanitizeLateraliteForDescription(description, lateralite),
            date
        };
    }

    function cleanAtcdTechnicalField(value) {
        return normalizeSpaces(String(value || '')
            .replace(/^["“”]+|["“”]+$/g, '')
            .replace(/\[\[([A-Z][A-Z0-9]{0,3}(?:\.[A-Z0-9]+)?(?:-[A-Z][A-Z0-9]{0,3}(?:\.[A-Z0-9]+)?)?)\]\]/gi, '$1')
            .replace(/\[([A-Z][A-Z0-9]{0,3}(?:\.[A-Z0-9]+)?(?:-[A-Z][A-Z0-9]{0,3}(?:\.[A-Z0-9]+)?)?)\]/gi, '$1')
        );
    }

    function fieldContainsForbiddenHeidiValue(value) {
        const n = normalizeForMatch(value);
        return !n ||
            n.includes('erreur cim10') ||
            n.includes('a confirmer') ||
            n.includes('non precise') ||
            n.includes('non mentionne') ||
            n.includes('non renseigne') ||
            n.includes('non connu') ||
            n === 'membre de la famille' ||
            n === 'membre familial' ||
            n === 'famille' ||
            n === 'familial' ||
            n === 'familiaux' ||
            n === 'parent' ||
            n.includes('incertain') ||
            n.includes('?');
    }

    function cleanOptionalAtcdTechnicalField(value) {
        const cleaned = cleanAtcdTechnicalField(value);
        return cleaned && !fieldContainsForbiddenHeidiValue(cleaned) ? cleaned : '';
    }

    function normalizeAtcdPriority(value) {
        const cleaned = cleanAtcdTechnicalField(value)
            .toUpperCase()
            .replace(/\s+/g, '');
        return ATCD_PRIORITY_VALUES.has(cleaned) ? cleaned : '';
    }

    function isForbiddenAtcdPriorityToken(value) {
        const n = normalizeForMatch(value).replace(/\s+/g, '_');
        return /^(PRIO_GRIS|PRIO_AUCUNE|AUCUNE|GRIS|PAS_DE_PRIORITE|PAS_DE_PRIORITÉ)$/i.test(n);
    }

    function looksLikeAtcdPriorityToken(value) {
        const raw = cleanAtcdTechnicalField(value);
        if (!raw) return false;
        if (normalizeAtcdPriority(raw)) return true;
        if (isForbiddenAtcdPriorityToken(raw)) return true;
        return /^PRIO[_\s-]?[A-ZÀ-ÖØ-Þ]+$/i.test(raw);
    }

    function isValidTechnicalCim10Code(code) {
        const cleaned = normalizeCim10Code(code);
        return !!cleaned &&
            !fieldContainsForbiddenHeidiValue(cleaned) &&
            isLikelyCim10Code(cleaned);
    }

    function normalizeTechnicalLateralite(value) {
        const raw = cleanAtcdTechnicalField(value);
        if (!raw) return '';
        return detectLateralite(raw) || '';
    }

    function looksLikeTechnicalDateField(value) {
        const raw = normalizeSpaces(value);
        if (!raw) return false;
        if (extractDateToken(raw).date) return true;
        if (sanitizeAtcdTechnicalDateField(raw)) return true;
        return /\b(ann[ée]es?|d[ée]but|fin)\b/i.test(raw);
    }

    function sanitizeAtcdTechnicalDateField(value) {
        const cleaned = cleanOptionalAtcdTechnicalField(value);
        if (!cleaned) return '';

        const normalized = normalizeWedaDateValue(cleaned);
        if (normalized) return normalized;

        const raw = normalizeSpaces(cleaned);
        const lenientFullDate = raw.match(/^(?:date\s*:?\s*)?0*([1-9]|[12]\d|3[01])[\/.-]0*([1-9]|1[0-2])[\/.-]((?:19|20)\d{2})$/i);
        if (!lenientFullDate) return '';

        return normalizeWedaDateValue(`${lenientFullDate[1]}/${lenientFullDate[2]}/${lenientFullDate[3]}`);
    }

    function getYearFromWedaDate(date) {
        const normalized = normalizeWedaDateValue(date);
        const match = normalized.match(/\b(19\d{2}|20\d{2})$/);
        return match ? match[1] : '';
    }

    function extractOptionalPriorityFromTechnicalFields(fields) {
        const normalized = Array.isArray(fields) ? fields.slice() : [];
        const result = {
            fields: normalized,
            priority: '',
            priorityRaw: '',
            priorityInvalid: false
        };

        if (normalized.length < 6) return result;

        let priorityIndex = -1;
        const last = normalized[normalized.length - 1];
        if (normalizeAtcdPriority(last) || looksLikeAtcdPriorityToken(last)) {
            priorityIndex = normalized.length - 1;
        } else if (normalized.length === 7) {
            priorityIndex = 6;
        }

        if (priorityIndex < 0) return result;

        const raw = cleanAtcdTechnicalField(normalized[priorityIndex] || '');
        const priority = normalizeAtcdPriority(raw);

        result.priorityRaw = raw;
        result.priority = priority;
        result.priorityInvalid = !!raw && !priority;
        result.fields = normalized.slice(0, priorityIndex).concat(normalized.slice(priorityIndex + 1));
        return result;
    }

    function normalizeHeidiTechnicalFields(section, fields) {
        const minFields = section === 'familial' ? 4 : 3;
        if (fields.length < minFields) return null;

        const normalized = fields.slice();

        if (normalized.length > 6) {
            if (section === 'familial') {
                const extraCodeIndex = normalized.slice(4).findIndex(field => isValidTechnicalCim10Code(field));
                if (extraCodeIndex >= 0) {
                    const codeIndex = extraCodeIndex + 4;
                    return [
                        normalized[0],
                        normalized[1],
                        normalized[2],
                        normalized[3],
                        cleanRemarkToken(normalized.slice(4, Math.max(4, codeIndex - 1)).join(' | ')),
                        ''
                    ];
                }

                const tail = normalized.slice(4);
                return [
                    normalized[0],
                    normalized[1],
                    normalized[2],
                    normalized[3],
                    cleanRemarkToken(tail.slice(0, -1).join(' | ')),
                    tail[tail.length - 1] || ''
                ];
            }

            const extraCodeIndex = normalized.slice(3).findIndex(field => isValidTechnicalCim10Code(field));
            if (extraCodeIndex >= 0) {
                const codeIndex = extraCodeIndex + 3;
                return [
                    normalized[0],
                    normalized[1],
                    normalized[2],
                    cleanRemarkToken(normalized.slice(3, Math.max(3, codeIndex - 1)).join(' | ')),
                    '',
                    ''
                ];
            }

            const tail = normalized.slice(3);
            return [
                normalized[0],
                normalized[1],
                normalized[2],
                cleanRemarkToken(tail.slice(0, -2).join(' | ')),
                tail.length >= 2 ? tail[tail.length - 2] : '',
                tail.length >= 1 ? tail[tail.length - 1] : ''
            ];
        }

        while (normalized.length < 6) normalized.push('');

        if (section === 'familial' && fields.length === 5 && looksLikeTechnicalDateField(fields[4])) {
            normalized[5] = fields[4];
            normalized[4] = '';
        }

        if (section !== 'familial' && fields.length === 5 && looksLikeTechnicalDateField(fields[4])) {
            normalized[5] = fields[4];
            normalized[4] = '';
        }

        return normalized;
    }

    function splitFamilialTitleField(title) {
        const raw = cleanAtcdTechnicalField(title);
        if (!raw) return { familyMember: '', description: '' };

        if (raw.includes(':')) {
            const parts = raw.split(':');
            const familyMember = cleanAtcdTechnicalField(parts.shift() || '');
            const description = cleanAtcdTechnicalField(parts.join(':') || '');
            return { familyMember, description };
        }

        return { familyMember: '', description: raw };
    }

    function isNewFamilialTechnicalLine(fields) {
        return Array.isArray(fields)
            && String(fields[0] || '').toUpperCase() === 'F'
            && isValidTechnicalCim10Code(fields[2] || '');
    }

    function buildDetailsFromTechnicalLine(section, fields) {
        if (section === 'familial') {
            if (isNewFamilialTechnicalLine(fields)) {
                const title = splitFamilialTitleField(fields[1] || '');
                const code = normalizeCim10Code(cleanAtcdTechnicalField(fields[2] || ''));
                const remarks = cleanOptionalAtcdTechnicalField(cleanRemarkToken(fields[3] || ''));
                const lateralite = sanitizeLateraliteForDescription(
                    title.description,
                    normalizeTechnicalLateralite(fields[4] || '')
                );
                const date = sanitizeAtcdTechnicalDateField(fields[5] || '');

                return {
                    section,
                    code,
                    details: {
                        description: title.description,
                        familyMember: title.familyMember,
                        remarks,
                        date,
                        year: getYearFromWedaDate(date),
                        lateralite
                    }
                };
            }

            const familyMember = cleanAtcdTechnicalField(fields[1] || '');
            const description = cleanAtcdTechnicalField(fields[2] || '');
            const code = normalizeCim10Code(cleanAtcdTechnicalField(fields[3] || ''));
            const remarks = cleanOptionalAtcdTechnicalField(cleanRemarkToken(fields.slice(4, Math.max(5, fields.length - 1)).join(' | ')));
            const date = sanitizeAtcdTechnicalDateField(fields.length >= 6 ? fields[fields.length - 1] : '');

            return {
                section,
                code,
                details: {
                    description,
                    familyMember,
                    remarks,
                    date,
                    year: getYearFromWedaDate(date),
                    lateralite: ''
                }
            };
        }

        const description = cleanAtcdTechnicalField(fields[1] || '');
        const code = normalizeCim10Code(cleanAtcdTechnicalField(fields[2] || ''));
        const remarks = cleanOptionalAtcdTechnicalField(cleanRemarkToken(fields.slice(3, Math.max(4, fields.length - 2)).join(' | ')));
        const lateralite = sanitizeLateraliteForDescription(
            description,
            normalizeTechnicalLateralite(fields.length >= 5 ? fields[fields.length - 2] : '') || detectLateralite(description)
        );
        const date = sanitizeAtcdTechnicalDateField(fields.length >= 6 ? fields[fields.length - 1] : '');

        return {
            section,
            code,
            details: {
                description,
                familyMember: '',
                remarks,
                date,
                year: getYearFromWedaDate(date),
                lateralite
            }
        };
    }

    function normalizeMalformedFamilialLineFields(rawFields) {
        const fields = Array.isArray(rawFields) ? rawFields.slice() : [];
        const type = String(fields[0] || '').toUpperCase();
        if (type !== 'F') return fields;

        const familyMember = cleanAtcdTechnicalField(fields[1] || '');
        const description = cleanAtcdTechnicalField(fields[2] || '');
        const code = normalizeCim10Code(cleanAtcdTechnicalField(fields[3] || ''));

        if (familyMember || !description || !isValidTechnicalCim10Code(code)) {
            return fields;
        }

        const tail = fields.slice(4).map(cleanAtcdTechnicalField).filter(Boolean);
        let remarks = '';
        let date = '';

        if (tail.length) {
            const last = tail[tail.length - 1];
            if (looksLikeTechnicalDateField(last)) {
                date = last;
                remarks = cleanRemarkToken(tail.slice(0, -1).join(' | '));
            } else {
                remarks = cleanRemarkToken(tail.join(' | '));
            }
        }

        return ['M', description, code, remarks, '', date];
    }

    function parseHeidiResultToItems(resultText) {
        const lines = splitHeidiTechnicalCandidateLines(resultText);

        const items = [];
        const skipped = [];

        for (let rawLine of lines) {
            if (/^(BEGIN_ATCD|END_ATCD)$/i.test(normalizeSpaces(rawLine))) continue;

            const priorityInfo = extractOptionalPriorityFromTechnicalFields(rawLine.split('|').map(cleanAtcdTechnicalField));
            const rawFields = normalizeMalformedFamilialLineFields(priorityInfo.fields);
            const type = String(rawFields[0] || '').toUpperCase();
            const section = type === 'M' ? 'medical' : (type === 'C' ? 'chirurgical' : (type === 'F' ? 'familial' : ''));

            if (!section) {
                skipped.push({
                    section: '',
                    raw: rawLine,
                    reason: 'Format technique inconnu'
                });
                continue;
            }

            const fields = normalizeHeidiTechnicalFields(section, rawFields);
            if (!fields) {
                skipped.push({
                    section,
                    raw: rawLine,
                    reason: 'Nombre de champs invalide'
                });
                continue;
            }

            const parsed = buildDetailsFromTechnicalLine(section, fields);
            const details = parsed.details;
            const code = parsed.code;

            if (!details.description || fieldContainsForbiddenHeidiValue(details.description)) {
                skipped.push({
                    section,
                    raw: rawLine,
                    reason: 'Description absente ou invalide'
                });
                continue;
            }

            if (section === 'familial' && (!details.familyMember || fieldContainsForbiddenHeidiValue(details.familyMember))) {
                skipped.push({
                    section,
                    raw: rawLine,
                    reason: 'Membre familial absent ou invalide'
                });
                continue;
            }

            if (!isValidTechnicalCim10Code(code)) {
                skipped.push({
                    section,
                    raw: rawLine,
                    reason: 'Code CIM-10 absent ou invalide'
                });
                continue;
            }

            if (section === 'familial') {
                const familyMembers = splitFamilyMemberLabel(details.familyMember);
                for (const familyMember of familyMembers) {
                    items.push(buildParsedAtcdItem(section, rawLine, details, code, familyMember));
                }
            } else {
                items.push(buildParsedAtcdItem(section, rawLine, details, code));
            }
        }

        const seen = new Set();
        const deduped = [];

        for (const item of items) {
            if (shouldSkipParsedAtcdItem(item)) {
                skipped.push({
                    section: item.section,
                    raw: item.raw,
                    reason: getParsedAtcdSkipReason(item)
                });
                continue;
            }

            const key = getAtcdDedupeKey(item);
            if (seen.has(key)) continue;
            seen.add(key);
            deduped.push(item);
        }

        return { items: deduped, skipped };
    }

    function parseAtcdDetails(section, beforeCode, afterCode) {
        let description = normalizeSpaces(beforeCode);
        let familyMember = '';

        if (section === 'familial' && description.includes(':')) {
            const parts = description.split(':');
            familyMember = normalizeSpaces(parts.shift());
            description = normalizeSpaces(parts.join(':'));
        }

        const extras = parseExtraDetails(afterCode, description);

        if (extras.lateralite) {
            description = stripLateraliteFromEnd(description);
        }

        const descDate = extractDateToken(description);
        description = descDate.cleaned || description;

        description = description
            .replace(/\b(19\d{2}|20\d{2})\b/g, '')
            .replace(/\b[0-3]\d\/[01]\d\/(?:19|20)\d{2}\b/g, '')
            .replace(/[,;]+$/g, '')
            .trim();

        const date = extras.date || descDate.date || '';
        const year = date ? date.slice(-4) : '';

        return {
            description,
            familyMember,
            remarks: extras.remarks,
            date,
            year,
            lateralite: extras.lateralite
        };
    }

    function detectLateralite(text) {
        const n = normalizeForMatch(text);

        if (/\b(d\s*\+\s*g|g\s*\+\s*d|bilateral|bilaterale|bilateraux|des deux cotes|droit et gauche|droite et gauche)\b/.test(n)) return 'bilateral';
        if (/\b(g|gauche|left)\b/.test(n)) return 'gauche';
        if (/\b(d|droit|droite|right)\b/.test(n)) return 'droite';

        return '';
    }

    function stripLateraliteFromEnd(text) {
        return normalizeSpaces(String(text || '')
            .replace(/[,;]?\s*(D\s*\+\s*G|G\s*\+\s*D|bilat[ée]ral[e]?|bilat\.?|droite?\s+et\s+gauche|gauche\s+et\s+droite|droite?|gauche|D|G)\s*$/i, '')
        );
    }

    function isClearlyNonLateralizableDescription(text) {
        const n = normalizeForMatch(text);
        return /\b(alzheimer|demence|diabete|diabetique|hta|hypertension|dyslipidemie|hyperlipidemie|asthme|migraine|psoriasis)\b/.test(n);
    }

    function sanitizeLateraliteForDescription(description, lateralite) {
        const cleaned = normalizeTechnicalLateralite(lateralite);
        if (!cleaned) return '';
        if (isClearlyNonLateralizableDescription(description)) return '';
        return cleaned;
    }

    function normalizeCim10LabelForTitleMatch(text) {
        return normalizeForMatch(text)
            .replace(/[()[\]{}.,;:]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function cim10LabelContainsCommentTitle(cim10Label, title) {
        const labelNorm = normalizeCim10LabelForTitleMatch(cim10Label);
        const titleNorm = normalizeCim10LabelForTitleMatch(title);

        if (!labelNorm || !titleNorm) return false;

        return (` ${labelNorm} `).includes(` ${titleNorm} `);
    }

    function normalizeWedaDateValue(value) {
        const raw = normalizeSpaces(value);
        if (!raw) return '';

        const fullDate = raw.match(/^(?:date\s*:?\s*)?([0-3]?\d)[\/.-]([01]?\d)[\/.-]((?:19|20)\d{2})$/i);
        if (fullDate) {
            const day = Number(fullDate[1]);
            const month = Number(fullDate[2]);
            if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
                return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${fullDate[3]}`;
            }
            return '';
        }

        const year = raw.match(/^(?:date\s*:?\s*)?((?:19|20)\d{2})$/i);
        if (year) return `01/01/${year[1]}`;

        return '';
    }

    function getWedaCommentDateLineRepair(comment) {
        const lines = String(comment || '').split(/\r?\n/);
        const kept = [];
        const removedLines = [];
        let date = '';

        for (const line of lines) {
            const normalizedLine = normalizeSpaces(line);
            const dateValue = normalizedLine && /^date\s*:?\s*/i.test(normalizedLine)
                ? normalizeWedaDateValue(normalizedLine)
                : '';

            if (dateValue) {
                if (!date) date = dateValue;
                removedLines.push(line);
                continue;
            }

            kept.push(line);
        }

        return {
            date,
            cleanedComment: kept.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
            removedCount: removedLines.length,
            removedLines
        };
    }

    function stripWedaDateLinesFromComment(comment) {
        return getWedaCommentDateLineRepair(comment).cleanedComment;
    }

    function buildWedaComment(details, cim10Label = '') {
        const parts = [];

        const title = normalizeSpaces(details.description || '');
        if (title && !cim10LabelContainsCommentTitle(cim10Label, title)) {
            parts.push(title);
        }

        if (details.remarks) {
            parts.push(details.remarks);
        }

        return stripWedaDateLinesFromComment(parts.join('\n'));
    }

    function refreshWedaCommentForCim10Label(item, cim10Label) {
        const comment = buildWedaComment(item, cim10Label);
        return {
            ...item,
            comment
        };
    }

    function getFamilyMemberOtherFallbackCommentLine(item) {
        const fallback = item && item.wedaFamilyMemberOtherFallback;
        const member = normalizeSpaces(fallback && fallback.familyMember || '');
        return member ? `Lien familial : ${member}` : '';
    }

    function buildWedaCommentForFill(item, rawCommentValue) {
        const baseComment = stripWedaDateLinesFromComment(rawCommentValue);
        const fallbackLine = getFamilyMemberOtherFallbackCommentLine(item);
        if (!fallbackLine) return baseComment;

        const fallbackMember = item && item.wedaFamilyMemberOtherFallback
            ? item.wedaFamilyMemberOtherFallback.familyMember
            : '';
        if (normalizedTextHasExactFamilyMember(baseComment, fallbackMember)) return baseComment;

        return [fallbackLine, baseComment].filter(Boolean).join('\n');
    }

    async function finalizeHeidiResultAndOpenWeda(resultText, source = 'auto', options = {}) {
        if (window.__AUTO_ATCD_CIM10_LMSTUDIO_HEIDI_FINALIZE_RUNNING__) {
            showBadge('Transmission du résultat IA déjà en cours dans cet onglet.', { duration: 4000 });
            return getJob();
        }

        window.__AUTO_ATCD_CIM10_LMSTUDIO_HEIDI_FINALIZE_RUNNING__ = true;

        try {
            const cleanedResultText = nettoyerSortieHeidiAntecedents(resultText);
            const parsed = parseHeidiResultToItems(cleanedResultText);
            const current = getJob() || {};
            const forceRunner = !!(options && options.forceRunner);

            if (current && current.id && !isThisHeidiWorkerForJob(current)) {
                closeCurrentScriptedHeidiWorkerIfDoneOrMismatched(current, 'mismatch');
                return current;
            }

            if (heidiRunnerIsActiveForOtherTab(current)) {
                if (!forceRunner) {
                    showBadge('Un autre onglet pilote déjà ce job LM Studio.\nCet onglet reste inactif.', { duration: 6000 });
                    if (isScriptedHeidiWorkerTab()) {
                        closeCurrentHeidiTabSoon('Un autre onglet pilote ce job.\nFermeture de ce doublon…', {
                            unloadIfBlocked: true,
                            delayMs: 4000
                        });
                    }
                    return current;
                }

                logImportEvent('warning', 'lmstudio_runner_takeover', 'Reprise du verrou IA pour finaliser un résultat stable.', {
                    jobId: current.id || '',
                    source,
                    currentTabId: TAB_ID,
                    previousRunnerTabId: current.heidiRunnerTabId || '',
                    previousRunnerExpiresAt: current.heidiRunnerExpiresAt || 0
                });
                current.heidiRunnerTabId = TAB_ID;
                current.heidiRunnerSource = source;
                current.heidiRunnerExpiresAt = nowMs() + 180000;
                current.updatedAt = nowIso();
            }

            const alreadyImporting = current.status === 'IMPORT_WEDA' && Array.isArray(current.parsedAtcd) && current.parsedAtcd.length > 0;
            if (alreadyImporting && hasActiveWedaWorkerOrOpening(current)) {
                showBadge('Résultat IA déjà transmis à WEDA.\nImport déjà en cours.', { duration: 7000 });
                closeCurrentHeidiTabSoon('Import WEDA déjà lancé.\nFermeture de cet onglet…');
                return current;
            }

            const allowedStatuses = ['PENDING_LMSTUDIO', 'RUNNING_LMSTUDIO', 'IMPORT_WEDA', 'ERROR'];
            if (current.status && !allowedStatuses.includes(current.status)) {
                showBadge('Résultat IA détecté, mais aucun job actif compatible.', { error: true, duration: 8000 });
                return null;
            }

            const parsedItems = alreadyImporting ? current.parsedAtcd : parsed.items;
            const skippedLines = alreadyImporting && Array.isArray(current.skipped) ? current.skipped : parsed.skipped;
            const jobId = current.id || makeJobId();

            const job = {
                ...current,
                id: jobId,
                version: VERSION_AUTO_ATCD_CIM10_LMSTUDIO,
                updatedAt: nowIso(),
                heidiResultAt: nowIso(),
                heidiResultSource: source,
                status: parsedItems.length ? 'IMPORT_WEDA' : 'DONE_NO_IMPORT',
                sourcePatientId: current.sourcePatientId || current.batchPatientId || extractWedaPatDkFromUrl(current.wedaImportUrl || current.patientUrl || ''),
                expectedPatientId: current.expectedPatientId || current.batchPatientId || current.sourcePatientId || extractWedaPatDkFromUrl(current.wedaImportUrl || current.patientUrl || ''),
                heidiResultText: cleanedResultText,
                parsedAtcd: parsedItems,
                skipped: skippedLines,
                importIndex: alreadyImporting ? Number(current.importIndex || 0) : 0,
                imported: alreadyImporting && Array.isArray(current.imported) ? current.imported : [],
                heidiRunnerTabId: current.heidiRunnerTabId || TAB_ID,
                heidiRunnerExpiresAt: nowMs() + 180000,
                wedaWorkerTabId: alreadyImporting ? (current.wedaWorkerTabId || '') : '',
                errors: Array.isArray(current.errors) ? current.errors : []
            };

            setJob(job);

            if (!parsedItems.length) {
                logImportEvent('warning', 'parse_lmstudio_result', 'Résultat LM Studio récupéré, mais aucun antécédent CIM10 exploitable à importer.', {
                    jobId: job.id,
                    skipped: skippedLines
                });
                showBadge('Résultat LM Studio récupéré, mais aucun antécédent avec CIM10 exploitable à importer.', { error: true, duration: 12000 });
                return job;
            }

            const importUrl = job.wedaImportUrl || job.patientUrl || 'https://secure.weda.fr/';
            const workerUrl = buildWedaWorkerUrl(importUrl, job.id);
            logImportEvent('info', 'parse_lmstudio_result', `${parsedItems.length} antécédent(s) CIM10 prêt(s) pour import WEDA.`, {
                jobId: job.id,
                source,
                parsedCount: parsedItems.length,
                skippedCount: skippedLines.length,
                items: parsedItems.map(summarizeImportItem)
            });

            showBadge(`${parsedItems.length} antécédent(s) CIM10 récupéré(s).\nPréparation de l’import WEDA…`, { duration: 9000 });

            if (shouldImportInSilentWedaFrame(job)) {
                job.wedaImportRunnerMode = 'controller_iframe';
                job.wedaImportRequestedAt = nowIso();
                job.updatedAt = nowIso();
                setJob(job);

                [0, 250, 1000, 3000, 8000, 15000].forEach(delayMs => {
                    setTimeout(() => {
                        const latest = getJob() || job;
                        if (latest && latest.id === job.id && latest.status === 'IMPORT_WEDA') {
                            publishWedaImportWake(latest, `controller_iframe_import_${delayMs}`);
                        }
                    }, delayMs);
                });

                logImportEvent('info', 'weda_import_controller_iframe', 'Import WEDA demandé à l’iframe silencieux hébergé par l’onglet contrôleur actif.', {
                    jobId: job.id,
                    batchId: job.batchId,
                    sourceWedaTabId: job.sourceWedaTabId,
                    parsedCount: parsedItems.length
                });

                showBadge(
                    `${parsedItems.length} antécédent(s) CIM10 récupéré(s).\n` +
                    'Import demandé au runner WEDA silencieux de l’onglet contrôleur…',
                    { duration: 9000 }
                );

                runWatchedAsync('heidi_close_after_controller_iframe_import_start', () => closeCurrentHeidiTabAfterWedaImportStarts(job), { job });
                return job;
            }

            if (shouldImportInSourceWedaTab(job)) {
                job.wedaImportRunnerMode = 'source_weda_tab';
                job.wedaImportRequestedAt = nowIso();
                job.updatedAt = nowIso();
                setJob(job);

                [0, 750, 2500, 6000].forEach(delayMs => {
                    setTimeout(() => {
                        const latest = getJob() || job;
                        if (latest && latest.id === job.id && latest.status === 'IMPORT_WEDA') {
                            publishWedaImportWake(latest, `source_weda_tab_import_${delayMs}`);
                        }
                    }, delayMs);
                });

                logImportEvent('info', 'weda_import_source_tab', 'Import WEDA demandé à l’onglet patient source déjà ouvert.', {
                    jobId: job.id,
                    batchId: job.batchId,
                    sourceWedaTabId: job.sourceWedaTabId,
                    parsedCount: parsedItems.length
                });

                showBadge(
                    `${parsedItems.length} antécédent(s) CIM10 récupéré(s).\n` +
                    'Import demandé à l’onglet WEDA patient source en arrière-plan…',
                    { duration: 9000 }
                );

                runWatchedAsync('heidi_close_after_source_weda_import_start', () => closeCurrentHeidiTabAfterWedaImportStarts(job), { job });
                return job;
            }

            const reservedOpen = await acquireWedaWorkerOpenLock(job);
            if (!reservedOpen) {
                const latest = getJob() || job;
                showBadge('Résultat déjà pris en charge par un autre onglet.\nImport WEDA en cours.', { duration: 6000 });
                closeCurrentHeidiTabSoon('Résultat déjà transmis à WEDA.\nFermeture de cet onglet…');
                return latest;
            }

            const latestBeforeOpen = getJob() || job;
            if (latestBeforeOpen.id === job.id && latestBeforeOpen.wedaWorkerOpenedAt && latestBeforeOpen.wedaWorkerOpenedByTabId !== TAB_ID) {
                releaseWedaWorkerOpenLock(job);
                closeCurrentHeidiTabSoon('Import WEDA déjà lancé.\nFermeture de cet onglet…');
                return latestBeforeOpen;
            }

            const opened = openTabSafe(workerUrl, !WEDA_WORKERS_OPEN_IN_BACKGROUND, {
                insert: !WEDA_WORKERS_OPEN_IN_BACKGROUND,
                setParent: false
            });

            if (!opened) {
                releaseWedaWorkerOpenLock(job);
                showBadge('Impossible d’ouvrir automatiquement WEDA worker.\nLance AUTO_ATCD_CIM10_LMSTUDIO_FORCE_IMPORT_FROM_LMSTUDIO() ou ouvre WEDA manuellement.', { error: true, duration: 15000 });
                return getJob() || job;
            }

            const openedJob = markWedaWorkerOpened(job);
            releaseWedaWorkerOpenLock(openedJob);
            publishWedaImportWake(openedJob, 'weda_worker_opened');
            runWatchedAsync('heidi_close_after_weda_import_start', () => closeCurrentHeidiTabAfterWedaImportStarts(openedJob), { job: openedJob });
            return openedJob;
        } finally {
            window.__AUTO_ATCD_CIM10_LMSTUDIO_HEIDI_FINALIZE_RUNNING__ = false;
        }
    }

    async function handleHeidiJob() {
        if (!isHeidi()) return;

        rememberHeidiJobIdFromHash();
        let job = getJob();
        if (closeCurrentScriptedHeidiWorkerIfDoneOrMismatched(job, isThisHeidiWorkerForJob(job) ? 'done' : 'mismatch')) return;
        if (job && !isThisHeidiWorkerForJob(job)) return;
        if (!job || job.status !== 'PENDING_LMSTUDIO') return;

        if (!claimHeidiRunner(job, 'handle_heidi_job')) {
            showBadge('Un autre onglet Heidi prépare déjà ce patient.\nCet onglet reste inactif.', { duration: 6000 });
            if (isScriptedHeidiWorkerTab()) {
                closeCurrentHeidiTabSoon('Un autre onglet Heidi pilote déjà ce job.\nFermeture de ce doublon…', {
                    unloadIfBlocked: true,
                    delayMs: 4000
                });
            }
            return;
        }

        job = getJob() || job;
        const heidiPayload = normalizeSpaces(job.heidiPayload || job.extractedText || '');
        if (!heidiPayload) {
            job.status = 'EXTRACT_WEDA';
            job.heidiRunnerTabId = '';
            job.heidiRunnerExpiresAt = 0;
            job.heidiRunStartedAt = '';
            job.updatedAt = nowIso();
            job.errors = Array.isArray(job.errors) ? job.errors : [];
            job.errors.push({
                at: nowIso(),
                phase: 'heidi_empty_payload',
                message: 'Prompt Heidi vide : retour à l’extraction WEDA pour éviter une fenêtre Heidi inutile.'
            });
            setJob(job);
            try { GM_deleteValue(KEY_HEIDI_OPEN_LOCK); } catch (_) {}
            logImportEvent('warning', 'heidi_empty_payload', 'Prompt Heidi vide : Heidi non lancé, extraction WEDA relancée.', {
                jobId: job.id,
                itemCount: Array.isArray(job.items) ? job.items.length : Number(job.itemCount || 0)
            });
            closeCurrentHeidiTabSoon('Prompt Heidi vide.\nRetour à WEDA pour relancer l’extraction…', {
                unloadIfBlocked: true,
                delayMs: 250
            });
            return;
        }

        const initialVisibleHeidiText = getHeidiAskAiText();
        job.status = 'RUNNING_LMSTUDIO';
        job.heidiRunnerTabId = TAB_ID;
        job.heidiRunnerExpiresAt = nowMs() + 180000;
        job.heidiRunStartedAt = nowIso();
        job.heidiPromptSubmittedAt = '';
        job.heidiPreviousResultSignature = signatureHeidiVisibleText(initialVisibleHeidiText);
        job.heidiPreviousResultCapturedAt = nowIso();
        job.updatedAt = nowIso();
        setJob(job);
        logImportEvent('info', 'heidi', 'Envoi du prompt vers Heidi Ask AI.', {
            jobId: job.id,
            payloadLength: heidiPayload.length
        });

        showBadge('Heidi : préparation Ask AI CIM10…', { duration: 6000 });

        try {
            await sleep(1200);
            renewHeidiRunner(getJob() || job);

            await heidiClickNewSessionIfAvailable();
            renewHeidiRunner(getJob() || job);

            job = getJob() || job;
            if (job && job.id && !job.heidiPreviousResultSignature) {
                job.heidiPreviousResultSignature = signatureHeidiVisibleText(getHeidiAskAiText());
                job.heidiPreviousResultCapturedAt = nowIso();
                job.updatedAt = nowIso();
                setJob(job);
            }

            const markHeidiPromptSubmitted = () => {
                const latest = getJob() || job;
                if (!latest || latest.id !== job.id) return;
                latest.heidiPromptSubmittedAt = nowIso();
                latest.updatedAt = nowIso();
                latest.heidiRunnerTabId = TAB_ID;
                latest.heidiRunnerExpiresAt = nowMs() + 180000;
                setJob(latest);
            };

            const resultText = await heidiPasteAskAiAndSubmit(heidiPayload, markHeidiPromptSubmitted);
            renewHeidiRunner(getJob() || job);

            if (resultText && looksLikeHeidiCim10Result(resultText)) {
                await finalizeHeidiResultAndOpenWeda(resultText, 'wait_after_submit');
            } else {
                const refreshed = getHeidiAskAiText();
                if (looksLikeHeidiCim10Result(refreshed)) {
                    await finalizeHeidiResultAndOpenWeda(refreshed, 'fallback_visible_result');
                } else {
                    const current = getJob() || job;
                    if (!current || current.id !== job.id || current.status !== 'RUNNING_LMSTUDIO') {
                        return;
                    }
                    current.status = 'RUNNING_LMSTUDIO';
                    current.updatedAt = nowIso();
                    current.heidiWarnings = Array.isArray(current.heidiWarnings) ? current.heidiWarnings : [];
                    current.heidiWarnings.push({
                        at: nowIso(),
                        phase: 'heidi_wait_after_submit',
                        message: 'Résultat Heidi CIM10 non détecté automatiquement après validation. Surveillance active maintenue.',
                        visibleTextLength: String(refreshed || '').length
                    });
                    current.heidiWarnings = current.heidiWarnings.slice(-20);
                    setJob(current);
                    logImportEvent('info', 'heidi', 'Résultat Heidi CIM10 non détecté automatiquement après validation : surveillance active maintenue.', {
                        jobId: current.id,
                        visibleTextLength: String(refreshed || '').length
                    });

                    showBadge('Résultat non encore détecté automatiquement.\nLe script continue de surveiller Heidi.', { duration: 10000 });
                }
            }
        } catch (e) {
            const message = String(e && e.message ? e.message : e);
            const current = prepareHeidiRetrySamePatient(getJob() || job, e, {
                source: 'handle_heidi_job',
                stack: e && e.stack ? String(e.stack).slice(0, 2000) : ''
            });

            showBadge('Heidi Ask AI indisponible.\nNouvelle tentative sur le même patient.\n' + message, { error: true, duration: 12000 });
            if (isScriptedHeidiWorkerTab()) {
                closeCurrentHeidiTabSoon('Heidi indisponible.\nFermeture de cet onglet, nouvelle tentative à venir…', {
                    unloadIfBlocked: true,
                    delayMs: 4000
                });
            }
            warn(message, e);
        }
    }

    async function forceImportFromHeidiResult(source = 'manual') {
        const text = getHeidiAskAiText();

        if (!looksLikeHeidiCim10Result(text)) {
            showBadge('Aucun résultat Heidi CIM10 exploitable détecté.', { error: true, duration: 10000 });
            return null;
        }

        return await finalizeHeidiResultAndOpenWeda(text, source);
    }

    /************************************************************
     * IMPORT HEIDI → WEDA
     ************************************************************/

    async function ensureWedaAntecedentPageForImport() {
        if (isAntecedentPageWeda()) {
            return !!(await waitForWedaAntecedentRoot(20000));
        }

        if (isPatientAccueilWeda()) {
            showBadge('Import CIM10 : ouverture de la page Antécédents WEDA…', { duration: 7000 });
            const clicked = clickGotoAntecedentsWeda();
            if (!clicked) return false;
            return !!(await waitForWedaAntecedentRoot(20000));
        }

        return false;
    }

    function expectedImportHeaderNorm(section) {
        if (section === 'medical') return 'antecedents medicaux';
        if (section === 'chirurgical') return 'antecedents chirurgicaux';
        if (section === 'familial') return 'antecedents familiaux';
        return '';
    }

    function isBadDropZoneText(text) {
        const n = normalizeForMatch(text);
        return /vous ne pouvez pas dropper/.test(n)
            || /\ballergies\b/.test(n)
            || /\bmode de vie\b/.test(n)
            || /\btraitements\b/.test(n)
            || /\bfacteurs de risque\b/.test(n)
            || /\bald\b/.test(n)
            || /\bpathologie\b/.test(n);
    }

    function isFamilialImportLabelNorm(textNorm) {
        const n = String(textNorm || '');
        return /^familiaux\b/.test(n)
            || /\bfamiliaux\b/.test(n)
            || /\bantecedents?\s+familiaux\b/.test(n)
            || /\batcd\s+familiaux\b/.test(n)
            || /\btype de l.*familiaux\b/.test(n);
    }

    function importLabelPack(el) {
        const mainRaw = getHeaderMainLabel(el);
        const ownRaw = getOwnText(el);
        const textRaw = normalizeSpaces(el ? (el.innerText || el.textContent || '') : '');
        const titleRaw = normalizeSpaces(el ? (el.getAttribute('title') || '') : '');
        const ariaRaw = normalizeSpaces(el ? (el.getAttribute('aria-label') || '') : '');

        const pack = {
            mainRaw,
            ownRaw,
            textRaw,
            titleRaw,
            ariaRaw,
            allRaw: normalizeSpaces(`${mainRaw} ${ownRaw} ${textRaw} ${titleRaw} ${ariaRaw}`)
        };

        pack.main = normalizeForMatch(pack.mainRaw);
        pack.own = normalizeForMatch(pack.ownRaw);
        pack.text = normalizeForMatch(pack.textRaw);
        pack.title = normalizeForMatch(pack.titleRaw);
        pack.aria = normalizeForMatch(pack.ariaRaw);
        pack.all = normalizeForMatch(pack.allRaw);

        return pack;
    }

    function isForbiddenImportCandidate(el, section) {
        const p = importLabelPack(el);

        if (isPathologieAntecedentsSourceHeader(el)) return true;

        if (section === 'familial') {
            return false;
        }

        if (section === 'medical') {
            if (/^antecedents personnels\b/.test(p.main)) return true;
            if (/^problemes en cours\b/.test(p.main)) return true;
            if (/^pathologie\b/.test(p.main)) return true;
            if (/^facteurs de risque complementaire\b/.test(p.main)) return true;
            return false;
        }

        if (section === 'chirurgical') {
            if (/gyneco|obstetric/.test(p.main)) return true;
            if (/gyneco|obstetric/.test(p.own)) return true;
            return false;
        }

        return false;
    }

    function scoreWedaImportHeaderCandidate(el, section) {
        if (!el || !isVisible(el)) return 0;

        const expected = expectedImportHeaderNorm(section);
        if (!expected) return 0;

        const p = importLabelPack(el);
        const className = String(el.className || '').toLowerCase();
        const tagName = String(el.tagName || '').toLowerCase();
        const title = p.title;
        const all = p.all;

        if (!all) return 0;
        if (isForbiddenImportCandidate(el, section)) return 0;

        const headerish =
            /sma|sm|header|title|titre|rubrique|groupe|antecedent/.test(className)
            || /type de l/.test(title)
            || ['div', 'span', 'td', 'th', 'legend', 'a'].includes(tagName);

        if (!headerish && all.length > 260) return 0;
        if (all.length > 1200) return 0;

        let score = 0;

        if (p.main === expected) score += 120;
        if (p.own === expected) score += 110;
        if (p.title === expected) score += 100;

        if (new RegExp('^' + escapeRegex(expected) + '\\b').test(p.main)) score += 90;
        if (new RegExp('^' + escapeRegex(expected) + '\\b').test(p.own)) score += 80;
        if (new RegExp('\\b' + escapeRegex(expected) + '\\b').test(title)) score += 75;
        if (new RegExp('\\b' + escapeRegex(expected) + '\\b').test(all)) score += 55;

        if (/sma/.test(className)) score += 30;
        if (/\bsm\b|(^| )sm($| )/.test(className)) score += 12;
        if (/type de l/.test(title)) score += 20;
        if (tagName === 'td' || tagName === 'div' || tagName === 'span') score += 4;

        if (section === 'familial') {
            if (!isFamilialImportLabelNorm(all)) return 0;
            if (p.main === 'familiaux') score += 130;
            if (p.own === 'familiaux') score += 120;
            if (/\batcd\s+familiaux\b/.test(all)) score += 110;
            if (/\bantecedents?\s+familiaux\b/.test(all)) score += 100;
            if (/type de l.*familiaux/.test(title)) score += 90;
            if (/type de l.*antecedents familiaux/.test(title)) score += 80;
            if (p.main === 'antecedents familiaux') score += 100;
        }

        return score;
    }

    function collectPotentialWedaImportHeaderCandidates(section) {
        const root = getWedaAntecedentRoot() || document.body;
        const expected = expectedImportHeaderNorm(section);
        const candidates = [];
        const seen = new Set();

        function add(el) {
            if (!el || seen.has(el)) return;
            seen.add(el);
            candidates.push(el);
        }

        const focusedSelectors = [
            '.sma',
            '.sm',
            '.smna',
            '[class*="sma"]',
            '[class*="sm"]',
            '[title*="Type de l"]',
            '[title*="type de l"]',
            '[title*="Antécédents"]',
            '[title*="antécédents"]',
            '[id*="Antecedent"]',
            '[id*="antecedent"]'
        ];

        for (const selector of focusedSelectors) {
            try {
                root.querySelectorAll(selector).forEach(add);
            } catch (_) {}
        }

        try {
            root.querySelectorAll('div, span, td, th, a, legend').forEach(el => {
                const p = importLabelPack(el);
                if (p.all && p.all.includes(expected)) add(el);
                if (section === 'familial' && isFamilialImportLabelNorm(p.all)) add(el);
            });
        } catch (_) {}

        return candidates;
    }

    function findWedaExactCategoryHeaders(section) {
        const candidates = collectPotentialWedaImportHeaderCandidates(section)
            .map(el => ({
                el,
                score: scoreWedaImportHeaderCandidate(el, section),
                label: importLabelPack(el)
            }))
            .filter(x => x.score > 0);

        candidates.sort((a, b) => b.score - a.score);

        const headers = [];
        const seen = new Set();

        for (const c of candidates) {
            if (!c.el || seen.has(c.el)) continue;
            seen.add(c.el);
            headers.push(c.el);
        }

        return headers;
    }

    function isForbiddenDropTargetForSection(el, section, header) {
        if (!el) return true;

        const p = importLabelPack(el);
        const headerPack = importLabelPack(header);
        const text = normalizeSpaces(`${p.mainRaw} ${p.ownRaw} ${p.textRaw} ${p.titleRaw}`);
        const n = normalizeForMatch(text);

        if (isBadDropZoneText(text)) return true;
        if (isPathologieAntecedentsSourceHeader(el) || isPathologieAntecedentsSourceHeader(header)) return true;

        if (section === 'familial') {
            const okByHeader = isFamilialImportLabelNorm(headerPack.all);
            const okByTarget = isFamilialImportLabelNorm(n);
            if (!okByHeader && !okByTarget) return true;
        }

        if (section === 'medical') {
            if (/^antecedents personnels\b|^problemes en cours\b|^pathologie\b|^facteurs de risque complementaire\b/.test(p.main)) return true;
            if (!/\bantecedents medicaux\b/.test(n) && el !== header && !el.contains(header)) {
                if (!/\bantecedents medicaux\b/.test(headerPack.all)) return true;
            }
        }

        if (section === 'chirurgical') {
            if (/gyneco|obstetric/.test(p.main) || /gyneco|obstetric/.test(p.own)) return true;
            if (!/\bantecedents chirurgicaux\b/.test(n) && el !== header && !el.contains(header)) {
                if (!/\bantecedents chirurgicaux\b/.test(headerPack.all)) return true;
            }
        }

        return false;
    }

    function addNearbyDropTargets(header, add) {
        if (!header) return;

        add(header, header);
        add(header.parentElement, header);
        add(header.closest('span'), header);
        add(header.closest('div'), header);
        add(header.closest('td'), header);
        add(header.closest('tr'), header);
        add(header.closest('table'), header);

        const baseNodes = [
            header,
            header.parentElement,
            header.closest('div'),
            header.closest('td'),
            header.closest('tr')
        ].filter(Boolean);

        for (const base of baseNodes) {
            let next = base.nextElementSibling;
            let count = 0;
            while (next && count < 6) {
                add(next, header);
                try {
                    next.querySelectorAll('div, span, td, tr, table').forEach(child => add(child, header));
                } catch (_) {}
                next = next.nextElementSibling;
                count++;
            }

            let prev = base.previousElementSibling;
            count = 0;
            while (prev && count < 3) {
                add(prev, header);
                prev = prev.previousElementSibling;
                count++;
            }
        }

        let p = header.parentElement;
        let depth = 0;
        while (p && depth < 7) {
            add(p, header);

            try {
                Array.from(p.children || []).forEach(child => add(child, header));
            } catch (_) {}

            p = p.parentElement;
            depth++;
        }
    }

    function getWedaDropTargetsForSection(section) {
        const headers = findWedaExactCategoryHeaders(section);
        const targets = [];
        const seen = new Set();

        function add(el, header) {
            if (!el || seen.has(el)) return;
            if (!isVisible(el)) return;

            const text = normalizeSpaces(`${el.innerText || el.textContent || ''} ${el.getAttribute('title') || ''}`);

            if (el !== header) {
                if (isForbiddenDropTargetForSection(el, section, header)) return;
                if (text.length > 3500) return;
            }

            seen.add(el);
            targets.push(el);
        }

        for (const header of headers) {
            addNearbyDropTargets(header, add);
        }

        return targets;
    }

    /************************************************************
     * RECHERCHE CIM-10 + FALLBACK PARENT
     ************************************************************/

    function normalizeCim10Code(code) {
        return String(code || '')
            .toUpperCase()
            .replace(/^\[+|\]+$/g, '')
            .replace(/\s+/g, '')
            .replace(/,$/, '')
            .trim();
    }

    function getCim10CodeLooseKey(code) {
        return normalizeCim10Code(code).replace(/\./g, '');
    }

    function cim10CodeEqualsLoose(left, right) {
        const a = getCim10CodeLooseKey(left);
        const b = getCim10CodeLooseKey(right);
        return !!a && !!b && a === b;
    }

    function cim10CodeMatchesParentLoose(code, parentCode) {
        const codeKey = getCim10CodeLooseKey(code);
        const parentKey = getCim10CodeLooseKey(parentCode);
        return !!codeKey && !!parentKey && (codeKey === parentKey || codeKey.startsWith(parentKey));
    }

    function getCim10CategoryRoot(code) {
        const match = normalizeCim10Code(code).match(/^([A-Z][0-9][0-9A-Z])/);
        return match ? match[1] : '';
    }

    function cim10CodesAreCloseForDuplicate(left, right) {
        const a = normalizeCim10Code(left);
        const b = normalizeCim10Code(right);
        if (!isLikelyCim10Code(a) || !isLikelyCim10Code(b)) return false;
        if (cim10CodeEqualsLoose(a, b)) return true;
        if (cim10CodeMatchesParentLoose(a, b) || cim10CodeMatchesParentLoose(b, a)) return true;

        const rootA = getCim10CategoryRoot(a);
        const rootB = getCim10CategoryRoot(b);
        return !!rootA && rootA === rootB;
    }

    function cim10CodeListHasCloseDuplicateMatch(leftCodes, rightCodes) {
        return (leftCodes || []).some(left => (rightCodes || []).some(right => cim10CodesAreCloseForDuplicate(left, right)));
    }

    function getCim10SearchQueriesForCode(code) {
        const normalized = normalizeCim10Code(code);
        const loose = getCim10CodeLooseKey(normalized);
        return [normalized, loose].filter((query, index, list) => query && list.indexOf(query) === index);
    }

    function sanitizeCim10SearchQuery(query) {
        return normalizeCim10Code(query).replace(/[\[\]]/g, '');
    }

    function getWedaCim10CodeCorrection(code, referenceName = '') {
        const cleanCode = normalizeCim10Code(code);
        const reference = normalizeForMatch(referenceName);

        if (
            cleanCode === 'Z77.22' ||
            ((cleanCode === 'Z77.2' || cleanCode === 'Z77') && /\b(tabagisme passif|fumee du tabac|fumee tabac|tabac passif)\b/.test(reference))
        ) {
            return {
                originalCode: cleanCode,
                correctedCode: 'Z58.7',
                reason: 'Code ICD-10-CM remplacé par le code CIM-10 français du tabagisme passif.'
            };
        }

        if (
            cleanCode === 'R97.20' &&
            /\b(psa|antigene prostatique|prostate specific antigen|prostatique specifique|elevation du psa|elevation psa|ellevation du psa)\b/.test(reference)
        ) {
            return {
                originalCode: cleanCode,
                correctedCode: 'R97.2',
                reason: 'Code ICD-10-CM PSA remplacé par le code CIM-10 français le plus proche.'
            };
        }

        return null;
    }

    function getParentCim10Codes(code) {
        const cleanCode = normalizeCim10Code(code);
        const parents = [];

        if (!cleanCode || /ERREUR/i.test(cleanCode)) return parents;

        if (cleanCode.includes('.')) {
            const [root, extRaw] = cleanCode.split('.');
            let ext = String(extRaw || '');

            while (ext.length > 1) {
                ext = ext.slice(0, -1);
                if (ext) parents.push(`${root}.${ext}`);
            }

            if (root && root !== cleanCode) parents.push(root);
        } else if (cleanCode.length > 3) {
            for (let i = cleanCode.length - 1; i >= 3; i--) {
                parents.push(cleanCode.slice(0, i));
            }
        }

        const seen = new Set();
        return parents.filter(p => {
            const n = normalizeCim10Code(p);
            if (!n || n === cleanCode || seen.has(n)) return false;
            seen.add(n);
            return true;
        });
    }

    function getQualityCim10EquivalentCodes(code, contextText = '') {
        const cleanCode = normalizeCim10Code(code);
        const codes = [];
        const context = expandMedicalSynonyms(contextText);

        function add(candidate) {
            const normalized = normalizeCim10Code(candidate);
            if (normalized && !codes.includes(normalized)) codes.push(normalized);
        }

        add(cleanCode);
        getParentCim10Codes(cleanCode).forEach(add);

        const groups = [
            { codes: ['Z90.49', 'Z90.4'], terms: ['appendicectomie', 'appendice'] },
            { codes: ['Z90.47', 'Z90.4'], terms: ['cholecystectomie', 'vesicule biliaire'] },
            { codes: ['D27.9', 'D27'], terms: ['tumeur ovarienne', 'ovaire'] },
            { codes: ['G47.33', 'G47.3'], terms: ['sahos', 'saos', 'apnee sommeil'] },
            { codes: ['Z98.84', 'Z98.0', 'Z98.8'], terms: ['bypass gastrique', 'derivation intestinale', 'anastomose'] },
            { codes: ['K80.5', 'K80.8'], terms: ['microlithiases vesiculaires', 'cholelithiase'] },
            { codes: ['Z72.0', 'F17.1', 'F17.2'], terms: ['tabagisme', 'tabac'] },
            { codes: ['Z72.1', 'F10.1'], terms: ['alcool'] },
            { codes: ['H40.9', 'H40.1'], terms: ['glaucome'] },
            { codes: ['Z98.8', 'G56.2'], terms: ['decompression nerf ulnaire', 'nerf cubital'] },
            { codes: ['M19.9', 'M17.9'], terms: ['arthrose', 'gonarthrose'] },
            { codes: ['S12', 'S12.1'], terms: ['fracture c2', 'deuxieme vertebre cervicale'] },
            { codes: ['S52.9', 'S52.5'], terms: ['fracture du radius'] },
            { codes: ['N10', 'N12'], terms: ['pna', 'pyelonephrite'] }
        ];

        for (const group of groups) {
            if (!group.codes.includes(cleanCode)) continue;
            const hasContext = group.terms.some(term => context.includes(normalizeForMatch(term)));
            if (!hasContext) continue;
            group.codes.forEach(add);
        }

        return codes;
    }

    function isLikelyCim10Code(code) {
        return /^[A-Z][0-9][0-9A-Z](?:\.[0-9A-Z]+)?(?:-[A-Z][0-9][0-9A-Z](?:\.[0-9A-Z]+)?)?$/.test(normalizeCim10Code(code));
    }

    function extractCim10CodesFromText(text) {
        const raw = String(text || '');
        const codes = [];
        const regex = /\[([A-Z][A-Z0-9]{0,3}(?:\.[A-Z0-9]+)?(?:-[A-Z][A-Z0-9]{0,3}(?:\.[A-Z0-9]+)?)?)\]/gi;
        let m;

        while ((m = regex.exec(raw)) !== null) {
            const code = normalizeCim10Code(m[1]);
            if (isLikelyCim10Code(code) && !codes.includes(code)) codes.push(code);
        }

        return codes;
    }

    function removeCim10CodesFromText(text) {
        return normalizeSpaces(String(text || '').replace(/\[[A-Z][A-Z0-9]{0,3}(?:\.[A-Z0-9]+)?(?:-[A-Z][A-Z0-9]{0,3}(?:\.[A-Z0-9]+)?)?\]/gi, ''));
    }

    function expandMedicalSynonyms(text) {
        let t = normalizeForMatch(text);

        const expansions = [
            [/splenectomie|splenectomise|rate/g, ' splenectomie rate absence rate '],
            [/cholecystectomie|vesicule biliaire|vesicule/g, ' cholecystectomie vesicule biliaire absence vesicule '],
            [/appendicectomie|appendice/g, ' appendicectomie appendice absence appendice '],
            [/amygdalectomie|amygdale|amygdales/g, ' amygdalectomie amygdales absence amygdales '],
            [/thyroidectomie|thyroide/g, ' thyroidectomie thyroide absence thyroide '],
            [/nephrectomie|rein/g, ' nephrectomie rein absence rein '],
            [/hysterectomie|uterus/g, ' hysterectomie uterus absence uterus '],
            [/ovariectomie|ovaire|ovaires/g, ' ovariectomie ovaire absence ovaire '],
            [/prostatectomie|prostate/g, ' prostatectomie prostate absence prostate '],
            [/mastectomie|sein|mammaire/g, ' mastectomie sein mammaire absence sein '],
            [/colectomie|colon/g, ' colectomie colon absence colon '],
            [/gastrectomie|estomac/g, ' gastrectomie estomac absence estomac '],
            [/pneumonectomie|lobectomie|poumon/g, ' pneumonectomie lobectomie poumon absence poumon '],
            [/orchidectomie|testicule|testicules/g, ' orchidectomie testicule absence testicule ']
        ];

        expansions.push(
            [/hta|hypertension arterielle|hypertension essentielle|hypertension primitive/g, ' hta hypertension arterielle hypertension essentielle primitive '],
            [/sahos|saos|apnee du sommeil|apnees du sommeil|apnee obstructive|apnees obstructives/g, ' sahos saos apnees sommeil syndrome apnees obstructives sommeil '],
            [/coldependant|cold[ée]pendant|diabete insulino dependant|diabete insulinodependant|did/g, ' coldependant diabete insulino dependant diabete insulinodependant '],
            [/diabete sucre non insulinodependant|diabete non insulinodependant|dt2|diabete type 2|dnid/g, ' diabete sucre non insulinodependant diabete type 2 dt2 dnid '],
            [/tabagisme actif|tabagisme sevre|tabac actif|dependance au tabac|fumeur|fumeuse/g, ' tabagisme tabac dependance tabac fumeur '],
            [/usage nocif d alcool|usage d alcool|consommation d alcool|alcool a risque|consommation alcool a risque/g, ' alcool usage nocif consommation risque '],
            [/bypass gastrique|derivation intestinale|anastomose/g, ' bypass gastrique derivation intestinale anastomose '],
            [/microlithiase|microlithiases|cholelithiase|cholelithiases/g, ' microlithiases vesiculaires cholelithiase '],
            [/\bpna\b|pyelonephrite|py[ée]lon[ée]phrite/g, ' pna pyelonephrite '],
            [/nodule pulmonaire|nodules pulmonaires/g, ' nodule nodules pulmonaires '],
            [/tumeur ovarienne|tumeur benigne de l ovaire|tumeur benigne ovaire/g, ' tumeur ovarienne benigne ovaire '],
            [/aponevrectomie|apon[ée]vrectomie|fibromatose de l aponevrose palmaire|dupuytren/g, ' aponevrectomie fibromatose aponevrose palmaire dupuytren '],
            [/fracture bi isthmo articulaire de c2|fracture biisthmo articulaire de c2|fracture de c2|deuxieme vertebre cervicale/g, ' fracture bi isthmo articulaire c2 deuxieme vertebre cervicale '],
            [/decompression du nerf ulnaire|decompression nerf ulnaire|nerf cubital/g, ' decompression nerf ulnaire cubital '],
            [/glaucome a angle ouvert|glaucome primitif|glaucome/g, ' glaucome angle ouvert ']
        );

        expansions.push(
            [/\bpsa\b|antigene prostatique specifique|antigene specifique de la prostate|prostate specific antigen|el+l?[ée]vation du psa|el+l?[ée]vation psa|augmentation du psa/g, ' psa antigene prostatique specifique prostate elevation augmentation ']
        );

        for (const [regex, add] of expansions) {
            if (regex.test(t)) t += add;
        }

        return normalizeForMatch(t);
    }

    function tokenizeForSimilarity(text) {
        const stop = new Set([
            'le', 'la', 'les', 'de', 'des', 'du', 'd', 'un', 'une', 'a', 'au', 'aux',
            'en', 'et', 'ou', 'avec', 'sans', 'par', 'pour', 'sur', 'dans', 'chez',
            'antecedent', 'antecedents', 'medical', 'medicaux', 'chirurgical',
            'chirurgicaux', 'familial', 'familiaux', 'autre', 'autres', 'precise',
            'precisee', 'precises', 'non', 'classe', 'classes', 'ailleurs',
            'absence', 'acquise', 'organe', 'organes'
        ]);

        return expandMedicalSynonyms(text)
            .split(/\s+/)
            .map(t => t.trim())
            .filter(t => t.length >= 3 && !stop.has(t));
    }

    function scoreTextSimilarity(referenceText, candidateText) {
        const refTokens = tokenizeForSimilarity(referenceText);
        const candTokens = tokenizeForSimilarity(candidateText);

        const refSet = new Set(refTokens);
        const candSet = new Set(candTokens);

        if (!refSet.size || !candSet.size) {
            const a = normalizeForMatch(referenceText);
            const b = normalizeForMatch(candidateText);
            if (a && b && (a.includes(b) || b.includes(a))) return 60;
            return 0;
        }

        let intersection = 0;
        for (const token of refSet) {
            if (candSet.has(token)) intersection++;
        }

        const union = new Set([...refSet, ...candSet]).size || 1;
        const jaccard = intersection / union;
        const recall = intersection / refSet.size;

        let score = Math.round(jaccard * 70 + recall * 50);

        const a = normalizeForMatch(referenceText);
        const b = normalizeForMatch(candidateText);

        if (a && b && b.includes(a)) score += 35;
        if (a && b && a.includes(b)) score += 20;

        for (const token of refSet) {
            if (token.length >= 5 && b.includes(token)) score += 4;
        }

        return score;
    }

    function collectCim10TreeCandidates(parentCode = '') {
        const tree = document.querySelector(SELECTOR_WEDA_CIM10_TREE);
        if (!tree) return [];

        const wantedParent = normalizeCim10Code(parentCode);
        const anchors = Array.from(tree.querySelectorAll('a'));
        const candidates = [];

        for (const anchor of anchors) {
            const text = normalizeSpaces(anchor.innerText || anchor.textContent || '');
            if (!text) continue;

            const codes = extractCim10CodesFromText(text);
            if (!codes.length) continue;

            const hand = anchor.querySelector('img[title*="Drag"], img[alt="hand"], img[src*="hand"]') || anchor;
            if (!hand) continue;

            for (const code of codes) {
                if (wantedParent) {
                    if (code !== wantedParent && !code.startsWith(wantedParent) && !cim10CodeMatchesParentLoose(code, wantedParent)) continue;
                }

                const label = removeCim10CodesFromText(text);

                candidates.push({
                    anchor,
                    hand,
                    code,
                    label,
                    text
                });
            }
        }

        return candidates;
    }

    function findExactCim10Result(code) {
        const normalizedCode = normalizeCim10Code(code);
        const candidates = collectCim10TreeCandidates('');

        const exact = candidates.find(c => c.code === normalizedCode || cim10CodeEqualsLoose(c.code, normalizedCode));
        if (!exact) return null;

        return {
            anchor: exact.anchor,
            hand: exact.hand,
            matchedCode: exact.code,
            matchedLabel: exact.label,
            searchCode: normalizedCode,
            usedFallback: false,
            similarityScore: 999
        };
    }

    function findBestCim10ResultBySimilarity(parentCode, referenceName) {
        const cleanParent = normalizeCim10Code(parentCode);
        const candidates = collectCim10TreeCandidates(cleanParent);

        if (!candidates.length) return null;

        const scored = candidates.map(c => {
            const score = scoreTextSimilarity(referenceName, c.label);
            const exactParentBonus = c.code === cleanParent ? 4 : 0;
            return {
                ...c,
                similarityScore: score + exactParentBonus
            };
        });

        scored.sort((a, b) => {
            if (b.similarityScore !== a.similarityScore) return b.similarityScore - a.similarityScore;
            if (a.code.length !== b.code.length) return a.code.length - b.code.length;
            return a.label.length - b.label.length;
        });

        const best = scored[0];

        return {
            anchor: best.anchor,
            hand: best.hand,
            matchedCode: best.code,
            matchedLabel: best.label,
            searchCode: cleanParent,
            usedFallback: true,
            similarityScore: best.similarityScore,
            candidates: scored.slice(0, 8).map(c => ({
                code: c.code,
                label: c.label,
                similarityScore: c.similarityScore
            }))
        };
    }

    async function performWedaCim10SearchQuery(query) {
        const safeQuery = sanitizeCim10SearchQuery(query);

        if (!safeQuery) {
            throw new Error('Requête CIM10 vide après nettoyage.');
        }

        const input = await waitFor(() => document.querySelector(SELECTOR_WEDA_CIM10_SEARCH), 12000, 300);
        if (!input) throw new Error('Champ de recherche CIM10 WEDA introuvable.');

        showBadge(`Recherche CIM-10 : ${safeQuery}`, { duration: 4000 });
        log('Recherche CIM-10 sans crochets', { originalQuery: query, safeQuery });

        input.focus();
        setNativeValue(input, safeQuery);

        input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13, which: 13 }));
        input.dispatchEvent(new KeyboardEvent('keypress', { bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13, which: 13 }));
        input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13, which: 13 }));

        await sleep(150);
        callPostBack(POSTBACK_SEARCH_CIM10_WEDA, '');
        await waitForWedaIdle();
    }

    async function searchExactCim10CodeInWeda(code) {
        for (const query of getCim10SearchQueriesForCode(code)) {
            await performWedaCim10SearchQuery(query);

            const foundExact = await waitFor(() => findExactCim10Result(code), 10000, 400);
            if (foundExact) {
                return {
                    ...foundExact,
                    searchCode: query
                };
            }
        }

        return null;
    }

    async function searchBestCim10ParentInWeda(parentCode, referenceName) {
        for (const query of getCim10SearchQueriesForCode(parentCode)) {
            await performWedaCim10SearchQuery(query);

            const best = await waitFor(() => findBestCim10ResultBySimilarity(parentCode, referenceName || parentCode), 10000, 400);
            if (best) {
                return {
                    ...best,
                    searchCode: query
                };
            }
        }

        return null;
    }

    async function searchCim10InWeda(code, referenceName = '') {
        await waitForWedaIdle();

        const originalCode = normalizeCim10Code(code);
        const codeCorrection = getWedaCim10CodeCorrection(originalCode, referenceName);
        const cleanCode = codeCorrection ? codeCorrection.correctedCode : originalCode;
        const parentCodes = getParentCim10Codes(cleanCode);

        if (codeCorrection) {
            logImportEvent('warning', 'cim10_code_correction', `${originalCode} remplacé par ${cleanCode} pour recherche WEDA.`, {
                originalCode,
                correctedCode: cleanCode,
                referenceName,
                reason: codeCorrection.reason
            });
            showBadge(
                `Correction CIM-10 WEDA\n${originalCode} → ${cleanCode}\n${referenceName || codeCorrection.reason}`,
                { duration: 8000 }
            );
        }

        const foundExact = await searchExactCim10CodeInWeda(cleanCode);
        if (foundExact) {
            return {
                ...foundExact,
                originalCode,
                correctedFromCode: codeCorrection ? originalCode : '',
                usedCodeCorrection: !!codeCorrection,
                correctionReason: codeCorrection ? codeCorrection.reason : ''
            };
        }

        if (/^[A-Z][0-9][0-9A-Z]$/.test(cleanCode)) {
            const bestCategoryChild = await searchBestCim10ParentInWeda(cleanCode, referenceName || cleanCode);
            if (bestCategoryChild) {
                logImportEvent('warning', 'cim10_category_fallback', `${cleanCode} introuvable directement : sélection du sous-code ${bestCategoryChild.matchedCode}.`, {
                    originalCode,
                    cleanCode,
                    referenceName,
                    selectedCode: bestCategoryChild.matchedCode,
                    selectedLabel: bestCategoryChild.matchedLabel,
                    similarityScore: bestCategoryChild.similarityScore,
                    candidates: bestCategoryChild.candidates
                });

                showBadge(
                    `Fallback CIM-10 catégorie utilisé.\n` +
                    `Heidi : ${cleanCode} ${referenceName || ''}\n` +
                    `CIM-10 : ${bestCategoryChild.matchedCode} ${bestCategoryChild.matchedLabel}\n` +
                    `Score similarité : ${bestCategoryChild.similarityScore}`,
                    { duration: 10000 }
                );

                return {
                    ...bestCategoryChild,
                    originalCode,
                    correctedFromCode: codeCorrection ? originalCode : '',
                    usedCodeCorrection: !!codeCorrection,
                    correctionReason: codeCorrection ? codeCorrection.reason : ''
                };
            }
        }

        if (parentCodes.length) {
            showBadge(
                `CIM10 exacte introuvable : ${cleanCode}\n` +
                `Essai avec code(s) parent(s) : ${parentCodes.join(' puis ')}`,
                { duration: 8000 }
            );
        }

        for (const parentCode of parentCodes) {
            const best = await searchBestCim10ParentInWeda(parentCode, referenceName || cleanCode);
            if (best) {
                showBadge(
                    `Fallback CIM-10 utilisé.\n` +
                    `Heidi : ${cleanCode} ${referenceName || ''}\n` +
                    `CIM-10 : ${best.matchedCode} ${best.matchedLabel}\n` +
                    `Score similarité : ${best.similarityScore}`,
                    { duration: 10000 }
                );

                return {
                    ...best,
                    originalCode,
                    correctedFromCode: codeCorrection ? originalCode : '',
                    usedCodeCorrection: !!codeCorrection,
                    correctionReason: codeCorrection ? codeCorrection.reason : ''
                };
            }
        }

        throw new Error(
            'CIM-10 introuvable : ' + originalCode +
            (codeCorrection ? ' corrigé en ' + cleanCode : '') +
            (parentCodes.length ? ' ; parents testés : ' + parentCodes.join(', ') : '')
        );
    }

    function parseSetParamIdFromHand(hand) {
        const onclick = String(hand && hand.getAttribute ? hand.getAttribute('onclick') || '' : '');
        const m = onclick.match(/SetParamID\s*\(\s*this\s*,\s*event\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'((?:\\'|[^'])*)'/i);

        if (!m) return null;

        return {
            kind: Number(m[1]),
            id: Number(m[2]),
            label: String(m[3] || '').replace(/\\'/g, "'")
        };
    }

    function armWedaCim10Hand(hand) {
        if (!hand) return false;

        const win = ownerWin(hand);
        const params = parseSetParamIdFromHand(hand);

        try { hand.scrollIntoView({ block: 'center', inline: 'center' }); } catch (_) {}

        dispatchMouse(hand, 'mouseover');
        dispatchMouse(hand, 'mousemove');
        dispatchMouse(hand, 'mousedown');
        dispatchMouse(hand, 'mouseup');
        dispatchMouse(hand, 'click');

        try {
            if (typeof hand.onclick === 'function') {
                hand.onclick.call(hand, dispatchMouse(hand, 'click'));
            }
        } catch (_) {}

        try {
            if (params && typeof win.SetParamID === 'function') {
                const ev = dispatchMouse(hand, 'click') || {};
                win.SetParamID(hand, ev, params.kind, params.id, params.label);
            }
        } catch (e) {
            warn('Appel direct SetParamID impossible', e);
        }

        return true;
    }

    async function waitForWedaAntecedentPopup(shortTimeout = 2500) {
        return await waitFor(() => {
            const textarea = findElementDeep(SELECTOR_WEDA_COMMENT);
            return textarea && isVisible(textarea) ? textarea : null;
        }, shortTimeout, 200);
    }

    async function waitForWedaAntecedentPopupClosed(timeoutMs = 8000) {
        const closed = await waitFor(() => {
            const textarea = findElementDeep(SELECTOR_WEDA_COMMENT);
            if (!textarea) return true;
            if (!isVisible(textarea)) return true;
            return false;
        }, timeoutMs, 250);

        return !!closed;
    }

    async function dropWedaCim10OnCategory(hand, section) {
        const targets = getWedaDropTargetsForSection(section);

        if (!targets.length) {
            throw new Error('Aucune cible exacte de rubrique WEDA trouvée pour : ' + sectionLabel(section));
        }

        const targetNames = targets.map(t =>
            normalizeSpaces(`${t.tagName}.${String(t.className || '')} main="${getHeaderMainLabel(t)}" own="${getOwnText(t)}" title="${t.getAttribute('title') || ''}" text="${t.innerText || t.textContent || ''}"`).slice(0, 220)
        );

        log('Cibles de dépôt WEDA', section, targetNames);

        for (const target of targets) {
            try { target.scrollIntoView({ block: 'center', inline: 'center' }); } catch (_) {}

            await sleep(250);

            armWedaCim10Hand(hand);
            await sleep(250);

            dispatchMouse(target, 'mouseover');
            dispatchMouse(target, 'mousemove');
            dispatchDrag(hand, 'dragstart');
            dispatchDrag(target, 'dragenter');
            dispatchDrag(target, 'dragover');
            dispatchDrag(target, 'drop');
            dispatchMouse(target, 'mouseup');
            dispatchMouse(target, 'click');

            try { target.click(); } catch (_) {}

            const popup = await waitForWedaAntecedentPopup(3500);
            if (popup) return true;

            await sleep(300);

            armWedaCim10Hand(hand);
            await sleep(250);
            clickElement(target);

            const popupAfterClick = await waitForWedaAntecedentPopup(3500);
            if (popupAfterClick) return true;
        }

        throw new Error(
            'La fenêtre de détail antécédent WEDA ne s’est pas ouverte après dépôt dans ' +
            sectionLabel(section) +
            '. Cibles exactes testées : ' +
            targetNames.join(' | ')
        );
    }

    async function dropWedaCim10ForItem(hand, item) {
        const sectionsToTry = item && item.section === 'familial'
            ? ['familial', 'medical']
            : [item.section];

        let lastError = null;

        for (const section of sectionsToTry) {
            try {
                await dropWedaCim10OnCategory(hand, section);
                return section;
            } catch (e) {
                lastError = e;

                logImportEvent('warning', 'drop_weda_retry', `Dépôt WEDA impossible dans ${sectionLabel(section)}.`, {
                    item,
                    attemptedSection: section,
                    message: String(e && e.message ? e.message : e)
                });

                await waitForWedaIdle(5000);
            }
        }

        throw lastError || new Error('Dépôt WEDA impossible.');
    }

    function setSelectValue(select, value) {
        if (!select || value === undefined || value === null || value === '') return false;

        const strValue = String(value);
        const option = Array.from(select.options || []).find(opt => String(opt.value) === strValue);

        if (!option) return false;

        try { option.selected = true; } catch (_) {}
        select.value = strValue;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));

        return String(select.value) === strValue;
    }

    function getSelectOptionLabel(option) {
        if (!option) return '';
        return normalizeSpaces(option.text || option.label || option.textContent || option.innerText || '');
    }

    function getSelectOptionsSnapshot(select) {
        return Array.from(select && select.options ? select.options : []).map(option => ({
            value: String(option.value || ''),
            text: getSelectOptionLabel(option),
            normalized: normalizeForMatch(getSelectOptionLabel(option))
        }));
    }

    function getSelectOptionSummary(option) {
        if (!option) return null;
        return {
            value: String(option.value || ''),
            text: getSelectOptionLabel(option)
        };
    }

    function findOtherFamilyOption(select) {
        const options = Array.from(select && select.options ? select.options : []);
        return options.find(option => String(option.value || '') === '99')
            || options.find(option => /\bautres?\b/.test(normalizeForMatch(getSelectOptionLabel(option))));
    }

    function clearFamilyMemberOtherFallback(item) {
        if (!item || typeof item !== 'object') return;
        try { delete item.wedaFamilyMemberOtherFallback; } catch (_) {
            item.wedaFamilyMemberOtherFallback = null;
        }
    }

    function markFamilyMemberOtherFallback(item, member, reason, selectedOption) {
        if (!item || typeof item !== 'object') return;
        item.wedaFamilyMemberOtherFallback = {
            familyMember: normalizeSpaces(member || ''),
            reason: reason || 'other_family_member_fallback',
            selectedOption: getSelectOptionSummary(selectedOption)
        };
    }

    function getFamilyMemberBranch(member) {
        const n = normalizeForMatch(member);
        if (!n) return '';
        if (/\b(paternel|paternelle|paternels|paternelles|cote paternel|cote paternelle|p|pat)\b/.test(n)) return 'paternel';
        if (/\b(maternel|maternelle|maternels|maternelles|cote maternel|cote maternelle|m|mat)\b/.test(n)) return 'maternel';
        return '';
    }

    function getFamilyMemberKind(member) {
        const n = normalizeForMatch(member);
        if (!n) return '';

        if (/\bbeau pere\b/.test(n)) return 'beau_pere';
        if (/\bbelle mere\b/.test(n)) return 'belle_mere';
        if (/\bbeau fils\b/.test(n)) return 'beau_fils';
        if (/\bbelle fille\b/.test(n)) return 'belle_fille';
        if (/\bdemi frere\b/.test(n)) return 'demi_frere';
        if (/\bdemi soeur\b/.test(n)) return 'demi_soeur';
        if (/\bgrand pere\b/.test(n)) return 'grand_pere';
        if (/\bgrand mere\b/.test(n)) return 'grand_mere';
        if (/\bpetit fils\b/.test(n)) return 'petit_fils';
        if (/\bpetite fille\b/.test(n)) return 'petite_fille';
        if (/\boncle\b/.test(n)) return 'oncle';
        if (/\btante\b/.test(n)) return 'tante';
        if (/\bneveu\b/.test(n)) return 'neveu';
        if (/\bniece\b/.test(n)) return 'niece';
        if (/\bcousin\b/.test(n)) return 'cousin';
        if (/\bcousine\b/.test(n)) return 'cousine';
        if (/\bpere\b|\bpapa\b/.test(n)) return 'pere';
        if (/\bmere\b|\bmaman\b/.test(n)) return 'mere';
        if (/\bfrere\b/.test(n)) return 'frere';
        if (/\bsoeur\b/.test(n)) return 'soeur';
        if (/\bfils\b/.test(n)) return 'fils';
        if (/\bfille\b/.test(n)) return 'fille';

        return '';
    }

    function familyMemberKindRegex(kind) {
        const map = {
            beau_pere: /\bbeau\s+pere\b/,
            belle_mere: /\bbelle\s+mere\b/,
            beau_fils: /\bbeau\s+fils\b/,
            belle_fille: /\bbelle\s+fille\b/,
            demi_frere: /\bdemi\s+frere\b/,
            demi_soeur: /\bdemi\s+soeur\b/,
            grand_pere: /\bgrand\s+pere\b/,
            grand_mere: /\bgrand\s+mere\b/,
            petit_fils: /\bpetit\s+fils\b/,
            petite_fille: /\bpetite\s+fille\b/,
            oncle: /\boncles?\b/,
            tante: /\btantes?\b/,
            neveu: /\bneveux?\b/,
            niece: /\bnieces?\b/,
            cousin: /\bcousins?\b/,
            cousine: /\bcousines?\b/,
            pere: /\bpere\b/,
            mere: /\bmere\b/,
            frere: /\bfreres?\b/,
            soeur: /\bsoeurs?\b/,
            fils: /\bfils\b/,
            fille: /\bfilles?\b/
        };
        return map[kind] || null;
    }

    function familyOptionHasBranch(optionNorm, branch) {
        if (!branch) return false;
        if (branch === 'paternel') return /\b(paternel|paternelle|paternels|paternelles|cote paternel|cote paternelle|p|pat)\b/.test(optionNorm);
        if (branch === 'maternel') return /\b(maternel|maternelle|maternels|maternelles|cote maternel|cote maternelle|m|mat)\b/.test(optionNorm);
        return false;
    }

    function optionMatchesFamilyMemberKind(optionNorm, kind) {
        const regex = familyMemberKindRegex(kind);
        return !!(regex && regex.test(optionNorm));
    }

    function familyMemberMustNotFallbackToOther(member) {
        return [
            'grand_pere',
            'grand_mere',
            'petit_fils',
            'petite_fille',
            'oncle',
            'tante',
            'neveu',
            'niece',
            'cousin',
            'cousine',
            'beau_pere',
            'belle_mere',
            'beau_fils',
            'belle_fille',
            'demi_frere',
            'demi_soeur'
        ].includes(getFamilyMemberKind(member));
    }

    function familyMemberKindDefaultsToPaternal(kind) {
        return [
            'grand_pere',
            'grand_mere',
            'petit_fils',
            'petite_fille',
            'oncle',
            'tante',
            'neveu',
            'niece',
            'cousin',
            'cousine'
        ].includes(kind);
    }

    function getEffectiveFamilyMemberBranch(member) {
        const explicitBranch = getFamilyMemberBranch(member);
        if (explicitBranch) return explicitBranch;

        const kind = getFamilyMemberKind(member);
        return familyMemberKindDefaultsToPaternal(kind) ? 'paternel' : '';
    }

    function findPaternalFamilyOptionCandidate(candidates) {
        return (Array.isArray(candidates) ? candidates : [])
            .filter(candidate => familyOptionHasBranch(candidate && candidate.normalized || '', 'paternel'))
            .sort((a, b) => {
                const leftText = normalizeForMatch(a && a.label || '');
                const rightText = normalizeForMatch(b && b.label || '');
                const leftMaternal = familyOptionHasBranch(leftText, 'maternel') ? 1 : 0;
                const rightMaternal = familyOptionHasBranch(rightText, 'maternel') ? 1 : 0;
                if (leftMaternal !== rightMaternal) return leftMaternal - rightMaternal;
                return String(a && a.label || '').localeCompare(String(b && b.label || ''));
            })[0] || null;
    }

    function familyMemberOptionMatches(optionText, member) {
        const optionNorm = normalizeForMatch(optionText);
        const memberNorm = normalizeForMatch(member);

        if (!optionNorm || !memberNorm) return false;
        if (optionNorm === memberNorm) return true;

        const memberKind = getFamilyMemberKind(member);
        const memberBranch = getEffectiveFamilyMemberBranch(member);
        if (memberKind && optionMatchesFamilyMemberKind(optionNorm, memberKind)) {
            if (memberBranch) return familyOptionHasBranch(optionNorm, memberBranch);
            return !familyOptionHasBranch(optionNorm, 'paternel')
                && !familyOptionHasBranch(optionNorm, 'maternel');
        }

        if (memberNorm === 'grand pere') {
            return /^grand pere\b/.test(optionNorm)
                && !/\b(paternel|paternelle|maternel|maternelle)\b/.test(optionNorm);
        }

        if (memberNorm === 'grand mere') {
            return /^grand mere\b/.test(optionNorm)
                && !/\b(paternel|paternelle|maternel|maternelle)\b/.test(optionNorm);
        }

        if (memberNorm === 'petit fils') {
            return /^petit fils\b/.test(optionNorm)
                && !/\b(paternel|paternelle|maternel|maternelle)\b/.test(optionNorm);
        }

        if (memberNorm === 'petite fille') {
            return /^petite fille\b/.test(optionNorm)
                && !/\b(paternel|paternelle|maternel|maternelle)\b/.test(optionNorm);
        }

        return false;
    }

    function getFamilyMemberOptionCandidates(select, member) {
        if (!select || !member) return null;

        const memberNorm = normalizeForMatch(member);
        const memberKind = getFamilyMemberKind(member);
        const memberBranch = getEffectiveFamilyMemberBranch(member);
        const candidates = [];

        for (const option of Array.from(select.options || [])) {
            const label = getSelectOptionLabel(option);
            const optionNorm = normalizeForMatch(label);
            if (!optionNorm) continue;

            let score = 0;
            let reason = '';

            if (optionNorm === memberNorm) {
                score = 1000;
                reason = 'exact';
            } else if (familyMemberOptionMatches(label, member)) {
                score = 900;
                reason = 'strict_label';
            } else if (memberKind && optionMatchesFamilyMemberKind(optionNorm, memberKind)) {
                const hasPaternal = familyOptionHasBranch(optionNorm, 'paternel');
                const hasMaternal = familyOptionHasBranch(optionNorm, 'maternel');

                if (memberBranch) {
                    if (!familyOptionHasBranch(optionNorm, memberBranch)) continue;
                    score = 820;
                    reason = 'branch_label';
                } else if (!hasPaternal && !hasMaternal) {
                    score = 800;
                    reason = 'generic_label';
                } else {
                    score = 300;
                    reason = 'ambiguous_branch_label';
                }
            }

            if (!score) continue;
            candidates.push({ option, label, normalized: optionNorm, score, reason });
        }

        return candidates.sort((a, b) => b.score - a.score);
    }

    function findSelectOptionByFamilyMember(select, member) {
        const candidates = getFamilyMemberOptionCandidates(select, member) || [];
        if (!candidates.length) return null;

        const defaultPaternalCandidate = !getFamilyMemberBranch(member)
            && getEffectiveFamilyMemberBranch(member) === 'paternel'
            ? findPaternalFamilyOptionCandidate(candidates)
            : null;
        if (defaultPaternalCandidate) return defaultPaternalCandidate.option;

        const topScore = candidates[0].score;
        const top = candidates.filter(candidate => candidate.score === topScore);
        if (top.length === 1) return top[0].option;

        return null;
    }

    function setSelectOption(select, option) {
        if (!select || !option) return false;

        try { option.selected = true; } catch (_) {}
        select.value = String(option.value);
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));

        return String(select.value) === String(option.value);
    }

    function setSelectValueByFamilyMemberText(select, member) {
        const option = findSelectOptionByFamilyMember(select, member);
        if (!option) return false;

        return setSelectOption(select, option);
    }

    function setWedaLateralite(value, doc) {
        const select = (doc || document).querySelector(SELECTOR_WEDA_LATERALITE) || findElementDeep(SELECTOR_WEDA_LATERALITE);
        if (!select) return false;

        let targetValue = '0';
        if (value === 'droite') targetValue = '1';
        if (value === 'gauche') targetValue = '2';
        if (value === 'bilateral') targetValue = '3';

        return setSelectValue(select, targetValue);
    }

    function findWedaDatePonctuelleInput(doc) {
        const rootDoc = doc || document;
        let input = null;
        try { input = rootDoc.querySelector(SELECTOR_WEDA_DATE_PONCTUELLE); } catch (_) {}
        if (!input) input = findElementDeep(SELECTOR_WEDA_DATE_PONCTUELLE, rootDoc);
        if (input) return input;

        const candidates = queryElementsDeep('input', rootDoc)
            .filter(candidate => {
                if (!candidate) return false;
                const type = String(candidate.getAttribute('type') || '').toLowerCase();
                if (['hidden', 'button', 'submit', 'image', 'reset', 'checkbox', 'radio'].includes(type)) return false;
                const identity = normalizeForMatch([
                    candidate.id || '',
                    candidate.name || '',
                    candidate.getAttribute && candidate.getAttribute('aria-label') || '',
                    candidate.getAttribute && candidate.getAttribute('title') || ''
                ].join(' '));
                return /\bdate\b/.test(identity)
                    && (/\bantecedent\b/.test(identity) || /\bponctuel/.test(identity) || /\bponctuelle/.test(identity));
            });

        return candidates.find(candidate => isVisible(candidate)) || candidates[0] || null;
    }

    function getWedaDatePonctuelleState(doc) {
        const input = findWedaDatePonctuelleInput(doc);
        if (!input) return { found: false };

        return {
            found: true,
            visible: isVisible(input),
            id: input.id || '',
            name: input.name || '',
            value: input.value || '',
            normalizedValue: normalizeWedaDateValue(input.value || '')
        };
    }

    function setWedaDatePonctuelle(value, doc) {
        const dateValue = normalizeWedaDateValue(value);
        if (!dateValue) return false;

        const input = findWedaDatePonctuelleInput(doc);
        if (!input) return false;

        try { input.focus(); } catch (_) {}
        setNativeValue(input, dateValue);
        try { input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true })); } catch (_) {}
        try { input.blur(); } catch (_) {}

        return normalizeWedaDateValue(input.value || '') === dateValue
            || normalizeSpaces(input.value || '') === dateValue;
    }

    function mapFamilyMemberToCollateralValue(member) {
        const n = normalizeForMatch(member);
        if (!n) return '99';

        const effectiveBranch = getEffectiveFamilyMemberBranch(member);
        const branchePaternelle = effectiveBranch === 'paternel';
        const brancheMaternelle = effectiveBranch === 'maternel';

        if (/\bbeau pere\b/.test(n)) return '26';
        if (/\bbelle mere\b/.test(n)) return '27';
        if (/\bbeau fils\b/.test(n)) return '28';
        if (/\bbelle fille\b/.test(n)) return '29';

        if (/\bdemi frere\b/.test(n)) return '16';
        if (/\bdemi soeur\b/.test(n)) return '17';

        if (/\bgrand pere\b/.test(n)) {
            if (branchePaternelle) return '5';
            if (brancheMaternelle) return '7';
            return '';
        }

        if (/\bgrand mere\b/.test(n)) {
            if (branchePaternelle) return '6';
            if (brancheMaternelle) return '8';
            return '';
        }

        if (/\boncle\b/.test(n) && branchePaternelle) return '9';
        if (/\btante\b/.test(n) && branchePaternelle) return '10';
        if (/\boncle\b/.test(n) && brancheMaternelle) return '11';
        if (/\btante\b/.test(n) && brancheMaternelle) return '12';

        if (/\bneveu\b/.test(n) && branchePaternelle) return '22';
        if (/\bniece\b/.test(n) && branchePaternelle) return '23';
        if (/\bneveu\b/.test(n) && brancheMaternelle) return '24';
        if (/\bniece\b/.test(n) && brancheMaternelle) return '25';

        if (/\bpetit fils\b/.test(n)) {
            if (branchePaternelle) return '18';
            if (brancheMaternelle) return '20';
            return '';
        }

        if (/\bpetite fille\b/.test(n)) {
            if (branchePaternelle) return '19';
            if (brancheMaternelle) return '21';
            return '';
        }

        if (/\bpere\b|\bpapa\b/.test(n)) return '1';
        if (/\bmere\b|\bmaman\b/.test(n)) return '2';
        if (/\bfrere\b/.test(n)) return '3';
        if (/\bsoeur\b/.test(n)) return '4';

        if (/\bfils\b/.test(n)) return '14';
        if (/\bfille\b/.test(n)) return '15';

        if (/\bcousin\b|\bcousine\b/.test(n)) return '30';

        if (/\bcollateral\b|\bcollaterale\b|\bcollateraux\b/.test(n)) return '13';

        if (/\boncle\b|\btante\b|\bneveu\b|\bniece\b/.test(n)) {
            return '';
        }

        if (/\bautre\b/.test(n)) return '99';

        return '99';
    }

    async function setWedaCollateral(member, doc, item = null) {
        const select = doc && String(doc.tagName || '').toLowerCase() === 'select'
            ? doc
            : findWedaCollateralSelect(doc);
        if (!select) return false;

        clearFamilyMemberOtherFallback(item);
        const branchDefaultedToPaternal = !getFamilyMemberBranch(member)
            && getEffectiveFamilyMemberBranch(member) === 'paternel';

        const option = await waitFor(() => findSelectOptionByFamilyMember(select, member), 4500, 200);
        if (option) {
            const ok = setSelectOption(select, option);
            if (ok) {
                const selectedNorm = normalizeForMatch(getSelectOptionLabel(option));
                const selectedByPaternalDefault = branchDefaultedToPaternal
                    && familyOptionHasBranch(selectedNorm, 'paternel');
                logImportEvent('info', 'familial_fields', selectedByPaternalDefault
                    ? 'Lien familial WEDA sélectionné côté paternel par défaut.'
                    : 'Lien familial WEDA sélectionné par libellé exact.', {
                    familyMember: member,
                    defaultBranch: selectedByPaternalDefault ? 'paternel' : '',
                    selectedOption: getSelectOptionSummary(option)
                });
            }
            return ok;
        }

        const memberCandidates = getFamilyMemberOptionCandidates(select, member) || [];
        const bestCandidateScore = memberCandidates.length ? memberCandidates[0].score : 0;
        const bestCandidates = memberCandidates.filter(candidate => candidate.score === bestCandidateScore);
        const defaultPaternalCandidate = branchDefaultedToPaternal
            ? (findPaternalFamilyOptionCandidate(bestCandidates) || findPaternalFamilyOptionCandidate(memberCandidates))
            : null;
        if (defaultPaternalCandidate) {
            const ok = setSelectOption(select, defaultPaternalCandidate.option);
            if (ok) {
                logImportEvent('info', 'familial_fields', 'Lien familial WEDA sélectionné côté paternel par défaut.', {
                    familyMember: member,
                    defaultBranch: 'paternel',
                    selectedOption: getSelectOptionSummary(defaultPaternalCandidate.option),
                    candidates: memberCandidates.map(candidate => ({
                        value: String(candidate.option && candidate.option.value || ''),
                        text: candidate.label,
                        score: candidate.score,
                        reason: candidate.reason
                    })),
                    availableOptions: getSelectOptionsSnapshot(select)
                });
                return true;
            }
        }

        const ambiguousBranchOnly = bestCandidates.length > 1
            && bestCandidateScore > 0
            && !getFamilyMemberBranch(member)
            && bestCandidates.every(candidate => candidate.reason === 'ambiguous_branch_label');
        if (bestCandidates.length > 1 && bestCandidateScore > 0) {
            logImportEvent('warning', 'familial_fields', ambiguousBranchOnly
                ? 'Lien familial WEDA imprécis : côté paternel par défaut introuvable.'
                : 'Lien familial WEDA ambigu : aucun choix automatique pour éviter un mauvais doublon.', {
                familyMember: member,
                candidates: bestCandidates.map(candidate => ({
                    value: String(candidate.option && candidate.option.value || ''),
                    text: candidate.label,
                    score: candidate.score,
                    reason: candidate.reason
                })),
                availableOptions: getSelectOptionsSnapshot(select)
            });
            if (!ambiguousBranchOnly) return false;
        }

        let value = mapFamilyMemberToCollateralValue(member);
        let fallbackReason = branchDefaultedToPaternal ? 'paternal_default_internal_value' : '';
        if (!value && ambiguousBranchOnly) {
            value = '99';
            fallbackReason = 'paternal_default_unavailable';
        } else if (!value && familyMemberMustNotFallbackToOther(member)) {
            value = '99';
            fallbackReason = fallbackReason || 'specific_member_without_exact_option';
        }

        const otherOption = value === '99' ? findOtherFamilyOption(select) : null;
        if (!value || (value === '99' && familyMemberMustNotFallbackToOther(member) && !otherOption)) {
            logImportEvent('warning', 'familial_fields', 'Fallback vers Autre impossible pour un membre familial précis.', {
                familyMember: member,
                fallbackValue: value || '',
                familyMemberKind: getFamilyMemberKind(member),
                familyMemberBranch: getFamilyMemberBranch(member),
                availableOptions: getSelectOptionsSnapshot(select)
            });
            return false;
        }

        const okFallback = otherOption
            ? setSelectOption(select, otherOption)
            : setSelectValue(select, value);

        if (okFallback && value === '99' && member && !/\bautres?\b/.test(normalizeForMatch(member))) {
            markFamilyMemberOtherFallback(
                item,
                member,
                fallbackReason || (familyMemberMustNotFallbackToOther(member) ? 'specific_member_to_other' : 'other_member_to_other'),
                otherOption
            );
        }

        logImportEvent(value === '99' ? 'warning' : 'info', 'familial_fields', 'Fallback lien familial WEDA par valeur interne.', {
            familyMember: member,
            fallbackValue: value,
            okFallback,
            fallbackReason,
            selectedOption: otherOption ? getSelectOptionSummary(otherOption) : null,
            availableOptions: getSelectOptionsSnapshot(select)
        });

        return okFallback;
    }

    function setWedaCheckbox(selector, checked, doc) {
        const box = (doc || document).querySelector(selector) || findElementDeep(selector);
        if (!box) return false;

        if (!!box.checked !== !!checked) {
            try { clickElement(box); } catch (_) {}
            box.checked = !!checked;
            box.dispatchEvent(new Event('input', { bubbles: true }));
            box.dispatchEvent(new Event('change', { bubbles: true }));
        }

        box.checked = !!checked;
        return true;
    }

    function findWedaHeritageCheckbox(doc) {
        const rootDoc = doc || document;
        const direct = findElementDeep(SELECTOR_WEDA_HERITAGE, rootDoc);
        if (direct) return direct;

        const checkboxes = queryElementsDeep('input[type="checkbox"]', rootDoc);

        return checkboxes.find(box => {
            const idName = normalizeForMatch([
                box.id || '',
                box.name || '',
                box.getAttribute('title') || '',
                box.getAttribute('aria-label') || ''
            ].join(' '));

            return /heritage|familial|familiaux|famille/.test(idName);
        }) || null;
    }

    async function ensureWedaHeritageChecked(item, doc) {
        let box = await waitFor(() => {
            return findWedaHeritageCheckbox(doc);
        }, 5000, 250);

        if (!box) {
            logImportEvent('warning', 'familial_fields', 'Case familial/héréditaire introuvable dans la popup WEDA.', {
                item
            });
            return false;
        }

        if (!box.checked) {
            showBadge('Activation du caractère familial de l’antécédent…', { duration: 3500 });
            if (isVisible(box)) {
                clickElement(box);
            }
            await sleep(500);

            try {
                box.checked = true;
                box.dispatchEvent(new Event('input', { bubbles: true }));
                box.dispatchEvent(new Event('change', { bubbles: true }));
            } catch (_) {}

            await waitForWedaIdle(8000);
        } else {
            setWedaCheckbox(SELECTOR_WEDA_HERITAGE, true, doc);
        }

        box = findWedaHeritageCheckbox(doc);
        const ok = !box || !!box.checked;

        logImportEvent(ok ? 'info' : 'warning', 'familial_fields', ok ? 'Caractère familial activé dans WEDA.' : 'Caractère familial non confirmé dans WEDA.', {
            item,
            checkboxFound: !!box,
            checked: box ? !!box.checked : null,
            visible: box ? isVisible(box) : null
        });

        return ok;
    }

    function scoreWedaCollateralSelect(select) {
        if (!select) return 0;

        const attr = normalizeForMatch([
            select.id || '',
            select.name || '',
            select.getAttribute('title') || '',
            select.getAttribute('aria-label') || '',
            select.getAttribute('data-testid') || ''
        ].join(' '));

        const labels = getSelectOptionsSnapshot(select).map(option => option.normalized).join(' ');
        const optionCount = select.options ? select.options.length : 0;

        let score = 0;

        if (/dropdownlistantecedentlabelcollateral|antecedentlabelcollateral/.test(attr)) score += 180;
        if (/collateral|collateraux|collaterale/.test(attr)) score += 120;
        if (/familial|familiaux|famille|parent|parente|lien/.test(attr)) score += 60;

        if (/\bpere\b/.test(labels)) score += 25;
        if (/\bmere\b/.test(labels)) score += 25;
        if (/\bfrere\b/.test(labels)) score += 18;
        if (/\bsoeur\b/.test(labels)) score += 18;
        if (/\bgrand pere\b/.test(labels)) score += 18;
        if (/\bgrand mere\b/.test(labels)) score += 18;
        if (/\boncle\b|\btante\b|\bcousin\b|\bcousine\b/.test(labels)) score += 12;
        if (/\bautre\b/.test(labels)) score += 6;

        if (optionCount >= 4) score += 5;
        if (isVisible(select)) score += 3;

        return score;
    }

    function getWedaSelectDiagnostics(doc) {
        return queryElementsDeep('select', doc)
            .map(select => ({
                id: select.id || '',
                name: select.name || '',
                title: select.getAttribute('title') || '',
                visible: isVisible(select),
                optionCount: select.options ? select.options.length : 0,
                scoreCollateral: scoreWedaCollateralSelect(select),
                options: getSelectOptionsSnapshot(select).slice(0, 25)
            }))
            .sort((a, b) => b.scoreCollateral - a.scoreCollateral)
            .slice(0, 10);
    }

    function findWedaCollateralSelect(doc) {
        const rootDoc = doc || document;
        const direct = findElementDeep(SELECTOR_WEDA_COLLATERAL, rootDoc);
        if (direct) return direct;

        const candidates = queryElementsDeep('select', rootDoc)
            .map(select => ({
                select,
                score: scoreWedaCollateralSelect(select)
            }))
            .filter(candidate => candidate.score > 0)
            .sort((a, b) => b.score - a.score);

        return candidates.length ? candidates[0].select : null;
    }

    async function setWedaFamilialFields(item, doc) {
        const heritageOk = await ensureWedaHeritageChecked(item, doc);
        let collateralOk = false;

        const collateral = await waitFor(() => {
            return findWedaCollateralSelect(doc);
        }, 12000, 300);

        if (collateral) {
            logImportEvent('info', 'familial_fields', 'Liste de lien familial WEDA détectée.', {
                item,
                familyMember: item.familyMember || '',
                select: {
                    id: collateral.id || '',
                    name: collateral.name || '',
                    visible: isVisible(collateral),
                    scoreCollateral: scoreWedaCollateralSelect(collateral),
                    options: getSelectOptionsSnapshot(collateral).slice(0, 25)
                }
            });

            const okCollateral = await setWedaCollateral(item.familyMember || '', collateral, item);
            collateralOk = !!okCollateral;
            if (!okCollateral) {
                warn('Collateral non renseigné', item.familyMember, item);
                logImportEvent('warning', 'familial_fields', 'Lien familial non renseigné dans WEDA.', {
                    item,
                    familyMember: item.familyMember || '',
                    availableOptions: getSelectOptionsSnapshot(collateral)
                });
                throw new Error('Lien familial WEDA non renseigné pour : ' + (item.familyMember || 'membre non précisé') + '.');
            }
        } else {
            warn('Liste collateral introuvable pour antécédent familial', item);
            logImportEvent('warning', 'familial_fields', 'Liste de lien familial introuvable dans WEDA.', {
                item,
                familyMember: item.familyMember || '',
                selectCandidates: getWedaSelectDiagnostics(doc)
            });
            throw new Error('Liste du membre familial WEDA introuvable après activation familiale.');
        }

        if (!heritageOk) {
            logImportEvent('warning', 'familial_fields', 'Case familiale non confirmée, mais lien familial sélectionné : poursuite de l’import.', {
                item,
                familyMember: item.familyMember || '',
                collateralOk
            });
        }

        return true;
    }

    function findWedaAntecedentPanel() {
        const panel = findElementDeep(SELECTOR_WEDA_ANTECEDENT_PANEL);
        return panel && isVisible(panel) ? panel : null;
    }

    function normalizeAtcdColorForMatch(text) {
        return String(text || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/œ/g, 'oe')
            .replace(/æ/g, 'ae')
            .replace(/[’']/g, ' ')
            .replace(/[-_/.,;:!?()[\]{}"«»]/g, ' ')
            .replace(/\[[a-z][a-z0-9]{0,3}(?:\.[a-z0-9]+)?\]/ig, ' ')
            .replace(/[^a-z0-9]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function normalizeAtcdColorTerms(terms) {
        return (terms || [])
            .map(term => normalizeAtcdColorForMatch(term))
            .filter(Boolean)
            .sort((a, b) => b.length - a.length);
    }

    function getAtcdColorRuleForPriority(priority) {
        return (AUTO_ATCD_COLOR_KEYWORDS.colors && AUTO_ATCD_COLOR_KEYWORDS.colors[priority])
            || AUTO_ATCD_COLOR_KEYWORDS[priority]
            || {};
    }

    function ensureAtcdColorRuntimeInitialized() {
        if (compiledAtcdColorRules) return true;

        compiledAtcdColorRules = compileAtcdColorRules();
        atcdColorNegationTerms = normalizeAtcdColorTerms(AUTO_ATCD_COLOR_KEYWORDS.negationTerms);
        atcdColorFamilyTerms = normalizeAtcdColorTerms(AUTO_ATCD_COLOR_KEYWORDS.familyTerms);
        atcdColorFamilialHighRiskTerms = normalizeAtcdColorTerms(AUTO_ATCD_COLOR_KEYWORDS.familialHighRiskTerms);
        atcdColorFamilyCancerTerms = normalizeAtcdColorTerms([
            'cancer',
            'neoplasie',
            'neoplasme',
            'tumeur maligne',
            'carcinome',
            'adenocarcinome',
            'sarcome',
            'melanome',
            'lymphome',
            'leucemie',
            'myelome',
            'brca',
            'brca1',
            'brca2',
            'lynch',
            'polypose familiale'
        ]);
        atcdColorSeverityAmplifiers = normalizeAtcdColorTerms(AUTO_ATCD_COLOR_KEYWORDS.severityAmplifiers);
        atcdColorWeakOrIgnoreTerms = normalizeAtcdColorTerms(AUTO_ATCD_COLOR_KEYWORDS.weakOrIgnoreTerms);
        atcdColorNoColorTerms = normalizeAtcdColorTerms(AUTO_ATCD_COLOR_KEYWORDS.noColorTerms || (getAtcdColorRuleForPriority('NO_COLOR').terms || []));
        return true;
    }

    function compileAtcdColorRules() {
        const out = {};
        for (const priority of AUTO_ATCD_COLOR_KEYWORDS.priorityOrder || []) {
            const rule = getAtcdColorRuleForPriority(priority);
            out[priority] = {
                keywords: normalizeAtcdColorTerms([])
                    .concat(normalizeAtcdColorTerms(rule.keywords || []))
                    .concat(normalizeAtcdColorTerms(rule.terms || []))
                    .concat(normalizeAtcdColorTerms(rule.exactWords || [])),
                cim10Regex: (rule.cim10Regex || []).map(pattern => {
                    try {
                        return new RegExp(pattern, 'i');
                    } catch (e) {
                        warn('Regex couleur CIM10 ignorée', pattern, e);
                        return null;
                    }
                }).filter(Boolean)
            };
        }
        return out;
    }

    function atcdColorPaddedContainsTerm(normalizedText, normalizedTerm) {
        if (!normalizedText || !normalizedTerm) return false;
        return (` ${normalizedText} `).includes(` ${normalizedTerm} `);
    }

    function atcdColorHasAnyTerm(normalizedText, normalizedTerms) {
        return (normalizedTerms || []).some(term => atcdColorPaddedContainsTerm(normalizedText, term));
    }

    function atcdColorHasNonNegatedTerm(normalizedText, normalizedTerm) {
        if (!normalizedText || !normalizedTerm) return false;
        const padded = ` ${normalizedText} `;
        const needle = ` ${normalizedTerm} `;
        let index = padded.indexOf(needle);
        while (index !== -1) {
            const before = padded.slice(Math.max(0, index - 90), index).trim();
            const negated = atcdColorNegationTerms.some(term => before.endsWith(term) || before.includes(`${term} `));
            if (!negated) return true;
            index = padded.indexOf(needle, index + needle.length);
        }
        return false;
    }

    function collectAtcdColorPriorityMatchesFromCodes(codes) {
        const cleanCodes = (codes || []).map(normalizeCim10Code).filter(Boolean);
        const matches = [];
        for (const priority of AUTO_ATCD_COLOR_KEYWORDS.priorityOrder || []) {
            const rules = compiledAtcdColorRules[priority];
            if (!rules) continue;
            for (const code of cleanCodes) {
                if (rules.cim10Regex.some(regex => regex.test(code))) {
                    matches.push({ priority, source: 'cim10', match: code });
                    break;
                }
            }
        }
        return matches;
    }

    function collectAtcdColorPriorityMatchesFromKeywords(normalizedText, priorities) {
        if (!normalizedText) return [];
        const matches = [];
        for (const priority of priorities || []) {
            const rules = compiledAtcdColorRules[priority];
            if (!rules) continue;
            for (const keyword of rules.keywords) {
                if (atcdColorHasNonNegatedTerm(normalizedText, keyword)) {
                    matches.push({ priority, source: 'keyword', match: keyword });
                    break;
                }
            }
        }
        return matches;
    }

    function chooseHighestAtcdColorPriorityMatch(matches) {
        const filtered = (matches || []).filter(match => match && Object.prototype.hasOwnProperty.call(PRIORITY_RANK, match.priority));
        if (!filtered.length) return null;
        filtered.sort((a, b) => (PRIORITY_RANK[b.priority] || 0) - (PRIORITY_RANK[a.priority] || 0));
        return filtered[0];
    }

    function atcdColorTextMatchesNoColorRule(normalizedText) {
        if (!normalizedText) return false;
        return atcdColorHasAnyTerm(normalizedText, atcdColorNoColorTerms)
            || atcdColorHasAnyTerm(normalizedText, atcdColorWeakOrIgnoreTerms);
    }

    function atcdColorTextMatchesFamilyCancerContext(normalizedText) {
        return atcdColorHasAnyTerm(normalizedText, atcdColorFamilyCancerTerms);
    }

    function upgradeAtcdColorPriority(priority) {
        if (priority === 'PRIO_JAUNE') return 'PRIO_ORANGE';
        if (priority === 'PRIO_ORANGE') return 'PRIO_ROUGE';
        return priority;
    }

    function capAtcdColorPriority(priority, maxPriority) {
        if (!priority || !maxPriority) return priority;
        if (!Object.prototype.hasOwnProperty.call(PRIORITY_RANK, priority)
            || !Object.prototype.hasOwnProperty.call(PRIORITY_RANK, maxPriority)) return priority;
        return PRIORITY_RANK[priority] > PRIORITY_RANK[maxPriority] ? maxPriority : priority;
    }

    function applyAtcdColorContextRules(priority, normalizedText) {
        if (!priority) return priority;

        const hasSeverity = atcdColorHasAnyTerm(normalizedText, atcdColorSeverityAmplifiers);
        const hasFamily = atcdColorHasAnyTerm(normalizedText, atcdColorFamilyTerms);
        const hasFamilialHighRisk = atcdColorHasAnyTerm(normalizedText, atcdColorFamilialHighRiskTerms);
        const caps = AUTO_ATCD_COLOR_KEYWORDS.caps || {};

        let next = priority;
        if (hasSeverity && (next === 'PRIO_JAUNE' || next === 'PRIO_ORANGE')) {
            next = upgradeAtcdColorPriority(next);
        }

        if (hasFamilialHighRisk && PRIORITY_RANK[next] < PRIORITY_RANK.PRIO_ORANGE) {
            next = 'PRIO_ORANGE';
        }

        if (hasFamily) {
            if (hasFamilialHighRisk) {
                next = capAtcdColorPriority(next, caps.familyHighRiskMax || 'PRIO_ORANGE');
            } else if (atcdColorTextMatchesFamilyCancerContext(normalizedText)) {
                next = capAtcdColorPriority(next, caps.familyCancerMax || 'PRIO_ORANGE');
            } else {
                next = capAtcdColorPriority(next, caps.familyDefaultMax || 'PRIO_JAUNE');
            }
        }

        return next;
    }

    function buildImportedAtcdColorCandidate(item, result, displayCode) {
        const codes = [];
        function addCode(code) {
            const cleaned = normalizeCim10Code(code);
            if (cleaned && !codes.includes(cleaned)) codes.push(cleaned);
        }

        addCode(displayCode);
        addCode(result && result.matchedCode);
        addCode(item && item.code);

        const familyText = item && item.section === 'familial'
            ? `Antécédent familial ${item.familyMember || ''}`
            : '';

        return {
            title: item && item.description || '',
            comment: item && item.comment || '',
            text: [
                item && item.description,
                item && item.remarks,
                item && item.familyMember,
                result && result.matchedLabel,
                familyText
            ].filter(Boolean).join('\n'),
            contextText: [
                item && item.label,
                sectionLabel(item && item.section),
                familyText
            ].filter(Boolean).join('\n'),
            codes
        };
    }

    function collectImportedAtcdColorDecisionMatches(normalizedText, codes) {
        const priorityOrder = AUTO_ATCD_COLOR_KEYWORDS.priorityOrder || [];
        const codeMatches = collectAtcdColorPriorityMatchesFromCodes(codes);
        const keywordMatches = collectAtcdColorPriorityMatchesFromKeywords(normalizedText, priorityOrder);
        const strongest = chooseHighestAtcdColorPriorityMatch(codeMatches.concat(keywordMatches));
        if (strongest) return { match: strongest, noColor: false };

        if (atcdColorTextMatchesNoColorRule(normalizedText)) {
            return {
                match: { priority: 'NO_COLOR', source: 'no_color', match: 'NO_COLOR' },
                noColor: false
            };
        }

        if (codes && codes.length && DEFAULT_CODED_COLOR_PRIORITY) {
            return {
                match: { priority: DEFAULT_CODED_COLOR_PRIORITY, source: 'default_cim10', match: '' },
                noColor: false
            };
        }

        return { match: null, noColor: false };
    }

    function decideColorForImportedAtcd(item, result, displayCode) {
        ensureAtcdColorRuntimeInitialized();
        const candidate = buildImportedAtcdColorCandidate(item, result, displayCode);
        const normalizedText = normalizeAtcdColorForMatch([
            candidate.title,
            candidate.comment,
            candidate.text,
            candidate.contextText
        ].filter(Boolean).join('\n'));
        const decision = collectImportedAtcdColorDecisionMatches(normalizedText, candidate.codes);
        if (!decision || decision.noColor || !decision.match) return null;

        let priority = decision.match.priority;
        let source = decision.match.source || '';
        const beforeContext = priority;
        priority = applyAtcdColorContextRules(priority, normalizedText);
        if (priority !== beforeContext) source += '+context';

        const color = COLOR_DEFS[priority];
        if (!priority || !color) return null;

        return {
            priority,
            color,
            colorLabel: color.label,
            css: color.css,
            source,
            codes: candidate.codes.slice(),
            matched: decision.match.match || ''
        };
    }

    function parseAtcdCssRgb(value) {
        const text = String(value || '').trim();
        const rgb = text.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
        if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];

        const hex = text.match(/#([0-9a-f]{3}|[0-9a-f]{6})\b/i);
        if (!hex) return null;
        let raw = hex[1];
        if (raw.length === 3) raw = raw.split('').map(ch => ch + ch).join('');
        return [parseInt(raw.slice(0, 2), 16), parseInt(raw.slice(2, 4), 16), parseInt(raw.slice(4, 6), 16)];
    }

    function cssAtcdColorToRgbTuple(value) {
        const raw = String(value || '').trim();
        if (!raw) return null;

        const named = {
            red: '#ff0000',
            rouge: '#ff0000',
            orange: '#ffa500',
            yellow: '#ffff00',
            jaune: '#ffff00',
            violet: '#800080',
            purple: '#800080',
            mauve: '#cc99ff',
            magenta: '#ff00cc',
            fuchsia: '#ff00cc',
            white: '#ffffff',
            blanc: '#ffffff',
            transparent: 'rgba(0,0,0,0)'
        };

        const namedValue = named[normalizeAtcdColorForMatch(raw).replace(/\s+/g, '')];
        if (namedValue && namedValue !== raw) return cssAtcdColorToRgbTuple(namedValue);

        return parseAtcdCssRgb(raw);
    }

    function atcdRgbTupleToHex(rgb) {
        if (!rgb) return '';
        return '#' + rgb
            .slice(0, 3)
            .map(value => Math.max(0, Math.min(255, Number(value) || 0)).toString(16).padStart(2, '0'))
            .join('');
    }

    function atcdColorDistance(left, right) {
        if (!left || !right) return Infinity;
        return Math.sqrt(
            Math.pow(left[0] - right[0], 2) +
            Math.pow(left[1] - right[1], 2) +
            Math.pow(left[2] - right[2], 2)
        );
    }

    function normalizeAtcdCssColorText(value) {
        return String(value || '').replace(/\s+/g, '').toLowerCase();
    }

    function extractFirstAtcdColorFromText(value) {
        const raw = String(value || '');
        const hex = raw.match(/#(?:[0-9a-f]{3}|[0-9a-f]{6})\b/i);
        if (hex) return hex[0];
        const rgb = raw.match(/rgba?\s*\([^)]+\)/i);
        if (rgb) return rgb[0];
        return '';
    }

    function atcdColorValueLooksEmpty(value) {
        const raw = normalizeAtcdCssColorText(value);
        if (!raw) return true;
        if (/^rgba\([^)]*,0(?:\.0+)?\)$/.test(raw)) return true;
        if (['0', '-1', 'none', 'transparent', 'inherit', 'initial', 'unset', '#fff', '#ffffff', 'ffffff', 'white', 'rgb(255,255,255)', 'rgba(255,255,255,1)', 'rgba(0,0,0,0)'].includes(raw)) return true;

        const rgb = cssAtcdColorToRgbTuple(value);
        if (!rgb) return false;
        return atcdRgbTupleToHex(rgb) === '#ffffff';
    }

    function getWedaColorState(doc = document) {
        const field = (doc || document).querySelector(SELECTOR_WEDA_COLOR_FIELD) || findElementDeep(SELECTOR_WEDA_COLOR_FIELD, doc);
        const preview = (doc || document).querySelector(SELECTOR_WEDA_COLOR_PREVIEW) || findElementDeep(SELECTOR_WEDA_COLOR_PREVIEW, doc);
        let previewStyle = null;
        try { previewStyle = preview ? ownerWin(preview).getComputedStyle(preview) : null; } catch (_) {}

        return {
            value: field ? String(field.value || '') : '',
            fieldDisabled: !!(field && field.disabled),
            previewBackground: previewStyle ? previewStyle.backgroundColor || '' : '',
            previewInlineBackground: preview && preview.style ? preview.style.backgroundColor || preview.style.background || '' : ''
        };
    }

    function findWedaColorButton(panel, doc = document) {
        const selectors = [
            SELECTOR_WEDA_COLOR_BUTTON_EXACT,
            'img[alt="Couleur"][onclick*="colorTable"]',
            'img[onclick*="ContentPlaceHolder1_LabelColorGrid"][onclick*="TextBoxGlossaireCouleur"]',
            'img[src*="cp_button.png"]',
            'input[onclick*="colorTable"]',
            'button[onclick*="colorTable"]'
        ];

        for (const selector of selectors) {
            try {
                const local = panel && panel.querySelector ? panel.querySelector(selector) : null;
                if (local && isVisible(local)) return local;
            } catch (_) {}
        }

        for (const selector of selectors) {
            const found = queryElementsDeep(selector, doc)
                .find(el => isVisible(el) && (!panel || panel.contains(el) || selector === SELECTOR_WEDA_COLOR_BUTTON_EXACT));
            if (found) return found;
        }

        return null;
    }

    function findVisibleWedaColorGrid(doc = document) {
        const grid = (doc || document).querySelector(SELECTOR_WEDA_COLOR_GRID) || findElementDeep(SELECTOR_WEDA_COLOR_GRID, doc);
        if (!grid) return null;
        if (isVisible(grid)) return grid;
        try {
            return Array.from(grid.querySelectorAll('*')).some(el => isVisible(el)) ? grid : null;
        } catch (_) {
            return null;
        }
    }

    function getWedaColorOptionColor(el) {
        if (!el) return { css: '', rgb: null };
        let computed = null;
        try { computed = ownerWin(el).getComputedStyle(el); } catch (_) {}
        const candidates = [
            el.getAttribute && el.getAttribute('bgcolor'),
            el.getAttribute && el.getAttribute('data-color'),
            el.getAttribute && el.getAttribute('data-value'),
            el.getAttribute && el.getAttribute('value'),
            el.style && (el.style.backgroundColor || el.style.background),
            computed && computed.backgroundColor,
            computed && computed.borderColor,
            extractFirstAtcdColorFromText(el.getAttribute ? el.getAttribute('onclick') || '' : ''),
            extractFirstAtcdColorFromText(el.getAttribute ? el.getAttribute('style') || '' : '')
        ].filter(Boolean);

        for (const candidate of candidates) {
            const rgb = cssAtcdColorToRgbTuple(candidate);
            if (rgb) return { css: String(candidate), rgb };
        }

        return { css: '', rgb: null };
    }

    function findClickableWedaColorOption(el, grid) {
        if (!el) return null;
        if (el.matches && el.matches('a, button, input, img, td, span, div, [onclick]')) return el;
        const clickable = el.closest ? el.closest('a, button, input, img, td, span, div, [onclick]') : null;
        if (clickable && clickable !== grid) return clickable;
        return el;
    }

    function collectWedaColorGridOptions(grid) {
        if (!grid) return [];

        const selector = 'a, button, input, img, td, th, span, div, label, [onclick], [style*="background"], [bgcolor]';
        const seen = new Set();
        const options = [];

        try {
            Array.from(grid.querySelectorAll(selector)).forEach(el => {
                if (!el || seen.has(el) || el === grid) return;
                seen.add(el);

                const color = getWedaColorOptionColor(el);
                const text = normalizeSpaces(el.innerText || el.textContent || '');
                const onclick = el.getAttribute ? String(el.getAttribute('onclick') || '') : '';
                const value = el.getAttribute ? String(el.getAttribute('value') || el.getAttribute('data-value') || el.getAttribute('data-color') || '') : '';
                const title = el.getAttribute ? String(el.getAttribute('title') || '') : '';
                const alt = el.getAttribute ? String(el.getAttribute('alt') || '') : '';
                const inlineStyle = el.getAttribute ? String(el.getAttribute('style') || '') : '';

                if (!color.rgb && !onclick && !value && !title && !alt && !text) return;

                options.push({
                    el,
                    clickable: findClickableWedaColorOption(el, grid),
                    tag: String(el.tagName || '').toLowerCase(),
                    text,
                    title,
                    alt,
                    value,
                    onclick,
                    inlineStyle,
                    background: color.css,
                    computedHex: atcdRgbTupleToHex(color.rgb),
                    rgb: color.rgb
                });
            });
        } catch (_) {}

        return options;
    }

    function serializeWedaColorOption(option, index = 0) {
        if (!option) return null;
        return {
            index,
            tag: option.tag || '',
            text: option.text || '',
            title: option.title || '',
            alt: option.alt || '',
            value: option.value || '',
            background: option.background || '',
            computedHex: option.computedHex || '',
            onclick: normalizeSpaces(String(option.onclick || '').slice(0, 180)),
            inlineStyle: option.inlineStyle || ''
        };
    }

    function scoreWedaColorOptionForPriority(option, priority) {
        if (!option || !option.rgb) return Number.POSITIVE_INFINITY;
        const target = WEDA_PRIORITY_COLOR_TARGETS[priority];
        if (!target) return Number.POSITIVE_INFINITY;

        const targetRgb = cssAtcdColorToRgbTuple(target.preferredHex);
        let score = atcdColorDistance(option.rgb, targetRgb);
        const haystack = normalizeAtcdColorForMatch([
            option.text,
            option.title,
            option.alt,
            option.value,
            option.onclick,
            option.inlineStyle,
            option.background,
            option.computedHex
        ].join(' '));

        if (target.label && haystack.includes(normalizeAtcdColorForMatch(target.label))) score -= 120;
        if (target.nameRegex && target.nameRegex.test(haystack)) score -= 90;
        if (priority !== 'NO_COLOR' && priority !== 'PRIO_BLANC' && atcdColorValueLooksEmpty(option.computedHex || option.background || option.value)) score += 300;

        try {
            const rect = option.el && option.el.getBoundingClientRect ? option.el.getBoundingClientRect() : null;
            if (rect) {
                if (rect.width > 80 || rect.height > 80) score += 180;
                if (rect.width < 6 || rect.height < 6) score += 80;
            }
        } catch (_) {}

        const saturation = Math.max(option.rgb[0], option.rgb[1], option.rgb[2]) - Math.min(option.rgb[0], option.rgb[1], option.rgb[2]);
        const brightness = (option.rgb[0] + option.rgb[1] + option.rgb[2]) / 3;
        if (brightness > 150 && saturation < 170) score -= 18;
        if (brightness < 80) score += 80;

        return score;
    }

    function chooseWedaColorOptionForPriority(options, priority) {
        const scored = (options || [])
            .filter(option => option && option.rgb)
            .map((option, index) => ({
                option,
                index,
                score: scoreWedaColorOptionForPriority(option, priority)
            }))
            .filter(entry => Number.isFinite(entry.score))
            .sort((a, b) => a.score - b.score);

        return scored.length ? scored[0] : null;
    }

    function summarizeWedaColorReport(report) {
        if (!report) return null;
        return {
            priority: report.priority || '',
            attempted: !!report.attempted,
            applied: !!report.applied,
            method: report.method || '',
            colorTried: report.colorTried || '',
            reason: report.reason || '',
            error: report.error || '',
            before: report.before || null,
            after: report.after || null,
            chosen: report.chosen || null
        };
    }

    function summarizeAtcdColorDecision(decision) {
        if (!decision) return null;
        return {
            priority: decision.priority || '',
            colorLabel: decision.colorLabel || '',
            css: decision.css || '',
            source: decision.source || '',
            codes: decision.codes || [],
            matched: decision.matched || ''
        };
    }

    async function setAntecedentWedaColorFromPalette(priority) {
        const report = {
            at: nowIso(),
            priority,
            attempted: false,
            applied: false,
            method: '',
            colorTried: '',
            reason: '',
            error: '',
            before: null,
            after: null,
            chosen: null,
            options: []
        };

        if (!WEDA_PRIORITY_COLOR_TARGETS[priority]) {
            report.reason = 'Priorité couleur WEDA inconnue.';
            return report;
        }

        report.attempted = true;

        try {
            const panel = await waitFor(() => findWedaAntecedentPanel(), 15000, 250);
            if (!panel) {
                report.reason = 'Panneau antécédent WEDA non ouvert.';
                return report;
            }

            const doc = panel.ownerDocument || document;
            const button = findWedaColorButton(panel, doc);
            if (!button) {
                report.reason = 'Bouton couleur WEDA introuvable.';
                return report;
            }

            report.before = getWedaColorState(doc);

            let grid = findVisibleWedaColorGrid(doc);
            if (!grid) {
                clickElement(button);
                await sleep(200);
                grid = await waitFor(() => findVisibleWedaColorGrid(doc), 5000, 200);
            }

            if (!grid) {
                report.reason = 'Palette couleur WEDA introuvable après clic.';
                return report;
            }

            const options = collectWedaColorGridOptions(grid);
            const chosen = chooseWedaColorOptionForPriority(options, priority);
            report.options = options.slice(0, 20).map(serializeWedaColorOption);

            if (!chosen || !chosen.option || !chosen.option.clickable) {
                report.reason = 'Aucune couleur exploitable trouvée dans la palette WEDA.';
                return report;
            }

            report.method = 'palette_weda_coloriseur';
            report.colorTried = chosen.option.computedHex || chosen.option.background || chosen.option.value || WEDA_PRIORITY_COLOR_TARGETS[priority].label;
            report.chosen = serializeWedaColorOption(chosen.option, chosen.index);

            const clicked = clickElement(chosen.option.clickable);
            await sleep(1200);
            report.after = getWedaColorState(doc);
            report.applied = !!clicked;
            return report;
        } catch (e) {
            report.reason = 'Erreur pendant application couleur WEDA.';
            report.error = e && e.message ? e.message : String(e);
            return report;
        }
    }

    async function colorizeImportedAtcdPopup(item, result, displayCode, job = null) {
        const decision = decideColorForImportedAtcd(item, result, displayCode);
        const colorization = {
            at: nowIso(),
            decision: summarizeAtcdColorDecision(decision),
            report: null,
            applied: false
        };

        if (!decision) {
            logImportEvent('warning', 'weda_color_failed', 'Colorisation WEDA ignorée : aucune décision couleur locale.', {
                jobId: job && job.id || '',
                item,
                displayCode
            });
            return colorization;
        }

        showBadge(`Colorisation ${decision.colorLabel}\n${item.description} [${displayCode}]`, { duration: 5000 });

        const report = await setAntecedentWedaColorFromPalette(decision.priority);
        colorization.report = summarizeWedaColorReport(report);
        colorization.applied = !!(report && report.applied);

        logImportEvent(colorization.applied ? 'info' : 'warning', colorization.applied ? 'weda_color' : 'weda_color_failed', colorization.applied
            ? `Couleur WEDA appliquée : ${decision.colorLabel}.`
            : `Couleur WEDA non appliquée : ${decision.colorLabel}.`, {
                jobId: job && job.id || '',
                item,
                decision: colorization.decision,
                report: colorization.report
            });

        return colorization;
    }

    function limitAtcdColorText(text, maxLen = 240) {
        const raw = normalizeSpaces(text);
        if (raw.length <= maxLen) return raw;
        return raw.slice(0, Math.max(0, maxLen - 1)) + '…';
    }

    function getAtcdColorElementText(el) {
        return normalizeSpaces(el ? (el.innerText || el.textContent || '') : '');
    }

    function detectAtcdColorSectionHeader(el) {
        if (!el || !isVisible(el) || isWedaAutoUiElement(el)) return null;

        const className = String(el.className || '').toLowerCase();
        const title = normalizeForMatch(el.getAttribute && el.getAttribute('title') || '');
        if (!/\bsma\b/.test(className) && !title.includes('type de l onglet')) return null;

        const mainLabel = getHeaderMainLabel(el);
        const text = getAtcdColorElementText(el);
        const mapped = mapWedaSection(`${mainLabel} ${text} ${el.getAttribute && el.getAttribute('title') || ''}`);
        if (mapped) return { section: mapped, label: mainLabel || text || sectionLabel(mapped) };
        if (mainLabel || text) return { section: null, label: mainLabel || text };
        return null;
    }

    function atcdColorLooksLikeAntecedentText(text) {
        const cleaned = normalizeSpaces(text);
        if (!cleaned || cleaned.length < 2 || cleaned.length > 2500) return false;

        const n = normalizeForMatch(cleaned);
        if (!n) return false;
        if (/^(supprimer|modifier|valider|annuler|ajouter|fermer|aucun|non|oui|\d+)$/.test(n)) return false;
        if (/^type de l onglet/.test(n)) return false;

        return true;
    }

    function atcdColorTableNestingDepth(el, stopAt) {
        let depth = 0;
        let node = el && el.parentElement;
        while (node && node !== stopAt && node !== document.body) {
            if (String(node.tagName || '').toLowerCase() === 'table') depth += 1;
            node = node.parentElement;
        }
        return depth;
    }

    function atcdColorHasNestedTextBlock(el) {
        try {
            const own = getAtcdColorElementText(el);
            if (!own) return false;
            return Array.from(el.children || []).some(child => {
                const text = getAtcdColorElementText(child);
                return text && text.length > 1 && text.length >= Math.min(own.length, 80);
            });
        } catch (_) {
            return false;
        }
    }

    function getAtcdColorCellIndex(cell) {
        if (!cell) return -1;
        if (typeof cell.cellIndex === 'number') return cell.cellIndex;
        try {
            return Array.prototype.indexOf.call(cell.parentElement.children, cell);
        } catch (_) {
            return -1;
        }
    }

    function hasAtcdColorAntecedentItemShape(el) {
        if (!el) return false;

        const tag = String(el.tagName || '').toLowerCase();
        const parent = el.parentElement;
        const parentTag = String(parent && parent.tagName || '').toLowerCase();
        const cell = el.closest && el.closest('td');
        const row = el.closest && el.closest('tr');
        const cellIndex = getAtcdColorCellIndex(cell);

        if (tag === 'div' && parentTag === 'td' && getAtcdColorCellIndex(parent) === 1) return true;
        if (tag === 'div' && cellIndex === 1 && row) return true;
        if (tag === 'td' && getAtcdColorCellIndex(el) === 1 && !atcdColorHasNestedTextBlock(el)) return true;

        try {
            if (tag === 'div' && el.querySelector(':scope > span[title]') && el.querySelector('br')) return true;
        } catch (_) {}

        return false;
    }

    function hasNestedAtcdColorAntecedentItemShape(el) {
        if (!el || !el.querySelectorAll) return false;
        try {
            return Array.from(el.querySelectorAll('div, td')).some(child => child !== el && hasAtcdColorAntecedentItemShape(child));
        } catch (_) {
            return false;
        }
    }

    function isAtcdColorCandidateElement(el, root) {
        if (!el || isWedaAutoUiElement(el) || !isVisible(el)) return false;
        if (detectAtcdColorSectionHeader(el)) return false;

        const tag = String(el.tagName || '').toLowerCase();
        if (!['div', 'td'].includes(tag)) return false;
        if (!hasAtcdColorAntecedentItemShape(el)) return false;
        if (hasNestedAtcdColorAntecedentItemShape(el)) return false;

        const text = getAtcdColorElementText(el);
        if (!atcdColorLooksLikeAntecedentText(text)) return false;

        const closestTable = el.closest && el.closest('table');
        if ((tag === 'td' || tag === 'div') && text.length > 1200 && atcdColorHasNestedTextBlock(el)) return false;
        if (closestTable && atcdColorTableNestingDepth(el, root) > 8) return false;

        return !!getWedaAntecedentSelectableTarget(el, root);
    }

    function getAtcdColorCodeScope(el) {
        if (!el) return null;
        const row = el.closest && el.closest('tr');
        return row || el;
    }

    function addAtcdColorCandidateContextChunk(chunks, node, maxLen = 1400) {
        if (!node || !isVisible(node) || detectAtcdColorSectionHeader(node)) return;
        const text = getAtcdColorElementText(node);
        if (!text || text.length > maxLen) return;
        if (!chunks.includes(text)) chunks.push(text);
    }

    function getAtcdColorCandidateContextText(el, root) {
        const chunks = [];
        if (!el) return '';

        addAtcdColorCandidateContextChunk(chunks, el);
        try { addAtcdColorCandidateContextChunk(chunks, el.closest && el.closest('tr')); } catch (_) {}
        try { addAtcdColorCandidateContextChunk(chunks, el.closest && el.closest('td')); } catch (_) {}

        const parent = el.parentElement;
        if (parent && parent !== root) addAtcdColorCandidateContextChunk(chunks, parent, 900);

        for (const sibling of [el.previousElementSibling, el.nextElementSibling]) {
            if (!sibling || sibling === root) continue;
            addAtcdColorCandidateContextChunk(chunks, sibling, 500);
        }

        return normalizeSpaces(chunks.join('\n'));
    }

    function atcdColorCandidateSignatureBase(section, text, codes) {
        return [
            section || '',
            (codes || []).map(normalizeCim10Code).filter(Boolean).join('|'),
            normalizeForMatch(text)
        ].join('|');
    }

    function scoreAtcdColorCandidate(el, root) {
        const tag = String(el && el.tagName || '').toLowerCase();
        const text = getAtcdColorElementText(el);
        const parent = el && el.parentElement;
        const row = el && el.closest && el.closest('tr');
        let score = 0;

        if (tag === 'div') score -= 60;
        if (tag === 'td') score -= 20;
        if (tag === 'tr') score += 35;
        if (tag === 'span') score += 20;

        try {
            if (parent && String(parent.tagName || '').toLowerCase() === 'td' && parent.cellIndex === 1) score -= 45;
        } catch (_) {}

        if (el && el.querySelector && el.querySelector('br')) score -= 10;
        if (row && isClickableWedaAntecedentElement(row)) score -= 10;
        if (isClickableWedaAntecedentElement(el)) score -= 18;
        if (atcdColorHasNestedTextBlock(el)) score += 45;

        score += Math.min(text.length, 1200) / 8;
        score += atcdColorTableNestingDepth(el, root) * 2;
        return score;
    }

    function collectAtcdColorCandidatesFromDomShape(root, limit = 1000) {
        if (!root) return [];

        const raw = [];
        let currentSection = 'medical';
        let currentSectionLabel = sectionLabel(currentSection);

        for (const el of Array.from(root.querySelectorAll('*'))) {
            const header = detectAtcdColorSectionHeader(el);
            if (header) {
                currentSection = header.section || null;
                currentSectionLabel = header.label || sectionLabel(currentSection);
                continue;
            }

            if (!isAtcdColorCandidateElement(el, root)) continue;

            const text = getAtcdColorElementText(el);
            const codeScope = getAtcdColorCodeScope(el);
            const codes = extractStructuredWedaCim10CodesFromElement(codeScope);
            if (!codes.length) continue;

            raw.push({
                el,
                target: getWedaAntecedentSelectableTarget(el, root),
                doc: el.ownerDocument || document,
                section: currentSection,
                sectionLabel: currentSectionLabel || sectionLabel(currentSection),
                text,
                contextText: getAtcdColorCandidateContextText(el, root),
                codes,
                hasCim10: true,
                signatureBase: atcdColorCandidateSignatureBase(currentSection, text, codes),
                score: scoreAtcdColorCandidate(el, root),
                source: 'dom_shape'
            });

            if (raw.length >= limit * 3) break;
        }

        return raw;
    }

    function collectAtcdColorCandidatesFromStructuredBlocks(root) {
        return collectWedaImportedAntecedentBlocks().map((block, index) => {
            const target = block.target || getWedaAntecedentSelectableTarget(block.el, root);
            return {
                el: block.el,
                target,
                doc: block.el && block.el.ownerDocument || document,
                section: block.section || null,
                sectionLabel: sectionLabel(block.section),
                text: block.text || '',
                contextText: block.normalizedText || '',
                codes: block.codes || [],
                hasCim10: true,
                signatureBase: atcdColorCandidateSignatureBase(block.section || '', block.text || '', block.codes || []),
                score: 30 + index,
                source: block.source || 'structured_block'
            };
        }).filter(candidate => candidate.el && candidate.target && candidate.codes.length);
    }

    function atcdColorElementsOverlap(left, right) {
        if (!left || !right) return false;
        if (left === right) return true;
        try { return left.contains(right) || right.contains(left); } catch (_) { return false; }
    }

    function collectWedaStandaloneAtcdColorCandidates(options = {}) {
        const root = getWedaAntecedentRoot();
        if (!root) return [];

        const limit = Number(options.limit || 1000);
        const raw = []
            .concat(collectAtcdColorCandidatesFromDomShape(root, limit))
            .concat(collectAtcdColorCandidatesFromStructuredBlocks(root))
            .filter(candidate => candidate && candidate.el && candidate.target && candidate.codes && candidate.codes.length);

        raw.sort((a, b) => (a.score || 0) - (b.score || 0));

        const selected = [];
        for (const candidate of raw) {
            if (selected.length >= limit) break;
            if (selected.some(existing =>
                atcdColorElementsOverlap(existing.el, candidate.el) ||
                atcdColorElementsOverlap(existing.target, candidate.target)
            )) continue;
            selected.push(candidate);
        }

        const occurrences = Object.create(null);
        selected.forEach((candidate, index) => {
            const base = candidate.signatureBase || atcdColorCandidateSignatureBase(candidate.section, candidate.text, candidate.codes);
            const occurrence = occurrences[base] || 0;
            occurrences[base] = occurrence + 1;
            candidate.index = index;
            candidate.signature = `${base}|occurrence:${occurrence}`;
        });

        return selected;
    }

    function getStandaloneAtcdColorCandidateDecisionText(candidate) {
        if (!candidate) return '';
        return normalizeSpaces([
            candidate.sectionLabel,
            candidate.text,
            candidate.contextText
        ].filter(Boolean).join('\n'));
    }

    function decideColorForStandaloneAtcdCandidate(candidate) {
        ensureAtcdColorRuntimeInitialized();
        const normalizedText = normalizeAtcdColorForMatch(getStandaloneAtcdColorCandidateDecisionText(candidate));
        const decision = collectImportedAtcdColorDecisionMatches(normalizedText, candidate && candidate.codes || []);
        if (!decision || decision.noColor || !decision.match) return null;

        let priority = decision.match.priority;
        let source = decision.match.source || '';
        const beforeContext = priority;
        priority = applyAtcdColorContextRules(priority, normalizedText);
        if (priority !== beforeContext) source += '+context';

        const color = COLOR_DEFS[priority];
        if (!priority || !color) return null;

        return {
            priority,
            color,
            colorLabel: color.label,
            css: color.css,
            source,
            codes: (candidate && candidate.codes || []).slice(),
            matched: decision.match.match || ''
        };
    }

    function atcdColorRgbLooksLikePriority(rgb, priority) {
        if (!rgb || !priority) return false;
        const r = rgb[0], g = rgb[1], b = rgb[2];
        if (priority === 'PRIO_ROUGE') return r >= 190 && g <= 215 && b <= 215 && r >= g && r >= b;
        if (priority === 'PRIO_VIOLET') return b >= 130 && r >= 120 && g <= 215 && (b >= g + 25 || r >= g + 35);
        if (priority === 'PRIO_ORANGE') return r >= 220 && g >= 90 && g <= 235 && b <= 205 && r >= g + 10;
        if (priority === 'PRIO_JAUNE') return r >= 220 && g >= 200 && b <= 220 && Math.abs(r - g) <= 60;
        if (priority === 'NO_COLOR') return r >= 245 && g >= 245 && b >= 245;
        if (priority === 'PRIO_BLANC') return r >= 245 && g >= 245 && b >= 245;
        return false;
    }

    function getAtcdColorComputedColorValues(el) {
        if (!el) return [];
        try {
            const style = ownerWin(el).getComputedStyle(el);
            return [style.color, style.backgroundColor, style.borderColor]
                .map(cssAtcdColorToRgbTuple)
                .filter(Boolean);
        } catch (_) {
            return [];
        }
    }

    function visibleAtcdElementLooksColoredForPriority(el, priority) {
        return getAtcdColorComputedColorValues(el).some(rgb => atcdColorRgbLooksLikePriority(rgb, priority));
    }

    function standaloneAtcdLineAlreadyLooksColored(candidate, decision) {
        if (!candidate || !decision) return false;
        if (visibleAtcdElementLooksColoredForPriority(candidate.el, decision.priority)) return true;
        try {
            return Array.from(candidate.el.querySelectorAll('span, font, div, td')).some(el => {
                const title = normalizeForMatch(el.getAttribute && el.getAttribute('title') || '');
                if (title === 'code cim10') return false;
                return visibleAtcdElementLooksColoredForPriority(el, decision.priority);
            });
        } catch (_) {
            return false;
        }
    }

    function familyMemberDetectionLabelForKind(kind, branch = '') {
        const base = {
            beau_pere: 'Beau-père',
            belle_mere: 'Belle-mère',
            beau_fils: 'Beau-fils',
            belle_fille: 'Belle-fille',
            demi_frere: 'Demi-frère',
            demi_soeur: 'Demi-sœur',
            grand_pere: 'Grand-père',
            grand_mere: 'Grand-mère',
            petit_fils: 'Petit-fils',
            petite_fille: 'Petite-fille',
            oncle: 'Oncle',
            tante: 'Tante',
            neveu: 'Neveu',
            niece: 'Nièce',
            cousin: 'Cousin',
            cousine: 'Cousine',
            pere: 'Père',
            mere: 'Mère',
            frere: 'Frère',
            soeur: 'Sœur',
            fils: 'Fils',
            fille: 'Fille'
        }[kind] || '';

        return base ? familyBranchSuffix(base, branch) : '';
    }

    function getFamilyMemberBranchNearMatch(normalizedText, matchIndex, matchLength) {
        const around = ` ${normalizedText.slice(Math.max(0, matchIndex - 45), matchIndex + matchLength + 45)} `;
        if (/\b(paternel|paternelle|paternels|paternelles|cote paternel|cote paternelle|pat)\b/.test(around)) return 'paternel';
        if (/\b(maternel|maternelle|maternels|maternelles|cote maternel|cote maternelle|mat)\b/.test(around)) return 'maternel';
        return '';
    }

    function getOnlyFamilyBranchInText(normalizedText) {
        if (!normalizedText) return '';
        const hasPaternal = /\b(paternel|paternelle|paternels|paternelles|cote paternel|cote paternelle|branche paternelle|branche paternelle|ligne paternelle|pat)\b/.test(normalizedText);
        const hasMaternal = /\b(maternel|maternelle|maternels|maternelles|cote maternel|cote maternelle|branche maternelle|branche maternelle|ligne maternelle|mat)\b/.test(normalizedText);
        if (hasPaternal && !hasMaternal) return 'paternel';
        if (hasMaternal && !hasPaternal) return 'maternel';
        return '';
    }

    function getFamilyMemberBranchFromAbbreviation(kind, matchText) {
        const n = normalizeForMatch(matchText);
        if (kind === 'grand_pere' && n === 'gpp') return 'paternel';
        if (kind === 'grand_pere' && n === 'gpm') return 'maternel';
        if (kind === 'grand_mere' && n === 'gmp') return 'paternel';
        if (kind === 'grand_mere' && n === 'gmm') return 'maternel';
        return '';
    }

    function addFamilyMemberDetectionsFromRegex(detections, normalizedText, kind, regex, options = {}) {
        if (!normalizedText || !regex) return;
        const global = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
        const uniqueBranch = options.branchAware ? getOnlyFamilyBranchInText(normalizedText) : '';
        let match;
        while ((match = global.exec(normalizedText)) !== null) {
            const branch = options.branchAware
                ? (getFamilyMemberBranchFromAbbreviation(kind, match[0]) || getFamilyMemberBranchNearMatch(normalizedText, match.index, match[0].length) || uniqueBranch)
                : '';
            const label = familyMemberDetectionLabelForKind(kind, branch);
            if (label) detections.push({ label, kind, branch, match: match[0] });
            if (!global.global) break;
        }
    }

    function inferSingleFamilyMemberFromText(text) {
        const normalized = normalizeFamilyMemberForQuality(text);
        if (!normalized) return '';

        const detections = [];
        const withoutSpecificParents = normalized
            .replace(/\bgrand\s+pere\b/g, ' ')
            .replace(/\bgrand\s+mere\b/g, ' ')
            .replace(/\bbeau\s+pere\b/g, ' ')
            .replace(/\bbelle\s+mere\b/g, ' ')
            .replace(/\bbeau\s+fils\b/g, ' ')
            .replace(/\bbelle\s+fille\b/g, ' ')
            .replace(/\bpetit\s+fils\b/g, ' ')
            .replace(/\bpetite\s+fille\b/g, ' ')
            .replace(/\bdemi\s+frere\b/g, ' ')
            .replace(/\bdemi\s+soeur\b/g, ' ');

        [
            ['beau_pere', /\bbeau\s+pere\b/],
            ['belle_mere', /\bbelle\s+mere\b/],
            ['beau_fils', /\bbeau\s+fils\b/],
            ['belle_fille', /\bbelle\s+fille\b/],
            ['demi_frere', /\bdemi\s+frere\b/],
            ['demi_soeur', /\bdemi\s+soeur\b/],
            ['grand_pere', /\b(?:grand\s+pere|gp|gpp|gpm)\b/, true],
            ['grand_mere', /\b(?:grand\s+mere|gm|gmp|gmm)\b/, true],
            ['petit_fils', /\bpetit\s+fils\b/, true],
            ['petite_fille', /\bpetite\s+fille\b/, true],
            ['oncle', /\boncles?\b/, true],
            ['tante', /\btantes?\b/, true],
            ['neveu', /\bneveux?\b/, true],
            ['niece', /\bnieces?\b/, true],
            ['cousin', /\bcousins?\b/, true],
            ['cousine', /\bcousines?\b/, true]
        ].forEach(([kind, regex, branchAware]) => {
            addFamilyMemberDetectionsFromRegex(detections, normalized, kind, regex, { branchAware: !!branchAware });
        });

        [
            ['pere', /\b(pere|papa)\b/],
            ['mere', /\b(mere|maman)\b/],
            ['frere', /\bfreres?\b/],
            ['soeur', /\bsoeurs?\b/],
            ['fils', /\bfils\b/],
            ['fille', /\bfilles?\b/]
        ].forEach(([kind, regex]) => {
            addFamilyMemberDetectionsFromRegex(detections, withoutSpecificParents, kind, regex);
        });

        const unique = dedupeFamilyMemberLabels(detections.map(entry => entry.label));
        return unique.length === 1 ? unique[0] : '';
    }

    function isStandaloneAtcdCandidateFamilial(candidate) {
        if (!candidate) return false;
        if (candidate.section === 'familial') return true;
        const sectionLabelNorm = normalizeForMatch(candidate.sectionLabel || '');
        const textNorm = normalizeForMatch(candidate.text || '');
        return /\bfamilial\b|\bfamiliaux\b/.test(sectionLabelNorm)
            || /\bantecedents?\s+familiaux\b/.test(textNorm);
    }

    function wedaFamilyMemberDisplaySpanLooksGreen(el) {
        if (!el) return false;
        const inline = normalizeSpaces(String(el.getAttribute && el.getAttribute('style') || '')).toLowerCase();
        if (/#009700|rgb\s*\(\s*0\s*,\s*151\s*,\s*0\s*\)/i.test(inline)) return true;

        try {
            const rgb = cssAtcdColorToRgbTuple(ownerWin(el).getComputedStyle(el).color || '');
            return !!(rgb && Math.abs(rgb[0] - 0) <= 20 && Math.abs(rgb[1] - 151) <= 35 && Math.abs(rgb[2] - 0) <= 20);
        } catch (_) {
            return false;
        }
    }

    function collectDisplayedFamilyMembersFromAtcdCandidate(candidate) {
        const labels = [];
        const root = candidate && candidate.el;
        if (!root || !root.querySelectorAll) return labels;

        try {
            Array.from(root.querySelectorAll('span')).forEach(span => {
                if (!span || !isVisible(span) || !wedaFamilyMemberDisplaySpanLooksGreen(span)) return;
                if (isStructuredWedaCim10CodeSpan(span)) return;

                const text = normalizeSpaces(span.innerText || span.textContent || '');
                if (!text || text.length > 80) return;

                const member = inferSingleFamilyMemberFromText(text);
                if (member) labels.push(member);
            });
        } catch (_) {}

        return dedupeFamilyMemberLabels(labels);
    }

    function standaloneAtcdCandidateNeedsFamilyMemberRepair(candidate) {
        if (!isStandaloneAtcdCandidateFamilial(candidate)) return false;
        if (!(candidate.codes || []).length) return false;
        return collectDisplayedFamilyMembersFromAtcdCandidate(candidate).length === 0;
    }

    function getCurrentWedaCollateralFamilyMember(select) {
        if (!select) return '';
        const selected = Array.from(select.selectedOptions || [])
            .map(option => getSelectOptionLabel(option))
            .filter(Boolean)
            .join(' ');
        const value = String(select.value || '');
        const normalized = normalizeForMatch(selected);

        if (!selected || /^(choisir|selectionner|aucun|non renseigne|non precise|membre|famille)$/.test(normalized)) return '';
        if (!value || value === '0' || value === '-1') return '';

        return inferSingleFamilyMemberFromText(selected);
    }

    function summarizeFamilyMemberRepairReport(report) {
        if (!report) return null;
        return {
            attempted: !!report.attempted,
            repaired: !!report.repaired,
            skipped: !!report.skipped,
            familyMember: report.familyMember || '',
            reason: report.reason || '',
            error: report.error || '',
            currentFamilyMember: report.currentFamilyMember || ''
        };
    }

    function familyMemberUsuallyNeedsBranchInWeda(member) {
        return [
            'grand_pere',
            'grand_mere',
            'oncle',
            'tante',
            'neveu',
            'niece',
            'petit_fils',
            'petite_fille'
        ].includes(getFamilyMemberKind(member));
    }

    async function repairOpenWedaFamilialMemberFromComment(candidate, doc, preferredMember = '') {
        const repair = {
            attempted: false,
            repaired: false,
            skipped: false,
            familyMember: '',
            currentFamilyMember: '',
            reason: '',
            error: ''
        };

        if (!standaloneAtcdCandidateNeedsFamilyMemberRepair(candidate)) {
            repair.skipped = true;
            repair.reason = 'Lien familial déjà affiché ou antécédent non familial.';
            return repair;
        }

        repair.attempted = true;

        try {
            let collateral = findWedaCollateralSelect(doc);
            repair.currentFamilyMember = getCurrentWedaCollateralFamilyMember(collateral);
            if (repair.currentFamilyMember) {
                repair.skipped = true;
                repair.reason = 'Lien familial déjà renseigné dans la fiche WEDA.';
                return repair;
            }

            const textarea = findElementDeep(SELECTOR_WEDA_COMMENT, doc);
            const commentText = normalizeSpaces(textarea && typeof textarea.value === 'string'
                ? textarea.value
                : '');
            const member = preferredMember
                || inferSingleFamilyMemberFromText(commentText)
                || inferSingleFamilyMemberFromText(candidate && candidate.text || '');

            if (!member) {
                repair.skipped = true;
                repair.reason = 'Aucun membre familial unique retrouvé dans le commentaire.';
                return repair;
            }

            repair.familyMember = member;

            if (!collateral) {
                await ensureWedaHeritageChecked({
                    section: 'familial',
                    familyMember: member,
                    description: candidate && candidate.text || ''
                }, doc);
                collateral = await waitFor(() => findWedaCollateralSelect(doc), 8000, 250);
            }

            if (!collateral) {
                repair.error = 'Liste de lien familial WEDA introuvable.';
                return repair;
            }

            const ok = await setWedaCollateral(member, collateral);
            repair.repaired = !!ok;
            if (!ok) {
                repair.error = familyMemberUsuallyNeedsBranchInWeda(member) && !getFamilyMemberBranch(member)
                    ? 'Lien familial détecté, mais côté paternel/maternel absent ou option générique indisponible dans WEDA.'
                    : 'Lien familial détecté mais non affecté dans WEDA.';
            }
            return repair;
        } catch (e) {
            repair.error = e && e.message ? e.message : String(e);
            return repair;
        }
    }

    function findVisibleWedaValidButton(initialDoc = document) {
        const doc = initialDoc || document;
        const direct = doc.querySelector(SELECTOR_WEDA_VALID) || findElementDeep(SELECTOR_WEDA_VALID, doc);
        if (direct && isVisible(direct) && !direct.disabled) return direct;
        return null;
    }

    async function colorOneStandaloneAtcdCandidate(candidate, decision, report) {
        const attempt = {
            at: nowIso(),
            action: 'color_only',
            section: candidate.sectionLabel || sectionLabel(candidate.section),
            text: limitAtcdColorText(candidate.text, 320),
            decisionText: limitAtcdColorText(getStandaloneAtcdColorCandidateDecisionText(candidate), 420),
            codes: (candidate.codes || []).slice(),
            signature: candidate.signature,
            priority: decision.priority,
            color: decision.colorLabel,
            source: decision.source,
            matched: decision.matched || '',
            alreadyColored: false,
            colored: false,
            method: '',
            warning: '',
            error: '',
            familyMemberRepair: null,
            report: null
        };
        report.attempts.push(attempt);

        const alreadyColored = standaloneAtcdLineAlreadyLooksColored(candidate, decision);
        const needsFamilyMemberRepair = standaloneAtcdCandidateNeedsFamilyMemberRepair(candidate);
        const preferredFamilyMember = needsFamilyMemberRepair
            ? inferSingleFamilyMemberFromText(candidate && candidate.text || '')
            : '';

        if (alreadyColored && !needsFamilyMemberRepair) {
            attempt.alreadyColored = true;
            report.alreadyColoredCount += 1;
            return true;
        }

        showBadge(
            alreadyColored
                ? `Correction lien familial\n${limitAtcdColorText(candidate.text, 180)}`
                : `Colorisation ${decision.colorLabel}\n${limitAtcdColorText(candidate.text, 180)}`,
            { duration: 7000 }
        );

        clickElement(candidate.target);
        await waitForWedaIdle(10000);
        await sleep(600);

        const popup = await waitForWedaAntecedentPopup(5000);
        const panel = findWedaAntecedentPanel();
        if (!popup && !panel) {
            attempt.error = 'Fenêtre antécédent WEDA introuvable après sélection.';
            report.failedColorCount += 1;
            logImportEvent('warning', 'weda_color_only_failed', attempt.error, {
                attempt,
                target: describeWedaDomElement(candidate.target)
            });
            return false;
        }

        const doc = (popup && popup.ownerDocument) || (panel && panel.ownerDocument) || candidate.doc || document;
        const familyRepair = await repairOpenWedaFamilialMemberFromComment(candidate, doc, preferredFamilyMember);
        attempt.familyMemberRepair = summarizeFamilyMemberRepairReport(familyRepair);

        if (familyRepair && familyRepair.repaired) {
            report.familyMemberRepairedCount += 1;
            logImportEvent('info', 'familial_member_repair', `Lien familial renseigné depuis le commentaire : ${familyRepair.familyMember}.`, {
                attempt,
                familyRepair: attempt.familyMemberRepair
            });
        } else if (familyRepair && familyRepair.attempted) {
            if (familyRepair.error) report.familyMemberRepairFailedCount += 1;
            else report.familyMemberRepairSkippedCount += 1;
            logImportEvent(familyRepair.error ? 'warning' : 'info', familyRepair.error ? 'familial_member_repair_failed' : 'familial_member_repair_skipped', familyRepair.error || familyRepair.reason || 'Lien familial non modifié.', {
                attempt,
                familyRepair: attempt.familyMemberRepair
            });
        }

        if (alreadyColored) {
            const validButton = await waitFor(() => findVisibleWedaValidButton(doc), 8000, 250);
            if (familyRepair && familyRepair.repaired) {
                if (!validButton) {
                    attempt.error = 'Bouton Valider WEDA introuvable après correction du lien familial.';
                    report.failedColorCount += 1;
                    return false;
                }
                clickElement(validButton);
                await waitForWedaIdle(15000);
                await sleep(1000);
                const closed = await waitForWedaAntecedentPopupClosed(7000);
                if (!closed) {
                    attempt.error = 'La fenêtre antécédent WEDA est restée ouverte après validation du lien familial.';
                    report.failedColorCount += 1;
                    return false;
                }
            } else if (validButton) {
                clickElement(validButton);
                await waitForWedaIdle(8000);
                await sleep(600);
                await waitForWedaAntecedentPopupClosed(5000);
            }

            attempt.alreadyColored = true;
            report.alreadyColoredCount += 1;
            return true;
        }

        const paletteReport = await setAntecedentWedaColorFromPalette(decision.priority);
        attempt.report = summarizeWedaColorReport(paletteReport);

        if (!paletteReport || !paletteReport.applied) {
            attempt.error = paletteReport && paletteReport.reason ? paletteReport.reason : 'Couleur WEDA non appliquée.';
            report.failedColorCount += 1;
            if (familyRepair && familyRepair.repaired) {
                const validButton = await waitFor(() => findVisibleWedaValidButton(doc), 5000, 250);
                if (validButton) {
                    clickElement(validButton);
                    await waitForWedaIdle(10000);
                    await sleep(800);
                    await waitForWedaAntecedentPopupClosed(5000);
                }
            }
            logImportEvent('warning', 'weda_color_only_failed', attempt.error, {
                attempt,
                paletteReport: attempt.report
            });
            return false;
        }

        const validButton = await waitFor(() => findVisibleWedaValidButton(doc), 8000, 250);
        if (!validButton) {
            attempt.error = 'Bouton Valider WEDA introuvable après colorisation.';
            report.failedColorCount += 1;
            logImportEvent('warning', 'weda_color_only_failed', attempt.error, {
                attempt,
                paletteReport: attempt.report
            });
            return false;
        }

        clickElement(validButton);
        await waitForWedaIdle(15000);
        await sleep(1000);

        const closed = await waitForWedaAntecedentPopupClosed(7000);
        if (!closed) {
            attempt.error = 'La fenêtre antécédent WEDA est restée ouverte après validation.';
            report.failedColorCount += 1;
            logImportEvent('warning', 'weda_color_only_failed', attempt.error, {
                attempt,
                paletteReport: attempt.report
            });
            return false;
        }

        attempt.colored = true;
        attempt.method = paletteReport.method || '';
        report.coloredCount += 1;
        logImportEvent('info', 'weda_color_only', `Couleur WEDA appliquée : ${decision.colorLabel}.`, {
            attempt,
            paletteReport: attempt.report
        });
        return true;
    }

    async function startWedaColorOnly(source = 'button') {
        if (!isWeda()) {
            showBadge('Colorisation seule disponible uniquement dans WEDA.', { error: true, duration: 8000 });
            return null;
        }

        if (window.__AUTO_ATCD_CIM10_LMSTUDIO_COLOR_ONLY_RUNNING__) {
            showBadge('Colorisation seule déjà en cours.', { duration: 5000 });
            return gmGetJson(KEY_COLOR_ONLY_LAST_REPORT, null);
        }

        window.__AUTO_ATCD_CIM10_LMSTUDIO_COLOR_ONLY_RUNNING__ = true;

        const startedAt = nowMs();
        const report = {
            id: `color_only_${Date.now()}_${Math.floor(Math.random() * 1000000)}`,
            version: VERSION_AUTO_ATCD_CIM10_LMSTUDIO,
            source,
            status: 'running',
            startedAt,
            startedAtIso: nowIso(),
            finishedAt: null,
            finishedAtIso: '',
            url: window.location.href,
            codedCount: 0,
            coloredCount: 0,
            alreadyColoredCount: 0,
            skippedColorCount: 0,
            failedColorCount: 0,
            familyMemberRepairedCount: 0,
            familyMemberRepairSkippedCount: 0,
            familyMemberRepairFailedCount: 0,
            attempts: [],
            message: ''
        };

        gmSetJson(KEY_COLOR_ONLY_LAST_REPORT, report);

        try {
            const root = await waitForWedaAntecedentRoot(20000);
            if (!root) {
                report.status = 'error';
                report.message = 'Page Antécédents WEDA introuvable.';
                report.finishedAt = nowMs();
                report.finishedAtIso = nowIso();
                gmSetJson(KEY_COLOR_ONLY_LAST_REPORT, report);
                showBadge(report.message, { error: true, duration: 10000 });
                return report;
            }

            await waitForWedaIdle(10000);
            const processedSignatures = new Set();
            showBadge('Colorisation seule des antécédents CIM-10…', { duration: 6000 });

            for (let pass = 1; pass <= MAX_COLOR_ONLY_PASSES; pass += 1) {
                if (nowMs() - startedAt > COLOR_ONLY_TIMEOUT_MS) {
                    report.message = 'Temps maximal atteint pendant la colorisation seule.';
                    break;
                }

                const candidates = collectWedaStandaloneAtcdColorCandidates({ limit: 1000 });
                report.codedCount = candidates.length;

                const candidate = candidates.find(item => item && item.signature && !processedSignatures.has(item.signature));
                if (!candidate) break;

                processedSignatures.add(candidate.signature);

                const decision = decideColorForStandaloneAtcdCandidate(candidate);
                if (!decision) {
                    report.skippedColorCount += 1;
                    report.attempts.push({
                        at: nowIso(),
                        action: 'skip_color_only',
                        section: candidate.sectionLabel || sectionLabel(candidate.section),
                        text: limitAtcdColorText(candidate.text, 320),
                        codes: (candidate.codes || []).slice(),
                        signature: candidate.signature,
                        message: 'Décision couleur impossible.'
                    });
                    continue;
                }

                const colored = await colorOneStandaloneAtcdCandidate(candidate, decision, report);
                if (!colored && findWedaAntecedentPanel()) {
                    report.message = 'Arrêt après échec : une fenêtre antécédent WEDA est restée ouverte.';
                    break;
                }
                await waitForWedaIdle(12000);
                await sleep(650);
            }

            report.finishedAt = nowMs();
            report.finishedAtIso = nowIso();
            report.status = report.failedColorCount ? 'warning' : 'success';
            if (!report.message) {
                report.message = `${report.coloredCount} colorisé(s), ${report.alreadyColoredCount} déjà correct(s), ${report.familyMemberRepairedCount} lien(s) familial(aux) corrigé(s), ${report.skippedColorCount} sans décision, ${report.failedColorCount} échec(s).`;
            }

            gmSetJson(KEY_COLOR_ONLY_LAST_REPORT, report);
            logImportEvent(report.failedColorCount ? 'warning' : 'info', 'weda_color_only_done', 'Colorisation seule terminée.', {
                report: {
                    status: report.status,
                    message: report.message,
                    codedCount: report.codedCount,
                    coloredCount: report.coloredCount,
                    alreadyColoredCount: report.alreadyColoredCount,
                    skippedColorCount: report.skippedColorCount,
                    failedColorCount: report.failedColorCount,
                    familyMemberRepairedCount: report.familyMemberRepairedCount,
                    familyMemberRepairSkippedCount: report.familyMemberRepairSkippedCount,
                    familyMemberRepairFailedCount: report.familyMemberRepairFailedCount
                }
            });
            showBadge(`Colorisation seule terminée.\n${report.message}`, {
                error: report.status === 'error',
                duration: 10000
            });
            return report;
        } catch (e) {
            report.status = 'error';
            report.finishedAt = nowMs();
            report.finishedAtIso = nowIso();
            report.message = e && e.message ? e.message : String(e);
            gmSetJson(KEY_COLOR_ONLY_LAST_REPORT, report);
            logImportEvent('error', 'weda_color_only_error', report.message, {
                stack: e && e.stack ? String(e.stack).slice(0, 2000) : ''
            });
            showBadge(`Erreur colorisation seule.\n${report.message}`, { error: true, duration: 12000 });
            return report;
        } finally {
            window.__AUTO_ATCD_CIM10_LMSTUDIO_COLOR_ONLY_RUNNING__ = false;
        }
    }

    async function fillWedaAntecedentPopup(item, job = null) {
        let textarea = await waitFor(() => {
            const el = findElementDeep(SELECTOR_WEDA_COMMENT);
            return el && isVisible(el) ? el : null;
        }, 15000, 300);

        if (!textarea) throw new Error('Fenêtre de détail antécédent WEDA introuvable.');

        let doc = textarea.ownerDocument || document;
        if (job) assertPatientIdentityMatchesJob(job, 'before_fill_popup', item);

        showBadge(`Remplissage détail : ${item.description} [${item.code}]`, { duration: 5000 });

        if (item.section === 'familial') {
            await setWedaFamilialFields(item, doc);

            textarea = await waitFor(() => {
                const el = findElementDeep(SELECTOR_WEDA_COMMENT);
                return el && isVisible(el) ? el : null;
            }, 8000, 300);

            if (!textarea) throw new Error('Champ commentaire WEDA introuvable après activation familiale.');

            doc = textarea.ownerDocument || document;
        }

        if (job) assertPatientIdentityMatchesJob(job, 'before_fill_popup_fields', item);

        if (item.lateralite) setWedaLateralite(item.lateralite, doc);

        if (item.date) {
            const dateOk = setWedaDatePonctuelle(item.date, doc);
            if (!dateOk) {
                logImportEvent('warning', 'fill_popup_date', 'Champ date ponctuelle WEDA non renseigné.', {
                    item,
                    date: item.date,
                    selector: SELECTOR_WEDA_DATE_PONCTUELLE,
                    dateField: getWedaDatePonctuelleState(doc)
                });
            }
        }

        textarea.focus();
        const rawCommentValue = Object.prototype.hasOwnProperty.call(item, 'comment')
            ? item.comment
            : (item.description || '');
        const commentValue = buildWedaCommentForFill(item, rawCommentValue);
        item.comment = commentValue;
        setNativeValue(textarea, commentValue);


        const valid = await waitFor(() => {
            const btn = doc.querySelector(SELECTOR_WEDA_VALID) || findElementDeep(SELECTOR_WEDA_VALID);
            return btn && isVisible(btn) ? btn : null;
        }, 10000, 300);

        if (!valid) throw new Error('Bouton Valider WEDA introuvable.');

        return valid;
    }

    async function validateWedaAntecedentPopup(validButton, item) {
        showBadge(`Validation WEDA : ${item.description} [${item.code}]`, { duration: 5000 });
        clickElement(validButton);

        await waitForWedaIdle(15000);
        await sleep(1200);

        const closed = await waitForWedaAntecedentPopupClosed(7000);

        if (!closed) {
            throw new Error(
                'La popup WEDA est restée ouverte après validation : import non confirmé pour ' +
                item.description + ' [' + item.code + '].'
            );
        }

        return true;
    }

    function isStandaloneCim10CodeText(text) {
        const raw = normalizeSpaces(text);
        if (!raw) return false;
        if (!extractCim10CodesFromText(raw).length) return false;

        const withoutCodes = normalizeSpaces(raw
            .replace(/\[[A-Z][A-Z0-9]{0,3}(?:\.[A-Z0-9]+)?(?:-[A-Z][A-Z0-9]{0,3}(?:\.[A-Z0-9]+)?)?\]/gi, '')
            .replace(/[()[\]{}.,;:\s-]+/g, ' ')
        );

        return !withoutCodes;
    }

    function elementHasNoControleIcon(el) {
        if (!el) return false;
        if (isNoControleIcon(el)) return true;

        try {
            return Array.from(el.querySelectorAll ? el.querySelectorAll('*') : [])
                .some(candidate => isNoControleIcon(candidate));
        } catch (_) {
            return false;
        }
    }

    function buildNoControleContainerSet(root) {
        const containers = new Set();

        try {
            Array.from(root.querySelectorAll('*'))
                .filter(isNoControleIcon)
                .forEach(icon => {
                    const row = icon.closest ? icon.closest('tr, li, [role="row"]') : null;
                    if (row) {
                        containers.add(row);
                        return;
                    }

                    let p = icon.parentElement;
                    let depth = 0;
                    while (p && p !== root && depth < 5) {
                        const tag = String(p.tagName || '').toLowerCase();
                        const text = normalizeSpaces(p.innerText || p.textContent || '');
                        if (tag !== 'table' && text && text.length <= 900) {
                            containers.add(p);
                            return;
                        }
                        p = p.parentElement;
                        depth++;
                    }
                });
        } catch (_) {}

        return containers;
    }

    function describeWedaDomElement(el) {
        if (!el) return null;

        return {
            tag: String(el.tagName || '').toLowerCase(),
            id: el.id || '',
            className: String(el.className || '').slice(0, 160),
            title: el.getAttribute ? String(el.getAttribute('title') || '').slice(0, 160) : '',
            alt: el.getAttribute ? String(el.getAttribute('alt') || '').slice(0, 160) : ''
        };
    }

    function findNoControleDiagnosticContainer(icon, root) {
        if (!icon) return null;

        const row = icon.closest ? icon.closest('tr, li, [role="row"]') : null;
        if (row) return row;

        let p = icon.parentElement;
        let depth = 0;

        while (p && p !== root && depth < 5) {
            const tag = String(p.tagName || '').toLowerCase();
            const text = normalizeSpaces(p.innerText || p.textContent || '');

            if (tag !== 'table' && text && text.length <= 900) return p;

            p = p.parentElement;
            depth++;
        }

        return icon.parentElement || icon;
    }

    function collectWedaNoControleDiagnosticBlocks(limit = IMPORT_DIAGNOSTIC_BLOCK_LIMIT) {
        const root = getWedaAntecedentRoot() || document.body;
        const seen = new Set();
        const blocks = [];

        try {
            for (const icon of Array.from(root.querySelectorAll('*')).filter(isNoControleIcon)) {
                const container = findNoControleDiagnosticContainer(icon, root);
                const text = normalizeSpaces(container ? (container.innerText || container.textContent || '') : '');
                const key = normalizeForMatch(text);

                if (!text || !key || seen.has(key)) continue;
                seen.add(key);

                blocks.push({
                    text: text.slice(0, 320),
                    normalizedText: key.slice(0, 320),
                    codes: extractCim10CodesFromText(text),
                    icon: describeWedaDomElement(icon),
                    container: describeWedaDomElement(container)
                });

                if (blocks.length >= limit) break;
            }
        } catch (_) {}

        return blocks;
    }

    function toWedaNoControleQualityBlock(block, section = null, source = 'no_controle') {
        if (!block) return null;

        const text = normalizeSpaces(block.text || '');
        if (!text) return null;

        return {
            text,
            normalizedText: block.normalizedText || normalizeForMatch(text),
            codes: block.codes || extractCim10CodesFromText(text),
            tag: block.container && block.container.tag || '',
            id: block.container && block.container.id || '',
            className: block.container && block.container.className || '',
            section: section || null,
            source,
            icon: block.icon,
            container: block.container
        };
    }

    function noControleBlockHasFamilyMemberText(block) {
        const n = block && (block.normalizedText || normalizeForMatch(block.text || ''));
        if (!n) return false;
        return /\b(pere|mere|frere|soeur|fils|fille|enfant|parent|grand\s+pere|grand\s+mere|grand\s+parent|oncle|tante|cousin|cousine|famille|familial|familiale)\b/.test(n);
    }

    function isLikelyImportedFamilialNoControleBlock(block) {
        if (!block) return false;

        const text = String(block.text || '');
        if (!text || /\[ATCD\]/i.test(text)) return false;

        const codes = (block.codes || extractCim10CodesFromText(text)).map(normalizeCim10Code);
        if (!codes.some(isLikelyCim10Code)) return false;

        const normalizedText = block.normalizedText || normalizeForMatch(text);
        return /^\s*[-–]/.test(text)
            || /\b(pere|mere|frere|soeur|grand\s+pere|grand\s+mere|oncle|tante|cousin|cousine)\b/.test(normalizedText);
    }

    function collectWedaFamilialNoControleBlocks(limit = 200) {
        return collectWedaNoControleDiagnosticBlocks(limit)
            .map(block => toWedaNoControleQualityBlock(block, 'familial', 'no_controle_familial'))
            .filter(isLikelyImportedFamilialNoControleBlock);
    }

    function collectWedaNonFamilialNoControleBlocks(limit = 200) {
        return collectWedaNoControleDiagnosticBlocks(limit)
            .map(block => toWedaNoControleQualityBlock(block, null, 'no_controle'))
            .filter(block => block && !noControleBlockHasFamilyMemberText(block));
    }

    function isInsideNoControleContainer(el, containers) {
        if (!el || !containers || !containers.size) return false;
        if (elementHasNoControleIcon(el)) return true;

        const row = el.closest ? el.closest('tr, li, [role="row"]') : null;
        if (row && elementHasNoControleIcon(row)) return true;

        for (const container of containers) {
            if (container === el || (container.contains && container.contains(el))) return true;
        }

        return false;
    }

    function findStructuredWedaAntecedentContainer(codeSpan, root, noControleContainers) {
        if (!codeSpan) return null;

        const candidates = [];
        const seen = new Set();

        function add(el, priority) {
            if (!el || seen.has(el)) return;
            if (root && el === root) return;
            seen.add(el);
            candidates.push({ el, priority });
        }

        try { add(codeSpan.closest('tr, li, [role="row"]'), 0); } catch (_) {}
        try { add(codeSpan.closest('table'), 20); } catch (_) {}

        let p = codeSpan.parentElement;
        let depth = 0;
        while (p && p !== root && depth < 8) {
            add(p, 10 + depth);
            p = p.parentElement;
            depth++;
        }

        const viable = [];
        for (const candidate of candidates) {
            const el = candidate.el;
            if (!el) continue;
            if (isInsideNoControleContainer(el, noControleContainers)) continue;
            if (!elementHasPathologieIcon(el)) continue;

            const codes = extractStructuredWedaCim10CodesFromElement(el);
            if (!codes.length) continue;

            const text = normalizeSpaces(el.innerText || el.textContent || '');
            if (!text || text.length < 4 || text.length > 1600) continue;
            if (isStandaloneCim10CodeText(text)) continue;

            viable.push({
                el,
                priority: candidate.priority,
                textLength: text.length
            });
        }

        viable.sort((a, b) => {
            if (a.textLength !== b.textLength) return a.textLength - b.textLength;
            return a.priority - b.priority;
        });

        return viable.length ? viable[0].el : null;
    }

    function collectWedaImportedAntecedentBlocks() {
        const root = getWedaAntecedentRoot() || document.body;
        const noControleContainers = buildNoControleContainerSet(root);
        const blocks = [];
        const elements = Array.from(root.querySelectorAll('*'));
        const seen = new Set();
        let currentSection = null;

        for (const el of elements) {
            const detectedSection = detectSectionHeader(el);
            if (detectedSection) {
                currentSection = detectedSection === '__other__' ? null : detectedSection;
                continue;
            }

            try {
                if (el.matches(SELECTOR_WEDA_CIM10_TREE) || el.closest(SELECTOR_WEDA_CIM10_TREE)) continue;
                if (el.querySelector && el.querySelector(SELECTOR_WEDA_CIM10_TREE)) continue;
            } catch (_) {}

            if (!isStructuredWedaCim10CodeSpan(el)) continue;
            if (isInsideNoControleContainer(el, noControleContainers)) continue;

            const container = findStructuredWedaAntecedentContainer(el, root, noControleContainers);
            if (!container) continue;

            const text = normalizeSpaces(container.innerText || container.textContent || '');
            if (!text || text.length < 4 || text.length > 1600) continue;

            const codes = extractStructuredWedaCim10CodesFromElement(container);
            if (!codes.length) continue;
            if (isStandaloneCim10CodeText(text)) continue;

            const normalizedText = normalizeForMatch(text);
            const key = `${codes.join('|')}|${normalizedText}`;
            if (!key || seen.has(key)) continue;
            seen.add(key);

            blocks.push({
                el: container,
                target: getWedaAntecedentSelectableTarget(container, root),
                text,
                normalizedText,
                codes,
                tag: String(container.tagName || '').toLowerCase(),
                id: container.id || '',
                className: String(container.className || '').slice(0, 160),
                section: currentSection || null,
                source: 'element',
                structuredCim10: true
            });
        }

        blocks.sort((a, b) => a.text.length - b.text.length);
        return blocks;
    }

    function blockHasAnyExpectedCode(block, expectedCodes) {
        const blockCodes = (block && block.codes || []).map(normalizeCim10Code);
        const wantedCodes = (expectedCodes || []).map(normalizeCim10Code).filter(Boolean);
        return wantedCodes.some(code => blockCodes.includes(code))
            || cim10CodeListHasCloseDuplicateMatch(blockCodes, wantedCodes);
    }

    function summarizeDiagnosticBlock(block) {
        if (!block) return null;

        return {
            text: String(block.text || '').slice(0, 320),
            codes: block.codes || [],
            section: block.section || null,
            source: block.source || '',
            tag: block.tag || '',
            className: block.className || ''
        };
    }

    function buildWedaItemDomDiagnostic(item, codes = []) {
        const expectedCodes = [];
        const contextText = [
            item && item.description || '',
            item && item.comment || '',
            item && item.remarks || '',
            item && item.familyMember || ''
        ].join(' ');

        function add(code) {
            const normalized = normalizeCim10Code(code);
            if (normalized && !expectedCodes.includes(normalized)) expectedCodes.push(normalized);
            getQualityCim10EquivalentCodes(normalized, contextText).forEach(equivalent => {
                if (equivalent && !expectedCodes.includes(equivalent)) expectedCodes.push(equivalent);
            });
        }

        codes.forEach(add);
        add(item && item.code);

        const importedBlocks = collectWedaImportedAntecedentBlocks();
        const noControleBlocks = collectWedaNoControleDiagnosticBlocks(IMPORT_DIAGNOSTIC_BLOCK_LIMIT);
        const importedCodeCandidates = importedBlocks.filter(block => blockHasAnyExpectedCode(block, expectedCodes));
        const noControleTextNorm = normalizeForMatch([
            item && item.description || '',
            item && item.remarks || '',
            item && item.familyMember || ''
        ].join(' '));
        const noControleCandidates = noControleBlocks.filter(block => {
            if (blockHasAnyExpectedCode(block, expectedCodes)) return true;
            const n = block.normalizedText || normalizeForMatch(block.text || '');
            return noControleTextNorm && noControleTextNorm.split(/\s+/).filter(Boolean).some(token => token.length >= 4 && n.includes(token));
        });
        const importedMatches = importedBlocks.filter(block => wedaBlockMatchesImportedItem(block, item, expectedCodes));
        const noControleQualityBlocks = item && item.section === 'familial'
            ? noControleBlocks
                .map(block => toWedaNoControleQualityBlock(block, 'familial', 'no_controle_familial'))
                .filter(isLikelyImportedFamilialNoControleBlock)
            : noControleBlocks
                .map(block => toWedaNoControleQualityBlock(block, null, 'no_controle'))
                .filter(block => block && !noControleBlockHasFamilyMemberText(block));
        const noControleMatches = noControleQualityBlocks.filter(block => wedaBlockMatchesImportedItem(block, item, expectedCodes));

        return {
            expectedCodes,
            importedBlockCount: importedBlocks.length,
            noControleBlockCount: noControleBlocks.length,
            importedMatches: importedMatches.slice(0, 6).map(summarizeDiagnosticBlock),
            noControleMatches: noControleMatches.slice(0, 6).map(summarizeDiagnosticBlock),
            importedCodeCandidates: importedCodeCandidates.slice(0, 8).map(summarizeDiagnosticBlock),
            noControleCandidates: noControleCandidates.slice(0, 8).map(block => ({
                text: String(block.text || '').slice(0, 320),
                codes: block.codes || [],
                icon: block.icon,
                container: block.container
            })),
            importedSample: importedBlocks.slice(0, 8).map(summarizeDiagnosticBlock),
            noControleSample: noControleBlocks.slice(0, 8).map(block => ({
                text: String(block.text || '').slice(0, 260),
                codes: block.codes || []
            }))
        };
    }

    function diagnosticHasConfirmedWedaMatch(diagnostic) {
        if (!diagnostic) return false;
        return !!(
            (diagnostic.importedMatches && diagnostic.importedMatches.length)
            || (diagnostic.noControleMatches && diagnostic.noControleMatches.length)
        );
    }

    function recordHasPostImportDomConfirmation(record, item) {
        if (!record) return false;
        const contextItem = item || record.item || {};
        const diagnostic = record.postImportDiagnostic || {};

        if (record.postImportFound === true) return true;
        if (Array.isArray(diagnostic.importedMatches) && diagnostic.importedMatches.length) return true;
        if (
            contextItem.section === 'familial'
            && Array.isArray(diagnostic.noControleMatches)
            && diagnostic.noControleMatches.length
        ) {
            return true;
        }

        return false;
    }

    function getImportedRecordsByAtcdKey(job) {
        const map = new Map();
        const records = Array.isArray(job && job.imported) ? job.imported : [];

        for (const record of records) {
            const item = record && record.item;
            if (!item) continue;

            const key = getAtcdDedupeKey(item);
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(record);
        }

        return map;
    }

    function getQualityConfirmationRecords(job) {
        return (Array.isArray(job && job.imported) ? job.imported : [])
            .filter(record => recordHasPostImportDomConfirmation(record, record && record.item));
    }

    function qualityRecordMatchesItem(record, item, expectedCodes) {
        const recordItem = record && record.item;
        if (!recordItem || !item) return false;
        if (!recordHasPostImportDomConfirmation(record, item)) return false;
        if (!sameFamilyContextForDuplicate(item, recordItem)) return false;
        if (duplicateDatesConflictForItems(item, recordItem)) return false;

        const recordCodes = getRecordDuplicateCodes(record);
        if (!cim10CodeListHasCloseDuplicateMatch(recordCodes, expectedCodes || [item.code])) return false;

        const expectedComment = getExpectedDuplicateCommentForSimilarity(item) || normalizeForMatch(item.description || '');
        const recordComment = getRecordDuplicateComment(record) || getExpectedDuplicateCommentForSimilarity(recordItem) || normalizeForMatch(recordItem.description || '');
        if (!expectedComment || !recordComment) return false;
        if (expectedComment === recordComment) return true;

        if (qualityTextMatchesToken(recordComment, item.description || '')) return true;
        if (qualityTextMatchesToken(recordComment, item.comment || '')) return true;
        if (qualityTextMatchesToken(recordComment, item.remarks || '')) return true;
        if (qualityTextMatchesToken(expectedComment, recordItem.description || '')) return true;
        if (qualityTextMatchesToken(expectedComment, recordItem.comment || '')) return true;
        if (qualityTextMatchesToken(expectedComment, recordItem.remarks || '')) return true;

        const overlap = getDuplicateCommentOverlap(expectedComment, recordComment);
        return !!(overlap && (overlap.matches || overlap.highSimilarity));
    }

    function findJobQualityConfirmationRecords(job, item, expectedCodes) {
        const records = getQualityConfirmationRecords(job);
        const matches = [];
        const seen = new Set();

        for (const record of records) {
            if (!qualityRecordMatchesItem(record, item, expectedCodes)) continue;

            const key = [
                record.at || '',
                record.qualityPass || '',
                getAtcdDedupeKey(record.item || {}),
                getRecordDuplicateCodes(record).join(',')
            ].join('|');
            if (seen.has(key)) continue;
            seen.add(key);
            matches.push(record);
        }

        return matches;
    }

    function normalizeFamilyMemberForQuality(text) {
        let n = normalizeForMatch(text);
        n = n
            .replace(/\bgrand\s+(pere|mere)\s*\(\s*p\s*\)/g, 'grand $1 paternel')
            .replace(/\bgrand\s+(pere|mere)\s*\(\s*m\s*\)/g, 'grand $1 maternel')
            .replace(/\bgrand\s+(pere|mere)\s+p\b/g, 'grand $1 paternel')
            .replace(/\bgrand\s+(pere|mere)\s+m\b/g, 'grand $1 maternel')
            .replace(/\b(oncle|tante|neveu|niece|cousin|cousine)\s*\(\s*p\s*\)/g, '$1 paternel')
            .replace(/\b(oncle|tante|neveu|niece|cousin|cousine)\s*\(\s*m\s*\)/g, '$1 maternel')
            .replace(/\b(oncle|tante|neveu|niece|cousin|cousine)\s+p\b/g, '$1 paternel')
            .replace(/\b(oncle|tante|neveu|niece|cousin|cousine)\s+m\b/g, '$1 maternel');
        return normalizeForMatch(n);
    }

    function normalizedFamilyMemberHasBranch(textNorm, branch) {
        if (!textNorm || !branch) return false;
        if (branch === 'paternel') return /\b(paternel|paternelle|paternels|paternelles|pat|p)\b/.test(textNorm);
        if (branch === 'maternel') return /\b(maternel|maternelle|maternels|maternelles|mat|m)\b/.test(textNorm);
        return false;
    }

    function normalizedFamilyMemberBranchConflicts(textNorm, branch) {
        if (!textNorm || !branch) return false;
        return branch === 'paternel'
            ? normalizedFamilyMemberHasBranch(textNorm, 'maternel')
            : normalizedFamilyMemberHasBranch(textNorm, 'paternel');
    }

    function normalizedTextMatchesFamilyKindAndBranch(textNorm, memberNorm) {
        const kind = getFamilyMemberKind(memberNorm);
        if (!kind) return false;
        if (![
            'grand_pere',
            'grand_mere',
            'petit_fils',
            'petite_fille',
            'oncle',
            'tante',
            'neveu',
            'niece',
            'cousin',
            'cousine',
            'beau_pere',
            'belle_mere',
            'beau_fils',
            'belle_fille',
            'demi_frere',
            'demi_soeur'
        ].includes(kind)) return false;

        const kindRegex = familyMemberKindRegex(kind);
        if (!kindRegex || !kindRegex.test(textNorm)) return false;

        const branch = getFamilyMemberBranch(memberNorm);
        if (!branch) return true;

        if (normalizedFamilyMemberBranchConflicts(textNorm, branch)) return false;
        return normalizedFamilyMemberHasBranch(textNorm, branch);
    }

    function normalizedTextHasExactFamilyMember(textOrNorm, member) {
        const textNorm = normalizeFamilyMemberForQuality(textOrNorm);
        const memberNorm = normalizeFamilyMemberForQuality(member);

        if (!textNorm || !memberNorm) return false;

        if (normalizedTextMatchesFamilyKindAndBranch(textNorm, memberNorm)) return true;

        if (memberNorm === 'pere') {
            return /\bpere\b/.test(textNorm) && !/\b(grand|beau)\s+pere\b/.test(textNorm);
        }

        if (memberNorm === 'mere') {
            return /\bmere\b/.test(textNorm) && !/\b(grand|belle)\s+mere\b/.test(textNorm);
        }

        if (memberNorm === 'frere') {
            return /\bfrere\b/.test(textNorm) && !/\bdemi\s+frere\b/.test(textNorm);
        }

        if (memberNorm === 'soeur') {
            return /\bsoeur\b/.test(textNorm) && !/\bdemi\s+soeur\b/.test(textNorm);
        }

        if (/^grand pere(?:\s+(paternel|paternelle|maternel|maternelle))?$/.test(memberNorm)) {
            if (!/\bgrand\s+pere\b/.test(textNorm)) return false;
            if (/\b(paternel|paternelle)\b/.test(memberNorm)) {
                return !/\b(maternel|maternelle)\b/.test(textNorm);
            }
            if (/\b(maternel|maternelle)\b/.test(memberNorm)) {
                return !/\b(paternel|paternelle)\b/.test(textNorm);
            }
            return true;
        }

        if (/^grand mere(?:\s+(paternel|paternelle|maternel|maternelle))?$/.test(memberNorm)) {
            if (!/\bgrand\s+mere\b/.test(textNorm)) return false;
            if (/\b(paternel|paternelle)\b/.test(memberNorm)) {
                return !/\b(maternel|maternelle)\b/.test(textNorm);
            }
            if (/\b(maternel|maternelle)\b/.test(memberNorm)) {
                return !/\b(paternel|paternelle)\b/.test(textNorm);
            }
            return true;
        }

        if (memberNorm === 'demi frere') return /\bdemi\s+frere\b/.test(textNorm);
        if (memberNorm === 'demi soeur') return /\bdemi\s+soeur\b/.test(textNorm);
        if (memberNorm === 'beau pere') return /\bbeau\s+pere\b/.test(textNorm);
        if (memberNorm === 'belle mere') return /\bbelle\s+mere\b/.test(textNorm);
        if (memberNorm === 'petit fils') return /\bpetit\s+fils\b/.test(textNorm);
        if (memberNorm === 'petite fille') return /\bpetite\s+fille\b/.test(textNorm);

        return (` ${textNorm} `).includes(` ${memberNorm} `);
    }

    function getExpectedCim10CodesForQuality(item, importedRecords) {
        const codes = [];
        const contextText = [
            item && item.description || '',
            item && item.comment || '',
            item && item.remarks || '',
            item && item.familyMember || ''
        ].join(' ');

        function add(code) {
            const normalized = normalizeCim10Code(code);
            if (normalized && !codes.includes(normalized)) codes.push(normalized);
            getQualityCim10EquivalentCodes(normalized, contextText).forEach(equivalent => {
                if (equivalent && !codes.includes(equivalent)) codes.push(equivalent);
            });
        }

        (importedRecords || []).forEach(record => {
            add(record && record.cim10 && record.cim10.matchedCode);
            add(record && record.cim10 && record.cim10.originalCode);
        });

        add(item && item.code);

        return codes;
    }

    function qualityTextMatchesToken(blockNorm, text, options = {}) {
        const n = normalizeForMatch(text);
        if (!n) return !!options.emptyIsOk;

        const expandedBlock = expandMedicalSynonyms(blockNorm);
        const expandedNeedle = expandMedicalSynonyms(n);

        if (expandedBlock.includes(expandedNeedle)) return true;

        const tokens = expandedNeedle
            .split(/\s+/)
            .filter(token => token.length >= 3 && !['avec', 'sans', 'pour', 'date', 'precision', 'primitive'].includes(token));

        if (!tokens.length) return false;

        const hits = tokens.filter(token => expandedBlock.includes(token)).length;
        return hits >= Math.min(tokens.length, 2);
    }

    function normalizeAtcdDuplicateComment(text) {
        const lines = String(text || '')
            .split(/\r?\n/)
            .map(line => normalizeSpaces(line))
            .filter(Boolean)
            .filter(line => {
                const n = normalizeForMatch(line);
                if (!n) return false;
                if (/^[pcmf]$/.test(n)) return false;
                if (/^date\b/.test(n) && normalizeWedaDateValue(line)) return false;
                if (extractCim10CodesFromText(line).length) return false;
                if (/^antecedents?\s+(personnels|medicaux|chirurgicaux|familiaux)\b/.test(n)) return false;
                if (/^atcd\s+(medicaux|chirurgicaux|familiaux)\b/.test(n)) return false;
                return true;
            });

        return normalizeForMatch(lines.join('\n'));
    }

    function getExpectedDuplicateComment(item) {
        if (!item) return '';

        const candidates = [
            item.comment,
            buildWedaComment(item),
            [
                item.description || '',
                item.remarks || ''
            ].filter(Boolean).join('\n')
        ];

        for (const candidate of candidates) {
            const normalized = normalizeAtcdDuplicateComment(candidate);
            if (normalized) return normalized;
        }

        return '';
    }

    function getBlockDuplicateComment(block) {
        return normalizeAtcdDuplicateComment(block && block.text || '');
    }

    function getRecordDuplicateComment(record) {
        const item = record && record.item;
        return getExpectedDuplicateComment(item);
    }

    function getRecordDuplicateCodes(record) {
        const codes = [];

        function add(code) {
            const normalized = normalizeCim10Code(code);
            if (normalized && !codes.includes(normalized)) codes.push(normalized);
        }

        add(record && record.cim10 && record.cim10.matchedCode);
        add(record && record.cim10 && record.cim10.originalCode);
        add(record && record.item && record.item.code);

        return codes;
    }

    function isStrongDuplicateComment(comment) {
        const text = normalizeForMatch(comment);
        if (text.length < 12) return false;

        const tokens = text
            .split(/\s+/)
            .filter(token => token.length >= 3 && !['avec', 'sans', 'pour', 'date'].includes(token));

        return tokens.length >= 2;
    }

    function isUsableHighSimilarityDuplicateComment(comment) {
        const text = normalizeForMatch(comment);
        if (text.length < 5) return false;
        return tokenizeDuplicateCommentForOverlap(text).length >= 1;
    }

    function extractDuplicateExplicitDateFromText(text) {
        const raw = String(text || '');
        if (!normalizeSpaces(raw)) return '';

        const fullDateRegex = /\b([0-3]?\d)[\/.-]([01]?\d)[\/.-]((?:19|20)\d{2})\b/g;
        let fullDateMatch;
        while ((fullDateMatch = fullDateRegex.exec(raw)) !== null) {
            const normalized = normalizeWedaDateValue(`${fullDateMatch[1]}/${fullDateMatch[2]}/${fullDateMatch[3]}`);
            if (normalized) return normalized;
        }

        const yearMatch = raw.match(/\b((?:19|20)\d{2})\b/);
        return yearMatch ? normalizeWedaDateValue(yearMatch[1]) : '';
    }

    function getItemDuplicateDate(item) {
        if (!item) return '';

        const directDate = normalizeWedaDateValue(item.date || '');
        if (directDate) return directDate;

        if (item.year) {
            const yearDate = normalizeWedaDateValue(String(item.year));
            if (yearDate) return yearDate;
        }

        return extractDuplicateExplicitDateFromText([
            item.comment || '',
            item.remarks || '',
            item.description || '',
            item.raw || ''
        ].filter(Boolean).join('\n'));
    }

    function getBlockDuplicateDate(block) {
        return extractDuplicateExplicitDateFromText(block && block.text || '');
    }

    function duplicateDatesConflict(leftDate, rightDate) {
        return !!(leftDate && rightDate && leftDate !== rightDate);
    }

    function duplicateDatesConflictForItemAndBlock(item, block) {
        return duplicateDatesConflict(getItemDuplicateDate(item), getBlockDuplicateDate(block));
    }

    function duplicateDatesConflictForItems(left, right) {
        return duplicateDatesConflict(getItemDuplicateDate(left), getItemDuplicateDate(right));
    }

    function tokenizeDuplicateCommentForOverlap(comment) {
        const cleaned = String(comment || '')
            .replace(/\b[0-3]?\d[\/.-][01]?\d[\/.-](?:19|20)\d{2}\b/g, ' ')
            .replace(/\b(?:19|20)\d{2}\b/g, ' ');
        const stop = new Set([
            'date', 'lateralite', 'lateralites', 'droite', 'gauche', 'bilaterale',
            'bilaterales', 'precision', 'precisions', 'controle', 'non', 'pris',
            'prise', 'compte', 'securisation', 'cim', 'code', 'codes'
        ]);
        const seen = new Set();
        const tokens = [];

        for (const token of tokenizeForSimilarity(cleaned)) {
            if (!token || stop.has(token) || seen.has(token)) continue;
            seen.add(token);
            tokens.push(token);
        }

        return tokens;
    }

    function getDuplicateCommentOverlap(leftComment, rightComment) {
        const leftTokens = tokenizeDuplicateCommentForOverlap(leftComment);
        const rightTokens = tokenizeDuplicateCommentForOverlap(rightComment);
        const rightSet = new Set(rightTokens);
        const commonTokens = leftTokens.filter(token => rightSet.has(token));
        const leftRatio = leftTokens.length ? commonTokens.length / leftTokens.length : 0;
        const rightRatio = rightTokens.length ? commonTokens.length / rightTokens.length : 0;
        const ratio = Math.max(leftRatio, rightRatio);
        const symmetricRatio = Math.min(leftRatio, rightRatio);
        const highSimilarityMinCommon = Math.max(1, Math.min(
            DUPLICATE_FUZZY_COMMENT_MIN_COMMON_TOKENS,
            leftTokens.length,
            rightTokens.length
        ));

        return {
            matches: commonTokens.length >= DUPLICATE_FUZZY_COMMENT_MIN_COMMON_TOKENS
                && ratio >= DUPLICATE_FUZZY_COMMENT_MIN_RATIO,
            highSimilarity: commonTokens.length >= highSimilarityMinCommon
                && symmetricRatio >= DUPLICATE_HIGH_COMMENT_MIN_RATIO,
            ratio,
            percent: Math.round(ratio * 100),
            symmetricRatio,
            symmetricPercent: Math.round(symmetricRatio * 100),
            leftRatio,
            rightRatio,
            commonCount: commonTokens.length,
            leftTokenCount: leftTokens.length,
            rightTokenCount: rightTokens.length,
            commonTokens
        };
    }

    function duplicateCommentOverlapIsHighSimilarity(overlap) {
        return !!(overlap && overlap.highSimilarity);
    }

    function sameFamilyContextForDuplicate(left, right) {
        if (!left || !right) return true;
        if (left.section !== 'familial' && right.section !== 'familial') return true;
        if (left.section !== right.section) return false;
        return normalizeForMatch(left.familyMember || '') === normalizeForMatch(right.familyMember || '');
    }

    function blockMatchesFamilyContextForHighCommentDuplicate(block, item) {
        if (!block || !item) return false;

        if (item.section === 'familial') {
            if (block.section && block.section !== 'familial') return false;
            if (item.familyMember && !normalizedTextHasExactFamilyMember(block.normalizedText || block.text || '', item.familyMember)) return false;
            return true;
        }

        return block.section !== 'familial';
    }

    function stripDuplicateFamilyMemberFromComment(comment, familyMember) {
        let text = normalizeFamilyMemberForQuality(comment);
        const member = normalizeFamilyMemberForQuality(familyMember);
        if (!text || !member) return text;

        text = text.replace(new RegExp('\\b' + escapeRegex(member) + '\\b', 'g'), ' ');

        if (member === 'pere') text = text.replace(/\bpere\b/g, ' ');
        if (member === 'mere') text = text.replace(/\bmere\b/g, ' ');
        if (member === 'frere') text = text.replace(/\bfrere\b/g, ' ');
        if (member === 'soeur') text = text.replace(/\bsoeur\b/g, ' ');

        return normalizeForMatch(text);
    }

    function getExpectedDuplicateCommentForSimilarity(item) {
        const comment = getExpectedDuplicateComment(item);
        return item && item.section === 'familial'
            ? stripDuplicateFamilyMemberFromComment(comment, item.familyMember || '')
            : comment;
    }

    function getBlockDuplicateCommentForSimilarity(block, item) {
        const comment = getBlockDuplicateComment(block);
        return item && item.section === 'familial'
            ? stripDuplicateFamilyMemberFromComment(comment, item.familyMember || '')
            : comment;
    }

    function blockHasExactCodeAndCommentDuplicate(block, item, expectedCodes) {
        if (!block || !item) return false;
        if (isStandaloneCim10CodeText(block.text || '')) return false;
        if (duplicateDatesConflictForItemAndBlock(item, block)) return false;

        const blockCodes = (block.codes || []).map(normalizeCim10Code);
        const hasCode = expectedCodes.some(code => blockCodes.includes(normalizeCim10Code(code)));
        if (!hasCode) return false;

        if (item.section === 'familial') {
            if (block.section && block.section !== 'familial') return false;
            if (item.familyMember && !normalizedTextHasExactFamilyMember(block.normalizedText || block.text || '', item.familyMember)) return false;
        }

        const expectedComment = getExpectedDuplicateComment(item);
        if (!expectedComment) return false;

        return getBlockDuplicateComment(block) === expectedComment;
    }

    function blockHasCloseCodeAndExactCommentDuplicate(block, item, expectedCodes) {
        if (!block || !item) return false;
        if (isStandaloneCim10CodeText(block.text || '')) return false;
        if (duplicateDatesConflictForItemAndBlock(item, block)) return false;

        const expectedComment = getExpectedDuplicateComment(item);
        if (!isStrongDuplicateComment(expectedComment)) return false;
        if (getBlockDuplicateComment(block) !== expectedComment) return false;

        const blockCodes = (block.codes || []).map(normalizeCim10Code);
        if (!cim10CodeListHasCloseDuplicateMatch(blockCodes, expectedCodes)) return false;

        if (item.section === 'familial') {
            if (block.section && block.section !== 'familial') return false;
            if (item.familyMember && !normalizedTextHasExactFamilyMember(block.normalizedText || block.text || '', item.familyMember)) return false;
        }

        return true;
    }

    function getCloseCodeFuzzyCommentDuplicateMatch(block, item, expectedCodes) {
        if (!block || !item) return null;
        if (isStandaloneCim10CodeText(block.text || '')) return null;

        const itemDate = getItemDuplicateDate(item);
        const blockDate = getBlockDuplicateDate(block);
        if (duplicateDatesConflict(itemDate, blockDate)) return null;

        if (item.section === 'familial') {
            if (block.section && block.section !== 'familial') return null;
            if (item.familyMember && !normalizedTextHasExactFamilyMember(block.normalizedText || block.text || '', item.familyMember)) return null;
        } else if (block.section && item.section && block.section !== item.section) {
            return null;
        }

        const blockCodes = (block.codes || []).map(normalizeCim10Code);
        if (!cim10CodeListHasCloseDuplicateMatch(blockCodes, expectedCodes)) return null;

        const expectedComment = getExpectedDuplicateCommentForSimilarity(item);
        const blockComment = getBlockDuplicateCommentForSimilarity(block, item);
        if (!isStrongDuplicateComment(expectedComment) || !isStrongDuplicateComment(blockComment)) return null;

        const overlap = getDuplicateCommentOverlap(expectedComment, blockComment);
        if (!overlap.matches) return null;

        return Object.assign({}, block, {
            source: 'close_cim10_fuzzy_comment',
            originalSource: block.source || '',
            duplicateFuzzy: overlap,
            duplicateDates: {
                item: itemDate,
                block: blockDate
            }
        });
    }

    function blockHasCloseCodeAndFuzzyCommentDuplicate(block, item, expectedCodes) {
        return !!getCloseCodeFuzzyCommentDuplicateMatch(block, item, expectedCodes);
    }

    function getHighSimilarityCommentDuplicateMatch(block, item) {
        if (!block || !item) return null;
        if (isStandaloneCim10CodeText(block.text || '')) return null;

        const itemDate = getItemDuplicateDate(item);
        const blockDate = getBlockDuplicateDate(block);
        if (duplicateDatesConflict(itemDate, blockDate)) return null;
        if (!blockMatchesFamilyContextForHighCommentDuplicate(block, item)) return null;

        const expectedComment = getExpectedDuplicateCommentForSimilarity(item);
        const blockComment = getBlockDuplicateCommentForSimilarity(block, item);
        if (!isUsableHighSimilarityDuplicateComment(expectedComment) || !isUsableHighSimilarityDuplicateComment(blockComment)) return null;

        const overlap = getDuplicateCommentOverlap(expectedComment, blockComment);
        if (!duplicateCommentOverlapIsHighSimilarity(overlap)) return null;

        return Object.assign({}, block, {
            source: 'high_similarity_comment',
            originalSource: block.source || '',
            duplicateFuzzy: overlap,
            duplicateDates: {
                item: itemDate,
                block: blockDate
            }
        });
    }

    function blockHasHighSimilarityCommentDuplicate(block, item) {
        return !!getHighSimilarityCommentDuplicateMatch(block, item);
    }

    function getJobCloseCodeFuzzyCommentDuplicateMatch(record, item, expectedCodes, expectedComment = '') {
        const recordItem = record && record.item;
        if (!recordItem || !sameFamilyContextForDuplicate(item, recordItem)) return null;
        if (duplicateDatesConflictForItems(item, recordItem)) return null;

        const recordCodes = getRecordDuplicateCodes(record);
        if (!cim10CodeListHasCloseDuplicateMatch(recordCodes, expectedCodes)) return null;

        const leftComment = expectedComment || getExpectedDuplicateComment(item);
        const recordComment = getRecordDuplicateComment(record);
        if (!isStrongDuplicateComment(leftComment) || !isStrongDuplicateComment(recordComment)) return null;

        const overlap = getDuplicateCommentOverlap(leftComment, recordComment);
        if (!overlap.matches) return null;

        return {
            recordItem,
            recordCodes,
            recordComment,
            duplicateFuzzy: overlap,
            duplicateDates: {
                item: getItemDuplicateDate(item),
                record: getItemDuplicateDate(recordItem)
            }
        };
    }

    function getJobHighSimilarityCommentDuplicateMatch(record, item, expectedComment = '') {
        const recordItem = record && record.item;
        if (!recordItem || !sameFamilyContextForDuplicate(item, recordItem)) return null;
        if (duplicateDatesConflictForItems(item, recordItem)) return null;

        const leftComment = expectedComment || getExpectedDuplicateComment(item);
        const recordComment = getRecordDuplicateComment(record);
        if (!isUsableHighSimilarityDuplicateComment(leftComment) || !isUsableHighSimilarityDuplicateComment(recordComment)) return null;

        const overlap = getDuplicateCommentOverlap(leftComment, recordComment);
        if (!duplicateCommentOverlapIsHighSimilarity(overlap)) return null;

        return {
            recordItem,
            recordCodes: getRecordDuplicateCodes(record),
            recordComment,
            duplicateFuzzy: overlap,
            duplicateDates: {
                item: getItemDuplicateDate(item),
                record: getItemDuplicateDate(recordItem)
            }
        };
    }

    function findJobCodeCommentDuplicate(item, job, codes = []) {
        if (!item || !job) return null;

        const expectedComment = getExpectedDuplicateComment(item);
        if (!expectedComment) return null;

        const expectedCodes = [];

        function add(code) {
            const normalized = normalizeCim10Code(code);
            if (normalized && !expectedCodes.includes(normalized)) expectedCodes.push(normalized);
        }

        codes.forEach(add);
        add(item.code);

        if (!expectedCodes.length) return null;

        const records = (Array.isArray(job.imported) ? job.imported : [])
            .filter(record => recordHasPostImportDomConfirmation(record, item));

        for (const record of records) {
            const recordItem = record && record.item;
            if (!recordItem || !sameFamilyContextForDuplicate(item, recordItem)) continue;
            if (duplicateDatesConflictForItems(item, recordItem)) continue;

            const recordComment = getRecordDuplicateComment(record);
            if (!recordComment) continue;

            const recordCodes = getRecordDuplicateCodes(record);
            if (recordComment === expectedComment) {
                const hasExactCode = recordCodes.some(code => expectedCodes.includes(code));
                const hasCloseCode = isStrongDuplicateComment(expectedComment) && cim10CodeListHasCloseDuplicateMatch(recordCodes, expectedCodes);
                if (hasExactCode || hasCloseCode) {
                    return {
                        section: recordItem.section || item.section || null,
                        codes: recordCodes,
                        text: [
                            recordItem.description || '',
                            recordItem.comment || '',
                            recordItem.code ? `[${recordItem.code}]` : ''
                        ].filter(Boolean).join('\n'),
                        source: hasExactCode ? 'job_history' : 'job_history_close_cim10_comment',
                        record
                    };
                }
            }

            const fuzzyMatch = getJobCloseCodeFuzzyCommentDuplicateMatch(record, item, expectedCodes, expectedComment);
            if (fuzzyMatch) {
                return {
                    section: recordItem.section || item.section || null,
                    codes: fuzzyMatch.recordCodes,
                    text: [
                        recordItem.description || '',
                        recordItem.comment || '',
                        recordItem.code ? `[${recordItem.code}]` : ''
                    ].filter(Boolean).join('\n'),
                    source: 'job_history_close_cim10_fuzzy_comment',
                    duplicateFuzzy: fuzzyMatch.duplicateFuzzy,
                    duplicateDates: fuzzyMatch.duplicateDates,
                    record
                };
            }

            const highSimilarityMatch = getJobHighSimilarityCommentDuplicateMatch(record, item, expectedComment);
            if (!highSimilarityMatch) continue;

            return {
                section: recordItem.section || item.section || null,
                codes: highSimilarityMatch.recordCodes,
                text: [
                    recordItem.description || '',
                    recordItem.comment || '',
                    recordItem.code ? `[${recordItem.code}]` : ''
                ].filter(Boolean).join('\n'),
                source: 'job_history_high_similarity_comment',
                duplicateFuzzy: highSimilarityMatch.duplicateFuzzy,
                duplicateDates: highSimilarityMatch.duplicateDates,
                record
            };
        }

        return null;
    }

    function wedaBlockMatchesImportedItem(block, item, expectedCodes) {
        if (!block || !item) return false;
        if (duplicateDatesConflictForItemAndBlock(item, block)) return false;

        const blockCodes = (block.codes || []).map(normalizeCim10Code);
        const wantedCodes = (expectedCodes || []).map(normalizeCim10Code).filter(Boolean);
        const hasExactCode = wantedCodes.some(code => blockCodes.includes(code));
        const hasCloseCode = hasExactCode || cim10CodeListHasCloseDuplicateMatch(blockCodes, wantedCodes);
        if (!hasCloseCode && blockHasCloseCodeAndExactCommentDuplicate(block, item, wantedCodes)) return true;
        if (!hasCloseCode && blockHasCloseCodeAndFuzzyCommentDuplicate(block, item, wantedCodes)) return true;
        if (!hasCloseCode && blockHasHighSimilarityCommentDuplicate(block, item)) return true;
        if (!hasCloseCode) return false;

        const blockNorm = block.normalizedText || normalizeForMatch(block.text || '');

        if (item.section === 'familial') {
            if (item.familyMember && !normalizedTextHasExactFamilyMember(blockNorm, item.familyMember)) return false;
            return true;
        }

        return qualityTextMatchesToken(blockNorm, item.description || '')
            || qualityTextMatchesToken(blockNorm, item.comment || '')
            || qualityTextMatchesToken(blockNorm, item.remarks || '')
            || qualityTextMatchesToken(blockNorm, item.date || '');
    }

    function wedaBlockMatchesDuplicateRule(block, item, expectedCodes) {
        if (!block || !item) return false;
        if (blockHasExactCodeAndCommentDuplicate(block, item, expectedCodes)) return true;
        if (blockHasCloseCodeAndExactCommentDuplicate(block, item, expectedCodes)) return true;
        if (blockHasCloseCodeAndFuzzyCommentDuplicate(block, item, expectedCodes)) return true;
        if (blockHasHighSimilarityCommentDuplicate(block, item)) return true;

        const itemMatches = wedaBlockMatchesImportedItem(block, item, expectedCodes);

        if (item.section === 'familial') {
            if (block.section && block.section !== 'familial') return false;
            return itemMatches;
        }

        if (block.section && block.section !== item.section) return itemMatches;
        return itemMatches;
    }

    function shouldIncludeFamilialNoControleDuplicates(item, options = {}) {
        return !!(item
            && item.section === 'familial'
            && options.includeFamilialNoControleDuplicates !== false);
    }

    function shouldIncludeNonFamilialNoControleDuplicates(item, options = {}) {
        return !!(item
            && item.section !== 'familial'
            && options.includeNonFamilialNoControleDuplicates !== false);
    }

    function findExistingWedaDuplicateForItem(item, codes = [], options = {}) {
        const expectedCodes = [];

        function add(code) {
            const normalized = normalizeCim10Code(code);
            if (normalized && !expectedCodes.includes(normalized)) expectedCodes.push(normalized);
        }

        codes.forEach(add);
        add(item && item.code);

        if (!expectedCodes.length) return null;

        const blocks = collectWedaImportedAntecedentBlocks();
        const includeFamilialNoControleDuplicates = shouldIncludeFamilialNoControleDuplicates(item, options);
        if (includeFamilialNoControleDuplicates) {
            blocks.push(...collectWedaFamilialNoControleBlocks(200));
        }
        const includeNonFamilialNoControleDuplicates = shouldIncludeNonFamilialNoControleDuplicates(item, options);
        if (includeNonFamilialNoControleDuplicates) {
            blocks.push(...collectWedaNonFamilialNoControleBlocks(200));
        }

        const strictMatch = blocks.find(block => blockHasExactCodeAndCommentDuplicate(block, item, expectedCodes));
        if (strictMatch) return strictMatch;

        const closeCodeCommentMatch = blocks.find(block => blockHasCloseCodeAndExactCommentDuplicate(block, item, expectedCodes));
        if (closeCodeCommentMatch) {
            return Object.assign({}, closeCodeCommentMatch, {
                source: closeCodeCommentMatch.source || 'close_cim10_exact_comment'
            });
        }

        for (const block of blocks) {
            const fuzzyCloseCodeCommentMatch = getCloseCodeFuzzyCommentDuplicateMatch(block, item, expectedCodes);
            if (fuzzyCloseCodeCommentMatch) return fuzzyCloseCodeCommentMatch;
        }

        for (const block of blocks) {
            const highSimilarityCommentMatch = getHighSimilarityCommentDuplicateMatch(block, item);
            if (highSimilarityCommentMatch) return highSimilarityCommentMatch;
        }

        if (options.strictCodeCommentOnly && !includeFamilialNoControleDuplicates && !includeNonFamilialNoControleDuplicates) return null;

        return blocks.find(block => wedaBlockMatchesDuplicateRule(block, item, expectedCodes)) || null;
    }

    function markDuplicateSkipped(item, job, duplicateBlock, codes = [], options = {}) {
        if (!job) return;

        if (!options.qualityRepair) {
            job.importIndex = (job.importIndex || 0) + 1;
        }

        job.duplicatesSkipped = Array.isArray(job.duplicatesSkipped) ? job.duplicatesSkipped : [];
        const duplicateSource = String(duplicateBlock && duplicateBlock.source || '');
        job.duplicatesSkipped.push({
            at: nowIso(),
            item,
            qualityRepair: !!options.qualityRepair,
            qualityPass: options.qualityPass || 0,
            reason: duplicateBlock && /high_similarity_comment/.test(duplicateSource)
                ? 'duplicate_high_similarity_comment'
                : (duplicateBlock && /fuzzy_comment/.test(duplicateSource)
                ? 'duplicate_fuzzy_comment_close_cim10'
                : (duplicateBlock && /close_cim10|job_history_close/.test(duplicateSource)
                    ? 'duplicate_same_comment_close_cim10'
                    : (duplicateBlock && duplicateBlock.source === 'job_history'
                    ? 'duplicate_same_cim10_comment_in_job'
                    : 'duplicate_same_cim10_comment_or_category'))),
            cim10: {
                originalCode: item.code || '',
                matchedCode: normalizeCim10Code(codes[0] || item.code || ''),
                checkedCodes: codes.map(normalizeCim10Code).filter(Boolean)
            },
            existing: duplicateBlock ? {
                section: duplicateBlock.section || null,
                codes: duplicateBlock.codes || [],
                text: String(duplicateBlock.text || '').slice(0, 600),
                source: duplicateBlock.source || '',
                fuzzyComment: duplicateBlock.duplicateFuzzy || null,
                dates: duplicateBlock.duplicateDates || null,
            } : null
        });
        job.updatedAt = nowIso();
        job.wedaWorkerTabId = TAB_ID;
        setJob(job);

        logImportEvent('info', 'duplicate_skip', 'Antécédent déjà présent : import ignoré.', {
            jobId: job.id,
            item,
            checkedCodes: codes,
            duplicateBlock
        });
    }

    function buildJobConfirmedQualityBlock(item, importedRecords, expectedCodes) {
        if (!item) return null;
        if (!Array.isArray(importedRecords) || !importedRecords.length) return null;

        const confirmedRecord = importedRecords
            .slice()
            .reverse()
            .find(record => qualityRecordMatchesItem(record, item, expectedCodes));
        if (!confirmedRecord) return null;

        const recordItem = confirmedRecord.item || item;
        const section = recordItem.section || item.section || null;
        const isFamilial = section === 'familial';

        return {
            text: [
                isFamilial ? (recordItem.familyMember || item.familyMember || '') : '',
                recordItem.description || item.description || '',
                recordItem.comment || item.comment || '',
                recordItem.date || item.date || '',
                (expectedCodes || []).filter(Boolean).map(code => `[${code}]`).join(' ')
            ].filter(Boolean).join('\n'),
            normalizedText: normalizeForMatch([
                isFamilial ? (recordItem.familyMember || item.familyMember || '') : '',
                recordItem.description || item.description || '',
                recordItem.comment || item.comment || '',
                recordItem.date || item.date || '',
                (expectedCodes || []).join(' ')
            ].filter(Boolean).join(' ')),
            codes: (expectedCodes || []).map(normalizeCim10Code).filter(Boolean),
            section,
            source: 'job_post_import_dom_confirmed',
            record: confirmedRecord
        };
    }

    function buildWedaImportQualityReport(job) {
        const items = Array.isArray(job && job.parsedAtcd) ? job.parsedAtcd : [];
        const importedBlocks = collectWedaImportedAntecedentBlocks();
        const familialNoControleBlocks = collectWedaFamilialNoControleBlocks(200);
        const nonFamilialNoControleBlocks = collectWedaNonFamilialNoControleBlocks(200);
        const reportBlocks = importedBlocks.concat(nonFamilialNoControleBlocks).concat(familialNoControleBlocks);
        const importedByKey = getImportedRecordsByAtcdKey(job);
        const found = [];
        const missing = [];

        for (const item of items) {
            const key = getAtcdDedupeKey(item);
            let importedRecords = (importedByKey.get(key) || []).slice();
            let expectedCodes = getExpectedCim10CodesForQuality(item, importedRecords);
            const confirmationRecords = findJobQualityConfirmationRecords(job, item, expectedCodes);
            for (const record of confirmationRecords) {
                if (!importedRecords.includes(record)) importedRecords.push(record);
            }
            expectedCodes = getExpectedCim10CodesForQuality(item, importedRecords);

            const blocks = item && item.section === 'familial'
                ? importedBlocks.concat(familialNoControleBlocks)
                : importedBlocks.concat(nonFamilialNoControleBlocks);
            const block = blocks.find(candidate => wedaBlockMatchesImportedItem(candidate, item, expectedCodes))
                || buildJobConfirmedQualityBlock(item, importedRecords, expectedCodes);

            if (block) {
                found.push({
                    key,
                    item,
                    expectedCodes,
                    block: {
                        text: block.text.slice(0, 600),
                        codes: block.codes,
                        source: block.source || ''
                    }
                });
            } else {
                missing.push({
                    key,
                    item,
                    expectedCodes,
                    diagnostic: buildWedaItemDomDiagnostic(item, expectedCodes)
                });
            }
        }

        return {
            at: nowIso(),
            expectedCount: items.length,
            foundCount: found.length,
            missingCount: missing.length,
            found,
            missing,
            blockCount: importedBlocks.length,
            noControleQualityBlockCount: nonFamilialNoControleBlocks.length,
            familialNoControleBlockCount: familialNoControleBlocks.length,
            blocksSample: reportBlocks.slice(0, 12).map(block => ({
                text: block.text.slice(0, 260),
                codes: block.codes,
                source: block.source || ''
            }))
        };
    }

    function qualityMissingSignature(report) {
        return (report && Array.isArray(report.missing) ? report.missing : [])
            .map(entry => entry && entry.key ? String(entry.key) : '')
            .filter(Boolean)
            .sort()
            .join('\n');
    }

    function isUnrecoverableQualityRepairError(message) {
        return /CIM-10 introuvable|Lien familial WEDA non renseigné|Liste du membre familial WEDA introuvable|Code CIM-10 absent ou invalide|Membre familial absent ou invalide/i
            .test(String(message || ''));
    }

    function annotateQualityReportWithUnrecoverable(report, unrecoverableKeys, unrecoverableErrors) {
        if (!report || typeof report !== 'object') return report;
        const missing = Array.isArray(report.missing) ? report.missing : [];
        const keys = unrecoverableKeys instanceof Set ? unrecoverableKeys : new Set();
        const errors = Array.isArray(unrecoverableErrors) ? unrecoverableErrors : [];

        report.unrecoverableMissing = missing
            .filter(entry => entry && keys.has(entry.key))
            .map(entry => ({
                key: entry.key,
                item: entry.item,
                expectedCodes: entry.expectedCodes,
                repairError: errors.find(error => error && error.key === entry.key) || null
            }));
        report.unrecoverableMissingCount = report.unrecoverableMissing.length;
        report.retryableMissingCount = Math.max(0, missing.length - report.unrecoverableMissingCount);

        return report;
    }

    async function runWedaImportQualityControl(job, options = {}) {
        assertImportRunActive(options.runToken);
        await waitForWedaIdle(15000);
        await sleep(1200);
        assertImportRunActive(options.runToken);

        const unrecoverableQualityKeys = new Set();
        const unrecoverableQualityErrors = [];
        let report = buildWedaImportQualityReport(job);
        annotateQualityReportWithUnrecoverable(report, unrecoverableQualityKeys, unrecoverableQualityErrors);
        logImportDiagnostic('quality_report_initial', `Diagnostic contrôle qualité initial : ${report.foundCount}/${report.expectedCount} retrouvé(s), ${report.missingCount} absent(s).`, {
            jobId: job && job.id,
            expectedCount: report.expectedCount,
            foundCount: report.foundCount,
            missingCount: report.missingCount,
            missing: report.missing,
            blocksSample: report.blocksSample,
            noControleSample: collectWedaNoControleDiagnosticBlocks(IMPORT_DIAGNOSTIC_BLOCK_LIMIT)
        });

        if (!report.missingCount) {
            const finalJob = getJob() || job;
            finalJob.qualityControl = report;
            finalJob.updatedAt = nowIso();
            setJob(finalJob);
            return report;
        }

        let completedPasses = 0;
        let stalledPasses = 0;

        for (let pass = 1; pass <= MAX_QUALITY_REIMPORT_PASSES && report.missingCount > 0; pass++) {
            assertImportRunActive(options.runToken);
            const retryableMissing = (report.missing || []).filter(entry => entry && !unrecoverableQualityKeys.has(entry.key));
            if (!retryableMissing.length) {
                logImportEvent('warning', 'quality_control_unrecoverable', `${report.missingCount} antécédent(s) absent(s) non réparable(s) automatiquement. Arrêt du réimport ciblé.`, {
                    jobId: job && job.id,
                    pass,
                    report: {
                        expectedCount: report.expectedCount,
                        foundCount: report.foundCount,
                        missingCount: report.missingCount,
                        unrecoverableMissingCount: report.unrecoverableMissingCount,
                        unrecoverableMissing: report.unrecoverableMissing
                    }
                });
                break;
            }

            const missingBeforePass = qualityMissingSignature(report);
            completedPasses = pass;

            logImportEvent(pass === 1 ? 'info' : 'warning', 'quality_control', `${report.missingCount} antécédent(s) absent(s) après contrôle qualité. Réimport ciblé passe ${pass}/${MAX_QUALITY_REIMPORT_PASSES}.`, {
                jobId: job && job.id,
                pass,
                maxPasses: MAX_QUALITY_REIMPORT_PASSES,
                retryableMissingCount: retryableMissing.length,
                report: {
                    expectedCount: report.expectedCount,
                    foundCount: report.foundCount,
                    missingCount: report.missingCount,
                    missing: report.missing
                }
            });

            showBadge(
                `Contrôle qualité WEDA\n${report.missingCount} antécédent(s) absent(s).\nRéimport ciblé ${pass}/${MAX_QUALITY_REIMPORT_PASSES} en cours…`,
                { duration: 9000 }
            );

            for (const missingEntry of retryableMissing) {
                assertImportRunActive(options.runToken);
                const freshJob = getJob() || job;

                try {
                    await importOneAtcdIntoWeda(missingEntry.item, freshJob, {
                        qualityRepair: true,
                        qualityPass: pass,
                        forceImport: true,
                        runToken: options.runToken || ''
                    });
                    assertImportRunActive(options.runToken);
                } catch (e) {
                    if (isSupersededImportError(e)) throw e;
                    const message = String(e && e.message ? e.message : e);
                    const failedJob = getJob() || freshJob;

                    failedJob.errors = Array.isArray(failedJob.errors) ? failedJob.errors : [];
                    failedJob.errors.push({
                        at: nowIso(),
                        phase: 'quality_reimport',
                        item: missingEntry.item,
                        message
                    });
                    failedJob.updatedAt = nowIso();
                    setJob(failedJob);

                    if (isUnrecoverableQualityRepairError(message)) {
                        unrecoverableQualityKeys.add(missingEntry.key);
                        unrecoverableQualityErrors.push({
                            key: missingEntry.key,
                            at: nowIso(),
                            pass,
                            message,
                            item: missingEntry.item
                        });
                    }

                    logImportEvent('error', 'quality_reimport_error', message, {
                        jobId: failedJob.id,
                        pass,
                        item: missingEntry.item,
                        stack: e && e.stack ? String(e.stack).slice(0, 2000) : ''
                    });
                }

                await waitForWedaIdle(15000);
                await sleep(900);
            }

            await waitForWedaIdle(15000);
            await sleep(1500);
            assertImportRunActive(options.runToken);
            report = buildWedaImportQualityReport(getJob() || job);
            annotateQualityReportWithUnrecoverable(report, unrecoverableQualityKeys, unrecoverableQualityErrors);
            logImportDiagnostic('quality_report_after_pass', `Diagnostic contrôle qualité après passe ${pass} : ${report.foundCount}/${report.expectedCount} retrouvé(s), ${report.missingCount} absent(s).`, {
                jobId: job && job.id,
                pass,
                expectedCount: report.expectedCount,
                foundCount: report.foundCount,
                missingCount: report.missingCount,
                missing: report.missing,
                unrecoverableMissing: report.unrecoverableMissing,
                blocksSample: report.blocksSample,
                noControleSample: collectWedaNoControleDiagnosticBlocks(IMPORT_DIAGNOSTIC_BLOCK_LIMIT)
            });

            let missingAfterPass = qualityMissingSignature(report);
            if (report.missingCount > 0 && missingAfterPass === missingBeforePass) {
                await sleep(2500);
                report = buildWedaImportQualityReport(getJob() || job);
                missingAfterPass = qualityMissingSignature(report);
            }

            if (report.missingCount > 0 && missingAfterPass === missingBeforePass) {
                stalledPasses += 1;
            } else {
                stalledPasses = 0;
            }

            if (report.missingCount > 0 && stalledPasses >= MAX_QUALITY_STALLED_PASSES) {
                logImportEvent('warning', 'quality_control_stalled', `${report.missingCount} antécédent(s) toujours absent(s) après ${stalledPasses} passe(s) sans progrès. Arrêt de sécurité.`, {
                    jobId: job && job.id,
                    pass,
                    maxPasses: MAX_QUALITY_REIMPORT_PASSES,
                    report: {
                        expectedCount: report.expectedCount,
                        foundCount: report.foundCount,
                        missingCount: report.missingCount,
                        missing: report.missing
                    }
                });
                break;
            }
        }

        const finalJob = getJob() || job;
        annotateQualityReportWithUnrecoverable(report, unrecoverableQualityKeys, unrecoverableQualityErrors);
        finalJob.qualityControl = report;
        finalJob.qualityControlPasses = completedPasses;
        finalJob.qualityControlResolvedByTargetedReimport = completedPasses > 0 && Number(report.missingCount || 0) === 0;
        finalJob.updatedAt = nowIso();
        setJob(finalJob);

        if (report.missingCount > 0) {
            logImportEvent('error', 'quality_control_failed', `${report.missingCount} antécédent(s) toujours absent(s) après ${completedPasses} passe(s) de réimport ciblé.`, {
                jobId: finalJob.id,
                passes: completedPasses,
                maxPasses: MAX_QUALITY_REIMPORT_PASSES,
                stalledPasses,
                report: {
                    expectedCount: report.expectedCount,
                    foundCount: report.foundCount,
                    missingCount: report.missingCount,
                    retryableMissingCount: report.retryableMissingCount,
                    unrecoverableMissingCount: report.unrecoverableMissingCount,
                    unrecoverableMissing: report.unrecoverableMissing,
                    missing: report.missing,
                    blocksSample: report.blocksSample
                }
            });
        }

        return report;
    }

    function summarizeQualityReportForRetryHistory(report) {
        if (!report) return null;
        return {
            at: report.at || nowIso(),
            expectedCount: Number(report.expectedCount || 0),
            foundCount: Number(report.foundCount || 0),
            missingCount: Number(report.missingCount || 0),
            retryableMissingCount: Number(report.retryableMissingCount || 0),
            unrecoverableMissingCount: Number(report.unrecoverableMissingCount || 0),
            missing: (report.missing || []).slice(0, 12).map(entry => ({
                item: summarizeImportItem(entry && entry.item),
                expectedCodes: entry && entry.expectedCodes || []
            }))
        };
    }

    function prepareSamePatientFullRetryAfterIncompleteImport(job, qualityReport, context = {}) {
        const latest = getJob() || job || {};
        const retryCount = Number(latest.qualityFullRetryCount || 0) + 1;
        const duplicateCounts = getDuplicateSkipCounts(latest);

        latest.qualityFullRetryCount = retryCount;
        latest.qualityFullRetryHistory = Array.isArray(latest.qualityFullRetryHistory) ? latest.qualityFullRetryHistory : [];
        latest.qualityFullRetryHistory.push({
            at: nowIso(),
            retryCount,
            reason: 'quality_incomplete',
            previousImportIndex: Number(latest.importIndex || 0),
            previousParsedCount: Array.isArray(latest.parsedAtcd) ? latest.parsedAtcd.length : 0,
            previousImportedCount: Array.isArray(latest.imported) ? latest.imported.length : 0,
            previousDuplicatesSkippedCount: duplicateCounts.regular,
            previousDuplicatesSkippedTotalCount: duplicateCounts.total,
            previousDuplicatesSkippedQualityRepairCount: duplicateCounts.qualityRepair,
            previousSkippedCount: Array.isArray(latest.skipped) ? latest.skipped.length : 0,
            previousErrorCount: Array.isArray(latest.errors) ? latest.errors.length : 0,
            context,
            quality: summarizeQualityReportForRetryHistory(qualityReport)
        });
        latest.qualityFullRetryHistory = latest.qualityFullRetryHistory.slice(-20);

        latest.status = 'EXTRACT_WEDA';
        latest.updatedAt = nowIso();
        latest.doneAt = '';
        latest.sourceWedaTabId = TAB_ID;
        latest.wedaWorkerTabId = '';
        latest.heidiRunnerTabId = '';
        latest.heidiRunnerExpiresAt = 0;
        latest.wedaImportUrl = location.href;
        latest.sourcePatientId = latest.sourcePatientId || getCurrentWedaPatDk();
        latest.expectedPatientId = latest.expectedPatientId || latest.batchPatientId || latest.sourcePatientId || getCurrentWedaPatDk();
        latest.importIndex = 0;
        latest.currentItem = null;
        latest.currentItemStartedAt = '';
        latest.extractedText = '';
        latest.heidiPayload = '';
        latest.heidiResultText = '';
        latest.parsedAtcd = [];
        latest.items = [];
        latest.imported = [];
        latest.duplicatesSkipped = [];
        latest.skipped = [];
        latest.errors = [];
        latest.qualityControl = qualityReport || latest.qualityControl || null;
        latest.qualityControlPasses = 0;

        setJob(latest);

        try { GM_deleteValue(KEY_HEIDI_OPEN_LOCK); } catch (_) {}
        try { GM_deleteValue(KEY_WORKER_OPEN_LOCK); } catch (_) {}

        logImportEvent('warning', 'quality_full_retry', 'Import incomplet : reprise complète du même patient, sans passer au suivant.', {
            jobId: latest.id,
            retryCount,
            qualityReport,
            context
        });

        return latest;
    }

    function prepareHeidiRetrySamePatient(job, error, context = {}) {
        const latest = getJob() || job || {};
        const retryCount = Number(latest.heidiSetupRetryCount || 0) + 1;
        const message = String(error && error.message ? error.message : error || 'Erreur Heidi Ask AI.');

        latest.heidiSetupRetryCount = retryCount;
        latest.heidiSetupRetryHistory = Array.isArray(latest.heidiSetupRetryHistory) ? latest.heidiSetupRetryHistory : [];
        latest.heidiSetupRetryHistory.push({
            at: nowIso(),
            retryCount,
            message,
            context,
            diagnostic: error && error.diagnostic ? compactLogValue(error.diagnostic, 1) : null
        });
        latest.heidiSetupRetryHistory = latest.heidiSetupRetryHistory.slice(-20);
        latest.status = 'PENDING_LMSTUDIO';
        latest.updatedAt = nowIso();
        latest.heidiRunnerTabId = '';
        latest.heidiRunnerExpiresAt = 0;
        latest.heidiRunStartedAt = '';
        latest.heidiLastError = message;
        latest.errors = Array.isArray(latest.errors) ? latest.errors : [];
        latest.errors.push({
            at: nowIso(),
            phase: 'heidi_retry',
            message,
            retryCount
        });

        setJob(latest);

        try { GM_deleteValue(KEY_HEIDI_OPEN_LOCK); } catch (_) {}

        logImportEvent('warning', 'heidi_retry', 'Heidi indisponible : nouvelle tentative sur le même patient.', {
            jobId: latest.id || '',
            retryCount,
            message,
            diagnostic: error && error.diagnostic ? error.diagnostic : null,
            context
        });

        return latest;
    }

    async function importOneAtcdIntoWeda(item, job, options = {}) {
        assertImportRunActive(options.runToken);
        assertPatientIdentityMatchesJob(job, 'import_one_start', item);
        renewWorkerLock(job);
        await waitForWedaIdle();
        assertPatientIdentityMatchesJob(job, 'import_one_after_idle', item);
        assertImportRunActive(options.runToken);
        logImportEvent('info', 'import_start', `Début import : ${item.description} [${item.code}]`, {
            jobId: job && job.id,
            item,
            options
        });
        logImportDiagnostic('import_item_start', `Diagnostic import ${item.description} [${item.code}]`, {
            jobId: job && job.id,
            item,
            options,
            progress: getJobProgressSnapshot(job),
            dom: buildWedaItemDomDiagnostic(item, [item.code])
        });

        const shouldCheckBroadDuplicate = !options.qualityRepair && !options.forceImport;
        let duplicateBlock = findJobCodeCommentDuplicate(item, job, [item.code])
            || findExistingWedaDuplicateForItem(item, [item.code], {
                strictCodeCommentOnly: !shouldCheckBroadDuplicate
            });
        if (duplicateBlock) {
            logImportDiagnostic('duplicate_blocking_item', `Doublon détecté avant recherche CIM10 : ${item.description} [${item.code}]`, {
                jobId: job && job.id,
                item,
                checkedCodes: [item.code],
                duplicateBlock,
                dom: buildWedaItemDomDiagnostic(item, [item.code])
            });
            markDuplicateSkipped(item, job, duplicateBlock, [item.code], options);
            showBadge(
                `Doublon évité\n${sectionLabel(item.section)}\n${item.familyMember ? item.familyMember + ' | ' : ''}${item.description} [${item.code}]`,
                { duration: 7000 }
            );
            return false;
        }
        logImportDiagnostic('duplicate_check_clear', `Aucun doublon bloquant avant recherche CIM10 : ${item.description} [${item.code}]`, {
            jobId: job && job.id,
            item,
            shouldCheckBroadDuplicate,
            checkedCodes: [item.code]
        });

        const result = await searchCim10InWeda(item.code, item.description || item.comment || '');
        assertImportRunActive(options.runToken);

        const displayCode = result && result.matchedCode ? result.matchedCode : item.code;
        const itemForImport = refreshWedaCommentForCim10Label(item, result && result.matchedLabel ? result.matchedLabel : '');
        const fallbackSuffix = result && result.usedFallback ? `\nFallback : [${item.code}] → [${displayCode}]` : '';
        logImportEvent(result && result.usedFallback ? 'warning' : 'info', 'cim10_search', `CIM-10 : ${displayCode} sélectionné pour ${item.description}.`, {
            jobId: job && job.id,
            item: itemForImport,
            cim10: {
                originalCode: item.code,
                matchedCode: result.matchedCode || item.code,
                matchedLabel: result.matchedLabel || '',
                searchCode: result.searchCode || '',
                usedFallback: !!result.usedFallback,
                similarityScore: result.similarityScore || 0,
                candidates: result.candidates || []
            }
        });
        logImportDiagnostic('cim10_selected', `Diagnostic sélection CIM10 : ${item.description} [${displayCode}]`, {
            jobId: job && job.id,
            item: itemForImport,
            originalCode: item.code,
            displayCode,
            matchedLabel: result.matchedLabel || '',
            usedFallback: !!result.usedFallback,
            candidates: result.candidates || []
        });

        showBadge(`Sélection CIM-10 : ${item.description} [${displayCode}]${fallbackSuffix}`, { duration: 6000 });

        await waitForWedaIdle();
        assertPatientIdentityMatchesJob(job, 'before_drop_weda', itemForImport);
        assertImportRunActive(options.runToken);
        renewWorkerLock(job);

        duplicateBlock = findJobCodeCommentDuplicate(itemForImport, job, [displayCode, item.code])
            || findExistingWedaDuplicateForItem(itemForImport, [displayCode, item.code], {
                strictCodeCommentOnly: !shouldCheckBroadDuplicate
            });
        if (duplicateBlock) {
            logImportDiagnostic('duplicate_blocking_after_cim10', `Doublon détecté après sélection CIM10 : ${item.description} [${displayCode}]`, {
                jobId: job && job.id,
                item: itemForImport,
                checkedCodes: [displayCode, item.code],
                duplicateBlock,
                dom: buildWedaItemDomDiagnostic(itemForImport, [displayCode, item.code])
            });
            markDuplicateSkipped(itemForImport, job, duplicateBlock, [displayCode, item.code], options);
            showBadge(
                `Doublon évité\n${sectionLabel(item.section)}\n${item.familyMember ? item.familyMember + ' | ' : ''}${item.description} [${displayCode}]`,
                { duration: 7000 }
            );
            return false;
        }

        const effectiveDropSection = await dropWedaCim10ForItem(result.hand, item);
        assertImportRunActive(options.runToken);
        logImportEvent('info', 'drop_weda', `Dépôt dans ${sectionLabel(effectiveDropSection)} effectué.`, {
            jobId: job && job.id,
            item: itemForImport,
            matchedCode: displayCode,
            requestedSection: item.section,
            effectiveDropSection
        });

        const validButton = await fillWedaAntecedentPopup(itemForImport, job);
        assertPatientIdentityMatchesJob(job, 'after_fill_before_validate', itemForImport);
        assertImportRunActive(options.runToken);
        const colorization = await colorizeImportedAtcdPopup(itemForImport, result, displayCode, job);
        itemForImport.wedaColor = colorization;
        assertImportRunActive(options.runToken);
        logImportEvent('info', 'fill_popup', 'Popup WEDA renseignée.', {
            jobId: job && job.id,
            item: itemForImport,
            colorization,
        });

        renewWorkerLock(job);

        await validateWedaAntecedentPopup(validButton, itemForImport);
        assertImportRunActive(options.runToken);
        logImportEvent('info', 'validate_popup', 'Validation WEDA confirmée.', {
            jobId: job && job.id,
            item: itemForImport
        });

        await waitForWedaIdle(15000);
        await sleep(1000);
        assertImportRunActive(options.runToken);

        const postImportDiagnostic = buildWedaItemDomDiagnostic(itemForImport, [displayCode, item.code]);
        const postImportFound = diagnosticHasConfirmedWedaMatch(postImportDiagnostic);
        logImportDiagnostic(
            postImportFound ? 'post_import_found' : 'post_import_missing',
            postImportFound
                ? `Antécédent retrouvé dans le DOM WEDA après validation : ${item.description} [${displayCode}]`
                : `Antécédent NON retrouvé dans le DOM WEDA après validation : ${item.description} [${displayCode}]`,
            {
                jobId: job && job.id,
                item: itemForImport,
                checkedCodes: [displayCode, item.code],
                dom: postImportDiagnostic
            }
        );
        if (!postImportFound) {
            logImportEvent('warning', 'post_import_missing', 'Validation WEDA faite, mais antécédent non retrouvé dans WEDA après fermeture de la popup.', {
                jobId: job && job.id,
                item: itemForImport,
                checkedCodes: [displayCode, item.code],
                dom: postImportDiagnostic
            });
        }

        if (!options.qualityRepair) {
            job.importIndex = (job.importIndex || 0) + 1;
        }
        job.imported = Array.isArray(job.imported) ? job.imported : [];
        job.imported.push({
            at: nowIso(),
            item: itemForImport,
            colorization: itemForImport.wedaColor || null,
            validated: true,
            postImportFound,
            postImportDiagnostic: {
                expectedCodes: postImportDiagnostic.expectedCodes || [],
                importedMatches: (postImportDiagnostic.importedMatches || []).slice(0, 3),
                noControleMatches: (postImportDiagnostic.noControleMatches || []).slice(0, 3),
                importedCodeCandidates: (postImportDiagnostic.importedCodeCandidates || []).slice(0, 3)
            },
            qualityRepair: !!options.qualityRepair,
            qualityPass: options.qualityPass || 0,
            cim10: {
                originalCode: item.code,
                matchedCode: result.matchedCode || item.code,
                matchedLabel: result.matchedLabel || '',
                searchCode: result.searchCode || '',
                usedFallback: !!result.usedFallback,
                similarityScore: result.similarityScore || 0,
                candidates: result.candidates || []
            }
        });
        job.updatedAt = nowIso();
        job.wedaWorkerTabId = TAB_ID;
        setJob(job);

        renewWorkerLock(job);
        logImportEvent('info', 'import_success', `Import réussi : ${item.description} [${item.code}]`, {
            jobId: job && job.id,
            item,
            options
        });
        return true;
    }

    async function handleWedaImportJob() {
        if (!isWeda()) return;

        let job = getJob();
        if (!job || job.status !== 'IMPORT_WEDA') return;
        if (!canThisTabRunWedaImport(job)) return;
        installWedaBackgroundExecutionShim(job, 'handle_weda_import_job');
        if (job.wedaWorkerTabId && job.wedaWorkerTabId !== TAB_ID) {
            const lock = gmGetJson(KEY_WORKER_LOCK, null);
            const lockedByOtherLiveTab = lock &&
                lock.jobId === job.id &&
                lock.tabId &&
                lock.tabId !== TAB_ID &&
                Number(lock.expiresAt || 0) > nowMs();

            if (lockedByOtherLiveTab) return;

            logImportEvent('warning', 'worker_tab_takeover', 'Reprise du job par cet onglet WEDA après perte de l’ancien importeur.', {
                jobId: job.id,
                previousWorkerTabId: job.wedaWorkerTabId,
                newWorkerTabId: TAB_ID,
                runnerMode: canSourceWedaTabRunImport(job) ? 'source_weda_tab' : 'worker_tab',
                lock
            });

            job.wedaWorkerTabId = TAB_ID;
            job.updatedAt = nowIso();
            setJob(job);
        }
        if (window.__AUTO_ATCD_CIM10_LMSTUDIO_IMPORT_RUNNING__) return;

        if (!acquireWorkerLock(job)) {
            logImportEvent('warning', 'worker_lock', 'Import déjà pris en charge par un autre onglet WEDA worker.', {
                jobId: job.id,
                lock: gmGetJson(KEY_WORKER_LOCK, null)
            });
            showBadge('Import déjà pris en charge par un autre onglet WEDA worker.\nCet onglet reste inactif.', { duration: 7000 });
            return;
        }

        window.__AUTO_ATCD_CIM10_LMSTUDIO_IMPORT_RUNNING__ = true;
        const runToken = createImportRunToken();
        window.__AUTO_ATCD_CIM10_LMSTUDIO_IMPORT_RUN_TOKEN__ = runToken;

        try {
            job.wedaWorkerTabId = TAB_ID;
            job.updatedAt = nowIso();
            setJob(job);

            const okPage = await ensureWedaAntecedentPageForImport();

            if (!okPage) {
                job.status = 'ERROR';
                job.updatedAt = nowIso();
                job.errors = Array.isArray(job.errors) ? job.errors : [];
                job.errors.push('Impossible d’ouvrir la page Antécédents WEDA pour l’import.');
                setJob(job);
                logImportEvent('error', 'open_weda_import_page', 'Impossible d’ouvrir la page Antécédents WEDA pour l’import.', {
                    jobId: job.id,
                    url: location.href
                });
                showBadge('Import impossible : page Antécédents WEDA non trouvée.', { error: true, duration: 12000 });
                releaseWorkerLock(job);
                closeCurrentWedaImportHostTab(job, 'weda_import_page_error');
                return;
            }

            assertPatientIdentityMatchesJob(job, 'before_import_loop');
            injectWedaButtonIfUseful();

            const commentDateRepairReport = await repairWedaCommentDateLinesOnPage(job, 'before_import');
            if (commentDateRepairReport.repairedCount > 0) {
                job.commentDateRepairBeforeImport = commentDateRepairReport;
                job.updatedAt = nowIso();
                setJob(job);
                showBadge(`${commentDateRepairReport.repairedCount} date(s) déplacée(s) du commentaire vers le champ date.`, { duration: 6000 });
                await sleep(900);
            }

            const items = Array.isArray(job.parsedAtcd) ? job.parsedAtcd : [];

            if (!items.length) {
                await clickNoKnownAllergyBeforeTerminalNoItems(job, 'import_weda_no_parsed_items');
                job = getJob() || job;
                job.status = 'DONE_NO_IMPORT';
                job.updatedAt = nowIso();
                job.doneAt = nowIso();
                setJob(job);
                logImportEvent('warning', 'import_weda', 'Aucun antécédent CIM10 à importer dans WEDA.', {
                    jobId: job.id,
                    noKnownAllergyBeforeTerminalNoItems: job.noKnownAllergyBeforeTerminalNoItems || null
                });
                showBadge('Aucun antécédent CIM10 à importer dans WEDA.', { error: true, duration: 10000 });
                releaseWorkerLock(job);
                clearJob();
                closeCurrentWedaImportHostTab(job, 'weda_import_no_items');
                return;
            }

            assertImportRunActive(runToken);
            let beforeImportJob = getJob() || job;
            assertPatientIdentityMatchesJob(beforeImportJob, 'before_no_known_allergy_once');
            const noKnownAllergyReport = await clickNoKnownAllergyOnceBeforeImport(beforeImportJob, runToken);
            if (noKnownAllergyReport.clickedCount > 0) {
                beforeImportJob = getJob() || beforeImportJob;
                assertPatientIdentityMatchesJob(beforeImportJob, 'after_no_known_allergy_once');
            }

            let index = Number(job.importIndex || 0);

            while (index < items.length) {
                assertImportRunActive(runToken);
                renewWorkerLock(job);

                const freshJob = getJob() || job;
                freshJob.status = 'IMPORT_WEDA';
                freshJob.wedaWorkerTabId = TAB_ID;
                freshJob.importIndex = index;
                freshJob.currentItemStartedAt = nowIso();
                freshJob.currentItem = items[index] || null;
                freshJob.updatedAt = nowIso();
                setJob(freshJob);

                const item = items[index];
                assertPatientIdentityMatchesJob(freshJob, 'import_loop_before_item', item);
                logImportDiagnostic('import_loop_item', `Boucle import WEDA ${index + 1}/${items.length} : ${item.description} [${item.code}]`, {
                    jobId: freshJob.id,
                    importIndex: index,
                    parsedCount: items.length,
                    item,
                    progress: getJobProgressSnapshot(freshJob),
                    dom: buildWedaItemDomDiagnostic(item, [item.code])
                });

                try {
                    showBadge(
                        `Import WEDA ${index + 1}/${items.length}\n${item.description} [${item.code}]`,
                        { duration: 7000 }
                    );

                    await importOneAtcdIntoWeda(item, freshJob, { runToken });
                    assertImportRunActive(runToken);
                } catch (e) {
                    if (isSupersededImportError(e)) throw e;
                    if (e && e.patientIdentityMismatch) throw e;
                    const message = String(e && e.message ? e.message : e);

                    freshJob.errors = Array.isArray(freshJob.errors) ? freshJob.errors : [];
                    freshJob.errors.push({ at: nowIso(), item, message });

                    freshJob.importIndex = index + 1;
                    freshJob.updatedAt = nowIso();
                    freshJob.wedaWorkerTabId = TAB_ID;
                    setJob(freshJob);
                    logImportEvent('error', 'import_error', message, {
                        jobId: freshJob.id,
                        importIndex: index,
                        item,
                        stack: e && e.stack ? String(e.stack).slice(0, 2000) : ''
                    });

                    showBadge(`Erreur import ${item.description} [${item.code}]\n${message}\nPassage au suivant.`, {
                        error: true,
                        duration: 14000
                    });

                    await sleep(2500);
                }

                const after = getJob();
                let nextIndex = Number(after && after.importIndex !== undefined ? after.importIndex : index + 1);

                if (nextIndex <= index) {
                    const repairedJob = getJob() || freshJob;
                    nextIndex = index + 1;
                    repairedJob.importIndex = nextIndex;
                    repairedJob.updatedAt = nowIso();
                    repairedJob.wedaWorkerTabId = TAB_ID;
                    setJob(repairedJob);
                    logImportEvent('warning', 'import_progress_repaired', 'Progression import corrigée automatiquement pour éviter un blocage.', {
                        jobId: repairedJob.id,
                        previousIndex: index,
                        nextIndex,
                        item
                    });
                }

                index = nextIndex;
            }

            assertImportRunActive(runToken);
            let finalJob = getJob() || job;
            assertPatientIdentityMatchesJob(finalJob, 'before_weda_duplicate_cleanup');
            const duplicateCleanupReport = await clickWedaDuplicateCleanupIfPresent(finalJob, 'after_import_before_quality');
            if (duplicateCleanupReport.present) {
                finalJob = getJob() || finalJob;
                finalJob.wedaDuplicateCleanupAfterImport = duplicateCleanupReport;
                finalJob.updatedAt = nowIso();
                setJob(finalJob);
                assertPatientIdentityMatchesJob(finalJob, 'after_weda_duplicate_cleanup');
            }

            assertImportRunActive(runToken);
            finalJob = getJob() || finalJob;
            assertPatientIdentityMatchesJob(finalJob, 'before_quality_control');
            showBadge('Contrôle qualité final WEDA…', { duration: 6000 });

            const qualityReport = await runWedaImportQualityControl(finalJob, { runToken });

            finalJob = getJob() || finalJob;
            const nbImported = Array.isArray(finalJob.imported) ? finalJob.imported.length : 0;
            const duplicateCounts = getDuplicateSkipCounts(finalJob);
            const nbDuplicatesSkipped = duplicateCounts.regular;
            const nbDuplicatesSkippedTotal = duplicateCounts.total;
            const nbDuplicatesSkippedQualityRepair = duplicateCounts.qualityRepair;
            const nbImportedQualityRepair = Array.isArray(finalJob.imported)
                ? finalJob.imported.filter(entry => entry && entry.qualityRepair).length
                : Number(finalJob.importedQualityRepairCount || 0);
            const nbTargetedReimports = nbImportedQualityRepair + nbDuplicatesSkippedQualityRepair;
            const nbHistoricalErrors = Array.isArray(finalJob.errors) ? finalJob.errors.length : 0;
            const nbSkipped = Array.isArray(finalJob.skipped) ? finalJob.skipped.length : 0;
            const nbMissing = qualityReport && qualityReport.missingCount ? qualityReport.missingCount : 0;
            const expectedCount = qualityReport ? qualityReport.expectedCount : items.length;
            const foundCount = qualityReport ? qualityReport.foundCount : Math.max(0, expectedCount - nbMissing);
            const retryableMissingCount = qualityReport && qualityReport.retryableMissingCount !== undefined
                ? Number(qualityReport.retryableMissingCount || 0)
                : nbMissing;
            const unrecoverableMissingCount = qualityReport && qualityReport.unrecoverableMissingCount !== undefined
                ? Number(qualityReport.unrecoverableMissingCount || 0)
                : Math.max(0, nbMissing - retryableMissingCount);
            const qualityFullRetryCount = Number(finalJob.qualityFullRetryCount || 0);

            finalJob.updatedAt = nowIso();
            finalJob.doneAt = nowIso();
            finalJob.wedaWorkerTabId = TAB_ID;
            finalJob.currentItem = null;
            finalJob.currentItemStartedAt = '';

            if (nbMissing > 0) {
                const missingSummary = (qualityReport.missing || [])
                    .slice(0, 4)
                    .map((entry, entryIndex) => {
                        const item = entry.item || {};
                        const member = item.familyMember ? item.familyMember + ' | ' : '';
                        return `${entryIndex + 1}. ${member}${item.description || 'Antécédent'}${item.code ? ' [' + item.code + ']' : ''}`;
                    })
                    .join('\n');

                if (retryableMissingCount <= 0 || qualityFullRetryCount >= MAX_QUALITY_FULL_RETRIES) {
                    finalJob.status = 'ERROR_QUALITY_CONTROL';
                    finalJob.qualityControl = qualityReport;
                    finalJob.qualityControlBlockedAt = nowIso();
                    finalJob.qualityControlBlockedReason = retryableMissingCount <= 0
                        ? 'unrecoverable_missing'
                        : 'full_retry_limit_reached';
                    finalJob.doneAt = '';
                    finalJob.updatedAt = nowIso();
                    finalJob.errors = Array.isArray(finalJob.errors) ? finalJob.errors : [];
                    finalJob.errors.push({
                        at: nowIso(),
                        phase: 'quality_control_blocked',
                        message: retryableMissingCount <= 0
                            ? 'Contrôle qualité incomplet : aucun antécédent absent n’est réparable automatiquement.'
                            : `Contrôle qualité incomplet : limite de ${MAX_QUALITY_FULL_RETRIES} reprise(s) complète(s) atteinte.`,
                        missingSummary,
                        missingCount: nbMissing,
                        retryableMissingCount,
                        unrecoverableMissingCount,
                        qualityFullRetryCount
                    });
                    setJob(finalJob);

                    logImportEvent('error', 'quality_control_blocked', 'Import incomplet arrêté pour éviter une reprise infinie du même patient.', {
                        jobId: finalJob.id,
                        missingCount: nbMissing,
                        retryableMissingCount,
                        unrecoverableMissingCount,
                        qualityFullRetryCount,
                        maxQualityFullRetries: MAX_QUALITY_FULL_RETRIES,
                        missingSummary,
                        qualityReport
                    });

                    releaseWorkerLock(finalJob);
                    restoreWedaBackgroundExecutionShim('quality_control_blocked');
                    setImportLogEnabled(true);
                    showBadge(
                        `Import incomplet arrêté.\nRetrouvés dans WEDA : ${foundCount}/${expectedCount}\nToujours absents : ${nbMissing}\n\n${missingSummary}\n\nJournal : Ctrl+Alt+L ou bouton Logs ATCD.`,
                        { error: true, duration: 30000 }
                    );
                    setTimeout(() => {
                        try { showImportLogPanel(); } catch (_) {}
                    }, 600);
                    return;
                }

                const retryJob = prepareSamePatientFullRetryAfterIncompleteImport(finalJob, qualityReport, {
                    importedCount: nbImported,
                    duplicatesSkippedCount: nbDuplicatesSkipped,
                    duplicatesSkippedTotalCount: nbDuplicatesSkippedTotal,
                    duplicatesSkippedQualityRepairCount: nbDuplicatesSkippedQualityRepair,
                    importedQualityRepairCount: nbImportedQualityRepair,
                    targetedReimportCount: nbTargetedReimports,
                    skippedCount: nbSkipped,
                    historicalErrorCount: nbHistoricalErrors,
                    missingCount: nbMissing,
                    retryableMissingCount,
                    unrecoverableMissingCount,
                    qualityFullRetryCount,
                    maxQualityFullRetries: MAX_QUALITY_FULL_RETRIES,
                    expectedCount,
                    foundCount,
                    missingSummary,
                    previousRunToken: runToken
                });

                releaseWorkerLock(retryJob);
                restoreWedaBackgroundExecutionShim('quality_full_retry');

                showBadge(
                    `Import incomplet : reprise du même patient.\nRetrouvés dans WEDA : ${foundCount}/${expectedCount}\nToujours absents : ${nbMissing}\n\n${missingSummary}\n\nLe patient suivant ne sera pas lancé tant que tout n’est pas retrouvé.`,
                    { error: true, duration: 30000 }
                );

                setTimeout(() => {
                    runWatchedAsync('weda_quality_full_retry_async', () => handleWedaJob(), { job: getJob() || retryJob });
                }, QUALITY_FULL_RETRY_DELAY_MS);
                return;
            }

            if (nbHistoricalErrors > 0) {
                logImportEvent('warning', 'quality_control_repaired', 'Des erreurs initiales ont été corrigées par le contrôle qualité final.', {
                    jobId: finalJob.id,
                    historicalErrorCount: nbHistoricalErrors,
                    importedCount: nbImported,
                    duplicatesSkippedCount: nbDuplicatesSkipped,
                    duplicatesSkippedTotalCount: nbDuplicatesSkippedTotal,
                    duplicatesSkippedQualityRepairCount: nbDuplicatesSkippedQualityRepair,
                    importedQualityRepairCount: nbImportedQualityRepair,
                    targetedReimportCount: nbTargetedReimports,
                    expectedCount,
                    foundCount,
                    qualityReport
                });
            }

            finalJob.duplicatesSkippedCount = nbDuplicatesSkipped;
            finalJob.duplicatesSkippedTotalCount = nbDuplicatesSkippedTotal;
            finalJob.duplicatesSkippedQualityRepairCount = nbDuplicatesSkippedQualityRepair;
            finalJob.importedQualityRepairCount = nbImportedQualityRepair;
            finalJob.targetedReimportCount = nbTargetedReimports;
            finalJob.status = 'DONE_IMPORT';
            setJob(finalJob);
            logImportEvent('info', 'import_done', 'Import CIM10 terminé sans erreur.', {
                jobId: finalJob.id,
                importedCount: nbImported,
                duplicatesSkippedCount: nbDuplicatesSkipped,
                duplicatesSkippedTotalCount: nbDuplicatesSkippedTotal,
                duplicatesSkippedQualityRepairCount: nbDuplicatesSkippedQualityRepair,
                importedQualityRepairCount: nbImportedQualityRepair,
                targetedReimportCount: nbTargetedReimports,
                skippedCount: nbSkipped,
                expectedCount,
                foundCount,
            });

            showBadge(
                `Import CIM10 terminé.\nContrôle qualité : ${foundCount}/${expectedCount} retrouvé(s) dans WEDA.\nDoublons évités : ${nbDuplicatesSkipped}\nLignes Heidi ignorées : ${nbSkipped}\nRéimports ciblés : ${nbTargetedReimports}`,
                { duration: 7000 }
            );

            releaseWorkerLock(finalJob);
            restoreWedaBackgroundExecutionShim('import_done');
            clearJob();
            closeCurrentWedaImportHostTab(finalJob, 'weda_import_done');
        } catch (e) {
            if (isSupersededImportError(e)) {
                releaseWorkerLock(getJob() || job);
                restoreWedaBackgroundExecutionShim('superseded');
                return;
            }

            if (e && e.patientIdentityMismatch) {
                const failedJob = failPatientIdentityMismatch(getJob() || job, e);
                releaseWorkerLock(failedJob);
                restoreWedaBackgroundExecutionShim('patient_identity_mismatch');
                closeCurrentWedaImportHostTab(failedJob, 'patient_identity_mismatch');
                return;
            }

            const message = logWorkflowError('import_flow_unhandled', e, {
                job,
                phase: 'handleWedaImportJob'
            });

            const failedJob = getJob() || job;
            if (failedJob && failedJob.id) {
                const parsedCount = Array.isArray(failedJob.parsedAtcd) ? failedJob.parsedAtcd.length : 0;
                const importIndex = Number(failedJob.importIndex || 0);
                const canResume = parsedCount > 0 && importIndex < parsedCount;

                failedJob.status = canResume ? 'IMPORT_WEDA' : 'ERROR';
                failedJob.updatedAt = nowIso();
                failedJob.wedaWorkerTabId = TAB_ID;
                failedJob.errors = Array.isArray(failedJob.errors) ? failedJob.errors : [];
                failedJob.errors.push({
                    at: nowIso(),
                    phase: 'import_flow_unhandled',
                    item: getCurrentImportItemFromJob(failedJob),
                    message
                });
                setJob(failedJob);
                releaseWorkerLock(failedJob);

                if (canResume) {
                    logImportEvent('warning', 'import_flow_recovery_scheduled', 'Erreur inattendue : reprise automatique de l’import au prochain passage du worker.', {
                        jobId: failedJob.id,
                        importIndex,
                        parsedCount,
                        message
                    });
                    setTimeout(() => {
                        runWatchedAsync('weda_import_error_recovery_async', () => handleWedaImportJob(), { job: getJob() || failedJob });
                    }, 1500);
                    return;
                }
            }

            showBadge(
                `Import interrompu par une erreur inattendue.\n${message}\n\nJournal : Ctrl+Alt+L ou bouton Logs ATCD.`,
                { error: true, duration: 30000 }
            );
            restoreWedaBackgroundExecutionShim('import_unhandled_error');
            setImportLogEnabled(true);
            setTimeout(() => {
                try { showImportLogPanel(); } catch (_) {}
            }, 600);
        } finally {
            if (window.__AUTO_ATCD_CIM10_LMSTUDIO_IMPORT_RUN_TOKEN__ === runToken) {
                window.__AUTO_ATCD_CIM10_LMSTUDIO_IMPORT_RUNNING__ = false;
            }
        }
    }

    /************************************************************
     * RACCOURCI CLAVIER
     ************************************************************/

    function installKeyboardShortcut() {
        window.addEventListener('keydown', (event) => {
            if (!isAntecedentLauncherPageWeda()) return;
            if (event.repeat) return;
            if (isEditableTarget(event.target)) return;

            const isInsertKey = event.key === 'Insert' || event.code === 'Insert';

            if (isInsertKey) {
                event.preventDefault();
                event.stopPropagation();
                showBadge('Touche Inser détectée.\nLancement export ATCD WEDA vers LM Studio local…', { duration: 5000 });
                startAtcdCim10ExportFromWeda('keyboard_insert');
            }
        }, true);
    }

    /************************************************************
     * FONCTIONS CONSOLE
     ************************************************************/

    function exposeConsoleFunctions() {
        const api = {
            AUTO_ATCD_CIM10_LMSTUDIO_START: () => startAtcdCim10ExportFromWeda('console'),

            AUTO_ATCD_CIM10_LMSTUDIO_COLOR_ONLY: () => startWedaColorOnly('console'),

            AUTO_ATCD_CIM10_LMSTUDIO_COLOR_ONLY_LAST: () => {
                const report = gmGetJson(KEY_COLOR_ONLY_LAST_REPORT, null);
                console.log(LOG_PREFIX, 'COLOR_ONLY_LAST_REPORT', report);
                return report;
            },

            AUTO_ATCD_CIM10_LMSTUDIO_LAST: () => {
                const report = gmGetJson(KEY_LAST_REPORT, null);
                console.log(LOG_PREFIX, 'LAST_REPORT', report);
                return report;
            },

            AUTO_ATCD_CIM10_LMSTUDIO_CURRENT_JOB: () => {
                const job = getJob();
                console.log(LOG_PREFIX, 'CURRENT_JOB', job);
                return job;
            },

            AUTO_ATCD_CIM10_LMSTUDIO_LOG_ON: () => setImportLogEnabled(true),

            AUTO_ATCD_CIM10_LMSTUDIO_LOG_OFF: () => setImportLogEnabled(false),

            AUTO_ATCD_CIM10_LMSTUDIO_LOG_SHOW: () => showImportLogPanel(),

            AUTO_ATCD_CIM10_LMSTUDIO_LOGS: () => {
                const logs = getImportLogs();
                const compact = buildCompactImportLogExport(logs);
                console.log(LOG_PREFIX, 'IMPORT_LOGS_COMPACT', compact);
                return compact;
            },

            AUTO_ATCD_CIM10_LMSTUDIO_LOGS_ALL: () => {
                const logs = getImportLogs();
                const compact = buildCompactImportLogExport(logs, { allJobs: true });
                console.log(LOG_PREFIX, 'IMPORT_LOGS_COMPACT_ALL', compact);
                return compact;
            },

            AUTO_ATCD_CIM10_LMSTUDIO_LOGS_RAW: () => {
                const logs = getImportLogs();
                console.log(LOG_PREFIX, 'IMPORT_LOGS_RAW', logs);
                return logs;
            },

            AUTO_ATCD_CIM10_LMSTUDIO_LOG_CLEAR: () => clearImportLogs(),

            AUTO_ATCD_CIM10_LMSTUDIO_ERRORS: () => {
                const report = gmGetJson(KEY_LAST_REPORT, null) || getJob() || {};
                const errors = Array.isArray(report.errors) ? report.errors : [];
                const summary = summarizeJobErrors(errors, Math.max(errors.length, 1));
                const output = { count: errors.length, summary, errors };
                console.log(LOG_PREFIX, 'IMPORT_ERRORS', output);
                return output;
            },

            AUTO_ATCD_CIM10_LMSTUDIO_DIAG_STOP: () => {
                const job = getJob() || gmGetJson(KEY_LAST_REPORT, null) || null;
                const output = {
                    at: nowIso(),
                    url: location.href,
                    tabId: TAB_ID,
                    isWeda: isWeda(),
                    isAntecedentPage: isAntecedentPageWeda(),
                    isWorkerForJob: isThisWedaWorkerForJob(job),
                    progress: getJobProgressSnapshot(job),
                    popupPresent: !!findElementDeep(SELECTOR_WEDA_COMMENT),
                    lastLogs: getImportLogs().slice(-12),
                    qualityControl: job && job.qualityControl ? job.qualityControl : null
                };
                console.log(LOG_PREFIX, 'DIAG_STOP', output);
                return output;
            },

            AUTO_ATCD_CIM10_LMSTUDIO_DIAG_DOUBLONS: () => {
                const job = getJob() || gmGetJson(KEY_LAST_REPORT, null) || {};
                const items = Array.isArray(job.parsedAtcd) ? job.parsedAtcd : [];
                const blocks = collectWedaImportedAntecedentBlocks();
                const noControleBlocks = collectWedaNoControleDiagnosticBlocks(IMPORT_DIAGNOSTIC_BLOCK_LIMIT);
                const report = {
                    at: nowIso(),
                    blocks: blocks.map(block => ({
                        section: block.section || null,
                        codes: block.codes || [],
                        source: block.source || '',
                        text: String(block.text || '').slice(0, 260)
                    })),
                    items: items.map(item => {
                        const duplicateBlock = findExistingWedaDuplicateForItem(item, [item.code]);
                        return {
                            item,
                            duplicate: !!duplicateBlock,
                            duplicateBlock: duplicateBlock ? {
                                section: duplicateBlock.section || null,
                                codes: duplicateBlock.codes || [],
                                source: duplicateBlock.source || '',
                                text: String(duplicateBlock.text || '').slice(0, 260)
                            } : null
                        };
                    }),
                    noControleBlocks
                };
                console.log(LOG_PREFIX, 'DIAG_DOUBLONS', report);
                return report;
            },

            AUTO_ATCD_CIM10_LMSTUDIO_DIAG_WEDA_DOM: () => {
                const job = getJob() || gmGetJson(KEY_LAST_REPORT, null) || {};
                const items = Array.isArray(job.parsedAtcd) ? job.parsedAtcd : [];
                const report = {
                    at: nowIso(),
                    url: location.href,
                    tabId: TAB_ID,
                    progress: getJobProgressSnapshot(job),
                    importedBlocks: collectWedaImportedAntecedentBlocks().map(summarizeDiagnosticBlock),
                    noControleBlocks: collectWedaNoControleDiagnosticBlocks(40),
                    items: items.map(item => ({
                        item,
                        diagnostic: buildWedaItemDomDiagnostic(item, [item.code])
                    }))
                };
                logImportDiagnostic('manual_weda_dom', 'Diagnostic manuel DOM WEDA demandé.', report);
                console.log(LOG_PREFIX, 'DIAG_WEDA_DOM', report);
                return report;
            },

            AUTO_ATCD_CIM10_LMSTUDIO_CLEAR: () => {
                clearJob();
                try { GM_deleteValue(KEY_WORKER_LOCK); } catch (_) {}
                try { GM_deleteValue(KEY_WORKER_OPEN_LOCK); } catch (_) {}
                try { GM_deleteValue(KEY_HEIDI_OPEN_LOCK); } catch (_) {}
                clearWorkerJobIdForThisTab();
                clearHeidiJobIdForThisTab();
                showBadge('Job Auto ATCD CIM10 effacé.', { duration: 4000 });
                return true;
            },

            AUTO_ATCD_CIM10_LMSTUDIO_EXTRACT_NOW: () => {
                const extraction = extractNonCodedAntecedentsFromWeda();
                const text = formatExtractedAntecedents(extraction.items);
                const report = {
                    at: nowIso(),
                    itemCount: extraction.items.length,
                    items: extraction.items,
                    text,
                    debug: extraction.debug
                };
                console.log(LOG_PREFIX, 'EXTRACT_NOW', report);
                return report;
            },

            AUTO_ATCD_CIM10_LMSTUDIO_DIAG: () => {
                const root = getWedaAntecedentRoot() || document.body;
                const extraction = extractNonCodedAntecedentsFromWeda();
                const report = {
                    url: location.href,
                    tabId: TAB_ID,
                    workerJobIdForThisTab: getWorkerJobIdForThisTab(),
                    updatePanelAntecedent: !!getWedaAntecedentRoot(),
                    count_imgAtcdNoControle_class: root.querySelectorAll('.imgAtcdNoControle').length,
                    count_title_non_pris: root.querySelectorAll('[title*="Non pris"], [title*="sécurisation"], [title*="securisation"]').length,
                    count_sm: root.querySelectorAll('.sm').length,
                    count_sma: root.querySelectorAll('.sma').length,
                    itemCount: extraction.items.length,
                    detectedHeaders: extraction.debug.detectedHeaders,
                    items: extraction.items,
                    job: getJob(),
                    workerLock: gmGetJson(KEY_WORKER_LOCK, null)
                };
                console.log(LOG_PREFIX, 'DIAG', report);
                return report;
            },

            AUTO_ATCD_CIM10_LMSTUDIO_DIAG_DROP: () => {
                const mapTarget = e => ({
                    tag: e.tagName,
                    class: String(e.className || ''),
                    title: e.getAttribute('title') || '',
                    mainLabel: getHeaderMainLabel(e),
                    ownText: getOwnText(e),
                    scoreMedical: scoreWedaImportHeaderCandidate(e, 'medical'),
                    scoreChirurgical: scoreWedaImportHeaderCandidate(e, 'chirurgical'),
                    scoreFamilial: scoreWedaImportHeaderCandidate(e, 'familial'),
                    text: normalizeSpaces((e.innerText || e.textContent || '').slice(0, 220))
                });

                const report = {
                    tabId: TAB_ID,
                    workerJobIdForThisTab: getWorkerJobIdForThisTab(),
                    workerLock: gmGetJson(KEY_WORKER_LOCK, null),
                    medicalHeaders: findWedaExactCategoryHeaders('medical').map(mapTarget),
                    medicalTargets: getWedaDropTargetsForSection('medical').map(mapTarget),
                    chirurgicalHeaders: findWedaExactCategoryHeaders('chirurgical').map(mapTarget),
                    chirurgicalTargets: getWedaDropTargetsForSection('chirurgical').map(mapTarget),
                    familialHeaders: findWedaExactCategoryHeaders('familial').map(mapTarget),
                    familialTargets: getWedaDropTargetsForSection('familial').map(mapTarget),
                    popupPresent: !!findElementDeep(SELECTOR_WEDA_COMMENT),
                    heritagePresent: !!findElementDeep(SELECTOR_WEDA_HERITAGE),
                    collateralPresent: !!findElementDeep(SELECTOR_WEDA_COLLATERAL)
                };
                console.log(LOG_PREFIX, 'DIAG_DROP', report);
                return report;
            },

            AUTO_ATCD_CIM10_LMSTUDIO_DIAG_ALLERGIES: () => {
                const report = {
                    at: nowIso(),
                    url: location.href,
                    categoryStates: collectWedaAllergyCategoryStates(),
                    hasKnownAllergyEntryInConfiguredCategories: hasAnyKnownAllergyEntryInConfiguredCategories(),
                    hasKnownAllergyLineInAntecedents: hasAnyKnownAllergyLineInWedaAntecedents(),
                    hasVisibleNoKnownAllergyEntry: hasVisibleWedaNoKnownAllergyEntry(),
                    candidates: findEmptyAllergyCategoryNoKnownAllergyCandidates().map(candidate => ({
                        label: candidate.label,
                        headerText: candidate.headerText,
                        onclick: candidate.onclick,
                        source: candidate.source,
                        target: candidate.target
                    }))
                };
                console.log(LOG_PREFIX, 'DIAG_ALLERGIES', report);
                return report;
            },

            AUTO_ATCD_CIM10_LMSTUDIO_CLICK_NO_ALLERGY_NOW: async () => {
                const report = await clickNoKnownAllergyForEmptyCategories(getJob() || {}, 'console_manual');
                report.categoryStates = collectWedaAllergyCategoryStates();
                console.log(LOG_PREFIX, 'CLICK_NO_ALLERGY_NOW', report);
                return report;
            },

            AUTO_ATCD_CIM10_LMSTUDIO_READ_HEIDI_RESULT: () => {
                const text = getHeidiAskAiText();
                const parsed = parseHeidiResultToItems(text);
                const report = { text, parsed, looksLikeResult: looksLikeHeidiCim10Result(text) };
                console.log(LOG_PREFIX, 'READ_HEIDI_RESULT', report);
                return report;
            },

            AUTO_ATCD_CIM10_LMSTUDIO_TEST_PARSE_HEIDI_RESULT: (text) => {
                const sample = String(text || 'F|Père|Diabète|E14||\nF|Frère|Diabète|E14||\nF|Grand-père|Diabète|E14||\nF|Mère|Hypertension artérielle|I10||\nF|Père|Thrombose veineuse profonde|I82.9||\nF|Père|Diabète|E14||\nM|Ligne incomplète|I10');
                const parsed = parseHeidiResultToItems(sample);
                console.log(LOG_PREFIX, 'TEST_PARSE_HEIDI_RESULT', parsed);
                return parsed;
            },

            AUTO_ATCD_CIM10_LMSTUDIO_TEST_COLLATERAL: (member) => {
                const value = mapFamilyMemberToCollateralValue(member);
                const report = {
                    member,
                    value,
                    kind: getFamilyMemberKind(member),
                    branch: getFamilyMemberBranch(member),
                    refusesOtherFallback: familyMemberMustNotFallbackToOther(member)
                };
                console.log(LOG_PREFIX, 'TEST_COLLATERAL', report);
                return report;
            },

            AUTO_ATCD_CIM10_LMSTUDIO_TEST_COLLATERAL_LABELS: (member, labels) => {
                const list = Array.isArray(labels) && labels.length
                    ? labels
                    : ['Père', 'Mère', 'Frère', 'Sœur', 'Grand-père', 'Grand-père paternel', 'Grand-père maternel', 'Grand-mère', 'Oncle', 'Oncle paternel', 'Oncle maternel', 'Tante', 'Tante paternelle', 'Tante maternelle', 'Cousin', 'Cousine', 'Autre'];
                const report = {
                    member,
                    normalizedMember: normalizeForMatch(member),
                    kind: getFamilyMemberKind(member),
                    branch: getFamilyMemberBranch(member),
                    labels: list.map(label => ({
                        label,
                        normalized: normalizeForMatch(label),
                        matches: familyMemberOptionMatches(label, member)
                    }))
                };
                console.log(LOG_PREFIX, 'TEST_COLLATERAL_LABELS', report);
                return report;
            },

            AUTO_ATCD_CIM10_LMSTUDIO_DIAG_COLLATERAL: (member = 'Tante') => {
                const select = findWedaCollateralSelect();
                const candidates = select ? (getFamilyMemberOptionCandidates(select, member) || []) : [];
                const report = {
                    member,
                    popupOpen: !!findWedaAntecedentPanel(),
                    selectFound: !!select,
                    selectedValue: select ? String(select.value || '') : '',
                    selectedText: select && select.selectedOptions && select.selectedOptions[0]
                        ? getSelectOptionLabel(select.selectedOptions[0])
                        : '',
                    kind: getFamilyMemberKind(member),
                    branch: getFamilyMemberBranch(member),
                    fallbackValue: mapFamilyMemberToCollateralValue(member),
                    refusesOtherFallback: familyMemberMustNotFallbackToOther(member),
                    candidates: candidates.map(candidate => ({
                        value: String(candidate.option && candidate.option.value || ''),
                        text: candidate.label,
                        score: candidate.score,
                        reason: candidate.reason
                    })),
                    options: select ? getSelectOptionsSnapshot(select) : []
                };
                console.log(LOG_PREFIX, 'DIAG_COLLATERAL', report);
                return report;
            },

            AUTO_ATCD_CIM10_LMSTUDIO_TEST_COMMENT: (description, remarks, date) => {
                const details = {
                    description: description || 'Infarctus du myocarde',
                    remarks: remarks || '',
                    date: date || ''
                };
                const comment = buildWedaComment(details);
                const textarea = findElementDeep(SELECTOR_WEDA_COMMENT);
                if (textarea) setNativeValue(textarea, comment);
                const dateFilled = setWedaDatePonctuelle(details.date, textarea && textarea.ownerDocument || document);
                const report = { details, comment, textareaFound: !!textarea, dateFilled };
                console.log(LOG_PREFIX, 'TEST_COMMENT', report);
                return report;
            },

            AUTO_ATCD_CIM10_LMSTUDIO_TEST_PARENT_CODES: (code) => {
                const report = {
                    code,
                    normalized: normalizeCim10Code(code),
                    parents: getParentCim10Codes(code),
                    searchQueriesActuallyUsed: [
                        normalizeCim10Code(code),
                        ...getParentCim10Codes(code)
                    ]
                };
                console.log(LOG_PREFIX, 'TEST_PARENT_CODES', report);
                return report;
            },

            AUTO_ATCD_CIM10_LMSTUDIO_TEST_SIMILARITY: (reference, candidate) => {
                const report = {
                    reference,
                    candidate,
                    referenceTokens: tokenizeForSimilarity(reference),
                    candidateTokens: tokenizeForSimilarity(candidate),
                    score: scoreTextSimilarity(reference, candidate)
                };
                console.log(LOG_PREFIX, 'TEST_SIMILARITY', report);
                return report;
            },

            AUTO_ATCD_CIM10_LMSTUDIO_TEST_DUPLICATE_FUZZY: (reference, candidate, codeA = 'N10', codeB = codeA, dateA = '', dateB = '') => {
                const item = {
                    section: 'medical',
                    description: reference || 'Néphrite tubulo-interstitielle aiguë',
                    remarks: '',
                    comment: reference || 'Néphrite tubulo-interstitielle aiguë\nPyélonéphrite\ncomplication calice gauche',
                    code: codeA,
                    date: dateA
                };
                const blockText = [
                    candidate || 'Néphrite tubulo-interstitielle aiguë Latéralité : Gauche\nPyélonéphrite\ncomplication calice',
                    codeB ? `[${codeB}]` : '',
                    dateB || ''
                ].filter(Boolean).join('\n');
                const block = {
                    text: blockText,
                    normalizedText: normalizeForMatch(blockText),
                    codes: [normalizeCim10Code(codeB || codeA)].filter(Boolean),
                    section: 'medical',
                    source: 'console_test'
                };
                const expectedCodes = [normalizeCim10Code(codeA)].filter(Boolean);
                const report = {
                    reference: item.comment,
                    candidate: block.text,
                    expectedCodes,
                    blockCodes: block.codes,
                    itemDate: getItemDuplicateDate(item),
                    blockDate: getBlockDuplicateDate(block),
                    datesConflict: duplicateDatesConflictForItemAndBlock(item, block),
                    overlap: getDuplicateCommentOverlap(getExpectedDuplicateComment(item), getBlockDuplicateComment(block)),
                    similarityOverlap: getDuplicateCommentOverlap(getExpectedDuplicateCommentForSimilarity(item), getBlockDuplicateCommentForSimilarity(block, item)),
                    duplicate: getCloseCodeFuzzyCommentDuplicateMatch(block, item, expectedCodes),
                    highSimilarityDuplicate: getHighSimilarityCommentDuplicateMatch(block, item)
                };
                console.log(LOG_PREFIX, 'TEST_DUPLICATE_FUZZY', report);
                return report;
            },

            AUTO_ATCD_CIM10_LMSTUDIO_TEST_DUPLICATE_HIGH_COMMENT: (reference, candidate, codeA = 'N10', codeB = 'I10', dateA = '', dateB = '', familyA = '', familyB = '') => {
                const section = familyA || familyB ? 'familial' : 'medical';
                const item = {
                    section,
                    familyMember: familyA || '',
                    description: reference || 'Pyélonéphrite',
                    remarks: '',
                    comment: reference || 'Pyélonéphrite\ncomplication calice gauche',
                    code: codeA,
                    date: dateA
                };
                const blockText = [
                    familyB || '',
                    candidate || 'Pyélonéphrite\ncomplication calice gauche',
                    codeB ? `[${codeB}]` : '',
                    dateB || ''
                ].filter(Boolean).join('\n');
                const block = {
                    text: blockText,
                    normalizedText: normalizeForMatch(blockText),
                    codes: [normalizeCim10Code(codeB || codeA)].filter(Boolean),
                    section,
                    source: 'console_test_high_similarity'
                };
                const report = {
                    reference: item.comment,
                    candidate: block.text,
                    codeA: normalizeCim10Code(codeA),
                    codeB: normalizeCim10Code(codeB),
                    familyA: item.familyMember,
                    familyB,
                    itemDate: getItemDuplicateDate(item),
                    blockDate: getBlockDuplicateDate(block),
                    datesConflict: duplicateDatesConflictForItemAndBlock(item, block),
                    overlap: getDuplicateCommentOverlap(getExpectedDuplicateComment(item), getBlockDuplicateComment(block)),
                    similarityOverlap: getDuplicateCommentOverlap(getExpectedDuplicateCommentForSimilarity(item), getBlockDuplicateCommentForSimilarity(block, item)),
                    duplicate: getHighSimilarityCommentDuplicateMatch(block, item)
                };
                console.log(LOG_PREFIX, 'TEST_DUPLICATE_HIGH_COMMENT', report);
                return report;
            },

            AUTO_ATCD_CIM10_LMSTUDIO_FORCE_IMPORT_FROM_HEIDI: async () => {
                const job = await forceImportFromHeidiResult('console_force');
                console.log(LOG_PREFIX, 'FORCE_IMPORT_FROM_HEIDI', job);
                return job;
            },

            AUTO_ATCD_CIM10_LMSTUDIO_FORCE_IMPORT_FROM_LMSTUDIO: async () => {
                const job = await forceImportFromHeidiResult('console_force_lmstudio');
                console.log(LOG_PREFIX, 'FORCE_IMPORT_FROM_LMSTUDIO', job);
                return job;
            },

            AUTO_ATCD_CIM10_LMSTUDIO_IMPORT_HEIDI_RESULT: async () => {
                const job = await forceImportFromHeidiResult('console_import_alias');
                console.log(LOG_PREFIX, 'IMPORT_HEIDI_RESULT', job);
                return job;
            },

            AUTO_ATCD_CIM10_LMSTUDIO_IMPORT_LMSTUDIO_RESULT: async () => {
                const job = await forceImportFromHeidiResult('console_import_lmstudio_alias');
                console.log(LOG_PREFIX, 'IMPORT_LMSTUDIO_RESULT', job);
                return job;
            },

            AUTO_ATCD_CIM10_LMSTUDIO_TEST_HEIDI: async (text) => {
                const sample = String(text || 'Notes WEDA à coder : HTA, diabète, thrombose veineuse profonde. Chirurgies : appendicectomie, amygdalectomie, prothèse totale de hanche gauche. Familiaux : diabète chez le père, le frère et le grand-père ; infarctus chez le père.');
                const payload = buildHeidiPayload(sample);
                const job = {
                    id: makeJobId(),
                    version: VERSION_AUTO_ATCD_CIM10_LMSTUDIO,
                    createdAt: nowIso(),
                    updatedAt: nowIso(),
                    source: 'console_test_lmstudio',
                    sourceWedaTabId: '',
                    wedaWorkerTabId: '',
                    status: 'PENDING_LMSTUDIO',
                    itemCount: 0,
                    extractedText: sample,
                    heidiPayload: payload,
                    lmStudioPayload: payload,
                    errors: []
                };

                setJob(job);

                if (isHeidi()) await handleHeidiJob();
                else await openHeidiWorkerForJob(job);

                return job;
            },

            AUTO_ATCD_CIM10_LMSTUDIO_TEST_LMSTUDIO: async (text) => {
                return api.AUTO_ATCD_CIM10_LMSTUDIO_TEST_HEIDI(text);
            }
        };

        try {
            Object.assign(window, api);
            if (typeof unsafeWindow !== 'undefined') Object.assign(unsafeWindow, api);
        } catch (_) {}
    }

    /************************************************************
     * WATCHERS
     ************************************************************/

    function publishWedaImportWake(job, reason = '') {
        if (!job || !job.id) return false;

        gmSetJson(KEY_IMPORT_WAKE, {
            jobId: job.id,
            status: job.status || '',
            batchId: job.batchId || '',
            sourceWedaTabId: job.sourceWedaTabId || '',
            wedaWorkerTabId: job.wedaWorkerTabId || '',
            reason,
            fromTabId: TAB_ID,
            ts: nowMs(),
            at: nowIso()
        });

        return true;
    }

    function isBatchSourceWorkerTopWindow() {
        if (!isWeda() || !isTopLevelWindow()) return false;
        return /(?:^|[&#])AUTO_ATCD_BATCH_WORKER=/i.test(String(location.hash || ''));
    }

    function shouldHostWedaImportFrame(job) {
        if (!WEDA_IMPORT_IFRAME_ENABLED) return false;
        if (!isWeda() || !isTopLevelWindow()) return false;
        if (isBatchSourceWorkerTopWindow()) return false;
        if (!job || job.status !== 'IMPORT_WEDA' || !job.id || !job.batchId) return false;
        if (!job.wedaImportUrl && !job.patientUrl) return false;
        if (canThisTabRunWedaImport(job)) return false;

        const frameHostAgeMs = job.wedaImportFrameOpenedAt ? nowMs() - Date.parse(job.wedaImportFrameOpenedAt) : 0;
        if (
            job.wedaImportFrameParentTabId &&
            job.wedaImportFrameParentTabId !== TAB_ID &&
            Number.isFinite(frameHostAgeMs) &&
            frameHostAgeMs >= 0 &&
            frameHostAgeMs < 60000
        ) {
            return false;
        }

        const lock = gmGetJson(KEY_WORKER_LOCK, null);
        if (
            lock &&
            lock.jobId === job.id &&
            lock.tabId &&
            Number(lock.expiresAt || 0) > nowMs()
        ) {
            return false;
        }

        return true;
    }

    function cleanupWedaImportFrame(jobOrReport = null, reason = '') {
        if (!isWeda() || !isTopLevelWindow()) return false;

        const frame = document.getElementById(WEDA_IMPORT_IFRAME_ID);
        if (!frame) return false;

        const jobId = jobOrReport && jobOrReport.id ? jobOrReport.id : '';
        if (jobId && frame.dataset && frame.dataset.jobId && frame.dataset.jobId !== jobId) return false;

        try { frame.remove(); } catch (_) {}
        logImportEvent('info', 'weda_import_iframe_cleanup', 'Iframe import WEDA supprimé.', {
            jobId: jobId || (frame.dataset && frame.dataset.jobId) || '',
            reason
        });
        return true;
    }

    function ensureWedaImportFrameRunner(job, reason = '') {
        if (!shouldHostWedaImportFrame(job)) return false;

        if (!document.body) {
            setTimeout(() => ensureWedaImportFrameRunner(getJob() || job, `${reason}_body_wait`), 500);
            return false;
        }

        const importUrl = job.wedaImportUrl || job.patientUrl || 'https://secure.weda.fr/';
        const frameUrl = buildWedaWorkerUrl(importUrl, job.id) + '&' + WEDA_IMPORT_IFRAME_FLAG;
        const existing = document.getElementById(WEDA_IMPORT_IFRAME_ID);

        if (existing && existing.dataset && existing.dataset.jobId === job.id) {
            publishWedaImportWake(job, `iframe_existing_${reason || 'wake'}`);
            return true;
        }

        if (existing) {
            try { existing.remove(); } catch (_) {}
        }

        const frame = document.createElement('iframe');
        frame.id = WEDA_IMPORT_IFRAME_ID;
        frame.title = 'Import CIM-10 WEDA en arrière-plan';
        frame.src = frameUrl;
        frame.dataset.jobId = job.id;
        frame.dataset.createdAt = String(nowMs());
        frame.dataset.reason = reason || '';
        frame.style.position = 'fixed';
        frame.style.left = '-10000px';
        frame.style.top = '0';
        frame.style.width = '1280px';
        frame.style.height = '900px';
        frame.style.opacity = '0.001';
        frame.style.pointerEvents = 'none';
        frame.style.border = '0';
        frame.style.zIndex = '0';
        frame.setAttribute('aria-hidden', 'true');

        document.body.appendChild(frame);

        const latest = getJob() || job;
        if (latest && latest.id === job.id) {
            latest.wedaImportFrameJobId = job.id;
            latest.wedaImportFrameParentTabId = TAB_ID;
            latest.wedaImportFrameOpenedAt = latest.wedaImportFrameOpenedAt || nowIso();
            latest.wedaImportFrameLastReason = reason || '';
            latest.updatedAt = nowIso();
            setJob(latest);
            publishWedaImportWake(latest, `iframe_opened_${reason || 'import'}`);
        }

        logImportEvent('info', 'weda_import_iframe_opened', 'Iframe WEDA invisible ouvert pour exécuter l’import en arrière-plan.', {
            jobId: job.id,
            reason,
            frameUrl,
            parentUrl: location.href,
            parentTabId: TAB_ID
        });

        return true;
    }

    function wakeWedaImportRunner(job, reason = '') {
        if (!job || job.status !== 'IMPORT_WEDA') return false;
        if (!canThisTabRunWedaImport(job)) return false;

        const suffix = String(reason || 'job')
            .replace(/[^a-z0-9_]+/gi, '_')
            .slice(0, 60) || 'job';

        runWatchedAsync(`weda_import_wake_${suffix}`, () => handleWedaImportJob(), {
            job,
            reason,
            runnerMode: canSourceWedaTabRunImport(job) ? 'source_weda_tab' : 'worker_tab'
        });
        return true;
    }

    function wakeLatestWedaImportRunner(reason = '') {
        const job = getJob();
        ensureWedaImportFrameRunner(job, reason);
        return wakeWedaImportRunner(job, reason);
    }

    function scheduleWedaImportWakeChecks(reason = 'scheduled') {
        [0, 250, 1000, 3000, 8000, 15000].forEach(delayMs => {
            setTimeout(() => {
                wakeLatestWedaImportRunner(`${reason}_${delayMs}`);
            }, delayMs);
        });
    }

    function installWedaImportWakeListener() {
        if (!isWeda()) return;
        if (window.__AUTO_ATCD_CIM10_LMSTUDIO_IMPORT_WAKE_LISTENER__) return;
        window.__AUTO_ATCD_CIM10_LMSTUDIO_IMPORT_WAKE_LISTENER__ = true;

        if (typeof GM_addValueChangeListener === 'function') {
            GM_addValueChangeListener(KEY_JOB, (_name, _oldValue, newValue, remote) => {
                const changedJob = parseGmJsonValue(newValue, null);
                if (!changedJob || changedJob.status !== 'IMPORT_WEDA') return;

                const latest = getJob() || changedJob;
                if (latest && changedJob.id && latest.id && latest.id !== changedJob.id) return;

                ensureWedaImportFrameRunner(latest || changedJob, remote ? 'gm_job_remote' : 'gm_job_local');
                wakeWedaImportRunner(latest || changedJob, remote ? 'gm_job_remote' : 'gm_job_local');
            });

            GM_addValueChangeListener(KEY_IMPORT_WAKE, (_name, _oldValue, newValue, remote) => {
                const signal = parseGmJsonValue(newValue, null);
                const latest = getJob();
                if (!signal || !latest || signal.jobId !== latest.id) return;

                ensureWedaImportFrameRunner(latest, remote ? `gm_import_wake_${signal.reason || 'remote'}` : `gm_import_wake_${signal.reason || 'local'}`);
                wakeWedaImportRunner(latest, remote ? `gm_import_wake_${signal.reason || 'remote'}` : `gm_import_wake_${signal.reason || 'local'}`);
            });

            GM_addValueChangeListener(KEY_LAST_REPORT, (_name, _oldValue, newValue) => {
                const report = parseGmJsonValue(newValue, null);
                if (report && report.id && isWedaImportTerminalStatus(report.status)) {
                    cleanupWedaImportFrame(report, 'last_report_terminal');
                }
            });
        } else {
            logImportEvent('warning', 'weda_import_wake_listener', 'GM_addValueChangeListener indisponible : réveil WEDA limité aux contrôles périodiques.', {
                tabId: TAB_ID
            });
        }

        document.addEventListener('visibilitychange', () => {
            wakeLatestWedaImportRunner(document.hidden ? 'visibility_hidden' : 'visibility_visible');
        }, true);

        window.addEventListener('focus', () => {
            wakeLatestWedaImportRunner('window_focus');
        }, true);

        scheduleWedaImportWakeChecks('boot');
    }

    function installWedaWatcher() {
        if (!isWeda()) return;

        setInterval(() => {
            try {
                injectWedaButtonIfUseful();
                if (isAntecedentPageWeda()) injectImportLogButtonIfUseful();
                else removeImportLogUi();

                const job = getJob();
                if (!job) return;

                if (isWedaImportTerminalStatus(job.status)) {
                    restoreWedaBackgroundExecutionShim('weda_watcher_terminal_job');
                    cleanupWedaImportFrame(job, 'weda_watcher_terminal_job');
                    return;
                }

                if (
                    job.status === 'WAITING_WEDA_ANTECEDENT_PAGE' &&
                    job.sourceWedaTabId === TAB_ID &&
                    isAntecedentPageWeda()
                ) {
                    showBadge('Page Antécédents chargée.\nReprise automatique de l’extraction…', { duration: 5000 });
                    runWatchedAsync('weda_extract_async', () => handleWedaJob(), { job });
                }

                if (
                    job.status === 'EXTRACTING_WEDA' &&
                    job.sourceWedaTabId === TAB_ID &&
                    isAntecedentPageWeda()
                ) {
                    const recovered = recoverStaleWedaExtraction(job, 'weda_watcher');
                    if (recovered) {
                        showBadge('Extraction WEDA relancée automatiquement avant LM Studio…', { duration: 5000 });
                        runWatchedAsync('weda_extract_recovery_async', () => handleWedaJob(), { job: recovered });
                    }
                }

                if (
                    job.status === 'PENDING_LMSTUDIO' &&
                    job.sourceWedaTabId === TAB_ID &&
                    isAntecedentPageWeda()
                ) {
                    runWatchedAsync('weda_pending_lmstudio_async', () => openHeidiWorkerForJob(job), { job });
                }

                if (job.status === 'IMPORT_WEDA') {
                    ensureWedaImportFrameRunner(job, 'weda_watcher');
                    if (canThisTabRunWedaImport(job)) {
                        checkWedaImportStall(job);
                        runWatchedAsync('weda_import_async', () => handleWedaImportJob(), { job });
                    }
                }
            } catch (e) {
                warn('Erreur surveillance WEDA', e);
                logWorkflowError('weda_watcher_sync', e, {});
            }
        }, 1500);
    }

    function installHeidiWatcher() {
        if (!isHeidi()) return;

        setInterval(() => {
            try {
                if (window.__AUTO_ATCD_CIM10_LMSTUDIO_HEIDI_CLOSING__) return;
                injectHeidiImportButtonIfUseful();
                removeImportLogUi();

                const job = getJob();
                if (closeCurrentScriptedHeidiWorkerIfDoneOrMismatched(job, isThisHeidiWorkerForJob(job) ? 'done' : 'mismatch')) return;
                if (job && !isThisHeidiWorkerForJob(job)) return;
                const resultText = getHeidiAskAiText();
                const visible = observeHeidiVisibleText(resultText);

                if (!job) return;
                if (!canFinalizeVisibleHeidiJob(job)) return;

                if (isStableHeidiResultForAutoFinalize(resultText)) {
                    finalizeStableHeidiResultFromVisibleText(job, resultText, 'heidi_watcher');
                    return;
                }

                maybeMarkUnparsedHeidiResult(job, visible, 'heidi_watcher');
            } catch (e) {
                warn('Erreur surveillance Heidi', e);
                logWorkflowError('heidi_watcher_sync', e, {});
            }
        }, 1500);
    }

    /************************************************************
     * DÉMARRAGE
     ************************************************************/

    function runBootStep(name, fn) {
        try {
            return fn();
        } catch (e) {
            warn('Erreur démarrage étape ' + name, e);
            try { logWorkflowError('boot_' + name, e, {}); } catch (_) {}
            return null;
        }
    }

    async function boot() {
        runBootStep('remember_worker_job_id', rememberWorkerJobIdFromHash);
        runBootStep('remember_heidi_job_id', rememberHeidiJobIdFromHash);
        runBootStep('expose_console_functions', exposeConsoleFunctions);
        runBootStep('install_global_error_logger', installGlobalErrorLogger);
        runBootStep('install_keyboard_shortcut', installKeyboardShortcut);
        runBootStep('install_import_log_shortcut', installImportLogShortcut);
        runBootStep('inject_weda_launcher_early', () => {
            if (isWeda()) injectWedaButtonIfUseful();
        });
        runBootStep('sync_import_log_ui', () => {
            if (isAntecedentPageWeda()) injectImportLogButtonIfUseful();
            else removeImportLogUi();
        });

        if (isWeda()) {
            runBootStep('inject_weda_launcher', injectWedaButtonIfUseful);
            if (!WEDA_IMPORT_IFRAME_ENABLED) cleanupWedaImportFrame(null, 'iframe_disabled_boot');
            installWedaImportWakeListener();
            installWedaWatcher();
            await sleep(500);
            await handleWedaJob();
            await handleWedaImportJob();
        }

        if (isHeidi()) {
            installHeidiWatcher();
            injectHeidiImportButtonIfUseful();
            await sleep(1500);

            const visibleResult = getHeidiAskAiText();
            const job = getJob();
            if (closeCurrentScriptedHeidiWorkerIfDoneOrMismatched(job, isThisHeidiWorkerForJob(job) ? 'done' : 'mismatch')) return;
            if (job && !isThisHeidiWorkerForJob(job)) return;

            if (
                job &&
                canFinalizeVisibleHeidiJob(job) &&
                looksLikeHeidiCim10Result(visibleResult)
            ) {
                showBadge('Résultat Heidi visible.\nAttente de stabilisation avant import…', { duration: 8000 });
                const stableResult = await waitForHeidiResult('');
                if (stableResult) {
                    const latestJob = getJob() || job;
                    if (isPreviousVisibleResultForJob(latestJob, stableResult)) {
                        logPreviousHeidiResultOnce(latestJob, 'boot_visible_result');
                        await handleHeidiJob();
                        return;
                    }
                    const forceRunner = heidiRunnerIsActiveForOtherTab(latestJob) && getJobHeidiRunAgeMs(latestJob) >= HEIDI_FORCE_VISIBLE_RESULT_AFTER_MS;
                    await finalizeHeidiResultAndOpenWeda(
                        stableResult,
                        forceRunner ? 'boot_force_visible_result' : 'boot_visible_result',
                        { forceRunner }
                    );
                }
                else await handleHeidiJob();
            } else {
                await handleHeidiJob();
            }
        }
    }

    boot().catch(e => {
        warn('Erreur boot', e);
        logWorkflowError('boot', e, {});
    });
})();



