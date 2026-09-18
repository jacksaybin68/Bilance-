'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, Spinner } from '@/components/ui/Feedback';
import { cardClassName } from '@/components/ui/form';
import { getErrorMessage } from '@/lib/api/client';
import { billApi, walletApi } from '@/lib/api/endpoints';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import type { MessageKey } from '@/lib/i18n/messages';
import { toFiniteNumber } from '@/lib/parsers';
import type { Bill, BillStatus, Wallet } from '@/types/api';

type LoadState = 'loading' | 'ready' | 'error';

const STATUS_LABEL: Record<BillStatus, MessageKey> = {
  draft: 'status.bill.draft',
  pending: 'status.bill.pending',
  processing: 'status.bill.processing',
  completed: 'status.bill.completed',
  cancelled: 'status.bill.cancelled',
};

const STATUS_CLASS: Record<BillStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-200',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-200',
};

export default function DashboardPage() {
  const { t, locale } = useI18n();
  const [state, setState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);

  const load = useCallback(async () => {
    setState('loading');
    setErrorMessage('');

    try {
      const [walletResult, billResult] = await Promise.allSettled([
        walletApi.listMine(),
        billApi.list(),
      ]);

      if (walletResult.status === 'fulfilled') setWallets(walletResult.value);
      if (billResult.status === 'fulfilled') setBills(billResult.value);

      const failure = [walletResult, billResult].find((result) => result.status === 'rejected');
      if (failure && failure.status === 'rejected') {
        setErrorMessage(getErrorMessage(failure.reason, t('dashboard.error')));
      }

      setState('ready');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('dashboard.error')));
      setState('error');
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalBalance = wallets.reduce((sum, wallet) => sum + toFiniteNumber(wallet.balance), 0);
  const currency = wallets[0]?.currency ?? 'BDSD';
  const metrics: { key: string; label: string; value: string }[] = [
    {
      key: 'balance',
      label: t('dashboard.balance'),
      value: formatCurrency(totalBalance, locale, currency),
    },
    {
      key: 'wallets',
      label: t('dashboard.transactions'),
      value: t('dashboard.transactions.count', { count: wallets.length }),
    },
    {
      key: 'bills',
      label: t('dashboard.bills'),
      value: t('dashboard.bills.count', { count: bills.length }),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-6 text-3xl font-bold text-gray-900 dark:text-gray-100">
        {t('dashboard.title')}
      </h1>

      <Alert
        variant="error"
        message={errorMessage}
        className="mb-4 flex flex-wrap items-center gap-3"
      />

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

          <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {metrics.map((metric) => (
              <div key={metric.key} className={cardClassName}>
                <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {metric.label}
                </p>
                <p className="mt-1 text-3xl font-bold text-primary">{metric.value}</p>
              </div>
            ))}
          </div>

          <div className={cardClassName}>
            <h2 className="mb-4 text-xl font-medium text-gray-900 dark:text-gray-100">
              {t('dashboard.recentBills')}
            </h2>

            {bills.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.empty')}</p>
            ) : (
              <ul className="max-h-96 space-y-3 overflow-y-auto">
                {bills.slice(0, 10).map((bill) => (
                  <li
                    key={bill.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-700/50"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-200">{bill.content}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[bill.status]}`}
                    >
                      {t(STATUS_LABEL[bill.status])}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDateTime(bill.createdAt, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
