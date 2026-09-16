'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Spinner } from '@/components/ui/Feedback';
import { buildInputClass, cardClassName, labelClassName } from '@/components/ui/form';
import { priceApi } from '@/lib/api/endpoints';
import { formatNumber } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { toFiniteNumber } from '@/lib/parsers';

const SYMBOLS = ['BDSD', 'BTC', 'ETH'] as const;
const HISTORY_LIMIT = 30;
const BASE_PRICE: Record<string, number> = { BDSD: 100, BTC: 50000, ETH: 3000 };

function basePriceFor(symbol: string): number {
  return BASE_PRICE[symbol] ?? 100;
}

function buildSparkline(values: number[]): string {
  if (values.length < 2) return '';

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

export default function PricePage() {
  const { t, locale } = useI18n();
  const [symbol, setSymbol] = useState<string>(SYMBOLS[0]);
  const [price, setPrice] = useState<number>(basePriceFor(SYMBOLS[0]));
  const [history, setHistory] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // Initial price + history for the selected symbol (REST, /price/*).
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);

      try {
        const [current, points] = await Promise.all([
          priceApi.current(symbol),
          priceApi.history(symbol, HISTORY_LIMIT),
        ]);

        if (cancelled) return;

        setPrice(toFiniteNumber(current, basePriceFor(symbol)));
        setHistory(
          points
            .map((point) => toFiniteNumber(point.price, 0))
            .filter((value) => value > 0)
            .slice(-HISTORY_LIMIT),
        );
        setIsOffline(false);
      } catch {
        if (cancelled) return;

        const base = basePriceFor(symbol);
        setIsOffline(true);
        setPrice(base);
        setHistory(
          Array.from({ length: HISTORY_LIMIT }, (_, index) =>
            Number((base * (1 + Math.sin(index / 3) * 0.01)).toFixed(2)),
          ),
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  // Live tick. The interval is created once per symbol (no `price` dependency)
  // so it no longer restarts on every price change.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setPrice((previous) => {
        const drift = (Math.random() - 0.5) * 2;
        return Math.max(previous * (1 + drift / 100), 0.01);
      });
    }, 2000);

    return () => window.clearInterval(timer);
  }, [symbol]);

  // Keep a rolling window of observations for the sparkline.
  useEffect(() => {
    setHistory((current) => [...current, price].slice(-HISTORY_LIMIT));
  }, [price]);

  const chartPath = useMemo(() => buildSparkline(history.length > 1 ? history : [price, price]), [history, price]);
  const changePercent = useMemo(() => {
    const first = history[0];
    if (first === undefined || first === 0) return 0;
    return ((price - first) / first) * 100;
  }, [history, price]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className={cardClassName}>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('price.title')}
          </h1>

          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="price-symbol">
              {t('price.symbol')}
            </label>
            <select
              id="price-symbol"
              value={symbol}
              onChange={(event) => setSymbol(event.target.value)}
              className={buildInputClass(false, 'w-auto')}
            >
              {SYMBOLS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-500 dark:text-gray-400">/{symbol}</span>
          </div>
        </div>

        {isOffline ? <Alert variant="info" message={t('price.offline')} className="mb-4" /> : null}

        {isLoading ? (
          <Spinner label={t('common.loading')} />
        ) : (
          <div className="h-64 rounded-xl bg-gray-100 p-2 dark:bg-gray-700/50">
            <svg
              role="img"
              aria-label={t('price.chartLabel', { symbol })}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="h-full w-full"
            >
              <path
                d={chartPath}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
                className="text-primary"
              />
            </svg>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('price.current')}:{' '}
            <span className="font-medium text-primary">{formatNumber(price, locale)}</span> {symbol}
            <span
              className={
                changePercent >= 0
                  ? 'ml-2 text-emerald-600 dark:text-emerald-400'
                  : 'ml-2 text-red-600 dark:text-red-400'
              }
            >
              {changePercent >= 0 ? '+' : ''}
              {changePercent.toFixed(2)}%
            </span>
          </p>

          <button
            type="button"
            onClick={() => setPrice(basePriceFor(symbol))}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            {t('price.reset')}
          </button>
        </div>
      </div>
    </div>
  );
}
