// @ts-check
const { test, expect, APP, newUser, api, loginWeb, expectNoSideScroll } = require('./helpers');

/**
 * 잠 기록 다음: 내 정보 "이번 주 리포트"(잘 잔 밤·틀어 본 밤·들은 시간) + 홈 "잘 잤던 날 들은 조합" 다시 듣기.
 * 조합이 붙은 밤은 방금 튼 조합이 '어젯밤'이 되는 한국 시간 오후 5시 전에만 만들 수 있어서 그 부분만 시간에 따라 건너뜀
 * (지난주 비교·가장 잘 잔 조합의 계산은 백엔드 SleepApiTest)
 */

const kstHour = () => Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
const daysAgoKst = (n) => new Date(Date.now() + 9 * 3600 * 1000 - n * 24 * 3600 * 1000).toISOString().slice(0, 10);
const beforeFive = () => kstHour() < 17;

/** 조합 하나를 방금 틀고(→ 어젯밤) 어젯밤을 "잘 잤어요"로 → { user, comboId } */
async function sleptWell(request) {
  const user = await newUser(request, 'sleeprep');
  await api(request, 'POST', '/me/blocks/1', user.token);
  const combo = await api(request, 'POST', '/playlists', user.token, { title: '잘 잔 밤의 빗소리', isPublic: false, main: { items: [{ blockId: 1, repeat: 2 }] } });
  await api(request, 'POST', `/playlists/${combo.id}/play`, user.token);
  await api(request, 'PUT', `/me/sleep/nights/${daysAgoKst(1)}`, user.token, { rating: 3 });
  return { user, comboId: combo.id };
}

test('웹 내 정보: 이번 주 리포트 — 답한 밤만 있으면 잘 잔 밤 1번 · 틀어 본 밤 0번 · 들은 시간 – (지난주 없으면 비교 줄 없음)', async ({ page, request }) => {
  const user = await newUser(request, 'sleeprep');
  await api(request, 'PUT', `/me/sleep/nights/${daysAgoKst(2)}`, user.token, { rating: 3 });
  await api(request, 'PUT', `/me/sleep/nights/${daysAgoKst(3)}`, user.token, { rating: 1 });
  await page.setViewportSize({ width: 360, height: 800 });
  await loginWeb(page, user);
  await page.goto('/profile');
  const report = page.getByTestId('sleep-report');
  await expect(report.getByTestId('report-good')).toHaveText('1번');
  await expect(report.getByTestId('report-played')).toHaveText('0번');
  await expect(report.getByTestId('report-listened')).toHaveText('–');
  await expect(page.getByTestId('report-compare')).toHaveCount(0);
  await expect(page.getByTestId('sleep-best')).toHaveCount(0);
  await expectNoSideScroll(page);
  // 조합이 붙은 밤이 없으니 홈 카드도 없음
  await page.goto('/');
  await expect(page.getByTestId('tonight')).toBeVisible();
  await expect(page.getByTestId('good-combos')).toHaveCount(0);
});

test('웹 홈 "잘 잤던 날 들은 조합" → 누르면 듣기 화면, 내 정보에 이번 주 가장 잘 잔 조합 (한국 시간 17시 전만)', async ({ page, request }) => {
  test.skip(!beforeFive(), '방금 튼 조합이 "어젯밤"이 되는 시간이 아니에요');
  const { user, comboId } = await sleptWell(request);
  await page.setViewportSize({ width: 360, height: 800 });
  await loginWeb(page, user);
  await page.goto('/');
  const card = page.getByTestId('good-combos');
  await expect(card).toContainText('잘 잤던 날 들은 조합');
  await expect(card.getByTestId(`good-combo-${comboId}`)).toContainText('잘 잔 밤 1번');
  await expectNoSideScroll(page);

  await page.goto('/profile');
  await expect(page.getByTestId('report-played')).toHaveText('1번');
  await expect(page.getByTestId('sleep-best').getByTestId(`good-combo-${comboId}`)).toContainText('잘 잔 밤의 빗소리');
  await page.getByTestId('sleep-best').getByTestId(`good-combo-${comboId}`).click();
  await page.waitForURL(new RegExp(`/listen/${comboId}$`));
});

test.describe('앱', () => {
  test.use({ baseURL: APP, viewport: { width: 360, height: 800 } });

  test.beforeEach(async ({ request }) => {
    const up = await request.get(APP).then((r) => r.ok()).catch(() => false);
    test.skip(!up, `앱 미리보기가 꺼져 있어요 (${APP})`);
  });

  test('앱: 내 정보 이번 주 리포트 · (17시 전이면) 홈 "잘 잤던 날 들은 조합"', async ({ page, request }) => {
    const morning = beforeFive();
    let user;
    let comboId = 0;
    if (morning) {
      ({ user, comboId } = await sleptWell(request));
    } else {
      user = await newUser(request, 'sleeprep');
      await api(request, 'PUT', `/me/sleep/nights/${daysAgoKst(2)}`, user.token, { rating: 3 });
    }
    page.on('dialog', (d) => void d.accept());
    await page.goto('/');
    await page.getByTestId('home-login').click();
    await page.getByPlaceholder('email@example.com').fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await page.getByTestId('submit').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'));
    if (morning) {
      await expect(page.getByTestId('good-combos').getByTestId(`good-combo-${comboId}`)).toContainText('잘 잔 밤 1번');
    } else {
      await expect(page.getByTestId('good-combos')).toHaveCount(0);
    }
    await page.getByTestId('open-profile').filter({ visible: true }).first().click();
    await expect(page.getByTestId('sleep-report').getByTestId('report-good')).toHaveText('1번');
    if (morning) await expect(page.getByTestId('sleep-best')).toContainText('잘 잔 밤의 빗소리');
  });
});
