import { Construction } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState } from '@/components/common/states';
import { useI18n } from '@/features/i18n/i18n-provider';
import type { TranslationKey } from '@/locales';

/** Honest placeholder for routes scheduled in later phases. Shows no fake data. */
export default function PlannedPage({ titleKey, phase }: { titleKey: TranslationKey; phase: string }) {
  const { t } = useI18n();
  return (
    <>
      <PageHeader title={t(titleKey)} />
      <EmptyState icon={Construction} title={t(titleKey)} body={t('common.comingSoon', { phase })} />
    </>
  );
}
