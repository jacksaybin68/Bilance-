'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { OrderFormWidget, MarketHighlights, HowItWorks } from '@/components/p2p';

export default function P2PTradingPage() {
  const { t } = useI18n();
  const [selectedToken, setSelectedToken] = useState<string>('USDT');

  const handleSelectToken = (symbol: string) => {
    setSelectedToken(symbol);
    // Smooth scroll to order form on mobile
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      document.getElementById('order-form-widget')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
      {/* Sub-Navigation Tabs Bar */}
      <div className="mb-8 flex items-center justify-between border-b border-gray-200/80 pb-3 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-black"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
            {t('nav.express')}
          </Link>
          <Link
            href="/market"
            className="rounded-xl px-4 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            {t('nav.p2p')}
          </Link>
        </div>

        <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <svg className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            0% Phí giao dịch
          </span>
          <span className="flex items-center gap-1">
            <svg className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Ký quỹ Escrow bảo vệ
          </span>
        </div>
      </div>

      {/* Main Trading Hero: Split view (Headline & Value props left, Order Form right) */}
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 mb-16">
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
            Tỷ giá thời gian thực cập nhật liên tục
          </div>

          <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white sm:text-5xl lg:text-6xl leading-[1.1]">
            {t('p2p.title')}
          </h1>

          <p className="text-base text-gray-600 dark:text-gray-300 sm:text-lg leading-relaxed">
            {t('p2p.subtitle')}
          </p>

          <div className="grid grid-cols-3 gap-4 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div>
              <div className="text-2xl font-black text-gray-900 dark:text-white">0%</div>
              <div className="text-xs text-gray-500">Phí giao dịch P2P</div>
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">&lt; 1 Phút</div>
              <div className="text-xs text-gray-500">Thời gian khớp lệnh</div>
            </div>
            <div>
              <div className="text-2xl font-black text-gray-900 dark:text-white">24/7</div>
              <div className="text-xs text-gray-500">Bảo chứng Escrow</div>
            </div>
          </div>
        </div>

        {/* Order Form Widget */}
        <div id="order-form-widget" className="lg:col-span-6 flex justify-center">
          <OrderFormWidget
            selectedTokenSymbol={selectedToken}
            onTokenChange={(sym) => setSelectedToken(sym)}
          />
        </div>
      </div>

      {/* Market Highlights (Trending Assets) */}
      <div className="mb-16">
        <MarketHighlights
          activeToken={selectedToken}
          onSelectToken={handleSelectToken}
        />
      </div>

      {/* How it works (3-step guide) */}
      <div>
        <HowItWorks />
      </div>
    </div>
  );
}
