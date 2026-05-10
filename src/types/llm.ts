import type { LLMProvider } from './settings';

export interface OptimizeRequest {
  prompt: string;
  context?: string;
  language: 'en' | 'zh' | 'same';
  provider: LLMProvider;
  model: string;
}

export interface OptimizeResponse {
  optimizedPrompt: string;
  explanation: string;
  suggestions: string[];
  provider: LLMProvider;
  model: string;
  tokensUsed: {
    input: number;
    output: number;
  };
}

export interface StreamChunk {
  type: 'text' | 'explanation' | 'suggestions' | 'done' | 'error';
  content: string;
}
