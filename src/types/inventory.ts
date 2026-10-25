import type { DecimalString, ISODateTime, UUID } from './common';

export type MovementType = 'stock_in' | 'stock_out' | 'adjustment' | 'opening';
export type MovementSource = 'manual' | 'voice';
export type MovementStatus = 'committed' | 'pending' | 'failed';
export type StockOutReason = 'sold' | 'damaged' | 'expired' | 'internal_use' | 'other';

export interface StockMovement {
  id: UUID;
  reference: string;
  product: { id: UUID; name: string; sku: string };
  movement_type: MovementType;
  /** Quantity as entered, in the trade unit the user chose. */
  quantity: DecimalString;
  unit_code: string;
  /** Signed change in the product's base unit. */
  base_quantity_change: DecimalString;
  base_unit_code: string;
  balance_after: DecimalString;
  reason: string | null;
  notes: string | null;
  source: MovementSource;
  status: MovementStatus;
  performed_by: { id: UUID; full_name: string };
  created_at: ISODateTime;
}

export interface ProductUnitConversion {
  unit_code: string;
  unit_name: string;
  /** How many base units in one of this unit. Supplied by the backend only. */
  factor_to_base: DecimalString;
  kind: 'standard' | 'shop_specific';
}

export interface StockInRequest {
  product_id: UUID;
  quantity: DecimalString;
  unit_code: string;
  unit_cost?: DecimalString | null;
  supplier_id?: UUID | null;
  reference?: string | null;
  notes?: string | null;
}
export interface StockOutRequest {
  product_id: UUID;
  quantity: DecimalString;
  unit_code: string;
  reason: StockOutReason;
  reference?: string | null;
  notes?: string | null;
}
export interface StockAdjustmentRequest {
  product_id: UUID;
  observed_quantity: DecimalString;
  unit_code: string;
  reason: string;
}
