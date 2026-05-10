import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Sparkles, BookOpen, Star, ArrowRight } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { usePromptStore } from '@/stores/usePromptStore';
import { Button } from '@/components/ui';
import { formatDate } from '@/utils/date';

export default function Home() {
  const { t } = useTranslation();
  const { prompts, loadPrompts } = usePromptStore();

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  const stats = {
    total: prompts.length,
    favorites: prompts.filter((p) => p.isFavorite).length,
  };

  const recent = prompts.slice(0, 5);

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      {/* Hero */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 text-sm font-medium mb-6">
          <Sparkles size={16} />
          PromptForge
        </div>
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent pb-1">
          {t('home.title')}
        </h1>
        <p className="text-xl text-gray-500 mb-8 max-w-lg mx-auto">
          {t('home.subtitle')}
        </p>
        <Link to={ROUTES.OPTIMIZE}>
          <Button size="lg" className="group">
            {t('home.cta')}
            <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </Link>
      </div>

      {/* Stats */}
      {prompts.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-12 max-w-sm mx-auto">
          <div className="rounded-xl border border-surface-3 dark:border-dark-3 p-6 text-center">
            <div className="text-3xl font-bold text-brand-600 mb-1">
              {stats.total}
            </div>
            <div className="text-sm text-gray-500">{t('home.stats.prompts')}</div>
          </div>
          <div className="rounded-xl border border-surface-3 dark:border-dark-3 p-6 text-center">
            <div className="text-3xl font-bold text-yellow-500 mb-1">
              {stats.favorites}
            </div>
            <div className="text-sm text-gray-500">{t('home.stats.favorites')}</div>
          </div>
        </div>
      )}

      {/* Recent prompts */}
      {recent.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">{t('home.recent')}</h2>
          <div className="space-y-2">
            {recent.map((p) => (
              <Link
                key={p.id}
                to={`/library/${p.id}`}
                className="flex items-center gap-4 px-4 py-3 rounded-lg border border-surface-3 dark:border-dark-3 hover:border-brand-300 dark:hover:border-brand-700 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                    {p.title}
                  </p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {p.optimizedText}
                  </p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {formatDate(p.updatedAt)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {prompts.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-surface-2 dark:bg-dark-2 flex items-center justify-center mx-auto mb-4">
            <BookOpen size={28} className="text-gray-400" />
          </div>
          <p className="text-gray-400 mb-4">{t('home.noRecent')}</p>
          <Link to={ROUTES.OPTIMIZE}>
            <Button variant="secondary">{t('home.cta')}</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
