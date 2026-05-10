import type { Prompt } from '@/types/prompt';

export function exportPromptJSON(prompt: Prompt): string {
  return JSON.stringify(
    {
      title: prompt.title,
      original: prompt.originalText,
      optimized: prompt.optimizedText,
      explanation: prompt.explanation,
      tags: prompt.tags,
      category: prompt.category,
      provider: prompt.provider,
      model: prompt.model,
      exportedAt: new Date().toISOString(),
      source: 'PromptForge',
    },
    null,
    2
  );
}

export function exportAllJSON(prompts: Prompt[]): string {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      source: 'PromptForge',
      prompts: prompts.map((p) => ({
        title: p.title,
        original: p.originalText,
        optimized: p.optimizedText,
        explanation: p.explanation,
        tags: p.tags,
        category: p.category,
        provider: p.provider,
        model: p.model,
      })),
    },
    null,
    2
  );
}

export function downloadJSON(content: string, filename: string) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importJSON(file: File): Promise<Partial<Prompt>[]> {
  const text = await file.text();
  const data = JSON.parse(text);

  if (Array.isArray(data.prompts)) {
    return data.prompts;
  }
  // Single prompt import
  return [data];
}
