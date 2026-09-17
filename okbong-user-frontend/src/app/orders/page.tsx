'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, Spinner } from '@/components/ui/Feedback';
import { buildInputClass, cardClassName, labelClassName } from '@/components/ui/form';
import { getErrorMessage } from '@/lib/api/client';
import { orderApi, walletApi } from '@/lib/api/endpoints';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { toFiniteNumber } from '@/lib/parsers';
import type { Order, OrderSide, OrderStatus, Wallet } from '@/types/api';

type LoadState = 'loading' | 'ready' | 'error';

const SIDE_LABEL: Record<OrderSide, string> = {
  buy: 'Mua (lên)',
  sell: 'Bán (xuống)',
};

const SIDE_CLASS: Record<OrderSide, string> = {
  buy: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200',
  sell: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-200',
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Chờ kết quả',
  win: 'Thắng',
  lose: 'Thua',
};

const STATUS_CLASS: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
  win: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200',
  lose: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-200',
};

export default function OrdersPage() {
  const { t, locale } = useI18n();
  const [state, setState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);

  const [pair, setPair] = useState('BDSD/USDT');
  const [side, setSide] = useState<OrderSide>('buy');
  const [amountStr, setAmountStr] = useState('');
  const [priceStr, setPriceStr] = useState('');
  const [orderError, setOrderError] = useState('');
  const [orderNotice, setOrderNotice] = useState('');
  const [isPlacing, setIsPlacing] = useState(false);

  const balance =
    wallets.length > 0
      ? wallets.reduce((sum, wallet) => sum + toFiniteNumber(wallet.balance), 0)
      : 0;
  const currency = wallets[0]?.currency ?? 'BDSD';

  const load = useCallback(async () => {
    setState('loading');
    setErrorMessage('');
    try {
      const [walletResult, ordersResult] = await Promise.allSettled([
        walletApi.listMine(),
        orderApi.mine({ page: 1, limit: 20 }),
      ]);
      if (walletResult.status === 'fulfilled') setWallets(walletResult.value);
      if (ordersResult.status === 'fulfilled') {
        setOrders(ordersResult.value.items);
        setTotal(ordersResult.value.total);
      }
      setState('ready');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('orders.error')));
      setState('error');
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const amount = toFiniteNumber(amountStr);
  const price = toFiniteNumber(priceStr);

  const handlePlaceOrder = async () => {
    if (!pair.trim() || amount <= 0 || isPlacing) {
      setOrderError(t('orders.invalidAmount'));
      return;
    }

    setIsPlacing(true);
    setOrderError('');
    setOrderNotice('');
    try {
      const created = await orderApi.create({
        pair: pair.trim().toUpperCase(),
        side,
        amount,
        price: price > 0 ? price : undefined,
      });
      setOrderNotice(
        `${t('orders.held')} ${formatCurrency(amount, locale, currency)} — #${created.id.slice(0, 8)}`,
      );
      setAmountStr('');
      await load();
    } catch (error) {
      setOrderError(getErrorMessage(error, t('orders.placeError')));
    } finally {
      setIsPlacing(false);
    }
  };

  if (state === 'loading') {
    return (
      <div className={`${cardClassName} flex items-center justify-center py-20`}>
        <Spinner label={t('common.loading')} />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="mx-auto max-w-5xl">
        <Alert variant="error" message={errorMessage} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t('orders.title')}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('orders.subtitle')}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white/80 px-4 py-2 text-right text-sm shadow-sm dark:border-gray-800 dark:bg-gray-900/80">
          <p className="text-xs text-gray-500">{t('chat.balanceLabel')}</p>
          <p className="text-lg font-bold text-emerald-600">
            {balance.toLocaleString(locale)}{' '}
            <span className="text-xs">{currency}</span>
          </p>
        </div>
      </div>

      {/* Place order form */}
      <div className={`${cardClassName} mb-6`}>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {t('orders.place')}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
          <div className="sm:col-span-1">
            <label className={labelClassName}>{t('orders.pair')}</label>
            <input
              value={pair}
              onChange={(event) => setPair(event.target.value)}
              className={buildInputClass(false)}
              placeholder="BDSD/USDT"
            />
          </div>
          <div className="sm:col-span-1">
            <label className={labelClassName}>{t('orders.side')}</label>
            <div className="flex gap-1">
              {(['buy', 'sell'] as OrderSide[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSide(option)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                    side === option
                      ? option === 'buy'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  {SIDE_LABEL[option]}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-1">
            <label className={labelClassName}>{t('orders.amount')}</label>
            <input
              value={amountStr}
              onChange={(event) => setAmountStr(event.target.value)}
              inputMode="decimal"
              className={buildInputClass(false)}
              placeholder="100000"
            />
          </div>
          <div className="sm:col-span-1">
            <label className={labelClassName}>{t('orders.price')}</label>
            <input
              value={priceStr}
              onChange={(event) => setPriceStr(event.target.value)}
              inputMode="decimal"
              className={buildInputClass(false)}
              placeholder="25450"
            />
          </div>
          <div className="flex items-end sm:col-span-1">
            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={isPlacing}
              className={`w-full rounded-lg px-4 py-2 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                side === 'buy' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isPlacing ? <Spinner label="" /> : t('orders.submit')}
            </button>
          </div>
        </div>
        {orderError && (
          <div className="mt-3">
            <Alert variant="error" message={orderError} />
          </div>
        )}
        {orderNotice && (
          <div className="mt-3">
            <Alert variant="success" message={orderNotice} />
          </div>
        )}
        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">{t('orders.heldHint')}</p>
      </div>

      {/* Order list */}
      <div className={`${cardClassName}`}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t('orders.history')} ({total})
          </h2>
        </div>
        {orders.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">
            {t('orders.empty')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:border-gray-800">
                  <th className="pb-2 pr-4">{t('orders.pair')}</th>
                  <th className="pb-2 pr-4">{t('orders.side')}</th>
                  <th className="pb-2 pr-4">{t('orders.amount')}</th>
                  <th className="pb-2 pr-4">{t('orders.price')}</th>
                  <th className="pb-2 pr-4">{t('orders.status')}</th>
                  <th className="pb-2 pr-4">{t('orders.createdAt')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="py-2.5 pr-4 font-semibold">{order.pair}</td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${SIDE_CLASS[order.side]}`}
                      >
                        {SIDE_LABEL[order.side]}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">{formatCurrency(toFiniteNumber(order.amount), locale, currency)}</td>
                    <td className="py-2.5 pr-4">
                      {toFiniteNumber(order.price) > 0
                        ? toFiniteNumber(order.price).toLocaleString(locale)
                        : '—'}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_CLASS[order.status]}`}
                      >
                        {STATUS_LABEL[order.status]}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-gray-500 dark:text-gray-400">
                      {formatDateTime(order.createdAt, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}