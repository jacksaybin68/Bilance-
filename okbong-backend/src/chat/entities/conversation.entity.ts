import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../user/entity/user.entity';

export enum ConversationStatus {
  OPEN = 'open',
  PENDING = 'pending',
  CLOSED = 'closed',
}

export enum ConversationTopic {
  GENERAL = 'general',
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
  ORDER = 'order',
  KYC = 'kyc',
  TECHNICAL = 'technical',
}

/**
 * One support thread per user (plus an optional subject). Messages belong to a
 * conversation; `lastMessageAt` keeps the admin inbox sortable without a join.
 */
@Entity('chat_conversations')
@Index(['userId', 'status'])
export class ConversationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 160, default: 'Hỗ trợ' })
  subject!: string;

  @Column({ type: 'varchar', length: 20, default: ConversationTopic.GENERAL })
  topic!: ConversationTopic;

  @Column({ type: 'varchar', length: 20, default: ConversationStatus.OPEN })
  status!: ConversationStatus;

  /** Id of the admin/moderator currently handling the thread. */
  @Column({ type: 'uuid', nullable: true })
  assignedTo?: string | null;

  @Column({ type: 'int', default: 0 })
  unreadForAdmin!: number;

  @Column({ type: 'int', default: 0 })
  unreadForUser!: number;

  @Column({ type: 'datetime', nullable: true })
  lastMessageAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: UserEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assignedTo' })
  assignee?: UserEntity;
}
