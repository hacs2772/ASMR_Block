// @ts-check
const { test, expect, newUser, adminToken, api, loginWeb, expectNoSideScroll, TONE } = require('./helpers');

test('블록 판매 → 관리자 승인 → 알림(승인·담김), 알림 끄기', async ({ page, request }) => {
  const creator = await newUser(request, 'maker');
  await loginWeb(page, creator);

  // 1) 녹음 가이드 바로가기 + 소리 올리기 (파형 보고 구간 고르기)
  await page.goto('/sell');
  await expect(page.getByTestId('sell-recording-guide')).toBeVisible();
  await page.getByTestId('sell-file').setInputFiles(TONE);
  await expect(page.getByTestId('trimmer')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('sell-title').fill('자동 검사 탭핑');
  await page.getByTestId('sell-group-tap').click();
  await page.getByTestId('sell-sub-tap.tapping').click();
  await page.getByTestId('sell-agree').check();
  await page.getByTestId('sell-submit').click();
  const row = page.locator('[data-testid^="my-upload-"]').filter({ hasText: '자동 검사 탭핑' });
  await expect(row).toBeVisible({ timeout: 30_000 });
  await expectNoSideScroll(page);
  const blockId = Number((await row.getAttribute('data-testid')).replace('my-upload-', ''));

  // 2) 관리자가 승인 → 종에 숫자, 누르면 "승인" 소식
  const admin = await adminToken(request);
  await api(request, 'PATCH', `/admin/blocks/${blockId}/status`, admin, { status: 'APPROVED' });
  await page.reload();
  await expect(page.getByTestId('notif-count')).toHaveText('1');
  await page.getByTestId('notif-bell').click();
  const panel = page.getByTestId('notif-panel');
  await expect(panel.getByText('자동 검사 탭핑’ 블록이 승인돼서')).toBeVisible();
  await expectNoSideScroll(page);
  await panel.getByText('자동 검사 탭핑’ 블록이 승인돼서').click();
  await page.waitForURL(new RegExp(`/creator/\\d+\\?block=${blockId}`));
  await expect(page.getByTestId('pinned-block')).toBeVisible();
  await expect(page.getByTestId('notif-count')).toHaveCount(0);

  // 3) 다른 사람이 담으면 담김 소식
  const fan = await newUser(request, 'fan');
  await api(request, 'POST', `/me/blocks/${blockId}`, fan.token);
  await page.reload();
  await expect(page.getByTestId('notif-count')).toHaveText('1');
  await page.getByTestId('notif-bell').click();
  await expect(panel.getByText(`@${fan.nickname}님이`)).toBeVisible();

  // 4) 담김 소식 끄기 → 또 담아도 알림 없음
  await page.getByTestId('notif-toggle-collect').click();
  await expect(page.getByTestId('notif-toggle-collect')).toHaveAttribute('aria-checked', 'false');
  const fan2 = await newUser(request, 'fan');
  await api(request, 'POST', `/me/blocks/${blockId}`, fan2.token);
  const summary = await api(request, 'GET', '/me/notifications/summary', creator.token);
  expect(summary.unread).toBe(0);
  expect(summary.settings).toEqual({ review: true, collect: false });
});
