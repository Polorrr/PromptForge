import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, Copy, Save, RotateCcw, ChevronDown, RefreshCw, History } from 'lucide-react';
import { useOptimize } from '@/hooks/useOptimize';
import { useRelayModels } from '@/hooks/useRelayModels';
import { useOptimizeStore } from '@/stores/useOptimizeStore';
import { usePromptStore } from '@/stores/usePromptStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { Button } from '@/components/ui';
import { Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { copyToClipboard } from '@/utils/copy';
import { MODELS } from '@/constants/models';
import { cn } from '@/utils/cn';
import { useState, useMemo } from 'react';
import type { OptimizeStyle } from '@/types/llm';

function cleanMarkdown(text: string): string {
  return text
    .replace(/\*{3,}/g, '')
    .replace(/\*{2}([^*]+)\*{2}/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^[-*]\s+/gm, '- ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default function Optimize() {
  const { t } = useTranslation();
  const toast = useToast();
  const location = useLocation();
  const {
    inputPrompt,
    setInputPrompt,
    context,
    setContext,
    optimizedPrompt,
    explanation,
    suggestions,
    error,
    selectedProvider,
    setSelectedProvider,
    selectedModel,
    setSelectedModel,
    selectedStyle,
    setSelectedStyle,
    sessionHistory,
    hasApiKey,
    clearResult,
  } = useOptimize();

  const [isLocalOptimizing, setIsLocalOptimizing] = useState(false);
  const createPrompt = usePromptStore((s) => s.createPrompt);
  const settings = useSettingsStore();
  const setOptimizedPrompt = useOptimizeStore((s) => s.setResult);
  const [showHistory, setShowHistory] = useState(false);
  const { models: relayModels, loading: relayLoading, reload: reloadRelayModels } = useRelayModels();
  const [manualModel, setManualModel] = useState('');

  const cleanedPrompt = useMemo(() => {
    if (!optimizedPrompt) return '';
    return cleanMarkdown(optimizedPrompt);
  }, [optimizedPrompt]);

  useEffect(() => {
    const prefill = location.state?.prefill as string | undefined;
    const prefillResult = location.state?.prefillResult as string | undefined;
    const prefillExplanation = location.state?.prefillExplanation as string | undefined;
    const prefillSuggestions = location.state?.prefillSuggestions as string[] | undefined;
    if (prefill) {
      setInputPrompt(prefill);
      if (prefillResult) {
        setOptimizedPrompt({
          optimized: prefillResult,
          explanation: prefillExplanation || '',
          suggestions: prefillSuggestions || [],
        });
      }
      window.history.replaceState({}, '');
    }
  }, [location.state, setInputPrompt, setOptimizedPrompt]);

  const handleOptimize = async () => {
    if (!inputPrompt.trim()) return;
    setIsLocalOptimizing(true);
    try {
      const request = {
        prompt: inputPrompt,
        context,
        language: settings.optimizeLanguage,
        style: selectedStyle,
        provider: selectedProvider,
        model: selectedModel,
      };
      let result;
      if (selectedProvider === 'custom') {
        const { customService } = await import('@/services/llm/custom');
        result = await customService.optimize(request, settings.apiKeys.custom || '', settings.customBaseUrl || 'https://api.xxdlzs.top');
      } else if (selectedProvider === 'claude') {
        const { ClaudeService } = await import('@/services/llm/claude');
        const svc = new ClaudeService();
        result = await svc.optimize(request, settings.apiKeys.claude || '');
      } else {
        const { OpenAIService } = await import('@/services/llm/openai');
        const svc = new OpenAIService();
        result = await svc.optimize(request, settings.apiKeys.openai || '');
      }
      useOptimizeStore.getState().setResult({
        optimized: result.optimizedPrompt,
        explanation: result.explanation,
        suggestions: result.suggestions,
      });
      useOptimizeStore.getState().addToHistory({
        input: inputPrompt,
        output: result.optimizedPrompt,
        explanation: result.explanation,
        suggestions: result.suggestions,
        provider: selectedProvider,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Optimization failed';
      useOptimizeStore.getState().setError(message);
    } finally {
      setIsLocalOptimizing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleOptimize();
    }
  };

  const handleCopy = async () => {
    if (await copyToClipboard(optimizedPrompt)) {
      toast('success', t('common.copied'));
    }
  };

  const handleSave = async () => {
    if (!optimizedPrompt) return;
    await createPrompt({
      title: inputPrompt.slice(0, 50) + (inputPrompt.length > 50 ? '...' : ''),
      originalText: inputPrompt,
      optimizedText: optimizedPrompt,
      explanation,
      suggestions,
      category: 'other',
      tags: [],
      provider: selectedProvider,
      model: selectedModel,
      isFavorite: false,
    });
    toast('success', t('optimize.saveToLibrary') + ' ✓');
  };

  const filteredModels = MODELS.filter((m) => m.provider === selectedProvider);

  return (
    <div className="h-full flex flex-col" onKeyDown={handleKeyDown}>
      {/* Header */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-surface-2 dark:border-dark-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-heading">{t('optimize.title')}</h1>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Provider selector */}
          <select
            value={selectedProvider}
            onChange={(e) => {
              const p = e.target.value as 'openai' | 'claude' | 'custom';
              setSelectedProvider(p);
              if (p !== 'custom') {
                const firstModel = MODELS.find((m) => m.provider === p);
                if (firstModel) setSelectedModel(firstModel.id);
              } else if (relayModels.length > 0 && relayModels[0]) {
                setSelectedModel(relayModels[0].id);
              }
            }}
            className="h-8 px-3 rounded-lg border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-1 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="openai">{t('optimize.providerOpenai')}</option>
            <option value="claude">{t('optimize.providerClaude')}</option>
            <option value="custom">{t('optimize.providerRelay')}</option>
          </select>
          {/* Model selector */}
          {selectedProvider === 'custom' ? (
            <div className="flex items-center gap-1">
              {relayModels.length > 0 && selectedModel !== '__manual__' ? (
                <select
                  value={selectedModel}
                  onChange={(e) => {
                    if (e.target.value === '__manual__') {
                      setSelectedModel(manualModel || '');
                    } else {
                      setSelectedModel(e.target.value);
                    }
                  }}
                  className="h-8 px-3 rounded-lg border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-1 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 max-w-[200px]"
                >
                  {relayModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id}
                    </option>
                  ))}
                  <option value="__manual__">{t('optimize.manualInput')}</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={manualModel}
                  onChange={(e) => {
                    setManualModel(e.target.value);
                    setSelectedModel(e.target.value);
                  }}
                  placeholder={relayLoading ? t('common.loading') : t('optimize.modelPlaceholder')}
                  className="h-8 w-44 px-3 rounded-lg border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-1 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              )}
              <button
                onClick={reloadRelayModels}
                disabled={relayLoading}
                className="p-1.5 rounded-lg hover:bg-surface-2 dark:hover:bg-dark-2 text-gray-400 hover:text-gray-600 transition-colors"
                title={t('optimize.refreshModels')}
              >
                <RefreshCw size={14} className={relayLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          ) : (
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="h-8 px-3 rounded-lg border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-1 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {filteredModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          )}
          {/* Style */}
          <select
            value={selectedStyle}
            onChange={(e) => setSelectedStyle(e.target.value as OptimizeStyle)}
            className="h-8 px-3 rounded-lg border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-1 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="default">{t('optimize.styleDefault')}</option>
            <option value="concise">{t('optimize.styleConcise')}</option>
            <option value="detailed">{t('optimize.styleDetailed')}</option>
            <option value="creative">{t('optimize.styleCreative')}</option>
            <option value="professional">{t('optimize.styleProfessional')}</option>
          </select>
          {/* Language */}
          <select
            value={settings.optimizeLanguage}
            onChange={(e) =>
              settings.setOptimizeLanguage(e.target.value as 'en' | 'zh' | 'same')
            }
            className="h-8 px-3 rounded-lg border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-1 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="same">{t('optimize.sameAsInput')}</option>
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Left panel - Input */}
        <div className="flex-1 flex flex-col p-4 sm:p-6 lg:border-r border-b lg:border-b-0 border-surface-2 dark:border-dark-3 min-w-0 min-h-0 overflow-auto">
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            <div className="flex-1 flex flex-col min-h-0">
              <label className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('optimize.inputLabel')}
              </label>
              <Textarea
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder={t('optimize.inputPlaceholder')}
              />
              <div className="mt-1 text-xs text-gray-400 text-right">
                {t('optimize.charCount', { count: inputPrompt.length })}
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('optimize.contextLabel')}
              </label>
              <input
                type="text"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder={t('optimize.contextPlaceholder')}
                className="w-full h-10 rounded-lg border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-1 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 shrink-0">
              <Button
                onClick={handleOptimize}
                loading={isLocalOptimizing}
                disabled={!inputPrompt.trim() || !hasApiKey}
                size="lg"
                className="flex-1"
              >
                <Sparkles size={18} />
                {isLocalOptimizing ? t('optimize.optimizing') : t('optimize.optimizeButton')}
              </Button>
              {optimizedPrompt && (
                <Button variant="ghost" onClick={clearResult} size="lg">
                  <RotateCcw size={16} />
                </Button>
              )}
            </div>

            {!hasApiKey && (
              <p className="text-xs text-error">{t('optimize.error.noApiKey')}</p>
            )}
            {error && (
              <p className="text-xs text-error">{error}</p>
            )}
          </div>
        </div>

        {/* Right panel - Output */}
        <div className="flex-1 flex flex-col p-4 sm:p-6 min-w-0 min-h-0 overflow-auto">
          {optimizedPrompt ? (
            <div className="flex-1 flex flex-col gap-4" style={{ animation: 'fadeIn 0.2s ease-out' }}>
              {/* Optimized prompt */}
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-base font-medium text-gray-700 dark:text-gray-300">
                    {t('optimize.outputLabel')}
                  </label>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={handleCopy}>
                      <Copy size={14} />
                      {t('common.copy')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleSave} disabled={!optimizedPrompt}>
                      <Save size={14} />
                      {t('common.save')}
                    </Button>
                  </div>
                </div>
                <div className="flex-1 rounded-lg border border-surface-3 dark:border-dark-3 bg-surface-1 dark:bg-dark-1 p-4 overflow-auto">
                  <pre className="whitespace-pre-wrap text-base text-gray-800 dark:text-gray-200 font-sans leading-relaxed">
                    {cleanedPrompt}
                  </pre>
                </div>
              </div>

              {/* Explanation */}
              {explanation && (
                <div>
                  <label className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    {t('optimize.explanationLabel')}
                  </label>
                  <div className="rounded-lg border border-surface-3 dark:border-dark-3 bg-surface-1 dark:bg-dark-1 p-4 text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                    {explanation}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div>
                  <label className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    {t('optimize.suggestionsLabel')}
                  </label>
                  <ul className="space-y-1.5">
                    {suggestions.map((s, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-base text-gray-600 dark:text-gray-400"
                      >
                        <span className="text-brand-500 mt-0.5">•</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : isLocalOptimizing ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4" style={{ animation: 'fadeIn 0.2s ease-out' }}>
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-surface-3 dark:border-dark-3" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-500 animate-spin" />
                <Sparkles size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-500 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-base font-medium text-gray-700 dark:text-gray-300">{t('optimize.optimizing')}</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('optimize.aiThinking')}</p>
              </div>
              <div className="w-full max-w-xs h-2 bg-surface-2 dark:bg-dark-3 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full"
                  style={{ animation: 'loadingBar 1.5s ease-in-out infinite' }}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Sparkles size={48} className="mx-auto mb-4 opacity-30" />
                <p className="text-base">{t('optimize.inputPlaceholder')}</p>
                <p className="text-xs mt-2 text-gray-300 dark:text-gray-600">
                  {typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'}+Enter {t('optimize.optimizeButton').toLowerCase()}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Session history */}
      {sessionHistory.length > 0 && (
        <div className="border-t border-surface-2 dark:border-dark-3 bg-surface-1 dark:bg-dark-1 shrink-0">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full px-4 sm:px-6 py-2.5 flex items-center justify-between text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-surface-2 dark:hover:bg-dark-2 transition-colors"
          >
            <span className="flex items-center gap-2">
              <History size={14} />
              {t('optimize.history')} ({sessionHistory.length})
            </span>
            <ChevronDown
              size={16}
              className={cn('transition-transform', showHistory && 'rotate-180')}
            />
          </button>
          {showHistory && (
            <div className="px-4 sm:px-6 pb-3 flex gap-3 overflow-x-auto max-h-40 items-start" style={{ animation: 'slideUp 0.3s ease-out' }}>
              {sessionHistory.map((h, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInputPrompt(h.input);
                    setOptimizedPrompt({
                      optimized: h.output,
                      explanation: h.explanation,
                      suggestions: h.suggestions,
                    });
                  }}
                  className="shrink-0 w-64 text-left p-3 rounded-lg border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-0 hover:border-brand-400 dark:hover:border-brand-600 hover:shadow-elevated transition-all"
                >
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{h.input}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 line-clamp-1">{h.output}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
