import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-error';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: (count, err) => {
        if (err instanceof ApiError && ['unauthorized', 'forbidden', 'not_found', 'validation'].includes(err.kind)) return false;
        return count < 2;
      },
    },
    mutations: { retry: false }, // never auto-retry writes; idempotent retries are explicit
  },
});

/** Central query-key factory so invalidation after mutations is consistent. */
export const queryKeys = {
  me: ['auth', 'me'] as const,
  shops: ['shops'] as const,
  products: {
    all: ['products'] as const,
    list: (params: object) => ['products', 'list', params] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
    movements: (id: string, page: number) => ['products', 'movements', id, page] as const,
  },
  categories: ['categories'] as const,
  units: ['units'] as const,
  suppliers: (search = '') => ['suppliers', search] as const,
  dashboard: {
    all: ['dashboard'] as const,
    summary: ['dashboard', 'summary'] as const,
    trend: (days: number) => ['dashboard', 'trend', days] as const,
    frequent: ['dashboard', 'frequent'] as const,
  },
  movements: { recent: (limit: number) => ['movements', 'recent', limit] as const, all: ['movements'] as const },
  alerts: { all: ['alerts'] as const, lowStock: (limit: number) => ['alerts', 'low', limit] as const, reorder: ['alerts', 'reorder'] as const },
};

/** Call after any committed stock movement. */
export function invalidateAfterStockChange(productId?: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.movements.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
  if (productId) void queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(productId) });
}
