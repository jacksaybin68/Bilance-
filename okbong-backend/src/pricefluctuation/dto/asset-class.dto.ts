/**
 * Lớp tài sản mà `GET /price/markets` hỗ trợ — ADR 008 (D1).
 * `crypto` là mặc định và giữ nguyên hành vi cũ.
 *
 * Đặt ở file riêng (không import gì) để `MarketCoinDto` và provider interface
 * dùng chung mà không tạo circular import.
 */
export const ASSET_CLASSES = ['crypto', 'equity', 'fx', 'bond', 'commodity', 'index'] as const;

export type AssetClass = (typeof ASSET_CLASSES)[number];

export const DEFAULT_ASSET_CLASS: AssetClass = 'crypto';

/** Lớp tài sản đã có provider trong repo (P2–P3 của ADR 008 sẽ mở rộng). */
export const IMPLEMENTED_ASSET_CLASSES: readonly AssetClass[] = ['crypto'];