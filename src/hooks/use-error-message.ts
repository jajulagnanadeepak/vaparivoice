import { useCallback } from 'react';
import { useI18n } from '@/features/i18n/i18n-provider';
import { ApiError } from '@/lib/api-error';

/** Plain-language, translated text for any error. Backend-written 4xx messages are shown as sent (they are localised server-side). */
export function useErrorMessage() {
  const { t } = useI18n();
  return useCallback((err: unknown) => {
    if (err instanceof ApiError) return err.fromServer ? err.message : t(`errors.${err.kind}`);
    return t('errors.unknown');
  }, [t]);
}
