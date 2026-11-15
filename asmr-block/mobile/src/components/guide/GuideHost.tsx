import { EDITOR_STEPS, WELCOME_STEPS } from '@/lib/guide';
import { useFirstRunGuide, useGuide } from '@/store/guide';
import { GuideModal } from './GuideModal';

/** 처음 켰을 때 사용법 (탭 화면에 하나) */
export function WelcomeGuide() {
  useFirstRunGuide('welcome');
  const open = useGuide((s) => s.open === 'welcome');
  const close = useGuide((s) => s.close);
  return <GuideModal visible={open} steps={WELCOME_STEPS} onClose={close} finishLabel="시작하기" />;
}

/** 블록 편집을 처음 열었을 때 끌어서 쌓는 법 (편집 화면이 다 뜬 뒤에 그리기) */
export function EditorGuide() {
  useFirstRunGuide('editor');
  const open = useGuide((s) => s.open === 'editor');
  const close = useGuide((s) => s.close);
  return <GuideModal visible={open} steps={EDITOR_STEPS} onClose={close} finishLabel="해 볼게요" />;
}
