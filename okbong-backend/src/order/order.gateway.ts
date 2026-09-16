import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';
import { OrderEntity } from './entity/order.entity';
import { OrderStatus } from './dto/order.dto';

export interface OrderBroadcastPayload {
  id: string;
  userId: string;
  pair: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  status: OrderStatus;
  createdAt: Date;
}

@WebSocketGateway({ namespace: '/realtime', cors: { origin: '*' } })
export class OrderGateway {
  private readonly logger = new Logger(OrderGateway.name);

  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('join:order')
  handleJoinOrderRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId?: string },
  ): void {
    const room = data?.userId ?? 'orders';
    void client.join(room);
    client.emit('joined:order', { room });
  }

  @SubscribeMessage('leave:order')
  handleLeaveOrderRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId?: string },
  ): void {
    const room = data?.userId ?? 'orders';
    void client.leave(room);
    client.emit('left:order', { room });
  }

  broadcastOrderCreated(order: OrderEntity): void {
    if (!this.server) return;
    this.logger.debug(`broadcasting order:created — ${order.id}`);
    this.server.to('orders').emit('order:created', this.toPayload(order));
  }

  broadcastOrderUpdated(order: OrderEntity): void {
    if (!this.server) return;
    this.logger.debug(`broadcasting order:updated — ${order.id}`);
    this.server.to('orders').emit('order:updated', this.toPayload(order));
  }

  broadcastOrderCancelled(order: OrderEntity): void {
    if (!this.server) return;
    this.logger.debug(`broadcasting order:cancelled — ${order.id}`);
    this.server.to('orders').emit('order:cancelled', this.toPayload(order));
  }

  broadcastOrderMatched(order: OrderEntity): void {
    if (!this.server) return;
    this.logger.debug(`broadcasting order:matched — ${order.id}`);
    this.server.to('orders').emit('order:matched', this.toPayload(order));
  }

  private toPayload(order: OrderEntity): OrderBroadcastPayload {
    return {
      id: order.id,
      userId: order.userId,
      pair: order.pair,
      side: order.side as 'buy' | 'sell',
      amount: Number(order.amount),
      price: Number(order.price),
      status: order.status,
      createdAt: order.createdAt,
    };
  }
}
