import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { MarketCoinDto, MarketQueryDto } from './dto/market-coin.dto';
import { ASSET_CLASSES, DEFAULT_ASSET_CLASS } from './dto/asset-class.dto';
import { PriceQueryDto } from './dto/price-query.dto';
import { PriceHistoryEntity } from './entity/price-history.entity';
import { MarketDataService } from './market-data.service';
import {
  DEFAULT_SYMBOL,
  PriceFluctuationService,
  type PricePoint,
} from './pricefluctuation.service';

@ApiTags('price')
@Controller('price')
export class PriceFluctuationController {
  constructor(
    private readonly priceService: PriceFluctuationService,
    private readonly marketDataService: MarketDataService,
  ) {}

  @Get('markets')
  @ApiOperation({
    summary: 'Dữ liệu thị trường thực (CoinGecko) — giá, logo, biến động 24h, sparkline 7 ngày',
  })
  @ApiQuery({ name: 'vs', required: false, enum: ['vnd', 'usd'], example: 'vnd' })
  @ApiQuery({ name: 'ids', required: false, example: 'bitcoin,ethereum,tether' })
  @ApiQuery({
    name: 'assetClass',
    required: false,
    enum: ASSET_CLASSES,
    example: DEFAULT_ASSET_CLASS,
    description:
      `Lớp tài sản cần lấy (ADR 008). Mặc định \`${DEFAULT_ASSET_CLASS}\` — hành vi cũ không đổi.`,
  })
  @ApiQuery({
    name: 'symbols',
    required: false,
    example: 'AAPL,VCB.VN',
    description: 'Symbol cho asset class không phải crypto (không dùng cùng `ids`).',
  })
  @ApiOkResponse({ type: [MarketCoinDto] })
  async markets(
    @Query() query: MarketQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<MarketCoinDto[]> {
    const result = await this.marketDataService.getMarkets({
      vs: query.vs,
      ids: query.ids,
      assetClass: query.assetClass,
      symbols: query.symbols,
    });

    response.setHeader('X-Market-Source', result.source);
    response.setHeader('X-Market-Cached', String(result.cached));
    response.setHeader('X-Market-Updated-At', result.updatedAt);

    return result.coins;
  }

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
  ): Promise<PricePoint[]> {
    const { items, total } = await this.priceService.getHistory(query);
    response.setHeader('X-Total-Count', total);
    return items;
  }
}