import { NavLink } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useI18n } from '@/features/i18n/i18n-provider';
import { useAuth } from '@/features/auth/auth-provider';
import { cn } from '@/lib/utils';
import { sidebarNav } from './nav-config';
import { Logo } from './logo';

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { t } = useI18n();
  const { hasPermission } = useAuth();
  const items = sidebarNav.filter((i) => !i.permission || hasPermission(i.permission));

  return (
    <aside
      className={cn('sticky top-0 hidden h-dvh shrink-0 flex-col border-r bg-surface transition-[width] duration-200 lg:flex', collapsed ? 'w-sidebar-collapsed' : 'w-sidebar')}
    >
      <div className={cn('flex h-16 items-center border-b', collapsed ? 'justify-center px-2' : 'px-5')}>
        <Logo collapsed={collapsed} />
      </div>
      <nav aria-label={t('nav.mainNav')} className="flex-1 overflow-y-auto p-3">
        {(['home', 'daily', 'manage'] as const).map((group) => {
          const groupItems = items.filter((i) => i.group === group);
          if (!groupItems.length) return null;
          return (
            <div key={group} className="mb-3">
              {group !== 'home' && !collapsed && (
                <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t(group === 'daily' ? 'nav.dailyTasks' : 'nav.manage')}
                </p>
              )}
              {group !== 'home' && collapsed && <hr className="mx-2 my-2" />}
              <ul className="space-y-1">
                {groupItems.map(({ to, labelKey, icon: Icon }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={to === '/'}
                      title={collapsed ? t(labelKey) : undefined}
                      className={({ isActive }) =>
                        cn(
                          'flex h-11 items-center gap-3 rounded-md px-3 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                          collapsed && 'justify-center px-0',
                          isActive && 'bg-primary-soft text-accent-foreground hover:bg-primary-soft',
                        )
                      }
                    >
                      <Icon className="size-5 shrink-0" aria-hidden />
                      <span className={cn(collapsed && 'sr-only')}>{t(labelKey)}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          className={cn('flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground', collapsed && 'justify-center px-0')}
        >
          {collapsed ? <PanelLeftOpen className="size-[18px]" aria-hidden /> : <PanelLeftClose className="size-[18px]" aria-hidden />}
          <span className={cn(collapsed && 'sr-only')}>{collapsed ? t('nav.expand') : t('nav.collapse')}</span>
        </button>
      </div>
    </aside>
  );
}
