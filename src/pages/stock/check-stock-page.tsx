import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowDownToLine, ClipboardCheck, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/common/page-header';
import { ErrorState } from '@/components/common/states';
import { ProductPicker } from '@/components/inventory/product-picker';
import { ProductName } from '@/components/inventory/product-name';
import { StockStatusBadge } from '@/components/inventory/stock-status-badge';
import { useI18n } from '@/features/i18n/i18n-provider';
import { useAuth } from '@/features/auth/auth-provider';
import { useProduct } from '@/features/products/queries';
import { formatDateTime, formatQuantity } from '@/lib/format';
import type { Product } from '@/types';

function Balance({ id }: { id: string }) {
  const { t, locale } = useI18n();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const q = useProduct(id); // always fresh from the server, not the search result
  if (q.isLoading) return <Skeleton className="h-56 rounded-xl" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const p = q.data!;
  const unit = p.base_unit.code;
  return (
    <Card className="p-6 text-center">
      <p className="text-lg font-semibold"><ProductName name={p.name} /></p>
      <p className="mt-3 text-5xl font-bold tabular" aria-live="polite">{formatQuantity(p.current_stock, unit, locale)}</p>
      <div className="mt-3 flex justify-center"><StockStatusBadge status={p.stock_status} /></div>
      <p className="mt-2 text-sm text-muted-foreground">{t('dashboard.minLabel', { value: formatQuantity(p.min_stock, unit, locale) })} · {formatDateTime(p.updated_at, locale)}</p>
      {hasPermission('inventory:write') && (
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <Button size="lg" variant="outline" onClick={() => navigate(`/stock/in?product=${p.id}`)}><ArrowDownToLine className="text-success" aria-hidden />{t('nav.addStock')}</Button>
          <Button size="lg" variant="outline" onClick={() => navigate(`/stock/sale?product=${p.id}`)}><ShoppingCart className="text-primary" aria-hidden />{t('nav.recordSale')}</Button>
          {hasPermission('inventory:adjust') && <Button size="lg" variant="outline" onClick={() => navigate(`/stock/adjust?product=${p.id}`)}><ClipboardCheck className="text-warning" aria-hidden />{t('nav.correctStock')}</Button>}
        </div>
      )}
      <Button asChild variant="link" className="mt-2"><Link to={`/products/${p.id}`}>{t('products.history')}</Link></Button>
    </Card>
  );
}

export default function CheckStockPage() {
  const { t } = useI18n();
  const [product, setProduct] = useState<Product | null>(null);
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={t('stock.checkTitle')} description={t('stock.checkSubtitle')} />
      <div className="space-y-4">
        <Card className="p-4"><ProductPicker label={t('stock.product')} value={product} onChange={setProduct} autoFocus /></Card>
        {product ? <Balance id={product.id} /> : <p className="py-6 text-center text-sm text-muted-foreground">{t('stock.checkEmpty')}</p>}
      </div>
    </div>
  );
}
