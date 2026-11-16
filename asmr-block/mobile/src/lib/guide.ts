import i18n from '@/locales';
import { EDITOR_STEPS_EN, FULL_STEPS_EN, WELCOME_STEPS_EN } from './guide.en';

/**
 * 처음 쓰는 사람을 위한 사용법 안내 (팝업, 처음 한 번만). 웹 frontend/src/lib/guide.js와 제목·순서가 같음 (jest로 확인)
 * art: 카드 위 움직이는 그림 종류 (components/guide/GuideArt)
 */
export type GuideArtKind = 'collect' | 'drag' | 'time' | 'sleep' | 'edit';
export type GuideStep = { art: GuideArtKind; title: string; body: string };

/** 앱을 처음 켰을 때 */
export const WELCOME_STEPS: GuideStep[] = [
  {
    art: 'collect',
    title: '좋아하는 소리 블록을 담아요',
    body: '블록 구매에서 탭핑·바스락·귓속말처럼 팅글이 오는 소리를 골라 “블록 담기”를 눌러요. 무료 블록은 바로 내 블록함에 들어와요.',
  },
  {
    art: 'drag',
    title: '꾹 눌러 끌어서 쌓아요',
    body: '블록 편집에서 담은 블록을 꾹 누른 채 위쪽 바닥판으로 끌어 놓아요. 톡 누르면 맨 끝에 딸깍 붙어요.',
  },
  {
    art: 'time',
    title: '얼마나 들을지 정하고 저장해요',
    body: '30분~8시간 중 고르고 저장하면 끊김 없이 이어지는 완성본이 만들어져요. 레이어드(둘째 줄)로 빗소리를 깔 수도 있어요.',
  },
  {
    art: 'sleep',
    title: '잠들기 전에 바로 들어요',
    body: '홈 맨 위의 내 조합을 누르면 바로 재생돼요. 화면을 꺼도 들리고, 정한 시간이 되면 스르르 꺼져요.',
  },
];

/** 블록 편집을 처음 열었을 때 */
export const EDITOR_STEPS: GuideStep[] = [
  {
    art: 'drag',
    title: '블록을 끌어서 쌓아요',
    body: '아래 내 블록함에서 블록을 꾹 누른 채 위 바닥판으로 끌어 놓으세요. 톡 누르면 맨 끝에 붙어요.',
  },
  {
    art: 'edit',
    title: '쌓은 블록은 이렇게 고쳐요',
    body: '바닥판의 블록을 누르면 복제·빼기, 끌면 자리 옮기기. 블록함으로 끌어다 놓으면 빠져요. “+ 레이어드”로 둘째 줄을 켜면 소리를 겹칠 수 있어요.',
  },
];

/** 도움말의 "사용법 다시 보기": 처음 안내 + 고치는 법 */
export const FULL_STEPS: GuideStep[] = [...WELCOME_STEPS, EDITOR_STEPS[1]];

/** 지금 언어의 안내 (영어는 lib/guide.en.ts) */
export function guideSteps(which: 'welcome' | 'editor' | 'full'): GuideStep[] {
  const en = i18n.language === 'en';
  if (which === 'welcome') return en ? WELCOME_STEPS_EN : WELCOME_STEPS;
  if (which === 'editor') return en ? EDITOR_STEPS_EN : EDITOR_STEPS;
  return en ? FULL_STEPS_EN : FULL_STEPS;
}

export const GUIDE_KEYS = { welcome: 'asmr.guide.welcome.v1', editor: 'asmr.guide.editor.v1' } as const;
