import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Archive, ArrowDownUp, Eye, MoreVertical, Package, PackagePlus, Pencil, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState, ErrorState } from '@/components/common/states';
import { Pagination } from '@/components/common/pagination';
import { StockStatusBadge } from '@/components/inventory/stock-status-badge';
import { ProductName } from '@/components/inventory/product-name';
import { ProductFormDialog } from '@/components/inventory/product-form-dialog';
import { ArchiveProductDialog } from '@/components/inventory/archive-product-dialog';
import { useI18n } from '@/features/i18n/i18n-provider';
import { useAuth } from '@/features/auth/auth-provider';
import { useCategories, useProducts } from '@/features/products/queries';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatCurrency, formatQuantity, formatRelative } from '@/lib/format';
import type { Product, ProductListParams, ProductSortField, SortOrder, StockStatus } from '@/types';

const PAGE_SIZE = 20;
const STOCK_STATUSES: StockStatus[] = ['in_stock', 'low_stock', 'out_of_stock'];

/** Filters live in the URL so they survive refresh and can be shared. */
function useProductFilters() {
  const [params, setParams] = useSearchParams();
  const filters: Required<Pick<ProductListParams, 'page' | 'sort' | 'order'>> & ProductListParams = {
    search: params.get('search') ?? '',
    category_id: params.get('category_id') ?? '',
    stock_status: (params.get('stock_status') as StockStatus | null) ?? undefined,
    sort: (params.get('sort') as ProductSortField | null) ?? 'name',
    order: (params.get('order') as SortOrder | null) ?? 'asc',
    page: Math.max(1, Number(params.get('page') ?? 1) || 1),
  };
  const update = (patch: Partial<Record<string, string | number | undefined>>, resetPage = true) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === '') next.delete(k);
      else next.set(k, String(v));
    }
    if (resetPage && !('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };
  return { filters, update, params, setParams };
}

export default function ProductsPage() {
  const { t, locale } = useI18n();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('product:write');
  const navigate = useNavigate();
  const { filters, update, params, setParams } = useProductFilters();
  const categories = useCategories();

  const [searchInput, setSearchInput] = useState(filters.search ?? '');
  const debouncedSearch = useDebouncedValue(searchInput, 350);
  useEffect(() => { if (debouncedSearch !== (filters.search ?? '')) update({ search: debouncedSearch }); }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setSearchInput(filters.search ?? ''), [filters.search]);

  const [formOpen, setFormOpen] = useState(params.get('new') === '1');
  const [editing, setEditing] = useState<Product | undefined>();
  const [archiving, setArchiving] = useState<Product | null>(null);
  useEffect(() => {
    if (params.get('new') === '1') { const n = new URLSearchParams(params); n.delete('new'); setParams(n, { replace: true }); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const queryParams = useMemo<ProductListParams>(() => ({
    search: filters.search || undefined, category_id: filters.category_id || undefined, stock_status: filters.stock_status,
    sort: filters.sort, order: filters.order, page: filters.page, page_size: PAGE_SIZE, status: 'active',
  }), [filters.search, filters.category_id, filters.stock_status, filters.sort, filters.order, filters.page]);
  const { data, isLoading, isError, error, refetch, isFetching } = useProducts(queryParams);

  const hasFilters = !!(filters.search || filters.category_id || filters.stock_status);
  const openCreate = () => { setEditing(undefined); setFormOpen(true); };
  const openEdit = (p: Product) => { setEditing(p); setFormOpen(true); };

  const RowActions = ({ p }: { p: Product }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`${t('products.actions')}: ${p.name}`}><MoreVertical aria-hidden /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => navigate(`/products/${p.id}`)}><Eye aria-hidden />{t('common.view')}</DropdownMenuItem>
        {canWrite && <DropdownMenuItem onSelect={() => openEdit(p)}><Pencil aria-hidden />{t('common.edit')}</DropdownMenuItem>}
        {canWrite && <><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setArchiving(p)}><Archive aria-hidden />{t('common.archive')}</DropdownMenuItem></>}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <PageHeader
        title={t('products.title')}
        description={t('products.subtitle')}
        actions={canWrite && <Button onClick={openCreate}><PackagePlus aria-hidden />{t('products.add')}</Button>}
      />

      {/* Filters */}
      <Card className="mb-4 p-3">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input type="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder={t('products.searchPlaceholder')} aria-label={t('products.searchPlaceholder')} className="pl-9" />
          </div>
          <NativeSelect aria-label={t('products.category')} value={filters.category_id} onChange={(e) => update({ category_id: e.target.value })} className="md:w-48">
            <option value="">{t('products.allCategories')}</option>
            {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </NativeSelect>
          <NativeSelect aria-label={t('products.stockStatus')} value={filters.stock_status ?? ''} onChange={(e) => update({ stock_status: e.target.value })} className="md:w-44">
            <option value="">{t('products.allStatuses')}</option>
            {STOCK_STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
          </NativeSelect>
          <div className="flex gap-2">
            <NativeSelect aria-label={t('products.sortBy')} value={filters.sort} onChange={(e) => update({ sort: e.target.value })} className="md:w-40">
              <option value="name">{t('products.sortName')}</option>
              <option value="current_stock">{t('products.sortStock')}</option>
              <option value="updated_at">{t('products.sortUpdated')}</option>
            </NativeSelect>
            <Button
              variant="outline" size="icon"
              onClick={() => update({ order: filters.order === 'asc' ? 'desc' : 'asc' })}
              aria-label={filters.order === 'asc' ? t('products.ascending') : t('products.descending')}
              title={filters.order === 'asc' ? t('products.ascending') : t('products.descending')}
            >
              <ArrowDownUp aria-hidden className={filters.order === 'desc' ? 'rotate-180' : ''} />
            </Button>
          </div>
        </div>
        {hasFilters && (
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground" aria-live="polite">{data ? t('products.results', { count: data.total }) : ''}</span>
            <Button variant="ghost" size="sm" onClick={() => { setSearchInput(''); update({ search: '', category_id: '', stock_status: '' }); }}>
              <X aria-hidden />{t('products.clearFilters')}
            </Button>
          </div>
        )}
      </Card>

      {isError ? <ErrorState error={error} onRetry={() => void refetch()} />
        : isLoading ? <div className="space-y-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        : !data?.items.length ? (
          hasFilters
            ? <EmptyState icon={Search} title={t('products.noMatches')} action={<Button variant="outline" onClick={() => { setSearchInput(''); update({ search: '', category_id: '', stock_status: '' }); }}>{t('products.clearFilters')}</Button>} />
            : <EmptyState icon={Package} title={t('products.emptyTitle')} body={t('products.emptyBody')} action={canWrite && <Button onClick={openCreate}><PackagePlus aria-hidden />{t('products.add')}</Button>} />
        ) : (
          <div className={isFetching ? 'opacity-70 transition-opacity' : undefined} aria-busy={isFetching}>
            {/* Desktop table */}
            <Card className="hidden overflow-hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{t('products.name')}</TableHead>
                    <TableHead>{t('products.category')}</TableHead>
                    <TableHead className="text-right">{t('products.currentStock')}</TableHead>
                    <TableHead className="text-right">{t('products.minStock')}</TableHead>
                    <TableHead>{t('products.stockStatus')}</TableHead>
                    <TableHead className="text-right">{t('products.sellingPrice')}</TableHead>
                    <TableHead>{t('products.updated')}</TableHead>
                    <TableHead className="w-12"><span className="sr-only">{t('products.actions')}</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link to={`/products/${p.id}`} className="font-medium hover:text-primary hover:underline"><ProductName name={p.name} /></Link>
                        <p className="text-xs text-muted-foreground">{p.sku}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.category?.name ?? '—'}</TableCell>
                      <TableCell className="text-right font-semibold tabular">{formatQuantity(p.current_stock, p.base_unit.code, locale)}</TableCell>
                      <TableCell className="text-right text-muted-foreground tabular">{formatQuantity(p.min_stock, p.base_unit.code, locale)}</TableCell>
                      <TableCell><StockStatusBadge status={p.stock_status} /></TableCell>
                      <TableCell className="text-right tabular">{p.selling_price ? formatCurrency(p.selling_price, locale) : '—'}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground"><time dateTime={p.updated_at}>{formatRelative(p.updated_at, locale)}</time></TableCell>
                      <TableCell><RowActions p={p} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            {/* Mobile cards */}
            <ul className="space-y-2 md:hidden">
              {data.items.map((p) => (
                <li key={p.id}>
                  <Card className="flex items-start gap-3 p-4">
                    <Link to={`/products/${p.id}`} className="min-w-0 flex-1 focus-visible:ring-2 focus-visible:ring-ring">
                      <p className="truncate font-medium"><ProductName name={p.name} /></p>
                      <p className="text-xs text-muted-foreground">{p.sku}{p.category ? ` · ${p.category.name}` : ''}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-lg font-semibold tabular">{formatQuantity(p.current_stock, p.base_unit.code, locale)}</span>
                        <StockStatusBadge status={p.stock_status} />
                      </div>
                    </Link>
                    <RowActions p={p} />
                  </Card>
                </li>
              ))}
            </ul>

            <Pagination page={data.page} pageSize={data.page_size} total={data.total} onPageChange={(page) => update({ page }, false)} />
          </div>
        )}

      <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} product={editing} />
      <ArchiveProductDialog product={archiving} onOpenChange={(o) => !o && setArchiving(null)} />
    </>
  );
}
