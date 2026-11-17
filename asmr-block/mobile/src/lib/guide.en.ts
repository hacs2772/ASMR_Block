import type { GuideStep } from './guide';

/**
 * 사용법 안내 영어판 (lib/guide.ts 한국어 원문과 순서·그림이 같음). 제목은 웹 frontend/src/lib/guide.en.js와 같고,
 * 설명은 앱 메뉴 이름(Shop · Build · Home)에 맞춤 — jest __tests__/guide.test.ts가 확인
 */
export const WELCOME_STEPS_EN: GuideStep[] = [
  {
    art: 'collect',
    title: 'Collect sound blocks you love',
    body: 'In Shop, pick sounds that give you tingles, like tapping, crinkles or whispers, and tap “Add block”. Free blocks go straight into your block box.',
  },
  {
    art: 'drag',
    title: 'Hold, drag and stack',
    body: 'In Build, hold a block from your box and drag it up onto the baseplate. A quick tap snaps it onto the end.',
  },
  {
    art: 'time',
    title: 'Pick how long, then save',
    body: 'Choose 30 minutes to 8 hours and save. We stitch everything into one seamless track. Add a rain layer on the second row if you like.',
  },
  {
    art: 'sleep',
    title: 'Listen right before sleep',
    body: 'Tap your combo at the top of Home and it plays right away. It keeps playing with the screen off and fades out when time is up.',
  },
];

export const EDITOR_STEPS_EN: GuideStep[] = [
  {
    art: 'drag',
    title: 'Drag blocks to stack them',
    body: 'Hold a block in your block box below and drag it onto the baseplate above. A quick tap adds it to the end.',
  },
  {
    art: 'edit',
    title: 'Editing stacked blocks',
    body: 'Tap a block on the baseplate to copy or remove it, drag it to move it. Drop it back into the box to take it out. Turn on “+ Layered” to overlap sounds on a second row.',
  },
];

export const FULL_STEPS_EN: GuideStep[] = [...WELCOME_STEPS_EN, EDITOR_STEPS_EN[1]];
