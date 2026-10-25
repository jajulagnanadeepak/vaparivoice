import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Archive, ArrowDownLeft, ArrowLeft, ArrowUpRight, ClipboardCheck, PackageX, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { EmptyState, ErrorState } from '@/components/common/states';
import { Pagination } from '@/components/common/pagination';
import { StockStatusBadge } from '@/components/inventory/stock-status-badge';
import { ProductName } from '@/components/inventory/product-name';
import { MovementList } from '@/components/inventory/movement-list';
import { ProductFormDialog } from '@/components/inventory/product-form-dialog';
import { ArchiveProductDialog } from '@/components/inventory/archive-product-dialog';
import { useI18n } from '@/features/i18n/i18n-provider';
import { useAuth } from '@/features/auth/auth-provider';
import { useProduct, useProductMovements } from '@/features/products/queries';
import { ApiError } from '@/lib/api-error';
import { formatCurrency, formatDateTime, formatQuantity } from '@/lib/format';

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

export default function ProductDetailPage() {
  const { id = '' } = useParams();
  const { t, locale } = useI18n();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const product = useProduct(id);
  const [page, setPage] = useState(1);
  const movements = useProductMovements(id, page);
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const back = <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3"><Link to="/products"><ArrowLeft aria-hidden />{t('products.title')}</Link></Button>;

  if (product.isLoading) return <div className="space-y-4">{back}<Skeleton className="h-10 w-64" /><Skeleton className="h-40" /><Skeleton className="h-64" /></div>;
  if (product.isError) {
    if (product.error instanceof ApiError && product.error.kind === 'not_found') return <>{back}<EmptyState icon={PackageX} title={t('products.notFound')} /></>;
    return <>{back}<ErrorState error={product.error} onRetry={() => void product.refetch()} /></>;
  }
  const p = product.data!;
  const unit = p.base_unit.code;
  const archived = p.status === 'archived';

  return (
    <>
      {back}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold"><ProductName name={p.name} /></h1>
            {archived ? <Badge variant="secondary">{t('status.archived')}</Badge> : <StockStatusBadge status={p.stock_status} />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{p.sku}{p.category ? ` · ${p.category.name}` : ''}</p>
        </div>
        {!archived && hasPermission('product:write') && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil aria-hidden />{t('common.edit')}</Button>
            <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setArchiveOpen(true)}><Archive aria-hidden />{t('common.archive')}</Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card className="p-5">
            <p className="text-sm font-medium text-muted-foreground">{t('products.balance')}</p>
            <p className="mt-1 text-3xl font-semibold tabular">{formatQuantity(p.current_stock, unit, locale)}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.minLabel', { value: formatQuantity(p.min_stock, unit, locale) })}</p>
            {!archived && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {/* Stock changes only through dedicated, auditable movement screens. */}
                <Button variant="outline" className="h-auto flex-col gap-1 py-3 text-xs" onClick={() => navigate(`/stock/in?product=${p.id}`)}><ArrowDownLeft className="text-success" aria-hidden />{t('nav.addStock')}</Button>
                <Button variant="outline" className="h-auto flex-col gap-1 py-3 text-xs" onClick={() => navigate(`/stock/sale?product=${p.id}`)}><ArrowUpRight className="text-primary" aria-hidden />{t('nav.recordSale')}</Button>
                <Button variant="outline" className="h-auto flex-col gap-1 py-3 text-xs" onClick={() => navigate(`/stock/adjust?product=${p.id}`)}><ClipboardCheck className="text-warning" aria-hidden />{t('nav.correctStock')}</Button>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader><CardTitle>{t('products.details')}</CardTitle></CardHeader>
            <CardContent>
              <dl className="divide-y">
                <Detail label={t('products.baseUnit')}>{p.base_unit.name}</Detail>
                <Detail label={t('products.barcode')}>{p.barcode ?? '—'}</Detail>
                <Detail label={t('products.supplier')}>{p.preferred_supplier?.name ?? '—'}</Detail>
                <Detail label={t('products.purchaseCost')}>{p.purchase_cost ? formatCurrency(p.purchase_cost, locale) : '—'}</Detail>
                <Detail label={t('products.sellingPrice')}>{p.selling_price ? formatCurrency(p.selling_price, locale) : '—'}</Detail>
                <Detail label={t('products.updated')}>{formatDateTime(p.updated_at, locale)}</Detail>
              </dl>
              {p.description && <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{p.description}</p>}
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>{t('products.history')}</CardTitle></CardHeader>
          <CardContent>
            {movements.isLoading ? <div className="space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>
              : movements.isError ? <ErrorState compact error={movements.error} onRetry={() => void movements.refetch()} />
              : !movements.data?.items.length ? <p className="py-8 text-center text-sm text-muted-foreground">{t('products.noHistory')}</p>
              : <>
                  <MovementList items={movements.data.items} showProduct={false} />
                  <Pagination page={movements.data.page} pageSize={movements.data.page_size} total={movements.data.total} onPageChange={setPage} />
                </>}
          </CardContent>
        </Card>
      </div>

      <ProductFormDialog open={editOpen} onOpenChange={setEditOpen} product={p} />
      <ArchiveProductDialog product={archiveOpen ? p : null} onOpenChange={setArchiveOpen} onArchived={() => navigate('/products')} />
    </>
  );
}
