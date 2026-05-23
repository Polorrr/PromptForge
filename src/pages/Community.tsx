import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Star,
  GitFork,
  ExternalLink,
  Loader2,
  Copy,
  Tag,
  Clock,
} from 'lucide-react';
import { usePromptStore } from '@/stores/usePromptStore';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui';
import { communityService, type CommunityGist } from '@/services/github/community';
import { formatDate } from '@/utils/date';
import { copyToClipboard } from '@/utils/copy';
import { ROUTES } from '@/constants/routes';

export default function Community() {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const createPrompt = usePromptStore((s) => s.createPrompt);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CommunityGist[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [forkingId, setForkingId] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    try {
      const data = await communityService.searchPrompts(query.trim() || undefined);
      setResults(data);
    } catch {
      toast('error', t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [query, toast, t]);

  const handleFork = async (gist: CommunityGist) => {
    setForkingId(gist.id);
    try {
      const result = await createPrompt({
        title: gist.title,
        originalText: gist.original,
        optimizedText: gist.prompt,
        explanation: gist.explanation,
        suggestions: [],
        category: gist.category,
        tags: gist.tags,
        provider: 'openai',
        model: 'unknown',
        isFavorite: false,
      });
      if (result.isDuplicate) {
        toast('error', t('optimize.alreadySaved'));
      } else {
        toast('success', t('community.forkSuccess'));
        navigate(`${ROUTES.LIBRARY}?highlight=${result.id}`);
      }
    } catch {
      toast('error', t('common.error'));
    } finally {
      setForkingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-6">
      <h1 className="text-heading mb-2">{t('community.title')}</h1>
      <p className="text-gray-500 mb-6">{t('community.subtitle')}</p>

      {/* Search */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={t('community.searchPlaceholder')}
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-1 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <Button onClick={handleSearch} loading={loading}>
          {t('common.search')}
        </Button>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-brand-500" />
          <span className="ml-3 text-gray-400">{t('community.loading')}</span>
        </div>
      ) : !searched ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-sm">{t('community.startSearch')}</p>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-sm">{t('community.noPrompts')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((gist) => (
            <div
              key={gist.id}
              className="rounded-xl border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-0 p-5 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 line-clamp-2 flex-1">
                  {gist.title}
                </h3>
                <a
                  href={gist.gistUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded hover:bg-surface-2 dark:hover:bg-dark-2 text-gray-400 shrink-0"
                >
                  <ExternalLink size={14} />
                </a>
              </div>

              {/* Prompt Preview */}
              <p className="text-xs text-gray-500 line-clamp-4 mb-3 flex-1">
                {gist.prompt}
              </p>

              {/* Tags */}
              {gist.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {gist.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-2 dark:bg-dark-2 text-[10px] text-gray-500"
                    >
                      <Tag size={8} />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Meta */}
              <div className="flex items-center gap-3 text-[10px] text-gray-400 mb-3">
                <span className="flex items-center gap-1">
                  <Star size={10} />
                  {gist.stars}
                </span>
                <span>{gist.author}</span>
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  {formatDate(gist.createdAt)}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleFork(gist)}
                  loading={forkingId === gist.id}
                  className="flex-1"
                >
                  <GitFork size={12} />
                  {t('community.forkToLibrary')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(gist.prompt).then(() => toast('success', t('common.copied')))}
                >
                  <Copy size={12} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
