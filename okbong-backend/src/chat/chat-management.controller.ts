import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { Role } from '../enumeration/role.enum';
import { ChatService } from './chat.service';
import {
  AdminReplyDto,
  ConversationAssignmentDto,
  ConversationQueryDto,
  ConversationStatusUpdateDto,
  MessageQueryDto,
} from './dto/chat.dto';

@ApiTags('admin/chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/chat')
export class ChatManagementController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Support inbox: every conversation (admin only)' })
  @ApiOkResponse({ description: 'Paginated conversation list' })
  list(@Query() query: ConversationQueryDto) {
    return this.chatService.list(query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Open/pending/unread counters for the admin badge' })
  @ApiOkResponse({ description: 'Inbox counters' })
  summary() {
    return this.chatService.unreadSummary();
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'One conversation with its user (admin only)' })
  @ApiOkResponse({ description: 'Conversation detail' })
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.chatService.findOne(id);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Messages of any conversation (admin only)' })
  @ApiOkResponse({ description: 'Paginated messages ordered oldest first' })
  messages(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: MessageQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chatService.listMessages(id, query, user);
  }

  @Post('conversations/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Reply to a conversation as support (admin only)' })
  @ApiOkResponse({ description: 'Stored message' })
  reply(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminReplyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chatService.sendFromAdmin(id, user.id, dto);
  }

  @Patch('conversations/:id/status')
  @ApiOperation({ summary: 'Open / pending / close a conversation (admin only)' })
  @ApiOkResponse({ description: 'Updated conversation' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConversationStatusUpdateDto,
  ) {
    return this.chatService.updateStatus(id, dto.status);
  }

  @Patch('conversations/:id/assignment')
  @ApiOperation({ summary: 'Assign a conversation to an admin (admin only)' })
  @ApiOkResponse({ description: 'Updated conversation' })
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConversationAssignmentDto,
  ) {
    return this.chatService.assign(id, dto.assignedTo ?? null);
  }

  @Post('conversations/:id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a conversation as read by support (admin only)' })
  @ApiOkResponse({ description: 'Updated conversation' })
  markRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chatService.markRead(id, user, true);
  }
}
