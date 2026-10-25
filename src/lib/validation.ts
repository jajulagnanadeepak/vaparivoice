import { z } from 'zod';

/** Non-negative decimal entered as text; kept as a string so no float rounding reaches the API. */
export const decimalString = (opts: { maxDecimals?: number; required?: boolean } = {}) => {
  const { maxDecimals = 3, required = true } = opts;
  const base = z.string().trim()
    .refine((v) => v === '' || /^\d+(\.\d+)?$/.test(v), 'validation.number')
    .refine((v) => v === '' || (v.split('.')[1]?.length ?? 0) <= maxDecimals, 'validation.maxDecimals');
  return required ? base.refine((v) => v !== '', 'validation.required') : base;
};
