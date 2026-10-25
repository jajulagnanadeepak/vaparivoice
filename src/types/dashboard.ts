import type { DecimalString, ISODateTime, UUID } from './common';

export interface DashboardSummary {
  active_products: number;
  inventory_value: DecimalString;
  low_stock_count: number;
  out_of_stock_count: number;
  movements_last_7_days: number;
  as_of: ISODateTime;
}

export interface MovementTrendPoint {
  date: string; // YYYY-MM-DD in shop timezone
  stock_in_count: number;
  stock_out_count: number;
  adjustment_count: number;
}

export interface FrequentProduct {
  product_id: UUID;
  name: string;
  movement_count: number;
  base_unit_code: string;
}

export interface LowStockItem {
  product_id: UUID;
  name: string;
  current_stock: DecimalString;
  min_stock: DecimalString;
  base_unit_code: string;
  stock_status: 'low_stock' | 'out_of_stock';
  preferred_supplier: string | null;
  last_movement_at: ISODateTime | null;
}

/** Threshold-based only; `basis` tells the UI how it was calculated. */
export interface ReorderSuggestion {
  product_id: UUID;
  name: string;
  suggested_quantity: DecimalString;
  base_unit_code: string;
  basis: 'threshold' | 'forecast';
  explanation: string;
}
