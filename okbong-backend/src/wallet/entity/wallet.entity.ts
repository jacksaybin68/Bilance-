import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../user/entity/user.entity';
import { WalletType } from '../dto/wallet.dto';

export enum WalletStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  VERIFIED = 'verified',
  BLOCKED = 'blocked',
}

@Entity('wallets')
@Index(['userId', 'type'], { unique: true })
export class WalletEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 20, default: WalletType.E_WALLET })
  type!: WalletType;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  balance!: number;

  @Column({ type: 'varchar', length: 8, default: 'BDSD' })
  currency!: string;

  @Column({ type: 'varchar', length: 20, default: WalletStatus.ACTIVE })
  status!: WalletStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  user?: UserEntity;
}
