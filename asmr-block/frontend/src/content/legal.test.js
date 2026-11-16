import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as KO from './legal.ko';
import * as EN from './legal.en';

const HANGUL = /[가-힣]/;
/** 그 문서를 글자로 (조항 · 목록 수 비교용) */
const html = (doc) => renderToStaticMarkup(<div>{doc.intro}{doc.sections.map((s) => <section key={s.title}>{s.title}{s.body}</section>)}</div>);
const count = (s, tag) => (s.match(new RegExp(`<${tag}[ >]`, 'g')) || []).length;

describe('약관 · 개인정보 처리방침 영어판', () => {
  it.each([['PRIVACY'], ['TERMS']])('%s: 한국어 원문과 조항 수·목록 항목 수가 같고, 영어판엔 한국어가 없음', (name) => {
    const ko = KO[name];
    const en = EN[name];
    expect(en.sections.length).toBe(ko.sections.length);
    ko.sections.forEach((s, i) => {
      const k = html({ intro: null, sections: [s] });
      const e = html({ intro: null, sections: [en.sections[i]] });
      expect([count(e, 'li'), count(e, 'p'), count(e, 'b'), count(e, 'a')]).toEqual([count(k, 'li'), count(k, 'p'), count(k, 'b'), count(k, 'a')]);
    });
    expect(HANGUL.test(html(en) + en.title)).toBe(false);
    expect(HANGUL.test(EN.EFFECTIVE + JSON.stringify(EN.NOTICE))).toBe(false);
  });
});
