import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from '../admin/admin.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { OrderController } from './order.controller';
import { OrderGateway } from './order.gateway';
import { OrderManagementController } from './order-management.controller';
import { OrderService } from './order.service';
import { OrderEntity } from './entity/order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity]),
    RealtimeModule,
    forwardRef(() => AdminModule),
  ],
  controllers: [OrderController, OrderManagementController],
  providers: [OrderGateway, OrderService],
  exports: [OrderGateway, OrderService],
})
export class OrderModule {}
