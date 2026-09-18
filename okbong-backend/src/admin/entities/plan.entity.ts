import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PlanStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

/** Subscription/product plan managed from the admin console. */
@Entity('plans')
export class PlanEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 120 })
  name!: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  price!: number;

  @Column({ length: 40, default: '1 month' })
  duration!: string;

  @Column({ type: 'simple-json', nullable: true })
  features?: string[] | null;

  @Column({ type: 'varchar', length: 20, default: PlanStatus.ACTIVE })
  status!: PlanStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
