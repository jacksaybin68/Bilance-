'use client';

import React, { useEffect, useId, useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { CoinIcon } from '@/components/crypto-icons/CoinIcon';
import { findCoin, type MarketCoin } from '@/lib/market/types';
import { useMarketData } from '@/lib/market/useMarketData';
import { KycModal } from './KycModal';
import { OrderSuccessModal } from './OrderSuccessModal';

export interface CryptoToken {
  symbol: string;
  name: string;
  iconColor: string;
}

export type FiatCode = 'VND' | 'USD';

/** Token hỗ trợ đặt lệnh. Giá **luôn** lấy từ API thị trường, không hardcode. */
export const SUPPORTED_TOKENS: CryptoToken[] = [
  { symbol: 'USDT', name: 'Tether USD', iconColor: 'bg-emerald-500' },
  { symbol: 'BTC', name: 'Bitcoin', iconColor: 'bg-amber-500' },
  { symbol: 'ETH', name: 'Ethereum', iconColor: 'bg-indigo-500' },
  { symbol: 'SOL', name: 'Solana', iconColor: 'bg-purple-500' },
  { symbol: 'DOGE', name: 'Dogecoin', iconColor: 'bg-yellow-500' },
  { symbol: 'ZEC', name: 'Zcash', iconColor: 'bg-orange-500' },
];

export interface FiatCurrency {
  code: FiatCode;
  name: string;
  symbol: string;
  minLimit: number;
  maxLimit: number;
}

/**
 * KHR đã bị bỏ: không có nguồn tỷ giá thật nào đáng tin trong hệ thống, giữ lại
 * chỉ tạo ra con số bịa. USD quy đổi bằng giá USDT/VND lấy trực tiếp từ API.
 */
export const SUPPORTED_FIATS: FiatCurrency[] = [
  { code: 'VND', name: 'Việt Nam Đồng', symbol: '₫', minLimit: 50_000, maxLimit: 400_000_000 },
  { code: 'USD', name: 'US Dollar', symbol: '$', minLimit: 10, maxLimit: 20_000 },
];

/** Chu kỳ làm mới tỷ giá tham chiếu (ms) — khớp nhịp polling của hook. */
const RATE_REFRESH_MS = 15_000;

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
  const [fiatCode, setFiatCode] = useState<FiatCode>('VND');
  const [tokenSymbol, setTokenSymbol] = useState<string>(selectedTokenSymbol);
  const [fiatAmountStr, setFiatAmountStr] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>(VN_PAYMENT_METHODS[0]);

  // Dữ liệu thị trường thật — nguồn duy nhất cho mọi tỷ giá trên widget này.
  const { coins, meta, state: marketState, isStale, refresh } = useMarketData({
    refreshMs: RATE_REFRESH_MS,
  });

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

  const currentFiat = SUPPORTED_FIATS.find((f) => f.code === fiatCode) ?? SUPPORTED_FIATS[0];
  const token: MarketCoin | null = useMemo(
    () => findCoin(coins, tokenSymbol),
    [coins, tokenSymbol],
  );
  /** Tỷ giá USD/VND suy ra từ giá USDT thật (USDT ≈ 1 USD). */
  const usdVnd = useMemo(() => findCoin(coins, 'USDT')?.price ?? null, [coins]);

  /**
   * Giá 1 token theo đơn vị tiền tệ đang chọn. `null` khi chưa có dữ liệu thị
   * trường — UI hiển thị "—" thay vì bịa số.
   */
  const tokenUnitPrice = useMemo(() => {
    if (!token || !Number.isFinite(token.price) || token.price <= 0) return null;
    if (fiatCode === 'VND') return token.price;
    if (!usdVnd || usdVnd <= 0) return null;
    return token.price / usdVnd;
  }, [token, fiatCode, usdVnd]);

  // Đồng hồ đếm ngược tới lần làm mới kế tiếp (chỉ hiển thị, hook tự polling).
  const [secondsLeft, setSecondsLeft] = useState<number>(RATE_REFRESH_MS / 1000);

  useEffect(() => {
    setSecondsLeft(Math.round(RATE_REFRESH_MS / 1000));
  }, [meta.updatedAt]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? Math.round(RATE_REFRESH_MS / 1000) : prev - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  // Amount parsing
  const fiatAmount = parseFloat(fiatAmountStr.replace(/,/g, '')) || 0;
  const cryptoAmount =
    tokenUnitPrice !== null && tokenUnitPrice > 0 && fiatAmount > 0
      ? fiatAmount / tokenUnitPrice
      : 0;

  // Limits
  const minLimit = currentFiat.minLimit;
  const maxLimit = currentFiat.maxLimit;
  const isBelowMin = fiatAmount > 0 && fiatAmount < minLimit;
  const isAboveMax = fiatAmount > maxLimit;
  const isValidAmount =
    tokenUnitPrice !== null && fiatAmount >= minLimit && fiatAmount <= maxLimit;

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
                onChange={(e) => setFiatCode(e.target.value as FiatCode)}
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
            <div className="flex shrink-0 items-center gap-2">
              <CoinIcon symbol={tokenSymbol} src={token?.image} size={26} />
              <div className="relative">
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
        </div>

        {/* 4. Order Summary */}
        <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-800/40">
          <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex justify-between">
              <span>{t('p2p.rate')}:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {tokenUnitPrice !== null
                  ? `1 ${tokenSymbol} ≈ ${Math.round(tokenUnitPrice).toLocaleString('vi-VN')} ${fiatCode}`
                  : '—'}
              </span>
            </div>

            <div className="flex justify-between">
              <span>{t('p2p.limit')}:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {minLimit.toLocaleString('vi-VN')} - {maxLimit.toLocaleString('vi-VN')} {fiatCode}
              </span>
            </div>

            <div className="flex justify-between">
              <span>{t('p2p.sellNoFee')}:</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">0%</span>
            </div>

            <div className="flex justify-between">
              <span>{t('p2p.autoRefresh')}:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{secondsLeft}s</span>
            </div>
          </div>
        </div>

        {/* 5. KYC + CTA */}
        <KycModal
          isOpen={showKycModal}
          onClose={() => setShowKycModal(false)}
          onVerified={() => {
            setIsKycVerified(true);
            setShowKycModal(false);
          }}
        />

        <OrderSuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          action={action}
          token={tokenSymbol}
          fiat={fiatCode}
          fiatAmount={fiatAmount}
          cryptoAmount={cryptoAmount}
          rate={tokenUnitPrice ?? 0}
          paymentMethod={paymentMethod}
        />

        <button
          type="button"
          onClick={handleCtaClick}
          disabled={!isValidAmount || !isKycVerified || marketState === 'loading'}
          className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-400"
        >
          {marketState === 'loading'
            ? t('common.loading')
            : !isKycVerified
              ? t('p2p.kycRequired')
              : action === 'buy'
                ? t('p2p.buy')
                : t('p2p.sell')}
        </button>

        {isStale && (
          <p className="text-center text-xs text-amber-600 dark:text-amber-400">
            {t('market.stale')}
          </p>
        )}

        {marketState === 'error' && (
          <p className="text-center text-xs text-red-600 dark:text-red-400">
            {t('market.error')}
          </p>
        )}
      </div>
    </div>
  );
}
