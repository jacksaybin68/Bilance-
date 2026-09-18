'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Spinner } from '@/components/ui/Feedback';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { CoinIcon } from '@/components/crypto-icons/CoinIcon';
import { findCoin, isMarketCoin, type MarketCoin } from '@/lib/market/types';
import { useMarketData } from '@/lib/market/useMarketData';
import { priceApi } from '@/lib/api/endpoints';

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
  /** Danh sách symbol hiển thị (mặc định: BTC, ETH). Không chứa BDSD (token nội bộ). */
  symbols?: string[];
  /** Hiển thị link đến /price/:symbol */
  showDetailLink?: boolean;
}

export function PriceTable({ symbols = ['BTC', 'ETH'], showDetailLink = true }: PriceTableProps) {
  const { t } = useI18n();
  const { coins, meta, state, isStale, refresh } = useMarketData({ refreshMs: 30_000 });
  const [isOffline, setIsOffline] = useState<boolean>(false);

  // Lấy giá BDSD (token nội bộ) riêng qua REST — không có trong CoinGecko.
  const [bdsdPrice, setBdsdPrice] = useState<number>(100);
  const [bdsdLoaded, setBdsdLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    priceApi.current('BDSD')
      .then((p) => {
        if (cancelled) return;
        setBdsdPrice(p);
        setBdsdLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setIsOffline(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows: MarketCoin[] = useMemo(() => {
    const list = [...coins];
    if (bdsdLoaded) {
      list.push({
        id: 'bdsd',
        symbol: 'BDSD',
        name: 'NexTrading Token',
        image: null,
        price: bdsdPrice,
        currency: 'BDSD',
        change24h: 0,
        volume24h: null,
        marketCap: null,
        sparkline: [],
        updatedAt: meta.updatedAt ?? new Date().toISOString(),
        stale: false,
      });
    }
    return list;
  }, [coins, bdsdPrice, bdsdLoaded, meta.updatedAt]);

  if (state === 'loading' && coins.length === 0) {
    return <Spinner label={t('common.loading')} />;
  }

  return (
    <div>
      {isOffline ? (
        <Alert variant="info" message={t('market.offline')} className="mb-3" />
      ) : null}

      {coins.length === 0 && !isOffline ? (
        <Alert variant="info" message={t('market.error')} className="mb-3" />
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
            {rows.map((coin) => {
              const isPositive = coin.change24h >= 0;
              return (
                <tr
                  key={coin.symbol}
                  className="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50 dark:border-gray-700/40 dark:hover:bg-gray-700/30"
                >
                  {/* Symbol */}
                  <td className="py-3 pl-4 pr-2">
                    <div className="flex items-center gap-2">
                      <CoinIcon symbol={coin.symbol} src={coin.image} size={28} />
                      <div>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{coin.symbol}</span>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">{coin.name}</p>
                      </div>
                    </div>
                  </td>

                  {/* Giá hiện tại */}
                  <td className="px-2 py-3 text-right font-mono font-semibold text-gray-900 dark:text-gray-100">
                    {coin.price.toLocaleString('vi-VN')}
                  </td>

                  {/* % thay đổi */}
                  <td
                    className={`px-2 py-3 text-right font-medium tabular-nums ${
                      isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {isPositive ? '+' : ''}
                    {coin.change24h.toFixed(2)}%
                  </td>

                  {/* Sparkline */}
                  <td className="px-2 py-3">
                    <Sparkline values={coin.sparkline} positive={isPositive} />
                  </td>

                  {/* Link chi tiết */}
                  {showDetailLink ? (
                    <td className="py-3 pl-2 pr-4 text-right">
                      <Link
                        href="/price"
                        className="rounded-md px-2 py-1 text-xs font-medium text-primary hover:underline"
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

      <div className="mt-2 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
        <span>⟳ {t('market.updated')}</span>
        {isStale && (
          <button
            type="button"
            onClick={refresh}
            className="text-primary hover:underline font-medium"
          >
            {t('market.refresh')}
          </button>
        )}
      </div>
    </div>
  );
}
