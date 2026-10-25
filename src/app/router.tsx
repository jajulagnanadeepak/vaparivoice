import { lazy } from 'react';
import { createBrowserRouter, Outlet } from 'react-router-dom';
import { AppShell } from '@/components/layout/app-shell';
import { AuthLayout } from '@/components/layout/auth-layout';
import { GuestOnly, RequireAuth, RequireShop } from '@/features/auth/route-guards';
import PlannedPage from '@/pages/planned-page';

// Route-level code splitting
const LoginPage = lazy(() => import('@/pages/auth/login-page'));
const RegisterPage = lazy(() => import('@/pages/auth/register-page'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/forgot-password-page'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/reset-password-page'));
const OnboardingPage = lazy(() => import('@/pages/onboarding/onboarding-page'));
const DashboardPage = lazy(() => import('@/pages/dashboard/dashboard-page'));
const ProductsPage = lazy(() => import('@/pages/products/products-page'));
const ProductDetailPage = lazy(() => import('@/pages/products/product-detail-page'));
const MorePage = lazy(() => import('@/pages/more-page'));
const StockActionPage = lazy(() => import('@/pages/stock/stock-action-page'));
const CheckStockPage = lazy(() => import('@/pages/stock/check-stock-page'));
const LowStockPage = lazy(() => import('@/pages/alerts/low-stock-page'));
const StockHistoryPage = lazy(() => import('@/pages/movements/stock-history-page'));
const VoicePage = lazy(() => import('@/pages/voice/voice-page'));
const NotFoundPage = lazy(() => import('@/pages/not-found-page'));

export const router = createBrowserRouter([
  {
    element: <GuestOnly />,
    children: [{
      element: <AuthLayout />,
      children: [
        { path: '/login', element: <LoginPage /> },
        { path: '/register', element: <RegisterPage /> },
        { path: '/forgot-password', element: <ForgotPasswordPage /> },
      ],
    }],
  },
  // Reset links must work whether or not a session exists.
  { element: <AuthLayout />, children: [{ path: '/reset-password', element: <ResetPasswordPage /> }] },
  {
    element: <RequireAuth />,
    children: [
      { element: <AuthLayout />, children: [{ path: '/onboarding', element: <OnboardingPage /> }] },
      {
        element: <RequireShop />,
        children: [{
          element: <AppShell />,
          children: [
            { index: true, element: <DashboardPage /> },
            { path: 'products', element: <ProductsPage /> },
            { path: 'products/:id', element: <ProductDetailPage /> },
            { path: 'stock', element: <Outlet />, children: [
              // key forces a fresh form when switching between modes
              { path: 'in', element: <StockActionPage key="in" mode="in" /> },
              { path: 'sale', element: <StockActionPage key="sale" mode="sale" /> },
              { path: 'out', element: <StockActionPage key="out" mode="out" /> },
              { path: 'adjust', element: <StockActionPage key="adjust" mode="adjust" /> },
              { path: 'check', element: <CheckStockPage /> },
            ] },
            { path: 'movements', element: <StockHistoryPage /> },
            { path: 'voice', element: <VoicePage /> },
            { path: 'alerts', element: <LowStockPage /> },
            { path: 'suppliers', element: <PlannedPage titleKey="nav.suppliers" phase="Phase D" /> },
            { path: 'reports', element: <PlannedPage titleKey="nav.reports" phase="Phase D" /> },
            { path: 'team', element: <PlannedPage titleKey="nav.team" phase="Phase D" /> },
            { path: 'settings', element: <PlannedPage titleKey="nav.settings" phase="Phase D" /> },
            { path: 'more', element: <MorePage /> },
            { path: '*', element: <NotFoundPage /> },
          ],
        }],
      },
    ],
  },
]);
