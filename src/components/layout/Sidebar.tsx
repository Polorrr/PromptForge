import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Home,
  Sparkles,
  BookOpen,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { useAppStore } from '@/stores/useAppStore';
import { cn } from '@/utils/cn';

const NAV_ITEMS = [
  { path: ROUTES.HOME, icon: Home, labelKey: 'nav.home' },
  { path: ROUTES.OPTIMIZE, icon: Sparkles, labelKey: 'nav.optimize' },
  { path: ROUTES.LIBRARY, icon: BookOpen, labelKey: 'nav.library' },
  { path: ROUTES.COMMUNITY, icon: Users, labelKey: 'nav.community' },
];

export default function Sidebar() {
  const { t } = useTranslation();
  const { sidebarOpen, toggleSidebar } = useAppStore();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full bg-surface-1 dark:bg-dark-1 border-r border-surface-2 dark:border-dark-3 flex flex-col transition-all duration-200 z-20',
        sidebarOpen ? 'w-60' : 'w-16'
      )}
    >
      {/* Logo */}
      <div className="h-14 flex items-center border-b border-surface-2 dark:border-dark-3" style={{ justifyContent: sidebarOpen ? 'flex-start' : 'center', padding: sidebarOpen ? '0 16px' : '0' }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            P
          </div>
          {sidebarOpen && (
            <span className="font-semibold text-sm truncate">PromptForge</span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            tabIndex={-1}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                isActive
                  ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-surface-2 dark:hover:bg-dark-2'
              )
            }
          >
            <item.icon size={20} className="shrink-0" />
            {sidebarOpen && <span className="truncate">{t(item.labelKey)}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Settings + Collapse */}
      <div className="py-3 px-2 border-t border-surface-2 dark:border-dark-3 space-y-1">
        <NavLink
          to={ROUTES.SETTINGS}
          tabIndex={-1}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
              isActive
                ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-surface-2 dark:hover:bg-dark-2'
            )
          }
        >
          <Settings size={20} className="shrink-0" />
          {sidebarOpen && <span className="truncate">{t('nav.settings')}</span>}
        </NavLink>

        <button
          onClick={toggleSidebar}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-surface-2 dark:hover:bg-dark-2 transition-colors w-full outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {sidebarOpen ? (
            <ChevronLeft size={20} className="shrink-0" />
          ) : (
            <ChevronRight size={20} className="shrink-0" />
          )}
          {sidebarOpen && <span className="truncate">{t('nav.collapse')}</span>}
        </button>
      </div>
    </aside>
  );
}
