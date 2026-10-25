import { useCallback } from 'react';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-error';
import { useErrorMessage } from './use-error-message';

/** Maps FastAPI 422 field errors onto form fields; anything else becomes a translated toast. */
export function useApplyServerErrors() {
  const msg = useErrorMessage();
  return useCallback(<T extends FieldValues>(err: unknown, setError: UseFormSetError<T>, fields: readonly string[]) => {
    if (err instanceof ApiError && err.fieldErrors.length) {
      let mapped = false;
      for (const fe of err.fieldErrors) {
        if (fields.includes(fe.field)) { setError(fe.field as Path<T>, { message: fe.message }); mapped = true; }
      }
      if (mapped) return;
    }
    toast.error(msg(err));
  }, [msg]);
}
