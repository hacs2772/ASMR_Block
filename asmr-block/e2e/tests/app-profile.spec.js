// @ts-check
const { test, expect, APP, API, newUser } = require('./helpers');

/** 앱 내 정보: 닉네임 바꾸기 · 개발용 서버 주소는 안 보임 · 회원 탈퇴는 아래 작은 글씨 */
test.describe('앱', () => {
  test.use({ baseURL: APP, viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ request }) => {
    const up = await request.get(APP).then((r) => r.ok()).catch(() => false);
    test.skip(!up, `앱 미리보기가 꺼져 있어요 (${APP})`);
  });

  test('내 정보에서 닉네임을 바꾸면 계정에 저장됨', async ({ page, request }) => {
    const user = await newUser(request, 'nick');
    await page.goto('/');
    await page.getByTestId('home-login').click();
    await page.getByPlaceholder('email@example.com').fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await page.getByTestId('submit').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'));
    await page.getByTestId('open-profile').filter({ visible: true }).first().click();
    await expect(page.getByTestId('leave')).toBeVisible();
    await expect(page.getByText('localhost:8080')).toHaveCount(0);

    const name = `밤새${Date.now().toString(36).slice(-4)}`;
    await expect(page.getByTestId('nickname-save')).toBeDisabled();
    page.on('dialog', (d) => d.accept());
    await page.getByTestId('nickname-input').fill(name);
    await page.getByTestId('nickname-save').click();
    await expect(page.getByText(name, { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await expect.poll(async () => {
      const me = await request.get(`${API}/users/me`, { headers: { Authorization: `Bearer ${user.token}` } });
      return (await me.json()).data.nickname;
    }).toBe(name);
  });
});
