import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class PriceHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  symbol!: string;

  @Column()
  price!: number;

  @Column({ type: 'float', nullable: true })
  volume?: number;

  @CreateDateColumn()
  recordedAt!: Date;
}
