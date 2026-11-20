// ---------- personagens reutilizáveis: a ficha (personagens/<id>.json) vira um boneco desenhado ----------
// O make gera web/elenco.js com window.ELENCO (as fichas usadas no vídeo) e window.FALAS (quem fala cada linha).
// Nas cenas (shots.js):  personagem(ctx, 'duda', { x, y, s, t, flip, arms, legs, face, headTilt, bob })
//   t     = tempo da cena (o segundo argumento de draw): liga a boca sincronizada com a voz e o piscar
//   face  = expressão do momento ({ eyes, mouth, look, browUp, turn ... }); a boca falando substitui a mouth
//   fala: false desliga a boca automática (personagem de boca fechada mesmo durante a própria fala)
const ELENCO = window.ELENCO || {};
const FALAS = window.FALAS || [];
// camadas recortadas de um desenho (tools/recorte.py): cada PNG cobre de -lado a +lado raios da cabeça (padrão 2), centrado nos olhos.
// O falas.py (e o ficha.js) põem a imagem dentro da ficha, em "dados"; o render espera todas carregarem.
window.ELENCO_PRONTO = Promise.all(Object.values(ELENCO).flatMap(f => (f.imagens || []).map(im => {
  im.img = new Image(); im.img.src = im.dados; return im.img.decode();
})));
function camadasImagem(ctx, f, camada, hx, hy, hr) {
  for (const im of f.imagens || []) if ((im.camada || 'frente') === camada && im.img) { const l = im.lado || 2; ctx.drawImage(im.img, hx - l * hr, hy - l * hr, 2 * l * hr, 2 * l * hr); }
}

function escurecer(hex, k = .12) {
  const n = parseInt(hex.slice(1), 16), f = c => Math.round(c * (1 - k));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
function clarear(hex, k = .2) {   // mistura com branco: serve também para cores escuras, onde escurecer(-k) quase não muda nada
  const n = parseInt(hex.slice(1), 16), f = c => Math.round(c + (255 - c) * k);
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
// o personagem está falando no instante t? (WORDS vem do alinhamento da voz; FALAS diz de quem é cada linha)
function falando(t, quem) {
  // window.DESLOCAMENTO: segundos somados ao tempo da cena quando ela foi empurrada por uma fala inserida depois (deslocarCenas)
  const tn = (typeof toNew === 'function' ? toNew(t) : t) + (window.DESLOCAMENTO || 0);
  return WORDS.some(w => FALAS[w.line] === quem && tn >= w.s - .03 && tn < w.e + .02);
}
function bocaFalando(t, quem) {
  return falando(t, quem) ? ['o', 'grin', 'o', 'flat'][Math.floor(t * 11) % 4] : null;
}
// fala nova no meio de um diálogo já animado: empurra as cenas que começam a partir de "desde" (segundos da voz antiga)
// em "D" segundos. Elas continuam cronometradas na voz antiga; a boca sincronizada acompanha a voz nova.
function deslocarCenas(desde, D) {
  SHOTS.filter(s => s.start >= desde - 1e-6).forEach(s => {
    const draw = s.draw; s.start += D; s.end += D;
    s.draw = function (ctx, lt, t) { window.DESLOCAMENTO = D; try { draw.call(this, ctx, lt, t - D); } finally { window.DESLOCAMENTO = 0; } };
  });
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
// fios mais claros (grisalho): traços curtos dentro da área já recortada
function fios(ctx, cor, x0, y0, w, h, n, seed, ang = -.5, len = .03) {
  if (!cor) return;
  const r = rng(seed); ctx.save(); ctx.strokeStyle = cor; ctx.lineWidth = .005; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * w, y = y0 + r() * h, a = ang + (r() - .5) * .6, l = len * (.6 + r() * .8);
    ctx.globalAlpha = .35 + r() * .35; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
  }
  ctx.restore();
}
// contorno do cabelo espetado: rente nas laterais, pontas só no alto da cabeça
function coroaEspetada(ctx, hx, hy, hr) {
  const r = rng(9), n = 17; ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = Math.PI * (.92 + i / n * 1.16), topo = Math.max(0, -Math.sin(a));   // 1 no alto, 0 nas laterais
    const ponta = i % 2 ? 1.06 + topo * (.12 + r() * .07) : 1.04;
    const inclina = i % 2 ? .08 : 0;   // as pontas caem um pouco para a direita
    const x = hx + Math.cos(a + inclina) * hr * ponta, y = hy + Math.sin(a + inclina) * hr * ponta - hr * .03;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}
const CABELOS = {
  careca: {},
  espetado: {   // curto e bagunçado, com costeletas descendo até a altura das orelhas
    atras: (ctx, hx, hy, hr, lw, cor, mec) => {
      coroaEspetada(ctx, hx, hy, hr); fillStroke(ctx, cor, lw);
      ctx.save(); coroaEspetada(ctx, hx, hy, hr); ctx.clip(); fios(ctx, mec, hx - hr * 1.3, hy - hr * 1.35, hr * 2.6, hr * .9, 26, 3, -1.1, .035); ctx.restore();
    },
    frente: (ctx, hx, hy, hr, lw, cor, mec) => {
      const borda = () => {
        ctx.beginPath(); ctx.moveTo(hx - hr * 1.2, hy + hr * .15); ctx.lineTo(hx - hr * .86, hy + hr * .1);
        ctx.lineTo(hx - hr * .8, hy - hr * .55);
        const pts = [[-.6, -.76], [-.48, -.64], [-.3, -.8], [-.15, -.68], [.05, -.84], [.2, -.72], [.4, -.82], [.55, -.68], [.75, -.72]];
        pts.forEach(([x, y]) => ctx.lineTo(hx + x * hr, hy + y * hr));
        ctx.lineTo(hx + hr * .82, hy - hr * .52); ctx.lineTo(hx + hr * .87, hy + hr * .1); ctx.lineTo(hx + hr * 1.2, hy + hr * .15);
        ctx.lineTo(hx + hr * 1.3, hy - hr * 1.5); ctx.lineTo(hx - hr * 1.3, hy - hr * 1.5); ctx.closePath();
      };
      ctx.save(); circle(ctx, hx, hy, hr); ctx.clip(); borda(); ctx.fillStyle = cor; ctx.fill();
      borda(); ctx.clip(); fios(ctx, mec, hx - hr * 1.1, hy - hr * 1.05, hr * 2.2, hr * .5, 22, 5, -1.3, .03);
      ctx.restore();
    },
  },
  curto: {
    atras: (ctx, hx, hy, hr, lw, cor, mec) => { circle(ctx, hx, hy - hr * .06, hr * 1.05); fillStroke(ctx, cor, lw); },
    frente: (ctx, hx, hy, hr, lw, cor, mec) => { topoCabelo(ctx, hx, hy, hr, cor, .52, 5); ctx.save(); circle(ctx, hx, hy, hr); ctx.clip(); fios(ctx, mec, hx - hr, hy - hr * 1.05, hr * 2, hr * .45, 30, 6, -1.2); ctx.restore(); },
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

// ---------- acessórios: [{ "tipo": "oculos", "cor": "#222" }] ou só "oculos"; "mechas" clareia barba e bigode ----------
// onde: atras (antes da cabeça), rosto (na pele, por baixo de olhos e boca), frente (por cima do rosto), roupa (no tronco)
const ACESSORIOS = {
  'barba-cheia': { onde: 'rosto', cor: null, desenha: (ctx, p, cor, f, a) => {   // das costeletas ao queixo, com bigode; a boca fica por cima
    const { hx, hy, hr } = p;
    const forma = () => {   // costeletas finas junto às orelhas; a borda de cima desce das maçãs do rosto ao bigode
      ctx.beginPath(); ctx.arc(hx, hy, hr * 1.04, 0, Math.PI);
      ctx.quadraticCurveTo(hx - hr * .82, hy + hr * .5, hx - hr * .45, hy + hr * .42);
      ctx.quadraticCurveTo(hx - hr * .2, hy + hr * .27, hx, hy + hr * .31);
      ctx.quadraticCurveTo(hx + hr * .2, hy + hr * .27, hx + hr * .45, hy + hr * .42);
      ctx.quadraticCurveTo(hx + hr * .82, hy + hr * .5, hx + hr * 1.04, hy); ctx.closePath();
    };
    ctx.save(); circle(ctx, hx, hy, hr * 1.06); ctx.clip();
    forma(); ctx.fillStyle = cor; ctx.fill();
    forma(); ctx.clip(); fios(ctx, a.mechas, hx - hr * 1.05, hy + hr * .3, hr * 2.1, hr * .85, 110, 11, 1.4, .025);
    ctx.restore();
  } },
  pinta: { onde: 'frente', cor: '#6b4a3a', desenha: (ctx, p, cor, f, a) => {   // "x" e "y" opcionais, em raios da cabeça a partir do centro
    ctx.beginPath(); ctx.arc(p.hx + p.hr * (a.x ?? -.38) + (f.turn || 0) * .06, p.hy + p.hr * (a.y ?? -.6), .011 * (a.tamanho || 1), 0, TAU); ctx.fillStyle = cor; ctx.fill();   // arc direto: circle() não desenha raio menor que .01
  } },
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
  mangas: { onde: 'roupa', cor: '#f7f5f0', desenha: (ctx, p, cor) => {   // manga curta: some por baixo do braço
    for (const s of [-1, 1]) { ellipse(ctx, s * .118, p.tTop + .05, .056, .042, s * .55); fillStroke(ctx, cor, p.lw * .8); }
  } },
  gola: { onde: 'roupa', cor: '#ff6f9f', desenha: (ctx, p, cor, f, a) => {   // gola redonda logo abaixo do queixo ("y" e "raio" ajustam)
    ctx.beginPath(); ctx.arc(0, a.y ?? -.575, a.raio ?? .066, .2 * Math.PI, .8 * Math.PI); ctx.lineWidth = .022; ctx.strokeStyle = cor; ctx.lineCap = 'round'; ctx.stroke();
  } },
  jardineira: { onde: 'roupa', cor: '#9db9dc', desenha: (ctx, p, cor, f, a) => {   // macacão jeans de short: peito largo, alças, botões e bolsos
    const { tw, tTop, tBot, lw } = p, cint = tTop + (a.cintura ?? .2), peito = tTop + (a.peito ?? .065), bw = tw * .64, bx = bw / 2, barra = tBot + .07;
    const esc = escurecer(cor, .08), costura = escurecer(cor, .3);
    const short = () => { ctx.beginPath(); ctx.moveTo(-tw / 2, cint); ctx.lineTo(tw / 2, cint); ctx.lineTo(tw / 2 + .006, barra); ctx.lineTo(.008, barra); ctx.lineTo(0, tBot + .01); ctx.lineTo(-.008, barra); ctx.lineTo(-tw / 2 - .006, barra); ctx.closePath(); };
    short(); fillStroke(ctx, cor, lw);
    ctx.save(); short(); ctx.clip();
    ctx.fillStyle = esc; ctx.fillRect(tw * .25, cint, tw, 1);                                   // lado na sombra
    ctx.fillStyle = clarear(cor, .25); ctx.fillRect(-tw, barra - .026, tw * 2, .026);            // barra dobrada
    ctx.restore();
    line(ctx, -tw / 2 - .004, barra - .026, -.008, barra - .026, lw * .6); line(ctx, .008, barra - .026, tw / 2 + .004, barra - .026, lw * .6);
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * tw / 2, cint + .008, .048, s > 0 ? Math.PI * .5 : 0, s > 0 ? Math.PI : Math.PI * .5); ctx.lineWidth = .007; ctx.strokeStyle = costura; ctx.stroke(); }   // bolsos da frente
    ctx.beginPath(); ctx.roundRect(-bx, peito, bw, cint - peito + .005, [.012, .012, 0, 0]); fillStroke(ctx, cor, lw);   // peito
    for (const s of [-1, 1]) { line(ctx, s * (bx - .012), peito + .012, s * tw * .38, tTop + .004, .028); line(ctx, s * (bx - .012), peito + .012, s * tw * .38, tTop + .004, .015, cor); }   // alças
    const pw = bw * .52, ph = (cint - peito) * .55, py = peito + (cint - peito) * .3;
    ctx.beginPath(); ctx.moveTo(-pw / 2, py); ctx.lineTo(pw / 2, py); ctx.lineTo(pw / 2, py + ph * .75); ctx.lineTo(0, py + ph); ctx.lineTo(-pw / 2, py + ph * .75); ctx.closePath();
    ctx.lineWidth = .008; ctx.strokeStyle = costura; ctx.stroke();                                // bolso do peito
    ctx.save(); ctx.setLineDash([.008, .006]); ctx.beginPath(); ctx.moveTo(-pw / 2 + .008, py + .01); ctx.lineTo(pw / 2 - .008, py + .01); ctx.lineWidth = .004; ctx.stroke(); ctx.restore();
    line(ctx, -tw / 2, cint, tw / 2, cint, lw * .8);                                             // cintura
    for (const s of [-1, 1]) { circle(ctx, s * (bx - .012), peito + .014, .012); fillStroke(ctx, '#c9ccd2', lw * .6); }   // botões
  } },
  tenis: { onde: 'pe', cor: '#1e1a1c', desenha: (ctx, p, cor) => {   // tênis escuro de sola branca
    ellipse(ctx, p.x + p.side * .006, p.y - .008, .052, .03); fillStroke(ctx, cor, p.lw * .7);
    rrect(ctx, p.x - .052 + p.side * .006, p.y + .01, .104, .018, .008); fillStroke(ctx, '#f4f2ee', p.lw * .6);
  } },
  camiseta: { cor: '#2b2a2e',   // camiseta de manga curta: gola com o pescoço aparecendo e mangas que acompanham os braços
    // combina com "tronco": {"largura": 0.29, "reto": true} na ficha (tronco de camiseta, mais largo e de cantos retos)
    roupa: (ctx, p, cor, f, a) => {   // "pescoco": false não desenha o pescoço: a camiseta vai até o queixo
      if (a.pescoco !== false) { ctx.beginPath(); ctx.moveTo(-.05, -.6); ctx.quadraticCurveTo(0, -.53, .05, -.6); ctx.closePath(); fillStroke(ctx, p.pele, p.lw * .8); }   // pescoço na gola
    },
    manga: (ctx, p, cor) => {
      const [o, c] = p.pts, d = Math.hypot(c[0] - o[0], c[1] - o[1]), ux = (c[0] - o[0]) / d, uy = (c[1] - o[1]) / d, nx = -uy, ny = ux;
      const L = .078, w0 = .058, w1 = .046, ox = o[0] - ux * .045, oy = o[1] - uy * .045;
      ctx.beginPath(); ctx.moveTo(ox + nx * w0, oy + ny * w0); ctx.lineTo(o[0] + ux * L + nx * w1, o[1] + uy * L + ny * w1);
      ctx.lineTo(o[0] + ux * L - nx * w1, o[1] + uy * L - ny * w1); ctx.lineTo(ox - nx * w0, oy - ny * w0); ctx.closePath();
      ctx.lineJoin = 'round'; fillStroke(ctx, cor, p.lw * .8);
    } },
  bermuda: { onde: 'roupa', cor: '#f4f2ec', desenha: (ctx, p, cor, f, a) => {   // bermuda até o meio da coxa, com cós, bolsos e barra
    const { tTop, tBot, lw } = p, tw = p.tw * (a.largura ?? 1), cint = tTop + (a.cintura ?? .21), barra = tBot + (a.barra ?? .085), costura = escurecer(cor, .3);   // "cintura", "barra" e "largura" ajustam
    const forma = () => { ctx.beginPath(); ctx.moveTo(-tw / 2, cint); ctx.lineTo(tw / 2, cint); ctx.lineTo(tw / 2 + .006, barra); ctx.lineTo(.008, barra); ctx.lineTo(0, tBot + .01); ctx.lineTo(-.008, barra); ctx.lineTo(-tw / 2 - .006, barra); ctx.closePath(); };
    forma(); fillStroke(ctx, cor, lw, a.contorno || INK);   // "contorno": cor da borda (ex.: um cinza claro em vez do preto)
    if (a.sombra !== false) { ctx.save(); forma(); ctx.clip(); ctx.fillStyle = escurecer(cor, .04); ctx.fillRect(tw * .3, cint, tw, 1); ctx.restore(); }   // lado na sombra ("sombra": false tira)
    line(ctx, -tw / 2, cint + .028, tw / 2, cint + .028, .007, costura);                                       // cós
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.arc(s * tw / 2, cint + .03, .045, s > 0 ? Math.PI * .5 : 0, s > 0 ? Math.PI : Math.PI * .5); ctx.lineWidth = .007; ctx.strokeStyle = costura; ctx.stroke();   // bolsos
      line(ctx, s * (tw / 2 - .004), barra - .02, s * .014, barra - .02, .006, costura);                        // barra
    }
    line(ctx, 0, cint + .028, 0, tBot - .02, .006, costura);                                                    // braguilha
  } },
  sapato: { onde: 'pe', cor: '#ff6fa8', desenha: (ctx, p, cor) => {   // sapato colorido, bico arredondado e sola mais escura
    const x = p.x + p.side * .01;
    ctx.beginPath(); ctx.ellipse(x, p.y - .006, .058, .03, 0, Math.PI, 0); ctx.lineTo(x + .058, p.y + .012); ctx.lineTo(x - .058, p.y + .012); ctx.closePath(); fillStroke(ctx, cor, p.lw * .7);
    rrect(ctx, x - .06, p.y + .008, .12, .016, .007); fillStroke(ctx, escurecer(cor, .35), p.lw * .6);
    ellipse(ctx, x + p.side * .025, p.y - .02, .014, .006, p.side * -.4); ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fill();   // brilho no bico
  } },
  coturno: { onde: 'pe', cor: '#9a5a2e', desenha: (ctx, p, cor, f, a) => {   // bota de cano curto com sola grossa e cadarço ("cadarco": cor)
    const x = p.x + p.side * .014, cano = p.x - p.side * .008, lw = p.lw * .7, cad = a.cadarco || '#e0453a';
    rrect(ctx, cano - .031, p.y - .064, .062, .06, .014); fillStroke(ctx, cor, lw);                                  // cano
    rrect(ctx, cano - .033, p.y - .07, .066, .016, .007); fillStroke(ctx, escurecer(cor, .18), lw);                   // borda do cano
    ctx.beginPath(); ctx.ellipse(x, p.y - .01, .062, .036, 0, Math.PI, 0); ctx.lineTo(x + .062, p.y + .012); ctx.lineTo(x - .062, p.y + .012); ctx.closePath(); fillStroke(ctx, cor, lw);   // pé
    rrect(ctx, x - .067, p.y + .006, .134, .026, .009); fillStroke(ctx, escurecer(cor, .5), lw);                       // sola
    for (let i = -2; i <= 2; i++) line(ctx, x + i * .025, p.y + .026, x + i * .025, p.y + .032, .007, INK);             // sola tratorada
    for (const yy of [-.05, -.03]) { line(ctx, cano - .015, p.y + yy, cano + .015, p.y + yy + .012, .007, cad); line(ctx, cano + .015, p.y + yy, cano - .015, p.y + yy + .012, .007, cad); }
    ellipse(ctx, x + p.side * .028, p.y - .026, .013, .006, p.side * -.4); ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fill();   // brilho no bico
  } },
  meias: { cor: 'arco-iris', perna: (ctx, p, cor, f, a) => {   // meia por baixo do sapato; cor 'arco-iris' (padrão) faz as listras no trecho que aparece acima do cano; "altura": fração da canela
    const [, joelho, pe] = p.pts, de = 1 - (a.altura ?? .7), cores = cor === 'arco-iris' ? ARCO_IRIS : [cor];
    faixas(ctx, joelho, pe, .5, 1.04, cores.slice(-1), .036, p.lw);   // o pé da meia, que o cano cobre
    faixas(ctx, joelho, pe, de, .58, cores, .036, p.lw);
  } },
  pulseira: { cor: 'arco-iris', manga: (ctx, p, cor, f, a) => {   // no pulso: "lado" 'L' ou 'R' (o braço de shots.js; sem lado, os dois); "estilo": 'xuxinha' (franzida)
    if (a.lado && a.lado !== (p.side < 0 ? 'L' : 'R')) return;
    const [, cotovelo, mao] = p.pts;
    if (a.estilo === 'xuxinha') {
      faixas(ctx, cotovelo, mao, .6, .82, [cor], .062, p.lw);
      for (const k of [.66, .71, .76]) { const x = cotovelo[0] + (mao[0] - cotovelo[0]) * k, y = cotovelo[1] + (mao[1] - cotovelo[1]) * k; circle(ctx, x, y, .012); ctx.fillStyle = escurecer(cor, .18); ctx.fill(); }   // franzido
      return;
    }
    faixas(ctx, cotovelo, mao, .62, .8, cor === 'arco-iris' ? ARCO_IRIS : [cor], .046, p.lw);
  } },
  estampa: { onde: 'roupa', cor: '#f6c419', desenha: (ctx, p, cor, f, a) => {   // estampa no peito: "simbolo" 'foice-martelo' (padrão) ou 'estrela'; "tamanho", "x", "y"
    ctx.save(); ctx.translate(a.x ?? 0, p.tTop + (a.y ?? .14)); const k = a.tamanho ?? .09; ctx.scale(k, k); semEspelho(ctx);
    if (a.simbolo === 'estrela') star5(ctx, 0, 0, .55, 0, cor);
    else {
      ctx.fillStyle = cor; ctx.strokeStyle = cor; ctx.lineCap = 'round';
      // foice: a lâmina sai do alto à esquerda, contorna pela direita e desce até o cabo, embaixo à esquerda
      ctx.beginPath(); ctx.arc(0, 0, .46, -2.3, 2.05, false); ctx.arc(-.08, -.06, .38, 2.2, -2.4, true); ctx.closePath(); ctx.fill();   // lâmina
      ctx.beginPath(); ctx.moveTo(-.2, .42); ctx.lineTo(-.42, .6); ctx.lineWidth = .15; ctx.stroke();                                     // cabo da foice
      ctx.beginPath(); ctx.moveTo(.42, .5); ctx.lineTo(-.12, -.06); ctx.lineWidth = .12; ctx.stroke();                              // cabo do martelo
      ctx.save(); ctx.translate(-.17, -.13); ctx.rotate(-Math.PI / 4); ctx.beginPath(); ctx.roundRect(-.25, -.09, .5, .18, .03); ctx.fill(); ctx.restore();   // cabeça do martelo
    }
    ctx.restore();
  } },
  botton: { onde: 'roupa', cor: '#d8231f', desenha: (ctx, p, cor, f, a) => {   // bóton redondo no peito: "texto" curto, "corTexto", "x" (em larguras do tronco), "y", "raio"
    const x = p.tw * (a.x ?? .15), y = p.tTop + (a.y ?? .08), r = a.raio ?? .026;   // perto do meio: a manga da camiseta cobre o canto do peito; "x" negativo fica do outro lado
    circle(ctx, x, y, r); fillStroke(ctx, cor, p.lw * .6);
    ellipse(ctx, x - r * .4, y - r * .45, r * .3, r * .16, -.5); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fill();
    if (a.texto) { ctx.save(); ctx.translate(x, y + r * .08); ctx.scale(.001, .001); semEspelho(ctx); text(ctx, a.texto, 0, 0, r * 1000 * (a.texto.length > 2 ? .7 : 1), a.corTexto || '#fff', null, 0, 'Poppins', 700); ctx.restore(); }
  } },
  saia: { onde: 'roupa', cor: '#2e2829', desenha: (ctx, p, cor, f, a) => {   // saia com barra rasgada e cinto; "remendos": ['coracao', 'trans', 'folha', 'punho'], "corrente", "contas", "fita" (arco-íris)
    const { tw, tTop, tBot, lw } = p, cint = tTop + (a.cintura ?? .2), barra = tBot + (a.barra ?? .1), abre = tw * .14, n = 9, r = rng(5);
    const forma = () => {
      ctx.beginPath(); ctx.moveTo(-tw / 2, cint); ctx.lineTo(tw / 2, cint);
      for (let i = 0; i <= n; i++) ctx.lineTo(tw / 2 + abre - (tw + 2 * abre) * i / n, barra + (a.rasgada === false ? 0 : i % 2 ? -.022 - r() * .01 : .012 + r() * .008));
      ctx.closePath();
    };
    forma(); fillStroke(ctx, cor, lw);
    ctx.save(); forma(); ctx.clip(); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(tw * .28, cint, tw, 1); ctx.restore();   // lado na sombra
    if (a.corrente) for (let i = 0; i <= 8; i++) {   // corrente de elos prateados caindo do quadril para o meio
      const k = i / 8, x = lerp(-tw * .44, -tw * .04, k), y = cint + .04 + Math.sin(k * Math.PI) * .03;
      ctx.beginPath(); ctx.ellipse(x, y, .009, .0055, i % 2 ? .4 : -.4, 0, TAU); ctx.lineWidth = .004; ctx.strokeStyle = '#c9ccd2'; ctx.stroke();
    }
    if (a.contas) for (let i = 0; i <= 9; i++) {      // fio de contas amarelas do meio para o outro quadril
      const k = i / 9, x = lerp(-tw * .02, tw * .44, k), y = cint + .045 + Math.sin(k * Math.PI) * .032;
      ctx.beginPath(); ctx.arc(x, y, .0085, 0, TAU); fillStroke(ctx, '#f0a520', .003);
    }
    const vagas = [[-.25, .45], [-.03, .76], [.27, .43], [.31, .76], [-.27, .78]];   // em cima à esquerda, embaixo no meio, em cima à direita...
    (a.remendos || []).forEach((nome, i) => { const [vx, vy] = vagas[i % vagas.length]; REMENDOS[nome]?.(ctx, tw * vx, cint + (barra - cint) * vy, .034); });
    if (a.cinto !== false) {
      rrect(ctx, -tw / 2 - .004, cint - .004, tw + .008, .034, .006); fillStroke(ctx, '#1d1b1e', lw * .8);
      rrect(ctx, -.026, cint - .002, .052, .03, .006); ctx.lineWidth = .008; ctx.strokeStyle = '#c9ccd2'; ctx.stroke();   // fivela
      line(ctx, -.004, cint + .013, .016, cint + .013, .006, '#c9ccd2');
    }
    if (a.fita) {                                     // fita de arco-íris presa no cinto, caindo pela lateral
      const w = .0075, x0 = -tw / 2 - abre * .45, y0 = cint + .03;
      ARCO_IRIS.forEach((c, i) => {
        const x = x0 + i * w, y1 = barra + .035 + (i % 2 ? -.01 : 0);
        ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x + w, y0); ctx.lineTo(x + w, y1 - .01); ctx.lineTo(x + w / 2, y1); ctx.lineTo(x, y1 - .01); ctx.closePath();
        ctx.fillStyle = c; ctx.fill();
      });
      ctx.beginPath(); ctx.rect(x0, y0, w * 6, barra + .025 - y0); ctx.lineWidth = .004; ctx.strokeStyle = INK; ctx.stroke();
    }
  } },
  ecobag: { onde: 'roupa', cor: '#f3ead6', desenha: (ctx, p, cor, f, a) => {   // sacola de pano no ombro, ao lado do quadril; "estampa": 'che' (padrão) ou 'nenhuma'
    const { tw, tTop, tBot, lw } = p, x0 = -tw / 2 - .19, x1 = -tw / 2 - .035, y0 = tTop + .2, y1 = tBot + .1;   // pendurada por fora do braço parado
    line(ctx, -tw * .3, tTop, x1 - .03, y0 + .01, .024); line(ctx, -tw * .3, tTop, x1 - .03, y0 + .01, .013, cor);   // alça
    const corpo = () => { ctx.beginPath(); ctx.moveTo(x0 + .01, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1 + .006, y1 - .015); ctx.quadraticCurveTo(x1 + .006, y1, x1 - .012, y1); ctx.lineTo(x0 + .006, y1); ctx.quadraticCurveTo(x0 - .008, y1, x0 - .006, y1 - .015); ctx.closePath(); };
    corpo(); fillStroke(ctx, cor, lw);
    ctx.save(); corpo(); ctx.clip(); ctx.fillStyle = 'rgba(80,60,30,.12)'; ctx.fillRect(x1 - .03, y0, .05, 1); ctx.restore();
    if (a.estampa !== 'nenhuma') {                   // o retrato em estêncil: boina com estrela, cabelo e barba
      ctx.save(); ctx.translate(x0 + (x1 - x0) * .4, y0 + (y1 - y0) * .6); const k = (x1 - x0) * .28; ctx.scale(k, k);   // do lado de fora, onde a mão não cobre
      ellipse(ctx, .04, .12, .92, 1.0); ctx.fillStyle = INK; ctx.fill();
      ellipse(ctx, .14, .14, .52, .7, -.1); ctx.fillStyle = cor; ctx.fill();
      ellipse(ctx, -.06, -.72, .86, .36, -.25); ctx.fillStyle = INK; ctx.fill();
      star5(ctx, .06, -.74, .15, 0, '#d8231f');
      line(ctx, -.1, -.04, .06, -.07, .1); line(ctx, .24, -.08, .4, -.05, .1); line(ctx, .2, .02, .14, .22, .07);
      ellipse(ctx, .14, .58, .44, .24); ctx.fillStyle = INK; ctx.fill(); line(ctx, .02, .5, .27, .5, .05, cor);
      ctx.restore();
    }
  } },
  gargantilha: { onde: 'frente', cor: '#1d1b1e', desenha: (ctx, p, cor, f, a) => {   // choker de tachas logo abaixo do queixo; "pingente": 'venus' põe um colar fino com o símbolo
    const y = p.hy + p.hr * p.q + .012, w = .055;
    if (a.pingente) {
      ctx.beginPath(); ctx.moveTo(-w * .8 + p.hx, y + .01); ctx.quadraticCurveTo(p.hx, y + .09, p.hx + w * .8, y + .01); ctx.lineWidth = .004; ctx.strokeStyle = '#c9ccd2'; ctx.stroke();
      venus(ctx, p.hx, y + .062, .011, '#a35be0');
    }
    rrect(ctx, p.hx - w, y - .008, w * 2, .026, .01); fillStroke(ctx, cor, p.lw * .6);
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(p.hx + i * .022, y + .005, .006, 0, TAU); fillStroke(ctx, '#d9dce2', .003); }
  } },
  piercing: { onde: 'frente', cor: '#c9ccd2', desenha: (ctx, p, cor, f) => {   // argola no septo, com a pontinha do nariz
    const x = p.hx + (f.turn || 0) * .06, y = p.hy + (.085 + (f.mouthDy || 0)) * .6;
    ctx.beginPath(); ctx.arc(x, y - .016, .014, .25 * Math.PI, .75 * Math.PI); ctx.lineWidth = .008; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, .011, -.15, Math.PI + .15); ctx.lineWidth = .009; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = .005; ctx.strokeStyle = cor; ctx.stroke();
  } },
  delineado: { onde: 'frente', cor: '#221c22', desenha: (ctx, p, cor, f) => {   // traço de delineador no canto de fora de cada olho
    if (!['normal', 'half', 'smug', 'wide'].includes(f.eyes) || (f.blink || 0) > .5) return;
    const r = (f.eyeR || .042) * (f.eyes === 'wide' ? 1.3 : 1), rw = r * (f.eyeW || 1), half = f.eyes === 'half' || f.eyes === 'smug';
    for (const s of [-1, 1]) {
      const x = p.hx + s * .072 * (f.eyeDist || 1) + (f.turn || 0) * .06 + s * rw * (half ? 1 : .87), y = p.hy - .005 - r * (half ? .1 : .5);
      ctx.beginPath(); ctx.moveTo(x - s * .01, y + .002); ctx.lineTo(x + s * .024, y - .017); ctx.lineWidth = .01; ctx.strokeStyle = cor; ctx.lineCap = 'round'; ctx.stroke();
    }
  } },
};
const ARCO_IRIS = ['#e8302a', '#f68b1f', '#f7d117', '#2fa84f', '#2f6fd6', '#8a3fc4'];
// texto e logotipo não podem sair espelhados quando o personagem vira de lado (flip -1): desfaz o espelho do contexto
function semEspelho(ctx) { const m = ctx.getTransform(); if (m.a * m.d - m.b * m.c < 0) ctx.scale(-1, 1); }
// listras ao longo de um segmento (meia, pulseira): de "de" a "ate" (frações de p0 a p1), uma cor por listra, com contorno
function faixas(ctx, p0, p1, de, ate, cores, larg, lw) {
  const P = k => [p0[0] + (p1[0] - p0[0]) * k, p0[1] + (p1[1] - p0[1]) * k], a = P(de), b = P(ate);
  ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineWidth = larg + lw * 1.2; ctx.strokeStyle = INK; ctx.stroke();
  const n = cores.length;
  cores.forEach((c, i) => { ctx.beginPath(); ctx.moveTo(...P(de + (ate - de) * i / n + .004)); ctx.lineTo(...P(de + (ate - de) * (i + 1) / n - .004 * (i === n - 1))); ctx.lineWidth = larg; ctx.strokeStyle = c; ctx.stroke(); });
  ctx.lineCap = 'round';
}
// símbolo feminino (♀): argola e cruz embaixo
function venus(ctx, x, y, r, cor) {
  for (const [w, c] of [[r * .9, INK], [r * .45, cor]]) {
    ctx.beginPath(); ctx.arc(x, y - r * .4, r * .8, 0, TAU); ctx.moveTo(x, y + r * .4); ctx.lineTo(x, y + r * 1.6); ctx.moveTo(x - r * .55, y + r * 1.05); ctx.lineTo(x + r * .55, y + r * 1.05);
    ctx.lineWidth = w; ctx.strokeStyle = c; ctx.lineCap = 'round'; ctx.stroke();
  }
}
// remendos costurados na saia: cada um desenha centrado em (x, y), com tamanho k
const REMENDOS = {
  coracao: (ctx, x, y, k) => {   // coração de arco-íris
    const forma = () => { ctx.beginPath(); ctx.moveTo(x, y + k * .9); ctx.bezierCurveTo(x - k * 1.4, y + k * .05, x - k * .75, y - k * .95, x, y - k * .35); ctx.bezierCurveTo(x + k * .75, y - k * .95, x + k * 1.4, y + k * .05, x, y + k * .9); ctx.closePath(); };
    ctx.save(); forma(); ctx.clip(); ARCO_IRIS.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(x - k * 1.5, y - k * .8 + i * k * 1.7 / 6, k * 3, k * 1.7 / 6 + .001); }); ctx.restore();
    forma(); fillStroke(ctx, null, .005);
  },
  trans: (ctx, x, y, k) => {     // símbolo transgênero, roxo
    const s = k * .42, d = s * .7;
    for (const [w, c] of [[k * .3, INK], [k * .15, '#a35be0']]) {
      ctx.beginPath(); ctx.arc(x, y, s, 0, TAU);
      ctx.moveTo(x, y + s); ctx.lineTo(x, y + s * 2.2); ctx.moveTo(x - s * .55, y + s * 1.65); ctx.lineTo(x + s * .55, y + s * 1.65);   // ♀
      ctx.moveTo(x + d, y - d); ctx.lineTo(x + s * 1.9, y - s * 1.9); ctx.moveTo(x + s * 1.2, y - s * 1.9); ctx.lineTo(x + s * 1.9, y - s * 1.9); ctx.lineTo(x + s * 1.9, y - s * 1.2);   // ♂
      ctx.moveTo(x - d, y - d); ctx.lineTo(x - s * 1.9, y - s * 1.9); ctx.moveTo(x - s * 1.2, y - s * 1.9); ctx.lineTo(x - s * 1.9, y - s * 1.9); ctx.lineTo(x - s * 1.9, y - s * 1.2);
      ctx.moveTo(x - s * 1.05, y - s * 1.65); ctx.lineTo(x - s * 1.65, y - s * 1.05);   // traço do terceiro braço
      ctx.lineWidth = w; ctx.strokeStyle = c; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    }
  },
  folha: (ctx, x, y, k) => {     // broto de duas folhas
    line(ctx, x, y + k * .7, x, y - k * .05, k * .14, '#2e7d32');
    for (const s of [-1, 1]) { ellipse(ctx, x + s * k * .38, y - k * .2, k * .42, k * .22, s * -.6); fillStroke(ctx, '#4caf50', .004); }
  },
  punho: (ctx, x, y, k) => {     // punho erguido, branco num círculo preto
    circle(ctx, x, y, k * .85); fillStroke(ctx, '#1d1b1e', .004, '#f4f2ee');
    ctx.save(); circle(ctx, x, y, k * .8); ctx.clip(); ctx.fillStyle = '#f4f2ee';
    ctx.beginPath(); ctx.roundRect(x - k * .32, y - k * .42, k * .64, k * .42, k * .1); ctx.fill();
    ctx.fillRect(x - k * .22, y - k * .05, k * .44, k);
    for (let i = 1; i < 4; i++) line(ctx, x - k * .32 + i * k * .16, y - k * .42, x - k * .32 + i * k * .16, y - k * .2, k * .05, '#1d1b1e');
    ctx.restore();
  },
};

function personagem(ctx, quem, o = {}) {
  const f = ELENCO[quem];
  if (!f) throw new Error(`personagem "${quem}" não está no elenco: crie personagens/${quem}.json e cite-o em falas.json (ou em elenco.json)`);
  const rosto = f.rosto || {}, cab = f.cabelo || { estilo: 'careca' };
  const face = Object.assign({ eyes: rosto.olhos || 'normal', mouth: rosto.boca || 'smile', eyeR: .042 * (rosto.olhosTamanho || 1), eyeW: rosto.olhosLargura || 1, eyeDist: rosto.olhosDistancia || 1, mouthDy: (rosto.bocaAbaixo || 0) * .19, browW: rosto.sobrancelha || 1, browDy: (rosto.sobrancelhaAcima || 0) * .19 }, o.face);
  if (o.t != null && o.fala !== false) { const m = bocaFalando(o.t, quem); if (m) face.mouth = m; }
  if (o.t != null && face.blink == null) face.blink = piscada(o.t, quem);
  const estilo = CABELOS[cab.estilo] || CABELOS.careca, corCabelo = cab.cor || '#3b2216', mec = cab.mechas;
  const acs = (f.acessorios || []).map(a => typeof a === 'string' ? { tipo: a } : a).filter(a => ACESSORIOS[a.tipo]);
  // um acessório desenha numa camada ("onde" + "desenha") ou em várias (uma função por camada: roupa, manga...)
  const desenha = (onde, p) => acs.forEach(a => {
    const A = ACESSORIOS[a.tipo], fn = typeof A[onde] === 'function' ? A[onde] : A.onde === onde ? A.desenha : null;
    if (fn) fn(ctx, p, a.cor || A.cor || corCabelo, face, a);
  });
  const pele = f.pele || HEAD;
  drawStick(ctx, Object.assign({}, o, {
    s: (o.s || 400) * (f.altura || 1),
    cols: [f.camisa || '#2f63c9', f.listras || f.camisa || '#2f63c9'],
    belt: f.cinto ? undefined : false, hat: 'nenhum',
    pele, peleSombra: f.pele ? escurecer(f.pele) : HEAD_SH, blush: rosto.bochechas,
    iris: rosto.iris, cabeca: f.cabeca, queixo: f.queixo, tronco: f.tronco, pescoco: f.pescoco,
    membros: f.membros === 'pele' ? pele : f.membros,   // "pele": braços e pernas cor de pele com contorno
    face,
    costas: (c, hx, hy, hr) => camadasImagem(c, f, 'costas', hx, hy, hr),
    atras: (c, hx, hy, hr, lw) => { if (estilo.atras) estilo.atras(c, hx, hy, hr, lw, corCabelo, mec); desenha('atras', { hx, hy, hr, lw }); camadasImagem(c, f, 'atras', hx, hy, hr); },
    cabelo: (c, hx, hy, hr, lw) => { if (estilo.frente) estilo.frente(c, hx, hy, hr, lw, corCabelo, mec); desenha('rosto', { hx, hy, hr, lw }); camadasImagem(c, f, 'rosto', hx, hy, hr); },
    frente: (c, hx, hy, hr, lw) => { desenha('frente', { hx, hy, hr, lw, q: f.queixo || 1 }); camadasImagem(c, f, 'frente', hx, hy, hr); },
    roupa: (c, tw, tTop, tBot, lw) => desenha('roupa', { tw, tTop, tBot, lw, pele }),
    manga: (c, pts, side, lw) => desenha('manga', { pts, side, lw, pele }),
    perna: (c, pts, side, lw) => desenha('perna', { pts, side, lw, pele }),
    pe: (c, x, y, side, lw) => desenha('pe', { x, y, side, lw }),
  }));
}
