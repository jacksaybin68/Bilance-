import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PlanStatus } from '../entities/plan.entity';
import { ContentCategory, ContentStatus } from '../entities/content-post.entity';
import { Role } from '../../enumeration/role.enum';
import { UserStatus } from '../../user/entity/user.entity';
import { TransactionStatus } from '../../wallet/entity/transaction.entity';

/** Shared pagination + filter query for admin list screens. */
export class AdminListQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  userId?: string;
}

export class AdminUserQueryDto extends AdminListQueryDto {
  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  override status?: UserStatus;
}

export class AdminCreateUserDto {
  @ApiPropertyOptional()
  @IsEmail()
  @MaxLength(160)
  email!: string;

  @ApiPropertyOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

export class AdminUpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  email?: string;
}

export class AdminUpdateRoleDto {
  @ApiPropertyOptional({ enum: Role })
  @IsEnum(Role)
  role!: Role;
}

export class CreatePlanDto {
  @ApiPropertyOptional()
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  duration?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({ enum: PlanStatus })
  @IsOptional()
  @IsEnum(PlanStatus)
  status?: PlanStatus;
}

export class UpdatePlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  duration?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({ enum: PlanStatus })
  @IsOptional()
  @IsEnum(PlanStatus)
  status?: PlanStatus;
}

export class SettingChangeDto {
  @ApiPropertyOptional()
  @IsString()
  @MaxLength(80)
  key!: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(255)
  value!: string;
}

export class UpdateSettingsDto {
  @ApiPropertyOptional({ type: [SettingChangeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettingChangeDto)
  settings!: SettingChangeDto[];
}

export class CreateContentPostDto {
  @ApiPropertyOptional()
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ enum: ContentCategory })
  @IsOptional()
  @IsEnum(ContentCategory)
  category?: ContentCategory;

  @ApiPropertyOptional({ enum: ContentStatus })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  content?: string;
}

export class UpdateContentPostDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ enum: ContentCategory })
  @IsOptional()
  @IsEnum(ContentCategory)
  category?: ContentCategory;

  @ApiPropertyOptional({ enum: ContentStatus })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  content?: string;
}

/** Transaction review payload for the admin approval screen. */
export class ReviewTransactionDto {
  @ApiPropertyOptional({ enum: ['completed', 'failed', 'reversed'] })
  @IsEnum(TransactionStatus)
  status!: TransactionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class UpdateMarketPriceDto {
  @ApiPropertyOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 8 })
  @Min(0)
  price!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  volume?: number;
}

