import { previewStock, toBase, withBaseUnit } from '@/lib/units';

describe('stock preview', () => {
  it('converts bags to kg using the backend factor (rice example)', () => {
    expect(toBase('2', '50')).toBe(100);
    expect(previewStock('500', '2', '50', 'in')).toMatchObject({ current: 500, delta: 100, after: 600, insufficient: false });
  });
  it('flags removals larger than the balance', () => {
    expect(previewStock('3', '5', '1', 'out')).toMatchObject({ after: -2, insufficient: true });
  });
  it('computes a correction as the difference to the counted quantity', () => {
    expect(previewStock('18', '20', '1', 'set')).toMatchObject({ delta: 2, after: 20 });
    expect(previewStock('18', '18', '1', 'set').delta).toBe(0);
  });
  it('avoids float drift on grams', () => {
    expect(previewStock('1.1', '200', '0.001', 'in').after).toBe(1.3);
  });
  it('always offers the base unit', () => {
    const list = withBaseUnit({ code: 'kg', name: 'Kilograms', dimension: 'mass' }, undefined);
    expect(list).toEqual([{ unit_code: 'kg', unit_name: 'Kilograms', factor_to_base: '1', kind: 'standard' }]);
  });
});
