import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { roundAmount } from '../common/utils/amount.util';
import { PriceGateway } from '../realtime/realtime.gateway';
import { PriceQueryDto } from './dto/price-query.dto';
import { PriceHistoryEntity } from './entity/price-history.entity';
import { MarketDataService } from './market-data.service';

export const DEFAULT_SYMBOL = 'BDSD';

export interface CurrentPrice {
  symbol: string;
  currency: string;
  price: number;
  volume: number | null;
  updatedAt: Date;
}

export interface PriceHistoryPage {
  items: PricePoint[];
  total: number;
}

/** Một điểm giá, dùng chung cho chuỗi thật và bản ghi trong DB. */
export interface PricePoint {
  symbol: string;
  price: number;
  recordedAt: Date;
}

@Injectable()
export class PriceFluctuationService {
  private readonly logger = new Logger(PriceFluctuationService.name);
  private readonly seedPrice: number;
  private readonly current = new Map<string, CurrentPrice>();

  constructor(
    @InjectRepository(PriceHistoryEntity)
    private readonly priceHistoryRepository: Repository<PriceHistoryEntity>,
    private readonly configService: ConfigService,
    private readonly priceGateway: PriceGateway,
    private readonly marketDataService: MarketDataService,
  ) {
    const seed = Number(this.configService.get<string>('PRICE_SEED', '25000'));
    this.seedPrice = Number.isFinite(seed) && seed > 0 ? seed : 25_000;
  }

  /**
   * Giá hiện tại: coin niêm yết trên thị trường lấy từ nguồn thật; chỉ token nội
   * bộ (`BDSD`) mới dùng chuỗi giá ghi trong DB / giá seed.
   */
  async getCurrentPrice(symbol: string = DEFAULT_SYMBOL): Promise<CurrentPrice> {
    const key = symbol.toUpperCase();

    try {
      const market = await this.marketDataService.findBySymbol(key);
      if (market) {
        return {
          symbol: key,
          currency: market.currency,
          price: market.price,
          volume: market.volume24h,
          updatedAt: new Date(market.updatedAt),
        };
      }
    } catch (error) {
      // Nguồn ngoài lỗi: rơi về dữ liệu nội bộ thay vì làm hỏng endpoint.
      this.logger.warn(
        `Không lấy được giá thị trường cho ${key}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const cached = this.current.get(key);
    if (cached) return cached;

    const latest = await this.priceHistoryRepository.findOne({
      where: { symbol: key },
      order: { recordedAt: 'DESC' },
    });

    const current: CurrentPrice = {
      symbol: key,
      currency: key,
      price: latest ? latest.price : this.seedPrice,
      volume: latest?.volume ?? null,
      updatedAt: latest?.recordedAt ?? new Date(),
    };
    this.current.set(key, current);
    return current;
  }

  /**
   * Lịch sử giá: coin thị trường trả chuỗi 7 ngày thật (sparkline, mỗi điểm cách
   * nhau 1 giờ); token nội bộ đọc từ bảng `price_history`.
   */
  async getHistory(query: PriceQueryDto = {}): Promise<PriceHistoryPage> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 50;
    const symbol = query.symbol?.trim().toUpperCase();

    if (symbol) {
      const sparkline = await this.getMarketSparkline(symbol);
      if (sparkline.length > 0) {
        const total = sparkline.length;
        const start = (page - 1) * limit;
        return { items: sparkline.slice(start, start + limit), total };
      }
    }

    const where = symbol ? { symbol } : {};
    const [items, total] = await this.priceHistoryRepository.findAndCount({
      where,
      order: { recordedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total };
  }

  /** Chuỗi giá 7 ngày của một coin thị trường, mới nhất ở cuối. */
  private async getMarketSparkline(symbol: string): Promise<PricePoint[]> {
    try {
      const market = await this.marketDataService.findBySymbol(symbol);
      if (!market || market.sparkline.length === 0) return [];

      const stepMs = 60 * 60 * 1000;
      const end = new Date(market.updatedAt).getTime();
      const start = end - (market.sparkline.length - 1) * stepMs;

      return market.sparkline.map((price, index) => ({
        symbol: market.symbol,
        price,
        recordedAt: new Date(start + index * stepMs),
      }));
    } catch (error) {
      this.logger.warn(
        `Không lấy được lịch sử giá cho ${symbol}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  async recordPrice(input: {
    symbol?: string;
    price: number;
    volume?: number;
  }): Promise<PriceHistoryEntity> {
    const symbol = (input.symbol ?? DEFAULT_SYMBOL).toUpperCase();
    const price = roundAmount(input.price);
    const volume = input.volume != null && Number.isFinite(input.volume) ? roundAmount(input.volume) : null;

    const entity = this.priceHistoryRepository.create({
      symbol,
      price,
      volume,
    });
    const saved = await this.priceHistoryRepository.save(entity);

    const current: CurrentPrice = {
      symbol,
      currency: symbol,
      price,
      volume,
      updatedAt: saved.recordedAt,
    };
    this.current.set(symbol, current);

    try {
      this.priceGateway.broadcastPrice({ symbol, currency: symbol, price, volume, updatedAt: saved.recordedAt });
    } catch (err) {
      this.logger.warn(`price broadcast failed: ${(err as Error).message}`);
    }

    return saved;
  }

  async subscribe(clientId: string): Promise<void> {
    this.logger.log(`price subscriber connected: ${clientId}`);
  }
}