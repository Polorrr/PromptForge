import type { OptimizeStyle } from '@/types/llm';
import { extractJSON } from './extract-json';

export interface ValidationResult {
  valid: boolean;
  warnings: string[];
}

const STYLE_THRESHOLDS: Record<OptimizeStyle, { min: number; max: number }> = {
  default:      { min: 0.5, max: 7 },
  concise:      { min: 0.3, max: 4 },
  detailed:     { min: 0.5, max: 10 },
  creative:     { min: 0.4, max: 8 },
  professional: { min: 0.5, max: 7 },
};

const DETECT_PROMPT = `You are a strict prompt quality judge. Compare the original prompt and the optimized prompt.

The optimization is ONLY considered "improved" if it adds REAL new value. Reformatting, rewording, or rearranging does NOT count.

Specifically, check if the optimized version added any of these (which the original lacked):
- Clear role/persona assignment
- Specific output format specification (JSON, markdown, etc.)
- Concrete constraints or requirements
- Examples or templates
- Step-by-step structure
- Audience or context specification

If the optimized version is just the original with:
- Different whitespace or line breaks
- Synonyms or rephrased sentences
- Same content in different order
- Minor wording tweaks

Then it is NOT improved.

Respond with ONLY this JSON:
{"improved": true/false, "reason": "brief reason in the same language as the prompts"}`;

export function validateOptimizationBasic(
  original: string,
  optimized: string,
  explanation: string,
  style: OptimizeStyle = 'default'
): ValidationResult {
  const warnings: string[] = [];

  if (!optimized || !optimized.trim()) {
    return { valid: false, warnings: ['优化结果为空'] };
  }

  const normOriginal = original.replace(/\s+/g, ' ').trim();
  const normOptimized = optimized.replace(/\s+/g, ' ').trim();

  if (normOptimized === normOriginal) {
    return { valid: false, warnings: ['优化结果与原文内容相同'] };
  }

  const pureText = (s: string) => s.replace(/\s/g, '').length;
  const originalLen = pureText(original);
  const optimizedLen = pureText(optimized);
  const ratio = optimizedLen / originalLen;
  const { min, max } = STYLE_THRESHOLDS[style];

  // Short prompts expand naturally — use both ratio and absolute cap
  let maxRatio: number;
  if (originalLen < 30) {
    maxRatio = optimizedLen > 800 ? optimizedLen / originalLen : Infinity;
  } else if (originalLen < 100) {
    maxRatio = max * 3;
  } else if (originalLen < 200) {
    maxRatio = max * 2;
  } else {
    maxRatio = max * 1.5;
  }

  if (ratio < min) {
    warnings.push('优化结果比原文短了很多，可能丢失了内容');
  }

  if (ratio > maxRatio) {
    warnings.push('优化结果比原文长了很多，可能包含冗余');
  }

  if (!explanation || !explanation.trim()) {
    warnings.push('缺少改动说明');
  }

  return { valid: warnings.length === 0, warnings };
}

export async function aiDetectSimilarity(
  original: string,
  optimized: string,
  apiKey: string,
  model: string,
  baseUrl?: string
): Promise<{ improved: boolean; reason: string }> {
  const userMessage = `## Original\n${original}\n\n## Optimized\n${optimized}`;

  let content = '';

  if (baseUrl) {
    let url = baseUrl.trim().replace(/\/+$/, '');
    if (!url.endsWith('/v1')) url += '/v1';
    const res = await fetch(`${url}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: DETECT_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.1,
        max_tokens: 150,
      }),
    });
    if (!res.ok) return { improved: true, reason: '' };
    const data = await res.json();
    content = data.choices?.[0]?.message?.content || '';
  } else {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    const res = await client.chat.completions.create({
      model: model || 'gpt-4o',
      messages: [
        { role: 'system', content: DETECT_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.1,
      max_tokens: 150,
    });
    content = res.choices[0]?.message?.content || '';
  }

  const parsed = extractJSON(content);
  if (!parsed) return { improved: true, reason: '' };

  return {
    improved: parsed.improved !== false,
    reason: String(parsed.reason || ''),
  };
}
