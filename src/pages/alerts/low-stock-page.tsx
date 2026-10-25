import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState, ErrorState } from '@/components/common/states';
import { ProductName } from '@/components/inventory/product-name';
import { StockStatusBadge } from '@/components/inventory/stock-status-badge';
import { useI18n } from '@/features/i18n/i18n-provider';
import { useAuth } from '@/features/auth/auth-provider';
import { queryKeys } from '@/lib/query-client';
import { formatQuantity, formatRelative } from '@/lib/format';
import { alertService } from '@/services/alert-service';

/** Threshold-based alerts only (no forecasts here). Each row explains why it is listed. */
export default function LowStockPage() {
  const { t, locale } = useI18n();
  const { hasPermission } = useAuth();
  const q = useQuery({ queryKey: queryKeys.alerts.lowStock(100), queryFn: () => alertService.lowStock(100) });

  return (
    <>
      <PageHeader title={t('lowStock.title')} description={t('lowStock.subtitle')} />
      {q.isLoading ? <div className="space-y-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        : q.isError ? <ErrorState error={q.error} onRetry={() => void q.refetch()} />
        : !q.data?.length ? <EmptyState icon={PartyPopper} title={t('lowStock.empty')} />
        : (
          <ul className="grid gap-3 md:grid-cols-2">
            {/* Out of stock first, then lowest relative to minimum */}
            {[...q.data].sort((a, b) => (a.stock_status === b.stock_status ? 0 : a.stock_status === 'out_of_stock' ? -1 : 1)).map((p) => {
              const cur = formatQuantity(p.current_stock, p.base_unit_code, locale);
              return (
                <li key={p.product_id}>
                  <Card className="flex h-full flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/products/${p.product_id}`} className="min-w-0 font-semibold hover:underline"><ProductName name={p.name} /></Link>
                      <StockStatusBadge status={p.stock_status} />
                    </div>
                    <p className="text-2xl font-bold tabular">{cur}</p>
                    <p className="text-sm text-muted-foreground">
                      {p.stock_status === 'out_of_stock' ? t('lowStock.whyOut') : t('lowStock.why', { current: cur, min: formatQuantity(p.min_stock, p.base_unit_code, locale) })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.preferred_supplier && <>{t('lowStock.supplier', { name: p.preferred_supplier })} · </>}
                      {p.last_movement_at && t('lowStock.lastMove', { when: formatRelative(p.last_movement_at, locale) })}
                    </p>
                    {hasPermission('inventory:write') && (
                      <Button asChild size="lg" variant="outline" className="mt-auto"><Link to={`/stock/in?product=${p.product_id}`}><ArrowDownToLine className="text-success" aria-hidden />{t('nav.addStock')}</Link></Button>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
    </>
  );
}
