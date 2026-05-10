import { useTranslation } from 'react-i18next';
import { Search, Sun, Moon, Monitor } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { cn } from '@/utils/cn';

export default function Header() {
  const { t, i18n } = useTranslation();
  const theme = useAppStore((s) => s.theme) as 'light' | 'dark' | 'system' | undefined;
  const setTheme = useAppStore((s) => s.setTheme);
  const language = useAppStore((s) => s.language) as 'en' | 'zh' | undefined;
  const setLanguage = useAppStore((s) => s.setLanguage);
  const { apiKeys } = useSettingsStore();

  const currentTheme: 'light' | 'dark' | 'system' = theme ?? 'system';
  const currentLang: 'en' | 'zh' = language ?? 'en';

  const toggleLanguage = () => {
    const next = currentLang === 'en' ? 'zh' : 'en';
    setLanguage(next);
    i18n.changeLanguage(next);
  };

  const cycleTheme = () => {
    const order = ['light', 'dark', 'system'] as const;
    const idx = order.indexOf(currentTheme);
    const next = order[(idx + 1) % order.length] ?? 'system';
    setTheme(next);
  };

  const ThemeIcon = currentTheme === 'dark' ? Moon : currentTheme === 'light' ? Sun : Monitor;

  const hasApiKey = !!(apiKeys.openai || apiKeys.claude || apiKeys.custom);

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-surface-2 dark:border-dark-3 bg-surface-0 dark:bg-dark-0 shrink-0">
      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-1 dark:bg-dark-1 rounded-lg text-gray-400 text-sm cursor-pointer hover:bg-surface-2 dark:hover:bg-dark-2 transition-colors min-w-[200px]">
        <Search size={16} />
        <span>{t('common.search')}</span>
        <kbd className="ml-auto text-xs bg-surface-2 dark:bg-dark-3 px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400">
          Ctrl+K
        </kbd>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* API Key status */}
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            hasApiKey ? 'bg-success' : 'bg-error'
          )}
          title={hasApiKey ? t('settings.connectionSuccess') : t('optimize.error.noApiKey')}
        />

        {/* Language toggle */}
        <button
          onClick={toggleLanguage}
          className="px-2 py-1 text-xs font-medium rounded-md hover:bg-surface-2 dark:hover:bg-dark-2 transition-colors text-gray-600 dark:text-gray-400"
        >
          {currentLang === 'en' ? '中文' : 'EN'}
        </button>

        {/* Theme toggle */}
        <button
          onClick={cycleTheme}
          className="p-2 rounded-lg hover:bg-surface-2 dark:hover:bg-dark-2 transition-colors text-gray-600 dark:text-gray-400"
        >
          <ThemeIcon size={18} />
        </button>
      </div>
    </header>
  );
}
