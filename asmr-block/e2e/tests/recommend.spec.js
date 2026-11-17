// @ts-check
const { test, expect, APP, newUser, api, loginWeb } = require('./helpers');

/** 나에게 맞는 추천: 빗소리 블록을 담고 조합에 쌓으면 → 상점 "나에게 맞는"·홈 "취향 저격 블록"·추천 조합이 빗소리 취향으로 */

async function rainLover(request) {
  const user = await newUser(request, 'rec');
  await api(request, 'POST', '/me/blocks/1', user.token);
  await api(request, 'POST', '/playlists', user.token, { title: '내 빗소리', isPublic: false, main: { items: [{ blockId: 1, repeat: 3 }] } });
  return user;
}

test('웹: 처음엔 요즘 인기 안내 → 빗소리를 담고 쌓으면 상점·홈·추천 조합이 빗소리 취향으로', async ({ page, request }) => {
  const fresh = await newUser(request, 'rec');
  await loginWeb(page, fresh);
  await page.goto('/shop?tab=forYou');
  await expect(page.getByTestId('rec-line')).toContainText('아직 취향을 잘 모르겠어요');

  const user = await rainLover(request);
  await page.evaluate(() => { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); });
  await loginWeb(page, user);
  await page.goto('/shop');
  await page.getByTestId('shop-tab-forYou').click();
  await expect(page.getByTestId('rec-line')).toContainText('빗소리');
  await expect(page.getByTestId('block-2')).toBeVisible();

  await page.goto('/');
  await expect(page.getByTestId('home-for-you')).toBeVisible();

  await page.goto('/combos');
  await page.getByTestId('combos-sort-forYou').click();
  await expect(page.getByTestId('rec-line')).toContainText('빗소리');
});

test.describe('앱', () => {
  test.use({ baseURL: APP, viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ request }) => {
    const up = await request.get(APP).then((r) => r.ok()).catch(() => false);
    test.skip(!up, `앱 미리보기가 꺼져 있어요 (${APP})`);
  });

  test('앱: 빗소리 취향 → 블록 구매 "내 취향" 탭과 홈 "취향 저격 블록"', async ({ page, request }) => {
    const user = await rainLover(request);
    await page.goto('/');
    await page.getByTestId('home-login').click();
    await page.getByPlaceholder('email@example.com').fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await page.getByTestId('submit').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'));
    await expect(page.getByTestId('home-for-you')).toBeVisible();
    await expect(page.getByText('취향 저격 블록')).toBeVisible();

    await page.locator('a[href="/explore"]').first().click();
    await page.getByTestId('tab-forYou').click();
    await expect(page.getByText(/빗소리.*취향으로 골랐어요/)).toBeVisible();
  });
});

test.describe('앱 (휴대폰은 영어, 계정은 한국어)', () => {
  test.use({ baseURL: APP, viewport: { width: 390, height: 844 }, locale: 'en-US' });

  test.beforeEach(async ({ request }) => {
    const up = await request.get(APP).then((r) => r.ok()).catch(() => false);
    test.skip(!up, `앱 미리보기가 꺼져 있어요 (${APP})`);
  });

  test('로그인하면 화면도 목록도 한국어 (취향 저격 블록에 영어 트리거 이름이 섞이지 않음)', async ({ page, request }) => {
    const user = await rainLover(request);
    await page.goto('/');
    await page.getByTestId('home-login').click();
    await page.getByPlaceholder('email@example.com').fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await page.getByTestId('submit').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'));
    const shelf = page.getByTestId('home-for-you');
    await expect(shelf).toContainText('취향 저격 블록');
    await expect(shelf).toContainText('빗소리');
    await expect(shelf).not.toContainText('Rain & Water');
  });
});
