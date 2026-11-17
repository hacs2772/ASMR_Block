// @ts-check
const { test, expect, APP, newUser, adminToken, api, loginWeb, expectNoSideScroll, uploadApproved } = require('./helpers');

/** 크리에이터 통계: 내 블록을 남이 담고 · 조합에 쓰고 · 들으면 판매 화면에 숫자와 14일 막대 */

/** 크리에이터 블록 하나 + 팬 한 명이 담고 조합을 만들어 틀고 블록도 들어 봄 → { creator, id } */
async function creatorWithFan(request, title) {
  const admin = await adminToken(request);
  const creator = await newUser(request, 'stats');
  const id = await uploadApproved(request, creator, admin, title);
  const fan = await newUser(request, 'fan');
  await api(request, 'POST', `/me/blocks/${id}`, fan.token);
  const combo = await api(request, 'POST', '/playlists', fan.token,
    { title: '팬 조합', isPublic: false, main: { items: [{ blockId: id, repeat: 2 }] } });
  await api(request, 'POST', `/playlists/${combo.id}/play`, fan.token);
  await api(request, 'POST', `/blocks/${id}/play`, fan.token);
  return { creator, id };
}

test('웹: 판매 화면 "내 블록 통계" — 담은 사람·쓰인 조합·14일 막대(담김 ↔ 들음) + 블록마다 숫자', async ({ page, request }) => {
  const { creator, id } = await creatorWithFan(request, '통계 볼 블록');
  await page.setViewportSize({ width: 360, height: 800 });
  await loginWeb(page, creator);
  await page.goto('/sell#mine');

  const card = page.getByTestId('creator-stats');
  await expect(card.getByTestId('cstats-collectors')).toHaveText('1명');
  await expect(card.getByTestId('cstats-combos')).toHaveText('1개');
  await expect(card.getByTestId('cstats-collects')).toHaveText('1명');
  await expect(card.getByTestId('cstats-plays')).toHaveText('2번');
  await expect(card.getByTestId('cstats-listed')).toContainText('상점에 보이는 블록 1개');

  // 오늘 막대 = 마지막 칸, 들음으로 바꾸면 제목·막대 숫자도 바뀜
  await expect(card.getByTestId('cstats-bar-13')).toHaveAttribute('aria-label', /1명이 담음$/);
  await card.getByTestId('cstats-plays-tile').click();
  await expect(card.getByTestId('cstats-chart-title')).toHaveText('최근 14일 들은 횟수');
  await expect(card.getByTestId('cstats-bar-13')).toHaveAttribute('aria-label', /2번 들음$/);
  await card.getByTestId('cstats-bar-13').hover();
  await expect(card.getByTestId('cstats-tip')).toContainText('2번 들음');

  await expect(page.getByTestId(`upload-numbers-${id}`)).toHaveText('담은 사람 1명 · 조합 1개 · 이번 주 +1');
  await expectNoSideScroll(page);
});

test('웹: 아직 아무도 안 담았으면 "아직 기록이 없어요"', async ({ page, request }) => {
  const admin = await adminToken(request);
  const creator = await newUser(request, 'stats');
  await uploadApproved(request, creator, admin, '혼자인 블록');
  await loginWeb(page, creator);
  await page.goto('/sell#mine');
  await expect(page.getByTestId('cstats-collectors')).toHaveText('0명');
  await expect(page.getByTestId('cstats-empty')).toBeVisible();
});

test.describe('앱', () => {
  test.use({ baseURL: APP, viewport: { width: 360, height: 800 } });

  test.beforeEach(async ({ request }) => {
    const up = await request.get(APP).then((r) => r.ok()).catch(() => false);
    test.skip(!up, `앱 미리보기가 꺼져 있어요 (${APP})`);
  });

  test('앱: 블록 판매 탭 "내 블록 통계" + 막대를 누르면 그날 숫자', async ({ page, request }) => {
    const { creator, id } = await creatorWithFan(request, '앱 통계 블록');
    page.on('dialog', (d) => void d.accept());
    await page.goto('/');
    await page.getByTestId('home-login').click();
    await page.getByPlaceholder('email@example.com').fill(creator.email);
    await page.locator('input[type="password"]').fill(creator.password);
    await page.getByTestId('submit').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'));
    await page.locator('a[href="/upload"]').first().click();

    const card = page.getByTestId('creator-stats');
    await expect(card.getByTestId('cstats-collectors')).toHaveText('1명');
    await expect(card.getByTestId('cstats-combos')).toHaveText('1개');
    await card.getByTestId('cstats-plays-tile').click();
    await expect(card.getByTestId('cstats-chart-title')).toHaveText('최근 14일 들은 횟수');
    await card.getByTestId('cstats-bar-13').click();
    await expect(card.getByTestId('cstats-tip')).toContainText('2번 들음');
    await expect(page.getByTestId(`upload-numbers-${id}`)).toContainText('담은 사람 1명');
  });
});
