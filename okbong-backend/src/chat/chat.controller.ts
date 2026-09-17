import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ChatService } from './chat.service';
import {
  CreateConversationDto,
  MessageQueryDto,
  SendMessageDto,
} from './dto/chat.dto';
import { ConversationEntity } from './entities/conversation.entity';
import { MessageEntity } from './entities/message.entity';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'My support conversations' })
  @ApiOkResponse({ description: 'Conversation list ordered by latest activity' })
  async myConversations(@CurrentUser() user: AuthenticatedUser): Promise<ConversationEntity[]> {
    return this.chatService.listForUser(user.id);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Open (or reuse) my support conversation' })
  @ApiCreatedResponse({ description: 'Conversation ready for messaging' })
  async openConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateConversationDto,
  ): Promise<ConversationEntity> {
    return this.chatService.getOrCreateForUser(user.id, dto);
  }

  @Get('unread')
  @ApiOperation({ summary: 'Unread message count for the badge in the navbar' })
  @ApiOkResponse({ description: 'Aggregated unread counter' })
  unread(@CurrentUser() user: AuthenticatedUser): Promise<{ unreadMessages: number }> {
    return this.chatService.unreadForUser(user.id);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Messages of one of my conversations' })
  @ApiOkResponse({ description: 'Paginated messages ordered oldest first' })
  async messages(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: MessageQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chatService.listMessages(id, query, user);
  }

  @Post('conversations/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a message on one of my conversations' })
  @ApiCreatedResponse({ description: 'Stored message' })
  send(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MessageEntity> {
    return this.chatService.sendFromUser(user.id, id, dto);
  }

  @Post('conversations/:id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark my conversation as read' })
  @ApiOkResponse({ description: 'Updated conversation' })
  markRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ConversationEntity> {
    return this.chatService.markRead(id, user, true);
  }
}
