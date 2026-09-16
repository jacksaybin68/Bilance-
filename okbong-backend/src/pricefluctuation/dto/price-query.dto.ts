import { ApiPropertyOptional } from '@nestjs/swagger';
import { MaxLength, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class PriceQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Symbol filter (e.g. BDSD)' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  symbol?: string;
}