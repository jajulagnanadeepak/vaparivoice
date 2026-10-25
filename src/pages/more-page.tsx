import { Link } from 'react-router-dom';
import { ChevronRight, LogOut } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/common/page-header';
import { sidebarNav } from '@/components/layout/nav-config';
import { useI18n } from '@/features/i18n/i18n-provider';
import { useAuth } from '@/features/auth/auth-provider';

const IN_BOTTOM_NAV = new Set(['/', '/stock/check', '/voice', '/movements']);

/** Mobile "More" menu: everything not in the bottom bar. */
export default function MorePage() {
  const { t } = useI18n();
  const { hasPermission, logout } = useAuth();
  const items = sidebarNav.filter((i) => !IN_BOTTOM_NAV.has(i.to) && (!i.permission || hasPermission(i.permission)));
  return (
    <>
      <PageHeader title={t('nav.more')} />
      <Card className="divide-y overflow-hidden">
        {items.map(({ to, labelKey, icon: Icon }) => (
          <Link key={to} to={to} className="flex min-h-[3.75rem] items-center gap-3 px-4 hover:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
            <Icon className="size-5 text-muted-foreground" aria-hidden />
            <span className="flex-1 font-medium">{t(labelKey)}</span>
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
          </Link>
        ))}
        <button type="button" onClick={() => void logout()} className="flex min-h-14 w-full items-center gap-3 px-4 text-left font-medium text-destructive hover:bg-destructive-soft">
          <LogOut className="size-5" aria-hidden />{t('top.logout')}
        </button>
      </Card>
    </>
  );
}
