import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/features/i18n/i18n-provider';
import type { StockStatus } from '@/types';

const MAP = {
  in_stock: { variant: 'success', Icon: CheckCircle2 },
  low_stock: { variant: 'warning', Icon: AlertTriangle },
  out_of_stock: { variant: 'destructive', Icon: XCircle },
} as const;

/** Status uses icon + text, never colour alone. */
export function StockStatusBadge({ status }: { status: StockStatus }) {
  const { t } = useI18n();
  const { variant, Icon } = MAP[status];
  return (
    <Badge variant={variant}>
      <Icon aria-hidden />
      {t(`status.${status}`)}
    </Badge>
  );
}
