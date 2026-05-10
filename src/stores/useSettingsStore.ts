import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ApiKeys, LLMProvider, ModelPreference } from '@/types/settings';

interface SettingsState {
  apiKeys: ApiKeys;
  customBaseUrl: string;
  defaultProvider: LLMProvider;
  modelPreference: ModelPreference;
  optimizeLanguage: 'en' | 'zh' | 'same';
  setApiKey: (provider: keyof ApiKeys, key: string) => void;
  removeApiKey: (provider: keyof ApiKeys) => void;
  setCustomBaseUrl: (url: string) => void;
  setDefaultProvider: (provider: LLMProvider) => void;
  setModelPreference: (pref: Partial<ModelPreference>) => void;
  setOptimizeLanguage: (lang: 'en' | 'zh' | 'same') => void;
  hasApiKey: (provider: LLMProvider) => boolean;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      apiKeys: {},
      customBaseUrl: 'https://api.xxdlzs.top',
      defaultProvider: 'openai',
      modelPreference: {
        provider: 'openai',
        model: 'gpt-4o',
        maxTokens: 2048,
        temperature: 0.7,
      },
      optimizeLanguage: 'same',

      setApiKey: (provider, key) =>
        set((s) => ({ apiKeys: { ...s.apiKeys, [provider]: key } })),
      removeApiKey: (provider) =>
        set((s) => {
          const keys = { ...s.apiKeys };
          delete keys[provider];
          return { apiKeys: keys };
        }),
      setDefaultProvider: (defaultProvider) => set({ defaultProvider }),
      setModelPreference: (pref) =>
        set((s) => ({ modelPreference: { ...s.modelPreference, ...pref } })),
      setOptimizeLanguage: (optimizeLanguage) => set({ optimizeLanguage }),
      setCustomBaseUrl: (customBaseUrl) => set({ customBaseUrl }),
      hasApiKey: (provider) => !!get().apiKeys[provider],
    }),
    { name: 'promptforge-settings' }
  )
);
