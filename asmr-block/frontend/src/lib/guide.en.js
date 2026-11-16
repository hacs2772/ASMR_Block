/**
 * English version of the how-to guide (lib/guide.js). Same order and art as the Korean steps (checked in guide.en.test.js).
 */

export const WELCOME_STEPS_EN = [
  {
    art: 'collect',
    title: 'Collect sound blocks you love',
    body: 'In the Block Shop, pick sounds that give you tingles — tapping, crinkles, whispers — and tap “Add block”. Free blocks go straight into your block box.',
  },
  {
    art: 'drag',
    title: 'Hold, drag and stack',
    body: 'In Build a combo, hold a block and drag it onto the baseplate. A quick tap snaps it onto the end.',
  },
  {
    art: 'time',
    title: 'Pick how long, then save',
    body: 'Choose 30 minutes to 8 hours and save — we stitch everything into one seamless track. Add a rain layer on the second row if you like.',
  },
  {
    art: 'sleep',
    title: 'Listen right before sleep',
    body: 'Tap it in My combos to play. It keeps playing with the screen off and fades out when time is up. Add it to your home screen to open it like an app.',
  },
];

export const EDITOR_STEPS_EN = [
  {
    art: 'drag',
    title: 'Drag blocks to stack them',
    body: 'From your block box (below on phones, on the right on big screens), hold a block and drag it onto the baseplate. A quick tap adds it to the end.',
  },
  {
    art: 'edit',
    title: 'Editing stacked blocks',
    body: 'Tap a block on the baseplate to duplicate or remove it, drag it to move it. Drop it back into the box to take it out. Turn on “+ Layered” to overlap sounds on a second row.',
  },
];

export const FULL_STEPS_EN = [...WELCOME_STEPS_EN, EDITOR_STEPS_EN[1]];

export const GUIDE_STEPS_EN = { welcome: WELCOME_STEPS_EN, editor: EDITOR_STEPS_EN, full: FULL_STEPS_EN };
