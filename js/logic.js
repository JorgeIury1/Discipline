/* Regras do jogo: XP, níveis, títulos, sequência, conquistas */
window.Logic = (function () {
  const L = D.LIMITS;

  const pad = n => String(n).padStart(2, '0');
  const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  function addDays(key, n) {
    const [y, m, d] = key.split('-').map(Number);
    return dateKey(new Date(y, m - 1, d + n));
  }

  /* ---------- ENEM -> XP inicial ---------- */
  function enemXp(enem) {
    let total = 0;
    D.ENEM_AREAS.forEach(a => {
      const v = Number(enem[a.id]) || 0;
      total += a.tiers[v <= 15 ? 0 : v <= 30 ? 1 : 2];
    });
    return total;
  }

  /* ---------- Níveis (1 a 50) ---------- */
  function levelThreshold(n) {
    if (n <= 1) return 0;
    return Math.round(D.LEVEL_MAX_XP * Math.pow((n - 1) / (D.LEVEL_MAX - 1), D.LEVEL_CURVE));
  }
  function levelInfo(xp) {
    let lv = 1;
    while (lv < D.LEVEL_MAX && xp >= levelThreshold(lv + 1)) lv++;
    const cur = levelThreshold(lv);
    const next = lv >= D.LEVEL_MAX ? null : levelThreshold(lv + 1);
    const pct = next ? Math.min(100, Math.max(0, ((xp - cur) / (next - cur)) * 100)) : 100;
    return { level: lv, cur, next, pct, toNext: next ? next - xp : 0 };
  }
  function baseTitle(level) {
    let t = D.TITLES[0][1];
    D.TITLES.forEach(([lv, name]) => { if (level >= lv) t = name; });
    return t;
  }
  function titleFor(user) {
    const lv = levelInfo(user.xp || 0).level;
    if (lv >= D.LEVEL_MAX) return (user.customTitle || '').trim() || 'Lenda do Discipline';
    return baseTitle(lv);
  }

  /* ---------- Sequência ---------- */
  function currentStreak(user, today = dateKey()) {
    if (!user.lastDate) return 0;
    if (user.lastDate === today || user.lastDate === addDays(today, -1)) return user.streak || 0;
    return 0;
  }

  /* ---------- Formulário ---------- */
  function formXp(form, worst) {
    let h = 0;
    form.subjects.forEach(s => {
      h += (s.minutes / 60) * ((worst || []).includes(s.id) ? D.XP.hourDisliked : D.XP.hour);
    });
    const hours = Math.round(h);
    const questions = form.questions * D.XP.question;
    const essays = form.essays * D.XP.essay;
    return { hours, questions, essays, total: hours + questions + essays };
  }

  function validateForm(form, alreadyTodayMinutes = 0) {
    if (!form.subjects.length) return 'Adicione pelo menos uma matéria.';
    for (const s of form.subjects) {
      const name = D.SUBJECTS.find(x => x.id === s.id).name;
      if (!(s.minutes >= L.minPerSubject)) return `${name}: o mínimo é 30 minutos.`;
    }
    const total = form.subjects.reduce((a, s) => a + s.minutes, 0);
    if (total + alreadyTodayMinutes > L.maxMinutesDay)
      return alreadyTodayMinutes
        ? `O máximo é 20h de estudo por dia (você já enviou ${fmtMin(alreadyTodayMinutes)} hoje).`
        : 'O máximo é 20 horas de estudo no total.';
    if (!Number.isInteger(form.questions) || form.questions < 0 || form.questions > L.maxQuestions)
      return 'Questões: entre 0 e 1000.';
    if (!Number.isInteger(form.essays) || form.essays < 0 || form.essays > L.maxEssays)
      return 'Redações: entre 0 e 10.';
    return null;
  }

  /* Processa um envio. Retorna { patch, formDoc, summary } sem mexer no usuário original. */
  function processSubmission(user, form, dayForms, now = new Date()) {
    const date = dateKey(now);
    const xp = formXp(form, user.worst);
    const minutes = form.subjects.reduce((a, s) => a + s.minutes, 0);

    // agregado do dia (inclui envios anteriores de hoje)
    const dayMin = {};
    let dayQuestions = 0, dayMinutes = 0;
    [...dayForms, form].forEach(f => {
      dayQuestions += f.questions;
      f.subjects.forEach(s => { dayMin[s.id] = (dayMin[s.id] || 0) + s.minutes; dayMinutes += s.minutes; });
    });
    const daySubjects30 = Object.values(dayMin).filter(m => m >= 30).length;

    // sequência
    let streak = user.streak || 0;
    if (user.lastDate !== date) streak = user.lastDate === addDays(date, -1) ? streak + 1 : 1;
    const maxStreak = Math.max(user.maxStreak || 0, streak);
    const formsCount = (user.formsCount || 0) + 1;

    // conquistas
    const ctx = { form: { minutes, questions: form.questions }, hour: now.getHours(), dayMinutes, dayQuestions, daySubjects30, streak, formsCount };
    const have = user.achievements || {};
    const unlocked = D.ACHIEVEMENTS.filter(a => !have[a.id] && a.check(ctx));
    const achXp = unlocked.reduce((a, x) => a + x.xp, 0);
    const achievements = Object.assign({}, have);
    unlocked.forEach(a => { achievements[a.id] = date; });

    const subjectMinutes = Object.assign({}, user.subjectMinutes || {});
    form.subjects.forEach(s => { subjectMinutes[s.id] = (subjectMinutes[s.id] || 0) + s.minutes; });

    const xpBefore = user.xp || 0;
    const xpAfter = xpBefore + xp.total + achXp;
    const patch = {
      xp: xpAfter,
      totalMinutes: (user.totalMinutes || 0) + minutes,
      totalQuestions: (user.totalQuestions || 0) + form.questions,
      totalEssays: (user.totalEssays || 0) + form.essays,
      formsCount, streak, maxStreak, lastDate: date,
      subjectMinutes, achievements
    };
    const formDoc = {
      date, createdAt: now.getTime(),
      subjects: form.subjects, questions: form.questions, essays: form.essays,
      note: form.note || '', xp: xp.total + achXp, minutes
    };
    return {
      patch, formDoc,
      summary: {
        xp, achXp, unlocked, streak, minutes,
        levelBefore: levelInfo(xpBefore).level, levelAfter: levelInfo(xpAfter).level, xpAfter
      }
    };
  }

  /* ---------- Perfil novo ---------- */
  function newProfile({ nick, best, worst, enem }) {
    const initialXp = enemXp(enem);
    return {
      nick, nickLower: nick.toLowerCase(),
      best, worst, enem, initialXp, xp: initialXp,
      totalMinutes: 0, totalQuestions: 0, totalEssays: 0, formsCount: 0,
      streak: 0, maxStreak: 0, lastDate: '',
      subjectMinutes: {}, achievements: {}, customTitle: '',
      createdAt: Date.now()
    };
  }

  function fmtMin(m) {
    const h = Math.floor(m / 60), r = Math.round(m % 60);
    return h ? (r ? `${h}h${pad(r)}` : `${h}h`) : `${r}min`;
  }
  const fmtHours = m => (m / 60).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'h';

  return { dateKey, addDays, enemXp, levelThreshold, levelInfo, baseTitle, titleFor, currentStreak, formXp, validateForm, processSubmission, newProfile, fmtMin, fmtHours };
})();
