import { create } from 'zustand';
import type { LLMProvider } from '@/types/settings';

interface OptimizeState {
  inputPrompt: string;
  context: string;
  optimizedPrompt: string;
  explanation: string;
  suggestions: string[];
  isOptimizing: boolean;
  isStreaming: boolean;
  error: string | null;
  selectedProvider: LLMProvider;
  selectedModel: string;
  sessionHistory: Array<{
    input: string;
    output: string;
    provider: LLMProvider;
    timestamp: string;
  }>;
  setInputPrompt: (prompt: string) => void;
  setContext: (context: string) => void;
  setSelectedProvider: (provider: LLMProvider) => void;
  setSelectedModel: (model: string) => void;
  setOptimizing: (val: boolean) => void;
  setStreaming: (val: boolean) => void;
  setResult: (result: { optimized: string; explanation: string; suggestions: string[] }) => void;
  setError: (error: string | null) => void;
  addToHistory: (entry: { input: string; output: string; provider: LLMProvider; timestamp: string }) => void;
  clearResult: () => void;
  reset: () => void;
}

export const useOptimizeStore = create<OptimizeState>((set) => ({
  inputPrompt: '',
  context: '',
  optimizedPrompt: '',
  explanation: '',
  suggestions: [],
  isOptimizing: false,
  isStreaming: false,
  error: null,
  selectedProvider: 'openai',
  selectedModel: 'gpt-4o',
  sessionHistory: [],

  setInputPrompt: (inputPrompt) => set({ inputPrompt }),
  setContext: (context) => set({ context }),
  setSelectedProvider: (selectedProvider) => set({ selectedProvider }),
  setSelectedModel: (selectedModel) => set({ selectedModel }),
  setOptimizing: (isOptimizing) => set({ isOptimizing }),
  setStreaming: (isStreaming) => set({ isStreaming }),
  setResult: ({ optimized, explanation, suggestions }) =>
    set({
      optimizedPrompt: optimized,
      explanation,
      suggestions,
      isOptimizing: false,
      isStreaming: false,
      error: null,
    }),
  setError: (error) => set({ error, isOptimizing: false, isStreaming: false }),
  addToHistory: (entry) =>
    set((s) => ({ sessionHistory: [entry, ...s.sessionHistory] })),
  clearResult: () =>
    set({ optimizedPrompt: '', explanation: '', suggestions: [], error: null }),
  reset: () =>
    set({
      inputPrompt: '',
      context: '',
      optimizedPrompt: '',
      explanation: '',
      suggestions: [],
      isOptimizing: false,
      isStreaming: false,
      error: null,
    }),
}));
