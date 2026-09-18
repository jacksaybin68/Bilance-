import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ChatService } from '../chat/chat.service';
import { SendChatMessageDto } from './dto/chat.dto';
import { ChatMessageEntity } from './entity/chat-message.entity';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  @ApiOperation({ summary: 'Lịch sử chat của tôi với hỗ trợ viên' })
  mine(@CurrentUser() user: AuthenticatedUser): Promise<ChatMessageEntity[]> {
    return this.chatService.listMine(user.id);
  }

  @Post('message')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Gửi tin nhắn cho bộ phận hỗ trợ' })
  send(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendChatMessageDto,
  ): Promise<ChatMessageEntity> {
    return this.chatService.sendFromUser(user.id, dto.content);
  }
}