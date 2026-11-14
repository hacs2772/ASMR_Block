/**
 * 앱 아이콘·첫 화면 이미지 만들기 (디자인: "블록마다 다른 소리" — 탭핑·바스락·귓속말 블록 셋에 각자 소리 막대)
 *
 * 사용법 (Playwright 필요):  node scripts/make-app-icons.js
 * → assets/ 의 icon.png · android-icon-*.png · splash-icon.png · favicon.png 를 다시 만듦
 *
 * 블록 모양은 앱의 Brick(C안: 각진 모서리 · 진한 테두리 · 아래 두께 · 네모 돌기)과 같음.
 * 색을 바꾸면 src/theme.ts 의 triggerColor / colors 와 맞춰 주세요.
 */
const path = require('path');
const { chromium } = require('playwright');

const OUT = path.join(__dirname, '..', 'assets');
const COLORS = { bg: '#0A0A0F', top: '#1D1D2A', tap: '#FF8A3D', crinkle: '#8CCB4E', whisper: '#FF6FA3', pink: '#FF85AF', faint: '#A1A1AE' };

/** 블록 셋 그림 (크기 --s 에 비례). 블록마다 그 트리거다운 소리 막대 */
const ART = [
  { c: COLORS.tap, left: 0.06, bars: [18, 90, 18, 84], bw: '12%' },
  { c: COLORS.crinkle, left: 0.35, bars: [62, 80, 58, 84, 66], bw: '10%' },
  { c: COLORS.whisper, left: 0.64, bars: [26, 46, 36, 50], bw: '12%' },
].map((b) =>
  `<div class="bk" style="--c:${b.c};--w:calc(var(--s) * .28);--h:calc(var(--s) * .3);left:calc(var(--s) * ${b.left});top:calc(var(--s) * .35)">` +
  '<i class="st a"></i><i class="st b"></i><div class="f"></div>' +
  `<div class="bars" style="--bw:${b.bw}">${b.bars.map((v) => `<i style="height:${v}%"></i>`).join('')}</div></div>`,
).join('');

const HTML = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@700&display=swap">
<style>
body{margin:0;background:transparent}
.frame{position:relative;width:1024px;height:1024px;margin-bottom:20px}
.art{position:absolute;width:var(--s);height:var(--s)}
.opaque{background:radial-gradient(120% 100% at 30% 15%,${COLORS.top},${COLORS.bg} 72%)}
.bk{--l2:color-mix(in srgb,var(--c) 84%,#fff);--d:color-mix(in srgb,var(--c) 78%,#000);--d2:color-mix(in srgb,var(--c) 56%,#000);position:absolute;width:var(--w);height:var(--h)}
.bk .f{position:absolute;inset:0;z-index:1;border-radius:calc(var(--h) * .08);border:calc(var(--h) * .06) solid var(--d2);overflow:hidden;
  background:linear-gradient(180deg,var(--l2) 0 13%,var(--c) 13%);box-shadow:inset 0 calc(var(--h) * -.17) 0 var(--d),0 calc(var(--h) * .12) 0 rgba(0,0,0,.45)}
.bk .st{position:absolute;z-index:0;right:calc(var(--h) * -.21);width:calc(var(--h) * .24);height:calc(var(--h) * .27);
  border:calc(var(--h) * .06) solid var(--d2);border-left:0;border-radius:0 3px 3px 0;background:linear-gradient(180deg,var(--l2) 0 28%,var(--c) 28%)}
.bk .st.a{top:15%}.bk .st.b{top:55%}
.bars{position:absolute;inset:16% 12% 24% 12%;display:flex;align-items:center;justify-content:space-between;z-index:2}
.bars i{width:var(--bw);border-radius:calc(var(--h) * .03);background:color-mix(in srgb,var(--c) 30%,#fff);box-shadow:0 calc(var(--h) * .02) 0 var(--d2)}
.mono .bk .f,.mono .bk .st{background:#fff;border-color:#fff;box-shadow:none}
.mono .bars i{background:transparent;box-shadow:none}
.mono .bars{display:none}
.word{position:absolute;left:0;right:0;text-align:center;font-family:'IBM Plex Sans KR',sans-serif;font-weight:700}
.word.name{top:690px;font-size:118px;letter-spacing:-3px;color:#ECECF1}
.word.name b{color:${COLORS.pink}}
.word.tag{top:850px;font-size:50px;color:${COLORS.faint};letter-spacing:-1px}
.fav{position:relative;width:48px;height:48px;border-radius:11px;overflow:hidden}
</style></head><body>
<div class="frame opaque" id="icon"><div class="art" style="--s:880px;left:50px;top:72px">${ART}</div></div>
<div class="frame" id="fg"><div class="art" style="--s:640px;left:192px;top:192px">${ART}</div></div>
<div class="frame opaque" id="bgimg"></div>
<div class="frame mono" id="mono"><div class="art" style="--s:640px;left:192px;top:192px">${ART}</div></div>
<div class="frame" id="splash"><div class="art" style="--s:860px;left:82px;top:20px">${ART}</div>
  <div class="word name">ASMR <b>Block</b></div><div class="word tag">나만의 팅글을 블록으로</div></div>
<div class="fav opaque" id="fav"><div class="art" style="--s:46px;left:1px;top:2px">${ART}</div></div>
</body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 1100 }, deviceScaleFactor: 1 });
  await page.setContent(HTML, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const files = [
    ['#icon', 'icon.png', false],
    ['#fg', 'android-icon-foreground.png', true],
    ['#bgimg', 'android-icon-background.png', false],
    ['#mono', 'android-icon-monochrome.png', true],
    ['#splash', 'splash-icon.png', true],
    ['#fav', 'favicon.png', true],
  ];
  for (const [selector, name, transparent] of files) {
    await page.locator(selector).screenshot({ path: path.join(OUT, name), omitBackground: transparent });
    console.log('  +', name);
  }
  await browser.close();
})();
