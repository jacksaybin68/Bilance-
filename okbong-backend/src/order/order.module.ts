import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { OrderGateway } from './order.gateway';

@Module({
  imports: [RealtimeModule],
  providers: [OrderGateway],
  exports: [OrderGateway],
})
export class OrderModule {}
