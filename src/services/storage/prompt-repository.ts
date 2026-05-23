import { db } from './db';
import type { Prompt, PromptVersion } from '@/types/prompt';
import type { FilterConfig, SortConfig, PaginatedResult } from '@/types/common';

export const promptRepository = {
  async getAll(): Promise<Prompt[]> {
    return db.prompts.toArray();
  },

  async getById(id: string): Promise<Prompt | undefined> {
    return db.prompts.get(id);
  },

  async create(
    prompt: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'history'>
  ): Promise<string> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    await db.prompts.add({
      ...prompt,
      id,
      version: 1,
      history: [],
      createdAt: now,
      updatedAt: now,
    } as Prompt);
    return id;
  },

  async findByOriginalText(originalText: string): Promise<Prompt | undefined> {
    return db.prompts.filter((p) => p.originalText === originalText).first();
  },

  async findDuplicate(originalText: string, optimizedText: string): Promise<Prompt | undefined> {
    return db.prompts.filter((p) => p.originalText === originalText && p.optimizedText === optimizedText).first();
  },

  async update(id: string, changes: Partial<Prompt>): Promise<number> {
    return db.prompts.update(id, {
      ...changes,
      updatedAt: new Date().toISOString(),
    });
  },

  async saveVersion(id: string, newText: string, explanation: string, suggestions: string[], provider: Prompt['provider'], model: string): Promise<void> {
    const prompt = await db.prompts.get(id);
    if (!prompt) return;
    const version: PromptVersion = {
      version: prompt.version,
      text: prompt.optimizedText,
      explanation: prompt.explanation,
      suggestions: prompt.suggestions,
      provider: prompt.provider,
      model: prompt.model,
      createdAt: prompt.updatedAt,
    };
    await db.prompts.update(id, {
      optimizedText: newText,
      explanation,
      suggestions,
      provider,
      model,
      version: prompt.version + 1,
      history: [...prompt.history, version],
      updatedAt: new Date().toISOString(),
    });
  },

  async delete(id: string): Promise<void> {
    return db.prompts.delete(id);
  },

  async search(query: string): Promise<Prompt[]> {
    const q = query.toLowerCase();
    return db.prompts
      .filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.originalText.toLowerCase().includes(q) ||
          p.optimizedText.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      )
      .toArray();
  },

  async findByFilter(
    filter: FilterConfig,
    sort: SortConfig,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResult<Prompt>> {
    let results = await db.prompts.toArray();

    if (filter.category) {
      results = results.filter((p) => p.category === filter.category);
    }
    if (filter.tags?.length) {
      results = results.filter((p) => filter.tags!.some((t) => p.tags.includes(t)));
    }
    if (filter.provider) {
      results = results.filter((p) => p.provider === filter.provider);
    }
    if (filter.favoritesOnly) {
      results = results.filter((p) => p.isFavorite);
    }
    if (filter.searchQuery) {
      const q = filter.searchQuery.toLowerCase();
      results = results.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.optimizedText.toLowerCase().includes(q)
      );
    }

    results.sort((a, b) => {
      const aVal = a[sort.field];
      const bVal = b[sort.field];
      const cmp =
        typeof aVal === 'string' ? aVal.localeCompare(bVal as string) : 0;
      return sort.order === 'asc' ? cmp : -cmp;
    });

    const total = results.length;
    const start = (page - 1) * pageSize;
    const items = results.slice(start, start + pageSize);

    return { items, total, page, pageSize };
  },
};
