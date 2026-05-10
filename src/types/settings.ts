export type LLMProvider = 'openai' | 'claude' | 'custom';

export interface ApiKeys {
  openai?: string;
  claude?: string;
  custom?: string;
  github?: string;
}

export interface ModelPreference {
  provider: LLMProvider;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface AppSettings {
  apiKeys: ApiKeys;
  customBaseUrl: string;
  defaultProvider: LLMProvider;
  modelPreference: ModelPreference;
  language: 'en' | 'zh';
  theme: 'light' | 'dark' | 'system';
  optimizeLanguage: 'en' | 'zh' | 'same';
}
