import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { PriceQueryDto } from './dto/price-query.dto';
import { PriceHistoryEntity } from './entity/price-history.entity';
import {
  DEFAULT_SYMBOL,
  PriceFluctuationService,
} from './pricefluctuation.service';

@ApiTags('price')
@Controller('price')
export class PriceFluctuationController {
  constructor(private readonly priceService: PriceFluctuationService) {}

  @Get('current')
  @ApiOperation({ summary: 'Giá hiện tại của cặp giao dịch' })
  @ApiOkResponse({
    description: 'Giá hiện tại của cặp giao dịch',
    schema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', example: DEFAULT_SYMBOL },
        currency: { type: 'string', example: DEFAULT_SYMBOL },
        price: { type: 'number', example: 25000 },
        volume: { oneOf: [{ type: 'number' }, { type: 'null' }], example: null },
        updatedAt: { type: 'string', format: 'date-time', example: '2026-09-16T10:00:00.000Z' },
      },
    },
  })
  async current(@Query() query: PriceQueryDto) {
    return this.priceService.getCurrentPrice(query.symbol || DEFAULT_SYMBOL);
  }

  @Get('history')
  @ApiOperation({ summary: 'Lịch sử biến động giá (phân trang, X-Total-Count)' })
  @ApiOkResponse({ type: [PriceHistoryEntity] })
  @ApiQuery({ name: 'symbol', required: false, example: DEFAULT_SYMBOL })
  async history(
    @Query() query: PriceQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PriceHistoryEntity[]> {
    const { items, total } = await this.priceService.getHistory(query);
    response.setHeader('X-Total-Count', total);
    return items;
  }
}