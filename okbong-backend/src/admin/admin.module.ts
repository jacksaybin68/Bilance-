import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { WalletModule } from '../wallet/wallet.module';
import { BillModule } from '../bill/bill.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserManagementController } from './controllers/user-management.controller';
import { WalletManagementController } from './controllers/wallet-management.controller';
import { CardManagementController } from './controllers/card-management.controller';
import { BillManagementController } from './controllers/bill-management.controller';
import { PaymentManagementController } from './controllers/payment-management.controller';
import { PlanManagementController } from './controllers/plan-management.controller';
import { SettingsController } from './controllers/settings.controller';
import { ActivityLogController } from './controllers/activity-log.controller';
import { CronJobsController } from './controllers/cron-jobs.controller';
import { KYCModule } from '../kyc/kyc.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([]),
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
  ],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
