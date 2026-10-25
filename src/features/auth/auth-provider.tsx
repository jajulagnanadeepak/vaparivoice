import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { authService } from '@/services/auth-service';
import { registerSessionExpiredHandler } from '@/lib/api-client';
import { ApiError } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-client';
import type { CurrentUser } from '@/types';
import { useI18n } from '@/features/i18n/i18n-provider';

interface AuthValue {
  user: CurrentUser | null;
  isLoading: boolean;
  setUser: (u: CurrentUser) => void;
  logout: () => Promise<void>;
  hasPermission: (code: string) => boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

/**
 * Session lives in HTTP-only cookies; we only hold the profile in the query cache.
 * Nothing about credentials is ever written to browser storage.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { t } = useI18n();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => {
      try {
        return await authService.me();
      } catch (e) {
        if (e instanceof ApiError && e.kind === 'unauthorized') return null;
        throw e;
      }
    },
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const clearSession = useCallback(() => {
    qc.clear();
    qc.setQueryData(queryKeys.me, null);
  }, [qc]);

  useEffect(() => {
    registerSessionExpiredHandler(() => {
      clearSession();
      toast.error(t('auth.sessionExpired'));
    });
    return () => registerSessionExpiredHandler(null);
  }, [clearSession, t]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo<AuthValue>(() => ({
    user: data ?? null,
    isLoading,
    setUser: (u) => qc.setQueryData(queryKeys.me, u),
    logout,
    // UX only — backend authorisation is the real boundary.
    hasPermission: (code) => !!data?.permissions.includes(code),
  }), [data, isLoading, logout, qc]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
