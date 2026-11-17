/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, sep } from 'path';
import en from '@/locales/en.json';
import ko from '@/locales/ko.json';

/** 앱 다국어 안전 검사 (웹 frontend/src/locales/locales.test.js와 같은 규칙) */
type Dict = { [k: string]: string | Dict };
function flatten(obj: Dict, prefix = '', out: Record<string, string> = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') flatten(v, key, out);
    else out[key] = v as string;
  }
  return out;
}
const PLURAL = /_(zero|one|two|few|many|other)$/;
const base = (key: string) => key.replace(PLURAL, '');
const vars = (s: string) => new Set((String(s).match(/\{\{\s*(\w+)\s*\}\}/g) || []).map((m) => m.replace(/[{}\s]/g, '')));
const HANGUL = /[가-힣]/;

const flatKo = flatten(ko as Dict);
const flatEn = flatten(en as Dict);

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
    const bad: string[] = [];
    for (const [key, value] of Object.entries(flatKo)) {
      for (const ek of Object.keys(flatEn).filter((k) => base(k) === base(key))) {
        const a = vars(value);
        const b = vars(flatEn[ek]);
        a.delete('count');
        b.delete('count');
        if ([...a].some((x) => !b.has(x)) || [...b].some((x) => !a.has(x))) bad.push(`${key} ↔ ${ek}`);
      }
    }
    expect(bad).toEqual([]);
  });

  // 사람이 쓴 글처럼: em dash(—)·반짝이(✦✨)·제목 이모지·Claude 이름을 화면 글에 쓰지 않음 (Claude·Anthropic은 처리방침에만)
  it('화면 글에 em dash(—)·반짝이·"Claude"가 없음', () => {
    const bad = Object.entries({ ...flatKo, ...Object.fromEntries(Object.entries(flatEn).map(([k, v]) => [`en:${k}`, v])) })
      .filter(([, v]) => /[—✦✨🌟]|Claude/.test(String(v)))
      .map(([k]) => k);
    expect(bad).toEqual([]);
  });

  it('웹과 같은 부분(트리거·스티커·말소리·시간·언어)은 글자까지 같음', () => {
    const web = (lang: string) => JSON.parse(readFileSync(join(__dirname, `../../frontend/src/locales/${lang}.json`), 'utf8'));
    const webKo = web('ko');
    const webEn = web('en');
    for (const section of ['cat', 'catDesc', 'stickers', 'talk', 'time', 'lang']) {
      expect([section, (ko as Dict)[section]]).toEqual([section, webKo[section]]);
      expect([section, (en as Dict)[section]]).toEqual([section, webEn[section]]);
    }
  });
});

// ---------- 화면 코드 검사 ----------
const SRC = join(__dirname, '..', 'src');
/** 한국어가 있어도 되는 곳: 사전, 웹·서버와 글자까지 같아야 하는 한국어 원문(영어 짝이 따로 있음) */
const ALLOWED = [
  /^locales\//,
  /^lib\/(recording|guide)\.ts$/, // 웹과 글자까지 같은지 검사하는 한국어 원문 (영어는 *.en.ts)
  /^lib\/stickers\.ts$/, // 기본 스티커 16개 (서버 V8·웹과 같은 이름, 화면 이름은 stickerName → 사전)
];
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return sourceFiles(p);
    return /\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}
const rel = (p: string) => relative(SRC, p).split(sep).join('/');
/** 주석을 빼고 (줄 번호는 그대로) */
const stripComments = (code: string) => code
  // 'audio/*' 같은 글자 속 /* 는 주석이 아님 → 줄 처음·공백·{ ( , ; 뒤의 /* 만
  .replace(/(^|[\s{(,;])\/\*[\s\S]*?\*\//g, (m, pre) => pre + m.slice(pre.length).replace(/[^\n]/g, ' '))
  .replace(/(^|[^:"'`\\])\/\/.*$/gm, '$1');

describe('화면 코드', () => {
  it('화면 글자는 사전으로 (코드에 한국어를 바로 쓰지 않음, 꼭 필요하면 그 줄에 i18n-ok)', () => {
    const left: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const name = rel(file);
      if (ALLOWED.some((re) => re.test(name))) continue;
      const original = readFileSync(file, 'utf8').split('\n');
      stripComments(original.join('\n')).split('\n').forEach((line, i) => {
        if (HANGUL.test(line) && !original[i].includes('i18n-ok')) left.push(`${name}:${i + 1}  ${line.trim().slice(0, 80)}`);
      });
    }
    expect(left).toEqual([]);
  });

  it("코드에 쓴 t('키')가 사전에 모두 있음 (오타로 키 이름이 화면에 나오지 않게)", () => {
    const missing: string[] = [];
    const known = new Set(Object.keys(flatKo).map(base));
    for (const file of sourceFiles(SRC)) {
      const code = readFileSync(file, 'utf8');
      const re = /(?:\bt\(\s*|i18nKey=|\bk=)['"]([\w.-]+)['"]/g;
      let m;
      while ((m = re.exec(code))) {
        if (!known.has(m[1])) missing.push(`${rel(file)}: ${m[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
