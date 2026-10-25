import { z } from 'zod';
import { decimalString } from '@/lib/validation';

const lang = z.enum(['en', 'hi', 'te']);
export const onboardingSchema = z.object({
  name: z.string().trim().min(1, 'validation.required').max(120, 'validation.tooLong'),
  owner_name: z.string().trim().max(120, 'validation.tooLong'),
  currency: z.literal('INR'),
  timezone: z.string().min(1),
  ui_language: lang,
  voice_language: lang,
  default_min_stock: decimalString({ required: false }),
  default_unit_code: z.string(),
});
export type OnboardingValues = z.infer<typeof onboardingSchema>;
export const STEP_FIELDS: (keyof OnboardingValues)[][] = [
  ['name', 'owner_name', 'currency', 'timezone'],
  ['ui_language', 'voice_language'],
  ['default_min_stock', 'default_unit_code'],
];
