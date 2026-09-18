import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { ChatMessageEntity } from './entity/chat-message.entity';

export interface ChatThread {
  userId: string;
  userEmail?: string;
  fullName?: string | null;
  lastMessage: string;
  lastMessageAt: Date;
  unread: number;
  lastSenderRole: 'user' | 'admin';
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(ChatMessageEntity)
    private readonly messageRepository: Repository<ChatMessageEntity>,
  ) {}

  /** List of user conversation threads (admin view), optionally filtered by unread. */
  async listThreads(onlyUnread = false): Promise<ChatThread[]> {
    const messages = await this.messageRepository.find({
      order: { createdAt: 'DESC' },
      take: 2000,
      relations: { user: true },
    });

    const byUser = new Map<string, ChatMessageEntity[]>();
    for (const message of messages) {
      const list = byUser.get(message.userId) ?? [];
      list.push(message);
      byUser.set(message.userId, list);
    }

    const threads: ChatThread[] = [];
    for (const [userId, list] of byUser) {
      const first = list[0]; // newest (list is DESC)
      const unread = list.filter((m) => !m.read && m.senderRole === 'user').length;
      if (onlyUnread && unread === 0) continue;

      threads.push({
        userId,
        userEmail: first.user?.email,
        fullName: first.user?.fullName ?? null,
        lastMessage: first.content,
        lastMessageAt: first.createdAt,
        unread,
        lastSenderRole: first.senderRole,
      });
    }

    return threads.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
  }

  /** Full conversation of one user (admin view, marks user messages read). */
  async listThread(userId: string): Promise<ChatMessageEntity[]> {
    const messages = await this.messageRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
      relations: { user: true },
    });

    // Mark incoming user messages as read once an admin opens the thread.
    await this.messageRepository.update(
      { userId, senderRole: 'user', read: false },
      { read: true },
    );

    return messages;
  }

  /** Messages of the authenticated user. */
  async listMine(userId: string): Promise<ChatMessageEntity[]> {
    return this.messageRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
  }

  async sendFromUser(userId: string, content: string): Promise<ChatMessageEntity> {
    const sanitized = content.trim();
    if (sanitized.length === 0) {
      throw new BadRequestException('Nội dung tin nhắn không được để trống');
    }
    const message = this.messageRepository.create({
      userId,
      senderRole: 'user',
      content: sanitized,
      read: false,
    });
    return this.messageRepository.save(message);
  }

  async replyFromAdmin(userId: string, content: string): Promise<ChatMessageEntity> {
    const sanitized = content.trim();
    if (sanitized.length === 0) {
      throw new BadRequestException('Nội dung tin nhắn không được để trống');
    }
    const message = this.messageRepository.create({
      userId,
      senderRole: 'admin',
      content: sanitized,
      read: true,
    });
    return this.messageRepository.save(message);
  }
}