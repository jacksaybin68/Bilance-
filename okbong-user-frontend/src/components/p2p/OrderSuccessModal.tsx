'use client';

import React, { useEffect, useState } from 'react';

interface OrderSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: 'buy' | 'sell';
  token: string;
  fiat: string;
  fiatAmount: number;
  cryptoAmount: number;
  rate: number;
  paymentMethod: string;
}

export function OrderSuccessModal({
  isOpen,
  onClose,
  action,
  token,
  fiat,
  fiatAmount,
  cryptoAmount,
  rate,
  paymentMethod,
}: OrderSuccessModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(15 * 60); // 15 minutes countdown

  useEffect(() => {
    if (!isOpen) return;
    setSecondsLeft(15 * 60);
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const orderId = `P2P${Date.now().toString().slice(-8)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <button
          onClick={onClose}
          type="button"
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              {action === 'buy' ? `Lệnh mua ${token} đã tạo` : `Lệnh bán ${token} đã tạo`}
            </h3>
            <p className="text-xs text-gray-500">Mã đơn: #{orderId}</p>
          </div>
        </div>

        {/* Countdown timer */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          <span className="font-medium">Vui lòng thanh toán trong thời gian còn lại:</span>
          <span className="font-mono text-sm font-bold">{timeFormatted}</span>
        </div>

        {/* Order Details */}
        <div className="mt-4 divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-gray-50/70 p-4 text-xs dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-800/40">
          <div className="flex justify-between py-2">
            <span className="text-gray-500">Số tiền thanh toán</span>
            <span className="font-bold text-base text-gray-900 dark:text-gray-100">
              {fiatAmount.toLocaleString('vi-VN')} {fiat}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500">Số lượng nhận</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {cryptoAmount.toFixed(4)} {token}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500">Đơn giá tham chiếu</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">
              1 {token} = {rate.toLocaleString('vi-VN')} {fiat}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500">Cổng thanh toán</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {paymentMethod}
            </span>
          </div>
        </div>

        {/* Payment Account Details (Simulated Escrow) */}
        {action === 'buy' && (
          <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs space-y-2">
            <div className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center justify-between">
              <span>Thông tin tài khoản nhận tiền</span>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded text-emerald-700 dark:text-emerald-300">
                Escrow Bảo chứng
              </span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Ngân hàng:</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{paymentMethod}</span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Số tài khoản:</span>
              <span className="font-mono font-bold text-gray-900 dark:text-gray-100 select-all">19036888999018</span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Tên người nhận:</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">NGUYEN VAN THUONG NHAN</span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Nội dung chuyển khoản:</span>
              <span className="font-mono font-bold text-primary select-all">{orderId}</span>
            </div>
          </div>
        )}

        {/* Warning info */}
        <p className="mt-3 text-[11px] text-gray-400 leading-normal">
          * Lưu ý: Chuyển khoản đúng nội dung <strong>{orderId}</strong>. Không ghi các từ khóa nhạy cảm liên quan đến Crypto, USDT, Bitcoin trong lời nhắn chuyển khoản.
        </p>

        {/* CTA Buttons */}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Hủy lệnh
          </button>
          <button
            type="button"
            onClick={() => {
              alert('Xác nhận đã chuyển khoản! Hệ thống đang thông báo đối tác mở khóa tài sản vào ví của bạn.');
              onClose();
            }}
            className="flex-1 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500"
          >
            {action === 'buy' ? 'Đã chuyển khoản, thông báo người bán' : 'Xác nhận mở khoá token'}
          </button>
        </div>
      </div>
    </div>
  );
}
