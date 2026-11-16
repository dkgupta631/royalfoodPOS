/* Data layer. Google Sheets (through the Apps Script web app) when APP_CONFIG.API_URL is set,
   otherwise a localStorage demo database. Reads come from an in-memory copy; writes are
   applied locally first and queued to the sheet, so the UI never waits on the network. */
const DB = (() => {
  const CFG = window.APP_CONFIG || {};
  const remote = !!CFG.API_URL;
  const K = { db: 'rf_db', q: 'rf_queue', s: 'rf_session', u: 'rf_users', r: 'rf_recent', i: 'rf_ids' };
  const SHEETS = ['Zones', 'Tables', 'Categories', 'Products', 'Bills', 'Members', 'Shifts', 'Logs', 'Queue', 'Reservations', 'MemberTypes', 'Points'];
  const jget = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const blank = () => Object.fromEntries(SHEETS.map(s => [s, []]));
  let data = blank(), queue = jget(K.q, []), flushing = false, status = remote ? 'synced' : 'local';
  const subs = [];
  /* Row ids are plain numbers: 1, 2, 3 …
     With a sheet connected, each device asks the server for a small block of unused numbers per tab and takes ids
     from it, so two devices can never give two rows the same id. In demo mode the next id is simply the highest + 1. */
  const POOL = 10, LOW = 4, SMALL = 1e9;
  let pool = jget(K.i, {}), refilling = false;
  const maxId = arr => arr.reduce((m, r) => { const n = Number(r.id); return Number.isInteger(n) && n > m && n < SMALL ? n : m; }, 0);
  async function refill() {
    if (!remote || refilling) return;
    const need = {}; SHEETS.forEach(s => { if ((pool[s] || []).length <= LOW) need[s] = POOL; });
    if (!Object.keys(need).length) return;
    refilling = true;
    try {
      const res = await api({ action: 'ids', token: (session() || {}).token, need });
      if (res.ok) { Object.entries(res.ids || {}).forEach(([s, a]) => { pool[s] = (pool[s] || []).concat(a.map(String)); }); jset(K.i, pool); }
    } catch (e) {}
    refilling = false;
  }
  function uid(sheet) {
    if (!remote) return String(maxId(data[sheet] || []) + 1);
    const p = pool[sheet] || [], used = new Set((data[sheet] || []).map(r => String(r.id)));
    let id = p.shift(); while (id && used.has(id)) id = p.shift(); // never reuse a number this device already has
    jset(K.i, pool); if (p.length <= LOW) refill();
    return id || String(maxId(data[sheet] || []) + 1);              // no reserved number left (offline, or old script): the next number after the highest
  }
  const num = v => Number(v) || 0;

  async function sha(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  const hash = (u, p) => sha(String(u).trim().toLowerCase() + ':' + p);
  async function api(payload) {
    // text/plain keeps this a "simple" request, which Apps Script needs (it cannot answer CORS preflights)
    const r = await fetch(CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
    return r.json();
  }
  const setStatus = s => { if (s !== status) { status = s; subs.forEach(f => f(s)); } };

  /* ---------- auth ---------- */
  const session = () => jget(K.s, null);
  const yearAhead = () => new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10);
  async function localUsers() {
    let u = jget(K.u, null);
    if (!u) {
      u = [{ id: '1', username: 'admin', passwordHash: await hash('admin', 'admin123'), name: 'Admin', store: 'Royalfood Restaurant', role: 'owner', package: 'Standard', expireDate: yearAhead() }];
      jset(K.u, u);
    }
    return u;
  }
  function remember(user) {
    const r = jget(K.r, []).filter(x => x.username !== user.username);
    r.unshift({ username: user.username, name: user.name });
    jset(K.r, r.slice(0, 3));
  }
  function startSession(token, user) { jset(K.s, { token, user }); remember(user); return user; }
  async function login(username, password) {
    username = String(username).trim();
    const h = await hash(username, password);
    if (remote) {
      const res = await api({ action: 'login', username, hash: h });
      if (!res.ok) throw new Error(res.error || 'Login failed');
      if (res.member) { jset(K.s, { token: res.token, member: res.member }); return res.member; } // a customer: goes to member.html
      return startSession(res.token, res.user);
    }
    const u = (await localUsers()).find(x => x.username.toLowerCase() === username.toLowerCase() && x.passwordHash === h);
    if (!u) {
      const m = (jget(K.db, {}).Members || []).find(x => x.username && x.username.toLowerCase() === username.toLowerCase() && x.passwordHash === h);
      if (!m) throw new Error('Incorrect username or password');
      jset(K.s, { token: 'local', member: pubMember(m) }); return m;
    }
    const { passwordHash, ...user } = u;
    return startSession('local', user);
  }
  /* member (customer) page: own details, points and paid bills */
  const pubMember = m => ({ id: m.id, name: m.name, phone: m.phone, points: m.points, username: m.username, createdAt: m.createdAt, code: m.code });
  async function memberHome() {
    const s = session();
    if (remote) { const res = await api({ action: 'member', token: s.token }); if (!res.ok) throw new Error(res.error || 'failed'); return res; }
    const d = jget(K.db, {}), m = (d.Members || []).find(x => x.id === s.member.id);
    if (!m || !m.username) throw new Error('auth');
    const bills = (d.Bills || []).filter(b => b.memberId === m.id && b.status === 'closed').sort((a, b) => String(b.closedAt).localeCompare(String(a.closedAt))).slice(0, 50)
      .map(b => ({ id: b.id, closedAt: b.closedAt, total: b.total, items: items(b).map(i => ({ name: i.name, qty: i.qty })) }));
    return { member: pubMember(m), bills };
  }
  async function register({ username, password, name, store, code, ...extra }) {
    username = String(username).trim();
    const h = await hash(username, password);
    if (remote) {
      const res = await api({ action: 'register', username, hash: h, name, store, code, ...extra });
      if (!res.ok) throw new Error(res.error || 'Registration failed');
      return startSession(res.token, res.user);
    }
    const users = await localUsers();
    if (users.some(x => x.username.toLowerCase() === username.toLowerCase())) throw new Error('Username already exists');
    const u = { id: String(users.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0) + 1), username, passwordHash: h, name, store, role: 'staff', package: extra.package || 'Standard',
      expireDate: extra.trialDays ? new Date(Date.now() + extra.trialDays * 864e5).toISOString().slice(0, 10) : yearAhead(),
      phone: extra.phone || '', email: extra.email || '', address: extra.address || '', tables: extra.tables || '', billing: extra.billing || '', price: extra.price || '', options: extra.options || '' };
    users.push(u); jset(K.u, users);
    const { passwordHash, ...user } = u;
    return startSession('local', user);
  }
  /* the signed-in user's own account */
  function setUser(user) { const s = session(); const old = s.user.username; s.user = user; jset(K.s, s); jset(K.r, recent().filter(x => x.username !== old)); remember(user); return user; }
  async function updateProfile(f, password) {
    const me = session().user, username = String(f.username || me.username).trim(), rename = username !== me.username;
    if (rename && !/^[\w.-]{3,30}$/.test(username)) throw new Error('Invalid username');
    const oldHash = rename ? await hash(me.username, password) : '', newHash = rename ? await hash(username, password) : '';
    if (remote) {
      const res = await api({ action: 'profile', token: session().token, username, oldHash, newHash, name: f.name, store: f.store, phone: f.phone, email: f.email, address: f.address });
      if (!res.ok) throw new Error(res.error || 'Could not save');
      return setUser(res.user);
    }
    const users = await localUsers(), u = users.find(x => x.username === me.username);
    if (!u) throw new Error('auth');
    if (rename) {
      if (users.some(x => x !== u && x.username.toLowerCase() === username.toLowerCase())) throw new Error('Username already exists');
      if (u.passwordHash !== oldHash) throw new Error('Wrong password');
      u.username = username; u.passwordHash = newHash;
    }
    Object.assign(u, { name: f.name || u.name, store: f.store || '', phone: f.phone || '', email: f.email || '', address: f.address || '' });
    jset(K.u, users);
    const { passwordHash, ...user } = u;
    return setUser(user);
  }
  async function changePassword(oldPw, newPw) {
    const me = session().user, oldHash = await hash(me.username, oldPw), newHash = await hash(me.username, newPw);
    if (remote) { const res = await api({ action: 'password', token: session().token, oldHash, newHash }); if (!res.ok) throw new Error(res.error || 'Could not save'); return; }
    const users = await localUsers(), u = users.find(x => x.username === me.username);
    if (!u || u.passwordHash !== oldHash) throw new Error('Wrong password');
    u.passwordHash = newHash; jset(K.u, users);
  }
  function logout() { localStorage.removeItem(K.s); } // the reserved id numbers stay on this device, so the next login continues the sequence without gaps
  const recent = () => jget(K.r, []);
  const forget = username => jset(K.r, recent().filter(x => x.username !== username));

  /* ---------- data ---------- */
  function seed() {
    const d = blank();
    d.Zones.push({ id: '1', name: 'Zone 1', sort: 1 });
    for (let i = 1; i <= 20; i++) d.Tables.push({ id: String(i), zoneId: '1', name: 'GB ' + i, seats: 4, sort: i });
    [['1', 'Food'], ['2', 'Drinks'], ['3', 'Dessert']].forEach((c, i) => d.Categories.push({ id: c[0], name: c[1], sort: i + 1 }));
    [['C1', 'Pad Thai', 80], ['C1', 'Tom Yum Kung', 150], ['C1', 'Fried Rice with Pork', 70], ['C1', 'Green Curry Chicken', 120], ['C1', 'Papaya Salad', 60],
     ['C1', 'Grilled Pork Neck', 140], ['C2', 'Thai Iced Tea', 45], ['C2', 'Iced Coffee', 50], ['C2', 'Coconut Water', 40], ['C2', 'Soda', 25],
     ['C3', 'Mango Sticky Rice', 90], ['C3', 'Coconut Ice Cream', 55]]
      .forEach((p, i) => d.Products.push({ id: String(i + 1), categoryId: p[0].slice(1), name: p[1], price: p[2], stock: 50, active: 'true' }));
    return d;
  }
  const normalize = d => { const o = blank(); SHEETS.forEach(s => { if (Array.isArray(d && d[s])) o[s] = d[s].filter(r => r && r.id); }); return o; };
  const persist = () => jset(K.db, data);

  async function load() {
    if (!remote) { data = normalize(jget(K.db, null) || seed()); persist(); return data; }
    await flush();
    if (queue.length) { data = normalize(jget(K.db, {})); return data; } // unsynced changes win over a re-download
    try {
      const res = await api({ action: 'all', token: (session() || {}).token });
      if (!res.ok) { if (res.error === 'auth') { setStatus('auth'); throw new Error('auth'); } throw new Error(res.error); }
      data = normalize(res.data);
      if (!data.Zones.length && !data.Tables.length && !data.Products.length) { // brand-new sheet: fill it with the starter data
        const s = seed();
        ['Zones', 'Tables', 'Categories', 'Products'].forEach(sh => s[sh].forEach(r => save(sh, r)));
      }
      persist(); await refill(); setStatus(queue.length ? 'syncing' : 'synced');
    } catch (e) {
      if (e.message === 'auth') throw e;
      data = normalize(jget(K.db, {})); setStatus('offline');
    }
    return data;
  }
  function enqueue(op) { if (!remote) return; queue.push(op); jset(K.q, queue); flush(); }
  async function flush() {
    if (!remote || flushing || !queue.length) return;
    flushing = true; setStatus('syncing');
    while (queue.length) {
      const batch = queue.slice(0, 25);
      try {
        const res = await api({ action: 'bulk', ops: batch, token: (session() || {}).token });
        if (!res.ok && res.error === 'auth') { flushing = false; setStatus('auth'); return; }
        if (!res.ok) throw new Error(res.error);
        queue.splice(0, batch.length); jset(K.q, queue);
      } catch (e) { flushing = false; setStatus('offline'); setTimeout(flush, 8000); return; }
    }
    flushing = false; setStatus('synced');
  }
  const list = s => data[s] || [];
  const get = (s, id) => list(s).find(r => r.id === id);
  function save(sheet, row) {
    if (!row.id) row.id = uid(sheet);
    const arr = data[sheet], i = arr.findIndex(r => r.id === row.id);
    if (i >= 0) arr[i] = row; else arr.push(row);
    persist(); enqueue({ op: 'upsert', sheet, row });
    return row;
  }
  function remove(sheet, id) {
    data[sheet] = data[sheet].filter(r => r.id !== id);
    persist(); enqueue({ op: 'delete', sheet, id });
  }
  function log(action, detail) {
    save('Logs', { time: new Date().toISOString(), user: ((session() || {}).user || {}).username || '', action, detail: detail || '' });
  }

  /* ---------- products ---------- */
  // starter-menu photos (assets/img/foods), used until a product gets its own picture
  const FOOD_IMG = { 'pad thai': 'pad-thai', 'tom yum kung': 'tom-yum-kung', 'fried rice with pork': 'fried-rice-pork', 'green curry chicken': 'green-curry', 'papaya salad': 'papaya-salad',
    'grilled pork neck': 'grilled-pork-neck', 'thai iced tea': 'thai-iced-tea', 'iced coffee': 'iced-coffee', 'coconut water': 'coconut-water', 'mango sticky rice': 'mango-sticky-rice', 'coconut ice cream': 'coconut-ice-cream' };
  const img = p => { if (p.image) return String(p.image); const f = FOOD_IMG[String(p.name || '').trim().toLowerCase()]; return f ? `assets/img/foods/${f}.jpg` : ''; };
  // names in other languages: {en, km, lo, zh, …}; the main name is p.name
  const names = p => { let o = {}; try { o = typeof p.names === 'string' ? JSON.parse(p.names || '{}') : (p.names || {}); } catch (e) {} if (!o || typeof o !== 'object') o = {}; if (!o.en && p.nameEn) o.en = p.nameEn; return o; };
  const pname = (p, lang) => names(p)[lang] || p.name;
  const extras = p => { try { const a = typeof p.extras === 'string' ? JSON.parse(p.extras || '[]') : (p.extras || []); return Array.isArray(a) ? a.filter(x => x && x.name) : []; } catch (e) { return []; } };

  /* ---------- bills ---------- */
  const items = b => { try { return typeof b.items === 'string' ? JSON.parse(b.items || '[]') : (b.items || []); } catch (e) { return []; } };
  function calc(b, its) {
    its = its || items(b);
    const subtotal = its.reduce((a, i) => a + num(i.price) * num(i.qty), 0);
    const discount = Math.min(num(b.discount), subtotal);
    const tax = Math.round((subtotal - discount) * num(CFG.TAX_PERCENT)) / 100;
    return { subtotal, discount, tax, total: subtotal - discount + tax, count: its.reduce((a, i) => a + num(i.qty), 0) };
  }
  function setItems(b, its) { const c = calc(b, its); Object.assign(b, { items: JSON.stringify(its), subtotal: c.subtotal, tax: c.tax, total: c.total }); return save('Bills', b); }
  const openBill = tableId => list('Bills').find(b => b.tableId === tableId && b.status === 'open');
  function newBill(table, seats, cashier, shiftId) {
    return save('Bills', { tableId: table.id, tableName: table.name, status: 'open', seats: seats || table.seats || '', openedAt: new Date().toISOString(), closedAt: '',
      subtotal: 0, discount: 0, tax: 0, total: 0, payMethod: '', received: '', memberId: '', cashier: cashier || '', shiftId: shiftId || '', items: '[]' });
  }

  /* ---------- customer QR menu (no login) ---------- */
  const qrOk = (tb, key) => { if (String(tb.qr) === 'false') throw new Error('QR off'); if ((tb.qrKey || '') !== String(key || '')) throw new Error('Table not found'); };
  async function publicMenu(tableId, key) {
    if (remote) { const res = await api({ action: 'menu', tableId, key }); if (!res.ok) throw new Error(res.error); return res; }
    await load();
    const tb = get('Tables', tableId);
    if (!tb) throw new Error('Table not found');
    qrOk(tb, key);
    return { table: tb.name, categories: list('Categories'), products: list('Products').filter(p => String(p.active) !== 'false') };
  }
  async function publicOrder(tableId, cart, key) {
    if (remote) { const res = await api({ action: 'order', tableId, key, items: cart }); if (!res.ok) throw new Error(res.error); return res; }
    await load();
    const tb = get('Tables', tableId);
    if (!tb) throw new Error('Table not found');
    qrOk(tb, key);
    const b = openBill(tableId) || newBill(tb, tb.seats, 'QR');
    const its = items(b);
    cart.forEach(c => { const p = get('Products', c.pid); if (p && num(c.qty) > 0) its.push({ pid: p.id, name: p.name, price: num(p.price), qty: num(c.qty), status: 'ordered', src: 'qr', note: String(c.note || '').slice(0, 80) }); });
    setItems(b, its);
    return { ok: true };
  }

  // a quick look at the open and just-cancelled bills, used for the order alerts
  async function pulse() {
    if (!remote) return null;
    const res = await api({ action: 'pulse', token: (session() || {}).token });
    if (!res.ok) { if (res.error === 'auth') setStatus('auth'); return null; }
    return res.bills || [];
  }
  return { remote, session, pulse, login, register, hash, memberHome, updateProfile, changePassword, logout, recent, forget, load, flush, list, get, save, remove, log, items, setItems, calc, openBill, newBill,
    publicMenu, publicOrder, img, extras, names, pname, num, uid, onStatus: f => subs.push(f), get status() { return status; }, get pending() { return queue.length; },
    export: () => JSON.stringify(data, null, 2) };
})();
