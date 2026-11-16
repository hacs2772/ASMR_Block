import { EDITOR_STEPS, FULL_STEPS, WELCOME_STEPS } from './guide';
import { EDITOR_STEPS_EN, FULL_STEPS_EN, WELCOME_STEPS_EN } from './guide.en';
import { RECORDING_CHECKLIST, RECORDING_DONTS, RECORDING_SECTIONS } from './recording';
import { RECORDING_CHECKLIST_EN, RECORDING_DONTS_EN, RECORDING_SECTIONS_EN } from './recording.en';

const HANGUL = /[가-힣]/;

describe('영어판 안내 글', () => {
  it('사용법 안내: 한국어와 순서·그림이 같고 영어만', () => {
    [[WELCOME_STEPS, WELCOME_STEPS_EN], [EDITOR_STEPS, EDITOR_STEPS_EN], [FULL_STEPS, FULL_STEPS_EN]].forEach(([ko, en]) => {
      expect(en.map((s) => s.art)).toEqual(ko.map((s) => s.art));
      en.forEach((s) => {
        expect(HANGUL.test(s.title + s.body)).toBe(false);
        expect(s.title.length).toBeLessThanOrEqual(34);
        expect(s.body.length).toBeLessThanOrEqual(190);
      });
    });
  });

  it('녹음 가이드: 한국어와 항목·순서가 같고 영어만', () => {
    expect(RECORDING_CHECKLIST_EN.map((c) => c.key)).toEqual(RECORDING_CHECKLIST.map((c) => c.key));
    expect(RECORDING_SECTIONS_EN.map((s) => s.key)).toEqual(RECORDING_SECTIONS.map((s) => s.key));
    RECORDING_SECTIONS_EN.forEach((s, i) => expect(s.points.length).toBe(RECORDING_SECTIONS[i].points.length));
    expect(RECORDING_DONTS_EN.length).toBe(RECORDING_DONTS.length);
    const all = JSON.stringify([RECORDING_CHECKLIST_EN, RECORDING_SECTIONS_EN, RECORDING_DONTS_EN]);
    expect(HANGUL.test(all)).toBe(false);
  });
});
