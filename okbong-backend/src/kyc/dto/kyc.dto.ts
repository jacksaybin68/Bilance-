import { IsString, IsOptional, IsDateString, IsEnum, IsNumberString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KYCStatus } from '../entities/kyc.entity';

export class CreateKycDto {
  @ApiProperty({ description: 'User ID requesting KYC' })
  @IsString()
  userId!: string;

  @ApiPropertyOptional({ description: 'Front/back side image URL or base64' })
  @IsOptional()
  @IsString()
  frontImage?: string;

  @ApiPropertyOptional({ description: 'Back side image URL or base64' })
  @IsOptional()
  @IsString()
  backImage?: string;

  @ApiPropertyOptional({ description: 'Selfie image URL or base64' })
  @IsOptional()
  @IsString()
  selfieImage?: string;

  @ApiPropertyOptional({ description: 'ID number' })
  @IsOptional()
  @IsString()
  idNumber?: string;

  @ApiPropertyOptional({ description: 'Full name on document' })
  @IsOptional()
  @IsString()
  documentName?: string;
}

export class KycStatusUpdateDto {
  @ApiProperty({ enum: KYCStatus })
  @IsEnum(KYCStatus)
  status!: KYCStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rejectReason?: string;
}

export class KycQueryDto {
  @ApiPropertyOptional({ enum: KYCStatus })
  @IsOptional()
  @IsEnum(KYCStatus)
  status?: KYCStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  submittedAfter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  submittedBefore?: string;
}
