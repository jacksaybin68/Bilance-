import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PriceHistoryEntity } from './entity/price-history.entity';

@Injectable()
export class PriceFluctuationService {
  private currentPrice = 25_000;

  constructor(
    @InjectRepository(PriceHistoryEntity)
    private readonly priceHistoryRepository: Repository<PriceHistoryEntity>,
  ) {}

  async getCurrentPrice(): Promise<{ price: number; currency: string }> {
    return { price: this.currentPrice, currency: 'BDSD' };
  }

  async getHistory(): Promise<PriceHistoryEntity[]> {
    return this.priceHistoryRepository.find({
      order: { recordedAt: 'DESC' },
      take: 50,
    });
  }

  async subscribe(clientId: string): Promise<void> {
    // no-op: reserved for future pub/sub integration
  }
}
