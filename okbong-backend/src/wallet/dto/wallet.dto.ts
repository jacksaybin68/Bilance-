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
} from 'class-validator';

export enum WalletType {
  E_WALLET = 'e-wallet',
  BANK = 'bank',
}

export class CreateWalletDto {
  @ApiProperty({ enum: WalletType, default: WalletType.E_WALLET })
  @IsEnum(WalletType)
  type!: WalletType;

  @ApiPropertyOptional({ description: 'Opening balance', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Max(1_000_000_000)
  initialBalance?: number;
}

export class DepositDto {
  @ApiPropertyOptional({ description: 'Defaults to the authenticated user' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(1_000_000_000)
  amount!: number;

  @ApiPropertyOptional({ enum: WalletType, default: WalletType.E_WALLET })
  @IsOptional()
  @IsEnum(WalletType)
  type?: WalletType;
}

export class WithdrawDto extends DepositDto {}

export class WalletQueryDto {
  @ApiPropertyOptional({ enum: WalletType })
  @IsOptional()
  @IsEnum(WalletType)
  type?: WalletType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;
}
