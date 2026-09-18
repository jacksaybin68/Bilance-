import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { Role } from '../enumeration/role.enum';
import { MessageSenderRole, type MessageEntity } from './entities/message.entity';
import type { ConversationEntity } from './entities/conversation.entity';

export interface ChatMessagePayload {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: MessageSenderRole;
  kind: string;
  body: string;
  attachment?: string | null;
  createdAt: Date;
}

export interface ChatConversationPayload {
  id: string;
  userId: string;
  subject: string;
  topic: string;
  status: string;
  unreadForAdmin: number;
  unreadForUser: number;
  lastMessageAt?: Date | null;
}

/**
 * Dedicated `/chat` namespace. Clients join `conversation:<id>` rooms to receive
 * a thread's messages, while admins join the shared `admins` room to observe
 * every thread for the support inbox.
 */
@WebSocketGateway({ namespace: '/chat', cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  static readonly ADMINS_ROOM = 'admins';

  constructor(private readonly jwtService: JwtService) {}

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket): void {
    this.logger.debug(`chat client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`chat client disconnected: ${client.id}`);
  }

  @SubscribeMessage('chat:join')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId?: string },
  ): void {
    if (!data?.conversationId) return;
    const room = this.conversationRoom(data.conversationId);
    void client.join(room);
    client.emit('chat:joined', { room });
  }

  @SubscribeMessage('chat:leave')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId?: string },
  ): void {
    if (!data?.conversationId) return;
    const room = this.conversationRoom(data.conversationId);
    void client.leave(room);
    client.emit('chat:left', { room });
  }

  @SubscribeMessage('chat:join:admin')
  handleJoinAdmins(@ConnectedSocket() client: Socket): void {
    const token = this.accessToken(client);

    try {
      const user = this.jwtService.verify<{ role?: Role }>(token);
      if (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN) {
        throw new WsException('Forbidden');
      }
    } catch {
      throw new WsException('Unauthorized');
    }

    void client.join(ChatGateway.ADMINS_ROOM);
    client.emit('chat:joined', { room: ChatGateway.ADMINS_ROOM });
  }

  broadcastMessage(message: MessageEntity): void {
    if (!this.server) return;
    const payload = this.toMessagePayload(message);
    this.server.to(this.conversationRoom(message.conversationId)).emit('chat:message', payload);
    if (message.senderRole === MessageSenderRole.USER) {
      this.server.to(ChatGateway.ADMINS_ROOM).emit('chat:message', payload);
    }
  }

  broadcastConversation(conversation: ConversationEntity, event = 'chat:conversation'): void {
    if (!this.server) return;
    const payload: ChatConversationPayload = {
      id: conversation.id,
      userId: conversation.userId,
      subject: conversation.subject,
      topic: conversation.topic,
      status: conversation.status,
      unreadForAdmin: conversation.unreadForAdmin,
      unreadForUser: conversation.unreadForUser,
      lastMessageAt: conversation.lastMessageAt ?? null,
    };
    this.server.to(ChatGateway.ADMINS_ROOM).emit(event, payload);
    this.server.to(this.conversationRoom(conversation.id)).emit(event, payload);
  }

  private conversationRoom(conversationId: string): string {
    return `conversation:${conversationId}`;
  }

  private accessToken(client: Socket): string {
    const authToken = client.handshake.auth?.token;
    const authorization = client.handshake.headers.authorization;
    const bearerToken = typeof authorization === 'string' && authorization.startsWith('Bearer ')
      ? authorization.slice(7)
      : undefined;
    const token = typeof authToken === 'string' ? authToken : bearerToken;

    if (!token) throw new WsException('Unauthorized');
    return token;
  }

  private toMessagePayload(message: MessageEntity): ChatMessagePayload {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderRole: message.senderRole,
      kind: message.kind,
      body: message.body,
      attachment: message.attachment ?? null,
      createdAt: message.createdAt,
    };
  }
}
