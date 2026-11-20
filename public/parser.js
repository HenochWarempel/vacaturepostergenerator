/* Vacaturetekst -> velden. Werkt volledig lokaal (geen AI/internet nodig).
   Herkent Poolse, Nederlandse en Engelse kopjes. Alles blijft achteraf bewerkbaar in het formulier. */
(function () {
  const BULLET = /^\s*(?:[•·●▪■◦○◆▶►✓✔☑\-–—*]|\d{1,2}[.)])\s+/;
  const BULLET_ONLY = /^\s*[•·●▪■◦○◆▶►✓✔☑]\s*/;

  const SECTION = {
    tasks: /(zakres|obowi[aą]zk|zadani|czym b[eę]dziesz|na czym|opis stanowiska|opis pracy|co b[eę]dziesz|twoja praca|werkzaamheden|\btaken\b|wat ga je doen|jouw taken|responsibilit|what you.?ll do|duties|job description)/i,
    profile: /(wymagani|oczekiwani|kogo szukamy|profil|kwalifikacj|czego oczekujemy|czego szukamy|twoje umiej|wat vragen|wat verwachten|functie-?eisen|\beisen\b|jouw profiel|wie ben jij|requirements|qualifications|your profile|who you are|we.?re looking)/i,
    offer: /(oferuj|co zyskasz|proponujemy|benefit|zapewniamy|warunki pracy|warunki zatrudnienia|co dla ciebie|dlaczego warto|wat bieden|aanbod|arbeidsvoorwaarden|wat krijg|we offer|what we offer|perks|co otrzymasz|co zyskujesz|oferta dla)/i,
    about: /(o firmie|o nas|o pracodawcy|o kliencie|over ons|over het bedrijf|over de werkgever|about us|about the company)/i,
    apply: /(jak aplikowa|aplikuj|zainteresowan|kontakt|reageer|solliciteer|how to apply|apply|contact)/i,
  };

  const KV = {
    title: /^(stanowisko|funkcja|nazwa stanowiska|functie|functietitel|vacature|position|job title|role)$/i,
    location: /^(lokalizacja|miejsce pracy|miejscowo[sś][cć]|miejsce|locatie|standplaats|werklocatie|location|place of work)$/i,
    hours: /^(wymiar( pracy| czasu pracy)?|godziny( pracy)?|czas pracy|system pracy|zmiany|uren|werktijden|dienstverband uren|hours|working hours|schedule)$/i,
    contract: /^(umowa|rodzaj umowy|forma zatrudnienia|zatrudnienie|contract|contractvorm|dienstverband|employment)$/i,
    salary: /^(wynagrodzenie|stawka|zarobki|salaris|loon|uurloon|salary|pay|rate)$/i,
    employer: /^(pracodawca|firma|klient|bran[zż]a|werkgever|branche|bedrijf|company|industry)$/i,
    reference: /^(numer oferty|nr oferty|referencja|ref|referentie|vacaturenummer|reference|job id)$/i,
  };

  const RE_EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
  const RE_URL = /\b(?:https?:\/\/|www\.)[^\s<>"')]+/i;
  const RE_PHONE = /(?:\+|00)?\d[\d\s().-]{7,}\d/;
  const RE_SALARY = /(?:(?:€|EUR)\s?\d+(?:[.,]\d+)?(?:\s?[–-]\s?(?:€\s?)?\d+(?:[.,]\d+)?)?(?:\s?(?:€|EUR|euro))?|\d+(?:[.,]\d+)?(?:\s?[–-]\s?\d+(?:[.,]\d+)?)?\s?(?:€|euro|EUR|zł|PLN))(?:\s?(?:\/|per\s|na\s)\s?[\p{L}.]+)?/iu;
  const RE_HOURS = /\b\d{2}(?:\s?[–-]\s?\d{2})?\s*(?:godzin|godz\.?|uur|uren|hours|u\/w)\b[^.;,\n]{0,25}/i;

  const clean = (s) => s.replace(BULLET, '').replace(BULLET_ONLY, '').replace(/\s+/g, ' ').trim();
  const stripEnd = (s) => s.replace(/[;,.:\s]+$/g, '').trim();
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  function sectionOf(line) {
    const t = clean(line.t).replace(/[:：]\s*$/, '');
    if (!t || t.length > 70) return null;
    if (/[:：]\s*\S/.test(clean(line.t))) return null;          // "Sleutel: waarde" is geen kopje
    if (line.b) return null;
    if (/[.!?]$/.test(t) && !line.h) return null;
    for (const k of ['tasks', 'profile', 'offer', 'about', 'apply']) if (SECTION[k].test(t)) return k;
    return null;
  }

  function kvOf(text) {
    const m = clean(text).match(/^([\p{L}][\p{L} ./-]{1,32}?)\s*[:：]\s*(.+)$/u);
    if (!m) return null;
    const key = m[1].trim();
    for (const k of Object.keys(KV)) if (KV[k].test(key)) return { k, v: m[2].trim() };
    return null;
  }

  function splitItems(text) {
    const t = clean(text);
    if (!t) return [];
    if (t.length <= 130) return [stripEnd(t)];
    return t.split(/(?<=[.!?;])\s+(?=[\p{Lu}\d])/u).map(stripEnd).filter(Boolean);
  }

  function parse(lines) {
    lines = lines.map((l) => ({ t: (l.t || '').replace(/ /g, ' ').trim(), b: !!l.b, h: !!l.h })).filter((l) => l.t);
    const out = { tasks: [], profile: [], offer: [] };
    const f = {};
    let cur = 'intro';
    const intro = [];

    for (const line of lines) {
      const raw = line.t;
      const isBullet = line.b || BULLET.test(raw) || BULLET_ONLY.test(raw);
      line.b = isBullet;

      const sec = sectionOf(line);
      if (sec) { cur = sec; continue; }

      // contactgegevens
      const email = raw.match(RE_EMAIL);
      const url = raw.match(RE_URL);
      let consumed = false;
      if (email) { f.email = f.email || email[0]; consumed = true; }
      if (url) {
        const u = url[0].replace(/[.,;]+$/, '');
        const hasPath = /^(?:https?:\/\/)?[^/]+\/.{3,}/i.test(u);
        if (hasPath) f.applyUrl = f.applyUrl || (/^www\./i.test(u) ? 'https://' + u : u);
        else f.web = f.web || u.replace(/^https?:\/\//i, '');
        consumed = true;
      }
      const looksPhone = /(tel|phone|telefon|whatsapp|zadzwo|bel |mobiel|gsm)/i.test(raw) || (raw.replace(RE_PHONE, '').trim().length < 6);
      const ph = raw.match(RE_PHONE);
      if (ph && looksPhone && !RE_SALARY.test(raw)) { f.phone = f.phone || ph[0].trim(); consumed = true; }
      if (consumed) continue;

      // "Sleutel: waarde"
      const kv = kvOf(raw);
      if (kv) {
        if (kv.k === 'reference') f.reference = f.reference || kv.v;
        else f[kv.k] = f[kv.k] || stripEnd(kv.v);
        continue;
      }

      if (cur === 'about' || cur === 'apply') continue;
      if (cur === 'intro') { intro.push(line); continue; }

      for (const item of splitItems(raw)) out[cur].push(cap(item));
    }

    // titel: eerste regel voor het eerste kopje
    if (!f.title) {
      const first = intro.find((l) => !l.b && l.t.length <= 100);
      if (first) {
        f.title = stripEnd(clean(first.t).replace(/^(oferta pracy|oferta|nowa oferta|vacature|szukamy|poszukujemy|job offer|we are hiring)\s*[:\-–]\s*/i, ''));
        const idx = intro.indexOf(first);
        intro.splice(idx, 1);
      }
    }

    // vallen terug op losse patronen in de hele tekst
    const all = lines.map((l) => l.t);
    if (!f.salary) {
      for (const t of all) {
        if (!/(godz|uur|hour|miesi|maand|netto|brutto|stawk|loon|salar|wynagr)/i.test(t)) continue;
        const m = t.match(RE_SALARY);
        if (m) { f.salary = m[0].trim(); break; }
      }
    }
    if (!f.hours) {
      for (const t of all) { const m = t.match(RE_HOURS); if (m) { f.hours = stripEnd(m[0]); break; } }
    }
    if (!f.hours) {
      const sh = all.find((t) => /(jedna zmian|1 zmian|dwie zmiany|trzy zmiany|system 3-?zmianow|dagdienst|ploegendienst|2-ploegen|3-ploegen|one shift|day shift)/i.test(t) && t.length < 90);
      if (sh) { const m = sh.match(/(jedna zmian\w*|1 zmian\w*|dwie zmiany|trzy zmiany|system 3-?zmianow\w*|dagdienst|ploegendienst|2-ploegen|3-ploegen|one shift|day shift)/i); f.hours = cap(m[0]); }
    }

    // zinvolle uitkomst opruimen: dubbelen en kopjes die in de lijst belandden
    for (const k of Object.keys(out)) {
      const seen = new Set();
      out[k] = out[k].filter((s) => {
        const key = s.toLowerCase();
        if (seen.has(key) || s.length < 3) return false;
        seen.add(key);
        return true;
      });
    }

    const fields = { ...f, tasks: out.tasks.join('\n'), profile: out.profile.join('\n'), offer: out.offer.join('\n') };
    for (const k of Object.keys(fields)) if (!fields[k]) delete fields[k];
    return fields;
  }

  /* ---------- bestanden -> regels ---------- */
  function textToLines(text) {
    return text.split(/\r?\n/).map((t) => ({ t, b: BULLET.test(t) || BULLET_ONLY.test(t) }));
  }

  async function docxToLines(file) {
    const res = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
    const doc = new DOMParser().parseFromString(res.value, 'text/html');
    const lines = [];
    const walk = (el) => {
      for (const n of el.children) {
        const tag = n.tagName.toLowerCase();
        if (/^h[1-6]$/.test(tag)) lines.push({ t: n.textContent, h: true });
        else if (tag === 'ul' || tag === 'ol') for (const li of n.querySelectorAll(':scope > li')) lines.push({ t: li.textContent, b: true });
        else if (tag === 'p') {
          const txt = n.textContent.trim();
          const strong = n.querySelector('strong, b');
          const allStrong = strong && strong.textContent.trim() === txt && txt.length < 70;
          // een regel met "• " voorop telt ook als opsommingsteken
          lines.push({ t: n.innerHTML.split(/<br\s*\/?>/i).length > 1 ? txt.replace(/\s*\n\s*/g, ' ') : txt, h: !!allStrong });
        } else if (tag === 'table') for (const c of n.querySelectorAll('td,th')) lines.push({ t: c.textContent });
        else walk(n);
      }
    };
    walk(doc.body);
    return lines;
  }

  async function pdfToLines(file) {
    const pdfjs = await import('./vendor/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdf.worker.min.mjs', location.href).href;
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const lines = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const content = await (await pdf.getPage(p)).getTextContent();
      const rows = [];
      for (const it of content.items) {
        if (!it.str || !it.str.trim()) continue;
        const y = it.transform[5], x = it.transform[4];
        let row = rows.find((r) => Math.abs(r.y - y) < 2.5);
        if (!row) rows.push((row = { y, parts: [] }));
        row.parts.push({ x, s: it.str });
      }
      rows.sort((a, b) => b.y - a.y);
      for (const r of rows) {
        r.parts.sort((a, b) => a.x - b.x);
        const t = r.parts.map((q) => q.s).join(' ').replace(/\s{2,}/g, ' ').trim();
        lines.push({ t, b: BULLET.test(t) || BULLET_ONLY.test(t) });
      }
    }
    return lines;
  }

  async function fileToLines(file) {
    const name = file.name.toLowerCase();
    if (name.endsWith('.docx')) return docxToLines(file);
    if (name.endsWith('.pdf')) return pdfToLines(file);
    if (name.endsWith('.doc')) throw Object.assign(new Error('doc'), { code: 'doc' });
    return textToLines(await file.text());
  }

  window.VacancyParser = { parse, textToLines, fileToLines };
})();
