import type { OptimizeRequest, OptimizeResponse, StreamChunk } from '@/types/llm';
import { META_PROMPT } from './meta-prompt';
import { extractJSON } from '@/utils/extract-json';

export class ClaudeService {
  async optimize(
    request: OptimizeRequest,
    apiKey: string,
    onChunk?: (chunk: StreamChunk) => void
  ): Promise<OptimizeResponse> {
    const systemPrompt = META_PROMPT(request.language, request.style, request.dynamicExamples);
    const userMessage = request.context
      ? `[CONTEXT]\n${request.context}\n[/CONTEXT]\n\n[ORIGINAL PROMPT]\n${request.prompt}\n[/ORIGINAL PROMPT]`
      : request.prompt;

    const response = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey,
        model: request.model || 'claude-sonnet-4-20250514',
        system: systemPrompt,
        prompt: userMessage,
        maxTokens: 2048,
        stream: !!onChunk,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        (error as { error?: string }).error || 'Claude API request failed'
      );
    }

    if (onChunk && response.body) {
      return this.handleStream(response.body, request, onChunk);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    return this.parseResponse(text, request);
  }

  private async handleStream(
    body: ReadableStream,
    request: OptimizeRequest,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<OptimizeResponse> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      // Parse SSE events
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.delta?.text || '';
            if (delta) {
              fullText += delta;
              onChunk({ type: 'text', content: delta });
            }
          } catch {
            // skip malformed SSE
          }
        }
      }
    }

    return this.parseResponse(fullText, request);
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
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.map(String) : [],
      provider: request.provider,
      model: request.model,
      tokensUsed: { input: 0, output: 0 },
    };
  }
}
