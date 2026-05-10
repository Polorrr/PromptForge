import type { LLMProvider } from '@/types/settings';

export interface ModelOption {
  id: string;
  name: string;
  provider: LLMProvider;
}

export const MODELS: ModelOption[] = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai' },
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet', provider: 'claude' },
  { id: 'claude-haiku-4-20250414', name: 'Claude Haiku', provider: 'claude' },
];

export const DEFAULT_MODEL = 'gpt-4o';
