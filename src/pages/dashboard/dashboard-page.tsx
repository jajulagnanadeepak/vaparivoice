import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowDownToLine, History, IndianRupee, type LucideIcon, Mic, Package, PackageMinus, PackagePlus, PackageX, Search, ShoppingCart, Sparkles } from 'lucide-react';
import { ProductName } from '@/components/inventory/product-name';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState, ErrorState } from '@/components/common/states';
import { StockMovementChart } from '@/components/charts/stock-movement-chart';
import { StockStatusBadge } from '@/components/inventory/stock-status-badge';
import { MovementList } from '@/components/inventory/movement-list';
import { useI18n } from '@/features/i18n/i18n-provider';
import { useShop } from '@/features/shops/shop-provider';
import { useDashboardSummary, useFrequentProducts, useLowStock, useMovementTrend, useRecentMovements, useReorderSuggestions } from '@/features/dashboard/queries';
import { formatCurrency, formatQuantity } from '@/lib/format';
import { cn } from '@/lib/utils';

type Tone = 'primary' | 'success' | 'warning' | 'destructive';
const toneClass: Record<Tone, string> = {
  primary: 'bg-primary-soft text-primary', success: 'bg-success-soft text-success', warning: 'bg-warning-soft text-warning', destructive: 'bg-destructive-soft text-destructive',
};

function StatCard({ label, value, hint, icon: Icon, tone, to }: { label: string; value: ReactNode; hint?: string; icon: LucideIcon; tone: Tone; to?: string }) {
  const body = (
    <Card className={cn('h-full p-4 transition-shadow', to && 'hover:shadow-raised')}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className={cn('flex size-9 items-center justify-center rounded-lg', toneClass[tone])}><Icon className="size-[18px]" aria-hidden /></span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
  return to ? <Link to={to} className="rounded-xl focus-visible:ring-2 focus-visible:ring-ring">{body}</Link> : body;
}

function SectionCard({ title, description, action, children, className }: { title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
        <div><CardTitle>{title}</CardTitle>{description && <CardDescription className="mt-1">{description}</CardDescription>}</div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

const ListSkeleton = ({ rows = 4 }: { rows?: number }) => <div className="space-y-3">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>;
const Muted = ({ children }: { children: ReactNode }) => <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>;

function QuickActions() {
  const { t } = useI18n();
  const actions = [
    { to: '/stock/in', label: t('nav.addStock'), icon: ArrowDownToLine, cls: 'text-success bg-success-soft' },
    { to: '/stock/sale', label: t('nav.recordSale'), icon: ShoppingCart, cls: 'text-primary bg-primary-soft' },
    { to: '/stock/out', label: t('nav.removeStock'), icon: PackageMinus, cls: 'text-primary bg-primary-soft' },
    { to: '/stock/check', label: t('nav.checkStock'), icon: Search, cls: 'text-primary bg-primary-soft' },
    { to: '/alerts', label: t('nav.alerts'), icon: AlertTriangle, cls: 'text-warning bg-warning-soft' },
    { to: '/movements', label: t('nav.movements'), icon: History, cls: 'text-muted-foreground bg-muted' },
  ];
  return (
    <SectionCard title={t('dashboard.quickActions')}>
      <Button asChild size="xl" className="mb-3 w-full"><Link to="/voice"><Mic aria-hidden />{t('dashboard.openVoice')}</Link></Button>
      <div className="grid grid-cols-2 gap-2">
        {actions.map(({ to, label, icon: Icon, cls }) => (
          <Link key={to} to={to} className="flex min-h-[5.5rem] flex-col items-start justify-between gap-2 rounded-xl border p-3 text-base font-semibold transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
            <span className={cn('flex size-10 items-center justify-center rounded-lg', cls)}><Icon className="size-5" aria-hidden /></span>{label}
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}

export default function DashboardPage() {
  const { t, locale } = useI18n();
  const { activeShop } = useShop();
  const summary = useDashboardSummary();
  const trend = useMovementTrend(30);
  const low = useLowStock(6);
  const recent = useRecentMovements(6);
  const frequent = useFrequentProducts();
  const reorder = useReorderSuggestions();

  const header = <PageHeader title={t('dashboard.title')} description={activeShop ? t('dashboard.subtitle', { shop: activeShop.name }) : undefined} />;

  if (summary.isError) return <>{header}<ErrorState error={summary.error} onRetry={() => void summary.refetch()} /></>;

  // First-run: no products yet → guide the user instead of showing zeros.
  if (summary.data && summary.data.active_products === 0) {
    return (
      <>
        {header}
        <EmptyState
          icon={Package}
          title={t('dashboard.emptyTitle')}
          body={t('dashboard.emptyBody')}
          action={<div className="flex flex-wrap justify-center gap-2">
            <Button asChild><Link to="/products?new=1"><PackagePlus aria-hidden />{t('dashboard.addProduct')}</Link></Button>
            <Button asChild variant="outline"><Link to="/voice"><Mic aria-hidden />{t('dashboard.openVoice')}</Link></Button>
          </div>}
        />
      </>
    );
  }

  const s = summary.data;
  return (
    <>
      {header}
      {/* On phones and tablets, the everyday actions come first, within thumb reach. */}
      <div className="mb-6 lg:hidden"><QuickActions /></div>
      <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {summary.isLoading || !s ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className={cn('h-[7.25rem] rounded-xl', i === 4 && 'col-span-2 lg:col-span-1')} />) : (
          <>
            <StatCard label={t('dashboard.activeProducts')} value={s.active_products.toLocaleString(locale)} icon={Package} tone="primary" to="/products" />
            <StatCard label={t('dashboard.inventoryValue')} value={formatCurrency(s.inventory_value, locale)} hint={t('dashboard.inventoryValueHint')} icon={IndianRupee} tone="success" />
            <StatCard label={t('dashboard.lowStock')} value={s.low_stock_count} icon={AlertTriangle} tone="warning" to="/products?stock_status=low_stock" />
            <StatCard label={t('dashboard.outOfStock')} value={s.out_of_stock_count} icon={PackageX} tone="destructive" to="/products?stock_status=out_of_stock" />
            <div className="col-span-2 lg:col-span-1"><StatCard label={t('dashboard.recentMovements')} value={s.movements_last_7_days} icon={History} tone="primary" to="/movements" /></div>
          </>
        )}
      </section>


      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title={t('dashboard.trend')} description={t('dashboard.trendDesc')}>
            {trend.isLoading ? <Skeleton className="h-64" /> : trend.isError ? <ErrorState compact error={trend.error} onRetry={() => void trend.refetch()} />
              : !trend.data?.some((d) => d.stock_in_count + d.stock_out_count + d.adjustment_count > 0) ? <Muted>{t('dashboard.noTrend')}</Muted>
              : <StockMovementChart data={trend.data} />}
          </SectionCard>

          <SectionCard title={t('dashboard.recentTransactions')} action={<Button asChild variant="link" size="sm" className="h-auto p-0"><Link to="/movements">{t('common.viewAll')}</Link></Button>}>
            {recent.isLoading ? <ListSkeleton /> : recent.isError ? <ErrorState compact error={recent.error} onRetry={() => void recent.refetch()} />
              : !recent.data?.length ? <Muted>{t('dashboard.noMovements')}</Muted> : <MovementList items={recent.data} />}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <div className="hidden lg:block"><QuickActions /></div>

          <SectionCard title={t('dashboard.lowStockList')} action={<Button asChild variant="link" size="sm" className="h-auto p-0"><Link to="/alerts">{t('common.viewAll')}</Link></Button>}>
            {low.isLoading ? <ListSkeleton /> : low.isError ? <ErrorState compact error={low.error} onRetry={() => void low.refetch()} />
              : !low.data?.length ? <Muted>{t('dashboard.noLow')}</Muted> : (
                <ul className="divide-y">
                  {low.data.map((p) => (
                    <li key={p.product_id}>
                      <Link to={`/products/${p.product_id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium"><ProductName name={p.name} /></p>
                          <p className="text-xs text-muted-foreground tabular">{formatQuantity(p.current_stock, p.base_unit_code, locale)} · {t('dashboard.minLabel', { value: formatQuantity(p.min_stock, p.base_unit_code, locale) })}</p>
                        </div>
                        <StockStatusBadge status={p.stock_status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
          </SectionCard>

          <SectionCard title={t('dashboard.reorder')} description={t('dashboard.reorderBasis')}>
            {reorder.isLoading ? <ListSkeleton rows={3} /> : reorder.isError ? <ErrorState compact error={reorder.error} onRetry={() => void reorder.refetch()} />
              : !reorder.data?.length ? <Muted>{t('dashboard.noReorder')}</Muted> : (
                <ul className="divide-y">
                  {reorder.data.map((r) => (
                    <li key={r.product_id} className="py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium"><ProductName name={r.name} /></p>
                        <span className="shrink-0 text-sm font-semibold tabular">+{formatQuantity(r.suggested_quantity, r.base_unit_code, locale)}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{r.explanation}</p>
                      {r.basis === 'forecast' && <Badge variant="secondary" className="mt-1"><Sparkles aria-hidden />{t('dashboard.forecastBasis')}</Badge>}
                    </li>
                  ))}
                </ul>
              )}
          </SectionCard>

          <SectionCard title={t('dashboard.frequent')}>
            {frequent.isLoading ? <ListSkeleton rows={3} /> : frequent.isError ? <ErrorState compact error={frequent.error} onRetry={() => void frequent.refetch()} />
              : !frequent.data?.length ? <Muted>{t('dashboard.noMovements')}</Muted> : (
                <ol className="space-y-2">
                  {frequent.data.map((f, i) => (
                    <li key={f.product_id} className="flex items-center gap-3 text-sm">
                      <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">{i + 1}</span>
                      <Link to={`/products/${f.product_id}`} className="min-w-0 flex-1 truncate hover:underline"><ProductName name={f.name} /></Link>
                      <span className="text-xs text-muted-foreground">{t('dashboard.moves', { count: f.movement_count })}</span>
                    </li>
                  ))}
                </ol>
              )}
          </SectionCard>
        </div>
      </div>
    </>
  );
}
