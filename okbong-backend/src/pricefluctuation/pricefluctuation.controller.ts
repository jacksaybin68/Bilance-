import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PriceQueryDto } from './dto/price-query.dto';
import { PriceHistoryEntity } from './entity/price-history.entity';
import {
  DEFAULT_SYMBOL,
  PriceFluctuationService,
  type CurrentPrice,
} from './pricefluctuation.service';

@Controller('price')
export class PriceFluctuationController {
  constructor(private readonly priceService: PriceFluctuationService) {}

  @Get('current')
  async current(@Query() query: PriceQueryDto): Promise<CurrentPrice> {
    return this.priceService.getCurrentPrice(query.symbol || DEFAULT_SYMBOL);
  }

  @Get('history')
  async history(
    @Query() query: PriceQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PriceHistoryEntity[]> {
    const { items, total } = await this.priceService.getHistory(query);
    response.setHeader('X-Total-Count', total);
    return items;
  }
}