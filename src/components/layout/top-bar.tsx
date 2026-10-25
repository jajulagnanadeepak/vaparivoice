import { Bell, ChevronsUpDown, LogOut, Settings, Store, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/features/i18n/i18n-provider';
import { useAuth } from '@/features/auth/auth-provider';
import { useShop } from '@/features/shops/shop-provider';
import { GlobalSearch } from './global-search';
import { LanguageMenu } from './language-menu';
import { Logo } from './logo';

function ShopSelector() {
  const { t } = useI18n();
  const { shops, activeShop, selectShop } = useShop();
  if (!activeShop) return null;
  if (shops.length < 2) {
    return (
      <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
        <Store className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="truncate">{activeShop.name}</span>
      </div>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="min-w-0 max-w-[14rem] justify-start gap-2 px-2 font-semibold" aria-label={t('top.switchShop')}>
          <Store className="text-muted-foreground" aria-hidden />
          <span className="truncate">{activeShop.name}</span>
          <ChevronsUpDown className="text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>{t('top.switchShop')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={activeShop.id} onValueChange={selectShop}>
          {shops.map((s) => <DropdownMenuRadioItem key={s.id} value={s.id}>{s.name}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationsMenu() {
  const { t } = useI18n();
  // Real notifications endpoint arrives in Phase D; until then show an honest empty state.
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('top.notifications')}><Bell aria-hidden /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>{t('top.notifications')}</DropdownMenuLabel>
        <p className="px-2 py-6 text-center text-sm text-muted-foreground">{t('top.noNotifications')}</p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProfileMenu() {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = user?.full_name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() ?? '';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={t('top.profile')} className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring">
          {initials || <User className="size-4" aria-hidden />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="px-2 py-2">
          <p className="truncate text-sm font-semibold">{user?.full_name}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/settings')}><Settings aria-hidden /> {t('top.settings')}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void logout().then(() => navigate('/login'))} className="text-destructive focus:text-destructive">
          <LogOut aria-hidden /> {t('top.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const MOBILE_SEARCH_PATHS = ['/', '/products'];

export function TopBar() {
  // On phones, keep task screens uncluttered: the search row only shows where people browse.
  const showMobileSearch = MOBILE_SEARCH_PATHS.includes(useLocation().pathname);
  return (
    <header className="sticky top-0 z-30 border-b bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
        <Logo collapsed className="lg:hidden" />
        <ShopSelector />
        <GlobalSearch className="ml-auto hidden w-full max-w-sm md:block" />
        <div className="ml-auto flex items-center gap-1 md:ml-2">
          <LanguageMenu />
          <NotificationsMenu />
          <ProfileMenu />
        </div>
      </div>
      {showMobileSearch && <div className="px-4 pb-3 md:hidden"><GlobalSearch /></div>}
    </header>
  );
}
