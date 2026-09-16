import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceFluctuationController } from './pricefluctuation.controller';
import { PriceFluctuationService } from './pricefluctuation.service';
import { PriceHistoryEntity } from './entity/price-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PriceHistoryEntity])],
  controllers: [PriceFluctuationController],
  providers: [PriceFluctuationService],
  exports: [PriceFluctuationService],
})
export class PriceFluctuationModule {}
