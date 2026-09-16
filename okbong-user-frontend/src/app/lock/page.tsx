'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert } from '@/components/ui/Feedback';
import {
  FieldError,
  buildInputClass,
  labelClassName,
  primaryButtonClassName,
} from '@/components/ui/form';
import { ThemeToggle } from '@/components/theme-toggle/ThemeToggle';
import { LanguageToggle } from '@/components/language-toggle/LanguageToggle';
import { useI18n } from '@/lib/i18n';
import { validatePin } from '@/lib/validation';

const DEMO_PIN = '1234';

export default function LockScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validatePin(pin, t);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (pin.trim() !== DEMO_PIN) {
      setError(t('lock.error'));
      return;
    }

    setError('');
    router.push('/dashboard');
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-gray-200/70 bg-white p-8 shadow-xl dark:border-gray-700/60 dark:bg-gray-800">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('lock.title')}</h1>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>

        <Alert variant="error" message={error} className="mb-4" />

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div>
            <label className={labelClassName} htmlFor="lock-pin">
              {t('lock.pin')}
            </label>
            <input
              id="lock-pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              autoComplete="off"
              value={pin}
              onChange={(event) => {
                setPin(event.target.value.replace(/\D/g, ''));
                setError('');
              }}
              placeholder={t('lock.pin.placeholder')}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'lock-pin-error' : undefined}
              className={buildInputClass(Boolean(error))}
            />
            <FieldError id="lock-pin-error" message={error} />
          </div>

          <button type="submit" className={primaryButtonClassName}>
            {t('lock.unlock')}
          </button>
        </form>
      </div>
    </div>
  );
}
