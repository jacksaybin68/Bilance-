import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  TransactionStatus,
  TransactionType,
} from '../../wallet/entity/transaction.entity';
import { WalletType } from '../../wallet/dto/wallet.dto';

export class AdminTransactionQueryDto {
  @ApiPropertyOptional({ description: 'Filter by the owning user' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by wallet id' })
  @IsOptional()
  @IsUUID()
  walletId?: string;

  @ApiPropertyOptional({ enum: WalletType })
  @IsOptional()
  @IsEnum(WalletType)
  walletType?: WalletType;

  @ApiPropertyOptional({ enum: TransactionType })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({ enum: TransactionStatus })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional({ description: 'Lower bound (inclusive) for the transaction amount' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional({ description: 'Upper bound (inclusive) for the transaction amount' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @ApiPropertyOptional({ description: 'Only transactions created on/after this date (ISO)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Only transactions created on/before this date (ISO)' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ description: 'Free text match on reference, description or user email' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

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

export class RejectTransactionDto {
  @ApiPropertyOptional({ description: 'Reason shown to the user and stored in the audit log' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

export class ReverseTransactionDto {
  @ApiPropertyOptional({ description: 'Reason for reversing a settled transaction' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

export class WalletAdjustmentDto {
  @ApiProperty({ description: 'Wallet receiving the adjustment' })
  @IsUUID()
  walletId!: string;

  @ApiProperty({
    description: 'Signed amount: positive credits the wallet, negative debits it',
    example: -25000,
  })
  @Type(() => Number)
  @IsNumber()
  amount!: number;

  @ApiProperty({ description: 'Audit reason for the manual adjustment' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason!: string;
}
