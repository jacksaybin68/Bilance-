import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KycEntity } from './entities/kyc.entity';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([KycEntity]), forwardRef(() => UserModule)],
  controllers: [KycController],
  providers: [KycService],
  exports: [KycService],
})
export class KYCModule {}
