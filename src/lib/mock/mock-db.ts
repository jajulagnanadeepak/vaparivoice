/**
 * DEVELOPMENT-ONLY in-memory data. Loaded only when VITE_USE_MOCK_API=true in
 * a dev build. Never used in production and never a silent fallback.
 */
import type { Category, CurrentUser, Product, Shop, StockMovement, Unit } from '@/types';
import { deriveStockStatus } from '@/lib/stock-status';

export const units: Unit[] = [
  { code: 'pcs', name: 'Pieces', dimension: 'count' },
  { code: 'dozen', name: 'Dozens', dimension: 'count' },
  { code: 'g', name: 'Grams', dimension: 'mass' },
  { code: 'kg', name: 'Kilograms', dimension: 'mass' },
  { code: 'quintal', name: 'Quintals', dimension: 'mass' },
  { code: 'ml', name: 'Millilitres', dimension: 'volume' },
  { code: 'l', name: 'Litres', dimension: 'volume' },
  { code: 'bag', name: 'Bags', dimension: 'package' },
  { code: 'carton', name: 'Cartons', dimension: 'package' },
  { code: 'box', name: 'Boxes', dimension: 'package' },
];

export const categories: Category[] = [
  { id: 'c-grains', name: 'Grains & Pulses' },
  { id: 'c-oil', name: 'Oils' },
  { id: 'c-snacks', name: 'Snacks' },
  { id: 'c-dairy', name: 'Dairy' },
];

export const suppliers = [
  { id: 's-1', name: '[MOCK] Sri Lakshmi Traders' },
  { id: 's-2', name: '[MOCK] Guntur Wholesale' },
];

const DB_KEY = 'vs_mock_db'; // dev-only; mock records, no credentials

export const db: { user: CurrentUser | null; shops: Shop[]; products: Product[]; movements: StockMovement[]; idempotency: Record<string, string> } = {
  user: null,
  shops: [],
  products: [],
  movements: [],
  idempotency: {},
  ...(JSON.parse(sessionStorage.getItem(DB_KEY) ?? 'null') ?? {}),
};

/** Keeps mock data across page reloads within the tab. */
export function persistDb() {
  sessionStorage.setItem(DB_KEY, JSON.stringify(db));
}

const u = (code: string) => units.find((x) => x.code === code)!;
const now = () => new Date().toISOString();

export function seedProducts() {
  if (db.products.length) return;
  const rows: [string, string, string, string, string, string, string, string][] = [
    ['బియ్యం (Sona Masoori Rice)', 'RICE-SM', 'c-grains', 'kg', '500', '100', '52', '60'],
    ['Toor Dal', 'DAL-TOOR', 'c-grains', 'kg', '18', '25', '140', '160'],
    ['Sunflower Oil 1L', 'OIL-SUN-1L', 'c-oil', 'pcs', '0', '12', '135', '150'],
    ['Glucose Biscuits', 'BIS-GLU', 'c-snacks', 'pcs', '64', '30', '8', '10'],
    ['Curd 500g', 'DAI-CURD', 'c-dairy', 'pcs', '9', '10', '28', '35'],
  ];
  db.products = rows.map(([name, sku, cat, unit, stock, min, cost, price], i) => ({
    id: `p-${i + 1}`,
    name: `[MOCK] ${name}`,
    sku,
    barcode: null,
    category: categories.find((c) => c.id === cat) ?? null,
    description: null,
    base_unit: u(unit),
    current_stock: stock,
    min_stock: min,
    purchase_cost: cost,
    selling_price: price,
    preferred_supplier: suppliers[i % 2] ?? null,
    status: 'active',
    stock_status: deriveStockStatus(stock, min),
    updated_at: new Date(Date.now() - i * 3_600_000).toISOString(),
    created_at: now(),
  }));
  db.movements = db.products.slice(0, 4).map((p, i) => ({
    id: `m-${i + 1}`,
    reference: `MOCK-${1000 + i}`,
    product: { id: p.id, name: p.name, sku: p.sku },
    movement_type: i % 2 ? 'stock_out' : 'stock_in',
    quantity: i % 2 ? '2' : '1',
    unit_code: p.base_unit.code === 'kg' ? 'bag' : p.base_unit.code,
    base_quantity_change: i % 2 ? '-2' : '50',
    base_unit_code: p.base_unit.code,
    balance_after: p.current_stock,
    reason: i % 2 ? 'sold' : null,
    notes: null,
    source: i === 0 ? 'voice' : 'manual',
    status: 'committed',
    performed_by: { id: 'u-1', full_name: db.user?.full_name ?? 'Mock User' },
    created_at: new Date(Date.now() - i * 5_400_000).toISOString(),
  }));
}

/** Product-specific pack sizes (demo). Real factors come from the backend. */
export const mockConversions: Record<string, { unit_code: string; unit_name: string; factor_to_base: string; kind: 'standard' | 'shop_specific' }[]> = {
  kg: [
    { unit_code: 'kg', unit_name: 'Kilograms', factor_to_base: '1', kind: 'standard' },
    { unit_code: 'g', unit_name: 'Grams', factor_to_base: '0.001', kind: 'standard' },
    { unit_code: 'quintal', unit_name: 'Quintals', factor_to_base: '100', kind: 'standard' },
    { unit_code: 'bag', unit_name: 'Bags (50 kg)', factor_to_base: '50', kind: 'shop_specific' },
  ],
  pcs: [
    { unit_code: 'pcs', unit_name: 'Pieces', factor_to_base: '1', kind: 'standard' },
    { unit_code: 'dozen', unit_name: 'Dozens', factor_to_base: '12', kind: 'standard' },
    { unit_code: 'carton', unit_name: 'Cartons (24 pcs)', factor_to_base: '24', kind: 'shop_specific' },
  ],
};
