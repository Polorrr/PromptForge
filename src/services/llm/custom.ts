import OpenAI from 'openai';
import type { OptimizeRequest, OptimizeResponse, StreamChunk } from '@/types/llm';
import { META_PROMPT } from './meta-prompt';
import { NVIDIA_BASE_URL, isNvidiaApiKey } from '@/constants/models';

const PROXY_URL = 'http://localhost:3456/nvidia';

function normalizeBaseUrl(url: string): string {
  let u = url.trim().replace(/\/+$/, '');
  if (!u.endsWith('/v1')) {
    u += '/v1';
  }
  return u;
}

export class CustomService {
  private getClient(apiKey: string, baseUrl: string) {
    const useNvidia = isNvidiaApiKey(apiKey);
    const finalBaseUrl = useNvidia ? PROXY_URL : baseUrl;
    return new OpenAI({
      apiKey,
      baseURL: useNvidia ? PROXY_URL : normalizeBaseUrl(finalBaseUrl),
      dangerouslyAllowBrowser: true,
    });
  }

  async optimize(
    request: OptimizeRequest,
    apiKey: string,
    baseUrl: string,
    onChunk?: (chunk: StreamChunk) => void
  ): Promise<OptimizeResponse> {
    const client = this.getClient(apiKey, baseUrl);
    const systemPrompt = META_PROMPT(request.language, request.style);

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
