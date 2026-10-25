import { useCallback, useRef, useState } from 'react';
import { createIdempotencyKey } from '@/lib/api-client';
import { ApiError } from '@/lib/api-error';
import { invalidateAfterStockChange } from '@/lib/query-client';
import { inventoryService } from '@/services/inventory-service';
import type { StockMovement } from '@/types';

export type SubmissionState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'success'; movement: StockMovement }
  | { status: 'failed'; error: unknown; offline?: boolean }
  /** Request may or may not have committed: must not be shown as success OR failure. */
  | { status: 'unknown'; error: unknown }
  | { status: 'checking' }
  | { status: 'not_saved' };

/**
 * Safe submission for anything that changes stock.
 * - One idempotency key per user intent; retries after an unknown outcome reuse it, so the server de-duplicates.
 * - Success is only shown with the movement the server returned.
 * - Unknown outcomes can be resolved by looking the key up on the server.
 */
export function useStockSubmission<TBody extends { product_id: string }>(submitFn: (body: TBody, key: string) => Promise<StockMovement>) {
  const [state, setState] = useState<SubmissionState>({ status: 'idle' });
  const keyRef = useRef<string | null>(null);
  const bodyRef = useRef<TBody | null>(null);

  const run = useCallback(async (body: TBody) => {
    if (!navigator.onLine) {
      setState({ status: 'failed', error: null, offline: true });
      return;
    }
    keyRef.current ??= createIdempotencyKey();
    bodyRef.current = body;
    setState({ status: 'saving' });
    try {
      const movement = await submitFn(body, keyRef.current);
      invalidateAfterStockChange(body.product_id);
      setState({ status: 'success', movement });
    } catch (error) {
      if (error instanceof ApiError && error.outcomeUnknown) {
        setState({ status: 'unknown', error }); // keep the key: a retry must be de-duplicated
      } else {
        keyRef.current = null; // definitely not committed, so a fresh attempt gets a fresh key
        setState({ status: 'failed', error });
      }
    }
  }, [submitFn]);

  const checkStatus = useCallback(async () => {
    const key = keyRef.current;
    if (!key) return;
    setState({ status: 'checking' });
    try {
      const movement = await inventoryService.lookupByKey(key);
      if (movement) {
        invalidateAfterStockChange(movement.product.id);
        setState({ status: 'success', movement });
      } else {
        setState({ status: 'not_saved' });
      }
    } catch (error) {
      if (error instanceof ApiError && error.kind === 'not_found') setState({ status: 'not_saved' });
      else setState({ status: 'unknown', error });
    }
  }, []);

  /** Re-sends the same body with the same key (safe after unknown / not_saved). */
  const retry = useCallback(() => {
    if (bodyRef.current) void run(bodyRef.current);
  }, [run]);

  const reset = useCallback(() => {
    keyRef.current = null;
    bodyRef.current = null;
    setState({ status: 'idle' });
  }, []);

  return { state, submit: run, retry, checkStatus, reset };
}
