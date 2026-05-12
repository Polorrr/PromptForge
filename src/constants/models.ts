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

export const NVIDIA_MODELS: ModelOption[] = [
  { id: 'meta/llama-3.1-405b-instruct', name: 'Llama 3.1 405B', provider: 'custom' },
  { id: 'meta/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'custom' },
  { id: 'meta/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', provider: 'custom' },
  { id: 'meta/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'custom' },
  { id: 'mistralai/mixtral-8x22b-instruct-v0.1', name: 'Mixtral 8x22B', provider: 'custom' },
  { id: 'mistralai/mixtral-8x7b-instruct-v0.1', name: 'Mixtral 8x7B', provider: 'custom' },
  { id: 'mistralai/mistral-large-latest', name: 'Mistral Large', provider: 'custom' },
  { id: 'google/gemma-2-27b-it', name: 'Gemma 2 27B', provider: 'custom' },
  { id: 'nvidia/nemotron-4-340b-instruct', name: 'Nemotron 4 340B', provider: 'custom' },
  { id: 'deepseek-ai/deepseek-r1', name: 'DeepSeek R1', provider: 'custom' },
  { id: 'deepseek-ai/deepseek-v3', name: 'DeepSeek V3', provider: 'custom' },
  { id: 'qwen/qwen2.5-72b-instruct', name: 'Qwen 2.5 72B', provider: 'custom' },
];

export const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';

export const DEFAULT_MODEL = 'gpt-4o';

export function isNvidiaApiKey(apiKey: string): boolean {
  return apiKey.startsWith('nvapi-');
}
