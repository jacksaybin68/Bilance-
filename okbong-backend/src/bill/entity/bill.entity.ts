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
import { BillStatus, BillType } from '../dto/bill.dto';

@Entity('bills')
@Index(['userId', 'status'])
export class BillEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 20, default: BillType.RECURRING })
  type!: BillType;

  @Column({ type: 'varchar', length: 20, default: BillStatus.PENDING })
  status!: BillStatus;

  @Column({ type: 'varchar', length: 160, nullable: true })
  description?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => UserEntity, (user) => user.bills, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: UserEntity;
}
