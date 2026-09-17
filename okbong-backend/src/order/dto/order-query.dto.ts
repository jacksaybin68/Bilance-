import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from './order.dto';
import { OrderType } from './order-type.enum';

export class CreateOrderDto {
  @ApiProperty({ description: 'Trading pair, e.g. BTC/USDT' })
  @IsString()
  @MaxLength(20)
  pair!: string;

  @ApiProperty({ enum: ['buy', 'sell'] })
  @IsEnum(['buy', 'sell'])
  side!: 'buy' | 'sell';

  @ApiProperty({ example: 0.5 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 8 })
  @Min(0.00000001)
  amount!: number;

  @ApiProperty({ example: 26000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 8 })
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ enum: OrderType, default: OrderType.LIMIT })
  @IsOptional()
  @IsEnum(OrderType)
  type?: OrderType;
}

export class OrderQueryDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pair?: string;

  @ApiPropertyOptional({ enum: ['buy', 'sell'] })
  @IsOptional()
  @IsEnum(['buy', 'sell'])
  side?: 'buy' | 'sell';

  @ApiPropertyOptional({ description: 'Filter to a single user (admin only)' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

/**
 * Admin override for a single order: the status plus the filled quantity.
 * `filledAmount` is clamped to [0, amount] by the service so an override can
 * never leave an order over-filled.
 */
export class AdminOrderResultDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @ApiPropertyOptional({ description: 'Cumulative filled quantity after the override' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 8 })
  @Min(0)
  filledAmount?: number;

  @ApiPropertyOptional({ description: 'Execution price recorded for the override' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 8 })
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Reason kept in the audit log' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

/** Cancels an order on behalf of the platform (admin only). */
export class AdminCancelOrderDto {
  @ApiPropertyOptional({ description: 'Reason kept in the audit log' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
