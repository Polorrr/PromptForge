import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ApiKeys, LLMProvider, ModelPreference } from '@/types/settings';

export interface ApiConfig {
  id: string;
  name: string;
  provider: LLMProvider;
  apiKey: string;
  baseUrl?: string;
  createdAt: string;
}

interface SettingsState {
  apiKeys: ApiKeys;
  customBaseUrl: string;
  defaultProvider: LLMProvider;
  modelPreference: ModelPreference;
  optimizeLanguage: 'en' | 'zh' | 'same';
  apiLibrary: ApiConfig[];
  showScorePopup: boolean;
  setApiKey: (provider: keyof ApiKeys, key: string) => void;
  removeApiKey: (provider: keyof ApiKeys) => void;
  setCustomBaseUrl: (url: string) => void;
  setDefaultProvider: (provider: LLMProvider) => void;
  setModelPreference: (pref: Partial<ModelPreference>) => void;
  setOptimizeLanguage: (lang: 'en' | 'zh' | 'same') => void;
  setShowScorePopup: (show: boolean) => void;
  hasApiKey: (provider: LLMProvider) => boolean;
  saveApiConfig: (config: Omit<ApiConfig, 'id' | 'createdAt'>) => void;
  deleteApiConfig: (id: string) => void;
  loadApiConfig: (id: string) => void;
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
      apiLibrary: [],
      showScorePopup: true,

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
      setShowScorePopup: (showScorePopup) => set({ showScorePopup }),
      setCustomBaseUrl: (customBaseUrl) => set({ customBaseUrl }),
      hasApiKey: (provider) => !!get().apiKeys[provider],

      saveApiConfig: (config) => {
        const newConfig: ApiConfig = {
          ...config,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ apiLibrary: [...s.apiLibrary, newConfig] }));
      },

      deleteApiConfig: (id) =>
        set((s) => ({
          apiLibrary: s.apiLibrary.filter((c) => c.id !== id),
        })),

      loadApiConfig: (id) => {
        const config = get().apiLibrary.find((c) => c.id === id);
        if (config) {
          set({
            apiKeys: { ...get().apiKeys, [config.provider]: config.apiKey },
            customBaseUrl: config.baseUrl || get().customBaseUrl,
          });
        }
      },
    }),
    { name: 'promptforge-settings' }
  )
);
