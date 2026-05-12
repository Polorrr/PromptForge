import OpenAI from 'openai';
import type { OptimizeRequest, OptimizeResponse, StreamChunk } from '@/types/llm';
import { META_PROMPT } from './meta-prompt';
import { isNvidiaApiKey } from '@/constants/models';

const PROXY_URL = 'http://localhost:3456/nvidia';

function normalizeBaseUrl(url: string): string {
  let u = url.trim().replace(/\/+$/, '');
  if (!u.endsWith('/v1')) {
    u += '/v1';
  }
  return u;
}

export class CustomService {
  async optimize(
    request: OptimizeRequest,
    apiKey: string,
    baseUrl: string,
    onChunk?: (chunk: StreamChunk) => void
  ): Promise<OptimizeResponse> {
    const systemPrompt = META_PROMPT(request.language, request.style);
    const useNvidia = isNvidiaApiKey(apiKey);

    if (useNvidia) {
      return this.optimizeViaSdk(request, apiKey, systemPrompt, onChunk);
    }

    const url = normalizeBaseUrl(baseUrl) + '/chat/completions';
    const userMessage = request.context
      ? `[CONTEXT]\n${request.context}\n[/CONTEXT]\n\n[ORIGINAL PROMPT]\n${request.prompt}\n[/ORIGINAL PROMPT]`
      : request.prompt;
    const body = {
      model: request.model || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 2048,
      stream: !!onChunk,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`API error ${res.status}: ${err}`);
    }

    if (onChunk) {
      return this.handleStream(res, request, onChunk);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    return this.parseResponse(content, request);
  }

  private async handleStream(
    res: Response,
    request: OptimizeRequest,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<OptimizeResponse> {
    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content || '';
          if (content) {
            fullText += content;
            onChunk({ type: 'text', content });
          }
        } catch { /* skip malformed chunks */ }
      }
    }

    return this.parseResponse(fullText, request);
  }

  private async optimizeViaSdk(
    request: OptimizeRequest,
    apiKey: string,
    systemPrompt: string,
    onChunk?: (chunk: StreamChunk) => void
  ): Promise<OptimizeResponse> {
    const client = new OpenAI({
      apiKey,
      baseURL: PROXY_URL,
      dangerouslyAllowBrowser: true,
    });

    if (onChunk) {
      const stream = await client.chat.completions.create({
        model: request.model || 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: request.prompt },
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
        { role: 'user', content: request.prompt },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    });

    const content = response.choices[0]?.message?.content || '';
    return this.parseResponse(content, request);
  }

  private parseResponse(content: string, request: OptimizeRequest): OptimizeResponse {
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

function extractJSON(text: string): Record<string, unknown> | null {
  try { return JSON.parse(text); } catch { /* ignore */ }
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch?.[1]) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch { /* ignore */ }
  }
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try { return JSON.parse(braceMatch[0]); } catch { /* ignore */ }
  }
  return null;
}

export interface RelayModel {
  id: string;
  owned_by?: string;
}

export async function fetchRelayModels(apiKey: string, baseUrl: string): Promise<RelayModel[]> {
  if (isNvidiaApiKey(apiKey)) {
    return [];
  }

  let url = baseUrl.trim().replace(/\/+$/, '');
  if (!url.endsWith('/v1')) url += '/v1';

  const res = await fetch(`${url}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const url2 = url.replace(/\/v1$/, '');
    const res2 = await fetch(`${url2}/v1/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res2.ok) throw new Error('Failed to fetch models');
    const data = await res2.json();
    return (data.data || []).map((m: { id: string; owned_by?: string }) => ({ id: m.id, owned_by: m.owned_by }));
  }
  const data = await res.json();
  return (data.data || []).map((m: { id: string; owned_by?: string }) => ({ id: m.id, owned_by: m.owned_by }));
}

export const customService = new CustomService();
