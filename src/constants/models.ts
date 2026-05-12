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
  { id: 'meta/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'custom' },
  { id: 'meta/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick 17B', provider: 'custom' },
  { id: 'nvidia/llama-3.1-nemotron-70b-instruct', name: 'Nemotron 70B', provider: 'custom' },
  { id: 'nvidia/llama-3.3-nemotron-super-49b-v1.5', name: 'Nemotron Super 49B', provider: 'custom' },
  { id: 'deepseek-ai/deepseek-v4-flash', name: 'DeepSeek V4 Flash', provider: 'custom' },
  { id: 'deepseek-ai/deepseek-v4-pro', name: 'DeepSeek V4 Pro', provider: 'custom' },
  { id: 'mistralai/mistral-large', name: 'Mistral Large', provider: 'custom' },
  { id: 'mistralai/mistral-large-2-instruct', name: 'Mistral Large 2', provider: 'custom' },
  { id: 'qwen/qwen3.5-397b-a17b', name: 'Qwen 3.5 397B', provider: 'custom' },
  { id: 'qwen/qwen3.5-122b-a10b', name: 'Qwen 3.5 122B', provider: 'custom' },
  { id: 'google/gemma-3-12b-it', name: 'Gemma 3 12B', provider: 'custom' },
  { id: 'google/gemma-4-31b-it', name: 'Gemma 4 31B', provider: 'custom' },
];

export const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';

export const DEFAULT_MODEL = 'gpt-4o';

export function isNvidiaApiKey(apiKey: string): boolean {
  return apiKey.startsWith('nvapi-');
}
