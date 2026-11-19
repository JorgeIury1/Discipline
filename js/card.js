/* Exporta o perfil como imagem (cartão PNG) */
window.Card = (function () {
  const W = 1080, H = 1350;

  function loadLogo() {
    return new Promise(res => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = 'assets/logo.svg';
    });
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function fit(ctx, text, maxW, size, weight) {
    let s = size;
    do { ctx.font = `${weight} ${s}px system-ui, "Segoe UI", Roboto, sans-serif`; s -= 2; } while (ctx.measureText(text).width > maxW && s > 24);
  }

  async function render(user, rank, total) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const F = (w, s) => `${w} ${s}px system-ui, "Segoe UI", Roboto, sans-serif`;
    const lv = Logic.levelInfo(user.xp);

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0a1630'); bg.addColorStop(1, '#1a5fd6');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // brilho decorativo
    const glow = ctx.createRadialGradient(W - 100, 120, 20, W - 100, 120, 520);
    glow.addColorStop(0, 'rgba(120,180,255,.35)'); glow.addColorStop(1, 'rgba(120,180,255,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

    // cabeçalho
    const logo = await loadLogo();
    if (logo) ctx.drawImage(logo, 60, 50, 110, 110);
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'alphabetic';
    ctx.font = F(800, 56); ctx.fillText('Discipline', 190, 120);
    ctx.font = F(500, 26); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillText('estudo em grupo gamificado', 192, 154);

    // cartão principal
    ctx.fillStyle = 'rgba(255,255,255,.1)'; rr(ctx, 50, 200, W - 100, 260, 36); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 2; ctx.stroke();

    // medalhão do nível
    const cx = 170, cy = 330;
    const ring = ctx.createLinearGradient(cx - 80, cy - 80, cx + 80, cy + 80);
    ring.addColorStop(0, '#ffd45e'); ring.addColorStop(1, '#f59e0b');
    ctx.fillStyle = ring; ctx.beginPath(); ctx.arc(cx, cy, 80, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0a1630'; ctx.beginPath(); ctx.arc(cx, cy, 66, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd45e'; ctx.textAlign = 'center';
    ctx.font = F(600, 24); ctx.fillText('NÍVEL', cx, cy - 20);
    ctx.fillStyle = '#fff'; ctx.font = F(800, 64); ctx.fillText(String(lv.level), cx, cy + 40);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#fff'; fit(ctx, user.nick, 740, 78, 800); ctx.fillText(user.nick, 280, 322);
    ctx.fillStyle = '#9cc4ff'; fit(ctx, Logic.titleFor(user), 740, 40, 600); ctx.fillText(Logic.titleFor(user), 282, 376);

    // barra de XP
    const bx = 282, by = 410, bw = 700;
    ctx.fillStyle = 'rgba(255,255,255,.18)'; rr(ctx, bx, by, bw, 18, 9); ctx.fill();
    ctx.fillStyle = '#ffd45e'; rr(ctx, bx, by, Math.max(18, bw * lv.pct / 100), 18, 9); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = F(500, 22);
    ctx.fillText(`${user.xp.toLocaleString('pt-BR')} XP` + (lv.next ? `  ·  faltam ${lv.toNext.toLocaleString('pt-BR')} p/ o nível ${lv.level + 1}` : '  ·  nível máximo'), bx, by + 48);

    // estatísticas
    const streak = Logic.currentStreak(user);
    const stats = [
      ['Horas de estudo', Logic.fmtHours(user.totalMinutes || 0)],
      ['Ranking', `#${rank} de ${total}`],
      ['Sequência atual', `${streak} dia${streak === 1 ? '' : 's'}`],
      ['Maior sequência', `${user.maxStreak || 0} dia${(user.maxStreak || 0) === 1 ? '' : 's'}`],
      ['Questões', (user.totalQuestions || 0).toLocaleString('pt-BR')],
      ['Redações', String(user.totalEssays || 0)]
    ];
    const gw = (W - 100 - 40) / 3, gh = 150;
    stats.forEach((s, i) => {
      const x = 50 + (i % 3) * (gw + 20), y = 495 + Math.floor(i / 3) * (gh + 20);
      ctx.fillStyle = 'rgba(255,255,255,.1)'; rr(ctx, x, y, gw, gh, 28); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = F(500, 24); ctx.fillText(s[0], x + 28, y + 46);
      ctx.fillStyle = '#fff'; fit(ctx, s[1], gw - 50, 52, 800); ctx.fillText(s[1], x + 28, y + 108);
    });

    // matérias estudadas
    let y = 855;
    ctx.fillStyle = '#fff'; ctx.font = F(700, 34); ctx.fillText('Matérias estudadas', 60, y);
    y += 24;
    const subs = D.SUBJECTS.filter(s => (user.subjectMinutes || {})[s.id])
      .sort((a, b) => user.subjectMinutes[b.id] - user.subjectMinutes[a.id]).slice(0, 9);
    ctx.font = F(600, 26);
    let x = 60;
    if (!subs.length) { ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillText('Nenhuma ainda', 60, y + 40); y += 50; }
    subs.forEach(s => {
      const label = `${s.name} · ${Logic.fmtHours(user.subjectMinutes[s.id])}`;
      const w = ctx.measureText(label).width + 40;
      if (x + w > W - 60) { x = 60; y += 64; }
      ctx.fillStyle = 'rgba(255,255,255,.14)'; rr(ctx, x, y + 6, w, 52, 26); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillText(label, x + 20, y + 41);
      x += w + 14;
    });
    y += 64;

    // conquistas
    y += 56;
    const got = D.ACHIEVEMENTS.filter(a => (user.achievements || {})[a.id]);
    ctx.fillStyle = '#fff'; ctx.font = F(700, 34); ctx.fillText(`Conquistas  ${got.length}/${D.ACHIEVEMENTS.length}`, 60, y);
    y += 24;
    ctx.font = F(600, 24); x = 60;
    got.slice(0, 8).forEach(a => {
      const label = `${a.icon} ${a.name}`;
      const w = ctx.measureText(label).width + 36;
      if (x + w > W - 60) { x = 60; y += 58; }
      if (y > H - 110) return;
      ctx.fillStyle = 'rgba(255,212,94,.18)'; rr(ctx, x, y + 6, w, 46, 23); ctx.fill();
      ctx.fillStyle = '#ffe9a8'; ctx.fillText(label, x + 18, y + 38);
      x += w + 12;
    });
    if (got.length > 8 && y <= H - 110) { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillText(`+${got.length - 8}`, x + 4, y + 38); }
    if (!got.length) { ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillText('Nenhuma ainda', 60, y + 40); }

    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = F(500, 22); ctx.textAlign = 'center';
    ctx.fillText('Gerado em ' + new Date().toLocaleDateString('pt-BR') + ' · Discipline', W / 2, H - 36);
    ctx.textAlign = 'left';
    return c;
  }

  const toBlob = c => new Promise(res => c.toBlob(res, 'image/png'));
  return { render, toBlob };
})();
