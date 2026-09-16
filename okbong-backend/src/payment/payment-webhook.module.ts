import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillEntity } from '../bill/entity/bill.entity';
import { PaymentWebhookController } from './payment-webhook.controller';
import { AppService } from '../app.service';

@Module({
  imports: [TypeOrmModule.forFeature([BillEntity])],
  controllers: [PaymentWebhookController],
  providers: [AppService],
})
export class PaymentWebhookModule {}
