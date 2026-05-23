import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, Copy, Save, RotateCcw, ChevronDown, ChevronLeft, ChevronRight, RefreshCw, History, X } from 'lucide-react';
import { useOptimize } from '@/hooks/useOptimize';
import { useRelayModels } from '@/hooks/useRelayModels';
import { useOptimizeStore } from '@/stores/useOptimizeStore';
import { usePromptStore } from '@/stores/usePromptStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useAppStore } from '@/stores/useAppStore';
import { Button } from '@/components/ui';
import { Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { copyToClipboard } from '@/utils/copy';
import { MODELS, NVIDIA_MODELS, isNvidiaApiKey } from '@/constants/models';
import { cn } from '@/utils/cn';
import { extractJSON } from '@/utils/extract-json';
import { validateOptimizationBasic, aiDetectSimilarity } from '@/utils/validate-output';
import { scoreRepository } from '@/services/storage/score-repository';
import { detectCategory, getCategoryIcon } from '@/utils/auto-categorize';
import { DEFAULT_CATEGORIES } from '@/constants/categories';
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
  const saveVersion = usePromptStore((s) => s.saveVersion);
  const [fromDetailId, setFromDetailId] = useState<string | null>(null);
  const settings = useSettingsStore();
  const uiLanguage = useAppStore((s) => s.language);
  const setOptimizedPrompt = useOptimizeStore((s) => s.setResult);
  const [showHistory, setShowHistory] = useState(false);
  const { models: relayModels, loading: relayLoading, reload: reloadRelayModels } = useRelayModels();
  const [manualModel, setManualModel] = useState('');
  const [useManualModel, setUseManualModel] = useState(false);
  const [styleStats, setStyleStats] = useState<Record<string, { count: number; avgOverall: number } | null>>({});

  useEffect(() => {
    scoreRepository.getStyleStats().then(setStyleStats);
  }, []);

  const recommendedStyle = useMemo(() => {
    let best: OptimizeStyle | null = null;
    let bestScore = 0;
    for (const [style, stats] of Object.entries(styleStats)) {
      if (stats && stats.count >= 2 && stats.avgOverall > bestScore) {
        bestScore = stats.avgOverall;
        best = style as OptimizeStyle;
      }
    }
    return best;
  }, [styleStats]);

  const contextMode = useOptimizeStore((s) => s.contextMode);
  const setContextMode = useOptimizeStore((s) => s.setContextMode);
  const showInquiry = useOptimizeStore((s) => s.showInquiry);
  const setShowInquiry = useOptimizeStore((s) => s.setShowInquiry);
  const inquiryQuestions = useOptimizeStore((s) => s.inquiryQuestions);
  const setInquiryQuestions = useOptimizeStore((s) => s.setInquiryQuestions);
  const inquiryAnswers = useOptimizeStore((s) => s.inquiryAnswers);
  const setInquiryAnswers = useOptimizeStore((s) => s.setInquiryAnswers);
  const inquiryIndex = useOptimizeStore((s) => s.inquiryIndex);
  const setInquiryIndex = useOptimizeStore((s) => s.setInquiryIndex);
  const inquiryLoading = useOptimizeStore((s) => s.inquiryLoading);
  const setInquiryLoading = useOptimizeStore((s) => s.setInquiryLoading);
  const inquiryCount = useOptimizeStore((s) => s.inquiryCount);
  const setAnalysisMissing = useOptimizeStore((s) => s.setAnalysisMissing);
  const resetInquiry = useOptimizeStore((s) => s.resetInquiry);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveCategory, setSaveCategory] = useState('other');

  const cleanedPrompt = useMemo(() => {
    if (!optimizedPrompt) return '';
    return cleanMarkdown(optimizedPrompt);
  }, [optimizedPrompt]);

  useEffect(() => {
    const prefill = location.state?.prefill as string | undefined;
    const prefillResult = location.state?.prefillResult as string | undefined;
    const prefillExplanation = location.state?.prefillExplanation as string | undefined;
    const prefillSuggestions = location.state?.prefillSuggestions as string[] | undefined;
    const fromDetail = location.state?.fromDetail as string | undefined;
    if (prefill) {
      setInputPrompt(prefill);
      if (fromDetail) setFromDetailId(fromDetail);
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

  // Close inquiry mode and clear errors when any language changes
  useEffect(() => {
    setContextMode('context');
    resetInquiry();
    clearResult();
  }, [settings.optimizeLanguage, uiLanguage]);

  const doOptimize = async (promptText: string, contextText: string) => {
    // Fetch top-scoring personal examples for dynamic few-shot
    let dynamicExamples: string | undefined;
    const topExamples = await scoreRepository.getTopExamples(3);
    if (topExamples.length >= 2) {
      dynamicExamples = topExamples
        .map((ex, i) => {
          const shortOriginal = ex.original.length > 100 ? ex.original.slice(0, 100) + '...' : ex.original;
          const shortOptimized = ex.optimized.length > 200 ? ex.optimized.slice(0, 200) + '...' : ex.optimized;
          return `// Example ${i + 1} — Your high-scoring result (${ex.overall}/5)\n// Input: "${shortOriginal}"\n// Optimized: "${shortOptimized}"`;
        })
        .join('\n\n');
    }

    const request = {
      prompt: promptText,
      context: contextText,
      language: settings.optimizeLanguage,
      style: selectedStyle,
      provider: selectedProvider,
      model: selectedModel,
      dynamicExamples,
    };

    const callAPI = async () => {
      if (selectedProvider === 'custom') {
        const { customService } = await import('@/services/llm/custom');
        return customService.optimize(request, settings.apiKeys.custom || '', settings.customBaseUrl || 'https://api.xxdlzs.top');
      } else if (selectedProvider === 'claude') {
        const { ClaudeService } = await import('@/services/llm/claude');
        const svc = new ClaudeService();
        return svc.optimize(request, settings.apiKeys.claude || '');
      } else {
        const { OpenAIService } = await import('@/services/llm/openai');
        const svc = new OpenAIService();
        return svc.optimize(request, settings.apiKeys.openai || '');
      }
    };

    let result = await callAPI();
    const basicCheck = validateOptimizationBasic(promptText, result.optimizedPrompt, result.explanation, selectedStyle);

    if (!basicCheck.valid) {
      result = await callAPI();
      const retryBasic = validateOptimizationBasic(promptText, result.optimizedPrompt, result.explanation, selectedStyle);
      if (!retryBasic.valid) {
        throw new Error(retryBasic.warnings[0] || '优化结果质量不佳，请重试');
      }
    }

    // AI semantic check — detect if optimization is just reformatting
    const detectApiKey = selectedProvider === 'custom'
      ? (settings.apiKeys.custom || '')
      : selectedProvider === 'claude'
        ? (settings.apiKeys.claude || '')
        : (settings.apiKeys.openai || '');
    const detectBaseUrl = selectedProvider === 'custom' ? settings.customBaseUrl : undefined;
    const aiCheck = await aiDetectSimilarity(promptText, result.optimizedPrompt, detectApiKey, selectedModel, detectBaseUrl);

    if (!aiCheck.improved) {
      result = await callAPI();
      const retryAi = await aiDetectSimilarity(promptText, result.optimizedPrompt, detectApiKey, selectedModel, detectBaseUrl);
      if (!retryAi.improved) {
        throw new Error(retryAi.reason || '优化结果与原文实质相同，请重试');
      }
    }

    useOptimizeStore.getState().setResult({
      optimized: result.optimizedPrompt,
      explanation: result.explanation,
      suggestions: result.suggestions,
    });
    useOptimizeStore.getState().addToHistory({
      input: promptText,
      output: result.optimizedPrompt,
      explanation: result.explanation,
      suggestions: result.suggestions,
      provider: selectedProvider,
      timestamp: new Date().toISOString(),
    });
  };

  const handleOptimize = async () => {
    if (!inputPrompt.trim()) return;

    // Inquiry mode: analyze gaps first, then ask only missing questions
    const currentShowInquiry = useOptimizeStore.getState().showInquiry;
    if (contextMode === 'inquiry' && !currentShowInquiry) {
      setInquiryLoading(true);
      try {
        const { ANALYSIS_PROMPT, INQUIRY_PROMPT } = await import('@/services/llm/meta-prompt');

        // Step 1: Analyze what's missing
        let analysisContent = '';
        if (selectedProvider === 'custom') {
          const baseUrl = settings.customBaseUrl || 'https://api.xxdlzs.top';
          const apiKey = settings.apiKeys.custom || '';
          let v1Base = baseUrl.trim().replace(/\/+$/, '');
          if (!v1Base.endsWith('/v1')) v1Base += '/v1';
          const url = v1Base + '/chat/completions';
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
              model: selectedModel,
              messages: [
                { role: 'system', content: ANALYSIS_PROMPT },
                { role: 'user', content: inputPrompt },
              ],
              temperature: 0.3,
              max_tokens: 4096,
            }),
          });
          if (!res.ok) throw new Error(`API error ${res.status}`);
          const data = await res.json();
          analysisContent = data.choices?.[0]?.message?.content || '';
        } else if (selectedProvider === 'claude') {
          const res = await fetch('/api/claude', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apiKey: settings.apiKeys.claude,
              model: selectedModel,
              system: ANALYSIS_PROMPT,
              prompt: inputPrompt,
              maxTokens: 512,
            }),
          });
          if (!res.ok) throw new Error('Analysis API failed');
          const data = await res.json();
          analysisContent = data.content?.[0]?.text || '';
        } else {
          const { default: OpenAI } = await import('openai');
          const client = new OpenAI({ apiKey: settings.apiKeys.openai, dangerouslyAllowBrowser: true });
          const res = await client.chat.completions.create({
            model: selectedModel,
            messages: [
              { role: 'system', content: ANALYSIS_PROMPT },
              { role: 'user', content: inputPrompt },
            ],
            temperature: 0.3,
            max_tokens: 4096,
          });
          analysisContent = res.choices[0]?.message?.content || '';
        }

        const analysisParsed = extractJSON(analysisContent);
        const missing: string[] = analysisParsed && Array.isArray(analysisParsed.missing)
          ? analysisParsed.missing
          : [];

        setAnalysisMissing(missing);

        // Step 2: Generate targeted questions for missing elements (always ask at least 2)
        const inquiryPrompt = INQUIRY_PROMPT(settings.optimizeLanguage, inquiryCount);
        let inquiryContent = '';
        if (selectedProvider === 'custom') {
          const baseUrl = settings.customBaseUrl || 'https://api.xxdlzs.top';
          const apiKey = settings.apiKeys.custom || '';
          let v1Base = baseUrl.trim().replace(/\/+$/, '');
          if (!v1Base.endsWith('/v1')) v1Base += '/v1';
          const url = v1Base + '/chat/completions';
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
              model: selectedModel,
              messages: [
                { role: 'system', content: inquiryPrompt },
                { role: 'user', content: inputPrompt },
              ],
              temperature: 0.7,
              max_tokens: 4096,
            }),
          });
          if (!res.ok) throw new Error(`API error ${res.status}`);
          const data = await res.json();
          inquiryContent = data.choices?.[0]?.message?.content || '';
        } else if (selectedProvider === 'claude') {
          const res = await fetch('/api/claude', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apiKey: settings.apiKeys.claude,
              model: selectedModel,
              system: inquiryPrompt,
              prompt: inputPrompt,
              maxTokens: 512,
            }),
          });
          if (!res.ok) throw new Error('Inquiry API failed');
          const data = await res.json();
          inquiryContent = data.content?.[0]?.text || '';
        } else {
          const { default: OpenAI } = await import('openai');
          const client = new OpenAI({ apiKey: settings.apiKeys.openai, dangerouslyAllowBrowser: true });
          const res = await client.chat.completions.create({
            model: selectedModel,
            messages: [
              { role: 'system', content: inquiryPrompt },
              { role: 'user', content: inputPrompt },
            ],
            temperature: 0.7,
            max_tokens: 4096,
          });
          inquiryContent = res.choices[0]?.message?.content || '';
        }

        const inquiryParsed = extractJSON(inquiryContent);
        if (inquiryParsed && Array.isArray(inquiryParsed.questions) && inquiryParsed.questions.length > 0) {
          setInquiryQuestions(inquiryParsed.questions);
          setInquiryAnswers({});
          setInquiryIndex(0);
          setShowInquiry(true);
        } else {
          throw new Error('Optimization failed, please check your model');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Inquiry failed';
        useOptimizeStore.getState().setError(message);
        resetInquiry();
      } finally {
        setInquiryLoading(false);
      }
      return;
    }

    // Inquiry mode: use answers as context
    if (useOptimizeStore.getState().showInquiry) {
      const answerText = inquiryQuestions
        .map((q, i) => `${q.question}: ${inquiryAnswers[i] || ''}`)
        .filter((a) => a.endsWith(': ') === false)
        .join('\n');
      const fullContext = [context, answerText].filter(Boolean).join('\n');
      setIsLocalOptimizing(true);
      try {
        await doOptimize(inputPrompt, fullContext);
        resetInquiry();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Optimization failed';
        useOptimizeStore.getState().setError(message);
        resetInquiry();
      } finally {
        setIsLocalOptimizing(false);
      }
      return;
    }

    // Normal mode
    setIsLocalOptimizing(true);
    try {
      await doOptimize(inputPrompt, context);
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
    if (fromDetailId) {
      await saveVersion(fromDetailId, optimizedPrompt, explanation, suggestions, selectedProvider, selectedModel);
      toast('success', t('optimize.saveToLibrary') + ' ✓');
      return;
    }
    setSaveCategory(detectCategory(inputPrompt));
    setShowSaveModal(true);
  };

  const handleConfirmSave = async () => {
    if (!optimizedPrompt) return;
    const result = await createPrompt({
      title: inputPrompt.slice(0, 50) + (inputPrompt.length > 50 ? '...' : ''),
      originalText: inputPrompt,
      optimizedText: optimizedPrompt,
      explanation,
      suggestions,
      category: saveCategory,
      tags: [],
      provider: selectedProvider,
      model: selectedModel,
      isFavorite: false,
    });
    if (result.isDuplicate) {
      toast('warning', t('optimize.alreadySaved'));
    } else {
      toast('success', t('optimize.saveToLibrary') + ' ✓');
    }
    setShowSaveModal(false);
  };

  const filteredModels = useMemo(() => {
    if (selectedProvider === 'custom') {
      const customKey = settings.apiKeys.custom || '';
      if (isNvidiaApiKey(customKey)) {
        return NVIDIA_MODELS;
      }
      return [];
    }
    return MODELS.filter((m) => m.provider === selectedProvider);
  }, [selectedProvider, settings.apiKeys.custom]);

  const effectiveModel = useManualModel ? manualModel : selectedModel;

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
              clearResult();
              setUseManualModel(false);
              setManualModel('');
              if (p !== 'custom') {
                const firstModel = MODELS.find((m) => m.provider === p);
                if (firstModel) setSelectedModel(firstModel.id);
              } else if (isNvidiaApiKey(settings.apiKeys.custom || '')) {
                if (NVIDIA_MODELS[0]) setSelectedModel(NVIDIA_MODELS[0].id);
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
              {isNvidiaApiKey(settings.apiKeys.custom || '') ? (
                <select
                  value={selectedModel}
                  onChange={(e) => { setSelectedModel(e.target.value); clearResult(); }}
                  className="h-8 px-3 rounded-lg border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-1 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 max-w-[250px]"
                >
                  {NVIDIA_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              ) : !useManualModel ? (
                <select
                  value={relayModels.some((m) => m.id === selectedModel) ? selectedModel : '__manual__'}
                  onChange={(e) => {
                    if (e.target.value === '__manual__') {
                      setUseManualModel(true);
                      setManualModel('');
                    } else {
                      setSelectedModel(e.target.value);
                      clearResult();
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
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={manualModel}
                    onChange={(e) => {
                      setManualModel(e.target.value);
                      setSelectedModel(e.target.value);
                      clearResult();
                    }}
                    placeholder={relayLoading ? t('common.loading') : t('optimize.modelPlaceholder')}
                    className="h-8 w-44 px-3 rounded-lg border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-1 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button
                    onClick={() => {
                      setUseManualModel(false);
                      if (relayModels.length > 0 && relayModels[0]) {
                        setSelectedModel(relayModels[0].id);
                      }
                    }}
                    className="p-1.5 rounded-lg hover:bg-surface-2 dark:hover:bg-dark-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title={t('common.cancel')}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              {!isNvidiaApiKey(settings.apiKeys.custom || '') && (
                <button
                  onClick={reloadRelayModels}
                  disabled={relayLoading}
                  className="p-1.5 rounded-lg hover:bg-surface-2 dark:hover:bg-dark-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title={t('optimize.refreshModels')}
                >
                  <RefreshCw size={14} className={relayLoading ? 'animate-spin' : ''} />
                </button>
              )}
            </div>
          ) : (
            <select
              value={selectedModel}
              onChange={(e) => { setSelectedModel(e.target.value); clearResult(); }}
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
          <div className="relative">
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
          </div>
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
          <div className="flex-1 flex flex-col gap-3 min-h-0">
            {/* Rough prompt */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('optimize.inputLabel')}
              </label>
              <Textarea
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder={t('optimize.inputPlaceholder')}
                className="min-h-[240px] max-h-[400px]"
              />
              <div className="mt-1 text-xs text-gray-400 text-right">
                {t('optimize.charCount', { count: inputPrompt.length })}
              </div>
            </div>

            {/* Context input */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('optimize.contextLabel')}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {t('optimize.inquiryMode')}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setContextMode(contextMode === 'inquiry' ? 'context' : 'inquiry');
                      resetInquiry();
                    }}
                    className={cn(
                      'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
                      contextMode === 'inquiry' ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-600'
                    )}
                    role="switch"
                    aria-checked={contextMode === 'inquiry'}
                  >
                    <span
                      className={cn(
                        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
                        contextMode === 'inquiry' ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>
              </div>

              {contextMode === 'context' ? (
                <input
                  type="text"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder={t('optimize.contextPlaceholder')}
                  className="w-full h-10 rounded-lg border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-1 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
                />
              ) : showInquiry && inquiryQuestions.length > 0 ? (
                <div className="flex-1 flex flex-col rounded-lg border border-surface-3 dark:border-dark-3 bg-surface-1 dark:bg-dark-1 p-4 min-h-0" style={{ animation: 'fadeIn 0.2s ease-out' }}>
                  {/* Progress */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {inquiryIndex + 1} / {inquiryQuestions.length}
                    </span>
                    <div className="flex gap-1">
                      {inquiryQuestions.map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            'w-1.5 h-1.5 rounded-full transition-colors',
                            i === inquiryIndex
                              ? 'bg-brand-500'
                              : inquiryAnswers[i]
                                ? 'bg-brand-300 dark:bg-brand-700'
                                : 'bg-surface-3 dark:bg-dark-3'
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Question */}
                  {inquiryQuestions[inquiryIndex] && (
                    <>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      {inquiryQuestions[inquiryIndex]!.question}
                    </p>

                    {/* Options */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {inquiryQuestions[inquiryIndex]!.options.map((opt, j) => (
                      <button
                        key={j}
                        onClick={() => setInquiryAnswers({ ...inquiryAnswers, [inquiryIndex]: opt })}
                        className={cn(
                          'px-3 py-1.5 text-sm rounded-full border transition-colors',
                          inquiryAnswers[inquiryIndex] === opt
                            ? 'bg-brand-500 text-white border-brand-500'
                            : 'border-surface-3 dark:border-dark-3 text-gray-600 dark:text-gray-400 hover:border-brand-400 dark:hover:border-brand-600'
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  {/* Custom input */}
                  <input
                    type="text"
                    value={inquiryAnswers[inquiryIndex] || ''}
                    onChange={(e) => setInquiryAnswers({ ...inquiryAnswers, [inquiryIndex]: e.target.value })}
                    placeholder={t('optimize.answerPlaceholder')}
                    className="w-full h-9 px-3 text-sm rounded-lg border border-surface-3 dark:border-dark-3 bg-surface-0 dark:bg-dark-0 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-500 mb-3"
                  />

                  {/* Navigation */}
                  <div className="flex items-center justify-between mt-auto">
                    <button
                      onClick={() => setInquiryIndex(Math.max(0, inquiryIndex - 1))}
                      disabled={inquiryIndex === 0}
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        inquiryIndex === 0
                          ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-surface-2 dark:hover:bg-dark-2'
                      )}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      onClick={() => setInquiryIndex(Math.min(inquiryQuestions.length - 1, inquiryIndex + 1))}
                      disabled={inquiryIndex === inquiryQuestions.length - 1}
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        inquiryIndex === inquiryQuestions.length - 1
                          ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-surface-2 dark:hover:bg-dark-2'
                      )}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {contextMode === 'inquiry'
                    ? t('optimize.contextModeInquiry') + ' — ' + t('optimize.optimizeButton')
                    : t('optimize.contextPlaceholder')}
                </p>
              )}
            </div>

            {selectedProvider === 'custom' && isNvidiaApiKey(settings.apiKeys.custom || '') && (
              <p className="text-xs text-blue-500 dark:text-blue-400">{t('optimize.nvidiaHint')}</p>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3 shrink-0">
              <Button
                onClick={handleOptimize}
                loading={isLocalOptimizing || inquiryLoading}
                disabled={!inputPrompt.trim() || !hasApiKey}
                size="lg"
                className="flex-1"
              >
                <Sparkles size={18} />
                {inquiryLoading
                  ? t('optimize.inquiryLoading')
                  : isLocalOptimizing
                    ? t('optimize.optimizing')
                    : showInquiry
                      ? t('optimize.confirmOptimize')
                      : t('optimize.optimizeButton')}
              </Button>
              {optimizedPrompt && (
                <>
                  {contextMode === 'inquiry' && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        resetInquiry();
                        handleOptimize();
                      }}
                      size="lg"
                      disabled={inquiryLoading || isLocalOptimizing}
                    >
                      <RotateCcw size={16} />
                      {t('optimize.reInquiry', '重新询问')}
                    </Button>
                  )}
                  <Button variant="ghost" onClick={clearResult} size="lg">
                    <RotateCcw size={16} />
                  </Button>
                </>
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
          ) : isLocalOptimizing || inquiryLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4" style={{ animation: 'fadeIn 0.2s ease-out' }}>
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-surface-3 dark:border-dark-3" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-500 animate-spin" />
                <Sparkles size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-500 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-base font-medium text-gray-700 dark:text-gray-300">
                  {inquiryLoading ? t('optimize.inquiryLoading') : t('optimize.optimizing')}
                </p>
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
            className="w-full px-4 sm:px-6 py-2.5 flex items-center justify-between text-sm font-medium text-gray-600 dark:text-gray-400 bg-surface-2 dark:bg-dark-2 hover:bg-surface-3 dark:hover:bg-dark-3 transition-colors"
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
            <div className="px-4 sm:px-6 py-6 flex gap-3 overflow-x-auto max-h-48 items-start" style={{ animation: 'slideUp 0.3s ease-out' }}>
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

      {/* Save modal with category selector */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowSaveModal(false)} />
          <div className="relative w-full max-w-sm bg-surface-0 dark:bg-dark-1 rounded-xl shadow-modal border border-surface-3 dark:border-dark-3 p-6 animate-slide-down">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
              {t('optimize.saveModal.title', '保存到提示词库')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t('optimize.saveModal.desc', '选择一个分类')}
            </p>

            <div className="grid grid-cols-4 gap-2 mb-5">
              {DEFAULT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSaveCategory(cat.id)}
                  className={cn(
                    'flex flex-col items-center gap-1 py-2.5 rounded-lg text-xs font-medium transition-colors',
                    saveCategory === cat.id
                      ? 'bg-brand-500 text-white'
                      : 'bg-surface-2 dark:bg-dark-3 text-gray-600 dark:text-gray-400 hover:bg-surface-3 dark:hover:bg-dark-2'
                  )}
                >
                  <span className="text-lg">{cat.icon}</span>
                  <span>{cat.nameZh}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-surface-2 dark:bg-dark-3 text-gray-600 dark:text-gray-400 hover:bg-surface-3 dark:hover:bg-dark-2 transition-colors"
              >
                {t('common.cancel', '取消')}
              </button>
              <button
                onClick={handleConfirmSave}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors"
              >
                {t('optimize.saveModal.confirm', '保存')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
