import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/features/i18n/i18n-provider';
import { cn } from '@/lib/utils';

/** Submits to the Products page, which performs a server-side search. */
export function GlobalSearch({ className }: { className?: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('search') ?? '');

  useEffect(() => setQ(params.get('search') ?? ''), [params]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = q.trim();
    navigate(value ? `/products?search=${encodeURIComponent(value)}` : '/products');
  };

  return (
    <form role="search" onSubmit={submit} className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('top.search')} aria-label={t('top.search')} className="pl-9" type="search" />
    </form>
  );
}
