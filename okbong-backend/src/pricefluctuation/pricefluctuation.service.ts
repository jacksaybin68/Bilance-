import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { roundAmount } from '../common/utils/amount.util';
import { PriceGateway } from '../realtime/realtime.gateway';
import { PriceQueryDto } from './dto/price-query.dto';
import { PriceHistoryEntity } from './entity/price-history.entity';

export const DEFAULT_SYMBOL = 'BDSD';

export interface CurrentPrice {
  symbol: string;
  currency: string;
  price: number;
  volume: number | null;
  updatedAt: Date;
}

export interface PriceHistoryPage {
  items: PriceHistoryEntity[];
  total: number;
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
  ) {
    const seed = Number(this.configService.get<string>('PRICE_SEED', '25000'));
    this.seedPrice = Number.isFinite(seed) && seed > 0 ? seed : 25_000;
  }

  async getCurrentPrice(symbol: string = DEFAULT_SYMBOL): Promise<CurrentPrice> {
    const key = symbol.toUpperCase();
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

  async getHistory(query: PriceQueryDto = {}): Promise<PriceHistoryPage> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 50;
    const symbol = query.symbol?.trim().toUpperCase();

    const where = symbol ? { symbol } : {};
    const [items, total] = await this.priceHistoryRepository.findAndCount({
      where,
      order: { recordedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total };
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