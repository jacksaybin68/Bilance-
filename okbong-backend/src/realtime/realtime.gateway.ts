import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

export interface PriceBroadcastPayload {
  price: number;
  currency: string;
}

@WebSocketGateway({ namespace: '/realtime', cors: { origin: '*' } })
export class PriceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(PriceGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket): void {
    this.logger.debug(`client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join')
  handleJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { room?: string }): void {
    const room = data?.room ?? 'price';
    void client.join(room);
    client.emit('joined', { room });
  }

  @SubscribeMessage('leave')
  handleLeave(@ConnectedSocket() client: Socket, @MessageBody() data: { room?: string }): void {
    const room = data?.room ?? 'price';
    void client.leave(room);
    client.emit('left', { room });
  }

  broadcastPrice(payload: PriceBroadcastPayload): void {
    if (!this.server) return;
    this.server.to('price').emit('price:update', payload);
  }
}
