import { FlaskConical } from 'lucide-react';
import { env } from '@/lib/env';
import { useI18n } from '@/features/i18n/i18n-provider';

/** Always visible while the dev-only mock adapter is active. */
export function MockBanner() {
  const { t } = useI18n();
  if (!env.useMockApi) return null;
  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-warning px-3 py-1.5 text-center text-xs font-semibold text-warning-foreground">
      <FlaskConical className="size-3.5" aria-hidden />
      {t('common.mockBanner')}
    </div>
  );
}
