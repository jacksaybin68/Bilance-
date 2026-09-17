'use client';

import { useI18n } from '@/lib/i18n';

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-gray-200/70 bg-white py-8 dark:border-gray-700/60 dark:bg-gray-900">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-center md:flex-row md:text-left">
        {/* `min-w-0` lets the long Vietnamese tagline wrap instead of forcing the
            flex row wider than the container and clipping the copyright. */}
        <div className="min-w-0">
          <div className="text-xl font-bold tracking-tighter text-ink">{t('app.name')}</div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('app.tagline')}</p>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 md:shrink-0">{t('footer.rights')}</p>
      </div>
    </footer>
  );
}