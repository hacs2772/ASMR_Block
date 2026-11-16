// @ts-check
const { test, expect, APP, newUser, adminToken, api, uploadApproved } = require('./helpers');

// 앱(Expo 웹 미리보기)이 떠 있을 때만: E2E_APP_URL (기본 http://localhost:8081)
test.describe('앱', () => {
  test.use({ baseURL: APP, viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ request }) => {
    const up = await request.get(APP).then((r) => r.ok()).catch(() => false);
    test.skip(!up, `앱 미리보기가 꺼져 있어요 (${APP})`);
  });

  test('블록 구매 → @닉네임 → 크리에이터 페이지, 블록 판매 → 녹음 가이드', async ({ page }) => {
    await page.goto('/explore');
    const link = page.locator('[data-testid^="creator-link-"]').first();
    await link.click();
    await page.waitForURL(/\/creator\/\d+/);
    await expect(page.getByTestId('creator-name')).toBeVisible();
    await expect(page.getByTestId('creator-stats')).toContainText('블록');

    await page.goto('/upload');
    await page.getByTestId('upload-recording-guide').click();
    await expect(page.getByTestId('rec-checklist')).toBeVisible();
    for (const k of ['quiet', 'airplane', 'distance', 'stand', 'silence']) await page.getByTestId(`rec-check-${k}`).click();
    await expect(page.getByTestId('rec-check-count')).toHaveText('준비 끝!');
  });

  test('로그인 → 종 배지 → 알림 화면(승인 소식) → 담김 소식 끄기', async ({ page, request }) => {
    const creator = await newUser(request, 'app');
    const admin = await adminToken(request);
    await uploadApproved(request, creator, admin, '앱 검사 블록');

    // 웹 미리보기는 새로 고치면 로그인이 풀려서, 홈에서 로그인 화면을 열고 돌아옴
    await page.goto('/');
    await page.getByTestId('home-login').click();
    await page.getByPlaceholder('email@example.com').fill(creator.email);
    await page.locator('input[type="password"]').fill(creator.password);
    await page.getByTestId('submit').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'));
    await expect(page.getByTestId('notif-count').first()).toHaveText('1');
    await page.getByTestId('open-notifications').first().click();
    await page.waitForURL(/\/notifications/);
    await expect(page.getByText('‘앱 검사 블록’ 블록이 승인돼서 블록 상점에 올라갔어요')).toBeVisible();

    await page.getByTestId('notif-toggle-collect').click();
    await expect.poll(async () => (await api(request, 'GET', '/me/notifications/summary', creator.token)).settings.collect).toBe(false);
    expect((await api(request, 'GET', '/me/notifications/summary', creator.token)).unread).toBe(0);
  });

  test('코인으로 유료 블록 사기 → 내 정보 → 코인 내역', async ({ page, request }) => {
    const admin = await adminToken(request);
    const creator = await newUser(request, 'appcoin');
    const creatorId = (await api(request, 'GET', '/users/me', creator.token)).id;
    const blockId = await uploadApproved(request, creator, admin, '앱 코인 블록', 20);
    const buyer = await newUser(request, 'appbuy');
    await api(request, 'POST', '/admin/coins/grant', admin, { userId: (await api(request, 'GET', '/users/me', buyer.token)).id, amount: 50 });

    // 확인 창(웹 미리보기는 브라우저 confirm/alert)은 모두 확인
    const dialogs = [];
    page.on('dialog', (d) => { dialogs.push(d.message()); void d.accept(); });
    await page.goto('/');
    await page.getByTestId('home-login').click();
    await page.getByPlaceholder('email@example.com').fill(buyer.email);
    await page.locator('input[type="password"]').fill(buyer.password);
    await page.getByTestId('submit').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'));
    await page.getByTestId('open-profile').first().click();
    await expect(page.getByTestId('wallet-balance')).toHaveText('50코인');

    await page.goto(`/creator/${creatorId}`);
    await page.getByTestId(`buy-${blockId}`).click();
    await expect.poll(async () => (await api(request, 'GET', '/me/wallet', buyer.token)).balance).toBe(30);
    expect(dialogs[0]).toContain('지금 내 코인 50 → 사고 나면 30');
    await expect(page.getByTestId(`buy-${blockId}`)).toBeHidden();
  });
});

// 앱 영어판: 휴대폰 언어가 영어면 영어로, 내 정보에서 바꾸면 바로 바뀌고 다시 열어도 그대로
test.describe('앱 영어판', () => {
  test.use({ baseURL: APP, viewport: { width: 360, height: 780 }, locale: 'en-US' });

  test.beforeEach(async ({ request, context }) => {
    const up = await request.get(APP).then((r) => r.ok()).catch(() => false);
    test.skip(!up, `앱 미리보기가 꺼져 있어요 (${APP})`);
    await context.addInitScript(() => {
      try { localStorage.setItem('asmr.guide.welcome.v1', 'done'); localStorage.setItem('asmr.guide.editor.v1', 'done'); } catch { /* 괜찮음 */ }
    });
  });

  /** 화면 밖으로 나간 요소 (옆으로 넘침) — 가로로 미는 목록 안은 빼고 */
  const offscreen = (page) => page.evaluate(() => {
    const W = window.innerWidth;
    const inScroller = (el) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowX)) return true;
      }
      return false;
    };
    return [...document.querySelectorAll('body *')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && (r.right > W + 1 || r.left < -1) && !inScroller(el);
    }).map((el) => (el.innerText || '').slice(0, 40));
  });

  test('영어 휴대폰: 탭·화면 이름이 영어, 화면 밖으로 넘치지 않음, 블록 판매·녹음 가이드도 영어', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/explore');
    await expect(page.getByText('Block Shop').first()).toBeVisible();
    await expect(page.locator('a[href="/explore"]').first()).toContainText('Shop');
    await expect(page.locator('a[href="/library"]').first()).toContainText('Build');
    await expect(page.getByTestId('tab-hot')).toHaveText('Trending');
    expect(await offscreen(page)).toEqual([]);

    // 서버 글도 영어 (조합 영어 제목, V15)
    await page.goto('/player/1');
    await expect(page.getByText('Rainy night work session').first()).toBeVisible();

    await page.goto('/upload');
    await expect(page.getByText('Sell ASMR blocks').first()).toBeVisible();
    await page.getByTestId('upload-recording-guide').click();
    for (const k of ['quiet', 'airplane', 'distance', 'stand', 'silence']) await page.getByTestId(`rec-check-${k}`).click();
    await expect(page.getByTestId('rec-check-count')).toHaveText('All set!');
    expect(await offscreen(page)).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('내 정보에서 한국어로 바꾸면 바로 바뀌고, 다시 열어도 그대로 → 다시 영어', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('a[href="/explore"]').first()).toContainText('Shop');
    await page.getByTestId('open-profile').click();
    await page.getByTestId('lang-ko').click();
    await page.goBack();
    await expect(page.locator('a[href="/explore"]').first()).toContainText('블록 구매');
    await page.reload();
    await expect(page.locator('a[href="/explore"]').first()).toContainText('블록 구매');
    await page.getByTestId('open-profile').click();
    await page.getByTestId('lang-en').click();
    await page.goBack();
    await expect(page.locator('a[href="/explore"]').first()).toContainText('Shop');
  });

  test('영어로 "베타로 바로 시작" → 손님 이름 Guest…', async ({ page }) => {
    await page.goto('/');
    // 베타 버튼은 서버에 "베타 중인지" 물어본 뒤에 나옴 → 안 보이면 로그인 화면을 다시 열어 다시 물어봄
    const beta = page.getByTestId('beta-login').filter({ visible: true }).first();
    for (let i = 0; i < 3; i++) {
      await page.getByTestId('home-login').filter({ visible: true }).first().click();
      if (await beta.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true).catch(() => false)) break;
      await page.goBack();
    }
    await beta.click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'));
    await page.getByTestId('open-profile').filter({ visible: true }).first().click();
    await expect(page.getByText(/^Guest\d+$/)).toBeVisible();
  });
});
