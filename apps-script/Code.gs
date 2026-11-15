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
  Tables: ['id', 'zoneId', 'name', 'seats', 'sort'],
  Categories: ['id', 'name', 'sort'],
  Products: ['id', 'categoryId', 'name', 'price', 'stock', 'active', 'code', 'nameEn', 'image', 'desc', 'descEn', 'buffet', 'byWeight', 'extras'],
  Bills: ['id', 'tableId', 'tableName', 'status', 'seats', 'openedAt', 'closedAt', 'subtotal', 'discount', 'tax', 'total', 'payMethod', 'received', 'memberId', 'cashier', 'shiftId', 'items'],
  Members: ['id', 'name', 'phone', 'points', 'createdAt'],
  Shifts: ['id', 'status', 'openedAt', 'closedAt', 'openingCash', 'closingCash', 'expectedCash', 'user'],
  Logs: ['id', 'time', 'user', 'action', 'detail'],
  Queue: ['id', 'number', 'name', 'people', 'status', 'createdAt'],
  Reservations: ['id', 'name', 'phone', 'tableId', 'time', 'people', 'status']
};
const DATA_SHEETS = Object.keys(SCHEMA).filter(function (s) { return s !== 'Users'; });

function setup() {
  ensureSheets_();
  if (!read_('Users').length) {
    upsert_('Users', { id: 'U1', username: 'admin', passwordHash: sha_('admin:admin123'), name: 'Admin', store: 'Royalfood Restaurant',
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
    }
    if (!auth_(b.token)) return out_({ ok: false, error: 'auth' });
    switch (b.action) {
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
  return !!u;
}
function login_(b) {
  var name = String(b.username || '').trim().toLowerCase();
  var u = read_('Users').filter(function (x) { return x.username.toLowerCase() === name && x.passwordHash === b.hash; })[0];
  if (!u) { Utilities.sleep(800); return { ok: false, error: 'Incorrect username or password' }; }
  return newSession_(u);
}
function register_(b) {
  if (String(b.code || '') !== REGISTER_CODE) return { ok: false, error: 'Invalid invite code' };
  var name = String(b.username || '').trim();
  if (!/^[\w.-]{3,30}$/.test(name) || !/^[0-9a-f]{64}$/.test(String(b.hash))) return { ok: false, error: 'Invalid username' };
  return withLock_(function () {
    if (read_('Users').some(function (x) { return x.username.toLowerCase() === name.toLowerCase(); })) return { ok: false, error: 'Username already exists' };
    var u = { id: 'U' + Date.now().toString(36), username: name, passwordHash: b.hash, name: String(b.name || name).slice(0, 80), store: String(b.store || '').slice(0, 80),
      role: 'staff', package: str_(b.package, 60) || 'Standard', expireDate: isoDate_(b.package ? 7 : 365), createdAt: new Date().toISOString(),
      phone: str_(b.phone, 20).replace(/[^\d+]/g, ''), email: str_(b.email, 120), address: str_(b.address, 200), tables: int_(b.tables), billing: b.billing === 'year' ? 'year' : b.billing === 'month' ? 'month' : '',
      price: int_(b.price), options: str_(b.options, 200) };
    upsert_('Users', u);
    return newSession_(u);
  });
}

/* ---------- customer QR menu ---------- */
function menu_(b) {
  var tb = read_('Tables').filter(function (x) { return x.id === b.tableId; })[0];
  if (!tb) return { ok: false, error: 'Table not found' };
  return { ok: true, table: tb.name, categories: read_('Categories'), products: read_('Products').filter(function (p) { return p.active !== 'false'; }) };
}
function order_(b) {
  var tb = read_('Tables').filter(function (x) { return x.id === b.tableId; })[0];
  if (!tb) return { ok: false, error: 'Table not found' };
  var prods = read_('Products'), cart = (b.items || []).slice(0, 50);
  var bill = read_('Bills').filter(function (x) { return x.tableId === tb.id && x.status === 'open'; })[0] ||
    { id: 'B' + Date.now().toString(36), tableId: tb.id, tableName: tb.name, status: 'open', seats: tb.seats, openedAt: new Date().toISOString(), discount: 0, cashier: 'QR', items: '[]' };
  var items = JSON.parse(bill.items || '[]');
  cart.forEach(function (c) {
    var p = prods.filter(function (x) { return x.id === c.pid && x.active !== 'false'; })[0], q = Math.floor(Number(c.qty));
    if (p && q > 0 && q <= 99) items.push({ pid: p.id, name: p.name, price: Number(p.price) || 0, qty: q, status: 'ordered', src: 'qr' });
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
function withLock_(fn) { var lock = LockService.getScriptLock(); lock.waitLock(20000); try { return fn(); } finally { lock.releaseLock(); } }
function sha_(text) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
}
function str_(v, n) { return String(v == null ? '' : v).slice(0, n); }
function int_(v) { v = Math.floor(Number(v)); return v > 0 && v < 1e7 ? v : ''; }
function isoDate_(days) { return new Date(Date.now() + days * 864e5).toISOString().slice(0, 10); }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
