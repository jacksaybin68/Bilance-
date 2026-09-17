import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../user/entity/user.entity';
import { ConversationEntity } from './conversation.entity';

export enum MessageSenderRole {
  USER = 'user',
  ADMIN = 'admin',
  SYSTEM = 'system',
}

export enum MessageKind {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
}

@Entity('chat_messages')
@Index(['conversationId', 'createdAt'])
export class MessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  conversationId!: string;

  @Column({ type: 'uuid' })
  senderId!: string;

  @Column({ type: 'varchar', length: 20, default: MessageSenderRole.USER })
  senderRole!: MessageSenderRole;

  @Column({ type: 'varchar', length: 10, default: MessageKind.TEXT })
  kind!: MessageKind;

  @Column({ type: 'text' })
  body!: string;

  /** Optional payload for image/file messages (URL or base64 data URI). */
  @Column({ type: 'text', nullable: true })
  attachment?: string | null;

  @Column({ type: 'boolean', default: false })
  readByAdmin!: boolean;

  @Column({ type: 'boolean', default: false })
  readByUser!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => ConversationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation?: ConversationEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender?: UserEntity;
}
