// @ts-check
const { test, expect, newUser, api, loginWeb, expectNoSideScroll } = require('./helpers');

test('조합 만들기: 담은 블록을 눌러 쌓고 저장 → 완성본이 만들어져 듣기 화면', async ({ page, request }) => {
  const user = await newUser(request);
  const free = await api(request, 'GET', '/blocks?free=true&size=4');
  const ids = free.content.slice(0, 2).map((b) => b.id);
  for (const id of ids) await api(request, 'POST', `/me/blocks/${id}`, user.token);

  await loginWeb(page, user);
  await page.goto('/create');
  for (const id of ids) {
    const tile = page.getByTestId(`tile-${id}`);
    await tile.scrollIntoViewIfNeeded();
    await tile.click();
  }
  await expect(page.getByTestId('board').locator('[data-testid^="brick-"]')).toHaveCount(2);
  await expectNoSideScroll(page);
  await page.getByTestId('title-input').fill('자동 검사 조합');
  await page.getByTestId('save').click();
  await page.waitForURL(/\/listen\/\d+/);
  await expect(page.getByTestId('listen-title')).toHaveText('자동 검사 조합');
  await expect(page.getByTestId('listen-play')).toBeVisible({ timeout: 80_000 });
});
