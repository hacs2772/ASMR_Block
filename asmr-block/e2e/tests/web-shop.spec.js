// @ts-check
const { test, expect, newUser, loginWeb, expectNoSideScroll } = require('./helpers');

test('블록 상점: 무료 블록 담기 → @닉네임 → 크리에이터 페이지, 공유받은 블록은 맨 위', async ({ page, request }) => {
  const user = await newUser(request);
  await loginWeb(page, user);
  await page.goto('/shop');
  const collect = page.locator('[data-testid^="collect-block-"]').first();
  await collect.scrollIntoViewIfNeeded();
  const id = (await collect.getAttribute('data-testid')).replace('collect-block-', '');
  await collect.click();
  await expect(page.getByTestId(`block-${id}`).getByText('블록함에 있음')).toBeVisible();
  await expectNoSideScroll(page);

  const link = page.getByTestId(`creator-link-${id}`);
  const nickname = (await link.innerText()).trim();
  await link.click();
  await page.waitForURL(/\/creator\/\d+/);
  await expect(page.getByTestId('creator-name')).toHaveText(nickname);
  await expect(page.getByTestId('creator-stats')).toContainText('블록');
  await expect(page.getByTestId('creator-blocks').locator('article').first()).toBeVisible();

  await page.goto(`${new URL(page.url()).pathname}?block=${id}`);
  await expect(page.getByTestId('pinned-block')).toBeVisible();
  await expect(page.getByTestId('pinned-block').getByTestId(`block-${id}`)).toBeVisible();
  await expectNoSideScroll(page);
});
