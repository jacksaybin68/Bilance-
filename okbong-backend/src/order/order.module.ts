import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RealtimeModule } from '../realtime/realtime.module';
import { WalletModule } from '../wallet/wallet.module';
import { OrderGateway } from './order.gateway';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { AdminOrderController } from './order-admin.controller';
import { OrderEntity } from './entity/order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity]),
    RealtimeModule,
    WalletModule,
  ],
  controllers: [OrderController, AdminOrderController],
  providers: [OrderGateway, OrderService],
  exports: [OrderGateway, OrderService],
})
export class OrderModule {}
