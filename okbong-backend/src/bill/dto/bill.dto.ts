import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export enum BillStatus {
  PENDING = 'pending',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

export enum BillType {
  RECURRING = 'recurring',
  PAYMENT = 'payment',
  CHARGING = 'charging',
}

export class CreateUserBillDto {
  @ApiProperty({ example: 250000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(1_000_000_000)
  amount!: number;

  @ApiProperty({ enum: BillType })
  @IsEnum(BillType)
  type!: BillType;

  @ApiPropertyOptional({ example: 'Electricity bill 09/2026' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  description?: string;

  /** Alias accepted by the user app (`content` maps to `description`). */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  content?: string;
}

export class CreateBillDto {
  @ApiProperty({ example: 'a1b2c3d4-0000-4000-8000-000000000000' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ example: 250000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(1_000_000_000)
  amount!: number;

  @ApiProperty({ enum: BillType })
  @IsEnum(BillType)
  type!: BillType;

  @ApiPropertyOptional({ example: 'Electricity bill 09/2026' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  description?: string;
}

export class UpdateBillDto {
  @ApiPropertyOptional({ enum: BillStatus })
  @IsOptional()
  @IsEnum(BillStatus)
  status?: BillStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  description?: string;
}

export class BillQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ enum: BillStatus })
  @IsOptional()
  @IsEnum(BillStatus)
  status?: BillStatus;

  @ApiPropertyOptional({ enum: BillType })
  @IsOptional()
  @IsEnum(BillType)
  type?: BillType;
}
