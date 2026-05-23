import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Star,
  Grid3X3,
  List,
  Trash2,
  Copy,
  ExternalLink,
  Columns2,
  Sparkles,
  X,
} from 'lucide-react';
import { usePromptStore } from '@/stores/usePromptStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { Button } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { ROUTES } from '@/constants/routes';
import { DEFAULT_CATEGORIES } from '@/constants/categories';
import { copyToClipboard } from '@/utils/copy';
import { formatDate } from '@/utils/date';
import { cn } from '@/utils/cn';
import { aiScore } from '@/services/scoring';
import { scoreRepository } from '@/services/storage/score-repository';
import type { Prompt } from '@/types/prompt';

export default function Library() {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const {
    prompts,
    isLoading,
    filter,
    setFilter,
    loadPrompts,
    deletePrompt,
    toggleFavorite,
  } = usePromptStore();
  const settings = useSettingsStore();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchScoring, setBatchScoring] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    prompts.forEach((p) => p.tags.forEach((t) => tags.add(t)));
    return [...tags].sort();
  }, [prompts]);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilter({ ...filter, searchQuery: searchQuery || undefined });
      loadPrompts();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleDelete = async (id: string) => {
    if (window.confirm(t('library.confirmDelete'))) {
      await deletePrompt(id);
      toast('success', t('common.delete') + ' ✓');
    }
  };

  const handleCopy = async (text: string) => {
    if (await copyToClipboard(text)) {
      toast('success', t('common.copied'));
    }
  };

  const toggleBatchMode = () => {
    setBatchMode(!batchMode);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(prompts.map((p) => p.id)));
  };

  const handleBatchScore = async () => {
    if (selectedIds.size === 0) return;
    const ids = [...selectedIds];
    setBatchScoring(true);
    setBatchProgress({ current: 0, total: ids.length });
    let scored = 0;

    for (const id of ids) {
      const prompt = prompts.find((p) => p.id === id);
      if (!prompt) continue;
      try {
        const result = await aiScore(
          prompt.originalText,
          prompt.optimizedText,
          prompt.provider,
          settings.apiKeys[prompt.provider] || '',
          prompt.model,
          prompt.provider === 'custom' ? settings.customBaseUrl : undefined
        );
        await scoreRepository.add({
          promptId: prompt.id,
          original: prompt.originalText,
          optimized: prompt.optimizedText,
          style: 'default',
          scores: result.scores,
          overall: result.overall,
          source: 'ai',
          scoredAt: new Date().toISOString(),
        });
        scored++;
      } catch {
        // skip failed scores
      }
      setBatchProgress({ current: scored, total: ids.length });
    }

    setBatchScoring(false);
    setBatchMode(false);
    setSelectedIds(new Set());
    toast('success', t('detail.batchComplete', { count: scored }));
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-heading">{t('library.title')}</h1>
        <div className="flex items-center gap-2">
          {batchMode ? (
            <>
              <span className="text-xs text-gray-500">
                {t('detail.batchSelectCount', { count: selectedIds.size })}
              </span>
              <Button size="sm" variant="ghost" onClick={selectAll}>
                {t('common.confirm')}
              </Button>
              <Button
                size="sm"
                onClick={handleBatchScore}
                loading={batchScoring}
                disabled={selectedIds.size === 0}
              >
                <Sparkles size={14} />
                {t('detail.batchScore')}
              </Button>
              <button
                onClick={toggleBatchMode}
                className="p-2 rounded-lg text-gray-400 hover:bg-surface-2 dark:hover:bg-dark-2"
              >
                <X size={18} />
              </button>
            </>
          ) : (
            <>
              {prompts.length >= 2 && (
                <Link
                  to={`${ROUTES.COMPARE}?a=${prompts[0]?.id}&b=${prompts[1]?.id}`}
                  className="p-2 rounded-lg text-gray-400 hover:bg-surface-2 dark:hover:bg-dark-2 hover:text-gray-600 transition-colors"
                  title={t('compare.title')}
                >
                  <Columns2 size={18} />
                </Link>
              )}
              {prompts.length > 0 && (
                <button
                  onClick={toggleBatchMode}
                  className="p-2 rounded-lg text-gray-400 hover:bg-surface-2 dark:hover:bg-dark-2 hover:text-gray-600 transition-colors"
                  title={t('detail.batchScore')}
                >
                  <Sparkles size={18} />
                </button>
              )}
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  viewMode === 'grid'
                    ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                    : 'text-gray-400 hover:bg-surface-2 dark:hover:bg-dark-2'
                )}
              >
                <Grid3X3 size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  viewMode === 'list'
                    ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                    : 'text-gray-400 hover:bg-surface-2 dark:hover:bg-dark-2'
                )}
              >
                <List size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Batch progress */}
      {batchScoring && (
        <div className="mb-4 p-3 rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-brand-700 dark:text-brand-300">
              {t('detail.batchProgress', { current: batchProgress.current, total: batchProgress.total })}
            </span>
          </div>
          <div className="h-1.5 bg-brand-100 dark:bg-brand-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-300"
              style={{ width: `${batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('library.searchPlaceholder')}
          className="w-full h-10 pl-10 pr-4 rounded-lg border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-1 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
        />
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto">
        <button
          onClick={() => {
            setFilter({});
            loadPrompts();
          }}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0',
            !filter.favoritesOnly && !filter.category && !filter.tags?.length
              ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
              : 'bg-surface-2 dark:bg-dark-2 text-gray-600 dark:text-gray-400 hover:bg-surface-3 dark:hover:bg-dark-3'
          )}
        >
          {t('library.allPrompts')}
        </button>
        <button
          onClick={() => {
            setFilter({ favoritesOnly: true });
            loadPrompts();
          }}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0 flex items-center gap-1',
            filter.favoritesOnly
              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
              : 'bg-surface-2 dark:bg-dark-2 text-gray-600 dark:text-gray-400 hover:bg-surface-3 dark:hover:bg-dark-3'
          )}
        >
          <Star size={12} />
          {t('library.favorites')}
        </button>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto">
        {DEFAULT_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setFilter({ ...filter, category: filter.category === cat.id ? undefined : cat.id });
              loadPrompts();
            }}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0 flex items-center gap-1',
              filter.category === cat.id
                ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                : 'bg-surface-2 dark:bg-dark-2 text-gray-600 dark:text-gray-400 hover:bg-surface-3 dark:hover:bg-dark-3'
            )}
          >
            <span>{cat.icon}</span>
            {cat.nameZh}
          </button>
        ))}
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-2 mb-6 overflow-x-auto">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => {
                const current = filter.tags || [];
                const next = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
                setFilter({ ...filter, tags: next.length ? next : undefined });
                loadPrompts();
              }}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0',
                filter.tags?.includes(tag)
                  ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                  : 'bg-surface-2 dark:bg-dark-2 text-gray-500 dark:text-gray-400 hover:bg-surface-3 dark:hover:bg-dark-3'
              )}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-20">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">{t('common.loading')}</p>
        </div>
      ) : prompts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 mb-4">{t('library.noPrompts')}</p>
          <Link to={ROUTES.OPTIMIZE}>
            <Button>{t('home.cta')}</Button>
          </Link>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {prompts.map((p) => (
            <PromptCard
              key={p.id}
              prompt={p}
              onDelete={handleDelete}
              onCopy={handleCopy}
              onToggleFavorite={toggleFavorite}
              batchMode={batchMode}
              selected={selectedIds.has(p.id)}
              onToggleSelect={() => toggleSelect(p.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {prompts.map((p) => (
            <PromptListItem
              key={p.id}
              prompt={p}
              onDelete={handleDelete}
              onCopy={handleCopy}
              onToggleFavorite={toggleFavorite}
              batchMode={batchMode}
              selected={selectedIds.has(p.id)}
              onToggleSelect={() => toggleSelect(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PromptCard({
  prompt,
  onDelete,
  onCopy,
  onToggleFavorite,
  batchMode,
  selected,
  onToggleSelect,
}: {
  prompt: Prompt;
  onDelete: (id: string) => void;
  onCopy: (text: string) => void;
  onToggleFavorite: (id: string) => void;
  batchMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  return (
    <div className={cn(
      'group rounded-xl border bg-surface-0 dark:bg-dark-0 p-4 transition-all hover:shadow-elevated',
      selected
        ? 'border-brand-400 dark:border-brand-600 bg-brand-50/50 dark:bg-brand-900/10'
        : 'border-surface-3 dark:border-dark-3 hover:border-brand-300 dark:hover:border-brand-700'
    )}>
      <div className="flex items-start justify-between mb-2">
        {batchMode ? (
          <button
            onClick={onToggleSelect}
            className={cn(
              'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mr-2 mt-0.5 transition-colors',
              selected
                ? 'bg-brand-500 border-brand-500'
                : 'border-gray-300 dark:border-gray-600'
            )}
          >
            {selected && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        ) : null}
        <Link
          to={`/library/${prompt.id}`}
          className="text-sm font-medium text-gray-800 dark:text-gray-200 hover:text-brand-600 dark:hover:text-brand-400 line-clamp-1 flex-1"
        >
          {prompt.title}
        </Link>
        {!batchMode && (
          <button
            onClick={() => onToggleFavorite(prompt.id)}
            className="shrink-0 ml-2"
          >
            <Star
              size={16}
              className={cn(
                'transition-colors',
                prompt.isFavorite
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300 dark:text-gray-600 group-hover:text-gray-400'
              )}
            />
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 mb-3 leading-relaxed">
        {prompt.optimizedText}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {prompt.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full bg-surface-2 dark:bg-dark-2 text-xs text-gray-500"
            >
              {tag}
            </span>
          ))}
        </div>
        {!batchMode && (
          <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onCopy(prompt.optimizedText)}
              className="p-1 rounded hover:bg-surface-2 dark:hover:bg-dark-2 text-gray-400"
            >
              <Copy size={14} />
            </button>
            <button
              onClick={() => onDelete(prompt.id)}
              className="p-1 rounded hover:bg-error/10 text-gray-400 hover:text-error"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PromptListItem({
  prompt,
  onDelete,
  onCopy,
  onToggleFavorite,
  batchMode,
  selected,
  onToggleSelect,
}: {
  prompt: Prompt;
  onDelete: (id: string) => void;
  onCopy: (text: string) => void;
  onToggleFavorite: (id: string) => void;
  batchMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  return (
    <div className={cn(
      'group flex items-center gap-4 px-4 py-3 rounded-lg border transition-all',
      selected
        ? 'border-brand-400 dark:border-brand-600 bg-brand-50/50 dark:bg-brand-900/10'
        : 'border-surface-3 dark:border-dark-3 hover:border-brand-300 dark:hover:border-brand-700'
    )}>
      {batchMode ? (
        <button
          onClick={onToggleSelect}
          className={cn(
            'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
            selected
              ? 'bg-brand-500 border-brand-500'
              : 'border-gray-300 dark:border-gray-600'
          )}
        >
          {selected && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      ) : (
        <button onClick={() => onToggleFavorite(prompt.id)}>
          <Star
            size={16}
            className={cn(
              prompt.isFavorite
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300 dark:text-gray-600'
            )}
          />
        </button>
      )}
      <Link
        to={batchMode ? '#' : `/library/${prompt.id}`}
        className="flex-1 min-w-0"
        onClick={batchMode ? (e) => { e.preventDefault(); onToggleSelect(); } : undefined}
      >
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
          {prompt.title}
        </p>
        <p className="text-xs text-gray-400 truncate mt-0.5">
          {prompt.optimizedText}
        </p>
      </Link>
      <span className="text-xs text-gray-400 shrink-0">
        {formatDate(prompt.updatedAt)}
      </span>
      {!batchMode && (
        <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onCopy(prompt.optimizedText)}
            className="p-1 rounded hover:bg-surface-2 dark:hover:bg-dark-2 text-gray-400"
          >
            <Copy size={14} />
          </button>
          <button
            onClick={() => onDelete(prompt.id)}
            className="p-1 rounded hover:bg-error/10 text-gray-400 hover:text-error"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
