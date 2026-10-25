import { z } from 'zod';

/** Messages are translation keys; the UI translates them at render time. */
const email = z.string().trim().min(1, 'validation.required').email('validation.email');
const password = z.string().min(8, 'validation.passwordMin').max(128, 'validation.tooLong')
  .regex(/[A-Za-z]/, 'validation.passwordStrength').regex(/\d/, 'validation.passwordStrength');

export const loginSchema = z.object({ email, password: z.string().min(1, 'validation.required') });

export const registerSchema = z.object({
  full_name: z.string().trim().min(1, 'validation.required').max(120, 'validation.tooLong'),
  email,
  phone: z.string().trim().regex(/^(\+91)?[6-9]\d{9}$/, 'validation.phone').or(z.literal('')).optional(),
  password,
  confirm: z.string(),
}).refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'validation.passwordMatch' });

export const forgotSchema = z.object({ email });

export const resetSchema = z.object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'validation.passwordMatch' });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ForgotValues = z.infer<typeof forgotSchema>;
export type ResetValues = z.infer<typeof resetSchema>;
