import { useI18n } from '@/features/i18n/i18n-provider';
import type { TranslationKey } from '@/locales';

/** Translates a zod message (stored as a translation key) for display. */
export function useTranslateError() {
  const { t } = useI18n();
  return (msg?: string) => (msg ? (msg.includes('.') ? t(msg as TranslationKey) : msg) : undefined);
}
