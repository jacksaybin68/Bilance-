'use client';

import Link from 'next/link';
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
import { authApi, userApi } from '@/lib/api/endpoints';
import { ApiError, getErrorMessage, tokenStore } from '@/lib/api/client';
import { saveSession } from '@/lib/auth/session';
import { useI18n } from '@/lib/i18n';
import {
  FieldErrors,
  LoginField,
  RegisterField,
  hasErrors,
  validateLoginForm,
  validateRegisterForm,
} from '@/lib/validation';

type Mode = 'login' | 'register';

const emptyLogin = { email: '', password: '' };
const emptyRegister = { email: '', password: '', confirmPassword: '', fullName: '' };

/** Renders the sign-in and registration flows and persists authenticated sessions. */
export default function AuthPage() {
  const { t } = useI18n();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('login');
  const [loginValues, setLoginValues] = useState(emptyLogin);
  const [registerValues, setRegisterValues] = useState(emptyRegister);
  const [loginErrors, setLoginErrors] = useState<FieldErrors<LoginField>>({});
  const [registerErrors, setRegisterErrors] = useState<FieldErrors<RegisterField>>({});
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setFormError('');
    setSuccessMessage('');
    setLoginErrors({});
    setRegisterErrors({});
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    setSuccessMessage('');

    const errors = validateLoginForm(loginValues, t);
    setLoginErrors(errors);
    if (hasErrors(errors)) return;

    setIsSubmitting(true);
    try {
      const tokens = await authApi.login({
        email: loginValues.email.trim(),
        password: loginValues.password,
      });

      tokenStore.set(tokens.accessToken, tokens.refreshToken);

      const profile = await userApi.me().catch(() => null);
      if (profile) {
        saveSession(profile, tokens.accessToken, tokens.refreshToken);
      }

      setSuccessMessage(t('auth.success.login'));
      router.push('/dashboard');
    } catch (error) {
      setFormError(
        error instanceof ApiError && error.isUnauthorized
          ? t('auth.error.invalid')
          : getErrorMessage(error, t('common.error')),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    setSuccessMessage('');

    const errors = validateRegisterForm(registerValues, t);
    setRegisterErrors(errors);
    if (hasErrors(errors)) return;

    setIsSubmitting(true);
    try {
      const trimmedEmail = registerValues.email.trim();
      await authApi.register({
        email: trimmedEmail,
        password: registerValues.password,
        fullName:
          registerValues.fullName.trim().length > 0 ? registerValues.fullName.trim() : undefined,
      });

      setSuccessMessage(t('auth.success.register'));
      setRegisterValues(emptyRegister);
      setLoginValues((current) => ({ ...current, email: trimmedEmail }));
      setMode('login');
    } catch (error) {
      setFormError(getErrorMessage(error, t('common.error')));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-gray-200/70 bg-white p-6 shadow-xl dark:border-gray-700/60 dark:bg-gray-800 sm:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {mode === 'login' ? t('auth.login.title') : t('auth.register.title')}
          </h1>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>

        <Alert variant="error" message={formError} className="mb-4" />
        <Alert variant="success" message={successMessage} className="mb-4" />

        <form
          className="space-y-4"
          onSubmit={mode === 'login' ? handleLogin : handleRegister}
          noValidate
        >
          {mode === 'register' ? (
            <Field
              id="register-fullName"
              label={t('auth.fullName')}
              value={registerValues.fullName}
              placeholder={t('auth.fullName.placeholder')}
              autoComplete="name"
              error={registerErrors.fullName}
              onChange={(value) =>
                setRegisterValues((current) => ({ ...current, fullName: value }))
              }
            />
          ) : null}

          <Field
            id={mode === 'login' ? 'login-email' : 'register-email'}
            type="email"
            label={t('auth.email')}
            value={mode === 'login' ? loginValues.email : registerValues.email}
            placeholder={t('auth.email.placeholder')}
            autoComplete="email"
            error={mode === 'login' ? loginErrors.email : registerErrors.email}
            onChange={(value) =>
              mode === 'login'
                ? setLoginValues((current) => ({ ...current, email: value }))
                : setRegisterValues((current) => ({ ...current, email: value }))
            }
          />

          <Field
            id={mode === 'login' ? 'login-password' : 'register-password'}
            type="password"
            label={t('auth.password')}
            value={mode === 'login' ? loginValues.password : registerValues.password}
            placeholder={t('auth.password.placeholder')}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            error={mode === 'login' ? loginErrors.password : registerErrors.password}
            onChange={(value) =>
              mode === 'login'
                ? setLoginValues((current) => ({ ...current, password: value }))
                : setRegisterValues((current) => ({ ...current, password: value }))
            }
          />

          {mode === 'register' ? (
            <Field
              id="register-confirmPassword"
              type="password"
              label={t('auth.confirmPassword')}
              value={registerValues.confirmPassword}
              placeholder={t('auth.password.placeholder')}
              autoComplete="new-password"
              error={registerErrors.confirmPassword}
              onChange={(value) =>
                setRegisterValues((current) => ({ ...current, confirmPassword: value }))
              }
            />
          ) : null}

          <button type="submit" disabled={isSubmitting} className={primaryButtonClassName}>
            {isSubmitting
              ? t('common.loading')
              : mode === 'login'
                ? t('auth.signIn')
                : t('auth.createAccount')}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          {mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}{' '}
          <button
            type="button"
            onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            className="font-medium text-ink hover:underline"
          >
            {mode === 'login' ? t('auth.switchToRegister') : t('auth.switchToLogin')}
          </button>
        </p>

        <p className="mt-6 text-center text-sm">
          <Link href="/landing" className="text-gray-500 hover:underline dark:text-gray-400">
            {t('app.name')}
          </Link>
        </p>
      </div>
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: 'text' | 'email' | 'password';
  placeholder?: string;
  autoComplete?: string;
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = 'text',
  placeholder,
  autoComplete,
}: FieldProps) {
  const errorId = `${id}-error`;

  return (
    <div>
      <label className={labelClassName} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={buildInputClass(Boolean(error))}
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}
