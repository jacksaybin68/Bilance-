import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueModule } from '../queue/queue.module';
import { PriceFluctuationController } from './pricefluctuation.controller';
import { PriceFluctuationService } from './pricefluctuation.service';
import { PriceTickerService } from './price-ticker.service';
import { PriceWorker } from './price.worker';
import { PriceHistoryEntity } from './entity/price-history.entity';
import { MarketDataService } from './market-data.service';

@Module({
  imports: [TypeOrmModule.forFeature([PriceHistoryEntity]), QueueModule],
  controllers: [PriceFluctuationController],
  providers: [
    PriceFluctuationService,
    PriceTickerService,
    PriceWorker,
    MarketDataService,
  ],
  exports: [PriceFluctuationService, PriceWorker, MarketDataService],
})
export class PriceFluctuationModule {}