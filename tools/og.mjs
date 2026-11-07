// Render the 1200×630 share image of the shelf home (og.png). Each imported book keeps its own <slug>/og.png.
// Usage: node tools/og.mjs   (rerun after books, chapters or simulators change). Needs Playwright.
// Covers use the same shelf.css and covers.js as the home page; stats are counted like shared/js/shelf.js.
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(root, f), 'utf8');
const window = {};
new Function('window', read('catalog.js'))(window);
const books = window.MEDICAL_BOOKS;
const live = books.filter((b) => b.status !== 'planned');
const chapters = live.reduce((n, b) => n + (b.chapters || 0), 0);
const simulators = Math.floor(live.reduce((n, b) => n + (b.simulators || 0), 0) / 50) * 50;
const titles = { bodybook: '몸' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const base = `
  html, body { margin:0; width:1200px; height:630px; overflow:hidden; }
  body { position:relative; color:#e6ebf5; font-family:var(--font); word-break:keep-all;
    background: radial-gradient(ellipse 70% 90% at 78% 45%, #1c2146 0%, transparent 70%), linear-gradient(160deg, #11152c, #0a0c17); }
  body::before { content:""; position:absolute; inset:0; opacity:.5;
    background-image:linear-gradient(#ffffff08 1px, transparent 1px), linear-gradient(90deg, #ffffff08 1px, transparent 1px); background-size:40px 40px; }
  .left { position:absolute; left:62px; top:70px; width:470px; }
  .brand { display:flex; align-items:center; gap:16px; font-size:29px; font-weight:800; letter-spacing:-.02em; }
  .brand svg { width:48px; height:48px; }
  .eyebrow { margin-top:48px; color:#f783ac; font:600 13px var(--mono); letter-spacing:.2em; }
  h1 { margin:16px 0 0; font-size:46px; line-height:1.3; font-weight:800; letter-spacing:-.04em; }
  h1 .soft { color:#a9c4ec; } h1 .warm { color:#f783ac; }
  .lead { margin:22px 0 0; color:#aeb8cc; font-size:17px; line-height:1.65; }
  .stats { display:flex; gap:22px; margin-top:26px; color:#aeb8cc; font-size:14px; }
  .stats b { margin-right:5px; color:#fff; font:700 21px var(--mono); }
  .url { position:absolute; left:62px; bottom:62px; color:#f783ac; font:600 15px var(--mono); }`;

const shelfCovers = books.map((b) => `<div class="book${b.status === 'planned' ? ' planned' : ''}"><div class="book-stand"><div class="book-cover" style="--c:${b.color}">
    <strong>${esc(titles[b.id] || b.title)}</strong><span class="book-art" data-motif="${esc(b.motif)}"></span><span class="book-foot"></span>
  </div></div></div>`).join('');

const shelf = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>${read('shelf.css')}</style><style>${base}
  .case { --gap:34px; position:absolute; left:760px; top:90px; width:240px; display:grid; grid-template-columns:repeat(1,1fr); column-gap:var(--gap); row-gap:34px; }
  .book.planned .book-cover { filter:saturate(.55) brightness(.8); }
  .book-cover { padding:12% 9% 9% 13%; }
  .book-cover strong { margin-top:0; font-size:34px; white-space:nowrap; letter-spacing:-.05em; }
  .book-art { margin:6% 0 8%; }
  .book-foot { padding-top:0; }
</style></head><body>
  <div class="left">
    <div class="brand">${read('favicon.svg')}<span>MedicalBooks</span></div>
    <div class="eyebrow">INTERACTIVE MEDICAL TEXTBOOKS</div>
    <h1>몸의 원리는 외우지 말고,<br><span class="soft">숫자로 따라가 보며</span><br><span class="warm">배우는 의학과 건강</span></h1>
    <p class="lead">심장과 폐, 혈당과 호르몬,<br>운동과 체중까지 한 서가에서.</p>
    <div class="stats"><span><b>${live.length}</b>권 공개</span><span><b>${chapters}</b>개 장</span><span><b>${simulators.toLocaleString('ko-KR')}+</b>시뮬레이터</span></div>
  </div>
  <div class="url">medical.euiyun.com</div>
  <div class="case">${shelfCovers}</div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const [html, out] of [[shelf, 'og.png']]) {
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.addScriptTag({ content: read('shared/js/covers.js') });
  await page.evaluate(async () => {
    document.querySelectorAll('[data-motif]').forEach((el) => { el.innerHTML = window.coverArt(el.dataset.motif); });
    await document.fonts.ready;
  });
  await page.screenshot({ path: join(root, out) });
}
await browser.close();
console.log(`og.png: ${live.length} books, ${chapters} chapters, ${simulators}+ simulators`);
