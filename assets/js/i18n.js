/* Shared: logo, languages, translations */
const LOGO_SVG = `<img src="assets/img/logo.png" alt="" decoding="async">`; // the brand mark (assets/img/logo.png)

const I18N = (() => {
  const LANGS = [
    { code: 'th', label: 'ไทย', cc: 'th' }, { code: 'km', label: 'ខ្មែរ', cc: 'kh' }, { code: 'lo', label: 'ລາວ', cc: 'la' },
    { code: 'zh', label: '中文', cc: 'cn' }, { code: 'en', label: 'EN', cc: 'us' }
  ];
  /* image flags: emoji flags do not render on Windows */
  LANGS.forEach(l => { l.flag = `<img class="flag" alt="" src="assets/img/flags/${l.cc}.svg">`; });
  const D = {
    en: {
      online: 'Online', tagline: 'Smart Restaurant Platform', live: 'LIVE', liveSales: 'Live sales',
      cloudDb: 'Cloud database', cloudDbSub: 'Secure online backup',
      s1t: 'Easy Restaurant Management', s1s: 'A POS system designed specifically for restaurants',
      s2t: 'Queue — Online Queue Booking', s2s: 'Customers book queues via mobile, reduce wait time, increase sales',
      s3t: 'Real-time Sales Reports', s3s: 'Track sales and analyze data anytime, anywhere',
      s4t: 'QR Code Table Ordering', s4s: 'Guests scan, order and the kitchen sees it instantly',
      welcome: 'Welcome back', signIn: 'Sign In', toUse: 'to use {b} POS', prev: 'Previously logged in', login: 'Login',
      orOther: 'or login with another account', username: 'Username', password: 'Password',
      phUser: 'Enter your username', phPass: 'Enter your password', noAcc: "Don't have an account?", register: 'Register',
      haveAcc: 'Already have an account?', createAcc: 'Create account', joinUs: 'Get started', fullName: 'Full name', storeName: 'Store name',
      invite: 'Invite code', enterPass: 'Enter password', close: 'Close', rights: 'All rights reserved.',
      home: 'Home', pos: 'POS', pos3d: 'POS 3D', goods: 'Goods', tables: 'Table and zone', inventory: 'Inventory', member: 'Member', logs: 'Log up',
      openShift: 'Open shift', initDrawer: 'Initial drawer', expDate: 'Expired date', pkg: 'Package', report: 'Report problems',
      call: 'Call', overtime: 'Overtime', backup: 'Download data backup', download: 'Download', closeShift: 'Close shift', shiftOpen: 'Shift is open',
      table: 'Table', bill: 'Bill', callQueue: 'Call Queue', reserve: 'Reserve', detail: 'Detail', timeStarted: 'Time started', timeSpent: 'Time spent',
      seats: 'Seats', itemNumber: 'Item number', timeSpending: 'Time spending', startPrice: 'Starting price', taxDisc: 'Taxes and discounts',
      netPrice: 'Net price', add: 'Add', qrcode: 'QRcode', cancel: 'Cancel', move: 'Move', status: 'Status', invoice: 'Invoice', checkout: 'Check Out',
      items: 'Items', price: 'Price', number: 'Number', total: 'Total', itemsUnit: 'Items', save: 'Save', delete: 'Delete', confirm: 'Confirm',
      search: 'Search…', logout: 'Log out', settings: 'Settings', noData: 'Nothing here yet'
    },
    th: {
      online: 'ออนไลน์', tagline: 'แพลตฟอร์มร้านอาหารอัจฉริยะ', liveSales: 'ยอดขายสด', cloudDb: 'ฐานข้อมูลคลาวด์',
      s1t: 'จัดการร้านอาหารได้ง่าย', s1s: 'ระบบ POS ที่ออกแบบมาเพื่อร้านอาหารโดยเฉพาะ',
      s2t: 'Queue — จองคิวออนไลน์', s2s: 'ลูกค้าจองคิวผ่านมือถือ ลดเวลารอ เพิ่มยอดขาย',
      s3t: 'รายงานยอดขายแบบเรียลไทม์', s3s: 'ติดตามยอดขายและวิเคราะห์ข้อมูลได้ทุกที่ทุกเวลา',
      s4t: 'สั่งอาหารด้วย QR Code', s4s: 'ลูกค้าสแกน สั่งอาหาร ครัวเห็นทันที',
      welcome: 'ยินดีต้อนรับกลับ', signIn: 'เข้าสู่ระบบ', toUse: 'เพื่อใช้งาน {b} POS', prev: 'เคยเข้าสู่ระบบ', login: 'เข้าสู่ระบบ',
      orOther: 'หรือเข้าสู่ระบบด้วยบัญชีอื่น', username: 'ชื่อผู้ใช้', password: 'รหัสผ่าน', phUser: 'กรอกชื่อผู้ใช้', phPass: 'กรอกรหัสผ่าน',
      noAcc: 'ยังไม่มีบัญชี?', register: 'สมัครสมาชิก', haveAcc: 'มีบัญชีอยู่แล้ว?', createAcc: 'สร้างบัญชี', joinUs: 'เริ่มต้นใช้งาน',
      fullName: 'ชื่อ-นามสกุล', storeName: 'ชื่อร้าน', invite: 'รหัสเชิญ', enterPass: 'กรอกรหัสผ่าน', close: 'ปิด', rights: 'สงวนลิขสิทธิ์',
      home: 'หน้าหลัก', pos: 'ขายหน้าร้าน', pos3d: 'ขายหน้าร้าน 3D', goods: 'สินค้า', tables: 'โต๊ะและโซน', inventory: 'คลังสินค้า', member: 'สมาชิก', logs: 'บันทึก',
      openShift: 'เปิดกะ', initDrawer: 'เงินทอนเริ่มต้น', expDate: 'วันหมดอายุ', pkg: 'แพ็กเกจ', report: 'แจ้งปัญหา', call: 'โทร', overtime: 'นอกเวลา',
      backup: 'ดาวน์โหลดข้อมูลสำรอง', download: 'ดาวน์โหลด', closeShift: 'ปิดกะ', shiftOpen: 'เปิดกะอยู่',
      table: 'โต๊ะ', bill: 'บิล', callQueue: 'เรียกคิว', reserve: 'จองโต๊ะ', detail: 'รายละเอียด', timeStarted: 'เวลาเริ่ม', timeSpent: 'เวลาที่ใช้',
      seats: 'ที่นั่ง', itemNumber: 'จำนวนรายการ', timeSpending: 'ค่าใช้จ่าย', startPrice: 'ราคาเริ่มต้น', taxDisc: 'ภาษีและส่วนลด', netPrice: 'ราคาสุทธิ',
      add: 'เพิ่ม', qrcode: 'คิวอาร์โค้ด', cancel: 'ยกเลิก', move: 'ย้าย', status: 'สถานะ', invoice: 'ใบแจ้งหนี้', checkout: 'ชำระเงิน',
      items: 'รายการ', price: 'ราคา', number: 'จำนวน', total: 'รวม', itemsUnit: 'รายการ', save: 'บันทึก', delete: 'ลบ', confirm: 'ยืนยัน',
      search: 'ค้นหา…', logout: 'ออกจากระบบ', settings: 'ตั้งค่า', noData: 'ยังไม่มีข้อมูล'
    },
    zh: {
      online: '在线', tagline: '智能餐厅平台', liveSales: '实时销售', cloudDb: '云数据库',
      s1t: '轻松管理餐厅', s1s: '专为餐厅设计的 POS 系统', s2t: 'Queue — 在线排队预约', s2s: '顾客手机取号，减少等待，提升销量',
      s3t: '实时销售报表', s3s: '随时随地跟踪销售并分析数据', s4t: '扫码点餐', s4s: '顾客扫码下单，厨房即时接收',
      welcome: '欢迎回来', signIn: '登录', toUse: '使用 {b} POS', prev: '最近登录', login: '登录', orOther: '或使用其他账号登录',
      username: '用户名', password: '密码', phUser: '请输入用户名', phPass: '请输入密码', noAcc: '还没有账号？', register: '注册',
      haveAcc: '已有账号？', createAcc: '创建账号', joinUs: '开始使用', fullName: '姓名', storeName: '店铺名称', invite: '邀请码', enterPass: '输入密码', close: '关闭', rights: '版权所有。',
      home: '首页', pos: '收银', pos3d: '收银 3D', goods: '商品', tables: '餐桌与区域', inventory: '库存', member: '会员', logs: '日志',
      openShift: '开班', initDrawer: '初始备用金', expDate: '到期日', pkg: '套餐', report: '问题反馈', table: '餐桌', bill: '账单', callQueue: '叫号', reserve: '预订',
      detail: '详情', seats: '座位', netPrice: '应付金额', add: '添加', cancel: '取消', move: '换桌', status: '状态', invoice: '账单', checkout: '结账',
      items: '项目', price: '价格', number: '数量', total: '合计', save: '保存', delete: '删除', confirm: '确认', logout: '退出登录', settings: '设置'
    },
    km: {
      online: 'អនឡាញ', tagline: 'ប្រព័ន្ធភោជនីយដ្ឋានឆ្លាតវៃ', liveSales: 'ការលក់ផ្ទាល់', cloudDb: 'មូលដ្ឋានទិន្នន័យក្លោដ',
      s1t: 'គ្រប់គ្រងភោជនីយដ្ឋានយ៉ាងងាយស្រួល', s1s: 'ប្រព័ន្ធ POS រចនាឡើងសម្រាប់ភោជនីយដ្ឋានជាពិសេស', s2t: 'Queue — ប្រព័ន្ធជួរអនឡាញ', s2s: 'កក់ជួរតាមទូរស័ព្ទ កាត់បន្ថយពេលរង់ចាំ និងបង្កើនការលក់',
      s3t: 'របាយការណ៍លក់ផ្ទាល់', s3s: 'មើល និងវិភាគការលក់បានគ្រប់ពេល គ្រប់ទីកន្លែង', s4t: 'កុម្ម៉ង់តាម QR Code', s4s: 'ភ្ញៀវស្កេន កុម្ម៉ង់ ហើយផ្ទះបាយទទួលបានភ្លាមៗ',
      welcome: 'សូមស្វាគមន៍ការត្រឡប់មកវិញ', signIn: 'ចូលប្រើ', toUse: 'ដើម្បីប្រើ {b} POS', prev: 'គណនីដែលធ្លាប់ចូល', login: 'ចូល', orOther: 'ឬចូលដោយគណនីផ្សេង',
      username: 'ឈ្មោះអ្នកប្រើ', password: 'ពាក្យសម្ងាត់', phUser: 'បញ្ចូលឈ្មោះអ្នកប្រើ', phPass: 'បញ្ចូលពាក្យសម្ងាត់', noAcc: 'មិនទាន់មានគណនី?', register: 'ចុះឈ្មោះ',
      haveAcc: 'មានគណនីរួចហើយ?', createAcc: 'បង្កើតគណនី', joinUs: 'ចាប់ផ្តើម', fullName: 'ឈ្មោះពេញ', storeName: 'ឈ្មោះហាង', invite: 'លេខកូដអញ្ជើញ', enterPass: 'បញ្ចូលពាក្យសម្ងាត់', close: 'បិទ', rights: 'រក្សាសិទ្ធិគ្រប់យ៉ាង។',
      home: 'ទំព័រដើម', pos: 'POS', pos3d: 'POS 3D', goods: 'ទំនិញ', tables: 'តុ និងតំបន់', inventory: 'ស្តុក', member: 'សមាជិក', logs: 'កំណត់ហេតុ',
      openShift: 'បើកវេន', initDrawer: 'ប្រាក់ដើមក្នុងថត', expDate: 'ថ្ងៃផុតកំណត់', pkg: 'កញ្ចប់', report: 'រាយការណ៍បញ្ហា', table: 'តុ', bill: 'វិក្កយបត្រ', callQueue: 'ហៅជួរ', reserve: 'កក់',
      detail: 'លម្អិត', seats: 'កៅអី', netPrice: 'តម្លៃសុទ្ធ', add: 'បន្ថែម', cancel: 'បោះបង់', move: 'ផ្លាស់ទី', status: 'ស្ថានភាព', invoice: 'វិក្កយបត្រ', checkout: 'គិតលុយ',
      items: 'មុខទំនិញ', price: 'តម្លៃ', number: 'ចំនួន', total: 'សរុប', save: 'រក្សាទុក', delete: 'លុប', confirm: 'បញ្ជាក់', logout: 'ចេញ', settings: 'ការកំណត់'
    },
    lo: {
      online: 'ອອນລາຍ', welcome: 'ຍິນດີຕ້ອນຮັບກັບມາ', signIn: 'ເຂົ້າສູ່ລະບົບ', login: 'ເຂົ້າສູ່ລະບົບ', username: 'ຊື່ຜູ້ໃຊ້', password: 'ລະຫັດຜ່ານ',
      register: 'ລົງທະບຽນ', close: 'ປິດ', home: 'ໜ້າຫຼັກ', goods: 'ສິນຄ້າ', member: 'ສະມາຊິກ', table: 'ໂຕະ', bill: 'ບິນ', add: 'ເພີ່ມ',
      cancel: 'ຍົກເລີກ', price: 'ລາຄາ', total: 'ລວມ', save: 'ບັນທຶກ', delete: 'ລຶບ', confirm: 'ຢືນຢັນ', logout: 'ອອກຈາກລະບົບ'
    }
  };
  /* Language: the visitor's own choice wins; otherwise the country of their IP address; otherwise DEFAULT_LANG. */
  const CFG = window.APP_CONFIG || {}, DEF = D[CFG.DEFAULT_LANG] ? CFG.DEFAULT_LANG : 'th';
  let lang = DEF, manual = false, auto = false;
  try {
    const s = localStorage.getItem('rf_lang'), a = sessionStorage.getItem('rf_lang_auto');
    if (D[s]) { lang = s; manual = true; } else if (D[a]) { lang = a; auto = true; }
  } catch (e) {}
  async function country() {
    const get = async (url, pick) => {
      const c = new AbortController(), tm = setTimeout(() => c.abort(), 4000);
      try { return pick(await (await fetch(url, { signal: c.signal, cache: 'no-store' })).text()); } finally { clearTimeout(tm); }
    };
    try { return await get('https://api.country.is/', x => JSON.parse(x).country); }
    catch (e) { return get('https://www.cloudflare.com/cdn-cgi/trace', x => (x.match(/^loc=(\w\w)/m) || [])[1]); }
  }
  function detect() {
    if (manual || auto || CFG.LANG_BY_IP === false) return;
    country().then(c => {
      const l = (CFG.LANG_BY_COUNTRY || {})[String(c || '').toUpperCase()] || DEF;
      if (!D[l] || manual) return;
      try { sessionStorage.setItem('rf_lang_auto', l); } catch (e) {}
      if (l !== lang) { lang = l; apply(); window.dispatchEvent(new Event('rf-lang')); }
    }).catch(() => {});
  }
  const brand = () => (window.APP_CONFIG || {}).BRAND || 'Royalfood';
  const t = k => ((D[lang] && D[lang][k]) || D.en[k] || k).replace('{b}', brand());
  function apply(root = document) {
    document.documentElement.lang = lang;
    root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    root.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    root.querySelectorAll('[data-logo]').forEach(el => { if (!el.firstChild) el.innerHTML = LOGO_SVG; });
    root.querySelectorAll('[data-brand]').forEach(el => { el.textContent = brand(); });
  }
  function set(l) { if (!D[l]) return; lang = l; manual = true; try { localStorage.setItem('rf_lang', l); } catch (e) {} apply(); }
  detect();
  return { t, apply, set, LANGS, get lang() { return lang; }, get cur() { return LANGS.find(x => x.code === lang); } };
})();
const t = I18N.t;
