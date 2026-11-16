/**
 * English version of the recording guide (lib/recording.js). Same keys and order (checked in recording.en.test.js).
 */

export const RECORDING_CHECKLIST_EN = [
  { key: 'quiet', text: 'Turned off humming things like the fridge, AC or fan' },
  { key: 'airplane', text: 'Put my phone in airplane mode (no alert or vibration sounds)' },
  { key: 'distance', text: 'Placed the mic about a hand’s width from the sound' },
  { key: 'stand', text: 'My phone is propped up, not held in my hand' },
  { key: 'silence', text: 'I’ll stay quiet for the first 5 seconds' },
];

export const RECORDING_SECTIONS_EN = [
  {
    key: 'what',
    title: 'One trigger, nice and clear',
    points: [
      'One block = one trigger. Tapping is just tapping, rain is just rain.',
      '3–4 minutes is plenty. Listeners loop it or chain it with other blocks.',
      'Record about 10 minutes, then pick the best part from the waveform when you upload.',
    ],
  },
  {
    key: 'room',
    title: 'Find a quiet spot',
    points: [
      'ASMR makes small sounds loud, so even the fridge or an air purifier you normally don’t notice will be recorded.',
      'Rooms with bedding, curtains or a closet echo less. Bathrooms and empty rooms echo.',
      'Late night or early morning, when it’s quiet outside, works best.',
    ],
  },
  {
    key: 'mic',
    title: 'Where to put your phone',
    points: [
      'The mic is usually the small hole at the bottom of your phone. Point it toward the sound.',
      'About a hand’s width (15–20 cm) away is ideal. Too close sounds muddy; too far picks up noise.',
      'Holding the phone adds rubbing sounds. Lean it against a book or a cup instead.',
      'Outdoors, block the wind from hitting the mic with your body or clothes.',
    ],
  },
  {
    key: 'record',
    title: 'While recording',
    points: [
      'Stay quiet for 5 seconds at the start and end. It makes trimming easy and the edges clean.',
      'A slow, steady rhythm is easier on the ears. Avoid sudden loud sounds.',
      'If you cough or a door slams, just keep going. Cut that part out when you upload.',
      'Your phone’s built-in recorder (Voice Memos on iPhone, Recorder on Android) is enough.',
      'For video, keep the camera still and make sure the hands or objects making the sound are clearly visible.',
    ],
  },
  {
    key: 'check',
    title: 'Before you upload',
    points: [
      'Listen once with earphones. Check for voices or humming in the background.',
      'We even out the volume for you. But very quiet recordings get louder noise too.',
      'Adding the talking type (no talking, whisper, talking) and where you recorded helps listeners choose.',
      'A photo or stickers on the block cover help it stand out in the shop.',
    ],
  },
];

/** Not allowed (rejected in review, or taken down if reported) */
export const RECORDING_DONTS_EN = [
  'Sounds taken from YouTube or someone else’s video or music',
  'Recordings with café or store background music, TV or radio',
  'Other people’s voices or faces without their permission',
  'Startlingly loud or unpleasant sounds',
];
