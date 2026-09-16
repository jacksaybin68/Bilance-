'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, Spinner } from '@/components/ui/Feedback';
import { FieldError, buildInputClass, cardClassName, labelClassName } from '@/components/ui/form';
import { getErrorMessage } from '@/lib/api/client';
import { getStoredUser } from '@/lib/auth/session';
import { walletApi } from '@/lib/api/endpoints';
import { formatCurrency } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import type { MessageKey } from '@/lib/i18n/messages';
import { toFiniteNumber } from '@/lib/parsers';
import type { Wallet, WalletStatus, WalletType } from '@/types/api';

type LoadState = 'loading' | 'ready' | 'error';
type WalletAction = 'deposit' | 'withdraw';

const TYPE_LABEL: Record<WalletType, MessageKey> = {
  'e-wallet': 'wallet.type.e-wallet',
  bank: 'wallet.type.bank',
};

const STATUS_LABEL: Record<WalletStatus, MessageKey> = {
  active: 'wallet.status.active',
  pending: 'wallet.status.pending',
  verified: 'wallet.status.verified',
  blocked: 'wallet.status.blocked',
};

const STATUS_CLASS: Record<WalletStatus, string> = {
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
  verified: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-200',
  blocked: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-200',
};

export default function WalletPage() {
  const { t, locale } = useI18n();
  const [state, setState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [dialog, setDialog] = useState<{ action: WalletAction; wallet: Wallet } | null>(null);
  const [amountStr, setAmountStr] = useState('');
  const [actionError, setActionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    setState('loading');
    setErrorMessage('');

    try {
      setWallets(await walletApi.listMine());
      setState('ready');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('wallet.error')));
      setState('error');
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDialog = (action: WalletAction, wallet: Wallet) => {
    setAmountStr('');
    setActionError('');
    setDialog({ action, wallet });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dialog) return;

    setActionError('');
    const amount = Number(amountStr.replace(/,/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) {
      setActionError(t('wallet.amountInvalid'));
      return;
    }

    const user = getStoredUser();
    if (!user) {
      setActionError(t('wallet.error'));
      return;
    }

    setIsSubmitting(true);
    try {
      const mutate =
        dialog.action === 'deposit'
          ? walletApi.deposit({ userId: user.id, amount, type: dialog.wallet.type })
          : walletApi.withdraw({ userId: user.id, amount, type: dialog.wallet.type });
      await mutate;

      setNotice(t(dialog.action === 'deposit' ? 'wallet.depositSuccess' : 'wallet.withdrawSuccess'));
      setDialog(null);
      setAmountStr('');
      await load();
    } catch (error) {
      setActionError(getErrorMessage(error, t('wallet.actionError')));
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalBalance = wallets.reduce((sum, wallet) => sum + toFiniteNumber(wallet.balance), 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-6 text-3xl font-bold text-gray-900 dark:text-gray-100">
        {t('wallet.title')}
      </h1>

      <Alert variant="success" message={notice} className="mb-4" />
      <Alert variant="error" message={errorMessage} className="mb-4 flex flex-wrap items-center gap-3" />

      {state === 'loading' ? (
        <Spinner label={t('common.loading')} />
      ) : (
        <>
          {state === 'error' ? (
            <button
              type="button"
              onClick={() => void load()}
              className="mb-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
            >
              {t('common.retry')}
            </button>
          ) : null}

          {wallets.length === 0 ? (
            <div className={cardClassName}>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('wallet.noWallet')}</p>
            </div>
          ) : (
            <>
              <div className={`${cardClassName} mb-6`}>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('wallet.totalBalance')}
                </p>
                <p className="mt-1 text-3xl font-bold text-primary">
                  {formatCurrency(totalBalance, locale, wallets[0]?.currency ?? 'BDSD')}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {wallets.map((wallet) => (
                  <div key={wallet.id} className={cardClassName}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {t(TYPE_LABEL[wallet.type])}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[wallet.status]}`}
                      >
                        {t(STATUS_LABEL[wallet.status])}
                      </span>
                    </div>

                    <p className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(toFiniteNumber(wallet.balance), locale, wallet.currency)}
                    </p>

                    <div className="mt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={() => openDialog('deposit', wallet)}
                        className="flex-1 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-500"
                      >
                        {t('wallet.deposit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => openDialog('withdraw', wallet)}
                        className="flex-1 rounded-xl border border-gray-200 py-2 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        {t('wallet.withdraw')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
      {dialog ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t(dialog.action === 'deposit' ? 'wallet.deposit' : 'wallet.withdraw')}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {t(dialog.action === 'deposit' ? 'wallet.deposit' : 'wallet.withdraw')}
                </h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t(TYPE_LABEL[dialog.wallet.type])} · {dialog.wallet.currency}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDialog(null)}
                aria-label={t('common.close')}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
              <div>
                <label htmlFor="wallet-amount" className={labelClassName}>
                  {t('wallet.amount')}
                </label>
                <input
                  id="wallet-amount"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder={t('wallet.amountPlaceholder')}
                  className={buildInputClass(Boolean(actionError))}
                />
                <FieldError id="wallet-amount-error" message={actionError} />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDialog(null)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 rounded-xl py-2.5 text-xs font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    dialog.action === 'deposit'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {isSubmitting ? t('wallet.processing') : t('wallet.confirm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}