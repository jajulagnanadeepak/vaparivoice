import { emptyProductValues, formValuesToRequest, productSchema } from '@/features/products/product-schema';

const valid = { ...emptyProductValues, name: 'Rice', sku: 'RICE-01', base_unit_code: 'kg', min_stock: '50', purchase_cost: '52.50' };

describe('productSchema', () => {
  it('accepts a valid product', () => {
    expect(productSchema.safeParse(valid).success).toBe(true);
  });
  it('rejects negative or malformed numbers', () => {
    expect(productSchema.safeParse({ ...valid, min_stock: '-5' }).success).toBe(false);
    expect(productSchema.safeParse({ ...valid, purchase_cost: '1.234' }).success).toBe(false);
    expect(productSchema.safeParse({ ...valid, min_stock: 'abc' }).success).toBe(false);
  });
  it('rejects SKUs with spaces', () => {
    expect(productSchema.safeParse({ ...valid, sku: 'RICE 01' }).success).toBe(false);
  });
  it('never sends stock in the payload and nulls empty optionals', () => {
    const req = formValuesToRequest(valid);
    expect(req).not.toHaveProperty('current_stock');
    expect(req.selling_price).toBeNull();
    expect(req.purchase_cost).toBe('52.50');
  });
});
