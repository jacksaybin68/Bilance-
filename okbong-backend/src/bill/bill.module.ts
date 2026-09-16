import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillController } from './bill.controller';
import { BillService } from './bill.service';
import { BillEntity } from './entity/bill.entity';
import { QueueModule } from '../queue/index';

@Module({
  imports: [TypeOrmModule.forFeature([BillEntity]), QueueModule],
  controllers: [BillController],
  providers: [BillService],
  exports: [BillService],
})
export class BillModule {}
