import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { UserEntity } from '../../user/entity/user.entity';

export enum ActivityAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  BILL_CREATE = 'bill_create',
  BILL_PAY = 'bill_pay',
  BILL_UPDATE = 'bill_update',
  WALLET_TOPUP = 'wallet_topup',
  WALLET_TRANSFER = 'wallet_transfer',
  KYC_SUBMIT = 'kyc_submit',
  KYC_APPROVE = 'kyc_approve',
  KYC_REJECT = 'kyc_reject',
  USER_BAN = 'user_ban',
  USER_UNBAN = 'user_unban',
  SETTINGS_CHANGE = 'settings_change',
  ORDER_UPDATE = 'order_update',
  ORDER_CORRECT = 'order_correct',
  UNKNOWN = 'unknown',
}

@Entity('activity_logs')
export class ActivityLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 30 })
  action!: ActivityAction;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  metadata?: string | null; // JSON stringified for flexibility

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: UserEntity;
}
