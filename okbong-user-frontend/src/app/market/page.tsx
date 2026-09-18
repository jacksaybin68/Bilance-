'use client';

import Link from 'next/link';
import { PriceTable } from '@/components/PriceTable';
import { Alert } from '@/components/ui/Feedback';
import { useI18n } from '@/lib/i18n';
import { cardClassName } from '@/components/ui/form';

export default function MarketPage() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t('market.title')}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            ⟳ {t('market.updated')}
          </p>
        </div>

        <Link
          href="/price"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
        >
          {t('nav.price')} →
        </Link>
      </div>

      {/* Bảng giá real-time */}
      <div className={cardClassName}>
        <PriceTable showDetailLink />
      </div>

      {/* Thông tin giao dịch */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={`${cardClassName} text-center`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t('p2p.title')}
          </p>
          <p className="mt-1 text-2xl font-bold text-primary">24/7</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Giao dịch liên tục, không nghỉ lễ.
          </p>
        </div>
        <div className={`${cardClassName} text-center`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t('wallet.deposit')} / {t('wallet.withdraw')}
          </p>
          <p className="mt-1 text-2xl font-bold text-primary">Nhanh</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Xử lý trong vòng 24h làm việc.
          </p>
        </div>
        <div className={`${cardClassName} text-center`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Phí giao dịch
          </p>
          <p className="mt-1 text-2xl font-bold text-primary">0%</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Không phí ẩn.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Sẵn sàng giao dịch?
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Nạp tiền vào ví và bắt đầu giao dịch ngay hôm nay.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/wallet/deposit"
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            {t('wallet.deposit')}
          </Link>
          <Link
            href="/wallet"
            className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {t('wallet.title')}
          </Link>
        </div>
      </div>
    </div>
  );
}
