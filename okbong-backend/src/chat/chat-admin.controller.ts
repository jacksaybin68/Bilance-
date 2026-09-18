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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../enumeration/role.enum';
import { ChatService, ChatThread } from '../chat/chat.service';
import { AdminReplyChatDto, ChatThreadQueryDto } from './dto/chat.dto';
import { ChatMessageEntity } from './entity/chat-message.entity';

@ApiTags('admin-chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/chat')
export class ChatAdminController {
  constructor(private readonly chatService: ChatService) {}

  @Get('threads')
  @ApiOperation({ summary: 'Danh sách hội thoại (threads) của khách hàng' })
  async threads(@Query() query: ChatThreadQueryDto) {
    const threads = await this.chatService.listThreads(query.read === 'false');
    return { items: threads, total: threads.length };
  }

  @Get('threads/:userId')
  @ApiOperation({ summary: 'Chi tiết hội thoại của một khách hàng' })
  thread(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: ChatThreadQueryDto,
  ): Promise<ChatMessageEntity[]> {
    return this.chatService.listThread(userId);
  }

  @Post('reply')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Trả lời một khách hàng' })
  reply(@Body() dto: AdminReplyChatDto): Promise<ChatMessageEntity> {
    return this.chatService.replyFromAdmin(dto.userId, dto.content);
  }
}