import { create } from 'zustand';
import type { Prompt } from '@/types/prompt';
import type { FilterConfig, SortConfig } from '@/types/common';
import { promptRepository } from '@/services/storage/prompt-repository';

interface PromptState {
  prompts: Prompt[];
  currentPrompt: Prompt | null;
  filter: FilterConfig;
  sort: SortConfig;
  currentPage: number;
  totalCount: number;
  isLoading: boolean;
  loadPrompts: () => Promise<void>;
  loadPrompt: (id: string) => Promise<void>;
  createPrompt: (prompt: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'history'>) => Promise<{ id: string; isDuplicate: boolean }>;
  updatePrompt: (id: string, changes: Partial<Prompt>) => Promise<void>;
  deletePrompt: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  setFilter: (filter: FilterConfig) => void;
  setSort: (sort: SortConfig) => void;
}

export const usePromptStore = create<PromptState>((set, get) => ({
  prompts: [],
  currentPrompt: null,
  filter: {},
  sort: { field: 'updatedAt', order: 'desc' },
  currentPage: 1,
  totalCount: 0,
  isLoading: false,

  loadPrompts: async () => {
    set({ isLoading: true });
    try {
      const { filter, sort, currentPage } = get();
      const result = await promptRepository.findByFilter(filter, sort, currentPage);
      set({ prompts: result.items, totalCount: result.total, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  loadPrompt: async (id) => {
    const prompt = await promptRepository.getById(id);
    set({ currentPrompt: prompt || null });
  },

  createPrompt: async (prompt) => {
    const existing = await promptRepository.findByOriginalText(prompt.originalText);
    if (existing) {
      return { id: existing.id, isDuplicate: true };
    }
    const id = await promptRepository.create(prompt);
    await get().loadPrompts();
    return { id, isDuplicate: false };
  },

  updatePrompt: async (id, changes) => {
    await promptRepository.update(id, changes);
    await get().loadPrompts();
  },

  deletePrompt: async (id) => {
    await promptRepository.delete(id);
    await get().loadPrompts();
  },

  toggleFavorite: async (id) => {
    const prompt = get().prompts.find((p) => p.id === id);
    if (prompt) {
      await promptRepository.update(id, { isFavorite: !prompt.isFavorite });
      await get().loadPrompts();
    }
  },

  setFilter: (filter) => set({ filter, currentPage: 1 }),
  setSort: (sort) => set({ sort, currentPage: 1 }),
}));
