'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';
import { useI18n } from '@/lib/i18n';

/**
 * Route-segment error boundary (Next.js App Router file convention).
 * Wraps every page below the root layout; the root layout itself is covered
 * by `global-error.tsx`.
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    // Hook point for an external error-reporting service (Sentry, …).
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200/80 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500 ring-8 ring-red-500/10 dark:bg-red-950/50 dark:text-red-400">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('error.title')}</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('error.description')}</p>

        <button
          type="button"
          onClick={() => retry()}
          className="mt-6 rounded-xl bg-black px-5 py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-black"
        >
          {t('error.retry')}
        </button>
      </div>
    </div>
  );
}
