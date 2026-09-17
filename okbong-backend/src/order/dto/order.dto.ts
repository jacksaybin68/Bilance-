import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { OrderType } from './order-type.enum';

export enum OrderSide {
  BUY = 'buy',
  SELL = 'sell',
}

export enum OrderStatus {
  PENDING = 'pending',
  WIN = 'win',
  LOSE = 'lose',
}

export class OrderStatusDto {
  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;
}

export class CreateOrderDto {
  @ApiProperty({ description: 'Cặp tiền', example: 'BDSD/USDT' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  pair!: string;

  @ApiProperty({ enum: OrderSide, default: OrderSide.BUY })
  @IsEnum(OrderSide)
  side!: OrderSide;

  @ApiProperty({ example: 100000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(1_000_000_000)
  amount!: number;

  @ApiPropertyOptional({ description: 'Tỷ giá tham chiếu khi đặt lệnh', example: 25450 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ enum: OrderType, default: OrderType.LIMIT })
  @IsOptional()
  @IsEnum(OrderType)
  type?: OrderType;
}

export class AdminSetOrderResultDto {
  @ApiProperty({ enum: OrderStatus, description: 'Kết quả lệnh: win (công điểm) hoặc lose' })
  @IsIn(['win', 'lose'])
  result!: 'win' | 'lose';

  @ApiPropertyOptional({ description: 'Ghi chú của Admin' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}

export class OrderQueryDto {
  @ApiPropertyOptional({ enum: OrderSide })
  @IsOptional()
  @IsEnum(OrderSide)
  side?: OrderSide;

  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsIn(['pending', 'win', 'lose'])
  status?: OrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(200)
  limit?: number;
}
