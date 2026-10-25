import { ArrowDownLeft, ArrowUpRight, ClipboardCheck, PackagePlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/features/i18n/i18n-provider';
import type { MovementType } from '@/types';

const MAP = {
  stock_in: { variant: 'success', Icon: ArrowDownLeft },
  stock_out: { variant: 'default', Icon: ArrowUpRight },
  adjustment: { variant: 'warning', Icon: ClipboardCheck },
  opening: { variant: 'secondary', Icon: PackagePlus },
} as const;

export function MovementTypeBadge({ type }: { type: MovementType }) {
  const { t } = useI18n();
  const { variant, Icon } = MAP[type];
  return <Badge variant={variant}><Icon aria-hidden />{t(`movement.${type}`)}</Badge>;
}
