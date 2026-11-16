import { guideSteps } from '@/lib/guide';
import { useFirstRunGuide, useGuide } from '@/store/guide';
import { GuideModal } from './GuideModal';
import { useTranslation } from 'react-i18next';

/** 처음 켰을 때 사용법 (탭 화면에 하나) */
export function WelcomeGuide() {
  const { t } = useTranslation();
  useFirstRunGuide('welcome');
  const open = useGuide((s) => s.open === 'welcome');
  const close = useGuide((s) => s.close);
  return <GuideModal visible={open} steps={guideSteps('welcome')} onClose={close} finishLabel={t('guideModal.finishWelcome')} />;
}

/** 블록 편집을 처음 열었을 때 끌어서 쌓는 법 (편집 화면이 다 뜬 뒤에 그리기) */
export function EditorGuide() {
  const { t } = useTranslation();
  useFirstRunGuide('editor');
  const open = useGuide((s) => s.open === 'editor');
  const close = useGuide((s) => s.close);
  return <GuideModal visible={open} steps={guideSteps('editor')} onClose={close} finishLabel={t('guideModal.finishEditor')} />;
}
