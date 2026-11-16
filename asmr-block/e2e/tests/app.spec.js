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
});
