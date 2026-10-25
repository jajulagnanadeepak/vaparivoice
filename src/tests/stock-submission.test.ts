import { act, renderHook } from '@testing-library/react';
import { ApiError } from '@/lib/api-error';
import { useStockSubmission } from '@/features/inventory/use-stock-submission';
import { inventoryService } from '@/services/inventory-service';
import type { StockMovement } from '@/types';

vi.mock('@/lib/query-client', () => ({ invalidateAfterStockChange: vi.fn() }));
const movement = { id: 'm1', product: { id: 'p1' } } as StockMovement;

describe('useStockSubmission', () => {
  it('shows success only with the server movement', async () => {
    const fn = vi.fn().mockResolvedValue(movement);
    const { result } = renderHook(() => useStockSubmission(fn));
    await act(() => result.current.submit({ product_id: 'p1' }));
    expect(result.current.state).toEqual({ status: 'success', movement });
  });

  it('reuses the idempotency key after an unknown outcome, and resolves it by lookup', async () => {
    const fn = vi.fn().mockRejectedValue(new ApiError({ kind: 'network', message: 'x', outcomeUnknown: true }));
    const { result } = renderHook(() => useStockSubmission(fn));
    await act(() => result.current.submit({ product_id: 'p1' }));
    expect(result.current.state.status).toBe('unknown');
    await act(async () => result.current.retry());
    expect(fn.mock.calls[0]![1]).toBe(fn.mock.calls[1]![1]); // same key both times

    vi.spyOn(inventoryService, 'lookupByKey').mockResolvedValue(movement);
    await act(() => result.current.checkStatus());
    expect(result.current.state).toEqual({ status: 'success', movement });
  });

  it('uses a fresh key after a definite failure', async () => {
    const fn = vi.fn().mockRejectedValue(new ApiError({ kind: 'validation', message: 'bad' }));
    const { result } = renderHook(() => useStockSubmission(fn));
    await act(() => result.current.submit({ product_id: 'p1' }));
    expect(result.current.state.status).toBe('failed');
    await act(async () => result.current.retry());
    expect(fn.mock.calls[0]![1]).not.toBe(fn.mock.calls[1]![1]);
  });

  it('refuses to send while offline', async () => {
    const fn = vi.fn();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const { result } = renderHook(() => useStockSubmission(fn));
    await act(() => result.current.submit({ product_id: 'p1' }));
    expect(fn).not.toHaveBeenCalled();
    expect(result.current.state).toMatchObject({ status: 'failed', offline: true });
    vi.restoreAllMocks();
  });
});
