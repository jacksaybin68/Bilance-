'use client';

import React, { useEffect, useId, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { KycModal } from './KycModal';
import { OrderSuccessModal } from './OrderSuccessModal';

export interface CryptoToken {
  symbol: string;
  name: string;
  rateMultiplier: number; // Multiplier relative to USDT
  iconColor: string;
}

export const SUPPORTED_TOKENS: CryptoToken[] = [
  { symbol: 'USDT', name: 'Tether USD', rateMultiplier: 1, iconColor: 'bg-emerald-500' },
  { symbol: 'BTC', name: 'Bitcoin', rateMultiplier: 64200, iconColor: 'bg-amber-500' },
  { symbol: 'ETH', name: 'Ethereum', rateMultiplier: 3450, iconColor: 'bg-indigo-500' },
  { symbol: 'SOL', name: 'Solana', rateMultiplier: 152, iconColor: 'bg-purple-500' },
  { symbol: 'DOGE', name: 'Dogecoin', rateMultiplier: 0.125, iconColor: 'bg-yellow-500' },
  { symbol: 'ZEC', name: 'Zcash', rateMultiplier: 32.5, iconColor: 'bg-orange-500' },
];

export interface FiatCurrency {
  code: string;
  name: string;
  symbol: string;
  baseRate: number; // 1 USDT in Fiat
  minLimit: number;
  maxLimit: number;
}

export const SUPPORTED_FIATS: FiatCurrency[] = [
  { code: 'VND', name: 'Việt Nam Đồng', symbol: '₫', baseRate: 25450, minLimit: 50000, maxLimit: 400000000 },
  { code: 'USD', name: 'US Dollar', symbol: '$', baseRate: 1, minLimit: 10, maxLimit: 20000 },
  { code: 'KHR', name: 'Cambodian Riel', symbol: '៛', baseRate: 4080, minLimit: 20000, maxLimit: 80000000 },
];

export const VN_PAYMENT_METHODS = [
  'Chuyển khoản ngân hàng (Tất cả NH)',
  'Vietcombank',
  'Techcombank',
  'MB Bank',
  'Ví MoMo',
  'ZaloPay',
  'Viettel Money',
];

interface OrderFormWidgetProps {
  selectedTokenSymbol?: string;
  onTokenChange?: (tokenSymbol: string) => void;
}

export function OrderFormWidget({
  selectedTokenSymbol = 'USDT',
  onTokenChange,
}: OrderFormWidgetProps) {
  const { t } = useI18n();
  const fiatInputId = useId();
  const cryptoInputId = useId();

  const [action, setAction] = useState<'buy' | 'sell'>('buy');
  const [fiatCode, setFiatCode] = useState<string>('VND');
  const [tokenSymbol, setTokenSymbol] = useState<string>(selectedTokenSymbol);
  const [fiatAmountStr, setFiatAmountStr] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>(VN_PAYMENT_METHODS[0]);

  // Rate refresh states
  const [rateCountdown, setRateCountdown] = useState<number>(20);
  const [rateFluctuation, setRateFluctuation] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Modals
  const [showKycModal, setShowKycModal] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [isKycVerified, setIsKycVerified] = useState<boolean>(false);

  // Sync token from parent if updated
  useEffect(() => {
    if (selectedTokenSymbol) {
      setTokenSymbol(selectedTokenSymbol);
    }
  }, [selectedTokenSymbol]);

  // Auto-refresh countdown timer (20s)
  useEffect(() => {
    const timer = setInterval(() => {
      setRateCountdown((prev) => {
        if (prev <= 1) {
          setIsRefreshing(true);
          // Slight realistic fluctuation between -0.05% and +0.05%
          const delta = (Math.random() - 0.5) * 0.001;
          setRateFluctuation((curr) => curr + delta);
          setTimeout(() => setIsRefreshing(false), 500);
          return 20;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const currentFiat = SUPPORTED_FIATS.find((f) => f.code === fiatCode) ?? SUPPORTED_FIATS[0];
  const currentToken = SUPPORTED_TOKENS.find((tk) => tk.symbol === tokenSymbol) ?? SUPPORTED_TOKENS[0];

  // Calculate live exchange rate for selected token & fiat
  const baseRateWithFluctuation = currentFiat.baseRate * (1 + rateFluctuation);
  const tokenUnitPrice = baseRateWithFluctuation * currentToken.rateMultiplier;

  // Amount parsing
  const fiatAmount = parseFloat(fiatAmountStr.replace(/,/g, '')) || 0;
  const cryptoAmount = tokenUnitPrice > 0 && fiatAmount > 0 ? fiatAmount / tokenUnitPrice : 0;

  // Limits
  const minLimit = currentFiat.minLimit;
  const maxLimit = currentFiat.maxLimit;
  const isBelowMin = fiatAmount > 0 && fiatAmount < minLimit;
  const isAboveMax = fiatAmount > maxLimit;
  const isValidAmount = fiatAmount >= minLimit && fiatAmount <= maxLimit;

  const handleFiatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9.]/g, '');
    setFiatAmountStr(val);
  };

  const handleQuickPercent = (pct: number) => {
    const calculated = (maxLimit * pct) / 100;
    setFiatAmountStr(calculated.toString());
  };

  const handleTokenSelect = (symbol: string) => {
    setTokenSymbol(symbol);
    onTokenChange?.(symbol);
  };

  const handleCtaClick = () => {
    if (!isValidAmount) return;
    if (!isKycVerified) {
      setShowKycModal(true);
    } else {
      setShowSuccessModal(true);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xl backdrop-blur dark:border-gray-800 dark:bg-gray-900">
      {/* 1. Buy / Sell Action Switcher */}
      <div className="flex rounded-2xl bg-gray-100 p-1 dark:bg-gray-800/80">
        <button
          type="button"
          onClick={() => setAction('buy')}
          className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all ${
            action === 'buy'
              ? 'bg-white text-emerald-600 shadow-sm dark:bg-gray-900 dark:text-emerald-400'
              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          {t('p2p.buy')}
        </button>

        <button
          type="button"
          onClick={() => setAction('sell')}
          className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all ${
            action === 'sell'
              ? 'bg-white text-rose-600 shadow-sm dark:bg-gray-900 dark:text-rose-400'
              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          {t('p2p.sell')}
        </button>
      </div>

      <div className="mt-5 space-y-4">
        {/* 2. Fiat Input Block ("Bạn thanh toán" / "Bạn chi") */}
        <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 transition-colors focus-within:border-black dark:border-gray-800 dark:bg-gray-800/40 dark:focus-within:border-white">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
            <label htmlFor={fiatInputId}>
              {action === 'buy' ? t('p2p.pay') : t('p2p.get')}
            </label>
            <div className="flex gap-1.5">
              {[25, 50, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleQuickPercent(pct)}
                  className="rounded px-1.5 py-0.5 text-[10px] font-bold text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  {pct === 100 ? 'Tối đa' : `${pct}%`}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between gap-3">
            <input
              id={fiatInputId}
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={fiatAmountStr ? Number(fiatAmountStr).toLocaleString('en-US') : ''}
              onChange={handleFiatChange}
              className="w-full bg-transparent text-2xl font-black text-gray-900 outline-none placeholder:text-gray-300 dark:text-white dark:placeholder:text-gray-600"
            />

            {/* Fiat Currency Selector */}
            <div className="relative shrink-0">
              <select
                value={fiatCode}
                onChange={(e) => setFiatCode(e.target.value)}
                className="cursor-pointer appearance-none rounded-xl border border-gray-200 bg-white py-1.5 pr-7 pl-3 text-xs font-bold text-gray-900 shadow-sm outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                {SUPPORTED_FIATS.map((f) => (
                  <option key={f.code} value={f.code}>
                    {f.code} ({f.symbol})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-400">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Limits warning text */}
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-gray-400">
              {t('p2p.limit')}: {minLimit.toLocaleString('vi-VN')} - {maxLimit.toLocaleString('vi-VN')} {fiatCode}
            </span>
            {isBelowMin && <span className="font-semibold text-rose-500">Thấp hơn hạn mức tối thiểu</span>}
            {isAboveMax && <span className="font-semibold text-rose-500">Vượt quá hạn mức tối đa</span>}
          </div>
        </div>

        {/* 3. Crypto Input Block ("Bạn nhận" / "Bạn chi") */}
        <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-800/40">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            <label htmlFor={cryptoInputId}>
              {action === 'buy' ? t('p2p.receive') : t('p2p.spend')}
            </label>
          </div>

          <div className="mt-2 flex items-center justify-between gap-3">
            <input
              id={cryptoInputId}
              type="text"
              readOnly
              placeholder="0.00"
              value={cryptoAmount > 0 ? cryptoAmount.toFixed(4) : ''}
              className="w-full bg-transparent text-2xl font-black text-gray-900 outline-none placeholder:text-gray-300 dark:text-white dark:placeholder:text-gray-600"
            />

            {/* Token Selector */}
            <div className="relative shrink-0">
              <select
                value={tokenSymbol}
                onChange={(e) => handleTokenSelect(e.target.value)}
                className="cursor-pointer appearance-none rounded-xl border border-gray-200 bg-white py-1.5 pr-7 pl-3 text-xs font-bold text-gray-900 shadow-sm outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                {SUPPORTED_TOKENS.map((tk) => (
                  <option key={tk.symbol} value={tk.symbol}>
                    {tk.symbol}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-400">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Tỷ giá tham chiếu & Cổng thanh toán */}
        <div className="space-y-2 rounded-2xl bg-gray-50 p-3.5 text-xs dark:bg-gray-800/40">
          {/* Reference Price & Countdown */}
          <div className="flex items-center justify-between">
            <span className="text-gray-500 dark:text-gray-400">{t('p2p.rate')}</span>
            <div className="flex items-center gap-2">
              <span className={`font-mono font-semibold text-gray-900 dark:text-gray-100 transition-opacity ${isRefreshing ? 'opacity-40' : 'opacity-100'}`}>
                1 {tokenSymbol} ≈ {Math.round(tokenUnitPrice).toLocaleString('vi-VN')} {fiatCode}
              </span>
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"></span>
                {rateCountdown}s
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-gray-500 dark:text-gray-400">{t('p2p.paymentMethod')}</span>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="cursor-pointer appearance-none rounded-lg border-none bg-transparent font-semibold text-right text-gray-900 outline-none hover:underline dark:text-gray-100"
            >
              {VN_PAYMENT_METHODS.map((method) => (
                <option key={method} value={method} className="text-gray-900">
                  {method}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 5. Main Action CTA Button */}
        <button
          type="button"
          disabled={!isValidAmount}
          onClick={handleCtaClick}
          className={`w-full rounded-2xl py-4 text-sm font-bold tracking-wide transition-all ${
            isValidAmount
              ? action === 'buy'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-500 active:scale-[0.99]'
                : 'bg-rose-600 text-white shadow-lg shadow-rose-600/25 hover:bg-rose-500 active:scale-[0.99]'
              : 'cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600'
          }`}
        >
          {action === 'buy'
            ? t('p2p.buyNoFee', { token: tokenSymbol })
            : t('p2p.sellNoFee', { token: tokenSymbol })}
        </button>
      </div>

      {/* KYC Check Modal */}
      <KycModal
        isOpen={showKycModal}
        onClose={() => setShowKycModal(false)}
        onConfirm={() => {
          setIsKycVerified(true);
          setShowKycModal(false);
          setShowSuccessModal(true);
        }}
      />

      {/* Order Confirmation / Success Modal */}
      <OrderSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        action={action}
        token={tokenSymbol}
        fiat={fiatCode}
        fiatAmount={fiatAmount}
        cryptoAmount={cryptoAmount}
        rate={Math.round(tokenUnitPrice)}
        paymentMethod={paymentMethod}
      />
    </div>
  );
}
