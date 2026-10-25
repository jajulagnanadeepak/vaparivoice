import { Suspense, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from '@/lib/query-client';
import { I18nProvider } from '@/features/i18n/i18n-provider';
import { AuthProvider } from '@/features/auth/auth-provider';
import { ShopProvider } from '@/features/shops/shop-provider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <ShopProvider>
            <Suspense fallback={null}>{children}</Suspense>
            <Toaster position="top-center" richColors closeButton toastOptions={{ duration: 4000 }} />
          </ShopProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
