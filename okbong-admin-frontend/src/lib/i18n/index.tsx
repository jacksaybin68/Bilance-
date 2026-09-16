import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LOCALE, LOCALES, Locale, MessageKey, translate } from './messages';

const STORAGE_KEY = 'admin.locale';

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}

const fallback: I18nContextValue = {
  locale: DEFAULT_LOCALE,
  setLocale: () => undefined,
  t: (key, vars) => translate(DEFAULT_LOCALE, key, vars),
};

const I18nContext = createContext<I18nContextValue>(fallback);

function readStoredLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && (LOCALES as readonly string[]).includes(stored)) return stored as Locale;
  } catch {
    // ignore unavailable storage
  }
  return DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocaleState(readStoredLocale());
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // best effort only
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState((current) => (current === next ? current : next));
  }, []);

  const t = useCallback<I18nContextValue['t']>((key, vars) => translate(locale, key, vars), [locale]);

  const value = useMemo<I18nContextValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}

export { LOCALES, DEFAULT_LOCALE } from './messages';
export type { Locale, MessageKey } from './messages';