// @ts-check
const { test: base, expect } = require('@playwright/test');

const API = process.env.E2E_API_URL || 'http://localhost:8080/api/v1';
const APP = process.env.E2E_APP_URL || 'http://localhost:8081';
const ADMIN = { email: 'admin@asmrblock.com', password: 'password123' };

/** 처음 사용법 팝업·홈 화면 추가 배너는 본 것으로 (검사할 화면을 가리지 않게) */
const test = base.extend({
  context: async ({ context }, use) => {
    await context.addInitScript(() => {
      try {
        localStorage.setItem('asmr.guide.welcome.v1', 'done');
        localStorage.setItem('asmr.guide.editor.v1', 'done');
        localStorage.setItem('installBannerHidden', '1');
      } catch { /* 괜찮음 */ }
    });
    await use(context);
  },
});

/** API로 새 계정 만들기 (검사끼리 서로 영향 없게) */
async function newUser(request, prefix = 'e2e') {
  const tag = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  const user = { email: `${prefix}-${tag}@e2e.asmrblock.com`, password: 'password123', nickname: `${prefix}${tag.slice(-6)}` };
  const res = await request.post(`${API}/auth/signup`, { data: user });
  expect(res.status(), await res.text()).toBe(201);
  const login = await request.post(`${API}/auth/login`, { data: { email: user.email, password: user.password } });
  const body = await login.json();
  return { ...user, token: body.data.accessToken };
}

async function adminToken(request) {
  const res = await request.post(`${API}/auth/login`, { data: ADMIN });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).data.accessToken;
}

async function api(request, method, path, token, data) {
  const res = await request.fetch(`${API}${path}`, {
    method, data, headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const text = await res.text();
  expect(res.ok(), `${method} ${path} → ${res.status()} ${text}`).toBeTruthy();
  return text ? JSON.parse(text).data : null;
}

/** 웹 로그인 화면으로 로그인 */
async function loginWeb(page, user) {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(user.email);
  await page.getByTestId('login-password').fill(user.password);
  await page.getByTestId('login-password').press('Enter');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

/** 가로로 넘치지 않는지 (휴대폰에서 옆으로 밀리면 안 됨) */
async function expectNoSideScroll(page) {
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: window.innerWidth }));
  expect(scroll, `${page.url()} 가 옆으로 넘침`).toBeLessThanOrEqual(width + 1);
}

module.exports = { test, expect, API, APP, newUser, adminToken, api, loginWeb, expectNoSideScroll };

const fs = require('fs');
const path = require('path');
const TONE = path.join(__dirname, '..', 'fixtures', 'tone-15s.mp3');

/** 크리에이터가 블록을 올리고 관리자가 승인 → 블록 id (다른 검사의 샘플 블록을 건드리지 않게 따로 만듦) */
/** price: 유료 블록이면 코인 (없으면 무료) */
async function uploadApproved(request, creator, admin, title, price) {
  const groups = await api(request, 'GET', '/categories');
  const res = await request.post(`${API}/blocks`, {
    headers: { Authorization: `Bearer ${creator.token}` },
    multipart: {
      file: { name: 'tone.mp3', mimeType: 'audio/mpeg', buffer: fs.readFileSync(TONE) },
      title, categoryId: String(groups[0].children[0].id), license: 'OWN',
      ...(price ? { price: String(price) } : {}),
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  const id = (await res.json()).data.id;
  await api(request, 'PATCH', `/admin/blocks/${id}/status`, admin, { status: 'APPROVED' });
  return id;
}

module.exports.uploadApproved = uploadApproved;
module.exports.TONE = TONE;
