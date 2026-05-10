export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type SortField = 'createdAt' | 'updatedAt' | 'title' | 'isFavorite';
export type SortOrder = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  order: SortOrder;
}

export interface FilterConfig {
  category?: string;
  tags?: string[];
  provider?: string;
  favoritesOnly?: boolean;
  searchQuery?: string;
}
