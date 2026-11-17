/**
 * 스토어용 사진 만들기 (Playwright): 앱 웹 미리보기를 휴대폰 크기로 찍고 → 위에 한 줄 설명을 붙여 스토어 크기로.
 *
 *   구글 플레이   store/play/{ko,en}/0N-*.jpg      1080×2160 (긴 쪽이 짧은 쪽의 2배 이하)
 *   앱스토어      store/appstore/{ko,en}/0N-*.jpg  1320×2868 (6.9인치 아이폰)
 *   플레이 그래픽 store/play/{ko,en}/feature-graphic.png 1024×500, 아이콘 store/play/icon-512.png
 *
 * 준비: 서버(API)와 앱 웹 미리보기(APP)를 켜 둠. 샘플 블록만 있는 깨끗한 서버가 좋아요 (공개용 샘플과 같은 내용)
 *   cd asmr-block/mobile
 *   EXPO_PUBLIC_API_URL=http://localhost:8080/api/v1 npx expo export -p web --output-dir /tmp/app-web && npx serve -s /tmp/app-web -l 8081
 *   API=http://localhost:8080/api/v1 APP=http://localhost:8081 node scripts/make-store-shots.js
 * 새 계정을 만들어 무료 블록으로 조합 두 개를 쌓고, 완성본이 다 만들어지면 찍어요 (계정은 언어마다 하나씩)
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const API = (process.env.API || 'http://localhost:8080/api/v1').replace(/\/$/, '');
const APP = (process.env.APP || 'http://localhost:8081').replace(/\/$/, '');
const OUT = path.resolve(process.env.OUT || path.join(__dirname, '..', '..', 'store'));
const ICON = path.join(__dirname, '..', 'assets', 'icon.png');

const COLORS = { bg: '#0A0A0F', card: '#13131A', pink: '#F7609A', pinkText: '#FF85AF', text: '#ECECF1', muted: '#A1A1AE' };
const TRIGGER = { tap: '#FF8A3D', crinkle: '#8CCB4E', whisper: '#FF6FA3', rain: '#58A6F2', nature: '#40BF85', scratch: '#F2B93B' };

/** 화면마다 위에 붙는 한 줄 (제목 · 작은 글) */
const CAPTIONS = {
  ko: {
    home: ['내 조합을 바로 듣기', '오늘 밤도 누르기만 하면 돼요'],
    shop: ['좋아하는 트리거만 블록으로', '탭핑 · 바스락 · 귓속말 · 빗소리'],
    editor: ['딸깍 쌓아 만드는 나만의 ASMR', '둘째 줄엔 빗소리를 살짝 겹쳐요'],
    player: ['잠들 때까지 끊김 없이', '수면 타이머 · 화면을 꺼도 계속'],
    tonight: ['한 줄이면 오늘 밤 조합', '느낌을 적으면 블록을 쌓아 줘요'],
    combos: ['남이 쌓은 조합도 한 번에', '들어 보고 마음에 들면 담기'],
  },
  en: {
    home: ['Your combos, one tap away', 'Press play and drift off'],
    shop: ['Only the triggers you love', 'Tapping · crinkles · whispers · rain'],
    editor: ['Click blocks into your own ASMR', 'Layer soft rain on the second row'],
    player: ['Seamless until you fall asleep', 'Sleep timer · keeps playing with the screen off'],
    tonight: ["Tonight's mix in one line", 'Describe the mood, we stack the blocks'],
    combos: ["Save others' combos in one tap", 'Listen first, keep what you like'],
  },
};

const COMBOS = {
  ko: [{ title: '잠들기 전 탭핑 + 빗소리' }, { title: '비 오는 숲속의 밤' }],
  en: [{ title: 'Tapping + rain before bed' }, { title: 'Rainy forest night' }],
};
const TONIGHT_LINE = { ko: '비 오는 날 카페에서 책 읽는 느낌', en: 'Reading in a café on a rainy day' };
const FEATURE = {
  ko: ['나만의 팅글을 블록으로 쌓아요', '좋아하는 트리거만 골라 딸깍 · 잠들 때까지'],
  en: ['Stack your own tingles, block by block', 'Pick the triggers you love · listen until you sleep'],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(method, url, token, body, lang) {
  const res = await fetch(API + url, {
    method,
    headers: { 'Content-Type': 'application/json', 'Accept-Language': lang || 'ko', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${url} → ${res.status} ${JSON.stringify(json)}`);
  return json.data;
}

/** 언어마다 새 계정 + 무료 블록 담기 + 조합 두 개 (완성본까지) */
async function prepare(lang) {
  const tag = Date.now().toString(36);
  const user = { email: `store-${lang}-${tag}@asmrblock.com`, password: `Store-${tag}-pw`, nickname: lang === 'ko' ? '밤의팅글' : 'NightTingles', language: lang };
  await call('POST', '/auth/signup', null, user, lang);
  const { accessToken } = await call('POST', '/auth/login', null, { email: user.email, password: user.password }, lang);
  const blocks = (await call('GET', '/blocks?size=100&free=true&sort=popular', accessToken, null, lang)).content;
  const first = (code, skip = 0) => blocks.filter((b) => b.category?.groupCode === code)[skip];
  const pick = {
    tap: first('tap'), tap2: first('tap', 1) || first('tap'), crinkle: first('crinkle'), whisper: first('whisper'),
    rain: first('rain'), waves: first('rain', 1) || first('rain'), nature: first('nature'),
  };
  const missing = Object.entries(pick).filter(([, b]) => !b).map(([k]) => k);
  if (missing.length) throw new Error(`무료 블록이 없어요: ${missing.join(', ')}`);
  for (const b of new Set(Object.values(pick))) await call('POST', `/me/blocks/${b.id}`, accessToken, null, lang);

  const item = (b, repeat = 1) => ({ blockId: b.id, repeat });
  const combos = [];
  combos.push(await call('POST', '/playlists', accessToken, {
    title: COMBOS[lang][1].title, isPublic: false, listenMinutes: 240,
    main: { volume: 1, items: [item(pick.nature), item(pick.rain), item(pick.waves)] },
    mix: null,
  }, lang));
  combos.push(await call('POST', '/playlists', accessToken, {
    title: COMBOS[lang][0].title, isPublic: false, listenMinutes: 480,
    main: { volume: 1, items: [item(pick.tap), item(pick.crinkle), item(pick.whisper), item(pick.tap2)] },
    mix: { volume: 0.4, items: [{ blockId: pick.rain.id, repeat: 1, startSeconds: 60 }, { blockId: pick.waves.id, repeat: 1, startSeconds: 420 }] },
  }, lang));
  for (const c of combos) {
    await call('POST', `/playlists/${c.id}/render`, accessToken, null, lang);
    for (let i = 0; i < 90; i++) {
      const r = await call('GET', `/playlists/${c.id}/render`, accessToken, null, lang);
      if (r.status === 'DONE') break;
      if (r.status === 'FAILED') throw new Error(`완성본 실패: ${c.title}`);
      await sleep(2000);
    }
  }
  return { user, main: combos[1] };
}

/** 앱 화면 찍기 (390×844, 3배 = 1170×2532) */
async function capture(browser, lang, { user, main }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: lang === 'ko' ? 'ko-KR' : 'en-US' });
  await ctx.addInitScript(() => {
    try { localStorage.setItem('asmr.guide.welcome.v1', 'done'); localStorage.setItem('asmr.guide.editor.v1', 'done'); } catch { /* 없어도 됨 */ }
  });
  const page = await ctx.newPage();
  await page.goto(APP + '/');
  await page.getByTestId('home-login').click();
  await page.getByPlaceholder('email@example.com').fill(user.email);
  await page.locator('input[type="password"]').fill(user.password);
  await page.getByTestId('submit').click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await page.getByTestId(`hero-${main.id}`).waitFor({ timeout: 20000 });
  await sleep(1500);
  const shots = {};
  const snap = async (name) => { shots[name] = await page.screenshot({ type: 'png' }); };

  await snap('home');
  await page.getByTestId('tonight').scrollIntoViewIfNeeded();
  await page.getByTestId('tonight-input').fill(TONIGHT_LINE[lang]);
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.getByTestId('tonight').evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await sleep(600);
  await snap('tonight');

  for (const [route, name, wait] of [['/explore', 'shop', 2500], [`/editor/${main.id}`, 'editor', 3500], [`/player/${main.id}`, 'player', 3000], ['/combos', 'combos', 2500]]) {
    await page.goto(APP + route);
    await sleep(wait);
    await snap(name);
  }
  await ctx.close();
  return shots;
}

/** 위에 한 줄 설명 + 아래 휴대폰 화면 (둥근 모서리) */
function frameHtml(png, [title, sub], width, height) {
  const img = `data:image/png;base64,${png.toString('base64')}`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    * { margin: 0; box-sizing: border-box; }
    body { width: ${width}px; height: ${height}px; background: radial-gradient(120% 60% at 50% 0%, #2a1020 0%, ${COLORS.bg} 60%);
      font-family: 'Pretendard', 'Noto Sans KR', 'Noto Sans CJK KR', 'Apple SD Gothic Neo', sans-serif; color: ${COLORS.text};
      display: flex; flex-direction: column; align-items: center; overflow: hidden; }
    .cap { padding: ${Math.round(height * 0.055)}px ${Math.round(width * 0.08)}px 0; text-align: center; }
    h1 { font-size: ${Math.round(width * 0.068)}px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.2; }
    p { margin-top: ${Math.round(height * 0.01)}px; font-size: ${Math.round(width * 0.036)}px; color: ${COLORS.pinkText}; font-weight: 600; }
    .phone { margin-top: ${Math.round(height * 0.035)}px; width: ${Math.round(width * 0.8)}px; border-radius: ${Math.round(width * 0.06)}px;
      border: ${Math.max(3, Math.round(width * 0.006))}px solid #2a2a36; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.04); }
    .phone img { display: block; width: 100%; }
  </style></head><body><div class="cap"><h1>${title}</h1><p>${sub}</p></div><div class="phone"><img src="${img}"></div></body></html>`;
}

function featureHtml(lang) {
  const icon = `data:image/png;base64,${fs.readFileSync(ICON).toString('base64')}`;
  const bricks = [['tap', 150], ['crinkle', 110], ['whisper', 120], ['scratch', 100]]
    .map(([k, w]) => `<span class="b" style="width:${w}px;background:${TRIGGER[k]}"><i style="background:${TRIGGER[k]}"></i></span>`).join('');
  const [title, sub] = FEATURE[lang];
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    * { margin: 0; box-sizing: border-box; }
    body { width: 1024px; height: 500px; background: radial-gradient(100% 120% at 0% 0%, #2a1020 0%, ${COLORS.bg} 55%); color: ${COLORS.text};
      font-family: 'Pretendard', 'Noto Sans KR', 'Noto Sans CJK KR', sans-serif; display: flex; align-items: center; padding: 0 70px; gap: 48px; overflow: hidden; }
    .icon { width: 150px; height: 150px; border-radius: 34px; box-shadow: 0 20px 60px rgba(0,0,0,.5); }
    h1 { font-size: 30px; font-weight: 800; color: ${COLORS.pinkText}; letter-spacing: -0.01em; }
    h2 { margin-top: 6px; font-size: 44px; font-weight: 900; letter-spacing: -0.03em; line-height: 1.15; }
    p { margin-top: 12px; font-size: 22px; color: ${COLORS.muted}; }
    .row { margin-top: 26px; display: flex; padding: 12px 22px 12px 12px; background: #0E0E14; border-radius: 14px; width: fit-content; }
    .b { position: relative; height: 46px; border: 2px solid rgba(0,0,0,.45); border-bottom-width: 6px; border-radius: 3px; }
    .b i { position: absolute; right: -8px; top: 12px; width: 8px; height: 14px; border-radius: 0 3px 3px 0; }
    .rain { margin: 8px 0 0 120px; width: 220px; height: 22px; background: ${TRIGGER.rain}; border: 2px solid rgba(0,0,0,.45); border-bottom-width: 4px; border-radius: 3px; opacity: .9; }
  </style></head><body><img class="icon" src="${icon}"><div><h1>ASMR Block</h1><h2>${title}</h2><p>${sub}</p>
    <div class="row">${bricks}</div><div class="rain"></div></div></body></html>`;
}

async function render(browser, html, width, height, file, type) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, type, ...(type === 'jpeg' ? { quality: 88 } : {}) });
  await page.close();
  console.log('  ', path.relative(process.cwd(), file));
}

(async () => {
  const browser = await chromium.launch();
  const order = ['home', 'tonight', 'editor', 'player', 'shop', 'combos'];
  for (const lang of ['ko', 'en']) {
    console.log(`[${lang}] 계정·조합 준비 (완성본까지 기다려요)`);
    const data = await prepare(lang);
    const shots = await capture(browser, lang, data);
    for (const [i, name] of order.entries()) {
      const n = `${String(i + 1).padStart(2, '0')}-${name}.jpg`;
      await render(browser, frameHtml(shots[name], CAPTIONS[lang][name], 1080, 2160), 1080, 2160, path.join(OUT, 'play', lang, n), 'jpeg');
      await render(browser, frameHtml(shots[name], CAPTIONS[lang][name], 1320, 2868), 1320, 2868, path.join(OUT, 'appstore', lang, n), 'jpeg');
    }
    await render(browser, featureHtml(lang), 1024, 500, path.join(OUT, 'play', lang, 'feature-graphic.png'), 'png');
  }
  const icon = `data:image/png;base64,${fs.readFileSync(ICON).toString('base64')}`;
  await render(browser, `<html><body style="margin:0"><img src="${icon}" style="width:512px;height:512px;display:block"></body></html>`,
    512, 512, path.join(OUT, 'play', 'icon-512.png'), 'png');
  await browser.close();
  console.log('끝:', OUT);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
