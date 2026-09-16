'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';

const STORAGE_KEY = 'theme';

function applyTheme(isDark: boolean): void {
  const root = document.documentElement;
  root.classList.toggle('dark', isDark);
  root.style.colorScheme = isDark ? 'dark' : 'light';
}

/**
 * Light/dark switcher. Reads the persisted preference (or the OS preference on
 * first visit) after mount so server and client markup stay identical.
 */
export function ThemeToggle() {
  const { t } = useI18n();
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let stored: string | null = null;

    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      stored = null;
    }

    const prefersDark =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    const nextIsDark = stored ? stored === 'dark' : prefersDark;

    setIsDark(nextIsDark);
    applyTheme(nextIsDark);
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    applyTheme(next);

    try {
      window.localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    } catch {
      // Ignore storage failures (private browsing).
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t('nav.theme.toggle')}
      aria-pressed={isDark}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300/70 bg-white/70 text-gray-600 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-gray-600/60 dark:bg-gray-800/70 dark:text-gray-200 dark:hover:bg-gray-700"
    >
      {mounted && isDark ? (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 1112 3a9 9 0 008.354 12.354z"
          />
        </svg>
      ) : (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      )}
    </button>
  );
}