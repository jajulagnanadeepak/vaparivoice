import { NavLink } from 'react-router-dom';
import { useI18n } from '@/features/i18n/i18n-provider';
import { cn } from '@/lib/utils';
import { mobileNav } from './nav-config';

export function MobileNav() {
  const { t } = useI18n();
  return (
    <nav aria-label={t('nav.mainNav')} className="fixed inset-x-0 bottom-0 z-40 border-t bg-surface pb-safe lg:hidden">
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {mobileNav.map(({ to, labelKey, icon: Icon, primary }) => (
          <li key={to} className="flex">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn('flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground', isActive && !primary && 'text-primary')
              }
            >
              {({ isActive }) =>
                primary ? (
                  <>
                    <span className={cn('-mt-5 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-raised ring-4 ring-surface', isActive && 'bg-primary/90')}>
                      <Icon className="size-6" aria-hidden />
                    </span>
                    <span className={cn(isActive && 'text-primary')}>{t(labelKey)}</span>
                  </>
                ) : (
                  <>
                    <Icon className="size-5" aria-hidden />
                    <span>{t(labelKey)}</span>
                  </>
                )
              }
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
