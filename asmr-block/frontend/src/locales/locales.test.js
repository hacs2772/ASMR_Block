import fs from 'fs';
import path from 'path';
import ko from './ko.json';
import en from './en.json';

/** { a: { b: '..' } } → { 'a.b': '..' } */
function flatten(obj, prefix = '', out = {}) {
  Object.entries(obj).forEach(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  });
  return out;
}
const PLURAL = /_(zero|one|two|few|many|other)$/;
const base = (key) => key.replace(PLURAL, '');
const vars = (s) => new Set((String(s).match(/\{\{\s*(\w+)\s*\}\}/g) || []).map((m) => m.replace(/[{}\s]/g, '')));
const HANGUL = /[가-힣]/;

const flatKo = flatten(ko);
const flatEn = flatten(en);

describe('번역 사전', () => {
  it('한국어·영어 키가 같음 (영어 복수형 _one/_other는 하나로 셈)', () => {
    const koKeys = new Set(Object.keys(flatKo).map(base));
    const enKeys = new Set(Object.keys(flatEn).map(base));
    expect([...koKeys].filter((k) => !enKeys.has(k))).toEqual([]);
    expect([...enKeys].filter((k) => !koKeys.has(k))).toEqual([]);
  });

  it('빈 글자가 없고, 영어에는 한글이 없음', () => {
    expect(Object.entries(flatKo).filter(([, v]) => !String(v).trim()).map(([k]) => k)).toEqual([]);
    expect(Object.entries(flatEn).filter(([, v]) => !String(v).trim()).map(([k]) => k)).toEqual([]);
    expect(Object.entries(flatEn).filter(([, v]) => HANGUL.test(String(v))).map(([k]) => k)).toEqual([]);
  });

  it('{{이름}} 자리가 두 언어에서 같음', () => {
    const bad = [];
    Object.entries(flatKo).forEach(([key, value]) => {
      const enVariants = Object.keys(flatEn).filter((k) => base(k) === base(key));
      enVariants.forEach((ek) => {
        const a = vars(value);
        const b = vars(flatEn[ek]);
        b.delete('count');
        a.delete('count');
        if ([...a].some((x) => !b.has(x)) || [...b].some((x) => !a.has(x))) bad.push(`${key} ↔ ${ek}`);
      });
    });
    expect(bad).toEqual([]);
  });
});

// ---------- 화면 코드 검사 ----------
const SRC = path.join(__dirname, '..');
/** 한국어가 있어도 되는 곳: 사전, 한국어 원문 자료(영어 짝이 따로 있음), 관리자 화면(운영자 전용), 테스트 */
const ALLOWED = [
  /^locales\//,
  /^content\/.*\.ko\.js$/,
  /^lib\/(recording|guide)\.js$/, // 앱과 글자까지 같은지 검사하는 한국어 원문 (영어는 *.en.js)
  /^lib\/stickers\.js$/, // 기본 스티커 16개 (서버를 못 받을 때만, 화면 이름은 stickerName → 사전)
  /^components\/admin\//,
  /^pages\/AdminPage\.jsx$/,
  /\.test\.js$/,
];
function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return sourceFiles(p);
    return /\.(js|jsx)$/.test(d.name) ? [p] : [];
  });
}
const rel = (p) => path.relative(SRC, p).split(path.sep).join('/');
/** 주석을 빼고 (줄 번호는 그대로) */
function stripComments(code) {
  return code
    // 'audio/*' 같은 글자 속 /* 는 주석이 아님 → 줄 처음·공백·{ ( , ; 뒤의 /* 만
    .replace(/(^|[\s{(,;])\/\*[\s\S]*?\*\//g, (m, pre) => pre + m.slice(pre.length).replace(/[^\n]/g, ' '))
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, '$1');
}

describe('화면 코드', () => {
  it('화면 글자는 사전으로 (코드에 한국어를 바로 쓰지 않음, 꼭 필요하면 그 줄에 i18n-ok)', () => {
    const left = [];
    sourceFiles(SRC).forEach((file) => {
      const name = rel(file);
      if (ALLOWED.some((re) => re.test(name))) return;
      const original = fs.readFileSync(file, 'utf8').split('\n');
      stripComments(original.join('\n')).split('\n').forEach((line, i) => {
        if (HANGUL.test(line) && !original[i].includes('i18n-ok')) left.push(`${name}:${i + 1}  ${line.trim().slice(0, 80)}`);
      });
    });
    expect(left).toEqual([]);
  });

  it("코드에 쓴 t('키')가 사전에 모두 있음 (오타로 키 이름이 화면에 나오지 않게)", () => {
    const missing = [];
    const known = new Set(Object.keys(flatKo).map(base));
    sourceFiles(SRC).forEach((file) => {
      const code = fs.readFileSync(file, 'utf8');
      const re = /(?:\bt\(\s*|i18nKey=|\bk=)['"]([\w.-]+)['"]/g;
      let m;
      while ((m = re.exec(code))) {
        if (!known.has(m[1])) missing.push(`${rel(file)}: ${m[1]}`);
      }
    });
    expect(missing).toEqual([]);
  });
});
