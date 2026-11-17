// @ts-check
const { test, expect, APP, newUser, loginWeb } = require('./helpers');

/**
 * 오늘 밤 조합: 한 줄 → (CI는 AI 키가 없어서) 낱말로 트리거를 찾아 두 줄 조합을 쌓고 듣기 화면으로.
 * 한 줄 없이 "내 취향대로"도. AI가 켜진 경우는 백엔드 TonightAiApiTest(가짜 Claude)가 확인
 */

test('웹: 예시 한 줄을 누르고 "이 느낌으로 쌓기" → 듣기 화면, 어떻게 쌓았는지 알림', async ({ page, request }) => {
  const user = await newUser(request, 'tonight');
  await loginWeb(page, user);
  await page.goto('/');
  const card = page.getByTestId('tonight');
  await expect(card).toBeVisible();
  await expect(page.getByTestId('tonight-go')).toBeDisabled();
  await card.getByTestId('tonight-example').first().click();
  await expect(page.getByTestId('tonight-input')).toHaveValue('비 오는 날 카페에서 책 읽는 느낌');
  await page.getByTestId('tonight-go').click();
  await page.waitForURL(/\/listen\/\d+/);
  await expect(page.getByText(/적은 말로 쌓았어요 · 바스락/)).toBeVisible();
  await expect(page.getByText(/오늘 밤 · 바스락/).first()).toBeVisible();
});

test('웹: 로그인 안 했어도 "내 취향대로 쌓기" → 베타 손님으로 바로 듣기 화면', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('tonight-taste').click();
  await page.waitForURL(/\/listen\/\d+/);
  await expect(page.getByText(/내 취향대로 쌓았어요/)).toBeVisible();
});

test('웹 영어: 카드·예시·알림이 영어', async ({ page, request }) => {
  const user = await newUser(request, 'tonight');
  await loginWeb(page, user);
  await page.goto('/?lang=en');
  await expect(page.getByTestId('tonight')).toContainText("Tonight's mix");
  await page.getByTestId('tonight-input').fill('whispers by a campfire');
  await page.getByTestId('tonight-go').click();
  await page.waitForURL(/\/listen\/\d+/);
  await expect(page.getByText(/Stacked from your words · /)).toBeVisible();
});

test.describe('앱', () => {
  test.use({ baseURL: APP, viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ request }) => {
    const up = await request.get(APP).then((r) => r.ok()).catch(() => false);
    test.skip(!up, `앱 미리보기가 꺼져 있어요 (${APP})`);
  });

  test('앱: 홈 오늘 밤 조합에 한 줄 → 플레이어 위에 어떻게 쌓았는지 한 줄', async ({ page, request }) => {
    const user = await newUser(request, 'tonight');
    await page.goto('/');
    await page.getByTestId('home-login').click();
    await page.getByPlaceholder('email@example.com').fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await page.getByTestId('submit').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'));
    await expect(page.getByTestId('tonight')).toBeVisible();
    await page.getByTestId('tonight-input').fill('모닥불 앞에서 듣는 귓속말');
    await page.getByTestId('tonight-go').click();
    await expect(page.getByTestId('player-notice')).toContainText('적은 말로 쌓았어요');
    await expect(page.getByTestId('player-title')).toContainText('오늘 밤');
  });
});
