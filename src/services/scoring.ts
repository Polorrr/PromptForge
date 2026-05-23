import type { PromptScore } from '@/types/prompt';
import type { LLMProvider } from '@/types/settings';
import { extractJSON } from '@/utils/extract-json';

const SCORING_PROMPT = `You are a strict prompt quality evaluator. Score the optimized prompt vs the original on 3 dimensions (1-5 scale).

## Scoring Scale (BE STRICT — most prompts deserve 2-3, only exceptional ones get 4-5)

- **clarity**: Is the prompt unambiguous and easy for an LLM to follow?
  - 1: Confusing, contradictory, or vague
  - 2: Mostly clear but has ambiguities
  - 3: Clear enough to work, some minor unclear spots
  - 4: Very clear, minimal ambiguity
  - 5: Crystal clear, zero ambiguity

- **completeness**: Does it specify role, context, constraints, output format, and examples?
  - 1: Missing most essential elements
  - 2: Has some basics but missing key parts (no role, no format)
  - 3: Covers the basics, missing one or two elements
  - 4: Comprehensive, minor gaps
  - 5: Covers everything: role, context, constraints, format, examples

- **effectiveness**: How likely is this prompt to produce the EXACT desired output?
  - 1: Will likely produce garbage or wrong output
  - 2: Might work but high chance of off-target results
  - 3: Should work for the general case
  - 4: Very likely to produce correct output
  - 5: Guarantees precise output

## Rules
- Be HARSH. Do not give 4 or 5 just because the prompt looks "nice".
- If the optimized version is just the original with minor rewording, give 1-2 on all dimensions.
- If the prompt has no output format specified, completeness ≤ 3.
- If the prompt has no role/persona, completeness ≤ 3.
- If the prompt is too vague for an LLM to follow precisely, effectiveness ≤ 2.

## Output
Respond with ONLY this JSON:
{"clarity":3,"completeness":2,"effectiveness":3}`;

export interface ScoringResult {
  scores: { clarity: number; completeness: number; effectiveness: number };
  overall: number;
}

function calcOverall(scores: { clarity: number; completeness: number; effectiveness: number }): number {
  return Math.round(((scores.clarity + scores.completeness + scores.effectiveness) / 3) * 10) / 10;
}

export async function aiScore(
  original: string,
  optimized: string,
  provider: LLMProvider,
  apiKey: string,
  model: string,
  baseUrl?: string
): Promise<ScoringResult> {
  const userMessage = `## Original Prompt\n${original}\n\n## Optimized Prompt\n${optimized}`;

  let content = '';

  if (provider === 'openai') {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    const res = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SCORING_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 4096,
    });
    content = res.choices[0]?.message?.content || '';
  } else if (provider === 'claude') {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey,
        model,
        system: SCORING_PROMPT,
        prompt: userMessage,
        maxTokens: 200,
      }),
    });
    if (!res.ok) throw new Error('Scoring API failed');
    const data = await res.json();
    content = data.content?.[0]?.text || '';
  } else {
    const { isNvidiaApiKey } = await import('@/constants/models');
    const useNvidia = isNvidiaApiKey(apiKey);
    const PROXY_URL = 'http://localhost:3456/nvidia';

    if (useNvidia) {
      const { default: OpenAI } = await import('openai');
      const client = new OpenAI({ apiKey, baseURL: PROXY_URL, dangerouslyAllowBrowser: true });
      const res = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: SCORING_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      });
      content = res.choices[0]?.message?.content || '';
    } else {
      let url = (baseUrl || '').trim().replace(/\/+$/, '');
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
            { role: 'system', content: SCORING_PROMPT },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.3,
          max_tokens: 4096,
        }),
      });
      if (!res.ok) throw new Error(`Scoring API error ${res.status}`);
      const data = await res.json();
      content = data.choices?.[0]?.message?.content || '';
    }
  }

  const parsed = extractJSON(content);
  if (!parsed) throw new Error('Failed to parse scoring response');

  const scores = {
    clarity: Math.min(5, Math.max(1, Number(parsed.clarity) || 3)),
    completeness: Math.min(5, Math.max(1, Number(parsed.completeness) || 3)),
    effectiveness: Math.min(5, Math.max(1, Number(parsed.effectiveness) || 3)),
  };

  return { scores, overall: calcOverall(scores) };
}

export function userScore(
  clarity: number,
  completeness: number,
  effectiveness: number
): ScoringResult {
  const scores = {
    clarity: Math.min(5, Math.max(1, clarity)),
    completeness: Math.min(5, Math.max(1, completeness)),
    effectiveness: Math.min(5, Math.max(1, effectiveness)),
  };
  return { scores, overall: calcOverall(scores) };
}
