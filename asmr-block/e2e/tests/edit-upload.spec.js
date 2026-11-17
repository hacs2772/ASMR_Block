// @ts-check
const { test, expect, APP, API, newUser, adminToken, api, loginWeb, uploadApproved } = require('./helpers');

/** 크리에이터: 올린 블록 고치기(이름·가격·영어 이름) · 상점에서 내리기 · 돌려보낸 블록 고쳐서 다시 검수 */

test('웹: 내가 올린 블록 고치기 → 영어 화면에 영어 이름 · 상점에서 내리기', async ({ page, request }) => {
  const admin = await adminToken(request);
  const creator = await newUser(request, 'edit');
  const id = await uploadApproved(request, creator, admin, '고치기 전 이름');

  await loginWeb(page, creator);
  await page.goto('/sell#mine');
  await page.getByTestId(`edit-${id}`).click();
  const form = page.getByTestId(`edit-upload-${id}`);
  await form.getByTestId('edit-title').fill('고친 이름');
  await form.getByTestId('en-fields').click();
  await form.getByTestId('en-title').fill('Fixed name');
  await form.getByTestId('edit-price-20').click();
  await form.getByTestId('edit-listed').uncheck();
  await form.getByTestId('edit-save').click();
  await expect(page.getByTestId(`my-upload-${id}`)).toContainText('고친 이름');
  await expect(page.getByTestId(`unlisted-${id}`)).toBeVisible();

  const block = await (await request.get(`${API}/blocks/${id}`, { headers: { 'Accept-Language': 'en' } })).json();
  expect(block.data.title).toBe('Fixed name');
  expect(block.data.price).toBe(20);
  const me = await api(request, 'GET', '/users/me', creator.token);
  const listed = await api(request, 'GET', `/blocks?uploaderId=${me.id}`);
  expect(listed.content.map((b) => b.id)).not.toContain(id);
});

test('웹: 돌려보낸 블록을 고치면 "고쳐서 다시 검수 요청" → 검수 중', async ({ page, request }) => {
  const admin = await adminToken(request);
  const creator = await newUser(request, 'edit');
  const id = await uploadApproved(request, creator, admin, '광고 섞인 이름');
  await api(request, 'PATCH', `/admin/blocks/${id}/status`, admin, { status: 'REJECTED', note: '이름에 광고가 있어요' });

  await loginWeb(page, creator);
  await page.goto('/sell#mine');
  await page.getByTestId(`edit-${id}`).click();
  const form = page.getByTestId(`edit-upload-${id}`);
  await form.getByTestId('edit-title').fill('광고 뺀 이름');
  await expect(form.getByTestId('edit-save')).toHaveText('고쳐서 다시 검수 요청');
  await form.getByTestId('edit-save').click();
  await expect(page.getByTestId(`my-upload-${id}`)).toContainText('검수 중');
});

test.describe('앱', () => {
  test.use({ baseURL: APP, viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ request }) => {
    const up = await request.get(APP).then((r) => r.ok()).catch(() => false);
    test.skip(!up, `앱 미리보기가 꺼져 있어요 (${APP})`);
  });

  test('앱: 블록 판매 탭 → 내가 올린 블록 누르기 → 고치기 → 저장', async ({ page, request }) => {
    const admin = await adminToken(request);
    const creator = await newUser(request, 'appedit');
    const id = await uploadApproved(request, creator, admin, '앱 고치기 전');
    page.on('dialog', (d) => void d.accept());
    await page.goto('/');
    await page.getByTestId('home-login').click();
    await page.getByPlaceholder('email@example.com').fill(creator.email);
    await page.locator('input[type="password"]').fill(creator.password);
    await page.getByTestId('submit').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'));
    await page.locator('a[href="/upload"]').first().click();
    await page.getByTestId(`upload-${id}`).click();
    await page.waitForURL(/\/edit-upload\//);
    await page.getByTestId('edit-title').fill('앱에서 고침');
    await page.getByTestId('edit-save').click();
    await expect.poll(async () => (await api(request, 'GET', '/me/uploads', creator.token)).content[0].title).toBe('앱에서 고침');
  });
});
