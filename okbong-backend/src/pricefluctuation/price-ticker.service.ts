import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DEFAULT_SYMBOL, PriceFluctuationService } from './pricefluctuation.service';

/**
 * Publishes a periodic, slightly-varied price sample so the realtime channel
 * and the history feed stay alive in development. Disabled in production
 * unless PRICE_TICKER_ENABLED is explicitly set to "true".
 */
@Injectable()
export class PriceTickerService {
  private readonly logger = new Logger(PriceTickerService.name);
  private readonly enabled: boolean;
  private readonly volatility: number;

  constructor(
    private readonly priceService: PriceFluctuationService,
    private readonly config: ConfigService,
  ) {
    const env = this.config.get<string>('PRICE_TICKER_ENABLED', '');
    this.enabled = env === 'true' || (env === '' && this.config.get<string>('NODE_ENV') !== 'production');
    this.volatility = Number(this.config.get<string>('PRICE_TICKER_VOLATILITY', '0.01'));
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async tick(): Promise<void> {
    if (!this.enabled) return;

    const { price, symbol, volume } = await this.priceService.getCurrentPrice(DEFAULT_SYMBOL);
    const shift = (Math.random() * 2 - 1) * this.volatility;
    const next = Math.max(1, price * (1 + shift));

    await this.priceService.recordPrice({
      symbol,
      price: next,
      volume: volume ?? Math.round(next * (10 + Math.random() * 40)),
    });
  }
}