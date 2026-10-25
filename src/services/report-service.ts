import { apiClient } from '@/lib/api-client';
import type { DashboardSummary, FrequentProduct, MovementTrendPoint } from '@/types';

export const reportService = {
  dashboardSummary: () => apiClient.get<DashboardSummary>('/dashboard/summary').then((r) => r.data),
  movementTrend: (days = 30) => apiClient.get<MovementTrendPoint[]>('/dashboard/movement-trend', { params: { days } }).then((r) => r.data),
  frequentProducts: (limit = 5) => apiClient.get<FrequentProduct[]>('/reports/frequent-products', { params: { limit } }).then((r) => r.data),
};
