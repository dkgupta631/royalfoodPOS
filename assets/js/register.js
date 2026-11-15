/* Royalfood — registration flow: service → package → options → form → done.
   Edit PACKAGES and OPTIONS below to change names, prices and photos. */
(() => {
  const CFG = window.APP_CONFIG, BRAND = CFG.BRAND, $ = s => document.querySelector(s), page = $('#page');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ic = n => `<i data-lucide="${n}"></i>`, icons = () => window.lucide && lucide.createIcons();
  const money = n => Number(n).toLocaleString('en-US');
  const img = id => `https://images.unsplash.com/photo-${id}?w=1200&q=70`;
  const YEAR_MONTHS = 10; // a year costs 10 months

  const SERVICES = [
    { id: 'pos', icon: 'utensils-crossed', img: img('1552566626-52f8b828add9'), word: 'ระบบร้านอาหาร', name: 'ระบบร้านอาหาร', des: `บริหารและจัดการร้านอาหารได้ง่ายๆ ด้วย ${BRAND} ครบทุกฟีเจอร์ที่คุณต้องการ` },
    { id: 'queue', icon: 'users', img: img('1555396273-367ea4eb4db5'), word: 'ระบบจัดการคิว', name: 'ระบบคิวออนไลน์', des: 'ตัวช่วยที่จะช่วยจัดการคิวในร้านอาหารของคุณได้อย่างมีประสิทธิภาพ' }
  ];
  const PACKAGES = [
    { id: 1, word: 'Buffet', name: 'ร้านบุฟเฟต์', des: 'buffet Restaurant', price: 690, img: img('1555939594-58d7cb561ad1') },
    { id: 2, word: 'A la carte', name: 'อลาคาร์ท', des: 'A la carte Restaurant', price: 590, img: img('1504674900247-0877df9cc836') },
    { id: 3, word: 'Full Options', name: 'ตัวเลือกเต็มรูปแบบ', des: 'Full Options Restaurant', price: 1590, img: img('1414235077428-338989a2e8c0'), rec: true, all: true, tables: 20 },
    { id: 4, word: 'Queue', name: 'ระบบคิวออนไลน์', des: 'Queue Manager', price: 290, img: img('1555396273-367ea4eb4db5'), queue: true }
  ];
  /* price = baht per month; unit '' = on/off, otherwise counted */
  const OPTIONS = [
    { id: 'main', name: `ระบบหลัก (${BRAND})`, price: 0, fixed: true, text: 'หน้าหลัก หน้าขาย สินค้า โต๊ะและโซน พนักงาน รายงาน และการตั้งค่าร้าน ครบในระบบเดียว' },
    { id: 'print', name: 'ระบบพิมพ์แคชเชียร์ Free (USB)', price: 0, fixed: true, text: 'สำหรับพิมพ์ใบเสร็จ ใบแจ้ง และรายการอาหารที่ลูกค้าสั่ง' },
    { id: 'tables', name: 'จำนวนโต๊ะ', price: 5, unit: 'โต๊ะ', text: 'คำนวนค่าแพ็กเกจตามจำนวนโต๊ะ<br><br>- รายเดือนเพิ่มโต๊ะละ 5 บาทต่อเดือน<br>- รายปีเพิ่มโต๊ะละ 50 บาทต่อปี' },
    { id: 'qr', name: 'ลูกค้าสั่งอาหารเอง (QR Scan)', price: 10, unit: 'โต๊ะ', text: 'ลูกค้าสแกน QR Code บนโต๊ะเพื่อดูเมนูและสั่งอาหารผ่านสมาร์ทโฟน รายการส่งเข้าครัวโดยตรง<br><br>- รายเดือนเพิ่มโต๊ะละ 10 บาทต่อเดือน<br>- รายปีเพิ่มโต๊ะละ 100 บาทต่อปี' },
    { id: 'waiter', name: 'แอปพนักงาน (Waiter)', price: 50, unit: 'เครื่อง', text: 'เปิดโต๊ะ รับออเดอร์ และเช็คบิลที่โต๊ะลูกค้า ออเดอร์ส่งไปยังครัวแบบเรียลไทม์' },
    { id: 'kitchen', name: 'แอปครัว (Kitchen)', price: 50, unit: 'เครื่อง', text: 'รับออเดอร์จาก POS ลูกค้าสแกนสั่ง และแอปพนักงานแบบเรียลไทม์ พร้อมหมายเลขโต๊ะ รายการ จำนวน และสถานะ' },
    { id: 'printer', name: 'ระบบพิมพ์ (Printer)', price: 50, unit: 'เครื่อง', text: 'ระบบพิมพ์แยกครัว เหมาะสำหรับร้านที่มีเครื่องพิมพ์มากกว่า 1 เครื่อง แยกออเดอร์ไปยังเครื่องพิมพ์ตามประเภทอาหาร' },
    { id: 'stock', name: 'ระบบสินค้าคงคลัง', price: 200, text: 'ติดตามปริมาณสินค้าในคลังแบบเรียลไทม์ บันทึกการรับและจ่ายสินค้า ป้องกันสินค้าขาดหรือเกิน' },
    { id: 'member', name: 'ระบบสมาชิก', price: 390, text: 'สะสมแต้มทุกครั้งที่เช็คบิล เพื่อแลกของรางวัลหรือส่วนลด สร้างแรงจูงใจให้ลูกค้ากลับมาใช้บริการซ้ำ' },
    { id: 'owner', name: `แอปเจ้าของร้าน (${BRAND} Manager)`, price: 0, fixed: true, text: 'ดูยอดขายแบบเรียลไทม์และติดตามยอดขายได้จากทุกที่' }
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
  const typeTh = () => (S.type === 'year' ? 'รายปี' : 'รายเดือน');
  const go = h => { location.hash = '#' + h; };
  function toast(msg) { const el = document.createElement('div'); el.className = 'rg-toast'; el.textContent = msg; $('#toasts').appendChild(el); setTimeout(() => el.remove(), 3200); }

  const backBar = to => `<header class="bar"><button class="back" data-go="${to}">${ic('chevron-left')} กลับ</button></header>`;
  const V = {
    home: () => `<header class="bar"><span class="logo" data-logo></span><span><b>${esc(BRAND)}</b><small>Business Platform</small></span></header>
      <div class="wrap" style="padding:0"><section class="hero">
        <h1>เลือกบริการ<br>ที่เหมาะกับ<span>ธุรกิจคุณ</span></h1>
        <p>โซลูชันครบวงจรสำหรับธุรกิจร้านอาหาร ตั้งแต่การจัดการหน้าร้านไปจนถึงระบบคิวออนไลน์</p>
        <div class="stats"><div><b>5 ภาษา</b><small>รองรับการใช้งาน</small></div><div><b>QR Code</b><small>สั่งอาหารจากโต๊ะ</small></div><div><b>7 วัน</b><small>ทดลองใช้งานฟรี</small></div></div>
      </section></div>
      <div class="wrap"><div class="sec"><h2>บริการของเรา</h2><p>เลือกแพ็กเกจที่ตอบโจทย์ธุรกิจของคุณ</p></div>
        <div class="cards">${SERVICES.map((s, i) => `<button class="card" style="animation-delay:${i * .12}s" data-service="${s.id}">
          <div class="pic tall"><img alt="" loading="lazy" src="${s.img}"><span class="ico">${ic(s.icon)}</span></div>
          <div class="body"><h3>${esc(s.name)}</h3><p class="des">${esc(s.des)}</p><div class="go"><span>เริ่มต้นใช้งาน</span><span class="arr">${ic('arrow-right')}</span></div></div></button>`).join('')}</div>
        <div class="foot"><b><span data-logo></span>${esc(BRAND)}</b><br>© ${new Date().getFullYear()} ${esc(BRAND)} — All rights reserved</div></div>`,

    package: () => `${backBar('home')}
      <section class="hero blue"><div class="wrap"><span class="tag">${esc(BRAND.toUpperCase())}</span><h1>เลือก Package<br>ที่เหมาะกับร้านของคุณ</h1><p>เริ่มต้นใช้งานง่ายๆ เลือกแพ็คเกจที่ตอบโจทย์ธุรกิจของคุณ</p></div></section>
      <div class="wrap"><div class="cards">${PACKAGES.filter(p => !p.queue).map((p, i) => `<button class="card" style="animation-delay:${i * .12}s" data-pack="${p.id}">
        <div class="pic"><img alt="" loading="lazy" src="${p.img}">${p.rec ? `<span class="rec">${ic('star')} แนะนำ</span>` : ''}<span class="word">${esc(p.word)}</span></div>
        <div class="body"><h3>${esc(p.name)}</h3><p class="des">${esc(p.des)}</p>
          <div class="price">เริ่มต้นเดือนละ <b>${money(p.price)}</b> บาท</div>
          <div class="go"><span>เลือกแพ็คเกจนี้</span><span class="arr">${ic('arrow-right')}</span></div></div></button>`).join('')}</div></div>`,

    option: () => {
      const p = pack(); if (!p) return go('package');
      const m = monthly();
      const row = o => {
        const q = qty(o), on = q > 0, free = p.all || !o.price;
        const sub = o.fixed || (p.all && !o.unit) ? 'รวมในแพ็คเกจ' : p.all ? `รวม ${q} ${o.unit}` : o.price ? `${money(o.price)} บาท${o.unit ? ' / ' + o.unit : ''}` : 'ฟรี';
        return `<button class="opt ${on ? 'on' : ''}" data-opt="${o.id}"><span class="l"><b>${esc(o.name)}</b><small class="${free ? 'free' : ''}">${sub}</small></span>
          ${on && o.unit ? `<span class="q">${q}</span>` : ''}${on && cost(o) ? `<span class="sum">+${money(cost(o))} บาท</span>` : ''}
          ${on ? `<span class="ck">${ic('circle-check')}</span>` : `<span class="ch">${ic('chevron-right')}</span>`}</button>`;
      };
      return `${backBar(p.queue ? 'home' : 'package')}<div class="wrap">
        <div class="pk"><img alt="" src="${p.img}"><div><span class="tag">PACKAGE</span><h3>${esc(p.name)}</h3><p>เริ่มต้นเดือนละ <b>${money(p.price)}</b> บาท</p></div></div>
        ${p.queue ? '' : `<div class="head">${ic('layout-grid')}<span>ฟังก์ชั่นไหนที่ใช่สำหรับคุณ</span></div><div class="opts">${OPTIONS.map(row).join('')}</div>`}
        <div class="head">${ic('tag')}<span>เลือกประเภทแพ็คเกจ</span></div>
        <div class="types">
          <button class="type ${S.type === 'month' ? 'on' : ''}" data-type="month"><span>รายเดือน</span><b>${money(m)} <small>บาท</small></b><em></em></button>
          <button class="type ${S.type === 'year' ? 'on' : ''}" data-type="year"><i class="rib">คุ้มกว่า</i><span>รายปี</span><b>${money(m * YEAR_MONTHS)} <small>บาท</small></b><em>ประหยัด ${money(m * (12 - YEAR_MONTHS))} บาท</em></button>
        </div>
        <div class="submit"><button class="btn" data-next ${S.type ? '' : 'disabled'}>ลงทะเบียนใช้งาน ${ic('arrow-right')}</button></div></div>`;
    },

    form: () => {
      const p = pack(); if (!p || !S.type) return go(p ? 'option' : 'package');
      const f = S.form || {}, tables = p.queue ? '' : qty(OPTIONS.find(o => o.id === 'tables'));
      const field = (id, label, icon, attrs, hint = '') => `<div class="f" id="f_${id}"><label for="${id}">${label}<em></em></label><div class="in">${ic(icon)}<input id="${id}" value="${esc(f[id] || '')}" ${attrs}>${id === 'pw' ? `<button type="button" class="eye" data-eye aria-label="แสดงรหัสผ่าน">${ic('eye')}</button>` : ''}</div>${hint ? `<small>${hint}</small>` : ''}</div>`;
      return `${backBar('option')}<section class="hero blue"><div class="wrap"><span class="tag">${esc(BRAND.toUpperCase())}</span><h1>ลงทะเบียน</h1><p>กรอกข้อมูลเพื่อเริ่มต้นใช้งาน</p></div></section>
        <div class="wrap"><form class="fcard" id="regForm" novalidate>
          <div class="chip">${ic('package')}<span>แพ็คเกจ ${esc(p.name)} · ${typeTh()}</span><b>${money(total())} บาท</b></div>
          ${field('name', 'ชื่อ-นามสกุล', 'user', 'maxlength="80" autocomplete="name" placeholder="ชื่อ-นามสกุล"')}
          ${field('store', 'ชื่อร้าน', 'store', 'maxlength="80" placeholder="ชื่อ-ร้านอาหาร"', 'หากเป็นสาขาให้ระบุด้วย')}
          ${field('address', 'ที่อยู่ร้าน', 'map-pin', 'maxlength="200" autocomplete="street-address" placeholder="ที่อยู่ร้านอาหาร"')}
          ${p.queue ? '' : `<div class="f"><label>จำนวนโต๊ะ</label><div class="in">${ic('armchair')}<input value="${tables}" readonly aria-label="จำนวนโต๊ะ"></div><small>จำนวนโต๊ะที่เปิดให้ลูกค้านั่ง</small></div>`}
          ${field('email', 'อีเมล์', 'mail', 'type="email" maxlength="120" autocomplete="email" placeholder="example@mail.com"')}
          ${field('phone', 'หมายเลขโทรศัพท์มือถือ', 'phone', 'inputmode="numeric" maxlength="10" autocomplete="tel" placeholder="หมายเลขโทรศัพท์มือถือ 10 หลัก"')}
          ${field('user', 'ชื่อเข้าใช้งาน', 'at-sign', 'maxlength="30" autocomplete="username" placeholder="ตัวอักษรอังกฤษหรือตัวเลข 3-30 ตัว"')}
          ${field('pw', 'รหัสผ่าน', 'lock', 'type="password" maxlength="72" autocomplete="new-password" placeholder="อย่างน้อย 6 ตัวอักษร"')}
          ${DB.remote ? field('code', 'รหัสเชิญ', 'key-round', 'maxlength="60" autocomplete="off" placeholder="รหัสเชิญจากเจ้าของร้าน"') : '<div class="note">โหมดทดลอง — ข้อมูลจะถูกเก็บในเบราว์เซอร์นี้เท่านั้น จนกว่าจะเชื่อมต่อ Google Sheet</div>'}
          <div class="err" id="err"></div>
          <button class="btn" id="btnReg">ลงทะเบียนใช้งาน ${ic('arrow-right')}</button></form></div>`;
    },

    done: () => {
      const d = V.result; if (!d) return go('home');
      return `<div class="wrap view done"><div class="ok">${ic('check')}</div><h1>ลงทะเบียนสำเร็จ!</h1><p>ยินดีด้วย ท่านลงทะเบียนสำเร็จแล้ว</p><p>เริ่มใช้งานระบบร้านอาหาร ${esc(BRAND)} เลย</p>
        <span class="trial">${ic('gift')} ทดลองใช้งานฟรี 7 วัน</span>
        <div class="cred"><div class="row"><span>ชื่อเข้าใช้งาน</span><b>${esc(d.user)}</b></div>
          <div class="row"><span>รหัสผ่าน</span><b><span id="pwShow">••••••••</span><button type="button" class="eye" data-reveal aria-label="แสดงรหัสผ่าน">${ic('eye')}</button></b></div>
          <div class="row"><span>แพ็คเกจ</span><b>${esc(d.pkg)}</b></div></div>
        <button class="btn" data-enter>เข้าสู่ระบบ ${ic('arrow-right')}</button></div>`;
    }
  };

  function render() {
    const name = (location.hash.slice(1) || 'home');
    const html = (V[name] && name !== 'result' ? V[name] : V.home)();
    if (typeof html !== 'string') return; // a guard redirected
    page.innerHTML = name === 'done' ? html : `<div class="view">${html}</div>`;
    I18N.apply(page); icons(); window.scrollTo(0, 0);
  }

  /* option sheet */
  function sheet(o) {
    const p = pack(), locked = o.fixed || p.all, m = document.createElement('div');
    let n = qty(o);
    m.className = 'sheet-back';
    const draw = warn => {
      m.innerHTML = `<div class="sheet"><h3>${esc(o.name)}<button type="button" data-x aria-label="ปิด">${ic('x')}</button></h3><p class="txt">${o.text}</p>
        <div class="row"><span>ราคา</span>${locked || !o.price ? '<b class="free">รวมในแพ็คเกจ</b>' : `<b>${money(o.price)} บาท${o.unit ? ' / ' + o.unit : ''} ต่อเดือน</b>`}</div>
        ${locked ? `<button class="btn line" data-x>ปิด</button>` : o.unit ? `
          ${warn ? `<div class="warn">${ic('circle-alert')} กรุณาระบุจำนวนโต๊ะอย่างน้อย 1 โต๊ะ</div>` : ''}
          <div class="calc"><button type="button" data-d="-1" aria-label="ลด">${ic('minus')}</button><input inputmode="numeric" maxlength="3" value="${n}" aria-label="จำนวน"><button type="button" data-d="1" aria-label="เพิ่ม">${ic('plus')}</button></div>
          <div class="two"><button class="btn line" data-x>ยกเลิก</button><button class="btn" data-ok>ยืนยัน</button></div>` : `
          <div class="two"><button class="btn red" data-set="0" ${n ? '' : 'disabled'}>${ic('trash-2')} นำออก</button><button class="btn" data-set="1" ${n ? 'disabled' : ''}>${ic('circle-plus')} เพิ่ม</button></div>`}</div>`;
      icons();
    };
    const close = () => { m.classList.remove('show'); setTimeout(() => m.remove(), 250); };
    const save = v => { S.qty[o.id] = v; keep(); close(); render(); };
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

  /* form */
  const RULES = {
    name: v => v.trim() ? '' : 'กรุณากรอกชื่อ-นามสกุล',
    store: v => v.trim() ? '' : 'กรุณากรอกชื่อร้าน',
    address: v => v.trim() ? '' : 'กรุณากรอกที่อยู่ร้าน',
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Format Email ไม่ถูกต้อง',
    phone: v => /^\d{10}$/.test(v) ? '' : 'กรอกหมายเลข 10 หลัก',
    user: v => /^[\w.\-]{3,30}$/.test(v.trim()) ? '' : 'ใช้ a-z, 0-9, จุด, ขีด 3-30 ตัว',
    pw: v => v.length >= 6 ? '' : 'อย่างน้อย 6 ตัวอักษร',
    code: v => v.trim() ? '' : 'กรุณากรอกรหัสเชิญ'
  };
  const ERR_TH = { 'Username already exists': 'ชื่อเข้าใช้งานนี้ถูกใช้แล้ว', 'Invalid invite code': 'รหัสเชิญไม่ถูกต้อง', 'Invalid username': 'ชื่อเข้าใช้งานไม่ถูกต้อง', 'Failed to fetch': 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่อีกครั้ง' };
  function check(id) {
    const el = document.getElementById(id); if (!el) return true;
    const msg = RULES[id](el.value), f = document.getElementById('f_' + id);
    f.classList.toggle('bad', !!msg); f.querySelector('em').textContent = msg;
    return !msg;
  }
  async function submit() {
    const ids = Object.keys(RULES).filter(id => document.getElementById(id));
    const bad = ids.filter(id => !check(id));
    if (bad.length) { document.getElementById(bad[0]).focus(); return; }
    const val = id => document.getElementById(id).value, p = pack(), btn = $('#btnReg'), err = $('#err'), old = btn.innerHTML;
    const tables = p.queue ? 0 : qty(OPTIONS.find(o => o.id === 'tables'));
    const options = p.queue ? '' : OPTIONS.filter(o => qty(o) > 0 && !o.fixed).map(o => o.id + (o.unit ? ':' + qty(o) : '')).join(', ');
    const pkg = `${p.word} · ${typeTh()}`;
    err.classList.remove('show'); btn.disabled = true; btn.innerHTML = '<span class="spin"></span>';
    try {
      await DB.register({ username: val('user').trim(), password: val('pw'), name: val('name').trim(), store: val('store').trim(), code: DB.remote ? val('code').trim() : '',
        package: pkg, billing: S.type, price: total(), tables, options, email: val('email').trim(), phone: val('phone'), address: val('address').trim(), trialDays: 7 });
      V.result = { user: val('user').trim(), pw: val('pw'), pkg };
      try { sessionStorage.removeItem('rf_reg'); } catch (e) {}
      go('done');
    } catch (x) {
      btn.disabled = false; btn.innerHTML = old; icons();
      err.textContent = ERR_TH[x.message] || x.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'; err.classList.remove('show'); void err.offsetWidth; err.classList.add('show');
    }
  }

  document.addEventListener('click', e => {
    const q = s => e.target.closest(s);
    let el;
    if ((el = q('[data-go]'))) go(el.dataset.go);
    else if ((el = q('[data-service]'))) { if (el.dataset.service === 'queue') { S.pack = 4; S.qty = {}; S.type = ''; keep(); go('option'); } else go('package'); }
    else if ((el = q('[data-pack]'))) { if (S.pack !== +el.dataset.pack) { S.qty = {}; S.type = ''; } S.pack = +el.dataset.pack; keep(); go('option'); }
    else if ((el = q('.sheet-back'))) return;
    else if ((el = q('[data-opt]'))) sheet(OPTIONS.find(o => o.id === el.dataset.opt));
    else if ((el = q('[data-type]'))) { S.type = el.dataset.type; keep(); const y = window.scrollY; render(); window.scrollTo(0, y); }
    else if (q('[data-next]')) {
      const p = pack(), tb = OPTIONS.find(o => o.id === 'tables');
      if (!p.queue && qty(tb) < 1) { toast('กรุณาระบุจำนวนโต๊ะ'); sheet.warn = true; sheet(tb); } else go('form');
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
  window.addEventListener('hashchange', render);
  render();
})();
