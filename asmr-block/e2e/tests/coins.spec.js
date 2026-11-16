// @ts-check
const { test, expect, newUser, adminToken, api, loginWeb, uploadApproved } = require('./helpers');

/** 코인 (V16): 관리자 코인 주기 → 유료 블록 사기 → 내 코인 내역 → 크리에이터 판매 수익 · 조합 한 번에 사기 · 모자랄 때 */

const meId = async (request, user) => (await api(request, 'GET', '/users/me', user.token)).id;

test('관리자가 코인을 주면 → 상점에서 유료 블록을 사고 → 내 코인 내역 → 크리에이터 판매 수익', async ({ page, request }) => {
  const admin = await adminToken(request);
  const creator = await newUser(request, 'coin');
  const creatorId = await meId(request, creator);
  const blockId = await uploadApproved(request, creator, admin, '코인 검사 블록', 30);
  const buyer = await newUser(request, 'buyer');
  const buyerId = await meId(request, buyer);

  // 관리자 페이지 → 코인 → 이메일로 찾아서 40코인 주기
  await loginWeb(page, { email: 'admin@asmrblock.com', password: 'password123' });
  await page.goto('/admin');
  await page.getByTestId('admin-tab-coins').click();
  await page.getByTestId('coin-search').fill(buyer.email);
  await page.getByTestId('coin-search-btn').click();
  const row = page.getByTestId(`coin-user-${buyerId}`);
  await row.getByRole('button', { name: '코인 주기' }).click();
  await row.getByTestId('coin-amount').fill('40');
  await row.getByTestId('coin-note').fill('베타 테스터 감사');
  await row.getByTestId('coin-grant').click();
  await expect(page.getByTestId(`coin-balance-${buyerId}`)).toHaveText('40코인');

  // 사는 사람: 크리에이터 페이지의 유료 블록 → 확인 창(지금 40 → 남는 10) → 사기
  await page.evaluate(() => { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); });
  await loginWeb(page, buyer);
  await page.goto(`/creator/${creatorId}`);
  await page.getByTestId(`buy-block-${blockId}`).click();
  await expect(page.getByTestId('buy-modal')).toBeVisible();
  await expect(page.getByTestId('buy-balance')).toHaveText('40코인');
  await page.getByTestId('buy-confirm').click();
  await expect(page.getByTestId('buy-modal')).toBeHidden();
  await expect(page.getByTestId(`block-${blockId}`)).toContainText('블록함에 있음');
  expect((await api(request, 'GET', '/me/wallet', buyer.token)).balance).toBe(10);

  // 상점의 "내 코인" → 내 정보의 코인 내역
  await page.goto('/shop');
  await page.getByTestId('my-coins').click();
  await expect(page.getByTestId('wallet-balance')).toHaveText('10코인');
  await expect(page.getByTestId('coin-tx-PURCHASE')).toContainText('코인 검사 블록');
  await expect(page.getByTestId('coin-tx-GRANT')).toContainText('베타 테스터 감사');

  // 크리에이터: 블록 판매 화면의 내 판매 수익 (받은 코인으로 팔려서 정산 대기 0)
  await page.evaluate(() => { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); });
  await loginWeb(page, creator);
  await page.goto('/sell');
  await expect(page.getByTestId('earnings')).toContainText('팔린 횟수');
  await expect(page.getByTestId('earnings')).toContainText('코인 검사 블록');
  await expect(page.getByTestId('earn-pending')).toHaveText('0코인');
});

test('조합 담기: 없는 유료 블록을 코인으로 한 번에 사고 담기, 모자라면 사기 버튼이 막힘', async ({ page, request }) => {
  const admin = await adminToken(request);
  const owner = await newUser(request, 'combo');
  const paid = await uploadApproved(request, owner, admin, '코인 조합 블록', 25);
  const combo = await api(request, 'POST', '/playlists', owner.token, {
    title: '코인 검사 조합', isPublic: true, main: { items: [{ blockId: paid }] },
  });
  const buyer = await newUser(request, 'buyer');

  await loginWeb(page, buyer);
  await page.goto(`/listen/${combo.id}`);
  await page.getByTestId(`combo-buy-${combo.id}`).click();
  await expect(page.getByTestId('buy-short')).toHaveText('25코인이 모자라요');
  await expect(page.getByTestId('buy-confirm')).toBeDisabled();
  await page.keyboard.press('Escape');

  await api(request, 'POST', '/admin/coins/grant', admin, { userId: await meId(request, buyer), amount: 30, note: '조합 검사' });
  await page.getByTestId(`combo-buy-${combo.id}`).click();
  await expect(page.getByTestId('buy-balance')).toHaveText('30코인');
  await page.getByTestId('buy-confirm').click();
  await expect(page.getByTestId(`combo-collected-${combo.id}`)).toBeVisible();
  expect((await api(request, 'GET', '/me/wallet', buyer.token)).balance).toBe(5);
});
