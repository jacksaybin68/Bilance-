import type { AssetClass } from '../dto/asset-class.dto';
import { MarketCoinDto } from '../dto/market-coin.dto';

export * from '../dto/asset-class.dto';

/** Nguồn dữ liệu thực tế đã dùng (ADR 008 D4: P2 sẽ thêm `yahoo`). */
export type MarketSource = 'coingecko' | 'cache';

/** Kết quả một provider trả về; orchestrator bọc thêm cache/stale/503. */
export interface MarketFetchResult {
  coins: MarketCoinDto[];
  source: MarketSource;
  cached: boolean;
  updatedAt: string;
}

export interface MarketProviderInput {
  /** Với `crypto` là danh sách CoinGecko id; với lớp khác là danh sách symbol. */
  symbols: string;
  vs: 'vnd' | 'usd';
}

/**
 * Một nguồn dữ liệu thị trường cho đúng một `assetClass` (ADR 008 D2).
 * Provider chỉ nói chuyện với nguồn ngoài và map sang DTO — KHÔNG tự set HTTP
 * status, không cache, không quyết định `stale`: các luật đó nằm ở orchestrator
 * (`MarketDataService`) để không phân kỳ giữa các asset class.
 */
export interface MarketDataProvider {
  readonly assetClass: AssetClass;
  /** TTL cache mặc định cho provider này (ms) — ADR 008 D6. */
  cacheTtlMs(): number;
  /** Bộ symbol mặc định khi caller không truyền (crypto dùng CoinGecko id). */
  defaultSymbols?(): string;
  /** Đọc dữ liệu nguồn; ném lỗi khi nguồn lỗi để orchestrator xử lý cache/503. */
  fetch(input: MarketProviderInput): Promise<MarketFetchResult>;
}

/** DI token cho danh sách provider đã đăng ký. */
export const MARKET_DATA_PROVIDERS = 'MARKET_DATA_PROVIDERS';