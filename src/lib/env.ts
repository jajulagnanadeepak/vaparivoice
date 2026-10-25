/** Centralised, typed access to build-time configuration. */
const rawBase = import.meta.env.VITE_API_BASE_URL as string | undefined;

export const env = {
  apiBaseUrl: (rawBase ?? 'http://localhost:8000').replace(/\/+$/, ''),
  apiPrefix: '/api/v1',
  isProduction: import.meta.env.PROD,
  /** Mock mode is opt-in AND hard-disabled in production builds. */
  useMockApi: import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_API === 'true',
} as const;
