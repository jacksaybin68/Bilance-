import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { WalletModule } from '../wallet/wallet.module';
import { BillModule } from '../bill/bill.module';
import { KYCModule } from '../kyc/kyc.module';
import { UserEntity } from '../user/entity/user.entity';
import { WalletEntity } from '../wallet/entity/wallet.entity';
import { BillEntity } from '../bill/entity/bill.entity';
import { TransactionEntity } from '../wallet/entity/transaction.entity';
import { OrderEntity } from '../order/entity/order.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ActivityLogEntity } from './entities/activity-log.entity';
import { ActivityLogService } from './services/activity-log.service';
import { TransactionManagementService } from './services/transaction-management.service';
import { UserManagementController } from './controllers/user-management.controller';
import { WalletManagementController } from './controllers/wallet-management.controller';
import { CardManagementController } from './controllers/card-management.controller';
import { BillManagementController } from './controllers/bill-management.controller';
import { PaymentManagementController } from './controllers/payment-management.controller';
import { PlanManagementController } from './controllers/plan-management.controller';
import { SettingsController } from './controllers/settings.controller';
import { ActivityLogController } from './controllers/activity-log.controller';
import { CronJobsController } from './controllers/cron-jobs.controller';
import { TransactionManagementController } from './controllers/transaction-management.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      WalletEntity,
      BillEntity,
      TransactionEntity,
      OrderEntity,
      ActivityLogEntity,
    ]),
    forwardRef(() => AuthModule),
    forwardRef(() => UserModule),
    forwardRef(() => WalletModule),
    forwardRef(() => BillModule),
    forwardRef(() => KYCModule),
  ],
  controllers: [
    AdminController,
    UserManagementController,
    WalletManagementController,
    CardManagementController,
    BillManagementController,
    PaymentManagementController,
    PlanManagementController,
    SettingsController,
    ActivityLogController,
    CronJobsController,
    TransactionManagementController,
  ],
  providers: [AdminService, ActivityLogService, TransactionManagementService],
  exports: [AdminService, ActivityLogService, TransactionManagementService],
})
export class AdminModule {}