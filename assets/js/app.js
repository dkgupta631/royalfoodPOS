(async () => {
  const CFG = window.APP_CONFIG, sess = DB.session();
  if (!sess) { location.replace('index.html'); return; }
  if (sess.member) { location.replace('member.html'); return; } // customers only get their own page
  const U = sess.user, num = DB.num;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = v => num(v).toLocaleString('en-US', { maximumFractionDigits: 2 });
  const ic = n => `<i data-lucide="${n}"></i>`;
  const icons = () => window.lucide && lucide.createIcons();
  const p2 = n => String(n).padStart(2, '0');
  const fmtT = d => { d = new Date(d); return isNaN(d) ? '-' : `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`; };
  const fmtDT = d => { d = new Date(d); return isNaN(d) ? '-' : `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`; };
  const elapsed = iso => { const s = Math.max(0, Math.floor((Date.now() - new Date(iso)) / 1000)); return `${p2(Math.floor(s / 3600))}:${p2(Math.floor(s / 60) % 60)}:${p2(s % 60)}`; };
  const bySort = a => [...a].sort((x, y) => num(x.sort) - num(y.sort) || String(x.name).localeCompare(String(y.name), undefined, { numeric: true }));
  const tracked = p => p.stock !== '' && p.stock != null;
  const active = p => String(p.active) !== 'false';
  const COLORS = ['#0a7cff', '#1fa855', '#f59e0b', '#ef5350', '#8b5cf6', '#0ea5a4', '#ec4899', '#64748b'];
  const color = s => COLORS[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
  const view = $('#view'), app = $('#app');
  const flag = v => String(v) === 'true';
  const r3 = n => Math.round(n * 1000) / 1000;
  const pText = p => [p.name, p.code, UI.tr(p.name), ...Object.values(DB.names(p))].join(' ').toLowerCase();
  const pn = p => DB.pname(p, I18N.lang);
  const thumbIn = (u, icon = 'utensils') => `${ic(icon)}${u ? `<img src="${esc(u)}" alt="" loading="lazy" onerror="this.remove()">` : ''}`;
  const thumb = (p, cls = '') => `<span class="thumb ${cls}" style="--c:${color(p.name)}">${thumbIn(DB.img(p))}</span>`;
  const S = { route: '', zone: null, table: null, tab: 'table', cat: 'all', q: '', focusQ: false, gtab: 'food', gst: 'all' };
  let acts = {};

  /* ---------- UI helpers ---------- */
  function toast(msg, type = 'ok') {
    const el = document.createElement('div'); el.className = 'toast ' + type;
    el.innerHTML = ic(type === 'bad' ? 'circle-alert' : 'circle-check') + `<span>${esc(msg)}</span>`;
    $('#toasts').appendChild(el); icons();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 2600);
  }
  function modal(html, wide) {
    const m = document.createElement('div'); m.className = 'modal-back';
    m.innerHTML = `<div class="modal ${typeof wide === 'string' ? wide : wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(m); icons(); requestAnimationFrame(() => m.classList.add('show'));
    const close = () => { m.classList.remove('show'); setTimeout(() => m.remove(), 200); };
    const fixed = wide === 'pm'; // the product form only closes from its own buttons, so a stray click outside cannot lose typed data
    m.addEventListener('click', e => { if ((e.target === m && !fixed) || e.target.closest('[data-close]')) close(); });
    const f = $('input:not([type=checkbox]),select', m); if (f && !wide) setTimeout(() => f.focus(), 120);
    return { el: m, close };
  }
  function confirmBox(msg, onYes, danger = true) {
    const m = modal(`<span class="cf-ic ${danger ? '' : 'info'}">${ic(danger ? 'triangle-alert' : 'circle-help')}</span><h3>${esc(msg)}</h3><p>${danger ? 'This action cannot be undone.' : 'Please confirm to continue.'}</p>
      <div class="actions"><button class="btn ghost" data-close>${esc(t('cancel'))}</button><button class="btn ${danger ? 'red' : ''}" data-yes>${ic(danger ? 'trash-2' : 'check')} ${esc(t('confirm'))}</button></div>`, 'cf');
    $('[data-yes]', m.el).onclick = () => { m.close(); onYes(); };
    setTimeout(() => { const b = $('[data-close]', m.el); if (b) b.focus(); }, 120); // Enter never deletes by accident
  }
  function formModal(title, fields, vals, onOk, onDel) {
    const m = modal(`<form><h3>${esc(title)}</h3>${fields.map(f => `<div class="f"><label>${esc(f.label)}${f.req ? ' <span class="reqd">*</span>' : ''}</label>${f.options
      ? `<select name="${f.k}" ${f.req ? 'required' : ''}>${f.options.map(o => `<option value="${esc(o[0])}" ${String(vals[f.k] == null ? '' : vals[f.k]) === String(o[0]) ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`
      : `<input name="${f.k}" type="${f.type || 'text'}" value="${esc(vals[f.k] == null ? '' : vals[f.k])}" ${f.req ? 'required' : ''} ${f.type === 'number' ? 'step="any"' + (f.neg ? '' : ' min="0"') : 'maxlength="120"'} placeholder="${esc(f.ph || '')}">`}</div>`).join('')}
      <div class="actions">${onDel ? `<button type="button" class="btn red" data-del style="margin-right:auto">${esc(t('delete'))}</button>` : ''}<button type="button" class="btn ghost" data-close>${esc(t('close'))}</button><button class="btn">${esc(t('save'))}</button></div></form>`);
    $('form', m.el).addEventListener('submit', e => { e.preventDefault(); if (onOk(Object.fromEntries(new FormData(e.target))) !== false) m.close(); });
    if (onDel) $('[data-del]', m.el).onclick = () => confirmBox(t('delete') + '?', () => { if (onDel() !== false) m.close(); });
  }
  const empty = (icon = 'inbox') => `<div class="empty">${ic(icon)}<div>${esc(t('noData'))}</div></div>`;
  const openShift = () => DB.list('Shifts').find(s => s.status === 'open');
  function needShift() { if (openShift()) return true; toast('Please open a shift first', 'bad'); location.hash = '#/dashboard'; return false; }

  /* ---------- receipt ---------- */
  function receipt(b) {
    const its = DB.items(b), c = DB.calc(b, its), cur = CFG.CURRENCY;
    const row = (l, v) => `<tr><td>${l}</td><td class="r">${v}</td></tr>`;
    return `<h3>${esc(U.store || CFG.BRAND)}</h3><div class="c">${esc(b.tableName)} · #${esc(b.id)}</div><div class="c">${fmtDT(b.closedAt || new Date())}</div><hr>
      <table>${its.map(i => row(`${esc(i.name)} x${num(i.qty)}`, money(num(i.price) * num(i.qty)))).join('')}</table><hr>
      <table>${row('Subtotal', money(c.subtotal))}${c.discount ? row('Discount', '-' + money(c.discount)) : ''}${c.tax ? row(`Tax ${CFG.TAX_PERCENT}%`, money(c.tax)) : ''}${row(`<b>TOTAL (${esc(cur)})</b>`, `<b>${money(c.total)}</b>`)}
      ${b.payMethod ? row('Paid by', esc(b.payMethod)) : ''}${num(b.received) ? row('Received', money(b.received)) + row('Change', money(num(b.received) - c.total)) : ''}</table><hr><div class="c">Thank you — ${esc(CFG.BRAND)} POS</div>`;
  }
  function printHtml(html) { const el = $('#print'); el.innerHTML = html; UI.node(el); window.print(); }
  function printBill(b) { printHtml(receipt(b)); }

  /* ---------- device settings (printing is per device, so these stay in this browser) ---------- */
  const SET = (() => { try { return JSON.parse(localStorage.getItem('rf_settings')) || {}; } catch (e) { return {}; } })();
  const saveSet = () => { try { localStorage.setItem('rf_settings', JSON.stringify(SET)); } catch (e) {} };
  // One ticket per enabled printer, all in one print job (each on its own page).
  function printOrder(b, lines) {
    if (!lines.length) return;
    const head = title => `<h3>${esc(title)}</h3><div class="c"><b>${esc(b.tableName)}</b> · #${esc(b.id)}</div><div class="c">${fmtDT(new Date())} · ${esc(U.username)}</div><hr>`;
    const kitchen = (title, big) => `<div class="tk ${big ? 'big' : ''}">${head(title)}<table>${lines.map(l => `<tr><td class="q">${num(l.qty)} ×</td><td>${esc(l.name)}</td></tr>`).join('')}</table><hr></div>`;
    const cashier = () => `<div class="tk">${head('ORDER — CASHIER')}<table>${lines.map(l => `<tr><td>${esc(l.name)} x${num(l.qty)}</td><td class="r">${money(num(l.price) * num(l.qty))}</td></tr>`).join('')}</table><hr>
      <table><tr><td><b>TOTAL (${esc(CFG.CURRENCY)})</b></td><td class="r"><b>${money(lines.reduce((a, l) => a + num(l.price) * num(l.qty), 0))}</b></td></tr></table></div>`;
    const tk = [];
    if (SET.cashier) tk.push(cashier());
    if (SET.k1) tk.push(kitchen('KITCHEN 1'));
    if (SET.k2) tk.push(kitchen('KITCHEN 2'));
    if (SET.k3) tk.push(kitchen('KITCHEN 3', true));
    if (tk.length) printHtml(tk.join('<div class="pb"></div>'));
  }
  function printQueueCard(x) {
    printHtml(`<div class="tk"><h3>${esc(U.store || CFG.BRAND)}</h3><div class="c">QUEUE</div><div class="qn">${esc(x.number)}</div><div class="c"><b>${esc(x.name)}</b> · ${esc(x.people)} people</div><div class="c">${fmtDT(x.createdAt)}</div><hr><div class="c">Please wait for your number to be called</div></div>`);
  }
  // Adds picker lines to a bill and returns what was added (for the order tickets).
  function addCart(b, cart) {
    const list = DB.items(b), added = [];
    cart.forEach(c => {
      const p = DB.get('Products', c.pid); if (!p) return;
      const name = p.name + (c.ex.length ? ' + ' + c.ex.map(x => x.name).join(', ') : ''), price = num(p.price) + c.ex.reduce((a, x) => a + num(x.price), 0);
      const ex = list.find(i => i.pid === c.pid && i.name === name && num(i.price) === price && i.status === 'ordered' && !i.src);
      if (ex) ex.qty = r3(num(ex.qty) + c.qty); else list.push({ pid: c.pid, name, price, qty: c.qty, status: 'ordered' });
      added.push({ name, price, qty: c.qty });
    });
    DB.setItems(b, list);
    return added;
  }
  function billModal(b) {
    const m = modal(`<div class="rcpt">${receipt(b)}</div><div class="actions"><button class="btn ghost" data-close>${esc(t('close'))}</button><button class="btn" data-p>${ic('printer')} Print</button></div>`);
    $('[data-p]', m.el).onclick = () => printBill(b);
  }

  /* ================= VIEWS ================= */
  const V = {};

  /* Number pad popup for cash amounts (opening and closing a shift). */
  function keypad(title, start, checkLabel, onOk) {
    let val = start ? String(start) : '';
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back', 'C'];
    const m = modal(`<h3 class="kp-ttl">${esc(title)}</h3>
      <div class="kp-amt"><small>Amount</small><b data-amt>0</b></div>
      <div class="kp-keys">${keys.map(k => `<button type="button" class="kp-k ${k === 'C' ? 'clr' : ''}" data-k="${k}" ${k === 'back' ? 'aria-label="Delete"' : ''}>${k === 'back' ? ic('delete') : k}</button>`).join('')}</div>
      <label class="kp-chk"><input type="checkbox" data-pr><span>${esc(checkLabel)}</span></label>
      <div class="kp-act"><button type="button" class="btn ghost danger" data-close>${esc(t('close'))}</button><button type="button" class="btn" data-ok>${esc(t('confirm'))}</button></div>`, 'kp');
    const show = () => { $('[data-amt]', m.el).textContent = val === '' ? '0' : val.replace(/\B(?=(\d{3})+(?!\d))/g, (x, a, off, str) => (str.indexOf('.') >= 0 && off > str.indexOf('.') ? '' : ',')); };
    const press = k => {
      if (k === 'C') val = '';
      else if (k === 'back') val = val.slice(0, -1);
      else if (k === '.') { if (!val.includes('.')) val = (val || '0') + '.'; }
      else if (val.replace('.', '').length < 10 && !/\.\d\d$/.test(val)) val = val === '0' ? k : val + k;
      show();
    };
    const done = () => { m.close(); document.removeEventListener('keydown', onKey); onOk(num(val), $('[data-pr]', m.el).checked); };
    const onKey = e => {
      if (!document.body.contains(m.el)) { document.removeEventListener('keydown', onKey); return; }
      if (/^[0-9.]$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('back'); else if (e.key === 'Enter') { e.preventDefault(); done(); }
    };
    document.addEventListener('keydown', onKey);
    m.el.addEventListener('click', e => { const k = e.target.closest('[data-k]'); if (k) press(k.dataset.k); else if (e.target.closest('[data-ok]')) done(); });
    show();
  }
  /* Slip printed when a shift is opened or closed. */
  function shiftSlip(sh, kind, x = {}) {
    const no = DB.list('Shifts').indexOf(sh) + 1, at = new Date(kind === 'open' ? sh.openedAt : sh.closedAt), who = esc(U.name || U.username);
    const row = (l, v) => `<tr><td>${l}</td><td class="r">${v}</td></tr>`, f2 = v => num(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    printHtml(`<div class="tk"><div class="c"><b>${esc(U.store || CFG.BRAND)}</b></div><hr><h3>${kind === 'open' ? 'Open Shift' : 'Close Shift'}</h3><hr>
      <table>${row('Terminal', esc(U.store || CFG.BRAND))}${row('Shift No.', no)}${row('Cashier', who)}${row('Manager', '')}${row('Sale Date', `${p2(at.getDate())}/${p2(at.getMonth() + 1)}/${at.getFullYear()}`)}${row(kind === 'open' ? 'Clock In' : 'Clock Out', `${p2(at.getHours())}:${p2(at.getMinutes())}`)}</table><hr>
      <table>${row('Initial Cash', f2(sh.openingCash))}${kind === 'open' ? row('Total Adjust', f2(sh.openingCash))
        : row('Sales', f2(x.sales)) + row('Bills paid', x.count) + row('Cash sales', f2(x.cash)) + row('Expenses', f2(sh.expenses)) + row('Expected cash', f2(sh.expectedCash)) + row('Counted cash', f2(sh.closingCash)) + row('Difference', f2(num(sh.closingCash) - num(sh.expectedCash)))}</table><hr>
      <div class="c sg1">Cashier</div><div class="sgl"></div><div class="c">(${who})</div><div class="c sg1">Manager</div><div class="sgl"></div><div class="c sg1">${fmtDT(at)}</div></div>`);
  }

  V.dashboard = root => {
    const sh = openShift(), exp = new Date(U.expireDate), days = Math.round((exp - Date.now()) / 864e5);
    const rel = isNaN(exp) ? '' : days < 0 ? 'expired' : days < 14 ? `${days} days from now` : days < 60 ? `${Math.round(days / 7)} weeks from now` : `${Math.round(days / 30)} months from now`;
    const expTxt = isNaN(exp) ? '-' : exp.toLocaleDateString({ th: 'th-TH', km: 'km-KH', lo: 'lo-LA', zh: 'zh-CN' }[I18N.lang] || 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const bills = sh ? DB.list('Bills').filter(b => b.shiftId === sh.id && b.status === 'closed') : [];
    const sales = bills.reduce((a, b) => a + num(b.total), 0), open = DB.list('Bills').filter(b => b.status === 'open'), unpaid = open.reduce((a, b) => a + num(b.total), 0);
    const cash = bills.filter(b => b.payMethod === 'Cash').reduce((a, b) => a + num(b.total), 0), spent = sh ? num(sh.expenses) : 0, balance = sh ? num(sh.openingCash) + cash - spent : 0;
    const sp = CFG.SUPPORT;
    const stat = (c, icon, label, val, extra = '') => `<div class="dstat" style="--c:${c}"><div class="dh"><span class="ib">${ic(icon)}</span><small>${label}</small></div><b>${val}</b>${extra}</div>`;
    const cnt = (v, dec) => `<span data-count="${v}" ${dec ? 'data-dec' : ''}>0</span>`;
    root.innerHTML = `
    <div class="head"><h2>${esc(U.store || CFG.BRAND)}</h2><span class="sp"></span><a class="btn" href="#/pos">${ic('shopping-cart')} ${esc(t('pos'))}</a></div>
    <div class="dash">
      ${sh ? `<div class="dleft">
          <div class="card cashier"><span class="pm-ic">${ic('user-round')}</span><span class="grow"><b>${esc(U.name || U.username)}</b><span class="since">${ic('clock')} ${fmtT(sh.openedAt)}</span></span>
            <button class="btn ghost" data-act="profile">${ic('user-round')} Profile</button><button class="btn red" data-act="closeShift">${ic('lock')} ${esc(t('closeShift'))}</button></div>
          <div class="dstats">
            ${stat('#0a7cff', 'credit-card', esc(t('initDrawer')), cnt(num(sh.openingCash)))}${stat('#06b6d4', 'clock', 'Open shift time', fmtT(sh.openedAt), `<em>${fmtDT(sh.openedAt)}</em>`)}
            ${stat('#f43f5e', 'trending-up', 'Expenses', cnt(spent, 1), `<button class="btn-soft" data-act="expense">${ic('plus')} Add expense</button>`)}${stat('#f59e0b', 'dollar-sign', 'Balance in the drawer', cnt(balance, 1))}
            ${stat('#3b82f6', 'file-text', 'Number of orders / total', `${cnt(bills.length)} <i>/</i> ${cnt(sales, 1)}`)}${stat('#14b8a6', 'circle-check-big', 'Order/unpaid price', `${cnt(open.length)} <i>/</i> ${cnt(unpaid, 1)}`)}
          </div></div>`
      : `<div class="card shift" data-act="openShift" role="button" tabindex="0"><span class="big">${ic('credit-card')}</span><h3>${esc(t('openShift'))}</h3><p>${esc(t('initDrawer'))}</p><span class="dot"></span></div>`}
      <div class="rcol">
        <div class="card info hl"><span class="ib o">${ic('calendar')}</span><span class="grow"><small>${esc(t('expDate'))}</small><b>${esc(expTxt)}</b><em>${esc(rel)}</em></span>${ic('chevron-right')}</div>
        <div class="card info"><span class="ib">${ic('box')}</span><span class="grow"><small>ID : ${esc(U.id)} • ${esc(t('pkg'))}</small><b>${esc(U.package || 'Standard')}</b></span>${ic('chevron-right')}</div>
        <div class="card rp"><h4>${ic('phone')} ${esc(t('report'))}</h4><div class="rows">
          <div class="row"><span class="tag g">LINE</span>${esc(sp.line)}</div>
          <div class="row"><span class="tag b">${esc(t('call'))} (${esc(sp.hours)})</span>${esc(sp.call)}</div>
          <div class="row"><span class="tag a">${esc(t('overtime'))}</span>${sp.overtime.map(esc).join('&nbsp; ')}</div></div></div>
        <div class="card info"><span class="ib c">${ic('monitor')}</span><span class="grow"><small>${esc(t('backup'))}</small></span><button class="btn-soft" data-act="backup">${esc(t('download'))}</button></div>
      </div>
    </div>`;
    acts = {
      openShift: () => keypad('Money in drawer', 0, 'Print open-shift receipt', (amt, print) => {
        const row = DB.save('Shifts', { status: 'open', openedAt: new Date().toISOString(), closedAt: '', openingCash: amt, closingCash: '', expectedCash: '', user: U.username, expenses: 0 });
        DB.log('Open shift', `Drawer ${money(amt)}`); toast('Shift opened'); render(true);
        if (print) shiftSlip(row, 'open');
      }),
      closeShift: () => keypad(`${t('closeShift')} — expected cash ${money(balance)}`, balance, 'Print close-shift receipt', (amt, print) => {
        Object.assign(sh, { status: 'closed', closedAt: new Date().toISOString(), closingCash: amt, expectedCash: balance }); DB.save('Shifts', sh);
        DB.log('Close shift', `Sales ${money(sales)}, counted ${money(amt)}, expected ${money(balance)}`); toast('Shift closed'); render(true);
        if (print) shiftSlip(sh, 'close', { sales, cash, count: bills.length });
      }),
      expense: () => formModal('Add expense', [{ k: 'amt', label: `Amount (${CFG.CURRENCY})`, type: 'number', req: 1 }, { k: 'note', label: 'Note', req: 1 }], {}, o => {
        if (num(o.amt) <= 0) return false;
        sh.expenses = num(sh.expenses) + num(o.amt); DB.save('Shifts', sh); DB.log('Expense', `${o.note.trim()} ${money(o.amt)}`); toast('Saved'); render();
      }),
      profile: () => profileModal(),
      backup: backup
    };
    $$('[data-count]', root).forEach(el => {
      const to = num(el.dataset.count), dec = el.hasAttribute('data-dec'), t0 = performance.now(), fmt = v => dec ? num(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : money(v);
      const step = now => { const k = Math.max(0, Math.min(1, (now - t0) / 700)); el.textContent = fmt(dec ? to * (1 - Math.pow(1 - k, 3)) : Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); else el.textContent = fmt(to); };
      requestAnimationFrame(step);
    });
  };
  function backup() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([DB.export()], { type: 'application/json' }));
    a.download = `royalfood-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ---------- POS ---------- */
  V.pos = root => {
    const zones = bySort(DB.list('Zones'));
    if (!zones.some(z => z.id === S.zone)) S.zone = zones[0] ? zones[0].id : null;
    const tables = bySort(DB.list('Tables').filter(x => x.zoneId === S.zone));
    if (!DB.get('Tables', S.table)) S.table = tables[0] ? tables[0].id : null;
    const tb = DB.get('Tables', S.table), bill = tb && DB.openBill(tb.id), its = bill ? DB.items(bill) : [];
    const c = bill ? DB.calc(bill, its) : { subtotal: 0, discount: 0, tax: 0, total: 0, count: 0 }, cur = esc(CFG.CURRENCY);
    const allBills = [...DB.list('Bills')].sort((a, b) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1) || String(b.openedAt).localeCompare(String(a.openedAt))).slice(0, 80);
    const left = S.tab === 'table'
      ? `<div class="zones">${zones.map(z => `<button class="chip ${z.id === S.zone ? 'on' : ''}" data-act="zone" data-id="${esc(z.id)}">${esc(z.name)}</button>`).join('')}</div>
         ${tables.length ? `<div class="grid-t">${tables.map((x, i) => { const b = DB.openBill(x.id); return `<button class="tile ${b ? 'busy' : ''} ${x.id === S.table ? 'sel' : ''}" style="--i:${i}" data-act="sel" data-id="${esc(x.id)}">${b ? `<small data-since="${esc(b.openedAt)}">${elapsed(b.openedAt)}</small>` : ''}${esc(x.name)}</button>`; }).join('')}</div>` : empty('layout-grid')}`
      : `<div class="card" style="margin-top:12px">${allBills.length ? allBills.map(b => `<div class="billrow" data-act="viewBill" data-id="${esc(b.id)}"><span class="tag ${b.status === 'open' ? 'g' : b.status === 'closed' ? 'b' : 'r'}">${esc(b.status)}</span>
          <span class="grow"><b>${esc(b.tableName)}</b><small>${fmtDT(b.openedAt)} · #${esc(b.id)}</small></span><b>${money(b.total)} ${cur}</b></div>`).join('') : empty('receipt-text')}</div>`;
    const dis = bill ? '' : 'disabled';
    root.innerHTML = `<div class="pos">
      <div>
        <div class="pos-tabs"><button class="ptab ${S.tab === 'table' ? 'on' : ''}" data-act="tab" data-id="table">${esc(t('table'))}</button><button class="ptab ${S.tab === 'bill' ? 'on' : ''}" data-act="tab" data-id="bill">${esc(t('bill'))}</button>
          <span style="flex:1"></span>${SET.quick ? `<button class="btn amber" data-act="quick">${ic('zap')} Quick bill</button>` : ''}<button class="btn green" data-act="queue">${esc(t('callQueue'))} ${ic('plus')}</button><button class="btn" data-act="reserve">${esc(t('reserve'))} ${ic('plus')}</button></div>
        ${left}
      </div>
      <div class="card detail">
        <h3>${esc(t('detail'))} [ID : ${bill ? esc(bill.id) : 0}]</h3>
        <div class="dgrid">
          <div class="dbox">
            <div class="drow"><span>${esc(t('table'))}</span><b>${tb ? esc(tb.name) : '-'}</b></div>
            <div class="drow"><span>${esc(t('timeStarted'))}</span><b>${bill ? fmtT(bill.openedAt) : '-'}</b></div>
            <div class="drow"><span>${esc(t('timeSpent'))}</span><b ${bill ? `data-since="${esc(bill.openedAt)}"` : ''}>${bill ? elapsed(bill.openedAt) : '00:00:00'}</b></div>
            <div class="drow"><span>${esc(t('seats'))}</span><b>${bill ? esc(bill.seats || '-') : '-'}</b></div>
            <div class="drow"><span>${esc(t('itemNumber'))}</span><b>${c.count} ${esc(t('itemsUnit'))}</b></div>
          </div>
          <div class="dbox">
            <div class="drow"><span>${esc(t('timeSpending'))}</span><b></b></div>
            <div class="drow"><span>${esc(t('startPrice'))}</span><b>${money(c.subtotal)} ${cur}</b></div>
            <div class="drow"><span>${esc(t('taxDisc'))}</span><b>${bill ? money(c.tax - c.discount) : ''} ${cur}</b></div>
            <div class="net"><span>${esc(t('netPrice'))}</span><b>${bill ? money(c.total) : ''} ${cur}</b></div>
          </div>
        </div>
        <div class="abtns">
          <button class="ab" data-act="add" ${tb ? '' : 'disabled'}>${ic('circle-plus')}${esc(t('add'))}</button>
          <button class="ab" data-act="qr" ${tb ? '' : 'disabled'}>${ic('qr-code')}${esc(t('qrcode'))}</button>
          <button class="ab red" data-act="cancel" ${dis}>${ic('circle-x')}${esc(t('cancel'))}</button>
          <button class="ab lite" data-act="move" ${dis}>${ic('arrow-left-right')}${esc(t('move'))}</button>
          <button class="ab lite" data-act="status" ${dis}>${ic('circle-check')}${esc(t('status'))}</button>
          <button class="ab lite" data-act="invoice" ${dis}>${ic('receipt-text')}${esc(t('invoice'))}</button>
          <button class="ab green" data-act="checkout" ${its.length ? '' : 'disabled'}>${ic('printer')}${esc(t('checkout'))}</button>
        </div>
        <div class="tw"><table class="t items"><thead><tr><th><input type="checkbox" data-all aria-label="Select all"></th><th>${esc(t('items'))}</th><th class="r">${esc(t('price'))}</th><th>${esc(t('number'))}</th><th class="r">${esc(t('total'))}</th><th>${esc(t('status'))}</th><th>#</th></tr></thead>
          <tbody>${its.map((i, k) => `<tr><td><input type="checkbox" data-chk="${k}" aria-label="Select"></td><td>${esc(i.name)} ${i.src === 'qr' ? '<span class="tag a">QR</span>' : ''}${i.note ? `<small class="inote">${esc(i.note)}</small>` : ''}</td><td class="r">${money(i.price)}</td>
            <td><span class="qty"><button data-act="dec" data-id="${k}" aria-label="Less">${ic('minus')}</button><b>${num(i.qty)}</b><button data-act="inc" data-id="${k}" aria-label="More">${ic('plus')}</button></span></td>
            <td class="r"><b>${money(num(i.price) * num(i.qty))}</b></td><td><span class="tag ${i.status === 'served' ? 'g' : 'a'}">${esc(i.status || 'ordered')}</span></td>
            <td><button class="icb del" data-act="del" data-id="${k}" aria-label="Remove">${ic('trash-2')}</button></td></tr>`).join('')}</tbody></table>${its.length ? '' : '<div class="empty" style="padding:26px"></div>'}</div>
      </div></div>`;
    const all = $('[data-all]', root); if (all) all.onchange = () => $$('[data-chk]', root).forEach(x => { x.checked = all.checked; });
    const change = (k, d) => { const i = its[k]; if (!i) return; i.qty = num(i.qty) + d; if (i.qty <= 0) its.splice(k, 1); DB.setItems(bill, its); render(); };
    acts = {
      tab: el => { S.tab = el.dataset.id; render(true); },
      zone: el => { S.zone = el.dataset.id; S.table = null; render(true); },
      sel: el => { S.table = el.dataset.id; render(); },
      quick: () => {
        if (!needShift()) return;
        pickProducts(cart => {
          const b = DB.newBill({ id: '', name: 'Quick bill', seats: '' }, '', U.username, openShift().id);
          const added = addCart(b, cart); DB.log('Open bill', 'Quick bill'); render(); printOrder(b, added); checkout(b);
        });
      },
      viewBill: el => { const b = DB.get('Bills', el.dataset.id); if (!b) return;
        if (b.status === 'open' && !b.tableId) { if (needShift()) checkout(b); return; } // unpaid quick bill
        if (b.status === 'open') { const tt = DB.get('Tables', b.tableId); if (tt) { S.zone = tt.zoneId; S.table = tt.id; S.tab = 'table'; render(true); return; } } billModal(b); },
      inc: el => change(+el.dataset.id, 1), dec: el => change(+el.dataset.id, -1),
      del: el => { its.splice(+el.dataset.id, 1); DB.setItems(bill, its); render(); },
      add: () => {
        if (!needShift()) return;
        pickProducts(cart => {
          let b = DB.openBill(tb.id);
          if (!b) { b = DB.newBill(tb, tb.seats, U.username, openShift().id); DB.log('Open bill', tb.name); }
          const added = addCart(b, cart); toast('Items added'); render(); printOrder(b, added);
        });
      },
      qr: () => {
        // Each table has its own switch (qr) and its own secret in the link (qrKey); changing the key makes old printed codes stop working.
        const on = () => String(tb.qr) !== 'false';
        const link = () => new URL('menu.html?table=' + encodeURIComponent(tb.id) + (tb.qrKey ? '&k=' + encodeURIComponent(tb.qrKey) : ''), location.href).href;
        const m = modal(`<header class="pm-head"><span class="pm-ic">${ic('qr-code')}</span><div class="pm-ttl"><h3>${esc(tb.name)}</h3><small>Qrcode Table</small></div>
            <button type="button" class="pm-x eye" data-eye aria-label="Show or hide the switch">${ic('eye-off')}</button><button type="button" class="pm-x" data-close aria-label="${esc(t('close'))}">${ic('x')}</button></header>
          <div class="pm-body qrb">
            <label class="mcard qr-en sw" data-en><span class="ib">${ic('utensils')}</span><span class="grow"><b>Enable</b><small>Enable receiving orders from customers via QR Code</small></span><input type="checkbox" data-on ${on() ? 'checked' : ''}><i></i></label>
            <div class="mcard qr-card"><div class="qr-frame"><div data-qr></div><div class="qr-off" data-off hidden>${ic('ban')}<span>QR ordering is off for this table</span></div></div>
              <span class="qr-chip">${ic('smartphone')} Scan to order food</span>
              ${DB.remote ? '' : '<p class="hint">Demo mode: the menu link only works in this browser.</p>'}</div>
          </div>
          <footer class="pm-foot qrf"><button class="btn" data-print>${ic('printer')} Print</button><button class="btn-soft" data-new>${ic('refresh-cw')} Change QRcode</button><button class="btn ghost" data-close>${ic('x')} ${esc(t('close'))}</button></footer>`, 'drawerless qrm');
        const box = $('[data-qr]', m.el);
        const draw = () => {
          box.innerHTML = ''; if (window.QRCode) new QRCode(box, { text: link(), width: 220, height: 220 });
          $('[data-off]', m.el).hidden = on(); $('.qr-frame', m.el).classList.toggle('off', !on()); $('[data-print]', m.el).disabled = !on();
        };
        $('[data-on]', m.el).onchange = e => { tb.qr = String(e.target.checked); DB.save('Tables', tb); DB.log('QR ordering', `${tb.name} ${on() ? 'on' : 'off'}`); toast(on() ? 'QR ordering is on' : 'QR ordering is off', on() ? 'ok' : 'bad'); draw(); };
        $('[data-eye]', m.el).onclick = e => { const en = $('[data-en]', m.el); en.hidden = !en.hidden; e.currentTarget.innerHTML = ic(en.hidden ? 'eye' : 'eye-off'); icons(); };
        $('[data-new]', m.el).onclick = () => confirmBox(`Change QRcode — ${tb.name}?`, () => { tb.qrKey = Math.random().toString(36).slice(2, 10); DB.save('Tables', tb); DB.log('Change QRcode', tb.name); toast('New QR code created'); draw(); });
        $('[data-print]', m.el).onclick = () => { const c = $('canvas', box); if (!c) return;
          printHtml(`<div class="tk"><h3>${esc(U.store || CFG.BRAND)}</h3><div class="c qt">${esc(tb.name)}</div><div class="c"><img class="qimg" src="${c.toDataURL('image/png')}" alt=""></div><div class="c"><b>Scan to order food</b></div></div>`); };
        draw();
      },
      cancel: () => confirmBox(`${t('cancel')} ${tb.name}?`, () => { Object.assign(bill, { status: 'cancelled', closedAt: new Date().toISOString() }); DB.save('Bills', bill); if (pulseOk) { cancelSaid.add(bill.id); announce('cancel', tb.name); } DB.log('Cancel bill', `${tb.name} ${money(c.total)}`); toast('Bill cancelled'); render(); }),
      move: () => {
        const free = bySort(DB.list('Tables')).filter(x => !DB.openBill(x.id));
        const m = modal(`<h3>${esc(t('move'))} ${esc(tb.name)} →</h3><div class="chips" style="margin-top:14px">${free.map(x => `<button class="chip" data-to="${esc(x.id)}">${esc(x.name)}</button>`).join('') || empty()}</div><div class="actions"><button class="btn gray" data-close>${esc(t('close'))}</button></div>`);
        m.el.addEventListener('click', e => { const b = e.target.closest('[data-to]'); if (!b) return; const to = DB.get('Tables', b.dataset.to);
          Object.assign(bill, { tableId: to.id, tableName: to.name }); DB.save('Bills', bill); DB.log('Move table', `${tb.name} → ${to.name}`); S.zone = to.zoneId; S.table = to.id; m.close(); toast(`Moved to ${to.name}`); render(); });
      },
      status: () => {
        if (!its.length) return;
        let pick = $$('[data-chk]:checked', root).map(x => +x.dataset.chk); if (!pick.length) pick = its.map((_, k) => k);
        const to = pick.every(k => its[k].status === 'served') ? 'ordered' : 'served';
        pick.forEach(k => { its[k].status = to; }); DB.setItems(bill, its); render();
      },
      invoice: () => billModal(bill),
      checkout: () => { if (needShift()) checkout(bill, tb); },
      queue: queueModal, reserve: reserveModal
    };
  };

  function chooseExtras(p, onOk) {
    const ex = DB.extras(p);
    const m = modal(`<h3>${esc(pn(p))}</h3><p class="hint">Choose extras for this dish</p><div class="exl">${ex.map((x, i) => `<label class="exo"><input type="checkbox" value="${i}"><span>${esc(x.name)}</span><b>${num(x.price) ? '+' + money(x.price) : 'Free'}</b></label>`).join('')}</div>
      <div class="actions"><button class="btn ghost" data-close>${esc(t('close'))}</button><button class="btn" data-ok>${ic('plus')} ${esc(t('add'))}</button></div>`);
    $('[data-ok]', m.el).onclick = () => { m.close(); onOk($$('input:checked', m.el).map(i => ex[+i.value])); };
  }
  function pickProducts(onDone) {
    const cart = {}; let cat = 'all', q = '';
    const qtyOf = pid => r3(Object.values(cart).filter(c => c.pid === pid).reduce((a, c) => a + c.qty, 0));
    const add = (p, qty, ex = []) => { const key = p.id + '|' + ex.map(x => x.name).join('|'); if (!cart[key]) cart[key] = { pid: p.id, qty: 0, ex }; cart[key].qty = r3(cart[key].qty + qty); draw(); };
    const cats = bySort(DB.list('Categories'));
    const m = modal(`<h3>${esc(t('add'))} — ${esc(t('items'))}</h3><div class="pickbar"><input class="input" style="max-width:230px" placeholder="${esc(t('search'))}" data-pq><div class="chips" data-cats></div></div>
      <div class="pgrid" data-grid></div><div class="pickfoot"><b data-sum></b><span style="flex:1"></span><button class="btn ghost" data-close>${esc(t('close'))}</button><button class="btn" data-ok>${esc(t('confirm'))}</button></div>`, true);
    const grid = $('[data-grid]', m.el);
    const draw = () => {
      $('[data-cats]', m.el).innerHTML = [['all', 'All']].concat(cats.map(x => [x.id, x.name])).map(x => `<button class="chip ${x[0] === cat ? 'on' : ''}" data-cat="${esc(x[0])}">${esc(x[1])}</button>`).join('');
      const list = DB.list('Products').filter(p => active(p) && (cat === 'all' || p.categoryId === cat) && pText(p).includes(q));
      grid.innerHTML = list.map(p => { const k = qtyOf(p.id); return `<button class="pcard" data-pid="${esc(p.id)}">${thumb(p)}<b>${esc(pn(p))}</b><span class="pr">${money(p.price)} ${esc(CFG.CURRENCY)}${flag(p.byWeight) ? ' /kg' : ''}</span>
        ${tracked(p) ? `<small>Stock ${num(p.stock)}</small>` : ''}${k ? `<span class="cnt">${k}</span><span class="ops"><span class="btn ghost sm" data-minus="${esc(p.id)}">${ic('minus')}</span></span>` : ''}</button>`; }).join('') || empty('package');
      const all = Object.values(cart), n = r3(all.reduce((a, c) => a + c.qty, 0)), sum = all.reduce((a, c) => a + (num((DB.get('Products', c.pid) || {}).price) + c.ex.reduce((x, y) => x + num(y.price), 0)) * c.qty, 0);
      $('[data-sum]', m.el).textContent = `${n} ${t('itemsUnit')} · ${money(sum)} ${CFG.CURRENCY}`; $('[data-ok]', m.el).disabled = !all.length;
      icons(); grid.classList.add('still');
    };
    m.el.addEventListener('click', e => {
      const c = e.target.closest('[data-cat]'), mi = e.target.closest('[data-minus]'), pc = e.target.closest('[data-pid]');
      if (c) { cat = c.dataset.cat; grid.classList.remove('still'); draw(); }
      else if (mi) { const key = Object.keys(cart).filter(k => cart[k].pid === mi.dataset.minus).pop(); if (key) { cart[key].qty = r3(cart[key].qty - 1); if (cart[key].qty <= 0) delete cart[key]; } draw(); }
      else if (pc) {
        const p = DB.get('Products', pc.dataset.pid); if (!p) return;
        if (flag(p.byWeight)) formModal(`${p.name} — ${money(p.price)} ${CFG.CURRENCY} /kg`, [{ k: 'w', label: 'Weight (kg)', type: 'number', req: 1 }], {}, o => { if (num(o.w) <= 0) return false; add(p, num(o.w)); });
        else if (DB.extras(p).length) chooseExtras(p, ex => add(p, 1, ex));
        else add(p, 1);
      }
      else if (e.target.closest('[data-ok]')) { m.close(); onDone(Object.values(cart)); }
    });
    $('[data-pq]', m.el).addEventListener('input', e => { q = e.target.value.trim().toLowerCase(); draw(); });
    draw();
  }

  function checkout(bill, tb) {
    const tmp = { ...bill }, its = DB.items(bill), cur = esc(CFG.CURRENCY); let method = 'Cash';
    const PAY = [['Cash', 'banknote'], ['QR', 'qr-code'], ['Transfer', 'landmark'], ['Card', 'credit-card']];
    const m = modal(`<h3>${esc(t('checkout'))} — ${esc(bill.tableName)}</h3>
      <div class="sumrow"><span>Subtotal</span><b data-sub></b></div>
      <div class="f"><label>Discount (${cur})</label><input type="number" min="0" step="any" data-disc value="${num(bill.discount) || ''}" placeholder="0"></div>
      <div class="sumrow" data-taxrow><span>Tax ${num(CFG.TAX_PERCENT)}%</span><b data-tax></b></div>
      <div class="sumrow big"><span>${esc(t('netPrice'))}</span><b data-net></b></div>
      <div class="f"><label>${esc(t('member'))}</label><select data-mem><option value="">—</option>${DB.list('Members').map(x => `<option value="${esc(x.id)}">${esc(x.name)} (${esc(x.phone)})</option>`).join('')}</select></div>
      <div class="f"><label>Payment</label><div class="pays">${PAY.map(p => `<button type="button" class="pay ${p[0] === method ? 'on' : ''}" data-pay="${p[0]}">${ic(p[1])}${p[0]}</button>`).join('')}</div></div>
      <div data-cash><div class="f"><label>Cash received (${cur})</label><input type="number" min="0" step="any" data-recv placeholder="Exact amount"></div><div class="sumrow"><span>Change</span><b data-chg>0</b></div></div>
      <div class="actions"><button class="btn ghost" data-close>${esc(t('close'))}</button><button class="btn green" data-ok>${ic('check')} ${esc(t('confirm'))}</button></div>`);
    const q = s => $(s, m.el); let c;
    const upd = () => {
      tmp.discount = num(q('[data-disc]').value); c = DB.calc(tmp, its);
      q('[data-sub]').textContent = `${money(c.subtotal)} ${CFG.CURRENCY}`; q('[data-tax]').textContent = money(c.tax); q('[data-taxrow]').hidden = !num(CFG.TAX_PERCENT);
      q('[data-net]').textContent = `${money(c.total)} ${CFG.CURRENCY}`; q('[data-cash]').hidden = method !== 'Cash';
      const r = num(q('[data-recv]').value); q('[data-chg]').textContent = r ? money(r - c.total) : '0';
    };
    m.el.addEventListener('input', upd);
    m.el.addEventListener('click', e => {
      const p = e.target.closest('[data-pay]');
      if (p) { method = p.dataset.pay; $$('.pay', m.el).forEach(x => x.classList.toggle('on', x === p)); upd(); }
      if (!e.target.closest('[data-ok]')) return;
      const recv = method === 'Cash' ? num(q('[data-recv]').value) : 0;
      if (recv && recv < c.total) { toast('Cash received is less than the total', 'bad'); return; }
      const sh = openShift();
      Object.assign(bill, { status: 'closed', closedAt: new Date().toISOString(), discount: c.discount, payMethod: method, received: recv || '', memberId: q('[data-mem]').value, shiftId: sh ? sh.id : bill.shiftId, cashier: U.username });
      DB.setItems(bill, its);
      its.forEach(i => { const p = DB.get('Products', i.pid); if (p && tracked(p)) { p.stock = num(p.stock) - num(i.qty); DB.save('Products', p); } });
      const mem = DB.get('Members', bill.memberId), pts = Math.floor(c.total / (num(CFG.POINTS_PER) || 100));
      if (mem && pts) addPoints(mem, pts, 'earn', `Bill #${bill.id}`, bill.id);
      DB.log('Check out', `${bill.tableName} ${money(c.total)} ${CFG.CURRENCY} (${method})`);
      m.close(); render();
      const d = modal(`<div class="center"><div style="width:74px;height:74px;border-radius:50%;background:#dcfce7;color:#16a34a;display:grid;place-items:center;margin:0 auto 14px;font-size:34px;animation:pop .5s">${ic('check')}</div>
        <h3>Payment complete</h3><p style="color:var(--muted)">${esc(bill.tableName)} · ${money(c.total)} ${cur}${recv ? ` · Change ${money(recv - c.total)} ${cur}` : ''}</p></div>
        <div class="actions center"><button class="btn" data-p>${ic('printer')} Print receipt</button><button class="btn gray" data-close>${esc(t('close'))}</button></div>`);
      $('[data-p]', d.el).onclick = () => printBill(bill);
    });
    upd();
  }

  function queueModal() {
    const m = modal(`<h3>${esc(t('callQueue'))}</h3><form class="pickbar"><input class="input" name="name" placeholder="Customer name" required maxlength="60" style="flex:2;min-width:130px"><input class="input" name="people" type="number" min="1" value="2" aria-label="People" style="flex:1;min-width:70px"><button class="btn green">${ic('plus')} Add</button></form><div data-list></div>
      <div class="actions"><button class="btn gray" data-close>${esc(t('close'))}</button></div>`);
    const draw = () => {
      const qs = DB.list('Queue').filter(x => x.status !== 'done');
      $('[data-list]', m.el).innerHTML = qs.map(x => `<div class="billrow" style="cursor:default"><span class="tag ${x.status === 'called' ? 'g' : 'a'}">${esc(x.number)}</span><span class="grow"><b>${esc(x.name)}</b><small>${esc(x.people)} people · ${fmtT(x.createdAt)}</small></span>
        <button class="btn sm" data-call="${esc(x.id)}">${ic('megaphone')} Call</button><button class="btn sm green" data-done="${esc(x.id)}">${ic('check')}</button></div>`).join('') || empty('users'); icons();
    };
    $('form', m.el).addEventListener('submit', e => {
      e.preventDefault(); const o = Object.fromEntries(new FormData(e.target)), today = new Date().toDateString();
      const n = DB.list('Queue').filter(x => new Date(x.createdAt).toDateString() === today).length + 1;
      const row = DB.save('Queue', { number: 'A' + String(n).padStart(3, '0'), name: o.name, people: o.people, status: 'waiting', createdAt: new Date().toISOString() }); e.target.reset(); draw();
      if (SET.queueCard) printQueueCard(row);
    });
    m.el.addEventListener('click', e => {
      const c = e.target.closest('[data-call]'), d = e.target.closest('[data-done]');
      if (c) { const x = DB.get('Queue', c.dataset.call); x.status = 'called'; DB.save('Queue', x); toast(`Calling ${x.number} — ${x.name}`);
        try { speechSynthesis.speak(new SpeechSynthesisUtterance(`Queue number ${x.number.split('').join(' ')}`)); } catch (err) {} draw(); }
      if (d) { const x = DB.get('Queue', d.dataset.done); x.status = 'done'; DB.save('Queue', x); draw(); }
    });
    draw();
  }
  function reserveModal() {
    const m = modal(`<h3>${esc(t('reserve'))}</h3><form><div class="f"><label>Name</label><input name="name" required maxlength="60"></div><div class="f"><label>Phone</label><input name="phone" inputmode="tel" maxlength="20"></div>
      <div class="pickbar" style="margin:0"><div class="f" style="flex:1;min-width:120px"><label>${esc(t('table'))}</label><select name="tableId">${bySort(DB.list('Tables')).map(x => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select></div>
      <div class="f" style="flex:2;min-width:170px"><label>Time</label><input name="time" type="datetime-local" required></div><div class="f" style="width:80px"><label>${esc(t('seats'))}</label><input name="people" type="number" min="1" value="2"></div></div>
      <div class="actions"><button class="btn">${ic('plus')} ${esc(t('reserve'))}</button></div></form><div data-list style="margin-top:14px"></div><div class="actions"><button class="btn gray" data-close>${esc(t('close'))}</button></div>`);
    const draw = () => {
      const rs = DB.list('Reservations').sort((a, b) => String(a.time).localeCompare(String(b.time)));
      $('[data-list]', m.el).innerHTML = rs.map(x => `<div class="billrow" style="cursor:default"><span class="tag b">${esc((DB.get('Tables', x.tableId) || {}).name || '-')}</span><span class="grow"><b>${esc(x.name)}</b><small>${fmtDT(x.time)} · ${esc(x.people)} people · ${esc(x.phone)}</small></span>
        <button class="icb del" data-rm="${esc(x.id)}" aria-label="Delete">${ic('trash-2')}</button></div>`).join(''); icons();
    };
    $('form', m.el).addEventListener('submit', e => { e.preventDefault(); const o = Object.fromEntries(new FormData(e.target)); DB.save('Reservations', { ...o, status: 'booked' }); DB.log('Reserve', `${o.name} ${o.time}`); e.target.reset(); toast('Reserved'); draw(); });
    m.el.addEventListener('click', e => { const r = e.target.closest('[data-rm]'); if (r) { DB.remove('Reservations', r.dataset.rm); draw(); } });
    draw();
  }

  /* ---------- POS 3D ---------- */
  V.pos3d = root => {
    const zones = bySort(DB.list('Zones'));
    if (!zones.some(z => z.id === S.zone)) S.zone = zones[0] ? zones[0].id : null;
    const tables = bySort(DB.list('Tables').filter(x => x.zoneId === S.zone)), cols = Math.max(1, Math.ceil(Math.sqrt(tables.length)));
    root.innerHTML = `<div class="head"><div class="chips">${zones.map(z => `<button class="chip ${z.id === S.zone ? 'on' : ''}" data-act="zone" data-id="${esc(z.id)}">${esc(z.name)}</button>`).join('')}</div><span class="sp"></span><span class="tag n">Drag to rotate</span></div>
      <div class="card stage"><div class="floor" style="grid-template-columns:repeat(${cols},max-content)">${tables.map((x, i) => { const b = DB.openBill(x.id);
        return `<div class="t3 ${b ? 'busy' : ''}" style="--i:${i}" data-t="${esc(x.id)}"><i class="sh"></i><i class="s1"></i><i class="s2"></i><i class="s3"></i><i class="s4"></i><div class="top">${b ? `<small data-since="${esc(b.openedAt)}">${elapsed(b.openedAt)}</small>` : ''}${esc(x.name)}</div></div>`; }).join('')}</div></div>`;
    const stage = $('.stage', root), floor = $('.floor', root); let rx = 56, rz = -32, drag = null, moved = 0;
    stage.onpointerdown = e => { drag = { x: e.clientX, y: e.clientY }; moved = 0; };
    stage.onpointermove = e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved += Math.abs(dx) + Math.abs(dy); drag = { x: e.clientX, y: e.clientY };
      rz += dx * .4; rx = Math.max(20, Math.min(75, rx - dy * .3)); floor.style.setProperty('--rx', rx + 'deg'); floor.style.setProperty('--rz', rz + 'deg'); };
    stage.onpointerup = stage.onpointercancel = e => { const el = e.target.closest('.t3'); if (drag && moved < 8 && el) { S.table = el.dataset.t; location.hash = '#/pos'; } drag = null; };
    acts = { zone: el => { S.zone = el.dataset.id; render(true); } };
  };

  /* ---------- Goods ---------- */
  // Shrinks a photo so it fits in one Google Sheets cell (50,000 characters).
  function shrinkImage(file) {
    return new Promise((ok, bad) => {
      const im = new Image(), url = URL.createObjectURL(file);
      im.onerror = () => { URL.revokeObjectURL(url); bad(new Error('image')); };
      im.onload = () => {
        URL.revokeObjectURL(url);
        let out = '';
        for (const side of [480, 400, 320, 260, 200, 150]) {
          const k = Math.min(1, side / Math.max(im.width, im.height)), c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
          const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
          out = c.toDataURL('image/jpeg', .72);
          if (out.length < 45000) break;
        }
        if (out.length < 45000) ok(out); else bad(new Error('size'));
      };
      im.src = url;
    });
  }

  function productModal(src, tab = 'detail') {
    const cats = bySort(DB.list('Categories'));
    if (!cats.length) { toast('Add a group first', 'bad'); return; }
    const isNew = !src, p = src || { categoryId: S.cat === 'all' ? cats[0].id : S.cat, active: 'true', stock: '' };
    const cur = esc(CFG.CURRENCY), v = k => esc(p[k] == null ? '' : p[k]), L1 = esc(String(CFG.DEFAULT_LANG || 'th').toUpperCase());
    let image = p.image || '';
    const names = DB.names(p), OTHER = I18N.LANGS.map(l => l.code).filter(c => c.toUpperCase() !== L1);
    const exRow = (x = {}) => `<div class="exr" data-ex><input class="input" data-exn maxlength="60" placeholder="Option name, e.g. Extra rice" value="${esc(x.name || '')}">
      <div class="ig"><span>+</span><input data-exp type="number" min="0" step="any" inputmode="decimal" placeholder="0" value="${esc(x.price == null ? '' : x.price)}"><span>${cur}</span></div>
      <button type="button" class="icb del" data-exdel aria-label="Remove option">${ic('trash-2')}</button></div>`;
    const TABS = [['detail', 'info', t('detail')], ['stock', 'boxes', t('inventory')], ['extra', 'list', 'Extra']];
    const m = modal(`<form class="pm-form" novalidate>
      <header class="pm-head"><span class="pm-ic">${ic('utensils')}</span><div class="pm-ttl"><small>${isNew ? 'New item' : esc(t('detail'))}</small><h3 data-ttl>${esc(p.name || 'New item')}</h3></div>
        <button type="button" class="pm-x" data-close aria-label="${esc(t('close'))}">${ic('x')}</button></header>
      <nav class="pm-tabs">${TABS.map(x => `<button type="button" data-tab="${x[0]}">${ic(x[1])}<span>${esc(x[2])}</span></button>`).join('')}</nav>
      <div class="pm-body">
        <section data-pane="detail">
          <div class="fr"><label>Picture</label><div class="pic"><span class="thumb lg" data-prev></span><div class="pic-f">
            <input class="input" data-img inputmode="url" placeholder="https://… image link" value="${esc(/^data:/.test(image) ? '' : image)}">
            <div class="pic-b"><label class="btn sm ghost">${ic('upload')} Upload photo<input type="file" accept="image/*" data-file hidden></label><button type="button" class="btn sm ghost" data-noimg>${ic('image-off')} Remove</button></div>
            <small class="hint">Paste an image link or upload a photo. Uploads are resized automatically.</small></div></div></div>
          <div class="fr"><label for="pmCode">Code</label><div class="two"><input class="input" id="pmCode" name="code" maxlength="30" placeholder="e.g. A01" value="${v('code')}">
            <select class="input" name="categoryId" aria-label="Group">${cats.map(c => `<option value="${esc(c.id)}" ${c.id === p.categoryId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div></div>
          <div class="fr"><label for="pmName">Name</label><div class="stack"><div class="ig"><span>${L1}</span><input id="pmName" name="name" maxlength="120" placeholder="Name shown on the bill" value="${v('name')}"></div>
            ${OTHER.map(c => `<div class="ig"><span>${c.toUpperCase()}</span><input data-nm="${c}" maxlength="120" value="${esc(names[c] || '')}"></div>`).join('')}
            <small class="hint">The other languages are optional. An empty one shows the main name.</small></div></div>
          <div class="fr"><label>Explanation</label><div class="dbox2"><div class="dtabs"><button type="button" data-dl="desc" class="on">${L1}</button><button type="button" data-dl="descEn">English</button></div>
            <textarea name="desc" maxlength="500" rows="3" placeholder="Short description of the dish">${v('desc')}</textarea><textarea name="descEn" maxlength="500" rows="3" placeholder="Description in English" hidden>${v('descEn')}</textarea></div></div>
          <div class="fr"><label for="pmPrice">${esc(t('price'))}</label><div class="stack">
            <label class="ck"><input type="checkbox" name="buffet" ${flag(p.buffet) ? 'checked' : ''}><span>Buffet</span></label>
            <div class="ig"><input id="pmPrice" name="price" type="number" min="0" step="any" inputmode="decimal" placeholder="0" value="${v('price')}"><span>${cur}</span></div>
            <label class="ck"><input type="checkbox" name="byWeight" ${flag(p.byWeight) ? 'checked' : ''}><span>Price by weight (per kg)</span></label></div></div>
          <div class="fr"><label>${esc(t('status'))}</label><label class="sw"><input type="checkbox" name="active" ${active(p) ? 'checked' : ''}><i></i><span>On sale — shown in POS and the QR menu</span></label></div>
        </section>
        <section data-pane="stock" hidden>
          <div class="fr"><label>Track stock</label><label class="sw"><input type="checkbox" name="track" ${tracked(p) ? 'checked' : ''}><i></i><span>Count this item down when it is sold</span></label></div>
          <div class="fr"><label for="pmStock">In stock</label><div class="stack"><div class="step"><button type="button" data-st="-1" aria-label="Less">${ic('minus')}</button>
            <input id="pmStock" name="stock" type="number" step="any" inputmode="decimal" value="${tracked(p) ? num(p.stock) : 0}"><button type="button" data-st="1" aria-label="More">${ic('plus')}</button></div>
            <small class="hint">Stock goes down at checkout. Items with 5 or fewer left appear in the bell as low stock.</small></div></div>
        </section>
        <section data-pane="extra" hidden>
          <p class="hint" style="margin:0 0 14px">Options staff can add to this dish in POS, such as extra rice or toppings. The option price is added to the dish price.</p>
          <div data-exlist>${DB.extras(p).map(exRow).join('')}</div>
          <div class="empty" data-exempty hidden>${ic('list-plus')}<div>No options yet</div></div>
          <button type="button" class="btn ghost" data-exadd style="margin-top:12px">${ic('plus')} Add option</button>
        </section>
      </div>
      <footer class="pm-foot">${isNew ? '' : `<button type="button" class="btn ghost danger" data-del>${ic('trash-2')}<span>${esc(t('delete'))}</span></button>`}<span class="sp"></span>
        <button type="button" class="btn ghost" data-close>${ic('x')} ${esc(t('close'))}</button><button class="btn">${ic('save')} ${esc(t('save'))}</button></footer>
    </form>`, 'pm');
    const el = m.el, f = $('form', el), fld = n => $(`[name=${n}]`, f), exList = $('[data-exlist]', el);
    const show = id => { $$('[data-tab]', el).forEach(b => b.classList.toggle('on', b.dataset.tab === id)); $$('[data-pane]', el).forEach(s => { s.hidden = s.dataset.pane !== id; }); };
    const preview = () => { $('[data-prev]', el).innerHTML = thumbIn(image || (isNew ? '' : DB.img({ ...p, image: '' })), 'image'); icons(); };
    const exEmpty = () => { $('[data-exempty]', el).hidden = !!exList.children.length; };
    const stockUi = () => { const on = fld('track').checked; fld('stock').disabled = !on; $$('[data-st]', el).forEach(b => { b.disabled = !on; }); };
    show(tab); preview(); exEmpty(); stockUi();

    el.addEventListener('click', e => {
      const tb = e.target.closest('[data-tab]'), dl = e.target.closest('[data-dl]'), st = e.target.closest('[data-st]'), xd = e.target.closest('[data-exdel]');
      if (tb) show(tb.dataset.tab);
      else if (dl) { $$('[data-dl]', el).forEach(b => b.classList.toggle('on', b === dl)); fld('desc').hidden = dl.dataset.dl !== 'desc'; fld('descEn').hidden = dl.dataset.dl !== 'descEn'; }
      else if (st) { fld('stock').value = Math.max(0, r3(num(fld('stock').value) + num(st.dataset.st))); }
      else if (xd) { xd.closest('[data-ex]').remove(); exEmpty(); }
      else if (e.target.closest('[data-exadd]')) { exList.insertAdjacentHTML('beforeend', exRow()); icons(); exEmpty(); exList.lastElementChild.querySelector('input').focus(); }
      else if (e.target.closest('[data-noimg]')) { image = ''; $('[data-img]', el).value = ''; preview(); }
      else if (e.target.closest('[data-del]')) confirmBox(`${t('delete')} ${p.name}?`, () => { DB.remove('Products', p.id); DB.log('Delete product', p.name); m.close(); toast('Deleted'); render(); });
    });
    $('[data-img]', el).addEventListener('input', e => { image = e.target.value.trim(); preview(); });
    $('[data-file]', el).addEventListener('change', async e => {
      const file = e.target.files[0]; e.target.value = ''; if (!file) return;
      try { image = await shrinkImage(file); $('[data-img]', el).value = ''; $('[data-img]', el).placeholder = 'Uploaded photo'; preview(); }
      catch (err) { toast('Could not use that photo. Try another one.', 'bad'); }
    });
    fld('name').addEventListener('input', e => { $('[data-ttl]', el).textContent = e.target.value.trim() || 'New item'; });
    fld('track').addEventListener('change', stockUi);

    f.addEventListener('submit', e => {
      e.preventDefault();
      const name = fld('name').value.trim();
      if (!name) { show('detail'); fld('name').focus(); toast('Enter a name', 'bad'); return; }
      if (fld('price').value.trim() === '' || num(fld('price').value) < 0) { show('detail'); fld('price').focus(); toast('Enter a price', 'bad'); return; }
      const extras = $$('[data-ex]', el).map(r => ({ name: $('[data-exn]', r).value.trim(), price: Math.max(0, num($('[data-exp]', r).value)) })).filter(x => x.name);
      const nm = {}; $$('[data-nm]', el).forEach(i => { if (i.value.trim()) nm[i.dataset.nm] = i.value.trim(); });
      const stock = fld('track').checked ? num(fld('stock').value) : '', was = isNew || !tracked(p) ? '' : num(p.stock);
      const row = Object.assign(src || {}, { categoryId: fld('categoryId').value, name, price: num(fld('price').value), stock, active: String(fld('active').checked),
        code: fld('code').value.trim(), nameEn: nm.en || '', names: JSON.stringify(nm), image, desc: fld('desc').value.trim(), descEn: fld('descEn').value.trim(),
        buffet: String(fld('buffet').checked), byWeight: String(fld('byWeight').checked), extras: JSON.stringify(extras) });
      DB.save('Products', row);
      if (isNew) DB.log('Add product', name); else if (stock !== was) DB.log('Stock adjust', `${name} ${was === '' ? 'not tracked' : was} → ${stock === '' ? 'not tracked' : stock}`);
      m.close(); toast('Saved'); render();
    });
  }

  V.goods = root => {
    const cats = bySort(DB.list('Categories')), all = DB.list('Products'), q = S.q.trim().toLowerCase(), cur = esc(CFG.CURRENCY);
    if (S.cat !== 'all' && !cats.some(c => c.id === S.cat)) S.cat = 'all';
    const catName = id => (DB.get('Categories', id) || {}).name || '';
    const tabs = `<div class="gtabs">${[['food', 'utensils', 'Food', all.length], ['group', 'layers', 'Group', cats.length]].map(x =>
      `<button class="${S.gtab === x[0] ? 'on' : ''}" data-act="gtab" data-id="${x[0]}">${ic(x[1])}<span>${x[2]}</span><em>${x[3]}</em></button>`).join('')}</div>`;
    const catForm = (title, vals, onOk) => formModal(title, [{ k: 'name', label: 'Group name', req: 1 }], vals, onOk);
    const common = {
      gtab: el => { S.gtab = el.dataset.id; S.q = ''; render(true); },
      addCat: () => catForm('New group', {}, o => { DB.save('Categories', { name: o.name.trim(), sort: cats.length + 1 }); toast('Saved'); render(); }),
      editCat: el => { const c = DB.get('Categories', el.dataset.id); catForm('Edit group', c, o => { c.name = o.name.trim(); DB.save('Categories', c); toast('Saved'); render(); }); },
      delCat: el => { const c = DB.get('Categories', el.dataset.id);
        if (all.some(p => p.categoryId === c.id)) { toast('Move or delete the items in this group first', 'bad'); return; }
        confirmBox(`${t('delete')} ${c.name}?`, () => { DB.remove('Categories', c.id); render(); }); }
    };

    if (S.gtab === 'group') {
      const list = cats.filter(c => c.name.toLowerCase().includes(q));
      root.innerHTML = `${tabs}<div class="card gcard">
        <div class="gbar"><label class="gsearch">${ic('search')}<input class="input" data-q placeholder="${esc(t('search'))}" value="${esc(S.q)}"></label><span class="sp"></span><button class="btn green" data-act="addCat">${ic('plus')} ${esc(t('add'))}</button></div>
        ${list.length ? `<div class="tw"><table class="t"><thead><tr><th>Group</th><th class="r">${esc(t('items'))}</th><th class="r">Edit</th></tr></thead><tbody>${list.map(c => `<tr><td><b>${esc(c.name)}</b></td>
          <td class="r"><span class="tag b">${all.filter(p => p.categoryId === c.id).length}</span></td>
          <td class="r" style="white-space:nowrap"><button class="btn sm amber" data-act="editCat" data-id="${esc(c.id)}">${ic('square-pen')} Edit</button> <button class="icb del" data-act="delCat" data-id="${esc(c.id)}" aria-label="${esc(t('delete'))}">${ic('trash-2')}</button></td></tr>`).join('')}</tbody></table></div>` : empty('layers')}</div>`;
      acts = common; return;
    }

    const list = all.filter(p => (S.cat === 'all' || p.categoryId === S.cat) && (S.gst === 'all' || (S.gst === 'on') === active(p)) && pText(p).includes(q));
    const opt = (val, label, sel) => `<option value="${esc(val)}" ${val === sel ? 'selected' : ''}>${esc(label)}</option>`;
    root.innerHTML = `${tabs}<div class="card gcard">
      <div class="gbar"><label class="gsearch">${ic('search')}<input class="input" data-q placeholder="${esc(t('search'))}" value="${esc(S.q)}"></label>
        <select class="input" data-chg="gst" aria-label="${esc(t('status'))}">${opt('all', 'All status', S.gst)}${opt('on', 'On sale', S.gst)}${opt('off', 'Hidden', S.gst)}</select>
        <select class="input" data-chg="cat" aria-label="Group">${opt('all', 'All group', S.cat)}${cats.map(c => opt(c.id, c.name, S.cat)).join('')}</select>
        <span class="sp"></span><button class="btn green" data-act="addP">${ic('plus')} ${esc(t('add'))}</button></div>
      <div class="glist">
        <div class="gr ghead"><span>Picture</span><span>Code</span><span>Name</span><span class="r">${esc(t('price'))}</span><span class="r">Edit</span></div>
        ${list.map(p => { const low = tracked(p) && num(p.stock) <= 5, nx = DB.extras(p).length, id = esc(p.id); return `<div class="gr ${active(p) ? '' : 'off'}">
          <button class="gc-img" data-act="extra" data-id="${id}" aria-label="${esc(p.name)}">${thumb(p)}</button>
          <div class="gc-code">${p.code ? `<span class="code">${esc(p.code)}</span>` : '<span class="mut">—</span>'}</div>
          <div class="gc-name"><b>${esc(pn(p))}</b>${pn(p) !== p.name ? `<small>${esc(p.name)}</small>` : ''}
            <span class="gmeta">${p.code ? `<span class="code only-s">${esc(p.code)}</span>` : ''}${catName(p.categoryId) ? `<span class="tag n">${esc(catName(p.categoryId))}</span>` : ''}${flag(p.buffet) ? '<span class="tag a">Buffet</span>' : ''}${nx ? `<span class="tag b">${nx} extra</span>` : ''}
              ${tracked(p) ? `<span class="tag ${low ? 'r' : 'g'}">Stock ${num(p.stock)}</span>` : ''}${active(p) ? '' : '<span class="tag n">Hidden</span>'}</span></div>
          <div class="gc-price"><b>${money(p.price)}</b><small>${cur}${flag(p.byWeight) ? ' /kg' : ''}</small></div>
          <div class="gc-act"><button class="btn sm" data-act="extra" data-id="${id}">${ic('info')} Extra</button><button class="btn sm amber" data-act="editP" data-id="${id}">${ic('square-pen')} Edit</button>
            <div class="dd"><button class="btn sm ghost sq" data-dd aria-label="More">${ic('chevron-down')}</button><div class="menu">
              <button data-act="stockP" data-id="${id}">${ic('boxes')} ${esc(t('inventory'))}</button><button data-act="toggleP" data-id="${id}">${ic(active(p) ? 'eye-off' : 'eye')} ${active(p) ? 'Hide from sale' : 'Put on sale'}</button>
              <button data-act="copyP" data-id="${id}">${ic('copy')} Duplicate</button><button class="danger" data-act="delP" data-id="${id}">${ic('trash-2')} ${esc(t('delete'))}</button></div></div></div>
        </div>`; }).join('') || empty('package')}
      </div>
      <div class="gfoot">${list.length} / ${all.length} ${esc(t('itemsUnit'))}</div></div>`;
    const get = el => DB.get('Products', el.dataset.id);
    acts = Object.assign(common, {
      gst: el => { S.gst = el.value; render(); }, cat: el => { S.cat = el.value; render(); },
      addP: () => productModal(null),
      editP: el => productModal(get(el), 'detail'), extra: el => productModal(get(el), 'extra'), stockP: el => productModal(get(el), 'stock'),
      toggleP: el => { const p = get(el); p.active = String(!active(p)); DB.save('Products', p); toast(active(p) ? 'On sale' : 'Hidden from sale'); render(); },
      copyP: el => { const p = get(el); DB.save('Products', { ...p, id: '', name: p.name + ' (copy)', code: '' }); DB.log('Add product', p.name + ' (copy)'); toast('Duplicated'); render(); },
      delP: el => { const p = get(el); confirmBox(`${t('delete')} ${p.name}?`, () => { DB.remove('Products', p.id); DB.log('Delete product', p.name); render(); }); }
    });
  };

  /* ---------- Tables and zones ---------- */
  V.tables = root => {
    const zones = bySort(DB.list('Zones'));
    if (!zones.some(z => z.id === S.zone)) S.zone = zones[0] ? zones[0].id : null;
    const tables = bySort(DB.list('Tables').filter(x => x.zoneId === S.zone));
    const tf = () => [{ k: 'name', label: 'Table name', req: 1 }, { k: 'seats', label: t('seats'), type: 'number' }, { k: 'zoneId', label: 'Zone', options: zones.map(z => [z.id, z.name]) }];
    root.innerHTML = `<div class="head"><div class="chips">${zones.map(z => `<button class="chip ${z.id === S.zone ? 'on' : ''}" data-act="zone" data-id="${esc(z.id)}">${esc(z.name)}</button>`).join('')}
        ${S.zone ? `<button class="icb" data-act="editZ" aria-label="Edit zone">${ic('pencil')}</button>` : ''}</div><span class="sp"></span>
        <button class="btn ghost" data-act="addZ">${ic('plus')} Zone</button><button class="btn" data-act="addT" ${S.zone ? '' : 'disabled'}>${ic('plus')} ${esc(t('table'))}</button></div>
      ${tables.length ? `<div class="grid-t" style="max-height:none;padding:14px">${tables.map((x, i) => `<button class="tile ${DB.openBill(x.id) ? 'busy' : ''}" style="--i:${i}" data-act="editT" data-id="${esc(x.id)}">${esc(x.name)}<small>${num(x.seats) || '-'} ${esc(t('seats'))}</small></button>`).join('')}</div>` : `<div class="card">${empty('layout-grid')}</div>`}`;
    acts = {
      zone: el => { S.zone = el.dataset.id; render(true); },
      addZ: () => formModal('New zone', [{ k: 'name', label: 'Zone name', req: 1 }], {}, o => { S.zone = DB.save('Zones', { name: o.name.trim(), sort: zones.length + 1 }).id; render(true); }),
      editZ: () => { const z = DB.get('Zones', S.zone); formModal('Edit zone', [{ k: 'name', label: 'Zone name', req: 1 }], z, o => { z.name = o.name.trim(); DB.save('Zones', z); render(); },
        () => { if (tables.length) { toast('Delete the tables in this zone first', 'bad'); return false; } DB.remove('Zones', z.id); S.zone = null; render(true); }); },
      addT: () => formModal('New table', tf(), { zoneId: S.zone, seats: 4 }, o => { DB.save('Tables', { ...o, name: o.name.trim(), sort: DB.list('Tables').length + 1 }); render(); }),
      editT: el => { const x = DB.get('Tables', el.dataset.id); formModal('Edit table', tf(), x, o => { Object.assign(x, o, { name: o.name.trim() }); DB.save('Tables', x); render(); },
        () => { if (DB.openBill(x.id)) { toast('This table has an open bill', 'bad'); return false; } DB.remove('Tables', x.id); render(); }); }
    };
  };

  /* ---------- Inventory ---------- */
  V.inventory = root => {
    const q = S.q.toLowerCase(), list = DB.list('Products').filter(p => p.name.toLowerCase().includes(q)), catName = id => (DB.get('Categories', id) || {}).name || '-';
    root.innerHTML = `<div class="head"><input class="input" data-q style="max-width:240px" placeholder="${esc(t('search'))}" value="${esc(S.q)}"><span class="sp"></span><span class="tag r">${list.filter(p => tracked(p) && num(p.stock) <= 5).length} low stock</span></div>
      <div class="card tw">${list.length ? `<table class="t"><thead><tr><th>Product</th><th class="hide-s">Category</th><th class="r">${esc(t('price'))}</th><th class="r">Stock</th><th>${esc(t('status'))}</th><th></th></tr></thead><tbody>
      ${list.map(p => { const low = tracked(p) && num(p.stock) <= 5; return `<tr><td><b>${esc(pn(p))}</b></td><td class="hide-s">${esc(catName(p.categoryId))}</td><td class="r">${money(p.price)}</td><td class="r"><b>${tracked(p) ? num(p.stock) : '—'}</b></td>
        <td><span class="tag ${!tracked(p) ? 'n' : low ? 'r' : 'g'}">${!tracked(p) ? 'Not tracked' : low ? 'Low' : 'OK'}</span></td><td class="r"><button class="btn sm ghost" data-act="adj" data-id="${esc(p.id)}">${ic('plus')} Adjust</button></td></tr>`; }).join('')}</tbody></table>` : empty('boxes')}</div>`;
    acts = { adj: el => { const p = DB.get('Products', el.dataset.id); formModal(`Stock — ${p.name} (now ${tracked(p) ? num(p.stock) : 'not tracked'})`, [{ k: 'd', label: 'Add quantity (use a negative number to remove)', type: 'number', req: 1, neg: 1 }, { k: 'note', label: 'Note' }], {},
      o => { p.stock = num(p.stock) + num(o.d); DB.save('Products', p); DB.log('Stock adjust', `${p.name} ${num(o.d) >= 0 ? '+' : ''}${num(o.d)} → ${p.stock}${o.note ? ' (' + o.note + ')' : ''}`); toast('Stock updated'); render(); }); } };
  };

  /* ---------- Members ---------- */
  const today = () => dayOf(new Date());
  function dayOf(v) { const d = new Date(v); return isNaN(d) ? '' : `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; }
  const KIND = { earn: ['Earned', 'g'], redeem: ['Used', 'r'], adjust: ['Adjusted', 'a'] };
  const accPts = m => Math.max(num(m.totalPoints), num(m.points));
  // Every change to a member's points goes through here, so it is also written to the Points history.
  function addPoints(m, d, kind, note, billId) {
    if (!d) return;
    const acc = accPts(m);
    m.points = num(m.points) + d; m.totalPoints = acc + Math.max(0, d); // accumulated points only ever go up
    DB.save('Members', m);
    DB.save('Points', { memberId: m.id, time: new Date().toISOString(), points: d, kind, billId: billId || '', note: note || '', user: U.username });
  }
  function downloadCsv(name, rows) {
    const text = rows.map(r => r.map(c => `"${String(c == null ? '' : c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }));
    a.download = `${name}-${today()}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  V.member = root => {
    S.mtab = S.mtab || 'member'; S.mtype = S.mtype || 'all'; S.d1 = S.d1 || today(); S.d2 = S.d2 || today(); S.rmode = S.rmode || 'member';
    const members = DB.list('Members'), types = DB.list('MemberTypes'), q = S.q.trim().toLowerCase();
    const typeName = id => (DB.get('MemberTypes', id) || {}).name || '';
    const mName = id => (DB.get('Members', id) || {}).name || '—';
    const mText = m => [m.name, m.phone, m.code, m.username].join(' ').toLowerCase();
    if (S.mtype !== 'all' && !types.some(x => x.id === S.mtype)) S.mtype = 'all';
    const TABS = [['member', 'users', 'Member'], ['type', 'id-card', 'Member Type'], ['rewards', 'gift', 'Rewards History'], ['report', 'chart-line', 'Member Report']];
    const tabs = `<div class="gtabs">${TABS.map(x => `<button class="${S.mtab === x[0] ? 'on' : ''}" data-act="mtab" data-id="${x[0]}">${ic(x[1])}<span>${x[2]}</span></button>`).join('')}</div>`;
    const search = ph => `<label class="gsearch">${ic('search')}<input class="input" data-q placeholder="${esc(ph || t('search'))}" value="${esc(S.q)}"></label>`;
    const dates = `<b class="mut">Date</b><input type="date" class="input dt" data-chg="d1" value="${esc(S.d1)}" aria-label="From"><span class="mut">–</span><input type="date" class="input dt" data-chg="d2" value="${esc(S.d2)}" aria-label="To">
      <button class="btn green" data-act="go">${ic('search')} Search</button>`;
    const inRange = iso => { const d = dayOf(iso); return d >= S.d1 && d <= S.d2; };
    const ledger = DB.list('Points').filter(x => inRange(x.time)).sort((a, b) => String(b.time).localeCompare(String(a.time)));

    // Saves a member. The login is optional; the password is stored only as a hash made from username + password.
    const saveMember = (m, o) => {
      const username = (o.username || '').trim(), pw = o.password || '', had = m.username || '', isNew = !m.id, code = (o.code || '').trim();
      if (!o.name.trim()) { toast('Enter a name', 'bad'); return false; }
      if (!o.phone.trim()) { toast('Enter a phone number', 'bad'); return false; }
      if (code && members.some(x => x !== m && String(x.code || '').toLowerCase() === code.toLowerCase())) { toast('That member ID is already used', 'bad'); return false; }
      if (!o.typeId || !DB.get('MemberTypes', o.typeId)) { toast('Choose a member type', 'bad'); return false; }
      if (!username) { toast('Enter a username for this member', 'bad'); return false; }
      if (username) {
        if (!/^[\w.-]{3,30}$/.test(username)) { toast('Use a-z, 0-9, dot or dash, 3–30 characters', 'bad'); return false; }
        if (members.some(x => x !== m && String(x.username || '').toLowerCase() === username.toLowerCase())) { toast('That username is already taken', 'bad'); return false; }
        if (!pw && (username.toLowerCase() !== had.toLowerCase() || !m.passwordHash)) { toast('Enter a password for this member', 'bad'); return false; }
        if (pw && pw.length < 6) { toast('Use at least 6 characters', 'bad'); return false; }
      } else if (pw) { toast('Enter a username for this member', 'bad'); return false; }
      const diff = num(o.points) - num(m.points);
      Object.assign(m, { name: o.name.trim(), phone: o.phone.trim(), code, typeId: o.typeId || '', birthday: o.birthday || '', username,
        email: (o.email || '').trim(), lineUid: (o.lineUid || '').trim(), note: (o.note || '').trim() });
      if (isNew) Object.assign(m, { points: 0, totalPoints: 0, createdAt: new Date().toISOString() });
      if (!username) m.passwordHash = '';
      const done = () => {
        DB.save('Members', m);
        if (!m.code) { m.code = 'M' + String(m.id).padStart(5, '0'); DB.save('Members', m); }
        addPoints(m, diff, 'adjust', isNew ? 'Opening points' : 'Edited by staff');
        toast('Saved'); render();
      };
      if (username && pw) DB.hash(username, pw).then(h => { m.passwordHash = h; done(); }); else done();
    };
    // Member popup. Required: name, phone, member type, username, password (the password only when it has to be set).
    const memberModal = (m, vals) => {
      const isNew = !m.id, v = k => esc(vals[k] == null ? '' : vals[k]), star = ' <span class="reqd">*</span>';
      const fi = (k, label, attrs = '', req) => `<div class="f"><label for="mm_${k}">${label}${req ? star : ''}</label><input id="mm_${k}" name="${k}" value="${v(k)}" ${attrs}></div>`;
      const d = modal(`<form class="pm-form" novalidate>
        <header class="pm-head"><span class="pm-ic">${ic(isNew ? 'user-plus' : 'user-pen')}</span><div class="pm-ttl"><small>${isNew ? 'New member' : 'Edit member'}</small><h3>${esc(t('member'))}</h3></div>
          <button type="button" class="pm-x" data-close aria-label="${esc(t('close'))}">${ic('x')}</button></header>
        <div class="pm-body mm">
          <div class="mcard"><div class="mgrid">
            ${fi('code', 'Member ID', 'maxlength="30" placeholder="Leave empty to create one automatically"')}${fi('name', 'Name', 'maxlength="80" placeholder="Member name"', 1)}
            ${fi('phone', 'Telephone', 'maxlength="20" inputmode="tel" placeholder="0xxxxxxxxx"', 1)}${fi('email', 'E-mail', 'maxlength="120" type="email" placeholder="email@example.com"')}
            ${fi('lineUid', 'Line UID', 'maxlength="60"')}${fi('birthday', 'Birthday', 'type="date"')}
            <div class="f full"><label for="mm_typeId">Member Type${star}</label><select id="mm_typeId" name="typeId"><option value="">—</option>${types.map(x => `<option value="${esc(x.id)}" ${x.id === vals.typeId ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
            <div class="f full"><label for="mm_note">Note</label><textarea id="mm_note" name="note" rows="3" maxlength="300">${v('note')}</textarea></div>
          </div></div>
          <div class="mcard"><h4>${ic('key-round')} Member login</h4><div class="mgrid">
            ${fi('username', 'Username', 'maxlength="30" autocapitalize="none" autocomplete="off" placeholder="For member login"', 1)}
            ${fi('password', m.passwordHash ? 'New password' : 'Password', `type="password" autocomplete="new-password" placeholder="${m.passwordHash ? 'Leave empty to keep the current one' : 'At least 6 characters'}"`, !m.passwordHash)}
            ${fi('points', 'Points', 'type="number" min="0" step="any" inputmode="decimal"')}
          </div></div>
        </div>
        <footer class="pm-foot"><span class="sp"></span><button type="button" class="btn ghost" data-close>${ic('x')} ${esc(t('close'))}</button><button class="btn">${ic('save')} ${esc(t('save'))}</button></footer>
      </form>`, 'pm');
      const f = $('form', d.el);
      f.addEventListener('submit', e => { e.preventDefault(); if (saveMember(m, Object.fromEntries(new FormData(f))) !== false) d.close(); });
    };
    const viewMember = m => {
      const hist = DB.list('Points').filter(x => x.memberId === m.id).sort((a, b) => String(b.time).localeCompare(String(a.time))).slice(0, 30);
      const row = (l, v) => `<div class="sumrow"><span>${esc(l)}</span><b>${v}</b></div>`;
      const d = modal(`<h3>${esc(m.name)}</h3>${row('Member ID', esc(m.code || '—'))}${row('Phone', esc(m.phone || '—'))}${row('Member Type', esc(typeName(m.typeId) || '—'))}${row('E-mail', esc(m.email || '—'))}${row('Line UID', esc(m.lineUid || '—'))}${row('Birthday', esc(m.birthday || '—'))}
        ${row('Username', esc(m.username || '—'))}${row('Remaining points', `<span class="tag b">${money(m.points)}</span>`)}${row('Accumulated points', money(accPts(m)))}
        <h4 style="margin:16px 0 6px">Points history</h4><div class="tw" style="max-height:230px;overflow:auto">${hist.length ? `<table class="t"><tbody>${hist.map(x => `<tr><td style="white-space:nowrap">${fmtDT(x.time)}</td>
          <td><span class="tag ${(KIND[x.kind] || KIND.adjust)[1]}">${(KIND[x.kind] || KIND.adjust)[0]}</span> ${esc(x.note || '')}</td><td class="r"><b>${num(x.points) > 0 ? '+' : ''}${money(x.points)}</b></td></tr>`).join('')}</tbody></table>` : empty('gift')}</div>
        <div class="actions"><button class="btn amber" data-use ${num(m.points) > 0 ? '' : 'disabled'}>${ic('gift')} Use points</button><button class="btn gray" data-close>${esc(t('close'))}</button></div>`);
      $('[data-use]', d.el).onclick = () => formModal(`Use points — ${m.name} (${money(m.points)})`, [{ k: 'n', label: 'Points to use', type: 'number', req: 1 }, { k: 'note', label: 'Reward / note', req: 1 }], {}, o => {
        const n = Math.floor(num(o.n));
        if (n <= 0) return false;
        if (n > num(m.points)) { toast('Not enough points', 'bad'); return false; }
        addPoints(m, -n, 'redeem', o.note.trim()); DB.log('Use points', `${m.name} -${n} (${o.note.trim()})`); toast('Points used'); d.close(); render();
      });
    };
    const common = {
      mtab: el => { S.mtab = el.dataset.id; S.q = ''; render(true); },
      d1: el => { if (el.value) S.d1 = el.value; if (S.d2 < S.d1) S.d2 = S.d1; render(); }, d2: el => { if (el.value) S.d2 = el.value; if (S.d2 < S.d1) S.d1 = S.d2; render(); },
      go: () => render(), today: () => { S.d1 = S.d2 = today(); render(); }
    };

    if (S.mtab === 'type') {
      const list = types.filter(x => x.name.toLowerCase().includes(q)), tf = [{ k: 'name', label: 'Member type name', req: 1 }];
      root.innerHTML = `${tabs}<div class="card gcard"><div class="gbar">${search()}<span class="sp"></span><button class="btn green" data-act="addT">${ic('plus')} ${esc(t('add'))}</button></div>
        ${list.length ? `<div class="tw"><table class="t"><thead><tr><th>#</th><th>Member type name</th><th class="r">Number of members</th><th></th></tr></thead><tbody>${list.map(x => `<tr><td>${esc(x.id)}</td><td><b>${esc(x.name)}</b></td>
          <td class="r"><span class="tag n">${members.filter(m => m.typeId === x.id).length}</span></td>
          <td class="r" style="white-space:nowrap"><button class="btn sm amber" data-act="editT" data-id="${esc(x.id)}">${ic('square-pen')} Edit</button> <button class="btn sm red" data-act="delT" data-id="${esc(x.id)}">${ic('trash-2')} ${esc(t('delete'))}</button></td></tr>`).join('')}</tbody></table></div>` : empty('id-card')}</div>`;
      acts = Object.assign(common, {
        addT: () => formModal('New member type', tf, {}, o => { DB.save('MemberTypes', { name: o.name.trim() }); toast('Saved'); render(); }),
        editT: el => { const x = DB.get('MemberTypes', el.dataset.id); formModal('Edit member type', tf, x, o => { x.name = o.name.trim(); DB.save('MemberTypes', x); toast('Saved'); render(); }); },
        delT: el => { const x = DB.get('MemberTypes', el.dataset.id);
          if (members.some(m => m.typeId === x.id)) { toast('Move the members out of this type first', 'bad'); return; }
          confirmBox(`${t('delete')} ${x.name}?`, () => { DB.remove('MemberTypes', x.id); render(); }); }
      });
      return;
    }

    if (S.mtab === 'rewards') {
      const list = ledger.filter(x => x.kind === 'redeem' && (mName(x.memberId) + ' ' + x.note).toLowerCase().includes(q));
      root.innerHTML = `${tabs}<div class="card gcard"><div class="gbar">${dates}<span class="sp"></span><button class="btn" data-act="exp" ${list.length ? '' : 'disabled'}>${ic('file-spreadsheet')} Export</button></div>
        ${list.length ? `<div class="tw"><table class="t"><thead><tr><th>Time</th><th>Member</th><th>Reward</th><th class="r">Points</th><th class="hide-s">User</th></tr></thead><tbody>${list.map(x => `<tr><td style="white-space:nowrap">${fmtDT(x.time)}</td>
          <td><b>${esc(mName(x.memberId))}</b></td><td>${esc(x.note)}</td><td class="r"><span class="tag r">${money(x.points)}</span></td><td class="hide-s">${esc(x.user)}</td></tr>`).join('')}</tbody></table></div>` : empty('gift')}</div>`;
      acts = Object.assign(common, { exp: () => downloadCsv('rewards-history', [['Time', 'Member', 'Reward', 'Points', 'User']].concat(list.map(x => [fmtDT(x.time), mName(x.memberId), x.note, x.points, x.user]))) });
      return;
    }

    if (S.mtab === 'report') {
      const hit = id => { const m = DB.get('Members', id); return !q || (m && mText(m).includes(q)); };
      const tx = ledger.filter(x => hit(x.memberId)), plus = tx.filter(x => num(x.points) > 0), minus = tx.filter(x => num(x.points) < 0);
      const sum = a => a.reduce((s, x) => s + num(x.points), 0), uniq = a => new Set(a.map(x => x.memberId)).size;
      const days = new Set(); for (let d = new Date(S.d1 + 'T00:00:00'), k = 0; dayOf(d) <= S.d2 && k < 366; d.setDate(d.getDate() + 1), k++) days.add(dayOf(d).slice(5));
      const bdays = members.filter(m => m.birthday && days.has(String(m.birthday).slice(5)));
      const by = {}; tx.forEach(x => { const r = by[x.memberId] = by[x.memberId] || { id: x.memberId, add: 0, use: 0, n: 0 }; if (num(x.points) > 0) r.add += num(x.points); else r.use -= num(x.points); r.n++; });
      const rows = Object.values(by).sort((a, b) => b.add + b.use - a.add - a.use);
      const stat = (cls, icon, title, val, unit, sub) => `<div class="mstat ${cls}"><span class="ib">${ic(icon)}</span><span class="grow"><small>${title}</small><b>${val} <em>${unit}</em></b><i>${sub}</i></span></div>`;
      const table = S.rmode === 'member'
        ? (rows.length ? `<table class="t"><thead><tr><th>Member ID</th><th>Name</th><th class="r">Points Added</th><th class="r">Points Used</th><th class="r hide-s">transactions</th><th class="r">Remaining points</th></tr></thead><tbody>${rows.map(r => { const m = DB.get('Members', r.id) || {};
            return `<tr><td>${esc(m.code || '—')}</td><td><b>${esc(m.name || '—')}</b></td><td class="r"><span class="tag g">+${money(r.add)}</span></td><td class="r"><span class="tag r">-${money(r.use)}</span></td><td class="r hide-s">${r.n}</td><td class="r"><b>${money(m.points)}</b></td></tr>`; }).join('')}</tbody></table>` : empty('chart-line'))
        : (tx.length ? `<table class="t"><thead><tr><th>Time</th><th>Member</th><th>Type</th><th class="hide-s">Note</th><th class="r">Points</th></tr></thead><tbody>${tx.map(x => `<tr><td style="white-space:nowrap">${fmtDT(x.time)}</td><td><b>${esc(mName(x.memberId))}</b></td>
            <td><span class="tag ${(KIND[x.kind] || KIND.adjust)[1]}">${(KIND[x.kind] || KIND.adjust)[0]}</span></td><td class="hide-s">${esc(x.note)}</td><td class="r"><b>${num(x.points) > 0 ? '+' : ''}${money(x.points)}</b></td></tr>`).join('')}</tbody></table>` : empty('chart-line'));
      root.innerHTML = `${tabs}<div class="card gcard"><div class="gbar">${dates}<button class="btn-soft" data-act="today">${ic('calendar')} Today</button><span class="sp"></span><button class="btn" data-act="exp" ${tx.length ? '' : 'disabled'}>${ic('file-spreadsheet')} Export</button></div>
        <div class="mstats">${stat('g', 'circle-plus', 'Points Added', '+' + money(sum(plus)), 'Point', `${uniq(plus)} members · ${plus.length} transactions`)}${stat('r', 'circle-minus', 'Points Used', '-' + money(-sum(minus)), 'Point', `${uniq(minus)} members · ${minus.length} transactions`)}
          ${stat('p', 'cake', 'Member Birthdays', bdays.length, 'people', bdays.length ? esc(bdays.slice(0, 4).map(m => m.name).join(', ')) : 'Members with a birthday in the selected dates')}</div>
        <div class="gbar" style="border-top:1px solid var(--line)"><div class="seg"><button class="${S.rmode === 'member' ? 'on' : ''}" data-act="rmode" data-id="member">${ic('users')} By member</button><button class="${S.rmode === 'tx' ? 'on' : ''}" data-act="rmode" data-id="tx">${ic('list')} All transactions</button></div>
          <span class="sp"></span>${search('Filter by name / phone / member ID')}</div>
        <div class="tw">${table}</div></div>`;
      acts = Object.assign(common, {
        rmode: el => { S.rmode = el.dataset.id; render(); },
        exp: () => downloadCsv('member-report', S.rmode === 'member'
          ? [['Member ID', 'Name', 'Points added', 'Points used', 'Transactions', 'Remaining points']].concat(rows.map(r => { const m = DB.get('Members', r.id) || {}; return [m.code, m.name, r.add, r.use, r.n, m.points]; }))
          : [['Time', 'Member', 'Type', 'Note', 'Points', 'User']].concat(tx.map(x => [fmtDT(x.time), mName(x.memberId), x.kind, x.note, x.points, x.user])))
      });
      return;
    }

    const list = members.filter(m => (S.mtype === 'all' || (S.mtype === 'none' ? !typeName(m.typeId) : m.typeId === S.mtype)) && mText(m).includes(q));
    const opt = (val, label) => `<option value="${esc(val)}" ${val === S.mtype ? 'selected' : ''}>${esc(label)}</option>`;
    root.innerHTML = `${tabs}<div class="card gcard">
      <div class="gbar"><select class="input" data-chg="mtype" aria-label="Member Type">${opt('all', 'All type')}${types.map(x => opt(x.id, x.name)).join('')}${opt('none', 'Unknown')}</select>${search()}
        <span class="sp"></span><button class="btn green" data-act="add">${ic('plus')} ${esc(t('add'))}</button></div>
      ${list.length ? `<div class="tw"><table class="t mtable"><thead><tr><th>#</th><th></th><th>Member ID</th><th>Name</th><th class="r">Remaining points</th><th class="r hide-s">Accumulated points</th><th>Type</th><th></th></tr></thead><tbody>
      ${list.map(m => `<tr><td class="mut">${esc(m.id)}</td><td><span class="mav" style="background:${color(m.name)}">${esc((m.name || '?')[0])}</span></td><td><span class="code">${esc(m.code || '—')}</span></td>
        <td><b>${esc(m.name)}</b><small class="mut" style="display:block">${esc(m.phone || '')}${m.username ? ` · @${esc(m.username)}` : ''}</small></td>
        <td class="r"><b>${money(m.points)}</b></td><td class="r hide-s">${money(accPts(m))}</td><td><span class="tag ${typeName(m.typeId) ? 'b' : 'n'}">${esc(typeName(m.typeId) || 'Unknown')}</span></td>
        <td class="r" style="white-space:nowrap"><button class="sqb c" data-act="view" data-id="${esc(m.id)}" aria-label="View">${ic('eye')}</button><button class="sqb a" data-act="edit" data-id="${esc(m.id)}" aria-label="Edit">${ic('square-pen')}</button><button class="sqb r" data-act="del" data-id="${esc(m.id)}" aria-label="${esc(t('delete'))}">${ic('trash-2')}</button></td></tr>`).join('')}</tbody></table></div>` : empty('users')}
      <div class="gfoot">${list.length} / ${members.length} ${esc(t('member'))}</div></div>`;
    acts = Object.assign(common, {
      mtype: el => { S.mtype = el.value; render(); },
      add: () => { if (!types.length) { toast('Add a member type first', 'bad'); S.mtab = 'type'; render(true); return; } memberModal({}, { points: 0, typeId: S.mtype !== 'all' && S.mtype !== 'none' ? S.mtype : '' }); },
      view: el => viewMember(DB.get('Members', el.dataset.id)),
      edit: el => { const m = DB.get('Members', el.dataset.id); memberModal(m, { ...m, password: '' }); },
      del: el => { const m = DB.get('Members', el.dataset.id); confirmBox(`${t('delete')} ${m.name}?`, () => { DB.remove('Members', m.id); render(); }); }
    });
  };

  /* ---------- Logs ---------- */
  V.logs = root => {
    const logs = [...DB.list('Logs')].sort((a, b) => String(b.time).localeCompare(String(a.time))).slice(0, 200);
    const shifts = [...DB.list('Shifts')].sort((a, b) => String(b.openedAt).localeCompare(String(a.openedAt))).slice(0, 30);
    root.innerHTML = `<div class="card tw" style="margin-bottom:18px"><table class="t"><thead><tr><th>Shift opened</th><th>Closed</th><th>User</th><th class="r">Drawer</th><th class="r">Expected</th><th class="r">Counted</th><th>${esc(t('status'))}</th></tr></thead><tbody>
      ${shifts.map(s => `<tr><td>${fmtDT(s.openedAt)}</td><td>${s.closedAt ? fmtDT(s.closedAt) : '-'}</td><td>${esc(s.user)}</td><td class="r">${money(s.openingCash)}</td><td class="r">${s.expectedCash === '' ? '-' : money(s.expectedCash)}</td><td class="r">${s.closingCash === '' ? '-' : money(s.closingCash)}</td><td><span class="tag ${s.status === 'open' ? 'g' : 'n'}">${esc(s.status)}</span></td></tr>`).join('')}</tbody></table>${shifts.length ? '' : empty('clock')}</div>
      <div class="card tw"><table class="t"><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Detail</th></tr></thead><tbody>
      ${logs.map(l => `<tr><td style="white-space:nowrap">${fmtDT(l.time)}</td><td>${esc(l.user)}</td><td><span class="tag b">${esc(l.action)}</span></td><td>${esc(l.detail)}</td></tr>`).join('')}</tbody></table>${logs.length ? '' : empty('history')}</div>`;
  };

  /* ---------- voice alerts: a loud chime, then a spoken message, when a guest QR order arrives or a bill is cancelled ---------- */
  const VOICE = { th: 'th', km: 'km', lo: 'lo', zh: 'zh', en: 'en' };
  const SAY = {
    order: { en: (tb, n) => `New order. Table ${tb}. ${n} ${n === 1 ? 'item' : 'items'}.`, th: (tb, n) => `มีออเดอร์ใหม่ โต๊ะ ${tb} จำนวน ${n} รายการ`, km: (tb, n) => `មានការកុម្ម៉ង់ថ្មី តុ ${tb} ចំនួន ${n} មុខ`,
      lo: (tb, n) => `ມີອໍເດີໃໝ່ ໂຕະ ${tb} ຈຳນວນ ${n} ລາຍການ`, zh: (tb, n) => `新订单，${tb} 桌，${n} 项` },
    cancel: { en: tb => `Order cancelled. Table ${tb}.`, th: tb => `ยกเลิกออเดอร์ โต๊ะ ${tb}`, km: tb => `បានបោះបង់ការកុម្ម៉ង់ តុ ${tb}`, lo: tb => `ຍົກເລີກອໍເດີ ໂຕະ ${tb}`, zh: tb => `订单已取消，${tb} 桌` }
  };
  let actx = null;
  // A long, loud alarm: two rounds of beeps through a limiter so it plays at full level without crackling.
  function chime(bad) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume();
      const out = actx.createDynamicsCompressor(); out.threshold.value = -6; out.ratio.value = 12; out.connect(actx.destination);
      const seq = bad ? [784, 523, 392, 784, 523, 392] : [988, 1319, 1760, 1319, 1760, 0, 988, 1319, 1760, 1319, 1760];
      seq.forEach((f, i) => {
        if (!f) return;
        const t0 = actx.currentTime + i * .15;
        [f, f * 2].forEach((hz, k) => {                       // the note plus its octave: cuts through kitchen noise
          const o = actx.createOscillator(), g = actx.createGain();
          o.type = 'square'; o.frequency.value = hz; g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(k ? .45 : 1, t0 + .015); g.gain.exponentialRampToValueAtTime(.0001, t0 + .28);
          o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + .3);
        });
      });
      return seq.length * .15 + .25;
    } catch (e) { return 0; }
  }
  let soundTip = 0;
  function announce(kind, table, n, force) {
    if (SET.voice === false && !force) return;
    const wait = chime(kind === 'cancel');
    if ((!actx || actx.state !== 'running') && Date.now() - soundTip > 60000) { soundTip = Date.now(); toast('Tap the screen once to turn the alert sound on', 'bad'); } // browsers mute pages nobody has touched yet
    try {
      const voices = speechSynthesis.getVoices(), v = voices.find(x => String(x.lang).toLowerCase().startsWith(VOICE[I18N.lang] || 'en')), lang = v ? I18N.lang : 'en'; // no voice for this language on the device: speak English
      const text = (SAY[kind][lang] || SAY[kind].en)(table, n);
      setTimeout(() => {
        try {
          speechSynthesis.resume();
          for (let i = 0; i < 2; i++) {                       // said twice, at full volume
            const u = new SpeechSynthesisUtterance(text);
            if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-US';
            u.volume = 1; u.rate = .9; u.pitch = 1.1;
            speechSynthesis.speak(u);
          }
        } catch (e) {}
      }, wait * 1000);
    } catch (e) {}
  }
  try { speechSynthesis.getVoices(); } catch (e) {} // voices load in the background; ask early
  const wake = () => { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) {} };
  ['click', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, wake, { passive: true })); // browsers only allow sound after a first tap
  // Compares the bills with how they looked a moment ago and speaks about what changed.
  // With a sheet connected the comparison uses the quick "pulse" check (every 5 s); otherwise the data already in the app.
  let billSnap = null, pulseOk = false;
  const cancelSaid = new Set();
  function watchOrders(now, fromPulse) {
    if (pulseOk && !fromPulse) return;
    if (!now) { now = {}; DB.list('Bills').forEach(b => { now[b.id] = { s: b.status, t: b.tableName, q: DB.items(b).filter(i => i.src === 'qr').reduce((a, i) => a + num(i.qty), 0) }; }); }
    if (billSnap) Object.keys(now).forEach(id => {
      const a = billSnap[id], b = now[id], added = b.q - (a ? a.q : 0);
      if (b.s === 'open' && added > 0) { announce('order', b.t, added); toast(`${b.t}: ${added} new QR order item(s)`); }
      else if (a && a.s === 'open' && b.s === 'cancelled' && !cancelSaid.has(id)) announce('cancel', b.t);
    });
    billSnap = now;
  }
  const quiet = () => !DB.pending && !document.querySelector('.modal-back') && !(document.activeElement && document.activeElement.matches('input,select,textarea'));
  let pulseBusy = false, pulseSig = '';
  async function pulse() {
    if (pulseBusy || !DB.remote) return;
    pulseBusy = true;
    try {
      const bills = await DB.pulse();
      if (bills) {
        const now = {}; bills.forEach(b => { now[b.id] = { s: b.s, t: b.t, q: num(b.q) }; });
        if (!pulseOk && billSnap) Object.keys(billSnap).forEach(id => { if (!now[id] && billSnap[id].s !== 'open') now[id] = billSnap[id]; });
        pulseOk = true; watchOrders(now, true);
        const sig = JSON.stringify(bills);
        if (pulseSig && sig !== pulseSig && quiet()) resync(true);   // something changed: refresh the screen straight away
        pulseSig = sig;
      }
    } catch (e) {}
    pulseBusy = false;
  }

  /* ================= SHELL ================= */
  const NAV = [['dashboard', 'home', 'house'], ['pos', 'pos', 'shopping-cart'], ['pos3d', 'pos3d', 'box'], ['goods', 'goods', 'package'], ['tables', 'tables', 'layout-grid'], ['inventory', 'inventory', 'boxes'], ['member', 'member', 'users'], ['logs', 'logs', 'clock']];
  function render(anim) {
    const r = location.hash.replace('#/', ''), def = NAV.find(n => n[0] === r) || NAV[0], changed = S.route !== def[0];
    if (changed) { S.q = ''; S.focusQ = false; }
    S.route = def[0]; acts = {};
    $('#title').textContent = t(def[1]); document.title = `${t(def[1])} — ${CFG.BRAND} POS`;
    $('#nav').innerHTML = NAV.map(n => `<a href="#/${n[0]}" class="${n[0] === S.route ? 'on' : ''}"><span class="ni">${ic(n[2])}</span><span>${esc(t(n[1]))}</span></a>`).join('');
    view.classList.toggle('anim', changed || anim === true);
    V[S.route](view); icons(); bell(); watchOrders();
    if (changed) view.scrollTop = 0;
    if (S.focusQ) { const i = $('[data-q]', view); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } S.focusQ = false; }
  }
  view.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (el && !el.disabled && acts[el.dataset.act]) acts[el.dataset.act](el, e); });
  view.addEventListener('change', e => { const el = e.target.closest('[data-chg]'); if (el && acts[el.dataset.chg]) acts[el.dataset.chg](el, e); });
  view.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[role=button][data-act]')) e.target.click(); });
  const onQ = e => { if (!e.target.matches('[data-q]') || e.isComposing) return; S.q = e.target.value; S.focusQ = true; render(); };
  view.addEventListener('input', onQ); view.addEventListener('compositionend', onQ);
  window.addEventListener('hashchange', () => { app.classList.remove('drawer'); render(); });
  setInterval(() => $$('[data-since]').forEach(el => { el.textContent = elapsed(el.dataset.since); }), 1000);

  /* top bar */
  const mobile = () => matchMedia('(max-width:900px)').matches;
  $('#btnMenu').onclick = () => app.classList.toggle(mobile() ? 'drawer' : 'mini');
  $('#scrim').onclick = () => app.classList.remove('drawer');
  const themeIcon = () => { $('#btnTheme').innerHTML = ic(document.documentElement.dataset.theme === 'dark' ? 'moon' : 'sun'); icons(); };
  $('#btnTheme').onclick = () => { const d = document.documentElement, n = d.dataset.theme === 'dark' ? 'light' : 'dark'; d.dataset.theme = n; try { localStorage.setItem('rf_theme', n); } catch (e) {} themeIcon(); };
  $('#btnFull').onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); };
  $('#btnHist').onclick = () => { location.hash = '#/logs'; };
  $('#btnHelp').onclick = () => modal(`<h3>${ic('book-text')} Manual</h3><ol style="line-height:1.9;padding-left:20px;margin:10px 0 0">${UI.manual().map(x => `<li>${x}</li>`).join('')}</ol>
    <div class="actions"><button class="btn gray" data-close>${esc(t('close'))}</button></div>`);
  async function resync(quiet) {
    $('#btnSync').classList.add('syncing');
    try { await DB.flush(); await DB.load(); if (!document.querySelector('.modal-back')) render(); else watchOrders(); if (!quiet) toast(DB.status === 'offline' ? 'Offline — changes are saved on this device' : 'Data is up to date', DB.status === 'offline' ? 'bad' : 'ok'); }
    catch (e) { if (e.message !== 'auth' && !quiet) toast('Sync failed', 'bad'); }
    syncUi();
  }
  $('#btnSync').onclick = () => resync(false);
  function syncUi() { const b = $('#btnSync'); b.classList.toggle('syncing', DB.status === 'syncing'); b.classList.toggle('offline', DB.status === 'offline'); b.title = `Sync — ${DB.status}${DB.pending ? ` (${DB.pending} pending)` : ''}`; }
  DB.onStatus(s => { syncUi(); if (s === 'auth') { DB.logout(); location.replace('index.html'); } });
  function logout() { confirmBox(t('logout') + '?', () => { DB.log('Logout', ''); DB.logout(); location.replace('index.html'); }, false); }
  $('#btnSet').onclick = () => {
    const sw = (k, label, hint) => `<label class="sw srow"><span>${esc(label)}${hint ? `<small>${esc(hint)}</small>` : ''}</span><input type="checkbox" data-set="${k}" ${(k === 'voice' ? SET.voice !== false : SET[k]) ? 'checked' : ''}><i></i></label>`;
    const m = modal(`<header class="pm-head"><span class="pm-ic blue">${ic('settings')}</span><div class="pm-ttl"><h3>${esc(t('settings'))}</h3><small>Printing · Other settings</small></div>
        <button type="button" class="pm-x" data-close aria-label="${esc(t('close'))}">${ic('x')}</button></header>
      <div class="dr-body">
        <section class="sg"><h4>${ic('printer')} Print system in the kitchen</h4>
          ${sw('cashier', 'Print in the cashier', 'Order slip with prices')}${sw('k1', 'Print 1st kitchen')}${sw('k2', 'Kitchen printing system number 2')}${sw('k3', 'Kitchen print v3', 'Large-text ticket')}</section>
        <section class="sg"><h4>${ic('sliders-horizontal')} Other settings</h4>
          ${sw('quick', 'Add quick bill', 'Sell without a table from POS')}${sw('queueCard', 'Print queue card', 'When a queue number is added')}
          ${sw('voice', 'Voice alert for orders', 'Loud chime and spoken message for a new QR order or a cancelled bill')}
          <div class="srow"><span>Test the alert sound<small>Check the volume of this device</small></span><button type="button" class="btn-soft" data-test>${ic('volume-2')} Test sound</button></div></section>
        <p class="hint">These switches are saved on this device. Tickets print when dishes are added in POS, through the browser print dialog.</p>
      </div>`, 'drawer');
    m.el.addEventListener('change', e => { const k = e.target.dataset.set; if (!k) return; SET[k] = e.target.checked; saveSet(); if (S.route === 'pos') render(); });
    $('[data-test]', m.el).onclick = () => announce('order', 'GB 1', 2, true);
  };
  function langUi() {
    $('#btnLang').innerHTML = I18N.cur.flag;
    $('#langMenu').innerHTML = I18N.LANGS.map(l => `<button data-l="${l.code}" class="${l.code === I18N.lang ? 'on' : ''}">${l.flag} ${l.label}</button>`).join('');
  }
  $('#langMenu').onclick = e => { const b = e.target.closest('[data-l]'); if (b) { I18N.set(b.dataset.l); langUi(); render(); } };
  window.addEventListener('rf-lang', () => { langUi(); userMenu(); render(); });
  /* account menu: profile, password, log out */
  const ACC_ERR = { 'Wrong password': 'Current password is not correct', 'Username already exists': 'That username is already taken', 'Invalid username': 'Use a-z, 0-9, dot or dash, 3–30 characters', 'Failed to fetch': 'Could not save. Check your connection.' };
  function accountForm(title, icon, body, onSave) {
    const m = modal(`<form novalidate><h3>${ic(icon)} ${esc(title)}</h3>${body}
      <div class="actions"><button type="button" class="btn ghost" data-close>${esc(t('close'))}</button><button class="btn" data-go>${ic('save')} ${esc(t('save'))}</button></div></form>`);
    const f = $('form', m.el), btn = $('[data-go]', m.el);
    f.addEventListener('submit', async e => {
      e.preventDefault(); if (btn.disabled) return;
      const o = Object.fromEntries(new FormData(f)); Object.keys(o).forEach(k => { if (!/^pw/.test(k)) o[k] = o[k].trim(); });
      btn.disabled = true;
      try { const msg = await onSave(o); if (msg === false) return; m.close(); toast(msg); }
      catch (err) { if (err.message === 'auth') { DB.logout(); location.replace('index.html'); return; } toast(ACC_ERR[err.message] || err.message || 'Could not save. Check your connection.', 'bad'); }
      finally { btn.disabled = false; }
    });
  }
  const fi = (k, label, val, attrs = '') => `<div class="f"><label>${esc(label)}</label><input name="${k}" value="${esc(val == null ? '' : val)}" ${attrs}></div>`;
  function profileModal() {
    accountForm('Profile', 'user-pen',
      fi('name', 'Full name', U.name, 'maxlength="80"') + fi('store', 'Store name', U.store, 'maxlength="80"') + fi('phone', 'Phone', U.phone, 'maxlength="20" inputmode="tel"') +
      fi('email', 'Email', U.email, 'maxlength="120" type="email"') + fi('address', 'Address', U.address, 'maxlength="200"') +
      fi('', 'Username', U.username, 'disabled') + '<p class="hint" style="margin-top:6px">The username cannot be changed.</p>',
      async o => {
        if (!o.name) { toast('Enter a name', 'bad'); return false; }
        const user = await DB.updateProfile({ ...o, username: U.username });
        Object.keys(U).forEach(k => delete U[k]); Object.assign(U, user);
        userMenu(); render();
        return 'Profile updated';
      });
  }
  function passwordModal() {
    accountForm('Change password', 'key-round',
      fi('pwOld', 'Current password', '', 'type="password" autocomplete="current-password"') + fi('pwNew', 'New password', '', 'type="password" autocomplete="new-password"') +
      fi('pwNew2', 'Confirm new password', '', 'type="password" autocomplete="new-password"'),
      async o => {
        if (!o.pwOld) { toast('Enter your current password', 'bad'); return false; }
        if (o.pwNew.length < 6) { toast('Use at least 6 characters', 'bad'); return false; }
        if (o.pwNew !== o.pwNew2) { toast('The new passwords do not match', 'bad'); return false; }
        await DB.changePassword(o.pwOld, o.pwNew);
        DB.log('Change password', '');
        return 'Password changed';
      });
  }
  function userMenu() {
    $('#userMenu').innerHTML = `<div class="mi"><b>${esc(U.name || U.username)}</b><small>${esc(U.username)} · ${esc(U.store || '')}</small></div>
      <button data-prof>${ic('user-pen')} <span>Profile</span></button><button data-pass>${ic('key-round')} <span>Change password</span></button>
      <button data-out class="danger">${ic('log-out')} <span>${esc(t('logout'))}</span></button>`;
    icons();
  }
  userMenu();
  $('#userMenu').onclick = e => { if (e.target.closest('[data-prof]')) profileModal(); else if (e.target.closest('[data-pass]')) passwordModal(); else if (e.target.closest('[data-out]')) logout(); };
  function bell() {
    const n = [];
    DB.list('Bills').filter(b => b.status === 'open').forEach(b => { const k = DB.items(b).filter(i => i.src === 'qr' && i.status !== 'served').length; if (k) n.push(['qr-code', `${b.tableName}: ${k} new QR order item(s)`, 'Open POS to serve']); });
    DB.list('Products').filter(p => active(p) && tracked(p) && num(p.stock) <= 5).forEach(p => n.push(['package', `Low stock: ${p.name}`, `${num(p.stock)} left`]));
    const w = DB.list('Queue').filter(q => q.status === 'waiting').length; if (w) n.push(['users', `${w} in queue`, 'Waiting to be called']);
    const bd = $('#bellBadge'); bd.hidden = !n.length; bd.textContent = n.length;
    $('#bellMenu').innerHTML = n.length ? n.slice(0, 8).map(x => `<div class="mi"><b>${esc(x[1])}</b><small>${esc(x[2])}</small></div>`).join('') : '<div class="mi"><small>No notifications</small></div>';
  }
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-dd]'), cur = btn && btn.parentElement;
    $$('.dd.open').forEach(d => { if (d !== cur) d.classList.remove('open'); });
    if (cur) cur.classList.toggle('open'); else if (!e.target.closest('.dd .menu .mi')) $$('.dd.open').forEach(d => d.classList.remove('open'));
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { const all = $$('.modal-back'), m = all[all.length - 1]; if (m) ($('.pm [data-close]', m) || m).click(); } });

  /* ---------- boot ---------- */
  $('#splashSub').textContent = CFG.SUBTITLE; $('#company').textContent = CFG.COMPANY;
  I18N.apply(); langUi(); themeIcon(); icons();
  try { await DB.load(); } catch (e) { if (e.message === 'auth') { DB.logout(); location.replace('index.html'); return; } }
  if (!location.hash) history.replaceState(null, '', '#/dashboard');
  render(true); syncUi();
  setTimeout(() => $('#splash').classList.remove('show'), 500);
  if (DB.remote) { setInterval(() => { if (quiet()) resync(true); }, 30000); setInterval(pulse, 5000); }
  // demo mode keeps its data in this browser: pick up orders placed from another tab straight away
  if (!DB.remote) window.addEventListener('storage', e => { if (e.key === 'rf_db' && !document.querySelector('.modal-back')) DB.load().then(() => render()); });
})();
