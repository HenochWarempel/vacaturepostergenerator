(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lines = (s) => String(s || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);

  const SIZE = { square: [1080, 1080], portrait: [1080, 1350], landscape: [1200, 628] };
  const LIMIT = { square: { tasks: 4, profile: 4, offer: 4 }, portrait: { tasks: 5, profile: 5, offer: 5 }, landscape: { tasks: 3, profile: 3, offer: 3 } };
  const FMT_NAME = { square: '1x1', portrait: '4x5', landscape: '1200x628' };

  const DEFAULT_LABELS = {
    tasks: 'Czym będziesz się zajmować', profile: 'Czego oczekujemy', offer: 'Co oferujemy',
    tagline: 'Łączymy ludzi z pracodawcami', kicker: 'Szukamy',
    location: 'Lokalizacja', hours: 'Godziny', contract: 'Umowa', salary: 'Wynagrodzenie', qr: 'Aplikuj',
  };
  const CONTACT_DEFAULTS = {
    cta: 'Aplikuj już dziś!', ctaSub: 'Napisz lub zadzwoń – odpowiemy szybko.',
    phone: '+31 644 682 220', email: 'hello@jenson-recruitment.com', web: 'www.jenson-recruitment.com',
  };
  const EMPTY = () => ({
    format: 'square', title: '', employer: '', highlight: '', location: '', hours: '', contract: '', salary: '',
    tasks: '', profile: '', offer: '', reference: '', applyUrl: '', photo: null,
    ...CONTACT_DEFAULTS, labels: { ...DEFAULT_LABELS },
  });
  const SAMPLE = () => ({
    ...EMPTY(),
    title: 'Pracownik Działu Technicznego', employer: 'Międzynarodowy producent maszyn',
    highlight: '35 dodatkowych dni wolnych', location: 'Ulft-Varsseveld', hours: 'Jedna zmiana · dzienna', contract: 'Stabilne zatrudnienie',
    tasks: ['Przeglądy techniczne i konserwacja maszyn', 'Diagnozowanie i usuwanie awarii', 'Naprawy i drobne modyfikacje maszyn', 'Udział w modernizacji procesów produkcyjnych'].join('\n'),
    profile: ['Wykształcenie techniczne na poziomie MBO lub odpowiednie doświadczenie', 'Znajomość mechaniki, elektrotechniki lub automatyki', 'Komunikatywny angielski lub niemiecki (holenderski mile widziany)', 'Własne zakwaterowanie w regionie Ulft-Doetinchem'].join('\n'),
    offer: ['Praca na jedną zmianę, w godzinach dziennych', 'Aż 35 dodatkowych dni wolnych w roku', 'Stabilne zatrudnienie i atrakcyjne wynagrodzenie', 'Nowoczesne technologie i ciekawe projekty'].join('\n'),
  });

  const ICONS = {
    location: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    hours: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    contract: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
    salary: '<path d="M17 6.5A6 6 0 0 0 7.5 9M17 17.5A6 6 0 0 1 7.5 15M5 10.5h8M5 13.5h8"/>',
    phone: '<path d="M6 3h3l2 5-2 1.5a11 11 0 0 0 5.5 5.5L16 13l5 2v3a3 3 0 0 1-3 3A15 15 0 0 1 3 6a3 3 0 0 1 3-3z"/>',
    email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  };
  const svg = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>`;

  /* ---------- taal van de app ---------- */
  let lang = 'nl';
  try { lang = localStorage.getItem('jenson-lang') || 'nl'; } catch {}
  const t = (k, ...a) => { const v = (I18N[lang] && I18N[lang][k]) ?? I18N.nl[k]; return typeof v === 'function' ? v(...a) : v; };
  function applyLang() {
    document.documentElement.lang = lang;
    $$('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
    $$('[data-i18n-html]').forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml)));
    $$('[data-i18n-ph]').forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
    $$('#langSeg button').forEach((b) => b.classList.toggle('on', b.dataset.lang === lang));
    document.title = (lang === 'pl' ? 'Generator plakatów ofert pracy' : 'Vacatureposter-generator') + ' – Jenson Recruitment';
  }

  /* ---------- state ---------- */
  const KEY = 'jenson-poster-v1';
  let state = EMPTY();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    state = saved ? { ...EMPTY(), ...saved, labels: { ...DEFAULT_LABELS, ...(saved.labels || {}) } } : SAMPLE();
  } catch { state = SAMPLE(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { try { localStorage.setItem(KEY, JSON.stringify({ ...state, photo: null })); } catch {} } };

  /* ---------- poster ---------- */
  const poster = $('#poster');
  let lastFit = 1;

  function qrSvg(url) {
    try {
      const q = qrcode(0, 'M'); q.addData(url); q.make();
      return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }).replace(/fill="black"/g, 'fill="#00303F"');
    } catch { return ''; }
  }

  function titleSize(len) {
    return len <= 20 ? 76 : len <= 32 ? 66 : len <= 46 ? 58 : 50;
  }

  function render() {
    const s = state, L = s.labels, lim = LIMIT[s.format];
    const lists = { tasks: lines(s.tasks), profile: lines(s.profile), offer: lines(s.offer) };
    const facts = ['location', 'hours', 'contract', 'salary'].filter((k) => s[k].trim());
    const land = s.format === 'landscape';
    const hasPhoto = !!s.photo && !land;
    const sec = (k, cls = '') => {
      const items = lists[k].slice(0, lim[k]);
      return items.length ? `<section class="p-sec ${cls}"><h2>${esc(L[k])}</h2><ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></section>` : '';
    };
    const contact = [['phone', s.phone], ['email', s.email], ['web', s.web]].filter(([, v]) => v && v.trim());
    const qr = s.applyUrl.trim() ? qrSvg(s.applyUrl.trim()) : '';
    const factHtml = facts.map((k) => `<div class="p-fact"><div class="p-ico">${svg(k)}</div><div class="p-fact-t"><div class="p-fact-l">${esc(L[k])}</div><div class="p-fact-v">${esc(s[k])}</div></div></div>`).join('');
    const titleHtml = `${L.kicker.trim() && land ? `<div class="p-employer" style="margin:0 0 10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;font-size:calc(18px*var(--s))">${esc(L.kicker)}</div>` : ''}
          <h1 class="p-title">${esc(s.title || 'Functietitel')}</h1>
          ${s.employer.trim() ? `<div class="p-employer">${esc(s.employer)}</div>` : ''}
          ${s.highlight.trim() ? `<div class="p-badge">${esc(s.highlight)}</div>` : ''}`;
    const blob = `<div class="p-blob"><img src="assets/blob.svg" width="572" height="167" alt=""></div><img class="p-logo" src="assets/logo.png" alt="Jenson Recruitment">`;
    const foot = `<footer class="p-foot">
        <div class="p-cta"><div class="p-cta-t">${esc(s.cta)}</div>${s.ctaSub.trim() ? `<div class="p-cta-s">${esc(s.ctaSub)}</div>` : ''}</div>
        <div class="p-contact">${contact.map(([k, v]) => `<div>${svg(k)}<span>${esc(v)}</span></div>`).join('')}</div>
        ${qr ? `<div class="p-qr">${qr}${L.qr.trim() ? `<small>${esc(L.qr)}</small>` : ''}</div>` : ''}
        ${s.reference.trim() ? `<div class="p-ref">${esc(s.reference)}</div>` : ''}
      </footer>`;

    poster.className = `poster fmt-${s.format}${hasPhoto ? ' has-photo' : ''}`;
    poster.style.setProperty('--ts', titleSize(s.title.length) + 'px');
    if (land) {
      poster.innerHTML = `
        <aside class="L-left">${blob}
          ${titleHtml}
          ${facts.length ? `<div class="L-facts">${factHtml}</div>` : ''}
        </aside>
        <section class="L-right">${sec('tasks')}${sec('profile')}${sec('offer')}</section>
        ${foot}`;
    } else {
      const two = (lists.tasks.length ? 1 : 0) + (lists.profile.length ? 1 : 0);
      const cols = two ? `<div class="p-cols"${two === 1 ? ' style="grid-template-columns:1fr"' : ''}>${sec('tasks')}${sec('profile')}</div>` : '';
      poster.innerHTML = `
        <div class="p-bgtop"${hasPhoto ? ` style="background-image:url('${s.photo}')"` : ''}></div>
        <div class="p-top">${blob}${facts.length ? `<div class="p-facts">${factHtml}</div>` : ''}</div>
        <div class="p-main">
          <img class="p-wave" src="assets/wave.svg" width="1174" height="96" alt="">
          <img class="p-union" src="assets/union.svg" width="1254" height="1298" alt="">
          <div class="p-content">${titleHtml}${cols}${sec('offer', 'p-offer')}</div>
        </div>
        ${foot}`;
    }
    lastFit = fit();
    layoutStage();
    runChecks(lists, lim, facts);
  }

  function fit() {
    const content = $('.p-content', poster), main = $('.p-main', poster), right = $('.L-right', poster), left = $('.L-left', poster);
    const over = () => {
      if (poster.scrollWidth > poster.clientWidth + 1) return true;
      if (content) return content.offsetTop + content.offsetHeight > main.clientHeight + 1 || poster.scrollHeight > poster.clientHeight + 1;
      return right.scrollHeight > right.clientHeight + 1 || left.scrollHeight > left.clientHeight + 1;
    };
    const set = (f) => poster.style.setProperty('--f', f.toFixed(3));
    let f = 1; set(f);
    if (over()) { while (over() && f > 0.5) { f -= 0.02; set(f); } }
    else { while (f < 1.22) { set(f + 0.02); if (over()) { set(f); break; } f += 0.02; } }
    return f;
  }

  /* ---------- voorbeeld schalen ---------- */
  function layoutStage() {
    const [pw, ph] = SIZE[state.format];
    const stage = $('#stage'), inner = $('#stageInner');
    const w = stage.clientWidth;
    const maxH = Math.max(320, window.innerHeight - 330);
    const sc = Math.min(w / pw, maxH / ph);
    inner.style.transform = `scale(${sc})`;
    inner.style.left = Math.max(0, (w - pw * sc) / 2) + 'px';
    stage.style.height = ph * sc + 'px';
  }
  addEventListener('resize', layoutStage);

  /* ---------- controle ---------- */
  function runChecks(lists, lim, facts) {
    const out = [];
    const add = (type, msg) => out.push(`<li class="${type}">${msg}</li>`);
    if (!state.title.trim()) add('err', t('cNoTitle'));
    const names = t('names');
    for (const k of Object.keys(lists)) {
      if (!lists[k].length) add('warn', t('cEmpty', names[k]));
      else if (lists[k].length > lim[k]) add('warn', t('cMany', names[k], lim[k], lists[k].length));
    }
    const long = Object.values(lists).flat().filter((x) => x.length > 90).length;
    if (long) add('warn', t('cLong', long));
    if (lastFit * ({ square: 1, portrait: 1.12, landscape: 0.84 }[state.format]) < 0.85) add('warn', t('cSmall'));
    if (!facts.length) add('warn', t('cNoFacts'));
    if (!state.phone.trim() && !state.email.trim() && !state.web.trim()) add('err', t('cNoContact'));
    if (!state.applyUrl.trim()) add('warn', t('cQr'));
    if (!out.some((x) => /class="(err|warn)"/.test(x))) add('ok', t('cOk'));
    $('#checks').innerHTML = out.join('');
  }

  /* ---------- formulier ---------- */
  function fillForm() {
    $$('[data-k]').forEach((el) => (el.value = state[el.dataset.k] ?? ''));
    $$('[data-l]').forEach((el) => (el.value = state.labels[el.dataset.l] ?? ''));
    $$('#fmtSeg button').forEach((b) => b.classList.toggle('on', b.dataset.fmt === state.format));
  }
  let raf;
  const refresh = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { render(); save(); }); };
  $$('[data-k]').forEach((el) => el.addEventListener('input', () => { state[el.dataset.k] = el.value; refresh(); }));
  $$('[data-l]').forEach((el) => el.addEventListener('input', () => { state.labels[el.dataset.l] = el.value; refresh(); }));
  $$('#fmtSeg button').forEach((b) => b.addEventListener('click', () => { state.format = b.dataset.fmt; fillForm(); refresh(); }));

  $('#btnSample').onclick = () => { state = SAMPLE(); fillForm(); refresh(); $('#parseNotice').hidden = true; };
  $('#btnReset').onclick = () => {
    if (!confirm(t('confirmReset'))) return;
    const fmt = state.format; state = EMPTY(); state.format = fmt; fillForm(); refresh(); $('#parseNotice').hidden = true;
  };

  /* ---------- foto ---------- */
  $('#photoFile').addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const url = URL.createObjectURL(f);
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      const max = 1400, k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      state.photo = c.toDataURL('image/jpeg', 0.88); URL.revokeObjectURL(url);
      refresh();
    } catch { showNotice('#parseNotice', 'err', t('imgErr')); }
  });
  $('#photoClear').onclick = () => { state.photo = null; $('#photoFile').value = ''; refresh(); };

  /* ---------- upload / plakken ---------- */
  function showNotice(sel, type, html) { const n = $(sel); n.className = 'notice ' + (type || ''); n.innerHTML = html; n.hidden = false; }

  function applyParsed(fields) {
    const found = [], missing = [];
    const label = t('fields');
    const reset = EMPTY();
    for (const k of ['title', 'employer', 'highlight', 'location', 'hours', 'contract', 'salary', 'tasks', 'profile', 'offer', 'reference', 'applyUrl']) state[k] = reset[k];
    for (const [k, v] of Object.entries(fields)) { state[k] = v; }
    for (const k of ['title', 'location', 'hours', 'salary', 'tasks', 'profile', 'offer']) (fields[k] ? found : missing).push(label[k]);
    fillForm(); refresh();
    const n = (k) => lines(fields[k]).length;
    const counts = (n('tasks') || n('profile') || n('offer')) ? t('counts', n('tasks'), n('profile'), n('offer')) : '';
    const html = t('parsed', found.join(', '), counts, missing.join(', '));
    showNotice('#parseNotice', found.length >= 4 ? '' : 'warn', html);
  }

  async function handleFile(file) {
    if (!file) return;
    showNotice('#parseNotice', '', t('reading', esc(file.name)));
    try {
      const ls = await VacancyParser.fileToLines(file);
      if (!ls.length) throw new Error(t('noText'));
      applyParsed(VacancyParser.parse(ls));
    } catch (err) { showNotice('#parseNotice', 'err', esc(err.code === 'doc' ? t('docOld') : (err.message || t('readErr')))); }
  }
  const drop = $('#drop'), fileIn = $('#file');
  fileIn.addEventListener('change', () => { handleFile(fileIn.files[0]); fileIn.value = ''; });
  drop.addEventListener('click', (e) => { e.preventDefault(); fileIn.click(); });
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]));
  $('#btnParse').onclick = () => {
    const t = $('#pasteText').value.trim();
    if (!t) return showNotice('#parseNotice', 'warn', t('pasteFirst'));
    applyParsed(VacancyParser.parse(VacancyParser.textToLines(t)));
  };

  /* ---------- export ---------- */
  let fontCss;
  async function embedFonts() {
    if (fontCss) return fontCss;
    const faces = [['400', 'latin'], ['400', 'latin-ext'], ['600', 'latin'], ['600', 'latin-ext'], ['700', 'latin'], ['700', 'latin-ext']];
    const ranges = {
      latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2212',
      'latin-ext': 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1E00-1E9F,U+1EF2-1EFF,U+20A0-20AB,U+20AD-20C0,U+2C60-2C7F,U+A720-A7FF',
    };
    const toB64 = (buf) => { let s = ''; const b = new Uint8Array(buf); for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
    const parts = await Promise.all(faces.map(async ([w, sub]) => {
      const buf = await (await fetch(`fonts/lexend-${sub}-${w}-normal.woff2`)).arrayBuffer();
      return `@font-face{font-family:"Lexend";font-weight:${w};src:url(data:font/woff2;base64,${toB64(buf)}) format("woff2");unicode-range:${ranges[sub]}}`;
    }));
    return (fontCss = parts.join('\n'));
  }

  async function makePng() {
    await document.fonts.ready;
    const [pw, ph] = SIZE[state.format];
    const opts = { pixelRatio: Number($('#scale').value), width: pw, height: ph, fontEmbedCSS: await embedFonts(), style: { transform: 'none', left: '0', top: '0' }, backgroundColor: '#ffffff' };
    await htmlToImage.toPng(poster, opts);           // eerste ronde laadt afbeeldingen/lettertypen in
    return htmlToImage.toPng(poster, opts);
  }
  const slug = (s) => (s || 'vacature').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/Ł/g, 'L').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'vacature';
  const fname = (ext) => `jenson-${slug(state.title)}-${FMT_NAME[state.format]}.${ext}`;
  function save2(blobOrUrl, name) {
    const a = document.createElement('a');
    a.href = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  function makePdf(dataUrl) {
    const [pw, ph] = SIZE[state.format];
    const w = pw * 0.75, h = ph * 0.75;            // 96 dpi px -> pt
    const pdf = new window.jspdf.jsPDF({ orientation: w > h ? 'l' : 'p', unit: 'pt', format: [w, h], compress: true });
    pdf.setProperties({ title: state.title || 'Vacature', author: 'Jenson Recruitment' });
    pdf.addImage(dataUrl, 'PNG', 0, 0, w, h);
    if (/^https?:\/\//i.test(state.applyUrl)) pdf.link(0, 0, w, h, { url: state.applyUrl });
    return pdf.output('blob');
  }

  async function runExport(kind) {
    const btns = $$('.downloads button'); btns.forEach((b) => (b.disabled = true));
    showNotice('#exportMsg', '', t('generating'));
    try {
      const png = await makePng();
      if (kind === 'png' || kind === 'all') save2(png, fname('png'));
      if (kind === 'pdf' || kind === 'all') { await new Promise((r) => setTimeout(r, 250)); save2(makePdf(png), fname('pdf')); }
      showNotice('#exportMsg', '', t('done'));
      setTimeout(() => ($('#exportMsg').hidden = true), 4000);
    } catch (err) { console.error(err); showNotice('#exportMsg', 'err', t('failed', esc(err.message || err))); }
    finally { btns.forEach((b) => (b.disabled = false)); }
  }
  $('#dlPng').onclick = () => runExport('png');
  $('#dlPdf').onclick = () => runExport('pdf');
  $('#dlAll').onclick = () => runExport('all');

  /* ---------- start ---------- */
  $$('#langSeg button').forEach((b) => b.addEventListener('click', () => {
    lang = b.dataset.lang;
    try { localStorage.setItem('jenson-lang', lang); } catch {}
    applyLang();
    $('#parseNotice').hidden = true;
    render();
  }));
  applyLang();
  fillForm();
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { render(); });
  render();
  window.__poster = { get state() { return state; }, render, makePng, makePdf };
})();
