/* DEVELOPMENT-ONLY mock backend, wired in api-client only when env.useMockApi is true. */
import { AxiosError, AxiosHeaders, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import type { Paginated, Product, ProductCreateRequest, ProductListParams, Shop, ShopCreateRequest } from '@/types';
import { deriveStockStatus } from '@/lib/stock-status';
import { toNumber } from '@/lib/format';
import { categories, db, mockConversions, persistDb, seedProducts, suppliers, units } from './mock-db';
import type { StockMovement } from '@/types';

type Handler = (cfg: InternalAxiosRequestConfig, params: Record<string, string>, body: unknown) => unknown;

const SESSION_FLAG = 'vs_mock_session'; // flag only — no credentials stored

function ok(cfg: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse {
  return { data, status, statusText: 'OK', headers: new AxiosHeaders(), config: cfg };
}
function fail(cfg: InternalAxiosRequestConfig, status: number, detail: unknown): never {
  const response = { data: { detail }, status, statusText: 'Error', headers: new AxiosHeaders(), config: cfg } as AxiosResponse;
  throw new AxiosError(String(detail), String(status), cfg, null, response);
}
function requireUser(cfg: InternalAxiosRequestConfig) {
  if (!db.user && sessionStorage.getItem(SESSION_FLAG)) ensureUser('Mock Shopkeeper', 'dev@voicestock.local');
  if (!db.user) fail(cfg, 401, 'Not authenticated');
  return db.user!;
}
function ensureUser(full_name: string, email: string) {
  db.user = { id: 'u-1', full_name, email, preferred_language: 'en', memberships: [], permissions: ['product:read', 'product:write', 'inventory:write', 'inventory:adjust', 'team:manage'] };
  db.user.memberships = db.shops.map((s) => ({ shop_id: s.id, shop_name: s.name, role: 'owner' as const }));
  sessionStorage.setItem(SESSION_FLAG, '1');
  return db.user;
}

function paginate<T>(items: T[], page = 1, pageSize = 20): Paginated<T> {
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length, page, page_size: pageSize };
}

function recordMovement(cfg: InternalAxiosRequestConfig, body: { product_id: string; quantity?: string; observed_quantity?: string; unit_code: string; reason?: string | null; notes?: string | null; reference?: string | null }, type: 'stock_in' | 'stock_out' | 'adjustment', source: 'manual' | 'voice' = 'manual') {
  const user = requireUser(cfg);
  const key = String(cfg.headers?.['Idempotency-Key'] ?? '');
  if (key && db.idempotency[key]) return db.movements.find((m) => m.id === db.idempotency[key]); // de-duplicated replay
  const p = db.products.find((x) => x.id === body.product_id && x.status === 'active') ?? fail(cfg, 404, 'Product not found');
  const conv = (mockConversions[p.base_unit.code] ?? []).find((c) => c.unit_code === body.unit_code);
  const factor = body.unit_code === p.base_unit.code ? 1 : conv ? toNumber(conv.factor_to_base) : fail(cfg, 422, [{ loc: ['body', 'unit_code'], msg: 'Unit not configured for this product' }]);
  const cur = toNumber(p.current_stock);
  const qty = toNumber(body.quantity ?? body.observed_quantity) * factor;
  const after = Math.round((type === 'stock_in' ? cur + qty : type === 'stock_out' ? cur - qty : qty) * 1000) / 1000;
  if (after < 0) fail(cfg, 409, `Only ${p.current_stock} ${p.base_unit.code} in stock.`);
  p.current_stock = String(after);
  p.stock_status = deriveStockStatus(p.current_stock, p.min_stock);
  p.updated_at = new Date().toISOString();
  const m: StockMovement = {
    id: `m-${Date.now()}`, reference: `MOCK-${1000 + db.movements.length}`, product: { id: p.id, name: p.name, sku: p.sku }, movement_type: type,
    quantity: body.quantity ?? body.observed_quantity ?? '0', unit_code: body.unit_code, base_quantity_change: String(Math.round((after - cur) * 1000) / 1000),
    base_unit_code: p.base_unit.code, balance_after: p.current_stock, reason: body.reason ?? null, notes: body.notes ?? null, source, status: 'committed',
    performed_by: { id: user.id, full_name: user.full_name }, created_at: new Date().toISOString(),
  };
  db.movements.unshift(m);
  if (key) db.idempotency[key] = m.id;
  return m;
}

const routes: [string, RegExp, Handler][] = [
  ['post', /^\/auth\/login$/, (cfg, _p, b) => {
    const body = b as { email: string; password: string };
    if (!body.email || !body.password) fail(cfg, 422, [{ loc: ['body', 'email'], msg: 'Email is required' }]);
    return ensureUser('Mock Shopkeeper', body.email);
  }],
  ['post', /^\/auth\/register$/, (_c, _p, b) => { const body = b as { full_name: string; email: string }; return ensureUser(body.full_name, body.email); }],
  ['post', /^\/auth\/logout$/, () => { db.user = null; sessionStorage.removeItem(SESSION_FLAG); return null; }],
  ['post', /^\/auth\/refresh$/, (cfg) => { requireUser(cfg); return null; }],
  ['get', /^\/auth\/me$/, (cfg) => requireUser(cfg)],
  ['post', /^\/auth\/forgot-password$/, () => ({ message: 'If an account exists, a reset link has been sent.' })],
  ['post', /^\/auth\/reset-password$/, () => ({ message: 'Password updated.' })],

  ['get', /^\/shops$/, (cfg) => { requireUser(cfg); return db.shops; }],
  ['post', /^\/shops$/, (cfg, _p, b) => {
    const user = requireUser(cfg);
    const body = b as ShopCreateRequest;
    const shop: Shop = { id: `shop-${db.shops.length + 1}`, owner_name: body.owner_name ?? null, default_min_stock: body.default_min_stock ?? null, created_at: new Date().toISOString(), ...body } as Shop;
    db.shops.push(shop);
    user.memberships.push({ shop_id: shop.id, shop_name: shop.name, role: 'owner' });
    seedProducts();
    return shop;
  }],

  ['get', /^\/categories$/, (cfg) => { requireUser(cfg); return categories; }],
  ['get', /^\/units$/, (cfg) => { requireUser(cfg); return units; }],
  ['get', /^\/suppliers$/, (cfg) => { requireUser(cfg); return suppliers; }],

  ['get', /^\/products$/, (cfg) => {
    requireUser(cfg);
    const p = (cfg.params ?? {}) as ProductListParams;
    let items = db.products.filter((x) => x.status === (p.status ?? 'active'));
    if (p.search) { const q = p.search.toLowerCase(); items = items.filter((x) => x.name.toLowerCase().includes(q) || x.sku.toLowerCase().includes(q)); }
    if (p.category_id) items = items.filter((x) => x.category?.id === p.category_id);
    if (p.stock_status) items = items.filter((x) => x.stock_status === p.stock_status);
    const dir = p.order === 'desc' ? -1 : 1;
    const key = p.sort ?? 'name';
    items = [...items].sort((a, b) =>
      key === 'current_stock' ? (toNumber(a.current_stock) - toNumber(b.current_stock)) * dir
      : key === 'updated_at' ? a.updated_at.localeCompare(b.updated_at) * dir
      : a.name.localeCompare(b.name) * dir);
    return paginate(items, p.page, p.page_size);
  }],
  ['post', /^\/products$/, (cfg, _p, b) => {
    requireUser(cfg);
    const body = b as ProductCreateRequest;
    if (db.products.some((x) => x.sku.toLowerCase() === body.sku.toLowerCase())) fail(cfg, 409, 'A product with this SKU already exists.');
    const product: Product = {
      id: `p-${Date.now()}`, name: body.name, sku: body.sku, barcode: body.barcode ?? null,
      category: categories.find((c) => c.id === body.category_id) ?? null, description: body.description ?? null,
      base_unit: units.find((u) => u.code === body.base_unit_code) ?? units[0]!, current_stock: '0', min_stock: body.min_stock,
      purchase_cost: body.purchase_cost ?? null, selling_price: body.selling_price ?? null,
      preferred_supplier: suppliers.find((s) => s.id === body.preferred_supplier_id) ?? null,
      status: 'active', stock_status: 'out_of_stock', updated_at: new Date().toISOString(), created_at: new Date().toISOString(),
    };
    db.products.unshift(product);
    return product;
  }],
  ['get', /^\/products\/(?<id>[^/]+)$/, (cfg, { id }) => { requireUser(cfg); return db.products.find((x) => x.id === id) ?? fail(cfg, 404, 'Product not found'); }],
  ['patch', /^\/products\/(?<id>[^/]+)$/, (cfg, { id }, b) => {
    requireUser(cfg);
    const prod = db.products.find((x) => x.id === id) ?? fail(cfg, 404, 'Product not found');
    const body = b as Partial<ProductCreateRequest>;
    Object.assign(prod, {
      ...(body.name !== undefined && { name: body.name }), ...(body.sku !== undefined && { sku: body.sku }),
      ...(body.barcode !== undefined && { barcode: body.barcode }), ...(body.description !== undefined && { description: body.description }),
      ...(body.min_stock !== undefined && { min_stock: body.min_stock }), ...(body.purchase_cost !== undefined && { purchase_cost: body.purchase_cost }),
      ...(body.selling_price !== undefined && { selling_price: body.selling_price }),
      ...(body.category_id !== undefined && { category: categories.find((c) => c.id === body.category_id) ?? null }),
      ...(body.preferred_supplier_id !== undefined && { preferred_supplier: suppliers.find((s) => s.id === body.preferred_supplier_id) ?? null }),
      updated_at: new Date().toISOString(),
    });
    prod.stock_status = deriveStockStatus(prod.current_stock, prod.min_stock);
    return prod;
  }],
  ['post', /^\/products\/(?<id>[^/]+)\/archive$/, (cfg, { id }) => {
    requireUser(cfg);
    const prod = db.products.find((x) => x.id === id) ?? fail(cfg, 404, 'Product not found');
    prod.status = 'archived';
    return prod;
  }],
  ['get', /^\/products\/(?<id>[^/]+)\/movements$/, (cfg, { id }) => {
    requireUser(cfg);
    const p = (cfg.params ?? {}) as { page?: number; page_size?: number };
    return paginate(db.movements.filter((m) => m.product.id === id), p.page, p.page_size);
  }],

  ['get', /^\/dashboard\/summary$/, (cfg) => {
    requireUser(cfg);
    const active = db.products.filter((p) => p.status === 'active');
    return {
      active_products: active.length,
      inventory_value: active.reduce((s, p) => s + toNumber(p.current_stock) * toNumber(p.purchase_cost), 0).toFixed(2),
      low_stock_count: active.filter((p) => p.stock_status === 'low_stock').length,
      out_of_stock_count: active.filter((p) => p.stock_status === 'out_of_stock').length,
      movements_last_7_days: db.movements.length,
      as_of: new Date().toISOString(),
    };
  }],
  ['get', /^\/dashboard\/movement-trend$/, (cfg) => {
    requireUser(cfg);
    if (!db.movements.length) return [];
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(Date.now() - (13 - i) * 86_400_000).toISOString().slice(0, 10);
      const day = db.movements.filter((m) => m.created_at.slice(0, 10) === d);
      return { date: d, stock_in_count: day.filter((m) => m.movement_type === 'stock_in').length, stock_out_count: day.filter((m) => m.movement_type === 'stock_out').length, adjustment_count: 0 };
    });
  }],
  ['get', /^\/reports\/frequent-products$/, (cfg) => {
    requireUser(cfg);
    const counts = new Map<string, number>();
    db.movements.forEach((m) => counts.set(m.product.id, (counts.get(m.product.id) ?? 0) + 1));
    return [...counts.entries()].map(([id, c]) => { const p = db.products.find((x) => x.id === id)!; return { product_id: id, name: p.name, movement_count: c, base_unit_code: p.base_unit.code }; });
  }],
  ['get', /^\/alerts\/low-stock$/, (cfg) => {
    requireUser(cfg);
    return db.products.filter((p) => p.status === 'active' && p.stock_status !== 'in_stock').map((p) => ({
      product_id: p.id, name: p.name, current_stock: p.current_stock, min_stock: p.min_stock, base_unit_code: p.base_unit.code,
      stock_status: p.stock_status, preferred_supplier: p.preferred_supplier?.name ?? null, last_movement_at: p.updated_at,
    }));
  }],
  ['get', /^\/alerts\/reorder-suggestions$/, (cfg) => {
    requireUser(cfg);
    return db.products.filter((p) => p.status === 'active' && p.stock_status !== 'in_stock').map((p) => {
      const qty = Math.max(toNumber(p.min_stock) * 2 - toNumber(p.current_stock), 0);
      return { product_id: p.id, name: p.name, suggested_quantity: String(qty), base_unit_code: p.base_unit.code, basis: 'threshold',
        explanation: `Stock ${p.current_stock} ${p.base_unit.code} is at or below the minimum of ${p.min_stock}. Suggestion refills to twice the minimum.` };
    });
  }],
  ['get', /^\/inventory\/movements$/, (cfg) => {
    requireUser(cfg);
    const p = (cfg.params ?? {}) as { page?: number; page_size?: number; source?: string; movement_type?: string; product_id?: string; date_from?: string; date_to?: string };
    const items = db.movements.filter((m) => (!p.source || m.source === p.source) && (!p.movement_type || m.movement_type === p.movement_type)
      && (!p.product_id || m.product.id === p.product_id) && (!p.date_from || m.created_at.slice(0, 10) >= p.date_from) && (!p.date_to || m.created_at.slice(0, 10) <= p.date_to));
    return paginate(items, p.page, p.page_size);
  }],
  ['get', /^\/products\/(?<id>[^/]+)\/conversions$/, (cfg, { id }) => {
    requireUser(cfg);
    const p = db.products.find((x) => x.id === id) ?? fail(cfg, 404, 'Product not found');
    return mockConversions[p.base_unit.code] ?? [];
  }],
  ['post', /^\/inventory\/stock-in$/, (cfg, _p, b) => recordMovement(cfg, b as never, 'stock_in')],
  ['post', /^\/inventory\/stock-out$/, (cfg, _p, b) => recordMovement(cfg, b as never, 'stock_out')],
  ['post', /^\/inventory\/adjustments$/, (cfg, _p, b) => recordMovement(cfg, b as never, 'adjustment')],
  ['get', /^\/inventory\/movements\/by-idempotency-key\/(?<key>[^/]+)$/, (cfg, { key }) => {
    requireUser(cfg);
    return db.movements.find((m) => m.id === db.idempotency[key ?? '']) ?? null;
  }],
  // Demo mode has NO speech service: the UI must show voice as unavailable and offer manual entry.
  ['get', /^\/voice\/capabilities$/, (cfg) => { requireUser(cfg); return { speech_to_text: { available: false, languages: [] }, text_to_speech: { available: false, languages: [] }, max_recording_seconds: 15 }; }],
  ['post', /^\/voice\/(transcribe|interpret|confirm|speak)$/, (cfg) => fail(cfg, 501, 'Voice is not available in demo mode.')],
];

export const mockAdapter: AxiosAdapter = async (cfg) => {
  await new Promise((r) => setTimeout(r, 250 + Math.random() * 250));
  const method = (cfg.method ?? 'get').toLowerCase();
  const path = (cfg.url ?? '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/api\/v1/, '').split('?')[0] ?? '';
  const body = typeof cfg.data === 'string' && cfg.data ? JSON.parse(cfg.data) : cfg.data;
  for (const [m, re, handler] of routes) {
    if (m !== method) continue;
    const match = re.exec(path);
    if (match) {
      const data = handler(cfg, match.groups ?? {}, body);
      persistDb();
      return ok(cfg, data);
    }
  }
  return fail(cfg, 404, `Mock route not implemented: ${method.toUpperCase()} ${path}`);
};
