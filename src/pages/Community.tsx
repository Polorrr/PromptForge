import { useTranslation } from 'react-i18next';
import { Users, Github } from 'lucide-react';

export default function Community() {
  const { t } = useTranslation();

  return (
    <div className="max-w-6xl mx-auto py-6 px-6">
      <h1 className="text-heading mb-2">{t('community.title')}</h1>
      <p className="text-gray-500 mb-10">{t('community.subtitle')}</p>

      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-surface-2 dark:bg-dark-2 flex items-center justify-center mb-4">
          <Users size={28} className="text-gray-400" />
        </div>
        <p className="text-gray-400 text-sm mb-6 max-w-md text-center">
          {t('community.comingSoon')}
        </p>
        <a
          href="https://github.com/promptforge/promptforge"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-surface-3 dark:border-dark-3 text-sm text-gray-600 dark:text-gray-400 hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
        >
          <Github size={16} />
          GitHub
        </a>
      </div>
    </div>
  );
}
