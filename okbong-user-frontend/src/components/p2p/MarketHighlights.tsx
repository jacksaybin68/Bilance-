'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n';

export interface TrendingAsset {
  symbol: string;
  name: string;
  priceVnd: number;
  change24h: number; // Percentage, e.g. +3.42 or -1.15
  iconBg: string;
  iconChar: string;
}

export const TRENDING_ASSETS: TrendingAsset[] = [
  { symbol: 'USDT', name: 'Tether USD', priceVnd: 25450, change24h: 0.05, iconBg: 'bg-emerald-500', iconChar: '₮' },
  { symbol: 'BTC', name: 'Bitcoin', priceVnd: 1633890000, change24h: 2.84, iconBg: 'bg-amber-500', iconChar: '₿' },
  { symbol: 'ETH', name: 'Ethereum', priceVnd: 87802500, change24h: -1.26, iconBg: 'bg-indigo-500', iconChar: 'Ξ' },
  { symbol: 'SOL', name: 'Solana', priceVnd: 3868400, change24h: 6.42, iconBg: 'bg-purple-500', iconChar: 'S' },
  { symbol: 'DOGE', name: 'Dogecoin', priceVnd: 3181, change24h: 4.18, iconBg: 'bg-yellow-500', iconChar: 'Ð' },
  { symbol: 'ZEC', name: 'Zcash', priceVnd: 827125, change24h: -0.85, iconBg: 'bg-orange-500', iconChar: 'Z' },
];

interface MarketHighlightsProps {
  onSelectToken: (symbol: string) => void;
  activeToken?: string;
}

export function MarketHighlights({ onSelectToken, activeToken = 'USDT' }: MarketHighlightsProps) {
  const { t } = useI18n();

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {t('p2p.marketHighlights')}
        </h3>
        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          Cập nhật thời gian thực
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {TRENDING_ASSETS.map((asset) => {
          const isSelected = activeToken === asset.symbol;
          const isPositive = asset.change24h >= 0;

          return (
            <button
              key={asset.symbol}
              type="button"
              onClick={() => onSelectToken(asset.symbol)}
              className={`group flex flex-col rounded-2xl border p-3.5 text-left transition-all ${
                isSelected
                  ? 'border-black bg-black/5 shadow-md dark:border-white dark:bg-white/5'
                  : 'border-gray-200/80 bg-white hover:border-gray-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900/60 dark:hover:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black text-white ${asset.iconBg}`}>
                  {asset.iconChar}
                </div>
                <span
                  className={`text-[11px] font-bold ${
                    isPositive
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {isPositive ? `+${asset.change24h}%` : `${asset.change24h}%`}
                </span>
              </div>

              <div className="mt-2.5">
                <span className="block text-xs font-bold text-gray-900 dark:text-gray-100 group-hover:text-ink">
                  {asset.symbol}
                </span>
                <span className="block truncate text-[10px] text-gray-400">
                  {asset.name}
                </span>
              </div>

              <div className="mt-1 font-mono text-xs font-semibold text-gray-800 dark:text-gray-200">
                {asset.priceVnd > 1000
                  ? `${(asset.priceVnd).toLocaleString('vi-VN')} ₫`
                  : `${asset.priceVnd.toFixed(2)} ₫`}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
