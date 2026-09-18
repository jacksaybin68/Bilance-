import { Controller, Body, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '../../enumeration/role.enum';
import { AdminListQueryDto, UpdateMarketPriceDto } from '../dto/admin-query.dto';
import { PriceHistoryEntity } from '../../pricefluctuation/entity/price-history.entity';

export interface MarketSymbolSummary {
  symbol: string;
  price: number;
  volume: number | null;
  updatedAt: string | null;
}

@ApiTags('admin/market')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/market')
export class MarketManagementController {
  constructor(
    @InjectRepository(PriceHistoryEntity)
    private readonly priceRepository: Repository<PriceHistoryEntity>,
  ) {}

  /** Latest price per traded symbol, derived from the price history feed. */
  @Get('symbols')
  @ApiOperation({ summary: 'Latest price for every traded symbol' })
  @ApiOkResponse({ description: 'One summary row per symbol' })
  async symbols(): Promise<MarketSymbolSummary[]> {
    // Portable across Postgres and the SQLite dev fallback (no DISTINCT ON):
    // read the newest rows once, then keep the first hit per symbol.
    const recent = await this.priceRepository.find({
      order: { recordedAt: 'DESC' },
      take: 500,
    });

    const seen = new Map<string, MarketSymbolSummary>();
    for (const row of recent) {
      if (seen.has(row.symbol)) continue;
      seen.set(row.symbol, {
        symbol: row.symbol,
        price: Number(row.price),
        volume: row.volume ?? null,
        updatedAt: row.recordedAt?.toISOString() ?? null,
      });
    }

    return [...seen.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
  }

  @Get('history')
  @ApiOperation({ summary: 'Raw price history (X-Total-Count header)' })
  async history(@Query() query: AdminListQueryDto): Promise<PriceHistoryEntity[]> {
    const limit = query.limit ?? 100;
    const symbol = query.search?.trim().toUpperCase();
    return this.priceRepository.find({
      where: symbol ? { symbol } : {},
      order: { recordedAt: 'DESC' },
      take: limit,
    });
  }

  @Put('symbols/:symbol')
  @ApiOperation({ summary: 'Set the current price for a symbol (appends a history row)' })
  @ApiOkResponse({ description: 'The appended price history row' })
  setPrice(
    @Param('symbol') symbol: string,
    @Body() dto: UpdateMarketPriceDto,
  ): Promise<PriceHistoryEntity> {
    return this.priceRepository.save(
      this.priceRepository.create({
        symbol: symbol.trim().toUpperCase(),
        price: dto.price,
        volume: dto.volume ?? null,
      }),
    );
  }
}
