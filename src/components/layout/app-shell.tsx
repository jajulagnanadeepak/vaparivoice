import { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { MockBanner } from '@/components/common/mock-banner';
import { OfflineBanner } from '@/components/common/offline-banner';
import { RouteFallback } from '@/components/common/route-fallback';
import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';
import { MobileNav } from './mobile-nav';

const COLLAPSE_KEY = 'vs_sidebar_collapsed';

export function AppShell() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1');
  const toggle = () => setCollapsed((c) => { localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1'); return !c; });

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip">
      <MockBanner />
      <OfflineBanner />
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2">Skip to content</a>
      <div className="flex flex-1">
        <Sidebar collapsed={collapsed} onToggle={toggle} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-6 lg:px-8 lg:pb-10">
            <Suspense fallback={<RouteFallback />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
