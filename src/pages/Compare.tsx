import { useTranslation } from 'react-i18next';
import { Columns2 } from 'lucide-react';

export default function Compare() {
  const { t } = useTranslation();

  return (
    <div className="max-w-6xl mx-auto py-6 px-6">
      <h1 className="text-heading mb-2">{t('compare.title')}</h1>
      <p className="text-gray-500 mb-10">{t('compare.noDiff')}</p>

      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-surface-2 dark:bg-dark-2 flex items-center justify-center mb-4">
          <Columns2 size={28} className="text-gray-400" />
        </div>
        <p className="text-gray-400 text-sm max-w-md text-center">
          {t('compare.comingSoon')}
        </p>
      </div>
    </div>
  );
}
