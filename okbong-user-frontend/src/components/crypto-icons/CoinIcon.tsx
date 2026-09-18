'use client';

import { useState } from 'react';

export interface CoinIconProps {
  /** Mã coin, ví dụ `BTC`. */
  symbol: string;
  /** URL logo thật lấy từ API thị trường — được ưu tiên nếu có. */
  src?: string | null;
  /** Kích thước cạnh (px). Mặc định 32. */
  size?: number;
  className?: string;
  /** Nhãn alt; mặc định là symbol. */
  title?: string;
}

/** Logo dự phòng khi API không trả `image` hoặc ảnh ngoài không tải được. */
const LOCAL_ICONS: Record<string, string> = {
  BTC: '/coins/btc.png',
  ETH: '/coins/eth.png',
  USDT: '/coins/usdt.png',
  SOL: '/coins/sol.png',
  DOGE: '/coins/doge.png',
  ZEC: '/coins/zec.png',
  BDSD: '/coins/bdsd.svg',
};

/**
 * Icon đồng tiền thật: ưu tiên `src` (logo do nguồn dữ liệu trả về), tự chuyển
 * sang logo vendored trong `public/coins/` khi ảnh ngoài lỗi, và cuối cùng là
 * chữ cái đầu của symbol để không bao giờ hiển thị ô trống.
 */
export function CoinIcon({ symbol, src, size = 32, className, title }: CoinIconProps) {
  const key = symbol.trim().toUpperCase();
  const [failed, setFailed] = useState<readonly string[]>([]);

  const candidates = [src ?? null, LOCAL_ICONS[key] ?? null].filter(
    (candidate): candidate is string => typeof candidate === 'string' && candidate.length > 0,
  );
  const usable = candidates.find((candidate) => !failed.includes(candidate));

  if (!usable) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full bg-base-200 font-bold text-base-700 dark:bg-base-800 dark:text-base-200 ${className ?? ''}`}
        style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.42)) }}
        aria-hidden="true"
      >
        {key.slice(0, 2)}
      </span>
    );
  }

  return (
    <img
      src={usable}
      alt={title ?? key}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={`shrink-0 rounded-full object-contain ${className ?? ''}`}
      style={{ width: size, height: size }}
      onError={() => setFailed((current) => [...current, usable])}
    />
  );
}
