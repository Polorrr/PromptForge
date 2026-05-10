import type { OptimizeRequest, OptimizeResponse, StreamChunk } from '@/types/llm';
import { META_PROMPT } from './meta-prompt';

export class ClaudeService {
  async optimize(
    request: OptimizeRequest,
    apiKey: string,
    onChunk?: (chunk: StreamChunk) => void
  ): Promise<OptimizeResponse> {
    const systemPrompt = META_PROMPT(request.language);

    const response = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey,
        model: request.model || 'claude-sonnet-4-20250514',
        system: systemPrompt,
        prompt: request.prompt,
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
      throw new Error(parsed.error as string);
    }
    return {
      optimizedPrompt: (parsed.optimizedPrompt as string) || '',
      explanation: (parsed.explanation as string) || '',
      suggestions: (parsed.suggestions as string[]) || [],
      provider: request.provider,
      model: request.model,
      tokensUsed: { input: 0, output: 0 },
    };
  }
}

function extractJSON(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text);
  } catch {
    // ignore
  }
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch?.[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // ignore
    }
  }
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      return JSON.parse(braceMatch[0]);
    } catch {
      // ignore
    }
  }
  return null;
}
