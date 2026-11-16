// @ts-check
const { test, expect, API, newUser, api, loginWeb, expectNoSideScroll } = require('./helpers');

/** 영어판: 화면마다 영어 제목 · 옆으로 넘치지 않음 · 머리글·바닥글·제목에 한국어 없음 (블록 이름 같은 크리에이터 글은 그대로) */
const PAGES = [
  ['/', 'Stack your own'],
  ['/shop', 'Block Shop'],
  ['/combos', 'See how others stacked theirs'],
  ['/sell', 'Sell ASMR blocks'],
  ['/sell/guide', 'Recording guide'],
  ['/guide', 'What are tingles?'],
  ['/privacy', 'Privacy Policy'],
  ['/terms', 'Terms of Service'],
  ['/login', 'Log in'],
  ['/signup', 'Sign up'],
];

const HANGUL = /[가-힣]/;

/** 화면 뼈대(머리글·바닥글·h1·h2·버튼)에 남은 한국어 — 언어 고르기의 "한국어" 버튼은 빼고 */
async function chromeHangul(page) {
  return page.evaluate((source) => {
    const re = new RegExp(source);
    const left = [];
    document.querySelectorAll('header, footer, h1, h2, button, [role="button"], label, input[placeholder]').forEach((el) => {
      if (el.closest('[data-testid^="lang-"]') || el.closest('[data-testid^="block-"], [data-testid^="combo-"], [data-testid^="brick-"]')) return;
      const clone = el.cloneNode(true);
      clone.querySelectorAll('[data-testid^="lang-"], [data-testid="user-menu"]').forEach((x) => x.remove());
      const text = `${clone.textContent || ''} ${el.getAttribute('placeholder') || ''}`;
      if (re.test(text)) left.push(text.trim().slice(0, 60));
    });
    return [...new Set(left)];
  }, HANGUL.source);
}

test.describe('영어판 (브라우저 언어 English)', () => {
  test.use({ locale: 'en-US' });

  for (const [path, text] of PAGES) {
    test(`${path}: 영어로 열리고, 넘치지 않고, 뼈대에 한국어 없음`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(path);
      await expect(page.getByText(text).filter({ visible: true }).first()).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await page.waitForLoadState('networkidle');
      await expectNoSideScroll(page);
      expect(await chromeHangul(page)).toEqual([]);
      expect(errors).toEqual([]);
    });
  }

  test('영어판 약관에는 "한국어 원문이 우선" 안내 + 원문 보기 → 한국어로', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.getByTestId('legal-notice')).toBeVisible();
    await page.getByTestId('legal-notice').getByRole('button').click();
    await expect(page.getByRole('heading', { name: '이용약관' })).toBeVisible();
  });

  test('영어 화면에서 "베타로 바로 시작" → 손님 이름 Guest…, 계정 언어 en', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('beta-login').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'));
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    const me = await (await page.request.get(`${API}/users/me`, { headers: { Authorization: `Bearer ${token}` } })).json();
    expect(me.data.nickname).toMatch(/^Guest\d+$/);
    expect(me.data.language).toBe('en');
  });
});

test('언어 바꾸기: 한국어 → English (다시 열어도 그대로) → 로그인했으면 계정에도 저장', async ({ page, request }) => {
  const user = await newUser(request, 'lang');
  await loginWeb(page, user);
  await page.goto('/shop');
  await expect(page.getByRole('heading', { name: '블록 상점' })).toBeVisible();

  await page.locator('footer').getByTestId('lang-en').click();
  await expect(page.getByRole('heading', { name: 'Block Shop' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Block Shop' })).toBeVisible();
  await expect.poll(async () => (await api(request, 'GET', '/users/me', user.token)).language).toBe('en');

  // 휴대폰 메뉴의 언어 고르기로 다시 한국어
  await page.getByTestId('menu-toggle').click();
  await page.locator('header').getByTestId('lang-ko').click();
  await expect(page.getByRole('heading', { name: '블록 상점' })).toBeVisible();
  await expect.poll(async () => (await api(request, 'GET', '/users/me', user.token)).language).toBe('ko');
});

test('주소에 ?lang=en 을 붙이면 영어 (공유 링크용), 기본 한국어 브라우저도', async ({ page }) => {
  await page.goto('/guide?lang=en');
  await expect(page.getByRole('heading', { name: 'What are tingles?' })).toBeVisible();
});

test('서버 글도 화면 언어로: 언어를 바꾸면 듣기 화면의 조합 이름이 바로 바뀌고, 서버 오류 문장도 영어', async ({ page }) => {
  await page.goto('/listen/1');
  await expect(page.getByTestId('listen-title')).toHaveText('비 오는 밤 작업용');
  await page.locator('footer').getByTestId('lang-en').click();
  await expect(page.getByTestId('listen-title')).toHaveText('Rainy night work session');

  // 없는 계정으로 로그인 → 서버가 보낸 오류 문장이 영어 (시드 계정은 로그인 잠금이 걸리지 않게 안 씀)
  await page.goto('/login');
  await page.getByTestId('login-email').fill(`nobody-${Date.now()}@e2e.asmrblock.com`);
  await page.getByTestId('login-password').fill('wrong-password');
  await page.getByTestId('login-password').press('Enter');
  await expect(page.getByText('The email or password is incorrect.').first()).toBeVisible();
});
