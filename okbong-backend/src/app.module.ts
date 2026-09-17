import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BillModule } from './bill/bill.module';
import { PriceFluctuationModule } from './pricefluctuation/pricefluctuation.module';
import { PaymentWebhookModule } from './payment/payment-webhook.module';
import { QueueModule } from './queue/index';
import { RealtimeModule } from './realtime/realtime.module';
import { RedisModule } from './redis/redis.module';
import { UserModule } from './user/user.module';
import { WalletModule } from './wallet/wallet.module';
import { KYCModule } from './kyc/kyc.module';
import { DeadLetterQueueModule } from './queue/dead-letter-queue.module';
import { OrderModule } from './order/order.module';
import { AdminModule } from './admin/admin.module';
import { ChatModule } from './chat/chat.module';
import { DevSeedService } from './dev-seed.service';
import { UserEntity } from './user/entity/user.entity';
import { WalletEntity } from './wallet/entity/wallet.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'global', ttl: 60_000, limit: 60 },
        { name: 'auth', ttl: 60_000, limit: 10 },
        { name: 'wallet', ttl: 60_000, limit: 20 },
        { name: 'bill', ttl: 60_000, limit: 30 },
        { name: 'payment', ttl: 60_000, limit: 15 },
      ],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const postgresHost = configService.get<string>('POSTGRES_HOST');
        const usePostgres = postgresHost && postgresHost !== 'localhost';

        if (usePostgres) {
          return {
            type: 'postgres',
            host: configService.get<string>('POSTGRES_HOST', 'localhost'),
            port: Number(configService.get<string>('POSTGRES_PORT', '5432')),
            username: configService.get<string>('POSTGRES_USER', 'postgres'),
            password: configService.get<string>('POSTGRES_PASSWORD', 'postgres'),
            database: configService.get<string>('POSTGRES_DB', 'okbong'),
            synchronize: configService.get<string>('NODE_ENV', 'development') !== 'production',
            logging: false,
            autoLoadEntities: true,
          } as const;
        }

        // SQLite fallback for local development when Postgres is unavailable.
        // A file (not `:memory:`) is used so accounts and data survive restarts;
        // DevSeedService recreates the demo logins on a fresh database.
        const sqlitePath = configService.get<string>('SQLITE_PATH', 'data/okbong.dev.db');
        if (sqlitePath !== ':memory:') mkdirSync(dirname(sqlitePath), { recursive: true });
        return {
          type: 'better-sqlite3',
          database: sqlitePath,
          synchronize: true,
          logging: false,
          autoLoadEntities: true,
        } as const;
      },
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    UserModule,
    WalletModule,
    BillModule,
    PriceFluctuationModule,
    PaymentWebhookModule,
    QueueModule,
    RedisModule,
    RealtimeModule,
    KYCModule,
    DeadLetterQueueModule,
    OrderModule,
    AdminModule,
    ChatModule,
    TypeOrmModule.forFeature([UserEntity, WalletEntity]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    DevSeedService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}