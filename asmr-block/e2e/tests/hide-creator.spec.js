// @ts-check
const { test, expect, APP, newUser, adminToken, api, loginWeb, expectNoSideScroll, uploadApproved } = require('./helpers');

/**
 * 크리에이터 숨기기 (사용자 차단 — 스토어 심사): 크리에이터 페이지 "숨기기" · 신고한 뒤 "이 크리에이터도 숨길까요?" ·
 * 내 정보 "숨긴 크리에이터"에서 다시 보기. 숨긴 사람의 블록은 바로 사라지고 서버 목록에서도 빠짐 (서버 검사는 HiddenCreatorApiTest)
 */

async function creatorWithBlock(request, admin, title) {
  const creator = await newUser(request, 'hidec');
  const blockId = await uploadApproved(request, creator, admin, title);
  const me = await api(request, 'GET', '/users/me', creator.token);
  return { creator, id: me.id, blockId };
}

test('웹: 크리에이터 페이지에서 숨기기 → 블록이 안 보임 · 신고 뒤 숨기기 · 내 정보에서 다시 보기', async ({ page, request }) => {
  const admin = await adminToken(request);
  const a = await creatorWithBlock(request, admin, '숨길 사람의 블록');
  const b = await creatorWithBlock(request, admin, '신고할 블록');
  const viewer = await newUser(request, 'hideviewer');
  await page.setViewportSize({ width: 360, height: 800 });
  await loginWeb(page, viewer);

  // 1) 크리에이터 페이지에서 숨기기
  await page.goto(`/creator/${a.id}`);
  await expect(page.getByTestId(`block-${a.blockId}`)).toBeVisible();
  await page.getByTestId('hide-creator').click();
  await expect(page.getByTestId('creator-hidden')).toContainText('숨긴 크리에이터예요');
  await expect(page.getByTestId(`block-${a.blockId}`)).toHaveCount(0);
  await expectNoSideScroll(page);
  // 새로 열어도 (서버가 거름) 블록 없음
  await page.reload();
  await expect(page.getByTestId('creator-hidden')).toBeVisible();
  await expect(page.getByTestId(`block-${a.blockId}`)).toHaveCount(0);

  // 2) 신고한 뒤 "이 크리에이터도 숨길까요?" → 숨기면 카드가 바로 사라짐
  await page.goto(`/creator/${b.id}`);
  await page.getByTestId(`report-block-${b.blockId}`).click();
  await page.getByTestId('report-reason-OFFENSIVE').click();
  await page.getByTestId('report-send').click();
  await expect(page.getByTestId('report-done')).toContainText('신고했어요');
  await page.getByTestId('report-hide-owner').click();
  await expect(page.getByTestId(`block-${b.blockId}`)).toHaveCount(0);

  // 3) 내 정보: 숨긴 크리에이터 둘 → 하나 다시 보기 → 그 사람 블록이 다시 보임
  await page.goto('/profile');
  const list = page.getByTestId('hidden-creators');
  await expect(list).toContainText(a.creator.nickname);
  await expect(list).toContainText(b.creator.nickname);
  await page.getByTestId(`unhide-${a.id}`).click();
  await expect(page.getByTestId(`unhide-${a.id}`)).toHaveCount(0);
  await page.goto(`/creator/${a.id}`);
  await expect(page.getByTestId(`block-${a.blockId}`)).toBeVisible();
  await expect(page.getByTestId('creator-hidden')).toHaveCount(0);
});

test('웹: 로그인 안 한 사람·내 페이지에는 숨기기 버튼이 없음', async ({ page, request }) => {
  const admin = await adminToken(request);
  const a = await creatorWithBlock(request, admin, '혼자 보는 블록');
  await page.goto(`/creator/${a.id}`);
  await expect(page.getByTestId('creator-name')).toBeVisible();
  await expect(page.getByTestId('hide-creator')).toHaveCount(0);
  await loginWeb(page, a.creator);
  await page.goto(`/creator/${a.id}`);
  await expect(page.getByTestId('creator-name')).toBeVisible();
  await expect(page.getByTestId('hide-creator')).toHaveCount(0);
});

test.describe('앱', () => {
  test.use({ baseURL: APP, viewport: { width: 360, height: 800 } });

  test.beforeEach(async ({ request }) => {
    const up = await request.get(APP).then((r) => r.ok()).catch(() => false);
    test.skip(!up, `앱 미리보기가 꺼져 있어요 (${APP})`);
  });

  test('앱: 크리에이터 페이지 숨기기 → 숨긴 크리에이터 표시 · 내 정보에서 다시 보기', async ({ page, request }) => {
    const admin = await adminToken(request);
    const a = await creatorWithBlock(request, admin, '앱에서 숨길 블록');
    const viewer = await newUser(request, 'hideapp');
    page.on('dialog', (d) => void d.accept());
    await page.goto('/');
    await page.getByTestId('home-login').click();
    await page.getByPlaceholder('email@example.com').fill(viewer.email);
    await page.locator('input[type="password"]').fill(viewer.password);
    await page.getByTestId('submit').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'));

    await page.goto(`/creator/${a.id}`);
    await expect(page.getByTestId('creator-name')).toBeVisible();
    await page.getByTestId('hide-creator').click();
    await expect(page.getByTestId('creator-hidden')).toBeVisible();
    await expect(page.getByTestId(`block-${a.blockId}`)).toHaveCount(0);

    await page.goto('/profile');
    await expect(page.getByTestId('hidden-creators')).toContainText(a.creator.nickname);
    await page.getByTestId(`unhide-${a.id}`).click();
    await expect(page.getByTestId('hidden-creators')).toHaveCount(0);
  });
});
