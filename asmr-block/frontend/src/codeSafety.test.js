/**
 * @jest-environment node
 */
const path = require('path');
const { ESLint } = require('eslint');

/**
 * 코드 안전 검사: 없는 이름(지운 변수·오타)을 쓰면 화면을 열 때 에러로 하얗게 멈춤.
 * 이 프로젝트의 빌드 검사(CRA 기본)는 이걸 못 잡아서 따로 검사
 */
describe('코드 안전', () => {
  it('정의하지 않은 이름을 쓰지 않음 (no-undef, JSX 포함)', async () => {
    const eslint = new ESLint({
      cwd: path.join(__dirname, '..'),
      useEslintrc: false,
      overrideConfig: {
        parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
        env: { browser: true, es2022: true, node: true, jest: true },
        plugins: ['react'],
        rules: { 'no-undef': 'error', 'react/jsx-no-undef': 'error', 'react/jsx-uses-vars': 'error' },
      },
    });
    const results = await eslint.lintFiles(['src/**/*.{js,jsx}']);
    const problems = results.flatMap((r) => r.messages.map((m) => `${path.relative(__dirname, r.filePath)}:${m.line} ${m.message}`));
    expect(problems).toEqual([]);
  }, 60000);
});
