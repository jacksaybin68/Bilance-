'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, Spinner } from '@/components/ui/Feedback';
import { FieldError, buildInputClass, labelClassName } from '@/components/ui/form';
import { getErrorMessage } from '@/lib/api/client';
import { getStoredUser } from '@/lib/auth/session';
import { billApi } from '@/lib/api/endpoints';
import { useI18n } from '@/lib/i18n';
import type { MessageKey } from '@/lib/i18n/messages';
import type { Bill, BillStatus, BillType } from '@/types/api';

type LoadState = 'loading' | 'ready' | 'error';

const TYPE_LABEL: Record<BillType, string> = {
  recurring: 'Hoa don dinh ky',
  payment: 'Thanh toan',
  charging: 'Thu phi',
};

const STATUS_LABEL: Record<BillStatus, string> = {
  pending: 'Chờ xử lý',
  paid: 'Đã thanh toán',
  cancelled: 'Đã huỷ',
};

const STATUS_CLASS: Record<BillStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200',
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-200',
};

export default function PaymentHistoryPage() {
  const { t, locale } = useI18n();
  const [state, setState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [bills, setBills] = useState<Bill[]>([]);

  const load = useCallback(async () => {
    setState('loading');
    setErrorMessage('');
    try {
      setBills(await billApi.list());
      setState('ready');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('payment.error')));
      setState('error');
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-6 text-3xl font-bold text-gray-900 dark:text-gray-100">
        {t('payment.title')}
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

          {bills.length === 0 ? (
            <div className="rounded-2xl border border-gray-200/70 bg-white p-6 shadow-sm dark:border-gray-700/60 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('payment.empty')}
              </p>
              <button
                type="button"
                onClick={() => void load()}
                className="mt-3 inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-600"
              >
                {t('common.retry')}
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200/70 bg-white p-6 shadow-sm dark:border-gray-700/60 dark:bg-gray-800">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('payment.history')}
                </h2>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {bills.length} {t('payment.items')}
                </span>
              </div>

              <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                {bills.map((bill) => (
                  <div
                    key={bill.id}
                    className="py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {bill.content ?? t('payment.noReference')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t(TYPE_LABEL[bill.type])} ·{' '}
                          {new Date(bill.createdAt).toLocaleDateString(locale, {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          {String(bill.amount).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STATUS_CLASS[bill.status]}`}
                        >
                          {t(STATUS_LABEL[bill.status])}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
