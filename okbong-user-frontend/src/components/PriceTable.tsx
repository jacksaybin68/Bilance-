'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from '@/components/ui/Feedback';
import { priceApi } from '@/lib/api/endpoints';
import { formatNumber } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { toFiniteNumber } from '@/lib/parsers';

export interface CoinSymbol {
  symbol: string;
  basePrice: number;
}

export const DEFAULT_COINS: CoinSymbol[] = [
  { symbol: 'BDSD', basePrice: 100 },
  { symbol: 'BTC', basePrice: 50000 },
  { symbol: 'ETH', basePrice: 3000 },
];

const HISTORY_POINTS = 20;

interface CoinState {
  symbol: string;
  price: number;
  history: number[];
  change24h: number;
}

function buildSparkline(values: number[]): string {
  if (values.length < 2) return '';

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 60;
      const y = 30 - ((value - min) / range) * 28;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

interface SparklineProps {
  values: number[];
  positive: boolean;
}

function Sparkline({ values, positive }: SparklineProps) {
  const path = useMemo(() => buildSparkline(values), [values]);
  if (!path) return null;

  return (
    <svg
      viewBox="0 0 60 32"
      preserveAspectRatio="none"
      className="h-8 w-16"
      aria-hidden="true"
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        className={positive ? 'text-emerald-500' : 'text-red-500'}
      />
    </svg>
  );
}

interface PriceTableProps {
  /** Danh sách coin hiển thị (mặc định: BDSD, BTC, ETH) */
  coins?: CoinSymbol[];
  /** Hiển thị link đến /price/:symbol */
  showDetailLink?: boolean;
}

/** Renders a polling market table with short price-history sparklines. */
export function PriceTable({ coins = DEFAULT_COINS, showDetailLink = true }: PriceTableProps) {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState<CoinState[]>(() =>
    coins.map(({ symbol, basePrice }) => ({
      symbol,
      price: basePrice,
      history: Array.from({ length: HISTORY_POINTS }, (_, i) =>
        Number((basePrice * (1 + Math.sin(i / 3) * 0.005)).toFixed(2)),
      ),
      change24h: 0,
    })),
  );
  const [isOffline, setIsOffline] = useState(false);

  // Ref để giữ latest prices không re-trigger effects
  const latestPricesRef = useRef<Record<string, number>>({});

  // Fetch initial prices từ API
  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      try {
        const results = await Promise.allSettled(
          coins.map((c) => priceApi.current(c.symbol)),
        );

        if (cancelled) return;

        setRows((prev) =>
          prev.map((row, idx) => {
            const result = results[idx];
            if (result?.status === 'fulfilled') {
              const fetched = toFiniteNumber(result.value, row.price);
              latestPricesRef.current[row.symbol] = fetched;
              return { ...row, price: fetched };
            }
            return row;
          }),
        );
        setIsOffline(false);
      } catch {
        if (!cancelled) setIsOffline(true);
      }
    };

    void fetchAll();
    return () => {
      cancelled = true;
    };
  }, [coins]);

  // Tick mỗi 2 giây để cập nhật giá giả lập
  useEffect(() => {
    const timer = window.setInterval(() => {
      setRows((prev) =>
        prev.map((row) => {
          const drift = (Math.random() - 0.5) * 2;
          const newPrice = Math.max(row.price * (1 + drift / 100), 0.01);
          const newHistory = [...row.history, newPrice].slice(-HISTORY_POINTS);
          const first = newHistory[0] ?? newPrice;
          const change24h = first > 0 ? ((newPrice - first) / first) * 100 : 0;

          return {
            ...row,
            price: newPrice,
            history: newHistory,
            change24h,
          };
        }),
      );
    }, 2000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div>
      {isOffline ? (
        <Alert variant="info" message={t('market.offline')} className="mb-3" />
      ) : null}

      <div className="overflow-x-auto rounded-xl">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200/70 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700/60 dark:text-gray-400">
              <th className="py-3 pl-4 pr-2">{t('market.symbol')}</th>
              <th className="px-2 py-3 text-right">{t('market.price')}</th>
              <th className="px-2 py-3 text-right">{t('market.change')}</th>
              <th className="px-2 py-3">{t('market.chart')}</th>
              {showDetailLink ? <th className="py-3 pl-2 pr-4" /> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isPositive = row.change24h >= 0;

              return (
                <tr
                  key={row.symbol}
                  className="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50 dark:border-gray-700/40 dark:hover:bg-gray-700/30"
                >
                  {/* Symbol */}
                  <td className="py-3 pl-4 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-ink">
                        {row.symbol.slice(0, 2)}
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {row.symbol}
                      </span>
                    </div>
                  </td>

                  {/* Giá hiện tại */}
                  <td className="px-2 py-3 text-right font-mono font-semibold text-gray-900 dark:text-gray-100">
                    {formatNumber(row.price, locale)}
                  </td>

                  {/* % thay đổi */}
                  <td
                    className={`px-2 py-3 text-right font-medium tabular-nums ${
                      isPositive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {isPositive ? '+' : ''}
                    {row.change24h.toFixed(2)}%
                  </td>

                  {/* Sparkline */}
                  <td className="px-2 py-3">
                    <Sparkline values={row.history} positive={isPositive} />
                  </td>

                  {/* Link chi tiết */}
                  {showDetailLink ? (
                    <td className="py-3 pl-2 pr-4 text-right">
                      <Link
                        href="/price"
                        className="rounded-md px-2 py-1 text-xs font-medium text-ink hover:underline"
                      >
                        {t('market.detail')}
                      </Link>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-right text-xs text-gray-400 dark:text-gray-500">
        ⟳ {t('market.updated')}
      </p>
    </div>
  );
}
