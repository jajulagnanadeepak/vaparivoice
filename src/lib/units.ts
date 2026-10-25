import type { DecimalString, ProductUnitConversion, Unit } from '@/types';
import { toNumber } from './format';

/**
 * PREVIEW-ONLY arithmetic. Conversion factors always come from the backend;
 * the frontend never sends a factor, only the unit code the user chose.
 */
export const roundQty = (n: number) => Math.round(n * 1000) / 1000;

export function toBase(quantity: DecimalString, factorToBase: DecimalString): number {
  return roundQty(toNumber(quantity) * toNumber(factorToBase));
}

export type PreviewDirection = 'in' | 'out' | 'set';

export interface StockPreview {
  current: number;
  /** Signed change in base units. */
  delta: number;
  after: number;
  insufficient: boolean;
  large: boolean;
}

export function previewStock(current: DecimalString, quantity: DecimalString, factorToBase: DecimalString, direction: PreviewDirection): StockPreview {
  const cur = toNumber(current);
  const base = toBase(quantity, factorToBase);
  const after = roundQty(direction === 'in' ? cur + base : direction === 'out' ? cur - base : base);
  const delta = roundQty(after - cur);
  // "Large" = more than 3x what is on the shelf (or > 1000 base units from zero). Only used to show a warning.
  const large = Math.abs(delta) > Math.max(cur * 3, 1000);
  return { current: cur, delta, after, insufficient: after < 0, large };
}

/** Ensures the product's base unit is always selectable, even if the conversions call fails. */
export function withBaseUnit(baseUnit: Unit, conversions: ProductUnitConversion[] | undefined): ProductUnitConversion[] {
  const list = conversions ?? [];
  if (list.some((c) => c.unit_code === baseUnit.code)) return list;
  return [{ unit_code: baseUnit.code, unit_name: baseUnit.name, factor_to_base: '1', kind: 'standard' }, ...list];
}
