import { z } from 'zod';
import { decimalString } from '@/lib/validation';
import { toNumber } from '@/lib/format';

export type StockMode = 'in' | 'sale' | 'out' | 'adjust';
export const OUT_REASONS = ['damaged', 'expired', 'internal_use', 'other'] as const;

export function stockFormSchema(mode: StockMode) {
  return z.object({
    quantity: mode === 'adjust'
      ? decimalString()
      : decimalString().refine((v) => v === '' || toNumber(v) > 0, 'validation.positive'),
    unit_code: z.string().min(1, 'validation.required'),
    reason: mode === 'out'
      ? z.string().refine((v) => (OUT_REASONS as readonly string[]).includes(v), 'validation.chooseReason')
      : mode === 'adjust'
        ? z.string().trim().min(3, 'validation.required').max(300, 'validation.tooLong')
        : z.string(),
    unit_cost: decimalString({ maxDecimals: 2, required: false }),
    supplier_id: z.string(),
    reference: z.string().trim().max(64, 'validation.tooLong'),
    notes: z.string().trim().max(500, 'validation.tooLong'),
  });
}
export type StockFormValues = z.infer<ReturnType<typeof stockFormSchema>>;
export const emptyStockForm: StockFormValues = { quantity: '', unit_code: '', reason: '', unit_cost: '', supplier_id: '', reference: '', notes: '' };
