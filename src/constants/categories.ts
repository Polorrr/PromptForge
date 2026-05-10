import type { Category } from '@/types/prompt';

export const DEFAULT_CATEGORIES: Omit<Category, 'createdAt'>[] = [
  { id: 'writing', name: 'Writing', nameZh: '写作', icon: '✍️', sortOrder: 0, isSystem: true },
  { id: 'coding', name: 'Coding', nameZh: '编程', icon: '💻', sortOrder: 1, isSystem: true },
  { id: 'marketing', name: 'Marketing', nameZh: '营销', icon: '📢', sortOrder: 2, isSystem: true },
  { id: 'analysis', name: 'Analysis', nameZh: '分析', icon: '📊', sortOrder: 3, isSystem: true },
  { id: 'creative', name: 'Creative', nameZh: '创意', icon: '🎨', sortOrder: 4, isSystem: true },
  { id: 'education', name: 'Education', nameZh: '教育', icon: '📚', sortOrder: 5, isSystem: true },
  { id: 'business', name: 'Business', nameZh: '商业', icon: '💼', sortOrder: 6, isSystem: true },
  { id: 'other', name: 'Other', nameZh: '其他', icon: '📁', sortOrder: 99, isSystem: true },
];
