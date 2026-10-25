import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { reportService } from '@/services/report-service';
import { alertService } from '@/services/alert-service';
import { inventoryService } from '@/services/inventory-service';

export const useDashboardSummary = () => useQuery({ queryKey: queryKeys.dashboard.summary, queryFn: reportService.dashboardSummary });
export const useMovementTrend = (days = 30) => useQuery({ queryKey: queryKeys.dashboard.trend(days), queryFn: () => reportService.movementTrend(days) });
export const useFrequentProducts = () => useQuery({ queryKey: queryKeys.dashboard.frequent, queryFn: () => reportService.frequentProducts(5) });
export const useLowStock = (limit = 6) => useQuery({ queryKey: queryKeys.alerts.lowStock(limit), queryFn: () => alertService.lowStock(limit) });
export const useReorderSuggestions = () => useQuery({ queryKey: queryKeys.alerts.reorder, queryFn: () => alertService.reorderSuggestions(5) });
export const useRecentMovements = (limit = 6) =>
  useQuery({ queryKey: queryKeys.movements.recent(limit), queryFn: () => inventoryService.movements({ page: 1, page_size: limit }).then((r) => r.items) });
