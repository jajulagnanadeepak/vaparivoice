import type { DecimalString } from '@/types/common';

/** Backend sends decimals as strings to avoid float drift; we only convert for display. */
export function toNumber(v: DecimalString | number | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function formatCurrency(v: DecimalString | number | null | undefined, locale = 'en-IN', currency = 'INR') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(toNumber(v));
}

export function formatQuantity(v: DecimalString | number | null | undefined, unit?: string, locale = 'en-IN') {
  const s = new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(toNumber(v));
  return unit ? `${s} ${unit}` : s;
}

export function formatCompactNumber(v: number, locale = 'en-IN') {
  return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(v);
}

export function formatDateTime(iso: string, locale = 'en-IN', timeZone = 'Asia/Kolkata') {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(new Date(iso));
}

export function formatRelative(iso: string, locale = 'en-IN') {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), 'second');
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  return rtf.format(Math.round(diff / 86400), 'day');
}
