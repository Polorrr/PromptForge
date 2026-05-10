import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-6xl font-bold text-brand-500 mb-4">{t('notFound.title')}</h1>
      <p className="text-gray-500 mb-6">{t('notFound.subtitle')}</p>
      <Link
        to={ROUTES.HOME}
        className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
      >
        {t('notFound.goHome')}
      </Link>
    </div>
  );
}
