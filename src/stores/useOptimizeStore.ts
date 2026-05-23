import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LLMProvider } from '@/types/settings';
import type { OptimizeStyle } from '@/types/llm';

interface InquiryQuestion {
  question: string;
  options: string[];
}

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
  selectedStyle: OptimizeStyle;
  contextMode: 'context' | 'inquiry';
  showInquiry: boolean;
  inquiryQuestions: InquiryQuestion[];
  inquiryAnswers: Record<number, string>;
  inquiryIndex: number;
  inquiryLoading: boolean;
  analysisMissing: string[];
  inquiryCount: number;
  sessionHistory: Array<{
    input: string;
    output: string;
    explanation: string;
    suggestions: string[];
    provider: LLMProvider;
    timestamp: string;
  }>;
  setInputPrompt: (prompt: string) => void;
  setContext: (context: string) => void;
  setSelectedProvider: (provider: LLMProvider) => void;
  setSelectedModel: (model: string) => void;
  setSelectedStyle: (style: OptimizeStyle) => void;
  setOptimizing: (val: boolean) => void;
  setStreaming: (val: boolean) => void;
  setResult: (result: { optimized: string; explanation: string; suggestions: string[] }) => void;
  setError: (error: string | null) => void;
  setContextMode: (mode: 'context' | 'inquiry') => void;
  setShowInquiry: (show: boolean) => void;
  setInquiryQuestions: (questions: InquiryQuestion[]) => void;
  setInquiryAnswers: (answers: Record<number, string>) => void;
  setInquiryIndex: (index: number) => void;
  setInquiryLoading: (loading: boolean) => void;
  setAnalysisMissing: (missing: string[]) => void;
  resetInquiry: () => void;
  addToHistory: (entry: { input: string; output: string; explanation: string; suggestions: string[]; provider: LLMProvider; timestamp: string }) => void;
  clearResult: () => void;
  reset: () => void;
}

export const useOptimizeStore = create<OptimizeState>()(
  persist(
    (set) => ({
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
      selectedStyle: 'default',
      contextMode: 'context',
      showInquiry: false,
      inquiryQuestions: [],
      inquiryAnswers: {},
      inquiryIndex: 0,
      inquiryLoading: false,
      analysisMissing: [],
      inquiryCount: 0,
      sessionHistory: [],

      setInputPrompt: (inputPrompt) => set({ inputPrompt }),
      setContext: (context) => set({ context }),
      setSelectedProvider: (selectedProvider) => set({ selectedProvider }),
      setSelectedModel: (selectedModel) => set({ selectedModel }),
      setSelectedStyle: (selectedStyle) => set({ selectedStyle }),
      setOptimizing: (isOptimizing) => set({ isOptimizing }),
      setStreaming: (isStreaming) => set({ isStreaming }),
      setContextMode: (contextMode) => set({ contextMode }),
      setShowInquiry: (showInquiry) => set({ showInquiry }),
      setInquiryQuestions: (inquiryQuestions) => set({ inquiryQuestions }),
      setInquiryAnswers: (inquiryAnswers) => set({ inquiryAnswers }),
      setInquiryIndex: (inquiryIndex) => set({ inquiryIndex }),
      setInquiryLoading: (inquiryLoading) => set({ inquiryLoading }),
      setAnalysisMissing: (analysisMissing) => set({ analysisMissing }),
      resetInquiry: () => set({
        showInquiry: false,
        inquiryQuestions: [],
        inquiryAnswers: {},
        inquiryIndex: 0,
        inquiryLoading: false,
        analysisMissing: [],
      }),
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
        set({ optimizedPrompt: '', explanation: '', suggestions: [], error: null, isOptimizing: false, isStreaming: false }),
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
    }),
    {
      name: 'promptforge-optimize-settings',
      partialize: (state) => ({
        selectedProvider: state.selectedProvider,
        selectedModel: state.selectedModel,
        selectedStyle: state.selectedStyle,
        contextMode: state.contextMode,
      }),
    }
  )
);
