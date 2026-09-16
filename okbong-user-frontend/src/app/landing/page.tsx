'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Popup } from '@/components/popup/Popup';
import { useI18n } from '@/lib/i18n';
import type { MessageKey } from '@/lib/i18n/messages';

interface Feature {
  titleKey: MessageKey;
  bodyKey: MessageKey;
}

const FEATURES: Feature[] = [
  { titleKey: 'landing.feature.fast.title', bodyKey: 'landing.feature.fast.body' },
  { titleKey: 'landing.feature.secure.title', bodyKey: 'landing.feature.secure.body' },
  { titleKey: 'landing.feature.multichannel.title', bodyKey: 'landing.feature.multichannel.body' },
];

export default function LandingPage() {
  const { t } = useI18n();
  const [activePopup, setActivePopup] = useState<'login' | 'register' | null>(null);

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-gradient-to-b from-blue-50 to-gray-100 px-4 py-12 dark:from-gray-950 dark:to-gray-900">
      <div className="w-full max-w-4xl space-y-10 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tighter text-gray-900 dark:text-gray-100 sm:text-5xl md:text-6xl">
            {t('landing.welcome')}
          </h1>
          <p className="mx-auto max-w-2xl text-base text-gray-600 dark:text-gray-300 sm:text-lg">
            {t('landing.subtitle')}
          </p>
        </div>

        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <button
            type="button"
            onClick={() => setActivePopup('login')}
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-base font-medium text-white transition-colors hover:bg-blue-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 sm:text-lg"
          >
            {t('landing.login')}
          </button>
          <button
            type="button"
            onClick={() => setActivePopup('register')}
            className="inline-flex items-center justify-center rounded-md border border-gray-400 px-6 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-gray-200/40 dark:text-gray-200 dark:hover:bg-gray-800 sm:text-lg"
          >
            {t('landing.register')}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 text-left sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.titleKey}
              className="rounded-2xl border border-gray-200/70 bg-white p-6 shadow-sm dark:border-gray-700/60 dark:bg-gray-800"
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t(feature.titleKey)}
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{t(feature.bodyKey)}</p>
            </div>
          ))}
        </div>
      </div>

      <Popup
        isOpen={activePopup === 'login'}
        onClose={() => setActivePopup(null)}
        title={t('auth.login.title')}
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">{t('landing.subtitle')}</p>
        <Link
          href="/auth"
          className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 font-medium text-white transition-colors hover:bg-blue-600"
        >
          {t('auth.signIn')}
        </Link>
      </Popup>

      <Popup
        isOpen={activePopup === 'register'}
        onClose={() => setActivePopup(null)}
        title={t('auth.register.title')}
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">{t('landing.subtitle')}</p>
        <Link
          href="/auth"
          className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 font-medium text-white transition-colors hover:bg-blue-600"
        >
          {t('auth.createAccount')}
        </Link>
      </Popup>
    </div>
  );
}
