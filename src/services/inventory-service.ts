import { apiClient, IDEMPOTENCY_HEADER } from '@/lib/api-client';
import type { Paginated, StockAdjustmentRequest, StockInRequest, StockMovement, StockOutRequest } from '@/types';

/**
 * Every write carries an idempotency key. Callers must create the key ONCE per
 * user intent and reuse it on retry, so the backend can de-duplicate.
 */
const withKey = (key: string) => ({ headers: { [IDEMPOTENCY_HEADER]: key } });

export const inventoryService = {
  stockIn: (body: StockInRequest, key: string) => apiClient.post<StockMovement>('/inventory/stock-in', body, withKey(key)).then((r) => r.data),
  stockOut: (body: StockOutRequest, key: string) => apiClient.post<StockMovement>('/inventory/stock-out', body, withKey(key)).then((r) => r.data),
  adjust: (body: StockAdjustmentRequest, key: string) => apiClient.post<StockMovement>('/inventory/adjustments', body, withKey(key)).then((r) => r.data),
  /** Look up a submission by idempotency key to resolve an unknown outcome. */
  lookupByKey: (key: string) => apiClient.get<StockMovement | null>(`/inventory/movements/by-idempotency-key/${key}`).then((r) => r.data),
  movements: (params: { page?: number; page_size?: number; product_id?: string; movement_type?: string; source?: string; date_from?: string; date_to?: string }) =>
    apiClient.get<Paginated<StockMovement>>('/inventory/movements', { params }).then((r) => r.data),
};
