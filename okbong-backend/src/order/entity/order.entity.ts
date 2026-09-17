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

  /** Số tiền cược (BDSD) bị trừ khi đặt lệnh. */
  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount!: number;

  /** Tỷ giá tham chiếu tại thời điểm đặt lệnh. */
  @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
  price!: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: OrderType.LIMIT,
  })
  type!: OrderType;

  @Column({
    type: 'varchar',
    length: 20,
    default: OrderStatus.PENDING,
  })
  status!: OrderStatus;

  /** Ghi chú của admin khi chỉnh kết quả. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  note?: string | null;

  /** Người (admin id) xác nhận/điều chỉnh kết quả gần nhất. */
  @Column({ type: 'uuid', nullable: true })
  settledBy?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn({ nullable: true })
  updatedAt?: Date;
}
