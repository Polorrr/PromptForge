import type { LLMProvider } from './settings';

export interface Prompt {
  id: string;
  title: string;
  originalText: string;
  optimizedText: string;
  explanation: string;
  category: string;
  tags: string[];
  provider: LLMProvider;
  model: string;
  isFavorite: boolean;
  version: number;
  history: PromptVersion[];
  gistId?: string;
  gistUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromptVersion {
  version: number;
  text: string;
  explanation: string;
  provider: LLMProvider;
  model: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  nameZh: string;
  icon: string;
  parentId?: string;
  sortOrder: number;
  isSystem: boolean;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  usageCount: number;
}

export interface CommunityPrompt {
  id: string;
  title: string;
  description: string;
  text: string;
  author: string;
  category: string;
  tags: string[];
  stars: number;
  forks: number;
  fileUrl: string;
  createdAt: string;
  updatedAt: string;
}
