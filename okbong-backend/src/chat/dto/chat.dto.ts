import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ConversationStatus, ConversationTopic } from '../entities/conversation.entity';
import { MessageKind } from '../entities/message.entity';

export class CreateConversationDto {
  @ApiPropertyOptional({ description: 'Thread subject shown in the admin inbox' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  subject?: string;

  @ApiPropertyOptional({ enum: ConversationTopic })
  @IsOptional()
  @IsEnum(ConversationTopic)
  topic?: ConversationTopic;
}

export class SendMessageDto {
  @ApiPropertyOptional({ enum: MessageKind, default: MessageKind.TEXT })
  @IsOptional()
  @IsEnum(MessageKind)
  kind?: MessageKind;

  @ApiProperty({ description: 'Message body (may be empty when an attachment is sent)' })
  @IsString()
  @MaxLength(4000)
  body!: string;

  @ApiPropertyOptional({ description: 'URL or data URI for image/file messages' })
  @IsOptional()
  @IsString()
  attachment?: string;
}

/**
 * Admin reply. The sender is taken from the authenticated request, never from
 * the body, so a client cannot post as someone else.
 */
export class AdminReplyDto extends SendMessageDto {
  @ApiPropertyOptional({ description: 'Mark the thread as pending/closed after replying' })
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;
}

export class ConversationQueryDto {
  @ApiPropertyOptional({ enum: ConversationStatus })
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  @ApiPropertyOptional({ enum: ConversationTopic })
  @IsOptional()
  @IsEnum(ConversationTopic)
  topic?: ConversationTopic;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Free text match on subject or user email' })
  @IsOptional()
  @IsString()
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

export class MessageQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({ description: 'Only messages created after this ISO timestamp' })
  @IsOptional()
  @IsString()
  since?: string;
}

export class ConversationStatusUpdateDto {
  @ApiProperty({ enum: ConversationStatus })
  @IsEnum(ConversationStatus)
  status!: ConversationStatus;
}

export class ConversationAssignmentDto {
  @ApiProperty({ description: 'Admin id handling the thread (null clears it)' })
  @IsOptional()
  @IsUUID()
  assignedTo?: string | null;
}

export class MarkReadDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  read?: boolean;
}