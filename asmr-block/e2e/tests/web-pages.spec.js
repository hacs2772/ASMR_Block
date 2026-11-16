// @ts-check
const { test, expect, API, expectNoSideScroll } = require('./helpers');

const PAGES = [
  ['/', 'ASMR'],
  ['/shop', '블록 상점'],
  ['/combos', '추천 조합'],
  ['/sell', 'ASMR 블록 판매'],
  ['/sell/guide', '녹음 가이드'],
  ['/guide', '팅글이 뭐예요?'],
  ['/privacy', '개인정보'],
  ['/terms', '이용약관'],
];

for (const [path, text] of PAGES) {
  test(`화면 ${path}: 열리고, 휴대폰에서 옆으로 넘치지 않음`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(path);
    await expect(page.getByText(text).filter({ visible: true }).first()).toBeVisible();
    await expectNoSideScroll(page);
    expect(errors).toEqual([]);
  });
}

test('공유 링크(/s/…): 공개 조합은 카톡 미리보기 태그 + 카드 그림', async ({ request }) => {
  const server = API.replace(/\/api\/v1\/?$/, '');
  const combos = await (await request.get(`${API}/playlists/public?size=1`)).json();
  const id = combos.data.content[0].id;
  const html = await (await request.get(`${server}/s/${id}`)).text();
  expect(html).toContain('og:title');
  expect(html).toContain(`/listen/${id}`);
  const card = await request.get(`${server}/s/${id}/card.png`);
  expect(card.headers()['content-type']).toBe('image/png');
});
