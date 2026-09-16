import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KycEntity } from './entities/kyc.entity';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([KycEntity]),
    QueueModule,
  ],
  controllers: [KycController],
  providers: [KycService],
  exports: [KycService],
})
export class KYCModule {}
