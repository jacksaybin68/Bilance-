'use client';

import { useCallback, useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/Feedback';
import { cardClassName } from '@/components/ui/form';
import { useI18n } from '@/lib/i18n';
import { useMarketData } from '@/lib/market/useMarketData';
import { findCoin } from '@/lib/market/types';
import { CoinIcon } from '@/components/crypto-icons/CoinIcon';

const DEFAULT_PAIRS = [
  { from: 'USDT', to: 'BTC' },
  { from: 'USDT', to: 'ETH' },
  { from: 'USDT', to: 'SOL' },
  { from: 'BTC', to: 'ETH' },
];

export default function TradePage() {
  const { t, locale } = useI18n();
  const { coins, meta, state, isStale, refresh } = useMarketData({ refreshMs: 30_000 });
  const [selectedPair, setSelectedPair] = useState(DEFAULT_PAIRS[0]);
  const [amount, setAmount] = useState<string>('');

  const fromCoin = findCoin(coins, selectedPair.from);
  const toCoin = findCoin(coins, selectedPair.to);
  const fromPrice = fromCoin?.price ?? 0;
  const toPrice = toCoin?.price ?? 0;
  const rate = toPrice > 0 && fromPrice > 0 ? fromPrice / toPrice : 0;
  const output = amount ? parseFloat(amount || '0') * rate : 0;

  // Nhãn thời gian dữ liệu thật (không hardcode chu kỳ làm mới).
  const updatedLabel = meta.updatedAt
    ? t('market.updatedAt', {
        time: new Date(meta.updatedAt).toLocaleTimeString(locale === 'vi' ? 'vi-VN' : 'en-US'),
      })
    : t('trade.autoRefresh');

  const handleSwap = useCallback(() => {
    setSelectedPair((prev) => ({ from: prev.to, to: prev.from }));
    setAmount('');
  }, []);

  if (state === 'loading' && coins.length === 0) {
    return <Spinner label={t('common.loading')} />;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t('trade.title')}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            ⟳ {updatedLabel}
            {isStale && <span className="ml-2 text-amber-600">{t('trade.stale')}</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          {t('market.refresh')}
        </button>
      </div>

      <div className={cardClassName}>
        {/* Pair Selector */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('trade.pair')}
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {DEFAULT_PAIRS.map((pair) => {
              const isActive = pair.from === selectedPair.from && pair.to === selectedPair.to;
              return (
                <button
                  key={`${pair.from}-${pair.to}`}
                  type="button"
                  onClick={() => setSelectedPair(pair)}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="font-bold">{pair.from}</span>
                  <span className="text-gray-400">/</span>
                  <span className="font-bold">{pair.to}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Swap UI */}
        <div className="mb-6 flex items-center justify-center gap-4">
          {/* From */}
          <div className="flex-1 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">{t('trade.youPay')}</span>
              <span className="text-xs text-gray-400">{fromCoin?.symbol ?? ''}</span>
            </div>
            <div className="flex items-center gap-3">
              <CoinIcon symbol={fromCoin?.symbol ?? 'USDT'} size={32} />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent text-2xl font-bold text-gray-900 outline-none dark:text-gray-100"
              />
            </div>
          </div>

          {/* Swap */}
          <button
            type="button"
            onClick={handleSwap}
            aria-label={t('trade.swap')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-md transition-transform hover:rotate-180"
          >
            ⇄
          </button>

          {/* To */}
          <div className="flex-1 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">{t('trade.youReceive')}</span>
              <span className="text-xs text-gray-400">{toCoin?.symbol ?? ''}</span>
            </div>
            <div className="flex items-center gap-3">
              <CoinIcon symbol={toCoin?.symbol ?? 'BTC'} size={32} />
              <div className="w-full text-2xl font-bold text-gray-900 dark:text-gray-100">
                {output > 0 ? output.toFixed(6) : '0.000000'}
              </div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="mb-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>
            {t('trade.rateLine', {
              from: selectedPair.from,
              rate: rate.toFixed(6),
              to: selectedPair.to,
            })}
          </span>
          <span>{t('p2p.kycRequired')}</span>
        </div>

        {/* Submit */}
        <button
          type="button"
          disabled={!amount || parseFloat(amount) <= 0}
          className="w-full rounded-md bg-primary px-6 py-3 text-base font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t('trade.buy', { token: selectedPair.to })}
        </button>
      </div>

      {/* Recent Pairs */}
      <h2 className="mt-6 mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
        {t('trade.recent')}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {DEFAULT_PAIRS.map((pair) => {
          const fc = findCoin(coins, pair.from);
          const tc = findCoin(coins, pair.to);
          const r =
            tc && fc && fc.price > 0 && tc.price > 0
              ? (fc.price / tc.price).toFixed(4)
              : '—';
          return (
            <div
              key={`${pair.from}-${pair.to}`}
              className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700"
            >
              <div className="flex items-center gap-2">
                <CoinIcon symbol={pair.from} size={24} />
                <span className="font-bold">{pair.from}</span>
                <span className="text-gray-400">/</span>
                <CoinIcon symbol={pair.to} size={24} />
                <span className="font-bold">{pair.to}</span>
              </div>
              <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                {t('trade.pairRate', { from: pair.from, rate: r, to: pair.to })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
