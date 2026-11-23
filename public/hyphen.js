/* Logische woordafbreking voor Nederlandse samenstellingen (functietitels e.d.).
   Voegt onzichtbare "zachte koppeltekens" (U+00AD) in op de samenstellingsgrens:
   Magazijn|medewerker, Account|manager. Het teken wordt alleen zichtbaar als het woord afgebroken moet worden.
   Onbekende woorden blijven ongemoeid; de poster verkleint dan de titel in plaats van midden in een woord te breken. */
(function () {
  const SHY = '­';

  // Tweede delen: functies en beroepen
  const HEADS = ['medewerker', 'medewerkster', 'manager', 'monteur', 'adviseur', 'assistent', 'assistente', 'coördinator', 'coordinator', 'specialist', 'operator', 'chauffeur', 'verkoper', 'consulent', 'administrateur', 'planner', 'engineer', 'ontwikkelaar', 'beheerder', 'leidinggevende', 'supervisor', 'analist', 'ondersteuner', 'vertegenwoordiger', 'installateur', 'technicus', 'inspecteur', 'directeur', 'controller', 'leider', 'verantwoordelijke', 'functionaris', 'bediende', 'kracht', 'werker', 'bouwer', 'maker', 'lasser', 'tekenaar', 'bediener', 'verpleegkundige', 'begeleider', 'trainer', 'docent', 'recruiter', 'koerier', 'picker', 'orderpicker', 'schoonmaker', 'kok', 'bakker', 'slager', 'timmerman', 'schilder', 'metselaar', 'vrachtwagenchauffeur', 'heftruckchauffeur', 'reachtruckchauffeur', 'hulp', 'medewerkers', 'support', 'agent', 'executive', 'officer', 'architect', 'developer', 'designer', 'analyst', 'expert', 'professional', 'verkoopster', 'receptionist', 'receptioniste', 'secretaresse', 'secretaris', 'boekhouder', 'accountant', 'jurist', 'inkoper', 'calculator', 'werkvoorbereider', 'programmeur', 'tester', 'beheer', 'ondersteuning', 'advies', 'bezorger', 'medewerksters', 'controleur', 'voorbereider', 'beoordelaar', 'bewaker', 'regisseur'];

  // Eerste delen: vakgebieden, afdelingen, bijvoeglijke bepalingen
  const MODS = ['magazijn', 'productie', 'logistiek', 'logistieke', 'account', 'sales', 'project', 'team', 'kwaliteit', 'techniek', 'technisch', 'technische', 'service', 'klanten', 'klant', 'inkoop', 'verkoop', 'binnendienst', 'buitendienst', 'financieel', 'financiële', 'finance', 'kantoor', 'receptie', 'schoonmaak', 'horeca', 'keuken', 'bouw', 'metaal', 'elektro', 'elektra', 'elektrotechniek', 'installatie', 'onderhoud', 'machine', 'machines', 'software', 'web', 'data', 'helpdesk', 'planning', 'order', 'transport', 'warehouse', 'supply', 'chain', 'business', 'backoffice', 'frontoffice', 'back', 'front', 'office', 'interne', 'externe', 'assemblage', 'montage', 'werkvoorbereiding', 'calculatie', 'personeel', 'salaris', 'loon', 'zorg', 'wijk', 'thuiszorg', 'onderwijs', 'marketing', 'communicatie', 'content', 'social', 'media', 'online', 'digital', 'digitaal', 'it', 'netwerk', 'systeem', 'applicatie', 'proces', 'productontwikkeling', 'ontwikkeling', 'research', 'laboratorium', 'lab', 'food', 'voedsel', 'verpakkings', 'verpakking', 'expeditie', 'distributie', 'vracht', 'vrachtwagen', 'heftruck', 'reachtruck', 'cnc', 'las', 'lasser', 'plaat', 'constructie', 'staal', 'hout', 'timmer', 'schilder', 'wegen', 'grond', 'weg', 'water', 'glas', 'kunststof', 'rubber', 'auto', 'truck', 'fiets', 'tuin', 'groen', 'land', 'tuinbouw', 'kwekerij', 'bloemen', 'vlees', 'fruit', 'groente', 'bakkerij', 'slagerij', 'snijd', 'inpak', 'sorteer', 'pak', 'schoon', 'woon', 'zaal', 'bar', 'bedrijfs', 'bedrijf', 'hr', 'recruitment', 'talent', 'security', 'safety', 'veiligheid', 'milieu', 'energie', 'zonne', 'duurzaamheid', 'inkoper', 'facility', 'facilitair', 'vastgoed', 'bank', 'verzekering', 'hypotheken', 'credit', 'debiteuren', 'crediteuren', 'financiële'];

  const HEAD_SET = new Set(HEADS), MOD_SET = new Set(MODS);
  const ALL = new Set([...HEADS, ...MODS]);
  const HEADS_BY_LEN = [...HEAD_SET].sort((a, b) => b.length - a.length);
  const MODS_BY_LEN = [...MOD_SET].sort((a, b) => b.length - a.length);

  // Verdeel het woord volledig in bekende delen (met optionele tussen-s). Geeft aantal-delen-minimaal terug.
  function segment(w) {
    const n = w.length, best = new Array(n + 1).fill(null);
    best[0] = [];
    for (let i = 0; i < n; i++) {
      if (!best[i]) continue;
      for (const p of ALL) {
        for (const link of ['', 's']) {
          const piece = p + link;
          if (w.startsWith(piece, i) && (i + piece.length === n || w.length - (i + piece.length) >= 3)) {
            const j = i + piece.length;
            const cand = best[i].concat(piece.length);
            if (!best[j] || cand.length < best[j].length) best[j] = cand;
          }
        }
      }
    }
    return best[n];
  }

  function hyphenWord(word) {
    if (word.length < 9) return word;
    const lower = word.toLowerCase();
    let cuts = null;

    const full = segment(lower);
    if (full && full.length === 1) return word;   // het woord is zelf al een bekend deel (bijv. medewerker)
    if (full && full.length > 1) cuts = full;
    else {
      // bekend tweede deel achteraan (onbekend voorvoegsel): Warehouse|manager
      for (const h of HEADS_BY_LEN) {
        if (lower.length - h.length >= 4 && lower.endsWith(h)) {
          const prefix = lower.slice(0, lower.length - h.length);
          const sub = segment(prefix);
          cuts = (sub && sub.length ? sub : [prefix.length]).concat(h.length);
          break;
        }
      }
      // bekend eerste deel vooraan, onbekend vervolg: Magazijn|beheer? (alleen als vervolg lang genoeg is)
      if (!cuts) {
        for (const m of MODS_BY_LEN) {
          if (m.length >= 5 && lower.length - m.length >= 5 && lower.startsWith(m)) {
            let cut = m.length;
            if (lower[cut] === 's' && lower.length - cut - 1 >= 4) cut++;       // tussen-s hoort bij het eerste deel: Kwaliteits|controleur
            cuts = [cut, lower.length - cut]; break;
          }
        }
      }
    }
    if (!cuts) return word;
    let out = '', pos = 0;
    cuts.forEach((len, idx) => { out += word.slice(pos, pos + len); pos += len; if (idx < cuts.length - 1) out += SHY; });
    return out;
  }

  // Past op alle woorden van 9+ letters in een tekst toe (andere tekens blijven ongemoeid).
  function hyphenate(text) {
    return String(text).replace(/\p{L}{9,}/gu, (w) => hyphenWord(w));
  }

  window.Hyphen = { hyphenate, hyphenWord, SHY };
})();
