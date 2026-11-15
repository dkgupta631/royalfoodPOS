(() => {
  const CFG = window.APP_CONFIG, $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icons = () => window.lucide && lucide.createIcons();
  if (DB.session()) { location.replace('app.html'); return; }

  $('#domain').textContent = CFG.DOMAIN; $('#yr').textContent = new Date().getFullYear();
  $('#company').textContent = CFG.COMPANY; $('#splashSub').textContent = CFG.SUBTITLE;
  $('#demoNote').hidden = DB.remote; $('#codeField').hidden = !DB.remote; $('#rc').required = DB.remote;

  /* hero slider */
  const N = 4, imgs = [...document.querySelectorAll('#shot img')], bars = $('#bars');
  let cur = -1, timer;
  bars.innerHTML = Array.from({ length: N }, (_, i) => `<button type="button" aria-label="Slide ${i + 1}" data-i="${i}"></button>`).join('');
  function show(i) {
    cur = (i + N) % N;
    $('#heroTitle').textContent = t('s' + (cur + 1) + 't'); $('#heroSub').textContent = t('s' + (cur + 1) + 's');
    const ht = $('#heroText'); ht.classList.remove('swap'); void ht.offsetWidth; ht.classList.add('swap');
    imgs.forEach((im, k) => im.classList.toggle('on', k === cur));
    [...bars.children].forEach((b, k) => { b.className = ''; void b.offsetWidth; b.className = k < cur ? 'done' : k === cur ? 'on' : ''; });
    clearTimeout(timer); timer = setTimeout(() => show(cur + 1), 5000);
  }
  bars.addEventListener('click', e => { const b = e.target.closest('button'); if (b) show(+b.dataset.i); });

  /* language */
  const lang = $('#lang');
  function drawLang() {
    $('#langCur').textContent = I18N.cur.label;
    $('#langMenu').innerHTML = I18N.LANGS.map(l => `<button type="button" data-l="${l.code}" class="${l.code === I18N.lang ? 'on' : ''}">${l.label}</button>`).join('');
  }
  lang.addEventListener('click', e => {
    const b = e.target.closest('[data-l]');
    if (b) { I18N.set(b.dataset.l); drawLang(); show(cur); lang.classList.remove('open'); return; }
    lang.classList.toggle('open');
  });
  document.addEventListener('click', e => { if (!lang.contains(e.target)) lang.classList.remove('open'); });

  /* helpers */
  function fail(el, msg) { el.textContent = msg; el.classList.add('show'); const c = $('#card'); c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); }
  function busy(btn, on) { btn.disabled = on; if (on) { btn.dataset.h = btn.innerHTML; btn.innerHTML = '<span class="spinner"></span>'; } else if (btn.dataset.h) { btn.innerHTML = btn.dataset.h; icons(); } }
  function enter() { $('#splash').classList.add('show'); setTimeout(() => location.replace('app.html'), 1100); }
  async function doLogin(u, p, btn, errEl) {
    errEl.classList.remove('show'); busy(btn, true);
    try { await DB.login(u, p); enter(); return true; }
    catch (e) { busy(btn, false); fail(errEl, e.message === 'Failed to fetch' ? 'Cannot reach the server. Check your connection.' : e.message); return false; }
  }

  /* previously logged in */
  function drawRecent() {
    const r = DB.recent();
    $('#recentWrap').hidden = !r.length;
    $('#recent').innerHTML = r.map(a => `<div class="acct"><span class="logo">${LOGO_SVG}</span><span class="who"><b>${esc(a.name || a.username)}</b><small>${esc(a.username)}</small></span>
      <button type="button" class="btn-soft" data-login="${esc(a.username)}" data-name="${esc(a.name || a.username)}">${esc(t('login'))} <i data-lucide="arrow-right"></i></button>
      <button type="button" class="x" data-forget="${esc(a.username)}" aria-label="Remove"><i data-lucide="x"></i></button></div>`).join('');
    icons();
  }
  $('#recent').addEventListener('click', e => {
    const f = e.target.closest('[data-forget]'), l = e.target.closest('[data-login]');
    if (f) { DB.forget(f.dataset.forget); drawRecent(); }
    if (l) passModal(l.dataset.login, l.dataset.name);
  });
  function passModal(username, name) {
    const m = document.createElement('div'); m.className = 'modal-back';
    m.innerHTML = `<form class="modal center"><h3 style="font-size:28px">${esc(t('enterPass'))}</h3><p class="sub">${esc(name)}</p>
      <div class="f"><input type="password" required autocomplete="current-password" aria-label="Password" style="padding:15px;font-size:17px"></div><div class="err"></div>
      <div class="actions center"><button class="btn violet">${esc(t('signIn'))}</button><button type="button" class="btn gray" data-close>${esc(t('close'))}</button></div></form>`;
    document.body.appendChild(m); requestAnimationFrame(() => m.classList.add('show'));
    const inp = m.querySelector('input'); setTimeout(() => inp.focus(), 100);
    const close = () => { m.classList.remove('show'); setTimeout(() => m.remove(), 200); };
    m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) close(); });
    m.querySelector('form').addEventListener('submit', async e => {
      e.preventDefault();
      if (await doLogin(username, inp.value, m.querySelector('.btn.violet'), m.querySelector('.err'))) close();
    });
  }

  /* forms */
  $('#loginForm').addEventListener('submit', e => { e.preventDefault(); doLogin($('#u').value, $('#p').value, $('#btnLogin'), $('#err')); });
  $('#regForm').addEventListener('submit', async e => {
    e.preventDefault(); const btn = $('#btnReg'), er = $('#rerr'); er.classList.remove('show'); busy(btn, true);
    try { await DB.register({ name: $('#rn').value.trim(), store: $('#rs').value.trim(), username: $('#ru').value, password: $('#rp').value, code: $('#rc').value.trim() }); enter(); }
    catch (x) { busy(btn, false); fail(er, x.message); }
  });
  document.addEventListener('click', e => {
    const go = e.target.closest('[data-go]'), eye = e.target.closest('[data-eye]');
    if (go) { const reg = go.dataset.go === 'reg'; $('#regForm').hidden = !reg; $('#loginForm').hidden = reg; }
    if (eye) { const i = document.getElementById(eye.dataset.eye), sh = i.type === 'password'; i.type = sh ? 'text' : 'password'; eye.innerHTML = `<i data-lucide="${sh ? 'eye-off' : 'eye'}"></i>`; icons(); }
  });

  I18N.apply(); drawLang(); drawRecent(); show(0); icons();
})();
