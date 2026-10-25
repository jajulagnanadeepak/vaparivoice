import { deriveStockStatus } from '@/lib/stock-status';

describe('deriveStockStatus', () => {
  it('flags zero or negative as out of stock', () => {
    expect(deriveStockStatus('0', '10')).toBe('out_of_stock');
    expect(deriveStockStatus('-1', '10')).toBe('out_of_stock');
  });
  it('flags at-or-below minimum as low', () => {
    expect(deriveStockStatus('10', '10')).toBe('low_stock');
    expect(deriveStockStatus('9.5', '10')).toBe('low_stock');
  });
  it('is in stock above minimum', () => {
    expect(deriveStockStatus('10.001', '10')).toBe('in_stock');
  });
});
