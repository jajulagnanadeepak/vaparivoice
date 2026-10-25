import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { LanguageCode } from '@/types/common';
import { INTL_LOCALE, SUPPORTED_LANGUAGES, translate, type TranslationKey } from '@/locales';
import { setApiLanguage } from '@/lib/api-client';

const STORAGE_KEY = 'vs_ui_language'; // UI preference only; not sensitive

interface I18nValue {
  lang: LanguageCode;
  locale: string;
  setLang: (l: LanguageCode) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

function initialLang(): LanguageCode {
  const stored = localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
  if (stored && SUPPORTED_LANGUAGES.includes(stored)) return stored;
  // First visit: follow the device language when we support it.
  const device = navigator.language.slice(0, 2) as LanguageCode;
  return SUPPORTED_LANGUAGES.includes(device) ? device : 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LanguageCode>(initialLang);

  setApiLanguage(lang); // sync before children fetch
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: LanguageCode) => {
    localStorage.setItem(STORAGE_KEY, l);
    setLangState(l);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({ lang, locale: INTL_LOCALE[lang], setLang, t: (key, vars) => translate(lang, key, vars) }),
    [lang, setLang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
