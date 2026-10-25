import type { ReactNode } from 'react';
import { Mic } from 'lucide-react';
import { useI18n } from '@/features/i18n/i18n-provider';
import { formatDateTime, formatQuantity, formatRelative, toNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { StockMovement } from '@/types';
import type { TranslationKey } from '@/locales';
import { MovementTypeBadge } from './movement-type-badge';
import { ProductName } from './product-name';

const KNOWN_REASONS = new Set(['sold', 'damaged', 'expired', 'internal_use', 'other']);

interface Props {
  items: StockMovement[];
  showProduct?: boolean;
  absoluteTime?: boolean;
  renderAction?: (m: StockMovement) => ReactNode;
}

/** Movement list shared by Home, product detail and Stock History. Records are read-only. */
export function MovementList({ items, showProduct = true, absoluteTime = false, renderAction }: Props) {
  const { t, locale } = useI18n();
  return (
    <ul className="divide-y">
      {items.map((m) => {
        const change = toNumber(m.base_quantity_change);
        const reason = m.reason && KNOWN_REASONS.has(m.reason) ? t(`movement.reason_${m.reason}` as TranslationKey) : m.reason;
        return (
          <li key={m.id} className="flex items-start justify-between gap-3 py-3">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <MovementTypeBadge type={m.movement_type} />
                {m.source === 'voice' && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Mic className="size-3" aria-hidden />{t('movement.voice')}</span>}
              </div>
              {showProduct && <p className="truncate text-sm font-medium"><ProductName name={m.product.name} /></p>}
              <p className="text-xs text-muted-foreground">
                {formatQuantity(m.quantity, m.unit_code, locale)}{reason ? ` · ${reason}` : ''} · {t('movement.by', { name: m.performed_by.full_name })} ·{' '}
                <time dateTime={m.created_at}>{absoluteTime ? formatDateTime(m.created_at, locale) : formatRelative(m.created_at, locale)}</time>
              </p>
              {absoluteTime && <p className="text-xs text-muted-foreground">{t('stock.refLabel')}: {m.reference}</p>}
              {renderAction?.(m)}
            </div>
            <div className="shrink-0 text-right">
              <p className={cn('text-sm font-semibold tabular', change > 0 ? 'text-success' : change < 0 ? 'text-foreground' : 'text-muted-foreground')}>
                {change > 0 ? '+' : ''}{formatQuantity(m.base_quantity_change, m.base_unit_code, locale)}
              </p>
              <p className="text-xs text-muted-foreground tabular">→ {formatQuantity(m.balance_after, m.base_unit_code, locale)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
