import {
  AlertTriangle, ArrowDownToLine, BarChart3, ClipboardCheck, History, LayoutDashboard, Menu, Mic, Package, PackageMinus, Search,
  Settings, ShoppingCart, Truck, Users, type LucideIcon,
} from 'lucide-react';
import type { TranslationKey } from '@/locales';

export interface NavItem {
  to: string;
  labelKey: TranslationKey;
  icon: LucideIcon;
  /** Permission needed to SEE the entry. Backend still enforces access. */
  permission?: string;
  group: 'home' | 'daily' | 'manage';
}

export const sidebarNav: NavItem[] = [
  { to: '/', labelKey: 'nav.home', icon: LayoutDashboard, group: 'home' },
  { to: '/stock/in', labelKey: 'nav.addStock', icon: ArrowDownToLine, group: 'daily', permission: 'inventory:write' },
  { to: '/stock/sale', labelKey: 'nav.recordSale', icon: ShoppingCart, group: 'daily', permission: 'inventory:write' },
  { to: '/stock/out', labelKey: 'nav.removeStock', icon: PackageMinus, group: 'daily', permission: 'inventory:write' },
  { to: '/stock/check', labelKey: 'nav.checkStock', icon: Search, group: 'daily' },
  { to: '/voice', labelKey: 'nav.voice', icon: Mic, group: 'daily' },
  { to: '/products', labelKey: 'nav.products', icon: Package, group: 'manage' },
  { to: '/alerts', labelKey: 'nav.alerts', icon: AlertTriangle, group: 'manage' },
  { to: '/movements', labelKey: 'nav.movements', icon: History, group: 'manage' },
  { to: '/stock/adjust', labelKey: 'nav.correctStock', icon: ClipboardCheck, group: 'manage', permission: 'inventory:adjust' },
  { to: '/suppliers', labelKey: 'nav.suppliers', icon: Truck, group: 'manage' },
  { to: '/reports', labelKey: 'nav.reports', icon: BarChart3, group: 'manage' },
  { to: '/team', labelKey: 'nav.team', icon: Users, permission: 'team:manage', group: 'manage' },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings, group: 'manage' },
];

export const mobileNav: { to: string; labelKey: TranslationKey; icon: LucideIcon; primary?: boolean }[] = [
  { to: '/', labelKey: 'nav.home', icon: LayoutDashboard },
  { to: '/stock/check', labelKey: 'nav.stockShort', icon: Search },
  { to: '/voice', labelKey: 'nav.voiceShort', icon: Mic, primary: true },
  { to: '/movements', labelKey: 'nav.history', icon: History },
  { to: '/more', labelKey: 'nav.more', icon: Menu },
];
