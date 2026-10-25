import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { shopService } from '@/services/shop-service';
import { setActiveShopId } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { useAuth } from '@/features/auth/auth-provider';
import type { Shop } from '@/types';

const STORAGE_KEY = 'vs_active_shop'; // a shop id is not a secret; server re-checks membership

interface ShopValue {
  shops: Shop[];
  activeShop: Shop | null;
  isLoading: boolean;
  selectShop: (id: string) => void;
}
const ShopContext = createContext<ShopValue | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));

  const { data: shops = [], isLoading } = useQuery({ queryKey: queryKeys.shops, queryFn: shopService.list, enabled: !!user });

  const activeShop = useMemo(() => shops.find((s) => s.id === selectedId) ?? shops[0] ?? null, [shops, selectedId]);

  // Set synchronously during render so child queries carry the header on first fetch.
  setActiveShopId(activeShop?.id ?? null);
  useEffect(() => {
    if (activeShop) localStorage.setItem(STORAGE_KEY, activeShop.id);
  }, [activeShop]);

  const value = useMemo<ShopValue>(() => ({
    shops,
    activeShop,
    isLoading: !!user && isLoading,
    selectShop: (id) => {
      setSelectedId(id);
      setActiveShopId(id);
      // Drop every shop-scoped cache entry so no data leaks between shops.
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'auth' && q.queryKey[0] !== 'shops' });
    },
  }), [shops, activeShop, user, isLoading, qc]);

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used inside ShopProvider');
  return ctx;
}
