import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PriceQueryDto {
  @ApiPropertyOptional({ description: 'Symbol filter (e.g. BDSD)' })
  @IsOptional()
  @IsString()
  symbol?: string;
}
