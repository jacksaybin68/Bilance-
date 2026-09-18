import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MarketCoinDto } from './dto/market-coin.dto';

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

export interface MarketFetchResult {
  coins: MarketCoinDto[];
  source: 'coingecko' | 'cache';
  cached: boolean;
  updatedAt: string;
}

const DEFAULT_API_BASE = 'https://api.coingecko.com/api/v3';
const DEFAULT_IDS = 'bitcoin,ethereum,tether,solana,dogecoin,zcash';

/**
 * Nguồn dữ liệu thị trường thật (CoinGecko). Cache in-memory + dedupe request
 * đang bay; khi nguồn lỗi mà còn cache thì trả bản cũ kèm `stale: true` thay vì
 * bịa số. Hợp đồng: `docs/contracts/trading-market-data.md`.
 */
@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);
  private readonly cache = new Map<string, { coins: MarketCoinDto[]; fetchedAt: number }>();
  private readonly inFlight = new Map<string, Promise<MarketFetchResult>>();

  constructor(private readonly config: ConfigService) {}

  async getMarkets(params: { vs?: 'vnd' | 'usd'; ids?: string }): Promise<MarketFetchResult> {
    const vs = params.vs ?? 'vnd';
    const ids = params.ids ?? this.config.get<string>('MARKET_COIN_IDS') ?? DEFAULT_IDS;
    const cacheKey = `${vs}:${ids}`;
    const cacheTtl = Number(this.config.get<string>('MARKET_CACHE_TTL_MS') ?? 30_000);

    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < cacheTtl) {
      return {
        coins: cached.coins,
        source: 'cache',
        cached: true,
        updatedAt: cached.coins[0]?.updatedAt ?? new Date().toISOString(),
      };
    }

    const existing = this.inFlight.get(cacheKey);
    if (existing) return existing;

    const request = this.fetchFromSource({ vs, ids, cacheKey });

    this.inFlight.set(cacheKey, request);
    try {
      return await request;
    } finally {
      this.inFlight.delete(cacheKey);
    }
  }

  /** Tìm một coin theo symbol trong bộ dữ liệu thị trường mặc định. */
  async findBySymbol(symbol: string, vs: 'vnd' | 'usd' = 'vnd'): Promise<MarketCoinDto | null> {
    const wanted = symbol.trim().toUpperCase();
    if (wanted.length === 0) return null;

    const { coins } = await this.getMarkets({ vs });
    return coins.find((coin) => coin.symbol.toUpperCase() === wanted) ?? null;
  }

  private async fetchFromSource(input: {
    vs: 'vnd' | 'usd';
    ids: string;
    cacheKey: string;
  }): Promise<MarketFetchResult> {
    const { vs, ids, cacheKey } = input;
    const timeoutMs = Number(this.config.get<string>('MARKET_FETCH_TIMEOUT_MS') ?? 8_000);
    const apiKey = this.config.get<string>('MARKET_API_KEY');
    const apiBase = this.config.get<string>('MARKET_API_BASE') ?? DEFAULT_API_BASE;

    const query = new URLSearchParams({
      vs_currency: vs,
      ids,
      order: 'market_cap_desc',
      sparkline: 'true',
      price_change_percentage: '24h',
    });

    try {
      const response = await fetch(`${apiBase}/coins/markets?${query.toString()}`, {
        signal: AbortSignal.timeout(timeoutMs),
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

      this.cache.set(cacheKey, { coins, fetchedAt: Date.now() });
      this.logger.debug(`Làm mới dữ liệu thị trường: ${coins.length} coin, vs=${vs}`);

      return { coins, source: 'coingecko', cached: false, updatedAt };
    } catch (error) {
      const fallback = this.cache.get(cacheKey);
      const message = error instanceof Error ? error.message : String(error);

      if (fallback) {
        this.logger.warn(`Nguồn dữ liệu lỗi (${message}) — trả cache cũ cho ${cacheKey}`);
        return {
          coins: fallback.coins.map((coin) => ({ ...coin, stale: true })),
          source: 'cache',
          cached: true,
          updatedAt: fallback.coins[0]?.updatedAt ?? new Date().toISOString(),
        };
      }

      this.logger.error(`Nguồn dữ liệu lỗi và không có cache (${message})`);
      throw new ServiceUnavailableException('Dữ liệu thị trường hiện không khả dụng');
    }
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
