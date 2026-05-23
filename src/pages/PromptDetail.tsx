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
  Sparkles,
  BarChart3,
  Users,
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
import { scoreRepository } from '@/services/storage/score-repository';
import { aiScore, userScore } from '@/services/scoring';
import type { PromptScore } from '@/types/prompt';

export default function PromptDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const { currentPrompt, loadPrompt, updatePrompt, deletePrompt, toggleFavorite, createPrompt } =
    usePromptStore();
  const settings = useSettingsStore();

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [gistLoading, setGistLoading] = useState(false);
  const [importGistId, setImportGistId] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [scores, setScores] = useState<PromptScore[]>([]);
  const [scoreStats, setScoreStats] = useState<{
    count: number;
    avgClarity: number;
    avgCompleteness: number;
    avgEffectiveness: number;
    avgOverall: number;
    trend: { overall: number; scoredAt: string; source: string }[];
  } | null>(null);
  const [aiScoring, setAiScoring] = useState(false);
  const [showUserScore, setShowUserScore] = useState(false);
  const [userScores, setUserScores] = useState({ clarity: 3, completeness: 3, effectiveness: 3 });

  useEffect(() => {
    if (id) loadPrompt(id);
  }, [id, loadPrompt]);

  useEffect(() => {
    if (!id) return;
    scoreRepository.getByPromptId(id).then(setScores);
    scoreRepository.getStats(id).then(setScoreStats);
  }, [id]);

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

  const handleGist = async (shareToCommunity = false) => {
    if (!settings.apiKeys.github) {
      toast('error', 'GitHub token required');
      return;
    }
    setGistLoading(true);
    try {
      const result = await gistService.createGist(prompt, settings.apiKeys.github, shareToCommunity);
      await updatePrompt(prompt.id, {
        gistId: result.gistId,
        gistUrl: result.gistUrl,
      });
      toast('success', shareToCommunity ? t('detail.sharedToCommunity') : t('detail.gistCreated'));
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed');
    } finally {
      setGistLoading(false);
    }
  };

  const handleImportGist = async () => {
    if (!importGistId.trim()) return;
    setImportLoading(true);
    try {
      const imported = await gistService.importFromGist(importGistId.trim());
      const { id: _id, createdAt: _c, updatedAt: _u, version: _v, history: _h, ...rest } = imported;
      await createPrompt(rest);
      toast('success', t('detail.gistImported'));
      setImportGistId('');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed');
    } finally {
      setImportLoading(false);
    }
  };

  const handleAiScore = async () => {
    if (!prompt) return;
    setAiScoring(true);
    try {
      const result = await aiScore(
        prompt.originalText,
        prompt.optimizedText,
        prompt.provider,
        settings.apiKeys[prompt.provider] || '',
        prompt.model,
        prompt.provider === 'custom' ? settings.customBaseUrl : undefined
      );
      const scoreData: Omit<PromptScore, 'id'> = {
        promptId: prompt.id,
        original: prompt.originalText,
        optimized: prompt.optimizedText,
        style: 'default',
        scores: result.scores,
        overall: result.overall,
        source: 'ai',
        scoredAt: new Date().toISOString(),
      };
      await scoreRepository.add(scoreData);
      const updated = await scoreRepository.getByPromptId(prompt.id);
      setScores(updated);
      const stats = await scoreRepository.getStats(prompt.id);
      setScoreStats(stats);
      toast('success', t('detail.scoreSaved'));
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Scoring failed');
    } finally {
      setAiScoring(false);
    }
  };

  const handleUserScore = async () => {
    if (!prompt) return;
    const result = userScore(userScores.clarity, userScores.completeness, userScores.effectiveness);
    const scoreData: Omit<PromptScore, 'id'> = {
      promptId: prompt.id,
      original: prompt.originalText,
      optimized: prompt.optimizedText,
      style: 'default',
      scores: result.scores,
      overall: result.overall,
      source: 'user',
      scoredAt: new Date().toISOString(),
    };
    await scoreRepository.add(scoreData);
    const updated = await scoreRepository.getByPromptId(prompt.id);
    setScores(updated);
    const stats = await scoreRepository.getStats(prompt.id);
    setScoreStats(stats);
    setShowUserScore(false);
    toast('success', t('detail.scoreSaved'));
  };

  const ScoreBar = ({ label, value }: { label: string; value: number }) => (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-16">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-surface-2 dark:bg-dark-2 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            value >= 4 ? 'bg-green-500' : value >= 3 ? 'bg-yellow-500' : 'bg-red-400'
          )}
          style={{ width: `${(value / 5) * 100}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-6 text-right">
        {value.toFixed(1)}
      </span>
    </div>
  );

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
      <div className="space-y-6">
        {/* Original */}
        <div className="rounded-xl border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-0 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
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
          <div className="rounded-lg bg-surface-1 dark:bg-dark-1 p-4 overflow-x-auto">
            <pre className="whitespace-pre-wrap text-base text-gray-600 dark:text-gray-400 font-sans leading-relaxed">
              {prompt.originalText}
            </pre>
          </div>
        </div>

        {/* Optimized */}
        <div className="rounded-xl border border-brand-200 dark:border-brand-800 bg-surface-0 dark:bg-dark-0 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-500" />
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
          <div className="rounded-lg bg-brand-50/50 dark:bg-brand-900/10 p-4 overflow-x-auto">
            <pre className="whitespace-pre-wrap text-base text-gray-800 dark:text-gray-200 font-sans leading-relaxed">
              {prompt.optimizedText}
            </pre>
          </div>
        </div>

        {/* Explanation */}
        {prompt.explanation && (
          <div className="rounded-xl border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-0 p-5">
            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              {t('detail.explanation')}
            </h3>
            <div className="rounded-lg bg-surface-1 dark:bg-dark-1 p-4 text-base text-gray-600 dark:text-gray-400 leading-relaxed">
              {prompt.explanation}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-6 flex items-center gap-3 flex-wrap">
        <Button variant="secondary" onClick={handleExport}>
          <Download size={16} />
          {t('detail.exportJson')}
        </Button>
        <Button
          variant="secondary"
          onClick={() => handleGist(false)}
          loading={gistLoading}
          disabled={!settings.apiKeys.github}
        >
          <ExternalLink size={16} />
          {t('detail.createGist')}
        </Button>
        <Button
          variant="secondary"
          onClick={() => handleGist(true)}
          loading={gistLoading}
          disabled={!settings.apiKeys.github}
        >
          <Users size={16} />
          {t('detail.shareToCommunity')}
        </Button>
        <Link to={ROUTES.OPTIMIZE} state={{
          prefill: prompt.originalText,
          prefillResult: prompt.optimizedText,
          prefillExplanation: prompt.explanation,
          prefillSuggestions: prompt.suggestions || [],
          fromDetail: prompt.id,
        }}>
          <Button variant="secondary">
            <Edit3 size={16} />
            {t('optimize.reOptimize')}
          </Button>
        </Link>
      </div>

      {/* Import from Gist */}
      <div className="mt-6 rounded-xl border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-0 p-5">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('detail.importGist')}</h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={importGistId}
            onChange={(e) => setImportGistId(e.target.value)}
            placeholder="Gist ID..."
            className="flex-1 h-9 px-3 rounded-lg border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-1 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            onKeyDown={(e) => { if (e.key === 'Enter') handleImportGist(); }}
          />
          <Button
            size="sm"
            onClick={handleImportGist}
            loading={importLoading}
            disabled={!importGistId.trim()}
          >
            {t('common.import')}
          </Button>
        </div>
      </div>

      {/* Version History */}
      {prompt.history.length > 0 && (
        <div className="mt-6 rounded-xl border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-0 p-5">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('detail.versionHistory')}</h3>
          <div className="space-y-3">
            {[...prompt.history].reverse().map((v) => (
              <div key={v.version} className="rounded-lg bg-surface-1 dark:bg-dark-1 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">v{v.version}</span>
                  <span className="text-xs text-gray-400">{formatDate(v.createdAt)}</span>
                </div>
                <pre className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400 font-sans line-clamp-3">
                  {v.text}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quality Score */}
      <div className="mt-6 rounded-xl border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-0 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <BarChart3 size={16} />
            {t('detail.qualityScore')}
          </h3>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleAiScore}
              loading={aiScoring}
            >
              <Sparkles size={14} />
              {t('detail.aiScore')}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowUserScore(!showUserScore)}
            >
              {t('detail.userScore')}
            </Button>
          </div>
        </div>

        {/* User Score Sliders */}
        {showUserScore && (
          <div className="mb-4 p-4 rounded-lg bg-surface-1 dark:bg-dark-1 space-y-3">
            {(['clarity', 'completeness', 'effectiveness'] as const).map((key) => (
              <div key={key} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-16">{t(`detail.${key}`)}</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={userScores[key]}
                  onChange={(e) => setUserScores({ ...userScores, [key]: Number(e.target.value) })}
                  className="flex-1 accent-brand-500"
                />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-6 text-right">
                  {userScores[key]}
                </span>
              </div>
            ))}
            <Button size="sm" onClick={handleUserScore} className="mt-2">
              {t('common.save')}
            </Button>
          </div>
        )}

        {/* Latest Score */}
        {scores.length > 0 ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <ScoreBar label={t('detail.clarity')} value={scoreStats?.avgClarity || 0} />
              <ScoreBar label={t('detail.completeness')} value={scoreStats?.avgCompleteness || 0} />
              <ScoreBar label={t('detail.effectiveness')} value={scoreStats?.avgEffectiveness || 0} />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-surface-2 dark:border-dark-2">
              <span className="text-xs text-gray-500">{t('detail.avgScore')} ({scoreStats?.count || 0})</span>
              <span className="text-lg font-bold text-brand-600">{scoreStats?.avgOverall.toFixed(1) || '-'}</span>
            </div>

            {/* Trend Mini Chart */}
            {scoreStats && scoreStats.trend.length > 1 && (
              <div className="pt-3 border-t border-surface-2 dark:border-dark-2">
                <p className="text-xs text-gray-500 mb-2">{t('detail.scoreHistory')}</p>
                <div className="flex items-end gap-1 h-12">
                  {scoreStats.trend.map((t, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex-1 rounded-t',
                        t.source === 'ai' ? 'bg-brand-400' : 'bg-green-400'
                      )}
                      style={{ height: `${(t.overall / 5) * 100}%`, minHeight: '4px' }}
                      title={`${t.source === 'ai' ? 'AI' : 'User'}: ${t.overall}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-4">{t('detail.noScores')}</p>
        )}
      </div>
    </div>
  );
}
