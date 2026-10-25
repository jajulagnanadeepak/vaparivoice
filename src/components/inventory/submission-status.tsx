import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, HelpCircle, Loader2, WifiOff, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useI18n } from '@/features/i18n/i18n-provider';
import type { SubmissionState } from '@/features/inventory/use-stock-submission';
import { useErrorMessage } from '@/hooks/use-error-message';
import { formatDateTime, formatQuantity, toNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ProductName } from './product-name';

interface Props {
  state: SubmissionState;
  onRetry: () => void;
  onCheck: () => void;
  onBackToEdit: () => void;
  successActions: ReactNode;
}

function Panel({ tone, icon, title, children }: { tone: 'success' | 'warning' | 'destructive' | 'primary'; icon: ReactNode; title: string; children?: ReactNode }) {
  const tones = { success: 'border-success/30 bg-success-soft', warning: 'border-warning/30 bg-warning-soft', destructive: 'border-destructive/30 bg-destructive-soft', primary: 'border-primary/20 bg-primary-soft' };
  return (
    <Card className={cn('flex flex-col items-center gap-3 p-6 text-center', tones[tone])}>
      {icon}
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </Card>
  );
}

/** Renders every non-idle submission state. Success appears ONLY with the server's movement record. */
export function SubmissionStatus({ state, onRetry, onCheck, onBackToEdit, successActions }: Props) {
  const { t, locale } = useI18n();
  const errorMessage = useErrorMessage();

  switch (state.status) {
    case 'saving':
    case 'checking':
      return (
        <Panel tone="primary" icon={<Loader2 className="size-12 animate-spin text-primary" aria-hidden />} title={t('common.loading')}>
          <p role="status" aria-live="assertive" className="text-base">{t('stock.saving')}</p>
        </Panel>
      );
    case 'success': {
      const m = state.movement;
      const change = toNumber(m.base_quantity_change);
      const changeText = `${change > 0 ? '+' : ''}${formatQuantity(m.base_quantity_change, m.base_unit_code, locale)}`;
      return (
        <Panel tone="success" icon={<CheckCircle2 className="size-14 text-success" aria-hidden />} title={t('stock.successTitle')}>
          <p role="status" aria-live="assertive" className="text-lg">
            <ProductName name={m.product.name} className="font-semibold" />: {changeText}
          </p>
          <p className="text-3xl font-bold tabular">{formatQuantity(m.balance_after, m.base_unit_code, locale)}</p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <dt className="text-right text-muted-foreground">{t('stock.refLabel')}</dt><dd className="text-left font-medium">{m.reference}</dd>
            <dt className="text-right text-muted-foreground">{t('stock.timeLabel')}</dt><dd className="text-left font-medium">{formatDateTime(m.created_at, locale)}</dd>
          </dl>
          <div className="mt-2 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">{successActions}</div>
        </Panel>
      );
    }
    case 'unknown':
      return (
        <Panel tone="warning" icon={<HelpCircle className="size-12 text-warning" aria-hidden />} title={t('stock.unknownTitle')}>
          <p role="alert" className="max-w-md text-base">{t('stock.unknownBody')}</p>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button size="lg" onClick={onCheck}>{t('stock.checkStatus')}</Button>
            {/* Same idempotency key: the server ignores a duplicate. */}
            <Button size="lg" variant="outline" onClick={onRetry}>{t('stock.tryAgainSafe')}</Button>
          </div>
        </Panel>
      );
    case 'not_saved':
      return (
        <Panel tone="primary" icon={<XCircle className="size-12 text-primary" aria-hidden />} title={t('stock.notSavedTitle')}>
          <p role="status" className="text-base">{t('stock.notSavedBody')}</p>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button size="lg" onClick={onRetry}>{t('stock.tryAgainSafe')}</Button>
            <Button size="lg" variant="outline" onClick={onBackToEdit}>{t('common.edit')}</Button>
          </div>
        </Panel>
      );
    case 'failed':
      return (
        <Panel tone="destructive" icon={state.offline ? <WifiOff className="size-12 text-destructive" aria-hidden /> : <AlertTriangle className="size-12 text-destructive" aria-hidden />} title={t('stock.failedTitle')}>
          <p role="alert" className="max-w-md text-base">{state.offline ? t('offline.cannotSave') : errorMessage(state.error)}</p>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button size="lg" onClick={onRetry}>{t('stock.tryAgainSafe')}</Button>
            <Button size="lg" variant="outline" onClick={onBackToEdit}>{t('common.edit')}</Button>
          </div>
        </Panel>
      );
    default:
      return null;
  }
}
