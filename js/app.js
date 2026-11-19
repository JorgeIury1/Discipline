/* Discipline — interface */
(function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = n => Number(n || 0).toLocaleString('pt-BR');
  const subjName = id => (D.SUBJECTS.find(s => s.id === id) || { name: id }).name;

  /* ---------- preferências visuais (tema / fonte) ---------- */
  const FONTS = [['A-', 14], ['A', 16], ['A+', 18], ['A++', 20]];
  const Pref = {
    get() { try { return Object.assign({ theme: 'auto', font: 1 }, JSON.parse(localStorage.getItem('discipline.prefs') || '{}')); } catch (e) { return { theme: 'auto', font: 1 }; } },
    set(patch) { const p = Object.assign(Pref.get(), patch); try { localStorage.setItem('discipline.prefs', JSON.stringify(p)); } catch (e) {} Pref.apply(); },
    apply() {
      const p = Pref.get();
      const t = p.theme === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : p.theme;
      document.documentElement.dataset.theme = t;
      document.documentElement.style.fontSize = FONTS[p.font][1] + 'px';
    }
  };
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => Pref.get().theme === 'auto' && Pref.apply());

  /* ---------- ícones ---------- */
  const IC = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    edit: '<path d="M12 20h9"/><path d="M16.500 3.500a2.100 2.100 0 013 3L7 19l-4 1 1-4z"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0zM17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.400 15a1.700 1.700 0 00.300 1.800l.1.100a2 2 0 11-2.800 2.800l-.1-.1a1.700 1.700 0 00-1.800-.3 1.700 1.700 0 00-1 1.500V21a2 2 0 11-4 0v-.1a1.700 1.700 0 00-1.100-1.500 1.700 1.700 0 00-1.800.3l-.1.100a2 2 0 11-2.800-2.800l.1-.1a1.700 1.700 0 00.3-1.800 1.700 1.700 0 00-1.500-1H3a2 2 0 110-4h.1a1.700 1.700 0 001.500-1.100 1.700 1.700 0 00-.3-1.800l-.1-.1a2 2 0 112.800-2.800l.1.100a1.700 1.700 0 001.800.3H9a1.700 1.700 0 001-1.500V3a2 2 0 114 0v.1a1.700 1.700 0 001 1.500 1.700 1.700 0 001.800-.3l.1-.1a2 2 0 112.800 2.800l-.1.100a1.700 1.700 0 00-.3 1.800V9a1.700 1.700 0 001.500 1H21a2 2 0 110 4h-.1a1.700 1.700 0 00-1.500 1z"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>'
  };
  const icon = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${IC[n]}</svg>`;
  const logo = (cls = '') => `<img class="${cls}" src="assets/logo.svg" alt="">`;

  /* ---------- estado ---------- */
  const S = {
    uid: null, me: null, users: [], email: '',
    route: 'inicio', authMode: 'login', busy: false,
    reg: { step: 1, nick: '', email: '', password: '', best: [], worst: [], enem: {} },
    form: null, today: { minutes: 0, questions: 0 }, history: [], err: ''
  };
  const freshForm = () => ({ subjects: [], questions: 0, essays: 0, note: '' });

  let toastT;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2800);
  }

  /* ---------- carregamento ---------- */
  async function loadAll() {
    S.me = await Backend.getUser(S.uid);
    if (!S.me) throw new Error('Perfil não encontrado. Tente sair e entrar de novo.');
    S.users = await Backend.listUsers();
    S.email = await Backend.getEmail(S.uid);
    const day = await Backend.listDayForms(S.uid, Logic.dateKey());
    S.today = {
      minutes: day.reduce((a, f) => a + f.subjects.reduce((x, s) => x + s.minutes, 0), 0),
      questions: day.reduce((a, f) => a + f.questions, 0)
    };
    S.dayForms = day;
  }
  const sortedUsers = () => S.users.slice().sort((a, b) => Logic.levelInfo(b.xp).level - Logic.levelInfo(a.xp).level || b.xp - a.xp || a.nick.localeCompare(b.nick));
  const myRank = () => sortedUsers().findIndex(u => u.uid === S.uid) + 1;

  /* ---------- roteamento ---------- */
  const ROUTES = [['inicio', 'Início', 'home'], ['estudar', 'Estudar', 'edit'], ['conquistas', 'Conquistas', 'trophy'], ['perfil', 'Perfil', 'user'], ['ajustes', 'Ajustes', 'gear']];
  function parseRoute() { const r = (location.hash.replace(/^#\/?/, '') || 'inicio'); return ROUTES.some(x => x[0] === r) ? r : 'inicio'; }
  window.addEventListener('hashchange', async () => {
    S.route = parseRoute();
    if (!S.uid) return;
    if (S.route === 'inicio' || S.route === 'perfil') { try { await loadAll(); } catch (e) { /* mantém dados atuais */ } }
    if (S.route === 'perfil') S.history = await Backend.listForms(S.uid, 15).catch(() => []);
    render(); window.scrollTo(0, 0);
  });

  /* =====================================================================
     TELAS DE ENTRADA
  ===================================================================== */
  function modeNotice() {
    return Backend.mode === 'local'
      ? '<div class="notice"><b>Modo local:</b> os dados ficam só neste navegador. Para ranking compartilhado com os amigos, configure o Firebase (veja o README).</div>' : '';
  }
  function themeBtn() {
    const dark = document.documentElement.dataset.theme === 'dark';
    return `<button class="btn icon-btn ghost" data-act="toggle-theme" aria-label="Alternar tema claro/escuro" title="Tema">${dark ? '☀️' : '🌙'}</button>`;
  }

  function viewAuth() {
    const login = S.authMode === 'login';
    return `<div class="auth"><div class="auth-box">
      <div class="auth-head"><div class="brand">${logo()}Discipline</div>${themeBtn()}</div>
      ${modeNotice()}
      ${login ? viewLogin() : viewRegister()}
    </div></div>`;
  }
  function viewLogin() {
    return `<div class="card">
      <h1>Entrar</h1><p class="muted">Bora estudar? Entre na sua conta.</p><br>
      ${S.err ? `<div class="err" role="alert">${esc(S.err)}</div>` : ''}
      <form data-form="login" novalidate>
        <div class="field"><label for="l-email">E-mail</label><input id="l-email" name="email" type="email" autocomplete="email" required></div>
        <div class="field"><label for="l-pw">Senha</label><input id="l-pw" name="password" type="password" autocomplete="current-password" required></div>
        <button class="btn primary block" ${S.busy ? 'disabled' : ''}>${S.busy ? 'Entrando…' : 'Entrar'}</button>
      </form>
      <p class="switch">Ainda não tem conta? <button class="link" data-act="auth-mode" data-v="register">Cadastre-se</button></p>
    </div>`;
  }

  function viewRegister() {
    const r = S.reg;
    const steps = `<div class="steps" aria-label="Etapa ${r.step} de 3">${[1, 2, 3].map(i => `<i class="${i <= r.step ? 'on' : ''}"></i>`).join('')}</div>`;
    const err = S.err ? `<div class="err" role="alert">${esc(S.err)}</div>` : '';
    if (r.step === 1) return `<div class="card">
      <h1>Criar conta</h1><p class="muted">Etapa 1 de 3 · seus dados</p>${steps}${err}
      <form data-form="reg1" novalidate>
        <div class="field"><label for="r-nick">Nick</label><input id="r-nick" name="nick" type="text" maxlength="16" autocomplete="username" value="${esc(r.nick)}" required>
          <span class="hint">3 a 16 caracteres (letras, números, _ . -). Exclusivo: ninguém pode ter o mesmo nick.</span></div>
        <div class="field"><label for="r-email">E-mail</label><input id="r-email" name="email" type="email" autocomplete="email" value="${esc(r.email)}" required></div>
        <div class="field"><label for="r-pw">Senha</label><input id="r-pw" name="password" type="password" autocomplete="new-password" minlength="6" value="${esc(r.password)}" required>
          <span class="hint">Mínimo de 6 caracteres.</span></div>
        <button class="btn primary block" ${S.busy ? 'disabled' : ''}>${S.busy ? 'Verificando…' : 'Continuar'}</button>
      </form>
      <p class="switch">Já tem conta? <button class="link" data-act="auth-mode" data-v="login">Entrar</button></p></div>`;

    if (r.step === 2) {
      const chip = (id, kind) => {
        const list = kind === 'best' ? r.best : r.worst, other = kind === 'best' ? r.worst : r.best;
        return `<button type="button" class="chip ${kind === 'worst' ? 'bad' : ''} ${list.includes(id) ? 'on' : ''}" data-act="pref" data-kind="${kind}" data-id="${id}" ${other.includes(id) ? 'disabled' : ''} aria-pressed="${list.includes(id)}">${subjName(id)}</button>`;
      };
      return `<div class="card">
        <h1>Suas preferências</h1><p class="muted">Etapa 2 de 3 · matérias</p>${steps}${err}
        <div class="field"><span class="label">Em quais matérias você é melhor? <span class="muted">(até 3 · opcional)</span></span>
          <div class="chips">${D.SUBJECTS.map(s => chip(s.id, 'best')).join('')}</div></div>
        <div class="field"><span class="label">Em quais você é pior? <span class="muted">(de 1 a 3 · obrigatório)</span></span>
          <div class="chips">${D.SUBJECTS.map(s => chip(s.id, 'worst')).join('')}</div>
          <span class="hint">Nas matérias em que você vai pior, cada hora de estudo vale <b>120 XP</b> em vez de 100. Uma matéria não pode estar nas duas listas.</span></div>
        <div class="two"><button class="btn" data-act="reg-back">Voltar</button><button class="btn primary" data-act="reg-next2">Continuar</button></div></div>`;
    }
    const xp = Logic.enemXp(Object.fromEntries(D.ENEM_AREAS.map(a => [a.id, Number(r.enem[a.id]) || 0])));
    return `<div class="card">
      <h1>Seu ENEM 2026</h1><p class="muted">Etapa 3 de 3 · número de acertos em cada área</p>${steps}${err}
      <form data-form="reg3" novalidate>
        <div class="enem-grid">${D.ENEM_AREAS.map(a => `<div class="field"><label for="e-${a.id}">${a.name}</label>
          <input id="e-${a.id}" name="${a.id}" data-enem type="number" inputmode="numeric" min="1" max="45" value="${esc(r.enem[a.id] ?? '')}" placeholder="1 a 45" required></div>`).join('')}</div>
        <div class="xp-preview"><span>XP inicial</span><span id="enem-xp">${xp} XP</span></div><br>
        <div class="two"><button type="button" class="btn" data-act="reg-back">Voltar</button><button class="btn primary" ${S.busy ? 'disabled' : ''}>${S.busy ? 'Criando…' : 'Criar conta'}</button></div>
      </form></div>`;
  }

  /* =====================================================================
     SHELL
  ===================================================================== */
  function viewShell() {
    const nav = ROUTES.map(([id, label, ic]) => `<a href="#/${id}" class="${S.route === id ? 'on' : ''}" ${S.route === id ? 'aria-current="page"' : ''}>${icon(ic)}<span>${label}</span></a>`).join('');
    const lv = Logic.levelInfo(S.me.xp);
    return `<div class="app">
      <aside class="side"><div class="brand">${logo()}Discipline</div><nav aria-label="Principal">${nav}</nav>
        <div class="foot small muted">Nível ${lv.level} · ${num(S.me.xp)} XP<br>${Backend.mode === 'local' ? 'Modo local' : 'Online'}</div></aside>
      <header class="top"><div class="brand">${logo()}Discipline</div><span class="xp-pill">Nv ${lv.level} · ${num(S.me.xp)} XP</span></header>
      <main id="view">${viewPage()}</main>
      <nav class="tabs" aria-label="Principal">${nav}</nav>
    </div>`;
  }
  function viewPage() {
    switch (S.route) {
      case 'estudar': return viewStudy();
      case 'conquistas': return viewAch();
      case 'perfil': return viewProfile();
      case 'ajustes': return viewSettings();
      default: return viewHome();
    }
  }

  /* ---------- Início + ranking ---------- */
  function viewHome() {
    const me = S.me, lv = Logic.levelInfo(me.xp), streak = Logic.currentStreak(me);
    const users = sortedUsers();
    const rows = users.map((u, i) => {
      const l = Logic.levelInfo(u.xp), st = Logic.currentStreak(u), p = i + 1;
      return `<div class="row ${u.uid === S.uid ? 'me' : ''}">
        <div class="pos ${p <= 3 ? 'p' + p : ''}">${p <= 3 ? ['🥇', '🥈', '🥉'][p - 1] : p}</div>
        <div style="min-width:0"><div class="nm">${esc(u.nick)}${u.uid === S.uid ? ' <span class="muted small">(você)</span>' : ''}</div><div class="tt">${esc(Logic.titleFor(u))}</div></div>
        <div class="lv">Nv ${l.level}</div>
        <div class="meta"><span><b>${num(u.xp)}</b> XP</span><span><b>${Logic.fmtHours(u.totalMinutes || 0)}</b> estudadas</span><span>🔥 <b>${st}</b> dia${st === 1 ? '' : 's'}</span></div>
      </div>`;
    }).join('');
    return `<div class="card hero">
      <div class="who"><div class="badge-lv"><div><small>NÍVEL</small><b>${lv.level}</b></div></div>
        <div style="min-width:0"><div class="nick">Olá, ${esc(me.nick)}!</div><div class="title">${esc(Logic.titleFor(me))}</div></div></div>
      <div><div class="bar" role="progressbar" aria-valuenow="${Math.round(lv.pct)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${lv.pct}%"></i></div>
        <div class="xpline"><span>${num(me.xp)} XP</span><span>${lv.next ? `faltam ${num(lv.toNext)} XP para o nível ${lv.level + 1}` : 'Nível máximo!'}</span></div></div>
      <div class="mini-stats"><div><b>${Logic.fmtMin(S.today.minutes)}</b><span>hoje</span></div><div><b>🔥 ${streak}</b><span>sequência</span></div><div><b>#${myRank()}</b><span>no ranking</span></div></div>
      <a class="btn primary" href="#/estudar">Registrar estudo de hoje</a>
    </div>
    <div class="rank-head"><h2>Ranking</h2><span class="muted small">${users.length} perfil${users.length === 1 ? '' : 's'} · por nível</span></div>
    <div class="rank">${rows || '<div class="empty">Ninguém por aqui ainda.</div>'}</div>`;
  }

  /* ---------- Estudar (formulário diário) ---------- */
  function viewStudy() {
    if (!S.form) S.form = freshForm();
    const f = S.form;
    const avail = D.SUBJECTS.filter(s => !f.subjects.some(x => x.id === s.id));
    return `<div class="page-head"><div><h1>Formulário diário</h1><p class="muted">Conte o que você estudou hoje e ganhe XP.</p></div></div>
    <div class="card">
      ${S.err ? `<div class="err" role="alert">${esc(S.err)}</div>` : ''}
      <div class="field"><label for="add-subj">1. Quais matérias você estudou?</label>
        <div class="add-row"><select id="add-subj" ${avail.length ? '' : 'disabled'}>${avail.length ? avail.map(s => `<option value="${s.id}">${s.name}</option>`).join('') : '<option>Todas adicionadas</option>'}</select>
          <button class="btn primary" data-act="add-subj" ${avail.length ? '' : 'disabled'}>Adicionar</button></div>
        <span class="hint">Mínimo de 30 min por matéria · máximo de 20h no total${S.today.minutes ? ` (hoje você já enviou ${Logic.fmtMin(S.today.minutes)})` : ''}.</span></div>
      <div id="subj-list">${f.subjects.map(subjCard).join('')}</div>
      <div class="summary" aria-live="polite"><div><b id="sum-time">–</b><span>tempo</span></div><div><b id="sum-xp">–</b><span>XP estimado</span></div><div><b id="sum-q">–</b><span>questões</span></div></div>
      <div class="two">
        <div class="field"><label for="f-q">2. Questões feitas</label><input id="f-q" data-f="questions" type="number" inputmode="numeric" min="0" max="1000" value="${f.questions}"><span class="hint">0 a 1000</span></div>
        <div class="field"><label for="f-e">3. Redações feitas</label><input id="f-e" data-f="essays" type="number" inputmode="numeric" min="0" max="10" value="${f.essays}"><span class="hint">0 a 10</span></div>
      </div>
      <div class="field"><label for="f-n">4. Nota <span class="muted">(opcional)</span></label><textarea id="f-n" data-f="note" maxlength="300" placeholder="Um comentário sobre o seu dia de estudo…">${esc(f.note)}</textarea></div>
      <button class="btn primary block" data-act="submit-form" ${S.busy ? 'disabled' : ''}>${S.busy ? 'Enviando…' : 'Enviar formulário'}</button>
    </div>`;
  }
  function subjCard(s, i) {
    const bad = (S.me.worst || []).includes(s.id);
    return `<div class="subj-card"><div class="nm"><span>${subjName(s.id)}${bad ? '<span class="bonus">+20% XP</span>' : ''}</span>
      <button class="btn icon-btn ghost danger" data-act="rm-subj" data-i="${i}" aria-label="Remover ${subjName(s.id)}">${icon('x')}</button></div>
      <div class="time"><label>Horas<input data-f="h" data-i="${i}" type="number" inputmode="numeric" min="0" max="20" value="${s.h}"></label>
      <label>Minutos<input data-f="m" data-i="${i}" type="number" inputmode="numeric" min="0" max="59" value="${s.m}"></label></div></div>`;
  }
  function parsedForm() {
    const f = S.form;
    return {
      subjects: f.subjects.map(s => ({ id: s.id, minutes: (Number(s.h) || 0) * 60 + (Number(s.m) || 0) })),
      questions: f.questions === '' ? 0 : Number(f.questions), essays: f.essays === '' ? 0 : Number(f.essays), note: (f.note || '').trim()
    };
  }
  function updateSummary() {
    const p = parsedForm(), min = p.subjects.reduce((a, s) => a + s.minutes, 0), xp = Logic.formXp(p, S.me.worst);
    const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
    set('#sum-time', Logic.fmtMin(min) || '0min'); set('#sum-xp', '+' + num(xp.total)); set('#sum-q', num(p.questions));
  }

  async function submitStudy() {
    const p = parsedForm();
    const err = Logic.validateForm(p, S.today.minutes);
    if (err) { S.err = err; render(); window.scrollTo(0, 0); return; }
    S.err = ''; S.busy = true; render();
    try {
      const dayForms = await Backend.listDayForms(S.uid, Logic.dateKey());
      const res = Logic.processSubmission(S.me, p, dayForms, new Date());
      await Backend.submitForm(S.uid, res.formDoc, res.patch);
      S.form = freshForm();
      await loadAll();
      S.busy = false; render();
      showResult(res.summary);
    } catch (e) { S.busy = false; S.err = e.message; render(); }
  }

  function showResult(s) {
    const un = s.unlocked.map(a => `<div class="gain"><span>${a.icon} ${esc(a.name)}</span><b>+${a.xp} XP</b></div>`).join('');
    modal(`<h2>Estudo registrado! 🎉</h2>
      <div class="gain"><span>⏱ Horas de estudo</span><b>+${num(s.xp.hours)} XP</b></div>
      ${s.xp.questions ? `<div class="gain"><span>✏️ Questões</span><b>+${num(s.xp.questions)} XP</b></div>` : ''}
      ${s.xp.essays ? `<div class="gain"><span>📄 Redações</span><b>+${num(s.xp.essays)} XP</b></div>` : ''}
      ${un ? `<p class="label" style="margin-top:.8rem">Conquistas desbloqueadas</p>${un}` : ''}
      <div class="gain total"><span>Total</span><span>+${num(s.xp.total + s.achXp)} XP</span></div>
      ${s.levelAfter > s.levelBefore ? `<div class="lvup">⬆️ Subiu para o nível ${s.levelAfter}!<br><span style="font-weight:600">${esc(Logic.titleFor(S.me))}</span></div>` : ''}
      <p class="muted small">🔥 Sequência: ${s.streak} dia${s.streak === 1 ? '' : 's'}</p><br>
      <button class="btn primary block" data-act="close-modal">Fechar</button>`);
  }

  /* ---------- Conquistas ---------- */
  function viewAch() {
    const have = S.me.achievements || {};
    const n = D.ACHIEVEMENTS.filter(a => have[a.id]).length;
    const xp = D.ACHIEVEMENTS.filter(a => have[a.id]).reduce((a, x) => a + x.xp, 0);
    return `<div class="page-head"><div><h1>Conquistas</h1><p class="muted">${n} de ${D.ACHIEVEMENTS.length} · ${num(xp)} XP ganhos</p></div></div>
    <div class="bar solid" style="margin-bottom:1rem"><i style="width:${n / D.ACHIEVEMENTS.length * 100}%;background:var(--gold)"></i></div>
    <div class="ach-grid">${D.ACHIEVEMENTS.map(a => `<div class="ach ${have[a.id] ? 'done' : 'locked'}"><div class="ic">${a.icon}</div>
      <div><b>${a.name}</b> <span class="xp">+${a.xp} XP</span><div class="d">${a.desc}</div>${have[a.id] ? `<div class="small" style="color:var(--ok);font-weight:700">✓ ${new Date(have[a.id] + 'T12:00').toLocaleDateString('pt-BR')}</div>` : ''}</div></div>`).join('')}</div>`;
  }

  /* ---------- Perfil ---------- */
  function viewProfile() {
    const me = S.me, lv = Logic.levelInfo(me.xp), streak = Logic.currentStreak(me);
    const maxMin = Math.max(1, ...Object.values(me.subjectMinutes || {}));
    const subs = D.SUBJECTS.filter(s => (me.subjectMinutes || {})[s.id]).sort((a, b) => me.subjectMinutes[b.id] - me.subjectMinutes[a.id]);
    const stat = (v, l) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`;
    const custom = lv.level >= D.LEVEL_MAX ? `<div class="card sect"><h2>Seu título</h2><p class="muted small">Nível 50 atingido! Escolha o seu próprio título.</p><br>
      <form data-form="title" class="add-row"><input type="text" name="title" maxlength="32" value="${esc(me.customTitle)}" placeholder="Ex.: Lenda do vestibular" aria-label="Seu título"><button class="btn primary">Salvar</button></form></div>` : '';
    return `<div class="page-head"><div><h1>Perfil</h1><p class="muted">${esc(me.nick)} · ${esc(Logic.titleFor(me))}</p></div>
      <button class="btn primary" data-act="export" ${S.busy ? 'disabled' : ''}>📷 Exportar perfil</button></div>
    <div class="card"><div class="stat-grid">
      ${stat('Nv ' + lv.level, 'nível')}${stat(num(me.xp), 'XP total')}${stat('#' + myRank(), 'ranking')}
      ${stat(Logic.fmtHours(me.totalMinutes || 0), 'horas de estudo')}${stat(num(me.totalQuestions), 'questões')}${stat(num(me.totalEssays), 'redações')}
      ${stat('🔥 ' + streak, 'sequência atual')}${stat(me.maxStreak || 0, 'sequência máxima')}${stat(me.formsCount || 0, 'formulários enviados')}
    </div></div>
    ${custom}
    <div class="card sect"><h2>Matérias estudadas</h2>${subs.length ? subs.map(s => `<div class="sub-row"><span>${s.name}</span><div class="bar"><i style="width:${me.subjectMinutes[s.id] / maxMin * 100}%"></i></div><b class="small">${Logic.fmtHours(me.subjectMinutes[s.id])}</b></div>`).join('') : '<p class="muted">Você ainda não registrou nenhum estudo.</p>'}</div>
    <div class="card sect"><h2>Preferências</h2>
      <p class="label">Melhores matérias</p><div class="chips" style="margin:.4rem 0 .8rem">${(me.best || []).length ? me.best.map(id => `<span class="chip static">${subjName(id)}</span>`).join('') : '<span class="muted small">Nenhuma escolhida</span>'}</div>
      <p class="label">Piores matérias <span class="muted">(bônus de 120 XP/h)</span></p><div class="chips" style="margin-top:.4rem">${(me.worst || []).map(id => `<span class="chip static">${subjName(id)}</span>`).join('')}</div></div>
    <div class="card sect"><h2>ENEM 2026 · XP inicial: ${num(me.initialXp)}</h2><div class="stat-grid" style="margin-top:.7rem">${D.ENEM_AREAS.map(a => stat(((me.enem || {})[a.id] ?? '–') + '/45', a.name)).join('')}</div></div>
    <div class="card sect"><h2>Títulos</h2><div class="titles" style="margin-top:.7rem">${D.TITLES.map(([l, t], i) => {
      const next = D.TITLES[i + 1], cur = lv.level >= l && (!next || lv.level < next[0]);
      return `<div class="${cur ? 'cur' : lv.level < l ? 'lock' : ''}"><span>${cur ? '▶ ' : ''}${esc(l === 50 && cur ? Logic.titleFor(me) : t)}</span><span>nível ${l}+</span></div>`;
    }).join('')}</div></div>
    <div class="card sect"><h2>Histórico recente</h2><div class="hist" style="margin-top:.7rem">${S.history.length ? S.history.map(h => `<div><div class="t"><span>${new Date(h.date + 'T12:00').toLocaleDateString('pt-BR')} · ${Logic.fmtMin(h.minutes)}</span><span>+${num(h.xp)} XP</span></div>
      <div class="small muted">${h.subjects.map(s => subjName(s.id)).join(', ')} · ${h.questions} questões · ${h.essays} redações</div>${h.note ? `<div class="n">“${esc(h.note)}”</div>` : ''}</div>`).join('') : '<p class="muted">Sem envios ainda.</p>'}</div></div>
    <div class="card sect"><h2>Conta</h2><p class="muted" style="margin-top:.4rem">Nick: <b style="color:var(--text)">${esc(me.nick)}</b><br>E-mail: <b style="color:var(--text)">${esc(S.email)}</b><br>Conta criada em ${new Date(me.createdAt).toLocaleDateString('pt-BR')}</p></div>`;
  }

  async function exportProfile() {
    S.busy = true;
    try {
      const canvas = await Card.render(S.me, myRank(), S.users.length);
      const blob = await Card.toBlob(canvas);
      const url = URL.createObjectURL(blob);
      const file = `discipline-${S.me.nick}.png`;
      modal(`<h2>Seu cartão de perfil</h2><img class="preview" src="${url}" alt="Cartão de perfil de ${esc(S.me.nick)}"><br><br>
        <div class="two"><a class="btn primary" href="${url}" download="${esc(file)}">⬇ Baixar PNG</a><button class="btn" data-act="close-modal">Fechar</button></div>
        <p class="muted small" style="margin-top:.7rem">No celular, se não baixar, segure a imagem e escolha “Salvar imagem”.</p>`);
    } catch (e) { toast('Não foi possível gerar a imagem.'); }
    S.busy = false;
  }

  /* ---------- Ajustes ---------- */
  function viewSettings() {
    const p = Pref.get();
    return `<div class="page-head"><div><h1>Ajustes</h1><p class="muted">Aparência e acessibilidade</p></div></div>
    <div class="card"><div class="field"><span class="label">Tema</span><div class="seg" role="group" aria-label="Tema">
      ${[['light', '☀️ Claro'], ['dark', '🌙 Escuro'], ['auto', 'Auto']].map(([v, l]) => `<button data-act="theme" data-v="${v}" class="${p.theme === v ? 'on' : ''}" aria-pressed="${p.theme === v}">${l}</button>`).join('')}</div></div>
      <div class="field" style="margin:0"><span class="label">Tamanho da fonte</span><div class="seg" role="group" aria-label="Tamanho da fonte">
      ${FONTS.map(([l], i) => `<button data-act="font" data-v="${i}" class="${p.font === i ? 'on' : ''}" aria-pressed="${p.font === i}">${l}</button>`).join('')}</div></div></div>
    <div class="card sect"><h2>Conta</h2><p class="muted" style="margin:.4rem 0 1rem">Conectado como <b style="color:var(--text)">${esc(S.me.nick)}</b></p><button class="btn danger" data-act="logout">Sair da conta</button></div>
    ${Backend.mode === 'local' ? '<div class="notice sect"><b>Modo local:</b> os dados ficam só neste navegador. Configure o Firebase (README) para compartilhar o ranking com seus amigos.</div>' : ''}`;
  }

  /* ---------- modal ---------- */
  function modal(html) {
    closeModal();
    const m = document.createElement('div'); m.className = 'modal'; m.id = 'modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    m.innerHTML = `<div class="box">${html}</div>`;
    m.addEventListener('click', e => { if (e.target === m) closeModal(); });
    document.body.appendChild(m);
  }
  function closeModal() { const m = $('#modal'); if (m) m.remove(); }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  /* ---------- render ---------- */
  function render() {
    const root = $('#root');
    const active = document.activeElement && document.activeElement.id;
    root.innerHTML = S.uid && S.me ? viewShell() : viewAuth();
    if (S.route === 'estudar' && S.uid) updateSummary();
    if (active) { const e = document.getElementById(active); if (e && e.focus) try { e.focus(); } catch (_) {} }
  }

  /* =====================================================================
     EVENTOS
  ===================================================================== */
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const act = el.dataset.act;
    switch (act) {
      case 'toggle-theme': Pref.set({ theme: document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark' }); render(); break;
      case 'theme': Pref.set({ theme: el.dataset.v }); render(); break;
      case 'font': Pref.set({ font: Number(el.dataset.v) }); render(); break;
      case 'auth-mode': S.authMode = el.dataset.v; S.err = ''; S.reg.step = 1; render(); break;
      case 'pref': {
        const { kind, id } = el.dataset, list = S.reg[kind], i = list.indexOf(id);
        if (i >= 0) list.splice(i, 1); else if (list.length < D.LIMITS.maxPrefs) list.push(id); else toast('Máximo de 3 matérias.');
        S.err = ''; render(); break;
      }
      case 'reg-back': S.reg.step--; S.err = ''; render(); break;
      case 'reg-next2':
        if (!S.reg.worst.length) { S.err = 'Escolha pelo menos 1 matéria em que você vai pior.'; render(); break; }
        S.reg.step = 3; S.err = ''; render(); break;
      case 'add-subj': {
        const v = $('#add-subj').value; if (v && !S.form.subjects.some(s => s.id === v)) S.form.subjects.push({ id: v, h: 0, m: 30 });
        S.err = ''; render(); break;
      }
      case 'rm-subj': S.form.subjects.splice(Number(el.dataset.i), 1); render(); break;
      case 'submit-form': submitStudy(); break;
      case 'close-modal': closeModal(); break;
      case 'export': exportProfile(); break;
      case 'logout':
        await Backend.logout(); S.uid = null; S.me = null; S.form = null; S.authMode = 'login'; S.err = ''; location.hash = '#/inicio'; render(); break;
    }
  });

  document.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.enem !== undefined) {
      S.reg.enem[t.name] = t.value;
      const xp = Logic.enemXp(Object.fromEntries(D.ENEM_AREAS.map(a => [a.id, Number(S.reg.enem[a.id]) || 0])));
      const o = $('#enem-xp'); if (o) o.textContent = xp + ' XP';
      return;
    }
    const f = t.dataset.f; if (!f || !S.form) return;
    if (f === 'h' || f === 'm') S.form.subjects[Number(t.dataset.i)][f] = t.value;
    else S.form[f] = t.value;
    updateSummary();
  });

  document.addEventListener('submit', async e => {
    const form = e.target.closest('form[data-form]'); if (!form) return;
    e.preventDefault();
    const kind = form.dataset.form, fd = Object.fromEntries(new FormData(form));
    if (S.busy) return;
    try {
      if (kind === 'login') {
        S.err = ''; S.busy = true; render();
        if (!fd.email || !fd.password) throw new Error('Preencha e-mail e senha.');
        S.uid = await Backend.login(fd.email, fd.password);
        await enter();
      } else if (kind === 'reg1') {
        Object.assign(S.reg, { nick: fd.nick.trim(), email: fd.email.trim(), password: fd.password });
        const r = S.reg;
        if (!/^[A-Za-z0-9_.-]{3,16}$/.test(r.nick)) throw new Error('Nick: 3 a 16 caracteres, só letras, números, _ . -');
        if (!/^\S+@\S+\.\S+$/.test(r.email)) throw new Error('Digite um e-mail válido.');
        if (r.password.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
        S.err = ''; S.busy = true; render();
        if (await Backend.nickTaken(r.nick)) throw new Error(`O nick "${r.nick}" já está em uso. Escolha outro.`);
        S.reg.step = 2; S.busy = false; render(); return;
      } else if (kind === 'reg3') {
        const r = S.reg;
        for (const a of D.ENEM_AREAS) {
          const v = Number(fd[a.id]); r.enem[a.id] = fd[a.id];
          if (!Number.isInteger(v) || v < 1 || v > 45) throw new Error(`${a.name}: informe de 1 a 45 acertos.`);
        }
        S.err = ''; S.busy = true; render();
        const enem = Object.fromEntries(D.ENEM_AREAS.map(a => [a.id, Number(r.enem[a.id])]));
        const profile = Logic.newProfile({ nick: r.nick, best: r.best, worst: r.worst, enem });
        S.uid = await Backend.register({ nick: r.nick, email: r.email, password: r.password, profile });
        const xp = profile.initialXp;
        S.reg = { step: 1, nick: '', email: '', password: '', best: [], worst: [], enem: {} };
        await enter();
        modal(`<h2>Conta criada! 🎖️</h2><p>Seu ENEM de 2026 rendeu <b>${num(xp)} XP</b> iniciais.</p><br><p class="muted">Agora é só estudar e subir no ranking.</p><br><button class="btn primary block" data-act="close-modal">Bora!</button>`);
        return;
      } else if (kind === 'title') {
        const title = (fd.title || '').trim().slice(0, 32);
        await Backend.updateUser(S.uid, { customTitle: title });
        S.me.customTitle = title; render(); toast('Título salvo!'); return;
      }
    } catch (err) { S.busy = false; S.err = err.message || 'Erro inesperado.'; if (S.uid && !S.me) S.uid = null; render(); return; }
  });

  async function enter() {
    await loadAll();
    S.busy = false; S.err = ''; S.route = parseRoute(); S.form = freshForm();
    if (S.route === 'perfil') S.history = await Backend.listForms(S.uid, 15).catch(() => []);
    render();
  }

  /* ---------- início ---------- */
  (async function init() {
    Pref.apply();
    try {
      const uid = await Backend.restore();
      if (uid) { S.uid = uid; await enter(); return; }
    } catch (e) { S.err = e.message; }
    render();
  })();
})();
