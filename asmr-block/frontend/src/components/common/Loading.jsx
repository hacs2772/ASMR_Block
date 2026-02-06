import React from 'react';
import { useTranslation } from 'react-i18next';

function Loading({ text }) {
  const { t } = useTranslation('common');

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-12 h-12 border-4 border-gray-700 border-t-primary rounded-full animate-spin"></div>
      <p className="mt-4 text-gray-400">{text || t('message.loading')}</p>
    </div>
  );
}

export default Loading;
