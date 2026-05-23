import type { Prompt } from '@/types/prompt';

export interface GistResult {
  gistId: string;
  gistUrl: string;
  rawUrl: string;
}

export const gistService = {
  async createGist(prompt: Prompt, githubToken: string, shareToCommunity = false): Promise<GistResult> {
    const filename = `promptforge-${prompt.id.slice(0, 8)}.json`;
    const content = JSON.stringify(
      {
        title: prompt.title,
        prompt: prompt.optimizedText,
        original: prompt.originalText,
        explanation: prompt.explanation,
        tags: prompt.tags,
        category: prompt.category,
        exportedAt: new Date().toISOString(),
        source: 'PromptForge',
      },
      null,
      2
    );

    const response = await fetch('/api/gist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        githubToken,
        filename,
        content,
        description: shareToCommunity
          ? `PromptForge Community: ${prompt.title}`
          : `PromptForge: ${prompt.title}`,
        public: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        (error as { error?: string }).error || 'Failed to create Gist'
      );
    }

    const data = await response.json();
    return {
      gistId: data.id,
      gistUrl: data.html_url,
      rawUrl: data.files[filename].raw_url,
    };
  },

  async importFromGist(gistId: string): Promise<Prompt> {
    const response = await fetch(`https://api.github.com/gists/${gistId}`);
    if (!response.ok) throw new Error('Failed to fetch Gist');
    const data = await response.json();
    const filename = Object.keys(data.files)[0];
    if (!filename) throw new Error('Gist has no files');
    const fileData = data.files[filename];
    const content = JSON.parse(fileData.content);

    return {
      id: crypto.randomUUID(),
      title: content.title,
      originalText: content.original || '',
      optimizedText: content.prompt,
      explanation: content.explanation || '',
      suggestions: content.suggestions || [],
      category: content.category || 'imported',
      tags: content.tags || [],
      provider: 'openai',
      model: 'unknown',
      isFavorite: false,
      version: 1,
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },
};
