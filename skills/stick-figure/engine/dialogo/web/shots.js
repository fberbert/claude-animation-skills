// ---------- exemplo de diálogo: Beto e Duda conversam sobre o curso de vídeo com IA ----------
// Os personagens vêm das fichas (personagens/beto.json e duda.json): cabelo, roupa, acessórios e voz.
// personagem(ctx, id, {..., t}) desenha o boneco; com t, a boca abre e fecha nas palavras da fala dele e ele pisca.
// Os tempos (em segundos da voz) vêm de audio/words_new.json.
const handheld = (t, a = 4) => shake(t * .35, a, 1, 2);
const pop = (t, t0, dur = .35) => (t < t0 ? 0 : backOut(clamp((t - t0) / dur)));

// cenário: céu, sol, nuvens, casinhas coloridas, calçada e rua
const CASAS = [['#f4a259', 230], ['#5bc0be', 300], ['#f25f5c', 250], ['#ffe066', 320], ['#9b5de5', 260], ['#70c1b3', 290], ['#f4a259', 240]];
function rua(ctx, t, cam, o = {}) {
  applyCam(ctx, cam, .08); drawSky(ctx, '#47b3f0', '#d6f1ff', -300, 1150);
  applyCam(ctx, cam, .1); drawSun(ctx, 860, 300, 80, t, .9);
  applyCam(ctx, cam, .15); drawCloud(ctx, 180 + t * 6, 330, 110, 1); drawCloud(ctx, 760 + t * 4, 210, 85, 2); drawCloud(ctx, 1050 + t * 5, 470, 70, 3, .9);
  applyCam(ctx, cam, .45);
  const base = o.horizonte || 1130; let x = -420;
  CASAS.forEach(([cor, h]) => {
    const w = 250;
    rrect(ctx, x, base - h, w - 16, h + 40, 10); fillStroke(ctx, cor, 7);
    path(ctx, [[x - 16, base - h + 6], [x + (w - 16) / 2, base - h - 90], [x + w, base - h + 6]]); fillStroke(ctx, '#c4513f', 7);
    for (let j = 0; j < 2; j++) { rrect(ctx, x + 32 + j * 104, base - h + 50, 66, 66, 8); fillStroke(ctx, '#fdf6e3', 5); }
    rrect(ctx, x + 84, base - 96, 70, 96, 6); fillStroke(ctx, '#7a4b2a', 5);
    x += w;
  });
  applyCam(ctx, cam, 1);
  ctx.fillStyle = '#d9d2c4'; ctx.fillRect(-1200, base + 30, 3600, 160);
  ctx.fillStyle = '#bfb6a6'; for (let k = -6; k < 12; k++) ctx.fillRect(k * 220, base + 30, 8, 160);
  ctx.fillStyle = '#5c6b73'; ctx.fillRect(-1200, base + 190, 3600, 2400);
  ctx.fillStyle = '#f7f3e8'; for (let k = -6; k < 12; k++) ctx.fillRect(k * 260 + 40, base + 520, 140, 22);
}
// balão com um ícone que surge com um pulo
function balao(ctx, x, y, r, a, desenho) {
  if (a <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(a, a);
  path(ctx, [[-r * .25, r * .8], [-r * .55, r * 1.25], [r * .05, r * .9]]); fillStroke(ctx, '#fff', 8);
  circle(ctx, 0, 0, r); fillStroke(ctx, '#fff', 8);
  desenho(ctx, r); ctx.restore();
}
// cartão de ícone: o que a IA faz (roteiro, voz, telas, legenda)
function cartao(ctx, x, y, a, rot, icone, nome) {
  if (a <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(a, a);
  rrect(ctx, -105, -105, 210, 210, 30); fillStroke(ctx, '#ffffff', 9);
  icone(ctx); text(ctx, nome, 0, 150, 46, '#fff', INK, 12); ctx.restore();
}
const ICONES = {
  roteiro: (ctx) => { rrect(ctx, -52, -70, 104, 140, 10); fillStroke(ctx, '#ffe9a8', 7); for (let i = 0; i < 4; i++) line(ctx, -32, -38 + i * 26, i === 3 ? 10 : 32, -38 + i * 26, 9, '#6a5a3a'); },
  voz: (ctx) => { rrect(ctx, -26, -72, 52, 92, 26); fillStroke(ctx, '#ff7a6b', 7); ctx.beginPath(); ctx.arc(0, -10, 50, .15, Math.PI - .15); ctx.lineWidth = 9; ctx.strokeStyle = INK; ctx.stroke(); line(ctx, 0, 40, 0, 66, 9); line(ctx, -26, 68, 26, 68, 9); },
  telas: (ctx) => { rrect(ctx, -72, -58, 144, 98, 10); fillStroke(ctx, '#7ad3f0', 7); path(ctx, [[-30, 18], [-6, -14], [14, 8], [30, -22], [52, 18]], false); ctx.lineWidth = 9; ctx.strokeStyle = '#1d5f8a'; ctx.stroke(); line(ctx, 0, 40, 0, 62, 9); line(ctx, -34, 64, 34, 64, 9); },
  legenda: (ctx) => { rrect(ctx, -76, -46, 152, 92, 14); fillStroke(ctx, '#2b2b33', 7); text(ctx, 'CC', 0, 2, 58, '#fff', INK, 0); },
};

const SHOTS = [];
// 1. Beto, desconfiado: "Fazer vídeo com IA? Eu nem sei editar."
SHOTS.push({ start: 0, end: 2.6, tr: 'whip', draw(ctx, lt, t) {
  const hh = handheld(t, 3);
  const cam = { x: 540 + hh[0], y: 960 + hh[1] - lt * 12, z: 1 + lt * .03, r: Math.sin(t * .6) * .005 };
  ctx.save(); ctx.filter = 'blur(5px)'; rua(ctx, t, cam); ctx.restore();
  applyCam(ctx, cam, 1);
  personagem(ctx, 'duda', { t, x: 1020, y: 1780, s: 900, flip: -1, face: { eyes: 'happy', mouth: 'smile', turn: -.6 }, arms: { L: [.3, -.1], R: [.3, -.1] } });
  const ergue = kf(lt, [[.55, 0], [.85, 1, backOut]]);
  personagem(ctx, 'beto', {
    t, x: 470, y: 1760, s: 1150, bob: Math.sin(t * 2.4) * .004, headTilt: -.05 + Math.sin(t * 1.3) * .02,
    arms: { L: [.75, -1.9], R: [lerp(.4, 2.2, ergue), lerp(-.2, .6, ergue)] },
    face: { eyes: lt > 1.3 ? 'half' : 'normal', look: [.5, -.1], browAng: .25, browOne: 1, mouth: 'flat' },
  });
  balao(ctx, 760, 520, 85, pop(lt, .75), (c) => text(c, '?', 0, 6, 110, '#e0392f', INK, 0));
} });
// 2. Duda, empolgada: "Nem precisa! No curso do Fábio, você pede e a IA faz:"
SHOTS.push({ start: 2.6, end: 5.92, tr: 'cut', draw(ctx, lt, t) {
  const hh = handheld(t, 3);
  const cam = { x: 540 + hh[0] + lt * 8, y: 940 + hh[1], z: 1.02 + lt * .025, r: 0 };
  ctx.save(); ctx.filter = 'blur(5px)'; rua(ctx, t, cam); ctx.restore();
  applyCam(ctx, cam, 1);
  const abre = kf(lt, [[.05, 0], [.35, 1, backOut], [1.0, 1], [1.4, .35]]);
  const aponta = kf(lt, [[1.9, 0], [2.2, 1]]);
  personagem(ctx, 'duda', {
    t, x: 560, y: 1760, s: 1150, bob: Math.sin(t * 3) * .006 - abre * .015, headTilt: Math.sin(t * 1.7) * .03,
    arms: { L: [lerp(.35, 2.3, abre), lerp(-.15, .5, abre)], R: [lerp(lerp(.35, 2.3, abre), 1.55, aponta), lerp(lerp(-.15, .5, abre), -.1, aponta)] },
    face: { eyes: lt < 1.2 ? 'happy' : 'normal', look: [-.3, 0], browUp: .6, mouth: 'grin' },
  });
  const brilho = pop(lt, 2.95, .3);
  if (brilho > 0) { burst(ctx, 900, 560, 120 * brilho, 11, '#ffd23a'); text(ctx, 'IA', 900, 565, 90 * brilho, '#fff', INK, 12); }
} });
// 3. Os dois, plano aberto: "roteiro, voz, telas e legenda."
SHOTS.push({ start: 5.92, end: 8.1, tr: 'whip', draw(ctx, lt, t) {
  const hh = handheld(t, 2.5);
  const cam = { x: 540 + hh[0], y: 1000 + hh[1], z: 1 + lt * .02, r: 0 };
  rua(ctx, t, cam, { horizonte: 1090 });
  applyCam(ctx, cam, 1);
  personagem(ctx, 'beto', { t, x: 300, y: 1530, s: 560, face: { eyes: 'wide', look: [.2, -1], mouth: 'o', blink: 0 }, arms: { L: [.3, -.1], R: [.3, -.1] }, headTilt: -.08 });
  personagem(ctx, 'duda', { t, x: 760, y: 1530, s: 560, flip: -1, bob: Math.sin(t * 6) * .01, arms: { L: [2.5, .3], R: [.4, -.2] }, face: { eyes: 'happy', mouth: 'grin', turn: -.4 } });
  const itens = [['roteiro', 6.0, 300, 330, -.08], ['voz', 6.64, 780, 330, .07], ['telas', 7.04, 300, 720, .06], ['legenda', 7.52, 780, 720, -.06]];
  itens.forEach(([nome, quando, x, y, rot]) => cartao(ctx, x, y + Math.sin(t * 2 + x) * 8, pop(t, quando - .05), rot, ICONES[nome], nome));
} });
// 4. Beto, quase convencido: "E em dois dias eu saio com vídeo pronto?"
SHOTS.push({ start: 8.1, end: 10.98, tr: 'cut', draw(ctx, lt, t) {
  const hh = handheld(t, 3);
  const cam = { x: 540 + hh[0], y: 960 + hh[1] - lt * 10, z: 1.03 + lt * .03, r: Math.sin(t * .5) * .004 };
  ctx.save(); ctx.filter = 'blur(5px)'; rua(ctx, t, cam); ctx.restore();
  applyCam(ctx, cam, 1);
  personagem(ctx, 'beto', {
    t, x: 520, y: 1760, s: 1150, bob: Math.sin(t * 2.4) * .004, headTilt: .05,
    arms: { L: [.95, -2.1], R: [.4, -.2] },
    face: { eyes: 'normal', look: [.4, -.4], pupil: .55, browUp: 1, mouth: 'o' },
  });
  const cal = pop(t, 8.72);
  if (cal > 0) {
    ctx.save(); ctx.translate(820, 520); ctx.rotate(.08); ctx.scale(cal, cal);
    rrect(ctx, -120, -120, 240, 250, 26); fillStroke(ctx, '#fff', 9);
    ctx.save(); rrect(ctx, -120, -120, 240, 80, [26, 26, 0, 0]); ctx.clip(); ctx.fillStyle = '#e0392f'; ctx.fillRect(-130, -130, 260, 90); ctx.restore();
    rrect(ctx, -120, -120, 240, 250, 26); fillStroke(ctx, null, 9);
    text(ctx, 'DIAS', 0, -78, 44, '#fff', INK, 0); text(ctx, '2', 0, 40, 150, INK, INK, 0);
    ctx.restore();
  }
} });
// 5. Os dois: "Publicado! Bora?"
SHOTS.push({ start: 10.98, end: 12.75, tr: 'whip', draw(ctx, lt, t) {
  const hh = handheld(t, 3);
  const cam = { x: 540 + hh[0], y: 980 + hh[1], z: 1.06 - lt * .03, r: 0 };
  rua(ctx, t, cam, { horizonte: 1100 });
  applyCam(ctx, cam, 1);
  const pulo = Math.max(0, Math.sin(clamp((t - 11.4) / .55) * Math.PI)) * .12;
  personagem(ctx, 'beto', { t, x: 330, y: 1560, s: 640, bob: -pulo, arms: { L: [2.6, .2], R: [2.6, .2] }, face: { eyes: 'happy', mouth: 'grin' } });
  personagem(ctx, 'duda', { t, x: 740, y: 1560, s: 640, flip: -1, bob: -pulo * .9, arms: { L: [.3, -.1], R: [2.2, .9] }, face: { eyes: 'happy', mouth: 'grin', turn: -.3 } });
  const cel = pop(t, 11.0, .3);
  if (cel > 0) {
    ctx.save(); ctx.translate(690, 640); ctx.rotate(-.06); ctx.scale(cel, cel);
    rrect(ctx, -115, -200, 230, 400, 36); fillStroke(ctx, '#1f1d24', 9);
    rrect(ctx, -95, -170, 190, 330, 18); ctx.fillStyle = '#fdf6e3'; ctx.fill();
    circle(ctx, 0, -40, 62); fillStroke(ctx, '#3fa35b', 8); path(ctx, [[-28, -40], [-6, -16], [32, -66]], false); ctx.lineWidth = 14; ctx.strokeStyle = '#fff'; ctx.stroke();
    text(ctx, 'publicado', 0, 70, 38, INK, INK, 0);
    ctx.restore();
    for (let k = 0; k < 5; k++) {
      const st = 11.15 + k * .22, a = clamp((t - st) / .9);
      if (a <= 0 || a >= 1) continue;
      ctx.save(); ctx.globalAlpha = 1 - a; ctx.translate(810 + Math.sin(k * 2.1) * 70, 470 - a * 330); ctx.scale(1.2, 1.2);
      ctx.beginPath(); ctx.moveTo(0, 18); ctx.bezierCurveTo(-34, -6, -18, -34, 0, -16); ctx.bezierCurveTo(18, -34, 34, -6, 0, 18); fillStroke(ctx, '#ff4d6d', 5);
      ctx.restore();
    }
  }
} });
// 6. Fechamento: o nome do curso (dura além da voz: main.js estende o vídeo até o fim da última cena)
SHOTS.push({ start: 12.75, end: 15.0, tr: 'cut', draw(ctx, lt, t) {
  const cam = { x: 540, y: 960, z: 1 + lt * .02, r: 0 };
  applyCam(ctx, cam, .08); drawSky(ctx, '#2f63c9', '#7a4bc4', -300, 2200);
  applyCam(ctx, cam, .15); drawCloud(ctx, 160 + t * 8, 300, 90, 4, .5); drawCloud(ctx, 900 + t * 6, 1500, 120, 5, .4);
  applyCam(ctx, cam, 1);
  const a1 = pop(lt, .1, .45), a2 = pop(lt, .45), a3 = pop(lt, .75);
  ctx.save(); ctx.translate(540, 560); ctx.scale(a1, a1); text(ctx, 'VÍDEO', 0, -80, 150, '#ffd23a', INK, 16); text(ctx, 'COM IA', 0, 75, 150, '#fff', INK, 16); ctx.restore();
  ctx.save(); ctx.translate(540, 820); ctx.scale(a2, a2); text(ctx, 'curso presencial com o Fábio', 0, 0, 52, '#fff', INK, 10); ctx.restore();
  ctx.save(); ctx.translate(540, 905); ctx.scale(a3, a3); text(ctx, 'Rio das Ostras · RJ', 0, 0, 46, '#ffe9a8', INK, 9); ctx.restore();
  const acena = Math.sin(t * 9) * .35;
  personagem(ctx, 'beto', { t, x: 380, y: 1540, s: 520, arms: { L: [.3, -.1], R: [2.5 + acena, .3] }, face: { eyes: 'happy', mouth: 'grin' } });
  personagem(ctx, 'duda', { t, x: 700, y: 1540, s: 520, flip: -1, arms: { L: [2.5 - acena, .3], R: [.3, -.1] }, face: { eyes: 'happy', mouth: 'grin' } });
} });
