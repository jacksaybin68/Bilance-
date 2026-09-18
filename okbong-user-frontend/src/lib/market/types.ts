/**
 * Kiểu dữ liệu thị trường dùng chung — khớp 1-1 với `MarketCoinDto` của backend
 * (`okbong-backend/docs/contracts/trading-market-data.md`). Đổi ở đây thì phải
 * đổi contract trước.
 */

export interface MarketCoin {
  /** id CoinGecko, ví dụ `bitcoin`. */
  id: string;
  /** Mã hiển thị, luôn UPPERCASE, ví dụ `BTC`. */
  symbol: string;
  name: string;
  /** URL logo thật do nguồn dữ liệu trả về (có thể null). */
  image: string | null;
  /** Giá theo `currency`. */
  price: number;
  currency: string;
  /** Phần trăm thay đổi 24h, có thể âm. */
  change24h: number;
  volume24h: number | null;
  marketCap: number | null;
  /** ~168 điểm giá 7 ngày cùng đơn vị `currency`; rỗng khi nguồn không trả. */
  sparkline: number[];
  updatedAt: string;
  /** `true` khi backend phải trả cache cũ vì nguồn ngoài đang lỗi. */
  stale: boolean;
}

export type MarketSource = 'coingecko' | 'cache' | 'fallback';

export interface MarketMeta {
  source: MarketSource | null;
  cached: boolean;
  updatedAt: string | null;
}

/** Danh sách coin mặc định của sàn, khớp `MARKET_COIN_IDS` ở backend. */
export const DEFAULT_MARKET_IDS = [
  'bitcoin',
  'ethereum',
  'tether',
  'solana',
  'dogecoin',
  'zcash',
] as const;

/** Symbol được hỗ trợ cho luồng đặt lệnh P2P. */
export const TRADABLE_SYMBOLS = ['USDT', 'BTC', 'ETH', 'SOL', 'DOGE', 'ZEC'] as const;

export type TradableSymbol = (typeof TRADABLE_SYMBOLS)[number];

export function isMarketCoin(value: unknown): value is MarketCoin {
  if (typeof value !== 'object' || value === null) return false;
  const coin = value as Record<string, unknown>;
  return (
    typeof coin.id === 'string' &&
    typeof coin.symbol === 'string' &&
    typeof coin.name === 'string' &&
    typeof coin.price === 'number'
  );
}

export function findCoin(coins: readonly MarketCoin[], symbol: string): MarketCoin | null {
  const wanted = symbol.trim().toUpperCase();
  return coins.find((coin) => coin.symbol.toUpperCase() === wanted) ?? null;
}
