import { apiClient } from '@/lib/api-client';
import type { LowStockItem, ReorderSuggestion } from '@/types';

export const alertService = {
  lowStock: (limit = 10) => apiClient.get<LowStockItem[]>('/alerts/low-stock', { params: { limit } }).then((r) => r.data),
  reorderSuggestions: (limit = 5) => apiClient.get<ReorderSuggestion[]>('/alerts/reorder-suggestions', { params: { limit } }).then((r) => r.data),
};
