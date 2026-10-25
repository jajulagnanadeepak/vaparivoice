import axios, { type AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { env } from './env';
import { toApiError } from './api-error';

/**
 * Auth strategy: the FastAPI backend issues HTTP-only session/refresh cookies.
 * The frontend never sees or stores tokens. Unsafe requests echo the CSRF token
 * (readable `csrf_token` cookie) in the `X-CSRF-Token` header (double-submit).
 */
const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'X-CSRF-Token';
const SHOP_HEADER = 'X-Shop-ID';
const UNSAFE = new Set(['post', 'put', 'patch', 'delete']);

let activeShopId: string | null = null;
let activeLanguage = 'en';
/** Lets the backend localise its user-facing messages (validation details, clarification questions). */
export function setApiLanguage(lang: string) {
  activeLanguage = lang;
}
/** The backend MUST verify the user belongs to this shop; the header is a hint, not authorisation. */
export function setActiveShopId(id: string | null) {
  activeShopId = id;
}

type SessionExpiredHandler = () => void;
let onSessionExpired: SessionExpiredHandler | null = null;
export function registerSessionExpiredHandler(fn: SessionExpiredHandler | null) {
  onSessionExpired = fn;
}

function readCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=')[1] ?? '') : null;
}

export const apiClient = axios.create({
  baseURL: `${env.apiBaseUrl}${env.apiPrefix}`,
  withCredentials: true,
  timeout: 20_000,
  headers: { Accept: 'application/json' },
  // Dev-only mock: dynamically imported so it is dead-code-eliminated from production bundles.
  ...(env.useMockApi
    ? { adapter: async (cfg: InternalAxiosRequestConfig) => (await import('./mock/mock-adapter')).mockAdapter(cfg) }
    : {}),
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const method = (config.method ?? 'get').toLowerCase();
  if (UNSAFE.has(method)) {
    const csrf = readCookie(CSRF_COOKIE);
    if (csrf) config.headers.set(CSRF_HEADER, csrf);
  }
  if (activeShopId) config.headers.set(SHOP_HEADER, activeShopId);
  config.headers.set('Accept-Language', activeLanguage);
  return config;
});

// --- Single-flight session refresh on 401 ---
let refreshPromise: Promise<void> | null = null;
const NO_REFRESH = ['/auth/login', '/auth/refresh', '/auth/register', '/auth/logout'];
/** The initial session probe: a failed refresh here just means "signed out", not "session expired". */
const SILENT_EXPIRY = ['/auth/me'];

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
    const url = original?.url ?? '';
    if (error.response?.status === 401 && original && !original._retried && !NO_REFRESH.some((p) => url.includes(p))) {
      original._retried = true;
      try {
        refreshPromise ??= apiClient.post('/auth/refresh').then(() => undefined).finally(() => { refreshPromise = null; });
        await refreshPromise;
        return apiClient(original);
      } catch {
        if (!SILENT_EXPIRY.some((p) => url.includes(p))) onSessionExpired?.();
      }
    }
    const mutating = UNSAFE.has((original?.method ?? 'get').toLowerCase());
    return Promise.reject(toApiError(error, { mutating }));
  },
);

/** Generates an idempotency key for stock-changing submissions. Reuse the same key when retrying. */
export function createIdempotencyKey(): string {
  return crypto.randomUUID();
}
export const IDEMPOTENCY_HEADER = 'Idempotency-Key';
