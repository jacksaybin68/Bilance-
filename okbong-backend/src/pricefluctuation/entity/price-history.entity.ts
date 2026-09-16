import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('price_history')
@Index(['symbol', 'recordedAt'])
export class PriceHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 20 })
  symbol!: string;

  @Column({ type: 'float' })
  price!: number;

  @Column({ type: 'float', nullable: true })
  volume?: number | null;

  @CreateDateColumn()
  recordedAt!: Date;
}