// Ficha visual de um personagem: o boneco em 5 poses, para conferir o visual antes de usar num vídeo.
//   node <engine>/tools/ficha.js personagens/duda.json [saida.png]      (padrão: personagens/duda.png, ao lado da ficha)
// (Playwright vem de kit/node_modules: defina NODE_PATH=<kit>/node_modules, como o make.py faz)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), url = require('url');
(async () => {
  const arq = process.argv[2];
  if (!arq) { console.log('uso: node ficha.js personagens/<id>.json [saida.png]'); process.exit(1); }
  const ficha = JSON.parse(fs.readFileSync(arq, 'utf8'));
  for (const im of ficha.imagens || []) im.dados = 'data:image/png;base64,' + fs.readFileSync(path.join(path.dirname(arq), im.arquivo)).toString('base64');
  const id = path.basename(arq, '.json');
  const saida = process.argv[3] || arq.replace(/\.json$/, '.png');
  const browser = await chromium.launch({ ...(process.env.CHROME ? { executablePath: process.env.CHROME } : {}), args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('pageerror', e => { console.log('[erro]', e.message); process.exitCode = 1; });
  await page.goto(url.pathToFileURL(path.join(__dirname, 'ficha.html')).href);
  await page.evaluate(() => document.fonts.load('700 40px Poppins'));
  await page.evaluate(async ([f, id]) => { await window.desenharFicha(f, id); }, [ficha, id]);
  await (await page.$('#c')).screenshot({ path: saida });
  await browser.close();
  console.log('ficha:', saida);
})();
