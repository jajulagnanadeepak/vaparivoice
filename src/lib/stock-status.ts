import type { DecimalString } from '@/types/common';
import type { StockStatus } from '@/types/product';
import { toNumber } from './format';

/**
 * Display-only mirror of the backend's status rule. The backend's `stock_status`
 * field is authoritative whenever present.
 */
export function deriveStockStatus(current: DecimalString, minimum: DecimalString): StockStatus {
  const c = toNumber(current);
  if (c <= 0) return 'out_of_stock';
  if (c <= toNumber(minimum)) return 'low_stock';
  return 'in_stock';
}
