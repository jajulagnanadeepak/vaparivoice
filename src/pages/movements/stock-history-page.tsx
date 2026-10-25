import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { ClipboardCheck, History, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState, ErrorState } from '@/components/common/states';
import { Pagination } from '@/components/common/pagination';
import { MovementList } from '@/components/inventory/movement-list';
import { useI18n } from '@/features/i18n/i18n-provider';
import { useAuth } from '@/features/auth/auth-provider';
import { inventoryService } from '@/services/inventory-service';

const PAGE_SIZE = 20;

export default function StockHistoryPage() {
  const { t } = useI18n();
  const { hasPermission } = useAuth();
  const [params, setParams] = useSearchParams();
  const f = {
    movement_type: params.get('type') ?? '', source: params.get('source') ?? '', date_from: params.get('from') ?? '', date_to: params.get('to') ?? '',
    product_id: params.get('product') ?? '', page: Math.max(1, Number(params.get('page') ?? 1) || 1),
  };
  const set = (k: string, v: string) => { const n = new URLSearchParams(params); if (v) n.set(k, v); else n.delete(k); if (k !== 'page') n.delete('page'); setParams(n, { replace: true }); };

  const q = useQuery({
    queryKey: ['movements', 'list', f],
    queryFn: () => inventoryService.movements({
      page: f.page, page_size: PAGE_SIZE, movement_type: f.movement_type || undefined, source: f.source || undefined,
      date_from: f.date_from || undefined, date_to: f.date_to || undefined, product_id: f.product_id || undefined,
    }),
    placeholderData: keepPreviousData,
  });
  const canAdjust = hasPermission('inventory:adjust');

  return (
    <>
      <PageHeader title={t('history.title')} description={t('history.subtitle')} />
      <Card className="mb-4 grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1"><Label htmlFor="h-type">{t('history.type')}</Label>
          <NativeSelect id="h-type" value={f.movement_type} onChange={(e) => set('type', e.target.value)}>
            <option value="">{t('history.allTypes')}</option>
            {(['stock_in', 'stock_out', 'adjustment', 'opening'] as const).map((m) => <option key={m} value={m}>{t(`movement.${m}`)}</option>)}
          </NativeSelect></div>
        <div className="space-y-1"><Label htmlFor="h-src">{t('history.source')}</Label>
          <NativeSelect id="h-src" value={f.source} onChange={(e) => set('source', e.target.value)}>
            <option value="">{t('history.allSources')}</option>
            <option value="voice">{t('movement.voice')}</option>
            <option value="manual">{t('movement.manual')}</option>
          </NativeSelect></div>
        <div className="space-y-1"><Label htmlFor="h-from">{t('history.from')}</Label><Input id="h-from" type="date" value={f.date_from} max={f.date_to || undefined} onChange={(e) => set('from', e.target.value)} /></div>
        <div className="space-y-1"><Label htmlFor="h-to">{t('history.to')}</Label><Input id="h-to" type="date" value={f.date_to} min={f.date_from || undefined} onChange={(e) => set('to', e.target.value)} /></div>
      </Card>
      {canAdjust && <p className="mb-3 flex gap-2 text-sm text-muted-foreground"><Info className="mt-0.5 size-4 shrink-0" aria-hidden />{t('stock.wrongEntry')}</p>}

      {q.isLoading ? <div className="space-y-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16" />)}</div>
        : q.isError ? <ErrorState error={q.error} onRetry={() => void q.refetch()} />
        : !q.data?.items.length ? <EmptyState icon={History} title={t('history.empty')} />
        : (
          <Card className="px-4" aria-busy={q.isFetching}>
            <MovementList
              items={q.data.items}
              absoluteTime
              renderAction={canAdjust ? (m) => (
                <Link to={`/stock/adjust?product=${m.product.id}`} className="inline-flex min-h-9 items-center gap-1 text-sm font-medium text-primary hover:underline">
                  <ClipboardCheck className="size-4" aria-hidden />{t('stock.correctThis')}
                </Link>
              ) : undefined}
            />
            <div className="pb-4"><Pagination page={q.data.page} pageSize={q.data.page_size} total={q.data.total} onPageChange={(p) => set('page', String(p))} /></div>
          </Card>
        )}
    </>
  );
}
