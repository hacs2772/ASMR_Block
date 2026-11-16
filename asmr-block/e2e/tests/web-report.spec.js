// @ts-check
const { test, expect, newUser, adminToken, api, loginWeb, uploadApproved } = require('./helpers');

test('신고: 로그인 없이 블록 신고 → 관리자 신고 탭에서 숨기기 → 상점에서 빠짐 → 되돌리기', async ({ page, request, browser }) => {
  const creator = await newUser(request, 'maker');
  const admin = await adminToken(request);
  const creatorId = (await api(request, 'GET', '/users/me', creator.token)).id;
  const blockId = await uploadApproved(request, creator, admin, '신고 검사 블록');

  // 로그인 안 한 사람이 크리에이터 페이지의 블록을 신고
  await page.goto(`/creator/${creatorId}`);
  await page.getByTestId(`report-block-${blockId}`).click();
  await page.getByTestId('report-reason-COPYRIGHT').click();
  await page.getByTestId('report-detail').fill('자동 검사 신고');
  await page.getByTestId('report-send').click();
  await expect(page.getByText('신고를 받았어요. 관리자가 확인할게요.').first()).toBeVisible();

  // 관리자 화면
  const adminPage = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await adminPage.addInitScript(() => { try { sessionStorage.setItem('adminTab', 'reports'); } catch { /* 괜찮음 */ } });
  await loginWeb(adminPage, { email: 'admin@asmrblock.com', password: 'password123' });
  await adminPage.goto('/admin');
  const card = adminPage.getByTestId(`report-BLOCK-${blockId}`);
  await expect(card).toContainText('자동 검사 신고');
  await card.getByTestId('report-hide').click();
  await expect(adminPage.getByText('숨겼어요.').first()).toBeVisible();
  const shop = await api(request, 'GET', `/blocks?uploaderId=${creatorId}`);
  expect(shop.content.map((b) => b.id)).not.toContain(blockId);

  await adminPage.getByTestId('report-filter-HIDDEN').click();
  await adminPage.getByTestId(`report-BLOCK-${blockId}`).getByTestId('report-restore').click();
  await expect(adminPage.getByText('되돌렸어요.').first()).toBeVisible();
  const back = await api(request, 'GET', `/blocks?uploaderId=${creatorId}`);
  expect(back.content.map((b) => b.id)).toContain(blockId);
});
