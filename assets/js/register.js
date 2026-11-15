/* Royalfood — registration flow: service → package → options → form → done.
   Edit PACKAGES and OPTIONS below to change prices and photos; the texts are in register-i18n.js. */
(() => {
  const CFG = window.APP_CONFIG, BRAND = CFG.BRAND, $ = s => document.querySelector(s), page = $('#page');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ic = n => `<i data-lucide="${n}"></i>`, icons = () => window.lucide && lucide.createIcons();
  const money = n => Number(n).toLocaleString('en-US');
  const img = id => `https://images.unsplash.com/photo-${id}?w=1200&q=70`;
  const YEAR_MONTHS = 10; // a year costs 10 months
  const T = (k, v = {}) => String((REG_I18N[I18N.lang] || {})[k] || REG_I18N.en[k] || k).replace(/\{(\w)\}/g, (m, x) => (x === 'b' ? BRAND : v[x] != null ? v[x] : m));

  const SERVICES = [
    { id: 'pos', icon: 'utensils-crossed', img: img('1552566626-52f8b828add9'), name: 'sPos', des: 'sPosD' },
    { id: 'queue', icon: 'users', img: img('1555396273-367ea4eb4db5'), name: 'sQ', des: 'sQD' }
  ];
  const PACKAGES = [
    { id: 1, word: 'Buffet', name: 'p1', des: 'buffet Restaurant', price: 690, img: img('1555939594-58d7cb561ad1') },
    { id: 2, word: 'A la carte', name: 'p2', des: 'A la carte Restaurant', price: 590, img: img('1504674900247-0877df9cc836') },
    { id: 3, word: 'Full Options', name: 'p3', des: 'Full Options Restaurant', price: 1590, img: img('1414235077428-338989a2e8c0'), rec: true, all: true, tables: 20 },
    { id: 4, word: 'Queue', name: 'sQ', des: 'Queue Manager', price: 290, img: img('1555396273-367ea4eb4db5'), queue: true }
  ];
  /* price = baht per month; no unit = on/off, otherwise counted. Names and descriptions: o_<id> and d_<id> in register-i18n.js */
  const OPTIONS = [
    { id: 'main', price: 0, fixed: true }, { id: 'print', price: 0, fixed: true },
    { id: 'tables', price: 5, unit: 'uTable' }, { id: 'qr', price: 10, unit: 'uTable' },
    { id: 'waiter', price: 50, unit: 'uDevice' }, { id: 'kitchen', price: 50, unit: 'uDevice' }, { id: 'printer', price: 50, unit: 'uDevice' },
    { id: 'stock', price: 200 }, { id: 'member', price: 390 }, { id: 'owner', price: 0, fixed: true }
  ];

  /* state survives a refresh, cleared after success */
  let S = {};
  try { S = JSON.parse(sessionStorage.getItem('rf_reg')) || {}; } catch (e) {}
  S.qty = S.qty || {};
  const keep = () => { try { sessionStorage.setItem('rf_reg', JSON.stringify(S)); } catch (e) {} };
  const pack = () => PACKAGES.find(p => p.id === S.pack);
  const qty = o => { const p = pack(); if (o.fixed) return 1; if (p.all) return o.id === 'tables' || o.id === 'qr' ? p.tables : 1; return S.qty[o.id] || 0; };
  const cost = o => (pack().all ? 0 : o.price * qty(o));
  const monthly = () => pack().price + (pack().queue ? 0 : OPTIONS.reduce((a, o) => a + cost(o), 0));
  const total = () => (S.type === 'year' ? monthly() * YEAR_MONTHS : monthly());
  const go = h => { location.hash = '#' + h; };
  function toast(msg) { const el = document.createElement('div'); el.className = 'rg-toast'; el.textContent = msg; $('#toasts').appendChild(el); setTimeout(() => el.remove(), 3200); }

  const langBox = () => `<div class="lang" id="lang"><button type="button" class="lang-btn" aria-haspopup="true" aria-label="${esc(T('langL'))}">${I18N.cur.flag}<span>${esc(I18N.cur.label)}</span>${ic('chevron-down')}</button>
    <div class="lang-menu">${I18N.LANGS.map(l => `<button type="button" data-l="${l.code}" class="${l.code === I18N.lang ? 'on' : ''}">${l.flag}${esc(l.label)}${l.code === I18N.lang ? ic('check') : ''}</button>`).join('')}</div></div>`;
  const backBar = to => `<header class="bar"><button class="back" data-go="${to}">${ic('chevron-left')} ${esc(T('back'))}</button><span class="sp"></span>${langBox()}</header>`;
  const V = {
    home: () => `<header class="bar"><span class="logo" data-logo></span><span><b>${esc(BRAND)}</b><small>Business Platform</small></span><span class="sp"></span>${langBox()}</header>
      <div class="wrap" style="padding:0"><section class="hero">
        <h1>${T('heroTitle')}</h1><p>${esc(T('heroSub'))}</p>
        <div class="stats"><div><b>${esc(T('st1'))}</b><small>${esc(T('st1s'))}</small></div><div><b>QR Code</b><small>${esc(T('st2s'))}</small></div><div><b>${esc(T('st3'))}</b><small>${esc(T('st3s'))}</small></div></div>
      </section></div>
      <div class="wrap"><div class="sec"><h2>${esc(T('our'))}</h2><p>${esc(T('ourSub'))}</p></div>
        <div class="cards">${SERVICES.map((s, i) => `<button class="card" style="animation-delay:${i * .12}s" data-service="${s.id}">
          <div class="pic tall"><img alt="" loading="lazy" src="${s.img}"><span class="ico">${ic(s.icon)}</span></div>
          <div class="body"><h3>${esc(T(s.name))}</h3><p class="des">${esc(T(s.des))}</p><div class="go"><span>${esc(T('start'))}</span><span class="arr">${ic('arrow-right')}</span></div></div></button>`).join('')}</div>
        <div class="foot"><b><span data-logo></span>${esc(BRAND)}</b><br>© ${new Date().getFullYear()} ${esc(BRAND)} — All rights reserved</div></div>`,

    package: () => `${backBar('home')}
      <section class="hero blue"><div class="wrap"><span class="tag">${esc(BRAND.toUpperCase())}</span><h1>${T('pkTitle')}</h1><p>${esc(T('pkSub'))}</p></div></section>
      <div class="wrap"><div class="cards">${PACKAGES.filter(p => !p.queue).map((p, i) => `<button class="card" style="animation-delay:${i * .12}s" data-pack="${p.id}">
        <div class="pic"><img alt="" loading="lazy" src="${p.img}">${p.rec ? `<span class="rec">${ic('star')} ${esc(T('rec'))}</span>` : ''}<span class="word">${esc(p.word)}</span></div>
        <div class="body"><h3>${esc(T(p.name))}</h3><p class="des">${esc(p.des)}</p>
          <div class="price">${esc(T('from'))} <b>${money(p.price)}</b> ${esc(T('bahtMo'))}</div>
          <div class="go"><span>${esc(T('pick'))}</span><span class="arr">${ic('arrow-right')}</span></div></div></button>`).join('')}</div></div>`,

    option: () => {
      const p = pack(); if (!p) return go('package');
      const m = monthly(), B = esc(T('baht'));
      const row = o => {
        const q = qty(o), on = q > 0, free = p.all || !o.price, u = o.unit ? T(o.unit) : '';
        const sub = o.fixed || (p.all && !o.unit) ? T('incl') : p.all ? T('inclN', { n: q, u }) : `${money(o.price)} ${T('baht')}${u ? ' / ' + u : ''}`;
        return `<button class="opt ${on ? 'on' : ''}" data-opt="${o.id}"><span class="l"><b>${esc(T('o_' + o.id))}</b><small class="${free ? 'free' : ''}">${esc(sub)}</small></span>
          ${on && o.unit ? `<span class="q">${q}</span>` : ''}${on && cost(o) ? `<span class="sum">+${money(cost(o))} ${B}</span>` : ''}
          ${on ? `<span class="ck">${ic('circle-check')}</span>` : `<span class="ch">${ic('chevron-right')}</span>`}</button>`;
      };
      return `${backBar(p.queue ? 'home' : 'package')}<div class="wrap">
        <div class="pk"><img alt="" src="${p.img}"><div><span class="tag">PACKAGE</span><h3>${esc(T(p.name))}</h3><p>${esc(T('from'))} <b>${money(p.price)}</b> ${esc(T('bahtMo'))}</p></div></div>
        ${p.queue ? '' : `<div class="head">${ic('layout-grid')}<span>${esc(T('which'))}</span></div><div class="opts">${OPTIONS.map(row).join('')}</div>`}
        <div class="head">${ic('tag')}<span>${esc(T('ptype'))}</span></div>
        <div class="types">
          <button class="type ${S.type === 'month' ? 'on' : ''}" data-type="month"><span>${esc(T('month'))}</span><b>${money(m)} <small>${B}</small></b><em></em></button>
          <button class="type ${S.type === 'year' ? 'on' : ''}" data-type="year"><i class="rib">${esc(T('best'))}</i><span>${esc(T('year'))}</span><b>${money(m * YEAR_MONTHS)} <small>${B}</small></b><em>${esc(T('saveAmt', { n: money(m * (12 - YEAR_MONTHS)) }))}</em></button>
        </div>
        <div class="submit"><button class="btn" data-next ${S.type ? '' : 'disabled'}>${esc(T('regUse'))} ${ic('arrow-right')}</button></div></div>`;
    },

    form: () => {
      const p = pack(); if (!p || !S.type) return go(p ? 'option' : 'package');
      const f = S.form || {}, tables = p.queue ? '' : qty(OPTIONS.find(o => o.id === 'tables'));
      const field = (id, label, icon, attrs, ph, hint = '') => `<div class="f" id="f_${id}"><label for="${id}">${esc(T(label))}<em></em></label><div class="in">${ic(icon)}<input id="${id}" value="${esc(f[id] || '')}" placeholder="${esc(ph)}" ${attrs}>${id === 'pw' ? `<button type="button" class="eye" data-eye aria-label="${esc(T('fPw'))}">${ic('eye')}</button>` : ''}</div>${hint ? `<small>${esc(T(hint))}</small>` : ''}</div>`;
      return `${backBar('option')}<section class="hero blue"><div class="wrap"><span class="tag">${esc(BRAND.toUpperCase())}</span><h1>${esc(T('regT'))}</h1><p>${esc(T('regS'))}</p></div></section>
        <div class="wrap"><form class="fcard" id="regForm" novalidate>
          <div class="chip">${ic('package')}<span>${esc(T('pkgL'))} ${esc(T(p.name))} · ${esc(T(S.type))}</span><b>${money(total())} ${esc(T('baht'))}</b></div>
          ${field('name', 'fName', 'user', 'maxlength="80" autocomplete="name"', T('fName'))}
          ${field('store', 'fStore', 'store', 'maxlength="80"', T('fStorePh'), 'fStoreHint')}
          ${field('address', 'fAddr', 'map-pin', 'maxlength="200" autocomplete="street-address"', T('fAddrPh'))}
          ${p.queue ? '' : `<div class="f"><label>${esc(T('o_tables'))}</label><div class="in">${ic('armchair')}<input value="${tables}" readonly aria-label="${esc(T('o_tables'))}"></div><small>${esc(T('fTablesHint'))}</small></div>`}
          ${field('email', 'fEmail', 'mail', 'type="email" maxlength="120" autocomplete="email"', 'example@mail.com')}
          ${field('phone', 'fPhone', 'phone', 'inputmode="numeric" maxlength="10" autocomplete="tel"', T('fPhonePh'))}
          ${field('user', 'fUser', 'at-sign', 'maxlength="30" autocomplete="username"', T('fUserPh'))}
          ${field('pw', 'fPw', 'lock', 'type="password" maxlength="72" autocomplete="new-password"', T('fPwPh'))}
          ${DB.remote ? field('code', 'fCode', 'key-round', 'maxlength="60" autocomplete="off"', T('fCodePh')) : `<div class="note">${esc(T('demo'))}</div>`}
          <div class="err" id="err"></div>
          <button class="btn" id="btnReg">${esc(T('regUse'))} ${ic('arrow-right')}</button></form></div>`;
    },

    done: () => {
      const d = V.result; if (!d) return go('home');
      return `<div class="wrap view done"><div class="ok">${ic('check')}</div><h1>${esc(T('okT'))}</h1><p>${esc(T('ok1'))}</p><p>${esc(T('ok2'))}</p>
        <span class="trial">${ic('gift')} ${esc(T('trial'))}</span>
        <div class="cred"><div class="row"><span>${esc(T('fUser'))}</span><b>${esc(d.user)}</b></div>
          <div class="row"><span>${esc(T('fPw'))}</span><b><span id="pwShow">••••••••</span><button type="button" class="eye" data-reveal aria-label="${esc(T('fPw'))}">${ic('eye')}</button></b></div>
          <div class="row"><span>${esc(T('pkgL'))}</span><b>${esc(T(d.name))} · ${esc(T(d.type))}</b></div></div>
        <button class="btn" data-enter>${esc(T('enter'))} ${ic('arrow-right')}</button></div>`;
    }
  };

  function render(keepScroll) {
    const name = (location.hash.slice(1) || 'home'), y = window.scrollY;
    const html = (V[name] && name !== 'result' ? V[name] : V.home)();
    if (typeof html !== 'string') return; // a guard redirected
    page.innerHTML = name === 'done' ? html : `<div class="view${keepScroll === true ? ' still' : ''}">${html}</div>`;
    I18N.apply(page); icons(); window.scrollTo(0, keepScroll === true ? y : 0);
  }

  /* option sheet */
  function sheet(o) {
    const p = pack(), locked = o.fixed || p.all, m = document.createElement('div'), u = o.unit ? T(o.unit) : '';
    let n = qty(o);
    m.className = 'sheet-back';
    const rates = o.unit ? `<br><br>${esc(T('rateM', { n: money(o.price), u }))}<br>${esc(T('rateY', { n: money(o.price * YEAR_MONTHS), u }))}` : '';
    const draw = warn => {
      m.innerHTML = `<div class="sheet"><h3>${esc(T('o_' + o.id))}<button type="button" data-x aria-label="${esc(T('close'))}">${ic('x')}</button></h3><p class="txt">${esc(T('d_' + o.id))}${locked ? '' : rates}</p>
        <div class="row"><span>${esc(T('priceL'))}</span>${locked || !o.price ? `<b class="free">${esc(T('incl'))}</b>` : `<b>${money(o.price)} ${esc(T('baht'))}${u ? ' / ' + esc(u) : ''} ${esc(T('perMo'))}</b>`}</div>
        ${locked ? `<button class="btn line" data-x>${esc(T('close'))}</button>` : o.unit ? `
          ${warn ? `<div class="warn">${ic('circle-alert')} ${esc(T('needTables'))}</div>` : ''}
          <div class="calc"><button type="button" data-d="-1" aria-label="−">${ic('minus')}</button><input inputmode="numeric" maxlength="3" value="${n}" aria-label="${esc(u)}"><button type="button" data-d="1" aria-label="+">${ic('plus')}</button></div>
          <div class="two"><button class="btn line" data-x>${esc(T('cancel'))}</button><button class="btn" data-ok>${esc(T('confirm'))}</button></div>` : `
          <div class="two"><button class="btn red" data-set="0" ${n ? '' : 'disabled'}>${ic('trash-2')} ${esc(T('remove'))}</button><button class="btn" data-set="1" ${n ? 'disabled' : ''}>${ic('circle-plus')} ${esc(T('add'))}</button></div>`}</div>`;
      icons();
    };
    const close = () => { m.classList.remove('show'); setTimeout(() => m.remove(), 250); };
    const save = v => { S.qty[o.id] = v; keep(); close(); render(true); };
    draw(o.id === 'tables' && sheet.warn); sheet.warn = false;
    document.body.appendChild(m); requestAnimationFrame(() => m.classList.add('show'));
    m.addEventListener('input', e => { n = Math.min(999, parseInt(e.target.value.replace(/\D/g, ''), 10) || 0); e.target.value = n; });
    m.addEventListener('click', e => {
      const d = e.target.closest('[data-d]'), s = e.target.closest('[data-set]');
      if (e.target === m || e.target.closest('[data-x]')) close();
      else if (d) { n = Math.max(0, Math.min(999, n + +d.dataset.d)); m.querySelector('input').value = n; }
      else if (e.target.closest('[data-ok]')) save(n);
      else if (s) save(+s.dataset.set);
    });
  }

  /* form: each rule returns the key of its error text, or '' */
  const RULES = {
    name: v => v.trim() ? '' : 'eName',
    store: v => v.trim() ? '' : 'eStore',
    address: v => v.trim() ? '' : 'eAddr',
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'eEmail',
    phone: v => /^\d{10}$/.test(v) ? '' : 'ePhone',
    user: v => /^[\w.\-]{3,30}$/.test(v.trim()) ? '' : 'eUser',
    pw: v => v.length >= 6 ? '' : 'fPwPh',
    code: v => v.trim() ? '' : 'eCode'
  };
  const ERR_KEY = { 'Username already exists': 'xUser', 'Invalid invite code': 'xCode', 'Invalid username': 'xName', 'Failed to fetch': 'xNet' };
  function check(id) {
    const el = document.getElementById(id); if (!el) return true;
    const key = RULES[id](el.value), f = document.getElementById('f_' + id);
    f.classList.toggle('bad', !!key); f.querySelector('em').textContent = key ? T(key) : '';
    return !key;
  }
  async function submit() {
    const ids = Object.keys(RULES).filter(id => document.getElementById(id));
    const bad = ids.filter(id => !check(id));
    if (bad.length) { document.getElementById(bad[0]).focus(); return; }
    const val = id => document.getElementById(id).value, p = pack(), btn = $('#btnReg'), err = $('#err'), old = btn.innerHTML;
    const tables = p.queue ? 0 : qty(OPTIONS.find(o => o.id === 'tables'));
    const options = p.queue ? '' : OPTIONS.filter(o => qty(o) > 0 && !o.fixed).map(o => o.id + (o.unit ? ':' + qty(o) : '')).join(', ');
    err.classList.remove('show'); btn.disabled = true; btn.innerHTML = '<span class="spin"></span>';
    try {
      await DB.register({ username: val('user').trim(), password: val('pw'), name: val('name').trim(), store: val('store').trim(), code: DB.remote ? val('code').trim() : '',
        package: `${p.word} · ${S.type === 'year' ? 'Yearly' : 'Monthly'}`, billing: S.type, price: total(), tables, options,
        email: val('email').trim(), phone: val('phone'), address: val('address').trim(), trialDays: 7 });
      V.result = { user: val('user').trim(), pw: val('pw'), name: p.name, type: S.type };
      try { sessionStorage.removeItem('rf_reg'); } catch (e) {}
      go('done');
    } catch (x) {
      btn.disabled = false; btn.innerHTML = old; icons();
      err.textContent = ERR_KEY[x.message] ? T(ERR_KEY[x.message]) : x.message || T('xAny'); err.classList.remove('show'); void err.offsetWidth; err.classList.add('show');
    }
  }

  document.addEventListener('click', e => {
    const q = s => e.target.closest(s), lang = $('#lang');
    let el;
    if ((el = q('[data-l]'))) {
      const typed = ['pw', 'code'].map(id => [id, ($('#' + id) || {}).value]); // not kept in session storage, so carry them over
      I18N.set(el.dataset.l); render(true);
      typed.forEach(([id, v]) => { if (v && $('#' + id)) $('#' + id).value = v; });
      return;
    }
    if (q('.lang-btn')) { lang.classList.toggle('open'); return; }
    if (lang) lang.classList.remove('open');
    if ((el = q('[data-go]'))) go(el.dataset.go);
    else if ((el = q('[data-service]'))) { if (el.dataset.service === 'queue') { S.pack = 4; S.qty = {}; S.type = ''; keep(); go('option'); } else go('package'); }
    else if ((el = q('[data-pack]'))) { if (S.pack !== +el.dataset.pack) { S.qty = {}; S.type = ''; } S.pack = +el.dataset.pack; keep(); go('option'); }
    else if (q('.sheet-back')) return;
    else if ((el = q('[data-opt]'))) sheet(OPTIONS.find(o => o.id === el.dataset.opt));
    else if ((el = q('[data-type]'))) { S.type = el.dataset.type; keep(); render(true); }
    else if (q('[data-next]')) {
      const p = pack(), tb = OPTIONS.find(o => o.id === 'tables');
      if (!p.queue && qty(tb) < 1) { toast(T('needTables')); sheet.warn = true; sheet(tb); } else go('form');
    }
    else if ((el = q('[data-eye]'))) { const i = $('#pw'), sh = i.type === 'password'; i.type = sh ? 'text' : 'password'; el.innerHTML = ic(sh ? 'eye-off' : 'eye'); icons(); }
    else if ((el = q('[data-reveal]'))) { const s = $('#pwShow'), sh = s.textContent.startsWith('•'); s.textContent = sh ? V.result.pw : '••••••••'; el.innerHTML = ic(sh ? 'eye-off' : 'eye'); icons(); }
    else if (q('[data-enter]')) location.href = 'app.html';
  });
  document.addEventListener('submit', e => { if (e.target.id === 'regForm') { e.preventDefault(); submit(); } });
  document.addEventListener('input', e => {
    const id = e.target.id; if (!RULES[id] || !e.target.closest('#regForm')) return;
    if (id === 'phone') e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
    if (id !== 'pw' && id !== 'code') { S.form = S.form || {}; S.form[id] = e.target.value; keep(); }
    if (document.getElementById('f_' + id).classList.contains('bad')) check(id);
  });
  document.addEventListener('focusout', e => { if (RULES[e.target.id] && e.target.closest('#regForm') && e.target.value) check(e.target.id); });
  window.addEventListener('hashchange', () => render());
  window.addEventListener('rf-lang', () => { if (!$('.sheet-back') && !($('#pw') && $('#pw').value)) render(true); });
  render();
})();
