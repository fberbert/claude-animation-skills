// ---------- personagens reutilizáveis: a ficha (personagens/<id>.json) vira um boneco desenhado ----------
// O make gera web/elenco.js com window.ELENCO (as fichas usadas no vídeo) e window.FALAS (quem fala cada linha).
// Nas cenas (shots.js):  personagem(ctx, 'duda', { x, y, s, t, flip, arms, legs, face, headTilt, bob })
//   t     = tempo da cena (o segundo argumento de draw): liga a boca sincronizada com a voz e o piscar
//   face  = expressão do momento ({ eyes, mouth, look, browUp, turn ... }); a boca falando substitui a mouth
//   fala: false desliga a boca automática (personagem de boca fechada mesmo durante a própria fala)
const ELENCO = window.ELENCO || {};
const FALAS = window.FALAS || [];

function escurecer(hex, k = .12) {
  const n = parseInt(hex.slice(1), 16), f = c => Math.round(c * (1 - k));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
// o personagem está falando no instante t? (WORDS vem do alinhamento da voz; FALAS diz de quem é cada linha)
function falando(t, quem) {
  const tn = typeof toNew === 'function' ? toNew(t) : t;
  return WORDS.some(w => FALAS[w.line] === quem && tn >= w.s - .03 && tn < w.e + .02);
}
function bocaFalando(t, quem) {
  return falando(t, quem) ? ['o', 'grin', 'o', 'flat'][Math.floor(t * 11) % 4] : null;
}
// piscada curta a cada ~3 s, com fase diferente por personagem
function piscada(t, quem) {
  const fase = [...quem].reduce((a, c) => a + c.charCodeAt(0), 0) % 31 / 10;
  return (t + fase) % 3.1 < .12 ? 1 : 0;
}

// ---------- cabelos: desenhados nas coordenadas da cabeça (centro hx,hy e raio hr), seguem a inclinação e o flip ----------
// "atras" fica atrás da cabeça; "frente" é a franja e o topo, cortados no contorno da cabeça
function topoCabelo(ctx, hx, hy, hr, cor, altura = .5, ondas = 0) {
  ctx.save(); circle(ctx, hx, hy, hr); ctx.clip();
  ctx.beginPath(); ctx.moveTo(hx - hr * 1.2, hy - hr * (altura - .15));
  if (ondas) for (let i = 0; i <= ondas; i++) {
    const x = hx - hr * 1.1 + hr * 2.2 * i / ondas;
    ctx.quadraticCurveTo(x - hr * 1.1 / ondas, hy - hr * (altura - .32), x, hy - hr * altura);
  } else {
    ctx.quadraticCurveTo(hx - hr * .3, hy - hr * (altura + .05), hx + hr * .2, hy - hr * (altura + .12));
    ctx.quadraticCurveTo(hx + hr * .7, hy - hr * altura, hx + hr * 1.2, hy - hr * (altura - .2));
  }
  ctx.lineTo(hx + hr * 1.3, hy - hr * 1.4); ctx.lineTo(hx - hr * 1.3, hy - hr * 1.4); ctx.closePath();
  ctx.fillStyle = cor; ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ellipse(ctx, hx - hr * .35, hy - hr * .82, hr * .3, hr * .09, -.3); ctx.fill();
  ctx.restore();
}
const CABELOS = {
  careca: {},
  curto: {
    atras: (ctx, hx, hy, hr, lw, cor) => { circle(ctx, hx, hy - hr * .06, hr * 1.05); fillStroke(ctx, cor, lw); },
    frente: (ctx, hx, hy, hr, lw, cor) => topoCabelo(ctx, hx, hy, hr, cor, .52, 5),
  },
  rabo: {
    atras: (ctx, hx, hy, hr, lw, cor) => {
      ellipse(ctx, hx - hr * .95, hy + hr * .1, hr * .42, hr * .62, .5); fillStroke(ctx, cor, lw);
      circle(ctx, hx, hy, hr * 1.06); fillStroke(ctx, cor, lw);
    },
    frente: (ctx, hx, hy, hr, lw, cor) => topoCabelo(ctx, hx, hy, hr, cor, .48),
  },
  coque: {
    atras: (ctx, hx, hy, hr, lw, cor) => {
      circle(ctx, hx - hr * .1, hy - hr * 1.12, hr * .45); fillStroke(ctx, cor, lw);
      circle(ctx, hx, hy, hr * 1.05); fillStroke(ctx, cor, lw);
    },
    frente: (ctx, hx, hy, hr, lw, cor) => topoCabelo(ctx, hx, hy, hr, cor, .55),
  },
  longo: {
    atras: (ctx, hx, hy, hr, lw, cor) => {   // até o ombro: termina logo abaixo do queixo para não cobrir a camisa
      ctx.beginPath(); ctx.moveTo(hx - hr * 1.1, hy);
      ctx.arc(hx, hy - hr * .05, hr * 1.1, Math.PI, 0);
      ctx.quadraticCurveTo(hx + hr * 1.18, hy + hr * .8, hx + hr * .95, hy + hr * 1.15);
      ctx.lineTo(hx - hr * .95, hy + hr * 1.15);
      ctx.quadraticCurveTo(hx - hr * 1.18, hy + hr * .8, hx - hr * 1.1, hy); ctx.closePath(); fillStroke(ctx, cor, lw);
    },
    frente: (ctx, hx, hy, hr, lw, cor) => topoCabelo(ctx, hx, hy, hr, cor, .5),
  },
  cacheado: {
    atras: (ctx, hx, hy, hr, lw, cor) => {
      const r = rng(4);
      for (let i = 0; i < 13; i++) {
        const a = Math.PI * (.92 + i / 12 * 1.16);
        circle(ctx, hx + Math.cos(a) * hr * 1.08, hy + Math.sin(a) * hr * 1.08 - hr * .12, hr * (.36 + r() * .08)); fillStroke(ctx, cor, lw);
      }
      circle(ctx, hx, hy - hr * .2, hr * 1.12); ctx.fillStyle = cor; ctx.fill();
    },
    frente: (ctx, hx, hy, hr, lw, cor) => topoCabelo(ctx, hx, hy, hr, cor, .55, 6),
  },
};

// ---------- acessórios: [{ "tipo": "oculos", "cor": "#222" }] ou só "oculos" ----------
// onde: atras (antes da cabeça), frente (por cima do rosto), roupa (no tronco)
const ACESSORIOS = {
  oculos: { onde: 'frente', cor: '#221c22', desenha: (ctx, p, cor, f) => {
    const dx = (f.turn || 0) * .06, ey = p.hy - .005;
    for (const s of [-1, 1]) { circle(ctx, p.hx + s * .072 + dx, ey, .058); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fill(); ctx.lineWidth = .016; ctx.strokeStyle = cor; ctx.stroke(); }
    line(ctx, p.hx - .014 + dx, ey, p.hx + .014 + dx, ey, .014, cor);
  } },
  bone: { onde: 'frente', cor: '#d8312b', desenha: (ctx, p, cor, f) => {
    const { hx, hy, hr, lw } = p, base = hy - hr * .38, dx = (f.turn || 0) * .06;
    ctx.beginPath(); ctx.moveTo(hx - hr * 1.02, base); ctx.quadraticCurveTo(hx - hr * 1.0, hy - hr * 1.18, hx, hy - hr * 1.16);
    ctx.quadraticCurveTo(hx + hr * 1.0, hy - hr * 1.18, hx + hr * 1.02, base); ctx.closePath(); fillStroke(ctx, cor, lw);
    ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(hx + hr * .3, hy - hr * 1.3, hr, hr); ctx.restore();
    ellipse(ctx, hx + dx * 2.2, base + .004, hr * .78, hr * .13); fillStroke(ctx, escurecer(cor, .2), lw);
    circle(ctx, hx, hy - hr * 1.15, .018); fillStroke(ctx, cor, lw * .8);
  } },
  bigode: { onde: 'frente', cor: null, desenha: (ctx, p, cor, f) => {
    const mx = p.hx + (f.turn || 0) * .06, my = p.hy + .06;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(mx, my - .008); ctx.quadraticCurveTo(mx + s * .04, my - .03, mx + s * .075, my + .005); ctx.quadraticCurveTo(mx + s * .04, my + .004, mx, my + .01); ctx.closePath(); fillStroke(ctx, cor, .01); }
  } },
  barba: { onde: 'frente', cor: null, desenha: (ctx, p, cor) => {
    const { hx, hy, hr, lw } = p;
    ctx.beginPath(); ctx.arc(hx, hy, hr * 1.03, .4, Math.PI - .4); ctx.arc(hx, hy - .01, hr * .82, Math.PI - .55, .55, true); ctx.closePath(); fillStroke(ctx, cor, lw * .8);
  } },
  brinco: { onde: 'frente', cor: '#e8c04a', desenha: (ctx, p, cor) => {
    for (const s of [-1, 1]) { circle(ctx, p.hx + s * p.hr * .98, p.hy + p.hr * .42, .02); fillStroke(ctx, cor, .008); }
  } },
  laco: { onde: 'frente', cor: '#ff5d8f', desenha: (ctx, p, cor) => {
    const x = p.hx - p.hr * .55, y = p.hy - p.hr * .88;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s * .075, y - .04); ctx.lineTo(x + s * .075, y + .04); ctx.closePath(); fillStroke(ctx, cor, .01); }
    circle(ctx, x, y, .02); fillStroke(ctx, cor, .01);
  } },
  gravata: { onde: 'roupa', cor: '#c0392b', desenha: (ctx, p, cor) => {
    const { tTop, tBot, lw } = p;
    ctx.beginPath(); ctx.moveTo(-.022, tTop + .005); ctx.lineTo(.022, tTop + .005); ctx.lineTo(.012, tTop + .04); ctx.lineTo(-.012, tTop + .04); ctx.closePath(); fillStroke(ctx, cor, lw * .7);
    ctx.beginPath(); ctx.moveTo(-.012, tTop + .04); ctx.lineTo(.012, tTop + .04); ctx.lineTo(.03, tBot - .09); ctx.lineTo(0, tBot - .055); ctx.lineTo(-.03, tBot - .09); ctx.closePath(); fillStroke(ctx, cor, lw * .7);
  } },
  avental: { onde: 'roupa', cor: '#f6f1e8', desenha: (ctx, p, cor) => {
    const { tw, tTop, tBot, lw } = p, y0 = tTop + .11;
    line(ctx, -tw * .28, tTop + .01, -tw * .28, y0, .01); line(ctx, tw * .28, tTop + .01, tw * .28, y0, .01);
    ctx.beginPath(); ctx.roundRect(-tw * .36, y0, tw * .72, tBot - y0 + .05, [.015, .015, .04, .04]); fillStroke(ctx, cor, lw * .8);
    rrect(ctx, -tw * .18, y0 + .1, tw * .36, .05, .01); fillStroke(ctx, escurecer(cor, .08), lw * .6);
  } },
  cracha: { onde: 'roupa', cor: '#ffffff', desenha: (ctx, p, cor) => {
    const { tw, tTop, lw } = p, x = tw * .12, y = tTop + .1;
    rrect(ctx, x - .035, y, .07, .05, .008); fillStroke(ctx, cor, lw * .6);
    line(ctx, x - .02, y + .018, x + .02, y + .018, .007); line(ctx, x - .02, y + .033, x + .01, y + .033, .007);
  } },
};

function personagem(ctx, quem, o = {}) {
  const f = ELENCO[quem];
  if (!f) throw new Error(`personagem "${quem}" não está no elenco: crie personagens/${quem}.json e cite-o em falas.json (ou em elenco.json)`);
  const rosto = f.rosto || {}, cab = f.cabelo || { estilo: 'careca' };
  const face = Object.assign({ eyes: rosto.olhos || 'normal', mouth: rosto.boca || 'smile', eyeR: .042 * (rosto.olhosTamanho || 1) }, o.face);
  if (o.t != null && o.fala !== false) { const m = bocaFalando(o.t, quem); if (m) face.mouth = m; }
  if (o.t != null && face.blink == null) face.blink = piscada(o.t, quem);
  const estilo = CABELOS[cab.estilo] || CABELOS.careca, corCabelo = cab.cor || '#3b2216';
  const acs = (f.acessorios || []).map(a => typeof a === 'string' ? { tipo: a } : a).filter(a => ACESSORIOS[a.tipo]);
  const desenha = (onde, p) => acs.forEach(a => { const A = ACESSORIOS[a.tipo]; if (A.onde === onde) A.desenha(ctx, p, a.cor || A.cor || corCabelo, face); });
  const pele = f.pele || HEAD;
  drawStick(ctx, Object.assign({}, o, {
    s: (o.s || 400) * (f.altura || 1),
    cols: [f.camisa || '#2f63c9', f.listras || f.camisa || '#2f63c9'],
    belt: f.cinto ? undefined : false, hat: 'nenhum',
    pele, peleSombra: f.pele ? escurecer(f.pele) : HEAD_SH, blush: rosto.bochechas,
    face,
    atras: (c, hx, hy, hr, lw) => { if (estilo.atras) estilo.atras(c, hx, hy, hr, lw, corCabelo); desenha('atras', { hx, hy, hr, lw }); },
    cabelo: (c, hx, hy, hr, lw) => { if (estilo.frente) estilo.frente(c, hx, hy, hr, lw, corCabelo); },
    frente: (c, hx, hy, hr, lw) => desenha('frente', { hx, hy, hr, lw }),
    roupa: (c, tw, tTop, tBot, lw) => desenha('roupa', { tw, tTop, tBot, lw }),
  }));
}
