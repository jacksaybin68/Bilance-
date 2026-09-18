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
import type { AuthTokens } from '@/types/api';
import {
  FieldErrors,
  LoginField,
  RegisterField,
  hasErrors,
  validateLoginForm,
  validateRegisterForm,
} from '@/lib/validation';

type Mode = 'login' | 'register' | '2fa';

const emptyLogin = { email: '', password: '' };
const emptyRegister = { email: '', password: '', confirmPassword: '', fullName: '' };

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

  const [twoFaSession, setTwoFaSession] = useState<{
    sessionId: string;
    email: string;
  } | null>(null);
  const [twoFaToken, setTwoFaToken] = useState('');
  const [twoFaError, setTwoFaError] = useState('');

  const switchMode = (next: Mode) => {
    setMode(next);
    setFormError('');
    setSuccessMessage('');
    setLoginErrors({});
    setRegisterErrors({});
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginErrors({});
    setFormError('');

    const errors = validateLoginForm(loginValues, t);
    setLoginErrors(errors);
    if (hasErrors(errors)) return;

    setIsSubmitting(true);
    try {
      const response = await authApi.login(loginValues);
      const typed = response as
        | AuthTokens
        | { requires2FA: true; sessionId: string; pendingSetup?: boolean };
      if ('requires2FA' in typed && typed.sessionId) {
        setTwoFaSession({
          sessionId: typed.sessionId,
          email: loginValues.email,
        });
        return;
      }
      if (!('accessToken' in typed)) {
        throw new Error('Invalid login response');
      }
      const profile = await userApi.me();
      saveSession(profile, typed.accessToken, typed.refreshToken);
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      setFormError(getErrorMessage(error, t('auth.error.invalid')));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify2FA = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTwoFaError('');
    if (!twoFaSession) return;

    setIsSubmitting(true);
    try {
      const response = await authApi.verify2fa({
        sessionId: twoFaSession.sessionId,
        token: twoFaToken,
      });
      const profile = await userApi.me();
      saveSession(profile, response.accessToken, response.refreshToken);
      setTwoFaSession(null);
      setTwoFaToken('');
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      setTwoFaError(getErrorMessage(error, t('auth.error.invalid')));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRegisterErrors({});
    setFormError('');

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
          registerValues.fullName.trim().length > 0
            ? registerValues.fullName.trim()
            : undefined,
      });
      setSuccessMessage(t('auth.success.register'));
      switchMode('login');
    } catch (error) {
      setFormError(getErrorMessage(error, t('auth.error.invalid')));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between">
          <LanguageToggle />
          <ThemeToggle />
        </div>

        <h1 className="mt-8 text-center text-3xl font-bold text-gray-900 dark:text-gray-100">
          {mode === 'login' ? t('auth.login.title') : t('auth.register.title')}
        </h1>

        <Alert variant="error" message={formError} className="mt-4" />
        <Alert variant="success" message={successMessage} className="mt-4" />

        {mode === '2fa' && twoFaSession ? (
          <form onSubmit={handleVerify2FA} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="email" className={labelClassName}>{t('auth.email')}</label>
              <input id="email" type="email" value={twoFaSession.email} disabled className={buildInputClass(false)} />
            </div>
            <div>
              <label htmlFor="token" className={labelClassName}>{t('auth.2fa.input.placeholder')}</label>
              <input
                id="token" type="text" inputMode="numeric" autoComplete="one-time-code"
                value={twoFaToken}
                onChange={(e) => setTwoFaToken(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder={t('auth.2fa.input.placeholder')}
                className={buildInputClass(Boolean(twoFaError))}
              />
              <FieldError id="token-error" message={twoFaError} />
            </div>
            <button type="submit" disabled={isSubmitting} className={`w-full ${primaryButtonClassName}`}>
              {isSubmitting ? t('common.save') : t('auth.signIn')}
            </button>
            <button type="button" onClick={() => { setTwoFaSession(null); setTwoFaToken(''); }} className="w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              {t('auth.2fa.backToLogin')}
            </button>
          </form>
        ) : mode === 'login' ? (
          <form onSubmit={handleLogin} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="email" className={labelClassName}>{t('auth.email')}</label>
              <input id="email" type="email" autoComplete="email" value={loginValues.email} onChange={(e) => setLoginValues((v) => ({ ...v, email: e.target.value }))} placeholder={t('auth.email.placeholder')} className={buildInputClass(Boolean(loginErrors.email))} />
              <FieldError id="email-error" message={loginErrors.email} />
            </div>
            <div>
              <label htmlFor="password" className={labelClassName}>{t('auth.password')}</label>
              <input id="password" type="password" autoComplete="current-password" value={loginValues.password} onChange={(e) => setLoginValues((v) => ({ ...v, password: e.target.value }))} placeholder={t('auth.password.placeholder')} className={buildInputClass(Boolean(loginErrors.password))} />
              <FieldError id="password-error" message={loginErrors.password} />
            </div>
            <button type="submit" disabled={isSubmitting} className={`w-full ${primaryButtonClassName}`}>
              {isSubmitting ? t('common.save') : t('auth.signIn')}
            </button>
            <button type="button" onClick={() => switchMode('register')} className="w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              {t('auth.noAccount')} {t('auth.createAccount')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="email" className={labelClassName}>{t('auth.email')}</label>
              <input id="email" type="email" autoComplete="email" value={registerValues.email} onChange={(e) => setRegisterValues((v) => ({ ...v, email: e.target.value }))} placeholder={t('auth.email.placeholder')} className={buildInputClass(Boolean(registerErrors.email))} />
              <FieldError id="email-error" message={registerErrors.email} />
            </div>
            <div>
              <label htmlFor="password" className={labelClassName}>{t('auth.password')}</label>
              <input id="password" type="password" autoComplete="new-password" value={registerValues.password} onChange={(e) => setRegisterValues((v) => ({ ...v, password: e.target.value }))} placeholder={t('auth.password.placeholder')} className={buildInputClass(Boolean(registerErrors.password))} />
              <FieldError id="password-error" message={registerErrors.password} />
            </div>
            <div>
              <label htmlFor="confirmPassword" className={labelClassName}>{t('auth.confirmPassword')}</label>
              <input id="confirmPassword" type="password" autoComplete="new-password" value={registerValues.confirmPassword} onChange={(e) => setRegisterValues((v) => ({ ...v, confirmPassword: e.target.value }))} placeholder={t('auth.password.placeholder')} className={buildInputClass(Boolean(registerErrors.confirmPassword))} />
              <FieldError id="confirmPassword-error" message={registerErrors.confirmPassword} />
            </div>
            <div>
              <label htmlFor="fullName" className={labelClassName}>{t('auth.fullName')}</label>
              <input id="fullName" type="text" autoComplete="name" value={registerValues.fullName} onChange={(e) => setRegisterValues((v) => ({ ...v, fullName: e.target.value }))} placeholder={t('auth.fullName.placeholder')} className={buildInputClass(Boolean(registerErrors.fullName))} />
              <FieldError id="fullName-error" message={registerErrors.fullName} />
            </div>
            <button type="submit" disabled={isSubmitting} className={`w-full ${primaryButtonClassName}`}>
              {isSubmitting ? t('common.save') : t('auth.createAccount')}
            </button>
            <button type="button" onClick={() => switchMode('login')} className="w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              {t('auth.hasAccount')} {t('auth.switchToLogin')}
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-xs text-gray-400 dark:text-gray-500">{t('footer.rights')}</p>
      </div>
    </div>
  );
}
