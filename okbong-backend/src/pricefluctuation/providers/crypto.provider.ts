import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MarketCoinDto } from '../dto/market-coin.dto';
import {
  AssetClass,
  MarketDataProvider,
  MarketFetchResult,
  MarketProviderInput,
} from './market-data-provider.interface';

interface CoinGeckoMarketResponse {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number | null;
  price_change_percentage_24h: number | null;
  total_volume: number | null;
  market_cap: number | null;
  sparkline_in_7d: { price: number[] } | null;
  last_updated: string;
}

const DEFAULT_API_BASE = 'https://api.coingecko.com/api/v3';
const DEFAULT_IDS = 'bitcoin,ethereum,tether,solana,dogecoin,zcash';
const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_CACHE_TTL_MS = 30_000;

/**
 * Provider crypto: CoinGecko `/coins/markets` (ADR 008 D3).
 *
 * Đây là provider duy nhất của P1; logic mapping **giữ nguyên** so với bản cũ
 * trong `MarketDataService` để payload của `GET /price/markets` không đổi.
 */
@Injectable()
export class CryptoProvider implements MarketDataProvider {
  readonly assetClass: AssetClass = 'crypto';
  private readonly logger = new Logger(CryptoProvider.name);

  constructor(private readonly config: ConfigService) {}

  cacheTtlMs(): number {
    const ttl = Number(this.config.get<string>('MARKET_CACHE_TTL_MS') ?? DEFAULT_CACHE_TTL_MS);
    return Number.isFinite(ttl) && ttl >= 0 ? ttl : DEFAULT_CACHE_TTL_MS;
  }

  /** `symbols` ở đây là danh sách CoinGecko id, ví dụ `bitcoin,ethereum`. */
  async fetch(input: MarketProviderInput): Promise<MarketFetchResult> {
    const { vs, symbols } = input;
    const timeoutMs = Number(this.config.get<string>('MARKET_FETCH_TIMEOUT_MS') ?? DEFAULT_TIMEOUT_MS);
    const apiKey = this.config.get<string>('MARKET_API_KEY');
    const apiBase = this.config.get<string>('MARKET_API_BASE') ?? DEFAULT_API_BASE;

    const query = new URLSearchParams({
      vs_currency: vs,
      ids: symbols,
      order: 'market_cap_desc',
      sparkline: 'true',
      price_change_percentage: '24h',
    });

    const response = await fetch(`${apiBase}/coins/markets?${query.toString()}`, {
      signal: AbortSignal.timeout(Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS),
      headers: {
        Accept: 'application/json',
        ...(apiKey ? { 'x-cg-demo-api-key': apiKey } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`CoinGecko HTTP ${response.status} (vs=${vs})`);
    }

    const raw = (await response.json()) as CoinGeckoMarketResponse[];
    const currency = vs.toUpperCase();
    const coins = raw.map((entry) => this.toMarketCoin(entry, currency));
    const updatedAt = raw[0]?.last_updated ?? new Date().toISOString();

    this.logger.debug(`Làm mới dữ liệu thị trường: ${coins.length} coin, vs=${vs}`);

    return { coins, source: 'coingecko', cached: false, updatedAt };
  }

  /** Danh sách id mặc định khi caller không truyền `ids`. */
  defaultSymbols(): string {
    return this.config.get<string>('MARKET_COIN_IDS') ?? DEFAULT_IDS;
  }

  private toMarketCoin(raw: CoinGeckoMarketResponse, currency: string): MarketCoinDto {
    const coin = new MarketCoinDto();
    coin.id = raw.id;
    coin.symbol = (raw.symbol ?? '').toUpperCase();
    coin.name = raw.name ?? '';
    coin.image = raw.image || null;
    coin.price = raw.current_price ?? 0;
    coin.currency = currency;
    coin.change24h = raw.price_change_percentage_24h ?? 0;
    coin.volume24h = raw.total_volume ?? null;
    coin.marketCap = raw.market_cap ?? null;
    coin.sparkline = this.toSparkline(raw.sparkline_in_7d?.price, coin.price);
    coin.updatedAt = raw.last_updated ?? new Date().toISOString();
    coin.assetClass = this.assetClass;
    coin.stale = false;
    return coin;
  }

  /**
   * CoinGecko trả `sparkline_in_7d.price` theo USD bất kể `vs_currency`, nên với
   * `vs=vnd` chuỗi này lệch đơn vị so với `price`. Chuẩn hoá tuyến tính để điểm
   * cuối bằng giá hiện tại: giữ nguyên hình dạng xu hướng và đúng đơn vị tiền tệ.
   */
  private toSparkline(values: number[] | undefined, currentPrice: number): number[] {
    if (!values || values.length === 0) return [];
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) return values;

    const last = values[values.length - 1];
    if (!Number.isFinite(last) || last <= 0 || last === currentPrice) return values;

    const scale = currentPrice / last;
    return values.map((value) => value * scale);
  }
}