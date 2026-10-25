import type { DecimalString, ISODateTime, SortOrder, UUID } from './common';

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';
export type ProductStatus = 'active' | 'archived';

export interface Category { id: UUID; name: string }

export interface Unit {
  code: string;            // "kg", "pcs", "bag"
  name: string;
  /** Dimension groups standard conversions (mass, volume, count, package). */
  dimension: 'mass' | 'volume' | 'count' | 'package';
}

export interface SupplierSummary { id: UUID; name: string }

export interface Product {
  id: UUID;
  name: string;
  sku: string;
  barcode: string | null;
  category: Category | null;
  description: string | null;
  base_unit: Unit;
  current_stock: DecimalString;
  min_stock: DecimalString;
  purchase_cost: DecimalString | null;
  selling_price: DecimalString | null;
  preferred_supplier: SupplierSummary | null;
  status: ProductStatus;
  stock_status: StockStatus;
  updated_at: ISODateTime;
  created_at: ISODateTime;
}

export type ProductSortField = 'name' | 'current_stock' | 'updated_at';

export interface ProductListParams {
  search?: string;
  category_id?: UUID;
  stock_status?: StockStatus;
  status?: ProductStatus;
  sort?: ProductSortField;
  order?: SortOrder;
  page?: number;
  page_size?: number;
}

/** Note: no `current_stock` — stock only changes via inventory movements. */
export interface ProductCreateRequest {
  name: string;
  sku: string;
  barcode?: string | null;
  category_id?: UUID | null;
  description?: string | null;
  base_unit_code: string;
  min_stock: DecimalString;
  purchase_cost?: DecimalString | null;
  selling_price?: DecimalString | null;
  preferred_supplier_id?: UUID | null;
}
export type ProductUpdateRequest = Partial<ProductCreateRequest>;
