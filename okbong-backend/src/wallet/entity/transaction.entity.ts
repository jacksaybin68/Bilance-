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
import { WalletEntity } from './wallet.entity';

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
  TRANSFER_IN = 'transfer_in',
  TRANSFER_OUT = 'transfer_out',
  FEE = 'fee',
  ADJUSTMENT = 'adjustment',
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REVERSED = 'reversed',
}

@Entity('transactions')
@Index(['walletId', 'createdAt'])
@Index(['userId', 'createdAt'])
export class TransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  walletId!: string;

  @Column({ type: 'uuid', nullable: true })
  userId!: string;

  @Column({ type: 'varchar', length: 20 })
  type!: TransactionType;

  @Column({ type: 'varchar', length: 20 })
  status!: TransactionStatus;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount!: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  feeAmount?: number | null;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  balanceBefore!: number;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  balanceAfter!: number;

  @Column({ type: 'varchar', length: 32, nullable: true })
  reference?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => WalletEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'walletId' })
  wallet?: WalletEntity;
}
