import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderStatus } from '../dto/order.dto';
import { OrderType } from '../dto/order-type.enum';

@Entity('orders')
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ length: 20 })
  pair!: string;

  @Column({ length: 10 })
  side!: 'buy' | 'sell';

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  amount!: number;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  price!: number;

  @Column({
    type: 'varchar',
    length: 10,
    default: OrderType.LIMIT,
  })
  type!: OrderType;

  @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
  filledAmount!: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: OrderStatus.PENDING,
  })
  status!: OrderStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn({ nullable: true })
  updatedAt?: Date;
}
