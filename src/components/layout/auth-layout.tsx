import { Outlet } from 'react-router-dom';
import { MockBanner } from '@/components/common/mock-banner';
import { OfflineBanner } from '@/components/common/offline-banner';
import { useI18n } from '@/features/i18n/i18n-provider';
import { LanguageMenu } from './language-menu';
import { Logo } from './logo';

export function AuthLayout() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <MockBanner />
      <OfflineBanner />
      <header className="flex h-16 items-center justify-between px-4 sm:px-8">
        <Logo />
        <LanguageMenu />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-10 pt-4 sm:items-center">
        <div className="w-full max-w-md">
          <Outlet />
          <p className="mt-6 text-center text-xs text-muted-foreground">{t('app.tagline')}</p>
        </div>
      </main>
    </div>
  );
}
