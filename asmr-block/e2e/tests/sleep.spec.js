// @ts-check
const { test, expect, APP, newUser, api, loginWeb } = require('./helpers');

/**
 * 잠 기록: 내 정보 "최근 7일 잠 기록"에서 어젯밤을 눌러 😴 기록 (언제나),
 * 아침 "어젯밤 잘 잤어요?" 카드 (방금 튼 조합이 '어젯밤'이 되는 한국 시간 새벽 4시~오후 5시에만 — 그 밖엔 건너뜀, 시간 계산은 백엔드 SleepApiTest)
 */

const kstHour = () => Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
const yesterdayKst = () => {
  const now = new Date(Date.now() + 9 * 3600 * 1000 - 24 * 3600 * 1000);
  return now.toISOString().slice(0, 10);
};

async function listener(request) {
  const user = await newUser(request, 'sleep');
  await api(request, 'POST', '/me/blocks/1', user.token);
  const combo = await api(request, 'POST', '/playlists', user.token, { title: '비 오는 밤', isPublic: false, main: { items: [{ blockId: 1, repeat: 2 }] } });
  await api(request, 'POST', `/playlists/${combo.id}/play`, user.token);
  return user;
}

test('웹 내 정보: 최근 7일에서 어젯밤을 눌러 "잘 잤어요" 기록', async ({ page, request }) => {
  const user = await newUser(request, 'sleep');
  await loginWeb(page, user);
  await page.goto('/profile');
  const week = page.getByTestId('sleep-week');
  await expect(week).toContainText('최근 7일 잠 기록');
  await page.getByTestId(`sleep-night-${yesterdayKst()}`).click();
  await page.getByTestId('sleep-rate-good').click();
  await expect(page.getByTestId(`sleep-night-${yesterdayKst()}`)).toHaveAttribute('aria-label', /잘 잤어요/);
});

test('웹 홈: 아침에 "어젯밤 잘 잤어요?" → 잘 잤어요 → 고마워요 (한국 시간 4~17시만)', async ({ page, request }) => {
  const h = kstHour();
  test.skip(h < 4 || h >= 17, '방금 튼 조합이 "어젯밤"이 되는 시간이 아니에요');
  const user = await listener(request);
  await loginWeb(page, user);
  await page.goto('/');
  await expect(page.getByTestId('sleep-check')).toContainText('어젯밤 잘 잤어요?');
  await page.getByTestId('sleep-good').click();
  await expect(page.getByTestId('sleep-thanks')).toContainText('좋아요!');
  await page.reload();
  await expect(page.getByTestId('sleep-check')).toHaveCount(0);
});

test.describe('앱', () => {
  test.use({ baseURL: APP, viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ request }) => {
    const up = await request.get(APP).then((r) => r.ok()).catch(() => false);
    test.skip(!up, `앱 미리보기가 꺼져 있어요 (${APP})`);
  });

  test('앱: 내 정보 최근 7일 기록 · (4~17시면) 홈 아침 카드 건너뛰기', async ({ page, request }) => {
    const h = kstHour();
    const morning = h >= 4 && h < 17;
    const user = morning ? await listener(request) : await newUser(request, 'sleep');
    await page.goto('/');
    await page.getByTestId('home-login').click();
    await page.getByPlaceholder('email@example.com').fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await page.getByTestId('submit').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'));
    if (morning) {
      await expect(page.getByTestId('sleep-check')).toBeVisible();
      await page.getByTestId('sleep-skip').click();
      await expect(page.getByTestId('sleep-check')).toHaveCount(0);
    }
    await page.getByTestId('open-profile').filter({ visible: true }).first().click();
    await expect(page.getByTestId('sleep-week')).toBeVisible();
    await page.getByTestId(`sleep-night-${yesterdayKst()}`).click();
    await page.getByTestId('sleep-rate-bad').click();
    await expect(page.getByTestId(`sleep-night-${yesterdayKst()}`)).toHaveAttribute('aria-label', /못 잤어요/);
  });
});
