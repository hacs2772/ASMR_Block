// @ts-check
const { test, expect, APP, API, newUser, adminToken, api, loginWeb, expectNoSideScroll, uploadApproved } = require('./helpers');

/**
 * 소리 느낌 태그(V22): 고치기에서 태그 달기 → 블록 카드에 #태그 · 상점에서 태그로 찾기 (웹·앱)
 * + 트리거 소분류가 늘어남 (귓속말·입소리 > 귀청소·마사지)
 */

async function tagId(request, code) {
  const tags = await (await request.get(`${API}/tags`)).json();
  return tags.data.find((t) => t.code === code).id;
}

test('웹: 고치기에서 소리 느낌 태그 → 카드에 #태그 · 상점에서 태그로 찾기 · 새 소분류', async ({ page, request }) => {
  const admin = await adminToken(request);
  const creator = await newUser(request, 'feel');
  const id = await uploadApproved(request, creator, admin, '태그 붙일 블록');
  await page.setViewportSize({ width: 360, height: 800 });
  await loginWeb(page, creator);

  await page.goto('/sell#mine');
  await page.getByTestId(`edit-${id}`).click();
  const form = page.getByTestId(`edit-upload-${id}`);
  await form.getByTestId('feel-tag-crispy').click();
  await form.getByTestId('feel-tag-sleepy').click();
  await form.getByTestId('edit-save').click();
  await expect(page.getByTestId(`my-upload-${id}`)).toBeVisible();

  const crispy = await tagId(request, 'crispy');
  await page.goto(`/shop?tab=latest&feel=${crispy}`);
  const card = page.getByTestId(`block-${id}`);
  await expect(card).toBeVisible();
  await expect(card.getByTestId('block-tags')).toContainText('#바삭한');
  await expect(card.getByTestId('block-tags')).toContainText('#잠 오는');
  await expectNoSideScroll(page);
  // 다른 태그로 찾으면 안 나옴
  await page.goto(`/shop?tab=latest&feel=${await tagId(request, 'fast')}`);
  await expect(page.getByTestId('shop-feel-fast')).toBeVisible();
  await expect(page.getByTestId(`block-${id}`)).toHaveCount(0);

  // 판매 화면: 귓속말·입소리 묶음에 귀청소·마사지
  await page.goto('/sell');
  await page.getByTestId('sell-group-whisper').click();
  await expect(page.getByRole('button', { name: '귀청소' })).toBeVisible();
  await expect(page.getByRole('button', { name: '마사지' })).toBeVisible();
  await expectNoSideScroll(page);
});

test.describe('앱', () => {
  test.use({ baseURL: APP, viewport: { width: 360, height: 800 } });

  test.beforeEach(async ({ request }) => {
    const up = await request.get(APP).then((r) => r.ok()).catch(() => false);
    test.skip(!up, `앱 미리보기가 꺼져 있어요 (${APP})`);
  });

  test('앱: 블록 구매에서 #태그로 찾기 → 카드에 태그', async ({ page, request }) => {
    const admin = await adminToken(request);
    const creator = await newUser(request, 'appfeel');
    const id = await uploadApproved(request, creator, admin, '앱 태그 블록');
    await api(request, 'PATCH', `/me/uploads/${id}`, creator.token, { tagIds: [await tagId(request, 'squishy')] });
    const viewer = await newUser(request, 'appfeelv');
    page.on('dialog', (d) => void d.accept());
    await page.goto('/');
    await page.getByTestId('home-login').click();
    await page.getByPlaceholder('email@example.com').fill(viewer.email);
    await page.locator('input[type="password"]').fill(viewer.password);
    await page.getByTestId('submit').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'));

    await page.goto('/explore');
    await page.getByTestId('tab-all').click();
    await page.getByTestId('shop-feel-squishy').click();
    const card = page.getByTestId(`block-${id}`);
    await expect(card).toBeVisible();
    await expect(card.getByTestId('block-tags')).toContainText('#몽글몽글');
  });
});
