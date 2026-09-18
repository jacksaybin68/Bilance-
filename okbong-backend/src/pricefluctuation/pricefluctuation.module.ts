import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueModule } from '../queue/queue.module';
import { PriceFluctuationController } from './pricefluctuation.controller';
import { PriceFluctuationService } from './pricefluctuation.service';
import { PriceTickerService } from './price-ticker.service';
import { PriceWorker } from './price.worker';
import { PriceHistoryEntity } from './entity/price-history.entity';
import { MarketDataService } from './market-data.service';
import { CryptoProvider } from './providers/crypto.provider';
import { MARKET_DATA_PROVIDERS } from './providers/market-data-provider.interface';

@Module({
  imports: [TypeOrmModule.forFeature([PriceHistoryEntity]), QueueModule],
  controllers: [PriceFluctuationController],
  providers: [
    PriceFluctuationService,
    PriceTickerService,
    PriceWorker,
    MarketDataService,
    CryptoProvider,
    // Danh sách provider cho orchestrator (ADR 008 D2). Thêm provider mới
    // (equity/fx/bond/commodity/index) chỉ cần thêm vào `inject` + `providers`.
    {
      provide: MARKET_DATA_PROVIDERS,
      useFactory: (crypto: CryptoProvider) => [crypto],
      inject: [CryptoProvider],
    },
  ],
  exports: [PriceFluctuationService, PriceWorker, MarketDataService],
})
export class PriceFluctuationModule {}