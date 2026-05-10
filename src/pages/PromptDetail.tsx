import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Copy,
  Save,
  Star,
  Trash2,
  Download,
  ExternalLink,
  Edit3,
  Check,
  X,
} from 'lucide-react';
import { usePromptStore } from '@/stores/usePromptStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { Button } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { copyToClipboard } from '@/utils/copy';
import { formatDate } from '@/utils/date';
import { gistService } from '@/services/github/gist';
import { exportPromptJSON, downloadJSON } from '@/services/export/json-export';
import { cn } from '@/utils/cn';
import { ROUTES } from '@/constants/routes';

export default function PromptDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const { currentPrompt, loadPrompt, updatePrompt, deletePrompt, toggleFavorite } =
    usePromptStore();
  const settings = useSettingsStore();

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [gistLoading, setGistLoading] = useState(false);

  useEffect(() => {
    if (id) loadPrompt(id);
  }, [id, loadPrompt]);

  if (!currentPrompt) {
    return (
      <div className="max-w-4xl mx-auto py-6 px-6">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  const prompt = currentPrompt;

  const handleCopy = async (text: string) => {
    if (await copyToClipboard(text)) {
      toast('success', t('common.copied'));
    }
  };

  const handleSaveTitle = async () => {
    if (editTitle.trim()) {
      await updatePrompt(prompt.id, { title: editTitle.trim() });
    }
    setEditing(false);
  };

  const handleDelete = async () => {
    if (window.confirm(t('library.confirmDelete'))) {
      await deletePrompt(prompt.id);
      navigate(ROUTES.LIBRARY);
    }
  };

  const handleExport = () => {
    const json = exportPromptJSON(prompt);
    downloadJSON(json, `prompt-${prompt.id.slice(0, 8)}.json`);
    toast('success', t('settings.exportAll') + ' ✓');
  };

  const handleGist = async () => {
    if (!settings.apiKeys.github) {
      toast('error', 'GitHub token required');
      return;
    }
    setGistLoading(true);
    try {
      const result = await gistService.createGist(prompt, settings.apiKeys.github);
      await updatePrompt(prompt.id, {
        gistId: result.gistId,
        gistUrl: result.gistUrl,
      });
      toast('success', t('detail.gistCreated'));
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed');
    } finally {
      setGistLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          to={ROUTES.LIBRARY}
          className="p-2 rounded-lg hover:bg-surface-2 dark:hover:bg-dark-2 text-gray-400"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="flex-1 h-9 rounded-lg border border-brand-500 bg-surface-0 dark:bg-dark-1 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') setEditing(false);
                }}
              />
              <Button size="sm" onClick={handleSaveTitle}>
                <Check size={14} />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                <X size={14} />
              </Button>
            </div>
          ) : (
            <h1
              className="text-heading truncate cursor-pointer hover:text-brand-600"
              onClick={() => {
                setEditTitle(prompt.title);
                setEditing(true);
              }}
            >
              {prompt.title}
            </h1>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => toggleFavorite(prompt.id)}
            className="p-2 rounded-lg hover:bg-surface-2 dark:hover:bg-dark-2"
          >
            <Star
              size={20}
              className={
                prompt.isFavorite
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-400'
              }
            />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 rounded-lg hover:bg-error/10 text-gray-400 hover:text-error"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 mb-6 text-xs text-gray-400">
        <span>{prompt.provider} / {prompt.model}</span>
        <span>•</span>
        <span>{formatDate(prompt.createdAt)}</span>
        <span>•</span>
        <span>v{prompt.version}</span>
        {prompt.gistUrl && (
          <>
            <span>•</span>
            <a
              href={prompt.gistUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-500 hover:underline flex items-center gap-1"
            >
              Gist <ExternalLink size={10} />
            </a>
          </>
        )}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Original */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('detail.original')}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(prompt.originalText)}
            >
              <Copy size={14} />
            </Button>
          </div>
          <div className="rounded-lg border border-surface-3 dark:border-dark-3 bg-surface-1 dark:bg-dark-1 p-4 min-h-[200px] overflow-x-auto">
            <pre className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400 font-sans leading-relaxed">
              {prompt.originalText}
            </pre>
          </div>
        </div>

        {/* Optimized */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('detail.optimized')}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(prompt.optimizedText)}
            >
              <Copy size={14} />
            </Button>
          </div>
          <div className="rounded-lg border border-surface-3 dark:border-dark-3 bg-surface-1 dark:bg-dark-1 p-4 min-h-[200px] overflow-x-auto">
            <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-sans leading-relaxed">
              {prompt.optimizedText}
            </pre>
          </div>
        </div>
      </div>

      {/* Explanation */}
      {prompt.explanation && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('detail.explanation')}
          </h3>
          <div className="rounded-lg border border-surface-3 dark:border-dark-3 bg-surface-1 dark:bg-dark-1 p-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {prompt.explanation}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex items-center gap-3">
        <Button variant="secondary" onClick={handleExport}>
          <Download size={16} />
          {t('detail.exportJson')}
        </Button>
        <Button
          variant="secondary"
          onClick={handleGist}
          loading={gistLoading}
          disabled={!settings.apiKeys.github}
        >
          <ExternalLink size={16} />
          {t('detail.createGist')}
        </Button>
        <Link to={ROUTES.OPTIMIZE}>
          <Button variant="secondary">
            <Edit3 size={16} />
            {t('optimize.reOptimize')}
          </Button>
        </Link>
      </div>
    </div>
  );
}
