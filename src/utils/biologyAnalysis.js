/**
 * Contrôles du bilan HPRIM, indépendants de Weda et du modèle IA.
 * Catalogue et vérification des unités adaptés du script Analyse Biologie Heidi-Weda.
 */
const WedaBiology = (() => {
    const text = value => String(value ?? '').replace(/\s+/g, ' ').trim();
    const fold = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const number = value => {
      const input = text(value).replace(/\s/g, '').replace(/−/g, '-');
      const match = input.match(/^(<=|>=|[<>≤≥]?)([+-]?\d+(?:[,.]\d+)?)(?:[eE]([+-]?\d+))?$/);
      if (!match) return null;
      const exponent = Number(match[3] || 0), parsed = Number(match[2].replace(',', '.')) * Math.pow(10, exponent);
      if (!Number.isFinite(parsed) || Math.abs(exponent) > 100) return null;
      const decimals = (match[2].split(/[,.]/)[1] || '').length;
      return {operator: ({'<=': '≤', '>=': '≥'})[match[1]] || match[1], value: parsed,
        rounding: 0.5 * Math.pow(10, exponent - decimals)};
    };
    function unit(value) {
      let raw = text(value).replace(/μ/g, 'µ').replace(/[−⁻]/g, '-').replace(/10⁹/g, '10^9').replace(/10³/g, '10^3').replace(/¹/g, '1')
        .replace(/²/g, '2').replace(/³/g, '3').replace(/⁹/g, '9').replace(/¹²/g, '12');
      // Ne jamais assimiler le préfixe méga M au préfixe milli m.
      if (/^M(?:g|mol|UI|IU|U|Eq)(?:\/|\s|[.·])/u.test(raw)) return 'unsupported:' + raw;
      raw = raw.replace(/([A-Za-zµ]+)[ .·⋅]*([dcmµu]?[Ll])(?:\^?-1)$/g, '$1/$2');
      return fold(raw).replace(/\s/g, '').replace(/μ/g, 'µ').replace(/³/g, '3').replace(/²/g, '2')
        .replace(/^u(?=g\/|mol\/|kat\/|(?:ui|iu|u)\/)/g, 'µ').replace(/iu/g, 'ui').replace(/^(?:units?|unites?)\//, 'u/')
        .replace(/^ml\/mn(?=\/|$)/, 'ml/min').replace(/m\^2/g, 'm2').replace(/mm\^3/g, 'mm3')
        .replace(/(\d),(\d)/g, '$1.$2');
    }
    const required = new Set(['crp', 'tsh', 'ldl', 'nonhdl', 'hg', 'tropo', 'tropo_i', 'tropo_t', 'pct', 'bnp', 'ntbnp', 'lipase', 'hcg', 'hcg_free', 'inr', 'dfg']);
    const differentialIds = new Set(['pnn', 'mono', 'eos', 'baso', 'lympho']);
    const proteinFractionIds = new Set(['albumine', 'eps_alpha1', 'eps_alpha2', 'eps_beta1', 'eps_beta2', 'eps_beta', 'eps_gamma']);
    const globulinPattern = (latin, greek, index = '') => {
      const fraction = '(?:' + latin + '|' + greek + ')[\\s-]*' + index;
      const globulin = 'globulin(?:e?s)?';
      return new RegExp('^(?:' + fraction + '[\\s-]*(?:' + globulin + ')?|' + globulin + '[\\s-]*' + fraction +
        ')(?=\\s*(?:relative\\b|%|\\(|g\\/|$))');
    };
    const urineRatioPattern = (aliases, numerator) => new RegExp(
      '^(?:' + aliases + ')\\b|^(?:(?:rapport|ratio|quotient)\\s+)?(?:' + numerator +
      ')(?:\\s+urinaires?)?\\s*(?:\\/|sur\\s+)(?:creat(?:inine|ininurie)?|cru|cu)\\b');
    const definitions = [
      // Classer les rapports avant leurs composants ; Alb/Glob n'est pas un RAC.
      ['ag_ratio', 'Rapport Alb/Glob', /^(?:(?:rapport|ratio|quotient)\s+)?(?:alb(?:umin(?:e)?)?\s*\/\s*glob(?:ulines?|ulins?)?|a\s*\/\s*g)\b/],
      ['acr', 'RAC Alb', urineRatioPattern('u?acr|rac\\s*alb(?:umine?)?', 'albumin(?:e|urie)?|albu?')],
      ['pcr', 'RAC Prot', urineRatioPattern('upcr|rac\\s*(?:prot(?:eines?)?|ptu)', 'proteines?(?:\\s+totales?)?|proteinurie|protu|ptu')],
      ['rac', 'RAC', /^rac\b/],
      ['nonhdl', 'non-HDL', /\bnon\s*[- ]?\s*hdl\b/],
      ['ldl', 'LDL', /\bldl(?:c)?\b|l\s*d\s*l/],
      ['hdl', 'HDL', /\bhdl\b|h\s*d\s*l/],
      ['chol_tot', 'cholestérol total', /chol.*(?:total|tot\b| t\b)|^ct\b/],
      ['hg', 'HbA1c', /\bhb\s*a\s*1\s*c\b|hemoglobine.*glyquee|^hg$/],
      ['gly', 'Gly', /\b(?:gly|glycemie|glucose)\b/],
      ['crp', 'CRP', /\bcrp\b|proteine c reactive/],
      ['tsh', 'TSH', /^(?:tsh(?:\s*us)?|thyreostimuline)(?:\b|$)/],
      ['ntbnp', 'NT-proBNP', /nt\s*[- ]?\s*pro\s*[- ]?\s*bnp/],
      ['bnp', 'BNP', /\bbnp\b/],
      ['bili_libre', 'Bili. libre', /bili.*(?:non[- ]*conj|libre|indirect)/],
      ['bili_conj', 'Bili. conj.', /bili.*(?:conj|direct)/],
      ['bili_tot', 'Bili. tot.', /bili.*tot/],
      ['asat', 'ASAT', /^(?:asat|ast|tgo)\b/],
      ['alat', 'ALAT', /^(?:alat|alt|tgp)\b/],
      ['ggt', 'GGT', /^(?:ggt|gamma\s*[- ]?\s*gt|gamma glutamyl)/],
      ['dfg', 'DFG', /\bdfg\b|\begfr\b|ckd\s*[- ]?\s*epi|\bmdrd\b|debit de filtration/],
      ['hb', 'Hb', /^(?:hb|hemoglobine)\b/],
      ['rbc', 'Hématies', /^(?:hematies?|erythrocytes?|globules rouges|rbc)\b/],
      ['ht', 'Hématocrite', /^(?:hematocrite|ht|hct)\b/],
      ['ccmh', 'CCMH', /^(?:ccmh|mchc)\b/],
      ['tcmh', 'TCMH', /^(?:tcmh|tgmh|mch)\b/],
      ['plaq', 'Plaq', /^(?:plaq|plaquettes?|thrombocytes?)\b/],
      ['tg', 'TG', /^(?:tg|triglycerides?)\b/],
      ['tropo_i', 'TROPO I', /^(?:tropo|troponine)\s*[- ]?\s*i\b/],
      ['tropo_t', 'TROPO T', /^(?:tropo|troponine)\s*[- ]?\s*t\b/],
      ['tropo', 'TROPO', /^(?:tropo|troponine)\b/],
      ['pct', 'PCT', /^(?:pct|procalcitonine)\b/],
      ['lipase', 'LIPASE', /^lipase\b/],
      ['hcg_free', 'HCG libre', /(?:hcg|gonadotrophine).*(?:libre|free)/],
      ['hcg', 'HCG', /(?:^|\b)(?:hcg|beta[- ]?hcg|β[- ]?hcg)\b/],
      ['inr', 'INR', /^inr\b/],
      ['pnn', 'PNN', /neutroph|^pnn\b/],
      ['mono', 'Mono', /monocyt|^mono\b/],
      ['eos', 'Eos', /eosinoph|^eos\b/],
      ['baso', 'Baso', /basoph|^baso\b/],
      ['lympho', 'Lympho', /lymphocyt|^lympho\b/],
      ['leuco', 'Leuco', /^(?:leucocytes?|leuco|wbc)\b/],
      ['vgm', 'VGM', /^(?:vgm|mcv)\b/],
      ['ferr', 'ferr', /^(?:ferritine|ferr)\b/],
      ['k', 'K+', /^(?:k\+|potassium|kaliemie)/],
      ['na', 'Na', /^(?:na|sodium|natremie)\b/],
      ['cl', 'Chlore', /^(?:cl|chlore|chloremie|chlorures?)\b/],
      ['t4l', 'T4L', /\bt4\s*(?:l|libre|free)\b|thyroxine.*libre|\bft4\b/],
      ['t3l', 'T3L', /\bt3\s*(?:l|libre|free)\b|triiodothyronine.*libre|\bft3\b/],
      ['t4', 'T4 totale', /\bt4\b|thyroxine/],
      ['t3', 'T3 totale', /\bt3\b|triiodothyronine/],
      ['b12', 'B12', /\bb12\b|cobalamine/],
      ['folates', 'folates', /folates?|acide folique/],
      ['ca_corr', 'Ca corr', /(?:calcium|^ca\b).*(?:corr|ajust)|^ca\s*corr/],
      ['ca_ion', 'Ca ionisé', /(?:calcium|^ca\b).*(?:ionis|ioniz)/],
      ['ca', 'Ca', /^(?:ca|calcium|calcemie)\b/],
      ['mg', 'Mg', /^(?:mg|magnesium|magnesemie)\b/],
      ['phosphore', 'phosphore', /^phosphore\b/],
      ['phosphate', 'phosphate', /^phosphates?\b/],
      ['creat_u', 'Créat U', /^(?:creat|creatinine).*(?:\bu\b|urine|urinaire)/],
      ['creat', 'créat', /^(?:creat|creatinine|creatininemie)\b/],
      ['bun', 'BUN', /\bbun\b|azote ureique|urea nitrogen/],
      ['uree', 'urée', /^(?:uree|urea)\b/],
      ['urates', 'acide urique', /acide urique|uricemie|^urates?\b/],
      ['fer', 'fer', /^(?:fer|sideremie|iron)\b/],
      ['vitd125', 'calcitriol', /(?:vitamine d|vit d|vitd).*(?:1[, .]25)|calcitriol/],
      ['vitd', 'vitamine D', /vitamine d|vit d|vitd|calcidiol|25.*hydroxy.*d/],
      ['psa_free', 'PSA libre', /\bpsa\b.*(?:libre|free)/],
      ['psa', 'PSA', /\bpsa\b/],
      ['pal', 'PAL', /^(?:pal|phosphatases? alcalines?|alkaline phosphatase)\b/],
      ['albumine', 'albumine', /^(?:albumine?|albuminemie|albuminurie)\b/],
      ['eps_alpha1', 'alpha-1 globulines', globulinPattern('alpha', 'α', '1')],
      ['eps_alpha2', 'alpha-2 globulines', globulinPattern('alpha', 'α', '2')],
      ['eps_beta1', 'bêta-1 globulines', globulinPattern('beta', 'β', '1')],
      ['eps_beta2', 'bêta-2 globulines', globulinPattern('beta', 'β', '2')],
      ['eps_beta', 'bêta globulines', globulinPattern('beta', 'β')],
      ['eps_gamma', 'gamma globulines', globulinPattern('gamma', 'γ')],
      ['proteines', 'protéines', /^(?:proteines?|protidemie|proteinurie)\b/],
      ['fibrino', 'fibrinogène', /fibrinogen/],
      ['ldh', 'LDH', /^ldh\b|^lactate.*deshydrogenase/],
      ['ck', 'CK', /^(?:ck|cpk|creatine kinase)\b(?!\s*[- ]?\s*mb\b)/],
      ['amylase', 'amylase', /^amylase\b/],
      ['lactate', 'lactates', /^lactates?\b/],
      ['vs', 'VS', /^vs\b|vitesse de sedimentation/],
      ['ddim', 'D-dimères', /^d\s*[- ]?\s*dimer/],
      ['ph', 'pH', /^ph\b/],
    ];

    function isLipidRatio(label) {
      const key = fold(label).replace(/[.:]/g, '');
      if (!/\b(?:non\s*[- ]?\s*hdl|hdl|ldlc?|ct|tg|triglycerides?|cholesterol|chol)\b/.test(key)) return false;
      if (/\b(?:rapport|ratio|quotient|index|indice)\b/.test(key)) return true;
      return /\b(?:ct|non\s*[- ]?\s*hdl|hdl|ldlc?|tg|triglycerides?|cholesterol|chol)(?:\s+(?:total|tot|t))?\s*\/\s*(?:ct|non\s*[- ]?\s*hdl|hdl|ldlc?|tg|triglycerides?|cholesterol|chol)\b/.test(key);
    }
    function marker(label, sourceUnit) {
      const key = fold(label).replace(/[.:]/g, '');
      if (isLipidRatio(key) || /anticorps|recepteur|^anti[- ]|reticul|immatur|carboxyhemoglobine|methemoglobine/.test(key)) return null;
      if (/\bpsa\b/.test(key) && /rapport|ratio|quotient|%/.test(key)) return null;
      if (/saturation|transferrine|capacite.*fixation|hemoglobine\s+(?:a2|f|s)\b|^proteine\s+[cs]\b(?!\s*reactive)/.test(key)) return null;
      for (const [id, baseName, pattern] of definitions) {
        if (!pattern.test(key)) continue;
        if (id === 'gly' && /urinaire|urines?|lcr|glycosurie|liquide/.test(key)) return null;
        const kind = id === 'dfg' ? /ckd/.test(key) ? 'ckd' : /mdrd/.test(key) ? 'mdrd' : '' :
          id === 'ddim' ? /\bfeu\b/.test(key) ? 'feu' : /\bddu\b/.test(key) ? 'ddu' : '' :
          id === 'vitd' ? /\bd2\b/.test(key) ? 'd2' : /\bd3\b/.test(key) ? 'd3' : '' : '';
        const specimen = /urinaire|urines?|\b24\s*h\b/.test(key) || id === 'creat_u' ? 'urine' :
          /\blcr\b|cephalo/.test(key) ? 'lcr' : /erythrocyt|globulaire/.test(key) ? 'erythrocytes' : '';
        const method = id === 'dfg' ? [key.match(/\b20(?:09|12|21)\b/)?.[0] || '',
          /cystat/.test(key) ? /creat/.test(key) ? 'creat-cystatine' : 'cystatine' : ''].filter(Boolean).join(':') :
          ['crp','tropo','tropo_i','tropo_t'].includes(id) && /\bhs\b|\bus\b|ultra.?sens|haute sensibilite/.test(key) ? 'hs' : '';
        // En électrophorèse, % et concentration sont deux grandeurs distinctes.
        // Ne pas calculer un lien à partir d'une protidémie possiblement différente.
        const relative = proteinFractionIds.has(id) &&
          (unit(sourceUnit) === '%' || /\brelative\b|\bpourcentage\b|%/.test(key));
        let name = baseName + (relative ? ' relative' : '');
        if (specimen && id !== 'creat_u') name += specimen === 'urine' ? ' urinaire' : specimen === 'lcr' ? ' LCR' : ' érythrocytaires';
        if (id === 'ddim' && kind) name += ' ' + kind.toUpperCase();
        return {id: relative ? id + '_pct' : id, name, kind, specimen, method};
      }
      return null;
    }

    // Registre de comparaison. Les coefficients ne servent jamais à calculer une norme clinique.
    // Sources : Labcorp SI Unit Conversion Table, NGSP, PNDS neutropénies, AHRQ/AFSSAPS TG.
    const mass = {'g/l':1,'g/dl':10,'mg/l':0.001,'mg/dl':0.01,'mg/ml':1,'µg/l':1e-6,'µg/dl':1e-5,'µg/ml':0.001,'ng/l':1e-9,'ng/dl':1e-8,'ng/ml':1e-6,'pg/l':1e-12,'pg/ml':1e-9};
    const amount = {'mol/l':1,'mmol/l':1e-3,'µmol/l':1e-6,'nmol/l':1e-9,'pmol/l':1e-12};
    const cleanFactor = value => Number(value.toPrecision(14));
    const scaleMap = (source, divisor) => Object.fromEntries(Object.entries(source).map(([key, factor]) => [key, cleanFactor(factor/divisor)]));
    const massUnits = gramsPerUnit => scaleMap(mass, gramsPerUnit);
    const amountUnits = molPerUnit => scaleMap(amount, molPerUnit);
    const activity = {'u/l':1,'ui/l':1,'ku/l':1000,'kui/l':1000,'µkat/l':60,'nkat/l':0.06,'kat/l':60000000};
    const counts = {'g/l':1,'giga/l':1,'10^9/l':1,'109/l':1,'x10^9/l':1,'×10^9/l':1,'/mm3':0.001,'mm-3':0.001,'cellules/mm3':0.001,'cellule/mm3':0.001,'cellules/µl':0.001,'/µl':0.001,'10^3/µl':1};
    const profileDefinitions = {};
    function define(ids, target, units, family = 'quantity') {
      for (const id of ids.split(' ')) profileDefinitions[id] = {target, units, family};
    }
    function chemMass(ids, gramsPerUnit, perMmol, alternatives = [], target = gramsPerUnit === 1 ? 'g/L' : 'mg/L') {
      define(ids, target,
        {...massUnits(gramsPerUnit),...Object.fromEntries(Object.entries(amount).map(([key,factor])=>[key,cleanFactor(factor*1000*perMmol)]))});
      for (const id of ids.split(' ')) profileDefinitions[id].amountCoefficients = [perMmol,...alternatives];
    }
    function chemAmount(ids, target, molPerUnit, conventionalUnit, coefficient, alternatives = []) {
      define(ids,target,{...amountUnits(molPerUnit),...Object.fromEntries(Object.entries(mass).map(([key,factor])=>[key,cleanFactor(factor/mass[conventionalUnit]*coefficient)]))});
      for (const id of ids.split(' ')) Object.assign(profileDefinitions[id], {conventionalUnit, coefficients:[coefficient,...alternatives]});
    }
    chemMass('ldl hdl nonhdl chol_tot',1,0.3867);
    chemMass('gly',1,0.18);
    define('hb ccmh','g/dL',massUnits(10));
    define('rbc','T/L',{...scaleMap(counts,1000),'t/l':1,'tera/l':1,'10^12/l':1,'1012/l':1,'10^6/µl':1,'10^6/mm3':1,'millions/mm3':1,'million/mm3':1},'red-cell-count');
    define('ht','%',{'%':1,'l/l':100},'volume-fraction');
    define('tcmh','pg',{'pg':1,'ng':1000,'fg':0.001},'cell-mass');
    define('crp','mg/L',massUnits(0.001));
    // Ferritine : ng/mL = µg/L ; CDC × 2,247 ou Siemens Atellica × 2,2 vers pmol/L.
    // 1 mmol = 10^9 pmol. Comparaison seulement, sans réécrire le dosage natif.
    chemMass('ferr',1e-6,1e9/2.247,[1e9/2.2],'µg/L');
    define('pct','ng/mL',massUnits(1e-6));
    define('bnp ntbnp','pg/mL',massUnits(1e-9));
    define('tropo tropo_i tropo_t','ng/L',massUnits(1e-9));
    define('psa psa_free','ng/mL',massUnits(1e-6));
    define('albumine proteines fibrino','g/L',massUnits(1));
    define(Array.from(proteinFractionIds).filter(id => id !== 'albumine').join(' '), 'g/L', massUnits(1));
    define(Array.from(proteinFractionIds, id => id + '_pct').join(' '), '%', {'%':1}, 'relative-protein-fraction');
    define('asat alat ggt pal lipase ldh ck amylase','U/L',activity);
    define('tsh','mUI/L',{'mui/l':1,'mu/l':1,'µui/ml':1,'µu/ml':1,'ui/l':1000,'u/l':1000,'mui/ml':1000,'ui/ml':1000000});
    define('hcg hcg_free','UI/L',{'ui/l':1,'u/l':1,'mui/ml':1,'mu/ml':1,'ui/ml':1000,'mui/l':0.001,'µui/ml':0.001});
    define('pnn mono eos baso lympho leuco plaq','G/L',counts,'count');
    define('vgm','fL',{'fl':1,'µm3':1,'µm^3':1,'pl':1000},'cell-volume');
    define('na k cl','mmol/L',{...amountUnits(1e-3),'meq/l':1},'ionic-concentration');
    define('inr','',{'':1,'1':1,'ratio':1},'ratio');
    define('ag_ratio','',{'':1,'1':1,'ratio':1},'albumin-globulin-ratio');
    define('ph','',{'':1,'ph':1},'ph');
    define('vs','mm/h',{'mm/h':1,'mm/1h':1,'mm/heure':1},'sedimentation');
    define('ddim','ng/mL',massUnits(1e-6));
    chemAmount('creat creat_u','µmol/L',1e-6,'mg/dl',88.4);
    chemAmount('b12','pmol/L',1e-12,'pg/ml',0.738);
    chemAmount('folates','nmol/L',1e-9,'ng/ml',2.265);
    chemAmount('t4l','pmol/L',1e-12,'ng/dl',12.9,[12.87]);
    chemAmount('t3l','pmol/L',1e-12,'pg/ml',1.536,[1.54]);
    chemAmount('t4','nmol/L',1e-9,'µg/dl',12.9,[12.87]);
    chemAmount('t3','nmol/L',1e-9,'ng/dl',0.0154);
    chemAmount('ca ca_corr ca_ion','mmol/L',1e-3,'mg/dl',0.25,[0.2495]);
    chemAmount('mg','mmol/L',1e-3,'mg/dl',0.411);
    chemAmount('phosphore','mmol/L',1e-3,'mg/dl',0.323,[0.3229]);
    define('phosphate','mmol/L',amountUnits(1e-3));
    chemAmount('uree','mmol/L',1e-3,'mg/dl',0.1665);
    chemAmount('bun','mmol/L',1e-3,'mg/dl',0.357);
    chemAmount('urates','µmol/L',1e-6,'mg/dl',59,[59.48]);
    chemAmount('fer','µmol/L',1e-6,'µg/dl',0.179);
    chemAmount('vitd','nmol/L',1e-9,'ng/ml',2.5,[2.496,2.4959]);
    chemAmount('vitd125','pmol/L',1e-12,'pg/ml',2.4);
    chemAmount('lactate','mmol/L',1e-3,'mg/dl',0.111);
    // KDIGO 2024, p. S127 : ACR/PCR mg/g × 0,113 = mg/mmol.
    define('acr pcr rac','mg/mmol',{'mg/mmol':1,'g/mol':1,'mg/g':0.113,'µg/mg':0.113},'urine-ratio');

    function unitProfile(item, source, variant = 0) {
      let key = unit(source), basis = '';
      if (item.id === 'ddim') {
        const explicit = /\bfeu\b/i.test(source) ? 'feu' : /\bddu\b/i.test(source) ? 'ddu' : '';
        if (explicit && item.kind && explicit !== item.kind) return null;
        basis = explicit || item.kind || '';
        key = key.replace(/(?:feu|ddu)$/,'');
      }
      let profile = profileDefinitions[item.id], factor, offset = 0, family;
      if (item.id === 'hg') {
        profile = {target:'%',family:'hba1c',units:{'%':1,'mmol/mol':0.09148}};
        if (key === 'mmol/mol') offset = 2.152;
      } else if (/^bili_/.test(item.id)) {
        profile = {target:'µmol/L',family:'bilirubin',units:{...amountUnits(1e-6),'mg/l':1.71,'mg/dl':17.1,'g/l':1710}};
      } else if (item.id === 'tg') {
        const coefficient = variant === 1 ? 0.8857 : 0.875;
        profile = {target:'g/L',family:'triglycerides',units:{...massUnits(1),...Object.fromEntries(Object.entries(amount).map(([name,value])=>[name,cleanFactor(value*1000*coefficient)]))}};
      } else if (item.id === 'dfg') {
        const match = key.match(/^(ml|l)\/(min|s)(?:\/(1\.73|1\.7)(?:m2)?)?$/);
        if (!match) return null;
        const reference = match[3] ? '/' + match[3] + 'm2' : '';
        return {key, factor:(match[1]==='l'?1000:1)*(match[2]==='s'?60:1),offset:0,
          unit:'mL/min'+reference,family:'flow'+reference};
      }
      if (!profile) return null;
      if (Object.hasOwn(profile.units,key)) {
        factor = profile.units[key]; family = profile.family + (basis ? ':'+basis : '');
        if (profile.amountCoefficients && Object.hasOwn(amount,key)) {
          const coefficient = profile.amountCoefficients[variant] ?? profile.amountCoefficients[0];
          factor = cleanFactor(amount[key]*1000*coefficient);
        }
        if (profile.coefficients && Object.hasOwn(mass,key)) {
          const coefficient = item.id === 'vitd' && item.kind === 'd2' ? 2.4233 :
            profile.coefficients[variant] ?? profile.coefficients[0];
          factor = cleanFactor(mass[key]/mass[profile.conventionalUnit]*coefficient);
        }
      } else if (differentialIds.has(item.id) && key === '%') {
        return {key:'%',factor:1,offset:0,unit:'%',family:'relative-count'};
      } else if (['bnp','ntbnp','phosphate'].includes(item.id) && Object.hasOwn(amount,key)) {
        // Échelle molaire reconnue, mais aucun pont masse/mole supposé pour ces dosages.
        return {key,factor:amount[key]/1e-12,offset:0,unit:'pmol/L',family:'molar-only'};
      } else if (item.specimen === 'urine' && ['albumine','proteines','creat_u'].includes(item.id) && /^(mg|g)\/(?:24h|j|d)$/.test(key)) {
        return {key,factor:key.startsWith('g/')?1000:1,offset:0,unit:'mg/24h',family:'daily-excretion'};
      } else return null;
      return {key,factor,offset,unit:profile.target,family};
    }

    function differential(label) {
      const item = marker(label);
      return item && differentialIds.has(item.id) ? item : null;
    }
    function absolute(cells) {
      const item=marker(cells[0],cells[2]), profile=item&&unitProfile(item,cells[2]);
      return Boolean(item&&differentialIds.has(item.id)&&number(cells[1])&&profile?.family==='count');
    }
    function contextKey(item) {
      return [item.specimen||'',item.method||'',item.id === 'ddim' ? '' : item.kind||''].join('|');
    }
    function measurement(cells,item,variant=0) {
      const value=number(cells[1]),profile=unitProfile(item,cells[2],variant);
      if (!value || !profile) return null;
      return {operator:value.operator,value:value.value*profile.factor+profile.offset,
        rawValue:value.value,unit:profile.unit,family:profile.family,factor:profile.factor,offset:profile.offset,
        sourceUnit:profile.family+'@'+profile.factor+'+'+profile.offset,rounding:value.rounding*profile.factor};
    }
    function equivalentRows(first,second,item,variant=0) {
      const firstItem=marker(first[0],first[2])||item,secondItem=marker(second[0],second[2])||item;
      if (contextKey(firstItem)!==contextKey(secondItem)) return false;
      const a=measurement(first,firstItem,variant),b=measurement(second,secondItem,variant);
      if (!a||!b||a.operator!==b.operator||a.family!==b.family) return false;
      const known=value=>['HAUT','BAS','NORMAL','À RELIRE','À VÉRIFIER'].includes(value);
      if(known(status(first))&&known(status(second))&&status(first)!==status(second))return false;
      if(a.sourceUnit===b.sourceUnit)return a.rawValue===b.rawValue;
      return Math.abs(a.value-b.value)<=a.rounding+b.rounding+Number.EPSILON*Math.max(1,Math.abs(a.value),Math.abs(b.value))*8;
    }
    function conflict(item,reason,rows,quiet=false) {
      const diagnostic = reason === 'unité absente ou non reconnue' ?
        rows.some(cells => !text(cells[2])) ? 'Unité absente' : 'Unité non reconnue' : 'Résultats discordants';
      const error=new Error(diagnostic+' pour '+item.name+' : vérification du bilan nécessaire.');
      error.code='BIOLOGY_CONFLICT';error.reason=reason;throw error;
    }
    function selectRow(rows,item,options={}) {
      let candidates=rows.filter(cells=>marker(cells[0],cells[2])?.id===item.id&&number(cells[1])&&(item.id!=='pct'||unit(cells[2])!=='%'));
      if(!candidates.length)return null;
      if(item.id==='dfg'&&candidates.some(cells=>marker(cells[0],cells[2]).kind==='ckd')) candidates=candidates.filter(cells=>marker(cells[0],cells[2]).kind!=='mdrd');
      for(const cells of candidates)if(!unitProfile(marker(cells[0],cells[2]),cells[2]))conflict(item,'unité absente ou non reconnue',candidates,options.quiet);
      const pools = differentialIds.has(item.id) ? [
        candidates.filter(absolute),candidates.filter(cells=>!absolute(cells))] : [candidates];
      // Une convention documentée unique doit convenir à toutes les paires du groupe.
      const variants = Array.from({length:item.id==='tg'?2:
        profileDefinitions[item.id]?.amountCoefficients?.length||profileDefinitions[item.id]?.coefficients?.length||1},(_,i)=>i);
      const valid=variants.some(variant=>pools.every(pool=>pool.every((first,i)=>pool.slice(i+1).every(second=>equivalentRows(first,second,item,variant)))));
      if(!valid)conflict(item,'valeurs, unités, statuts ou contextes incompatibles',candidates,options.quiet);
      if(differentialIds.has(item.id)&&candidates.some(absolute))candidates=candidates.filter(absolute);
      const rank=cells=>{
        const m=measurement(cells,marker(cells[0],cells[2]));
        return (['HAUT','BAS','NORMAL','À RELIRE','À VÉRIFIER'].includes(status(cells))?100:0)+
          (m&&m.factor===1&&!m.offset?10:0)+(number(cells[3])?1:0)+(number(cells[4])?1:0);
      };
      return candidates.slice().sort((a,b)=>rank(b)-rank(a))[0];
    }
    function dateMs(value) {
      const match = text(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!match) return NaN;
      const [day, month, year] = match.slice(1).map(Number), date = new Date(Date.UTC(year, month - 1, day));
      return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date.getTime() : NaN;
    }
    const STATUS = { high: "HAUT", low: "BAS", normal: "NORMAL", review: "À RELIRE", unknown: "NON CLASSÉ" };
    const symbols = { HAUT: "↑", BAS: "↓", NORMAL: "N", "À RELIRE": "!", "À VÉRIFIER": "?", "NON CLASSÉ": "?" };
    const abnormal = state => state === STATUS.high || state === STATUS.low || state === STATUS.review;

    function status(cells) { return cells[5] || STATUS.unknown; }

    function classify(value, minimum, maximum, flagged = false) {
        const key = fold(value);
        if (/\b(?:critique|urgent|hemolyse|douteu[xs]|indetermine|non interpretable)\b/.test(key) ||
            (/\b(?:positi[fv]|detecte|presence)/.test(key) && !/\b(?:negati[fv]|non detecte|absence)\b/.test(key))) {
            return STATUS.review;
        }
        const measure = number(value);
        // Weda affiche parfois « - » et des bornes techniques à la place d'une norme.
        const min = number(minimum), max = number(maximum);
        const low = min && !/^[<≤]$/.test(min.operator) && Math.abs(min.value) < 999999 ? min : null;
        const high = max && !/^[>≥]$/.test(max.operator) && Math.abs(max.value) < 999999 ? max : null;
        if (!measure || (!low && !high) || (low && high && low.value > high.value)) {
            return flagged ? STATUS.review : STATUS.unknown;
        }
        const upperBound = /^[<≤]$/.test(measure.operator), lowerBound = /^[>≥]$/.test(measure.operator);
        if (low && !lowerBound && (measure.value < low.value ||
            (measure.value === low.value && (measure.operator === "<" || low.operator === ">")))) return STATUS.low;
        if (high && !upperBound && (measure.value > high.value ||
            (measure.value === high.value && (measure.operator === ">" || high.operator === "<")))) return STATUS.high;
        if (flagged) return STATUS.review;
        // Une valeur « <x » ne prouve pas qu'une borne inférieure est respectée.
        if ((upperBound && (low || !high || measure.value > high.value ||
            (measure.value === high.value && high.operator === "<" && measure.operator === "≤"))) ||
            (lowerBound && (high || !low || measure.value < low.value ||
            (measure.value === low.value && low.operator === ">" && measure.operator === "≥")))) return STATUS.unknown;
        return STATUS.normal;
    }

    /** Weda inclut une colonne de sélection à l'import, mais pas dans le dossier. */
    function readTable(table) {
        const rows = Array.from(table?.rows || []);
        const labels = Array.from(rows.shift()?.cells || [], cell => fold(cell.textContent));
        const columns = [
            labels.findIndex(value => /^(libelle|analyse|examen)$/.test(value)),
            labels.findIndex(value => /^(valeur|resultat)$/.test(value)),
            labels.findIndex(value => /^unites?$/.test(value)),
            labels.findIndex(value => /^min(?:imum|inum)?$/.test(value)),
            labels.findIndex(value => /^max(?:imum)?$/.test(value))
        ];
        if (columns.slice(0, 3).includes(-1)) return [];
        return rows.flatMap(row => {
            const cells = columns.map(index => text(row.cells[index]?.textContent));
            if (!cells[0] || !cells[1]) return [];
            const flagged = [row, ...Array.from(row.cells)].some(node =>
                /(?:^|;)\s*color\s*:\s*(?:#(?:ce0000|ff0000|f00)|red|rgb\(\s*(?:206|255),\s*0,\s*0\s*\))(?=\s|;|$)/i
                    .test(node.getAttribute("style") || "") || /^(?:red|#ce0000|#ff0000)$/i.test(node.getAttribute("color") || ""));
            cells[5] = classify(cells[1], cells[3], cells[4], flagged);
            return [cells];
        });
    }

    function isNarrative(value) {
        return /\b(?:anapath|anatom[oie -]*(?:et cytologie )?patholog\w*|histopatholog\w*|diagnostic histologique)\b/i.test(value);
    }

    function narrativeConclusion(raw) {
        const lines = String(raw || "").split(/\r?\n/).map(text).filter(Boolean);
        const heading = /^(?:conclusion(?:\s+(?:anatomopathologique|histologique|du laboratoire))?|diagnostic histologique)(?:\s*[:：–-]\s*(.*)|\s*)$/i;
        const indices = lines.map((line, index) => heading.test(line) ? index : -1).filter(index => index !== -1);
        if (indices.length !== 1) return "";
        const index = indices[0], result = [lines[index].match(heading)[1] || ""];
        for (const line of lines.slice(index + 1)) {
            if (/^(?:(?:signat(?:ure|aire)|signé|validé|dicté|compte rendu validé|édité)\b|(?:copie|destinataire|commentaire|macroscopie|microscopie)\s*:|(?:dr|docteur)\b)/i.test(line)) break;
            result.push(line);
        }
        const conclusion = text(result.join(" "));
        return /[\p{L}]{3}/u.test(conclusion) && !/^(?:voir (?:ci-dessus|compte rendu|le document)|en attente)\b/i.test(conclusion)
            ? conclusion : "";
    }

    function describeRows(sourceRows) {
        const warnings = new Set();
        const groups = new Map();
        let previous = null;
        for (const source of sourceRows) {
            const cells = source.slice();
            if (/^soit\s*:?\s*$/i.test(cells[0])) {
                if (previous && absolute([previous.name, ...cells.slice(1)])) cells[0] = previous.name;
                else {
                    warnings.add("Une valeur de la formule leucocytaire n’a pas pu être rattachée.");
                    cells[5] = STATUS.review;
                }
                previous = null;
            } else previous = differential(cells[0]);

            const item = marker(cells[0], cells[2]);
            const key = item ? JSON.stringify([item.id, contextKey(item), item.kind]) : fold(cells[0]);
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(cells);
        }
        return { warnings, rows: Array.from(groups.values()).flatMap(candidates => {
            const [first] = candidates;
            const item = marker(first[0], first[2]);
            const model = (cells, ambiguous = false) => ({
                label: cells[0], value: cells[1], unit: cells[2], min: cells[3], max: cells[4],
                state: ambiguous ? STATUS.review : status(cells), item, ambiguous
            });
            if (item && candidates.every(cells => number(cells[1]))) {
                try {
                    return [model(selectRow(candidates, item, { quiet: true }) || first)];
                } catch (error) {
                    if (error.code !== "BIOLOGY_CONFLICT") throw error;
                    warnings.add(error.message);
                    return candidates.map(cells => model(cells, true));
                }
            }
            const unique = Array.from(new Map(candidates.map(cells => [JSON.stringify(cells.slice(1)), cells])).values());
            if (unique.length > 1) warnings.add("Résultats distincts pour " + first[0] + " : à relire.");
            return unique.map(cells => {
                const missing = Boolean(number(cells[1]) && !cells[2]);
                if (missing) warnings.add("Unité absente pour " + cells[0] + " : à relire.");
                return model(cells, missing || unique.length > 1);
            });
        }) };
    }

    function analyze(rows, raw, type = "") {
        const anapath = isNarrative(type) || isNarrative(String(raw).split("\n").slice(0, 12).join("\n"));
        if (anapath || !rows.length) {
            const conclusion = narrativeConclusion(raw);
            const prefix = anapath ? "Anapath" : "Conclusion labo";
            return { rows: [], narrative: true, conclusion, title: conclusion ? prefix + " : " + conclusion : "",
                warnings: conclusion ? [] : ["Aucune conclusion distincte ou aucun tableau exploitable. Relisez le compte rendu."] };
        }
        const report = describeRows(rows);
        return { rows: report.rows, narrative: false, warnings: [...report.warnings] };
    }

    function historyEntries(grid) {
        const entries = [];
        let label = "";
        for (const row of grid?.rows || []) {
            const cells = Array.from(row.cells, cell => text(cell.textContent));
            if (cells.length < 2) continue;
            if (cells[0]) label = cells[0].replace(/\s*:\s*$/, "");
            for (const match of cells.at(-1).matchAll(/(\d{2}\/\d{2}\/\d{4})\s*:\s*(.*?)(?=\d{2}\/\d{2}\/\d{4}\s*:|$)/g)) {
                const result = match[2].trim().match(/^([<>≤≥]?\s*[+-]?\d+(?:[,.]\d+)?)\s*(\D[^:]*?)\s*$/);
                if (label && result) entries.push({ label, date: match[1], value: result[1], unit: result[2] });
            }
        }
        return entries;
    }

    function comparable(row, entry) {
        const item = row.item, previous = marker(entry.label, entry.unit);
        if (!item || !previous || previous.id !== item.id || contextKey(previous) !== contextKey(item) ||
            previous.kind !== item.kind || (item.id === "dfg" && !item.kind)) return false;
        const currentUnit = unitProfile(item, row.unit), oldUnit = unitProfile(previous, entry.unit);
        return currentUnit && oldUnit && currentUnit.family === oldUnit.family && currentUnit.unit === oldUnit.unit &&
            number(entry.value);
    }

    function addHistory(rows, entries, date) {
        const current = dateMs(date);
        if (!Number.isFinite(current)) return rows;
        return rows.map(row => {
            if (row.ambiguous || ![STATUS.low, STATUS.high].includes(row.state)) return row;
            const matches = entries.filter(entry => dateMs(entry.date) < current && comparable(row, entry))
                .sort((a, b) => dateMs(b.date) - dateMs(a.date));
            if (!matches.length) return row;
            const sameDay = matches.filter(entry => entry.date === matches[0].date);
            let selected;
            try {
                selected = selectRow(sameDay.map(entry => [entry.label, entry.value, entry.unit, "", "", ""]), row.item, { quiet: true });
            } catch (error) {
                if (error.code !== "BIOLOGY_CONFLICT") throw error;
            }
            if (!selected) return row;
            return { ...row, previous: { value: selected[1], unit: selected[2], date: matches[0].date } };
        });
    }

    function parsePreference(reply, count) {
        const json = JSON.parse(String(reply).trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, "$1"));
        if (!Array.isArray(json?.indices) || json.indices.length > count ||
            json.indices.some(index => !Number.isInteger(index) || index < 1 || index > count)) {
            throw new Error("Sélection du modèle invalide.");
        }
        return [...new Set(json.indices)];
    }

    function buildTitle(report, preference = []) {
        if (report.narrative) return report.title;
        const ranks = new Map(preference.map((index, rank) => [index - 1, rank]));
        const selected = report.rows.map((row, index) => ({ row, index })).filter(({ row, index }) =>
            !row.ambiguous && (abnormal(row.state) || required.has(row.item?.id) || ranks.has(index)));
        selected.sort((a, b) => Number(abnormal(b.row.state)) - Number(abnormal(a.row.state)) ||
            (ranks.get(a.index) ?? Infinity) - (ranks.get(b.index) ?? Infinity) || a.index - b.index);
        if (!selected.length) {
            return !report.warnings.length && report.rows.length && report.rows.every(row => row.state === STATUS.normal)
                ? "Bilan dans les normes du laboratoire" : "";
        }
        return selected.map(({ row }) => {
            const label = row.item?.id === "dfg" ? row.label : row.item?.name || row.label;
            const original = text([label, symbols[row.state], row.value, row.unit].join(" "));
            const old = row.previous;
            return old ? original + " [" + text(old.value + " " + old.unit) + " le " + old.date + "]" : original;
        }).join(", ");
    }

    function group(row) {
        const id = row.item?.id;
        if (["gly", "hg", "tsh", "t4l", "hcg"].includes(id)) return "Glycémie et hormones";
        if (["ldl", "hdl", "nonhdl", "tg", "chol_tot", "bnp", "ntbnp", "tropo", "tropo_i", "tropo_t"].includes(id)) return "Lipides et cœur";
        if (["dfg", "creat", "creat_u", "k", "na", "acr", "pcr", "rac", "uree"].includes(id)) return "Fonction rénale et ions";
        if (["hb", "vgm", "leuco", "plaq", "crp", "ferr", "inr", "pct"].includes(id) || differentialIds.has(id)) return "Hématologie et inflammation";
        if (["asat", "alat", "ggt", "pal", "lipase", "bili_tot", "bili_conj", "bili_libre"].includes(id)) return "Foie et digestion";
        return "Autres résultats";
    }

    return { text, fold, readTable, analyze, historyEntries, addHistory, dateMs, parsePreference, buildTitle,
        group, abnormal };
})();

if (typeof module !== "undefined") module.exports = WedaBiology;
