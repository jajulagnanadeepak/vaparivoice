import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from './auth-provider';
import { useShop } from '@/features/shops/shop-provider';

function FullScreenLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Loading">
      <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
    </div>
  );
}

/** Requires a session. Redirects to /login and remembers where the user was going. */
export function RequireAuth() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/** Requires at least one shop; otherwise sends the user to onboarding. */
export function RequireShop() {
  const { shops, isLoading } = useShop();
  if (isLoading) return <FullScreenLoader />;
  if (!shops.length) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

export function GuestOnly() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullScreenLoader />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}
