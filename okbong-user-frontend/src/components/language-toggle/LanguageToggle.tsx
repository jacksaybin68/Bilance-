'use client';

import { useI18n } from '@/lib/i18n';
import { LOCALE_LABELS, LOCALES } from '@/lib/i18n/messages';

/**
 * Compact language switcher (vi / en). Rendered on every screen so the
 * preference can be changed without navigating away.
 */
export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      className="inline-flex items-center rounded-full border border-gray-300/70 bg-white/70 p-0.5 text-xs font-medium dark:border-gray-600/60 dark:bg-gray-800/70"
      role="group"
      aria-label={t('nav.language.toggle')}
    >
      {LOCALES.map((option) => {
        const isActive = option === locale;

        return (
          <button
            key={option}
            type="button"
            onClick={() => setLocale(option)}
            aria-pressed={isActive}
            className={[
              'rounded-full px-2.5 py-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              isActive
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700',
            ].join(' ')}
          >
            {option === 'vi' ? 'VI' : 'EN'}
            <span className="sr-only"> {LOCALE_LABELS[option]}</span>
          </button>
        );
      })}
    </div>
  );
}