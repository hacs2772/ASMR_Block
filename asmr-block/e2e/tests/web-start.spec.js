// @ts-check
const { test, expect, expectNoSideScroll } = require('./helpers');

test('처음 온 사람: 트리거만 고르면 베타 손님으로 첫 조합이 만들어져 바로 들을 수 있음', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('quick-start').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('quick-start-go')).toBeDisabled();
  await page.getByTestId('home-trigger-tap').click();
  await page.getByTestId('home-trigger-rain').click();
  await page.getByTestId('quick-start-go').click();
  await page.waitForURL(/\/listen\/\d+/);
  await expect(page.getByTestId('listen-title')).toContainText('나의 첫 팅글');
  // 서버가 완성본(합친 소리)을 만들면 재생 버튼이 나옴
  await expect(page.getByTestId('listen-play')).toBeVisible({ timeout: 80_000 });
  await expectNoSideScroll(page);

  await page.goto('/me/combos');
  await expect(page.getByText('나의 첫 팅글').first()).toBeVisible();
});
