import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, PackageSearch, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/features/i18n/i18n-provider';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatQuantity } from '@/lib/format';
import { productService } from '@/services/product-service';
import { useErrorMessage } from '@/hooks/use-error-message';
import type { Product } from '@/types';
import { StockStatusBadge } from './stock-status-badge';
import { ProductName } from './product-name';

interface Props {
  value: Product | null;
  onChange: (p: Product | null) => void;
  label: string;
  error?: string;
  autoFocus?: boolean;
}

/** Large, touch-friendly product search. Server-side search (works with Telugu names), max 8 results. */
export function ProductPicker({ value, onChange, label, error, autoFocus }: Props) {
  const { t, locale } = useI18n();
  const errorMessage = useErrorMessage();
  const id = useId();
  const [q, setQ] = useState('');
  const search = useDebouncedValue(q.trim(), 300);

  const results = useQuery({
    queryKey: ['products', 'picker', search],
    queryFn: () => productService.list({ search, page_size: 8, status: 'active', sort: 'name', order: 'asc' }),
    enabled: !value && search.length > 0,
  });

  if (value) {
    return (
      <div className="space-y-1.5">
        <p className="text-sm font-medium">{label}</p>
        <div className="flex items-center gap-3 rounded-lg border-2 border-primary bg-primary-soft/60 p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold"><ProductName name={value.name} /></p>
            <p className="text-sm text-muted-foreground tabular">
              {t('stock.nowInStock')}: {formatQuantity(value.current_stock, value.base_unit.code, locale)}
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => onChange(null)}>{t('common.change')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          id={id} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('stock.productPlaceholder')} autoFocus={autoFocus}
          autoComplete="off" enterKeyHint="search" className="h-12 pl-10 pr-10 text-base" aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined} role="combobox" aria-expanded={!!results.data?.items.length} aria-controls={`${id}-list`}
        />
        {q && (
          <button type="button" onClick={() => setQ('')} className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted" aria-label={t('common.clear')}>
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>
      {error && <p id={`${id}-err`} role="alert" className="text-sm font-medium text-destructive">{error}</p>}

      <div aria-live="polite">
        {results.isFetching && <p className="flex items-center gap-2 py-3 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden />{t('common.loading')}</p>}
        {results.isError && <p role="alert" className="py-3 text-sm text-destructive">{errorMessage(results.error)}</p>}
        {results.data && !results.data.items.length && !results.isFetching && (
          <p className="flex items-center gap-2 py-3 text-sm text-muted-foreground"><PackageSearch className="size-4" aria-hidden />{t('stock.noProductMatch')}</p>
        )}
        {!!results.data?.items.length && (
          <ul id={`${id}-list`} role="listbox" className="mt-2 divide-y overflow-hidden rounded-lg border bg-surface">
            {results.data.items.map((p) => (
              <li key={p.id} role="option" aria-selected={false}>
                <button type="button" onClick={() => { onChange(p); setQ(''); }} className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium"><ProductName name={p.name} /></p>
                    <p className="text-xs text-muted-foreground tabular">{p.sku} · {formatQuantity(p.current_stock, p.base_unit.code, locale)}</p>
                  </div>
                  <StockStatusBadge status={p.stock_status} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
