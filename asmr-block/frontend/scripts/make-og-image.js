/**
 * 링크 공유 그림(og-image.png, 1200×630) 만들기 — 카톡·페이스북·검색 결과에 링크를 붙이면 나오는 카드 그림
 * 사용: node scripts/make-og-image.js [Pretendard woff2 폴더]
 *   (폴더를 주면 Pretendard 글꼴로, 없으면 컴퓨터에 있는 한글 글꼴로 그림. Playwright 필요)
 * 그림 = 앱 아이콘과 같은 블록 셋(탭핑·바스락·귓속말 + 소리 막대) + 이름·한 줄 소개, 밤 바탕 + 분홍
 */
const path = require('path');
const { chromium } = require('playwright');

const TRIGGER = { tap: '#FF8A3D', crinkle: '#8CCB4E', whisper: '#FF6FA3' };
// lib/blocks.js shade와 같음: amount>0 흰색 쪽, <0 검은색 쪽
function shade(hex, amount) {
  const n = hex.replace('#', '');
  const target = amount > 0 ? 255 : 0;
  const t = Math.min(1, Math.abs(amount));
  const ch = (i) => Math.round(parseInt(n.slice(i, i + 2), 16) + (target - parseInt(n.slice(i, i + 2), 16)) * t).toString(16).padStart(2, '0');
  return `#${ch(0)}${ch(2)}${ch(4)}`;
}
const ART = [
  { c: TRIGGER.tap, x: 1, bars: [0.18, 0.9, 0.18, 0.84] },
  { c: TRIGGER.crinkle, x: 12.5, bars: [0.62, 0.8, 0.58, 0.84, 0.66] },
  { c: TRIGGER.whisper, x: 24, bars: [0.26, 0.46, 0.36, 0.5] },
];
const logo = ART.map((b) => {
  const edge = shade(b.c, -0.45);
  const barW = (9 - 3) / (b.bars.length * 2 - 1);
  const bars = b.bars.map((h, j) => {
    const bh = h * 6;
    return `<rect x="${1.5 + j * barW * 2}" y="${4.6 - bh / 2}" width="${barW}" height="${bh}" rx="0.3" fill="${shade(b.c, 0.72)}"/>`;
  }).join('');
  return `<g transform="translate(${b.x} 12)">
    <rect x="9.3" y="2" width="2" height="2.6" fill="${b.c}" stroke="${edge}" stroke-width="0.6"/>
    <rect x="9.3" y="6.6" width="2" height="2.6" fill="${b.c}" stroke="${edge}" stroke-width="0.6"/>
    <rect x="0" y="0" width="10" height="11" rx="1" fill="${b.c}" stroke="${edge}" stroke-width="0.8"/>
    <rect x="0.4" y="0.4" width="9.2" height="1.4" fill="${shade(b.c, 0.3)}"/>
    <rect x="0.4" y="8.8" width="9.2" height="1.8" fill="${shade(b.c, -0.2)}"/>${bars}</g>`;
}).join('');

const fontDir = process.argv[2];
const face = (weight, file) => (fontDir
  ? `@font-face{font-family:P;font-weight:${weight};src:url('file://${path.resolve(fontDir, file)}') format('woff2')}` : '');
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
${face(500, 'Pretendard-Medium.woff2')}${face(700, 'Pretendard-Bold.woff2')}${face(800, 'Pretendard-ExtraBold.woff2')}${face(900, 'Pretendard-Black.woff2')}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#0A0A0F;font-family:P,'Apple SD Gothic Neo','Noto Sans KR','WenQuanYi Zen Hei',sans-serif;color:#ECECF1;overflow:hidden;position:relative}
.plate{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.07) 2px,transparent 2.6px);background-size:28px 28px}
.glow{position:absolute;width:760px;height:760px;left:-180px;top:-120px;background:radial-gradient(circle,rgba(247,96,154,.22),transparent 62%)}
.mark{position:absolute;left:96px;top:135px;width:360px;height:360px;filter:drop-shadow(0 30px 50px rgba(0,0,0,.55))}
.text{position:absolute;left:520px;top:150px;right:72px}
.name{font-size:84px;font-weight:900;letter-spacing:-2px;line-height:1}
.name b{color:#F7609A}
.head{margin-top:30px;font-size:46px;font-weight:800;letter-spacing:-1px;line-height:1.25}
.head em{font-style:normal;color:#FF85AF}
.sub{margin-top:22px;font-size:26px;font-weight:500;color:#A7A7B5;line-height:1.5}
.foot{position:absolute;left:520px;bottom:64px;font-size:24px;font-weight:700;color:#8A8A99;display:flex;gap:14px;align-items:center}
.pill{background:rgba(247,96,154,.16);color:#FF85AF;border-radius:999px;padding:6px 16px;font-size:20px}
</style></head><body><div class="plate"></div><div class="glow"></div>
<svg class="mark" viewBox="0 0 36 36"><rect width="36" height="36" rx="9" fill="#14141D"/>${logo}</svg>
<div class="text"><div class="name">ASMR <b>Block</b></div>
<div class="head">나만의 <em>팅글</em>을<br/>블록으로 쌓아 보세요</div>
<div class="sub">탭핑·바스락·귓속말… 좋아하는 소리 블록만 골라<br/>딸깍 이어 붙이면 나한테 딱 맞는 ASMR</div></div>
<div class="foot">asmrblock.com <span class="pill">베타</span></div>
</body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const out = path.join(__dirname, '..', 'public', 'og-image.png');
  await page.screenshot({ path: out });
  await browser.close();
  console.log('만들었어요:', out);
})();
