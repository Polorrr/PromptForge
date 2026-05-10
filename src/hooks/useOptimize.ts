import { useCallback } from 'react';
import { useOptimizeStore } from '@/stores/useOptimizeStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { OpenAIService } from '@/services/llm/openai';
import { ClaudeService } from '@/services/llm/claude';
import { customService } from '@/services/llm/custom';
import type { LLMProvider } from '@/types/settings';

const openaiService = new OpenAIService();
const claudeService = new ClaudeService();

export function useOptimize() {
  const store = useOptimizeStore();
  const settings = useSettingsStore();

  const optimize = useCallback(
    async (overrides?: { provider?: LLMProvider; model?: string }) => {
      const provider = overrides?.provider || store.selectedProvider;
      const model = overrides?.model || store.selectedModel;

      if (!store.inputPrompt.trim()) return;

      const apiKey = settings.apiKeys[provider];
      if (!apiKey) {
        store.setError(`No API key configured for ${provider}. Go to Settings.`);
        return;
      }

      store.setOptimizing(true);
      store.setError(null);

      // Force React to flush the loading state to the DOM before the API call
      await new Promise((r) => setTimeout(r, 0));

      try {
        const request = {
          prompt: store.inputPrompt,
          context: store.context,
          language: settings.optimizeLanguage,
          style: store.selectedStyle,
          provider,
          model,
        };

        let result;
        if (provider === 'custom') {
          result = await customService.optimize(
            request,
            apiKey,
            settings.customBaseUrl || 'https://api.xxdlzs.top'
          );
        } else if (provider === 'claude') {
          result = await claudeService.optimize(request, apiKey);
        } else {
          result = await openaiService.optimize(request, apiKey);
        }

        store.setResult({
          optimized: result.optimizedPrompt,
          explanation: result.explanation,
          suggestions: result.suggestions,
        });

        store.addToHistory({
          input: store.inputPrompt,
          output: result.optimizedPrompt,
          provider,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Optimization failed';
        store.setError(message);
      }
    },
    [store, settings]
  );

  return {
    ...store,
    optimize,
    hasApiKey: !!settings.apiKeys[store.selectedProvider],
  };
}
