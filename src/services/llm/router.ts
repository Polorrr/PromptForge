import { OpenAIService } from './openai';
import { ClaudeService } from './claude';
import { CustomService } from './custom';
import type { LLMProvider } from '@/types/settings';

const openaiService = new OpenAIService();
const claudeService = new ClaudeService();
const customService = new CustomService();

export function getLLMService(provider: LLMProvider) {
  switch (provider) {
    case 'openai':
      return openaiService;
    case 'claude':
      return claudeService;
    case 'custom':
      return customService;
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
