import { BadRequestException, Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MarketCoinDto } from './dto/market-coin.dto';
import {
  ASSET_CLASSES,
  AssetClass,
  DEFAULT_ASSET_CLASS,
  MARKET_DATA_PROVIDERS,
  MarketDataProvider,
  MarketFetchResult,
} from './providers/market-data-provider.interface';

export type { MarketFetchResult } from './providers/market-data-provider.interface';

export interface GetMarketsParams {
  vs?: 'vnd' | 'usd';
  /** CoinGecko id — chỉ hợp lệ với `assetClass=crypto`. */
  ids?: string;
  assetClass?: AssetClass;
  /** Symbol cho asset class không phải crypto (ADR 008 D1). */
  symbols?: string;
}

/**
 * Orchestrator dữ liệu thị trường (ADR 008 D2): chọn provider theo `assetClass`,
 * cache in-memory + dedupe request đang bay, và giữ **một** luật lỗi duy nhất —
 * nguồn lỗi mà còn cache thì trả bản cũ với `stale: true`, hết cache thì `503`.
 * Backend **không bao giờ** bịa giá. Hợp đồng: `docs/contracts/trading-market-data.md`.
 */
@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);
  private readonly providers = new Map<AssetClass, MarketDataProvider>();
  private readonly cache = new Map<string, { coins: MarketCoinDto[]; fetchedAt: number }>();
  private readonly inFlight = new Map<string, Promise<MarketFetchResult>>();

  constructor(
    @Inject(MARKET_DATA_PROVIDERS)
    private readonly providerList: MarketDataProvider[],
    private readonly config: ConfigService,
  ) {
    for (const provider of providerList) {
      this.providers.set(provider.assetClass, provider);
    }
  }

  /** Danh sách asset class đã có provider (dùng cho thông báo lỗi). */
  supportedAssetClasses(): AssetClass[] {
    return [...this.providers.keys()];
  }

  async getMarkets(params: GetMarketsParams = {}): Promise<MarketFetchResult> {
    const vs = params.vs ?? 'vnd';
    const assetClass = params.assetClass ?? DEFAULT_ASSET_CLASS;
    const provider = this.resolveProvider(assetClass);
    const symbols = this.resolveSymbols(assetClass, params);
    const cacheKey = `${provider.assetClass}:${vs}:${symbols}`;
    const cacheTtl = provider.cacheTtlMs();

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

    const request = this.fetchFromProvider({ provider, symbols, vs, cacheKey });

    this.inFlight.set(cacheKey, request);
    try {
      return await request;
    } finally {
      this.inFlight.delete(cacheKey);
    }
  }

  /** Tìm một coin theo symbol trong bộ dữ liệu thị trường mặc định (crypto). */
  async findBySymbol(symbol: string, vs: 'vnd' | 'usd' = 'vnd'): Promise<MarketCoinDto | null> {
    const wanted = symbol.trim().toUpperCase();
    if (wanted.length === 0) return null;

    const { coins } = await this.getMarkets({ vs });
    return coins.find((coin) => coin.symbol.toUpperCase() === wanted) ?? null;
  }

  private resolveProvider(assetClass: AssetClass): MarketDataProvider {
    const provider = this.providers.get(assetClass);
    if (!provider) {
      throw new BadRequestException(
        `assetClass '${assetClass}' chưa được hỗ trợ. Hiện có: ${this.supportedAssetClasses().join(', ') || 'không có provider nào'}`,
      );
    }
    return provider;
  }

  private resolveSymbols(assetClass: AssetClass, params: GetMarketsParams): string {
    if (assetClass === DEFAULT_ASSET_CLASS) {
      if (params.symbols) {
        throw new BadRequestException(
          "assetClass 'crypto' nhận 'ids' (CoinGecko id), không nhận 'symbols'",
        );
      }
      return params.ids ?? this.defaultCryptoIds();
    }

    if (params.ids) {
      throw new BadRequestException(
        `'ids' chỉ dùng cho assetClass 'crypto'. Với '${assetClass}' hãy dùng 'symbols'`,
      );
    }

    const symbols = params.symbols?.trim() ?? '';
    if (symbols.length === 0) {
      throw new BadRequestException(`assetClass '${assetClass}' yêu cầu tham số 'symbols'`);
    }
    return symbols;
  }

  /** Bộ id mặc định của crypto: cấu hình `MARKET_COIN_IDS` của provider crypto. */
  private defaultCryptoIds(): string {
    return this.providers.get(DEFAULT_ASSET_CLASS)?.defaultSymbols?.() ?? '';
  }

  private async fetchFromProvider(input: {
    provider: MarketDataProvider;
    symbols: string;
    vs: 'vnd' | 'usd';
    cacheKey: string;
  }): Promise<MarketFetchResult> {
    const { provider, symbols, vs, cacheKey } = input;

    try {
      const result = await provider.fetch({ symbols, vs });
      this.cache.set(cacheKey, { coins: result.coins, fetchedAt: Date.now() });
      return result;
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
}

export { ASSET_CLASSES, DEFAULT_ASSET_CLASS };
export type { AssetClass };