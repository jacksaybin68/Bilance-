import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, MoreThan, Repository } from 'typeorm';
import { Role } from '../enumeration/role.enum';
import { UserEntity } from '../user/entity/user.entity';
import { ChatGateway } from './chat.gateway';
import {
  AdminReplyDto,
  ConversationQueryDto,
  CreateConversationDto,
  MessageQueryDto,
  SendMessageDto,
} from './dto/chat.dto';
import {
  ConversationEntity,
  ConversationStatus,
  ConversationTopic,
} from './entities/conversation.entity';
import { MessageEntity, MessageSenderRole } from './entities/message.entity';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(ConversationEntity)
    private readonly conversationRepository: Repository<ConversationEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    private readonly chatGateway: ChatGateway,
  ) {}

  // ── Conversations ────────────────────────────────────────────────
  /** Returns the user's open thread, creating one on first contact. */
  async getOrCreateForUser(
    userId: string,
    dto: CreateConversationDto = {},
  ): Promise<ConversationEntity> {
    const existing = await this.conversationRepository.findOne({
      where: { userId, status: ConversationStatus.OPEN },
      order: { createdAt: 'DESC' },
    });
    if (existing) return existing;

    const conversation = this.conversationRepository.create({
      userId,
      subject: dto.subject ?? 'Hỗ trợ',
      topic: dto.topic ?? ConversationTopic.GENERAL,
      status: ConversationStatus.OPEN,
    });
    const saved = await this.conversationRepository.save(conversation);
    this.chatGateway.broadcastConversation(saved, 'chat:conversation:created');
    return saved;
  }

  async listForUser(userId: string): Promise<ConversationEntity[]> {
    return this.conversationRepository.find({
      where: { userId },
      order: { lastMessageAt: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<ConversationEntity> {
    const conversation = await this.conversationRepository.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!conversation) throw new NotFoundException(`Conversation ${id} was not found`);
    return this.withoutCredentials(conversation);
  }

  /**
   * Drops credential fields from the embedded `user`/`assignee` relations.
   * `@Exclude()` on the entity is inert here because no
   * ClassSerializerInterceptor is registered, so these payloads would
   * otherwise carry a password hash to the client.
   */
  private withoutCredentials<T extends ConversationEntity>(conversation: T): T {
    type SanitizableUser = Omit<UserEntity, 'passwordHash'> & { passwordHash?: string };

    const user = conversation.user as SanitizableUser | undefined;
    if (user) delete user.passwordHash;

    const assignee = conversation.assignee as SanitizableUser | undefined;
    if (assignee) delete assignee.passwordHash;

    return conversation;
  }

  /** Throws unless the caller owns the thread or holds an admin role. */
  async assertAccess(conversationId: string, viewer: { id: string; role: Role }): Promise<ConversationEntity> {
    const conversation = await this.findOne(conversationId);
    if (!this.isStaff(viewer.role) && conversation.userId !== viewer.id) {
      throw new ForbiddenException('You can only access your own conversations');
    }
    return conversation;
  }

  // ── Admin inbox ──────────────────────────────────────────────────
  async list(
    query: ConversationQueryDto,
  ): Promise<
    PaginatedResult<
      ConversationEntity & { lastMessage?: string | null; userEmail?: string | null }
    >
  > {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const base: FindOptionsWhere<ConversationEntity> = {};
    if (query.status) base.status = query.status;
    if (query.topic) base.topic = query.topic;
    if (query.userId) base.userId = query.userId;

    const where: FindOptionsWhere<ConversationEntity>[] = query.search
      ? [
          { ...base, subject: ILike(`%${query.search}%`) },
          {
            ...base,
            user: { email: ILike(`%${query.search}%`) } as FindOptionsWhere<UserEntity>,
          },
        ]
      : [base];

    const [items, total] = await this.conversationRepository.findAndCount({
      where,
      relations: { user: true, assignee: true },
      order: { lastMessageAt: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: items.map((conversation) => ({
        ...this.withoutCredentials(conversation),
        userEmail: conversation.user?.email ?? null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async unreadSummary(): Promise<{
    open: number;
    pending: number;
    closed: number;
    unreadMessages: number;
  }> {
    const [open, pending, closed, unreadMessages] = await Promise.all([
      this.conversationRepository.count({ where: { status: ConversationStatus.OPEN } }),
      this.conversationRepository.count({ where: { status: ConversationStatus.PENDING } }),
      this.conversationRepository.count({ where: { status: ConversationStatus.CLOSED } }),
      this.messageRepository.count({
        where: { senderRole: MessageSenderRole.USER, readByAdmin: false },
      }),
    ]);
    return { open, pending, closed, unreadMessages };
  }

  async updateStatus(id: string, status: ConversationStatus): Promise<ConversationEntity> {
    const conversation = await this.findOne(id);
    conversation.status = status;
    const saved = await this.conversationRepository.save(conversation);
    this.chatGateway.broadcastConversation(saved, 'chat:conversation:updated');
    return saved;
  }

  async assign(id: string, assignedTo: string | null): Promise<ConversationEntity> {
    const conversation = await this.findOne(id);
    conversation.assignedTo = assignedTo;
    const saved = await this.conversationRepository.save(conversation);
    this.chatGateway.broadcastConversation(saved, 'chat:conversation:updated');
    return saved;
  }

  // ── Messages ─────────────────────────────────────────────────────
  async listMessages(
    conversationId: string,
    query: MessageQueryDto,
    viewer: { id: string; role: Role },
  ): Promise<PaginatedResult<MessageEntity>> {
    await this.assertAccess(conversationId, viewer);

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const where: FindOptionsWhere<MessageEntity> = { conversationId };
    if (query.since) {
      const since = new Date(query.since);
      if (Number.isNaN(since.getTime())) {
        throw new BadRequestException('`since` must be a valid ISO date');
      }
      where.createdAt = MoreThan(since);
    }

    const [items, total] = await this.messageRepository.findAndCount({
      where,
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    void this.markRead(conversationId, viewer, true).catch((error: unknown) =>
      this.logger.warn(
        `failed to mark conversation ${conversationId} as read: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ),
    );

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async sendFromUser(
    userId: string,
    conversationId: string,
    dto: SendMessageDto,
  ): Promise<MessageEntity> {
    return this.persistMessage(conversationId, {
      senderId: userId,
      senderRole: MessageSenderRole.USER,
      dto,
    });
  }

  async sendFromAdmin(conversationId: string, senderId: string, dto: AdminReplyDto): Promise<MessageEntity> {
    const message = await this.persistMessage(conversationId, {
      senderId,
      senderRole: MessageSenderRole.ADMIN,
      dto,
    });

    if (dto.status) {
      await this.updateStatus(conversationId, dto.status);
    }
    return message;
  }

  private async persistMessage(
    conversationId: string,
    input: { senderId: string; senderRole: MessageSenderRole; dto: SendMessageDto },
  ): Promise<MessageEntity> {
    const conversation = await this.findOne(conversationId);
    if (conversation.status === ConversationStatus.CLOSED) {
      throw new BadRequestException('This conversation is closed and cannot receive messages');
    }

    const body = input.dto.body?.trim() ?? '';
    if (body.length === 0 && !input.dto.attachment) {
      throw new BadRequestException('A message needs a body or an attachment');
    }

    const isFromUser = input.senderRole === MessageSenderRole.USER;

    const message = this.messageRepository.create({
      conversationId,
      senderId: input.senderId,
      senderRole: input.senderRole,
      kind: input.dto.kind,
      body,
      attachment: input.dto.attachment ?? null,
      readByUser: !isFromUser,
      readByAdmin: isFromUser,
    });
    const saved = await this.messageRepository.save(message);

    conversation.lastMessageAt = saved.createdAt;
    if (isFromUser) {
      conversation.unreadForAdmin += 1;
      // A user replying to a thread support set to `pending` reopens it;
      // `closed` threads are rejected above and need an explicit admin reopen.
      if (conversation.status === ConversationStatus.PENDING) {
        conversation.status = ConversationStatus.OPEN;
      }
    } else {
      conversation.unreadForUser += 1;
    }
    const updated = await this.conversationRepository.save(conversation);

    this.chatGateway.broadcastMessage(saved);
    this.chatGateway.broadcastConversation(updated, 'chat:conversation:updated');
    return saved;
  }

  async markRead(
    conversationId: string,
    viewer: { id: string; role: Role },
    read = true,
  ): Promise<ConversationEntity> {
    const conversation = await this.findOne(conversationId);

    if (this.isStaff(viewer.role)) {
      conversation.unreadForAdmin = read ? 0 : conversation.unreadForAdmin;
      await this.messageRepository.update(
        { conversationId, senderRole: MessageSenderRole.USER },
        { readByAdmin: read },
      );
    } else {
      conversation.unreadForUser = read ? 0 : conversation.unreadForUser;
      await this.messageRepository.update(
        { conversationId, senderRole: MessageSenderRole.ADMIN },
        { readByUser: read },
      );
    }

    const saved = await this.conversationRepository.save(conversation);
    this.chatGateway.broadcastConversation(saved, 'chat:conversation:updated');
    return saved;
  }

  async unreadForUser(userId: string): Promise<{ unreadMessages: number }> {
    const conversations = await this.conversationRepository.find({
      where: { userId },
      select: { id: true, unreadForUser: true },
    });
    const unreadMessages = conversations.reduce((sum, c) => sum + c.unreadForUser, 0);
    return { unreadMessages };
  }

  private isStaff(role: Role): boolean {
    return role === Role.ADMIN || role === Role.SUPER_ADMIN;
  }
}
