import Dexie, { type Table } from 'dexie';
import type { Prompt, Category, Tag, PromptScore } from '@/types/prompt';

class PromptForgeDB extends Dexie {
  prompts!: Table<Prompt, string>;
  categories!: Table<Category, string>;
  tags!: Table<Tag, string>;
  scores!: Table<PromptScore, number>;

  constructor() {
    super('PromptForgeDB');
    this.version(1).stores({
      prompts: 'id, title, category, createdAt, updatedAt, isFavorite',
      categories: 'id, parentId, sortOrder',
      tags: 'id, name, usageCount',
    });
    this.version(2).stores({
      scores: '++id, promptId, scoredAt, source',
    });
  }
}

export const db = new PromptForgeDB();
