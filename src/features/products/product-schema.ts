import { z } from 'zod';
import { decimalString } from '@/lib/validation';
import type { Product, ProductCreateRequest } from '@/types';

export const productSchema = z.object({
  name: z.string().trim().min(1, 'validation.required').max(150, 'validation.tooLong'),
  sku: z.string().trim().min(1, 'validation.required').max(64, 'validation.tooLong').regex(/^[A-Za-z0-9_-]+$/, 'validation.sku'),
  barcode: z.string().trim().max(64, 'validation.tooLong').regex(/^[0-9A-Za-z]*$/, 'validation.sku'),
  category_id: z.string(),
  description: z.string().trim().max(1000, 'validation.tooLong'),
  base_unit_code: z.string().min(1, 'validation.required'),
  min_stock: decimalString(),
  purchase_cost: decimalString({ maxDecimals: 2, required: false }),
  selling_price: decimalString({ maxDecimals: 2, required: false }),
  preferred_supplier_id: z.string(),
});
export type ProductFormValues = z.infer<typeof productSchema>;

export const emptyProductValues: ProductFormValues = {
  name: '', sku: '', barcode: '', category_id: '', description: '', base_unit_code: '', min_stock: '0', purchase_cost: '', selling_price: '', preferred_supplier_id: '',
};

export function productToFormValues(p: Product): ProductFormValues {
  return {
    name: p.name, sku: p.sku, barcode: p.barcode ?? '', category_id: p.category?.id ?? '', description: p.description ?? '',
    base_unit_code: p.base_unit.code, min_stock: p.min_stock, purchase_cost: p.purchase_cost ?? '', selling_price: p.selling_price ?? '',
    preferred_supplier_id: p.preferred_supplier?.id ?? '',
  };
}

/** Empty strings become null so the API can clear optional fields. Stock is never part of this payload. */
export function formValuesToRequest(v: ProductFormValues): ProductCreateRequest {
  const opt = (s: string) => (s.trim() === '' ? null : s.trim());
  return {
    name: v.name.trim(), sku: v.sku.trim(), barcode: opt(v.barcode), category_id: opt(v.category_id), description: opt(v.description),
    base_unit_code: v.base_unit_code, min_stock: v.min_stock, purchase_cost: opt(v.purchase_cost), selling_price: opt(v.selling_price),
    preferred_supplier_id: opt(v.preferred_supplier_id),
  };
}
