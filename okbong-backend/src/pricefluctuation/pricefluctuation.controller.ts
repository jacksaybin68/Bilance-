import { Controller, Get, Query } from '@nestjs/common';
import { PriceFluctuationService } from './pricefluctuation.service';
import { PriceQueryDto } from './dto/price-query.dto';

@Controller('price')
export class PriceFluctuationController {
  constructor(private readonly priceService: PriceFluctuationService) {}

  @Get('current')
  async current(@Query() query: PriceQueryDto) {
    return this.priceService.getCurrentPrice();
  }

  @Get('history')
  async history(@Query() query: PriceQueryDto) {
    return this.priceService.getHistory();
  }
}
