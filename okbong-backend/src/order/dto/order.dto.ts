import { ApiProperty } from '@nestjs/swagger';
import { OrderType } from './order-type.enum';

export enum OrderStatus {
  PENDING = 'PENDING',
  MATCHING = 'MATCHING',
  MATCHED = 'MATCHED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export class OrderStatusDto {
  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;
}
