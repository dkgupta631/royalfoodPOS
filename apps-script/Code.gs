/**
 * Royalfood POS — Google Sheets backend.
 *
 * 1. Open your Google Sheet → Extensions → Apps Script, replace everything with this file.
 * 2. Change REGISTER_CODE below, pick the `setup` function in the toolbar and press Run (approve access once).
 *    That creates all tabs and the first user:  admin / admin123  — change the password hash after first login
 *    by registering your own account and deleting the admin row in the Users tab.
 * 3. Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone → Deploy.
 * 4. Copy the Web app URL into assets/js/config.js (API_URL).
 * After editing this file later: Deploy → Manage deployments → Edit → Version: New version.
 */
const REGISTER_CODE = 'ROYAL2026'; // people need this code to create an account. Change it.
const SESSION_SECONDS = 21600;     // 6 hours (the maximum Apps Script cache lifetime)

const SCHEMA = {
  Users: ['id', 'username', 'passwordHash', 'name', 'store', 'role', 'package', 'expireDate', 'createdAt', 'phone', 'email', 'address', 'tables', 'billing', 'price', 'options'],
  Zones: ['id', 'name', 'sort'],
  Tables: ['id', 'zoneId', 'name', 'seats', 'sort', 'qr', 'qrKey'], // qr: 'false' turns guest QR ordering off; qrKey: secret in the table's QR link
  Categories: ['id', 'name', 'sort'],
  Products: ['id', 'categoryId', 'name', 'price', 'stock', 'active', 'code', 'nameEn', 'image', 'desc', 'descEn', 'buffet', 'byWeight', 'extras', 'names'],
  Bills: ['id', 'tableId', 'tableName', 'status', 'seats', 'openedAt', 'closedAt', 'subtotal', 'discount', 'tax', 'total', 'payMethod', 'received', 'memberId', 'cashier', 'shiftId', 'items'],
  Members: ['id', 'name', 'phone', 'points', 'createdAt', 'username', 'passwordHash', 'code', 'typeId', 'totalPoints', 'birthday', 'email', 'lineUid', 'note'],
  MemberTypes: ['id', 'name'],
  Points: ['id', 'memberId', 'time', 'points', 'kind', 'billId', 'note', 'user'], // every change to a member's points
  Shifts: ['id', 'status', 'openedAt', 'closedAt', 'openingCash', 'closingCash', 'expectedCash', 'user', 'expenses'],
  Logs: ['id', 'time', 'user', 'action', 'detail'],
  Queue: ['id', 'number', 'name', 'people', 'status', 'createdAt'],
  Reservations: ['id', 'name', 'phone', 'tableId', 'time', 'people', 'status']
};
const DATA_SHEETS = Object.keys(SCHEMA).filter(function (s) { return s !== 'Users'; });

function setup() {
  ensureSheets_();
  if (!read_('Users').length) {
    upsert_('Users', { id: '1', username: 'admin', passwordHash: sha_('admin:admin123'), name: 'Admin', store: 'Royalfood Restaurant',
      role: 'owner', package: 'Standard', expireDate: isoDate_(365), createdAt: new Date().toISOString() });
  }
}

function doGet() { return out_({ ok: true, service: 'Royalfood POS API' }); }

function doPost(e) {
  try {
    var b = JSON.parse(e.postData.contents);
    switch (b.action) {
      case 'login': return out_(login_(b));
      case 'register': return out_(register_(b));
      case 'menu': return out_(menu_(b));
      case 'order': return out_(withLock_(function () { return order_(b); }));
      case 'member': return out_(memberHome_(b));
    }
    if (!auth_(b.token)) return out_({ ok: false, error: 'auth' });
    switch (b.action) {
      case 'profile': return out_(withLock_(function () { return profile_(b); }));
      case 'password': return out_(withLock_(function () { return password_(b); }));
      case 'pulse': return out_(pulse_());
      case 'ids': // a device asks for blocks of unused id numbers, e.g. {Bills: 10, Logs: 10}
        return out_(withLock_(function () {
          var ids = {};
          Object.keys(b.need || {}).forEach(function (s) { if (DATA_SHEETS.indexOf(s) >= 0) ids[s] = reserve_(s, Math.min(50, Math.max(1, Math.floor(Number(b.need[s])) || 1))); });
          return { ok: true, ids: ids };
        }));
      case 'all':
        ensureSheets_();
        var data = {};
        DATA_SHEETS.forEach(function (s) { data[s] = read_(s); });
        return out_({ ok: true, data: data });
      case 'bulk':
        return out_(withLock_(function () {
          (b.ops || []).forEach(function (op) {
            if (DATA_SHEETS.indexOf(op.sheet) < 0) return;
            if (op.op === 'upsert' && op.row && op.row.id) upsert_(op.sheet, op.row);
            if (op.op === 'delete') del_(op.sheet, op.id);
          });
          return { ok: true };
        }));
    }
    return out_({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  }
}

/* ---------- auth ---------- */
function publicUser_(u) { var o = {}; Object.keys(u).forEach(function (k) { if (k !== 'passwordHash') o[k] = u[k]; }); return o; }
function newSession_(u) {
  var token = Utilities.getUuid();
  CacheService.getScriptCache().put('tok_' + token, u.username, SESSION_SECONDS);
  return { ok: true, token: token, user: publicUser_(u) };
}
function auth_(token) {
  if (!token) return false;
  var c = CacheService.getScriptCache(), u = c.get('tok_' + token);
  if (u) c.put('tok_' + token, u, SESSION_SECONDS); // sliding expiry
  return !!u && u.indexOf('m:') !== 0;             // a member (customer) token never opens shop data
}
/* ---------- the signed-in user's own account ---------- */
function me_(token) {
  var name = String(CacheService.getScriptCache().get('tok_' + token) || '').toLowerCase();
  return read_('Users').filter(function (x) { return x.username.toLowerCase() === name; })[0];
}
function profile_(b) {
  var u = me_(b.token);
  if (!u) return { ok: false, error: 'auth' };
  // the username is fixed: it is never changed from the app
  u.name = str_(b.name, 80) || u.name; u.store = str_(b.store, 80);
  u.phone = str_(b.phone, 20).replace(/[^\d+]/g, ''); u.email = str_(b.email, 120); u.address = str_(b.address, 200);
  upsert_('Users', u);
  return { ok: true, user: publicUser_(u) };
}
function password_(b) {
  var u = me_(b.token);
  if (!u) return { ok: false, error: 'auth' };
  if (b.oldHash !== u.passwordHash) { Utilities.sleep(800); return { ok: false, error: 'Wrong password' }; }
  if (!/^[0-9a-f]{64}$/.test(String(b.newHash))) return { ok: false, error: 'Invalid password' };
  u.passwordHash = b.newHash;
  upsert_('Users', u);
  return { ok: true };
}
/* ---------- member (customer) page: own details, points and paid bills only ---------- */
function publicMember_(m) { return { id: m.id, name: m.name, phone: m.phone, points: m.points, username: m.username, createdAt: m.createdAt, code: m.code }; }
function memberHome_(b) {
  var c = CacheService.getScriptCache(), v = String(c.get('tok_' + b.token) || '');
  if (v.indexOf('m:') !== 0) return { ok: false, error: 'auth' };
  c.put('tok_' + b.token, v, SESSION_SECONDS);
  var id = v.slice(2), m = read_('Members').filter(function (x) { return x.id === id; })[0];
  if (!m || !m.username) return { ok: false, error: 'auth' };
  var bills = read_('Bills').filter(function (x) { return x.memberId === id && x.status === 'closed'; })
    .sort(function (x, y) { return String(y.closedAt).localeCompare(String(x.closedAt)); }).slice(0, 50)
    .map(function (x) { var its = []; try { its = JSON.parse(x.items || '[]'); } catch (e) {} return { id: x.id, closedAt: x.closedAt, total: x.total, items: its.map(function (i) { return { name: i.name, qty: i.qty }; }) }; });
  return { ok: true, member: publicMember_(m), bills: bills };
}
function login_(b) {
  var name = String(b.username || '').trim().toLowerCase();
  var u = read_('Users').filter(function (x) { return x.username.toLowerCase() === name && x.passwordHash === b.hash; })[0];
  if (u) return newSession_(u);
  // not a shop account: maybe a member (customer) with a login
  var m = read_('Members').filter(function (x) { return x.username && x.username.toLowerCase() === name && x.passwordHash === b.hash; })[0];
  if (!m) { Utilities.sleep(800); return { ok: false, error: 'Incorrect username or password' }; }
  var token = Utilities.getUuid();
  CacheService.getScriptCache().put('tok_' + token, 'm:' + m.id, SESSION_SECONDS);
  return { ok: true, token: token, member: publicMember_(m) };
}
function register_(b) {
  if (String(b.code || '') !== REGISTER_CODE) return { ok: false, error: 'Invalid invite code' };
  var name = String(b.username || '').trim();
  if (!/^[\w.-]{3,30}$/.test(name) || !/^[0-9a-f]{64}$/.test(String(b.hash))) return { ok: false, error: 'Invalid username' };
  return withLock_(function () {
    if (read_('Users').some(function (x) { return x.username.toLowerCase() === name.toLowerCase(); })) return { ok: false, error: 'Username already exists' };
    var u = { id: String(reserve_('Users', 1)[0]), username: name, passwordHash: b.hash, name: String(b.name || name).slice(0, 80), store: String(b.store || '').slice(0, 80),
      role: 'staff', package: str_(b.package, 60) || 'Standard', expireDate: isoDate_(b.package ? 7 : 365), createdAt: new Date().toISOString(),
      phone: str_(b.phone, 20).replace(/[^\d+]/g, ''), email: str_(b.email, 120), address: str_(b.address, 200), tables: int_(b.tables), billing: b.billing === 'year' ? 'year' : b.billing === 'month' ? 'month' : '',
      price: int_(b.price), options: str_(b.options, 200) };
    upsert_('Users', u);
    return newSession_(u);
  });
}

/* ---------- order alerts ---------- */
/** A small, quick answer the app asks for every few seconds: open bills and bills cancelled in the last day, with how many QR-ordered items each has. */
function pulse_() {
  var since = Date.now() - 864e5;
  var bills = read_('Bills').filter(function (x) { return x.status === 'open' || (x.status === 'cancelled' && new Date(x.closedAt).getTime() > since); })
    .map(function (x) { var q = 0; try { JSON.parse(x.items || '[]').forEach(function (i) { if (i.src === 'qr') q += Number(i.qty) || 0; }); } catch (e) {} return { id: x.id, s: x.status, t: x.tableName, q: q }; });
  return { ok: true, bills: bills };
}

/* ---------- customer QR menu ---------- */
/** Guest QR ordering is refused when the table's switch is off or the link carries an old key. */
function qrBlock_(tb, b) {
  if (tb.qr === 'false') return { ok: false, error: 'QR off' };
  if ((tb.qrKey || '') !== String(b.key || '')) return { ok: false, error: 'Table not found' };
  return null;
}
function menu_(b) {
  var tb = read_('Tables').filter(function (x) { return x.id === b.tableId; })[0];
  if (!tb) return { ok: false, error: 'Table not found' };
  var no = qrBlock_(tb, b); if (no) return no;
  return { ok: true, table: tb.name, categories: read_('Categories'), products: read_('Products').filter(function (p) { return p.active !== 'false'; }) };
}
function order_(b) {
  var tb = read_('Tables').filter(function (x) { return x.id === b.tableId; })[0];
  if (!tb) return { ok: false, error: 'Table not found' };
  var no = qrBlock_(tb, b); if (no) return no;
  var prods = read_('Products'), cart = (b.items || []).slice(0, 50);
  var bill = read_('Bills').filter(function (x) { return x.tableId === tb.id && x.status === 'open'; })[0] ||
    { id: String(reserve_('Bills', 1)[0]), tableId: tb.id, tableName: tb.name, status: 'open', seats: tb.seats, openedAt: new Date().toISOString(), discount: 0, cashier: 'QR', items: '[]' };
  var items = JSON.parse(bill.items || '[]');
  cart.forEach(function (c) {
    var p = prods.filter(function (x) { return x.id === c.pid && x.active !== 'false'; })[0], q = Math.floor(Number(c.qty));
    if (p && q > 0 && q <= 99) items.push({ pid: p.id, name: p.name, price: Number(p.price) || 0, qty: q, status: 'ordered', src: 'qr', note: str_(c.note, 80) });
  });
  var sub = items.reduce(function (a, i) { return a + i.price * i.qty; }, 0);
  bill.items = JSON.stringify(items); bill.subtotal = sub; bill.total = sub - (Number(bill.discount) || 0) + (Number(bill.tax) || 0);
  upsert_('Bills', bill);
  return { ok: true };
}

/* ---------- sheet helpers ---------- */
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function ensureSheets_() {
  Object.keys(SCHEMA).forEach(function (name) {
    var sh = ss_().getSheetByName(name) || ss_().insertSheet(name), h = SCHEMA[name];
    sh.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold');
    sh.setFrozenRows(1);
  });
}
function sheet_(name) { var sh = ss_().getSheetByName(name); if (!sh) { ensureSheets_(); sh = ss_().getSheetByName(name); } return sh; }
function read_(name) {
  var sh = sheet_(name), last = sh.getLastRow(), h = SCHEMA[name];
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, h.length).getDisplayValues()
    .filter(function (r) { return r[0] !== ''; })
    .map(function (r) { var o = {}; h.forEach(function (k, i) { o[k] = r[i]; }); return o; });
}
function rowIndex_(sh, id) {
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var ids = sh.getRange(2, 1, last - 1, 1).getDisplayValues();
  for (var i = 0; i < ids.length; i++) if (ids[i][0] === String(id)) return i + 2;
  return -1;
}
function upsert_(name, row) {
  var sh = sheet_(name), h = SCHEMA[name], r = rowIndex_(sh, row.id);
  if (r < 0) r = sh.getLastRow() + 1;
  var vals = h.map(function (k) { var v = row[k]; return v == null ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v)); });
  sh.getRange(r, 1, 1, h.length).setNumberFormat('@').setValues([vals]); // plain text: keeps leading zeros, blocks formulas
}
function del_(name, id) { var sh = sheet_(name), r = rowIndex_(sh, id); if (r > 0) sh.deleteRow(r); }
/* ---------- numeric ids: 1, 2, 3 … ---------- */
var FK_ = { Tables: { zoneId: 'Zones' }, Products: { categoryId: 'Categories' }, Bills: { tableId: 'Tables', shiftId: 'Shifts', memberId: 'Members' }, Reservations: { tableId: 'Tables' }, Members: { typeId: 'MemberTypes' }, Points: { memberId: 'Members', billId: 'Bills' } };
function maxId_(name) {
  var sh = sheet_(name), last = sh.getLastRow(), m = 0;
  if (last < 2) return 0;
  sh.getRange(2, 1, last - 1, 1).getDisplayValues().forEach(function (r) { var n = Number(r[0]); if (n > m && n < 1e9 && Math.floor(n) === n) m = n; });
  return m;
}
/** Hands out the next n unused numbers for a tab and remembers them, so they are never given twice. Call inside a lock. */
function reserve_(name, n) {
  var props = PropertiesService.getScriptProperties(), key = 'seq_' + name;
  var start = Math.max(Number(props.getProperty(key)) || 0, maxId_(name)) + 1, out = [];
  for (var i = 0; i < n; i++) out.push(start + i);
  props.setProperty(key, String(start + n - 1));
  return out;
}
/**
 * Run ONCE from the toolbar to turn old ids (P1, C1, Bmwh…) into 1, 2, 3 … in every tab.
 * Rows keep their order; links between tabs (category of a product, table of a bill, dishes inside bills) are updated.
 * Before running: make sure every device has finished syncing. After running: reload the app on every device.
 */
function renumberIds() {
  withLock_(function () {
    ensureSheets_();
    var maps = {}, rows = {}, names = Object.keys(SCHEMA);
    names.forEach(function (name) { rows[name] = read_(name); maps[name] = {}; rows[name].forEach(function (r, i) { maps[name][r.id] = String(i + 1); }); });
    names.forEach(function (name) {
      var h = SCHEMA[name], fk = FK_[name] || {};
      var out = rows[name].map(function (r) {
        r.id = maps[name][r.id];
        Object.keys(fk).forEach(function (col) { if (r[col] && maps[fk[col]][r[col]]) r[col] = maps[fk[col]][r[col]]; });
        if (name === 'Bills') {
          try { var its = JSON.parse(r.items || '[]'); its.forEach(function (i) { if (maps.Products[i.pid]) i.pid = maps.Products[i.pid]; }); r.items = JSON.stringify(its); } catch (e) {}
        }
        return h.map(function (k) { return r[k] == null ? '' : String(r[k]); });
      });
      var sh = sheet_(name), last = sh.getLastRow();
      if (last > 1) sh.getRange(2, 1, last - 1, sh.getLastColumn()).clearContent();
      if (out.length) sh.getRange(2, 1, out.length, h.length).setNumberFormat('@').setValues(out);
      PropertiesService.getScriptProperties().setProperty('seq_' + name, String(out.length));
    });
  });
}

function withLock_(fn) { var lock = LockService.getScriptLock(); lock.waitLock(20000); try { return fn(); } finally { lock.releaseLock(); } }
function sha_(text) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
}
function str_(v, n) { return String(v == null ? '' : v).slice(0, n); }
function int_(v) { v = Math.floor(Number(v)); return v > 0 && v < 1e7 ? v : ''; }
function isoDate_(days) { return new Date(Date.now() + days * 864e5).toISOString().slice(0, 10); }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
