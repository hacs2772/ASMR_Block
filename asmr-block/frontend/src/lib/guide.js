/**
 * 처음 온 사람을 위한 사용법 안내 (팝업, 처음 한 번만). 앱 mobile/src/lib/guide.ts와 제목·순서·그림이 같음 (앱 jest로 확인)
 * 설명은 웹 메뉴 이름(블록 상점·조합 만들기·내 조합)에 맞춤. art: 카드 위 움직이는 그림 (components/guide/GuideArt)
 */

/** 처음 들어왔을 때 */
export const WELCOME_STEPS = [
  {
    art: 'collect',
    title: '좋아하는 소리 블록을 담아요',
    body: '블록 상점에서 탭핑·바스락·귓속말처럼 팅글이 오는 소리를 골라 “블록 담기”를 눌러요. 무료 블록은 바로 내 블록함에 들어와요.',
  },
  {
    art: 'drag',
    title: '꾹 눌러 끌어서 쌓아요',
    body: '조합 만들기에서 담은 블록을 누른 채 바닥판으로 끌어 놓아요. 톡 누르면 맨 끝에 딸깍 붙어요.',
  },
  {
    art: 'time',
    title: '얼마나 들을지 정하고 저장해요',
    body: '30분~8시간 중 고르고 저장하면 끊김 없이 이어지는 완성본이 만들어져요. 레이어드(둘째 줄)로 빗소리를 깔 수도 있어요.',
  },
  {
    art: 'sleep',
    title: '잠들기 전에 바로 들어요',
    body: '내 조합에서 누르면 바로 재생돼요. 화면을 꺼도 들리고, 정한 시간이 되면 스르르 꺼져요. 홈 화면에 추가하면 앱처럼 열려요.',
  },
];

/** 조합 만들기를 처음 열었을 때 */
export const EDITOR_STEPS = [
  {
    art: 'drag',
    title: '블록을 끌어서 쌓아요',
    body: '내 블록함(휴대폰은 아래, 큰 화면은 오른쪽)에서 블록을 누른 채 바닥판으로 끌어 놓으세요. 톡 누르면 맨 끝에 붙어요.',
  },
  {
    art: 'edit',
    title: '쌓은 블록은 이렇게 고쳐요',
    body: '바닥판의 블록을 누르면 복제·빼기, 끌면 자리 옮기기. 블록함으로 끌어다 놓으면 빠져요. “+ 레이어드”로 둘째 줄을 켜면 소리를 겹칠 수 있어요.',
  },
];

/** "사용법 보기": 처음 안내 + 고치는 법 */
export const FULL_STEPS = [...WELCOME_STEPS, EDITOR_STEPS[1]];

export const GUIDE_STEPS = { welcome: WELCOME_STEPS, editor: EDITOR_STEPS, full: FULL_STEPS };
export const GUIDE_KEYS = { welcome: 'asmr.guide.welcome.v1', editor: 'asmr.guide.editor.v1' };

/** 이미 본 안내인지 (localStorage를 못 쓰는 브라우저면 이번 방문 동안만 기억) */
const seenNow = new Set();
export function guideSeen(which) {
  if (seenNow.has(which)) return true;
  try {
    return window.localStorage.getItem(GUIDE_KEYS[which]) === 'done';
  } catch {
    return false;
  }
}
export function markGuideSeen(which) {
  seenNow.add(which);
  try {
    window.localStorage.setItem(GUIDE_KEYS[which], 'done');
  } catch {
    /* 사생활 보호 모드 등: 이번 방문 동안만 */
  }
}
