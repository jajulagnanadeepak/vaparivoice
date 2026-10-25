import type { ReactNode } from 'react';
import { AlertTriangle, type LucideIcon, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/features/i18n/i18n-provider';
import { useErrorMessage } from '@/hooks/use-error-message';
import { cn } from '@/lib/utils';

export function EmptyState({ icon: Icon = Inbox, title, body, action, className }: { icon?: LucideIcon; title: string; body?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-surface px-6 py-10 text-center', className)}>
      <div className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary"><Icon className="size-6" aria-hidden /></div>
      <div>
        <p className="font-semibold">{title}</p>
        {body && <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry, className, compact }: { error: unknown; onRetry?: () => void; className?: string; compact?: boolean }) {
  const { t } = useI18n();
  const message = useErrorMessage()(error);
  return (
    <div role="alert" className={cn('flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive-soft px-6 text-center', compact ? 'py-5' : 'py-10', className)}>
      <AlertTriangle className="size-6 text-destructive" aria-hidden />
      <div>
        <p className="font-semibold text-destructive">{t('common.errorTitle')}</p>
        <p className="mt-1 text-sm text-foreground/80">{message}</p>
      </div>
      {onRetry && <Button variant="outline" size="sm" onClick={onRetry}>{t('common.retry')}</Button>}
    </div>
  );
}
