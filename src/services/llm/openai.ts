import OpenAI from 'openai';
import type { OptimizeRequest, OptimizeResponse, StreamChunk } from '@/types/llm';
import { META_PROMPT } from './meta-prompt';
import { extractJSON } from '@/utils/extract-json';

export class OpenAIService {
  private getClient(apiKey: string) {
    return new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  }

  async optimize(
    request: OptimizeRequest,
    apiKey: string,
    onChunk?: (chunk: StreamChunk) => void
  ): Promise<OptimizeResponse> {
    const client = this.getClient(apiKey);
    const systemPrompt = META_PROMPT(request.language, request.style, request.dynamicExamples);
    const userMessage = request.context
      ? `[CONTEXT]\n${request.context}\n[/CONTEXT]\n\n[ORIGINAL PROMPT]\n${request.prompt}\n[/ORIGINAL PROMPT]`
      : request.prompt;

    if (onChunk) {
      const stream = await client.chat.completions.create({
        model: request.model || 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 2048,
        stream: true,
      });

      let fullText = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullText += content;
          onChunk({ type: 'text', content });
        }
      }
      return this.parseResponse(fullText, request);
    }

    const response = await client.chat.completions.create({
      model: request.model || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    });

    const content = response.choices[0]?.message?.content || '';
    return this.parseResponse(content, request);
  }

  private parseResponse(
    content: string,
    request: OptimizeRequest
  ): OptimizeResponse {
    const parsed = extractJSON(content);
    if (!parsed) {
      throw new Error('Failed to parse AI response. Please try again.');
    }
    if (parsed.error) {
      throw new Error(String(parsed.error));
    }
    return {
      optimizedPrompt: String(parsed.optimizedPrompt || ''),
      explanation: String(parsed.explanation || ''),
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.map(String)
        : [],
      provider: request.provider,
      model: request.model,
      tokensUsed: { input: 0, output: 0 },
    };
  }
}
