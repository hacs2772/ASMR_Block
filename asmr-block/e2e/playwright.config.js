// @ts-check
const { defineConfig } = require('@playwright/test');

/**
 * 자동 화면 검사. 먼저 서버를 켜 둔 뒤 실행해요 (README 참고):
 *   웹  E2E_WEB_URL  (기본 http://localhost:3000)
 *   API E2E_API_URL  (기본 http://localhost:8080/api/v1, 개발용 샘플 데이터·테스트 계정이 있어야 함)
 *   앱  E2E_APP_URL  (기본 http://localhost:8081, `npx expo export -p web` 결과를 띄운 것. 없으면 앱 검사는 건너뜀)
 */
module.exports = defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_WEB_URL || 'http://localhost:3000',
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    trace: process.env.CI ? 'retain-on-failure' : 'off',
    screenshot: process.env.CI ? 'only-on-failure' : 'off',
  },
  projects: [
    // 휴대폰 크기 (실제로 가장 많이 쓰는 화면)
    { name: 'phone', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } },
  ],
});
