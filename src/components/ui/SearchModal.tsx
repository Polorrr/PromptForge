import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, FileText, Sparkles, Settings, BookOpen } from 'lucide-react';
import { usePromptStore } from '@/stores/usePromptStore';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/utils/cn';

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const { prompts, loadPrompts } = usePromptStore();

  useEffect(() => {
    if (open) {
      loadPrompts();
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, loadPrompts]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const q = query.toLowerCase().trim();

  const filteredPrompts = q
    ? prompts.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.optimizedText.toLowerCase().includes(q) ||
          p.tags.some((tag) => tag.toLowerCase().includes(q))
      )
    : prompts.slice(0, 5);

  const shortcuts = [
    { label: t('nav.optimize'), icon: Sparkles, action: () => { navigate(ROUTES.OPTIMIZE); onClose(); } },
    { label: t('nav.library'), icon: BookOpen, action: () => { navigate(ROUTES.LIBRARY); onClose(); } },
    { label: t('nav.settings'), icon: Settings, action: () => { navigate(ROUTES.SETTINGS); onClose(); } },
  ];

  const filteredShortcuts = q
    ? shortcuts.filter((s) => s.label.toLowerCase().includes(q))
    : shortcuts;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface-0 dark:bg-dark-1 rounded-xl shadow-modal border border-surface-3 dark:border-dark-3 overflow-hidden animate-slide-down">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-2 dark:border-dark-3">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('common.search') + '...'}
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none"
          />
          <kbd className="text-xs text-gray-400 bg-surface-2 dark:bg-dark-3 px-1.5 py-0.5 rounded">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-auto p-2">
          {/* Navigation shortcuts */}
          {filteredShortcuts.length > 0 && (
            <div className="mb-2">
              <p className="px-3 py-1.5 text-xs text-gray-400 font-medium">{t('nav.home')}</p>
              {filteredShortcuts.map((s) => (
                <button
                  key={s.label}
                  onClick={s.action}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-surface-2 dark:hover:bg-dark-2 transition-colors"
                >
                  <s.icon size={16} className="text-gray-400" />
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Prompts */}
          {filteredPrompts.length > 0 && (
            <div>
              <p className="px-3 py-1.5 text-xs text-gray-400 font-medium">{t('library.title')}</p>
              {filteredPrompts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { navigate(`/library/${p.id}`); onClose(); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-surface-2 dark:hover:bg-dark-2 transition-colors"
                >
                  <FileText size={16} className="text-gray-400 shrink-0" />
                  <span className="truncate text-gray-700 dark:text-gray-300">{p.title}</span>
                </button>
              ))}
            </div>
          )}

          {/* Empty */}
          {filteredPrompts.length === 0 && filteredShortcuts.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-400">
              {t('common.empty')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
