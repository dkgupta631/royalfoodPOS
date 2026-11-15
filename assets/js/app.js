(async () => {
  const CFG = window.APP_CONFIG, sess = DB.session();
  if (!sess) { location.replace('index.html'); return; }
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
    const m = modal(`<div class="center"><h3>${esc(msg)}</h3></div><div class="actions center"><button class="btn ${danger ? 'red' : ''}" data-yes>${esc(t('confirm'))}</button><button class="btn gray" data-close>${esc(t('close'))}</button></div>`);
    $('[data-yes]', m.el).onclick = () => { m.close(); onYes(); };
  }
  function formModal(title, fields, vals, onOk, onDel) {
    const m = modal(`<form><h3>${esc(title)}</h3>${fields.map(f => `<div class="f"><label>${esc(f.label)}</label>${f.options
      ? `<select name="${f.k}">${f.options.map(o => `<option value="${esc(o[0])}" ${String(vals[f.k] == null ? '' : vals[f.k]) === String(o[0]) ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`
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

  V.dashboard = root => {
    const sh = openShift(), exp = new Date(U.expireDate), days = Math.round((exp - Date.now()) / 864e5);
    const rel = isNaN(exp) ? '' : days < 0 ? 'expired' : days < 14 ? `${days} days from now` : days < 60 ? `${Math.round(days / 7)} weeks from now` : `${Math.round(days / 30)} months from now`;
    const expTxt = isNaN(exp) ? '-' : exp.toLocaleDateString({ th: 'th-TH', km: 'km-KH', lo: 'lo-LA', zh: 'zh-CN' }[I18N.lang] || 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const bills = sh ? DB.list('Bills').filter(b => b.shiftId === sh.id && b.status === 'closed') : [];
    const sales = bills.reduce((a, b) => a + num(b.total), 0), openT = DB.list('Bills').filter(b => b.status === 'open').length;
    const sp = CFG.SUPPORT;
    root.innerHTML = `
    <div class="head"><h2>${esc(U.store || CFG.BRAND)}</h2><span class="sp"></span><a class="btn" href="#/pos">${ic('shopping-cart')} ${esc(t('pos'))}</a></div>
    <div class="dash">
      ${sh ? `<div class="card shift open">
          <div class="head" style="margin:0"><span class="tag g">${esc(t('shiftOpen'))}</span><span class="sp"></span><button class="btn red sm" data-act="closeShift">${ic('lock')} ${esc(t('closeShift'))}</button></div>
          <p style="margin-top:10px">Since ${fmtDT(sh.openedAt)} · ${esc(sh.user)} · ${esc(t('initDrawer'))} ${money(sh.openingCash)} ${esc(CFG.CURRENCY)}</p>
          <div class="stats"><div class="stat"><small>Sales</small><b data-count="${sales}">0</b></div><div class="stat"><small>Bills paid</small><b data-count="${bills.length}">0</b></div><div class="stat"><small>Open tables</small><b data-count="${openT}">0</b></div></div>
        </div>`
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
      openShift: () => formModal(t('openShift'), [{ k: 'cash', label: `${t('initDrawer')} (${CFG.CURRENCY})`, type: 'number', req: 1 }], { cash: 0 }, o => {
        DB.save('Shifts', { status: 'open', openedAt: new Date().toISOString(), closedAt: '', openingCash: num(o.cash), closingCash: '', expectedCash: '', user: U.username });
        DB.log('Open shift', `Drawer ${money(o.cash)}`); toast('Shift opened'); render(true);
      }),
      closeShift: () => {
        const cash = bills.filter(b => b.payMethod === 'Cash').reduce((a, b) => a + num(b.total), 0), expected = num(sh.openingCash) + cash;
        formModal(`${t('closeShift')} — expected cash ${money(expected)}`, [{ k: 'cash', label: `Counted cash (${CFG.CURRENCY})`, type: 'number', req: 1 }], { cash: expected }, o => {
          Object.assign(sh, { status: 'closed', closedAt: new Date().toISOString(), closingCash: num(o.cash), expectedCash: expected }); DB.save('Shifts', sh);
          DB.log('Close shift', `Sales ${money(sales)}, counted ${money(o.cash)}, expected ${money(expected)}`); toast('Shift closed'); render(true);
        });
      },
      backup: backup
    };
    $$('[data-count]', root).forEach(el => {
      const to = num(el.dataset.count), t0 = performance.now();
      const step = now => { const k = Math.min(1, (now - t0) / 700); el.textContent = money(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); else el.textContent = money(to); };
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
          <tbody>${its.map((i, k) => `<tr><td><input type="checkbox" data-chk="${k}" aria-label="Select"></td><td>${esc(i.name)} ${i.src === 'qr' ? '<span class="tag a">QR</span>' : ''}</td><td class="r">${money(i.price)}</td>
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
        const url = new URL('menu.html?table=' + encodeURIComponent(tb.id), location.href).href;
        const m = modal(`<div class="center"><h3>${esc(t('qrcode'))} — ${esc(tb.name)}</h3><p style="color:var(--muted)">Guests scan to order from this table</p><div id="qrbox" style="display:grid;place-items:center;margin:18px auto;padding:14px;background:#fff;border-radius:16px;width:max-content"></div>
          <input class="input" readonly value="${esc(url)}" onclick="this.select()">${DB.remote ? '' : '<p class="note" style="text-align:left">Demo mode: the menu link only works in this browser.</p>'}</div>
          <div class="actions center"><button class="btn gray" data-close>${esc(t('close'))}</button></div>`);
        if (window.QRCode) new QRCode($('#qrbox', m.el), { text: url, width: 200, height: 200 });
      },
      cancel: () => confirmBox(`${t('cancel')} ${tb.name}?`, () => { Object.assign(bill, { status: 'cancelled', closedAt: new Date().toISOString() }); DB.save('Bills', bill); DB.log('Cancel bill', `${tb.name} ${money(c.total)}`); toast('Bill cancelled'); render(); }),
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
      if (mem && pts) { mem.points = num(mem.points) + pts; DB.save('Members', mem); }
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
  V.member = root => {
    const q = S.q.toLowerCase(), list = DB.list('Members').filter(m => (m.name + ' ' + m.phone).toLowerCase().includes(q));
    const mf = [{ k: 'name', label: 'Name', req: 1 }, { k: 'phone', label: 'Phone', req: 1 }, { k: 'points', label: 'Points', type: 'number' }];
    root.innerHTML = `<div class="head"><input class="input" data-q style="max-width:240px" placeholder="${esc(t('search'))}" value="${esc(S.q)}"><span class="sp"></span><button class="btn" data-act="add">${ic('user-plus')} ${esc(t('member'))}</button></div>
      <div class="card tw">${list.length ? `<table class="t"><thead><tr><th>Name</th><th>Phone</th><th class="r">Points</th><th class="hide-s">Joined</th><th></th></tr></thead><tbody>
      ${list.map(m => `<tr><td><b>${esc(m.name)}</b></td><td>${esc(m.phone)}</td><td class="r"><span class="tag b">${money(m.points)}</span></td><td class="hide-s">${fmtDT(m.createdAt)}</td>
        <td class="r"><button class="icb" data-act="edit" data-id="${esc(m.id)}" aria-label="Edit">${ic('pencil')}</button><button class="icb del" data-act="del" data-id="${esc(m.id)}" aria-label="Delete">${ic('trash-2')}</button></td></tr>`).join('')}</tbody></table>` : empty('users')}</div>`;
    acts = {
      add: () => formModal('New member', mf, { points: 0 }, o => { DB.save('Members', { name: o.name.trim(), phone: o.phone.trim(), points: num(o.points), createdAt: new Date().toISOString() }); toast('Saved'); render(); }),
      edit: el => { const m = DB.get('Members', el.dataset.id); formModal('Edit member', mf, m, o => { Object.assign(m, { name: o.name.trim(), phone: o.phone.trim(), points: num(o.points) }); DB.save('Members', m); render(); }); },
      del: el => { const m = DB.get('Members', el.dataset.id); confirmBox(`${t('delete')} ${m.name}?`, () => { DB.remove('Members', m.id); render(); }); }
    };
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

  /* ================= SHELL ================= */
  const NAV = [['dashboard', 'home', 'house'], ['pos', 'pos', 'shopping-cart'], ['pos3d', 'pos3d', 'box'], ['goods', 'goods', 'package'], ['tables', 'tables', 'layout-grid'], ['inventory', 'inventory', 'boxes'], ['member', 'member', 'users'], ['logs', 'logs', 'clock']];
  function render(anim) {
    const r = location.hash.replace('#/', ''), def = NAV.find(n => n[0] === r) || NAV[0], changed = S.route !== def[0];
    if (changed) { S.q = ''; S.focusQ = false; }
    S.route = def[0]; acts = {};
    $('#title').textContent = t(def[1]); document.title = `${t(def[1])} — ${CFG.BRAND} POS`;
    $('#nav').innerHTML = NAV.map(n => `<a href="#/${n[0]}" class="${n[0] === S.route ? 'on' : ''}"><span class="ni">${ic(n[2])}</span><span>${esc(t(n[1]))}</span></a>`).join('');
    view.classList.toggle('anim', changed || anim === true);
    V[S.route](view); icons(); bell();
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
    try { await DB.flush(); await DB.load(); if (!document.querySelector('.modal-back')) render(); if (!quiet) toast(DB.status === 'offline' ? 'Offline — changes are saved on this device' : 'Data is up to date', DB.status === 'offline' ? 'bad' : 'ok'); }
    catch (e) { if (e.message !== 'auth' && !quiet) toast('Sync failed', 'bad'); }
    syncUi();
  }
  $('#btnSync').onclick = () => resync(false);
  function syncUi() { const b = $('#btnSync'); b.classList.toggle('syncing', DB.status === 'syncing'); b.classList.toggle('offline', DB.status === 'offline'); b.title = `Sync — ${DB.status}${DB.pending ? ` (${DB.pending} pending)` : ''}`; }
  DB.onStatus(s => { syncUi(); if (s === 'auth') { DB.logout(); location.replace('index.html'); } });
  function logout() { confirmBox(t('logout') + '?', () => { DB.log('Logout', ''); DB.logout(); location.replace('index.html'); }, false); }
  $('#btnSet').onclick = () => {
    const sw = (k, label, hint) => `<label class="sw srow"><span>${esc(label)}${hint ? `<small>${esc(hint)}</small>` : ''}</span><input type="checkbox" data-set="${k}" ${SET[k] ? 'checked' : ''}><i></i></label>`;
    const m = modal(`<header class="pm-head"><span class="pm-ic blue">${ic('settings')}</span><div class="pm-ttl"><h3>${esc(t('settings'))}</h3><small>Printing · Other settings</small></div>
        <button type="button" class="pm-x" data-close aria-label="${esc(t('close'))}">${ic('x')}</button></header>
      <div class="dr-body">
        <section class="sg"><h4>${ic('printer')} Print system in the kitchen</h4>
          ${sw('cashier', 'Print in the cashier', 'Order slip with prices')}${sw('k1', 'Print 1st kitchen')}${sw('k2', 'Kitchen printing system number 2')}${sw('k3', 'Kitchen print v3', 'Large-text ticket')}</section>
        <section class="sg"><h4>${ic('sliders-horizontal')} Other settings</h4>
          ${sw('quick', 'Add quick bill', 'Sell without a table from POS')}${sw('queueCard', 'Print queue card', 'When a queue number is added')}</section>
        <p class="hint">These switches are saved on this device. Tickets print when dishes are added in POS, through the browser print dialog.</p>
      </div>`, 'drawer');
    m.el.addEventListener('change', e => { const k = e.target.dataset.set; if (!k) return; SET[k] = e.target.checked; saveSet(); if (S.route === 'pos') render(); });
  };
  function langUi() {
    $('#btnLang').innerHTML = I18N.cur.flag;
    $('#langMenu').innerHTML = I18N.LANGS.map(l => `<button data-l="${l.code}" class="${l.code === I18N.lang ? 'on' : ''}">${l.flag} ${l.label}</button>`).join('');
  }
  $('#langMenu').onclick = e => { const b = e.target.closest('[data-l]'); if (b) { I18N.set(b.dataset.l); langUi(); render(); } };
  window.addEventListener('rf-lang', () => { langUi(); render(); });
  $('#userMenu').innerHTML = `<div class="mi"><b>${esc(U.name || U.username)}</b><small>${esc(U.username)} · ${esc(U.store || '')}</small></div><button data-out>${ic('log-out')} <span>${esc(t('logout'))}</span></button>`;
  $('#userMenu').onclick = e => { if (e.target.closest('[data-out]')) logout(); };
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
  if (DB.remote) setInterval(() => { if (!DB.pending && !document.querySelector('.modal-back') && document.visibilityState === 'visible' && !(document.activeElement && document.activeElement.matches('input,select'))) resync(true); }, 25000);
})();
