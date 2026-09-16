'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n';

export function HowItWorks() {
  const { t } = useI18n();

  const steps = [
    {
      number: '01',
      title: t('p2p.step1.title'),
      desc: t('p2p.step1.desc'),
      icon: (
        <svg className="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      number: '02',
      title: t('p2p.step2.title'),
      desc: t('p2p.step2.desc'),
      icon: (
        <svg className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      number: '03',
      title: t('p2p.step3.title'),
      desc: t('p2p.step3.desc'),
      icon: (
        <svg className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
  ];

  return (
    <section className="w-full rounded-3xl border border-gray-200/80 bg-white p-6 sm:p-8 dark:border-gray-800 dark:bg-gray-900/40">
      <div className="text-center max-w-xl mx-auto mb-8">
        <h3 className="text-xl font-black tracking-tight text-gray-900 dark:text-white sm:text-2xl">
          {t('p2p.howItWorks')}
        </h3>
        <p className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          Giao dịch P2P an toàn, không tính phí và được bảo vệ 100% bằng dịch vụ ký quỹ Escrow của NexTrading.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 relative">
        {steps.map((step, index) => (
          <div
            key={step.number}
            className="relative flex flex-col rounded-2xl border border-gray-100 bg-gray-50/70 p-6 dark:border-gray-800 dark:bg-gray-900/60"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-gray-800">
                {step.icon}
              </div>
              <span className="font-mono text-2xl font-black text-gray-200 dark:text-gray-800">
                {step.number}
              </span>
            </div>

            <h4 className="mt-4 text-base font-bold text-gray-900 dark:text-gray-100">
              {step.title}
            </h4>

            <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              {step.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
