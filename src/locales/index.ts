import type { LanguageCode } from '@/types/common';
import { en, type Dictionary } from './en';
import { hi } from './hi';
import { te } from './te';
import type { DeepPartial } from './types';

/**
 * Language registry. To add a language:
 *  1. create `src/locales/<code>.ts` typed as `Dictionary` (complete) or `DeepPartial<Dictionary>` (falls back to English),
 *  2. add it to `LanguageCode` in types/common.ts and to this registry,
 *  3. set `enabled: true` once a native speaker has reviewed it.
 * Speech support is NOT declared here — it comes from the backend (`GET /voice/capabilities`).
 */
export const LANGUAGE_REGISTRY: Record<LanguageCode, { dictionary: DeepPartial<Dictionary>; intlLocale: string; nativeName: string; enabled: boolean }> = {
  te: { dictionary: te, intlLocale: 'te-IN', nativeName: 'తెలుగు', enabled: true },
  en: { dictionary: en, intlLocale: 'en-IN', nativeName: 'English', enabled: true },
  hi: { dictionary: hi, intlLocale: 'hi-IN', nativeName: 'हिन्दी', enabled: false }, // partial; enable after review
};

export const SUPPORTED_LANGUAGES = (Object.keys(LANGUAGE_REGISTRY) as LanguageCode[]).filter((l) => LANGUAGE_REGISTRY[l].enabled);
export const ALL_LANGUAGES = Object.keys(LANGUAGE_REGISTRY) as LanguageCode[];
export const INTL_LOCALE: Record<LanguageCode, string> = { en: 'en-IN', hi: 'hi-IN', te: 'te-IN' };

type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never;
type Paths<T> = { [K in keyof T]: T[K] extends string ? K : Join<K, Paths<T[K]>> }[keyof T];
export type TranslationKey = Paths<Dictionary>;

function lookup(dict: unknown, key: string): string | undefined {
  const v = key.split('.').reduce<unknown>((acc, part) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined), dict);
  return typeof v === 'string' ? v : undefined;
}

export function translate(lang: LanguageCode, key: TranslationKey, vars?: Record<string, string | number>): string {
  const template = lookup(LANGUAGE_REGISTRY[lang].dictionary, key) ?? lookup(en, key) ?? key;
  return vars ? template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`)) : template;
}

/** Flattened key list — used by the completeness test. */
export function allKeys(obj: object = en, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => (typeof v === 'string' ? [`${prefix}${k}`] : allKeys(v as object, `${prefix}${k}.`)));
}
