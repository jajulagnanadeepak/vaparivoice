import { AxiosError, AxiosHeaders } from 'axios';
import { toApiError } from '@/lib/api-error';

const res = (status: number, data: unknown) =>
  new AxiosError('x', String(status), undefined, {}, { status, data, statusText: '', headers: new AxiosHeaders(), config: { headers: new AxiosHeaders() } });

describe('toApiError', () => {
  it('maps FastAPI 422 details to field errors', () => {
    const e = toApiError(res(422, { detail: [{ loc: ['body', 'sku'], msg: 'already used' }] }));
    expect(e.kind).toBe('validation');
    expect(e.fieldErrors).toEqual([{ field: 'sku', message: 'already used' }]);
  });
  it('never leaks server error details', () => {
    const e = toApiError(res(500, { detail: 'Traceback (most recent call last)...' }));
    expect(e.message).not.toMatch(/Traceback/);
  });
  it('marks a write with no response as outcome-unknown', () => {
    const err = new AxiosError('net', 'ERR_NETWORK', undefined, {});
    expect(toApiError(err, { mutating: true }).outcomeUnknown).toBe(true);
    expect(toApiError(err, { mutating: false }).outcomeUnknown).toBe(false);
  });
});
