import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class SendChatMessageDto {
  @ApiProperty({ description: 'Nội dung tin nhắn' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content!: string;
}

export class AdminReplyChatDto extends SendChatMessageDto {
  @ApiProperty({ description: 'UserId của khách hàng cần trả lời' })
  @IsUUID()
  userId!: string;
}

export class ChatThreadQueryDto {
  @ApiPropertyOptional({ description: 'Trạng thái đã đọc' })
  @IsOptional()
  @IsIn(['true', 'false'])
  read?: string;

  @ApiPropertyOptional({ description: 'Giới hạn tin nhắn mỗi thread', default: 50 })
  @IsOptional()
  limit?: number;
}