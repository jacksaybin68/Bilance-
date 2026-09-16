import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { UserEntity } from '../../user/entity/user.entity';

export enum KYCStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

@Entity('kyc_submissions')
@Index(['userId', 'status'])
export class KycEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 30, default: KYCStatus.PENDING })
  status!: KYCStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  frontImage?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  backImage?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  selfieImage?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  idNumber?: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  documentName?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  rejectReason?: string | null;

  @Column({ type: 'uuid', nullable: true })
  reviewedBy?: string | null;

  @CreateDateColumn()
  submittedAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: UserEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'reviewedBy' })
  reviewer?: UserEntity;
}
